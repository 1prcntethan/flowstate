import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { planMentionsMachineWideKill, processTreeKillPlan } from "../src/main/processTree";
import {
  SidecarSupervisor,
  acceptPythonVersion,
  classifyRequest,
  healthRequest,
  normalizeClassifyResult,
  parseReadyLine,
  pythonLaunchCandidates,
  resolveSidecarLaunch,
  safeSidecarLine,
  selectPython,
  sidecarEnv,
  unreachableClassify,
} from "../src/main/sidecarLifecycle";

describe("sidecar ready line and auth", () => {
  const token = "launch-token-value";

  it("parses a loopback ready line and rejects other hosts", () => {
    expect(parseReadyLine('{"event":"ready","host":"127.0.0.1","port":43210}')).toEqual({
      host: "127.0.0.1",
      port: 43210,
    });
    expect(parseReadyLine('{"event":"classified","label":"on_task"}')).toBeNull();
    expect(parseReadyLine('{"event":"ready","host":"0.0.0.0","port":1}')).toBeNull();
    expect(parseReadyLine("not json")).toBeNull();
  });

  it("sends the bearer token on health and classify and never logs it", () => {
    const health = healthRequest(43210, token);
    expect(health.url).toBe("http://127.0.0.1:43210/health");
    expect(health.headers.Authorization).toBe(`Bearer ${token}`);

    const classify = classifyRequest(43210, token, {
      subjects: ["Math"],
      todos: [{ text: "chapter 2" }],
    });
    expect(classify.url).toBe("http://127.0.0.1:43210/classify");
    expect(classify.method).toBe("POST");
    expect(classify.headers.Authorization).toBe(`Bearer ${token}`);
    expect(JSON.parse(classify.body)).toEqual({
      subjects: ["Math"],
      todos: [{ text: "chapter 2" }],
    });

    const ready = safeSidecarLine(
      '{"event":"ready","host":"127.0.0.1","port":43210}',
      token,
    );
    expect(ready).toContain("43210");
    expect(ready).not.toContain(token);
    expect(
      safeSidecarLine(`{"event":"ready","host":"127.0.0.1","port":1,"note":"${token}"}`, token),
    ).toBeNull();
    expect(safeSidecarLine("raw screenshot text", token)).toBeNull();
  });

  it("keeps source and fallback stage on a classify result", () => {
    expect(
      normalizeClassifyResult({
        label: "off_task",
        confidence: 0.95,
        reason: "off-task domain",
        source: "fallback",
        fallbackStage: "domain",
      }),
    ).toMatchObject({ source: "fallback", fallbackStage: "domain", label: "off_task" });
    expect(unreachableClassify().source).toBe("fallback");
  });
});

describe("sidecar crash restart", () => {
  it("restarts once, then stays in error", () => {
    const supervisor = new SidecarSupervisor();
    supervisor.markStarting();
    supervisor.markReady(1111);
    expect(supervisor.unexpectedExit()).toBe("restart");
    expect(supervisor.crashes).toBe(1);
    expect(supervisor.status.state).toBe("restarting");

    supervisor.markReady(2222);
    expect(supervisor.unexpectedExit()).toBe("fail");
    expect(supervisor.status.state).toBe("error");
    expect(supervisor.status.error).toContain("Screen checks stopped");
    expect(supervisor.unexpectedExit()).toBe("fail");
  });

  it("does not restart while quitting", () => {
    const supervisor = new SidecarSupervisor();
    supervisor.markReady(1111);
    supervisor.markQuitting();
    expect(supervisor.unexpectedExit()).toBe("ignore");
    expect(supervisor.crashes).toBe(0);
  });
});

describe("process tree shutdown", () => {
  it("kills only the child tree on Windows and POSIX", () => {
    expect(processTreeKillPlan("win32", 4242)).toEqual([
      { kind: "exec", file: "taskkill", args: ["/PID", "4242", "/T", "/F"] },
    ]);
    expect(processTreeKillPlan("darwin", 4242)).toEqual([
      { kind: "signal", pid: -4242, signal: "SIGTERM" },
      { kind: "signal", pid: -4242, signal: "SIGKILL" },
    ]);
    expect(processTreeKillPlan("linux", 7)[0]).toMatchObject({ pid: -7, signal: "SIGTERM" });
    for (const platform of ["win32", "darwin", "linux"] as const) {
      expect(planMentionsMachineWideKill(processTreeKillPlan(platform, 4242))).toBe(false);
    }
  });

  it("does not keep a machine-wide kill in the Electron lifecycle modules", () => {
    const sources = ["ollama.ts", "sidecar.ts", "tracker.ts"].map((name) =>
      fs.readFileSync(`src/main/${name}`, "utf8"),
    );
    for (const source of sources) {
      expect(source).not.toContain("taskkill /IM");
      expect(source).not.toContain("pkill");
      expect(source).not.toContain("llama-server");
      expect(source).not.toContain("pythoncore-3.14");
      expect(source).not.toContain("localhost:5001");
      expect(source).not.toContain("localhost:11434");
    }
  });
});

describe("python selection", () => {
  it("prefers 3.12 then 3.11 and rejects 3.14", () => {
    expect(acceptPythonVersion("3.12")).toBe(true);
    expect(acceptPythonVersion("3.11")).toBe(true);
    expect(acceptPythonVersion("3.14")).toBe(false);
    expect(pythonLaunchCandidates("win32").map((item) => item.args[0] ?? item.command)).toEqual([
      "-3.12",
      "-3.11",
      "python",
    ]);
    expect(pythonLaunchCandidates("darwin").map((item) => item.command)).toEqual([
      "python3.12",
      "python3.11",
      "python3",
    ]);
    expect(
      selectPython([
        { command: "python3", args: [], version: "3.14" },
        { command: "python3.12", args: [], version: "3.12" },
      ]),
    ).toEqual({ command: "python3.12", args: [] });
    expect(selectPython([{ command: "python3", args: [], version: "3.14" }])).toMatchObject({
      error: expect.stringContaining("3.12"),
    });
  });

  it("passes the token and ollama host to the sidecar env without putting them in the launch error", () => {
    const env = sidecarEnv({
      base: { PATH: "/usr/bin" },
      token: "secret-token",
      ollamaHost: "127.0.0.1:45555",
      model: "llama3.2:1b",
      resourcesDir: "/apps/resources",
    });
    expect(env.FLOWSTATE_SIDECAR_TOKEN).toBe("secret-token");
    expect(env.FLOWSTATE_SIDECAR_PORT).toBe("0");
    expect(env.OLLAMA_HOST).toBe("127.0.0.1:45555");
    expect(env.FLOWSTATE_OLLAMA_MODEL).toBe("llama3.2:1b");
    expect(env.FLOWSTATE_RESOURCES_DIR).toBe("/apps/resources");

    const missing = resolveSidecarLaunch({
      isPackaged: false,
      packagedBinary: null,
      scriptPath: "python/server.py",
      pythonOverride: null,
      overrideVersion: null,
      probed: [{ command: "python3", args: [], version: "3.14" }],
    });
    expect(missing).toMatchObject({ error: expect.stringContaining("3.14") });
    expect(JSON.stringify(missing)).not.toContain("secret-token");
  });
});
