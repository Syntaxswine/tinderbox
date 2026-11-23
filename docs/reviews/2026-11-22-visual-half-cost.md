# Visual hill climbing: reference accepted, optimization pending

The corrected firelit reference passes source, numeric and initial appearance
review. **The requested further halving has not yet been demonstrated.** The
first isolated packing comparison is complete; it did not reach the target.

Baseline source is coder `d9ca47426bdbbf1ff707fd6a1d6c37079417edc9`,
intaken as architect `e619918b`. All 23 recorded source hashes match that commit;
the four archived runtime/art files match the reviewed bytes. Large reference
packages and raw runs remain in the coder's ignored
`artifacts/qa/visual-half-cost/`, with source/restart records and hashes.

## Correct reference and target

The [contract](../milestones/30-visual-half-cost.md) and
[machine-readable frozen reference](../engineering/visual-half-cost/reference-v1.json)
define the complete snapshot-publication + art + renderer-submission CPU sum,
per displayed host frame. Native-only rows and nested publication phases remain
separate. GPU is measured with actual non-disjoint queries and is not added to
CPU. All 120 dense-window rows/outliers are retained.

| Measure | Reference mean / p95, ms | Final target |
| --- | ---: | --- |
| Dense visual CPU, all displayed frames | 16.560 / 21.000 | <=8.280 / 10.500 and both fresh paired ratios <=0.5 |
| Whole-scene GPU | 9.297 / 12.225 | Investigate reproducible >10% paired regression |
| Full-frame CPU | 29.193 / 47.400 | Report separately; publication counted once |

Reference is 3,676 files /266,632,254 bytes, canonical package digest
`a26316d6366f0f9fedb9a2e799b3b1aadc594894d5a8309b8383a0a99b53f5bc`.
It uses Edge 158 /ANGLE D3D11 /RTX 3080, 1280x800 page, 1280x494 viewport,
normal zoom 1 and 12.6 m span. It is a current reference containing M27's prior
savings; the older unoptimized M27 implementation is not the denominator.

## Quality and measurement corrections

The earlier runs remain preserved as diagnostic evidence. One browser launch
failed in AppContainer Temp; setting the Node driver's task-owned temp path
before startup resolved it. A subsequent guard confused 20 offscreen character
paint renders with displayed frames. The corrected collector records both,
rejecting unaccounted preparation work inside scored windows. A mixed contact/
exit body window also cannot require continuous contact: current data has four
active rows of 24, historical data five; no burn rule was changed.

The appearance gate then found a real unpublished-reference defect. Component
firelights delegated to the shared host pool, but native samples lacked its
required exposure metadata. A narrowly recognized native-frame adapter now
normalizes missing exposure in the presentation copy only. Explicit false,
legacy/unknown inputs, physical DTOs and heat/fuel/events remain unchanged.
Thirteen independent source controls pass, including real native sample
provenance, negative inputs, off-camera light, six-light/power215 bounds and
disposal. No lamp/intensity or simulation tuning is included.

The corrected capture has 38 emitting surface sites, nine candidates and six
shared fire lights, visibly lighting the street and walls. Flames/smoke/light
remain enabled. The genuine oil-trail body control uses ordinary jerry-can and
match commands: 60 mature motion frames, 112 total setup/motion/exit steps,
0.09 m accepted travel and natural clearing. Architect reviewed the dense JPG
and mature start/middle/end at normal zoom. Both reference contexts closed,
maximum one renderer, with the browser/driver/ports released.

![Accepted firelit reference](media/2026-11-22-visual-half-cost/reference-firelit.jpg)

![Accepted mature body reference](media/2026-11-22-visual-half-cost/reference-mature-body.jpg)

## First isolated experiment

Artist's direct structural-splat packing candidate is uncommitted, source hash
`d36848529642326f47bbbe11383458edf47267643248b1127e3b8c4017d42d88`.
Thirty independent controls preserve complete packed Float32 bits, ordering,
ties, counts, wind/camera/elevation behavior, culling, limits, retirement/reuse
and disposal. This proves output behavior, not reduced cost.

