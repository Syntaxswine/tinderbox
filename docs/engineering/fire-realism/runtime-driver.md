# TB-035-H: fire comparison runtime candidate

This diagnostic uses the published Three r180, actual `createArtScene`, native character attachments, authoritative simulation and the artist's renderer-injected factory. Production still defaults to the published `createFire`. It is an implementation candidate; it has not established visual quality or GPU savings.

## Driver and controls

`workbenches/fire-realism/driver.js` exports the architect's v1 modes, scenarios and async `createFireReviewDriver({root,uiRoot,mountUI,onChange,signal,artistDelivery,referenceAcceptance})`. The UI specialist owns the HTML/CSS/review controller. Callers supply a canvas root and may mount the existing six-control HUD. Methods are `configure`, `play`, `pause`, `reset`, `step`, `seek`, `measure`, `cancelMeasurement`, `state`, `dispose`. Configuration and seeking are blocked during measurement; cancellation must finish before a new run. A missing mode suppresses its effect with an explicit availability reason.

`captureFrame({quality:.92})` is an additive method: it renders the current actual WebGL view and immediately returns a JPEG data URL, exact frame/configuration, source fingerprints and hardware metadata. It does not manufacture a render when WebGL is unavailable. A JPEG proves only a still, not motion or a valid GPU target. The UI can save this response with the corresponding JSON record; actual browser screenshots and animated review remain necessary.

The root has `data-fire-review-phase`; a child `<script type="application/json" data-fire-review-driver-state>` contains the detached state/report for supported DOM inspection. This is a diagnostic hook, not a browser-control backdoor. Notifications and DOM updates occur outside timer queries and at most four times per second while playing/measuring. The complete raw measurement report is exposed after completion. No CDP, browser flags or unsupported automation is used.

The fixtures are explicit diagnostics. Match contact uses exactly one combustible 1 m tile (four .5 m cells); torch uses the actual finite world-time inventory and repeated press; normal and powder gasoline use actual accepted movement and pouring; the jet meets a real rendered masonry obstacle resolved by the simulation. Street fire uses the full 51 by 47 m Catalogue Street with 9,588 cells and its eight native houses. The requested 32/128/512 seeds are actual initial wood fuel-cell ignitions. They are not promised steady burning populations: actual spread, burnout and current counts are retained and reported. This does not add fuel simulation to landmark visits.

## Frozen mode deliveries and quality receipts

The initial flat `artistDelivery` is shorthand only for the reference delivery. Future optimization uses separate immutable closures:

```js
artistDelivery = {
  byMode: {
    reference: { sourceCommit: 'R', manifestUrl, createFireRealism },
    optimized: {
      sourceCommit: 'O', manifestUrl, createFireRealism,
      retainedQualityAcceptance: {
        kind: 'architect-fire-optimized-acceptance-v1',
        receiptId: 'review record', status: 'accepted',
        sourceCommit: 'O', referenceCommit: 'R',
        runtimeFiles: { 'assets/art/fire-realism/optimized/file.js': 'sha256' }
      }
    }
  }
};
referenceAcceptance = {
  kind: 'architect-fire-reference-acceptance-v1',
  receiptId: 'review record', status: 'accepted', sourceCommit: 'R',
  runtimeFiles: { 'assets/art/fire-realism/reference/file.js': 'sha256' }
};
```

Each manifest is inside this project's assets, lists its self-contained runtime files and hashes, and is verified against the actual fetched bytes using Web Crypto. The optimized mode requires its own actual factory and a manifest declaring `optimizedAvailable:true`; its export is instantiated and disposed before becoming available. A flat availability or quality flag proves nothing. Default local reference rendering is allowed with a null source commit and is visibly unaccepted. The frozen high-detail closure must be preserved while O changes; the old R receipt cannot validate changing router/shader bytes. Architect review, rather than the receipt's presence alone, establishes that its statements are true.

## Prepared frame and ownership

`src/art/fire-frame.js` prepares detached v1 records. Player/world clocks come from the authoritative snapshot; pause deltas are zero. Native muzzle position and quaternion come from the real attachment; the selected torch's tip uses its native muzzle. Camera matrices are detached column-major arrays. Fuel-mask wrapper objects are detached, with an explicitly borrowed texture handle. Generation changes and rewinds reset/prime event receipts; old undated events do not replay.

`eventReceipts` is `{generation,primed,highestId,events:[{...authoritativeEvent,receivedWorldTime}],reset}`. All IDs/types retain their authoritative values. `buildingVisuals` is only actual rendered housing with burning cells in its existing fuel-group footprint, using the simulation's cell-overlap rule. Its records are `{id,prefabId,destroyed,burnedFraction,sourceBounds:{min,max},footprintCellIds,burningCellIds,intensity}`. Source bounds come from current native source geometry. Nearby burning grass cannot ignite an invented facade; this record does not create upper-floor heat.

