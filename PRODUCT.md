# Product

## Register

product

## Users

Desktop (Windows-first) users who download large files and want speed and control. Falco runs in the background/tray; users glance at it to check progress, occasionally open it to manage the queue. They arrive via the browser extension handing a download over — often mid-task in another app.

## Product Purpose

A fast, focused download manager: segmented multi-connection downloads, pause/resume, queues, a scheduler, and browser integration. No accounts, no registration, no upsells — just downloads. Success = downloads finish faster and the tool stays out of the way.

## Brand Personality

Swift, precise, unobtrusive. A peregrine at altitude: cold slate sky, instrument precision. The UI should feel like a well-made tool, not a product selling itself.

## Anti-references

- The classic IDM / WinRAR-era shareware look: dated Win32 chrome, "Registration" menus, "Tell a Friend" buttons, nag dialogs.
- Over-decorated Electron apps with gradients, glass, and marketing energy inside a utility.

## Design Principles

1. **The tool disappears into the task** — density and familiarity over novelty; standard affordances everywhere.
2. **State is the star** — speed, progress, and queue state are the most important pixels; accent color marks state, never decoration.
3. **No dead UI** — every visible control works; placeholder/disabled menu items are removed, not grayed out.
4. **One vocabulary** — same button, menu, and form control styling across the main window and every dialog.

## Accessibility & Inclusion

- Follows system light/dark theme.
- Body text ≥ 4.5:1 contrast in both themes; keyboard: Delete removes, Enter opens.
- Reduced motion respected; transitions are 150–250 ms state feedback only.