The candidate package overlaid only that file. The counterbalanced comparison
used four sequential reference/candidate/candidate/reference contexts, one
renderer at a time, with current native states and no captures/profile work in
the timed lanes. Architect independently recalculated the 120 dense rows in
each lane, verified per-frame publication/art/submission sums and actual GPU
queries, compared 29 state/workload fields across all lanes, checked nine
evidence hashes and the common endpoint. All pass; all four contexts closed.

| Lane | Visual CPU mean / p95, ms | GPU mean / p95, ms |
| --- | ---: | ---: |
| Reference A1 | 28.457 / 41.000 | 15.158 / 18.904 |
| Candidate B2 | 22.621 / 33.800 | 12.500 / 17.084 |
| Candidate B3 | 19.754 / 26.300 | 11.147 / 15.071 |
| Reference A4 | 20.470 / 28.000 | 11.998 / 16.427 |

Both pairs improved, but reference mean drifted downward 28.1%. The weaker
pair's CPU reduction is 3.5% mean /6.1% p95, with no GPU guard violation. This
does not establish a precise packing benefit or either half-target. Packing
remains uncommitted and QA-only; no unchanged-build timing retry is authorized.
Raw data, input/package proofs and cleanup receipts remain in coder QA
`packing-abba-01`; independent root audit is retained under architect QA.

The next source-only experiments are private native publication-payload reuse
(coder) and QA-only point-shadow program-change attribution (UI specialist).
Artist is inspecting the existing art-preparation profile for a larger remaining
mechanism. No new renderer or timing invocation has been granted by those source
assignments. The accepted reference, quality and half-target remain fixed.

## Source experiments held after review

Coder's occupancy-payload cache passes 36 controls but preserves every public
row allocation and adds cell/provenance/descriptor checks and private miss
allocations. Bounds already cache. Its operation census supports holding the
candidate without a performance run; it is uncommitted in coder QA
`publication-source-01`.

Artist's support/classification-binding cache also passes 36 controls, including
exact packed-output and mutation/lifecycle comparisons. Source hash is
`2d8d6de6e284b1cdf4356dfca8c3a47031b7056e4fd8b041bcd67f516fef2bd1`.
It skips only a post-routing suffix, adding dependency checks while retaining
validation, copies, dynamic routing, liveness, geometry calls and animation.
The entire classifySample sampled self weight is only 11.2% of art; the candidate
cannot claim the whole 5.178-ms building-art stage. Keep it QA-only without a
renderer run or production intake. Evidence/cleanup are in artist QA
`visual-half-cost-art/classify-bindings-attempt01`.

UI diagnostic preparation `bc521fe63aea54ea283f4b09c2d78e86a5cbd054`
passes six source/mock controls. Architect reviewed its insertion-only patch,
exact byte restoration, bounded counters, branch decisions and ordered draw/
state/error paths; independently verified source hashes. One separately granted
untimed probe compares unchanged and instrumented packages using the same current
input prefix. It establishes shadow/program attribution and workload/appearance
equivalence, not a performance saving. Production vendored renderer is unchanged.

The untimed probe now passes. Architect independently compared all 1,621 current
rows across 27 state/workload fields, checked 17 evidence hashes, reconciled
main-view and point-shadow draws, verified balanced zero-overflow counters and
inspected matched dense JPGs. No appearance discrepancy was observed. Two
contexts closed; browser/driver exited and ports 63548–63549 released.

| Attribution count | Quiet, 60 frames | Dense, 120 frames |
| --- | ---: | ---: |
| Ordinary point-shadow draws | 22,260 | 43,200 |
| Skinned point-shadow draws | 41,760 | 72,000 |
| Point-shadow program changes | 2,880 | 5,760 |
| Share caused by skinning transitions | 100% | 100% |

