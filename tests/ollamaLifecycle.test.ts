import { describe, expect, it } from "vitest";
import { planMentionsMachineWideKill, processTreeKillPlan } from "../src/main/processTree";
import {
  allocateLoopbackPort,
  applyPullLine,
  consumePullNdjson,
  initialModelStatus,
  modelIsInstalled,
  ollamaHostFor,
  ollamaServeEnv,
  pullRequest,
  pushPullText,
  resolveOllamaCommand,
  retryModelStatus,
  targetModel,
} from "../src/main/ollamaLifecycle";

describe("ollama port and shutdown", () => {
  it("binds a free loopback port and puts that host in the child env", async () => {
    const port = await allocateLoopbackPort();
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThanOrEqual(65535);
    const host = ollamaHostFor(port);
    expect(host).toBe(`127.0.0.1:${port}`);
    const env = ollamaServeEnv({ PATH: "/usr/bin" }, host, "/models");
    expect(env.OLLAMA_HOST).toBe(host);
    expect(env.OLLAMA_MODELS).toBe("/models");
  });

  it("resolves a bundled binary, then a dev file, then PATH only when unpackaged", () => {
    const files = new Set(["/repo/resources/ollama/mac/ollama"]);
    expect(
      resolveOllamaCommand({
        platform: "darwin",
        isPackaged: false,
        resourcesPath: "/apps/resources",
        devOllamaDir: "/repo/resources/ollama",
        exists: (filePath) => files.has(filePath),
      }),
    ).toEqual({ command: "/repo/resources/ollama/mac/ollama", source: "dev" });

    expect(
      resolveOllamaCommand({
        platform: "win32",
        isPackaged: true,
        resourcesPath: "/apps/resources",
        devOllamaDir: "/repo/resources/ollama",
        exists: (filePath) => filePath === "/apps/resources/ollama/win/ollama.exe",
      }),
    ).toEqual({ command: "/apps/resources/ollama/win/ollama.exe", source: "bundled" });

    expect(
      resolveOllamaCommand({
        platform: "darwin",
        isPackaged: false,
        resourcesPath: "/apps/resources",
        devOllamaDir: "/missing",
        exists: () => false,
      }),
    ).toEqual({ command: "ollama", source: "path" });

    expect(
      resolveOllamaCommand({
        platform: "darwin",
        isPackaged: true,
        resourcesPath: "/apps/resources",
        devOllamaDir: "/missing",
        exists: () => false,
      }),
    ).toMatchObject({ error: expect.stringContaining("not found") });
  });

  it("shuts down only the spawned pid", () => {
    const plan = processTreeKillPlan("win32", 99);
    expect(plan).toEqual([{ kind: "exec", file: "taskkill", args: ["/PID", "99", "/T", "/F"] }]);
    expect(planMentionsMachineWideKill(plan)).toBe(false);
    expect(planMentionsMachineWideKill(processTreeKillPlan("darwin", 99))).toBe(false);
    expect(JSON.stringify(processTreeKillPlan("darwin", 99))).not.toContain("ollama");
  });
});

describe("model pull progress", () => {
  it("turns NDJSON pull events into download, warm, and error states", () => {
    const ndjson = [
      '{"status":"pulling manifest"}',
      '{"status":"downloading","digest":"abc","total":1000,"completed":250}',
      '{"status":"downloading","digest":"abc","total":1000,"completed":1000}',
      '{"status":"success"}',
      "",
    ].join("\n");
    const done = consumePullNdjson(initialModelStatus(), ndjson);
    expect(done.state).toBe("warming");
    expect(done.percent).toBe(100);
    expect(done.completedBytes).toBe(1000);
    expect(done.totalBytes).toBe(1000);

    const halfway = applyPullLine(initialModelStatus(), '{"status":"downloading","total":200,"completed":50}');
    expect(halfway.state).toBe("downloading");
    expect(halfway.percent).toBe(25);

    const failed = applyPullLine(halfway, '{"error":"boom"}');
    expect(failed.state).toBe("error");
    expect(failed.error).toBe("Model download failed");
    expect(failed.statusText).not.toContain("boom");
  });

  it("keeps a split chunk buffered and resumes with another streamed pull", () => {
    const first = pushPullText("", '{"status":"downloading","total":80,"comple', initialModelStatus());
    expect(first.status.state).toBe("checking");
    expect(first.buffer).toContain("comple");
    const second = pushPullText(first.buffer, 'ted":40}\n', first.status);
    expect(second.status.state).toBe("downloading");
    expect(second.status.percent).toBe(50);
    expect(second.status.completedBytes).toBe(40);

    const resumed = retryModelStatus();
    expect(resumed.state).toBe("checking");
    expect(resumed.statusText).toContain("Resuming");
    const request = pullRequest("127.0.0.1:45555", targetModel({ FLOWSTATE_OLLAMA_MODEL: "custom:model" }));
    expect(request).toEqual({
      url: "http://127.0.0.1:45555/api/pull",
      method: "POST",
      body: { model: "custom:model", stream: true },
    });
  });

  it("detects an installed tag without treating a partial name as ready", () => {
    expect(modelIsInstalled({ models: [{ name: "llama3.2:1b" }] }, "llama3.2:1b")).toBe(true);
    expect(modelIsInstalled({ models: [{ name: "library/llama3.2:1b" }] }, "llama3.2:1b")).toBe(true);
    expect(modelIsInstalled({ models: [{ name: "other:latest" }] }, "llama3.2:1b")).toBe(false);
    expect(targetModel({})).toBe("llama3.2:1b");
  });
});
