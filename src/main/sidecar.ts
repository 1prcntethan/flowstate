import { app } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { targetModel } from "./ollamaLifecycle";
import { getOllamaHost } from "./ollama";
import { killProcessTree } from "./processTree";
import {
  SidecarSupervisor,
  healthRequest,
  packagedSidecarCandidates,
  parseReadyLine,
  pythonLaunchCandidates,
  resolveSidecarLaunch,
  safeSidecarLine,
  sidecarEnv,
  type PythonCandidate,
  type SidecarStatus,
} from "./sidecarLifecycle";
import { sendToRenderers } from "./statusBus";

const supervisor = new SidecarSupervisor();
const ignoreExit = new Set<number>();
let token = "";
let child: ChildProcess | null = null;
let generation = 0;

export function getSidecarStatus(): SidecarStatus {
  return supervisor.status;
}

export function getSidecarEndpoint(): { port: number; token: string } | null {
  if (supervisor.status.state !== "ready" || supervisor.status.port === null || !token) return null;
  return { port: supervisor.status.port, token };
}

function publish(): void {
  sendToRenderers("sidecar:status", getSidecarStatus());
}

function scriptPath(): string {
  const fromApp = path.join(app.getAppPath(), "python", "server.py");
  if (fs.existsSync(fromApp)) return fromApp;
  return path.join(__dirname, "../../python/server.py");
}

function resourcesDir(): string | undefined {
  if (app.isPackaged) return process.resourcesPath;
  const dev = path.join(app.getAppPath(), "resources");
  return fs.existsSync(dev) ? dev : undefined;
}

function probeVersion(command: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    let proc: ChildProcess;
    try {
      proc = spawn(
        command,
        [...args, "-c", "import sys; print(f'{sys.version_info[0]}.{sys.version_info[1]}')"],
        { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] },
      );
    } catch {
      finish(null);
      return;
    }
    let out = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    proc.on("error", () => finish(null));
    proc.on("exit", () => {
      const version = out.trim();
      finish(/^\d+\.\d+$/.test(version) ? version : null);
    });
    setTimeout(() => {
      try {
        proc.kill();
      } catch {
        // probe already finished
      }
      finish(null);
    }, 4000).unref();
  });
}

async function probedCandidates(): Promise<PythonCandidate[]> {
  const found: PythonCandidate[] = [];
  for (const candidate of pythonLaunchCandidates(process.platform)) {
    found.push({ ...candidate, version: await probeVersion(candidate.command, candidate.args) });
  }
  return found;
}

export async function startPythonSidecar(): Promise<void> {
  if (!token) token = crypto.randomBytes(32).toString("hex");
  supervisor.markStarting();
  publish();
  await launch();
}

export async function retrySidecar(): Promise<SidecarStatus> {
  const pid = child?.pid;
  if (pid) {
    ignoreExit.add(generation);
    killProcessTree(process.platform, pid);
    child = null;
  }
  supervisor.resetForManualRetry();
  publish();
  await launch();
  return getSidecarStatus();
}

export function stopPythonSidecar(): void {
  supervisor.markQuitting();
  ignoreExit.add(generation);
  const pid = child?.pid;
  child = null;
  if (pid) killProcessTree(process.platform, pid);
}

export function stopPythonSidecarSync(): void {
  stopPythonSidecar();
}

async function launch(): Promise<void> {
  const gen = ++generation;
  const override = process.env.FLOWSTATE_PYTHON?.trim() || null;
  const overrideVersion = override ? await probeVersion(override, []) : null;
  const packaged =
    packagedSidecarCandidates(process.resourcesPath, process.platform).find((file) =>
      fs.existsSync(file),
    ) ?? null;
  const spec = resolveSidecarLaunch({
    isPackaged: app.isPackaged,
    packagedBinary: app.isPackaged ? packaged : null,
    scriptPath: scriptPath(),
    pythonOverride: override,
    overrideVersion,
    probed: override ? [] : await probedCandidates(),
  });
  if ("error" in spec) {
    supervisor.markError(spec.error);
    publish();
    return;
  }

  let next: ChildProcess;
  try {
    next = spawn(spec.command, spec.args, {
      env: sidecarEnv({
        base: process.env,
        token,
        ollamaHost: getOllamaHost(),
        model: targetModel(),
        resourcesDir: resourcesDir(),
      }),
      detached: process.platform !== "win32",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    supervisor.markError("The capture service could not be started.");
    publish();
    return;
  }

  child = next;
  if (process.platform !== "win32") next.unref();
  let buffer = "";
  let sawReady = false;

  next.stdout?.on("data", (chunk: Buffer) => {
    if (gen !== generation) return;
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const safe = safeSidecarLine(line, token);
      if (safe) console.log(safe);
      if (sawReady) continue;
      const ready = parseReadyLine(line);
      if (!ready) continue;
      sawReady = true;
      void confirmHealth(gen, ready.port);
    }
  });
  next.stderr?.on("data", () => {
    if (gen !== generation) return;
    console.log(JSON.stringify({ event: "sidecar_stderr" }));
  });
  next.on("error", () => {
    if (gen !== generation || ignoreExit.has(gen)) return;
    supervisor.markError("The capture service could not be started.");
    publish();
  });
  next.on("exit", () => {
    if (gen !== generation || ignoreExit.has(gen)) return;
    const action = supervisor.unexpectedExit();
    publish();
    if (action === "restart") void launch();
  });
}

async function confirmHealth(gen: number, port: number): Promise<void> {
  const request = healthRequest(port, token);
  let ok = false;
  try {
    const response = await fetch(request.url, {
      headers: request.headers,
      signal: AbortSignal.timeout(3000),
    });
    ok = response.ok;
  } catch {
    ok = false;
  }
  if (gen !== generation || ignoreExit.has(gen)) return;
  if (ok) {
    supervisor.markReady(port);
    publish();
    return;
  }
  const pid = child?.pid;
  ignoreExit.add(gen);
  if (pid) killProcessTree(process.platform, pid);
  if (child?.pid === pid) child = null;
  const action = supervisor.unexpectedExit();
  publish();
  if (action === "restart") await launch();
}
