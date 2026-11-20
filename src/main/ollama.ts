import { app } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  allocateLoopbackPort,
  applyPullLine,
  initialModelStatus,
  modelIsInstalled,
  ollamaHostFor,
  ollamaServeEnv,
  pullRequest,
  pushPullText,
  resolveOllamaCommand,
  retryModelStatus,
  tagsRequest,
  targetModel,
  unavailableModelStatus,
  type ModelStatus,
} from "./ollamaLifecycle";
import { killProcessTree } from "./processTree";
import { sendToRenderers } from "./statusBus";

let child: ChildProcess | null = null;
let host = "127.0.0.1:9";
let status: ModelStatus = initialModelStatus();
let job: Promise<void> | null = null;

export function getOllamaHost(): string {
  return host;
}

export function getModelStatus(): ModelStatus {
  return status;
}

export function isAiReady(): boolean {
  return status.state === "ready";
}

function publish(next: ModelStatus): void {
  status = next;
  sendToRenderers("model:progress", status);
}

function modelsDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "ollama", "models")
    : path.join(app.getAppPath(), "resources", "ollama", "models");
}

export async function beginOllama(): Promise<void> {
  try {
    host = ollamaHostFor(await allocateLoopbackPort());
  } catch {
    host = "127.0.0.1:9";
    publish(unavailableModelStatus("Could not open a local port for the model."));
    return;
  }

  const resolved = resolveOllamaCommand({
    platform: process.platform,
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    devOllamaDir: path.join(app.getAppPath(), "resources", "ollama"),
    exists: (filePath) => fs.existsSync(filePath),
  });
  if ("error" in resolved) {
    publish(unavailableModelStatus(resolved.error));
    return;
  }

  try {
    child = spawn(resolved.command, ["serve"], {
      env: ollamaServeEnv(process.env, host, modelsDir()),
      detached: process.platform !== "win32",
      windowsHide: true,
      stdio: ["ignore", "ignore", "ignore"],
    });
  } catch {
    publish(unavailableModelStatus("The local model runtime could not be started."));
    return;
  }

  if (process.platform !== "win32") child.unref();
  child.on("error", () => {
    publish(unavailableModelStatus("The local model runtime could not be started."));
  });
  child.on("exit", (code) => {
    console.log(JSON.stringify({ event: "ollama_exit", code: code ?? null }));
  });
  void startModelJob();
}

export function killOllama(): void {
  const pid = child?.pid;
  child = null;
  if (!pid) return;
  killProcessTree(process.platform, pid);
}

export function killOllamaSync(): void {
  killOllama();
}

export async function retryModelDownload(): Promise<ModelStatus> {
  publish(retryModelStatus());
  await startModelJob();
  return status;
}

export async function warmupAi(): Promise<boolean> {
  if (status.state === "ready") return true;
  if (status.state === "error" || status.state === "unavailable") return false;
  await startModelJob();
  return isAiReady();
}

function startModelJob(): Promise<void> {
  if (job) return job;
  job = ensureModel().finally(() => {
    job = null;
  });
  return job;
}

async function ensureModel(): Promise<void> {
  publish({ ...initialModelStatus(), statusText: "Checking the local model" });
  const up = await waitForTags(8000);
  if (!up) {
    publish(unavailableModelStatus("The local model server did not start."));
    return;
  }
  let tags: unknown = null;
  try {
    const response = await fetch(tagsRequest(host));
    if (response.ok) tags = await response.json();
  } catch {
    tags = null;
  }
  if (modelIsInstalled(tags, targetModel())) {
    await warm();
    return;
  }
  await runPull();
}

async function waitForTags(timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(tagsRequest(host));
      if (response.ok) return true;
    } catch {
      // server still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

async function runPull(): Promise<void> {
  publish({
    state: "downloading",
    percent: 0,
    completedBytes: 0,
    totalBytes: null,
    statusText: "Downloading the model",
    error: null,
  });
  const request = pullRequest(host, targetModel());
  let response: Response;
  try {
    response = await fetch(request.url, {
      method: request.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.body),
    });
  } catch {
    publish(downloadError("Model download failed"));
    return;
  }
  if (!response.ok || !response.body) {
    publish(downloadError("Model download failed"));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let current = status;
  let finished = false;
  while (!finished) {
    const next = await reader.read();
    finished = next.done;
    if (finished || !next.value) continue;
    const pushed = pushPullText(buffer, decoder.decode(next.value, { stream: true }), current);
    buffer = pushed.buffer;
    current = pushed.status;
    publish(current);
    if (current.state === "error") return;
  }
  if (buffer.trim()) {
    current = applyPullLine(current, buffer);
    publish(current);
  }
  if (current.state === "warming") {
    await warm();
    return;
  }
  if (current.state !== "error") publish(downloadError("Model download stopped", current));
}

function downloadError(message: string, current: ModelStatus = status): ModelStatus {
  return {
    state: "error",
    percent: current.percent,
    completedBytes: current.completedBytes,
    totalBytes: current.totalBytes,
    statusText: message,
    error: message,
  };
}

async function warm(): Promise<void> {
  publish({
    state: "warming",
    percent: 100,
    completedBytes: status.completedBytes,
    totalBytes: status.totalBytes,
    statusText: "Warming up the model",
    error: null,
  });
  try {
    const response = await fetch(`http://${host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: targetModel(),
        prompt: "Reply with one word: ready",
        stream: false,
        options: { temperature: 0 },
        keep_alive: "30m",
      }),
    });
    if (!response.ok) throw new Error("warm");
    publish({
      state: "ready",
      percent: 100,
      completedBytes: status.completedBytes,
      totalBytes: status.totalBytes,
      statusText: "Model ready",
      error: null,
    });
  } catch {
    publish({
      state: "error",
      percent: status.percent,
      completedBytes: status.completedBytes,
      totalBytes: status.totalBytes,
      statusText: "The model did not warm up",
      error: "The model did not warm up",
    });
  }
}
