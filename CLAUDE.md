# Protons — Nuclear Simulation

Interactive nuclear physics simulations built as a classroom/educational tool.
Vanilla HTML + CSS + JS only — no build system, no npm, no bundler.

## Project structure

```
v1/ … v15/    Each version is a self-contained index.html
v100/         Older standalone fission simulation (651 lines, superseded)
dev/          Scratch/in-progress work (not versioned with vN)
  bug-report.html    Student/user bug submission form; auto-fills steps from
                     actionLog; submits via SHEETS.appendNote (student_id='BUG')
v2/           Also hosts shared backend:
  sheets-api.js      Google Sheets Lab Journal API (SHEETS global)
  test-sheets.html   Manual test harness for the API
images/
  bscs-logo.png      BSCS logo shown in toolbar of v11, v13, v14
index.html    Landing page — currently lists only v1–v8 + dev/. v11–v15 are
              accessed by direct URL while in active iteration.
```

Each active sim is a single HTML file (inline CSS + JS). There is no build step.
To run locally: `python3 -m http.server` in the repo root, then open
`localhost:8000/vN/index.html`.

## Active versions

| Version | Title in `<title>` | Lines | Tabs | Role |
|---------|--------------------|-------|------|------|
| **v11** | Nuclear Simulation v11 | ~3840 | Protons / Investigate Stability | Main proton + nucleus sim |
| **v12** | Nuclear Simulation v12 | 4547 | (Tab A / Tab B) | Lab-Journal-bearing nucleus sim — kept around because v15 borrows its `SideSim` |
| **v13** | Nuclear Fission — v13 | ~4640 | Fission / Chain Reaction | Current fission sim — replaced v15's role |
| **v14** | Nuclear Fusion — v14 | ~4490 | FUSION / TEMPERATURE | Standalone fusion + temperature/heat sim |
| **v15** | Nuclear Fission — v13 *(stale)* | 3792 | Fission / Chain Reaction | Older fission + Lab Journal. Loads v12 in a hidden iframe for `SideSim` card playback. Last touched in `63982ee`; v13 is where new fission work happens. |

v1–v10 and v100 are history only. **All recent commit activity is on v11, v13, v14.**

## Cross-version navigation

- **v11** Fission/Chain tabs are hidden `<a>` links to `../v13/index.html` (and `../v13/index.html#chain`). They're shown by feature flag / hash.
- **v13** Protons / Investigate Stability tabs are `<a>` links back to `../v11/index.html#fission`.
- **v14** is standalone — no cross-links to other sims.
- **v15** still links Protons → `../v11/index.html` and embeds v12 via `<iframe id="v12Frame" src="../v12/index.html">` so its notepad can replay v12-authored cards. v15 is otherwise dormant.

URL hash routing: `#fission`, `#chain`, `#temp`, `#nucleus`, `#protons` are honored on load by the relevant sim to deep-link into a tab.

## Physics models — diverged per version

The "shared physics" assumption from earlier docs no longer holds. Active sims now use intentionally different scales because they model different phenomena.

### v11 / v12 (Coulomb + strong, nucleus stability)
```javascript
const PARTICLE_RADIUS    = 10;
const SUBSTEPS           = 20;
const coulombStrength    = 139;     // F = K/r²
let   strongForceStrength = 0.6;    // baseline; stability logic varies it
let   strongForceBaseline = 0.6;
let   strongForceRange   = 1.2;     // cutoff = PARTICLE_RADIUS * 2 * range
const COULOMB_CUTOFF_SQ  = (PARTICLE_RADIUS * 40) ** 2;
```
strongCutoff() = PARTICLE_RADIUS · 2 · strongForceRange = **24 px** by default.

### v13 (fission cluster physics — separate engine)
```javascript
const PARTICLE_RADIUS = 10;
const coulombStrength = 150;
```
Fission/chain dynamics are a different code path (cluster centers, daughter ejection, neutron flight). Not directly comparable to v11/v12 force loops.

### v14 (fusion + temperature — distinct scale)
```javascript
const PARTICLE_RADIUS     = 10;
const SUBSTEPS            = 20;
const strongForceStrength = 4;     // *constant*, no slider
const strongForceRange    = 2.0;
let   coulombStrength     = 400;   // F = K/r²
const COULOMB_CUTOFF_SQ   = (PARTICLE_RADIUS * 40) ** 2;
```
Temperature tab uses its own short-range repulsion law: `F = tempCoulomb / r⁴` with `tempCoulomb ≈ 5e6`, plus its own `TEMP_SUBSTEPS = 4` and rounded-rect wall bouncing.

