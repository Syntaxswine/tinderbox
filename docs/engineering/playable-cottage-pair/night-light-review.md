# Catalogue Street night lighting correction

This candidate follows the architect's review of `581b56b8475b32953633fffdb654550ba8bbc213`. The opt-in pair borrows the approved `999c8b41bc80defaba3aa57e2337ece2217463b2` workbench's directional outdoor firelight. The updated local-light module is byte-preserved. The [intake record](intake.json) identifies the adapted code and both source hashes.

## Implementation

- `src/art/cottage-firelight.js` and `src/art/cottage-pair.js` share one outdoor budget per cottage. Three fixed inverse-square lobes split it by exposed flame on the roof and walls. The existing near practicals light the first match and yield their outdoor share as the shell becomes involved.
- The scene scale is `0.00034` of the reference's one-million-lumen design value, giving a peak of **340 game light units per cottage** under the existing exposure. The 22 m finite cutoff and 0.88 penumbra soften the overlap. The emitters use the scene's existing forward pass and moon shadow. The new light tracks live exposed flame and reaches zero after clearance.
- `src/simulation/cottage-fire.js` and `src/simulation/tools.js` measure match range to the first exposed siding contact. The existing range feedback is used past 0.85 m. At the limit a strike still heats one tile. A press consumes one match as before.

## Matched browser evidence

The normal title, map selector and Matches control were used on the packaged wind route. The Bear remained at the starting point. All three JPGs use the same 1280 × 414 gameplay canvas, camera, sRGB output, exposure and moon/sky fill. The JPGs show the WebGL canvas with the HUD outside the capture.

The first-match frame was taken at 0.52 world seconds with one burning source tile. The full-burn frame was taken at 9.52 seconds with 69 active flame cells on the source and a cold receiver. Mean 8-bit display luma comes from the corresponding lossless canvas captures. Coordinates are half-open `[x0, y0, x1, y1]` rectangles within the canvas.

| Surface | Rectangle | Cold | First match | Full burn |
| --- | --- | ---: | ---: | ---: |
| Gap paving | 621, 142, 641, 162 | 90.94 | 90.94 | 166.94 |
| Street shoulder | 599, 195, 619, 215 | 92.84 | 92.84 | 128.11 |
| Receiver facing siding | 554, 131, 571, 146 | 44.95 | 44.95 | 102.39 |
| Receiver sheltered siding | 435, 137, 455, 155 | 48.89 | 48.89 | 52.60 |
| Match wall | 729, 150, 747, 167 | 50.52 | 133.42 | 52.07 |

In the architect's preceding cold and burn frames, the two paving rectangles read 89.29 and 91.27 in both frames. In the corrected run they returned to their respective cold readings at clearance. The full-burn siding samples had no clipped channels and retained visible clapboards and window details. On a five-pixel-wide paving transect from `(632, 154)` to `(614, 206)`, the added luma fell from 78.05 to 33.29, with a maximum adjacent-row change of 2.18.

The wind run retained receiver ignition at 11.95 s and clearances at 30.00 s and 41.95 s after the match. The calm run at a 390 × 844 page viewport left the second cottage cold through source clearance. Both real HUDs showed **Target out of reach. Move closer.** for the distant siding aim and confirmed one-tile ignition at the nearer aim. The plain packaged URL opened the regular daytime street.

## WebGL cost

A separate instrumented run used the same packaged runtime, native bear, camera and match input. At 9.52 s it rendered one fixed scene and alternated only the visibility of the outdoor lights. It warmed both shader variants, then measured 24 pairs with WebGL 2 elapsed queries. Both states submitted 202 draws and 98,867 triangles. The scene used sRGB output, exposure 1 and the existing tone mapping setting.

| Outdoor emitters | Median GPU draw time | GPU p95 | Median CPU submission |
| --- | ---: | ---: | ---: |
| Hidden | 5.32 ms | 8.67 ms | 6.85 ms |
| Visible | 6.49 ms | 10.00 ms | 7.10 ms |

The median of the within-pair GPU differences was **+1.76 ms**. The measurement covers this one desktop frame and graphics card. The phone-sized run verifies presentation and controls on the same desktop GPU.

## Checks and local artifacts

`node tools/check.mjs` passed 192 tests and the art checks. `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,469 packaged resources. The focused test covers the 0.85 m limit, the just-outside feedback, clamped ground aim, and the outdoor budget across ignition, spread and clearance.

The local evidence is under `artifacts/qa/playable-cottage-pair/night-light-review/recordings/`. It includes `wind-cold.jpg`, `wind-first-match.jpg` and `wind-full-burn.jpg`, the lossless frames, the wind and calm receipts, and the same-frame samples in `wind-full-burn.json`. The browser checks ran in Three r180 on WebGL 2 with ANGLE D3D11 and an RTX 3080. The architect owns integration and Pages promotion.
