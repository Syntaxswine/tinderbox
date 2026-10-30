# Landmark interior art — native Nautilus candidate

The artist delivery adds 64 partition runs and 386 placed furnishings/decorations across 65 defined spaces in New York State, Administration, Horticulture and Fisheries. It includes 35 independently reusable prop types, warm wood and cream/gold finishes, soda-green glass, source evidence and thirteen JPG reviews. Existing exterior assets, stairs, floors and occupied heights retain their recorded source geometry.

Candidate branch: `codex/landmark-interiors-art`, based on `988b4aca32343c9f2e566db74bb018c705820742`. The exact delivery commit is the commit containing this record. This is an artist candidate for deliberate architect intake; production placement, collision, door interaction, camera occlusion, streaming and fuel assignments remain separate.

| Venue | Native furnished levels | Defined spaces | New runs | Placed assets | Permanent open passages |
| --- | --- | ---: | ---: | ---: | ---: |
| New York State | 1, 4 | 16 | 16 | 107 | 24 |
| Administration | 1, 3, 5, 7 | 38 | 28 | 150 | 42 |
| Horticulture | 1, 3 | 7 | 8 | 42 | 4 |
| Fisheries | 1, 3 | 4 | 12 | 87 | 0 |

New York has ground reception/service rooms and an upper banquet hall with flanking board offices, reception, tea and relic rooms. Carved seating, marble chimneypieces, rugs, electric globes and repeated cream/gold panels follow the original plan, photograph and 1894 report. Banquet table positions and exact upper partitions are interpretations. The arched painted ceiling is simplified into optional native-level coffer decoration; the Millet mural and exact tapestries are omitted.

Administration preserves the existing Hunt-plan ground front partitions and widened access openings. Post sorting, counters, public benches, exchange desks, a document safe, iron ambulance cots, porcelain basins and pharmacy cabinets furnish the source-labeled uses. Rear and upper office subdivisions are explicitly inferred. No Administration office photograph was verified. The Arnold dome photograph informed only general classical ornament; its pixels remain private research.

Horticulture receives an orange-covered California exhibit tower, tiered fruit stands, botanical glass cases, potting/service bays, low exhibit dividers and gallery cafe sets. The Crystal Cave mound has an actual hollow chamber and entrance. Period photographs directly support the orange tower and planted mound, while their dimensions and siting are adapted to the accepted shell.

Fisheries receives native radial angling dividers, rod cases, net/buoy racks, planked skiffs, specimen cases and a replacement aquarium. Forbes's printed report supports **40 outer tanks (24 small, 16 large) plus 10 inner tanks**. The scanned page was inspected because OCR read 16 as 18. The unequal inner tank sizes are simplified into ten double-faced bays. The 26 ft central pool becomes an 8.2 m outer-rim prop. Hidden ladders, plumbing, vaulted spectator-aisle cover and detailed glass engineering are omitted.

See [measured catalogue](catalogue.md), [geometry statistics](statistics.md), [historical source register](../../../art/source/landmark-interiors/sources.json), [checks](checks.json) and [asset manifest](../../../assets/art/landmark-interiors/manifest.json).

## Review images

These are renders of actual generated meshes. Venue cutaways include source floors and applicable access geometry. Wall tops, attached high decorations and overlying floors/roofs are selectively omitted as their captions state. Materials use CPU base colours and approximate transparency; these images do not establish combined-game WebGL or traversal acceptance.

| Review | JPG |
| --- | --- |
| Reception library | [Carved seating, table, fireplace and electric globes](previews/reception-library.jpg) |
| Office library | [Post, records, pharmacy and ambulance assets](previews/office-library.jpg) |
| Horticultural library | [Orange tower, fruit, cases, potting and cafe set](previews/horticulture-library.jpg) |
| Fisheries library | [Skiff, tackle case, net and aquarium prototypes](previews/fisheries-library.jpg) |
| New York ground | [Partitions and preserved stair approach](previews/new-york-ground.jpg) |
| New York banquet | [Upper hall and flanking offices](previews/new-york-banquet.jpg) |
| Administration ground | [Information, ambulance, doctor and pharmacy](previews/administration-front.jpg) |
| Administration upper | [Office divisions and inner stair corridor](previews/administration-upper.jpg) |
| Horticulture fruit hall | [Orange tower in the existing gallery](previews/horticulture-fruit.jpg) |
| Horticulture dome | [Crystal Cave close cutaway](previews/horticulture-grotto.jpg) |
| Fisheries angling | [Native radial installation dividers](previews/fisheries-angling.jpg) |
| Fisheries aquarium | [Concentric tanks and central pool](previews/fisheries-aquarium.jpg) |
| Aquarium destruction | [Intact and shattered versions of all three tank sizes](previews/aquarium-destruction.jpg) |

## Native contract and consumer API

