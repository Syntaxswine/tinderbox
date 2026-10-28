# Hopkins small houses, first set

Current finish review: [25-house siding audit](../housing-siding-review/README.md). Vertical gable/closure faces, dormer walls and tower drums match the house wall finish. Cedar/slate remain on the sloped roofs. The [centered-window follow-up](../nautilus-windows-v1/README.md) imports the corrected 2 m Nautilus bays for Nos. 13 and 15; shared native dimensions and all roof coverings are preserved.

Twelve reusable artist prefabs from D. S. Hopkins's **Houses and cottages, Book No. 4 (1891)**: designs 9-20, with twelve complete exterior assemblies, 24 furnished interior levels and 112 labeled spaces. The source exterior and floor diagrams are paired for every asset. This is the first Hopkins set; the ordered [build queue](../../../art/source/hopkins-housing-v1/build-queue.json) records the remaining books and designs.

[Exterior collection](previews/collection.jpg) · [first floors](previews/all-first-floors.jpg) · [second floors](previews/all-second-floors.jpg) · [source comparisons](previews/source-to-prefab.jpg) · [No. 15 roof revision](roof-15.md).

| Asset | Source design | Character |
| --- | --- | --- |
| `hopkins-4-09` | 9 | Chamfered parlor and cross gables |
| `hopkins-4-10` | 10 | Narrow plan, fuel room and rear kitchen wing |
| `hopkins-4-11` | 11 | Square family house, side bay and four upper chambers |
| `hopkins-4-12` | 12 | Broad porch and chamfered upper chamber |
| `hopkins-4-13` | 13 | Laborer's cottage, one lower and two upper chambers |
| `hopkins-4-14` | 14 | Plain gable, recessed entrance and three upper chambers |
| `hopkins-4-15` | 15 | Gambrel, central porch and divided living/dining space |
| `hopkins-4-16` | 16 | High roof, inset porch and three upper chambers |
| `hopkins-4-17` | 17 | Principal dwelling plan, veranda, side bay and wood house |
| `hopkins-4-18` | 18 | Small T-plan, two upper chambers and store room |
| `hopkins-4-19` | 19 | Summer cottage with veranda and upper balcony |
| `hopkins-4-20` | 20 | Bay parlor, recessed porch and two upper chambers |

## Evidence and adaptation

