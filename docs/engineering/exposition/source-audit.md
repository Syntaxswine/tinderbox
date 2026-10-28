# TB-008 source audit and coder handoff

Based on clean `codex/coding` normally advanced to reviewed master `420266af6b92a4925164cdceda4ef43beb2d6a40`. This delivers the bounded coder contract/scenario/civilian wrapper, not final facade/roof art or production default selection. See [exact shared API](contract.md) and the [subsequent direct-builder correction](reuse-correction.md). Only this coding worktree was changed; the donor and primary checkout were read-only.

## Source and extraction

Farmyard pin: `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`; inherited AFT: `a20b343a0234b5d8b365a4e1668961ca1bf37653`. Prefix `T` below means `sites/tactical-animal/dist/aft/tactics/`. All inspection used `git show PIN:path`, not moving working-tree bytes or newer donor branches. [source-inventory.json](source-inventory.json) records exact paths, uncompressed byte counts, SHA-256 values, full static closures and model part/bounds evidence for 103 unique files. All 103 match the inherited AFT manifest. It is an inspection inventory, not a runtime import list; `provenance/city.json` is the import authority.

| Source factory / recipe | Verified role and boundary |
| --- | --- |
| `T/hybrid-geometry.js::roomBoxes({doorClosed,roof})` | Pure 1,644-byte room/door/window/flat-roof box recipe. Authored wall height 2 m, wall thickness .16 m, doorway 1 m wide/1.65 m high, leaf .12 m thick. The provisional Tinderbox bear cannot fit these unchanged native door dimensions. |
| `T/hybrid-world.js::buildWorld(map)` and `DIMENSIONS` | Splits door edges into a lintel plus optional closed leaf; windows into sill/lintel. Logical ground `(x,y)`, render `(x,h,y)`. Imports map/terrain/foliage/game dependencies; do not adopt as the city runtime. |
| `T/hybrid-room-art.js::createRoomArt(renderer,onReady)` / `ROOM_SURFACES` | Box geometry, separate facade/cap materials and physical texture periods; a renderer is required. It imports `hybrid-world`, so unchanged extraction is 45 non-Three JS modules / 3,049,716 bytes before textures. |
| `T/hybrid-materials.js::{surfaceUV,materialKind}` | World-axis UV recipe; 2-module unchanged closure including `diagonal-roads.js`, 5,873 bytes. Surface period is physical metres, independent of panel dimensions. |
| `T/climbable-roofs.js::{ROOF_KINDS,parapetEdges,roofVisualKind}` | Existing forms are corrugated flat, corrugated single-slope and flat parapet, plus gap/legacy climbable variants. Definitions have 3-module / 6,193-byte closure. No gable/hip claim is made for these factories. |
| `T/environment-visuals.js::environmentVisuals(world,map)` | Renders corrugated roof wedge/sheet/eaves and original source slab conventions. Whole composition is not the bounded new roof adapter. |
| `T/painted-environment-scene.js::{softBox,createPaintedEnvironment}` | Beveled box helper and a hardcoded wall/door/cargo study, not a parameterized general building kit. Existing atlas already belongs to the art inventory. |

The compiler calls the unchanged original `roomBoxes` builder. Its placement/composition adapter repeats returned native wall, pier, lintel and closed-leaf templates without resizing, with source hashes in city.json. It imports no 45-module room/battle/editor composition. Artist owns the new gable/hip meshes and material slots, consuming those same dimensions/parts. The later user compatibility requirement supersedes the former 1.4 x2.3m enlargement: native openings remain 1 x1.65m, walls 2m high/.16m thick, with floor origins 2.12m apart. Elevated roof/lintel geometry is not a full projected ground blocker. Closed leaves are physical and must look closed; no door animation or interiors were introduced.

## Normal animal factories and identity

`T/animal-motion-catalog.js` lists the following exact factory paths. It is audited as evidence, not imported wholesale:

