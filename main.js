'use strict';
const { app, BrowserWindow, ipcMain, shell, dialog, Tray, Menu, nativeImage, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Manager } = require('./engine.js');

const CATCH_PORT = 49721; // browser extension hands downloads to Falco here

const argv = process.argv.slice(1);
const flag = (name) => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
};
if (flag('userdata')) app.setPath('userData', flag('userdata'));
if (flag('theme')) nativeTheme.themeSource = flag('theme'); // test hook: force light/dark

let mgr;
let mainWin = null;
let tray = null;
let quitting = false;
const progressWins = new Map(); // download id -> BrowserWindow
const dialogWins = new Map();   // name -> BrowserWindow

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
let settings = {};
function loadSettings() {
  try { settings = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch { settings = {}; }
  settings.downloadDir ||= app.getPath('downloads');
  settings.maxConn ||= 8;
  settings.showCompleteDialog ??= true;
  settings.startImmediately ??= true;
  settings.autoStart ??= true;
}
function saveSettings() { fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 1)); }

function dlState(d) {
  return {
    id: d.id, url: d.url, filename: d.filename, dir: d.dir, savePath: d.savePath,
    description: d.description, category: d.category, size: d.size, received: d.received,
    resumable: d.resumable, status: d.status, error: d.error, addedAt: d.addedAt,
    lastTryAt: d.lastTryAt, queue: d.queue, speed: d.speed, timeLeft: d.timeLeft,
    pct: d.progressPct(), segments: (d.segments || []).map((s) => ({ start: s.start, end: s.end, written: s.written })),
  };
}

function broadcast(channel, payload) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload);
  }
}

function makeWindow(file, opts, query = {}) {
  const win = new BrowserWindow({
    frame: false, show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1d1d1d' : '#ffffff',
    minimizable: true, maximizable: false, resizable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
    ...opts,
  });
  win.setMenu(null);
  const q = new URLSearchParams(query).toString();
  win.loadFile(path.join(__dirname, 'renderer', file), q ? { search: q } : undefined);
  win.once('ready-to-show', () => win.show());
  return win;
}

function createMainWindow() {
  mainWin = makeWindow('index.html', {
    width: 960, height: 500, minWidth: 640, minHeight: 320,
    resizable: true, maximizable: true,
    show: !argv.includes('--hidden'),
  });
  if (argv.includes('--hidden')) mainWin.removeAllListeners('ready-to-show');
  // with a tray, closing the main window keeps Falco running in the background
  mainWin.on('close', (e) => {
    if (!quitting && tray) { e.preventDefault(); mainWin.hide(); }
  });
  mainWin.on('closed', () => { mainWin = null; app.quit(); });
}

function showMain() {
  if (!mainWin) return;
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
}

function createTray() {
  try {
    const img = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon-16.png'));
    if (img.isEmpty()) return;
    tray = new Tray(img);
    tray.setToolTip('Falco Download Manager');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Show Falco', click: showMain },
      { type: 'separator' },
      { label: 'Exit', click: () => { quitting = true; app.quit(); } },
    ]));
    tray.on('click', showMain);
  } catch { tray = null; /* no tray support: window close quits */ }
}

// Local endpoint the browser extension talks to.
function startCatcher() {
  http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname === '/ping') return res.end('falco');
    if (u.pathname === '/add') {
      const url = u.searchParams.get('url');
      if (!url || !/^https?:\/\//i.test(url)) { res.statusCode = 400; return res.end('bad url'); }
      addWithDialog(url);
      showMain();
      return res.end('ok');
    }
    res.statusCode = 404; res.end();
  }).listen(CATCH_PORT, '127.0.0.1').on('error', () => { /* port taken: another instance */ });
}

function addWithDialog(url) {
  const d = mgr.add({ url, maxConn: settings.maxConn });
  // background probe so File Info dialog fills in size/name
  d.probe((err) => {
    if (err) { d.status = 'error'; d.error = err.message; }
    d._active = [];
    mgr.save();
    broadcast('dl:update', dlState(d));
  });
  openDialog('fileinfo', { id: d.id });
  return d;
}

const extensionDir = () => (app.isPackaged
  ? path.join(process.resourcesPath, 'extension')
  : path.join(__dirname, 'extension'));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showMain);
}