## Stability table (`NUCLEUS_TABLE`) — canonical: v11 and v12

Keyed by proton count Z (1–36). Each entry: `{ minN, maxN, strong }`.

```
applyBiggestClusterStability() logic:
  N < minN        → strongForceStrength = row.strong  (weak, neutron-deficient)
  minN ≤ N ≤ maxN → strongForceStrength = 1            (stable isotope range)
  N > maxN        → strongForceStrength = strongForceBaseline (0.6)
```

Runs every frame in the live loop; `findAllClusters()` inside it is O(n²).

## Feature map — where each feature lives authoritatively

| Feature | Canonical version(s) | Notes |
|---------|---------------------|-------|
| Coulomb + strong physics engine (`step`) | v11, v12 | Each keeps its own copy; keep in sync |
| Stability table + `applyBiggestClusterStability` | v11, v12 | Only sims with a "nucleus" notion |
| Force panel (draggable, resizable, arrow viz) | v11, v12 | v13/v14/v15 do not have it |
| All Forces per-particle labels (A–Z protons, 1,2,… neutrons within strongCutoff of selected) | v11 | Active in `arrowMode === 1` single-particle mode; nucleus tab capped at ≤10 protons. Letters are light pink (`#ffb6c1`); numbers white. Force-panel labels render 3px larger than main canvas. |
| Center button (cluster tracking) | v11 | `centerTracking` flag; `updateCam()` is called per-frame in live loop **and** inside `renderFrame()` so replay/scrub track the historical cluster identically |
| Time scrubber + `particleHistory` | v11, v12 | 4000-frame ring buffer; `renderFrame(idx)` swaps in the historical frame's particles around `draw()` |
| Replay button (`doReplay`) | v11, v12 | Auto-advances `scrubFrame` through history; rate driven by speed slider |
| Lab Journal panel + save/load | v12 | v15 has its own copy; v11/v13/v14 have no Lab Journal |
| `SideSim` (card playback engine) | v12 | v15 borrows it via the hidden iframe |
| Google Sheets API | `v2/sheets-api.js` | Shared; never duplicate. Only v12 + v15 currently load it. `dev/bug-report.html` also loads it for bug submission. |
| Field heatmaps (electric + strong) | v11, v12 | `drawCombinedHeatmap()` |
| Shared field heatmap renderer | v14 | `drawFieldHeatmap(pairs, colormap, mode)` — replaced separate `drawHeatmap`/`drawStrongHeatmap`. `mode` is `'eie'` (additive) or `'sie'` (max accumulation); branches inside pixel loop. |
| Energy / bar chart + energy-vs-time graph | v14, v15 | v14 has the recent layout work (5 gridlines, "Energy in Fields" combined label) |
| Particle icons (toolbar canvas animations) | v11, v12 | `iconAnimLoop()` |
| Themes (Synthwave / Midnight / Plasma) | v11, v12, v13 | v11/v12: `THEMES` object, `currentTheme`; v13: theme-btn circles in toolbar, same CSS vars |
| Field auto-off for notebook playback | v12 | Frame-time check → `SideSim.isRunning()` |
| Fission animation + Chain Reaction tab | v13 (canonical), v15 (older) | Cluster-centered animation, daughter ejection, enrich sites, prompt neutron flight |
| Nucleus drag-to-rotate (yaw + pitch) | v13 | Click-and-drag the parent nucleus pre-flight; mutates `animParent.particles` in place, invalidates `chainParticleOffsets` cache |
| Force-viz panel (electric + strong arrows along fission axis) | v13 | `drawForceViz`; pre-impact axis = drag yaw / 0; post-impact axis = `staticFissAngle` chosen at impact |
| Light-mode toggle (white background for screenshots) | v11, v13, v14 | `body.screenshot-mode` CSS class; v13/v14 also gate `ctx.fillStyle` for the canvas background fill |
| Fusion tab + COMBO_TABLE (D+T, D+D, T+T, etc.) | v14 | Tracks per-combo immediateKE, keOut, sieOffset, gammaKE |
| D+D→T+p live EIE drain | v14 | `ddToTPEscape` flag + `updateDDToTPDisplay()` — EIE decays as `eie0 * distRef / max(d, distRef)` (1/r) from frozen collision-phase value; no `coulombScatterEscape` during escape |
| Temperature tab (1/r⁴ repulsion in rounded-rect container, thermostat slider, slow-mo) | v14 | Wall bouncing handled in `stepTempPhysics()`; persistent `Float32Array` buffers `_tempAx/_tempAy` (forces) and `_tempVisX/_tempVisY` (visual positions) avoid per-frame allocations |
| Hard-sphere elastic proton collisions | v14 | "no overlap, roll around the edge" + visual overlap clamping |
| Bug report button (🐞) + action log | v11, v13, v14 | Button lives in the toolbar theme-button row (right side, after color picker). `getBugState()` serializes sim state + `actionLog`. `logAction(msg)` pushes to 25-entry circular buffer on key UI events. Opens `dev/bug-report.html` in a new tab. |
| BSCS logo | v11, v13, v14 | `../images/bscs-logo.png`, links to `https://bscs.org/`, `alt="built by BSCS"`. Replaced SSPI logo. |

