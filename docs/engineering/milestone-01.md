# TB-004: burning-trail simulation and diagnostic

Checkpoint candidate on `codex/coding`, based on architect baseline `fddc7ce218695dad14b6015de4019e89d53a6255`. This is the coder-owned model/runtime and a labelled stand-in workbench. Production art, production UI and final composition remain separate deliveries. This document will be finalized with the completed verification results before handoff.

## Run and compose

Node.js >=22; no package installation required:

```sh
npm run check
npm run build
npm run serve -- --port 4550 --ttl 1800
```

Open `http://127.0.0.1:4550/workbenches/simulation/`. Fixture links select street, trail chase and barrel chain. `?scenario=chase&manual=1` disables automatic frames; click **Pour + powder + chase** then **Step 0.25 s** eight times to reproduce the early checkpoint. **Factory checks** runs six real-WebGL factory/update/dispose cycles and a rejected async-factory cleanup check. The build is a labelled diagnostic static export, not the final game composition.

```js
import {createRuntime} from './src/runtime/index.js';
import {createArtScene} from './src/art/index.js'; // Artist delivery.
import {mountUI} from './src/ui/index.js';         // UI delivery.
const runtime = await createRuntime({
  root: document.querySelector('#viewport'),
  uiRoot: document.querySelector('#hud'),
  createArtScene, mountUI,
  assetBaseUrl: new URL('./', location.href),
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
- Pour toggles on a primary rising edge and stays active after release. It stops on another tool selection, empty gas, death, pause or cancellation/focus loss. Stationary/blocked motion deposits nothing. The runtime clears input on focus loss; UI should still send its own safe cancellation on pointer loss.

Snapshot v1 fields are preserved. Extensions are `aim`, `projectiles`, `diagnostics`, `player.travelled`, `player.usingTool`, and actor `travelled`/`speed` metadata. Snapshot arrays/objects are detached from the model. `world.obstacles` contains intact obstacles only; destruction emits stable object IDs. Events have monotonic numeric IDs, tick/type/world point and optional `tool`, `drug`, `objectId`, `cellId`, `cause`, `radius`, `reason`, `projectileId`, `active`, `paused` or `generation`. The event window is bounded to 256 entries; rendering must deduplicate IDs and reconstruct persistent fire from cells.

## Fuel, heat, collision and tuning

All defaults are in `src/simulation/config.js` and are prototype balance choices. Milestone defaults (3 m/s, powder 1.5/0.35, eight seconds, 35 HP healing, 100 max HP, 1 m tiles and 0.5 m fire cells) are retained. Additional explicit choices:

| Item | Prototype behavior/default |
| --- | --- |
| Jerry can | 4 L; 0.08 L per accepted metre. Exact line/grid intersections distribute the entire collision-resolved path, including diagonal moves and slides. Repeated visits consume and add the actual additional amount. |
| Matches | 12; one local heat pulse, 0.85 m reach, 0.3 m radius, 1.8 heat units. |
| Torch | 5 L; held local heat at 1.1 m reach/0.4 m radius, 9 heat units/player-second, 0.12 L/player-second. |
| Molotov | 4; world-time flight at 7 m/s, 6 m maximum target range. First solid impact deposits 0.3 L within 0.9 m and supplies 2.2 heat units. An invalid/out-of-range throw consumes nothing. |
| Flamethrower | 6 L; held heat cone, 4.5 m range, 22.5-degree half-angle, 12 heat units/player-second, 0.3 L/player-second. Walls clip heat. This is new Tinderbox tuning, not donor lethal-cone damage. |
| Drugs | Powder 4, healing 3, inversion 3. Healing clamps to max HP and consumes one pill when useful; a full-health request consumes nothing. |
| Fire | Eight-neighbor local transfer from prior burning state, capped by edge travel deadlines at 4 m/world-second, plus finite heating/ignition thresholds. Grass/wood have finite surface fuel; gas burns on noncombustible paving. Cooling, finite fuel and spent phases are authoritative. |
| Drums | Radius 0.328 m, height 0.8 m; ignition heat 1.4; 2.5 m wall-protected blast with heat 2.8 and damage 50 with distance falloff. Remove-before-queue expansion prevents duplicate chain events/damage. Unlike the donor fuel blast, prototype walls protect damage and chains. |

Cell heat is a dimensionless gameplay quantity, not a thermodynamic temperature. Surface fuel is a fuel-equivalent amount; deposited fuel is litres. The fuel ledger separates fixture fuel, gas actually poured, Molotov fuel and burned/present deposited fuel. Combustion rates scale with cell area. New burning cells cannot propagate during the pass that ignites them, and each neighboring arrival waits its distance/front-speed deadline. Connected trails cannot flood-fill in a tick. Direct tool/impact/blast sources can heat their own defined footprint immediately; the propagation cap applies to spreading fire.

Movement uses a radius-0.23 m disc, <=0.04 m substeps, shared solid geometry and axis sliding; barrels use their visible circular radius. Building fronts block heat paths. Thin wood receives overlap-weighted cell fuel even below grid width, and burns out before its obstacle disappears. Wood can be ignited at its surface and become a subsequent heat source. This is a coarse flat-grid model, not CFD, wind, smoke simulation or full enemy AI. Fine barriers and diagonal/resolution effects need the final sensitivity report. No interiors, campaign, AP/turn economy or save storage is imported.

## Checkpoint evidence

The initial 13 Node tests pass, including matched 30/60/120 Hz and bounded-hitch replays, continuous gas conservation, collisions/sliding, edge-trigger pouring, powder while pouring, exact 180-degree inversion, expiry/pause, healing, interruption/death, finite propagation/burnout, barriers/chains, all five tools and snapshot/reset safety. `tools/check.mjs` also checks syntax/local imports, the example v1 snapshot, exact shared-engine provenance hashes and the single Three pair. Diagnostic static build passes.

Browser review in the Codex in-app Chromium surface at 1280x800 and 390x844 confirms the first chase checkpoint: after 2.02 active seconds / 0.72 world seconds the bear has travelled 9.00 m, deposited 0.720 L, remains pouring, and has a 9.50 m gap from the active front. Drinking inversion then advancing 0.25 active seconds reverses X travel by 1.125 m without stopping pouring. The manual-mode resize redraw defect found during portrait review was fixed. Factory page reports six successful real-WebGL create/update/dispose cycles, one shared r180 instance, idempotent disposal, and cleanup after a rejected factory. No error/warning console entries were reported on that page.

Screenshots and helper identity/restart records are local ignored `artifacts/` evidence. The preview uses loopback only, a private STOP file and actual 30-minute automatic expiry; its PID/creation identity is registered with the required helper-lifecycle utility. It will be stopped and its port verified released at final handoff. Physical-device performance, finished art/UI, combined gameplay review and fresh-player comprehension are not established by this diagnostic checkpoint.

## Reuse and boundaries

The only runtime donor dependency is the architect-imported, byte-preserved Three r180 pair and MIT notice. No additional donor code or art was copied in TB-004. Coder inventory is `vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/code.json`; it references `engine.json` and records the audited drum dimensions/remove-before-enqueue rule as references, with exact source hashes and the new Tinderbox adaptations. Artist/UI files and the architect's central provenance index are untouched. Production fire effects belong to the artist; the workbench's cubes and capsule are explicitly diagnostic stand-ins.
