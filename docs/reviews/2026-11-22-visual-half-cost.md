# Visual hill climbing: reference accepted, optimization pending

The corrected firelit reference passes source, numeric and initial appearance
review. **The requested further halving has not yet been demonstrated.** The
first isolated packing comparison is authorized; its result remains pending.

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

Only that file may be overlaid into a separate QA candidate package. The one
authorized counterbalanced comparison has four sequential reference/candidate/
candidate/reference contexts, one renderer at a time, current native states,
matched inputs and scalar/GPU/workload/endpoint evidence. No captures/profile
work in its timed lanes. Retention and further experiments follow real results.

Master and Pages remain unchanged. M29's separate clocked/rendered-map gates
and all other unpromoted work are outside this performance pass.