function openDialog(name, query = {}, opts = {}) {
  const key = name + (query.id ?? '');
  const existing = dialogWins.get(key);
  if (existing && !existing.isDestroyed()) { existing.focus(); return existing; }
  const sizes = {
    addurl: { width: 664, height: 152 },
    fileinfo: { width: 520, height: 300 },
    complete: { width: 510, height: 216 },
    options: { width: 620, height: 480 },
    scheduler: { width: 560, height: 420 },
    about: { width: 420, height: 330 },
    grabber: { width: 640, height: 460 },
    integration: { width: 560, height: 440 },
    properties: { width: 480, height: 350 },
  };
  const win = makeWindow(`${name}.html`, { parent: mainWin || undefined, ...sizes[name], ...opts }, query);
  dialogWins.set(key, win);
  win.on('closed', () => dialogWins.delete(key));
  return win;
}

function openProgress(id) {
  const existing = progressWins.get(id);
  if (existing && !existing.isDestroyed()) { existing.focus(); return; }
  const win = makeWindow('progress.html', { width: 522, height: 316, minimizable: true }, { id });
  progressWins.set(id, win);
  win.on('closed', () => progressWins.delete(id));
}

app.whenReady().then(() => {
  loadSettings();
  mgr = new Manager({
    stateFile: path.join(app.getPath('userData'), 'downloads.json'),
    defaultDir: settings.downloadDir,
  });
  mgr.on('update', (d) => {
    broadcast('dl:update', dlState(d));
    const pw = progressWins.get(d.id);
    if (pw && !pw.isDestroyed()) {
      pw.setTitle(d.size ? `${Math.floor(d.progressPct())}% ${d.filename || ''}` : d.filename || 'Downloading');
    }
  });
  mgr.on('added', (d) => broadcast('dl:added', dlState(d)));
  mgr.on('removed', (id) => broadcast('dl:removed', id));
  mgr.on('complete', (d) => {
    broadcast('dl:update', dlState(d));
    const pw = progressWins.get(d.id);
    if (pw && !pw.isDestroyed()) pw.close();
    if (settings.showCompleteDialog) openDialog('complete', { id: d.id });
  });

  // ---------- IPC ----------
  ipcMain.handle('win:min', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
  ipcMain.handle('win:max', (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) w.isMaximized() ? w.unmaximize() : w.maximize();
  });
  ipcMain.handle('win:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
  ipcMain.handle('win:resize', (e, { width, height }) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (w) w.setContentSize(width ?? w.getContentSize()[0], height);
  });
  ipcMain.handle('ext:open', (e, url) => {
    if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url);
  });

  ipcMain.handle('dl:list', () => [...mgr.downloads.values()].map(dlState));
  ipcMain.handle('dl:get', (e, id) => { const d = mgr.get(id); return d ? dlState(d) : null; });
  ipcMain.handle('dl:add', (e, { url }) => dlState(addWithDialog(url)));
  ipcMain.handle('dl:addStart', (e, { url }) => {
    const d = mgr.add({ url, maxConn: settings.maxConn });
    d.start();
    return dlState(d);
  });
  ipcMain.handle('dl:confirm', (e, { id, dir, filename, description, later, queue }) => {
    const d = mgr.get(id);
    if (!d) return;
    if (dir) d.dir = dir;
    if (filename) d.filename = filename;
    d.description = description || '';
    if (later) { d.queue = queue || 'main'; d.status = 'queued'; mgr.save(); broadcast('dl:update', dlState(d)); }
    else { d.start(); openProgress(id); }
  });
  ipcMain.handle('dl:start', (e, id) => { const d = mgr.get(id); if (d) { d.start(); openProgress(id); } });
  ipcMain.handle('dl:pause', (e, id) => mgr.get(id)?.pause());
  ipcMain.handle('dl:stop', (e, id) => mgr.get(id)?.pause());
  ipcMain.handle('dl:stopAll', () => mgr.pauseAll());
  ipcMain.handle('dl:remove', (e, { id, deleteFile }) => mgr.remove(id, deleteFile));
  ipcMain.handle('dl:removeCompleted', () => {
    for (const d of [...mgr.downloads.values()]) if (d.status === 'complete') mgr.remove(d.id, false);
  });
  ipcMain.handle('queue:start', () => mgr.startQueue());
  ipcMain.handle('queue:stop', () => mgr.stopQueue());
  ipcMain.handle('dl:restart', (e, id) => {
    const d = mgr.get(id);
    if (!d) return;
    d.pause();
    setTimeout(() => { // let the fd drain before wiping progress
      try { fs.unlinkSync(d.partPath); } catch {}
      d.segments = null; d.received = 0; d.size = null; d.resumable = null; d.error = null;
      d.status = 'queued';
      mgr.save();
      broadcast('dl:update', dlState(d));
      d.start();
      openProgress(id);
    }, 300);
  });
  ipcMain.handle('dl:describe', (e, { id, description }) => {
    const d = mgr.get(id);
    if (d) { d.description = description || ''; mgr.save(); broadcast('dl:update', dlState(d)); }
  });
  ipcMain.handle('dl:limit', (e, { id, bytesPerSec }) => {
    const d = mgr.get(id);
    if (d) d.speedLimit = bytesPerSec || null;
  });
  ipcMain.handle('dl:setQueue', (e, { id, queue }) => {
    const d = mgr.get(id);
    if (d) { d.queue = queue; mgr.save(); broadcast('dl:update', dlState(d)); }
  });
  ipcMain.handle('grabber:fetch', (e, url) => new Promise((resolve) => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    let req;
    try {
      req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve({ redirect: new URL(res.headers.location, url).href });
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { body += c; if (body.length > 3e6) req.destroy(); });
        res.on('end', () => {
          const links = new Map();
          const re = /(?:href|src)\s*=\s*["']([^"'#]+)["']/gi;
          let m;
          while ((m = re.exec(body))) {
            try {
              const abs = new URL(m[1], url).href;
              if (/^https?:/.test(abs)) links.set(abs, true);
            } catch { /* bad url in page */ }
          }
          resolve({ links: [...links.keys()].slice(0, 500) });
        });
        res.on('error', () => resolve({ error: 'Connection error' }));
      });
      req.on('error', (err) => resolve({ error: err.message }));
    } catch (err) { resolve({ error: err.message }); }
  }));

  ipcMain.handle('dlg:open', (e, { name, query }) => { openDialog(name, query || {}); });
  ipcMain.handle('dlg:progress', (e, id) => openProgress(id));

  ipcMain.handle('file:open', (e, id) => { const d = mgr.get(id); if (d) shell.openPath(d.savePath); });
  ipcMain.handle('file:folder', (e, id) => { const d = mgr.get(id); if (d) shell.showItemInFolder(d.savePath); });
  ipcMain.handle('file:chooseDir', async (e, current) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    const r = await dialog.showOpenDialog(w, { properties: ['openDirectory'], defaultPath: current });
    return r.canceled ? null : r.filePaths[0];
  });

  ipcMain.handle('settings:get', () => settings);
  ipcMain.handle('settings:set', (e, s) => {
    Object.assign(settings, s);
    saveSettings();
    applyAutoStart();
  });
  ipcMain.handle('app:quit', () => { quitting = true; app.quit(); });
  ipcMain.handle('ext:dir', () => extensionDir());
  ipcMain.handle('ext:openDir', () => shell.openPath(extensionDir()));

  createMainWindow();
  createTray();
  startCatcher();
  applyAutoStart();

  // ---------- test hooks ----------
  if (flag('seed')) seedDemoData();
  const shotDir = flag('shot');
  if (shotDir && !argv.includes('--e2e')) runShots(shotDir);
  if (argv.includes('--e2e')) runE2E().catch((e) => { console.error('E2E FAIL:', e); app.exit(1); });
});

