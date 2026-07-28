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
});