The primary source is the [original 1891 pattern book](https://archive.org/details/DSHopkinsHousesandcottagesbookno40001), digitized for the APT Building Technology Heritage Library from the JD Collection. Its item metadata carries Public Domain Mark 1.0. The [source register](../../../art/source/hopkins-housing-v1/sources.json) records the PDF SHA-256, download, twelve scanned description/illustration pages, individual JPEG hashes, finding-aid text, exact leaves and one-based scan numbers. Illustration plates are unnumbered; their facing description pages are 18, 20, 22, 24, 26 and 28. OCR errors were checked against the images: design 13 is 25 x 26 ft, and design 15 prints 26 x 33 ft.

These are interpretations of published designs, not as-built reconstructions of identified Chicago addresses. The source contains perspectives and plan diagrams rather than every rear elevation or full construction drawing. Written overall feet and story heights remain in each prefab separately from game dimensions. No. 15's stated width conflicts with the sum of its dimensioned rooms; the composition follows the illustrated arrangement and records the discrepancy. No. 17 uses the principal dwelling plan; No. 19 remains explicitly a summer cottage. No cellar partition plans are published for this set, so no basement interiors are invented.

The native kit takes precedence: plans snap to whole metres and two full native wall courses replace the published one-and-half-storey heights. Closets and tiny stair passages are consolidated or enlarged. Eleven roofs follow the highest room footprint with separately authored closures and connecting roofs. No. 15 now uses continuous intersecting gambrels: steep skirts and shallow crowns enclose the unchanged upper native course. The user requested horizontal clapboard on its vertical gable faces; cedar shingles remain on the sloped surfaces. The silhouettes are compositions from the illustrated gables, gambrels, porches and bays, with this height adaptation explicitly retained. Unseen rear surfaces, opening spacing, colors and furnishings are interpretations. Source scans are never runtime textures.

## Shared asset contract

- Wall: **1 x 2 x 0.16 m**. Door: **1 x 1.65 x 0.12 m**. Lintel: **1 x 0.35 x 0.16 m**.
- Floor spacing: **2.12 m**, including the **0.12 m** slab. Every mesh retains scale **[1, 1, 1]**.
- Original box positions, normals, indices and UVs remain unchanged; the separate `grossUV` channel carries physical texture coordinates. Diagonals use rotated 1 m panels and separate cut ends.
- The Victorian sash opening remains **1 x 1.2 m**. Nos. 13 and 15 use the native Nautilus period sash in a **2 m** bay, with **0.5 m** wall piers. Other window recipes retain their prior geometry.
- Native geometry, origins and door hinges come through the same shared assembler as the Gross collection. Farmyard pin: `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`. No donor files are modified.
- Roofs, roof closures, porches, balcony and furnishings are new art forms; their shapes do not define new engine wall standards.

The six existing painted materials are reused with unchanged file bytes: Gross clapboard, cedar shingles, oak boards and wallpaper at 1 m repeats, plus exposition brick and slate at 2 m repeats. The [manifest](../../../assets/art/hopkins-housing-v1/manifest.json) records all six hashes and the original generation records. No new raster texture was generated or edited for this batch.

## Use and review

```js
import {loadHopkinsHousing, createHopkinsHouse} from './src/art/hopkins-housing.js';
const library = await loadHopkinsHousing(THREE, {renderer});
const house = createHopkinsHouse(THREE, library, 'hopkins-4-13');
scene.add(house.root);
house.setView({view: 'cutaway', level: 0});
// Enable renderer.localClippingEnabled for the wall cutaway.
house.dispose();
library.dispose();
```

The caller supplies the existing Three namespace and owns its renderer, camera and scene. House disposal frees its geometry/material pool; the library owns the six shared textures. Interior cutaways hide other floors and roofs and clip full-height walls, preserving original geometry. Aligned stair holes are visual authoring; playable stairs are not implemented.

Open `workbenches/art/hopkins-housing.html` using the existing read-only art server. The workbench pairs the adapted plan with its original plate and provides exterior/interior selection, floor selection and prefab downloads. When WebGL is available it offers live rotation and a furnished toggle. On this host, Chromium could not create a WebGL context (`BindToCurrentSequence failed`), so the review uses saved renders with those two live controls disabled. The static gallery remains usable at desktop and phone sizes. This limitation is recorded rather than reported as a successful GPU shader review.

Offline renders use **Mitsuba 3.9.1 / drjit 1.5.0, scalar_rgb**. `export-render-scenes.mjs` exports the actual Three mesh transforms, material tints, physical UVs and selected clipping planes into temporary PLY scenes; `render-review.py` renders those meshes with the unchanged texture inputs. Its diffuse path tracing substitutes for the live StandardMaterial shader and lighting. These images verify geometry and appearance; they do not establish browser GPU performance, shader linking or GPU disposal.

Rebuild from the artist worktree:

```text
node art/source/hopkins-housing-v1/build-layouts.mjs
node art/source/hopkins-housing-v1/build-nautilus-traces.mjs
node workbenches/art/check-hopkins-housing.mjs
node workbenches/art/check-hopkins-roof.mjs
node workbenches/art/check-nautilus-windows.mjs
node workbenches/art/check-hopkins-nautilus.mjs --nautilus-source PATH_TO_PINNED_CHECKOUT
node art/source/hopkins-housing-v1/finalize-manifest.mjs
node art/source/hopkins-housing-v1/export-render-scenes.mjs
python art/source/hopkins-housing-v1/render-review.py --width 800 --spp 48
python art/source/hopkins-housing-v1/build-preview-sheets.py
```

The offline renderer requires Mitsuba, drjit, numpy and Pillow, installed only in the ignored local art cache; the game does not depend on them. The downloaded PDF, PLY scenes and large intermediate PNGs also stay ignored.

## Nautilus handoff boundary

Twelve [wall-run extension fragments](../../../assets/art/hopkins-housing-v1/nautilus-traces/) validate against the immutable `nautilus-wall-runs-v1` implementation at `cc52f89de6333a1d94e2dfe45d47d1317369fac0`. There are 916 wall segments, 288 separately measured apertures and fifteen cut ends (eleven diagonal ends plus four half-metre window piers). The [compatibility report](nautilus-compatibility.json) records the exact source hash and panel checks.

These are portable extension fragments, not complete Nautilus map/block documents or an already imported house library. Apertures are full-height trace gaps; their metadata records native inserts, clear heights, sills and lintels separately. Roofs, floors, furniture and stairs remain in the artist prefab. Tinderbox consumer support, navigation, collisions, fire, floor traversal, door behavior and the existing bear/door fit limitation remain integration work. `nautilusImported` stays false. Only the architect promotes this artist candidate.
