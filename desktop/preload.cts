import type { DesktopBridge } from '../src/shared/desktop.js';

// Sandboxed preloads are CommonJS, even though the main process uses ESM.
const { contextBridge, ipcRenderer } = require('electron') as typeof import('electron');

const bridge: DesktopBridge = {
  loadProfile: () => ipcRenderer.invoke('profile:load'),
  saveProfile: (profile) => ipcRenderer.invoke('profile:save', profile),
  listExpeditions: () => ipcRenderer.invoke('expedition:list'),
  loadExpedition: (slot) => ipcRenderer.invoke('expedition:load', slot),
  saveExpedition: (slot, save) => ipcRenderer.invoke('expedition:save', slot, save),
  deleteExpedition: (slot) => ipcRenderer.invoke('expedition:delete', slot),
  onCloseRequested: (listener) => {
    const handler = (): void => listener();
    ipcRenderer.on('app:prepare-close', handler);
    void ipcRenderer.invoke('app:close-ready');
    return () => ipcRenderer.removeListener('app:prepare-close', handler);
  },
  completeClose: (saved) => ipcRenderer.invoke('app:complete-close', saved),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen'),
  quit: () => ipcRenderer.invoke('app:quit'),
  onFullscreenChanged: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, fullscreen: boolean): void =>
      listener(fullscreen);
    ipcRenderer.on('window:fullscreen-changed', handler);
    return () => ipcRenderer.removeListener('window:fullscreen-changed', handler);
  },
};

contextBridge.exposeInMainWorld('desktop', bridge);