## Key globals — by version

Don't blindly copy globals between sims. **v11 ↔ v12** are mostly aligned. **v13 / v14** intentionally differ.

```javascript
// v11 / v12:
const coulombStrength = 139;
let   strongForceStrength = 0.6;
let   strongForceBaseline = 0.6;
let   strongForceRange = 1.2;
const PARTICLE_RADIUS = 10;
const SUBSTEPS = 20;
const COULOMB_CUTOFF_SQ = (PARTICLE_RADIUS * 40) ** 2;
```

If editing physics in **v13** or **v14**, look up the constants in that file — they are not the same numbers.

## Cross-version comparison workflow

```bash
# Search a function across active sims
grep -n "functionName" v11/index.html v12/index.html v13/index.html v14/index.html v15/index.html

# Compare by line range
# (find line numbers with grep, then Read with offset+limit)
```

Useful diff targets to watch for between v11 and v12:
- v12 has `syncStrongSlider()` calls (no-op stub); v11 does not
- v12 has `SideSim`, Lab Journal, `fieldAutoOffBanner`; v11 does not
- v12 has `captureSimState()` / `applySimState()` for note serialization

## Lab Journal / Google Sheets backend

Loaded only by v12 and v15 via:
```html
<script src="../v2/sheets-api.js"></script>
```
All writes go to Apps Script via GET (not POST — 302 redirect drops the body).
Students identify via a class code + student ID from the `Config` tab of the sheet.

Note cards store `simVersion: 'v12'` or `sim_version: 'v15'` so the correct
`SideSim` is used for playback.

## SideSim (card playback)

- Defined in v12 as `var SideSim = (() => { ... })();`
- One shared instance per page; only one card plays at a time
- v15 loads v12's SideSim via `<iframe id="v12Frame" src="../v12/index.html">` and accesses it as `v12SideSim = iframe.contentWindow.SideSim`
- `SideSim.isRunning()` — used by field auto-off to detect active card playback
- `SideSim.draw()` temporarily redirects ~12 globals (`canvas`, `ctx`, `particles`, …) and restores them. Any new global used inside `draw()` must be added to the save/restore block.

## Versioning convention

- New features → new version directory (`v16/`, etc.)
- Copy the previous `index.html` as the starting point
- `v2/sheets-api.js` is shared; don't duplicate it into new versions
- Commit message format: `vNN: short description of change` (or `vAA/vBB: …` when touching multiple)

## Tab-switching pattern

Each sim that has tabs uses one of two patterns:
- **v11**: tabs are `<button id="tabA">`/`<button id="tabB">` driven by `setForceModeActive` + `currentTab` ('proton' | 'nucleus'); fission tabs are hidden `<a>` cross-links to v13.
- **v13 / v14**: tabs are `<button class="tab-btn" data-tab="...">` (or inline `onclick="switchTab('...')"` in v14); a single `applyTab(tab)` / `switchTab(name)` function is the single funnel and is responsible for stopping the off-tab animation, swapping control panels, and rendering the new tab's first frame.

In v14 specifically: `idleJitter` and the canvas mousedown bar-chart-drag are gated to `currentTab === 'fusion'` so they never clobber the temperature tab. `switchTab('fusion')` calls `setupScenario()` if `particles` is empty so the default config renders without pressing Go. Fusion view is biased 150 screen px left of canvas center via `cameraSiteX += VIEW_OFFSET_X` (= 100 world units × zoomScale 1.5).

