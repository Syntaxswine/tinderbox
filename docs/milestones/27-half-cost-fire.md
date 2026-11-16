# Half-cost fire presentation

Owner instruction, November 16: keep the current fire looking as good or better while trying to halve its cost. Base: `d5b43dd5446d93dd263d1234e12ed1551743de56`, published runtime `80fa4f59`. Preserve M26's quick grass/finite energy, image sharing and cleanup, plus M25's native body shroud. This is a bounded optimization, not a replacement fire system or map expansion.

## Target and reference

Use **current production Catalogue Street** as the reference. Historical furnished-house timings are investigation clues, not today's denominator. Retain the original/current implementation and evidence unchanged.

Target **at least 50% less fire-presentation cost** in a representative visibly burning current-production scene, at the same normal zoom, camera, exposure and dimensions, with flames, smoke and firelight on. Measure publication/preparation/render-submission CPU and GPU rendering separately; these overlap and cannot be added into FPS. Coder supplies one shared baseline; architect freezes its dominant limiting metric and workload before optimization. Aim for mean and p95 at no more than half baseline in a bounded counterbalanced comparison, without materially regressing the other resource. Also report full-frame costs. Halving the fire contribution does not promise twice game FPS or half startup memory.

One authoritative current input/frame sequence feeds both paths. Reuse a compatible replay/prefix or generate **one bounded production sequence**, not a long-burn library. Include growing wall/roof fire, smoke/light and nearby ground fire; retain a small actually burning moving-character control. Record source and visible-work counts. No hiding fire, zooming away or changing fuel to hit the number.

Primary timings advance through new native states at normal cadence. A repeatedly paused frame or extra duplicate presentations cannot establish the target; paused frames are image/redraw controls only. Keep state/time/pose/wind inputs matched. Preserve exact thermal states/events, clocks/powder, finite budgets, native geometry, support/destruction, witnesses and authoritative off-screen heat. No quality channel is disabled by default.

## Workers and ownership

### Frozen baseline, November 16

The one current-production baseline is accepted after visual inspection of `growing-later.jpg`. Primary case: `growing-later`, world 24.033333–26.000000, native ticks 721–780, 60 new native states. It has 616–777 structural sources and 6–14 actual positive roof sources, with the shop's normal cutaway/follow presentation, visible flames/smoke/firelight and an active native character. Earlier growth and actual moving-body oil-contact controls are retained. Page 1280 × 800, 3D viewport 1280 × 494, orthographic span 12.6 m, zoom 1, follow camera target ending [42.81,0,15.8]. Hardware: NVIDIA RTX 3080 / ANGLE D3D11, Edge 157. This is desktop evidence only.

Freeze the primary metric as the **per-new-state CPU sum `physicalPublicationMs + artMs`**, two sequential CPU phases: **mean 28.050000 ms, p95 35.100000 ms**. Targets are **mean <=14.025000 ms and p95 <=17.550000 ms**, also requiring at least 50% improvement against the matched counterbalanced reference. Compute p95 from each frame's sum, not by adding separate percentiles. Full simulation already includes publication; do not double-count it in total-frame reporting. The dominant visual substage is native structure preparation (mean 16.653 ms), with ground/body fire at 2.308 ms. Physics itself is outside this optimization.

Render submission is separately 6.510 ms mean; actual non-disjoint GPU render time is 9.435 ms mean / 12.612 ms p95 versus quiet 8.366 ms mean. These whole-scene values are reported and guarded, not added to CPU or called the saved fire cost. Investigate any reproducible >10% GPU mean/p95 regression in the matched comparison. Keep all raw values/outliers.

Independent full reference package: 3,546 files / 183,182,807 bytes, manifest `a4c1279456b84f8729f63844268a5c5904401c294be134f1e0c89c031692d2b4` (current production plus symmetric optional timing hook). The original 1,560-state sequence, hash `51e2ac77caf403be67831c0841d63b59bb123f7863dc11ed4de1cee4f9ae3e57`, and scalar/image/cleanup evidence are in the coder's ignored `artifacts/qa/fire-half-cost/baseline/`. The full packet archive is large and stays uncommitted; preserve the input/source/hash/restart references.

Final primary timings must actually execute both publication and art through each independent code path on the same current inputs. Packet replay alone may compare isolated art/output, but cannot claim saved publication from old recorded timing fields. Avoid retaining full historical snapshots in final timed comparison; capture only scalar data there, with matching reference/candidate collection policy. Retain this first recording's data and report both the frozen absolute budget and fresh paired ratios, so harness memory effects cannot manufacture the result. Baseline helper exited successfully, released ports 63614/63615 and reports zero tracked GL ownership. Runtime optimization is now authorized within the file boundaries below.

