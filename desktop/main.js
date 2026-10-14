// Electron main process: frameless window that serves app/ from a privileged
// app:// scheme, so routes, module workers and IndexedDB behave as on the web.

'use strict';

const { app, BrowserWindow, ipcMain, net, protocol, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { deepLinkPath, DEEP_LINK } = require('./links.js');

const APP_ROOT = path.resolve(__dirname, '..', 'app');
const ORIGIN = 'app://zotune';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

/** Maps an app:// URL to a file in app/, falling back to index.html for routes. */
function resolveFile(requestUrl) {
  const { pathname } = new URL(requestUrl);
  let rel;
  try {
    rel = path.normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  } catch {
    return { status: 400 };
  }
  const full = path.join(APP_ROOT, rel);
  if (full !== APP_ROOT && !full.startsWith(APP_ROOT + path.sep)) return { status: 403 };
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return { file: full };
  if (/^\/(assets|css|data|fonts|js)\//.test(pathname)) return { status: 404 };
  return { file: path.join(APP_ROOT, 'index.html') };
}

let win = null;
let pendingLink = null;

function sendDeepLink(link) {
  const p = deepLinkPath(link);
  if (!p) return;
  if (win && !win.webContents.isLoading()) win.webContents.send('deep-link', p);
  else pendingLink = p;
}

function createWindow() {
  const isMac = process.platform === 'darwin';
  win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 360,
    minHeight: 480,
    show: false,
    backgroundColor: '#ffffff',
    title: 'zotune',
    icon: path.join(APP_ROOT, 'assets', 'icon-512.png'),
    frame: isMac,
    titleBarStyle: isMac ? 'hidden' : undefined,
    trafficLightPosition: isMac ? { x: 18, y: 20 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  win.once('ready-to-show', () => win.show());
  win.on('maximize', () => win.webContents.send('maximised', true));
  win.on('unmaximize', () => win.webContents.send('maximised', false));
  win.on('closed', () => {
    win = null;
  });

  // Keep navigation inside the app; open everything else in the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${ORIGIN}/`)) {
      event.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });
  win.webContents.on('did-finish-load', () => {
    if (pendingLink) {
      win.webContents.send('deep-link', pendingLink);
      pendingLink = null;
    }
  });

  win.loadURL(`${ORIGIN}/`);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const link = argv.find((a) => a.startsWith(`${DEEP_LINK}://`));
    if (link) sendDeepLink(link);
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  // macOS delivers links through open-url, possibly before the window exists.
  app.on('open-url', (event, link) => {
    event.preventDefault();
    sendDeepLink(link);
  });

  const firstLink = process.argv.find((a) => a.startsWith(`${DEEP_LINK}://`));
  if (firstLink) pendingLink = deepLinkPath(firstLink);

  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(DEEP_LINK, process.execPath, [path.resolve(process.argv[1])]);
  } else {
    app.setAsDefaultProtocolClient(DEEP_LINK);
  }

  ipcMain.on('window', (event, action) => {
    const w = BrowserWindow.fromWebContents(event.sender);
    if (!w) return;
    if (action === 'minimise') w.minimize();
    else if (action === 'toggle-maximise') (w.isMaximized() ? w.unmaximize() : w.maximize());
    else if (action === 'close') w.close();
  });

  app.whenReady().then(() => {
    protocol.handle('app', (request) => {
      const { file, status } = resolveFile(request.url);
      if (!file) return new Response(null, { status });
      return net.fetch(pathToFileURL(file).toString());
    });
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
