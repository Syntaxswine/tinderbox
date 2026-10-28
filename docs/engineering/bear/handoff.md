# TB-012 candidate handoff

Branch: `codex/bear-protagonist-coder`, based solely on reviewed `8a8405681614662a92f9b98fb9b9600bd06d3ad1`. The prior `codex/coding` commit `213eb222695238a5176fb43b20666cdcbd15dd57` is preserved and not merged. The candidate SHA is delivered with the final Git handoff.

## Result and source

The production art composition loads the genuine AFT bear, original normal painting and native rig from approved **4f5f53917990ec03b2f14c65f067e4b99ec8fcaa**. See [the source audit](source-audit.md) and [immutable import manifest](../../../vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/provenance/bear.json). Nineteen raw files remain byte-identical. One clearly recorded Three facade uses the existing r180 implementation; the source renderer files are evidence references, not a second implementation.

`src/reuse/bear.js` owns loading, native poses, accepted-distance gait, finite world anchors and disposal. `src/reuse/bear-tools.js` fits the four existing Tinderbox prop forms and the original AFT flamethrower to reachable native hand contacts. The flamethrower retains its geometry, tank and hose; its carry faces +X with a stationary muzzle 0.5301 m ahead. It is inside the unchanged 0.56 m body collider. Near-wall discharge remains governed by the existing resolved mask; no heat/range/clipping logic was changed.

The old procedural body is removed. `src/art/bear.js` retains a compatibility export for `BEAR_SPEC`. Missing native model/paint or an incompatible borrowed renderer fails clearly. Native paint projection restores borrowed renderer state and releases captured temporary projection allocations even if setup throws. There is no fallback bear.

Production simulation and UI files are unchanged. The original body, painting registration, bones, origins, scale, existing five tools, drugs, stock, inversion and player/world clocks are preserved. Native body height is about 1.671 m, not the old provisional 2.02 m. No collider or doorway was changed to fit it. Detailed skin-envelope sampling is explicit, rather than per frame.

## Scene API and review

`createArtScene` still accepts borrowed `THREE`, `scene`, `renderer` and the Farmyard `assetBaseUrl`. An optional `bearAssetBaseUrl` addresses only the new AFT bundle; by default it resolves relative to the installed module, including nested hosting paths. Existing fire/world/civilian assets keep their own base.

The view retains `root`, `anchors`, `update`, `setHeldVisible`, `dispose` and resource counts. `art.diagnostics().bear` keeps its resource-count fields. Additive `bearProtagonist` derives actual body triangle/skinned-mesh/bone counts, native scale, selected/visible tool roots, source identity, finite world anchors, pose evaluations and disposed state. `art.sampleBearBounds()` explicitly samples actual posed skin vertices and supplies the cached body envelope for review. The default rifle never appears.

Open **`workbenches/art/shared-bear.html`** through the existing preview tool when WebGL is available. Its visible **Run review** button writes JSON into `#review-output`, exercises each tool and accepted walking poses, checks body clearance and paused anchors, and reports actual renderer counts. Manual controls cover selection, walking, turning, pouring/held fire, powder and pause. The standard exposition workbench's old body-visibility lookup and the earlier art workbench's provisional label are updated. Workbenches remain outside the production distribution.

## Checks and acceptance limits

- `npm run check`: syntax/import closure, every existing/new provenance hash, one Three implementation plus exact facade identities, all 67 repository tests, and the art checker.
- Eleven focused native-bear checks cover immutable data/snapshots, eight skinned surfaces/17 bones/10,050 triangles, 240 fitted-tool walking/heading samples, native joint lengths and hand contacts, unchanged collider/gate clearance, accepted-distance/pause/powder timing, mask-controlled nozzle visibility, the original near-wall fixture's native nozzle and fan, missing assets/renderer, normal-paint projection bindings, disposal and projection-failure cleanup.
- Paint tests use a synthetic **renderer API fixture without WebGL**. They establish bindings/resource behavior, not successful GPU compilation, paint coverage or appearance.
- `npm run build`: self-contained production distribution. `node tools/smoke-bear-package.mjs`: 26 nested-path HTTP resource/hash checks, including the model, original painting, closure and facade. The one-shot server closes in `finally` and has a real 30-second timeout. Its receipt is ignored at `artifacts/TB-012/package-smoke.json`.
- `git diff --check`: whitespace/reference review; no simulation/UI changes or unrelated branch intake.

**Visual acceptance remains pending.** The architect reports that even the unchanged public game fails to create WebGL in the available browser (`GL_VENDOR`/`GL_RENDERER` disabled). No successful browser render, shader appearance check, phone-device performance result or combined visual approval is claimed. The root architect owns recovery and the actual desktop/phone, five-tool, near-wall, repeated-rebuild and publication gate. This candidate is not promoted or published by the coder.

No retained preview was needed. The source audit used short-lived commands; the package smoke server closes before exit. Existing recorded coder helpers were checked and already exited. Source/checkpoint evidence is preserved in Git plus ignored `artifacts/TB-012/` (audit script, source/hash measurements and package receipt). Restart previews deliberately under the helper lifecycle policy; no automatic publication/restart command was installed.
