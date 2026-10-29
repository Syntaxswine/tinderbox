# Horticulture waterfront: artist handoff

Candidate: `codex/horticulture-waterfront-art`, based on the preserved Administration delivery `43337a33ddfe4dff6849654c827c56e1f24e1acc`. The delivery commit is the commit containing this record; retrieve it with `git log -1 --format=%H -- assets/art/horticulture-waterfront`. Pushing this art candidate is not architect promotion.

The user requested reusable water-edge pieces as part of the forthcoming Horticultural Building. This bounded delivery builds that tile kit first. The Horticultural Building itself, its planting and boats are not included in this commit.

## Delivered paths and source

- `assets/art/horticulture-waterfront/`: `index.js`, nine metadata definitions in `kit.json`, hashed runtime `manifest.json` and local text attributes.
- `art/source/horticulture-waterfront/`: original-photo crops and provenance, protected prior-asset Git blobs, repeatable evidence/metadata/export/render/contact-sheet scripts.
- `docs/art/horticulture-waterfront/`: final JPGs, catalogue, source comparison, checks and this handoff.
- `workbenches/art/check-horticulture-waterfront.mjs`: focused native panel/slab, corner, stair, shader, ownership and package checks.

Source **HWF-ARNOLD-43** is C. D. Arnold / H. D. Higinbotham, *Official views of the World's Columbian Exposition*, plate 43, 1893: [photographic volume](https://www.gutenberg.org/cache/epub/22847/pg22847-images.html). It is the existing dossier's EXPO-P02 / TB009-R03. The original-resolution reproduction was inspected, and the readable waterfront crop revealed dark horizontal bars between pale posts with faceted caps, rusticated piers and continuous coping. The [source comparison](previews/source-comparison.jpg) separates those observations from native-grid art choices.

`sources.json` records the original URL, 4570 x 3605 pixel basis, SHA-256, byte count, crop rectangle, derived evidence hashes and digital treatment. Gutenberg records gamma adjustment and repairs; the image is a reproduction, not an untouched negative. Retain the 1893 creators/publication and Gutenberg credit. Source pixels stay in research paths, outside the public runtime. Existing donor provenance and unknown rights remain separate; this record grants no new blanket license.

No historical dimensions were measured from the perspective image. Rail material, exact historic colours, section thicknesses and hidden construction remain unverified. The native generator's `concrete` token validates geometry authoring only; physical structure and finish remain **unassigned** for a future consumer adapter.

## Catalogue and native contract

| Type | Land cells / envelope | Use |
| --- | --- | --- |
| `promenade-slab` | 1 x 1 m | Native 0.12 m floor slab |
| `quay-straight` | 1 x 1 m | Retaining core, facing and coping |
| `quay-rail` | 1 x 1 m | Same base with three dark horizontal rails |
| `quay-pier` | 1 x 1 m | Rusticated pier face and capped post |
| `quay-outer-corner` | 1 x 1 m | Two native wall runs around an outside corner |
| `quay-inner-corner` | 2 x 2 m, three land cells | Concave turn with an empty water notch |
| `quay-end-left` | 1 x 1 m | Left terminal post and closed wall return |
| `quay-end-right` | 1 x 1 m | Right terminal post and closed wall return |
| `quay-stairs` | 2 x 5 m including landing | Twelve custom treads and a two-cell native landing |

Every recipe is compiled through the actual, unchanged Nautilus wall-run module at `90054d07134116a5d9661f8318a76fe68f922aad`; each small authoring map validates at three layers. Full wall geometry, normals, native UVs and origins match `BoxGeometry(1,2,.16)` without scaling. Floor boxes match `BoxGeometry(1,.12,1)`, with their tops at 2.12 m. Structural panels are composed, rather than stretching a long shore wall. Custom facing blocks establish the visible coursing, and custom coping closes the edge above the native slab.

The ordinary tile anchor is its front-left grid vertex at native ground Y=0, +X along the shore and +Z toward land; default water faces -Z. Quarter turns pivot about that grid vertex. Core wall centre lines sit 0.08 m inside the boundary, so their water faces meet the grid. Coping/posts have small documented overhangs; use actual bounds rather than assuming a strict 1 m rendered envelope. The concave piece's three floor cells leave its fourth cell empty. The stairs project to Z=-4 m and include a landing at Z=0..1 m; their exported footprint includes the full 2 x 5 m projection.

The deck always uses `WALL_KIT.floorSpacing` (2.12 m). Coping reaches 2.24 m; rail tops reach 3.20 m; faceted posts reach 3.36 m. These are authored trim heights, not extra occupied floors. Twelve treads divide one floor pitch, giving a 2.12/12 m rise and 4/12 m run. Stairs, corner and end variants are useful game adaptations; this photograph does not establish their exact historic design or placement.

In the assembled review, an optional water plane at 0.92 m leaves about 1.2 m of the native retaining face exposed; the core extends below water. Runtime assets contain no water plane and impose no water height. The nominal 4 m post rhythm (with corner/end/stair interruptions), cream colours and dark rail finish are art choices. Future floor and water levels can change through placement or the scene contract without resizing native panels. No water simulation or drowning/traversal rule is selected.

