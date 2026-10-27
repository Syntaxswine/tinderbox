# TB-005: burning-trail art candidate

The art factory and standalone workbench render a continuous deposited-fuel trail, heating, painted flame fronts, sustained fire, smoke, spent ground, a provisional bear with five equipment poses, and a small exterior kit. This is a prototype candidate for architect integration. The workbench uses labelled authored snapshots and does not validate gameplay.

Shared baseline: `fddc7ce218695dad14b6015de4019e89d53a6255`. Raw art is pinned to Farmyard `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`, with inherited AFT ancestry `a20b343a0234b5d8b365a4e1668961ca1bf37653`.

## Entry points and composition

- [Art factory](../../../src/art/index.js): async `createArtScene({THREE, scene, assetBaseUrl})`, returning `update(snapshot,timing)` and idempotent `dispose()`.
- [Workbench](../../../workbenches/art/index.html): seven labelled fixtures, five equipment views, pause/scrub controls, optional anchor guides, and full-canvas capture mode.
- [Import inventory](../../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/art.json): five unchanged PNGs, source/installed hashes, ancestry, rights status, and separate attributed adaptations.
- [Bear master record](../../../art/source/tinderbox/bear/prototype.json): original procedural source, nominal dimensions, and provisional status.
- [Review manifest](review.json): source/evidence fingerprints, actual browser checks, resource counts, and measured host information.

```js
import {createArtScene, ART_ASSET_ROOT} from './src/art/index.js';
const art = await createArtScene({THREE, scene});
art.update(snapshot, {
  alpha: 0, playerDelta: 0, worldDelta: 0,
  playerTime: snapshot.clocks.player, worldTime: snapshot.clocks.world
});
// Before replacing the scene:
art.dispose();
```

`THREE` is injected throughout; production art imports no second renderer. The optional `assetBaseUrl` is a directory URL for the AFT **assets** root, not the repository root. Its default, exported as `ART_ASSET_ROOT`, resolves to the versioned vendor directory inside Tinderbox. Normal composition can omit it. Failed texture loads reject the factory and dispose successfully loaded textures.

The caller owns camera, renderer, resize, input, and scene background. When the scene already contains a light, the factory retains caller lighting; otherwise it adds its own hemisphere/key lights. Its limited fire lights remain owned by the art module. Shadow rendering is optional and configured by the caller. Removing the art never disposes the caller's scene, renderer, or lights.

## Snapshot and clock handling

Ground `(x,y)` becomes Three `(x,h,y)`. Headings are radians from +X toward ground +Y. Tiles and obstacle/cell positions are interpreted as centres. The view reads v1 snapshots without modifying them. It uses `timing.playerTime/worldTime`, falling back to the matching snapshot clocks; it does not advance its own gameplay clock or extrapolate movement.

Bear gait, neighbor gait, and pouring details use the appropriate player/world domains. Environmental atlas phases, smoke drift/fade, and bursts use world time. Powder never changes the snapshot, fire spread, damage, resources, or input here. The powder fixture demonstrates animation domains only.

Gas appears only where supplied cells contain positive deposited fuel. Connected neighboring cells share a masked stroke, including bends; absent/dry cells remain absent. Heating changes the ground treatment. Only positive-intensity `burning` cells emit sustained flame. `spent` cells become char; an observed burn-to-spent transition leaves a 3.2-world-second smoke tail. Cells first seen already spent do not start a new smoke effect.

Explosions consume resolved `explosion`, `barrel-explosion`, `barrel-exploded`, or `molotov-impact` events once per ID. Numeric monotonic IDs retain a high-water cursor; the bounded receipt set handles the recent stream. On mount/reset, undated startup history establishes the cursor without replaying bursts. Optional `event.worldTime` permits an explicitly dated, still-current initial burst. A world-clock rewind or decreasing tick resets presentation history. The view never removes a drum because of particles: obstacles disappear only when removed/marked destroyed in the snapshot.

The module also understands the coder's optional `player.usingTool` and root `projectiles` fields. Active torch/flamethrower use adds a short local muzzle plume. Projectiles use supplied `x,y,h,progress`; the view does not solve their trajectory. Missing optional fields produce no firing/projectile effect. The base factory remains compatible with the stable v1 fields.

## Bear and exterior scope

The original bear prototype has rounded ears, a short tan muzzle, umber fur, green canvas overalls, cream sleeves, broad paws/boots, and simple equipment poses. It is about 2.02 m high with a 1.06 m shoulder silhouette. These are prototype art dimensions, not a new simulation collision rule or finished character approval.

`art.anchors` exposes read-only named Object3D references: `grip`, `support`, `muzzle`, `spout`, and `backpack`. After `update`, use `getWorldPosition()` for their current world positions. Grip/support follow the selected pose. Muzzle applies to matches, bottle wick, torch, and lance; spout applies to the jerry can. Unused tool anchors are not promises of a visible item. Neutral forward is +X; the equipment is placed on the camera-near side for readability.

