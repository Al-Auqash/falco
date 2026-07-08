// Inline SVG icon set — single-weight stroke icons, colored via currentColor.
'use strict';

const S = (inner, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const TB = { // toolbar icons
  addurl: S(`<path d="M12 5v14M5 12h14"/>`),
  resume: S(`<path d="M7.5 5.5v13l11-6.5z"/>`),
  stop: S(`<path d="M9.5 5.5v13M14.5 5.5v13"/>`),
  stopall: S(`<circle cx="12" cy="12" r="8.25"/><rect x="8.75" y="8.75" width="6.5" height="6.5" rx="1"/>`),
  delete: S(`<path d="M4.5 6.5h15M9 6.5V5a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 5v1.5M6.5 6.5l.9 12.3a1.8 1.8 0 001.8 1.7h5.6a1.8 1.8 0 001.8-1.7l.9-12.3M10 10.5v6M14 10.5v6"/>`),
  delcompleted: S(`<path d="M4.5 6.5h9M4.5 12h6M4.5 17.5h5M13.5 15.7l2.5 2.5 4.5-5.2"/>`),
  options: S(`<path d="M4.5 7.5h6M18 7.5h1.5M4.5 16.5h1.5M13.5 16.5h6"/><circle cx="13.5" cy="7.5" r="2.4"/><circle cx="9" cy="16.5" r="2.4"/>`),
  scheduler: S(`<circle cx="12" cy="12" r="8.25"/><path d="M12 7.5V12l3 2"/>`),
  startqueue: S(`<path d="M4.5 6h10M4.5 10.5h7M4.5 15h5M13.5 12.5l6.5 3.75-6.5 3.75z"/>`),
  stopqueue: S(`<path d="M4.5 6h10M4.5 10.5h7M4.5 15h5M15 13v7M19 13v7"/>`),
  grabber: S(`<circle cx="12" cy="12" r="8.25"/><path d="M3.75 12h16.5M12 3.75c-2.6 2.3-3.9 5.05-3.9 8.25s1.3 5.95 3.9 8.25c2.6-2.3 3.9-5.05 3.9-8.25s-1.3-5.95-3.9-8.25z"/>`),
  more: S(`<circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none"/>`),
};

// Falco logo: rendered from assets/falco.png (see scripts/gen-icon.js for the icon pipeline)
const LOGO = (sz = 16) => {
  const file = sz <= 16 ? 'icon-16' : sz <= 48 ? 'icon-48' : 'icon-128';
  return `<img src="../assets/${file}.png" width="${sz}" height="${sz}" style="display:block" alt="">`;
};

const M = (inner) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const TREE = { // sidebar icons — inherit the node's color
  folderOpen: M(`<rect x="2" y="2" width="5" height="5" rx="1.2"/><rect x="9" y="2" width="5" height="5" rx="1.2"/><rect x="2" y="9" width="5" height="5" rx="1.2"/><rect x="9" y="9" width="5" height="5" rx="1.2"/>`),
  compressed: M(`<rect x="2.75" y="2" width="10.5" height="12" rx="1.6"/><path d="M8 2v1.2m0 1.6V6m0 1.6v1.2"/>`),
  documents: M(`<path d="M3.5 1.75h5.3l3.7 3.5v9H3.5z"/><path d="M8.8 1.75v3.5h3.7M5.8 8.5h4.4M5.8 11h4.4"/>`),
  music: M(`<path d="M6.5 12.4V4.2l6.5-1.6v8.1"/><circle cx="4.9" cy="12.5" r="1.7"/><circle cx="11.4" cy="10.8" r="1.7"/>`),
  programs: M(`<rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.6"/><path d="M4.5 6l2 2-2 2M8.5 10.5h3"/>`),
  video: M(`<rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.6"/><path d="M6.5 5.6l4 2.4-4 2.4z"/>`),
  unfinished: M(`<circle cx="8" cy="8" r="6.25"/><path d="M8 5v5.3m0 0L5.8 8.1M8 10.3l2.2-2.2"/>`),
  finished: M(`<circle cx="8" cy="8" r="6.25"/><path d="M5.2 8.3l2 2 3.6-4.2"/>`),
  grabberprj: M(`<circle cx="8" cy="8" r="6.25"/><path d="M1.75 8h12.5M8 1.75C6.1 3.5 5.1 5.6 5.1 8s1 4.5 2.9 6.25C9.9 12.5 10.9 10.4 10.9 8S9.9 3.5 8 1.75z"/>`),
  queues: M(`<path d="M2 3.5h8M2 7h6M2 10.5h4.5"/><circle cx="11.5" cy="11" r="3"/><path d="M11.5 9.7V11l1 .7"/>`),
};

// file-type icons for list rows: rounded badge + glyph, tinted per category
const FT_COLOR = {
  audio: 'oklch(0.62 0.14 300)', video: 'oklch(0.60 0.13 250)', zip: 'oklch(0.65 0.13 80)',
  exe: 'oklch(0.60 0.13 150)', pdf: 'oklch(0.60 0.17 25)', doc: 'oklch(0.58 0.12 230)',
  html: 'oklch(0.62 0.12 200)',
};
const F = (glyph, color) =>
  `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"${color ? ` style="color:${color}"` : ''}><rect x="1.75" y="1.75" width="12.5" height="12.5" rx="3.2"/>${glyph}</svg>`;
const FT = {
  audio: F(`<path d="M6.7 10.7V6.4l3.8-1v3.6"/><circle cx="5.7" cy="10.8" r="1"/><circle cx="9.5" cy="9.2" r="1"/>`, FT_COLOR.audio),
  video: F(`<path d="M6.4 5.6l4 2.4-4 2.4z"/>`, FT_COLOR.video),
  zip: F(`<path d="M8 2.5v1m0 1.6v1m0 1.6v1m-1 1.3h2v2.2H7z"/>`, FT_COLOR.zip),
  exe: F(`<path d="M5 6l2 2-2 2M8.7 10.5h2.5"/>`, FT_COLOR.exe),
  pdf: F(`<path d="M5.2 5.5h5.6M5.2 8h5.6M5.2 10.5h3.4"/>`, FT_COLOR.pdf),
  doc: F(`<path d="M5.2 5.5h5.6M5.2 8h5.6M5.2 10.5h3.4"/>`, FT_COLOR.doc),
  html: F(`<path d="M6 6l-2 2 2 2M10 6l2 2-2 2"/>`, FT_COLOR.html),
  gen: F(`<path d="M5.2 5.5h5.6M5.2 8h5.6M5.2 10.5h3.4"/>`),
};

function fileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a'].includes(ext)) return FT.audio;
  if (['avi', 'mp4', 'mkv', 'mov', 'wmv', 'flv', 'mpg', 'webm', 'ts', 'm4v'].includes(ext)) return FT.video;
  if (['zip', 'rar', '7z', 'gz', 'tar', 'iso', 'bz2', 'xz'].includes(ext)) return FT.zip;
  if (['exe', 'msi', 'deb', 'rpm', 'apk', 'jar', 'appimage'].includes(ext)) return FT.exe;
  if (ext === 'pdf') return FT.pdf;
  if (['doc', 'docx', 'txt', 'rtf', 'xls', 'xlsx', 'ppt', 'pptx', 'odt'].includes(ext)) return FT.doc;
  if (['html', 'htm', 'php'].includes(ext)) return FT.html;
  return FT.gen;
}

// also loadable from Node; browser <script> ignores this
if (typeof module !== 'undefined') module.exports = { LOGO, TB, TREE, FT, fileIcon };