The runtime entry is `assets/art/landmark-interiors/index.js`; it borrows the host's shared Three namespace. All structural runs are even metre lengths assembled from unchanged Nautilus `wallPanels` at pin `90054d07134116a5d9661f8318a76fe68f922aad`. Full panels retain **1 × 2 × .16 m** geometry, origin and ordinary UV buffers. Aperture cuts and .12 m inter-level closures are explicit separate fragments. Floor pitch stays **2.12 m**. There are no new floor slabs, stairs, door leaves or occupied levels. Furniture has practical measured dimensions; nothing is stretched or posed with object scale.

```js
import {createVenueInterior, createInteriorProp, getInteriorPlan}
  from './assets/art/landmark-interiors/index.js';

// Same source-local coordinates and pose as the accepted landmark.
const model = createVenueInterior(THREE, {
  venueId: 'new-york',
  levels: [4],
  includeCeilings: true,
  position: [0, 0, 0],
  quarterTurns: 0,
  materials: {},
  textures: {}
});
scene.add(model.root);
// Later: model.dispose();
```

`venueId` accepts `new-york`, `administration`, `horticulture`, `fisheries`. Omitted `levels` includes all furnished levels; an empty list constructs nothing. `sectionBounds: {min:[x,y,z], max:[x,y,z]}` selects intersecting components in **unposed source-local metres before construction**; it does not slice the returned geometry. Selection uses actual measured prototype bounds. `includeCeilings:false` omits all ceiling-attached objects, including chandeliers and pendants. Root placement accepts integer X/Z metres, standard native Y levels and quarter turns 0–3. Ceiling fixtures mount 1 cm below the underside of the next existing occupied floor slab; no slab height is changed.

`createInteriorProp(THREE,{assetId,materials,textures})` returns one standalone prototype at its unscaled local datum. Both factories return `root`, `bounds`, frozen `metadata`, `diagnostics()` and idempotent `dispose()`. They own generated geometry, instance buffers and cloned/default materials; caller materials and textures/maps remain borrowed and unchanged. No texture downloads or sibling-checkout references are needed. Ordinary UVs remain intact and `grossUV` supplies metre-space texture density.

The appearance slots are listed in the manifest. They cover plaster, cream trim, wood, dark wood, brass, upholstery, linen, iron, green glass/water, stone, plants/soil/fruit, paper/ink and warm pigments. Swapping these slots does not rescale the forms or select physical materials.

`getInteriorPlan()` provides source-supported/inferred room status, polygons and relevant holes, prop placements, even-length wall runs, permanent open passage dimensions, exact replacement IDs, recorded route keepouts and source pins. Instanced source records keep `componentId`, `propId`, `assetId`, `level`, `roomId`, `attachment` and `blocking` metadata. These are descriptive art inputs; the receiver decides actual simulation behavior.

**Do not use an entire prop AABB as a solid collision box.** Bounds are selection envelopes. The cave, boat and aquarium rings need component geometry or fitted compound proxies so their openings and circulation remain usable. The cave entrance and recorded routes pass the new-art capsule checks; this does not validate the unchanged source shell's runtime collision. The orange tower also passed 12,966 actual-vertex upward ray checks against the source roof, with about .40 m minimum vertical clearance. New framed passages are permanently open; adding a closed collision leaf requires a later explicit door implementation.

`nautilus-assembly.json` exports validated native wall-run tier maps with translations and passage records. Bare maps describe full runs; the matching plans/factory perform aperture cutting and decoration. This export is ready for deliberate Nautilus reuse, with no claim that it has already been registered in the upstream engine library.

## Composition and exact source pins

| Source | Commit |
| --- | --- |
| New York native shell | `b689f5501ab06f54822f2aa724ac77de106e3b71` |
| Administration | `43337a33ddfe4dff6849654c827c56e1f24e1acc` |
| Horticulture | `c4287338ff93907900a94a86b6c7e3bed0ae7c2f` |
| Existing access kit | `26e1b1301ce577ab8ed26afa32fdafa93d7d44e4` |
| Separate Fisheries candidate | `f75499a3ef60d6446a3885d0eb5c21882f27466b` |

For the first three venues, retain the existing access kit's source-part hiding, replacement fragments and floor cuts before adding this interior. The review composer demonstrates this offline without changing the production adapter. New York's game stair differs from the historical one and remains clear in its accepted location. Administration's widened stair/service areas stay free.

Horticulture requires hiding the exact 90 IDs in `getInteriorPlan('horticulture').replacements.hiddenSourceParts`: the old eight cafe arrangements (64 parts) and only central palms 4 and 5 (26 parts). All IDs were checked against the actual source model. Neighboring palms, courts, structure and stairs remain. No base asset files were edited.

The Fisheries original is a separate artist candidate. Construct its pinned factory with **`includeExhibits:false`**, then add the complete new Fisheries interior. Avoid combining the old aquarium displays with the replacement. The ignored Git-blob fixture exists only for offline review; it is not a runtime dependency or a silent production intake. The warm Horticulture/Fisheries branch has not been merged into this branch.

## Accepted aquarium destruction requirement

