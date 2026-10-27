# TB-004: burning-trail simulation and diagnostic

TB-004 candidate for architect review on `codex/coding`, based on baseline `fddc7ce218695dad14b6015de4019e89d53a6255`. The first coherent checkpoint is `18545e940e3b6fe434950e165b0b39f414085614`; the final branch tip contains the follow-up verification and corrections as well. This delivers the coder-owned model/runtime and labelled stand-in workbench. Production art, production UI and final composition remain separate deliveries.

## Run and compose

Node.js >=22; no package installation required:

```sh
npm run check
npm run build
npm run serve -- --port 4550 --ttl 1800
```

Open `http://127.0.0.1:4550/workbenches/simulation/`. Fixture links select street, trail chase and barrel chain. `?scenario=chase&manual=1` disables automatic frames; click **Pour + powder + chase** then **Step 0.25 s** eight times to reproduce the early checkpoint. **Factory checks** runs six real-WebGL factory/update/dispose/blur-resume cycles plus rejected-factory and failed-view-update cleanup checks. The build is a labelled diagnostic static export, not the final game composition.

```js
import {createRuntime} from './src/runtime/index.js';
import {createArtScene} from './src/art/index.js'; // Artist delivery.
import {mountUI} from './src/ui/index.js';         // UI delivery.
const runtime = await createRuntime({
  root: document.querySelector('#viewport'),
  uiRoot: document.querySelector('#hud'),
  createArtScene, mountUI,
  scenario: 'street', seed: 1947
});
// Runtime supplies the single shared THREE namespace, scene, snapshots and timing.
// It owns the model, canvas, RAF, ResizeObserver, focus listeners and factories.
// Call runtime.dispose() before replacing the composition.
```

`createRuntime` does not import production art/UI. Without the factories it uses `src/runtime/diagnostics.js`. It also returns `dispatch`, `advance`, `snapshot`, `metrics`, `screenToWorld` and `zoom`; `autoStart:false` permits deterministic manual presentation. Renderer uses the architect's existing Three r180 pair through one re-export. No CDN, sibling checkout or donor runtime is required.

The complete small v1 snapshot is `workbenches/simulation/example-snapshot.json`; fixture definitions are in `workbenches/simulation/fixtures.json` and `src/simulation/fixtures.js`. `npm run fixtures` regenerates the JSON files from the authoritative model. Public entry point is `src/simulation/index.js` and has the assigned `{dispatch, advance, snapshot, dispose}` API.

## Time, commands and input

- Base tick is 1/60 s. `advance` accumulates rendering deltas; each call accepts at most 0.25 s (15 ticks) and records excess in `diagnostics.droppedRealSeconds`. Bounded hitches preserve matched-time replay; longer stalls intentionally drop time. Runtime focus/visibility loss clears held input, pauses and resets its frame timestamp, so a hidden tab cannot cause a large catch-up.
- Tick is an input-processing sequence and continues while paused; active/player/world clocks and drug expiry freeze. Commands queue for the next tick or explicit future `atTick`, ordered by tick then dispatch sequence. Reset clears pending old commands, resets fixture/seed/clocks, increments `diagnostics.generation`, and retains monotonic tick/event IDs across resets.
- Stick magnitude is clamped to one before projection. Inversion negates both raw components exactly once in `movementVector`, before camera projection. Keyboard uses the same raw-stick route. Aim is a world point and is never inverted; camera/menu controls are unaffected.
- Bear movement and player-generated heat/resource emission use player time. Powder scales player time by 1.5 and world time by 0.35; its eight-second duration and inversion's duration use active unscaled time. Reuse refreshes expiry and consumes one item without stacking magnitude. Taking any drug leaves selection, movement, pouring and held trigger intact.
- Other actors, Molotov flight, propagated heat/fire, fuel burning, environmental damage and diagnostic fire animation use world time. Presentation timing is derived from authoritative clocks, independent of rendering frequency. There are currently no RNG draws; seed is retained for deterministic fixture/reset compatibility.
- Pour toggles on a primary rising edge and stays active after release. It stops on another tool selection, empty gas, death, pause or cancellation/focus loss. Tool selection also releases the previous trigger while preserving active raw-stick movement. Stationary/blocked motion deposits nothing. The runtime clears input on focus loss; UI should still send its own safe cancellation on pointer loss.

Snapshot v1 fields are preserved. Extensions are `aim`, `projectiles`, `diagnostics`, `player.travelled`, `player.radius`, `player.usingTool`, `discharge`, and actor `travelled`/`speed` metadata. Snapshot arrays/objects are detached from the model. `world.obstacles` contains intact obstacles only; destruction emits stable object IDs. Events have monotonic numeric IDs, tick/type/world point and optional `tool`, `drug`, `objectId`, `cellId`, `cause`, `radius`, `reason`, `projectileId`, `active`, `paused` or `generation`. The event window is bounded to 256 entries; rendering must deduplicate IDs and reconstruct persistent fire from cells.