Both skinned and ordinary transitions use shared distance material 137. The
dense lane has 143,805 all-pass draws; renderer main-view accounting resets after
the shadow pass, so its 28,605 draws cannot stand in for the total. These counts
do not imply saved time.

UI is preparing a private compatible point-shadow material-family candidate;
coder is preparing compatible body-part batching, with native pose/shroud/
attachment and mutable-part exclusions. Artist is preparing whole owner-batch
reuse from native publication receipts. All are source-stage candidates pending
review, actual CPU/GPU measurement and appearance acceptance. No optimization
has been promoted, and the half-target is still unmet.

## Combined character B0 cost result

Independent source controls pass 42/42. Normal native bodies merge seven static
parts into one render mesh, keeping the mutable support arm separate; patrol
clothing/equipment stay separate. Original logical geometry/skin/paint/shroud
readers remain. A private bridge recognizes the frozen point-shadow helper's
render-only overrides and releases leases before batch retirement. Added copied
CPU buffers are about 0.51–0.52 MB per body, with no new texture or skeleton.

The exact six-file candidate package has 3,678 files and a checked 213-file
import closure. Its ABBA retains all 120 dense rows per lane. Architect
independently recalculated phase sums/GPU queries, verified state/workload fields
and evidence hashes, and checked the intentional -20 main-view draws/+5 geometry
delta per candidate frame. Submitted main-view triangles and textures match.

| Lane | Visual CPU mean / p95, ms | GPU mean / p95, ms |
| --- | ---: | ---: |
| Reference A1 | 15.846 / 19.500 | 9.394 / 12.289 |
| Candidate B2 | 15.893 / 20.900 | 7.649 / 10.246 |
| Candidate B3 | 14.564 / 18.100 | 7.376 / 9.866 |
| Reference A4 | 22.202 / 31.200 | 12.455 / 16.379 |

The first CPU pair is effectively unchanged in mean and 7.2% worse at p95; the
other improves with a 40.1% upward reference mean drift. GPU improves in both
pairs, with the weaker mean/p95 reductions 18.6%/16.6%. Neither half-target
passes. Hold B0 as research; no CPU-halving, precise overall gain, pixel
acceptance or promotion is established. Four contexts and all task helpers
closed; raw evidence is in coder QA `character-combined-abba-01`.

The artist's hostile source review found a P2 callback gap: admission/update
omitted `material.onBeforeRender`, which can depend on individual native object
identity. Default native callbacks in B0 are unaffected, but authored callbacks
need exclusion/invalidation. Coder is preparing the correction and regressions
as new bytes; B0 remains immutable and cannot stand in for that candidate.

The separate optional owner-batch consumer passes 42 source controls. Architect
reviewed its fixed-size receipt/presentation key, complete-batch bypass and live
outside-gate occlusion/lighting. UI is coupling it with a private immutable
render-packet producer while preserving public snapshots and existing geometry
proofs. This remains source-stage work; no real-game saving is established.

Master and Pages remain unchanged. M29's separate clocked/rendered-map gates
and all other unpromoted work are outside this performance pass.

The corrected B1 character source passes its callback controls. Combined with
the optional private receipt producer/consumer, the fourteen-file candidate
passes source and saved actual normal-zoom quality review. Its qualification
ends with a preserved signed-zero command-assertion failure; independent
offline review confirms all serialized commands, physical rows and endpoint,
and accepts the saved quality/eligibility evidence for cost testing only.

The subsequent cost run stops at the browser helper's intentional safety
deadline during lane three. Only one complete pair is available:

| Lane | Visual CPU mean / p95, ms | GPU mean / p95, ms |
| --- | ---: | ---: |
| Reference A1 | 53.183 / 78.600 | 23.947 / 31.288 |
| Candidate B2 | 104.124 / 183.500 | 22.416 / 25.346 |