function applyAutoStart() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: !!settings.autoStart, args: ['--hidden'] });
}

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { try { mgr.pauseAll(); mgr.save(); } catch {} });

function seedDemoData() {
  const rows = [
    ['https://example.com/media/Undercover.mp3', 'Undercover.mp3', 7509342, 'complete', 'Music'],
    ['https://example.com/videos/mult.flv', 'mult.flv', 38808453, 'downloading', 'Video'],
    ['https://example.com/videos/mult.mp4', 'mult.mp4', 38808453, 'paused', 'Video'],
    ['https://example.com/The%20Real%20Her.mp3', 'The Real Her.mp3', 8404992, 'complete', 'Music'],
    ['https://example.com/screenshots.zip', 'screenshots.zip', 1305230, 'complete', 'Compressed'],
    ['https://example.com/Polly.mp3', 'Polly.mp3', 6712323, 'complete', 'Music'],
    ['https://example.com/vlc-1.1.11-win32.exe', 'vlc-1.1.11-win32.exe', 20916838, 'complete', 'Programs'],
    ['https://example.com/x-files.rar', 'x-files.rar', 353884569, 'paused', 'Compressed'],
    ['https://example.com/openvpn-install-2.4.7.exe', 'openvpn-install-2.4.7.exe', 4225744, 'complete', 'Programs'],
    ['https://example.com/test.zip', 'test.zip', 1048576, 'complete', 'Compressed'],
    ['https://example.com/Thriller.mp3', 'Thriller.mp3', 8100022, 'complete', 'Music'],
    ['https://example.com/TolyshMusic.mp3', 'TolyshMusic.mp3', 5100022, 'complete', 'Music'],
    ['https://example.com/SkypeSetup.exe', 'SkypeSetup.exe', 1505230, 'complete', 'Programs'],
    ['https://example.com/FacebookVideo.mp4', 'FacebookVideo.mp4', 22505230, 'complete', 'Video'],
    ['https://example.com/RaspSession.zip', 'RaspSession.zip', 91505230, 'complete', 'Compressed'],
    ['https://example.com/Tree-Life.avi', 'Tree-Life.avi', 731505230, 'complete', 'Video'],
    ['https://example.com/booklet.pdf', 'booklet.pdf', 2505230, 'complete', 'Documents'],
    ['https://example.com/advantages.docx', 'advantages.docx', 7509342, 'complete', 'Documents'],
  ];
  let t = Date.parse('2020-11-08T21:34:00');
  for (const [url, filename, size, status, category] of rows) {
    const d = mgr.add({ url, filename, description: '' });
    d.category = category; d.size = size; d.status = status; d.resumable = true;
    d.lastTryAt = t; d.addedAt = t; t -= 86400000 * 3;
    if (status === 'complete') d.received = size;
    if (status === 'downloading') { d.received = Math.round(size * 0.9497); d.speed = 4890000; d.timeLeft = 0; }
    if (status === 'paused') d.received = Math.round(size * 0.3312);
    broadcast('dl:update', dlState(d));
  }
  mgr.save();
}

