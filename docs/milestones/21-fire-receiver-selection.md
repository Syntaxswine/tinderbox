# Milestone 21: isolate radiation receiver selection

The owner accepted this next investigation on November 12, 2026. The architect assigns one bounded numerical experiment to the existing **Coder Tinderbox** worker. Preserve the accepted furnished-house replay, the completed grass cases and the matched nonburning case. This assignment does not authorize production tuning or a Pages release.

## Question and frozen evidence

The bedroom start reaches 50% of original house fuel-surface area at 156.300s without a lawn, versus 117.466667s with either burning or nonburning lawn. The nonburning run also reproduces the grass case's 90% time. Grass combustion is not required for those advances. Added cells, passive fuel/capacity, geometry and receiver selection have not yet been isolated from one another.

Use the coder's clean `66febf337a41124e0704d1c591a09a1b396bd83f` checkpoint, following primary `9302065183fecf446f0485018cffaf72a839f0da`. The accepted expensive reference remains `ee1d10b374ebe91ecc0011bedf39dab1e8fd8874`. Reuse the cached raw evidence in the coder checkout:

- `artifacts/qa/furnished-house-grass/bedroom-control/`: no-lawn reference through 330s.
- `artifacts/qa/furnished-house-grass-bedroom-matched-180/`: identical lawn fixture unable to ignite, through 180s.
- The primary grass case only as an already saved comparison; do not rerun it.

The original house measurement cohort is 4529 fuel identities, 879.0518539309301m² authored fuel-surface area, and the same ordered 4988 original control-cell identities. Grass is a separate cohort. Keep the source data SHA-256 `3a705131c3922ab33c86e269e5020ec08bea93de0eeeaab317c6ab90f001d7a1` and fixture bytes unchanged.

Code inspection found that blocked-up redistribution runs on burning-source output; passive warmed cells are not themselves transported again. Cached escaped-heat shares at 2s and 120s do not establish a simple heat-retention explanation. These observations guide this test; they are not a general diagnosis or a physical validation.

## One intervention

Run the **nonburning-lawn bedroom** case with radiation receiver selection supplied by the **initial no-lawn representative set and selection algorithm**. Keep the lawn present: all cells, positions, passive fuel, thermal capacity, geometry, neighbor links and other transport behavior remain as in the previous nonburning case. Keep its grass ignition threshold at `Number.MAX_VALUE`, all other profiles/rules, the tick-1 bedroom command, 1/30s fixed step and 1.5m/s east ambient wind unchanged. This is the existing ambient control, not obstacle-resolved Nautilus wind.

The opt-in diagnostic may replace only the representative/candidate selection used to choose target identities and their order. Reconstruct the no-lawn initial representatives with zero simulation steps. For every actual source position, apply the original distance, range, sort and 24-link selection policy to those representatives. This defines selection even for a newly created or moved source cell; do not silently fall back to lawn selection. Resolve each selected identity into the live lawn scene and fail on missing or displaced targets. Report source coverage and any new source cells explicitly.

Do not freeze visibility, boundary transmission or path invalidation to their initial values. Trace chosen links against the live lawn scene and retain the existing ray queue, allowance, incidence/area calculation, scaling, energy accounting and invalidation behavior. If a selected cell's live fuel area/capacity differs from the no-lawn cell, report it and retain the live value: this trial isolates selection, not all passive-fixture effects. Do not move shared canonical cell centres, remove lawn cells, substitute no-lawn geometry, or alter coefficients to recover a desired timing.

Keep the default path unchanged. A separate diagnostic adapter or an explicit opt-in hook is acceptable. Avoid a general-purpose transport redesign. Record the exact patch and execution hashes so the intervention is reviewable.

## Bound and process lifecycle

One new **120-world-second** trajectory, stopping before the saved first grass ignition (162.7s) and first floor failure (154.0333s). If a threshold is not reached by 120s, report that bound. Do not extend the run to make it reach 50%, add more cases, sweep parameters or rerun either saved baseline.

Short initialization/unit checks and at most a 2-world-second disabled-hook equivalence check are permitted. Before the measured launch, verify immutable inputs, cohort equality, reference-target coverage and the default-path equivalence. A failed preflight should stop before a trajectory is launched.

Use one new worker process with a hard **900-second total lifetime**, including preparation and archive finalization. Give it exact PID/creation-time ownership, a private graceful stop mechanism and an independent deadline. Follow the global helper policy, including a durable source/restart record and registration if retained. No server, browser, GPU worker or watcher is needed. Preserve partial results on interruption, close archives, verify exit, and report the actual lifetime. Do not renew a deadline or restart a failed measured trajectory automatically.

## Evidence and acceptance

Deliver a compact report plus machine-readable comparisons, not a new visual replay:

1. Initial domain, fuel/capacity/geometry and ordered original-house cohort equality to the saved nonburning case; only the declared selection mode differs. Record no-lawn representative/candidate/selected-list counts and digests, live-target resolution, selected-cell area differences and source coverage.
2. Checks that the disabled path retains the original selection/results, chosen identities/order follow the no-lawn policy for representative source positions, live boundary changes still invalidate/update transmission, and the finite heat/fuel accounting remains valid. Run other relevant code checks for the actual patch; do not substitute a broad expensive burn suite for focused evidence.
3. Samples at 1Hz through 120s with original-house state digests, current/ever ignited area, heat ledger by entry, generated heat, stored heat and escaped share. Compare to the cached no-lawn and nonburning prefixes using identical sample keys and denominators. Compare semantic events after omitting only the global event counter. Distinguish an exact event time from a difference bounded by saved sample frequency.
4. Report 10%, 50% and any other threshold actually reached, first exterior timber ignition/side, and area/ledger differences at 30, 60 and 120s. Distinguish a partial shift, a recovered control trajectory and a divergent trajectory; do not turn aggregate similarity into a claim of state equivalence.
5. Exact commit SHA, changed paths, source/fixture hashes, checks and limitations, raw artifact locations, and helper cleanup receipt. Commit/push the candidate in the coder's existing checkout; preserve the previous branch/checkpoint. The architect reviews before any later integration.

If the early advance changes, that implicates receiver selection **within this model**. If it persists, other fixture effects remain. Either outcome leaves the below-soil representative/path issue, incoming street/lawn fire, grass visuals, and physical calibration unresolved. Those are later bounded proposals, not automatic follow-on runs.

## Ownership

Coder: reuse `C:/Users/baals/.codex/worktrees/coding-9200/tinderbox`, starting at `66febf33`; create a `codex/` task branch there if clean. Do not import the architect's unrelated stockyard ancestry merely to obtain this document; read the brief directly or copy its single documentation patch.

Architect: scope, frozen evidence, independent comparison and final review. Artist/UI have no new assignment in this numerical investigation; their existing work remains separate. The stockyard authoring draft and production `master` remain unchanged.