This is a regression, not a completed ABBA or accepted optimization. New
publication copying outweighs the saved art/submission work. Root checks all
120 dense rows, 1,621 physical rows and 31 evidence hashes independently.
No second pair or reference-drift figure is available. All three contexts,
driver/browser and ports close; there are no retained helpers. Exact records
are coder QA `character-receipt-abba-01` and root QA
`character-receipt-partial-root-audit.json`. The next source-only experiment
targets unnecessary copying of already immutable native bounds. Original
half-cost targets and all appearance/physics gates remain unchanged.

The follow-up bounds-only source passes 46 distinct controls and a focused
seven-test rerun. A separate factory proof preserves cached immutable native
bounds across private/public copying; numeric geometry proof remains unchanged.
Root and the UI specialist review its source without actionable findings.
The actual C16 diagnostic passes all 1,621 physical rows, final endpoint, 22
actual imported-file proofs, positive firelight and mutable public-row isolation.
Root views its dense JPG against the frozen reference and observes no visible
loss. The complete dense window is still too costly:

| C16 diagnostic phase | Mean / p95, ms |
| --- | ---: |
| Publication | 22.196 / 38.800 |
| Art | 4.232 / 9.200 |
| Submission | 4.461 / 5.300 |
| Combined visual CPU | 30.888 / 51.000 |
| GPU | 10.088 / 14.702 |

This is a single candidate, not a paired improvement. Its subsequent bounded
CPU profile is attribution only. Independent root recalculation of the raw
profile confirms that the private and public recursive copiers account for
77.8% of sampled publication time; native frame generation accounts for 6.1%
inclusive. Recursive inclusive counts are deduplicated per sample; unresolved
builtins remain within caller self time. Do not add nested function totals or
treat profiled timings as speed evidence. Both invocations and their helpers
close. The existing coder is assigned a bounded copier optimization with the
public/ownership contracts preserved. No optimization code is accepted for
promotion yet. QA records are coder `publication-bounds-diagnostic-01` and
`publication-bounds-profile-01`, with independent root audit JSONs alongside the
earlier M30 audits.

The corrected one-file copier candidate passes all 55 source controls, including
the peer-found inherited-setter regression. Its fresh two-lane screen still
regresses and is rejected:

| Lane | Visual CPU mean / p95, ms | GPU mean / p95, ms |
| --- | ---: | ---: |
| Reference | 17.131 / 23.000 | 9.702 / 12.743 |
| Copier candidate | 25.842 / 47.200 | 9.515 / 14.387 |

Publication grows from 4.654 to 16.107 ms mean. CPU ratios are 1.508/2.052;
GPU ratios are 0.981/1.129, flagging the p95 guard for this pair. Root verifies
all physical rows, sums, queries, 32 evidence hashes and cleanup, and observes
no visible loss in the dense JPG. No repeatability claim follows from one pair.
The exact source/package/rows and original failures remain in coder QA
`publication-copier-screen-01`. No unchanged retry or further micro-optimization
of the full generic copy cycle is approved.

Read-only native-ownership and public-reader audits support a narrower native
creation-owned art packet alongside one complete public publication. Whole
returned native frames contain live nested references and cannot be adopted.
Normal art does not consume physical metrics/events/registration instances or
occupancy outside xray. Creation-proven immutable samples can be shared; poses,
geometry and debris children require explicit ownership/copying. Public
snapshots, unknown adapters, xray fallback, canonical firelight aliases,
once-only deltas and phase accounting must remain correct. The architect
authorizes this bounded source implementation, with source review before any
new run. The primary half-cost target remains unmet and Pages unchanged.

The native creation-owned packet passes 70 source checks, including real
consumer equivalence, transactional fallback, exact stock product/data/receipt
proof and safe recovery after skipped updates. The actual C18 screen confirms
120 native bindings, 60 payload reuses and zero generic-copy increments in the
dense window. It nevertheless fails the complete endpoint digest and both CPU
half-cost goals. Root confirms all 1,621 recorded scalar rows match; the single
endpoint DTO was not retained. Source inspection identifies JSON field-order
differences, without proving they are the only difference.

