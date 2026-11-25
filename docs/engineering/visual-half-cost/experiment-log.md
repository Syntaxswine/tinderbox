# Fire presentation experiments: builder log

Updated 2026-11-24. This is the index of attempted cost reductions, including
negative results. Read the linked reviews before reusing a candidate. Passing
source controls, removing operations and finding a hot function do not establish
a game-speed improvement. QA-only candidates below have not entered master or
Pages. The earlier M27 optimization has already shipped.

## Read the numbers in their original scope

- **M27** measures publication plus art on new-native frames. Its successful
  result is already in the M30 starting game; it is not another available saving.
- **M30 visual CPU** is the framewise sum of publication, art and render
  submission on displayed frames. Publication is also inside inclusive
  simulation/full-frame timing; count it once. GPU time stays separate.
- Mean/p95 game figures below are milliseconds per frame, retaining outliers.
  M30 p95 is sorted element `floor((n-1)*.95)`. Microkernel timings have their
  own units and cannot be substituted for game-frame costs.
- Original M30 reference: CPU **16.560 / 21.000**, GPU **9.297 / 12.225**;
  CPU half budgets **8.280 / 10.500**. See [frozen reference](reference-v1.json).
  Corrected-mask C22 is an appearance/incremental control, not a replacement
  denominator. Each larger workload needs its own matched control as well.
- The original normal-zoom dense fixture has one dominant burning structure,
  Bell & Alder. Its saved endpoint has 777 structural source rows, including
  657 positive-flame rows, all owned by Bell & Alder. This does not establish
  performance with four simultaneously burning furnished buildings.

## Attempt register

