# Furnished Hopkins 15 runtime candidate

The isolated workbench implements the architect's milestone-18 contract at `3596f41cbeb0a85c648c44b789a838ed5a8dc139`. It is a candidate for combined replay review. Production does not import it, and the normal public build excludes it.

## Frozen sources

- Runtime base: `c855e627bdee963e930644839a60c027a03935de`.
- Reviewed experiment: `9b521a20d888a92197c75f03fbb75f762bf4ba67`. Original kernel and scene bytes remain under `workbenches/furnished-house/upstream/`; [intake.json](intake.json) records source paths, SHA-256 values and adaptations.
- Final measured house geometry: artist `e3e0caa`, `house-data.json` SHA-256 `3a705131c3922ab33c86e269e5020ec08bea93de0eeeaab317c6ab90f001d7a1`.
- Atomic debris/current-support presentation: artist `66a49e39a775faee7ba5c6f259109e4a314372da`.
- Final bearing/ownership runtime correction: `5f1793b4a22f3bd76ee5e0214e9d8633b78fbdf7`.

The original native assets retain their existing dimensions, UVs, paint, source bindings and notices. No additional donor files or production dependencies are introduced. [API.md](API.md) records the shared manifest/frame contract.

## Running the candidate

Use the existing bounded `tools/serve.mjs` and open `/workbenches/furnished-house/`. The runner uses the original unarmed goat, one shared Three renderer, the game's orthographic normal zoom (12.6 m vertical span) and published `createStreetNight` lighting. Play/Pause, Reset, one-second steps, explicit world playback speed, exterior/occupancy/cutaway/x-ray views and the two replay starts are available. A click uses the selected reachable match, actual-height flame ray, thrown lantern or door action. World seconds remain visible.

Workbench-only `window.__furnished` exposes the replay, authoritative snapshot, diagnostics and explicit inspection/capture controls. `setObserver` is a diagnostic placement, not evidence of walking. `sampleStep` returns simulation/presentation/render CPU costs; `setAutoRender(false)` prevents continuous rAF work during a bounded explicit capture. Camera-only/paused redraws send empty retained deltas, preserving current geometry and effects without replaying resets or tombstones.

The current wind is the architect-approved labelled ambient sampler, east at 1.5 m/s, plus calm control. Art and physics consume the same metre-coordinate sampler. **There is no obstacle-resolved Hopkins wind bake.** The Ashland-specific field is not used here.

## Geometry, movement and support

Thermal cells measure .5 by 1.06 by .5 m; they clip the actual source polygons instead of expanding native walls or filling the stair void. Floors retain their real union and inferred .12 m closed slab. Canonical patches share opening, collision, heat, fuel and support state. Diagonal crossing queries include simultaneous edge/corner boundaries. Native wall/door prisms extrude only their exterior edges, avoiding internal triangulation parity obstacles. Moved doors invalidate affected cached paths while retaining their actual open-leaf collider.

The full 29-waypoint entrance, kitchen, twelve-tread stair, upper side-exit and reverse route passes: 44.932 m walked at 9 m/s with radius .5 m, height 1.66 m and max step .22 m. The closed leaf blocks correctly. No mid-route placement, collider suppression or invented forward landing establishes this proof. [route.md](route.md) records the approved native compositions and narrow steering margins; [passage.json](passage.json) contains the measured native gait. The architect independently reproduced the route and its floor-height oracle.

The final graph has 4363 initially supported wood/fitting nodes, 414 anchors, 913 grounded inert nodes and zero unresolved wood or unrooted inert nodes. Local source bindings and actual contacts form a bounded connectivity graph. Fitting links are directed from bearing to fitting, so ornaments cannot bridge structural nodes. The inferred native stair flight requires both real landings. This is connectivity, not beam stress engineering.

A shared `prepareFurnishedData` adapter binds the two original chimney meshes to six actual roof hosts as one inert item, removing static duplicate surfaces. Both art and physics must consume the prepared manifest (`trial.scene.data`). The adapter adds no fuel or fictional lower stack, and a cold chimney falls when its real roof bearing disappears.

## Fire and falling fuel

A fixed 1/30 s step settles finite heat before advancing charring, ignition, structural loss and spills. Local/radiant/retained shares are .72/.16/.12. Blocked buoyant energy is redistributed once; uniform .18/s cooling, cap and escape terms close the ledger. Radiation uses actual exposed paths, an 8 m range, 2 m receiver bins and at most 24 representative links per source cell. A deterministic FIFO processes 48 queries per tick. Deferred energy cools and expires after one second with an explicit escape entry. These are declared game approximations, not a validated fire-engineering solver.

Load-bearing fuels have nominal 180 s profiles; the tracked 15% ember remainder detaches after **153 s of that patch's own sustained burn**. There is no house-wide collapse timer. Mechanical support loss may precede material burnout and preserves the original fuel ID, amount and own age. Door, furniture, cloth, lacquer, oil and coal have separate explicit profiles. Finish is finite physical fuel and is never inferred from gloss.

