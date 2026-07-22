import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { spawn, exec, ChildProcess } from 'child_process' 
import os from 'node:os'

if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null

const createWindow = () => {
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

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.openDevTools({ mode: "detach" });
};

function startPythonSidecar() {
  const pythonExe = process.platform === 'win32'
    ? `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe`
    : '/Library/Frameworks/Python.framework/Versions/3.11/bin/python3'

  const scriptPath = path.join(__dirname, '../../python/server.py')
  pythonProcess = spawn(pythonExe, ['-u', scriptPath])
  pythonProcess.stdout?.on('data', d => console.log('[Python]', d.toString().trim()))
  pythonProcess.stderr?.on('data', d => console.error('[Python error]', d.toString().trim()))
}

function stopPythonSidecar() {
  if (!pythonProcess || !pythonProcess.pid) return
  if (process.platform === 'win32') {
    exec(`taskkill /PID ${pythonProcess.pid} /T /F`)
  } else {
    pythonProcess.kill('SIGTERM')
  }
  pythonProcess = null
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  startPythonSidecar();

  ipcMain.handle("window:mini", () => {
    if (!mainWindow) return;
    mainWindow.setResizable(true);
    mainWindow.setSize(300, 185);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setResizable(false);
  });

  ipcMain.handle("window:expand", () => {
    if (!mainWindow) return;
    mainWindow.setResizable(true);
    mainWindow.setSize(960, 720);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setResizable(false);
  });

  ipcMain.handle('session:classify', async (_, payload: { subjects: string[], todos: { text: string }[] }) => {
    try {
      const res = await fetch('http://localhost:5001/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      return await res.json()
    } catch {
      return { label: 'ambiguous', confidence: 0.5, reason: 'python unreachable' }
    }
  })
});

app.on('before-quit', () => { stopPythonSidecar() }) 

process.on('SIGINT', () => {  // catches Ctrl+C in terminal
  stopPythonSidecar()
  app.quit()
  process.exit(0)
})

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