import { app, BrowserWindow, ipcMain, Menu, safeStorage } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { spawn, exec, ChildProcess } from "child_process";
import os from "node:os";
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";
import fs from "node:fs";
import Store from "electron-store";
import { systemPreferences, shell } from "electron";
import "dotenv/config";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { powerMonitor } from "electron";

if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;
let ollamaProcess: ChildProcess | null = null;
let aiReady = false;
let ollamaServerUp = false;
let ollamaReadyPromise: Promise<boolean> = Promise.resolve(false);
const MODEL_NAME = "llama3.2:1b";

const store = new Store();

const createWindow = () => {
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
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.openDevTools({ mode: "detach" });
};

function startPythonSidecar() {
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

function stopPythonSidecar() {
  if (!pythonProcess || !pythonProcess.pid) return;
  if (process.platform === "win32") {
    exec(`taskkill /PID ${pythonProcess.pid} /T /F`);
  } else {
    pythonProcess.kill("SIGTERM");
  }
  pythonProcess = null;
}

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
  ollamaProcess?.kill();
  ollamaProcess = null;
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  createWindow();
  console.log("attempting python sidecar start");
  startPythonSidecar();
  console.log("attempting ollama start");
  spawnOllama();
  ollamaReadyPromise = waitForOllamaReady();
  ollamaServerUp = await ollamaReadyPromise;
  console.log("[ollama] server up:", ollamaServerUp);
});

ipcMain.handle("ai:isReady", () => aiReady);

ipcMain.handle("ai:warmup", async () => {
  const serverUp = await ollamaReadyPromise; // resolves instantly if already done, waits if not
  if (!serverUp) return false;
  aiReady = await warmUpModel();
  console.log("[ollama] model warm:", aiReady);
  return aiReady;
});

ipcMain.handle("system:getIdleTime", () => {
  return powerMonitor.getSystemIdleTime(); // seconds since last input
});

ipcMain.handle("window:mini", () => {
  if (!mainWindow) return;
  mainWindow.setResizable(true);
  mainWindow.setSize(300, 185);
  mainWindow.setAlwaysOnTop(true);
  mainWindow.setResizable(false);
  console.log("size: mini");
});

ipcMain.handle("window:expand", () => {
  if (!mainWindow) return;
  mainWindow.setResizable(true);
  mainWindow.setSize(960, 720);
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setResizable(false);
  console.log("size: default");
});

ipcMain.handle(
  "session:classify",
  async (_, payload: { subjects: string[]; todos: { text: string }[] }) => {
    try {
      const res = await fetch("http://localhost:5001/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch {
      console.log("classification failed");
      return {
        label: "ambiguous",
        confidence: 0.5,
        reason: "python unreachable",
      };
    }
  },
);

const userPool = new CognitoUserPool({
  UserPoolId: "us-west-1_iD3xkKD59",
  ClientId: "4g01ko2i56h93cd5fis0mg07i4",
});

const tokenPath = path.join(app.getPath("userData"), "auth.enc");

function storeTokens(tokens: object) {
  if (!safeStorage.isEncryptionAvailable()) return;
  fs.writeFileSync(
    tokenPath,
    safeStorage.encryptString(JSON.stringify(tokens)),
  );
  console.log("store tokens successful");
}

function loadTokens(): any | null {
  if (!fs.existsSync(tokenPath)) return null;
  console.log("attempt load tokens");
  return JSON.parse(safeStorage.decryptString(fs.readFileSync(tokenPath)));
}

const dynamoClient = new DynamoDBClient({
  region: "us-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const db = DynamoDBDocumentClient.from(dynamoClient);

ipcMain.handle("onboarding:getCompleted", () => {
  return store.get("onboardingCompleted", false);
});

ipcMain.handle("onboarding:setCompleted", () => {
  store.set("onboardingCompleted", true);
});

ipcMain.handle("permissions:getPlatform", () => process.platform);

ipcMain.handle("permissions:checkScreenAccess", () => {
  if (process.platform !== "darwin") return "granted"; // not applicable elsewhere
  return systemPreferences.getMediaAccessStatus("screen");
});

ipcMain.handle("permissions:openScreenSettings", () => {
  shell.openExternal(
    "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
  );
});

ipcMain.handle(
  "auth:signUp",
  (_, { email, password }) =>
    new Promise((resolve, reject) => {
      console.log("signup attempted");
      userPool.signUp(email, password, [], [], (err, result) => {
        if (err) reject(err.message);
        else resolve({ userSub: result!.userSub });
      });
    }),
);

ipcMain.handle("auth:confirmSignUp", (_, { email, code }) => {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  console.log("confirm signup attempted");
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err, result) => {
      if (err) reject(err.message);
      else resolve(result);
    });
  });
});