| Species | Factory | Model JSON |
| --- | --- | --- |
| horse | `horse-light-model.js::createLightHorse` | `horse-10k-data.json` |
| goat | `goat-worker.js::createGoatWorker` | `goat-10k-data.json` |
| bull | `bull-worker.js::createBullWorker` | `bull-10k-data.json` |
| cow | `cow-worker.js::createCowWorker` | `cow-10k-data.json` |
| donkey | `donkey-worker.js::createDonkeyWorker` | `donkey-10k-data.json` |
| sheep | `sheep-worker.js::createSheepWorker` | `sheep-10k-data.json` |
| skunk | `skunk-worker.js::createSkunkWorker` | `skunk-10k-data.json` |
| pig foreman | `pig-foreman.js::createPigForeman` | `pig-foreman-10k-data.json` |
| pig director | `pig-director.js::createPigDirector` | `pig-director-10k-data.json` |
| rabbit | `rabbit-worker.js::createRabbitWorker` | `rabbit-10k-data.json` |
| dog | `dog-guard.js::createDogWorker` | `dog-guard-10k-data.json` |
| hen | `hen-worker.js::createHen` | `hen-10k-data.json` |

The normal outfit branch is `T/animal-motion-paint.js::createAnimalPaint(renderer,worker,profile,loader,'normal',sceneLighting)`. It includes optional species layers and statically imports Red Hat uniform/tailored modules, so the first extraction calls `horse-model-paint.js::createModelPaint` directly for horse/goat. Other species need their own neck/cloth/eyes/tail/underlay layers from that selector before reuse; no placeholder reskins of horse/goat establish those identities.

`T/red-hat-model.js::createRedHatCap` fits the pig foreman's `skull service cap crown band and visor` mesh to other species. `animal-motion-paint` adds red uniform/tailored paint for outfit `red-hats`, except pig foreman's base identity. Consequently normal outfit alone is insufficient for pig foreman. The first civilian allowlist is only horse/goat, with explicit normal appearance, civilian team and no headgear/equipment. No Red Hat factory, cap, uniform or tailored paint is imported; no red hats are recolored. Normal red scarves/fur colors are not headgear or team identity.

The selected raw JS closure is exactly 12 files: `clothing-weights.js`, `dog-motion.js`, `goat-worker.js`, `hen-motion.js`, `horse-graphic-paint.js`, `horse-grip-hand-data.js`, `horse-grip-hand.js`, `horse-light-model.js`, `horse-model-paint.js`, `horse-rifle.js`, `roof-mantle-equipment.js`, `worker-locomotion.js`. Dog/hen motion are static support dependencies, not additional population models. The raw horse rig allocates a default rifle and grip helpers; the wrapper keeps them invisible and maps every carry pose to neutral. It additionally disposes the donor skeleton, which the raw rig disposer does not release. No combat, AP, faction, targeting, selection or donor persistence is imported.

`worker-locomotion` stores bind-space world positions and normally forces an equipment carry pose. The adapter solves detached from its translated world root, then restores that root, preventing unreachable-foot errors away from (0,0). It uses accepted actor distance for gait and one radians-to-degrees heading conversion. Actor movement remains model-owned world time, including powder slowdown. Sampled 48-phase conservative local ground bounds are below .567 m (horse) and .561 m (goat); .62 m radii include margin, with 1.7 m height envelopes. Source rest meshes are approximately 1.65 m tall. Skunk/hen/pig director have different silhouettes/bounds and must not inherit these radii.

## Imported bytes and skins

There are **20 new byte-preserved files / 13,342,315 bytes** in `vendor/farmyard-commando/<pin>/...`, covered by the single coder-owned `provenance/city.json`:

| Selection | Bytes |
| --- | ---: |
| 12 civilian JS support modules | 146,485 |
| Original wall/room box builder | 1,644 |
| Horse/goat model JSONs | 830,053 |
| Horse/goat normal model-paint PNGs | 3,213,161 |
| `assets/environment/hybrid-surfaces/brick-factory-v1.png` | 3,084,552 |
| `assets/environment/hybrid-surfaces/wood-factory-v2.png` | 2,757,790 |
| `assets/environment/ground-concrete.png` | 3,308,630 |

Texture paths in this table are relative to donor `dist/aft/`. Normal paint files are `assets/characters/lowpoly-proof/{horse-worker,goat-worker}-model-paint-v1.png`. The civilian closure alone is 4,189,699 additional raw bytes; the three specifically requested wall textures add 9,150,972. No metal/grass/whole-room texture bulk import was made. Shared Three stays in engine.json; the four previous inventories and all their bytes remain unchanged. The code check now validates city.json too. Reproduction: `node tools/import-city.mjs --source PATH_TO_READ_ONLY_DONOR` reads only the pinned Git objects, validates inherited hashes and refuses changed installed bytes.