Diagnostic reference/candidate visual CPU is 19.807/20.795 ms mean and
27.200/36.600 ms p95; publication remains too expensive at 5.267/12.282 ms mean.
GPU is 10.420/8.742 ms mean and 13.561/12.249 ms p95. These are not accepted
performance gains. Preserve the failed invocation in coder QA
`native-art-packet-screen-01`; root independent recalculation is
`native-art-screen-failure-root-audit.json`. All helpers close. A source-only
serialization-order correction and read-only remaining-copy audit are assigned;
the frozen hash and performance targets remain unchanged.

The subsequent C19 geometry/startup candidate passes 93 source controls and
independent peer review, including the review-found pre-art focus-loss regression.
Its actual two-lane screen now passes complete ordered endpoint equality as well
as all 1,621 physical rows. The saved endpoint files are byte-identical. Root
recalculates costs and verifies 41 evidence hashes, native-path counters, lights,
public isolation and cleanup. The normal-zoom dense JPG matches the reference at
that checkpoint.

| Lane | Visual CPU mean / p95, ms | GPU mean / p95, ms |
| --- | ---: | ---: |
| Reference | 15.998 / 20.100 | 9.067 / 12.198 |
| Geometry/startup candidate | 20.234 / 35.100 | 7.989 / 11.052 |

CPU regresses 26.5% mean / 74.6% p95; both half-cost targets fail. Publication
mean grows from 4.378 to 12.523 ms, concentrated on new-native updates. The
intended path is active: 120 native bindings, 60 payload reuses and zero generic
copy/fallback increments during the dense window. This is a rejected candidate,
not an accepted speed improvement. All contexts/resources/helpers close; no
optimization code or Pages promotion occurs. Evidence is coder QA
`publication-geometry-startup-screen-01` and root
`geometry-startup-screen-root-audit.json`.

The artist's stationary-layout source pass returns an empty diff: geometry
immutability does not prove source placement/routing/membership across native
ticks. Existing reuse already covers the provable path. Coder now investigates
native geometry creation ownership; UI investigates safe posed-character frustum
culling. Both are read-only proposals, with no new actual invocation authorized.

C20 moves canonical geometry certification to its owning constructor and passes
119 source controls plus independent review. Its actual screen proves 75,954
authoritative dense lookups with zero repeated shape/descriptor/coordinate/copy
increments. Ordered endpoint files and all 1,621 physical rows still match.
Startup construction records 1,695.2 ms separately; reset's 1,688.9 ms is charged
once to its host frame, with no dense birth/charge increment. Root verifies 43
evidence hashes, geometry/public isolation, six firelights, the saved JPG and
complete cleanup.

| Lane | Visual CPU mean / p95, ms | GPU mean / p95, ms |
| --- | ---: | ---: |
| Reference | 14.380 / 18.200 | 8.240 / 9.979 |
| Construction-owned geometry | 17.922 / 30.500 | 9.137 / 12.725 |

Both half targets fail. Publication mean is 3.833 versus 7.725 ms. GPU ratios
1.109/1.275 flag the guard in this single pair. The candidate remains unpromoted;
preserve coder `publication-native-construction-screen-01` and root
`native-construction-screen-root-audit.json`.

The subsequent exact-C20 attribution-only profile completes 120 dense intervals.
Root independently checks its 7,597 samples, phase groups, 43 evidence hashes,
physical/render rows, endpoint and cleanup. Of 988.900 sampled publication ms,
native frame work is 270.661, private capture/build 266.998 and public projection
137.565, with GC 24.859; other disjoint groups account for the remainder. These
groups include DTO/routing work, not just cloning. Resolved `structuredClone`
self is 20.236 ms; native work may remain pooled in caller self. Nested costs
must not be added. Evidence is coder `publication-native-construction-profile-01`
and root `native-construction-profile-root-audit.json`; it is not speed evidence.

