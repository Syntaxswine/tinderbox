# TB-018 coder handoff

Candidate branch: `codex/row-ignition-coder`, based on architect checkpoint **`3c6001d5d4035e950f25e500294eaec55bbf81d2`**. The final delivery supplies the exact candidate SHA. Earlier coder branches remain preserved. This is the core/code-side candidate for Milestone 06; TB-019 art, TB-020 UI and TB-021 combined acceptance remain pending. No integration promotion or deployment is performed.

## Result and changed paths

- `src/content/{buildings,neighborhood}.js`: derive Monroe neighbors from native full-side 7m placements, retain source-local left/right IDs, trim only joined foundation rims, and attach native .16m heat/impact barriers. Reject asserted joins, conflicting/partial joins and unrelated overlap. The street is 51 x 47m with eight instances from six designs; the original six placements, player, civilians and camera remain. The new units are `(34,31,q0)` and `(41,31,q0)` beside `(27,31,q0)`.
- `src/simulation/{config,field,geometry,index,tools}.js`: authoritative finite torch phases/timer, first-light then one ignition per later rising edge, continuous world-time burn while moving/holstered/dead, pause/powder handling and release gates after cancellation. Matches seed one world-aligned 1m tile with fuel/obstruction checks and explicit result/tile/cell feedback. The existing solver gains configuration-driven gas/grass/timber transfer rates. Snapshot nested data is detached. Discharge v1 is unchanged; successful active torch ignition is a one-tick pulse.
- `tests/simulation/{row-ignition,discharge,model,safety}.test.js` and `tests/integration/neighborhood.test.mjs`: all four row rotations, invalid joins, per-unit partial/complete burnout and reset, surviving party barriers, exact 4/16-cell match tiles, no adjacent direct heat, unsuitable/spent/gas/blocked targets, continuous torch lifetime and stale-input handling, 30/60/144Hz recordings, held-out fuel traces, and the extended route to both new frontages and the row's exposed end/rear lane.
- `tools/{fixtures,smoke-neighborhood-package,build}.mjs` and `workbenches/simulation/{index.html,example-snapshot.json,fixtures.json}`: reuse existing diagnostics, record authoritative row/ignition fixtures, check the eight packaged instances and join IDs, refresh simulation examples and correct the diagnostic torch hint. No new tester is created.
- This directory contains the exact shared [contract](contract.md), deterministic [fixtures](fixtures.json), two package receipts and [cleanup](cleanup.json).

Artist-owned implementation, all `src/ui` and UI tests, raw art/vendor/intake bytes, architect documents, `workbenches/integration/**`, and `tools/review/{export-neighborhood.mjs,render-neighborhood.py}` are untouched. The old source art still assembles the eight instances during the loader check; that check does not accept joined-side windows/eaves/trim or carried-flame presentation. Those semantic checks must run against the artist's exact candidate. Existing UI tests are regressions only; the new labels/timer/feedback must be checked against the UI candidate.

## Shared interfaces and sources

The [contract](contract.md) records `building.partyWalls`, nested collider `heatBarriers`, detached `player.torch`, normal ignition event results and match tile bounds. Both art and UI read `player.torch.phase` for carried light, rather than `usingTool` or held primary. Torch stock remains the only timer authority; default 5/.12 gives 41.6667 world seconds. Lighting costs no match and emits no ground heat. A successful later use emits one active v1 discharge tick; carrying alone emits no heat. Burnout preserves original party-side intent until reset, and each surviving unit retains its own barrier and finite fuel group.

No new source intake is performed. Preserved source pins and hashes remain in `assets/art/neighborhood-intake.json` and the existing vendor provenance manifests: artist **`56b028c2935b5a97fe259618f38e0a1550928ab4`**, Nautilus windows **`90054d07134116a5d9661f8318a76fe68f922aad`**, Farmyard **`30a3b8cae5f36bb0c1df3685b7fba16f701c2083`**, and native bear **`4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`**. All imported source geometry, textures, native dimensions, source notices and provenance remain unchanged. This task adapts placement and simulation; it does not stretch source meshes or consume the artist's v2 work.

