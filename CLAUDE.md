# Protons — Nuclear Simulation

Interactive nuclear physics simulation built as a classroom/educational tool.
Vanilla HTML + CSS + JS only — no build system, no npm, no bundler.

## Project structure

```
v1/ … v15/    Each version is a self-contained index.html
v100/         Older standalone fission simulation (651 lines, superseded by v13/v15)
dev/          Scratch/in-progress work (not versioned with vN)
v2/           Shared backend:
  sheets-api.js      Google Sheets Lab Journal API (SHEETS global)
  test-sheets.html   Manual test harness for the API
```

Each version is a single HTML file (inline CSS + JS). There is no build step.
To run locally: `python3 -m http.server` in the repo root, then open `localhost:8000/vN/index.html`.

## Active versions (what matters for final consolidation)

| Version | Role | Lines | Key features |
|---------|------|-------|--------------|
| **v11** | Proton sim | ~3000 | Tab A (proton) + Tab B (nucleus), force panel, stability table |
| **v12** | Nucleus + Lab Journal | ~4550 | Lab Journal panel, SideSim card playback, Google Sheets, field auto-off |
| **v15** | Fission + Lab Journal | ~3800 | Fission + Chain Reaction tabs, cross-version note playback, links to v11 |

v13 and v14 are intermediate experiments; their best ideas were merged into v15.
v100 is superseded. v1–v10 are history only.

## Navigation between active sims

- v15 toolbar links → v11 (Protons / Protons+Neutrons tabs as `<a href>`)
- v11 links back → v15 (via tab link)
- v12 is standalone; its `SideSim` is loaded by v15 via a hidden `<iframe id="v12Frame">` so v15 can replay v12 note cards

## Physics model (shared across all active versions)

- Coulomb repulsion (proton–proton only): `K/r²`, `coulombStrength = 139`
- Strong nuclear force: constant attractive force within cutoff, `strongForceStrength` / `strongForceRange`
- 20 substeps per animation frame (`SUBSTEPS = 20`) for accuracy
- Coulomb cutoff at `PARTICLE_RADIUS * 40` to skip negligible pairs
- `strongForceStrength` baseline = **0.6**; snaps to **1** when nucleus is in stable isotope range; drops to table value when neutron-deficient

## Stability table (`NUCLEUS_TABLE`) — canonical location: v11 and v12

Keyed by proton count Z (1–36). Each entry: `{ minN, maxN, strong }`.

```
applyBiggestClusterStability() logic:
  N < minN       → strongForceStrength = row.strong  (weak, nucleus unstable)
  minN ≤ N ≤ maxN → strongForceStrength = 1           (stable isotope range)
  N > maxN       → strongForceStrength = strongForceBaseline (0.6)
```

## Feature map — where each feature lives authoritatively

| Feature | Canonical version | Notes |
|---------|------------------|-------|
| Physics engine (`step`, Coulomb, strong) | v11, v12, v15 | All three keep their own copy; keep in sync |
| Stability table + `applyBiggestClusterStability` | v11, v12 | v15 does not have nucleus tab |
| Force panel (draggable, resizable, arrow viz) | v11, v12 | v15 doesn't have it |
| Lab Journal panel + save/load | v12 | v15 has its own copy (v15 notepad); keep in sync |
| `SideSim` (card playback engine) | v12 | v15 borrows v12's via iframe |
| Google Sheets API | v2/sheets-api.js | Shared; never duplicate |
| Energy graph | v15 (also v14) | v11/v12 do not have it |
| Field heatmaps (electric + strong) | v11, v12 | `drawCombinedHeatmap()` |
| Field auto-off for notebook playback | v12 | Frame-time check → `SideSim.isRunning()` |
| Particle icons (toolbar canvas animations) | v11, v12 | `iconAnimLoop()` |
| Themes (Synthwave / Midnight / Plasma) | v11, v12 | `THEMES` object, `currentTheme` |
| Time scrubber + `particleHistory` | v11, v12 | 4000-frame ring buffer |
| Proton spawn spacing | v11, v12 | `buildRandomProtons`, `minDist = strongCutoff() * 1.023` |
| Fission / cluster collision engine | v15 (v13/v14 earlier) | Entirely separate physics from v11/v12 |
| Chain Reaction tab | v15 | Not in v11/v12 |

## Key globals to keep in sync across versions

```javascript
const coulombStrength = 139;
let strongForceStrength = 0.6;
let strongForceBaseline = 0.6;
let strongForceRange = 1.2;
const PARTICLE_RADIUS = 10;
const SUBSTEPS = 20;
const COULOMB_CUTOFF_SQ = (PARTICLE_RADIUS * 40) ** 2;
```

## Cross-version comparison workflow

When checking if a feature is consistent across v11 and v12:

```bash
# Search a specific function across all versions
grep -n "functionName" v11/index.html v12/index.html v15/index.html

# Compare a function between two versions
# (find line numbers with grep, then Read with offset+limit)
```

Key diffs to watch for between v11 and v12:
- v12 has `syncStrongSlider()` calls (no-op stub); v11 does not
- v12 has `SideSim`, Lab Journal, `fieldAutoOffBanner`; v11 does not
- v12 has `captureSimState()` / `applySimState()` for note serialization
- v11 uses `setForceModeActive(arrowMode)` init; v12 uses same pattern

## Lab Journal / Google Sheets backend

Shared across versions. Loaded via:
```html
<script src="../v2/sheets-api.js"></script>
```
All writes go to Apps Script via GET (not POST — 302 redirect drops the body).
Students identify via a class code + student ID from the `Config` tab of the sheet.

Note cards store `simVersion: 'v12'` or `sim_version: 'v15'` so the correct `SideSim` is used for playback.

## SideSim (card playback)

- Defined in v12 as `var SideSim = (() => { ... })();`
- One shared instance per page; only one card plays at a time
- v15 loads v12's SideSim via `<iframe id="v12Frame" src="../v12/index.html">` and accesses it as `v12SideSim = iframe.contentWindow.SideSim`
- `SideSim.isRunning()` — returns whether a card is actively animating (used by field auto-off)

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
- `SideSim.draw()` temporarily redirects `canvas`, `ctx`, `particles`, and ~12 other globals then restores them — any new globals used in `draw()` must be added to that save/restore block
- `hmCanvas`, `hmDataElec`, `hmDataStrong`, `hmImgElec`, `hmImgStrong` are shared between main sim and SideSim (not redirected); `ensureHmBuffers` resizes them as needed
- `forcePanelEl.style.display` must be set to `'block'` (not `''`) — `''` reverts to the CSS `display: none`
- `applyBiggestClusterStability()` runs every frame in the main loop; `findAllClusters()` inside it is O(n²)
- Field auto-off (v12): triggers when frame > 50ms AND `SideSim.isRunning()` — only fires during active Lab Journal card playback
