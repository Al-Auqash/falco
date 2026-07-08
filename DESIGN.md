# Falco Design System

All tokens live in `renderer/style.css` under `:root` and resolve per system theme via `color-scheme: light dark` + `light-dark()`. Every color is OKLCH. Windows are frameless; each renders its own titlebar.

## Color

| Token | Role |
|---|---|
| `--bg` | window / content background (pure white · near-black) |
| `--surface` | titlebar, toolbar, sidebar, secondary buttons |
| `--surface-2` | hover states, progress track |
| `--ink` / `--muted` | body text / secondary text (≥4.5:1 on bg) |
| `--border` | hairlines, inputs, panels |
| `--primary` | cobalt (hue 235) — fills: primary buttons, progress, selection accent |
| `--primary-text` / `--link` | cobalt tuned for text on bg |
| `--primary-tint` | selected row / nav background |
| `--success` / `--danger` / `--queue` | download states: complete / error / queued |

Strategy is Restrained: neutral surfaces, cobalt marks state and primary actions only. Never decorate with it.

Note: `light-dark()` does not resolve inside `getPropertyValue('--x')` — to read a theme color from JS (canvas), read a real property from an element styled with the token (see `.pbar` + `progress.html`).

## Typography

Segoe UI Variable / Segoe UI / system-ui. Base 13px. Scale: 11 (sidebar heading) · 11.5 (grid header) · 12.5 (buttons, labels, grid cells) · 13 (body, inputs) · 14 (dialog leads) · 16 (about title). Weight 500 for buttons/tabs, 600 for headings.

## Components

- **Buttons**: 7px radius. `.btn.default` / `.tbtn.primary` = cobalt fill, white text. Secondary = surface + border. Toolbar `.tbtn.icon-only` hides its label (tooltip via `title`).
- **Menus** (`.menu-popup .mi`): 10px radius, shadow, 6px-radius items, hover = `--surface-2`.
- **Inputs**: 7px radius, focus = primary border + 3px soft ring.
- **Tabs**: underline style (`inset 0 -2px` primary), not boxed.
- **Grid rows** (`.grow`): 32px, hover surface, selected `--primary-tint`; active downloads show a 3px `.minibar`.
- **Sidebar** (`.tnode`): 7px-radius items, selected = tint bg + `--primary-text`.
- **Icons** (`renderer/icons.js`): single-weight stroke, `currentColor`; file-type badges carry fixed category tints.

## Motion

120–150 ms, `--ease` (ease-out); background/color transitions and one popup entrance animation. Nothing decorative. `prefers-reduced-motion` disables all of it.

## E2E contract (don't break)

`main.js runE2E()` drives the UI by class names and labels: `.tbtn` order (Add URL first), labels `Delete` / `Start Queue`, `.tnode` labels `All Downloads` / `Compressed`, `.grow`, `.menu-popup .mi`, context-menu item labels, `#gridBody`. Keep these when restyling.
