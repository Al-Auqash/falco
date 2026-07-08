// Builds all app icons from assets/falco.png:
//   assets/icon-{16,48,128,256}.png (white background made transparent),
//   assets/icon.ico, extension/icon128.png
// Run: npx electron scripts/gen-icon.js --no-sandbox   (or: npm run icons)
'use strict';
const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

// ICO container holding PNG-compressed images (valid since Vista).
function makeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(entries.length, 4);
  const dirs = [];
  let offset = 6 + 16 * entries.length;
  for (const { size, png } of entries) {
    const d = Buffer.alloc(16);
    d.writeUInt8(size >= 256 ? 0 : size, 0);
    d.writeUInt8(size >= 256 ? 0 : size, 1);
    d.writeUInt8(0, 2); d.writeUInt8(0, 3);
    d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6);
    d.writeUInt32LE(png.length, 8); d.writeUInt32LE(offset, 12);
    offset += png.length;
    dirs.push(d);
  }
  return Buffer.concat([header, ...dirs, ...entries.map((e) => e.png)]);
}

// The source logo is black-on-white RGB: key out near-white pixels so the
// icon has a transparent background in the tray, taskbar, and on the desktop.
function transparentize(img) {
  const { width, height } = img.getSize();
  const buf = Buffer.from(img.toBitmap()); // BGRA
  for (let i = 0; i < buf.length; i += 4) {
    const b = buf[i], g = buf[i + 1], r = buf[i + 2];
    if (r > 235 && g > 235 && b > 235) { buf[i + 3] = 0; buf[i] = buf[i + 1] = buf[i + 2] = 0; }
  }
  return nativeImage.createFromBitmap(buf, { width, height });
}

app.whenReady().then(() => {
  const root = path.join(__dirname, '..');
  const src = nativeImage.createFromPath(path.join(root, 'assets', 'falco.png'));
  if (src.isEmpty()) throw new Error('assets/falco.png not found or unreadable');
  const clean = transparentize(src);
  const entries = [];
  for (const size of [16, 48, 128, 256]) {
    const png = clean.resize({ width: size, height: size, quality: 'best' }).toPNG();
    fs.writeFileSync(path.join(root, 'assets', `icon-${size}.png`), png);
    entries.push({ size, png });
  }
  fs.writeFileSync(path.join(root, 'assets', 'icon.ico'), makeIco(entries));
  fs.copyFileSync(path.join(root, 'assets', 'icon-128.png'), path.join(root, 'extension', 'icon128.png'));
  console.log('icons rebuilt from falco.png');
  app.exit(0);
}).catch((e) => { console.error('ICON FAIL:', e); app.exit(1); });
