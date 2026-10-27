# TB-005: burning-trail mechanics-test art

This candidate renders fuel trails, heating, flame fronts, sustained fire, smoke, spent ground, a provisional bear/exterior, and the coder's resolved held discharge. The user accepts the scene as an opening mechanics test. Its visual direction is not approved: the next art pass must use actual Farmyard assets as its direct foundation. Matching the style or importing a handful of atlases is insufficient.

The bounded QC correction follows art checkpoint `b3c7c009706dc48a10cd97951df36f79a4d5fb21` and the discharge contract at coder commit `11b8cd05c0ca885f277d048c1825d0e52c0a367c`. Shared baseline: `fddc7ce218695dad14b6015de4019e89d53a6255`. Farmyard source remains pinned to `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`, with inherited AFT ancestry `a20b343a0234b5d8b365a4e1668961ca1bf37653`.

## Entry points

- [Art factory](../../../src/art/index.js): async `createArtScene({THREE, scene, assetBaseUrl})`, returning `update(snapshot,timing)`, named anchors, diagnostics, and idempotent `dispose()`.
- [Resolved discharge renderer](../../../src/art/discharge.js): bounded consumer of `snapshot.discharge` v1.
- [Workbench](../../../workbenches/art/index.html): thirteen labelled fixtures, five tool views, pause/scrub controls, anchor guides, and field-only capture mode.
- [Import inventory](../../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/art.json): unchanged source images and separately attributed adaptations.
- [Bear master record](../../../art/source/tinderbox/bear/prototype.json), [review fingerprints](review.json), and [QC details](qc-clearance.md).

```js
import {createArtScene} from './src/art/index.js';
const art = await createArtScene({THREE, scene});
art.update(snapshot, {
  playerTime: snapshot.clocks.player,
  worldTime: snapshot.clocks.world
});
// Before replacing the scene:
art.dispose();
```

The shared `THREE` instance is injected. The caller owns camera, renderer, resizing, input, and background. The factory respects existing caller lighting, otherwise adding its own hemisphere/key lights; fire lights remain art-owned. Failed texture loads dispose successfully loaded resources. `assetBaseUrl`, when supplied, is the directory URL of the versioned AFT **assets** root; its default is exported as `ART_ASSET_ROOT`.

## Snapshot and clocks

Ground `(x,y)` maps to Three `(x,h,y)`; headings run from +X toward ground +Y. Positions are centres. The view never modifies snapshots or advances gameplay. It uses supplied player/world times, falling back to the corresponding snapshot clocks. Bear gait and pouring use player time; neighbors, environmental fire, discharge, smoke and bursts use world time. Fixed clocks freeze animation.

Positive deposited fuel produces the ground trail. Adjacent supplied cells join visibly; absent/dry cells stay absent. Heating changes ground treatment, positive-intensity burning cells emit sustained flame, and spent cells become char. An observed burn-to-spent transition leaves a 3.2-world-second smoke tail; cells first seen spent do not create a fresh effect.

Resolved explosion/molotov events play once per ID. A bounded receipt set and numeric high-water cursor prevent replay. Undated startup history establishes the cursor without emitting bursts; explicitly dated current events can play on mount. Rewinding world time or tick resets presentation history. Obstacle destruction and projectile trajectories come from snapshots.

The footprint ring and escape arrow follow positive finite `player.radius`; older snapshots fall back to 0.56 m. Scaling reuses their geometry. Art does not choose a collision radius.

Held fire consumes only `snapshot.discharge.version === 1` with an active torch/flamethrower. Supplied ordered endpoints define the permitted fan; instanced painted plumes are fragment-clipped to it. `connectRays:false` produces independent vertical ray strips with no fan or billboard fill. Torch also renders its explicit `lead`. Art does not query obstacles, recompute range, move the shape to the cosmetic nozzle, or apply heat/damage. Missing/inactive discharge produces no held jet, even if `player.usingTool` remains true. Full details and conservative handheld hiding are in the QC note.

## Current art and reuse

