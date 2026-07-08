# Falco Download Manager

Falco is a lightweight download manager built with Electron. It splits each download into multiple parallel connections (up to 8 segments) for faster speeds, supports pause/resume, and integrates with your browser so downloads are automatically handed over to Falco.

![Falco](assets/falco.png)

## Features

- **Segmented downloads** — files are downloaded over multiple parallel connections, with per-segment retry and resume. The engine uses only Node's built-in `http`/`https` (no runtime dependencies).
- **Pause / resume** — resumable downloads survive app restarts.
- **Queues & scheduler** — organize downloads into queues and schedule when they run.
- **Automatic categories** — downloads are sorted into Compressed, Documents, Music, Programs, Video, or General based on file extension.
- **Browser integration** — a companion Chrome extension catches downloads in the browser and sends them to Falco (see below).
- **System tray** — closing the main window keeps Falco running in the background; downloads keep going.
- **Light & dark** — the UI follows your system theme automatically.

## Project layout

| Path | Purpose |
|------|---------|
| `engine.js` | Download engine: segmentation, resume, retries, categories |
| `main.js` | Electron main process: windows, tray, settings, browser-catch server |
| `preload.js` | IPC bridge between main process and UI |
| `renderer/` | UI: main window, add-URL, progress, options, scheduler, etc. |
| `extension/` | Chrome extension for browser integration |
| `test/` | Engine unit tests and a real-download smoke test |

## Build

Requirements: [Node.js](https://nodejs.org/) 20+ and npm.

```bash
git clone https://github.com/<you>/falco.git
cd falco
npm install
```

Run in development:

```bash
npm start
```

Run the tests:

```bash
npm test          # engine unit tests
npm run test:real # real download smoke test
```

Build the Windows installer (output goes to `dist/`):

```bash
npm run dist:win
```

This produces an NSIS installer built with electron-builder.

## Install

### From the installer

1. Build the installer (`npm run dist:win`) or grab it from `dist/`.
2. Run the installer. You can choose the install directory; it creates desktop and Start Menu shortcuts named **Falco**.
3. Launch Falco. By default it starts downloads immediately and keeps running in the system tray when you close the window. Use the tray icon → **Exit** to quit completely.

### From source

No install needed — `npm start` runs the app directly.

## Browser integration

Falco listens on `http://127.0.0.1:49721` while it's running. The bundled extension intercepts browser downloads and hands them to Falco.

### Installing the extension (Chrome / Edge / Brave / any Chromium browser)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the extension folder:
   - From source: the `extension/` folder in this repo.
   - From an installed build: `<install dir>/resources/extension`.
4. Done. The Falco icon appears in the toolbar.

### How it works

- When you start a download in the browser, the extension checks that Falco is running (`/ping`), cancels the browser download, and sends the URL to Falco (`/add`). Falco pops up its add-download dialog and takes over.
- Only plain `http(s)` downloads are caught — `blob:`, `data:`, and `file:` URLs are left to the browser.
- **If Falco isn't running, the browser downloads normally** — nothing breaks.
- Click the toolbar icon to toggle catching **ON/OFF** (an "OFF" badge shows when disabled).

## Settings

Settings are stored in `settings.json` in the app's user-data directory. Configurable through the UI:

- Download directory (defaults to your system Downloads folder)
- Max connections per download (default 8)
- Start downloads immediately
- Show dialog on completion
- Start Falco automatically

## License

