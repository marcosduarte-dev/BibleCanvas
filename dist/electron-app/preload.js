"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose a safe API to the renderer process
electron_1.contextBridge.exposeInMainWorld('api', {
    invoke: (channel, data) => electron_1.ipcRenderer.invoke(channel, data)
});