## Fuel, heat, collision and tuning

All defaults are in `src/simulation/config.js` and are prototype balance choices. Milestone defaults (3 m/s, powder 1.5/0.35, eight seconds, 35 HP healing, 100 max HP, 1 m tiles and 0.5 m fire cells) are retained. Additional explicit choices:

| Item | Prototype behavior/default |
| --- | --- |
| Jerry can | 4 L; 0.08 L per accepted metre. Exact line/grid intersections distribute the entire collision-resolved path, including diagonal moves and slides. Repeated visits consume and add the actual additional amount. |
| Matches | 12; one local heat pulse, 0.85 m reach, 0.3 m radius, 1.8 heat units. |
| Torch | 5 L; held local heat at 1.1 m reach/0.4 m radius, 9 heat units/player-second, 0.12 L/player-second. |
| Molotov | 4; world-time flight at 7 m/s, 6 m maximum target range. Its height-aware arc clears a low crate and hits a tall building front; first solid impact deposits 0.3 L within 0.9 m and supplies 2.2 heat units. An invalid/out-of-range throw consumes nothing. |
| Flamethrower | 6 L; held heat cone, 4.5 m range, 22.5-degree half-angle, 12 heat units/player-second, 0.3 L/player-second. Walls clip heat. This is new Tinderbox tuning, not donor lethal-cone damage. |
| Drugs | Powder 4, healing 3, inversion 3. Healing clamps to max HP and consumes one pill when useful; a full-health request consumes nothing. |
| Fire | Eight-neighbor local transfer from prior burning state, capped by edge travel deadlines at 4 m/world-second, plus finite heating/ignition thresholds. Grass/wood have finite surface fuel (0.32/1.2 fuel-equivalent L per square metre, configured centrally); gas burns on noncombustible paving. Cooling, finite fuel and spent phases are authoritative. |
| Drums | Radius 0.328 m, height 0.8 m; ignition heat 1.4; 2.5 m wall-protected blast with heat 2.8 and damage 50 with distance falloff. Remove-before-queue expansion prevents duplicate chain events/damage. Unlike the donor fuel blast, prototype walls protect damage and chains. |

Cell heat is a dimensionless gameplay quantity, not a thermodynamic temperature. Surface fuel is a fuel-equivalent amount; deposited fuel is litres. The fuel ledger separates fixture fuel, gas actually poured, Molotov fuel and burned/present deposited fuel. Combustion rates scale with cell area. New burning cells cannot propagate during the pass that ignites them, and each neighboring arrival waits its distance/front-speed deadline. Connected trails cannot flood-fill in a tick. Direct tool/impact/blast sources can heat their own defined footprint immediately; the propagation cap applies to spreading fire.

The QC follow-up increases movement to a radius-0.56 m disc exposed as `player.radius`, with exact swept clearance along <=0.04 m substeps, shared solid geometry and axis sliding; barrels use their visible circular radius. Building fronts block heat paths. Thin wood receives overlap-weighted cell fuel even below grid width, and burns out before its obstacle disappears. Wood can be ignited at its surface and become a subsequent heat source. This is a coarse flat-grid model, not CFD, wind, smoke simulation or full enemy AI. The sensitivity results and remaining coarse-grid limits are recorded below. No interiors, campaign, AP/turn economy or save storage is imported.

The held-tool `snapshot.discharge` extension supplies bounded world-space rays, torch lead and active state for production art to consume. See [the exact body/discharge contract and QC results](qc-body-discharge.md), including cosmetic muzzle clipping, corner trimming, 36 passing simulation tests and fresh packaged browser evidence. Production art/UI and root integration are outside that correction.

## Verification and evidence

The initial candidate passed all 23 Node tests, including matched 30/60/120 Hz and bounded-hitch replays, continuous gas conservation, collisions/sliding, edge-trigger pouring, powder while pouring, exact 180-degree inversion, expiry/pause, healing, interruption/death, finite propagation/burnout, barriers/chains, all five tools and snapshot/reset safety. `tools/check.mjs` also checks syntax/local imports, the example v1 snapshot, exact shared-engine provenance hashes and the single Three pair. There are 19 own scripts passing syntax and 17 statically reached modules, with exactly one Three module/core pair. The diagnostic static build passes. Additional tests cover a separate thin-wall blast/shielded-actor layout, sub-grid timber coverage and burnout, short-lived sources that cannot bridge a trail, height-aware Molotov impacts, world-time damage/burnout, empty tools, inversion refresh, malformed configuration and tool switching while moving.

