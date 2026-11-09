# Catalogue Street floor fire review

Approved for Pages. The reviewed coder commit is `ad6a944b99c760a71358004dcb0d904acb4aec86`, directly above published `8f7a6b048f60f761a5fd169f479fc8ee1c0eca57`. The [coder handoff](../engineering/catalogue-floor-fire.md) records the changed paths, normal controls, browser timings and remaining limits. Asset catalogues, vendor files, the borrowed fire art and the pinned Nautilus wind field match the published base.

The architect reproduced the release defect through the normal menu and a fixed-step replay. Ashland lower fuel was burning out of sight and the downwind cottage's flame dropped out around age 26 seconds. An edge strike on Hopkins 9 or middle Monroe burned ground fuel while the whole house remained solid, then removed its original three colliders in one step.

The corrected package passed the following checks.

- The same wind match at normal zoom showed active flame through the lower openings on both Ashland cottages. A later frame showed the downwind lower floor still burning after the first house cleared. A small burning remnant was visible near the second deadline, and the final capture showed both clear.
- The fixed-step wind run measured second-roof ignition at +11.95 world seconds and independent clearances at +30.00 and +41.95. One lower support remained in active flame at downwind age 29.8 seconds. The same strike in the calm browser and fixed-step runs left the second cottage cold and standing.
- Normal-controls WebGL strikes on the middle Monroe frontage in calm mode and the east wall of Hopkins 15 in the regular street produced façade fire and local section loss. The isolated tests also exercise Hopkins 9, actual release of cleared footprints and continued collision for the standing parts. The quarter-turned Monroe test checks separate starts and clearances with an unheated third unit still standing.
- `node tools/check.mjs` passed all 196 tests and the source and art checks. `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,474 packaged files and 163,808,581 bytes at the nested project URL. The manifest SHA-256 was `b3db3278739607f81dd50609f20199a51eb497385a7f8d2c21982e644b7678fe`.

Baseline PNGs, corrected JPGs and replay receipts are local under `artifacts/qa/catalogue-floor-fire/`. The architect's loopback preview shut down through its stop marker. Its tab closed and port 4555 was verified free.

Use **Play → Catalogue Street** from the [wind playtest](https://syntaxswine.github.io/tinderbox/?cottages=1), [calm control](https://syntaxswine.github.io/tinderbox/?cottages=calm) or [regular street](https://syntaxswine.github.io/tinderbox/). Approach the siding, aim and press **Matches** or **Space**. The ordinary houses clear in two-metre plan sections. Connected lawn remains a valid fire path to another lot.
