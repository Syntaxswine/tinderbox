# Phone-first controls

The candidate starts from published `2084e72644b229069ead5e762064dea4674d6223` on `codex/phone-first-controls-ui`.

- The 56 px floating timber button leads with the action in larger type. A second finger can activate it by releasing over the same available target while the first finger holds the movement stick. A compatibility click cannot repeat that action. Outside releases, cancelled presses and target changes discard the press.
- The live HUD uses tap and drag instructions. Title and pause Options disclose keyboard shortcuts separately. E still invokes the available action. Space still uses the selected street tool from the stick or field, and can act on a landmark door. Enter and Space activate the focused button.
- Presentation and input changes are in `src/ui/{door-action.js,index.js,navigation.css,styles.css,title-screen.js}`. `index.html`, `src/app.css`, `src/main.js` and `src/runtime/index.js` remove the old field banner and update the canvas description. Browser coverage is in `tests/ui/{browser-tests.js,shop-interaction-checks.js}`. The existing [engraving](../../../assets/art/ui/engraved-plates.json), [timber](../../../assets/art/ui/eastlake-controls.json) and [font](../../../assets/art/ui/typography/manifest.json) records still apply to the reused art.

## Verification

- `node tools/check.mjs` passed 251 tests, 198 script syntax checks and 243 static modules. Asset provenance and the five byte-preserved imports passed.
- The browser suite passed 113 of 113 at 390 × 844, 320 × 568, 844 × 390 and 1280 × 800. The added two-finger cases use synthetic PointerEvents and check single activation, continued movement, cancellation and retargeting.
- A 390 × 844 WebGL visit through the normal title and Catalogue Street menu exercised Open, unsafe Close, Take lantern and Close with trusted desktop pointer input on the visible controls. A separate E press reopened the doors. The visit logged zero errors or warnings. Physical handset coverage remains pending. [Route record](evidence/live-route.json)
- `node tools/build.mjs` and `node tools/check-release.mjs` passed. The build has 3,508 files and 166,753,393 bytes. Manifest SHA-256 is `2295063124ea36ec588661bf078ac89f2a325640f413946d45eb27cd108d231b`.

[Open](evidence/phone-open.jpg) · [Take lantern](evidence/phone-take.jpg) · [Controls & options](evidence/phone-options.jpg)
