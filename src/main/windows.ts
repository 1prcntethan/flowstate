import { BrowserWindow } from "electron";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;

export function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    resizable: false,
    icon: path.join(__dirname, "../public/logo512dark.ico"),
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "rgb(12, 6, 10)", // background of the button strip
      symbolColor: "#e8def8", // color of the −, □, X glyphs themselves
      height: 32,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.webContents.on("will-navigate", (e) => {
    e.preventDefault();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

export function setMiniWindow() {
  if (!mainWindow) return;
  mainWindow.setResizable(true);
  mainWindow.setSize(300, 185);
  mainWindow.setAlwaysOnTop(true);
  mainWindow.setResizable(false);
  console.log("size: mini");
}

export function setExpandWindow() {
  if (!mainWindow) return;
  mainWindow.setResizable(true);
  mainWindow.setSize(960, 720);
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setResizable(false);
  console.log("size: default");
}
