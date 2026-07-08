'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { Manager, categoryFor } = require('../engine.js');
const { makeServer } = require('./server.js');

function tmpEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idm-test-'));
  return { dir, stateFile: path.join(dir, 'state.json'), downloads: path.join(dir, 'dl') };
}
const hashFile = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const until = (fn, ms = 30000) => new Promise((res, rej) => {
  const t0 = Date.now();
  const iv = setInterval(() => {
    if (fn()) { clearInterval(iv); res(); }
    else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('timeout waiting')); }
  }, 25);
});

test('segmented download: integrity + multiple connections', async () => {
  const env = tmpEnv();
  const srv = await makeServer({ size: 5 * 1024 * 1024 });
  const mgr = new Manager({ stateFile: env.stateFile, defaultDir: env.downloads });
  const dl = mgr.add({ url: srv.url() });
  dl.start();
  await until(() => dl.status === 'complete');
  assert.strictEqual(dl.filename, 'file.bin');
  assert.strictEqual(dl.size, srv.body.length);
  assert.strictEqual(hashFile(dl.savePath), srv.sha256);
  assert.ok(srv.rangeRequests >= 8, `expected >=8 range requests, got ${srv.rangeRequests}`);
  assert.ok(!fs.existsSync(dl.partPath), 'part file cleaned up');
  await srv.close();
});

test('pause and resume preserves integrity', async () => {
  const env = tmpEnv();
  const srv = await makeServer({ size: 3 * 1024 * 1024, throttleMs: 2 });
  const mgr = new Manager({ stateFile: env.stateFile, defaultDir: env.downloads });
  const dl = mgr.add({ url: srv.url() });
  dl.start();
  await until(() => dl.received > 200 * 1024);
  dl.pause();
  assert.strictEqual(dl.status, 'paused');
  const receivedAtPause = dl.received;
  await new Promise((r) => setTimeout(r, 300));
  assert.ok(dl.received === receivedAtPause, 'no data received while paused');
  dl.start();
  await until(() => dl.status === 'complete', 60000);
  assert.strictEqual(hashFile(dl.savePath), srv.sha256);
  await srv.close();
});

test('persistence: resume after manager restart', async () => {
  const env = tmpEnv();
  const srv = await makeServer({ size: 3 * 1024 * 1024, throttleMs: 2 });
  let mgr = new Manager({ stateFile: env.stateFile, defaultDir: env.downloads });
  const dl = mgr.add({ url: srv.url() });
  dl.start();
  await until(() => dl.received > 200 * 1024);
  dl.pause();
  mgr.save();
  // reload from disk
  mgr = new Manager({ stateFile: env.stateFile, defaultDir: env.downloads });
  const dl2 = mgr.get(dl.id);
  assert.ok(dl2, 'download restored');
  assert.strictEqual(dl2.status, 'paused');
  assert.ok(dl2.received > 0);
  dl2.start();
  await until(() => dl2.status === 'complete', 60000);
  assert.strictEqual(hashFile(dl2.savePath), srv.sha256);
  await srv.close();
});

test('rapid pause/resume hammering preserves integrity', async () => {
  const env = tmpEnv();
  const srv = await makeServer({ size: 2 * 1024 * 1024, throttleMs: 2 });
  const mgr = new Manager({ stateFile: env.stateFile, defaultDir: env.downloads });
  const dl = mgr.add({ url: srv.url() });
  dl.start();
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 60));
    dl.pause();
    await new Promise((r) => setTimeout(r, 20)); // resume inside the fd-drain window
    dl.start();
  }
  await until(() => dl.status === 'complete', 60000);
  assert.strictEqual(hashFile(dl.savePath), srv.sha256);
  await srv.close();
});

test('no-range server: single-stream fallback', async () => {
  const env = tmpEnv();
  const srv = await makeServer({ size: 1024 * 1024, noRange: true });
  const mgr = new Manager({ stateFile: env.stateFile, defaultDir: env.downloads });
  const dl = mgr.add({ url: srv.url() });
  dl.start();
  await until(() => dl.status === 'complete');
  assert.strictEqual(dl.resumable, false);
  assert.strictEqual(hashFile(dl.savePath), srv.sha256);
  await srv.close();
});