Browser review in the Codex in-app Chromium surface at 1280x800 and 390x844 confirms the first chase checkpoint: after 2.02 active seconds / 0.72 world seconds the bear has travelled 9.00 m, deposited 0.720 L, remains pouring, and has a 9.50 m gap from the active front. Drinking inversion then advancing 0.25 active seconds reverses X travel by 1.125 m without stopping pouring. The manual-mode resize redraw defect found during portrait review was fixed. Factory page reports six successful real-WebGL create/update/dispose cycles, one shared r180 instance, scripted window-blur cancellation/pause, frozen clocks and safe resume, idempotent disposal, and cleanup after both a rejected factory and a failing initial view update. No error/warning console entries were reported. A second launch served only the generated `dist/` subtree: the complete chase checkpoint and factory tests passed there as well, with no source-root or donor HTTP access.

Direction/resolution check: a 4 m fire-front arrival took 1.0833 world seconds along the grid and 1.1167 seconds diagonally, at both 0.5 m and 0.25 m cell sizes. The observed direction spread is about 3.08%; the prototype test allows at most 25%. Fuel conservation and the travel-speed bound are checked during every measured step. These four cases do not establish general grid independence: narrow material boundaries, partially covered cells, isotropic eight-neighbor assumptions and spill footprints still have coarse-grid limitations.

Measured host: AMD Ryzen 7 5800X (8 cores/16 logical processors), NVIDIA GeForce RTX 3080, 63.9 GiB RAM; Codex in-app Chromium 155 on Windows, ANGLE/D3D11 using that GPU. Warm 240-frame-window measurements in the idle street fixture:

| Requested viewport | Actual canvas | Observed rate | Simulation CPU p95 | View/render CPU p95 | Resources |
| --- | --- | ---: | ---: | ---: | --- |
| 1280 x 800 | 940 x 710 | 60 Hz | 1.10 ms | 0.40 ms | 13 draws, 6 geometries, 0 textures |
| 390 x 844 | 375 x 363 | 60 Hz | 1.10 ms | 0.40 ms | 13 draws, 6 geometries, 0 textures |

These are stand-in scene CPU measurements, not GPU elapsed time, production-art budgets or physical-phone results. View/render timing includes the supplied art/UI factory updates and WebGL submission; the diagnostic `onSnapshot` DOM reporter runs afterward. Manual stepping reports its deliberate step cadence rather than real-time FPS. The portrait workbench scrolls; it is not the production HUD. The in-app browser's background tabs kept `document.hidden === false`; actual native app-switch visibility behavior was not established. The explicit browser blur event path was tested, and the visibility listener uses the same cancellation path.

Ignored local evidence under `artifacts/qa/`: `tb004-chase-desktop.jpg`, `tb004-chase-phone.jpg`, `tb004-factory-checks.jpg`, desktop/phone metrics text and the final check log. No finished bear or convincing final-fire art is claimed by the diagnostic capsules/cubes. Finished art/UI, combined gameplay review and fresh-player comprehension remain architect acceptance work.

## Helper retirement and restart

No task-owned helper remains running. The hidden loopback source preview (PID 65860, registration `a5a586c9eeff46f190f5411024d28dd7`, actual 30-minute self-expiry) stopped after its purpose ended. The separate packaged-build preview (PID 60852, registration `0cd2885be22143c492adc528e6878290`, actual five-minute self-expiry) also stopped through its private STOP file after verification. PID plus exact creation time and executable were revalidated; natural exit and port 4550 release were verified. Owned browser tabs were closed and temporary viewport overrides reset.

Local receipts/restart records are under `artifacts/helpers/tb004-preview-01/` and `artifacts/helpers/tb004-package-01/`. The packaged record includes 31 hash-verified nonsecret source/dependency files in a durable restart bundle, plus arguments, runtime, input/output and pending-review references. No publishing command is replayed automatically. To review again deliberately, run `npm run build`, then `npm run serve -- --root dist --port 4550 --ttl 1800`; use a fresh STOP path and register that new process lifetime under the user's helper policy. The scene URL above is currently offline because the verification server was retired.

## Reuse and boundaries

The only runtime donor dependency is the architect-imported, byte-preserved Three r180 pair and MIT notice. No additional donor code or art was copied in TB-004. Coder inventory is `vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/code.json`; it references `engine.json` and records the audited drum dimensions/remove-before-enqueue rule as references, with exact source hashes and the new Tinderbox adaptations. Artist/UI files and the architect's central provenance index are untouched. Production fire effects belong to the artist; the workbench's cubes and capsule are explicitly diagnostic stand-ins.
