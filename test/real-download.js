// Manual integration check against the real internet (not part of `npm test`):
// downloads a Node.js release tarball with 8 connections and verifies its
// official SHA-256 from SHASUMS256.txt. Run: node test/real-download.js
'use strict';
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { Manager } = require('../engine.js');

const VER = 'v20.11.0';
const FILE = `node-${VER}-linux-x64.tar.gz`;
const URL_ = `https://nodejs.org/dist/${VER}/${FILE}`;
const SUMS = `https://nodejs.org/dist/${VER}/SHASUMS256.txt`;

function fetchText(url) {
  return new Promise((res, rej) => {
    https.get(url, (r) => {
      let b = '';
      r.on('data', (c) => (b += c));
      r.on('end', () => res(b));
      r.on('error', rej);
    }).on('error', rej);
  });
}

(async () => {
  const sums = await fetchText(SUMS);
  const expected = sums.split('\n').find((l) => l.includes(FILE)).split(/\s+/)[0];
  console.log('expected sha256:', expected);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'idm-real-'));
  const mgr = new Manager({ stateFile: path.join(dir, 'state.json'), defaultDir: dir });
  const dl = mgr.add({ url: URL_ });
  const t0 = Date.now();
  dl.on('update', () => {
    if (dl.status === 'downloading') {
      process.stdout.write(`\r${(dl.received / 1e6).toFixed(1)} MB  ${(dl.speed / 1e6).toFixed(2)} MB/s  segs:${(dl.segments || []).length}   `);
    }
  });

  await new Promise((resolve, reject) => {
    dl.on('complete', resolve);
    dl.on('error2', reject);
    dl.start();
    // pause/resume mid-flight to exercise resume against a real server
    setTimeout(() => { console.log('\n[pausing]'); dl.pause(); }, 4000);
    setTimeout(() => { console.log('[resuming]'); dl.start(); }, 6000);
    setTimeout(() => reject(new Error('timeout')), 300000);
  });

  console.log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(1)}s, resumable=${dl.resumable}, size=${dl.size}`);
  const actual = crypto.createHash('sha256').update(fs.readFileSync(dl.savePath)).digest('hex');
  console.log('actual   sha256:', actual);
  if (actual !== expected) { console.error('REAL DOWNLOAD FAIL: checksum mismatch'); process.exit(1); }
  console.log('REAL DOWNLOAD PASS');
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit(0);
})().catch((e) => { console.error('REAL DOWNLOAD FAIL:', e.message); process.exit(1); });
