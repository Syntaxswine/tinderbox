# Completed grass comparison: observations and limits

Four primary330s cases completed. Both no-grass controls reproduce the frozen final snapshot and complete event trace exactly, and all four physical budgets pass. **The evidence does not establish excessive acceleration caused by burning grass.** The added cold fixture changes original-house state by2s, grass representative cells sit below opaque soil, and the matched nonburning trajectory is deferred. No material/grid tuning or production promotion is included.

Exact commands, wind, sources, snapshots/events/archive SHA-256 values, budgets, group checkpoints and original-identity area definitions are in [results-summary.json](results-summary.json). [area-history.csv](area-history.csv) retains current/ever house and grass areas at1Hz. The house denominator is879.0518539309301m² of **authored finite fuel-surface area**, including separately authored finish layers, contents and stores; it is not unique architectural skin/floor area. Descendants map to original identities once; grass is separate.

## Primary timing

Times are world seconds. Every case uses the original tick1 match, rules/profiles and east1.5m/s ambient sampler/metadata. The Hopkins fixture does not claim obstacle-resolved Nautilus wind. Positive deltas mean later with the grass fixture.

| Event | Kitchen control | Kitchen grass | Delta | Bedroom control | Bedroom grass | Delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 10% house ever ignited | 12.500 | 12.500 | 0 | 15.933 | 15.933 | 0 |
| 50% | 36.700 | 37.000 | +.300 (+.82%) | 156.300 | 117.467 | -38.833 (-24.85%) |
| 90% | 119.600 | 118.767 | -.833 (-.70%) | 195.900 | 164.533 | -31.367 (-16.01%) |
| First grass | — | 156.967 | — | — | 162.700 | — |
| Oil release | 1.833 | 1.833 | 0 | 158.300 | 158.200 | -.100 |
| Coal ignition | 11.533 | 11.500 | -.033 | 167.733 | 167.467 | -.267 |
| First lower floor ignition | 1.033 | 1.033 | 0 | 34.400 | 34.400 | 0 |
| First lower exterior timber | 1.467 | 1.467 | 0 | 156.267 | 119.600 | -36.667 |
| First floor failure | 154.033 | 154.033 | 0 | 154.033 | 154.033 | 0 |
| First roof failure | 157.633 | 157.767 | +.133 | 157.867 | 157.867 | 0 |
| First porch/entry ignition | 50.600 | 49.900 | -.700 | 184.367 | 139.667 | -44.700 |
| First upper-floor overhang | 57.433 | 56.767 | -.667 | 60.000 | 67.367 | +7.367 |

The bedroom50% advance, its first porch ignition and all first overhang ignitions precede grass combustion. These are **pre-combustion fixture effects**, not burning-grass attribution or automatically numerical defects: cold receivers can absorb/redirect heat. Initial receiver selections demonstrably differ. The later90% difference remains causally unresolved.

The upper-floor overhang cohort is8 original level1 floor patches/2m² whose fuel centroids lie outside the exact projected lower-storey floor union, distinct from roof eaves. All ignite in place before grass. The machine report separately identifies the first timber, first in-place lower timber above the .36m plinth, initial exterior timber and later exterior ignition after grass, preserving identity/position rather than treating spatial coincidence as a heat path.

