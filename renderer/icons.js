// Inline SVG icon set mimicking IDM 6.38 "Large Neon" toolbar and tree icons.
'use strict';

const S = (inner, vb = '0 0 40 40') =>
  `<svg viewBox="${vb}" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const TB = { // toolbar icons — outline "neon" style
  addurl: S(`<path d="M14 8h12v6h6v12h-6v6H14v-6H8V14h6z" stroke="#43b649" stroke-width="2.4"/>`),
  resume: S(`<circle cx="20" cy="20" r="14" stroke="currentColor" stroke-width="2.4"/>
    <path d="M20 12v12m0 0l-5.5-5.5M20 24l5.5-5.5" stroke="currentColor" stroke-width="2.4"/>`),
  stop: S(`<circle cx="20" cy="20" r="14" stroke="#4f68c9" stroke-width="2.4"/>
    <rect x="14.5" y="14.5" width="11" height="11" rx="1.5" stroke="#4f68c9" stroke-width="2.4"/>`),
  stopall: S(`<path d="M12.5 21V9.5a2.4 2.4 0 014.8 0V19m0-9.3V7.4a2.4 2.4 0 014.8 0V19m0-10.7a2.4 2.4 0 014.8 0V20m0-8.2a2.3 2.3 0 014.6 0v10.9c0 6.7-4.4 11.3-10.6 11.3-4.6 0-7.4-1.6-9.8-5.4-1.5-2.4-3.5-6-4.6-8.2-.7-1.4-.3-2.9 1-3.7 1.2-.7 2.8-.4 3.7.8l2.1 2.9" stroke="#e5484d" stroke-width="2.4"/>`),
  delete: S(`<path d="M10 12h20M16 12V9.5h8V12M12.5 12l1.6 19h11.8l1.6-19M17.5 17v9m5-9v9" stroke="#9aa0a6" stroke-width="2.4"/>`),
  delcompleted: S(`<rect x="8" y="10" width="24" height="21" rx="2" stroke="#e5568b" stroke-width="2.4"/>
    <path d="M8 16h24M14 7v5m12-5v5" stroke="#e5568b" stroke-width="2.4"/>
    <path d="M15 23l3.5 3.5L25 20" stroke="#e5568b" stroke-width="2.4"/>`),
  options: S(`<circle cx="20" cy="20" r="5" stroke="#7175d8" stroke-width="2.4"/>
    <path d="M20 6.5l1.8 4.1 4.4-.9 1 4.4 4.4 1-1 4.4 3.6 2.7-2.7 3.6 2 4-4 2-.1 4.5-4.5-.1-2 4-4-2-2.7 3.5-.1-.2" stroke="none"/>
    <path d="M32.9 22.6a13 13 0 000-5.2l3-2.3-2.6-4.5-3.6 1.3a13 13 0 00-4.5-2.6L24.5 5.5h-5.2l-.7 3.8a13 13 0 00-4.5 2.6L10.5 10.6 7.9 15.1l3 2.3a13 13 0 000 5.2l-3 2.3 2.6 4.5 3.6-1.3a13 13 0 004.5 2.6l.7 3.8h5.2l.7-3.8a13 13 0 004.5-2.6l3.6 1.3 2.6-4.5z" stroke="#7175d8" stroke-width="2.4"/>`),
  scheduler: S(`<circle cx="20" cy="22" r="12" stroke="#2bb3a3" stroke-width="2.4"/>
    <path d="M20 15v7l5 3M9 10l-3.5 3.5M31 10l3.5 3.5M11 31.5L8.5 34m20-2.5L31 34" stroke="#2bb3a3" stroke-width="2.4"/>`),
  startqueue: S(`<path d="M31.5 13.5A13 13 0 107 20" stroke="#2bb3a3" stroke-width="2.4"/>
    <path d="M31.5 6.5v7h-7" stroke="#2bb3a3" stroke-width="2.4"/>
    <path d="M17 14.5l9 5.5-9 5.5z" stroke="#2bb3a3" stroke-width="2.4"/>`),
  stopqueue: S(`<rect x="7" y="7" width="19" height="19" rx="2" stroke="#8d6cd0" stroke-width="2.4"/>
    <path d="M14 33h17V15" stroke="#8d6cd0" stroke-width="2.4"/>
    <rect x="12.5" y="12.5" width="8" height="8" rx="1" stroke="#8d6cd0" stroke-width="2.4"/>`),
  grabber: S(`<circle cx="17" cy="18" r="11.5" stroke="#8d6cd0" stroke-width="2.4"/>
    <path d="M17 6.5c-3.6 3.1-5.4 7-5.4 11.5s1.8 8.4 5.4 11.5c3.6-3.1 5.4-7 5.4-11.5S20.6 9.6 17 6.5zM6 14.5h22M6 21.5h22" stroke="#8d6cd0" stroke-width="2"/>
    <path d="M26 24v10.5l2.7-2.7 1.9 3.6 2.4-1.3-1.9-3.5 3.6-.7z" stroke="#f0913b" stroke-width="2" fill="#fff"/>`),
  tellafriend: S(`<path d="M8 19h5v14H8zM13 31.5c1.5 1 3 1.5 5.3 1.5h8.2c1.9 0 3.1-1 3.4-2.7l2-9.3c.4-2-.9-3.5-3-3.5h-6.4c.6-2.6.9-4.8.9-6.6 0-2.5-1.3-4.4-3.3-4.4-1.1 0-1.7.6-1.9 1.7-.5 2.6-1.4 5.5-2.7 7.4-.8 1.2-1.6 2.1-2.5 2.7" stroke="#8d6cd0" stroke-width="2.4"/>`),
};

// Falco logo: rendered from assets/falco.png (see scripts/gen-icon.js for the icon pipeline)
const LOGO = (sz = 16) => {
  const file = sz <= 16 ? 'icon-16' : sz <= 48 ? 'icon-48' : 'icon-128';
  return `<img src="../assets/${file}.png" width="${sz}" height="${sz}" style="display:block" alt="">`;
};

const M = (inner) => `<svg viewBox="0 0 16 16" width="16" height="16" fill="none">${inner}</svg>`;
const TREE = {
  folderOpen: M(`<path d="M1.5 3h4l1.5 2h6.5v1.5" fill="#ffe9a2" stroke="#b8860b" stroke-width=".9"/><path d="M1.5 3v9.5h11L15 6.5H4L1.5 12.5z" fill="#ffd76e" stroke="#b8860b" stroke-width=".9"/>`),
  folder: M(`<path d="M1.5 3.5h4.2l1.4 1.8h7.4v7.2H1.5z" fill="#ffd76e" stroke="#b8860b" stroke-width=".9"/>`),
  compressed: M(`<rect x="2" y="2.5" width="12" height="11" rx="1" fill="#fff3c4" stroke="#c9a227" stroke-width=".9"/><path d="M8 2.5v2m0 1v2m0 1v2" stroke="#c9a227" stroke-width="1.6"/>`),
  documents: M(`<path d="M3.5 1.5h6L12.5 4.5v10h-9z" fill="#fff" stroke="#7a8ba5" stroke-width=".9"/><path d="M9.5 1.5v3h3" stroke="#7a8ba5" stroke-width=".9"/><path d="M5 7h6M5 9h6M5 11h4" stroke="#9fb0c4" stroke-width=".9"/>`),
  music: M(`<path d="M6 12.2V4l7-1.6v8.2" stroke="#7d5bc9" stroke-width="1.2" fill="none"/><ellipse cx="4.6" cy="12.4" rx="1.9" ry="1.5" fill="#7d5bc9"/><ellipse cx="11.6" cy="10.8" rx="1.9" ry="1.5" fill="#7d5bc9"/>`),
  programs: M(`<rect x="1.5" y="2.5" width="13" height="9" rx=".8" fill="#dfe9f5" stroke="#5b7ba6" stroke-width=".9"/><path d="M6 14h4M8 11.5V14" stroke="#5b7ba6" stroke-width=".9"/><path d="M3 4.5h6" stroke="#5b7ba6" stroke-width=".9"/>`),
  video: M(`<rect x="1.5" y="3" width="13" height="10" rx="1" fill="#cfe3f7" stroke="#4a7dbd" stroke-width=".9"/><path d="M4 3v10M12 3v10M1.5 6h2.5M1.5 10h2.5M12 6h2.5M12 10h2.5" stroke="#4a7dbd" stroke-width=".8"/><path d="M7 6l3.2 2L7 10z" fill="#4a7dbd"/>`),
  unfinished: M(`<path d="M1.5 3.5h4.2l1.4 1.8h7.4v7.2H1.5z" fill="#cde8cf" stroke="#4e9e58" stroke-width=".9"/><path d="M8 6.5v3.5m0 0l-1.7-1.7M8 10l1.7-1.7" stroke="#2f7d3a" stroke-width="1.2" fill="none"/>`),
  finished: M(`<path d="M1.5 3.5h4.2l1.4 1.8h7.4v7.2H1.5z" fill="#cfe0f7" stroke="#4a6fae" stroke-width=".9"/><path d="M5.5 9l2 2 3.5-3.8" stroke="#2e5fa3" stroke-width="1.3" fill="none"/>`),
  grabberprj: M(`<path d="M1.5 3.5h4.2l1.4 1.8h7.4v7.2H1.5z" fill="#e7dbf5" stroke="#7d5bc9" stroke-width=".9"/><circle cx="8" cy="9" r="2.6" stroke="#7d5bc9" stroke-width=".9" fill="#fff"/><path d="M5.4 9h5.2M8 6.4c-1 1.6-1 3.6 0 5.2 1-1.6 1-3.6 0-5.2z" stroke="#7d5bc9" stroke-width=".7" fill="none"/>`),
  queues: M(`<path d="M1.5 3.5h4.2l1.4 1.8h7.4v7.2H1.5z" fill="#d9f0ea" stroke="#2b8a7d" stroke-width=".9"/><circle cx="8" cy="9" r="2.7" stroke="#2b8a7d" stroke-width=".9" fill="#fff"/><path d="M8 7.3V9l1.3.9" stroke="#2b8a7d" stroke-width=".9" fill="none"/>`),
};

const FT = { // file-type icons for list rows
  mp3: M(`<rect x="1.5" y="1.5" width="13" height="13" rx="1.5" fill="#f3eefc" stroke="#b9a3e3" stroke-width=".9"/><path d="M6 11V5.2l5-1.2v5.8" stroke="#7d5bc9" stroke-width="1.1" fill="none"/><ellipse cx="5" cy="11.2" rx="1.4" ry="1.1" fill="#7d5bc9"/><ellipse cx="10" cy="9.8" rx="1.4" ry="1.1" fill="#7d5bc9"/>`),
  video: M(`<rect x="1.5" y="2.5" width="13" height="11" rx="1" fill="#eaf3fc" stroke="#8ab4dd" stroke-width=".9"/><path d="M4 2.5v11M12 2.5v11M1.5 5.5H4m8 0h2.5M1.5 8H4m8 0h2.5M1.5 10.5H4m8 0h2.5" stroke="#8ab4dd" stroke-width=".8"/><path d="M6.8 5.8l3 2.2-3 2.2z" fill="#3778b5"/>`),
  zip: M(`<rect x="2.5" y="1.5" width="11" height="13" rx="1" fill="#fff8e1" stroke="#d4a017" stroke-width=".9"/><path d="M8 1.5v1.6m0 1.2v1.6m0 1.2v1.6" stroke="#d4a017" stroke-width="1.4"/><rect x="6.8" y="10" width="2.4" height="2.8" fill="#ffe082" stroke="#d4a017" stroke-width=".8"/>`),
  exe: M(`<rect x="1.5" y="2.5" width="13" height="10" rx=".8" fill="#e8f0e8" stroke="#6a9a6a" stroke-width=".9"/><path d="M5.5 14h5M8 12.5V14" stroke="#6a9a6a" stroke-width=".9"/><path d="M4 5.5l2 2-2 2M7.5 9.5h3" stroke="#3d7a3d" stroke-width="1.1" fill="none"/>`),
  doc: M(`<path d="M3.5 1.5h6L12.5 4.5v10h-9z" fill="#fff" stroke="#7a8ba5" stroke-width=".9"/><path d="M9.5 1.5v3h3" stroke="#7a8ba5" stroke-width=".9"/><path d="M5 7h6M5 9h6M5 11h4" stroke="#4a7dbd" stroke-width=".9"/>`),
  pdf: M(`<path d="M3.5 1.5h6L12.5 4.5v10h-9z" fill="#fff" stroke="#c96a5b" stroke-width=".9"/><path d="M9.5 1.5v3h3" stroke="#c96a5b" stroke-width=".9"/><text x="4" y="12" font-size="5.5" font-weight="bold" fill="#c9302c" stroke="none" font-family="sans-serif">PDF</text>`),
  gen: M(`<path d="M3.5 1.5h6L12.5 4.5v10h-9z" fill="#fff" stroke="#9aa5b1" stroke-width=".9"/><path d="M9.5 1.5v3h3" stroke="#9aa5b1" stroke-width=".9"/>`),
  html: M(`<circle cx="8" cy="8" r="6.5" fill="#eaf3fc" stroke="#3778b5" stroke-width=".9"/><path d="M8 1.5c-2.2 1.8-3.3 4-3.3 6.5s1.1 4.7 3.3 6.5c2.2-1.8 3.3-4 3.3-6.5S10.2 3.3 8 1.5zM1.5 8h13" stroke="#3778b5" stroke-width=".8" fill="none"/>`),
};

function fileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a'].includes(ext)) return FT.mp3;
  if (['avi', 'mp4', 'mkv', 'mov', 'wmv', 'flv', 'mpg', 'webm', 'ts', 'm4v'].includes(ext)) return FT.video;
  if (['zip', 'rar', '7z', 'gz', 'tar', 'iso', 'bz2', 'xz'].includes(ext)) return FT.zip;
  if (['exe', 'msi', 'deb', 'rpm', 'apk', 'jar', 'appimage'].includes(ext)) return FT.exe;
  if (ext === 'pdf') return FT.pdf;
  if (['doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx', 'odt'].includes(ext)) return FT.doc;
  if (['html', 'htm', 'php'].includes(ext)) return FT.html;
  return FT.gen;
}

// also loadable from Node (icon build script); browser <script> ignores this
if (typeof module !== 'undefined') module.exports = { LOGO, TB, TREE, FT, fileIcon };
