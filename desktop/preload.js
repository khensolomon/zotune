// Preload: the only bridge between the page and Electron. Exposes window
// controls, the platform name and deep links; nothing else.

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zotune', {
  platform: process.platform,
  minimise: () => ipcRenderer.send('window', 'minimise'),
  toggleMaximise: () => ipcRenderer.send('window', 'toggle-maximise'),
  close: () => ipcRenderer.send('window', 'close'),
  onMaximised: (fn) => ipcRenderer.on('maximised', (_e, on) => fn(Boolean(on))),
  onDeepLink: (fn) => ipcRenderer.on('deep-link', (_e, p) => {
    if (typeof p === 'string' && p.startsWith('/')) fn(p);
  })
});
