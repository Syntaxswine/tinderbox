# No-visual CPU results, November 26, 2026

The [requested experiment](no-visual-cpu-contract.md) is complete. Actual CPU
advances with rendering and per-step visual exports disabled still cost about
12 ms for one burning building, 42--43 ms for three, and 87--114 ms for four.
All six clean cases and three separately profiled cases match the saved native
state, gameplay state, inputs and heat/fuel ledgers. The larger case has 31.54%
repeat drift; retain the range rather than calling either visit representative.
No optimization or production change has been implemented.

## What the test runs

The frozen masked-C22 package and Source05 recipe are the [previous scale
study](scaling-v1.json). One/two/four seeded owners naturally yield one/three/four
burning buildings. Ordinary barrel heat, wind, geometry, actors, smoke perception,
contacts, damage, support and fire rules remain. It uses the same installed Edge
user agent as that study, on the Ryzen 7 5800X desktop. Startup is excluded.

Two tiny QA-only source copies allow `advance` to omit the public snapshot and
character presentation epochs, and expose existing scalar phase counters. Their
normal defaults remain eager; immutable packages and production sources are
unchanged. There is no art/UI/camera host, WebGL, 2D canvas request, animation
loop, splat preparation or visual flame/smoke/light generation. Physical-frame,
ground-raster and diagnostic exports have zero cost counters during every window.
One complete host and native snapshot is generated after each case for validation.

Gameplay smoke detection still needs native source rows. That shared producer
stays active; its cost is part of this test. This is **not pure fire-kernel time**.
Each case advances 600 host steps at 60 Hz, driving the unchanged 30 Hz native
clock. The measured window is local steps 481--600, native ticks 240--300: 60
new-native and 60 intervening advances. CPU intervals surround `sim.advance`
only; scalar recording, validation copies, hashes, protocol transfers and disk
writes are outside them. These are not displayed-frame or FPS measurements.

## Clean measurements

All values are milliseconds per host advance. Both fresh-context repeats and
all outliers are retained. The full [machine-readable record](no-visual-cpu-v1.json)
also includes medians, maxima, native/intervening splits and phase counters.

| Actually burning | Repeat | Mean | Median | p95 | Max |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | 1 | 11.761 | 10.600 | 21.200 | 22.900 |
| 1 | 2 | 11.938 | 10.650 | 21.600 | 24.600 |
| 3 | 1 | 42.892 | 45.150 | 60.400 | 139.700 |
| 3 | 2 | 42.356 | 42.500 | 60.500 | 179.100 |
| 4 | 1 | 86.836 | 87.000 | 105.800 | 133.300 |
| 4 | 2 | 114.223 | 102.100 | 180.600 | 234.000 |

Mean repeat drift is 1.51%, 1.27% and 31.54% respectively. Four-building tail
times vary substantially as well. Outside-window system snapshots report total
CPU load of 25% before and 42% after; they do not establish in-window load or
explain the variation. No unchanged favorable-number retake was run.

The preceding 13 / 39--41 / 75--83 ms figures were subtractions from different
rendered runs. This test directly measures a narrower CPU interval, removes
publication/rendering pressure, and changes GC/cache conditions. Do not turn
the comparison into an exact speedup percentage or combine CPU and GPU times.

## What remains expensive

Three separate 250-microsecond sampling profiles cover only the scored advances.
Their time intervals are clipped to the recorded `advance` calls. Profiler
overhead never enters the clean table. Self time partitions the sampled time;
inclusive ancestors overlap and cannot be added.

| Actually burning | Whole gameplay-smoke group | `fireSamples` self | Metrics/fuel group | GC |
| --- | ---: | ---: | ---: | ---: |
| 1 | 16.14% | 15.18% | 23.26% | 1.34% |
| 3 | 32.25% | 24.90% | 10.23% | 1.22% |
| 4 | 39.42% | 30.64% | 7.37% | 2.30% |

The smoke group is an exclusive stack-attribution bucket containing source
production and smoke/sight queries. `fireSamples` is part of that bucket;
do not add those columns. The GC figures do not identify which allocator caused
collection. Some native builtin work remains attributed to caller self.

