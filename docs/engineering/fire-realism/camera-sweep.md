# Review camera sweep candidate

This is a private workbench camera path, independent of the game camera and fire simulation. `tools/fire-realism/camera.js` is unchanged (canonical-LF SHA-256 `f6e1fe0d79e7de293628f457dd6890714689d5bcd81629eae29754014d89e5c4`). No art, geometry, shader, fuel, clock, viewport or public-package input changes belong to this candidate. Animated WebGL review remains the architect's next gate.

## Driver and UI boundary

The driver exposes these additive methods:

```js
await driver.startCameraSweep({preset:'contact-street-yaw-v1'});
driver.stopCameraSweep({restoreStatic:false}); // interrupted view held for encoder drain
driver.stopCameraSweep({restoreStatic:true});  // restore before controls unlock
const evidence = driver.cameraSweepEvidence(); // one terminal export, then null
```

`startCameraSweep` is asynchronous because the complete support point list is hashed using Web Crypto. It accepts only the named preset. It reports compact `status:'preparing'` while validating, then resolves with `status:'running'`. Stop/disposal invalidates the pending generation; a cancelled preparation rejects with `AbortError` and cannot activate later. A new valid preparation retires a previous unexported full ledger before the asynchronous hash; an invalid preset or unsupported scene does not retire it. Export an earlier run before starting another.

`stopCameraSweep` is synchronous. The `false` option stops motion without moving the last view; the terminal status becomes `interrupted`, and a non-base held view has `restored:false`. The UI may retain that view only through encoder retirement. It must call `true` in all completion, discard, failure and disposal paths before unlocking controls. Restoration preserves the terminal status, elapsed time, sample count and captured endpoint. A restoration draw is separate from that endpoint. Evidence is unavailable during preparation, active motion, measurement or after disposal.

`state().cameraSweep` contains only `{supported,active,status,progress,preset,reason,restored,elapsedSeconds,durationSeconds,sampledDraws}`. Status values are `unavailable`, `idle`, `preparing`, `running`, `complete`, `interrupted` and `cancelled`. The full ledger is never copied into state, notifications or the DOM state JSON. The UI owns recorder controls and must put the one-time ledger in its separate video metadata, preserving source/configuration/hardware identity and whether world playback was live or paused.

## Path, containment and supported scenes

`contact-street-yaw-v1` lasts eight monotonic seconds. Its world-Y yaw is 0, +8, -8, 0 degrees at progress 0, .25, .75, 1, with smoothstep easing on each segment. It preserves the original focus, distance, elevation, frustum, projection, pixel ratio and resolution. Start and natural end use the exact saved camera record; no refit or zoom occurs. Hidden tabs cancel the path instead of treating an unobserved jump as continuous review.

The bounded support provider reads the actual native actor and held-tool hierarchy through their real attachment ancestors, with world-transformed native/skinned vertices. A conservative radial box around those vertices covers the canonical first-tick aim rotation. It does not shrink the animal. Hidden/destroyed source ancestors, missing native provenance and unsupported instanced geometry reject the preset. The source guard rejects movement, pouring, other selected tools, live discharge, flying projectiles and explosion history. A changed supported source pose during playback cancels and restores the path.

Contact requires the exact four half-metre grass cells centred on (5.5, 8.5), without extra liquid fuel or other burning material. Its conservative fire/smoke box is radius 1.73 m horizontally, Y [-.087, 3.826] m. This is derived from the unchanged R09 implementation at `e42533a7e95557ad9e0e40ccec9f1dcb0efc4dd9`: `assets/art/fire-realism/index.js` regional radius <= .852027958 m, shape height <= 2.28 m, tail 3.2 seconds and normalized horizontal axis .22; `smoke-billows.js` local radial support <= .23 + 1.22*(.24+.64)*1.14 = 1.453904, with vertex billow Y in [0,1]. The rise bound is .18 + 3.2*.36 m. The joint extrema include the complete canonical active/spent sequence and also contain the smaller published smoke cards. They do not establish support for arbitrary fuel, jets, explosions or a future changed effect. Reference/optimized must expose the reviewed four-billow setting; the assigned checkout's older 0.1 art is not relabelled as R09. Actual source fingerprints travel with each run.

Street includes every actual visible Ashland structure vertex and the same 253-cell native wood footprint, plus the existing declared source-smoke margin (2 m laterally, Y up to 6.5 m) from the unchanged static camera policy. This is the intended Ashland action view, not a whole-map guarantee for later spread to other houses. The underlying scene, fire and streaming remain unchanged.

