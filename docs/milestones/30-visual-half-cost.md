# Another half of visual cost

Owner request, 2026-11-22: use hill climbing to try to halve visual expense and
improve performance. Start from `7164932e9cc5752de08e08b314c7d03fe2e659f0`.
The [previous half-cost pass](../reviews/2026-11-16-half-cost-fire.md) is already
in this baseline. Its older reference and timing values are not this task's
denominator. New York's accepted internal coupled checkpoint stays preserved;
this task does not renew its actual-source/compiler allowances or enable it.

## Work and ownership

Reuse the existing coder and artist chats/worktrees. No new chats/worktrees or
standing helpers. Preserve all existing branches and unrelated WIP. Architect
uses `codex/review-visual-half-cost`. After the common contract is committed,
coder creates `codex/visual-half-cost-code` and artist creates
`codex/visual-half-cost-art` from that exact commit in their existing checkouts.
The coder's unrelated `support-regions-proposal.md` must remain byte-identical
to SHA-256 `56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f`;
never stage it, discard it or import it. Stop on a branch-switch conflict.

First phase is read-only audit and measurement planning. Do not edit runtime,
start helpers, run browsers/builds, transform map sources or regenerate old
recordings yet. Each worker returns a compact final audit or actual blocker:

- Coder: inventory the current presentation costs and old measurement seams;
  propose one bounded current-build baseline/profile run, a reproducible input
  sequence and fresh reference package. Record available prior helper/restart
  status before proposing a replacement. Identify which current CPU/GPU metric
  should be frozen after the baseline, not from historical timings. Do not run
  the old M27 comparison unchanged: it pins an older reference/candidate.
- Artist: inspect the current shroud, smoke, splats, material/shader and lighting
  work. Rank three concrete savings hypotheses, with affected files, expected
  cost mechanism, quality risks and visible comparison checks. Follow the shared
  modular art workflow. No new art style or asset replacement is requested.

After architect reconciliation, coder owns benchmark/tooling, runtime/publication
and shared art orchestration (`src/art/{index,fire,street-firelight}.js`,
`src/runtime/`, `src/reuse/publication-geometry.js`, publication-only helpers and
`art/source/catalogue-modular/frame-view.js`). Artist owns effect implementation
in `art/source/catalogue-modular/thermal-art.js`,
`workbenches/catalogue-modular/art.js`, `art/source/furnished-house/` and
`src/reuse/ashland/splats.js`. Coordinate any other file before editing. Each
experiment changes one identified cost mechanism; retain failed evidence.

## Measurement and quality contract

Use current Catalogue Street with growing wall/roof fire, smoke, street/building
light, nearby grass, and a small moving burning-character control. Use one
authoritative production command sequence and new native states at normal
cadence. Reuse recorded commands where compatible, not old thermal states or
timings. Freeze camera, normal game zoom, resolution, exposure, seed, clocks,
input windows, visible work and hardware/browser identity. Full historical
snapshots must not accumulate during timed lanes. Keep the reference immutable.

Measure per-new-state presentation/publication CPU, render-submission CPU,
actual non-disjoint GPU time and full-frame CPU separately. Never add CPU and
GPU times or double-count publication inside simulation. Once the baseline
identifies the limiting visual metric, architect freezes its mean/p95 budget
and a paired <=0.5 target before optimization. Report the other resource and
investigate a reproducible >10% regression. A preparation-only improvement must
not be described as halving GPU, memory, total frame time or doubling FPS.

Use finite counterbalanced reference/candidate lanes, at most one renderer
context at a time. Begin with the highest measured cost, inspect the result,
retain a real improvement and test the next hypothesis. No unchanged-build
timing retries to seek a passing number. Exact state/events/fuel/heat/support
and movement stay equal. Helper ownership, creation time, deadline, restart
sources and finally-cleanup are required. Architect grants the specific finite
baseline and comparison runs after the first audit; no helper is granted here.

Preserve flames, smoke and lighting enabled, the close character shroud,
readable preheat smoke and the approved night-fire drama. Off-screen visual
work may be skipped conservatively while heat and broad fire illumination
remain authoritative. No reduction in visible fires, changed simulation/fuel,
camera trick, global resolution reduction or default-disabled quality channel
can establish the target. Judge matched stills and moving clips at normal zoom,
including motion, stairs/elevation, occlusion and a burning moving character.

## Delivery

Workers supply exact hashes/SHAs, owned paths, profiling evidence, raw scalar
rows, visual comparisons, relevant checks and closed-helper receipts. No
automatic Pages deployment. Commit/push only task files after relevant checks
pass; preserve failed experiments without committing a failing checkpoint.
Architect independently reviews the combined result and checks the exact
release scope. M29/other unpromoted work is not silently promoted with this pass.
