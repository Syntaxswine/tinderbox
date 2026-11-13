# First two-address sandbox art handoff

Artist candidate on `codex/bell-and-alder-sandbox-art`, from the exact combined base `93239f1e202f05064c033038f6f343f79b905b8e`. Early measured checkpoint: `1a8a50d86739fcdade41cd145ccdc7f0fb48e74f`. This completes the artist's first exemplar for combined coder/architect review; the branch is not a standalone runtime package or a production promotion.

## Result and sources

One existing Bell & Alder control, one furnished Hopkins 15 rotated 180 degrees at `[-5,0,8]`, and a modest paved service yard. Existing animals, furniture, windows, rigs, dimensions and paint are reused. The new yard supplies 114 noncombustible 1 m paving slabs, one 1 m painted crate and one 1 m post/two-rail fence panel: 1,428 source triangles and 1.397984 inherited prototype fuel units. New paving does not duplicate the shop's pavement. The clear route uses X -3 to avoid the original street lamp.

House floors remain .48 / 2.60 m; shop floors remain 0 / 2.12 m. Both flights have twelve native treads, their own qualified identity and real lower/upper landing patches. Native 1 m walls, 2 m wall height, .16 m wall depth, 1 × 1.65 × .12 m doors and 2.12 m pitch remain unchanged.

The original source and replay files stay unchanged. `house-route-data.json` is generated from the reviewed house and changes navigation metadata only: its demonstration route takes the clear hall directly to the stair. The source dining-room detour clipped its open leaf during the first probe. Eleven physical/render fields were compared structurally and remain identical, including all surfaces, openings, furniture, items, levels, source meshes and render geometry. The raw failed control is retained locally.

The [revised shared workflow](../shared-modular-art-workflow.md) is copied verbatim from `4001bfb537fe2b156ccf17fa5a7e1b5cbdbcf9d4`. It preserves painted skins, native interfaces and the owner's broad main-character definition. No unrelated stockyard ancestry is merged.

[Measured plan](PLAN.md), [layout/source inventory](../../../art/source/bell-and-alder-sandbox/layout.json), [adapter provenance](source-record.json), [native check summary](native-checks.json) and [WebGL receipt](webgl.json) record exact inputs and limits.

## Visual evidence

- [Gameplay-scale JPG](previews/gameplay-scale-yard.jpg): orthographic vertical span 16 m, exposure 1, initial actual shared-runtime frame.
- [Quiet overview](previews/two-address-overview.jpg): span 23 m, explicitly an overview.
- [House cutaway and approach](previews/house-cutaway-route.jpg): diagnostic view with measured route intent.
- [Shop/yard cutaway](previews/shop-yard-cutaway.jpg): original fittings, three actors and one portable lantern.

All four JPGs use the shared WebGL renderer on NVIDIA RTX 3080 / ANGLE D3D11. Thirty programs and sixty shaders compiled/linked without errors. These art views omit the HUD and do not establish a free-play or burn replay acceptance. The house/yard renderer uses the aggregate physics grid at `[0,0,0]`, preserving source elevations and inverse-placement floor UVs. Controlled art fixtures verify a real house patch retires, shop geometry remains, empty deltas retain retirement and a full frame restores it. Original pendant/portable shadows survive qualified IDs.

## Findings and cost

| Status | Evidence |
| --- | --- |
| Working | Native goat and horse pass shop ground, shop stair ascent/descent, house approach/interior stair ascent/descent and the continuous shop–yard–house route. Closed house door blocks the control. |
| Working | One initial shared physical frame supplies three native actors and one portable lantern; each source receives runtime-partitioned records. Static binding construction reports no missing physical mappings. |
| Broken/limited | Native bear and larger civilian/officer profiles are blocked by the house approach rails. They still pass the shop. No bodies or source house geometry were resized. |
| Unwired in this artist branch | Standalone current-HUD/free-play package: coder supplies its runtime/tooling intake. No pickup objects are placed in this first manifest. |
| Untested here | Full posed/equipment clearance, manual exploratory play, cross-building fire/fall visuals, long burns and production performance. Coder/architect review remains separate. |
| Deferred | All recorded M22 witness, fixture-support/light lifecycle, flame/grid aftermath, lantern attachment and CPU findings; suspicion bar/live visibility; Monroe pair; further buildings/wardrobes; production/Pages. |

The gameplay-scale render submits 226 calls / 155,446 triangles for its recorded render. The art scene holds 257 meshes, 84 material instances and 16 unique attached texture references; disposal removes all art meshes/geometries/materials. Renderer memory after removal reports 0 geometries and 1 renderer-owned texture. The renderer contains 23 point lights: three reused six-light fire pools plus four installed lamps and one portable lantern. Potential per-pool power caps sum to 645; this is an explicit additive approximation, not one 215-power block cap. Yard fire uses local illumination; the two buildings can use building glow.

One native Node quiet observation after route checks measured mean 24.94 ms / p95 43.55 ms across 60 steps; this is not a controlled benchmark. Browser capture uses virtual time, so its raw zero timing values are unusable for CPU/GPU performance. No measured GPU-time claim is made.

Next bounded issues for review: (1) decide whether a separately composed wider native house approach is needed for bear/civilian use; (2) measure combined live play/small-fire cost and shared lighting before expanding the block; (3) retain the M22 witness/fixture/destruction findings for the owner's later correction pass. No expansion is included here.

## Reproduction and helper lifecycle

Run `node art/source/bell-and-alder-sandbox/export.mjs` from the artist checkout. It deterministically writes the yard and navigation-only house variant. Use the coder's `workbenches/bell-and-alder-sandbox/check-scene.mjs --data <artist-checkout>/workbenches/bell-and-alder-sandbox/scene-data.json --out artifacts/qa/bell-and-alder-sandbox/native-route.json` from its own checkout for the matching native checker.

For the artist-only combined capture, run `node art/source/bell-and-alder-sandbox/freeze-review-inputs.mjs <matching-coder-checkout>`, review its five exact input hashes, then `powershell -NoProfile -ExecutionPolicy Bypass -File art/source/bell-and-alder-sandbox/run-review.ps1`. The finite server overlays only those frozen read-only coder files; it does not edit another checkout. The WebGL receipt explicitly labels the coder working-source inputs rather than claiming a committed self-contained package.

The review server has a real 300-second expiry; isolated hidden Chrome has a 90-second bound. Both stopped after capture, port 4557 is released and the exact temporary profile was removed. [Retirement receipt](helper-retirement.json). No helper is retained. Durable restart records, frozen runtime inputs and failed/native raw reports remain under the task's ignored `artifacts/` folders.
