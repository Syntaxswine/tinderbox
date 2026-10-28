# Catalogue street: source and adaptation record

This bounded street uses three existing artist prefabs, frozen at Tinderbox artist commit **`14d18d7de667c7b83955150313347e198869f5ee`**. It is a fictional game arrangement of published house designs, not a surveyed neighborhood or a reconstruction of the fairgrounds. See [the integration brief](../../milestones/04-catalogue-neighborhood.md).

## Original references inspected

| Selected asset | Original plate and locator | Preserved design feature |
| --- | --- | --- |
| Hopkins Book 4 No. 12, `hopkins-4-12` | [Book 4, scan leaf 22](https://archive.org/details/DSHopkinsHousesandcottagesbookno40001/page/n22/mode/1up), right-hand design on the plate shared with No. 11; artist source `art/source/hopkins-housing-v1/plates/n22.jpg` | Broad front porch and compact upper accommodation |
| Hopkins Book 4 No. 15, `hopkins-4-15` | [Book 4, scan leaf 26](https://archive.org/details/DSHopkinsHousesandcottagesbookno40001/page/n26/mode/1up), left-hand design shared with No. 16; artist source `art/source/hopkins-housing-v1/plates/n26.jpg` | Intersecting gambrel roofs, front projection and porch |
| Gross Ashland worker cottage, `ashland-worker` | [Gross catalogue, scan leaf 66 / printed p. 63](https://archive.org/details/TenthAnnualIllustratedCatalogueOfS.e.GrossFamousCitySubdivisionsAnd/page/n66/mode/1up), “A Home for $100”; artist source `art/source/gross-housing-v1/plates/n66.jpg` | Narrow clapboard cottage, raised basement and tall front stair |

The architect inspected the stored original plate pixels from the exact artist Git objects. Hopkins's plates contain paired designs, so the selected side matters. Gross's headline is a period advertising claim, not a contemporary price estimate. No new dimensions were inferred from perspective drawings.

## Native game adaptations

The artist's catalogue data and individual prefab JSONs agree exactly for the three selected IDs. Their source records separate written dimensions, layout interpretation and reusable native dimensions. Current assembled widths/depths are 8 by 7 m for Hopkins 12, 10 by 10 m for Hopkins 15, and 6 by 7 m for Ashland. These are game prefab dimensions; they are not a claim that every published room dimension was reconstructed exactly.

All use 1 by 2 by .16 m native walls, 1 by 1.65 by .12 m doors, .12 m slabs and 2.12 m floor pitch with unscaled meshes. The Hopkins plinths are .48 m; Ashland uses a full 2.12 m basement course. The latter needs more frontage for its stairs. Full native upper courses and simplified roof/room arrangements take precedence over exact historical half-story proportions. No character is resized to fit a doorway.

The source is monochrome. Colors, material aging, unseen elevations, furnishings and circulation adjustments are artist interpretations. The current siding revision keeps horizontal clapboard on vertical timber faces while retaining shingles on sloped roof surfaces. No. 15's revised roof uses distinct steep and shallow gambrel panels with valley cuts. Its native geometry is an artistic adaptation of the plate, not a measured architectural restoration.

The initial runtime uses exterior presentation only. Filled foundation/porch/step footprints govern movement and heat obstruction. Native narrow doors remain closed. Any ground-fire char/burnout state comes from the existing model; wall-climb physics and interior traversal remain separate work.

## Source evidence

Independent source intake checked both complete catalogue hashes, all six texture hashes, the selected JSON/prefab identities, source geometry helper hash and exact native contracts. The helper remains the unchanged Farmyard file at original source commit `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`, SHA-256 `3807e3d16e372ed4ee8fbae40f799d9ed3b8d14236cf102a2de556e0f5f18eed` (1,644 bytes).

The local audit/replay is `artifacts/qa/catalogue-source-independent.json` and `artifacts/qa/catalogue-source-audit.mjs`. The implementation intake manifest must record the installed dependency closure and preserved generation/source provenance. This source review does not establish renderer appearance, playability or promotion approval.