Falling burning fuel burns once per tick and retains its identity. Landing requires real area on the contacted physical face, including an existing fitting top. A zero-area floor-edge/corner touch remains a graze; gravity continues to the next actual bearing. The landed footprint is clipped to that real face, and its retirement releases the same fuel again. Current fall/rubble/support IDs take precedence over original source provenance.

Landed structure, embers and oil become persistent, supported **1 cm nonbearing rubble**, an approved step-over approximation rather than a rigid-body pile. They add no fuel. Spent ash has zero flame/smoke; cold inert falls have null ignition. Oil reacts only at its declared store threshold, spends its finite pulse from the same amount and follows clear supported/falling routes. A thrown lantern retraces after glass contact, including a following masonry barrier in the same step.

## Checks and evidence

Run `node --test tests/furnished-house/*.test.mjs`: **29/29 pass**. Coverage includes canonical faces, diagonal barriers, real wall thickness, moving-door invalidation, finite oil and retries, exposed-side smoke/heat, glass then masonry, actual furniture foot contacts, component retirement, inert stove/chimney falls, attachment fragments, native stair gait, persistent ash, grazing contacts, skipped landing/retransfer and same-ID flight reactivation. Five 180 s fixture schedules agree through material failure, landing and ash.

The final paired trace uses one 1.05-energy match at kitchen `[.1,1.10,6.25]` or bedroom `[.1,3.13,5.25]`, with identical profiles and east wind:

| 330 s trace | Kitchen | Bedroom |
| --- | ---: | ---: |
| First material floor failure | 154.033 s | 154.033 s |
| Own burn age at that failure | 153 s | 153 s |
| Oil release | 1.833 s | 158.300 s |
| Coal ignition | 11.533 s | 167.733 s |
| Event count | 17,327 | 14,419 |
| Serialized state | 10.87 MB | 10.52 MB |
| Fuel error | -3.08e-8 | -1.62e-8 |
| Relative heat error | -4.38e-11 | -1.99e-11 |
| Escaped fuel | 0 | 0 |
| Current-owner audit failures | 0 | 0 |

All 66 ten-second stage audits pass. Five additional actual-house 10 s frame schedules have identical state hashes and drop no world time; this is distinct from the long fixture matrix. Full inputs, events, stage metrics and hashes are in `artifacts/qa/furnished-house/paired-bearing-330.json`, with durable stdout beside it. [final-trace-summary.json](final-trace-summary.json) preserves exact sources, trace/replay file digests and the final serialized-state digests. Full snapshot files were not persisted by that runner; their recorded hashes must not be described as file hashes. A kitchen start reacts with nearby stores early; a bedroom start reaches them after upper-floor failure. The same first floor-failure time follows its independently ignited patch's own clock, not a global house timer.

Final numerical controls rerun successfully with unchanged results: grass 1.509–1.563 m/s across 32 directions (max target error 4.17%); wall rise/creep ratio 2.109; sealed lower heat 0 before failure and ignition 1.567 s after hot landing; covered-aperture 2 m/8 m dose ratio 16, glass .05 of open and masonry 0; published powder scales yield 3.5 world/15 player seconds per 10 active seconds. [controls.json](controls.json) is the curated result; the full fresh receipt is `artifacts/qa/furnished-house/controls-bearing.json`.

Concurrent Node step costs were kitchen 18.79 mean/38.07 p95/101.89 max ms and bedroom 25.38/44.65/306.37 ms. They exclude renderer work and are **not quiet hardware or GPU usability acceptance**. Initialization is separately recorded in the full trace. The architect owns matched normal-zoom browser costs, final real-renderer JPGs and portable animated replay.

Earlier failed evidence remains separate: the withdrawn initial long run's grazing-impact event storm/serialization failure, the stale retained-flight WebGL images, and `paired-eb1cd8c-owner-failed-330.json` before real bearing-area acceptance. Those runs establish the defects and are not accepted previews. The final runtime has no orphaned active owners or escaped fuel in either 330 s trace; actual sim-to-art and WebGL verification remain required.

The architect's final combined check on the corrected 5f source passes **320/320 repository tests**, syntax, dependency and vendor verification; the build/release checks pass with 3515 packaged files. The coder's earlier nested-path HTTP/source loader also passed those files, all three native characters and the four menu destinations, and explicitly does not claim WebGL acceptance. The subsequent typed-collection presentation correction, actual sim-to-art/WebGL review and quiet performance/video capture remain architect-owned.

[helper-lifecycle.json](helper-lifecycle.json) records the finite task-owned checks and verified exits/ports. This coder retains no test server, browser, watcher or other service. No production promotion or deployment is performed by this candidate.