## Verification

- `node tools/check.mjs`: **95 tests pass**, 83 own scripts pass syntax, 107 static modules resolve, one shared Three pair and provenance checks pass; all five byte-preserved art imports and 25 art syntax/dependency checks pass. The new row/ignition file has ten meaningful behavior tests. Existing gas trail chase, finite-fuel/barrier, movement/pouring/inversion, barrel, source/native-geometry, disposal, bear and UI regressions remain passing.
- `node tools/fixtures.mjs` and `node tools/fixtures.mjs --row-ignition`: refreshed the existing diagnostic samples and generated six independent 4m material traces, match targets at .5/.25m resolution, a carried/holstered/powder/paused torch timeline and the eight authoritative building descriptors. Fuel accounting is conserved in every trace. These are deterministic game traces, not physical measurements or art/UI acceptance.
- `node tools/build.mjs`: **129 files / 43,142,606 bytes**. `node tools/check-release.mjs`: all 129 packaged hashes and relative resource references pass. Review workbenches, engineering records and helper receipts are excluded from the public package.
- `node tools/smoke-neighborhood-package.mjs`: **36 nested-path HTTP resources**, eight actual catalogue/texture loader requests, eight native-scale source instances from six designs, two centered windows and the three-unit authoritative join IDs pass. All packaged raw/support hashes match. Receipt: [package-neighborhood.json](package-neighborhood.json).
- `node tools/smoke-bear-package.mjs`: **26 nested-path resources** and the existing native bear loader source pin pass. The existing smoke's receipt retains its original task label; this is its TB-018 regression run. Receipt: [package-bear.json](package-bear.json).

The held-out 4m traces in `fixtures.json` give the following results. Burn duration is the local source cell's lifetime, not burnout of the entire trail. Small world-time differences under powder are fixed-step quantization.

| Fuel | Normal arrival, world s | Powder arrival, world / active s | Source burn, normal / powder world s |
| --- | ---: | ---: | ---: |
| Gasoline | 1.0833 | 1.0792 / 3.0833 | 1.1167 / 1.1142 |
| Grass | 2.0167 | 2.1058 / 6.0167 | 3.2000 / 3.2108 |
| Timber | 5.3500 | 5.3333 / 10.5333 | 12.0000 / 12.0108 |

These prototype rates preserve the existing gas baseline and make grass slower/shorter than timber. A separate held-out barrier test stops the gas front; the existing 4m cardinal/diagonal regression remains 1.0833/1.1167 world seconds at both .5m and .25m resolution.

## Remaining acceptance and cleanup

The known disabled-WebGL browser gate remains. No recovery attempt, new browser/tester, screenshot, renderer success or GPU performance claim is made. The architect owns combined JPGs and actual desktop/phone runtime review. The artist still supplies derived joined-wall geometry/windows/eaves/trim/UV/disposal and carried-torch visuals; the UI specialist supplies LIGHT/IGNITE/SPENT, timer and rejection feedback. This candidate's passing core/package checks are not full milestone or visual acceptance.

Buildings retain the accepted coarse ground-fuel proxy, including the brick-skinned Monroe; masonry party barriers do not introduce room/roof fire or structural collapse. Native closed doors remain nontraversable. Row fuel checks cover the authored grid-aligned placements at all four quarter turns. Match seeding is exact at the required .5/.25m resolutions; other accepted solver sizes use conservative fully contained cells rather than leaking direct heat across the selected tile.

No retained preview or helper was created. Both foreground package commands completed and their finally blocks closed the servers; their real 30-second timeout is a fallback. PID **69248 / port 52090** and PID **56152 / port 52102** are absent and both ports were independently verified released. Prior registered original helper lifetimes were checked at task start and had exited. The [cleanup receipt](cleanup.json) records the checks. No task-owned disposable helper remains running.