`src/art/scene-depth.js` creates a fire-specific depth target at the real drawing-buffer dimensions. `opaqueDepth` is `{valid:true,texture,width,height,convention:'webgl-depth-0-1',viewProjectionMatrix,projectionMatrixInverse,cameraWorldMatrix}`. Its texture is borrowed by the artist. Preparation uses actual original materials, preserving alpha-tested holes and current visibility; transparent, partial-opacity or non-depth-writing materials are excluded, including the existing 18% ghosted houses. Original material visibility, render target, viewport/scissor, clearing and shadow-update state are restored even on failure. All fire roots are excluded. This preparation is inside the fire GPU query and is omitted from no-fire.

`src/art/fire-review-effect.js` renders one selected mode. Reference/optimized modes retain a separately labelled published Molotov/barrel transient component until replaced deliberately; it receives no ground cells, discharge or lit torch, so these are not doubled. Its work/resources are included. The old nozzle-visibility diagnostic object remains available; it uses the published fan-membership rule, while artist-specific status remains nested separately. Disposing the driver releases art, native source resource owners, simulation, queries, render target and the owned context/canvas.

## Measurement protocol and limits

Defaults are 120 warm-up frames, 600 measured frames, three interleaved trials per selected mode, with a paired identical no-fire pass per trial/mode. Every pass rebuilds the native presentation owners and replays the same real simulation at 1/60 second to a declared active pose. Match defaults to frame 45, torch to 90 and the remaining cases to 60. Its actual full snapshot, native attachment transforms, source appearance and actual fuel-mask pixels are SHA-256 fingerprinted. The fuel/tool/native pose and masks are then frozen; only presentation clocks advance at their declared normal or powder ratios. Sustained emission is explicitly a benchmark adaptation, not played gameplay. This avoids credit from mostly empty frames after a small fire burns out. Empty canonical poses reject. Per-frame workload SHA-256 fingerprints must match exactly across modes. Live playback/stepping remains the separate gameplay and motion review. Existing transient tails expire on their normal finite clocks, with expected IDs and observed legacy/artist occupancy recorded separately. The real fire depth preparation, old transients, lighting and final scene rendering all fall inside the GPU elapsed query. Capture/reset setup occurs outside per-frame GPU queries and records setup wall time plus owned resource counts. Native presentation owners rebuild between passes so animation blending cannot contaminate the next mode. No-fire retains the same frozen world, native pose, fuel-field presentation, camera and HUD but omits every selected fire effect and fire-specific depth pass. One mode renders at a time, at equal environment lighting, pixel ratio and output resolution. Global tone mapping is the published `NoToneMapping`, with sRGB output.

`EXT_disjoint_timer_query_webgl2` results are converted from actual nanoseconds; disjoint, zero/invalid, missing, cancelled, timeout and overflow samples cannot pass. Reports keep absolute GPU medians/p95/variance, raw trials, paired incremental differences, noise thresholds, CPU update/submission/simulation time, frame intervals, draws and resource counts separately. Negative or noisy subtraction is inconclusive. Quality acceptance and the optimized/reference GPU ratio are separate fields. The target cannot be true without matching R/O quality receipts plus valid comparable trials. The 20–33% claim remains unmeasured until actual identified hardware runs these cases. A phone-shaped viewport is explicitly not phone hardware.

The current backend's WebGL availability is an architect review issue. The focused offline tests validate data/lifecycle/statistical rejection and actual simulation behavior; fake renderer/query fixtures do not compile shaders, prove occlusion pixels, establish motion quality or measure real GPU cost. No browser helper was launched by this runtime assignment.

## Candidate validation, 2026-10-30

Base: architect `93b59fa`, including the initial artist `3f7b8f3` candidate. The artist's later corrective candidate is a separate exact architect intake; these checks do not claim to have integrated it. No source assets or shaders were edited by this runtime assignment.

`node tools/check.mjs` passed 199 source tests, syntax for 157 own scripts, 195 resolved static modules, one shared Three pair, pinned provenance, and the existing art checks. A subsequent isolated playback-clock correction adds a four-frame-rate check; the focused suite now passes all 14 tests. `node --check workbenches/fire-realism/driver.js` and `git diff --check` pass. Live playback uses a fixed-step accumulator, preserving ten seconds of simulation at 30/60/120/144 Hz rather than accelerating on fast displays.

`node tools/build.mjs` passed: 3,463 public files, 163,337,200 bytes. A package inventory check verified the four frozen published fire-source hashes, runtime seam presence and exclusion of private workbenches/tools/reference sources/docs/artifacts. No HTTP server or browser helper was launched; no disposable helper remains. These package/offline checks do not prove an actual rendered frame, shader compilation, animated realism, matched HUD readability or GPU target. The reference remains unfrozen and the optimized mode unavailable until separately delivered and reviewed.

The driver's source report includes verified canonical-LF hashes of the four published current-fire modules and actual canonical-LF hashes for the comparison adapters/tools/driver. This normalization is only for owned JavaScript source comparison; embedded source assets retain their original byte-level provenance. A changed current-fire module rejects the control rather than quietly changing the baseline.