test('404 yields error status', async () => {
  const env = tmpEnv();
  const srv = await makeServer({});
  const mgr = new Manager({ stateFile: env.stateFile, defaultDir: env.downloads });
  const dl = mgr.add({ url: srv.url('/missing') });
  dl.start();
  await until(() => dl.status === 'error');
  assert.match(dl.error, /404/);
  await srv.close();
});

test('redirects are followed', async () => {
  const env = tmpEnv();
  const srv = await makeServer({ size: 512 * 1024 });
  const mgr = new Manager({ stateFile: env.stateFile, defaultDir: env.downloads });
  const dl = mgr.add({ url: srv.url('/redirect') });
  dl.start();
  await until(() => dl.status === 'complete');
  assert.strictEqual(dl.filename, 'file.bin');
  assert.strictEqual(hashFile(dl.savePath), srv.sha256);
  await srv.close();
});

test('content-disposition filename wins', async () => {
  const env = tmpEnv();
  const srv = await makeServer({ size: 128 * 1024 });
  const mgr = new Manager({ stateFile: env.stateFile, defaultDir: env.downloads });
  const dl = mgr.add({ url: srv.url('/named') });
  dl.start();
  await until(() => dl.status === 'complete');
  assert.strictEqual(dl.filename, 'report final.pdf');
  assert.strictEqual(dl.category, 'Documents');
  await srv.close();
});

test('filename dedupe when target exists', async () => {
  const env = tmpEnv();
  const srv = await makeServer({ size: 64 * 1024 });
  const mgr = new Manager({ stateFile: env.stateFile, defaultDir: env.downloads });
  fs.mkdirSync(env.downloads, { recursive: true });
  fs.writeFileSync(path.join(env.downloads, 'file.bin'), 'existing');
  const dl = mgr.add({ url: srv.url() });
  dl.start();
  await until(() => dl.status === 'complete');
  assert.strictEqual(dl.filename, 'file_1.bin');
  assert.strictEqual(hashFile(dl.savePath), srv.sha256);
  assert.strictEqual(fs.readFileSync(path.join(env.downloads, 'file.bin'), 'utf8'), 'existing');
  await srv.close();
});

test('queue runs downloads sequentially', async () => {
  const env = tmpEnv();
  const srv = await makeServer({ size: 512 * 1024, throttleMs: 1 });
  const mgr = new Manager({ stateFile: env.stateFile, defaultDir: env.downloads });
  const a = mgr.add({ url: srv.url(), queue: 'main' });
  const b = mgr.add({ url: srv.url('/redirect'), queue: 'main' });
  mgr.startQueue();
  await until(() => a.status === 'complete' && b.status === 'complete', 60000);
  assert.strictEqual(hashFile(a.savePath), srv.sha256);
  await srv.close();
});

test('speed limit throttles download', async () => {
  const env = tmpEnv();
  const srv = await makeServer({ size: 4 * 1024 * 1024 });
  const mgr = new Manager({ stateFile: env.stateFile, defaultDir: env.downloads });
  const dl = mgr.add({ url: srv.url() });
  // pause()-based throttling lets in-flight socket buffers slip through, so
  // allow generous slack: 4 MB at 1 MB/s would be 4s ideal, ~2.5s with slippage
  dl.speedLimit = 1024 * 1024;
  const t0 = Date.now();
  dl.start();
  await until(() => dl.status === 'complete', 30000);
  const elapsed = Date.now() - t0;
  assert.ok(elapsed >= 2000, `expected >=2s with limit (unlimited is <200ms), took ${elapsed}ms`);
  assert.strictEqual(hashFile(dl.savePath), srv.sha256);
  await srv.close();
});

test('categoryFor maps extensions', () => {
  assert.strictEqual(categoryFor('a.zip'), 'Compressed');
  assert.strictEqual(categoryFor('a.mp3'), 'Music');
  assert.strictEqual(categoryFor('a.mp4'), 'Video');
  assert.strictEqual(categoryFor('setup.exe'), 'Programs');
  assert.strictEqual(categoryFor('doc.pdf'), 'Documents');
  assert.strictEqual(categoryFor('weird.xyz'), 'General');
});
