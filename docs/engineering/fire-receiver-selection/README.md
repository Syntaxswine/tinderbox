# Radiation receiver selection: bounded isolation

Changing only radiation target selection recovers the cached **original-house trajectory without a lawn through120s**: all121 saved1Hz house-state digests and all2114 semantic events match exactly. The lawn remains present, with the same nonburning profile, geometry, fuel and thermal domain. This implicates receiver selection in the earlier bedroom acceleration **within this model**. It does not validate real fire rates, the below-soil path approximation or later behavior.

The [Milestone21 brief](../../milestones/21-fire-receiver-selection.md) is copied alone from architect commit `ae4169910f5144ee94941be04ed1d0a4b8905230`. This candidate starts at `66febf337a41124e0704d1c591a09a1b396bd83f` on `codex/fire-receiver-selection-isolation`; no stockyard ancestry or other checkout was imported. Existing primary and matched results remain intact.

## Intervention and preflight

The opt-in `radiationSelection` hook replaces only selected target identities/order. The existing default selection remains intact. Diagnostic targets use the initial178 representatives without a lawn, applying the original distance cutoff/range/sort/24-link algorithm at **each actual source position**. Every selected identity resolves into the live lawn scene, failing if absent or displaced. Live area/incidence, visibility, invalidation, queue allowance, weighting/scaling and heat accounting remain in the existing code. An optional ray observer records the values actually used without feeding changes back into transport.

Preflight verifies immutable data SHA-256 `3a705131c3922ab33c86e269e5020ec08bea93de0eeeaab317c6ab90f001d7a1`, exact lawn-fixture bytes and initial domain equality to the frozen nonburning scene. All rules/profiles, tick1 bedroom command,1/30s step and1.5m/s east ambient wind match that saved case. This is the existing ambient control, not obstacle-resolved Nautilus wind. The original-house cohort remains4529 fuel identities/879.0518539309301m² authored fuel-surface area and the same ordered4988 control-cell IDs. The full lawn scene remains7270 cells/5442 finite fuel identities; its extra cells never enter the house digest.

The sole permitted **2s disabled-hook check** matches the cached frozen nonburning run at0/1/2s: house-state digests, every full metric and raw events all equal, with valid ledgers. This verifies frozen behavior in addition to unit checks for absent/null option handling. Only after that passed did the one measured120s trajectory start.

Initial target coverage resolves178/178 reference representatives, with no displacement or capacity change. The lawn's original selection used248 representatives. For the two thermal cells of the first ignited bedroom floor:

| Source cell | Candidates without lawn / with lawn | Original targets retained by lawn selection |
| --- | ---: | ---: |
| `0,1,10` | 119 /143 | 2/24 |
| `0,2,10` | 120 /141 | 4/24 |

The one initial area change is retained: target `11,-1,-6`, .03822502199999994 → .24822502199999988m², capacity.25 in both. Actual traced live values show this target on78 links, all with transmission0. Other selected target areas/capacities retain their reference values during this run.

## Source coverage and state evidence

All **867 actual source cells**, **20,808 selected references** and **20,808 ray builds** were verified against the frozen policy, with no missing/displaced targets, pending selected pairs or fallback. All actual sources were in the initial reference domain; new-source count0. Focused tests separately exercise new/distant source positions without fallback. [source-coverage.csv](source-coverage.csv) provides each source position, candidate/selected counts and order digests. Full selected identities and ray measurements remain in raw `selection.json`.

Reference-representative digest: `0ee7146b52b0339944e3abef2f3abfdca395bd585bf7b79ffe411feccf8bd414`. Actual-source selection digest: `c6c86aa7b6f693d44d13a6751228882e3c43d4ee5efa748aa79c6ef5382a3e3e`.

The measured and cached reference house-state sequence digests both equal `c2cbe67b0ddd173cbc153f71f33f0869eef2eacb4b1e2d496b08718af1914658`. Their semantic-event sequence digests both equal `30c7d93730e5ff226b83e5b395ff91bd7d95c01ad313df9eca47c263c3a89394`; only the global event-counter `id` is omitted. This establishes sampled house-state and exact event-prefix recovery, not equality of the entire enlarged world or behavior after120s.

Against the saved nonburning lawn with its ordinary selection, the first different saved house state is2s/tick60, after the identical1s/tick30 sample: onset is bounded to(1,2]s by1Hz evidence. The first semantic mismatch is an additional window break at9.066667s/tick272 in this run; the next cached event is a floor ignition at9.100s. These are different events, not a measured .033333s delay of one event.

