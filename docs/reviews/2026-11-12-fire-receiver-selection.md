# Radiation receiver-selection investigation

The [Milestone 21 contract](../milestones/21-fire-receiver-selection.md) investigates the bedroom fire's acceleration when a cold lawn is added. Proposal: `ae4169910f5144ee94941be04ed1d0a4b8905230`. Frozen coder baseline: `66febf337a41124e0704d1c591a09a1b396bd83f`. Reviewed coder candidate: **`b6838d004778faa6ca08914546499f6af27ce0b6`**, on `codex/fire-receiver-selection-isolation`. **Accepted as a numerical research checkpoint**, with the bounds below. The [candidate report and evidence](https://github.com/Syntaxswine/tinderbox/blob/b6838d004778faa6ca08914546499f6af27ce0b6/docs/engineering/fire-receiver-selection/README.md) remain on that isolated branch.

## Result and scope

Restoring the initial no-lawn radiation target selection, while retaining the nonburning lawn and its live geometry/thermal properties, restores the **original-house state at every one of 121 saved samples through 120s**. All **2114 semantic events** also match the no-lawn prefix, removing only global event IDs. Receiver selection accounts for the observed early house-state divergence in this tested prefix. This is a numerical-model result, not a validation of physical grass/fire behavior.

| World time | No lawn: ever-ignited house area | Nonburning lawn: original selection | Nonburning lawn: no-lawn selection |
| --- | ---: | ---: | ---: |
| 30s | 164.177727m² | 164.177727m² | 164.177727m² |
| 60s | 304.920217m² | 296.856101m² | 304.920217m² |
| 120s | 422.756901m² | 469.728130m² | 422.756901m² |

The denominator remains 879.0518539309301m² of original authored fuel-surface area, with 4529 original fuel identities and the same ordered 4988 control-cell identities. The result at 120s is **48.0924%**, versus **53.4358%** with the original lawn selection. The latter reached 50% at 117.466667s; the intervention has **not reached 50% by 120s**. Its eventual 50%/90% times, and whether it would retain the control trajectory after this cutoff, were not measured. Do not claim the complete 38.833333s advance has been reversed.

The intervention diverges from the old nonburning lawn at the first different saved house state, 2s. Its first semantic event mismatch against that case occurs after 126 matching events: a window break at tick272 /9.066667s, versus the next old-case ignition at tick273 /9.100s. These event times are exact fixed-step records; the state onset is bounded by the 1Hz sample interval.

## Intervention review

The opt-in hook changes selected target identities/order. The null/default path preserves the original selection code. Live target resolution, area/incidence, path tracing, transmission updates, queue work and energy accounting stay in the original runtime code. Missing or displaced targets fail explicitly. The diagnostic policy handles any source position using the initial no-lawn representatives without a lawn-policy fallback.

Independent zero-step inspection found 178 no-lawn representatives versus 248 lawn representatives. All reference targets exist at the same live positions. For source cell `0,1,10`, one cell of the first ignited bedroom floor fuel, only 2 of 24 selected target identities overlap between the two original policies. The fixed 24-link selection spreads choices through a sorted candidate list, so adding receivers can alter choices away from the lawn itself.

The completed intervention used 867 source cells, all within the original domain, each selecting 24 targets: 20808 recorded ray pairs. All 178 reference representatives resolved, with no missing/displaced target or initial capacity difference. One representative, `11,-1,-6`, retains a live area change from .038225022 to .248225022m²; 78 recorded ray pairs use that changed area. This confirms the trial did not silently substitute all no-lawn receiver properties.

Whole-world heat ledgers are **not byte-identical** to the control. At 120s, generated heat and stored heat match, while escaped heat is 47547.6693659320 versus 47548.9610966168 control units. All 78 changed-area link records have zero transmission: their larger live area changes blocked-versus-escaped accounting. Keep this distinction from the exact original-house state/event agreement.

## Verification and lifecycle

The architect independently inspected the hook/policy/tests, reconstructed initial representative coverage and area differences with zero simulation steps, and compared the completed raw result against the two saved prefixes. All 121 house-state digests and 2114 semantic control events agree. An independent calculation, using the original `Math.hypot` distance norm, also matches target identities/order for every one of the 867 actual sources. All ten execution-source hashes match both the preserved execution manifest and current candidate files; the native house-data hash remains unchanged. No baseline burn or additional measured trajectory was run by the architect. The accepted zero-step check records are the architect checkout's ignored `artifacts/qa/fire-receiver-selection-architect-source-check.json` and `fire-receiver-selection-architect-policy-check.json`.

The permitted disabled-hook check matches cached nonburning samples at 0/1/2s, all saved metrics and raw events exactly. The measured case completes 120s, with zero grass ignition, no floor/roof failure, zero fuel-cohort or heat-cohort reconciliation error, and heat relative error 1.9646214388165976e-11. The coder's final record verifies **16 passing focused tests**, five executable syntax entries and 12 resolved static modules. The tests cover the frozen selection algorithm, new source positions, unresolved/displaced target failures, live area/incidence, boundary changes/invalidation, finite budgets and existing grass/entrypoint behavior. No broad burn suite, new visual acceptance or later-time acceptance is claimed.

Changed paths in the candidate are the opt-in `simulation.js` hook; new `receiver-selection.js`, `run-receiver-selection.mjs` and `summarize-receiver-selection.mjs`; the receiver-selection test; the copied single milestone brief; the furnished-house API note; and ten report/evidence files under `docs/engineering/fire-receiver-selection/`. No source asset, native data or renderer is changed. The architect's leaf adds only this review and the workflow assignment/status update.

One measured worker lifetime: PID19468, creation FILETIME `134390054974167430`, November12 **20:04:57.416–20:05:55.283 America/New_York**, 57.867s total including the 2s disabled check and finalization. Its original 900s cutoff was 20:19:57.416. It exited successfully before that cutoff. The architect's host process check at 20:07:10.203 EST found the process absent. No port/server/GPU helper was created. Raw execution sources, inputs, patch, samples, events, selection and owner records are preserved in the coder checkout's `artifacts/qa/fire-receiver-selection/` directory.

The unrelated retained stockyard preview also ended before this task; PID23740 is absent and port4557 was verified released. Its restart inputs and post-expiry check remain in the architect checkout's ignored `artifacts/helpers/stockyard-map-preview/` directory. No helper was restarted for this investigation.

## Promotion and remaining work

The scoped numerical delivery passes. This investigation authorizes no `master` or Pages promotion, receiver-policy redesign, thermal tuning or longer trajectory. The full accepted replay and saved comparison cases remain preserved. Ground representative/path validation, an incoming lawn fire, actual grass visual evidence and later production integration remain separate tasks. The next technical proposal should address target-selection stability when passive receivers are added; freezing targets is the isolation instrument here, not the production solution.
