import { app, BrowserWindow, dialog, ipcMain, Menu, screen } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ProfileStore } from './profile.js';

const directory = fileURLToPath(new URL('.', import.meta.url));
const indexFile = resolve(directory, '../../dist/index.html');
// A packaged build always loads its bundled files, regardless of environment variables.
const devUrl = !app.isPackaged ? process.env.GLOAM_DEV_SERVER_URL : undefined;
if (devUrl) {
  const url = new URL(devUrl);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1')
    throw new Error('Development server must use localhost');
}

app.setName('Hordes of the Fallen Sky');
// Standard Chromium switch gives tests their own profile without touching real saves.
const userData = app.commandLine.getSwitchValue('user-data-dir');
app.setPath('userData', userData ? resolve(userData) : join(app.getPath('appData'), 'Gloam'));

let window: BrowserWindow | null = null;
const profiles = new ProfileStore(join(app.getPath('userData'), 'saves'));
let quitting = false;

function trusted(event: IpcMainInvokeEvent): void {
  const expected = devUrl ?? pathToFileURL(indexFile).href;
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame ||
    event.senderFrame.url !== expected
  ) {
    throw new Error('Untrusted desktop request');
  }
}

function toggleFullscreen(): boolean {
  if (!window) return false;
  const next = !window.isFullScreen();
  window.setFullScreen(next);
  return next;
}

async function createWindow(): Promise<void> {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const initialWidth = Math.min(1280, width);
  const initialHeight = Math.min(800, height);
  window = new BrowserWindow({
    title: 'Hordes of the Fallen Sky',
    width: initialWidth,
    height: initialHeight,
    minWidth: Math.min(800, width),
    minHeight: Math.min(600, height),
    backgroundColor: '#14272c',
    show: false,
    autoHideMenuBar: true,
    icon: resolve(directory, '../../build/icon.png'),
    webPreferences: {
      preload: join(directory, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      autoplayPolicy: 'no-user-gesture-required',
      devTools: !app.isPackaged,
    },
  });
  Menu.setApplicationMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('will-redirect', (event) => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.isAutoRepeat) return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      event.preventDefault();
      toggleFullscreen();
    }
    if (
      app.isPackaged &&
      (input.key === 'F5' || ((input.control || input.meta) && input.key.toLowerCase() === 'r'))
    )
      event.preventDefault();
  });
  window.on('enter-full-screen', () => window?.webContents.send('window:fullscreen-changed', true));
  window.on('leave-full-screen', () =>
    window?.webContents.send('window:fullscreen-changed', false),
  );
  window.once('ready-to-show', () => window?.show());
  window.on('closed', () => {
    window = null;
  });
  if (devUrl) await window.loadURL(devUrl);
  else await window.loadFile(indexFile);
}

ipcMain.handle('profile:load', (event) => {
  trusted(event);
  return profiles.load();
});
ipcMain.handle('profile:save', (event, value: unknown) => {
  trusted(event);
  return profiles.save(value);
});
ipcMain.handle('window:toggle-fullscreen', (event) => {
  trusted(event);
  return toggleFullscreen();
});
ipcMain.handle('window:is-fullscreen', (event) => {
  trusted(event);
  return window?.isFullScreen() ?? false;
});
ipcMain.handle('app:quit', (event) => {
  trusted(event);
  setImmediate(() => app.quit());
});

app.on('before-quit', (event) => {
  if (quitting) return;
  event.preventDefault();
  quitting = true;
  void profiles.flush().finally(() => app.quit());
});
app.on('window-all-closed', () => app.quit());
app
  .whenReady()
  .then(createWindow)
  .catch((error: unknown) => {
    dialog.showErrorBox('Hordes of the Fallen Sky could not start', String(error));
    app.quit();
  });
