'use strict';
/* Main window: menubar, toolbar, category tree, download grid. */

const $ = (s) => document.querySelector(s);
const downloads = new Map();
let selectedIds = new Set();
let currentFilter = { type: 'all' };
let sortKey = null, sortAsc = true;

document.getElementById('appIcon').innerHTML = LOGO(16);
$('#btnMin').onclick = () => idm.winMin();
$('#btnMax').onclick = () => idm.winMax();
$('#btnClose').onclick = () => idm.winClose();

/* ---------- helpers ---------- */
function fmtSize(n) {
  if (n == null) return '';
  if (n >= 1024 * 1024 * 1024) return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(2) + ' KB';
  return n + ' B';
}
function fmtSpeed(n) { return n ? fmtSize(n) + '/sec' : ''; }
function fmtTimeLeft(s) {
  if (s == null) return '';
  if (s < 60) return s + ' sec';
  if (s < 3600) return Math.floor(s / 60) + ' min ' + (s % 60) + ' sec';
  return Math.floor(s / 3600) + ' hr ' + Math.floor((s % 3600) / 60) + ' min';
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(t) {
  if (!t) return '';
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${MONTHS[d.getMonth()]} ${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${d.getFullYear()}`;
}
function statusText(d) {
  if (d.status === 'complete') return 'Complete';
  if (d.status === 'paused') return d.size ? (d.pct.toFixed(2) + '%') : 'Paused';
  if (d.status === 'downloading') return d.size ? (d.pct.toFixed(2) + '%') : 'Receiving data...';
  if (d.status === 'connecting') return 'Connecting...';
  if (d.status === 'queued') return 'Queued';
  if (d.status === 'error') return 'Error';
  return d.status;
}

/* ---------- menu bar ---------- */
const MENUS = {
  Tasks: [
    ['Add new download...', () => promptAddUrl()],
    ['Add batch download...', null],
    '-',
    ['Import', null], ['Export', null],
    '-',
    ['Drop target', null],
    '-',
    ['Exit', () => idm.appQuit()],
  ],
  File: [
    ['Open', () => act('open')],
    ['Open with...', null],
    ['Open folder', () => act('folder')],
    '-',
    ['Move to...', null],
    ['Rename', null],
    '-',
    ['Delete', () => act('delete'), 'Del'],
    ['Properties', null],
  ],
  Downloads: [
    ['Resume download', () => act('resume')],
    ['Stop download', () => act('stop')],
    ['Stop all downloads', () => idm.stopAll()],
    '-',
    ['Delete all completed', () => idm.removeCompleted()],
    '-',
    ['Start queue', () => idm.startQueue()],
    ['Stop queue', () => idm.stopQueue()],
    '-',
    ['Scheduler...', () => idm.openDialog('scheduler')],
    ['Speed Limiter', null],
    ['Options...', () => idm.openDialog('options')],
  ],
  View: [
    ['Toolbar', null],
    ['Categories', () => togglePanel()],
    '-',
    ['Large icons', null],
    ['Small icons', null],
  ],
  Help: [
    ['Falco Help', null],
    ['Browser integration...', () => idm.openDialog('integration')],
    ['Check for updates...', null],
    '-',
    ['About Falco...', () => idm.openDialog('about')],
  ],
  Registration: [
    ['Registration...', null],
  ],
};

const menubar = $('#menubar');
let openMenu = null;
for (const name of Object.keys(MENUS)) {
  const el = document.createElement('span');
  el.className = 'menu-title';
  el.textContent = name;
  el.onmousedown = (e) => { e.stopPropagation(); openMenu === el ? closeMenus() : showMenu(el, name); };
  el.onmouseenter = () => { if (openMenu && openMenu !== el) showMenu(el, name); };
  menubar.appendChild(el);
}
const popup = document.createElement('div');
popup.className = 'menu-popup';
document.body.appendChild(popup);

function showMenu(el, name) {
  closeMenus();
  openMenu = el;
  el.classList.add('open');
  popup.innerHTML = '';
  for (const item of MENUS[name]) {
    if (item === '-') { const s = document.createElement('div'); s.className = 'sep'; popup.appendChild(s); continue; }
    const [label, fn, accel] = item;
    const mi = document.createElement('div');
    mi.className = 'mi' + (fn ? '' : ' disabled');
    mi.textContent = label;
    if (accel) { const a = document.createElement('span'); a.className = 'accel'; a.textContent = accel; mi.appendChild(a); }
    if (fn) mi.onmousedown = (e) => { e.stopPropagation(); closeMenus(); fn(); };
    popup.appendChild(mi);
  }
  const r = el.getBoundingClientRect();
  popup.style.left = r.left + 'px';
  popup.style.top = r.bottom + 1 + 'px';
  popup.style.display = 'block';
}
function closeMenus() {
  popup.style.display = 'none';
  if (openMenu) openMenu.classList.remove('open');
  openMenu = null;
  hideCtx();
}
document.addEventListener('mousedown', closeMenus);

/* ---------- toolbar ---------- */
const TOOLBAR = [
  ['addurl', 'Add URL', () => promptAddUrl(), null],
  ['resume', 'Resume', () => act('resume'), 'needsResumable'],
  ['stop', 'Stop', () => act('stop'), 'needsActive'],
  ['stopall', 'Stop All', () => idm.stopAll(), null],
  ['delete', 'Delete', () => act('delete'), 'needsSel'],
  ['delcompleted', 'Delete Completed', () => idm.removeCompleted(), null],
  ['options', 'Options', () => idm.openDialog('options'), null],
  ['scheduler', 'Scheduler', () => idm.openDialog('scheduler'), null],
  ['startqueue', 'Start Queue', () => idm.startQueue(), null, true],
  ['stopqueue', 'Stop Queue', () => idm.stopQueue(), null, true],
  ['grabber', 'Grabber', () => idm.openDialog('grabber'), null],
  ['tellafriend', 'Tell a Friend', () => idm.openExternal('mailto:?subject=Internet%20Download%20Manager&body=Check%20out%20Internet%20Download%20Manager'), null],
];
const toolbar = $('#toolbar');
const tbEls = {};
for (const [icon, label, fn, cond, drop] of TOOLBAR) {
  const wrap = document.createElement('span');
  wrap.className = 'tbtn-wrap';
  const b = document.createElement('span');
  b.className = 'tbtn' + (fn ? '' : ' disabled');
  b.innerHTML = `${TB[icon]}<span class="lbl">${label}</span>`;
  if (fn) b.onclick = () => { if (!b.classList.contains('disabled')) fn(); };
  wrap.appendChild(b);
  if (drop) {
    const da = document.createElement('span');
    da.className = 'drop-arrow';
    da.innerHTML = '<svg viewBox="0 0 8 8"><path d="M0 2l4 4 4-4z" fill="#555"/></svg>';
    wrap.appendChild(da);
  }
  toolbar.appendChild(wrap);
  tbEls[icon] = { el: b, cond };
}
function refreshToolbar() {
  const sel = [...selectedIds].map((id) => downloads.get(id)).filter(Boolean);
  const anyActive = [...downloads.values()].some((d) => ['downloading', 'connecting'].includes(d.status));
  const en = {
    needsSel: sel.length > 0,
    needsActive: anyActive || sel.some((d) => ['downloading', 'connecting'].includes(d.status)),
    needsResumable: sel.some((d) => ['paused', 'queued', 'error'].includes(d.status)),
  };
  for (const { el, cond } of Object.values(tbEls)) {
    if (!cond) continue;
    el.classList.toggle('disabled', !en[cond]);
  }
}

/* ---------- category tree ---------- */
const TREE_ROWS = [
  { key: 'all', label: 'All Downloads', icon: 'folderOpen', exp: '-', depth: 0, filter: { type: 'all' } },
  { key: 'Compressed', label: 'Compressed', icon: 'compressed', exp: null, depth: 1, filter: { type: 'cat', cat: 'Compressed' } },
  { key: 'Documents', label: 'Documents', icon: 'documents', exp: null, depth: 1, filter: { type: 'cat', cat: 'Documents' } },
  { key: 'Music', label: 'Music', icon: 'music', exp: null, depth: 1, filter: { type: 'cat', cat: 'Music' } },
  { key: 'Programs', label: 'Programs', icon: 'programs', exp: null, depth: 1, filter: { type: 'cat', cat: 'Programs' } },
  { key: 'Video', label: 'Video', icon: 'video', exp: null, depth: 1, filter: { type: 'cat', cat: 'Video' } },
  { key: 'unfinished', label: 'Unfinished', icon: 'unfinished', exp: '+', depth: 0, filter: { type: 'unfinished' } },
  { key: 'finished', label: 'Finished', icon: 'finished', exp: '+', depth: 0, filter: { type: 'finished' } },
  { key: 'grabber', label: 'Grabber projects', icon: 'grabberprj', exp: null, depth: 0, filter: { type: 'none' } },
  { key: 'queues', label: 'Queues', icon: 'queues', exp: '+', depth: 0, filter: { type: 'queue' } },
];
const cattree = $('#cattree');
function renderTree() {
  cattree.innerHTML = '';
  for (const row of TREE_ROWS) {
    const n = document.createElement('div');
    n.className = `tnode depth${row.depth}` + (currentFilter._key === row.key ? ' sel' : '');
    n.innerHTML = `<span class="expander${row.exp ? '' : ' blank'}">${row.exp || ''}</span>` +
      `<span class="ticon">${TREE[row.icon]}</span><span class="tlabel">${row.label}</span>`;
    n.onclick = () => { currentFilter = { ...row.filter, _key: row.key }; renderTree(); renderGrid(); };
    cattree.appendChild(n);
  }
}
$('#catClose').onclick = () => togglePanel();
function togglePanel() {
  const p = $('#catpanel'), s = $('#splitter');
  const hide = p.style.display !== 'none';
  p.style.display = hide ? 'none' : 'flex';
  s.style.display = hide ? 'none' : 'block';
}

/* splitter drag */
(() => {
  const sp = $('#splitter'), panel = $('#catpanel');
  let dragging = false;
  sp.onmousedown = () => { dragging = true; };
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    panel.style.width = Math.max(80, Math.min(400, e.clientX)) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });
})();

/* ---------- grid ---------- */
const COLS = [
  { key: 'filename', label: 'File Name', w: 170 },
  { key: 'q', label: 'Q', w: 24 },
  { key: 'size', label: 'Size', w: 68 },
  { key: 'status', label: 'Status', w: 70 },
  { key: 'timeLeft', label: 'Time left', w: 66 },
  { key: 'speed', label: 'Transfer rate', w: 76 },
  { key: 'lastTryAt', label: 'Last Try Date', w: 76 },
  { key: 'description', label: 'Description', w: 150 },
];
const gridHead = $('#gridHead'), gridBody = $('#gridBody');
function renderHead() {
  gridHead.innerHTML = '';
  for (const c of COLS) {
    const el = document.createElement('div');
    el.className = 'gcol';
    el.style.width = c.w + 'px';
    el.textContent = c.label;
    el.onclick = () => { sortKey === c.key ? (sortAsc = !sortAsc) : (sortKey = c.key, sortAsc = true); renderGrid(); };
    gridHead.appendChild(el);
  }
  const fill = document.createElement('div');
  fill.className = 'gcol'; fill.style.flex = '1'; fill.style.borderRight = 'none';
  gridHead.appendChild(fill);
}

function passesFilter(d) {
  const f = currentFilter;
  if (f.type === 'all') return true;
  if (f.type === 'cat') return d.category === f.cat;
  if (f.type === 'unfinished') return d.status !== 'complete';
  if (f.type === 'finished') return d.status === 'complete';
  if (f.type === 'queue') return !!d.queue;
  return false;
}

function renderGrid() {
  let rows = [...downloads.values()].filter(passesFilter);
  if (sortKey) {
    rows.sort((a, b) => {
      const va = a[sortKey] ?? '', vb = b[sortKey] ?? '';
      return (va < vb ? -1 : va > vb ? 1 : 0) * (sortAsc ? 1 : -1);
    });
  } else rows.sort((a, b) => b.addedAt - a.addedAt);
  gridBody.innerHTML = '';
  for (const d of rows) {
    const r = document.createElement('div');
    r.className = 'grow' + (selectedIds.has(d.id) ? ' sel' : '');
    r.dataset.id = d.id;
    const cells = [
      `<span class="ficon">${fileIcon(d.filename)}</span><span style="overflow:hidden;text-overflow:ellipsis">${esc(d.filename || d.url)}</span>`,
      d.queue ? '<span style="color:#2b8a7d">◷</span>' : '',
      esc(fmtSize(d.size)),
      esc(statusText(d)),
      d.status === 'downloading' ? esc(fmtTimeLeft(d.timeLeft)) : '',
      d.status === 'downloading' ? esc(fmtSpeed(d.speed)) : '',
      esc(fmtDate(d.lastTryAt)),
      esc(d.description || ''),
    ];
    cells.forEach((html, i) => {
      const c = document.createElement('div');
      c.className = 'gcell';
      c.style.width = COLS[i].w + 'px';
      c.innerHTML = html;
      r.appendChild(c);
    });
    r.onmousedown = (e) => {
      if (e.ctrlKey) selectedIds.has(d.id) ? selectedIds.delete(d.id) : selectedIds.add(d.id);
      else selectedIds = new Set([d.id]);
      renderGrid(); refreshToolbar();
      if (e.button === 2) {
        e.stopPropagation(); // don't let the document mousedown close what we're opening
        closeMenus();        // close any other open menu first
        showCtx(e, d);
      }
    };
    r.ondblclick = () => {
      if (d.status === 'complete') idm.openFile(d.id);
      else if (['downloading', 'connecting'].includes(d.status)) idm.openProgress(d.id);
      else idm.start(d.id);
    };
    gridBody.appendChild(r);
  }
}
function esc(s) { const e = document.createElement('span'); e.textContent = s ?? ''; return e.innerHTML; }

/* context menu */
const ctx = document.createElement('div');
ctx.className = 'menu-popup';
document.body.appendChild(ctx);
function showCtx(e, d) {
  const active = ['downloading', 'connecting'].includes(d.status);
  const resumable = ['paused', 'queued', 'error'].includes(d.status);
  const items = [
    ['Open', () => idm.openFile(d.id), d.status === 'complete'],
    ['Open in Explorer', () => idm.openFolder(d.id), true],
    ['Copy download address', () => navigator.clipboard.writeText(d.url), true],
    '-',
    ['Resume download', () => idm.start(d.id), resumable],
    ['Pause download', () => idm.pause(d.id), active],
    ['Cancel download', () => { idm.pause(d.id); idm.setQueue(d.id, null); }, active || d.status === 'queued'],
    ['Restart download', () => idm.restart(d.id), d.status !== 'complete'],
    '-',
    ['Add to queue', () => idm.setQueue(d.id, 'main'), !d.queue && d.status !== 'complete'],
    ['Remove from queue', () => idm.setQueue(d.id, null), !!d.queue],
    '-',
    ['Show progress window', () => idm.openProgress(d.id), true],
    ['Properties', () => idm.openDialog('properties', { id: d.id }), true],
    '-',
    ['Delete', () => act('delete'), true],
  ];
  ctx.innerHTML = '';
  for (const it of items) {
    if (it === '-') { const s = document.createElement('div'); s.className = 'sep'; ctx.appendChild(s); continue; }
    const [label, fn, enabled] = it;
    const mi = document.createElement('div');
    mi.className = 'mi' + (enabled && fn ? '' : ' disabled');
    mi.textContent = label;
    if (enabled && fn) mi.onmousedown = (ev) => { ev.stopPropagation(); hideCtx(); fn(); };
    ctx.appendChild(mi);
  }
  ctx.style.display = 'block';
  ctx.style.left = Math.min(e.clientX, window.innerWidth - 230) + 'px';
  ctx.style.top = Math.min(e.clientY, window.innerHeight - ctx.offsetHeight - 4) + 'px';
}
function hideCtx() { ctx.style.display = 'none'; }
document.addEventListener('contextmenu', (e) => e.preventDefault());

/* ---------- actions ---------- */
function act(what) {
  const sel = [...selectedIds].map((id) => downloads.get(id)).filter(Boolean);
  for (const d of sel) {
    if (what === 'resume' && ['paused', 'queued', 'error'].includes(d.status)) idm.start(d.id);
    if (what === 'stop' && ['downloading', 'connecting'].includes(d.status)) idm.stop(d.id);
    if (what === 'open') idm.openFile(d.id);
    if (what === 'folder') idm.openFolder(d.id);
    if (what === 'delete') { idm.remove(d.id, false); }
  }
  if (what === 'delete') selectedIds.clear();
}
function promptAddUrl() { idm.openDialog('addurl'); }

document.addEventListener('keydown', (e) => {
  if (e.key === 'Delete') act('delete');
  if (e.key === 'Enter' && selectedIds.size) act('open');
});

/* ---------- data sync ---------- */
idm.onUpdate((d) => { downloads.set(d.id, d); renderGrid(); refreshToolbar(); });
idm.onAdded((d) => { downloads.set(d.id, d); renderGrid(); });
idm.onRemoved((id) => { downloads.delete(id); selectedIds.delete(id); renderGrid(); refreshToolbar(); });

(async () => {
  for (const d of await idm.list()) downloads.set(d.id, d);
  renderTree(); renderHead(); renderGrid(); refreshToolbar();
})();