| ID / mechanism | What the evidence shows | Disposition and useful revisit condition |
| --- | --- | --- |
| **M27: owned geometry, grouping/anchors and fewer publication copies** | Publication + art CPU **29.013 / 34.500 → 12.257 / 15.600**. GPU **9.345 / 13.278 → 9.384 / 12.731**. Source, actual input, appearance and release checks pass. | **Shipped.** Preserve this work. These are M27's metric and baseline, not M30's. [Review](../../reviews/2026-11-16-half-cost-fire.md), [measurements](../fire-half-cost/measurements.json). |
| **M30: direct structural-splat packing** | Exact packed output passes. Both CPU pairs improve, but controls drift 28.1%; the weaker pair saves only 3.5% mean / 6.1% p95. | **Held; precise benefit unproved.** A stable matched workload is needed before claiming a small gain. Source `d3684852…`, QA `packing-abba-01`. [Record](../../reviews/2026-11-22-visual-half-cost.md#first-isolated-experiment). |
| **M30: occupancy-payload cache** | Source controls pass, but every public-row allocation remains and checks/private miss allocations are added; bounds already cache. No timed game result. | **Held at source review.** Revisit only with a demonstrably different allocation/cache workload; do not assign it the whole publication stage. QA `publication-source-01`. [Record](../../reviews/2026-11-22-visual-half-cost.md#source-experiments-held-after-review). |
| **M30: support/classification binding cache** | Exact-output controls pass. The candidate skips only a post-routing suffix, retaining validation, copies, routing, geometry and animation. No timed game result. | **Held at source review.** More calls may increase total cost, but the removable portion must be measured. Source `2d8d6de6…`; QA `classify-bindings-attempt01`. [Record](../../reviews/2026-11-22-visual-half-cost.md#source-experiments-held-after-review). |
| **M30: character-part batching + private shadow-material families (B0)** | Main-view draws fall by 20. GPU improves in both pairs; weaker mean/p95 gain 18.6%/16.6%. CPU is flat/worse in the first pair; control CPU drifts 40.1%. A callback-admission gap requires new source bytes. | **Research, not accepted CPU/whole-game savings or cleared B0 source.** More characters would test its scale; more burning buildings alone is a different workload. [Record](../../reviews/2026-11-22-visual-half-cost.md#combined-character-b0-cost-result). |
| **M30: private receipts, immutable/native bounds and copier/DTO isolation (C14–C20 chain)** | Some art/submission work shrinks, but added publication/copying dominates. Corrected generic-copier screen: CPU **17.131 / 23.000 → 25.842 / 47.200**; publication mean **4.654 → 16.107**. Other variants and their failures remain in the detailed record. | **Held/rejected for performance intake.** Do not import stronger experimental ownership contracts as an optimization. Larger inputs are not evidence that extra copies become free. Preserve distinct variants and public mutability semantics. [Record](../../reviews/2026-11-22-visual-half-cost.md). |
| **M30: conservative character culling / C21–C22 correction chain** | Some screens look promising, but source, bound/fixture, reference-drift and appearance issues prevent half-cost acceptance. Corrected source and separate body/shadow/mask evidence establish only their recorded scopes. | **No overall optimization promotion.** Use the corrected-mask control for later experiments; do not credit missing shadows, incorrect bounds or incomplete fixtures as savings. [Record](../../reviews/2026-11-22-visual-half-cost.md). |
| **M30: same-invocation flame support-layout reuse** | Exact values/wind/lifecycle controls pass. CPU-only screen: 1,024 timings; mean improves 0.7%, median worsens 1.5%, paired blocks mixed. No renderer run. | **Held as insufficient benefit.** Setup is shared inside one invocation; a larger source count needs a new measured scale, not a multiplication of the tiny mean difference. QA `support-layout-source-01`. [Record](../../reviews/2026-11-22-visual-half-cost.md). |
| **M30: Bell & Alder structural point-shadow union** | Fewer draws do not pay off in the one directional pair: CPU **19.219 / 25.300 → 21.458 / 27.500**; GPU **8.808 / 11.114 → 11.446 / 16.014**. Unchanged phases also vary. Still appearance is reviewed; continuous motion is not established. | **Held; no causal size estimate from one pair.** The prototype targets one building. More unrelated burning houses do not automatically exercise that union; multi-owner coverage would require new reviewed source. [Record](../../reviews/2026-11-22-visual-half-cost.md). |
| **M30: static local-matrix freezing** | On 16 eligible meshes, local recompositions fall 32→0. Yet the two-pass CPU microkernel mean worsens **0.010967 → 0.011930 ms/sample** across 8,192 timings; all four paired means are worse. Nearest-rank micro p95 **0.014700 → 0.017900** (game convention gives 0.014600 for the control). | **Held; no rendered test.** More burning does not itself add static meshes or remove traversal/world-matrix work. A materially larger eligible static tree is a separate hypothesis. Source `97018b15…`. [Record](../../reviews/2026-11-22-visual-half-cost.md). |
| **M30: source-level house-fire ordering** | Values/counts/wind behavior are preserved; local compositing differs slightly and 28 reviewed PNGs remain visually viable. First game ABBA has 72% control CPU drift. A later unattended repeat passes its drift guard but provides no consistent saving. The larger native-fire study below finds lower mean GPU time with three burning buildings, while visual CPU gets slower; the four-building repeat is incomplete. | **Held; no CPU half-cost acceptance.** Preserve the modest GPU observation and its limits. This remains CPU emission/packing code; a GPU emitter has not been implemented. [Record](../../reviews/2026-11-24-ordering-event-copy.md), [scale data](scaling-v1.json). |
| **M30: event-copy probe** | Named helpers preserve existing clone/copy semantics. Event-history cloning resolves at about **1.1475 sampled self ms/displayed frame**, 16.27% of sampled publication CPU. Native allocation visibility is unresolved. | **Diagnostic only; no optimized copier exists.** More fire may increase the opportunity or reach history caps; it cannot demonstrate savings from an optimization that has not been written. [Record](../../reviews/2026-11-24-ordering-event-copy.md#event-diagnostic-result). |

Abbreviated source IDs above are locators from the detailed records, not new
claims of a committed candidate. Exact manifests/pins, raw local QA locations,
preserved source corrections and failed attempts remain in those records.

## Latest ordering result: stable controls, no consistent gain

The unattended ABBA repeats the same builds and inputs. CPU and GPU are separate;
these values use the 120-frame dense window, with no samples removed.

| Visit | Visual CPU mean / p95 | GPU mean / p95 |
| --- | --- | --- |
| Existing per-lobe 1 | 14.605 / 17.800 | 6.576 / 8.842 |
| Source ordering 1 | 14.463 / 17.900 | 6.594 / 8.851 |
| Source ordering 2 | 16.599 / 20.800 | 7.965 / 10.719 |
| Existing per-lobe 2 | 14.365 / 18.100 | 6.088 / 8.090 |

Control mean drift is 1.67% CPU / 8.00% GPU, within the pre-registered 10% guard.
The first pair is roughly tied; the second is slower and trips the GPU guard.
Neither paired half check or original absolute CPU half budget passes. This
does not prove that all variation inside the second visit is caused by ordering.

Source ordering changes only these two QA source files:

- `art/source/furnished-house/shroud.js`:
  `8ec92365d392478ae356f80ac05f5de9d83f9ee96d2fda86ceeef0564f193b39`.
- `src/reuse/ashland/splats.js`:
  `7156ee7d0c9b59aadd15ebee71b6e1a9d1400072dba30355bf07dfc1923c5253`.

Masked-control manifest:
`3ecee12e361b559de35149b45979ea11235da86d1a5ce38b0a68465730d8b05b`.
Ordering-candidate manifest:
`eb616b9be38010d609ba8da53659a88db7ba50fb22b9ff78d9122e8c2ec7ca5c`.
Quiet-run launched pins:
`b8fcca8e083a2edbb5dbe4f96a3affc858726702892e0cedbaf0cfa9b2488d9f`.

### A wider time average is a different question

The saved quiet run also contains a 1,621-frame prefix with startup and resets.
Its whole-prefix control means drift **39.3% CPU / 62.7% GPU**, despite steady
dense-window controls. The first control's host-0 frame costs 6,593 ms visual CPU;
the closing control's costs 1,572 ms. All these samples remain in the record.
The first aggregate pair appears 28.8% CPU / 38.5% GPU faster, while the closing
pair is 1.4% CPU / 2.6% GPU slower. Those aggregates do not establish an ordering
gain or a larger-building result. Expanding the recorded time range cannot
substitute for increasing simultaneous fire and measuring that workload.

## Scope and scaling: what is known

Sorting is local to each building's effect batches. Current limits are 80 source
rows per batch, capacity for 640 splats; the house profile emits at most five
flame lobes plus two smoke puffs per source (560 before fitting/rejection).
Extra comparable batches repeat bounded sorts. They do not turn the old path
into a single ever-growing global sort. The candidate still emits, samples wind,
fits support, rejects/culls, stages and copies per-lobe data. Inferring a growing
relative benefit solely from total city size is unsupported.

Track active burning owners/sources, visible wall/roof fire, active batches,
emitted/accepted splats and allocated high-water batches separately. Off-screen
fire can cost simulation/publication/preparation while its rendering is culled.
Counting four active fires therefore does not prove four fires were rendered.
More burning buildings also need not increase static-matrix or character work.

The owner specifically requests more simultaneous fires/buildings. The bounded
native Catalogue study uses 1/2/4 **seeded** buildings and measures 1/3/4 actually
burning buildings after natural spread. All counted buildings route through the
changed house-shroud path. Matched reference/candidate setup, windows, normal
zoom and unchanged effects apply at each size. This QA-seeded fixture cannot
establish player-input, coupled-world or whole-game performance. No production
map expansion or physics change is included.

### Scale setup finding: roof provenance and semantic labels

The first CPU-only seeded rehearsal passes the one-building case: 120 planned
frames, HP 100, 822--898 active flames, and projected wall/roof source anchors.
The two-building case then fails before its first step with
`QA_NO_NATIVE_ROOF_CELLS ashland-cottage`. The 26.52-second rehearsal is failed
and preserved; its duration is not a presentation-performance measurement.
No two-/four-building renderer or savings result follows from it.

Source inspection of the frozen masked-C22 package establishes the interaction:

- `src/art/gross-housing.js` stores gable-envelope triangles with negative-Y
  winding; its normal flip is used locally for UV construction.
- `src/content/catalogue-native-exteriors.js` derives facet normals from the
  stored triangle cross products.
- `src/content/catalogue-native-structure.js` labels authored roof-role facets
  `roof` only when `normal[1] > .2`; the others become `wall`.
- The presentation consumes that semantic kind. A native `roof`-only seed
  selector therefore misses Ashland's authored roof geometry.

This finding does not establish missing roof geometry/fuel, and has not been
checked against current Pages. It needs a separate correctness investigation.
The performance task leaves geometry, fuel, normals and runtime labels intact.
A revised QA selector may use exact authored-roof provenance and report both
runtime roof-class and roof-provenance fire counts. Its gate must be named
accordingly; it cannot turn the failed semantic-roof check into a pass. Any
as-is scaling result will retain this limitation and will need reevaluation
after a relevant classification correction.

Two later setup attempts are also retained. Source02/rehearsal02 stops on a
QA reset assertion: applying reset inside a host advance already moves world
time to 1/60 second. Source03 counts that real advance as case-local step 1;
all cases then target exactly 600 host advances, world time 10 seconds and
native tick 300. The measured interval is local steps 481--600 (60 new-native
and 60 intervening frames); finite external heat ends at native tick 181.
The corrected rehearsal reaches the two-seeded-building window, where natural
spread has already ignited Hopkins 15. Its exact-owner-set gate fails. Preserve
that failure; it establishes neither a two-active-building result nor a cost.

The successor fixture is therefore labelled **1/2/4 seeded buildings**, with
every actually burning owner reported, including unseeded spread. Natural
spread is retained. The same finite inputs, window, camera and source packages
apply to each matched lane; do not suppress fire or move the window to produce
an exact owner count. Matched physical states, actual rendered work and control
drift remain necessary for a useful performance comparison.

Source04's eight pure tooling controls pass; their supervisor misses an already
exited child's identity, which remains a failed receipt rather than a clean
lifecycle check. The first scalar invocation then stops after its two-seeded
control window: 4,648 QA heat commands were incorrectly equated with all 4,672
native heat inputs. The extra 24 inputs are consistent with the normal barrel
path's 2.8 heat units. The old run lacks a full replay, so its precise extra
command records are unavailable. Preserve that failed run and both windows.
Source05 changes the post-case diagnostic only: verify each seed command and
consumption exactly, archive the complete native replay once, and account for
ordinary and pending commands separately. The timed page, setup, recipe,
workload, effect readers and summary are byte-identical to Source04. No fire
behavior is changed. The corrected run records 24 ordinary heat inputs at native
tick 52 for the two-seeded case; the four-seeded case has 48, ending at tick 71.

Additional verified source variants: masked thermal art
`6918ff1f1122fda09fa23f634e8121d1ed171cf73eb396ec9a4fdf8698941656`;
support-layout shroud
`d77d2083c3de779cd83d5c20ecb159f3942891aec4e2352f006a47e21935d068`;
single-owner union thermal art
`3495c3842baaf0dd238bee90b038fa63fcc7636a3464fc1e1bd5c29f929ecf18`.

For each scale, retain both paired results, raw mean/p95/outliers, source/state/
workload checks, control drift and cleanup. Report publication/art/submission,
simulation/full-frame and actual GPU separately. A new larger-workload control
is necessary for its ratio; it does not replace the original M30 baseline or
retroactively pass the original half target. Keep setup/warm-up and measured
windows explicit; do not select a favorable size or discard inconvenient runs.

## Larger native-fire result: modest GPU gain, no CPU saving

The corrected invocation retains complete ABBA comparisons for one and three
actually burning buildings. Four seeded buildings produce four burning owners,
but the helper's safety deadline closes the last context before its final
four-seeded window finishes. **The whole invocation is failed/incomplete.**
The completed lower-scale comparisons remain usable research evidence; the
largest case has only one complete pair. No rerun or promotion follows.

The [tracked scale summary](scaling-v1.json) preserves exact costs, ratios,
source/endpoint/raw hashes, work counts, timing conventions and limitations.
Below, R1/C1/C2/R2 is the fixed control/candidate/candidate/control order.
All figures are milliseconds per displayed frame, mean / p95.

| Seeded / actually burning | Visit | Visual CPU | GPU |
| --- | --- | ---: | ---: |
| 1 / 1 | R1 | 14.502 / 17.500 | 8.305 / 11.212 |
| 1 / 1 | C1 | 15.004 / 17.700 | 8.619 / 11.288 |
| 1 / 1 | C2 | 15.741 / 19.400 | 8.568 / 11.874 |
| 1 / 1 | R2 | 14.645 / 17.600 | 7.695 / 11.373 |
| 2 / 3 | R1 | 79.741 / 98.000 | 16.690 / 30.890 |
| 2 / 3 | C1 | 81.443 / 97.000 | 14.979 / 19.884 |
| 2 / 3 | C2 | 80.422 / 98.800 | 14.693 / 19.256 |
| 2 / 3 | R2 | 77.723 / 94.000 | 15.610 / 19.472 |
| 4 / 4 | R1 | 195.658 / 230.400 | 21.343 / 28.856 |
| 4 / 4 | C1 | 206.745 / 248.100 | 18.715 / 21.990 |
| 4 / 4 | C2 | 196.522 / 233.800 | 19.370 / 23.070 |
| 4 / 4 | R2 | **Missing** | **Missing** |

For three burning buildings, both paired mean GPU times improve: **10.25% and
5.87%**. Mean visual CPU gets **2.14% and 3.47% slower**, and CPU p95 is mixed
(1.02% better, then 5.11% worse). Control mean drift passes the pre-registered
guard: CPU 2.60%, GPU 6.92%. GPU p95 controls drift **58.63%**, so the favorable
first tail result is not a stable tail-saving estimate. The smaller case is
slower in both mean CPU pairs. The largest case's sole pair shows 12.31% lower
mean GPU and 5.67% higher mean CPU, without a repeatability verdict.

Thus more simultaneous fire exposes a modest GPU observation for this ordering
variant, **not the requested CPU/whole-game halving**. Keep it held. The current
evidence does not establish that local blend ordering caused every timing
difference, or clear appearance at these new sizes for release.

The ladder really increases effect work, rather than merely counting off-screen
burning buildings. These are matched control-window averages; generation is
read only once at the endpoint, outside timing:

| Actual burning buildings | Positive flame sources | Projected positive anchors | Active batches | Submitted splats | Generated splats at endpoint |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 855.48 | 8.00 | 3.67 | 179.43 | 3,101 |
| 3 | 6,582.08 | 5,156.10 | 75.38 | 28,272.06 | 33,534 |
| 4 | 15,768.63 | 10,907.24 | 185.34 | 63,597.13 | 84,851 |

The fixed normal-zoom camera crops most of Bell & Alder in the one-building
case. Projected anchors are clip-volume tests, not occlusion-aware visible
pixels. The newly ignited houses occupy much more of the camera. Do not infer
a linear or superlinear **per-building** cost curve from these unequal visible
loads. The paired comparison at each individual scale has matched workload.

At three burning buildings, control art preparation averages 52.84--53.89 ms,
publication 19.93--20.95 ms and submission 4.90--4.95 ms. Those are much larger
than the observed GPU saving. The corresponding full-frame CPU means are
117.53--120.36 ms, separate from GPU and including simulation. These are scripted
fixture costs, not an actual measured interactive FPS or iPhone result. A new
experiment must establish which portion of the large preparation/publication
budget it removes; fewer sorting operations alone have not delivered a CPU win.

Root independently recomputes 6,604 retained rows and 1,320 measured rows,
including every available pair/mean/p95, CPU sums, source packages, exact ordered
public/native endpoints, seed/ordinary heat, light selection and work-count
parity. Fifty existing coder WIP files remain unchanged. Source05 launched pins:
`15538d5237facafa1c7ec0dcfe29e2a6f0f2277cc2ed1f6f786e485d9256bcdc`.
The page is `810cd0d1142b8adeebf6c9d720e22ee7b3fd1a658b3681aba36d31e9c743e1ca`;
post-case audit is `4072a2a7ec456ff257eb28a9b6ce8ec7cee941365891d6433b54441f653ac4e4`.
Runtime package manifests remain the masked control and ordering candidate
listed above; none of these QA files enters production.

The corrected invocation runs 1,127.145 seconds; its browser safety expiry
reserves 75 seconds inside the 1,200-second outer cap. It closes all four
contexts, with at most one live renderer, and the launcher/driver/browser and
ports are verified closed. Three contexts have explicit disposed/lost/zero-byte
GPU receipts. The last context closes at expiry, so its final GL read and
end-of-lane HTTP byte-proof phase are unavailable. Preserve those limits and the
failed fourth-window record. No helper, server or browser is retained.

## Evidence and availability

The linked review documents and M27 measurements are tracked in Git. Raw M30
profiles, timing rows, candidate packages, replay and root audits are retained
locally under coder/artist/architect `artifacts/qa/` paths named in the reviews;
they are not all published in a fresh repository clone. The ledger preserves
the conclusions and their limits rather than claiming raw evidence is bundled.
Recheck current source and routing before attempting a successor experiment.
