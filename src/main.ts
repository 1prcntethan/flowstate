import { app, BrowserWindow, Menu } from "electron";
import started from "electron-squirrel-startup";
import "dotenv/config";
import { createWindow } from "./main/windows";
import { startPythonSidecar, stopPythonSidecarSync } from "./main/sidecar";
import { beginOllama, killOllamaSync } from "./main/ollama";
import { registerIpc } from "./main/ipc";

if (started) {
  app.quit();
}

registerIpc();

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  createWindow();
  await beginOllama();
  await startPythonSidecar();
});

app.on("before-quit", () => {
  stopPythonSidecarSync();
  killOllamaSync();
});

process.on("SIGINT", () => {
  console.log("[shutdown] SIGINT received");
  stopPythonSidecarSync();
  killOllamaSync();
  app.quit();
  process.exit(0);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