## Thresholds, paths and checkpoints

| Threshold | Measured selection | Cached without lawn, prefix120s | Cached nonburning lawn, prefix120s |
| --- | ---: | ---: | ---: |
| 10% house ever ignited | 15.933333s | 15.933333s | 15.933333s |
| 50% | Not reached by120s | Not reached by120s | 117.466667s |
| 90% | Not reached by120s | Not reached by120s | Not reached by120s |

No later threshold is inferred. First exterior timber ignition is the upper west wall(-X) at1.466667s/tick44 in all three prefixes. No lower-storey exterior timber lights by120s in this run or the reference without lawn; the ordinary nonburning lawn reaches the east wall(+X) at119.600s/tick3588.

| World time | Measured/reference house current area | Measured/reference house ever area | Ordinary nonburning lawn current /ever area |
| --- | ---: | ---: | ---: |
| 30s | 156.013727m² | 164.177727m² | 156.013727 /164.177727m² |
| 60s | 271.032617m² | 304.920217m² | 265.286501 /296.856101m² |
| 120s | 351.399899m² | 422.756901m² | 398.426728 /469.728130m² |

At120s,48.092373% of the original house area has ignited, versus53.435770% with ordinary lawn selection, a difference of46.971229m². At60s the measured area is8.064116m² ahead of that case. Selection changes the developing trajectory rather than applying a uniform speed multiplier.

## Heat accounting

[comparison.csv](comparison.csv) retains every heat-ledger entry, generated/stored heat, original-house state/current/ever area and escaped share at1Hz for all three prefixes. [comparison.json](comparison.json) includes30/60/120s values and deltas by entry. Escaped share means cumulative escaped heat divided by generated plus applied input heat.

Compared with the reference without lawn, generated heat, applied input, ambient loss, cap loss and stored heat are equal at30/60/120s. The retained target-area difference reallocates heat between blocked and escaped accounting:

| World time | Blocked heat difference | Escaped heat difference | Stored heat difference |
| --- | ---: | ---: | ---: |
| 30s | +.030130247 | -.030130247 | 0 |
| 60s | +.228178696 | -.228178694 | 0 |
| 120s | +1.291730683 | -1.291730685 | 0 |

At120s the measured escaped share is.1542864955983, reference without lawn.15429068710975, and ordinary nonburning lawn.15473909819703. The lower escaped share here is **not added stored heat**; it is consistent with the retained blocked links. Global accounting remains distinct even though the tested house states/events recover exactly.

All finite ledgers pass: fuel error2.52317e-9, heat relative error1.96462e-11, both house+grass cohort reconciliation errors0, and maximum burns per fuel/tick1. Grass consumption remains0. The measured house burns126.94159317938977 fuel units by120s, exactly the reference value.

## Checks, source record and lifetime

Sixteen focused tests pass, including the frozen-source algorithm/order comparison, new-source coverage, missing/displaced target guards, live area/incidence, transmission updates/path invalidation, finite ledgers, retained grass and entrypoint lifecycle. Syntax and local dependency checks pass for the five changed/new executable entries and their12 static modules. The disabled2s equivalence and measured budgets pass. These focused checks accompany the requested experiment; no broad burn suite or repeated primary trajectory was run.

One worker, PID19468 / creation FILETIME134390054974167430, ran November12,2026 **20:04:57.416–20:05:55.283 America/New_York (EST)**, total **57.867 real seconds** including initialization, the2s equivalence and finalization. Its independent900s cutoff was20:19:57.416, with a5s finalization reserve. Exit0; no retry/extension. [The receipt](helper-receipt.json) verifies the lifetime is absent. No server/GPU/browser/watcher was started or retained.

[inputs.json](inputs.json) records the exact base/brief, source and fixture hashes, initial domain/cohort verification, target examples, profiles/rules/wind/command and patch hash. [simulation.patch](simulation.patch) is the exact execution patch against66febf33. [disabled-equivalence.json](disabled-equivalence.json) preserves the frozen-prefix check; [checks.json](checks.json) records validation. Raw evidence stays at `artifacts/qa/fire-receiver-selection/`: frozen execution modules/package, owner/restart record, inputs/fixture, complete result/snapshot/events/replay, closed1Hz trace and full source/ray selection tables. No presentation movie/archive was generated.

This is a scoped numerical candidate for architect review. Ground/path validation, an incoming lawn fire, visuals and physical calibration remain separate investigations. Default behavior and the existing published game are preserved; there is no production/Pages promotion.
