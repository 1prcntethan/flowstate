import { app } from "electron";
import { spawn, exec, execSync, ChildProcess } from "child_process";
import path from "node:path";

let ollamaProcess: ChildProcess | null = null;
let aiReady = false;
let ollamaServerUp = false;
let ollamaReadyPromise: Promise<boolean> = Promise.resolve(false);
const MODEL_NAME = "llama3.2:1b";

function getOllamaBinaryPath(): string {
  const platformBinary = process.platform === "win32" ? "ollama.exe" : "ollama";
  const platformDir = process.platform === "win32" ? "win" : "mac";
  console.log("attempting fetch ollama path");
  const base = app.isPackaged
    ? path.join(process.resourcesPath, "ollama")
    : path.join(__dirname, "..", "..", "resources", "ollama", platformDir); // two levels, matching the Python sidecar path
  return path.join(base, platformBinary);
}

function getModelsDir(): string {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, "ollama", "models")
    : path.join(__dirname, "..", "..", "resources", "ollama", "models");
  console.log("attempting fetch ollama model dir.");
  return base;
}

export function spawnOllama(): void {
  const binaryPath = getOllamaBinaryPath();
  ollamaProcess = spawn(binaryPath, ["serve"], {
    env: { ...process.env, OLLAMA_MODELS: getModelsDir() },
  });

  ollamaProcess.stdout?.on("data", (d) =>
    console.log("[ollama]", d.toString()),
  );
  ollamaProcess.stderr?.on("data", (d) =>
    console.error("[ollama:err]", d.toString()),
  );
  ollamaProcess.on("exit", (code) => console.log("[ollama] exited with", code));
}

export async function waitForOllamaReady(timeoutMs = 8000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch("http://localhost:11434/api/tags");
      if (res.ok) return true;
    } catch {
      // not ready yet, keep polling
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("wait for ollama failed: switch to keywork matching");
  return false; // gave up — caller should fall back to keyword-only mode
}

async function warmUpModel(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: "Reply with one word: ready",
        stream: false,
        keep_alive: "30m", // keeps the model loaded well past your longest break
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function killOllama(): void {
  if (process.platform === "win32") {
    exec("taskkill /IM ollama.exe /F", (err, stdout, stderr) => {
      console.log(
        "[ollama] kill ollama.exe:",
        stdout?.trim() || stderr?.trim() || err?.message,
      );
    });
    exec("taskkill /IM llama-server.exe /F", (err, stdout, stderr) => {
      console.log(
        "[ollama] kill llama-server.exe:",
        stdout?.trim() || stderr?.trim() || err?.message,
      );
    });
  } else {
    ollamaProcess?.kill("SIGTERM");
    exec("pkill -f llama-server"); // Mac: ollama's child isn't tracked via Node's handle either
  }
  ollamaProcess = null;
}

export function killOllamaSync(): void {
  if (process.platform === "win32") {
    try {
      execSync("taskkill /IM ollama.exe /F", { stdio: "ignore" });
    } catch {}
    try {
      execSync("taskkill /IM llama-server.exe /F", { stdio: "ignore" });
    } catch {}
  } else {
    ollamaProcess?.kill("SIGTERM");
    try {
      execSync("pkill -f llama-server");
    } catch {}
  }
  ollamaProcess = null;
}

export async function beginOllama(): Promise<void> {
  console.log("attempting ollama start");
  spawnOllama();
  ollamaReadyPromise = waitForOllamaReady();
  ollamaServerUp = await ollamaReadyPromise;
  console.log("[ollama] server up:", ollamaServerUp);
}

export function isAiReady(): boolean {
  return aiReady;
}

export async function warmupAi(): Promise<boolean> {
  const serverUp = await ollamaReadyPromise; // resolves instantly if already done, waits if not
  if (!serverUp) return false;
  aiReady = await warmUpModel();
  console.log("[ollama] model warm:", aiReady);
  return aiReady;
}
