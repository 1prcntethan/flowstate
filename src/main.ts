import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.webContents.on("will-navigate", (e) => {
    e.preventDefault();
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools({ mode: "detach" });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  Menu.setApplicationMenu(null); // Remove default menu, fix later for MAC
  createWindow();

  ipcMain.handle("window:mini", () => {
    if (!mainWindow) return;
    mainWindow.setResizable(true); // ← unlock first
    mainWindow.setSize(300, 185);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setResizable(false); // ← lock again
  });

  ipcMain.handle("window:expand", () => {
    if (!mainWindow) return;
    mainWindow.setResizable(true); // ← unlock first
    mainWindow.setSize(960, 720);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setResizable(false); // ← lock again
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
