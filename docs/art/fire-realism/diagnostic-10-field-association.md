# Controlled field-association diagnostic

This fixture-only child follows `877253ff9f46e82315973ac7937744f4e0161ae2`. All five runtime fire assets and their manifest remain byte-identical to `13ad95c2d131e3dab28e775c1d33c121ea50d5ed`. It changes no optical coefficients, smoke field, geometry, fuel masks, source clocks, resolution, global exposure or HDR pipeline. The new option is a controlled diagnostic, not a runtime fix or accepted quality/performance mode.

## Inspected actual evidence

The architect's native1280x800 cohort is `artifacts/qa/fire-realism/render-round-13-controlled-diagnostic09/` in the primary checkout. I viewed exact phase60 All32/flame32/flame64 and phase120 All32/flame32/smoke32 JPEGs. At60, smoke covers much of the orange upper reaction; flame-only has clearer tips, but remains pale. The32/64 flame views are very close. At120, flame-only is itself faint, so smoke does not explain the whole failure. This evidence supports separating a compositing loss from insufficient integrated reaction; it does not justify hiding smoke or merely doubling samples.

The actual framebuffer receipt reports RGBA8, LINEAR9729 and UNSIGNED_NORMALIZED35863 with zero attachment-query errors. At black background/alpha0.25, linear0.25 gives34RGB and linear0.75 gives56RGB for both paths; linear1.65 gives straight64RGB versus correctly associated79RGB. That confirms an above-unit loss in this measured path, not the magnitude of its contribution to the complete fire. Pinned Three's actual context reports alpha:true/premultipliedAlpha:true/preserveDrawingBuffer:true; those measured attributes remain visible, without inferring an application bug from constructor options.

## Exact controlled change

The new **Field blend** selector defaults to **Straight - original**. In that state, All32 still submits the exact original material, arrays, instance order/count, lights and shader. **Associated after conversion - diagnostic** uses a bounded cached fixture material with the same uniform wrappers and borrowed textures. Its fragment body adds exactly `gl_FragColor.rgb*=gl_FragColor.a;` immediately after the sole colorspace include. Final alpha already contains player legibility. Matching `premultipliedAlpha:true` with NormalBlending selects the required ONE source factor; a state-only change is not used.

This combines independently with All/Flame/Smoke and32/64 controls. The64 option still changes only the regional march count/spacing. The cache owns at most three derived materials: straight64, associated32 and associated64. It does not own original material or shared textures. All original arrays/material/count/render hook restore in `finally`, including failed draw callbacks; page disposal releases each derived material once.

Capture names now end in `-straight` or `-associated`. Visible frozen metadata records the selected variant, all four exact expanded shader-body hashes, original/derived material flags, and actual GL blend state sampled in the fire mesh's public `onAfterRender` callback before restoration. This is the field draw's state, not a guess from whichever object ends the scene. The original callback is forwarded and restored. The existing in-page actual JPEG data image/link and paired metadata remain the capture path; no automatic downloads or browser hooks are added.

## Root capture procedure and interpretation

Reload the existing art fixture, select **DIAGNOSTIC: frozen native match**, keep phase/view/layer/samples fixed, and alternate **Straight - original** versus **Associated after conversion - diagnostic**. Capture both. Start with phase60/120 Flame32, then All32; compare Smoke32 to confirm any sub-unit smoke change is within expected quantization.32/64 remains available for a separate sampling comparison. Verify shaderFailure:null, identical source IDs/camera/depth/player/underlay/lights, selected hash, actual source factors SRC_ALPHA770 versus ONE1, and successful restoration.

A brighter measured field would establish a bounded compositor contribution, not sufficient flame quality. If phase120 remains weak without smoke even under correct association, narrow-sheet duty cycle and ray-integrated extinction/emission still require controlled calibration. Actual native captures/motion and hostile review must judge that next. No current image or unit readback approves a reference baseline, HDR rewrite or optimization.

## Checks

`check-diagnostics.mjs` verifies all six13ad files unchanged, exact final-alpha insertion and32/64 override composition, unchanged other material flags/uniform wrappers, all12 layer/sample/association round trips, actual-state recorder hook forwarding/restoration, bounded material cache/disposal and no disposal of original material/borrowed textures. Existing frozen-source, live-mask, camera, exception, opaque-depth, blend-probe and aborted-load checks remain. The recorder's fake lifecycle surface is not actual GPU evidence. Actual field compilation/readbacks and interpretation remain the architect's next step. No helper, browser or server is started by this child.

Focused diagnostic checks, both changed JS syntax checks, the shared reviewed dossier/source subset 2/2, and `git diff --check` pass. The unchanged six runtime blobs are checked directly against 13ad Git bytes. A new full payload build was not run for this fixture-only extension. Expanded fragment SHA256 before Three includes: associated32 `cc3b31113f0777d58d3dd4e721b2d1de940ced8e23c3f3b295362db8515f4ad5`, associated64 `494b24eacdfef42fc62bdb85127529360a9bc65b8979e6f10ff486ac3547dd14`; original32/64 remain `155242d08a025a19afb06a0085256d8d122da4b0ba0512f570e23a52c4d57f95` and `169e955edd99767e4b318d51a7880ff1bcb992d962d765f8835252bb27387324`.
