# Directional matches and torches

The coder candidate starts at published `4043b3035fba1e1cb0c71e64d7e1f0895d7866db`. On that base, both close tools reused the last mouse target after the player turned. Ordinary Catalogue Street siding had a direct surface path for matches alone. Four focused checks reproduced the published failures before the correction. A separate thin-screen check exposed a wood cell that could receive heat through a noncombustible face.

## Play the change

Build with `node tools/build.mjs` and serve with `node tools/serve.mjs --root dist --base /tinderbox/`. Open the project URL, then choose **Play → Catalogue Street**. Add `?cottages=1` for the Ashland wind visit or `?cottages=calm` for still air.

- On the Ashland visit, press **Space** or **Matches** at spawn. The player begins facing the nearby siding. Walk along the wall and point the movement controls back toward it to choose a different patch.
- The first **Torch** press lights the carried tool. Move while it is lit, then press **Ignite** or **Space** with Torch selected to heat the spot ahead. The carried flame continues to use its existing world-time fuel timer.
- To choose an exact spot, click or tap the scene before using the close tool. A movement gesture gives control back to facing. Moving the cursor across the canvas still aims the ranged tools.

Movement supplies the projected world heading after camera rotation and any active inversion, including when collision stops or redirects the requested step. The close tools use that heading at their existing 0.85 m and 1.1 m reaches. A deliberate aim command retains an exact closer point. The first swept contact on Catalogue Street selects one authored Ashland wall patch or the existing fuel cell at an ordinary wooden face. A noncombustible contact stops the strike, including when a screen shares the ground grid cell with siding. Open ground still uses the 1 m match tile or the torch's 0.4 m patch. The torch flash uses the same resolved contact, including the Ashland siding height.

## Browser review

The packaged build opened through the normal title and map menu on WebGL 2 with ANGLE D3D11 and an RTX 3080. The observer recorded existing runtime snapshots while browser keyboard and on-screen actions drove the visits. The desktop canvas was 1280 × 414. The on-screen Torch test used a 390 × 844 viewport with a 390 × 420 canvas.

| Run | Observation |
| --- | --- |
| Ashland wind, Space with no canvas clicks | Spawn strike ignited `right:3,0` at X 52.090, Z 13.500. After a keyboard turn, Space ignited fresh patch `right:6,0` at X 52.090, Z 16.993 about 0.60 world seconds later. Each used one match. The stored ranged aim still pointed to X 53.640. |
| Ashland calm, phone HUD | **Light** left the ground and both cottages cold. After turning and moving, **Ignite** lit `right:6,0` at X 52.090, Z 16.186 with one torch contact. |
| Ordinary street, Hopkins 9 | A match at the bare-paving spawn used one match and reported no fuel. At the east siding, the HUD lit the torch and Space ignited `cell:20,71` by facing alone. A normal scene reset, a deliberate off-axis click and the Matches button ignited `cell:20,67` at X 10.090, Z 33.621. |

Local JPGs and action receipts are under `artifacts/qa/directional-tools/recordings/`. Key frames are `ashland-space-2-matches-ignited.jpg`, `ashland-hud-2-torch-ignited.jpg`, `ordinary-3-torch-ignited.jpg` and `ordinary-5-matches-ignited.jpg`. The JPGs show the result on the gameplay canvas. The browser samples advanced past the brief torch discharge tick. Fixed-step checks verify that the pulse ends at the actual hit and respects wall clipping.

## Paths and verification

- `src/runtime/index.js` distinguishes a deliberate press on the canvas from hover. `src/simulation/index.js` owns close aim, projected facing and the existing explicit `aim` command.
- `src/content/cottage-pair.js` and `src/simulation/fixtures.js` set and validate the Ashland spawn heading. `src/simulation/tools.js`, `cottage-fire.js` and `discharge.js` resolve shared close contacts, heat and the corresponding flash.
- `tests/simulation/close-tools.test.js` covers no-pointer use, stale aim, same-tick movement, native siding, the two-phase torch and real blockers. `tests/integration/runtime-lifecycle.test.mjs` covers a deliberate touch pointer, subsequent hover, the HUD command path and retained ranged aim.

`node tools/check.mjs` passed 201 tests and the source and art checks. `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,474 packaged files and 163,810,436 bytes at the nested project URL. The manifest SHA-256 is `945b7c025d04c6cc7231f2cb0c23cb819426f0dd5a70df15a75a02476653ff06`. This correction uses the published asset and wind revisions. The architect owns integration and Pages promotion.