## v14: Fusion + Temperature

`v14/index.html` (3655 lines). Fully standalone: no Lab Journal, no `SideSim`, no `sheets-api.js`, no cross-links to other sims. Models a single nuclear-fusion event (or Coulomb scatter) between two clusters, plus a separate ideal-gas-style temperature sim.

### Tabs
- **FUSION** (default): two clusters approach each other along the x axis; combo selector wheels (left + right) on the toolbar pick the cluster types; bar chart on the right shows energy partition; energy-vs-time graph in the scrub bar. No force panel.
- **TEMPERATURE**: 20 protons bouncing in a yellow rounded-rect container under short-range repulsion; thermostat slider (Cool ↔ Hot), slow-motion slider, optional total-force-arrow overlay.

`switchTab(name)` is the single funnel. It cancels both `animId` and `tempRAF`, resets `running` / `paused` / `tempRunning` / `tempPaused`, sizes the canvas, swaps `#fusionControls` ↔ `#tempControls`, then dispatches to `initTempProtons() + drawTemp()` or `setupScenario() + draw()` for the first paint.

**Tab-switch invariants** (added during recent debugging — these are what stops fusion content from clobbering temperature):
- `idleJitter` (always-on RAF for jitter) only redraws when `currentTab === 'fusion'`.
- The canvas `mousedown` that starts the bar-chart-drag is gated to `currentTab === 'fusion'`.
- `switchTab('fusion')` calls `setupScenario()` if `particles` is empty, so the default cluster pair appears without pressing Go.

### Cluster types
Per-particle definitions live in `CLUSTER_DEFS`:
- `p` — single proton
- `n` — single neutron
- `d` — deuteron (p + n)
- `t` — triton (p + 2n)
- `he` — helium-4 (2p + 2n)

`leftChoice` / `rightChoice` ∈ those keys. `leftClusterSize` is tracked on the `particles` array boundary so escape-phase code can slice cluster A vs cluster B.

### COMBO_TABLE
Keyed by `${left}+${right}`. Per-entry fields:

```
sieOffset            initial Strong-IE display offset (unscaled)
sieOffsetUnscaled    same value for non-scaled mode
immediateKE          KE at the moment of fusion product formation
keOut                KE displayed once the escape phase finishes
gammaKE              KE carried away by a gamma photon (Cat-3 only)
keInScaled           KE in real MeV (when `scaledEnergy` mode is on)
keOutScaled          ditto, post-escape
```

Four behavioral categories:
- **Cat 1 — bouncy single-particles** (`p+n`, `n+t`, …): small `immediateKE`, tiny `keOut`; they bounce out of the strong well after a short collision phase.
- **Cat 2 — productive fusion** (`d+t`, `d+d`, `t+t`): large `immediateKE` ≈ `keOut`; gets a temporary physics assist (`coulombMult = 2.0`, `strongRangeMult = 0.8`) for the first 8 escape frames so the daughters cleanly clear the well.
- **Cat 3 — gamma capture** (`p+p`, `n+n`, `p+n`, `n+p`): most of `immediateKE` leaves as a gamma; the `photon` global tracks the emitted γ and the camera retargets onto the (nucleus, photon) midpoint until the photon escapes.
- **Coulomb-only** (`p+he`, `d+he`, `he+he`, …): no strong-bound outcome; just a Coulomb scatter.

`getComboEntry()` looks up `${leftChoice}+${rightChoice}`; `isCategory1()`, `isCategory2()`, `isCoulombOnly()` are the runtime predicates.

### D+D → T+p escape display
D+D is Cat 2 but produces two different-mass particles (T + p). Special handling:

- `ddToTPEscape` flag is set in `fireDDtoTP()` when the escape phase starts.
- `coulombScatterEscape` is **not** set for D+D (unlike some other combos) — real strong force is disabled during escape so the T's extra neutron doesn't pull the proton back.
- `collisionDisplayKE` and `collisionDisplayEIE` are **not** nulled at type-swap; they stay frozen at the mid-collision values to prevent a KE/EIE jump.
- `updateDDToTPDisplay()` runs every frame during `escapeAnim` and `escape`, computing: `eie = ddTPEscapeEIE0 * ddTPEscapeDistRef / max(currentDist, ddTPEscapeDistRef)` — a 1/r decay starting from the frozen collision-phase EIE (`ddTPEscapeEIE0`) normalized to the snap distance (`ddTPEscapeDistRef`). KE = `(ddTPEscapeTotal − eie) / displayScale`.

