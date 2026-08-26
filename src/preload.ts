import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  classify: (payload: any) => ipcRenderer.invoke("session:classify", payload),
  setMiniMode: () => ipcRenderer.invoke("window:mini"),
  setExpandMode: () => ipcRenderer.invoke("window:expand"),
  signUp: (email: string, password: string) =>
    ipcRenderer.invoke("auth:signUp", { email, password }),
  confirmSignUp: (email: string, code: string) =>
    ipcRenderer.invoke("auth:confirmSignUp", { email, code }),
  signIn: (email: string, password: string) =>
    ipcRenderer.invoke("auth:signIn", { email, password }),
  getSession: () => ipcRenderer.invoke("auth:getSession"),
  signOut: () => ipcRenderer.invoke("auth:signOut"),
  getOnboardingCompleted: () => ipcRenderer.invoke("onboarding:getCompleted"),
  setOnboardingCompleted: () => ipcRenderer.invoke("onboarding:setCompleted"),
  getPlatform: () => ipcRenderer.invoke("permissions:getPlatform"),
  checkScreenAccess: () => ipcRenderer.invoke("permissions:checkScreenAccess"),
  openScreenSettings: () =>
    ipcRenderer.invoke("permissions:openScreenSettings"),
  getUserProfile: (userId: string) =>
    ipcRenderer.invoke("db:getUserProfile", userId),
  createUserProfile: (profile: any) =>
    ipcRenderer.invoke("db:createUserProfile", profile),
  updateUserStats: (payload: any) =>
    ipcRenderer.invoke("db:updateUserStats", payload),
  saveSession: (payload: any) => ipcRenderer.invoke("db:saveSession", payload),
  getRecentSessions: (userId: string, length: number) =>
    ipcRenderer.invoke("db:getRecentSessions", userId, length),
  getTodaySessions: (userId: string) =>
    ipcRenderer.invoke("db:getTodaySessions", userId),
  getIdleTime: () => ipcRenderer.invoke("system:getIdleTime"),
  isReady: () => ipcRenderer.invoke("ai:isReady"),
});
