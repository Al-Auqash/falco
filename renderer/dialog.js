'use strict';
/* Shared dialog scaffolding: custom titlebar + query params. */
const Q = new URLSearchParams(location.search);
const $ = (s) => document.querySelector(s);

function initTitlebar(title, { max = false, min = false } = {}) {
  const tb = document.createElement('div');
  tb.className = 'titlebar';
  tb.innerHTML = `
    <span class="app-icon">${LOGO(16)}</span>
    <span class="title" id="dlgTitle"></span>
    <span class="spacer"></span>
    <div class="caption-btns">
      ${min ? '<button id="tbMin"><svg viewBox="0 0 10 10"><path d="M0 5h10"/></svg></button>' : ''}
      ${max ? '<button id="tbMax"><svg viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9"/></svg></button>' : ''}
      <button id="tbClose" class="close"><svg viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10"/></svg></button>
    </div>`;
  document.body.prepend(tb);
  document.getElementById('dlgTitle').textContent = title;
  document.getElementById('tbClose').onclick = () => idm.winClose();
  if (min) document.getElementById('tbMin').onclick = () => idm.winMin();
  if (max) document.getElementById('tbMax').onclick = () => idm.winMax();
}
function setDlgTitle(t) { document.getElementById('dlgTitle').textContent = t; document.title = t; }

function fmtSize(n) {
  if (n == null) return 'Unknown';
  if (n >= 1024 * 1024 * 1024) return (n / 1024 / 1024 / 1024).toFixed(3) + ' GB';
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(3) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(2) + ' KB';
  return n + ' bytes';
}
function fmtSpeed(n) { return n ? fmtSize(n).replace('Unknown', '0') + '/sec' : ''; }
function fmtTimeLeft(s) {
  if (s == null) return '';
  if (s < 60) return s + ' sec';
  if (s < 3600) return Math.floor(s / 60) + ' min ' + (s % 60) + ' sec';
  return Math.floor(s / 3600) + ' hr ' + Math.floor((s % 3600) / 60) + ' min';
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') idm.winClose(); });
document.addEventListener('contextmenu', (e) => e.preventDefault());
