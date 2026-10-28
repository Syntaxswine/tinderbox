# Second catalogue block: source and adaptations

The next three designs come from artist commit **`56b028c2935b5a97fe259618f38e0a1550928ab4`**, extending the [first catalogue street](../catalogue-neighborhood/README.md). The architect inspected the archived original plate pixels from that exact Git object before assigning intake. See [Milestone 05](../../milestones/05-catalogue-block-two.md).

| Added asset | Original source and exact locator | Features visible in the original |
| --- | --- | --- |
| Hopkins Book 4 No. 9, `hopkins-4-09` | [1891 Book 4, leaf 20](https://archive.org/details/DSHopkinsHousesandcottagesbookno40001/page/n20/mode/1up); left design, paired with No. 10; artist source `art/source/hopkins-housing-v1/plates/n20.jpg` | Chamfered parlor front, offset entry porch, intersecting gables and published first/second-floor plans |
| Hopkins Book 4 No. 13, `hopkins-4-13` | [1891 Book 4, leaf 24](https://archive.org/details/DSHopkinsHousesandcottagesbookno40001/page/n24/mode/1up); left design, paired with No. 14; artist source `art/source/hopkins-housing-v1/plates/n24.jpg` | Broad front gable, centered small entry porch, upper chambers and recessed rear wing |
| Monroe Street brick row house, `monroe-row` | [S. E. Gross catalogue, leaf 74 / printed page 71](https://archive.org/details/TenthAnnualIllustratedCatalogueOfS.e.GrossFamousCitySubdivisionsAnd/page/n74/mode/1up); artist source `art/source/gross-housing-v1/plates/n74.jpg` | Repeated masonry street fronts, raised entries, ornamental upper fronts and first/second-story plans |

These archived plates were already present in the artist's committed sources. The intake does not depend on a fresh web download. Hopkins's paired plates require selecting the correct side; the Gross image presents a continuous row rather than an isolated cottage. The source dates and locators are preserved catalogue evidence, not a claim of a measured site reconstruction.

## Native adaptations

The immutable prefab records use 7 by 10 m for No. 9, 8 by 8 m for No. 13, and 7 by 13 m for Monroe. These are game module dimensions. Hopkins's recorded published overall dimensions are 24 by 35 ft and 25 by 26 ft respectively, with qualifications about porch inclusion. They are not interchangeable with the native grid values. Perspective images are not used as scale drawings.

The two Hopkins plinths are .48 m high; Monroe's is 1.06 m. All retain the shared 1 by 2 by .16 m wall unit, ordinary 1 by 1.65 m closed door, .12 m slab and 2.12 m floor pitch. Full native upper courses, room-grid simplification, interpreted roof surfaces, color and unseen elevations remain explicit artist adaptations.

The new Monroe instance stands separately with walkable gaps. That deliberately differs from the continuous original street illustration. Its detached side presentation comes from the existing artist assembler. This slice does not claim that those side elevations or the entire historic block were reconstructed.

The existing street, three original houses and gameplay remain the foundation. The second row is a fictional opposing block, with source-derived ground colliders and coarse whole-building fuel groups. Masonry paint does not establish a new fire material model. Interiors, stair traversal, wall-climb fire and structural collapse remain outside this assignment.

## Committed window revision

Artist commit `56b028c` adds the original Nautilus sash sculptures at **`90054d07134116a5d9661f8318a76fe68f922aad`** to Hopkins 13 and 15. Each declared bay spans 2 m: a 1 m opening between .5 m flanks. No. 13's upper bay runs from `(1,0)` to `(3,0)`; No. 15's runs from `(4,-1)` to `(6,-1)`. The host adapter preserves source geometry and UVs while assigning host materials and the existing shared renderer. This is an authored game-art adaptation of the period facade.

The original five-module Nautilus closure includes two unchanged AFT helper modules from `781246a668c723d5a4c5463e70534cc04b6a5641`. Original notices and import/adoption evidence accompany the intake. The Farmyard baseline and shared bear source pins remain unchanged. Unknown or mixed rights remain documented; provenance is not a new license grant.