ipcMain.handle("auth:signIn", (_, { email, password }) => {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });
  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        storeTokens({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
        });
        console.log("[auth] Signed in:", email);
        resolve({ email });
      },
      onFailure: (err) => reject(err.message),
    });
  });
});

ipcMain.handle("auth:getSession", () => {
  const tokens = loadTokens();
  console.log("attempt get session tokens");
  if (!tokens) return null;

  const email = extractEmailFromIdToken(tokens.idToken);
  return { email, hasSession: true };
});

function extractEmailFromIdToken(idToken: string): string {
  const payload = JSON.parse(
    Buffer.from(idToken.split(".")[1], "base64").toString(),
  );
  return payload.email;
}

ipcMain.handle("auth:signOut", () => {
  if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath);
  console.log("signout complete");
});

ipcMain.handle("db:getUserProfile", async (_, userId: string) => {
  const res = await db.send(
    new GetCommand({ TableName: "flowstate-users", Key: { userId } }),
  );
  console.log("attempted get user profile");
  return res.Item ?? null;
});

ipcMain.handle("db:createUserProfile", async (_, profile: any) => {
  console.log("attempted create user profile");
  await db.send(
    new PutCommand({ TableName: "flowstate-users", Item: profile }),
  );
});

ipcMain.handle(
  "db:updateUserStats",
  async (_, { userId, coinDelta, newStreak }: any) => {
    console.log("attempted update user coins/streak");
    await db.send(
      new UpdateCommand({
        TableName: "flowstate-users",
        Key: { userId },
        UpdateExpression: "ADD coins :c SET streak = :s",
        ExpressionAttributeValues: { ":c": coinDelta, ":s": newStreak },
      }),
    );
  },
);

ipcMain.handle("db:saveSession", async (_, { userId, result }: any) => {
  console.log("attempted save session to db");
  await db.send(
    new PutCommand({
      TableName: "flowstate-sessions",
      Item: {
        userId,
        sessionId: `SESSION#${new Date().toISOString()}`,
        ...result,
      },
    }),
  );
});

ipcMain.handle(
  "db:getRecentSessions",
  async (_, userId: string, length: number) => {
    console.log("attempted pull recent sessions from db");
    const res = await db.send(
      new QueryCommand({
        TableName: "flowstate-sessions",
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": userId },
        ScanIndexForward: false, // newest first
        Limit: length,
      }),
    );
    return res.Items ?? [];
  },
);

ipcMain.handle("db:getTodaySessions", async (_, userId: string) => {
  const now = new Date();
  const startOfLocalDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const startOfNextLocalDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  console.log("attempted pull today sessions from db");
  const res = await db.send(
    new QueryCommand({
      TableName: "flowstate-sessions",
      KeyConditionExpression:
        "userId = :u AND sessionId BETWEEN :start AND :end",
      ExpressionAttributeValues: {
        ":u": userId,
        ":start": `SESSION#${startOfLocalDay.toISOString()}`,
        ":end": `SESSION#${startOfNextLocalDay.toISOString()}`,
      },
    }),
  );
  return res.Items ?? [];
});

app.on("before-quit", () => {
  killOllama();
});

app.on("before-quit", () => {
  stopPythonSidecar();
});

process.on("SIGINT", () => {
  // catches Ctrl+C in terminal
  stopPythonSidecar();
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