Containment is analytical across the whole continuous path. Each orthographic projected coordinate is `a*cos(yaw)+b*sin(yaw)+c`; the validator checks both interval ends and every derivative stationary point in [-8,+8] degrees. All actual support coordinates must stay within absolute normalized clip coordinate .999 on X/Y/Z. Independent dense projections verify the implementation. The point list is capped at 100,000, source-hashed and not put in cloned UI state.

Actual native-source checks give this availability with unchanged fixed framing:

| Scene | 1280x800 isometric / oblique | 390x844 isometric / oblique |
| --- | --- | --- |
| Contact | supported / supported | unsupported / unsupported |
| Street | supported / supported | supported / supported |

Portrait contact reaches absolute clip X 1.49594, so the preset reports unsupported without zooming. Portrait street's maximum clip X is .95635 / .96034. These are native source/projection checks, not WebGL pixels or proof of visible quality.

## Scheduling, pause and cost boundaries

There is one owned RAF. Live playback retains the exact existing fixed-step simulation/receipt cadence and one final scene presentation/draw per callback. If camera motion occurs in a zero-step callback, it refreshes art with `paused:true` before that draw. A paused sweep refreshes only camera-dependent art/depth/sorting/UI, using the unchanged full simulation snapshot and clocks with zero deltas. The selected camera reaches both the detached fire packet and the opaque depth preparation for the same draw. Manual captures while active are truthfully additional recorded draws, with no RAF callback timestamp.

Configuration, step, seek, reset, source changes, context/render/observer errors and disposal cancel/restore. Natural completion records its restored endpoint draw before emitting the complete notification. A paused camera-only loop then stops; live world playback may continue until the recorder pauses it. GPU measurement rejects active, preparing or non-restored motion before measurement entry, prior-report clearing, notifications or query allocation. No sweep update executes during trials. This diagnostic review work has no optimization or GPU-cost credit.

## Evidence record

`cameraSweepEvidence()` returns a detached `version:1`, `kind:'review-camera-sweep-evidence'` record containing `preset`, `status`, `reason`, `path`, `configuration`, `sourceFingerprints`, `support`, `start`, `end`, `samples`, `sampledDraws`, `restoration`, `limits`, `elapsedSeconds`, `progress` and `yawDegrees`. `path` includes the exact base camera, focus, knot values and easing. `support` includes source references, native counts, guard, point SHA-256 and analytical validation results. The maximum is 4,096 draws; overflow cancels/restores and errors rather than dropping samples.

Start/end contain monotonic time, full camera and `{frameIndex,tick,worldTime,playerTime,worldPaused}`. The camera record contains position, quaternion, up, scale, local/world/inverse matrices, projection/inverse matrices and all orthographic frustum values. Each sample contains its sequential render index, nullable RAF callback time, draw time, path elapsed/progress/yaw, the world fields, position and quaternion. Restoration records whether the exact base was subsequently drawn, with its own time/world fields. Interrupted `end` retains the last successfully drawn view, even after restoration. The ledger's callback/draw times are not encoded-video PTS or a claim to map every encoded frame to a simulation tick.

## Validation and limits

`camera-sweep.test.mjs` exercises real simulation/native bear/Ashland geometry, all four modes' identical static matrices, both views/aspects, analytical and dense projection bounds, hidden sources, canonical support, finite tail formulas, exact restore, interrupted hold, one-time export, cancellation/disposal and ledger overflow. `camera-sweep-driver.test.mjs` launches one finite API fixture using the actual driver, simulation, native models, frame/depth adapter and manual RAF. It compares exact paused/full live snapshots, anchors and current-camera depth matrices; checks one main draw per callback, unchanged six-step live endpoint, repeated starts, cost-entry rejection and disposal of owned resources. Its renderer, timer and video transport are explicit fixtures, so it provides no shader compilation, rendered occlusion, animation-quality or GPU evidence. Root must pair the runtime and separate UI candidates for actual live/paused WebGL clips.

Final candidate checks: `node tools/check.mjs` passes 252 tests, syntax for 179 owned scripts, 216 resolved static modules, shared-Three/provenance and existing art checks. The focused sweep/driver/results suites pass six tests. `git diff --check` passes. Only private workbench/tool/test/documentation files change, so this candidate has no changed public-package inputs. No server, browser or retained helper was created; the finite API test child exits and disposes its owned RAF/query/native/renderer resources. No actual WebGL, moving-camera visual acceptance or GPU savings are claimed.
