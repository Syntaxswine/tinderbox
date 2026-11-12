# Furnished house and its exterior lawn

All four primary cases completed330 world seconds within the original45-minute deadline. Both no-grass controls reproduce the frozen final snapshot and complete event trace exactly; all primary physical ledgers pass. **Causal interpretation remains limited** by pre-combustion fixture effects, below-soil thermal centres and the deferred matched trajectory. See the [measured results and limitations](results.md), [machine summary](results-summary.json), [1Hz area histories](area-history.csv), [zero-step path audit](path-audit.json) and [measured footprint](footprint.svg). Actual paired animated WebGL/JPG acceptance remains open.

Contract `5fd4311295716d02acc8af7bde21c21fe629deb2`, reporting clarification `691b57c33428244ba7ed22ddedb85eea18cf5c75`; frozen physical/reference base `d1bc6472a45c316e02c6ec020289610ef0bcbc4e`. The original accepted movie, native assets, physics rules/profiles, production game and Pages remain unchanged.

## Fixed inputs and footprint

The exact accepted `REPLAYS` data/command moved from `main.js` to `replay-data.js`. A focused check executes the original frozen UI function under stubs and verifies the complete generated commands, including source/observer and tick. The kitchen targets `[.1,1.1,6.25]` from `[1.4,1.1,6.3]`, with observer `[1.4,.48,6.3]`. That ray ends before the west timber face, on its positive-X interior side. Inspection beyond the target reaches the inner face at X=.08 with normal `[1,0,0]`; this inspection does not change the command. Actual first ignition is the interior floor patch `floor/l0/0,12` at `[.25,.48,6.25]`, 1.033333s. The bedroom command is preserved independently.

`grass-fixture.js` is additive. Grass off returns the original data object by identity. Grass on subtracts actual projected level-0 floors, porch, steps, soil-contact masonry and ground-contact source meshes from a grid-clipped lawn. Elevated roofs/window projections do not erase empty turf below an overhang. The occupied native union is 109.5312m²: 100m² house, 8m² porch, 1.5312m² entry steps. A bounding rectangle is not substituted for that occupied union.

The first fixture adds **199.5888m²** of grass in **913** deterministic clipped patches at actual Y=0. Its extent is X=-3..13, Z=-6.32..13: 3m axis-aligned padding of the measured occupied extents, not a uniform Euclidean offset. Cells align to the existing .5/1.06/.5m grid, origin `[0,.48,0]`. Fuel density is 1 existing prototype fuel unit/m², as in the existing grass-strip control; the existing grass threshold/delay/duration/energy remain unchanged. The exact mask, occupied-source provenance, area and mesh positions are in the saved fixture data and annotated `footprint.svg`. This plan is measurement evidence, not a runtime screenshot.

The native .36m stone top, .12m slab, .48m first floor, porch and overhang geometry remain intact. Turf at Y=0 does not imply direct contact with the raised timber. The grid places its representative thermal centre at Y=-.05. This is a potentially significant interpretation limitation: the centre may lie below opaque soil, and shared cells can merge physically separated positions. Retained physical/contact positions, representative-cell paths and actual boundary hits must be audited; plausible timings alone do not establish a valid above-ground route. No grid correction is made during the comparison.

## Measurements

Original house fuel identities are fixed at trial creation. Their area denominator is **879.0518539309301m² of authored fuel-surface area**: each original finite fuel record counts once, including separately authored finish layers, contents and stores. It is not unique architectural floor/skin area; coatings can overlap a core's physical surface. Descendant embers/spills map to their original identity without adding area. A finite store pulse marks that store's first combustion; current area requires surviving burning fuel. Grass is a separate cohort and never enters the house denominator/numerator. Structural, roof, storey and contents groups are also retained.

Every fixed tick records new ignition/threshold facts and finite consumption by lineage. Every world second records house/grass current and ever-ignited areas, original-house state digest, group progression and complete fuel/heat metrics. 10/50/90% times are exact tick times, not interpolated samples. Original facade wall patches and their first ignition remain distinct from their current falling/rubble pose; no cold removed surface is silently counted as lit.

The runner defines its exterior-wall cohort as canonical level0 clapboard wall patches, excluding windows, doors, casings and porch. A geometry-based cross-check against the exact lower-floor union confirms the same156 patches/68.37m², with no additional infills. All light in place; unignited count0/area0. Cardinal X sides and front/rear Z sides are explicit; absolute-X dominance breaks normal ties, so each identity belongs to one facade. Kitchen completion precedes grass and is not reported as a negative ring duration; bedroom's19.367s post-grass completion interval does not establish causation.

Shared-cell burning materials and nearby hot landings are directly recorded at the first grass ignition. Cached eligible local links are candidates, not unique heat attribution. Delayed radiation has no per-source provenance in the unchanged kernel. Further state-correct path audits use retained data rather than a new burn. Observations and demonstrated physical routes remain separate.