Globals: `ddToTPEscape` (bool), `ddTPEscapeTotal` (total energy = KE+EIE at escape start), `ddTPEscapeEIE0` (frozen EIE snapshot), `ddTPEscapeDistRef` (T-centroid to proton distance at escape snap). All reset to `0`/`false` in `resetSim()`.

### Phase machine
`collisionPhase` ∈ `'approach' | 'collision' | 'escapeAnim' | 'escape'`:
- **approach**: free flight; Coulomb repels, strong attracts once inside cutoff.
- **collision**: free physics inside the well for up to `COLLISION_FRAMES`; auto-fires `escapeAnim` early for Cat-1 single-particle pairs as soon as relative velocity flips outward.
- **escapeAnim**: smoothstep-lerp positions toward the snapped escape geometry over `ESCAPE_ANIM_FRAMES`; lerp velocities from collision values to teleported escape values (per-particle for T+T 3-body, per-cluster otherwise).
- **escape**: clusters fly free; auto-stop when all particles leave the visible viewport.

Particles get `physMass` so T (mass 3) is forced to behave like D (mass 2) for KE conservation purposes — each T nucleon gets `physMass = 2/3`.

### Camera / view offset
Fusion render is biased ~150 screen px left of canvas center to keep clear of the right-side bar-chart panel. In `updateCamera()`:

```javascript
const VIEW_OFFSET_X = 100;  // world units; × zoomScale 1.5 ≈ 150 screen px
cameraSiteX = (lcx + rcx) / 2 + VIEW_OFFSET_X;
```

`zoomScale = 1.5` is hardcoded in `draw()`, both heatmaps, and the auto-stop screen-space check; if you change one, change them all.

### Bar chart + energy graph
- Bar chart occupies the right 320 px of the canvas. Two bars by default (Energy of Motion + Energy in Fields), three when the `splitIE` toggle is on (Motion + Electric + Strong). 5 horizontal gridlines, no numeric Y axis unless `scaledEnergy` is enabled (then drag-to-rescale + MeV labels appear).
- Energy-vs-time graph lives in the `#scrubBar` overlay below the canvas; KE (pink) and combined IE (purple) plotted across `particleHistory`.
- The "Separate Fields" toggle is a fixed-position `<label id="separateFieldsLabel">` floating over the bar chart's top edge; visibility tracks `currentTab === 'fusion'`.

### Temperature tab physics
A separate model from the fusion tab — short-range Coulomb-like repulsion in a hard-walled box.

```javascript
const TEMP_N         = 20;
const TEMP_R         = 24;        // visual radius (px)
const TEMP_SUBSTEPS  = 4;
let   tempCoulomb    = 5e6;       // F = tempCoulomb / r⁴ (very short-range)
let   tempTimeScale  = 1.0;       // 0.1..1.0; slow-motion via frame accumulator
let   tempSpeed      = 1.5;       // thermostat target px/frame
```

`stepTempPhysics()` runs `TEMP_SUBSTEPS` substeps: pairwise 1/r⁴ forces, integrate, bounce off the rounded-rect wall (4 flat edges + 4 corner arcs). After substeps, a soft thermostat `rescaleTempVelocities()` nudges mean speed back to `tempSpeed`.

**Performance notes**: force accumulation uses persistent `Float32Array` buffers `_tempAx` / `_tempAy` (reset with `.fill(0, 0, N)` each substep — no allocation). The container geometry is cached in `_tempContainer` and only recomputed on canvas resize. `drawTemp()` uses persistent `_tempVisX` / `_tempVisY` Float32Arrays for visual positions.

Visuals (`drawTemp()`):
- Yellow rounded-rect container.
- `tempFlashes[]` — close-approach events from `detectTempFlashes()` (when edge-to-edge distance < ~2 px); each flash fades over 250 ms; capped at 80 entries.
- Visual overlap clamping: render-only push of overlapping protons to touching distance, so flashes look right even when physics has them mildly overlapped.
- "Show Total Force" toggles `showTotalForce`, drawing per-proton net-Coulomb arrows on top.

