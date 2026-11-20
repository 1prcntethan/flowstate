import net from "node:net";
import path from "node:path";

export const DEFAULT_OLLAMA_MODEL = "llama3.2:1b";

export type ModelState =
  | "checking"
  | "downloading"
  | "warming"
  | "ready"
  | "error"
  | "unavailable";

export type ModelStatus = {
  state: ModelState;
  percent: number | null;
  completedBytes: number | null;
  totalBytes: number | null;
  statusText: string;
  error: string | null;
};

export function initialModelStatus(): ModelStatus {
  return {
    state: "checking",
    percent: null,
    completedBytes: null,
    totalBytes: null,
    statusText: "Checking the local model",
    error: null,
  };
}

export function unavailableModelStatus(error: string): ModelStatus {
  return {
    state: "unavailable",
    percent: null,
    completedBytes: null,
    totalBytes: null,
    statusText: "Keyword fallback is running",
    error,
  };
}

export function retryModelStatus(): ModelStatus {
  return {
    state: "checking",
    percent: null,
    completedBytes: null,
    totalBytes: null,
    statusText: "Resuming the model download",
    error: null,
  };
}

export function targetModel(env: NodeJS.ProcessEnv = process.env): string {
  const name = env.FLOWSTATE_OLLAMA_MODEL?.trim();
  return name && name.length > 0 ? name : DEFAULT_OLLAMA_MODEL;
}

export function ollamaHostFor(port: number): string {
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("bad port");
  }
  return `127.0.0.1:${port}`;
}

export function allocateLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("no port")));
        return;
      }
      const { port } = address;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

export function ollamaBinaryCandidates(input: {
  platform: NodeJS.Platform;
  resourcesPath: string;
  devOllamaDir: string;
}): string[] {
  const file = input.platform === "win32" ? "ollama.exe" : "ollama";
  const folder = input.platform === "win32" ? "win" : "mac";
  return [
    path.join(input.resourcesPath, "ollama", folder, file),
    path.join(input.resourcesPath, "ollama", file),
    path.join(input.devOllamaDir, folder, file),
    path.join(input.devOllamaDir, file),
  ];
}

export function resolveOllamaCommand(input: {
  platform: NodeJS.Platform;
  isPackaged: boolean;
  resourcesPath: string;
  devOllamaDir: string;
  exists: (filePath: string) => boolean;
}): { command: string; source: "bundled" | "dev" | "path" } | { error: string } {
  const candidates = ollamaBinaryCandidates(input);
  for (const candidate of candidates) {
    if (!input.exists(candidate)) continue;
    const bundled = candidate.startsWith(input.resourcesPath);
    return { command: candidate, source: bundled && input.isPackaged ? "bundled" : "dev" };
  }
  if (!input.isPackaged) {
    return { command: input.platform === "win32" ? "ollama.exe" : "ollama", source: "path" };
  }
  return { error: "The bundled model runtime was not found." };
}

export function ollamaServeEnv(
  base: NodeJS.ProcessEnv,
  host: string,
  modelsDir: string,
): NodeJS.ProcessEnv {
  return { ...base, OLLAMA_HOST: host, OLLAMA_MODELS: modelsDir };
}

export function modelIsInstalled(body: unknown, model: string): boolean {
  if (!body || typeof body !== "object") return false;
  const models = (body as { models?: unknown }).models;
  if (!Array.isArray(models)) return false;
  return models.some((item) => {
    if (!item || typeof item !== "object") return false;
    const name = (item as { name?: unknown }).name;
    return typeof name === "string" && (name === model || name.endsWith(`/${model}`));
  });
}

export function pullRequest(host: string, model: string): {
  url: string;
  method: "POST";
  body: { model: string; stream: true };
} {
  return {
    url: `http://${host}/api/pull`,
    method: "POST",
    body: { model, stream: true },
  };
}

export function tagsRequest(host: string): string {
  return `http://${host}/api/tags`;
}

export function applyPullLine(prev: ModelStatus, line: string): ModelStatus {
  const trimmed = line.trim();
  if (!trimmed) return prev;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return prev;
  }
  if (!parsed || typeof parsed !== "object") return prev;
  const record = parsed as Record<string, unknown>;
  if (typeof record.error === "string") {
    return {
      ...prev,
      state: "error",
      error: "Model download failed",
      statusText: "Model download failed",
    };
  }
  if (record.status === "success") {
    return {
      ...prev,
      state: "warming",
      percent: 100,
      statusText: "Warming up the model",
      error: null,
    };
  }
  const completed = typeof record.completed === "number" ? record.completed : prev.completedBytes;
  const total = typeof record.total === "number" ? record.total : prev.totalBytes;
  let percent = prev.percent;
  if (typeof completed === "number" && typeof total === "number" && total > 0) {
    percent = Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
  }
  const statusText =
    typeof record.status === "string" && record.status.length > 0 && record.status.length <= 80
      ? record.status
      : "Downloading the model";
  return {
    state: "downloading",
    percent,
    completedBytes: completed,
    totalBytes: total,
    statusText,
    error: null,
  };
}

export function pushPullText(
  buffer: string,
  chunk: string,
  prev: ModelStatus,
): { buffer: string; status: ModelStatus } {
  const combined = buffer + chunk;
  const lines = combined.split("\n");
  const rest = lines.pop() ?? "";
  let status = prev;
  for (const line of lines) status = applyPullLine(status, line);
  return { buffer: rest, status };
}

export function consumePullNdjson(prev: ModelStatus, ndjson: string): ModelStatus {
  return pushPullText("", ndjson.endsWith("\n") ? ndjson : `${ndjson}\n`, prev).status;
}
