// Download engine: segmented multi-connection downloader with pause/resume.
// No dependencies — node http/https only.
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const MAX_SEGMENTS = 8;
const MIN_SEGMENT_SIZE = 256 * 1024;
const MAX_REDIRECTS = 10;
const SEGMENT_RETRIES = 3;

const CATEGORIES = {
  Compressed: ['zip', 'rar', '7z', 'gz', 'tar', 'bz2', 'xz', 'iso', 'cab'],
  Documents: ['doc', 'docx', 'pdf', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'epub', 'chm'],
  Music: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a', 'mid'],
  Programs: ['exe', 'msi', 'deb', 'rpm', 'dmg', 'apk', 'appimage', 'bat', 'jar'],
  Video: ['avi', 'mp4', 'mkv', 'mov', 'wmv', 'flv', 'mpg', 'mpeg', 'webm', 'm4v', '3gp', 'ts'],
};

function categoryFor(filename) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  for (const [cat, exts] of Object.entries(CATEGORIES)) if (exts.includes(ext)) return cat;
  return 'General';
}

function agentFor(url) {
  return url.startsWith('https') ? https : http;
}

// GET with redirect following. Returns { res, finalUrl, request }.
function request(url, headers, cb) {
  let hops = 0;
  let aborted = false;
  const holder = { req: null, abort() { aborted = true; if (this.req) this.req.destroy(new Error('aborted')); } };
  const go = (u) => {
    let req;
    try {
      req = agentFor(u).get(u, { headers }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          if (++hops > MAX_REDIRECTS) return cb(new Error('Too many redirects'));
          const next = new URL(res.headers.location, u).href;
          if (!aborted) go(next);
          return;
        }
        cb(null, res, u);
      });
    } catch (e) { return cb(e); }
    holder.req = req;
    req.on('error', (e) => { if (!aborted) cb(e); });
  };
  go(url);
  return holder;
}