### Hard-sphere elastic collisions (fusion tab)
Inside `step()`, after force integration: any overlapping pair is separated and the normal-velocity components are swapped (equal-mass elastic collision). Visual overlap clamping in the draw layer keeps the collision flash centered between the two protons even when their physics positions cross.

### Scrub bar + replay button
`#scrubBar` uses `border-top: 1px solid var(--ui-border)` + `box-shadow: 0 -1px 0 var(--accent1-dim), 0 -4px 20px rgba(0,0,0,0.5)` — identical to v13. The visual result is a thin dark pinkish line (~`#430f25` on screen). `#scrubReplayBtn` has full red neon styling matching v13 (font-size 32px, border/glow/text-shadow, disabled state).

### What v14 does NOT have
- No `NUCLEUS_TABLE` / stability table — different physics model.
- No `SideSim`, no Lab Journal, no `../v2/sheets-api.js`.
- No force panel (the v11/v12 right-side overlay).
- No `centerTracking` / cluster-tracking camera button.
- No themes (only the theme-button row with color picker + bug icon).
- No quantum stability / unstable-neutron timer.

## v13: Fission + Chain Reaction

`v13/index.html` (3575 lines). The current fission sim — replaced v15's role. Models a single fission event (a slow neutron strikes a heavy nucleus and splits it) plus a chain-reaction tab where neutrons released by each fission can trigger neighboring enriched sites.

### Tabs
- **FISSION** (default): one parent nucleus at canvas center, one neutron incoming from the left edge. Energy/force visualization in a small force-viz panel pinned at top-right.
- **CHAIN REACTION**: a grid of parent nuclei with several enriched sites. Neutrons released by each fission can land on a neighboring enriched site and trigger a new fission, propagating until they fly off-canvas.

The two "Protons" / "Investigate Stability" tabs in v13's tab bar are `<a>` cross-links back to `../v11/index.html#fission`; only Fission and Chain Reaction are local.

`applyTab(name)` is the single funnel. It cancels all in-flight RAFs (`neutronRAF`, `playbackRAF`, `chainRAF`), resets phase state (`neutronState = 'idle'`, clears history, `mainDaughters = null`, `enrichSites = []`), swaps which control rows are visible (chain hides the playback-speed / electric-field controls; fission shows force-mode controls), and resets accumulated energy counters.

### Phase machine
The whole fission animation is parameterized by a normalized scrub fraction `t ∈ [0, 1]`, so the time slider can scrub forwards/backwards through it deterministically. Key thresholds (from the constants near the top of the animation block):

```
NEUTRON_FRAC = 0.20    // neutron flight occupies the first 20% of the timeline
PH1_END      = 0.30    // jitter + wobble buildup ends here
PH2_END      = 0.375   // elongation peak (squash/stretch) ends here
ANIM_T_END   = 0.47    // daughter-ejection window ends here; rest is free flight
```

`neutronTick()` advances the incoming neutron 0 → NEUTRON_FRAC. **Impact = the moment the random fission axis is chosen** (`staticFissAngle = (Math.random() - 0.5) * Math.PI`), then `neutronState = 'fission'` and `fissionTick()` takes over. The axis pick is reset to `0` on NEW / Clear / Go so the force-viz panel sits horizontal until impact actually happens.

`fissionTick()` runs PH1 → PH2 → ANIM_T → free flight, deforming `animParent.particles` in place, then handing positions off to the daughter clusters (`animProd1`, `animProd2`) for ejection.

### Cluster / nucleus model
`initNuclei()` generates three nuclei via `generateNucleus(Z, N, cx, cy, seed)`:
- **Parent** — U-250 (78p + 172n) at canvas center
- **Prod1** — Pd-150 (47p + 103n)
- **Prod2** — Eu-100 (31p + 69n)

All particles live in `animParent.particles[]`. `animMap[]` is precomputed at init and tells each parent particle which daughter cluster it belongs to once fission starts. The two daughters are drawn out of `animProd1` / `animProd2` once their cluster center crosses out of the parent's footprint.

For chain mode, every enriched site has its own `{ cx, cy, state, fissT, angle, wobbleMode }`. Per-site geometry derives from `animParent` via `chainParticleOffsets` — a lazy cache that bakes the current 3D rotation of the parent into static offsets.

### Force visualization panel
A small fixed `#forceVizPanel` at top-right; not the v11/v12-style draggable force panel.