C21's conservative character/uniform culling passes 15 source checks, but final
peer clearance is withheld for an unguarded bone-palette texture layout change.
The UI specialist is correcting that source issue before any renderer trial.
Coder is preparing a read-only remaining-publication proposal from actual hot
rows. No optimization code, master or Pages promotion has occurred.

The focused palette correction subsequently passes 17 source controls and
independent artist/root review. Its clean rendering-only package is built on
the original immutable reference, leaving the failed publication architecture
experiments separate. The nine runtime deltas preserve original public and
simulation behavior; C20's stronger experimental DTO isolation is not claimed.

C21's first actual screen exits 1 on a post-timing diagnostic: 27 active bound
owners includes one dead hidden resident, while 26 bounded meshes are visible.
Root independently verifies the retained data, including all 1,621 physical
rows, complete ordered endpoint equality, 66 evidence hashes, original source
requests/package pins, geometry/equipment/pose preservation and cleanup.

| Lane | Visual CPU mean / p95, ms | GPU mean / p95, ms |
| --- | ---: | ---: |
| Reference | 52.736 / 73.200 | 24.970 / 31.703 |
| Character culling candidate | 26.759 / 34.500 | 11.394 / 15.466 |

CPU ratios .507/.471 and GPU .456/.488 are promising observations, not accepted
performance. Both absolute CPU budgets and the paired mean half-target fail.
The reference is far above the frozen baseline, and unchanged publication also
nearly halves across lanes. The entire paired change cannot be attributed to
the optimization. All raw rows/outliers and the failed invocation remain saved.

Root finds no visible loss in four normal-zoom JPGs; quiet images are
byte-identical. Quiet has 24 off-color shadow-frustum eligibility witnesses,
correcting an earlier dense-only zero generalized to the whole run. Those
witnesses do not establish shadows on visible ground. Moving-body and actual
off-camera-shadow qualification remain pending. The separate candidate HTTP
byte re-fetch did not complete; requested modules and immutable disk package
hashes are verified with that explicit limit.

Evidence is coder `character-culling-screen-01` and root
`character-culling-screen-root-audit.json`. All helpers/contexts/resources and
ports close. The candidate remains unpromoted; half-cost is still unmet. Artist
saved-image review, UI's bounded read-only same-pose guard-sharing proposal and
coder qualification/protocol preparation are assigned before any new launch.

C22's call-local validation sharing passes 26 source controls and root's 172
pin/file checks. It preserves 83 C21 archive files, 17 earlier frozen files and
eight donors; all three finite source-test children close. The patrol census
is 23 requests, one skeleton/palette evaluation, 17 bone visits and 56 unchanged
box transforms, with 46 added mesh guard passes and 63 matrix copies. Those
counts are not measured savings.

Independent review nevertheless finds two reachable live constructor lookups
after transforms have been copied. An own constructor getter on the palette
array or a later mesh matrix can mutate the common root and yield an accepted
mixed-time bound. Source clearance is withheld. A bounded revision02 correction
and two regressions are assigned, preserving the original 26-control checkpoint.
No C22 renderer or performance acceptance has occurred.

The [small shadow fixture](../engineering/visual-half-cost/shadow-fixture-v1.json)
now has frozen transforms/ROI/pixel gates. Root independently checks all 23
saved officer bounds and static receiver/ray geometry. The new replay tooling
passes 21 pure source controls and pin review, with original command/endpoint
targets preserved. Actual moving-body and shadow pixels remain pending; coder
is preparing source/package glue, without a launch grant. The half-cost target
and Pages remain unchanged.

