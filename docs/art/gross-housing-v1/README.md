# Gross catalogue housing collection v1

Current finish review: [25-house siding audit](../housing-siding-review/README.md). Vertical gable/closure faces, dormer walls and tower drums match the house wall finish. Cedar/slate remain on the sloped roofs. Geometry, windows and native dimensions are unchanged.

Thirteen reusable artist prefabs based on the exterior illustrations and floor plans in S. E. Gross’s 1891 Chicago catalogue. The collection contains 22 main floor plans and seven basement plans, with 147 labeled spaces including halls, pantries and service rooms. Every house has a complete exterior assembly and selectable furnished interior cutaways.

These are new modular interpretations of the advertised houses. Their room sequence and major bays are drawn from the same source plate as the exterior. They are not measured historical reconstructions. Original sales plans and illustrations sometimes disagree; the adaptation follows the illustrated entrance side and records mirroring where necessary. Colors, furniture, unseen rear elevations, simplified closets and ornament details are interpretations. Source scans remain separate from runtime materials.

| Prefab | Source printed page / scan leaf | Main floors | Basement |
| --- | --- | --- | --- |
| `grossdale-spire` | 12 / n15 | 2 | — |
| `grossdale-hip` | 13 / n16 | 2 | — |
| `grossdale-octagon` | 17 / n20 | 2 | — |
| `grossdale-cross-gable` | 18 / n21 | 2 | — |
| `grossdale-balcony` | 19 / n22 | 2 | — |
| `dauphin-park` | 30 / n33 | 2 | — |
| `calumet-heights` | 37 / n40 | 2 | Interpreted partitions |
| `brookdale-villa` | 44 / n47 | 2 | Service uses stated; interpreted partitions |
| `humboldt-cottage` | 51 / n54 | 1 | Printed two-compartment plan |
| `albany-cottage` | 66 / n69 | 1 | Printed two-compartment plan |
| `ashland-worker` | 63 / n66 | 1 | Printed divided plan |
| `archer-worker` | 69 / n72 | 1 | Printed open plan |
| `monroe-row` | 71 / n74 | 2 | Stone cellar stated; interpreted plan |