## API, appearance and ownership

```js
import { createWaterfrontTile } from './assets/art/horticulture-waterfront/index.js';
const piece = createWaterfrontTile(THREE, {
  type: 'quay-rail', position: [4, 0, 0], quarterTurns: 0,
  materials: {}, textures: {}
});
scene.add(piece.root);
// Later: scene.remove(piece.root); piece.dispose();
```

The host injects its one shared Three namespace (tested with repository r180). Placement requires integer X/Z metres, Y at an integer multiple of 2.12 m and a quarter-turn integer 0--3. The returned `bounds` are local; apply `root.matrixWorld` for world bounds. `metadata` is frozen and includes native panels, native maps, floor cells, full footprints, small overhang bounds, connection ports and passage intent. Port normals and coordinates are local and must be transformed with the root. They describe art attachment intent rather than a new editor serialization format.

Slots are `facade`, `coping`, `paving`, `rail` and `ornament`. `setAppearance({materials,textures})` swaps cloned materials without changing geometry, metadata, bounds or borrowed texture transforms, and rolls back invalid bindings. A separate `grossUV` attribute supplies local physical metres to the material adapter; native UV arrays stay intact. The shader hook is inspected by the focused check. Input materials and all input textures/maps remain borrowed. Geometry, cloned/default materials and instancing allocations are owned; call the idempotent `dispose()` once the root is removed. Geometry is authored at its final size, with no character shrinking or mesh scaling.

The unchanged shared `assets/art/exposition-new-york/forms.js` and pinned `vendor/nautilus-engine/.../packages/map-core/wall-runs.js` are the only runtime dependencies. They already existed in Tinderbox: no donor files, checkouts or moving branches were absorbed. Runtime imports remain self-contained and relative. The manifest records their hashes. Both New York editions and Administration, including their evidence and focused checks, remain equal to 120 protected Git blobs.

## Validation, visual evidence and limitations

All existing repository checks pass: 90 own scripts, 125 static modules, 85 tests, the single Three/provenance gate and 33 additional syntax/dependency checks. The build packages 152 files / 43,664,509 bytes. The focused `--package` run checks all nine recipes, 36 poses, 13 actual native panels, 12 native slabs, 5,190 bounded vertices, real floor/coping/rail joins across a rotated corner, empty concave water notch, twelve actual stair tops and the upper landing, material rollback, borrowed textures and 243 owned resource disposals. All runtime hashes load through a nested local URL using the shared packaged Three; research images remain excluded. The temporary server closes and its port is released.

Nine definitions total 2,522 triangles when instantiated once each; individual recipes range from 12 to 684 triangles. They are small art recipes, with per-piece instancing. A later scene consumer should instance/cache repeated types as appropriate; no GPU scene budget or full-length 300 m shoreline performance is accepted by CPU renders.

The assembled shoreline, pier/stair detail, nine individual recipe views, contact-sheet catalogue and source comparison were visually inspected. Terminal pieces replace exposed rail endings in the final assembly; the contact sheet renders each part separately to prevent overlap. Captions identify omitted building, planting, boats, crowds, UI and effects. Native bear geometry/base colours provide scale, with its projection-paint shader omitted in the CPU renderer. Water and land fill are review-only geometry.

This is a self-contained art provider candidate for Horticulture and later games. It is **not yet registered** in Nautilus's fixed catalogue or placed in Tinderbox's production world. The main Horticultural Building remains the next building task. Coder/architect acceptance still owns editor/provider intake, collision, stairs/water traversal, fire, physical materials and runtime WebGL review. Passing an offline mesh check is not gameplay or browser acceptance.

## Reproduction and helper lifecycle

```text
python art/source/horticulture-waterfront/prepare-evidence.py
node art/source/horticulture-waterfront/build-manifest.mjs
node tools/check.mjs
node tools/build.mjs
node workbenches/art/check-horticulture-waterfront.mjs --package
node art/source/horticulture-waterfront/export-review.mjs
python art/source/horticulture-waterfront/render-review.py --view assembled-waterfront --spp 32
python art/source/horticulture-waterfront/render-review.py --view pier-and-stairs --spp 32
python art/source/horticulture-waterfront/render-review.py --parts --spp 24
python art/source/horticulture-waterfront/compose-review.py
```

Evidence preparation reads the original cache URL/hash in `sources.json`; source images are not runtime textures. The renderer uses Pillow, NumPy and Mitsuba 3.9.1 scalar_rgb from the existing ignored `artifacts/render-deps` and bundled Python. It records exact PID/creation identity and has an actual 120-second deadline. `--parts` renders all nine individual recipe views within one finite lifetime. The package helper has a 30-second deadline, an exact process creation record and a `finally` shutdown/port check. Source code, launch recipes, inputs and outputs are durable here; temporary PLYs and helper receipts remain under ignored `artifacts/horticulture-waterfront/`. All disposable helper lifetimes exited and the package port was rechecked; no helper remains running.