`drawForceViz()` draws the parent nucleus (using `animParent.particles` directly, so it tracks any drag rotation) plus an arrow pair (electric blue + strong yellow) along the chosen fission axis.

```
frac < NEUTRON_FRAC  →  fissAngle = nucleusDrag ? dragRotY : 0
frac ≥ NEUTRON_FRAC  →  fissAngle = staticFissAngle  (chosen at impact)
```

Pre-impact, a `pitchScale = Math.cos(dragRotX)` is wrapped around **just the four arrow draws** (not the nucleus): vertical drag squashes the arrows top-to-bottom to indicate the axis tilting forward/backward into the screen plane. The nucleus itself is left undeformed because it is already drawn from the same particle positions as the main canvas.

### Nucleus rotation (drag)
The parent nucleus is grabbable on the fission tab while idle.

- `pickNucleus(clientX, clientY)` — sphere hit-test on the main canvas; accounts for the force-viz panel's screen offset so a click near the visible nucleus picks it whether the user clicked the main canvas or the panel.
- `rotateNucleusY(deltaTheta)` — yaw: rotates each particle's local `(x − cx, z)`.
- `rotateNucleusX(deltaTheta)` — pitch: rotates each particle's local `(y − cy, z)`. Trackball convention: drag down → top of nucleus tips toward the viewer.
- Both invalidate `chainParticleOffsets` so chain-mode rendering picks up the new rotation.
- `canRotateNucleus()` gates rotation to `currentTab === 'fission' && neutronState === 'idle' && !!animParent`.

`mousedown` captures `{lastX, lastY}`, `mousemove` accumulates `dragRotY` and `dragRotX` per tick (sensitivity ≈ 600 px per full turn), `mouseup` clears the drag and resets both accumulators to 0 — so the force-viz arrows snap back to horizontal on release.

### Chain reaction
- Multiple parent nuclei in a grid; a fixed number of enriched sites sprinkled in.
- `chainNeutrons[]` are the neutrons in flight; when one comes within `captureR` of an enriched site, `triggerEnrichSite()` starts that site's fission and spawns 2–3 new prompt neutrons.
- `mainDaughters` holds the daughter-cluster pair from the seed fission so they can also be drawn during chain playback.
- Chain tab locks zoom at the computed grid bounds — no centerTracking-style camera, just a fixed view.

### Replay / scrubber
**v13 has NO `particleHistory` ring buffer.** Unlike v11/v12, scrubbing in v13 is *phase-indexed* — the slider directly drives `currentScrubFrac ∈ [0, 1]` and `renderAtFrac(frac)` reconstructs the geometry analytically from the phase machine. There is no frame buffer, so memory cost is constant and you can scrub past the end without losing history.

`drawStaticFrame()` is the single non-running renderer; it calls `renderAtFrac(currentScrubFrac)` and `drawForceViz()`. Mousemove during a nucleus drag explicitly calls `drawForceViz()` so the panel updates in real time even though `drawStaticFrame()` itself doesn't paint the panel.

### Key globals — physics + animation

```javascript
const PARTICLE_RADIUS    = 10;
const coulombStrength    = 150;     // distinct from v11/v12 (139) and v14 (400)
const NEUTRON_FRAC       = 0.20;
const PH1_END            = 0.30;
const PH2_END            = 0.375;
const ANIM_T_END         = 0.47;
const NORMAL_DURATION    = 5000;    // ms — fission playback length
const CHAIN_NORMAL_DURATION = 5000;
let   staticFissAngle    = 0;       // reset on NEW / Clear / Go; randomized at impact
let   dragRotY = 0, dragRotX = 0;   // drag accumulators; cleared on mouseup
let   wobbleMode;                   // 'dip1' / 'dip2' / 'dip3' / 'stable'
```

### What v13 does NOT have
- No Lab Journal, no `SideSim`, no `../v2/sheets-api.js`.
- No `particleHistory` ring buffer, no frame-indexed scrubbing — playback is phase-indexed.
- No v11/v12-style draggable resizable force panel — only the simpler fixed `#forceVizPanel`.
- No stability table / `NUCLEUS_TABLE` — fission dynamics, not a stability model.
- No `centerTracking` / cluster-following camera.
- No bar chart / energy graph.
- No themes wired to body classes the way v11 does (themes change CSS vars + body inline bg, but no `theme-teal` body class).

