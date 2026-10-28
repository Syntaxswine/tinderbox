# TB-016 coder handoff

Candidate branch: `codex/catalogue-block-two-coder`, based on exact architect checkpoint `1a3e2934072f98b7be9f691cf651ee369748d66f`. The final handoff supplies the exact candidate SHA. Earlier neighborhood, bear and fire branches remain unchanged. This candidate awaits TB-017 combined review; the worker does not promote `master` or deploy.

## Result and changed paths

There are now **six distinct selected/placed houses**. Hopkins 9 `(3,30,q0)`, Hopkins 13 `(15,30,q0)` and Monroe `(27,31,q0)` face the existing row across the street, in a 36 x 47m world. Original three placements, player, road, civilians, UI, native bear/.56m radius, camera/input and tool/drug/fire rules remain intact. No new mechanics or interior traversal is added. Hopkins 13 and existing 15 deliberately adopt the original centered Nautilus sash update and its exact artist adapter.

- Content: `src/content/{neighborhood,buildings,housing-plans}.js`; three added prefab JSONs; the original updated Hopkins catalogue and No. 15 prefab. Descriptors expose detached `windowBays` metadata. The shared foundation compiler retains its established coarse physical policy; per-house char and atomic collider/model burnout behavior are unchanged.
- Raw art intake: `src/art/{gross-housing,hopkins-housing,nautilus-windows}.js`, `assets/art/neighborhood-intake.json`, and the pinned minimal `vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/` closure. `src/art/neighborhood.js` checks all six identities and rejects stale catalogue/physics revisions while releasing loaded textures.
- Existing tooling/checks: `tools/{import-neighborhood,review-neighborhood-offline,smoke-neighborhood-package,build,check}.mjs`, `.gitattributes`, `tests/integration/neighborhood.test.mjs`, `workbenches/art/check-art.mjs`, `workbenches/art/neighborhood{.html,-frame.js}`. The existing focused review page gains south entries/gaps/back-route positions; no additional tester is created.
- Source/audit evidence: this directory's `source-audit.md`, `offline-review.json`, `browser-review.json`, `cleanup.json`, two package receipts and `intake/` originals. The current manifest enumerates every imported path/hash. Historical first-street evidence remains unchanged.

Architect-owned documents, `workbenches/integration/**`, `tools/review/export-neighborhood.mjs` and `tools/review/render-neighborhood.py` are untouched. The prior integration harness still contains its three-house/old-pin assertions and needs the architect's TB-017 update before a future browser run. The saved offline preview tools are likewise left to the architect's requested adaptation.

## Frozen sources

Artist commit: **`56b028c2935b5a97fe259618f38e0a1550928ab4`**, with **25 raw runtime files, three notice/source-chain records, twelve evidence records and one derived plan module**. Both complete catalogues remain intact, but only the six selected designs are instantiated. Selected prefab JSON, catalogue entry and generated plan agree. All six existing textures retain their bytes.

The five-module Nautilus window closure and three notices/source records were independently compared with original immutable source commit **`90054d07134116a5d9661f8318a76fe68f922aad`**. Exact original paths, sizes and hashes are in the intake manifest and preserved `intake/art/source/nautilus-windows-v1/import.json`; the source audit summarizes them. Position, normal, UV and added grossUV data are checked through the actual source models. The existing Farmyard, bear and shared-renderer pins remain unchanged. No live artist checkout or later v2 source is required or consumed.

## Commands and results

- `node tools/check.mjs`: **85 tests pass**, 82 scripts pass syntax, 106 static modules resolve; source/provenance hashes, one shared Three implementation pair and 25 art syntax/dependency checks pass. The expanded tests cover 24 house placements, source-data identity, preservation of the old street, continuous native-bear traversal, both window bays at all quarter turns with clear aperture rays, stale-data rejection, per-house partial/complete burnout/reset and disposal exactly once. Existing mechanics/civilian/bear regressions remain passing.
- `node tools/review-neighborhood-offline.mjs --write`: **six actual source prefabs / 24 desktop-phone projection and occlusion samples**, plus six-group burnout. Native bear projection remains 48.76px and 49.74px in the actual production canvas sizes. Source house totals are **4,614 meshes / 65,924 triangles**, including retained interior source geometry; these are not GPU draw-call/frame-rate measurements.
- `node tools/build.mjs`: **129 public files / 43,135,609 bytes**. `node tools/check-release.mjs`: all 129 hashes and relative resource references pass. Imported raw bytes remain preserved. No review page, engineering documentation or helper receipt enters the public distribution; the required upstream notices/source chain remain with the vendored window closure.
- `node tools/smoke-neighborhood-package.mjs`: **36 nested-path HTTP resources**, eight real loader requests (two catalogues/six textures), all six actual source assemblies and two centered windows pass. All runtime/support raw hashes are verified in the packaged distribution.
- `node tools/smoke-bear-package.mjs`: **26 nested-path resources** pass with the existing native bear source pin.
- Original-source comparison: all eight Nautilus runtime/notice/source-evidence files exactly match the frozen original Git objects. The installed manifest records the artist path and original upstream path/commit separately.

These checks exercise actual native meshes, shader setup APIs and model/physics composition through explicitly labelled offline fixtures. A renderer API fixture does not create WebGL or establish GPU appearance. The existing disabled-WebGL blocker is retained, not retried or worked around. Real desktop/phone review, window material appearance/transparency, held fire/trail readability and frame performance remain pending with the architect. No new screenshot or browser success is claimed. The architect owns JPG previews from the actual placed scene.

## Limits and cleanup

No. 9 and No. 13 retain full low plinths beneath their irregular room outlines. Monroe's elevated bay is excluded from ground collision; its source is a continuous row and its detached lot/exposed unseen sides are game adaptations. The retained .09m foundation-rim envelope and blocked decks/stairs are coarse ground approximations. The brick row house uses the approved whole-building ground-fuel proxy, not masonry combustion or structural collapse. Ordinary native doors remain closed and nontraversable. The broad source-bounds presentation fade remains the existing conservative behavior.

No retained helper or preview was created. Both one-shot package servers exited: PID 7304 / port 59851 and PID 49068 / port 59860. Their ports were verified released; the receipts are preserved here. Recorded prior task helpers were also checked and none had its original process running. `cleanup.json` records the outcome. No disposable helper remains running.
