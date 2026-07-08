// Falco browser integration: intercept downloads and hand them to the Falco app.
'use strict';
const FALCO = 'http://127.0.0.1:49721';

async function falcoAlive() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 800);
    const r = await fetch(FALCO + '/ping', { signal: ctl.signal });
    clearTimeout(t);
    return r.ok;
  } catch { return false; }
}

async function isEnabled() {
  const { enabled = true } = await chrome.storage.local.get('enabled');
  return enabled;
}

chrome.downloads.onCreated.addListener(async (item) => {
  if (!(await isEnabled())) return;
  const url = item.finalUrl || item.url;
  // only plain http(s) downloads — leave blob:, data:, file: to the browser
  if (!/^https?:\/\//i.test(url)) return;
  if (item.state && item.state !== 'in_progress') return;
  if (!(await falcoAlive())) return; // Falco not running: let the browser download

  chrome.downloads.cancel(item.id, () => {
    if (chrome.runtime.lastError) return; // already done/cancelled
    chrome.downloads.erase({ id: item.id });
    fetch(FALCO + '/add?url=' + encodeURIComponent(url)).catch(() => {});
  });
});

// Toolbar button toggles catching on/off.
chrome.action.onClicked.addListener(async () => {
  const enabled = !(await isEnabled());
  await chrome.storage.local.set({ enabled });
  chrome.action.setBadgeText({ text: enabled ? '' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: '#b45309' });
  chrome.action.setTitle({ title: `Falco download catching: ${enabled ? 'ON' : 'OFF'} (click to toggle)` });
});