// End-to-end UI test: drives the real windows via DOM clicks. Exits 0 on pass.
async function runE2E() {
  const { makeServer } = require('./test/server.js');
  const assert = require('assert');
  const os = require('os');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const untilTrue = async (fn, ms = 30000, what = 'condition') => {
    const t0 = Date.now();
    while (!(await fn())) {
      if (Date.now() - t0 > ms) throw new Error('timeout: ' + what);
      await wait(100);
    }
  };
  const findDialog = (name) => [...dialogWins.entries()].find(([k]) => k.startsWith(name))?.[1];
  const js = (win, code) => win.webContents.executeJavaScript(code, true);
  const step = (n) => console.log('E2E step:', n);

  const dlDir = fs.mkdtempSync(path.join(os.tmpdir(), 'falco-e2e-'));
  settings.downloadDir = dlDir;
  mgr.defaultDir = dlDir;
  const srv = await makeServer({ size: 32 * 1024 * 1024, throttleMs: 10 });

  await wait(1500); // main window loaded

  step(1); // 1. Click "Add URL" toolbar button in the real main window DOM.
  await js(mainWin, `document.querySelectorAll('.tbtn')[0].click()`);
  await untilTrue(() => !!findDialog('addurl'), 10000, 'addurl dialog opens');
  const addWin = findDialog('addurl');
  await wait(800);

  step(2); // 2. Type the URL and click OK.
  await js(addWin, `
    document.querySelector('#url').value = ${JSON.stringify(srv.url())};
    document.querySelector('#ok').click();`);
  await untilTrue(() => !!findDialog('fileinfo'), 10000, 'fileinfo dialog opens');
  const fiWin = findDialog('fileinfo');
  await wait(1200); // probe fills size/name

  step(3); // 3. Verify probe filled the dialog, then click Start Download.
  const saveAs = await js(fiWin, `document.querySelector('#saveAs').value`);
  assert.ok(saveAs.includes('file.bin'), 'save-as filled with probed filename: ' + saveAs);
  const sizeTxt = await js(fiWin, `document.querySelector('#fsize').textContent`);
  assert.ok(sizeTxt.includes('MB'), 'file size shown: ' + sizeTxt);
  await js(fiWin, `document.querySelector('#start').click()`);
  await untilTrue(() => progressWins.size > 0, 10000, 'progress window opens');
  const dl = [...mgr.downloads.values()][0];
  const progWin = progressWins.get(dl.id);

  step(4); // 4. Pause from the progress window, verify, resume.
  await untilTrue(() => dl.received > 300 * 1024, 20000, 'download underway');
  if (flag('shot')) {
    await wait(1200);
    fs.mkdirSync(flag('shot'), { recursive: true });
    fs.writeFileSync(path.join(flag('shot'), 'progress-live.png'), (await progWin.webContents.capturePage()).toPNG());
    fs.writeFileSync(path.join(flag('shot'), 'main-live.png'), (await mainWin.webContents.capturePage()).toPNG());
  }
  await js(progWin, `document.querySelector('#pause').click()`);
  await untilTrue(() => dl.status === 'paused', 5000, 'paused');
  const stalled = dl.received;
  await wait(400);
  assert.strictEqual(dl.received, stalled, 'no bytes while paused');
  const btnTxt = await js(progWin, `document.querySelector('#pause').textContent`);
  assert.strictEqual(btnTxt, 'Resume', 'pause button flips to Resume');
  await js(progWin, `document.querySelector('#pause').click()`);

  step(5); // 5. Wait for completion: progress window closes, complete dialog opens.
  await untilTrue(() => dl.status === 'complete', 60000, 'download completes');
  const data = fs.readFileSync(dl.savePath);
  assert.strictEqual(require('crypto').createHash('sha256').update(data).digest('hex'), srv.sha256, 'file integrity');
  await untilTrue(() => !!findDialog('complete'), 10000, 'complete dialog opens');
  await wait(800);
  const compWin = findDialog('complete');
  const compName = await js(compWin, `document.querySelector('#fname').textContent`);
  assert.strictEqual(compName, 'file.bin', 'complete dialog shows filename');
  await js(compWin, `document.querySelector('#close').click()`);

  step(6); // 6. Main grid shows the completed row.
  await wait(600);
  const gridText = await js(mainWin, `document.querySelector('#gridBody').textContent`);
  assert.ok(gridText.includes('file.bin') && gridText.includes('Complete'), 'grid shows completed row: ' + gridText);

  step(7); // 7. Category filter: Compressed hides it, All shows it.
  await js(mainWin, `[...document.querySelectorAll('.tnode')].find(n => n.textContent.includes('Compressed')).click()`);
  let t = await js(mainWin, `document.querySelector('#gridBody').textContent`);
  assert.ok(!t.includes('file.bin'), 'filtered out under Compressed');
  await js(mainWin, `[...document.querySelectorAll('.tnode')].find(n => n.textContent.includes('All Downloads')).click()`);
  t = await js(mainWin, `document.querySelector('#gridBody').textContent`);
  assert.ok(t.includes('file.bin'), 'visible under All Downloads');

  step(8); // 8. Delete via toolbar: select row, click Delete.
  await js(mainWin, `
    const row = document.querySelector('.grow');
    row.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));`);
  await wait(200);
  await js(mainWin, `[...document.querySelectorAll('.tbtn')].find(b => b.textContent.trim() === 'Delete').click()`);
  await untilTrue(() => mgr.downloads.size === 0, 5000, 'download removed');

  step(9); // 9. "Download later" path: queued, then Start Queue completes it.
  await js(mainWin, `idm.add(${JSON.stringify(srv.url('/redirect'))})`);
  await untilTrue(() => !!findDialog('fileinfo'), 10000, 'second fileinfo dialog');
  const fi2 = findDialog('fileinfo');
  await wait(1200);
  await js(fi2, `document.querySelector('#later').click()`);
  const dl2 = [...mgr.downloads.values()][0];
  await untilTrue(() => dl2 && dl2.status === 'queued' && dl2.queue === 'main', 5000, 'queued for later');
  t = await js(mainWin, `document.querySelector('#gridBody').textContent`);
  assert.ok(t.includes('Queued'), 'grid shows Queued');
  await js(mainWin, `[...document.querySelectorAll('.tbtn')].find(b => b.textContent.includes('Start Queue')).click()`);
  await untilTrue(() => dl2.status === 'complete', 60000, 'queued download completes');
  await untilTrue(() => !!findDialog('complete'), 10000, 'complete dialog for queued download');
  await wait(500);
  await js(findDialog('complete'), `document.querySelector('#close').click()`);

  step(10); // 10. Browser-catcher endpoint: /ping answers, /add opens File Info.
  const get = (u) => new Promise((res, rej) => http.get(u, (r) => {
    let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res({ status: r.statusCode, body: b }));
  }).on('error', rej));
  const ping = await get(`http://127.0.0.1:${CATCH_PORT}/ping`);
  assert.strictEqual(ping.body, 'falco', 'catcher ping');
  const bad = await get(`http://127.0.0.1:${CATCH_PORT}/add?url=file:///etc/passwd`);
  assert.strictEqual(bad.status, 400, 'catcher rejects non-http url');
  const ok = await get(`http://127.0.0.1:${CATCH_PORT}/add?url=${encodeURIComponent(srv.url('/named'))}`);
  assert.strictEqual(ok.body, 'ok', 'catcher accepts download');
  await untilTrue(() => !!findDialog('fileinfo'), 10000, 'catcher opened fileinfo dialog');
  await wait(1200);
  const fi3 = findDialog('fileinfo');
  const caughtName = await js(fi3, `document.querySelector('#saveAs').value`);
  assert.ok(caughtName.includes('report final.pdf'), 'caught download probed: ' + caughtName);
  await js(fi3, `document.querySelector('#cancel').click()`);

  step(11); // 11. Right-click context menu on a row → Properties dialog.
  await js(mainWin, `(() => {
    const r = document.querySelector('.grow');
    r.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 2 }));
  })()`);
  await wait(300);
  const ctxText = await js(mainWin, `[...document.querySelectorAll('.menu-popup')].map(m => m.textContent).join('|')`);
  for (const label of ['Open in Explorer', 'Copy download address', 'Pause download', 'Cancel download', 'Restart download', 'Properties']) {
    assert.ok(ctxText.includes(label), `context menu has "${label}"`);
  }
  await js(mainWin, `
    [...document.querySelectorAll('.menu-popup .mi')]
      .find(m => m.textContent === 'Properties' && !m.classList.contains('disabled'))
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));`);
  await untilTrue(() => !!findDialog('properties'), 10000, 'properties dialog opens');
  await wait(800);
  const propWin = findDialog('properties');
  const propName = await js(propWin, `document.querySelector('#fname').textContent`);
  assert.ok(propName && propName.length > 0, 'properties shows a filename/url');
  await js(propWin, `document.querySelector('#ok').click()`);

  await srv.close();
  console.log('E2E PASS');
  app.exit(0);
}

async function runShots(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(1600);
  const shoot = async (win, name) => {
    if (!win || win.isDestroyed()) return;
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(dir, `${name}.png`), img.toPNG());
  };
  await shoot(mainWin, 'main');
  const which = flag('shotwins');
  if (which) {
    for (const name of which.split(',')) {
      let w;
      if (name === 'progress') { const d = [...mgr.downloads.values()].find((x) => x.status === 'downloading') || [...mgr.downloads.values()][1]; openProgress(d.id); w = progressWins.get(d.id); }
      else if (name === 'complete') { const d = [...mgr.downloads.values()].find((x) => x.status === 'complete'); w = openDialog('complete', { id: d.id }); }
      else if (name === 'fileinfo') { const d = [...mgr.downloads.values()][0]; w = openDialog('fileinfo', { id: d.id }); }
      else w = openDialog(name);
      await wait(1000);
      await shoot(w, name);
      if (w && !w.isDestroyed()) w.close();
      await wait(200);
    }
  }
  app.exit(0);
}
