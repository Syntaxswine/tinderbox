# CPU profiling with visual data disabled

Owner request, November 26, 2026: have the existing coder run the same one,
three and four burning-building cases with all visual data off, then profile
the remaining CPU work to identify the next fix. This is measurement and
diagnosis, not an optimization or a game/Pages release.

Completed: [architect results](no-visual-cpu-review.md) and
[measured data](no-visual-cpu-v1.json). All nine physical/gameplay equivalence
cases pass; the four-building clean repeats have 31.54% mean drift. No
optimization is implemented by this assignment.

The preceding 13 / 39--41 / 75--83 ms estimates subtract recorded visual stages
from full-frame means. They are not directly measured no-visual performance or
pure fire-kernel costs. This experiment replaces those estimates with actual
measurements in its explicitly reported runtime.

## Frozen workload and ownership

Reuse **Coder Tinderbox** on `codex/visual-half-cost-code` in its registered
`coding-9200` worktree. Preserve unrelated WIP and every earlier failed attempt.
Artist and UI have no new assignment. Architect owns source/method review,
independent evidence checks and the result record.

Use masked C22 `3ecee12e361b559de35149b45979ea11235da86d1a5ce38b0a68465730d8b05b`
and the Source05 recipe/setup from the [scale study](scaling-v1.json). Its
one/two/four **seeded** owners naturally produce one/three/four burning owners.
Do not reseed three buildings or suppress ordinary spread/barrel heat.
Preserve seed 1893, goat, native 30 Hz and host 60 Hz, the existing geometry,
wind, actors, rules, support, contact, destruction and reset conventions.
Each ascending case has 600 local host steps. Measure steps 481--600, native
ticks 240--300: 60 new-native and 60 intervening host steps. QA heat remains at
native ticks 1/61/121/181. The frozen roof-label issue remains unchanged.

## What is disabled

No renderer/WebGL context, art update, HUD/camera, visual flames/smoke/light
generation, splat preparation, GPU submission/upload, or per-step public
presentation DTO/history export. Merely unchecking effect settings is
insufficient. Native source geometry required by heat, collision, support and
visibility remains. Gameplay smoke perception and NPC memory must continue.

Audit the producers and consumers before removal. Shared snapshot/raster or
metric work genuinely needed by gameplay stays and is named in the profile.
Use a minimal QA-only advance-without-publication overlay; preserve normal
runtime defaults and the immutable source packages. Do not stub queries,
change solver rules or assign physical state. Generate complete validation
snapshots only outside the measured/profiled intervals.

Prefer the preceding browser JS engine without WebGL. Node is acceptable if
simpler, with its runtime/version and the cross-engine comparison limitation
stated. A new engine's timing is not a causal browser speedup.

## Measurement and proof

- Verify native endpoint and gameplay host state, seed/ordinary command and
  heat/fuel ledgers against the saved controls. Identify any excluded timing or
  presentation diagnostics explicitly; do not weaken physical equality.
- Run two clean ascending passes, with raw per-step times, mean, median, p95,
  maximum and native/intervening splits. Report drift and retain outliers.
  Setup, endpoint copies, full history hashes and disk writes stay outside
  measured intervals. Record actual burning owners without constructing visual
  source rows on each step.
- Run one separate diagnostic replay, collecting a CPU sampling profile for
  each scored case window. Profiler timings are not clean performance results.
  Distinguish self from inclusive CPU and report GC plus remaining native solve,
  heat transfer, support/debris, gameplay/contact/AI, metrics/bookkeeping and
  retained publication/raster costs where attribution supports the categories.
- Deliver exact source/diff/pins, no-visual work evidence, clean raw data,
  profiles, state equivalence, limitations and a ranked smallest-next-experiment
  recommendation. A hot category is not automatically a removable budget.

Coder may proceed once source/equivalence controls pass; no additional architect
run grant is required for this owner-authorized CPU-only task. Clean and
diagnostic suites each have a 900-second bound, run sequentially with one CPU
worker/browser at a time. Keep other render/build/profile work idle. Preserve
ordinary harness corrections and failed evidence; do not retake unchanged runs
to select favorable numbers. Stop/dispose owned helpers and verify process
identity/port closure. No optimization, source-package mutation, extra art,
production intake, merge or Pages publication belongs to this assignment.