The fixed kitchen ray ends inside, before the west timber face. First actual ignition is the floor `[.25,.48,6.25]` at1.033333s, not an exterior lawn click; source/hit/normal evidence is in the [fixture record](README.md#fixed-inputs-and-footprint).

## Exterior completion

Geometry-derived exterior walls separate the exact lower-floor footprint from its outside. This cross-check equals the canonical level0 clapboard cohort:156 original patches/68.37m², no additional infills. Windows, doors, casings and porch are excluded. All ignite **in place**, with unignited count0/area0 in every primary.

| Facade; count / area m² | Kitchen control first–last | Kitchen grass first–last | Bedroom control first–last | Bedroom grass first–last |
| --- | ---: | ---: | ---: | ---: |
| West (-X); 40 / 17.60 | 1.467–38.933 | 1.467–39.567 | 156.267–170.367 | 152.500–165.500 |
| Rear (+Z); 40 / 17.60 | 9.433–47.400 | 9.433–47.400 | 165.433–195.300 | 125.600–182.067 |
| Front (-Z); 36 / 15.57 | 28.067–41.533 | 28.100–41.900 | 169.733–197.600 | 128.200–159.600 |
| East (+X); 40 / 17.60 | 29.433–42.100 | 29.467–42.200 | 189.767–197.600 | 119.600–131.900 |

Normal dominance assigns each original identity once; absolute X wins ties and position against the native footprint midpoint selects side. Front/rear denote coordinate directions, not inferred compass bearings.

Kitchen walls finish at47.400s, **already complete109.567s before grass**. There is no grass-to-wall completion duration. Bedroom walls finish182.067s, **19.367s after first grass**, but front/east were already complete before grass and every facade had begun earlier. That interval does not demonstrate a grass-driven ring or agreement with the reviewer's different calm kernel.

## Audited physical paths

The [zero-step audit](path-audit.json) compiles immutable source geometry and applies ordered saved boundary/window retirements through each inspected event. It uses the canonical heat boundary index, not all renderer/furniture occlusion. No additional burn was run.

- Kitchen grass first lights at156.966667s: `grass-ground/-1,13/0`, `[-.3333333,0,6.8333333]`. The shared cell contains burning landed sash/casing/rail fragments. Residue `rubble:mechanical:4698:attachment:-1:0:6` has .008550014m² retained footprint overlap with the first patch and a clear physical fuel-to-grass segment. This supports hot material reaching turf; unique heat contribution and calibrated rate are not recorded.
- Bedroom first grass is162.700s: `grass-ground/-1,7/0`, `[-.3333333,0,3.8333333]`. The co-located burning upper-wall ember's retained footprint has **zero overlap** with that exact patch. All co-located residue groups are reported. Shared-cell proximity alone does not establish contact.
- Grass is physically at Y0 but maps to **representative Y=-.05**, below opaque soil. In both inspected cases its upward representative path has transmission0, while a potential air-side physical path to nearby timber above the plinth is clear and both representative wall paths are blocked. This can suppress above-ground return and change lateral redistribution under the existing ceiling rule. Plausible timing does not validate that route.
- Kitchen163.567s entry rail inspection finds nearby previously lit grass: physical centre path transmission.02, representative lateral path1. Bedroom162.767s porch inspection finds the nearest earlier grass behind intact plinth/geometry: both paths0. These are spatial candidates, not proof of the heat source. Delayed radiation lacks per-source heat attribution in the unchanged kernel.

Raised native timber does not touch turf through the .36m stone plinth. The3m fixture preserves plinth, steps, porch and overhangs. Its measured union excludes109.5312m² occupied ground and adds199.5888m²/finite fuel units in913 clipped patches. Extent is3m axis-aligned padding of measured occupied extents, not a Euclidean buffer. [The annotated plan](footprint.svg) is measurement evidence, not a runtime screenshot; its caption correction required no burn rerun.

## Final state and budgets

Both grass cohorts fully ignite and exhaust by330s. Tiny physical EPS residues remain in mass accounting; presentation shows retained ash without altering that mass. Every global fuel/heat budget and house+grass cohort reconciliation passes: cohort fuel errors <5.3e-8 and generated relative errors <2.4e-12. Maximum burns per fuel/tick is1 throughout.

The lawn itself reaches10/50/90/100% ever-ignited area at158.767/162.767/166.067/167.067s in the kitchen case, and164.633/168.100/171.500/172.867s in the bedroom case. First-to-last grass ignition is10.100s and10.167s respectively. Nearest finite facade segments define the saved spatial sectors (X wins corner ties); each sector's first/last/count/area is in the machine report. This rapid lawn progression is an observation subject to the below-soil/lateral-redistribution limitation, not an accepted physical spread rate.

| At330s | Kitchen control | Kitchen grass | Bedroom control | Bedroom grass |
| --- | ---: | ---: | ---: | ---: |
| House ever area m² | 875.340 | 875.340 | 851.876 | 858.945 |
| House currently burning area m² | 49.458 | 49.381 | 281.717 | 74.800 |
| House burned fuel units | 593.686 | 593.676 | 538.961 | 576.344 |
| Active falls / rubble records | 0 / 2944 | 0 / 2949 | 28 / 2326 | 5 / 3184 |
| Intact original house boundaries | 1002 | 996 | 2254 | 1203 |
| Intact grass boundaries | 0 | 913 | 0 | 913 |
| Intact items | 3 | 3 | 4 | 4 |

Rubble/falls are current physical records, not extra original combustible area. House boundary counts exclude grass/terrain; the raw aggregate would otherwise add913 lawn patches. Exact failures by part, first support losses and group progression remain in the machine report and raw event traces.

## Execution receipt and open gate

One sequential worker ran07:05:20.342–07:50:14.137 UTC, elapsed2693.795s (44m53.795s), before original cutoff07:50:20.342. PID15872 / creation FILETIME134389407202656762 is absent, as recorded in [helper-receipt.json](helper-receipt.json). No server/browser/GPU helper was created and architect preview4556 was not stopped.

After all four primaries completed, the private graceful stop cancelled the originally auto-queued matched control **at tick0**, preserving partial state/events and raw **exit1**. `failure.json` and legacy `results-so-far.json` with `complete:false` remain truthful; they do not mean the primary cases failed. The initialized counterfactual keeps geometry/domain/receivers/capacity/fuel and changes only grass ignition threshold to `Number.MAX_VALUE`, **not fuel0**. No matched temporal isolation completed and no deadline extension occurred.

The delivered runner now defaults to four primaries only; an explicitly selected bounded matched diagnostic is separate, never automatic two more330s burns. Source copies/hashes from the actual execution remain frozen. All four compressed authoritative frame archives are closed and SHA-256 verified; full30/60/120/180/330s and first-grass checkpoints plus1Hz deltas support visual reuse without rerunning physics. Large raw files stay at `artifacts/qa/furnished-house-grass/`; the bounded report/history/audit/plan are committed.

Eleven focused checks and the standard342-test repository check pass, including exact frozen commands, native clipping/identity preservation, lineage/accounting, retained ground/reset/pause lifecycle, and overwrite/deadline guards. Syntax/dependencies, shared Three and provenance checks pass; the public build and3515-file nested-path/hash release check pass with the unchanged public manifest. [checks.json](checks.json) records commands/counts/hashes. The final postprocessing additions were also syntax-checked and executed without simulation steps. Actual same-camera/native-zoom/exposure/time exterior/cutaway JPGs and animated WebGL review still require architect/artist coordination. The original accepted movie stays untouched. These numerical results are a review candidate, with causal and visual limitations; they are not production acceptance or a tuning prescription.
