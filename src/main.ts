import { app, BrowserWindow, Menu } from "electron";
import started from "electron-squirrel-startup";
import "dotenv/config";
import { createWindow } from "./main/windows";
import {
  startPythonSidecar,
  stopPythonSidecar,
  stopPythonSidecarSync,
} from "./main/sidecar";
import { beginOllama, killOllama, killOllamaSync } from "./main/ollama";
import { registerIpc } from "./main/ipc";

if (started) {
  app.quit();
}

registerIpc();

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  createWindow();
  console.log("attempting python sidecar start");
  startPythonSidecar();
  await beginOllama();
});

app.on("before-quit", () => {
  stopPythonSidecar();
  killOllama();
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
