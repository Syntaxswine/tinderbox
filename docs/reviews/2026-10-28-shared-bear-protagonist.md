# Shared bear protagonist: architect review

Decision: **candidate checkpoint; browser acceptance and promotion pending**. The public Pages build and `master` remain the reviewed exposition study. This record covers only [Milestone 03](../milestones/03-shared-bear-protagonist.md), not the other workers' later housing, shared-editor, scale or surface-fire work.

The coder delivered **`de447b40e9d2abfafc25a9229a96f4d94c2120a4`**, based directly on reviewed `8a8405681614662a92f9b98fb9b9600bd06d3ad1`, on `codex/bear-protagonist-coder`. Its 37 changed paths are limited to the source closure, bear/gear/art adapters, checks, workbenches and handoff. The architect cherry-picked it as **`27def63`** onto `codex/review-bear-protagonist`. This is a review branch, not promotion to `master`.

## Source and scope

The user requested the existing bear reported through Nautilus Engine. The inspected Nautilus intake still lists it as incoming. Its genuine committed origin is `Syntaxswine/animal-factory-tactics-3d` at **`4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`**. The architect approved that exact source pin for this candidate. See the coder's [source audit](../engineering/bear/source-audit.md) and the [per-file import manifest](../../vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/provenance/bear.json).

The native bear has 10,050 triangles in eight skinned surfaces and 17 bones. Its source painting is the normal worker outfit. Geometry, paint, weights, bone lengths and scale remain native. Four existing Tinderbox tool forms have hand fittings; the flamethrower uses the original AFT model, backpack, hose and anchors. The procedural body is removed. Gameplay, interface, building dimensions and the existing 0.56 m body collider remain the reviewed baseline.

Independent Git-object verification passed for all 19 raw imports, all six evidence references and both recorded, unimported renderer references. The added Three facade has its own recorded hash; all 422 exports are identical objects from Tinderbox's existing r180 implementation. All 25 source-module import edges resolve inside the selected closure. A second renderer implementation is not imported. The MIT notice remains intact; the broader source game/art license remains undeclared as recorded in the manifest.

## Independent geometry and behavior evidence

The architect evaluated the actual skinned vertices and native hand contacts in 540 combinations of the five tools, walking distance, non-cardinal headings and translated positions. Maximum body radius was **0.507417 m**, inside the unchanged 0.56 m collider. Feet stayed at or above ground within floating-point tolerance; the sampled moving body height was at most 1.605846 m. The neutral source height is 1.670846 m. Native scale remained `[1,1,1]`. Transform and palm-contact errors were below `3e-15` m. No doorway or model resizing was needed for the existing 1.4 by 2.3 m gate.

The native stationary flamethrower muzzle is 0.5301 m ahead of the player centre, within the collider. A valid nearby wall beginning 0.60 m ahead therefore leaves the nozzle on the safe side. The resolved 25-ray fan clips before that wall, with a longest ray of 0.649336 m and a visual start at the actual muzzle. The old combined test's assumption that this nozzle must protrude beyond the wall was corrected. Synthetic short-fan tests remain separate checks of cosmetic suppression when a supplied domain excludes a nozzle.

These are CPU pose and simulation measurements, not successful GPU renders. Local independent receipts are `artifacts/qa/bear-source-independent.json`, `artifacts/qa/bear-geometry-independent.json` and their adjacent replay scripts.

## Combined offline and package checks

The architect ran `npm run check` on the combined review tree: **67 tests passed**, with all own-script syntax/import checks, existing/new provenance, shared-Three identities and the art checker passing. Eleven native-bear regressions cover source identity, immutable snapshots/data, limb/contact/bounds behavior, distance and pause, powder timing, missing assets, native paint shader bindings, successful disposal and projection-failure cleanup. The paint tests use an explicitly synthetic renderer API fixture without WebGL.

`npm run build` produced **95 files / 27,501,970 bytes**, labelled milestone 03. `node tools/check-release.mjs` verifies all package hashes and module-relative resources. The old checker incorrectly treated `new URL(path, assetBase)` as relative to its JavaScript file. The architect corrected it to resolve literal module-relative URLs only when their base is `import.meta.url`; feature-specific dynamic bases need their package smoke. `node tools/smoke-bear-package.mjs` passed **26 nested-path HTTP/hash checks**, also deriving the model and paint paths from the actual built adapter's exported asset base and confirming both belong to the packaged manifest. No donor HTTP server or absolute local runtime path is needed.

The combined browser harness now has 12 checks, including actual five-tool UI selection, native model/paint identity and accepted-distance diagnostics. It retains powder/pour, inversion, pause, stock, wall clipping, fire chase, civilian/gate and rebuild coverage. It has **not run successfully** for this candidate. The existing art harness was corrected to use native held-tool diagnostics rather than the removed procedural “Cosmetic lance” object; its actual near-wall GPU probe remains, alongside a separately labelled synthetic short-domain suppression check.

Architecture, workflow, milestone and central provenance references were reviewed. `git diff --check` passes. The one-shot package server stopped in its `finally` path; port **60931** was independently checked and had zero listeners. Its local receipt is `artifacts/TB-012/package-smoke.json`. No preview remains running.

## Browser limitation and restart checkpoint

The in-app browser fails to create WebGL even on the unchanged public exposition build. Its visible error says the fair could not open and requests WebGL 2. Captured renderer diagnostics report `GL_VENDOR=Disabled` and `GL_RENDERER=Disabled`. The app's GPU process has `--use-gl=disabled`; the saved profile acceleration state is already enabled. Chrome is unavailable to the supported browser provider. These observations predate this candidate and do not establish a bear rendering defect.

The user authorized restoring WebGL. Read-only inspection found no exposed supported graphics switch or restart API. No profile, security setting, application binary or app-managed process was changed or terminated. Internal graphics pages were blocked by browser policy and were not accessed through an alternate route. A normal user-coordinated Codex quit/reopen is the next practical recovery attempt; it is not a confirmed fix.

After other active workers finish, quit and reopen Codex normally and return to this chat. Resume from `codex/review-bear-protagonist`, preserving the coder's separate `codex/coding` history. Serve the source root with the repository's bounded preview tooling, then use the visible review controls on `/workbenches/art/shared-bear.html`, `/workbenches/art/` and `/workbenches/integration/`. Verify the actual idle, walking, turning, pouring, held fire and all-five-tool presentation at 1280 by 800 and 390 by 844. Run the combined acceptance suite, resource rebuild/disposal checks and nested-path packaged browser smoke. Record new evidence before promotion.

The repository requires meaningful behavior checks and browser review at the intended scale: **“A failed relevant check blocks promotion.”** Offline source, pose and renderer-API fixture checks do not satisfy that visual gate. No master push, Pages deployment or final appearance approval is authorized by this review decision.

No architect-owned background helper was retained for this review. The bounded, foreground package-smoke server closed before its command exited. Previous architect preview retirements retain their cleanup receipts; app-managed processes were preserved.
