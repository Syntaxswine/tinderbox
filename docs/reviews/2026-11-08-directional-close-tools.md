# Directional matches and torch review

Approved for Pages. The architect reviewed `ec4f443f4dfd39eb99047b9dc1f8ab24e335bd26` directly above published `4043b3035fba1e1cb0c71e64d7e1f0895d7866db`. The [coder handoff](../engineering/directional-close-tools.md) records the changed paths and desktop and phone playthroughs. The art, vendor files and wind bake match the published base.

On the old public build, a no-aim match spent stock on the paving beside the Ashland spawn. Lighting the torch and pressing Ignite also missed the wall. A fixed-step reproduction showed both tools heating east after the player turned west.

The architect independently opened the packaged build through its title and map selector in WebGL. A single Space press lit the Ashland siding at spawn without a scene click. In calm air, Light lit the carried torch while the cottages stayed cold. After walking along the wall and turning into it, Ignite lit a different patch with all 12 matches still available. In the regular street, the player used the joystick to face the Hopkins 15 siding and lit it with the carried torch and Space. An explicit Ashland click beyond reach still gave the reach warning, and a nearby click and the Matches button lit the selected patch.

The runtime test distinguishes a deliberate tap from passive hover and verifies ranged aim. The fixed-step tests cover the inversion transform, facing a blocked wall, a thin masonry screen sharing a solver cell, single presses and the torch flash ending at the resolved contact. `node tools/check.mjs` passed all 201 tests and the source and art checks. The build and release checks verified 3,474 files and 163,810,436 bytes under the project URL. The manifest SHA-256 was `945b7c025d04c6cc7231f2cb0c23cb819426f0dd5a70df15a75a02476653ff06`.

JPGs and HUD receipts are local under `artifacts/qa/directional-tools/architect-ec4f443/`. The temporary review tab closed and the loopback server retired through its stop marker with port 4555 released.

Choose **Play → Catalogue Street** from the [cottage playtest](https://syntaxswine.github.io/tinderbox/?cottages=1) or the [regular street](https://syntaxswine.github.io/tinderbox/). Face the fuel and press **Space** or the tool button. A deliberate click or tap sets an exact nearby target until the next movement. Torch takes one press to light and a separate press to ignite the target.
