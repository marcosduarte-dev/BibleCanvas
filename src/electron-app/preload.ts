import { contextBridge, ipcRenderer } from 'electron'

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('api', {
    invoke: (channel: string, data?: any) => ipcRenderer.invoke(channel, data)
})