## One finite run and retained states

```
node workbenches/furnished-house/compare-grass.mjs --seconds 330 --deadline-seconds 2700 --out artifacts/qa/furnished-house-grass-new
```

The four primary cases run sequentially in one process: kitchen control/grass, then bedroom control/grass. All use the exact existing match, east 1.5m/s sampler/metadata, profiles and rules. Controls compare final snapshot/event hashes against [control-reference.json](control-reference.json). That reference preserves the earlier persisted physical trace; all six relevant physics/data Git objects are verified unchanged in d1bc6472. A failed reproduction stops interpretation before its grass case.

The complete helper identity, deadline and private graceful stop marker are in `owner.json`. Source/data snapshots and hashes are preserved before computation. Finally paths close each archive/dispose its trial and retain completed or partial results. No duplicate preview server or GPU session is created; architect preview4556 is not owned by this coder.

Each case retains exact replay/options, compact full final snapshot, event trace, area histories and compressed presentation frames at1Hz. Frames include full checkpoints at30/60/120/180/330s and the precise first grass ignition; others are retained deltas. Only newly published events accompany each frame, even at checkpoints. These are actual authoritative states for the renderer, not synthetic images. Archive receipts hash and confirm closure. They let combined visual work reuse the computation across views/settings instead of rerunning a long burn.

The executed driver originally queued matched-domain nonburning controls after the four primaries. The private graceful stop cancelled that optional queue at tick0 before the original deadline, preserving its partial state and raw exit1. All four primaries are complete; no matched trajectory ran. Its initialization retains identical grass geometry, area, fuel inventory, capacity and receivers with only an unreachable grass ignition threshold (fuel was not zeroed). Late attribution remains limited/inconclusive.

The delivered driver now defaults to only four primaries and refuses an existing evidence directory. Explicit `--matched-start kitchen|bedroom` selects only one bounded diagnostic, default2s and maximum180s; it never automatically starts two more330s burns. The scheduling/guard change does not alter primary physics. Original executed source copies/hashes remain frozen in the raw evidence. No new computation is needed to render the retained frames. The postprocessors `audit-grass-paths.mjs` and `summarize-grass.mjs` read those facts with zero simulation steps.

## Additive ground presentation contract

Open `/workbenches/furnished-house/?grass=on&lighting=building` for the selected grass fixture, or omit `grass=on` for the original default. Reload selects the data before constructing art; reset retains the chosen fixture and existing effect preferences. `grassFixture()` exposes a detached metadata snapshot. No new UI controls or artist renderer edits are included in the runtime candidate.

Source IDs are `grass-ground/{gridX},{gridZ}/{piece}`; canonical boundary IDs match, and fuel IDs are `fuel:{boundaryId}`. `grassFrame(frame,trial)` adds retained `grassGround` records with exact XYZ triangles, position, boundary/source/fuel IDs, phase (`fresh`, `char`, `burning`, `ash`), fuel/char/heat fractions, flame/smoke and ignition time. Initial/reset `frame.full` clears prior state. Changed frames upsert; camera/paused deltas carry `grassGround:[]` and retain state. Spent patches remain ashy rather than disappearing. The published fuel fraction normalizes an exhausted EPS remainder to0 without changing physical bookkeeping.

Grass fire samples carry `grass:true`, `part:'ground'`, and `buildingId:'furnished-exterior-grass'`. Ground remains separate from house storeys and the building-light aggregate, and must remain visible during an upper cutaway. Negative X/Z and actual Y must be supported. `data.comparisonFixture.houseBounds` retains the original house bounds so adding the lawn cannot silently enlarge the house's glow placement. The artist owns any coordinated ground drawing; the original building grade and accepted movie remain unchanged.

## Gate still required

Eleven focused checks pass: exact occupied-union clipping (including an L-shaped courtyard), native area/fuel/identity preservation, exact original replay commands, lineage through embers, phase/ash publication, selected-fixture reset/pause lifecycle and finite-runner overwrite/deadline guards. Full repository/package results are in the delivery. [The process receipt](helper-receipt.json) confirms the original worker lifetime exited. The architect owns coordinated same-camera/exposure/time exterior/cutaway JPGs, actual animated WebGL comparison and the conclusion about excessive acceleration. No reviewer calm-kernel timing is an acceptance target.

## Subsequent bounded diagnostic

The architect later authorized one new bedroom matched nonburning-ground run through180s with its own900s deadline. The [appended evidence leaf](bedroom-matched-180/README.md) records completion, identical50/90% times without grass combustion, exact saved-state/event differences and facade progression. It supersedes the deferred isolation status only for that bedroom prefix. The four original results and optional-stop receipts above remain preserved; ground-path and actual visual acceptance remain open.
