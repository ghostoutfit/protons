# Protons — Nuclear Simulation

Interactive nuclear physics simulation built as a classroom/educational tool.
Vanilla HTML + CSS + JS only — no build system, no npm, no bundler.

## Project structure

```
v1/ … v12/    Each version is a self-contained index.html
v100/         Separate fission simulation
dev/          Scratch/in-progress work (not versioned with vN)
v2/           Shared backend:
  sheets-api.js      Google Sheets notepad API (SHEETS global)
  test-sheets.html   Manual test harness for the API
```

Each version is a single HTML file (inline CSS + JS). There is no build step.
To run locally: `python3 -m http.server` in the repo root, then open `localhost:8000/v12/index.html`.

The active development version is **v12** (v11 is the previous iteration).

## Physics model

- Coulomb repulsion (proton–proton only): `K/r²`, `coulombStrength = 139`
- Strong nuclear force: constant attractive force within cutoff range, `strongForceStrength` / `strongForceRange`
- 20 substeps per animation frame (`SUBSTEPS = 20`) for accuracy
- Coulomb cutoff at `PARTICLE_RADIUS * 40` to skip negligible pairs

## Tabs

- **Tab A (proton)** — protons only, no strong force; demos Coulomb repulsion
- **Tab B (nucleus)** — protons + neutrons, strong force active; demos nuclear binding

## Key features (v11/v12)

- **Toolbar**: Go/Stop, Replay, Speed slider, Zoom slider, Tab A/B, theme switcher, Notepad button
- **Time scrubber**: slider at bottom of screen; records up to 4000 frames of particle history
- **Notepad panel**: right-side panel; student saves observations linked to Google Sheets via `SHEETS` API
- **Particle icons**: animated canvas icons in the toolbar for proton/neutron
- **Themes**: three color themes (Synthwave / Midnight / Plasma); stored per session
- **SideSim**: mini physics engine inside the notepad for replaying saved states on cards

## Notepad / Google Sheets backend

Shared across all versions. Lives in `v2/sheets-api.js` and is loaded via:
```html
<script src="../v2/sheets-api.js"></script>
```
All writes go to Apps Script via GET (not POST — 302 redirect drops the body).
Students identify via a class code + student ID from the `Config` tab of the sheet.

## Versioning convention

- New features → new version directory (`v13/`, etc.)
- Copy the previous `index.html` as the starting point
- `v2/sheets-api.js` is shared; don't duplicate it into new versions
- Commit message format: `v12: short description of change`

## Gotchas

- All CSS and JS is inline in index.html — no external files except `sheets-api.js` and Google Fonts
- Canvas is full-viewport (`inset: 0`); toolbar and scrubBar are fixed overlays
- `particleHistory.shift()` drops old frames when buffer is full (4000 frames max); frame indices shift
- Tab switching via `applyTab()` stops the sim but does NOT reset `particleHistory` — `resetSim()` (called by place functions) clears it
- `SideSim` in v12 has its own local `running`, `loop`, etc. — they don't conflict with the main sim's globals