Slots `facade/trim/door/roof` carry stable skin IDs separately from physical `wood/masonry/steel`. Artist can replace the placeholder surface bindings with future custom skins while retaining metre texture density, geometry, collision and ignition. The new fixture tags frontage with `EXPO-P01:scan31`, `EXPO-P02:plate43`, `game:frontage-fragment`; gable/hip examples with `EXPO-P02:plate53`, `EXPO-P02:plate97`, `game:roof-primitive-adaptation`. Those source identities come from the architect's research registry. Bay layout, roof forms and placements are game adaptations; wall/door dimensions and floor spacing retain the donor scale; no Horticulture dome, exact fair geography or historic measurement is claimed. Original-plan/photo assessment and finished source comparison belong to the artist/architect dossier.

Raw game/art licensing is not declared in the inspected source; retain that unresolved status rather than treating a provenance hash as a rights grant. Three's existing MIT notice remains intact. No source image or modern reconstruction was downloaded into this code delivery.

## Verification and limitations

- `npm run check`: **53/53 Node checks**, 57 own-script syntax checks, 65 resolved static modules, exactly one shared Three pair, all five import inventories, and existing art/UI checks pass. Ten new content checks cover real open/closed/rotated openings, edge clearance, roof non-collision, skin/physics invariance, invalid schemas, real horse/goat identity/motion/bounds, translated gait, required renderer failures, world-time powder, matched 30/60/120 Hz and bounded-hitch replays, and per-part wood burnout/support liveness.
- `npm run build`: 73 packaged files /25,288,032 bytes. `node tools/check-site.mjs http://127.0.0.1:4550/dist/`: **71 hosted file hashes/MIME types pass**, with the private workbench absent from the public package. Root/default production scene is unchanged.
- Actual WebGL diagnostic reviewed at 1280x800 and 390x844. Horse/goat use source meshes/normal paint, 10,300/9,994 body triangles, no hats/guns. Bear crosses open gate from y12 to y7.8 (4.200 m /0.336 L poured), then stops at closed leaf at y5.625. A subsequent one-second powder step adds .280 m NPC travel, advances player/world clocks by1.5/.35, and preserves Pour. Fresh corrected browser session has no warnings/errors, one canvas and no horizontal portrait overflow.
- Six two-species instance cycles create/dispose 12 actual painted rigs, with geometry/texture counts returning to **22/10** and two live civilian instances. Idempotent instance/kit cleanup is implemented. The browser exposed and helped fix a real translated-IK defect; the regression now exercises translated/rotated instances. This is lifecycle/behavior evidence, not a new performance budget or physical-phone measurement.
- `world.modules.parts[].destroyed` prevents resurrection of burned solid parts. A lintel hides when either pier disappears; a roof declares required supportModuleIds and hides when any support loses a solid part. This is conservative support visibility, not collapse physics. Overhead fire, crowd collision/AI, interiors and door state commands remain outside scope.

Production art integration, final roof/wall silhouettes, seams, source-photo fidelity, finished skin bindings and combined gameplay readability still require the artist/architect candidate. The technical workbench deliberately uses collision boxes and roof wireframe envelopes around real civilians. No primary checkout or donor write, production default switch, deployment or promotion is part of this coder handoff.

## Helper retirement

No task-owned helper remains running. The hidden loopback preview, PID64196 /creation2026-10-27T23:13:42.9891906Z /registration `4f8ff521f5094cbd81765694b69994b6`, had an actual 900-second self-expiry and was stopped through its private STOP marker after verification. Exact PID/creation/executable were revalidated, exit and port4550 release confirmed. Owned tabs closed and viewport reset. `artifacts/helpers/tb008-city-01/` preserves 88 hash-verified final source/dependency files, arguments, runtime requirements and cleanup receipt. Restart is deliberate with a fresh registration.

Ignored visual/check evidence: `artifacts/qa/tb008-civilians-{desktop,phone}.jpg`; source-inspection scripts/results under `artifacts/exposition-audit/`. The durable extraction script, source inventory and engineering contract are tracked. No automatic server restart or publishing action is installed.