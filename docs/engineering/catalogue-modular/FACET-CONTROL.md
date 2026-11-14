# Full visual-facet registration control

The first whole-map host adapter uses the actual existing native mesh material/coplanar facets for the seven exterior-only houses. The two upgraded artist sources are pinned at `d0598033` after plan `93b2ce99`; intake commits on the coder branch are `446cebb1` and `9f155df9`. The reviewed common base is `e07487fe`.

This is a preserved **costly representation control**, not production acceptance. The architect subsequently approved one bounded structural-source comparison, keeping the full map/models, host controller, thermal grid and solver coefficients. Keep the facet exporter available when adding that comparison. The native scalar legacy visit also remains its separate unchanged control.

## Actual checks

`node tools/check.mjs` passes **379/379 tests**, syntax/import/provenance/shared-Three and art checks. Log: `artifacts/qa/catalogue-modular/check-full-facet.log`. Six new host/bounds tests cover owner retirement, real host state/clock continuity, finite one-press match input, finite production cone energy and automatic powder with exact accepted-path pouring. Original M23 instance/support tests remain passing.

The first actual full-map construction failed because `bounds()` spread all map vertices into `Math.min/Math.max`. The retained `native-preflight/` failure led to an iterative bounds calculation with a 200,000-vertex regression. No source geometry or fire coefficients changed. `native-preflight-fixed-bounds/` then initializes and advances one quiet native tick with zero fuel/heat accounting error and no fire/falls.

The actual host continuity run is `artifacts/qa/catalogue-modular/native-continuity-01/`. Its 517 input-driven host steps reached **55 waypoints**: the whole native goat house approach, ground-floor route, twelve-step ascent, upper floor, descent and return to old street, followed by the shop ground-floor entry/aisle/exit. Player ID, authored body, inventory and clocks remain continuous. No teleport, body scaling, ignored collider or alternate game bootstrap was used. The original eight lots/Monroe joins, three pickups and three original NPC identities remain.

The run stops at shop route point 9: the turn from `[40,0,18.2]` toward `[48.5,0,18.5]` intersects the actual outward-open right entry leaf. Last player position is `[40.4747044284,0,18.2167542739]`; blocker is `bell-and-alder::entry-right/left@80,0,34`. The corrected source route needs a real street backoff at Z19. The original officer's straight Z18.4 patrol also stops at that open leaf. Neither finding is marked passed; no geometry is silently skipped. House/entry passes do not establish the remaining shop stair route or a full posed/equipment sweep.

## Measured cost and limits

Windows Node 24.15, no browser/GPU in this measurement. Whole-map registration has 11 instance identities (eight houses, shop, terrain, props), **123,918 canonical boundary patches**, **104,248 fuels** and **97,047 support nodes**. Initial support reports 7,824 unresolved nodes and 3,979 unrooted inert pieces; these inherited/adapter gaps are not proof of stable collapse behavior. They are retained for the representation comparison.

- Native registration: about 2.72 s; host construction reaches 17.42 s from process start; first publication about .93 s more.
- 517 host `advance(1/60)` calls: mean **235.596 ms**, p95 **356.645 ms**, worst **632.192 ms**. These include simulation/publication, without WebGL. They are not GPU times or isolated kernel timings.
- World time reaches 8.65 s; the whole command reaches its failure/cleanup at 142.273 wall seconds, including construction and evidence writes. RSS is about **2.14 GB** at that point. This is too slow for real-time phone play.
- Heat and fuel accounting errors remain zero in the dry run. No long burn, small-fire cost, actual host JPG, phone GPU budget or successful repeated-reset bound is claimed here.

The raw input list, accepted waypoints, per-step costs, source hashes, compressed initial/quiet/final authoritative states and failure stack are preserved. The checker exits through `finally` and releases its simulation. Exact task process: PID56564, creation FILETIME `134390861115483273`; its owning exec session96314 finishes with exit1 for the recorded route failure. It created no listening port or browser. Earlier preflight processes also finished; no service was retained.

## Input interpretation for the comparison

Facet quantities are declared prototype area-based inputs, not wood mass. Every visible thin box face/material was initially registered separately. The structural adapter must report area/fuel/capacity changes by source and material, identify duplicated coating/opposite-face inputs where relevant, and preserve finite inputs or explain the diagnosed difference. It may reuse native floor/wall/roof geometry helpers; it may not import the scalar housing solver's short burn timers or omit inert brick. Keep actual apertures, floor/stair holes, native pitch/thickness, party-wall joins, support and one-owner render bindings. Never tune the solver to recover a desired ignition timeline.