The user requires **one bullet hit to destroy the struck aquarium tank**. This applies independently to all 40 outer tanks and ten inner tanks. The catalogue, manifest and Fisheries plan record it as a user-approved rule, rather than a proposed feature. Damage detection and authoritative game state remain the coder's responsibility; a live bullet-impact path has not been added by this art delivery.

All three tank prototypes now include intact and destroyed art. Destroyed tanks lose their full glass panes, standing water and swimming-fish presentation; jagged pane remnants, fallen glass, a small settled spill and fallen-fish art replace them. The existing supports, metre scale and floor heights remain. These are static aftermath cues; no flooding simulation, floor hazard or fish-survival rule is decided here.

Both factories expose `metadata.damageTargets`, `getTankState(id)` and `setTankDestroyed(id, destroyed = true)`. A confirmed hit uses the stable per-tank ID:

```js
// The coder first confirms the bullet hit and records the authoritative destroyed state.
interior.setTankDestroyed('fish-inner-tank-7');
// Returns false on a repeated call, without replaying or rebuilding the effect.
interior.setTankDestroyed('fish-inner-tank-7');
// Restore the visual when the owning game resets its authoritative state.
interior.setTankDestroyed('fish-inner-tank-7', false);
```

`createInteriorProp(...,{assetId:'aquarium-large',destroyed:true})` creates a standalone aftermath model. `createVenueInterior(...,{venueId:'fisheries',destroyedTankIds:[...]})` restores initial state for selected loaded tanks. Unknown or unselected IDs fail explicitly. The live `bounds` updates after a state change; frozen `metadata.bounds` records the initial presentation. Section selection reserves an additional .45 m around tank bounds for settled debris.

For a Three raycast, read `hit.object.userData.parts[hit.instanceId].damageTargetId` on an instanced mesh, or `hit.object.userData.damageTargetId` on a plain mesh. Resolve the **current** parts array for each hit: changing a tank compacts active instance buffers and may change `instanceId`. Stable tank and component IDs do not change. Inactive panes and water leave the draw/raycast prefix; no zero-scale meshes are used. State changes create no new geometry, material or instance objects, and neighboring tanks keep their current state. Driver upload/performance still needs the combined WebGL review.

The collision adapter must remove broken pane/water volumes and derive remaining support colliders from the surviving components. Cosmetic spill and shard records have `blocking:false`; this does not grant them gameplay hazard behavior. The old full-tank AABB must not remain as an invisible intact-glass barrier. The art does not perform bullet collision, alter physical state, save a destroyed flag, or infer fire/explosion triggers.

The dedicated [destruction checks](tank-destruction-checks.json) and [actual-mesh preview](previews/aquarium-destruction.jpg) verify isolated state changes, all three variants, repeated calls, exact resets, current raycast IDs and resource retirement. Runtime bullet behavior and combined-game browser acceptance remain pending coder/architect intake. This follow-up is based on the original interior art checkpoint `0bf8ecb7af49a064cc64d3672e910254238cd485`.

## Evidence and verification

Historical originals and their creator/date/rights fields, page locators, SHA-256 values, direct observations and adaptations are in the source register. The committed research JPGs are derivatives of public-domain 1893/1894 publications. No archival photograph is a runtime texture. The AIC photograph, catalogued n.d. with publication contact restrictions, is linked and hashed but not redistributed. Provenance does not grant rights beyond the recorded source evidence.

Focused art verification covers 35 live prototype bounds, finite geometry/UVs, native panel buffers, unit scales, even wall lengths, immutable descriptors, source floor support, all recorded approach/stair capsule samples, section/level selection, borrowed resource preservation, exact-once disposal, exact replacement IDs and source immutability. It uses a .62 m radius, 2.3 m tall capsule against actual new triangles and sampled paths; it does not assert a complete game navigation mesh or original-shell traversal.

Run from the assigned artist checkout:

```text
node art/source/landmark-interiors/prepare-source-fixtures.mjs
node workbenches/art/check-landmark-interiors.mjs
node workbenches/art/check-aquarium-destruction.mjs
node art/source/landmark-interiors/check-tower-fit.mjs
node tools/check.mjs
node tools/build.mjs
node art/source/landmark-interiors/check-package.mjs
```

The isolated source fixture is recreated from immutable local Git objects. Optional evidence reacquisition and reproduction use `acquire-research.py` and `prepare-evidence.py`; modeling does not need network access. `build-plans.mjs`, `bake-prop-metrics.mjs` and `build-manifest.mjs` preserve authoring/rebuild inputs. `export-review.mjs` and `render-review.py` preserve actual-mesh preview inputs, camera settings and the finite CPU render workflow. The renderer uses the existing ignored Mitsuba3.9.1 scalar_rgb dependency cache and Pillow; it exits naturally or by its same-process120-second deadline.

Checks and build outcomes are preserved in `checks.json` and `validation.json`. Combined-game browser acceptance, collision/fuel configuration and integration are pending architect/coder work. This branch does not deploy the project. No task helper is retained after delivery; research and render outputs remain available for deliberate reruns.