The exterior builder supports grass/yard, paving, asphalt/road, wood, plaster building fronts, fences, crates, and drums. Tiles/solids come from the snapshot. The label/material/geometry recipe is compact Tinderbox code using the two inherited cargo atlases; it does not import donor campaigns, mission art, or the full cargo renderer. Drum body dimensions follow the supplied obstacle width/depth/height; the fixture uses 0.656 m diameter and 0.8 m height. Small bands/bungs are cosmetic detail. Neighbor actors are labelled provisional geometry, not a new character suite.

Raw imported images: flame, smoke, tank-burst, material-atlas-v2, and cargo-materials-v1 (9,038,991 bytes total). Their bytes are preserved. Crop textures, body paint grain, and the hazard label are generated at runtime and owned/disposed by the module. New geometry masters live in source; no fabricated layered raster master or finished bear export is claimed. The Three.js MIT notice remains in the shared engine partition. Upstream illustrated-art rights remain explicitly unresolved in the artist inventory.

## Checks and visual evidence

Run from the art worktree:

```sh
node workbenches/art/check-art.mjs
node workbenches/art/server.mjs --port 4551 --ttl 3600
```

Open [the labelled workbench](http://127.0.0.1:4551/workbenches/art/). Add `?capture=1` for a field-only canvas; fixture labels remain visible. The default stop marker is `artifacts/art-preview/STOP`; a run using a custom `--state` has its marker inside that directory. The server is read-only, binds localhost, and has an actual one-hour shutdown timer. Register any retained process lifetime with the user's helper utility; the source command alone is not registration.

The browser runner uses an installed Chrome by default, with an optional `--channel msedge`. It needs Playwright available through normal module resolution or `--playwright <absolute-path-to-playwright/index.mjs>`:

```sh
node workbenches/art/review.mjs --playwright <path-to-playwright/index.mjs> --out artifacts/art-review/recheck
```

The completed run passed five raw import/hash checks and 13 source syntax/dependency checks. Browser assertions passed for immutable snapshots, exactly-once receipts, startup-history suppression/fresh-event playback, separate clocks, a dry gap with no inferred gas, finite anchors for all five tools, viewport control bounds, repeated world/actor rebuilds, and double disposal. The eight rebuild samples remained bounded; after disposal the renderer reported **0 geometries and 0 textures**.

Paused-pixel comparison runs after three fixed-clock warm-up renders. Equality before that warm-up is not claimed. The browser run had no page errors, console errors, or failed requests.

The run captured 28 images: 22 workbench/tool views and six field-only views. Full-canvas views are exactly 390 x 844 and 1280 x 800, at offset `(10,14,12)` and 13 m vertical span. The bear close-up retains the angle with a labelled 5.8 m span. Normal workbench canvases are 390 x 600 and 1022 x 638 inside their labelled viewport layouts. Source and image SHA-256 values are in `review.json`; raw screenshots/session receipts remain in ignored `artifacts/`.

Visual inspection covered cold gas/dry gap, the front, burn-at-the-bear edge, spent ground/smoke, powder-domain motion, a resolved burst, and all five equipped silhouettes. Representative final captures:

- [Full desktop front](../../../artifacts/art-review/final/front-field-1280x800.png)
- [Full phone front](../../../artifacts/art-review/final/front-field-390x844.png)
- [Phone burn/readability](../../../artifacts/art-review/final/burn-field-390x844.png)
- [Phone bear/muzzle](../../../artifacts/art-review/final/bear-field-390x844.png)
- [Interactive workbench desktop](../../../artifacts/art-review/final/front-1280x800.png)

Host evidence is Headless Chrome 155, WebGL 2, ANGLE/D3D11 on the reported NVIDIA GeForce RTX 3080. The last 90-frame sample measured approximately 0.80 ms mean and 1.10 ms p95 for synchronous fixture/update/render CPU submission. This is not GPU-completion timing, integrated simulation timing, or physical-phone performance. The exact values and scope are retained in the review manifest.

## Integration limits

- The art workbench consumes authored fixtures. Combined TB-004/TB-006 gameplay, normal/powder chase correctness, damage, inversion, finite-resource accounting, and fresh-player comprehension remain architect acceptance work.
- Reconcile the bear's broad 1.06 m shoulder silhouette with the coder's current 0.23 m movement-disc radius before accepting tight wall clearances. This art module does not change collision. No complete character animation suite is included.
- The snapshot does not supply a resolved discharge-cone mesh. Current active-tool art is a short muzzle plume; distant burning is shown by authoritative cells. A full clipped lance-to-impact jet needs an explicit coder-owned presentation shape rather than a second artist-owned range/obstruction rule.
- Fields accept at most 65,536 cells. Fire has an 8,192-card flame budget (two per burning cell), 4,096 smoke cards, and bounded bursts. Over-budget flame presentation reports `diagnostics().fire.capped`. Very dense transparent sheets can still flatten/overlap; they are painterly sprites with depth testing, not a fluid simulation.
- Main draw order, opaque occlusion, and a small visual opacity reduction near the bear protect readability without changing state. There is no separate fog-of-war input in v1.
- Asset-rights status remains unresolved. No donor candidate branch, hosting configuration, UI skin, or full game is imported by this task.

All disposable browser sessions close in `finally`. The registered preview is stopped before final handoff and its released port is checked; restart records and receipts remain under ignored `artifacts/art-preview/`.
