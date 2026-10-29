# Horticultural Building art handoff

The candidate delivers the exterior, structural interiors and a separate assembled waterfront/approach terrace. Branch: `codex/horticultural-building-art`. Parent: `c6ddd51d7dd47a2ec148159e6a6d64a8d00bd2a9`. It preserves all 165 recorded files from the New York, Administration and shoreline deliveries. No donor checkout, previous asset, gameplay adapter or UI changed.

## Native construction

The generator calls unchanged Nautilus `wallPanels`, `measureWallRun` and `wallRunErrors` at pin `90054d07134116a5d9661f8318a76fe68f922aad`. The 87 plan runs compile to 6,076 actual native panels. Every wall run has an even whole-metre length, at most 64 m; circular arcades use 24 segments of 8 m and 12 segments of 6 m, rotated without scale. Apertures split panels; .12 m closure strips cover the inter-level seam. Full walls remain 1 x 2 x .16 m, ordinary leaves 1 x 1.65 x .12 m, full slabs 1 x .12 x 1 m. Native position, normal, UV and index buffers are checked byte for byte.

| Element | Authored dimensions / level |
| --- | --- |
| Frontage | 306 m |
| End pavilion body / full central projection | 76 m / 88 m |
| Great glass dome | 56 m diameter; spring L5 = 10.60 m |
| Crown | 33.92 m, equivalent to the L16 height marker |
| First floor | L1 = 2.12 m; 22,032 square metres |
| Pavilion and central galleries | L3 = 6.36 m; .12 m slabs with real voids |
| Spring deck and foyer/entry roofs | L5 = 10.60 m; ring/open-centre and separate foyer caps |
| Courts | Two, each 84 x 28 m |
| Stairs | Three, 2 m wide, 24 treads each; L1 to L3 |
| Waterfront strip | 306 x 18 m, plus 4,896 square metres of approach aprons |
| Terrace floor | 10,404 unscaled native slab cells, all at 2.12 m |

The crown is a height marker, **not 16 occupied storeys**. Tall rooms contain empty intermediate levels. No full floor seals the central vertical axis above L1. The front foyer roofs do extend over their own hall volumes near the rotunda perimeter. Two stair locations follow the diagram's end-pavilion arrangement; the rear central stair, straight flights, upper gallery wells and ring dimensions are explicit access adaptations.

The asset's `.16 m` physical wall thickness is retained. Staff colour is a visual finish; the authoring `concrete` enum only validates the wall fragment. Structure, finish physics, fuel, collision and fire remain unassigned.

## Source evidence and uncertainty

The [source register](../../../art/source/exposition-horticulture/sources.json) records creators, stable locators, raw/derived SHA-256 values and rights. The [measurement record](../../../art/source/exposition-horticulture/measurements.json) separates printed dimensions, pixel readings and game dimensions.

The original Conkey *Plans and diagrams* (1893), printed p. 9 / one-based scan 29, was visually read. The floor diagram is scan 31, rotated clockwise for review. It establishes three pavilions, two courts, front glass curtains, rear ordinary-light curtains, upper galleries/cafes, cream staff and the water terrace. It is an exhibit-installation diagram, not a complete construction drawing. Its numbered exhibit grid is not a structural bay schedule.

The written 1000 ft frontage calibrates the diagram: 3982 pixels / 304.8 m = about 13.0643 px/m, with recorded endpoints. Court spans provide an independent check; image anisotropy/line interpretation is about 3–5%. The text calls 250 ft the extreme width, while the projecting central diagram envelope reads about 87.4 m. This conflict remains explicit: 76 m end body and 88 m full projection are authored choices. The written 187 ft dome diameter takes precedence over the smaller approximate diagram circle. The authored 56 m diameter and 33.92 m crown differ deliberately from 56.9976 m and 34.4424 m in the text. No height or roof pitch is measured from a perspective photo.

Arnold/Higinbotham's 1893 plate 43 establishes the dome, lantern, glazed galleries, pale ornament and ribbed front cupolas. Plate 57 gives a distant dome view; the Japanese Ho-o-den in its foreground is a different building. Public-domain plan/photo derivatives are research only, outside the public runtime package. Gutenberg's gamma correction/repairs are recorded.

E. R. Walker's 1893 front photograph (Chicago archive `apf3-00081`) was inspected to check the paired cupolas, arch and frieze. Its commercial reproduction terms are unresolved; **none of those image pixels are redistributed**. The raw cached research image stays ignored. The public Arnold source independently supports the major visible forms.

Rear/end roof profiles, hidden foyer joins, exact upper subdivisions, individual sculpture, service rooms and historic exhibit placement remain incomplete evidence. End hips, repeated arch rhythm, floral bosses/swags, planting arrangement, cafe furniture, roof/glass/frame hues, railing rhythm and the central water stair are simplified art choices. Cream staff alone has period colour support. The current peach/soda-green finish follows the later user art direction recorded below. No complete as-built reconstruction is claimed.

## Warm colour revision

The user requested warmer colour, greener glass like soda glass, and a peach tone like waning sunlight. Palette `soda-green-waning-sun-v1` now supplies the default building and assembled terrace materials through `assets/art/exposition-horticulture/palette.js`.