Reuse existing chats/worktrees and preserve M26 branches. Task branches start from the exact common contract commit supplied after this brief. No new worker, worktree, UI task or standing service.

| Owner | Branch and files |
| --- | --- |
| Architect | `codex/review-fire-half-cost`: contract, frozen denominator, combined quality and promotion |
| Coder | `codex/fire-half-cost-code`: shared benchmark/replay, runtime/publication allocations, `art/source/catalogue-modular/frame-view.js`, `src/runtime/`, `src/art/{index,fire,street-firelight}.js`, relevant tests/engineering evidence |
| Artist | `codex/fire-half-cost-art`: `art/source/catalogue-modular/thermal-art.js`, `workbenches/catalogue-modular/art.js`, `art/source/furnished-house/{shroud,presentation,visibility}.js`, `src/reuse/ashland/splats.js`, focused controls/visual evidence |

First audit without edits/helpers, agree measurement and call boundaries, then implement assigned files after common-brief dispatch. No overlapping source edits. Publication work preserves detached/immutable contracts and thermal outcomes. Keep M26 Source-pool disposal. Native character splats are a separate module, `src/art/character-shroud/splats.js`; leave it unchanged unless a measured need justifies an architect boundary adjustment. Ashland splat changes require cottage/shared-effect compatibility. Donor/vendor and other checkouts stay read-only.

Prefer removing repeated support/footprint/group/seed work, correct caching of stable geometry, buffer reuse and preparation only when inputs change. Separate anchors from animation. Ground fire is already instanced and lighting pooled; do not claim those as new savings. GPU animation/grouping needs measured justification and equivalent motion/coverage. Pose, wind, camera, door, falling fuel and collapse must invalidate relevant caches.

Preserve low grounded flames, small directional details, wind response, smoke drift, broad night illumination, wall/corner/roof/floor coverage and close moving-body attachment. Off-camera flames can still cast visible light or smoke. Use conservative independent bounds. No replacement volumetric renderer or new per-source occlusion sweep by default. Half-resolution effect buffers require a later measured GPU-fill proposal with depth/edge/memory tradeoffs reviewed first.

## One shared experiment

Coder owns the only measurement/browser session and shares scalar subsystem data and normal-zoom captures with artist. Artist starts no competing render/probe. Architect runs no heavy checks/build/capture during measurement. Never stop unrelated applications/builds. Record CPU, supported GPU elapsed queries/disjoint results and logical allocation estimates separately. Unknown GPU time stays unknown; proxy counts are not milliseconds.

Use finite warm-up and short counterbalanced baseline/candidate blocks at the same state/time/camera/pose/wind/light conditions. Screenshots, encoding, full JSON/gzip exports and diagnostics stay outside timed intervals. Capture matched normal-zoom clips/JPGs separately. Report allocations/uploads, source/splat/draw/light counts, missing/culled owners and reset/disposal. No benchmark-only skipping.

Helpers need owner, exact PID/creation identity, purpose/end condition, saved source/restart/output references, a real automatic deadline and verified process/port cleanup. Inspect existing receipts first; reuse the bounded review helper and stop after its purpose. No retained preview is required. Preserve failed evidence.

## Delivery and gate

Checkpoint coherent passing source **before** the final handoff so architect review overlaps concise documentation. Supply exact commits/paths, a compact before/after table, raw references, the frozen metric and meaningful controls. No historical long-burn sweeps or repeated fire narratives.

Cache/allocation changes should preserve affected-world output. Compare affected flame/smoke/light regions, not a whole-image score dominated by unrelated HUD pixels. Changed CPU/GPU animation needs normal-zoom temporal review of motion, wind, footprint/clothing attachment, smoke silhouette and illumination; whole-image RMS alone is insufficient. Reject missing sources, floating fire, popping after camera/door/reset, swimming body fire, weakened spread and leaks.

Run focused controls, then one exact combined repository/build/nested-path/browser gate. Architect alone promotes. Report actual savings and limits if 50% is missed; no partial saving is relabelled as success. Failed relevant checks block promotion. A passing correction follows normal Git/Pages delivery and live verification. Actual iPhone Safari and startup heap remain distinct from desktop fire-rendering evidence.