function filenameFrom(res, url) {
  const cd = res.headers['content-disposition'];
  if (cd) {
    const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
    if (m) return decodeURIComponent(m[1].replace(/"$/, '').trim());
  }
  try {
    const p = decodeURIComponent(new URL(url).pathname);
    const base = path.posix.basename(p);
    if (base) return base;
  } catch { /* fall through */ }
  return 'download.html';
}

class Download extends EventEmitter {
  constructor(opts) {
    super();
    this.id = opts.id;
    this.url = opts.url;
    this.dir = opts.dir;
    this.filename = opts.filename || null;
    this.description = opts.description || '';
    this.category = opts.category || null;
    this.size = opts.size ?? null;
    this.received = opts.received || 0;
    this.resumable = opts.resumable ?? null;
    this.segments = opts.segments || null; // [{start,end,written}]
    this.status = opts.status || 'queued'; // queued|connecting|downloading|paused|complete|error
    this.error = opts.error || null;
    this.addedAt = opts.addedAt || Date.now();
    this.lastTryAt = opts.lastTryAt || null;
    this.queue = opts.queue || null;
    this.speed = 0;
    this.timeLeft = null;
    this._active = [];      // in-flight request holders
    this._fd = null;
    this._pendingWrites = 0;
    this._window = [];      // [ms, bytes] samples for speed
    this._paused = false;
    this._maxConn = opts.maxConn || MAX_SEGMENTS;
    this.speedLimit = opts.speedLimit || null; // bytes/sec, null = unlimited
    this._secStart = 0;
    this._secBytes = 0;
  }

  // Crude token bucket: pause the response stream when this second's budget is spent.
  _throttle(res, bytes) {
    if (!this.speedLimit) return;
    const now = Date.now();
    if (now - this._secStart >= 1000) { this._secStart = now; this._secBytes = 0; }
    this._secBytes += bytes;
    if (this._secBytes >= this.speedLimit) {
      res.pause();
      setTimeout(() => { if (!this._paused) res.resume(); }, 1000 - (now - this._secStart) + 5);
    }
  }

  get savePath() { return path.join(this.dir, this.filename || 'download'); }
  get partPath() { return this.savePath + '.part'; }

  toJSON() {
    const { id, url, dir, filename, description, category, size, received, resumable,
      segments, status, error, addedAt, lastTryAt, queue } = this;
    return { id, url, dir, filename, description, category, size, received, resumable,
      segments, status: status === 'downloading' || status === 'connecting' ? 'paused' : status,
      error, addedAt, lastTryAt, queue };
  }

  // Probe url: size, resume capability, filename. cb(err)
  probe(cb) {
    const h = request(this.url, { Range: 'bytes=0-0', 'User-Agent': 'Mozilla/5.0' }, (err, res, finalUrl) => {
      if (err) return cb(err);
      if (res.statusCode >= 400) { res.resume(); return cb(new Error(`HTTP ${res.statusCode}`)); }
      if (!this.filename) this.filename = filenameFrom(res, finalUrl);
      if (!this.category) this.category = categoryFor(this.filename);
      if (res.statusCode === 206) {
        this.resumable = true;
        const m = /\/(\d+)$/.exec(res.headers['content-range'] || '');
        this.size = m ? Number(m[1]) : null;
      } else {
        this.resumable = false;
        const len = res.headers['content-length'];
        this.size = len != null ? Number(len) : null;
      }
      res.resume();
      cb(null);
    });
    this._active.push(h);
    return h;
  }

  start() {
    if (this.status === 'downloading' || this.status === 'connecting' || this.status === 'complete') return;
    this._paused = false;
    this.status = 'connecting';
    this.error = null;
    this.lastTryAt = Date.now();
    this._emitState();
    if (this.resumable === null || this.filename === null) {
      this.probe((err) => {
        this._active = [];
        if (this._paused) return;
        if (err) return this._fail(err);
        this._begin();
      });
    } else {
      this._begin();
    }
  }

  _begin() {
    // Dedupe filename on first start only (no part file yet, nothing received).
    if (!this.received && !fs.existsSync(this.partPath)) {
      let base = this.filename, i = 1;
      const ext = path.extname(base), stem = base.slice(0, base.length - ext.length);
      while (fs.existsSync(this.savePath)) this.filename = base = `${stem}_${i++}${ext}`;
    }
    fs.mkdirSync(this.dir, { recursive: true });
    try {
      this._fd = fs.openSync(this.partPath, this.received || this.segments ? 'r+' : 'w');
    } catch {
      this._fd = fs.openSync(this.partPath, 'w'); // part file vanished: restart
      this.segments = null;
      this.received = 0;
    }
    this.status = 'downloading';
    this._startSpeedTimer();
    this._emitState();

    if (this.resumable && this.size) {
      if (!this.segments) {
        const n = Math.max(1, Math.min(this._maxConn, Math.floor(this.size / MIN_SEGMENT_SIZE) || 1));
        const per = Math.ceil(this.size / n);
        this.segments = [];
        for (let i = 0; i < n; i++) {
          const start = i * per;
          const end = Math.min(this.size - 1, start + per - 1);
          if (start > end) break;
          this.segments.push({ start, end, written: 0 });
        }
      }
      this.segments.forEach((seg, i) => this._runSegment(seg, i, SEGMENT_RETRIES));
      this._checkDone();
    } else {
      this._runSingle(SEGMENT_RETRIES);
    }
  }

  _runSegment(seg, idx, retries) {
    if (this._paused || seg.written > seg.end - seg.start) return;
    if (seg.start + seg.written > seg.end) return;
    const h = request(this.url, {
      Range: `bytes=${seg.start + seg.written}-${seg.end}`,
      'User-Agent': 'Mozilla/5.0',
    }, (err, res) => {
      const retry = (e) => {
        if (this._paused) return;
        if (retries > 0) setTimeout(() => this._runSegment(seg, idx, retries - 1), 1000);
        else this._fail(e);
      };
      if (err) return retry(err);
      if (res.statusCode !== 206) { res.resume(); return retry(new Error(`HTTP ${res.statusCode}`)); }
      res.on('data', (chunk) => {
        if (this._paused) return;
        const pos = seg.start + seg.written;
        seg.written += chunk.length;
        this.received += chunk.length;
        this._window.push([Date.now(), chunk.length]);
        this._write(chunk, pos);
        this._throttle(res, chunk.length);
      });
      res.on('end', () => { if (!this._paused) this._checkDone(); });
      res.on('error', retry);
    });
    this._active.push(h);
  }

  _runSingle(retries) {
    // No resume support (or unknown size): single stream from byte 0.
    this.received = 0;
    this._truncate();
    const h = request(this.url, { 'User-Agent': 'Mozilla/5.0' }, (err, res) => {
      const retry = (e) => {
        if (this._paused) return;
        if (retries > 0) setTimeout(() => this._runSingle(retries - 1), 1000);
        else this._fail(e);
      };
      if (err) return retry(err);
      if (res.statusCode >= 400) { res.resume(); return retry(new Error(`HTTP ${res.statusCode}`)); }
      res.on('data', (chunk) => {
        if (this._paused) return;
        const pos = this.received;
        this.received += chunk.length;
        this._window.push([Date.now(), chunk.length]);
        this._write(chunk, pos);
        this._throttle(res, chunk.length);
      });
      res.on('end', () => { if (!this._paused) { if (this.size == null) this.size = this.received; this._checkDone(true); } });
      res.on('error', retry);
    });
    this._active.push(h);
  }

  _truncate() { try { fs.ftruncateSync(this._fd, 0); } catch { /* fd closed */ } }

  _write(chunk, pos) {
    this._pendingWrites++;
    fs.write(this._fd, chunk, 0, chunk.length, pos, (err) => {
      this._pendingWrites--;
      if (err && this.status === 'downloading') return this._fail(err);
      if (this._pendingWrites === 0 && this._finishing) this._finalize();
    });
  }

  _checkDone(single = false) {
    const done = single
      ? this.size != null && this.received >= this.size
      : this.segments && this.segments.every((s) => s.written >= s.end - s.start + 1);
    if (!done) return;
    this._finishing = true;
    if (this._pendingWrites === 0) this._finalize();
  }

  _finalize() {
    if (this.status !== 'downloading') return;
    this._finishing = false;
    this._stopSpeedTimer();
    fs.closeSync(this._fd); this._fd = null;
    fs.renameSync(this.partPath, this.savePath);
    this.status = 'complete';
    this.speed = 0; this.timeLeft = 0;
    this._active = [];
    this._emitState();
    this.emit('complete');
  }

  pause() {
    if (this.status !== 'downloading' && this.status !== 'connecting') return;
    this._paused = true;
    this._stopSpeedTimer();
    for (const h of this._active) h.abort();
    this._active = [];
    // close only after pending writes drain; capture fd so a quick resume's new fd isn't closed
    const fd = this._fd;
    this._fd = null;
    if (fd != null) {
      const tryClose = (attempts) => {
        if (this._pendingWrites > 0 && attempts > 0) return setTimeout(() => tryClose(attempts - 1), 50);
        try { fs.closeSync(fd); } catch { /* already closed */ }
      };
      tryClose(100);
    }
    this.status = 'paused';
    this.speed = 0; this.timeLeft = null;
    this._emitState();
  }

  _fail(err) {
    if (this.status !== 'downloading' && this.status !== 'connecting') return;
    this._paused = true;
    this._stopSpeedTimer();
    for (const h of this._active) h.abort();
    this._active = [];
    if (this._fd != null) { try { fs.closeSync(this._fd); } catch {} this._fd = null; }
    this.status = 'error';
    this.error = err.message;
    this.speed = 0; this.timeLeft = null;
    this._emitState();
    this.emit('error2', err);
  }

  _startSpeedTimer() {
    this._speedTimer = setInterval(() => {
      const now = Date.now();
      this._window = this._window.filter(([t]) => now - t < 3000);
      const bytes = this._window.reduce((a, [, b]) => a + b, 0);
      const span = this._window.length ? Math.max(500, now - this._window[0][0]) : 1;
      this.speed = Math.round(bytes / (span / 1000));
      this.timeLeft = this.size && this.speed > 0 ? Math.round((this.size - this.received) / this.speed) : null;
      this._emitState();
    }, 500);
  }
  _stopSpeedTimer() { clearInterval(this._speedTimer); this._speedTimer = null; }

  _emitState() { this.emit('update', this); }

  progressPct() { return this.size ? Math.min(100, (this.received / this.size) * 100) : 0; }
}

class Manager extends EventEmitter {
  constructor({ stateFile, defaultDir }) {
    super();
    this.stateFile = stateFile;
    this.defaultDir = defaultDir;
    this.downloads = new Map();
    this._nextId = 1;
    this._queueRunning = false;
    this._load();
  }

  _load() {
    try {
      const data = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
      for (const d of data.downloads || []) {
        const dl = new Download(d);
        this._wire(dl);
        this.downloads.set(dl.id, dl);
        this._nextId = Math.max(this._nextId, dl.id + 1);
      }
    } catch { /* first run */ }
  }

  save() {
    const data = { downloads: [...this.downloads.values()].map((d) => d.toJSON()) };
    fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
    fs.writeFileSync(this.stateFile, JSON.stringify(data, null, 1));
  }

  _wire(dl) {
    let lastSave = 0;
    dl.on('update', () => {
      this.emit('update', dl);
      const now = Date.now();
      if (now - lastSave > 3000 || ['complete', 'paused', 'error'].includes(dl.status)) {
        lastSave = now; this.save();
      }
    });
    dl.on('complete', () => { this.emit('complete', dl); this._queueNext(); });
    dl.on('error2', () => this._queueNext());
  }

  add({ url, dir, filename, description, category, queue, maxConn }) {
    const dl = new Download({
      id: this._nextId++, url, dir: dir || this.defaultDir,
      filename, description, category, queue, maxConn,
    });
    this._wire(dl);
    this.downloads.set(dl.id, dl);
    this.save();
    this.emit('added', dl);
    return dl;
  }

  get(id) { return this.downloads.get(id); }

  remove(id, deleteFile = false) {
    const dl = this.downloads.get(id);
    if (!dl) return;
    dl.pause();
    try { fs.unlinkSync(dl.partPath); } catch {}
    if (deleteFile) { try { fs.unlinkSync(dl.savePath); } catch {} }
    this.downloads.delete(id);
    this.save();
    this.emit('removed', id);
  }

  // Queue: start downloads marked queue=main one at a time.
  startQueue() {
    this._queueRunning = true;
    this._queueNext();
  }
  stopQueue() {
    this._queueRunning = false;
    for (const d of this.downloads.values()) {
      if (d.queue && (d.status === 'downloading' || d.status === 'connecting')) d.pause();
    }
  }
  _queueNext() {
    if (!this._queueRunning) return;
    const active = [...this.downloads.values()].filter((d) => d.queue && ['downloading', 'connecting'].includes(d.status));
    if (active.length) return;
    const next = [...this.downloads.values()].find((d) => d.queue && ['queued', 'paused', 'error'].includes(d.status));
    if (next) next.start();
    else this._queueRunning = false;
  }

  pauseAll() { for (const d of this.downloads.values()) d.pause(); }
}

module.exports = { Manager, Download, categoryFor, CATEGORIES };