1. **Smoke detection creates/copies detailed fire-source rows.** In these
   no-visual profiles, `fireSamples` is called by `ventSmokeSignals`. The latter
   filters and reads rows without mutating them. The existing producer builds
   and freezes a tick cache, then returns `structuredClone(samplesCache)` by
   default. Its inclusive sampled shares are 15.25%, 26.64% and 31.26%. Those
   include required row construction and copying, not just an avoidable clone.
2. **Native heat/fuel calculation remains a large budget.** In clean pass 1,
   the native simulation/support counter averages 4.93 / 21.83 / 41.50 ms per
   host advance. Transport alone is a nested 4.03 / 14.38 / 24.39 ms. Do not add
   transport to that parent. Native caller self and ordering work need further
   source-specific attribution before proposing solver changes.
3. **Metrics and fuel bookkeeping matter, especially for the small fire.**
   Clean pass 1 spends 3.23 / 5.37 / 6.98 ms per advance in metrics queries.
   An ordered-prefix/cache implementation already exists; duplicate-looking
   calls are not proof of duplicate expensive work. Preserve exact ledgers and
   numerical association in any later change.

Smoke refresh happens before the host's next native step. Much of its work
therefore lands on intervening advances, which are not cheap idle frames. For
example, four-building pass 1 averages 98.87 ms on new-native advances and
74.80 ms on intervening ones. Simply changing the fire tick rate is not the
smallest next experiment and would alter the accepted timing rules.

## Recommended next experiment, not implemented

In the internal read-only smoke consumer, test the existing
`trial.fireSamples({borrowImmutable:true})` option. Keep the public default
mutable-copy behavior and the existing cache construction unchanged. This is a
consumer change, not a new cache/ownership framework or a solver simplification.

Prove exact smoke signals, NPC memory/reactions and native/host states across
ordinary play, closed/open doors, falling/retired sources and reset. Then compare
the same no-visual cases with matched controls and repeat-drift reporting.
Measure the avoided clone separately from row construction/sorting. The whole
31.26% inclusive envelope is **not a predicted removable saving**. Art, UI,
producer mutation semantics and physical rules stay outside this proposal.

## Evidence, review and cleanup

Root independently checks all 5,400 raw advances, 1,080 measured advances, every
available distribution/phase delta, exact native and gameplay host state and
input ledgers, actual HTTP source bytes and zero-visual-work counters. It also
independently weights all 41,586 CPU samples and recomputes function self and
deduplicated inclusive attribution. All 3,679 frozen package files and 50
unrelated coder files remain byte-identical. Semantic grouping and interpretation
retain the explicit limits above.

Source02 pins:
`5a1f420edb70059c360acbe24eb46b6a1c908af219ee455ed0bab52d6c72afbe`.
QA simulation overlay:
`0603fd009b80eda451f32a54232298a12ac684a5ce5f9faeef8dc83a3e723219`.
QA scalar-counter overlay:
`c2d18e4085bdd44bfa1357d14f3a358586d4f6768a8583ba30a7769f78851aaa`.
Control package remains
`3ecee12e361b559de35149b45979ea11235da86d1a5ce38b0a68465730d8b05b`.

The first launcher path named an older removed bundled PowerShell; no process
was created by that attempt. A later first-case validation failed when Playwright
transferred the large native DTO as a nested object. Both failures remain
preserved. Source02 changes only that post-window transfer to separate ordered
JSON text; timed/runtime overlay bytes stay unchanged. No endpoint equality or
accepted clean result is claimed for the failed attempt.

Actual clean/profile suites both exit 0 and close their contexts. Profilers are
stopped, disabled and detached. Fresh root checks verify nine recorded process
identities and six ports from the failed/successful suites are closed. No helper
or preview is retained. Raw data and full profiles are local in the coder's
`artifacts/qa/visual-half-cost/no-visual-cpu-{source-02,clean-02,profile-02,analysis-01}`
and architect's `artifacts/qa/no-visual-cpu-2026-11-26`; the tracked summary records
their identities, but a fresh clone does not contain every raw artifact.
The game, master and Pages are unchanged.