The original procedural bear remains provisional: approximately 2.02 m high, with a 1.06 m shoulder silhouette, five poses and a small gait. `art.anchors` exposes `grip`, `support`, `muzzle`, `spout`, and `backpack`; call `getWorldPosition()` after updating. Neutral forward is +X, with equipment on the camera-near side. The stationary lance muzzle stays 1.07 m forward, 0.29 m sideways and 1.05 m high. The correction does not change its dimensions or anchor offsets.

The exterior supports supplied tiles, buildings, fences, crates and drums through compact provisional builders. Drum body dimensions follow obstacle dimensions. Neighbors remain provisional geometry. This is not a finished character or environment suite.

Five raw images are reused unchanged: flame, smoke, tank-burst, material-atlas-v2, and cargo-materials-v1, totaling 9,038,991 bytes. The QC correction adds no raster imports. Runtime crops, paint grain and hazard labels are generated and disposed by the module. The shared Three.js MIT notice is preserved. Illustrated-art rights remain unresolved in provenance. The next visual pass still needs broader direct Farmyard reuse.

## Verification and evidence

Run from the art worktree:

```sh
node workbenches/art/check-art.mjs
node workbenches/art/server.mjs --port 4551 --ttl 3600
node workbenches/art/review.mjs --playwright <path-to-playwright/index.mjs> --out artifacts/art-review/recheck
```

The [workbench URL](http://127.0.0.1:4551/workbenches/art/) supports `?capture=1`. The read-only server binds localhost and has an actual one-hour expiry. Its default stop marker is `artifacts/art-preview/STOP`; custom `--state` puts it there. Every retained process lifetime needs fresh registration with the user's helper utility. The browser runner defaults to installed Chrome and closes in `finally`.

Five raw import checks and fourteen source syntax/dependency checks pass. Browser assertions cover immutable data, receipt handling, frozen pixels after three fixed-clock warm-up renders, separate clocks, dry gaps, five tool anchors, footprint resizing, supplied fan reach, clipped plumes, independent rays, torch lead, inactive discharge, repeated rebuilds and double disposal. Disposal reports **0 geometries / 0 textures**; no page/console errors or failed requests occurred.

A separate consumer smoke passed eight serialized snapshots from the exact final coder checkout: free flame, masonry wall, thin wood, narrow corner, clipped torch, complex independent-ray fallback, rotated aim, and pause. No cross-checkout dependency is installed. Combined gameplay and final production-scene acceptance remain architect-owned.

The completed run captured 52 images at 1280 x 800 and 390 x 844, including 18 field-only captures. Source and image hashes, GPU probe values, actual-model smoke references and hardware information are recorded in `review.json`. Raw evidence stays under ignored `artifacts/`.

- [Desktop resolved jet](../../../artifacts/art-review/qc-discharge/jet-field-1280x800.png)
- [Phone resolved jet](../../../artifacts/art-review/qc-discharge/jet-field-390x844.png)
- [Near-wall clipped plume](../../../artifacts/art-review/qc-discharge/jet-near-wall-field-1280x800.png)
- [Phone corner clearance](../../../artifacts/art-review/qc-discharge/corner-field-390x844.png)
- [Phone torch](../../../artifacts/art-review/qc-discharge/torch-field-390x844.png)

Host: Headless Chrome 155 / WebGL 2 / ANGLE D3D11 / NVIDIA RTX 3080. The 90-frame fixture sample measured about 0.80 ms mean and 1.10 ms p95 for synchronous update/render CPU submission. This is not GPU completion, integrated simulation timing, or physical-phone performance.

## Limits and lifecycle

The mechanics-test visual direction remains provisional. Physical mobile-device testing and fresh-player comprehension are outstanding. Dense transparent sprites can still overlap; the effect is painted presentation. Discharge allocates at most 256 rays, 18,000 vertices, 52,000 indices and 128 plume cards in two owned geometries, two materials and one data texture. Ground accepts at most 65,536 cells; sustained fire uses existing bounded card budgets. Whole handheld hiding is conservative rather than per-mesh weapon clipping.

The architect owns combined gameplay checks and promotion. This correction edits no root composition/build, coder/UI files, donor source or integration branch. Disposable browsers close after verification. The preview is stopped before handoff, with exact process identity and released port checked; restart records and cleanup receipts remain under ignored `artifacts/art-preview/`.
