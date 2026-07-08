'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('idm', {
  winMin: () => ipcRenderer.invoke('win:min'),
  winMax: () => ipcRenderer.invoke('win:max'),
  winClose: () => ipcRenderer.invoke('win:close'),
  winResize: (width, height) => ipcRenderer.invoke('win:resize', { width, height }),
  openExternal: (url) => ipcRenderer.invoke('ext:open', url),
  setLimit: (id, bytesPerSec) => ipcRenderer.invoke('dl:limit', { id, bytesPerSec }),
  setQueue: (id, queue) => ipcRenderer.invoke('dl:setQueue', { id, queue }),
  grab: (url) => ipcRenderer.invoke('grabber:fetch', url),

  list: () => ipcRenderer.invoke('dl:list'),
  get: (id) => ipcRenderer.invoke('dl:get', id),
  add: (url) => ipcRenderer.invoke('dl:add', { url }),
  addStart: (url) => ipcRenderer.invoke('dl:addStart', { url }),
  confirm: (opts) => ipcRenderer.invoke('dl:confirm', opts),
  start: (id) => ipcRenderer.invoke('dl:start', id),
  pause: (id) => ipcRenderer.invoke('dl:pause', id),
  stop: (id) => ipcRenderer.invoke('dl:stop', id),
  stopAll: () => ipcRenderer.invoke('dl:stopAll'),
  remove: (id, deleteFile) => ipcRenderer.invoke('dl:remove', { id, deleteFile }),
  removeCompleted: () => ipcRenderer.invoke('dl:removeCompleted'),
  restart: (id) => ipcRenderer.invoke('dl:restart', id),
  describe: (id, description) => ipcRenderer.invoke('dl:describe', { id, description }),
  startQueue: () => ipcRenderer.invoke('queue:start'),
  stopQueue: () => ipcRenderer.invoke('queue:stop'),

  openDialog: (name, query) => ipcRenderer.invoke('dlg:open', { name, query }),
  openProgress: (id) => ipcRenderer.invoke('dlg:progress', id),

  openFile: (id) => ipcRenderer.invoke('file:open', id),
  openFolder: (id) => ipcRenderer.invoke('file:folder', id),
  chooseDir: (current) => ipcRenderer.invoke('file:chooseDir', current),

  appQuit: () => ipcRenderer.invoke('app:quit'),
  extensionDir: () => ipcRenderer.invoke('ext:dir'),
  openExtensionDir: () => ipcRenderer.invoke('ext:openDir'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s) => ipcRenderer.invoke('settings:set', s),

  onUpdate: (fn) => ipcRenderer.on('dl:update', (e, d) => fn(d)),
  onAdded: (fn) => ipcRenderer.on('dl:added', (e, d) => fn(d)),
  onRemoved: (fn) => ipcRenderer.on('dl:removed', (e, id) => fn(id)),
});