The focused source correction passes 28 controls, root's 389 file/pin checks and
final independent archive review. Corrected helper is
`a6718de99ef28cd4e863fceefb6d9159f06c592f42d74bbf08cf45935e2adb40`.
The clean 3,679-entry package (manifest
`2dfa34970202c05353bc98c3496295ed2a5ae663e7219c5e3076d100cef257ca`)
passes complete inventory, 214 imports and source/tooling review before one
bounded quality-only invocation. No performance acceptance follows from this.

That invocation preserves its original exit 1: candidate whole-officer fixture
diagnostics require an ordinary Mesh's lazy geometry sphere before rendering.
Both lanes nevertheless pass 1,621 physical rows, full ordered endpoint, actual
HTTP source bytes, 95 canonical body commands/112 player-state rows, 60
moving-burning frames and natural clearing. Reference's on/off/restored shadow
control passes all 480 ROI pixels; candidate pixels are not reached. Root views
paired mature-middle images with equivalent shroud, pose and firelight.

Root independently verifies 84 evidence hashes, 17 archived source pins,
metadata-only launch-review changes and complete process/context/GL/port
cleanup. Evidence is coder `character-culling-quality-v2-01` and root
`character-quality-partial-root-audit.json` / `character-quality-metadata-root-audit.json`.
All helpers close. Authorize a QA-only ordinary-bound correction and preparation
of a small shadow-only follow-up, reusing the passed body/state evidence against
unchanged runtime. There is no automatic retry or new actual grant yet.
Candidate quality and half-cost remain unaccepted; master/Pages is unchanged.

The QA-only lazy-bound correction passes 23 controls, root's 241 file/pin checks
and independent source review. A separate shadow-only invocation then exits 0,
with no gameplay steps or repeated body replay. Root independently checks both
480-pixel masks, IoU1/MAE0 and unchanged startup/final clocks. All three complete
R/C framebuffers are byte-identical. Actual bounds/whole-officer clearance,
hardware, HTTP sources, three scene passes/lane and complete cleanup pass.
The audit includes 90 evidence hashes, 21 archived source pins and metadata-only
launch-review changes.

Accept the combined **bounded quality** evidence: original run01's matching
state/body replay and normal-zoom image review, plus
`character-shadow-fixture-only-01`'s off-camera shadow pixels. Preserve the
original exit1; neither its history nor missing stage is relabeled. Root's
`shadow-only-result-root-audit.json` and `shadow-only-metadata-root-audit.json`
record the combined decision. Whole-game/mobile acceptance and cost remain
separate. All disposable helpers close; no runtime optimization is promoted.

The half-cost target is still unmet. Coder prepares a clean-candidate CPU
attribution profile using the fixed prefix/dense window and native phase ranges;
no actual profile or ABBA grant is active. Reference drift remains unresolved
and must not supply an easier denominator. Master/Pages stays unchanged.

The separately granted clean-C22 profile completes once, exit 0 in 114.649 s.
Root audits all 12,722 samples and 120 dense phase intervals, exact physical
prefix/ordered endpoint, hardware and 18 actual HTTP source proofs. The final
audit verifies 55 evidence hashes, 18 archived pins, metadata-only grant changes
and complete profiler/GL/process/port closure. No reference was rendered and no
speed result is accepted. The raw profile SHA is
`e0b28d7553705307ab0279c475abfac7fea4d37af1cbc29816726a554ffe37d1`.

Artist, coder and UI return read-only proposals from these actual samples.
Select the artist's small same-invocation house-flame support-layout experiment;
the entire affected `splat` self budget is only .975 ms/frame, so expected savings
are lower. Require exact packed-output/wind/behavior controls before any actual
comparison. Defer publication-row assembly and unsupported object-specific
shadow batching. Current authority is one source/control experiment in the art
worktree; there is no new renderer/profile/ABBA grant. Root evidence is
`clean-c22-profile-root-audit.json` and `clean-c22-profile-metadata-root-audit.json`.
The half target is unmet, no optimization code is intaken, and master/Pages
remains unchanged.