### Action log (v13)
`const actionLog = []` + `logAction(msg)` (25-entry circular buffer). Hooked into: tab switches, Go/Pause/Reset, nucleus selection (`selectNucleus`), view mode (particles/outline), forces on/off, electric field toggle, playback speed slider (400 ms debounce). Included in `getBugState()` as `actionLog` array. Bug report button (🐞) is a static `<a id="bugReportBtn">` in the toolbar theme row; click handler calls `getBugState()` and opens `dev/bug-report.html`.

## Action log — shared pattern (v11, v13, v14)

All three active sims share the same bug-report instrumentation pattern:

```javascript
const actionLog = [];
function logAction(msg) {
  actionLog.push(msg);
  if (actionLog.length > 25) actionLog.shift();
}
```

`getBugState()` includes `actionLog: actionLog.slice()` in its return value. The bug report button is a static `<a id="bugReportBtn">` in the toolbar's theme-button row (right side, after the color picker). Its click handler serializes `getBugState()` and opens `dev/bug-report.html?sim=vNN&sourceUrl=...&state=...`. The bug report form auto-populates the "Steps to reproduce" textarea from `parsedState.actionLog` if present.

Hooked events per sim:
- **v11**: tab switches, Go/Pause/Reset, `.particle-add-btn` clicks (proton/nucleus count), neutron slider (debounced), speed slider (debounced), `setForceModeActive` (force mode changes)
- **v13**: tab switches, Go/Pause/Reset, `selectNucleus`, particle/outline view mode, forces on/off, electric field toggle, playback speed slider (debounced)
- **v14**: tab switches (fusion/temp), Go/Pause/Reset on both tabs, combo selection (left/right particle wheel), electric/strong field toggles, separate-fields toggle, approach speed slider (debounced), thermostat slider (debounced), slow-motion slider (debounced)

## Gotchas

- All CSS and JS is inline in `index.html` — no external files except `sheets-api.js` and Google Fonts.
- Canvas is full-viewport (`inset: 0`); toolbar and scrubBar are fixed overlays.
- `particleHistory.shift()` drops old frames when buffer is full (4000 frames max); frame indices shift afterwards.
- v13 / v14's `switchTab()` stops the sim but does not itself reset `particleHistory` — `resetSim()` (called by place functions) clears it. **v11's `applyTab()` does call `resetSim()` directly** (since the fix for issues #34/#35), so playback state is cleared on tab switch in v11.
- v11's proton tab is Coulomb-only: `pairForce()` and `computeEnergy()` skip the strong-force branch when `currentTabIsProton` is true. `strongForceStrength` is not mutated on tab switch any more — it stays at `strongForceBaseline` (modulated by stability logic only on the nucleus tab).
- `SideSim` in v12 has its own local `running`, `loop`, etc. — they don't conflict with the main sim's globals.
- `hmCanvas`, `hmDataElec`, `hmDataStrong`, `hmImgElec`, `hmImgStrong` are shared between main sim and SideSim (not redirected); `ensureHmBuffers` resizes them as needed.
- `forcePanelEl.style.display` must be set to `'block'` (not `''`) — `''` reverts to the CSS `display: none`.
- `applyBiggestClusterStability()` runs every frame in the main loop; `findAllClusters()` inside it is O(n²).
- Field auto-off (v12): triggers when frame > 50ms AND `SideSim.isRunning()` — only fires during active Lab Journal card playback.
- v11's per-frame camera update in the live `loop()` only runs when `centerTracking` is on. The same call is mirrored inside `renderFrame()` so replay and time-slider scrubbing behave identically — without that mirror, replay would freeze the camera at the last live position regardless of the toggle.
- v11's per-particle labels (A–Z / numbers) only appear in **All Forces** mode (`arrowMode === 1`), single-particle selection (`!groupSelectMode`), on the proton tab any count or the nucleus tab with ≤10 protons. The fallback `+` on protons is preserved when label mode is off.
- v14's `step()` precomputes `const masses = new Float32Array(n)` before the substep loop — `p.physMass || 1` read once per particle, not per substep. `updatePhaseTimeline()` guards every `el.style` write with `!== newVal` to avoid layout thrash on each frame.
- v14's `#scrubBar` uses `display:none` inline on the HTML element (toggled by JS), while the CSS rule has `display:flex`. The inline style takes precedence; JS sets `scrubBar.style.display = 'flex'` / `'none'` to show/hide it. v13 uses a `.visible` CSS class instead.
