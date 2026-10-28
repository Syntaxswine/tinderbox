# TB-016 frozen source and fit audit

Integration base: `1a3e2934072f98b7be9f691cf651ee369748d66f`. Artist intake: `56b028c2935b5a97fe259618f38e0a1550928ab4`. This deliberately advances the prior `14d18d7de667c7b83955150313347e198869f5ee` intake for the approved three additions and centered sash correction. Only immutable Git objects were consumed. The artist's active v2 checkout was not edited or imported. Earlier coder branches remain preserved.

`assets/art/neighborhood-intake.json` is the current installed inventory: **25 raw runtime files, three raw notice/source-chain files, twelve preserved evidence records and one generated synchronous plan module**. Every record includes original/installed paths, exact bytes and SHA-256. Both complete catalogue JSON files remain unchanged at this pin; six selected prefab JSON records equal both the catalogue entries and generated plan values. All six textures retain their earlier bytes. `tools/import-neighborhood.mjs` reproduces this bounded intake and pre-reads/verifies the selected objects before replacing installed files. Previous milestone evidence remains unchanged under `docs/engineering/neighborhood/`.

## Selected houses and physical fit

| Identity | Native body/foundation | Porch | Entry stairs | Source |
| --- | --- | --- | --- | --- |
| Hopkins 9 | 7 x 10m full low plinth, .48m high | 2 x 2m at local `(0,-1)` | 3 treads / .66m run | Hopkins Book 4, 1891, n20; description p18/n19 |
| Hopkins 13 | 8 x 8m full low plinth, .48m high | 3 x 1m at `(2,-1)` | 3 treads / .66m run | Hopkins Book 4 n24; description p22/n23 |
| Monroe row house | 7 x 13m rectangular basement; first floor at 1.06m | 2 x 2m at `(0,-2)` | 6 treads / 1.32m run | Gross n74, printed p71 |

Source URLs, room polygons, uncertainties, native contracts and interpretation notes remain in the unmodified prefab records. No. 9's parlor is chamfered and No. 13 has upper/rear setbacks, but the actual frozen assemblers draw full rectangular low plinths beneath them. Those solid ground bases remain blocking. Monroe's basement wall course starts at -1.06m, and its projecting front bay belongs to the upper floor at 3.18m; the bay does not fill the ground plane. A native bear can pass at `(32,30.2)` beneath its projection without entering the foundation. These facts are derived from the source assembly, rather than from its full-height bounding box.

The retained coarse foundation envelope adds .09m for exterior slab/wall rims. It is a conservative rectangular ground approximation, not the detailed perimeter of every trim piece. Separate deck and stair footprints retain the source stair recipe: 1.16m treads, rails at +/- .61m with .055m thickness, total envelope 1.275m wide and .0275m end allowance. Roofs, upper bays and elevated ornament do not create ground obstacles. Tests compare the actual foundation/deck/stair meshes at all **24 quarter-turn placements**. Closed native doors remain nontraversable; actor scale and the bear's .56m radius are unchanged.

The new rigid placements are Hopkins 9 `(3,30,q0)`, Hopkins 13 `(15,30,q0)` and Monroe `(27,31,q0)`, in a 36 x 47m world. First-row placements, player, civilians and the road remain unchanged. Walking checks cover all three new frontages, both south gaps, the west/east routes and a continuous rear lane at y45.5. Monroe was published as a continuous row; detached placement and exposed unseen sides are explicit game adaptations. Its brick appearance uses the approved existing coarse building-fuel proxy; this does not model masonry combustion or structural fire.

## Centered Nautilus windows

The original source is **`90054d07134116a5d9661f8318a76fe68f922aad`** in Nautilus Engine. All eight installed files were compared byte-for-byte with those original Git objects: the five modules below plus `NOTICE.md`, `docs/window-sculptures.md` and the inherited AFT provenance JSON. The latter two retain their artist-installed `source-evidence/` paths. The import evidence in this directory preserves the original eight path/size/hash records.

| Original runtime path | Bytes | SHA-256 |
| --- | ---: | --- |
| `packages/window-kit/index.js` | 6,173 | `762a31f19bcb59df01d6e39f84a7df8b304d41f796bbf0a957928bbf55d29562` |
| `packages/window-kit/three.js` | 5,433 | `76020f340a25eb10acf7de9cd75fd35b099b12438fb457a8c016e6d98bd51f00` |
| `packages/map-core/wall-runs.js` | 8,795 | `6d01eb4b49d6ba20ae71e4bb2cab095c80e63be5d14b6ff43f509a9cfc76633d` |
| `vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-materials.js` | 4,647 | `2a2ad40e16533b4c30b639e907b9e5c8d967557cb65aa6f05c0c640d4bde0297` |
| `vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/diagonal-roads.js` | 1,150 | `427e412356e9cdaa72a4ec581af1e2eb4b203357456f5ed562c7b4bdf99acaeb` |

The unchanged artist `src/art/nautilus-windows.js` adapter injects the host Three namespace and existing house palette, rotates the source front to match the house exterior and adds draw groups/interior skin bindings. Its added `grossUV` is an exact clone of source UVs. Source positions, normals and UVs remain unchanged. Default helper pixel materials are not invoked; no new texture or second renderer is introduced. The borrowed palette stays owned by the house, and each window geometry disposes once through the source model owner.

Each corrected bay occupies a **2m wall span with .5m flanks around a 1m opening**, from .35m to 1.55m above its floor. Hopkins 13 has one on its upper front edge `(1,0)`–`(3,0)`; existing Hopkins 15 has one at `(4,-1)`–`(6,-1)`. Snapshot `windowBays` records are detached and retain level, source commit and original endpoints. Tests compare both 47-part source models and cast aperture rays through the actual house and gable skin at every quarter turn. The imported No. 13 chimney correction also remains exactly as authored at the frozen artist pin.

Embedded notices, generation records and inherited source evidence remain intact. Mixed/unspecified license status is preserved; source provenance does not establish a new blanket grant. Existing Farmyard native geometry, bear pin and shared Three implementation are unchanged. No editor application, full artist branch, vertical-fire branch or active v2 work is merged.
