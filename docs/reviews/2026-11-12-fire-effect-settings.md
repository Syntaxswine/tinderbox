# Independent effects and whole-building glow

The three requested switches and the owner's whole-building light approximation pass combined review in the isolated furnished Hopkins 15 workbench. This is a reviewed development candidate, not a production rollout or Pages release. The accepted expensive reference and movie remain unchanged. The broad realistic-fire milestone, its hostile score and its measured 20–33% rendering-cost target remain open.

## Exact intake

The contract is [Milestone 19](../milestones/19-fire-effect-settings.md), starting from `250956566a87123a521853b447991db831f4dae6`. The accepted expensive reference is `ee1d10b374ebe91ecc0011bedf39dab1e8fd8874`.

| Owner | Source commit | Architect intake |
| --- | --- | --- |
| UI | `459daf204c5a547cb898308d77c5e213ea7df976` | `d72ff55a` |
| Artist: independent preparation/visibility | `d36ee844fcedf219960ec1348d2bf0fe0a8e34d1` | `ab3c5a19` |
| Coder: preference store and adapter | `8af7878f6abef3fb0d742fd37db1687bb8fc52ee` | `dbd136db` |
| Artist: building glow and conservative guards | `5b4dc9b546ec35005d5d7140e926db14235572a9` | `e8b38d7e` |
| Artist: physical roof-height correction | `f4f730a6f784073658b17b9b0a2280bb18daf6bf` | `347c75c7` |

Browser matrix source: `df73c45e119cab00688612b9645669f1a213029e`. Counterbalanced repeat source: `66569ee1d96d6c52380094c76806c0d76de8372d`. These differ only in the review harness. Neither changes the physical model, native geometry, fuel rules, clocks, support, navigation or production `src`, `assets`, and `vendor` trees relative to the contract base. No donor or new licensed content was imported; inherited provenance remains intact.

## Result and limits

Flames, Smoke and Fire lighting are independent native checkboxes, default on, with defensive storage under `tinderbox.furnished-house.effects.v1`. Turning one off skips its independent effect preparation/generation. Reset and refresh preserve the choices; a paused change redraws without advancing time. Ambient night light and hot-material emission remain separate from light cast onto surroundings.

Camera/cutaway filtering precedes expensive effect construction where conservative bounds prove that the full effect is outside. Smoke may enter view from a hidden base. Local illumination has separate eligibility from visible flames. Uncertain cameras/wind retain effects. This is conservative bounding, not per-source occlusion tracing. Missing ownership/invalid geometry remains an error rather than becoming a successful cull.

Local lighting remains the default. `?lighting=building` sums active area times flame intensity, derives one capped power budget and distributes it over the existing six pooled lights around the native building footprint and floors. It removes local-light clustering; lighting-only building mode also avoids resolved support-anchor preparation. It retains distance falloff. It is a broad visual approximation in scene units, not calibrated lumens or uniform physical irradiance. Point lights can spill through obstructions, and the fixed footprint after collapse only approximates distant individual rubble. Neither mode changes thermal radiation or ignition.

An independent reviewer found that roof flame support relocation could change aggregate light heights when channels changed. The artist corrected this using the original authoritative height before relocation, added a native sloped-roof regression that fails the old code, and the architect repeated the relevant suites. Final independent read-only review at `66569ee1` confirmed the fix and found no new material concern in the six desktop/touch and local/building JPGs. This is bounded feature acceptance, not an overall AAA score.

## Verification

- Combined repository check: **335/335** tests plus five byte-preserved imports, 52 syntax/dependency checks and the single shared Three.js check. [Retained log](../art/fire-effect-settings/browser/combined-check.log).
- Final height leaf: building-glow **9/9**, effect checks **13/13** including 84 conservative envelope cases, plus the two focused Node test files. Earlier focused checks cover authoritative fall/landing ownership, cutaway ceilings, visible plumes, local all-on output against immutable `25095656`, ambiguous input and resource disposal. [Artist evidence](../art/fire-effect-settings/README.md).
- Coder package/source/build/release checks passed; production output remains the same 3,515 files / 166,825,782 bytes. [Coder handoff](../engineering/furnished-house/effect-settings-runtime.md).
- Actual Edge WebGL review at 1280 x 800, native orthographic span 12.6 and exposure 1, on NVIDIA RTX 3080 / ANGLE D3D11. All **eight** channel combinations plus both building comparison cases passed. All masks with lighting on produce exactly identical light positions/power within their mode.
- Native keyboard Space, refresh persistence, reset retention, query-selected building mode, blocked storage and touch at 390 x 844 passed. Off channels report zero corresponding generation calls/splats or cast light power. All-off retains structure and physical state.
- Full simulation snapshot SHA-256 is `227aff9c3bf8ee076ba78e0a4650ed09920733fce3797eaed247678d6c52e194` throughout masks and view/camera changes at world time 120. Moving the camera away eliminates generated flame/smoke splats and records early culling; return has no missing source. Advancing 30 ticks with all effects off and the camera away consumes additional fuel; restoration shows the current state.
- Both actual browser runs report no errors, close their owned browser, and verify their two ports released. Retained receipts document exact process ownership. A separately retained owner preview has its own explicit expiry/registration; the QA browsers are not retained.

