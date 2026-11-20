import path from "node:path";

export type ClassifyResult = {
  label: "on_task" | "off_task" | "ambiguous";
  confidence: number;
  reason: string;
  source: "ollama" | "fallback";
  fallbackStage: "domain" | "subject" | "todo" | "none" | null;
};

export type SidecarStatus = {
  state: "stopped" | "starting" | "ready" | "restarting" | "error";
  error: string | null;
  port: number | null;
};

export type PythonCandidate = {
  command: string;
  args: string[];
  version: string | null;
};

const SAFE_EVENTS = new Set([
  "ready",
  "classified",
  "ollama_unavailable",
  "capture_failed",
  "error",
]);

export function acceptPythonVersion(version: string | null): boolean {
  return version === "3.11" || version === "3.12";
}

export function pythonLaunchCandidates(
  platform: NodeJS.Platform,
): { command: string; args: string[] }[] {
  if (platform === "win32") {
    return [
      { command: "py", args: ["-3.12"] },
      { command: "py", args: ["-3.11"] },
      { command: "python", args: [] },
    ];
  }
  return [
    { command: "python3.12", args: [] },
    { command: "python3.11", args: [] },
    { command: "python3", args: [] },
  ];
}

export function selectPython(
  probed: readonly PythonCandidate[],
): { command: string; args: string[] } | { error: string } {
  for (const candidate of probed) {
    if (acceptPythonVersion(candidate.version)) {
      return { command: candidate.command, args: candidate.args };
    }
  }
  return {
    error: "Flowstate needs Python 3.12 or 3.11 on PATH. Python 3.14 is not supported.",
  };
}

export function packagedSidecarCandidates(
  resourcesPath: string,
  platform: NodeJS.Platform,
): string[] {
  const file = platform === "win32" ? "flowstate-sidecar.exe" : "flowstate-sidecar";
  return [
    path.join(resourcesPath, "sidecar", file),
    path.join(resourcesPath, "sidecar", "flowstate-sidecar", file),
  ];
}

export function resolveSidecarLaunch(input: {
  isPackaged: boolean;
  packagedBinary: string | null;
  scriptPath: string;
  pythonOverride: string | null;
  overrideVersion: string | null;
  probed: readonly PythonCandidate[];
}):
  | { kind: "binary"; command: string; args: string[] }
  | { kind: "python"; command: string; args: string[] }
  | { error: string } {
  if (input.pythonOverride) {
    if (!acceptPythonVersion(input.overrideVersion)) {
      return { error: "FLOWSTATE_PYTHON must be Python 3.12 or 3.11." };
    }
    return {
      kind: "python",
      command: input.pythonOverride,
      args: ["-u", input.scriptPath],
    };
  }
  if (input.packagedBinary) {
    return { kind: "binary", command: input.packagedBinary, args: [] };
  }
  if (input.isPackaged && !input.packagedBinary) {
    const selected = selectPython(input.probed);
    if ("error" in selected) {
      return { error: "The packaged capture service was not found, and Python 3.12 or 3.11 is not on PATH." };
    }
    return {
      kind: "python",
      command: selected.command,
      args: [...selected.args, "-u", input.scriptPath],
    };
  }
  const selected = selectPython(input.probed);
  if ("error" in selected) return selected;
  return {
    kind: "python",
    command: selected.command,
    args: [...selected.args, "-u", input.scriptPath],
  };
}

export function sidecarEnv(input: {
  base: NodeJS.ProcessEnv;
  token: string;
  ollamaHost: string;
  model: string;
  resourcesDir?: string;
}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...input.base,
    FLOWSTATE_SIDECAR_TOKEN: input.token,
    FLOWSTATE_SIDECAR_PORT: "0",
    OLLAMA_HOST: input.ollamaHost,
    FLOWSTATE_OLLAMA_MODEL: input.model,
  };
  if (input.resourcesDir) env.FLOWSTATE_RESOURCES_DIR = input.resourcesDir;
  return env;
}

export function parseReadyLine(line: string): { host: "127.0.0.1"; port: number } | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  if (record.event !== "ready" || record.host !== "127.0.0.1") return null;
  if (
    typeof record.port !== "number" ||
    !Number.isInteger(record.port) ||
    record.port <= 0 ||
    record.port > 65535
  ) {
    return null;
  }
  return { host: "127.0.0.1", port: record.port };
}

export function healthRequest(port: number, token: string): {
  url: string;
  headers: { Authorization: string };
} {
  return {
    url: `http://127.0.0.1:${port}/health`,
    headers: { Authorization: `Bearer ${token}` },
  };
}

export function classifyRequest(
  port: number,
  token: string,
  payload: { subjects: string[]; todos: { text: string }[] },
): {
  url: string;
  method: "POST";
  headers: { Authorization: string; "Content-Type": string };
  body: string;
} {
  return {
    url: `http://127.0.0.1:${port}/classify`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };
}

export function safeSidecarLine(line: string, token: string): string | null {
  if (!line.trim() || (token && line.includes(token))) return null;
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  if (typeof record.event !== "string" || !SAFE_EVENTS.has(record.event)) return null;
  const safe: Record<string, string | number | null> = { event: record.event };
  for (const key of ["label", "source", "fallbackStage", "error", "host", "port", "python"]) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) safe[key] = value;
    else if (value === null) safe[key] = null;
    else if (typeof value === "string" && value.length <= 80 && (!token || !value.includes(token))) {
      safe[key] = value;
    }
  }
  return JSON.stringify(safe);
}

export function normalizeClassifyResult(body: unknown): ClassifyResult {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const label =
    record.label === "on_task" || record.label === "off_task" || record.label === "ambiguous"
      ? record.label
      : "ambiguous";
  const confidence =
    typeof record.confidence === "number" && record.confidence >= 0 && record.confidence <= 1
      ? record.confidence
      : 0.5;
  const reason =
    typeof record.reason === "string" && record.reason.length <= 80 ? record.reason : "no match";
  const source = record.source === "ollama" ? "ollama" : "fallback";
  const stage = record.fallbackStage;
  const fallbackStage =
    stage === "domain" || stage === "subject" || stage === "todo" || stage === "none"
      ? stage
      : source === "ollama"
        ? null
        : "none";
  return { label, confidence, reason, source, fallbackStage };
}

export function unreachableClassify(): ClassifyResult {
  return {
    label: "ambiguous",
    confidence: 0.5,
    reason: "python unreachable",
    source: "fallback",
    fallbackStage: "none",
  };
}

export class SidecarSupervisor {
  crashes = 0;
  status: SidecarStatus = { state: "stopped", error: null, port: null };
  private quitting = false;

  markQuitting(): void {
    this.quitting = true;
  }

  markStarting(): void {
    this.status = {
      state: this.crashes > 0 ? "restarting" : "starting",
      error: null,
      port: null,
    };
  }

  markReady(port: number): void {
    this.status = { state: "ready", error: null, port };
  }

  markError(error: string): void {
    this.status = { state: "error", error, port: null };
  }

  unexpectedExit(): "restart" | "fail" | "ignore" {
    if (this.quitting) return "ignore";
    if (this.crashes === 0) {
      this.crashes = 1;
      this.status = { state: "restarting", error: null, port: null };
      return "restart";
    }
    this.crashes += 1;
    this.status = {
      state: "error",
      error: "Screen checks stopped. Restart Flowstate to try again.",
      port: null,
    };
    return "fail";
  }

  resetForManualRetry(): void {
    this.quitting = false;
    this.crashes = 0;
    this.status = { state: "starting", error: null, port: null };
  }
}
