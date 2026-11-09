# Pre-ignition siding snapshot

This coder candidate starts at published `7ba748719f848d3e41020d3f6e7d4ecbac378264`. The renderer can read the following detached data each frame. Fractions are bounded between 0 and 1 and follow the existing world-time heat and cooling state.

- `cottageFire.buildings[].preheat` is an array of `{id,x,y,z,nx,ny,nz,heatFraction}`. Each entry copies the native local coordinates, outward normal and ignition ID of a standing unignited wall site with positive stored heat. The divisor is that site's existing threshold. The entry clears when its heat reaches zero, it ignites, or it loses support.
- `world.buildings[].sections[].preheat` is `null` or `{x,z,heatFraction}`. The position is in local plan metres. It represents the hottest still-fueled unignited wood cell in the standing section, normalized by the configured wood threshold. The entry clears on first section ignition or loss of support. Spent cells and deposited fuel over bare ground are excluded.

`src/simulation/cottage-fire.js` publishes the Ashland inputs alongside the existing warming diagnostics and ignition events. `src/simulation/housing-fire.js` selects the ordinary section sample. `src/simulation/index.js` supplies the active wood threshold. The artist owns smoke rendering.

## Traces and checks

The packaged WebGL replay used **Play → Catalogue Street** with `?cottages=calm`. Normal Oil barrel, movement, scene aim and Matches controls lit the same paving cell `cell:105,27` beside Ashland wall site `right:3,0` on both visits. The coordinates of the published site were `(6.08, 2.36, 3.50)` with normal `(1, 0, 0)`. Times below are world seconds after the paving ignition.

| Pour | Observed preheat and handoff |
| --- | --- |
| Short, 0.0227 L | Rose from 0.01075 to 0.81700. The sample was still 0.81700 at burnout (+1.267 s). It fell to 0.76200 at +2.000 s and 0.31075 at +8.017 s. The entry cleared by +12.167 s. |
| Longer, 0.0471 L | Reached 0.99975, then handed off to the same wall ID at +1.567 s. The ignition frame had flame 0.14 and zero preheat entries for that ID. |

The second cottage stayed cold. Both browser receipts and contextual canvas JPGs are under `artifacts/qa/siding-preheat/recordings/`. The observer only recorded snapshots. The desktop canvas was 1280 × 414 on WebGL 2 with ANGLE D3D11 and an RTX 3080.

`node --test tests/simulation/siding-preheat.test.js` also reproduces both pours with simulation input commands. At ordinary Hopkins 9, section 11 reported local `(7.25, 4.75)` and `0.10375` from wood heat `0.166` with a configured threshold of `1.60`. The section sample cleared on a real torch strike. The focused checks cover detached snapshots, hottest-cell selection, spent and gas-only exclusion, and section support loss. Both real-route cases reproduced the missing contract on the published revision.

`node tools/check.mjs` passed 207 tests and the source and art checks, including the published exposure, wind, collapse and directional tool regressions. `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,474 files and 163,814,676 bytes at the nested project URL. The manifest SHA-256 is `e3de761ddb9c89ec46a226b276efe453e07a2a8f8d98a26e211810ef9a182b43`. The architect owns integration and Pages promotion.