The support-layout experiment passes exact-output/source review after one focused
clear-in-wind correction. Ten controls cover 37 packed comparisons/313,600 words
and 35 wind transcripts; root audits 87 source/evidence pins. A single bounded
non-render CPU screen then records all 1,024 timings and matches 512 states /
4,587,520 packed words. Root independently verifies 58 pins and all statistics.
Mean improves only .7%, median worsens 1.5%, and paired blocks are mixed.
Reject this hill as insufficient benefit without spending a full game replay.
Saved source/micro root audits preserve that decision; no renderer was created
and all four child lifetimes close. No optimization is intaken. UI is assigned
read-only feasibility for one dense-frame object/material draw census; no actual
grant exists. Half-cost and Pages remain unchanged.

The one-frame census helper subsequently passes nine controls, root's 408
source/preservation checks and independent artist review. Root verifies the
integrated driver, 86 input/evidence records, 3,679 candidate file hashes and
complete unchanged prefix. `draw-census-helper-root-audit.json` and
`draw-census-driver-root-audit.json` preserve the source decision. One separately
bounded <=300-second diagnostic invocation is granted in fresh output; no timing
or optimization acceptance follows. Instrument only existing native host1502,
restore hooks, finish the original sequence and verify state/source/cleanup.

That census passes once in 89.419 s. Root reconciles 660 attempts/657 draws,
441 shadow/216 color, three zero-draw attempts and 344 groups, exact physical
prefix/endpoint/hardware/source proofs, launch-metadata-only changes and all
50 evidence hashes. Every helper/GL allocation/port closes. The two actual root
audits accept the diagnostic, with no speed or optimization acceptance.

Independent source assessments identify a bounded 14-batch static Bell & Alder
point-shadow union opportunity, with routing/culling overhead still unresolved.
They also confirm absent native point-distance retirement/cutaway masking.
Correct that mask first through one source-only coder experiment using the
existing owner mask and resource lifecycle. Source and later appearance review
precede batching or cost acceptance. Preserve the original reference and fixed
absolute half budgets; a corrected appearance control is not a new denominator.
No runtime optimization or Pages change is promoted.

The minimal mask correction passes 11 real-factory/shader/selector CPU controls
and root's source/evidence audit (80 unique files, 64 preserved records). Each
native batch owns its decorated distance material; color/depth shader output,
geometry and state stay unchanged in controls. Artist independently reviews the
source while coder prepares an unscored unchanged-C22 versus C22+mask appearance
comparison. No GPU/pixel acceptance, actual launch grant or new performance
denominator follows from the offline checks.

Artist clears the mask source; UI independently clears the exact quality runner
and contained package selector. Root verifies 120 source/evidence pins and all
14,710 files across four preserved/derived packages. The correction-only
candidate manifest is `3ecee12e361b559de35149b45979ea11235da86d1a5ce38b0a68465730d8b05b`.
One separate <=600-second quality invocation is granted: unchanged C22 versus
C22+mask, six existing-frame JPGs, exact physical/source checks and full cleanup.
The half budget and original reference stay unchanged; no speed or rendered
quality acceptance is implied by this grant.

The single mask-quality run completes in 145.184 s with exact state/endpoint,
21 HTTP proofs per lane, 238 corrected native distance materials and no GL error.
Root audits capture clocks/frames, permitted metadata-only changes, 68 final
evidence hashes and all cleanup. Artist clears the six actual JPGs; root views
dense/end pairs. Accept this bounded correction-quality control, preserving
untested worst-case pixel/motion limits and the original half budgets.

Coder receives one source-only Bell & Alder structural shadow-union prototype,
using the reviewed stock routing and corrected masks. Original color/picking,
fallback/occlusion/lifecycle and all effect/state behavior must hold. Additional
color work, conservative bounds and buffer memory remain part of its cost.
No actual optimization run, runtime intake or Pages promotion is authorized yet.
