import { spawn, exec, execSync, ChildProcess } from "child_process";
import os from "node:os";
import path from "node:path";

let pythonProcess: ChildProcess | null = null;

export function startPythonSidecar() {
  const pythonExe =
    process.platform === "win32"
      ? `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe`
      : "/Library/Frameworks/Python.framework/Versions/3.11/bin/python3";
  const scriptPath = path.join(__dirname, "../../python/server.py");
  pythonProcess = spawn(pythonExe, ["-u", scriptPath]);
  pythonProcess.stdout?.on("data", (d) =>
    console.log("[Python]", d.toString().trim()),
  );
  pythonProcess.stderr?.on("data", (d) =>
    console.error("[Python error]", d.toString().trim()),
  );
}

export function stopPythonSidecar() {
  if (!pythonProcess || !pythonProcess.pid) return;
  if (process.platform === "win32") {
    exec(`taskkill /PID ${pythonProcess.pid} /T /F`);
  } else {
    pythonProcess.kill("SIGTERM");
  }
  pythonProcess = null;
}

export function stopPythonSidecarSync() {
  if (!pythonProcess || !pythonProcess.pid) return;
  if (process.platform === "win32") {
    try {
      execSync(`taskkill /PID ${pythonProcess.pid} /T /F`, { stdio: "ignore" });
    } catch {
      // process already exited
    }
  } else {
    pythonProcess.kill("SIGTERM");
  }
  pythonProcess = null;
}
