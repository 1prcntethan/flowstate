import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  classify:      (payload: any) => ipcRenderer.invoke('session:classify', payload),
  setMiniMode:   ()             => ipcRenderer.invoke('window:mini'),
  setExpandMode: ()             => ipcRenderer.invoke('window:expand'),
})