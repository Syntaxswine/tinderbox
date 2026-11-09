# Playable Ashland cottages

This coder candidate starts from the published `dc7f537a83a7e832a0dfa0757d0b2700b909c053` game. The opt-in uses the real Catalogue Street map entry, movement, zoom, player selection and tools.

The [night lighting correction](night-light-review.md) records the later matched firelight, range feedback and cost checks.

## Try it

Run `node tools/build.mjs` and `node tools/serve.mjs --root dist --base /tinderbox/` from the candidate checkout. Open `http://127.0.0.1:4550/tinderbox/?cottages=1` and choose **Play → Catalogue Street**. Use `?cottages=calm` for the still-air comparison.

Both cottages start cold. Aim or tap the wooden siding immediately beside the player and press **Matches** or **Space**. For a different starting patch, walk around either cottage and aim from within tool range. **Menu → Reset test scene** gives you a fresh run. The left zoom controls can bring more of the second cottage into view on narrow screens.

## Live model

The cottages use the native 6 × 7 m Ashland footprint, 2.12 m raised floor, 4.20 m eaves and 5.64 m ridge. The first origin is at X 46 m, Z 10 m. The second is at X 55 m, Z 20.75 m. The runtime translates the original two-shell Nautilus bake onto that pair. The pinned field uses a 2.8 m/s reference wind from 320 degrees with a 0.50 m voxel grid. Surface spread and ember transport sample that field, which stays fixed as the houses change shape. Exact source paths, pins and byte hashes are in [the intake record](intake.json).

Dry wooden siding heats adjacent patches and climbs faster toward the eaves. Fire can round a corner, cross the roof ridge, or skip the gap in a cooling ember. Burning debris can pass through a roof or upper-floor hole and heat the fuel where it lands. Site heat, fall and flight follow the fixed simulation step. A match at the plinth delivers its heat to the first reachable low wooden patch on that side. The simulation checks range and intervening solids. The exposure, cooling and 30-second clearances use game-tuned values. [NIST wall flame experiments](https://www.nist.gov/publications/wall-flames-and-implications-upward-flame-spread) · [NIST firebrand transport experiments](https://www.nist.gov/publications/experimental-study-firebrand-transport-0)

The three support masks remove the corresponding native art and release a ground collision column once the last support above it is gone. Each deadline starts from that cottage's first ignition and remains fixed through repeat heat, pause and powder. The player explores outside the cottages. Ground shimmer, carried-light changes and matched GPU cost measurements remain part of the separate visual milestone.

## Verification

Timings below are world seconds after the match. The wind/right and calm/right rows were exercised through the packaged browser controls. The opposite side is also covered by the fixed-step integration test.

| Start | First source roof | First second roof | First cottage clears | Second cottage clears |
| --- | --- | --- | ---: | ---: |
| Wind, right wall `right:3,0` | `roof:23` at 2.17 s | `roof:9` at 11.95 s | 30.00 s | 41.95 s |
| Wind, left wall `left:3,0` | `roof:18` at 2.13 s | `roof:33` at 10.13 s | 30.00 s | 40.13 s |
| Calm, right wall `right:3,0` | `roof:23` at 2.32 s | Remained cold | 30.00 s | Remained intact |

In the recorded wind run, ember 21 reached the second roof at 11.941 s. The authoritative ignition tick registered it at 11.950 s. Burning debris from that roof reached upper tile 9 at 15.920 s and lower tile 9 at 18.757 s. The run launched 84 embers with at most 77 in flight at once. Eight hot and five cool contacts reached the second roof. The same strike in calm air had zero contacts with that roof. Automated coverage includes exact deadlines, cold initial state, both floor contacts, clipped flamethrower rays, shielding, masks, powder, pause, reset and new visits.

The player-triggered WebGL recordings and receipts are local under `artifacts/qa/playable-cottage-pair/recordings/`. `wind.webm` decoded 1,406 VP9 frames at 1280 × 414 over 52.18 seconds from the cold visit through both clearances. `calm.webm` decoded 1,274 VP9 frames at 390 × 420 over 44.82 seconds. Both ran on ANGLE D3D11 with an RTX 3080. Peak reported draw calls were 206 at desktop width and 438 at phone width in those individual runs. They used different viewports and are playback checks. `wind-both.jpg` shows the second roof 1.4 seconds after it catches, with more embers crossing the gap. The phone-sized browser also verified reset and re-entry through the normal scene menu.

`node tools/check.mjs` passed 191 tests and the art checks. `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,468 packaged resources and nested project URLs. The wind payload matched the pinned SHA-256 over loopback HTTP. The architect owns review and promotion.