Full matrix evidence: [acceptance](../art/fire-effect-settings/browser/matrix/acceptance.json), [timings and diagnostics](../art/fire-effect-settings/browser/matrix/timings.json), [cleanup](../art/fire-effect-settings/browser/matrix/cleanup-receipt.json). Counterbalanced evidence is in the adjacent [repeat](../art/fire-effect-settings/browser/repeat/acceptance.json) directory. [Manifest](../art/fire-effect-settings/browser/manifest.json) records retained file hashes.

## Measured cost

These are **paused fixed-state draw timings**, excluding simulation, diagnostics and encoding. CPU wall time includes art/presentation, render submission and the HUD; GPU queries bracket rendering. CPU/GPU overlap and cannot be added into an FPS estimate. These timings are not directly comparable to the previous whole-step measurement.

The first matrix used 40 measured draws per case after three warm draws. Some ordered windows were noisy: removing smoke or lighting sometimes appeared slower despite removing the verified work. All results are retained. A bounded second run used 12 warm draws, 20 measured draws per case, then the reverse order. The host was not exclusive; GPU outliers remain. This does not establish a stable GPU speedup.

| Repeat case | CPU mean, round 1 / 2 (ms) | GPU mean, round 1 / 2 (ms) |
| --- | --- | --- |
| Local, all on | 215.38 / 194.93 | 17.98 / 5.91 |
| Local, smoke off | 212.16 / 184.48 | 5.16 / 4.49 |
| Local, lighting off | 213.74 / 188.78 | 5.14 / 7.32 |
| Local, lighting only | 59.96 / 53.30 | 4.63 / 0.40 |
| Building, all on | 202.20 / 199.07 | 10.92 / 5.22 |
| Building, lighting only | 47.98 / 49.17 | 2.97 / 4.33 |

At this fixed state, 3,929 valid fire samples feed up to 3,914 flame calls and 3,929 smoke calls. Building mode replaces one detailed light-clustering call with one aggregate pass over 3,914 contributors and six bounded lights. Lighting-only building mode has zero support-anchor sources; local lighting-only still resolves 1,590. The all-on CPU difference is small relative to variability. The useful proved result is independent work removal and broader spill; no 3–5x rendering-cost claim follows.

Actual JPGs at the same state/camera/exposure:

- [Local all-on](../art/fire-effect-settings/browser/matrix/local_flames-on_smoke-on_lighting-on.jpg) / [building all-on](../art/fire-effect-settings/browser/matrix/building_flames-on_smoke-on_lighting-on.jpg).
- [Local lighting-only](../art/fire-effect-settings/browser/matrix/local_flames-off_smoke-off_lighting-on.jpg) / [building lighting-only](../art/fire-effect-settings/browser/matrix/building_flames-off_smoke-off_lighting-on.jpg).
- [Desktop controls](../art/fire-effect-settings/browser/matrix/settings-controls.jpg), [touch controls](../art/fire-effect-settings/browser/matrix/settings-touch.jpg), [lower cutaway](../art/fire-effect-settings/browser/matrix/cutaway-0.jpg), [upper cutaway](../art/fire-effect-settings/browser/matrix/cutaway-1.jpg).

Remaining work belongs to later bounded passes: wider-map integration, multi-building light budgeting, partial-fire quality tuning and defensible hardware optimization toward the ongoing milestone. `master` remains `c855e627bdee963e930644839a60c027a03935de`; this review does not authorize an untested production replacement.

## Related PR intake

The owner linked [PR #1](https://github.com/Syntaxswine/tinderbox/pull/1) during this handoff. Inspected head `561e4034f79198e150e9a39e7e6b6ec14295d74d`: the full base diff contains 1,252 paths, all under `docs/`; GitHub lists no status checks. This is Claude's review/evidence archive, not a runtime fix, and remains separate. Its round-seven 7/10 rates the reviewer's kernel and written rules. Its furnished-house assessment explicitly ran no workbench probes and did not watch the movie. The archive itself treats the owner's accepted replay as the reference.

Useful follow-up controls are lawn against the walls, radiant share disabled on the house's own surfaces, and a receiving house across a gap. The grass/plinth/output changes in `2026-11-11-another-layer.md` are experiments in that separate kernel; the other proposed features are untested. None is silently imported here, and none of that evidence establishes that these workbench settings fail. No PR merge or new review loop was started.