Primary source: [Tenth annual illustrated catalogue of S. E. Gross’ famous city subdivisions and suburban towns](https://archive.org/details/TenthAnnualIllustratedCatalogueOfS.e.GrossFamousCitySubdivisionsAnd). Internet Archive records the item with Public Domain Mark 1.0. The downloaded PDF SHA-256, exact leaf URLs, rendered plate hashes and OCR transcriptions are in [sources.json](../../../art/source/gross-housing-v1/sources.json). The review plates are reproduced there at 1900-pixel maximum dimension; the original download stays in ignored research artifacts.

## Native asset contract

The pinned Farmyard donor is `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`. The assembler imports the canonical `ASSET_SCALE` measurements, uses the same shared Three instance supplied by its caller, and never changes donor files.

- Original wall unit: **1 × 2 × 0.16 m**.
- Original door leaf: **1 × 1.65 × 0.12 m**; doorway remains **1 × 1.65 m**.
- Original door lintel: **1 × 0.35 × 0.16 m**. The original **0.85 m sill / 0.7 m opening / 0.45 m lintel** window recipe is retained for basement windows.
- Floor thickness: **0.12 m**. Floor origins: **2.12 m** apart.
- Every object and mesh has scale **[1, 1, 1]**. Native box positions, normals, indices and original UVs stay unchanged. A separate `grossUV` attribute supplies physical material coordinates.
- **Diagonal construction follows Nautilus `nautilus-wall-runs-v1`.** A diagonal grid span has true length √2 m. The assembler rotates unchanged one-metre panels and creates a separate **(√2 − 1) × 2 × 0.16 m** cut end. No one-metre mesh is stretched. Angled door/window openings retain their one-metre inserts; separately cut full-height side piers fill the remaining length.
- New Victorian sash opening: **1 × 1.2 m**, with a separately named **0.35 m sill** and the original **0.45 m lintel**. This insert is a new asset; the original Farmyard window recipe remains available above.

The octagonal house includes a decorative attic bay above the two published floors. Its room arrangement is unpublished, so it is not counted among the 29 planned interior levels. The Monroe facade adds its characteristic fanlight gable.

Room floors, pitched roofs, porch pieces, entry steps, spires and furniture are newly authored meshes with recorded dimensions in their geometry/user data or construction parameters. Plans snap to the native grid. Coordinate origin is the nominal front corner; street faces negative Z, positive X appears left when viewed from the street. Native module centers and door-leaf centers retain their geometry origins; hinge groups place the unchanged leaf beside its original center.

## Materials and interiors

Four new opaque PNG textures were generated with the built-in ImageGen tool and copied unchanged into the project. [generation.json](../../../art/source/gross-housing-v1/generation.json) records the exact prompts, generated filenames, file hashes and dimensions. These are original painted surface interpretations, not catalogue scan textures.

| Material | Physical repeat | Use |
| --- | --- | --- |
| Ivory clapboard | 1 × 1 m | Tinted painted siding |
| Cedar shingles | 1 × 1 m | Selected sloped roofs; vertical gables now match the wall finish |
| Oak floorboards | 1 × 1 m | Interior floors and porch decks |
| Botanical wallpaper | 1 × 1 m | Domestic interior wall faces |
| Existing sienna brick | 2 × 2 m | Brick houses, chimneys and basement work |
| Existing slate | 2 × 2 m | Pitched roof coverings |

Furnishings include a bed with linen and coverlet, settee, hearth rug, dining table/chairs, kitchen stove and flue, work table, wash basin, storage cabinet and hall console. They are visual interpretations of room uses. Placement leaves room connection openings clear and avoids the declared stair shaft. Small service spaces can remain unfurnished when a full prop cannot fit.

Cutaways use clipping planes on the wall materials; the actual wall geometry remains two metres high. Upper floors and removable roof groups are hidden. Stair holes omit floor triangles over the aligned shaft. Floor slabs are visual surfaces and rims; no structural or simulation behavior is implied.

## Review and reuse

Open `workbenches/art/gross-housing.html` through the existing read-only art server. Select a house, choose Exterior or Interior, select a level, and turn the model. The adapted plan and original plate appear together. Prefab JSON downloads retain the source references and geometry contract. [Preview sheet](previews/collection.jpg) · [all exteriors](previews/all-exteriors.jpg). The collection validation control renders all 42 exterior/interior views, repeats collection swaps, checks linked shader programs, and probes complete GPU resource disposal.

```js
import {loadGrossHousing, createGrossHouse} from './src/art/gross-housing.js';
const library = await loadGrossHousing(THREE, {renderer});
const prefab = createGrossHouse(THREE, library, 'ashland-worker');
scene.add(prefab.root);
prefab.setView({view: 'cutaway', level: 0});
// Renderer must enable localClippingEnabled for cutaway presentation.
prefab.dispose();
library.dispose();
```

The assembler owns its geometries and materials. The library owns the six shared textures. Dispose house instances before disposing their library. It does not own the caller’s renderer, scene, lights or camera. `partyWalls: true` suppresses side windows on the Monroe row-house asset; `partyWalls: false` enables a detached end-house presentation.

Source layouts are reproducible with `node art/source/gross-housing-v1/build-layouts.mjs`, followed by `node art/source/gross-housing-v1/build-nautilus-traces.mjs`. Run `node workbenches/art/check-gross-housing.mjs` for source hashes, no room overlaps, connected layouts, preserved native geometry and resource cleanup. Run `node workbenches/art/check-gross-nautilus.mjs --nautilus-source PATH_TO_PINNED_GIT_CHECKOUT` to validate against the immutable Nautilus Git object. After generating and checking layouts, run `node art/source/gross-housing-v1/finalize-manifest.mjs` to refresh all runtime input hashes. The collection’s text sources and JSON exports are pinned to LF line endings. Run `npm run check` and `npm run build` for the repository checks and package.

## Coder handoff and Nautilus contribution status

The coder added measured wall runs to the shared Nautilus editor at commit `cc52f89de6333a1d94e2dfe45d47d1317369fac0` ([wall-run contract](https://github.com/Syntaxswine/nautilus-engine/blob/cc52f89de6333a1d94e2dfe45d47d1317369fac0/docs/wall-runs.md)). This batch follows its one-metre panel, cut-end, two-metre height, .16-metre thickness and 2.12-metre story spacing. `housePlanEdges(house, floor)` exposes room edges with their presentation opening kinds.

Thirteen matching `nautilus-traces/*.json` files contain the actual optional `wallRuns` v1 extension: 1,226 wall segments and 554 separately recorded apertures. They validate against the exact committed Nautilus functions; [compatibility evidence](nautilus-compatibility.json) records the contract hash. Each trace fits an inset 24-metre footprint, with integer floor layers and an explicit origin translation. These are extension fragments for authoring, not complete `aft-map-v2` maps or `aft-block-v1` blocks.

Door and window spaces are left as full-height gaps in those traces; `artistOpenings` records each native width, clear height, sill and lintel so the separate inserts can be placed. The wall-run extension does not encode vertical apertures, roofs, floors, furniture or stair gameplay. The artist prefab remains the complete visible building. The current Tinderbox compiler still accepts quarter-turn modules; this batch does not change that consumer. Movement, collision, navigation, fire and playable stairs require consumer integration before advertising the Nautilus capability.

This is a contribution candidate for the Nautilus shell, with stable native dimensions and self-contained assets. No Nautilus importer or new engine schema is claimed, and `nautilusImported` remains false. The existing bear-to-door fit limitation is unchanged.