| Slot / group | sRGB colour |
| --- | --- |
| Soda-green glazing | `#69b88a` |
| Peach plaster | `#ebc1a5` |
| Warm ivory trim | `#ffe4c6` |
| Muted green cupolas | `#52765e` |
| Terrace paving | `#d6b38f` |
| Terrace coping / ornament | `#f9dcba` |

These are user-directed game colours, separate from the period cream-staff evidence. The [palette preservation audit](palette-review.json) records direct geometry/structure digest comparisons with the original frozen commit. Building and terrace geometry, native units, openings, anchors, glass opacity and floor heights are preserved. Review lighting/cameras are the same as the original delivery. The original standalone shoreline recipes retain their original defaults; the companion assembly tints only its owned material instances and respects consumer material overrides, including after a texture swap. This palette file can be reused by later Nautilus art.

## Factory and ownership contract

```js
import {createHorticulturalBuilding} from './assets/art/exposition-horticulture/index.js';
import {createHorticultureTerrace} from './assets/art/exposition-horticulture/terrace.js';
const building = createHorticulturalBuilding(THREE, {quarterTurns: 0, position: [0, 0, 0]});
const terrace = createHorticultureTerrace(THREE, {quarterTurns: 0, position: [0, 0, 0]});
scene.add(building.root, terrace.root);
// Later: remove/dispose both through their idempotent dispose() methods.
```

Both anchors are ground at the middle of the central front, +X along frontage, +Z rear. Positions require integer X/Z and Y in multiples of 2.12 m. `quarterTurns` is 0, 1, 2 or 3, positive Three Y rotation about that shared anchor. Returned `bounds` are unposed local bounds. All four rotations and translated poses are checked. The standalone shoreline tile's original grid-vertex anchor is preserved; the companion assembly places those tiles internally.

Building slots: `facade`, `trim`, `glazing`, `frame`, `roof`, `cupola`, `door`, `floor`, `foliage`, `trunk`, `soil`, `water`, `fruit`. Terrace slots retain `facade`, `coping`, `paving`, `rail`, `ornament`. Each accepts optional `materials` and `textures`, plus `setAppearance({materials, textures})`. Building `includePlanting:false` omits interpretive plants/beds/basins. Borrowed material inputs are cloned; all input textures/maps and their transforms remain borrowed and unchanged. Default glass is alpha .34, double sided, with depth writes and shadow casting off. Native UV buffers remain untouched; separate `grossUV` supplies metre texture density. Curved ornament uses documented inherited approximations.

Returned metadata is frozen. The building owns generated geometry, default/cloned material adapters and instancing buffers. The terrace owns seven unchanged shoreline prototype factory lifetimes and 46 aggregate instance buffers; prototype resources are disposed once. Invalid appearance inputs fail before mutation or roll back; reskinning leaves geometry and metadata unchanged. Consumers call each returned `dispose()` exactly once; repeated calls are safe.

The building has 971,732 triangles in 504 draw meshes, plus 182,598 triangles in 46 terrace meshes, before view culling. Native floor cells and repeated modules are instanced; no frame-rate or GPU memory claim is made. A production LOD/culling budget needs later runtime review.

## Integration boundary

`nautilus-assembly.json` records validated native **wall fragments**, not an `aft-map-v2` / `aft-block-v1` save or fixed-catalogue registration. The existing editor supports six map layers; the custom glass dome can rise above the wall layers as art. `terrace-assembly.json` gives tile placement and companion metadata. No runtime absolute donor/sibling paths are required.

Whole-building provider intake, production placement, camera/occlusion, collision, accessible navigation, water physics, multilevel fire and final material assignment require the architect's coder contract. Closed entry leaves remain visible. Geometric stair/landing checks do not establish traversal acceptance. Neither this branch push nor the offline review promotes the candidate to `master` or Pages.

## Reproduction and helper lifecycle

```text
python art/source/exposition-horticulture/prepare-evidence.py
node art/source/exposition-horticulture/build-manifest.mjs
node art/source/exposition-horticulture/export-review.mjs
python art/source/exposition-horticulture/render-review.py --spp 32
python art/source/exposition-horticulture/compose-review.py
node tools/check.mjs
node tools/build.mjs
node workbenches/art/check-exposition-horticulture.mjs --package
```

Evidence preparation needs the ignored original files at the exact URLs/hashes in the source register. The original PDF is 98 pages; Poppler rendered one-based scans 29 and 31; scan31 was rotated clockwise. The exporter uses host Three r180 and unchanged native bear data. CPU review uses bundled Python, Pillow, NumPy and the existing ignored Mitsuba 3.9.1 scalar_rgb under `artifacts/render-deps`; no install or new retained server is needed. PLYs/scene manifests and helper receipts are ignored under `artifacts/exposition-horticulture/`. Water at .92 m, terrace bulk fill, ground and bear base-colour review are presentation-only; the paint shader, boats, crowds, exact exhibits, gameplay and UI are omitted.

The renderer approximates Three alpha using null/diffuse blending; it does not validate GPU transparency sorting, shaders or performance. Each finite renderer records exact PID/creation identity and an actual 120-second deadline. The package helper has an actual 30-second deadline and a `finally` port-close check. Source scripts, input/output references and dependency requirements here form restart instructions; no service is retained. Helper completion/port receipts are recorded locally before delivery.
