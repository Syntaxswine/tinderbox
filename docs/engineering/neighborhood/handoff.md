# TB-014 coder handoff

Candidate branch: `codex/catalogue-neighborhood-coder`, based on `b2942f98ed177faa7f319156d7bbdd24e35c5162`. The exact delivered commit is supplied with the final handoff. The earlier bear and fire branches remain unchanged. This is an implementation candidate for TB-015; browser acceptance, promotion and publication remain with the architect.

## Result and changed paths

Production opens the `neighborhood` scenario: one fictional exterior street with Hopkins 12, Hopkins 15 and the Gross Ashland worker cottage, the native painted bear, inherited normal horse/goat civilians, the existing UI, all five tools, drug effects, gasoline trail, fire and barrels. The three source assemblies retain unit scale. Their doors stay closed. No catalogue browser, interiors traversal or placement editor is added.

- Scenario/physical descriptors: `src/content/{buildings,neighborhood,housing-plans,asset-scale}.js`; `src/simulation/{fixtures,index}.js`. Source-derived house, porch and stair footprints drive collision and heat obstruction. Each prefab retains all its colliders until its finite ground-fuel group is spent, then its visible model and collider group retire together. Existing scenarios preserve their previous behavior.
- Original art and consumer: `src/art/{gross-housing,hopkins-housing,gambrel-roof,neighborhood,index}.js`; `assets/art/{gross-housing-v1,hopkins-housing-v1,exposition-skins-v1}/`; `assets/art/neighborhood-intake.json`. The manifest enumerates every imported path and raw hash. Generic world building boxes are suppressed for these authoritative prefab descriptors.
- Production composition/framing: `index.html`, `src/main.js`, `src/runtime/{camera,index}.js`. Follow framing preserves camera-relative movement/aiming and the old scenario overviews. Potential occluders fade to .18 opacity using actual source-mesh bounds; no physical property changes. Native bear height projects to 48.76 / 49.74 pixels inside the existing desktop/phone canvas reservations.
- Verification/tooling: `tests/integration/neighborhood.test.mjs`, `tools/{import-neighborhood,review-neighborhood-offline,smoke-neighborhood-package,build,check}.mjs`, `.gitattributes`; `workbenches/art/neighborhood{,-frame}.html`, `workbenches/art/neighborhood-{frame,review}.js`. The architect-owned integration workbench remains untouched.
- New minimal donor record: `vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/native-units.json` and its single original `sites/tactical-animal/dist/aft/tactics/hybrid-geometry.js`.
- Audit/evidence: this directory's `source-audit.md`, `offline-review.json`, `browser-review.json`, `evidence/` and `intake/`. The latter preserves nine original generation/source/manifest records; those historical collection manifests describe more assets than this bounded intake installs.

## Sources

Artist pin: `14d18d7de667c7b83955150313347e198869f5ee`. Six textures, both original catalogue JSONs, selected prefab records and the three source assemblers are unchanged. The generated synchronous plan module preserves all three original prefab values. No live artist files or pending windows were absorbed. Farmyard's new native helper was independently compared with original commit `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`: 1,644 bytes, SHA-256 `3807e3d16e372ed4ee8fbae40f799d9ed3b8d14236cf102a2de556e0f5f18eed`. Existing bear pin, raw bear closure and single renderer implementation remain intact. Original source/generation notes and rights limitations are retained in the intake evidence.

## Checks

- `node tools/check.mjs`: **81 tests pass**, 80 scripts pass syntax, 100 static modules resolve, all intake/provenance hashes pass, one shared Three pair, original art checks pass. Fourteen new behavior/geometry/API checks cover native placement, quarter-turn footprints, clearance, obstruction, accepted-distance pouring, powder/world clocks, pause/reset, partial/complete/deposited-fuel burnout, actual production composition, all five held tool identities, occlusion/restoration and idempotent resource disposal.
- `node tools/review-neighborhood-offline.mjs --write`: three actual prefabs, twelve desktop/phone projection/occlusion samples, native scale and the three-group accelerated burnout fixture pass. CPU meshes/API fixtures do not establish rendering.
- `node tools/build.mjs`: **117 public files / 42,934,553 bytes**. No workbench, documentation, helper record or local donor dependency enters the distribution. Raw artist/vendor bytes remain exact through packaging.
- `node tools/check-release.mjs`: all 117 package hashes and relative resources pass.
- `node tools/smoke-neighborhood-package.mjs`: 24 nested-path HTTP resources pass; the actual loader requests two catalogues and six textures, and the actual original assemblers instantiate only the selected three houses. Explicitly no WebGL rendering.
- `node tools/smoke-bear-package.mjs`: all 26 packaged bear resources pass at a nested path.
- Direct browser recheck: **blocked**, before art loading, by `Error creating WebGL context`; the browser reports `GL_VENDOR = Disabled` and `GL_RENDERER = Disabled`. Both requested frame sizes were selected and the failure captured. No GPU appearance, interaction/performance acceptance or publication is claimed.

The renderer fixture exercises the real art factory and source rigs with a borrowed renderer API; it is deliberately labelled as offline. The source meshes total 2,135 meshes and 28,810 triangles before the other game art; these are source counts, not measured GPU draw calls. Independent real-browser desktop/phone inspection remains necessary, particularly house transparency, held fire/trail readability, material appearance and performance.

## Review entry points and limits

Serve the checkout with the existing bounded `tools/serve.mjs`, then open `workbenches/art/neighborhood.html`. Its explicit controls select exact 1280 x 800 and 390 x 844 frames, street/three entries/behind-house/side-gap views, an accelerated burnout fixture and a behavior run through the actual production UI/art composition. `source-audit.md` documents the new snapshot and diagnostic fields for the architect's own workbench.

Fire remains a coarse finite ground-footprint approximation. Stair climbing, passing under elevated decks, wall-climb fire, interiors and structural collapse are outside this slice. Source-bounds fading is conservative and may fade empty roof-space silhouettes. Both catalogues retain all 25 metadata entries to preserve source identity; only three houses are instantiated. Actual frame-rate and GPU transparency checks remain pending on a functioning WebGL browser.

All disposable task helpers have exited. Preview PID 69064 (creation FILETIME `134376859690635926`) was preserved, stopped through its private marker, retired under registry ID `a99f576243804822bb1e51e46262a2eb`, and port 4581 was verified released. The first registration attempt also shut down its preview safely after a malformed restart-field rejection; its local receipt remains in `artifacts/TB-014/preview/`. Final one-shot package servers closed and ports 59795 / 59803 were verified released. No service or browser tab is retained. Nonsecret restart/evidence receipts remain under ignored `artifacts/TB-014/`.
