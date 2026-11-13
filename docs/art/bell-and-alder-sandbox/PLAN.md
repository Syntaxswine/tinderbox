# First two-address sandbox layout

Measured first increment from `93239f1e202f05064c033038f6f343f79b905b8e`, using the coder's additive instance API v1. [Placement manifest](../../../workbenches/bell-and-alder-sandbox/scene-data.json) and [measurements/source hashes](../../../art/source/bell-and-alder-sandbox/layout.json) are the authoring handoff. Combined traversal and visual acceptance are pending.

Bell & Alder remains unchanged. One reviewed, furnished Hopkins 15 rotates 180 degrees and translates `[-5,0,8]`, putting both fronts toward the street. The house visual bounds become X -15.305..-4.695 / Z -2.25..11.32. All source dimensions, UVs, animals and equipment stay native. This is a fictional composition.

The paved yard uses Bell's existing west pavement plus one new 1 m strip X -5..-4 / Z -2..8; the new street connects X -17..-4 / Z 8..16. No new paving duplicates Bell's ground. The clear 2 m route is centred at X -3. One painted 1 m crate stands at `[-4.5,0,9.5]` on the new street-side apron, clear of the house wall; one 1 m rear fence panel preserves that route around the unchanged street lamp. This refines the initial draft after checking the source pavement footprint.

House walking elevations remain .48 and 2.60 m; Bell remains 0 and 2.12 m. Each flight declares its own source treads and real lower/upper landing patches. The existing source preparation must run before qualified IDs and one rigid transform. The source house entry is approximately 1.015 m wide: native goat/horse passage needs combined verification, while larger bear/civilian passage is not accepted. Bodies and the reviewed house are not silently resized.

The additive art factory uses runtime-owned frame partitioning by stable source ownership, so crossed fragments remain visible exactly once. Closing-time actors, cues and the portable lantern are instantiated once. A reused per-instance firelight pool is a measured rendering approximation, not a new block-wide single-pool cap.

[Shared workflow Version 2](../shared-modular-art-workflow.md) is preserved verbatim from `4001bfb537fe2b156ccf17fa5a7e1b5cbdbcf9d4`; only that file is carried forward, without merging unrelated stockyard history. It retains the main-character definition, painted skins and native modular interfaces, adding production lessons about registration, support, clearance, reproducible reviews and costs.

Deliver one normal-game-scale JPG and a marked quiet cutaway/route view. Current M22 defects and its replay remain controls; corrections, the row pair, new building/wardrobe families, suspicion bar and live-visibility UI are deferred. No production or Pages promotion.

The first continuous probe found two real obstructions: the inherited street lamp at the initial yard entrance and the source house dining-room route crossing its open door leaf. The yard route now uses X -3 and Z 12 on the street. A sandbox-only house export changes only `navigation.prototypeRoute` to take the clear hall directly to the existing stair. All physical/render/content arrays and the original single-house source remain unchanged. The failed control is retained under `artifacts/qa/bell-and-alder-sandbox/native-route-first-failure.json`.
