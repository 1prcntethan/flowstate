import { ipcMain, systemPreferences, shell } from "electron";
import { store } from "./store";
import { setMiniWindow, setExpandWindow } from "./windows";
import { isAiReady, warmupAi } from "./ollama";
import { getSystemIdleTime, classifySession } from "./tracker";
import { signUp, confirmSignUp, signIn, getSession, signOut } from "./auth";
import {
  getUserProfile,
  createUserProfile,
  updateUserStats,
  saveSession,
  getRecentSessions,
  getTodaySessions,
  updateUserSubjects,
} from "./apiClient";

export function registerIpc() {
  ipcMain.handle("ai:isReady", () => isAiReady());

  ipcMain.handle("ai:warmup", () => warmupAi());

  ipcMain.handle("system:getIdleTime", () => getSystemIdleTime());

  ipcMain.handle("window:mini", () => {
    setMiniWindow();
  });

  ipcMain.handle("window:expand", () => {
    setExpandWindow();
  });

  ipcMain.handle(
    "session:classify",
    (_, payload: { subjects: string[]; todos: { text: string }[] }) =>
      classifySession(payload),
  );

  ipcMain.handle("onboarding:getCompleted", (_, userId: string) =>
    store.get(`onboardingCompleted:${userId}`, false),
  );

  ipcMain.handle("onboarding:setCompleted", (_, userId: string) =>
    store.set(`onboardingCompleted:${userId}`, true),
  );

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

  ipcMain.handle("auth:signUp", (_, { email, password }) =>
    signUp(email, password),
  );

  ipcMain.handle("auth:confirmSignUp", (_, { email, code }) =>
    confirmSignUp(email, code),
  );

  ipcMain.handle("auth:signIn", (_, { email, password }) =>
    signIn(email, password),
  );

  ipcMain.handle("auth:getSession", () => getSession());

  ipcMain.handle("auth:signOut", () => signOut());

  ipcMain.handle("db:getUserProfile", (_, userId: string) =>
    getUserProfile(userId),
  );

  ipcMain.handle("db:createUserProfile", (_, profile: any) =>
    createUserProfile(profile),
  );

  ipcMain.handle(
    "db:updateUserStats",
    (_, payload: any) => updateUserStats(payload),
  );

  ipcMain.handle("db:saveSession", (_, payload: any) => saveSession(payload));

  ipcMain.handle(
    "db:getRecentSessions",
    (_, userId: string, length: number) => getRecentSessions(userId, length),
  );

  ipcMain.handle("db:getTodaySessions", (_, userId: string) =>
    getTodaySessions(userId),
  );

  ipcMain.handle("db:updateUserSubjects", (_, payload: any) =>
    updateUserSubjects(payload),
  );
}
