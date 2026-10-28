# Artist handoff: Hopkins small houses, first set

Current window follow-up: [Nautilus windows](../nautilus-windows-v1/README.md), imported from the user-specified `90054d07134116a5d9661f8318a76fe68f922aad`. Nos. 13 and 15 gain centered period sashes; room/door/stair plans and roof coverings remain unchanged. The dedicated window handoff records current checks.

The earlier material correction follows candidate `ec77f460e539d2bf114c806ed520c0a7945edabc`: [shared siding review](../housing-siding-review/README.md). New saved exterior renders and current checks are recorded there; earlier GPU evidence below belongs to the earlier material revision. This correction preserves all mesh attributes, transforms, UVs, openings and roof covering.

Branch: `codex/art-assets`. The No. 15 roof revision follows Hopkins candidate `e49465128970ea02d2a3a1b9040548d4d136cda3`. Final delivery reports the exact candidate commit. This candidate is not promoted or deployed to master.

## No. 15 roof correction

The former footprint roof made a W-shaped notch over the porch and lost the source gambrel silhouette. No. 15 now has continuous main and front gambrels, with steep skirts, shallow crowns, exact valley cuts, bent bargeboards and a roof-seated chimney. Its 52 roof panels use 48 one-metre runs and four cut ends; 24 panels have valley cuts. The user requested horizontal clapboard on the vertical window-bearing gable faces; the sloped planes retain cedar shingles. The roof revision preserved the native body. The later window follow-up uses the corrected 2 m assembly (0.5 m wall + 1 m aperture + 0.5 m wall) on No. 15’s upper front face. See [roof evidence and review](roof-15.md).

## Delivery

Twelve exterior house assemblies from Hopkins Book 4 (1891), designs 9-20, plus 24 interior levels and 112 labeled spaces. Includes individual prefab JSONs, twelve Nautilus wall-run fragments, twelve verified source description/plate images, source dimensions and uncertainties, a reproducible layout builder, six unchanged shared materials and thirty-six saved renders. The remaining catalogue work is ordered in `art/source/hopkins-housing-v1/build-queue.json`.

Owned paths: `assets/art/hopkins-housing-v1/`, `art/source/hopkins-housing-v1/`, `src/art/hopkins-housing.js`, `docs/art/hopkins-housing-v1/`, Hopkins art workbench/checks and its static-review fallback. Shared `src/art/gross-housing.js` gains an optional catalogue URL, explicit window edges, open framed transitions and an optional roof-builder callback; its original Gross defaults are preserved. The Gross manifest assembly hash is refreshed. Narrow LF attributes preserve source-hash portability. No donor or other worker checkout is edited.

## Evidence and checks

- Original-source hashes, exact book leaves, separate written feet and native dimensions: `art/source/hopkins-housing-v1/sources.json` and per-house source records.
- Native geometry and layouts: `geometry-review.json`; twelve houses, 24 floors, 112 connected non-overlapping spaces, 1,329 exact native attribute comparisons, 792 roof coverage samples, all mesh scales [1,1,1], and idempotent resource disposal.
- Nautilus: `nautilus-compatibility.json`, validated against fixed Git source `cc52f89de6333a1d94e2dfe45d47d1317369fac0`; twelve fragments, 916 wall runs and 288 apertures. Native panel/cut-end dimensions preserved.
- Gross regression: `node workbenches/art/check-gross-housing.mjs`; original thirteen houses, 29 levels, 147 rooms and 1,935 native comparisons pass unchanged.
- Offline visual review: twelve exteriors and 24 cutaways, using actual mesh/UV exports in Mitsuba 3.9.1 scalar_rgb. The eleven unchanged houses retain the prior reviewed roofs. The corrected No. 15 has new 1200 x 900 exterior, front and rear review renders. Final images and report are included.
- Browser review: static fallback controls and source/plan pairing at desktop and 390 x 844 viewport. Chromium's WebGL context creation failed before the model loaded; GPU shader linking, live rotation, GPU lifecycle and performance could not be verified on this host. The record explicitly scopes the successful gallery review to static renders.
- Repository and public package: final results are recorded in `package-review.json` after `npm run check`, `npm run build`, local dependency/served-byte verification and manifest checks.

## Limits

Native wall/door reuse takes precedence over the historical half-storey proportions: two full native courses are used, with new roof skins. No. 15 wraps the upper course with wider eaves instead of placing its entire roof above that course. Its roof angles, projections and slightly lower front ridge are artistic adaptations. These are catalogue-derived compositions, not measured reconstructions. Colors, opening rhythms, rear surfaces, furnishings and circulation adjustments are interpreted. No cellar partitions are invented. No. 15 has a source width discrepancy; No. 17 uses the principal dwelling plan; No. 19 is a summer cottage.

The JSONs and fragments are art intake candidates. They do not implement a Nautilus importer, Tinderbox wall-run consumer, playable interiors, stair navigation, collisions or fire. The existing actor/door fit limitation is unchanged. The preview server has a private STOP marker, one-hour deadline and lifecycle registration; it is stopped and its exact identity/restart snapshot and released port are recorded before final delivery. No persistent helper is needed for the saved images.
