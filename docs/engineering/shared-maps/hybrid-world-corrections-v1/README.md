# Focused correction of coupled publication

Candidate from `57d350835508f028310881d00edad8d50ef8b057`, under
[the architect's return](authority.md). Existing evidence remains unchanged.
The internal mode remains disabled; no default entry or source asset changes.

| Reproduced problem | Correction |
| --- | --- |
| A throwing support notification left physical/native fuel ahead of query ownership, canonical stock and publication revision. | The owned support stage registers actual native nodes. Native registration runs after all physical installs, with support notifications deferred until all consumers and the publication agree. |
| Native registration could invoke a throwing/reentrant diagnostic radiation selector. | `prepareSourceRegistration` captures and validates selection identities using existing cells plus sparse staged registration cells before mutation. Tick/cache liveness is rechecked. Sealed registration calls no selector. |
| Support projected every regional part again for each part while retaining earlier output; only the latest output was counted. | One scoped, streamed cold projection feeds the entire support solve. Registry leases count all simultaneously-live temporary shapes/fan slots, including nested borrowers and new cache admission. |
| Caller mutation could change an owner's mode after ledger construction. | Capture and freeze owned mode values at construction. |
| One original component/cell could combine disconnected current cold islands. | Split current clipped material with the existing component helper, keeping original component/primitive identities. The existing actual-contact graph joins touching fragments; a shared ID cannot bridge a gap. |

## Commit and notification semantics

Preparation may fail or reenter the old world; final publication/index/tick/cache
checks then reject the stale stage without new physical/fuel/query/stock birth.
All callback-dependent radiation choices are prepared before the first write.
The mutation phase uses owned sealed installs, native registration and participant
updates. Fixed ports, ALL requirements, quantities, coefficients and clocks retain
their prior rules.

After commit, support notifications, activation notification and deferred index
observers run against the complete committed world. Consistent reads are allowed.
Publication, native steps, direct source preparation/commit, index mutation and
coordinator disposal are blocked during dispatch. Every queued publication
observer is drained even if an earlier observer throws. `publish()` then throws an `AggregateError` with
`committed:true`, the committed `publication` view and the actual `errors`.
It does not return success, roll back a completed publication, or allow the same
plan to install twice. `ensure` releases its old metadata view on committed errors.

The exact original architect callback script/scalars are preserved as
`architect-callback-repro.mjs.txt` and `architect-callback-repro.json`; the latter
was written before its finally cleanup (its source asserts disposal afterwards).
The original owner-mode alias observation is `architect-owner-modes-repro.json`.
These external reproductions were not rerun just to preserve them.

## Temporary geometry lifetime

`regional.withPieces(consume,{partId?})` borrows one counted projection and releases
it in `finally`. Cold faces stream through the existing query kernel; their fan
slots are reserved before triangle allocation. Collinear slots make the count
conservative; only positive material reaches support. Grouping/island arrays
reference those same triangles rather than copying geometry.

The unchanged combined budget is 192 shapes / 65,536 triangles, including the
reserved fallback allocation. Source-cache admission also includes live leases.
No second cache or larger limit is introduced. The tiny counterexample lowers
the total to 8,246: 8,192 reserved fallback +32 source +max(22,6) projected slots.
Either part fits separately, while simultaneous 22+6 is rejected. The 8,252
positive control accepts both exactly and rejects an additional cache triangle.
This exercises the review's cumulative-cost issue without a 57,328-triangle
synthetic source violating the tiny-fixture limit.

Regional `shape(id)` is lazy: sweeps use the existing domain kernel without
projecting triangles. Reading `triangles` holds an explicit counted loan until
`release()` or world disposal. A physical read lease blocks steps, installation
and direct retirement before mutation while geometry is borrowed; disposal may
invalidate and release those loans. Existing
landing-footprint reads use `withSourceGeometry`; cosmetic follow partition
releases parent loans in `finally`, including failure. Partial-owner cosmetic
semantics are otherwise unchanged and remain part of later host integration.

## Genuine cold-island proof

The source has two narrow arms within one X cell and a three-rectangle bridge
at Z 2..2.2. Full shared original edges prove one ten-triangle component.
Only the left whole piece has an anchor. Both whole pieces and the bridge's real
`[0,0,4]` receipt enter the existing trial/query/stock/support machinery.

`islands-before` reproduces the bug: retiring actual `u-face@0,0,4` leaves the
right child incorrectly supported. The log and exact source context remain
failed. The final run roots both sides while the bridge survives, then leaves
only the right child unrooted after retirement. No fake regional participant,
new anchor, tolerance or source geometry repair is used. This fixture has seven
source cells /24 thermal triangles and advances zero steps.

## Saved execution and remaining scope

| Child | Result | Compiler calls | Trials created/disposed | Steps | Purpose |
| --- | --- | ---: | ---: | ---: | --- |
| `attempt-01` | 18/18 | 42 | 18/18 | 7 | Initial notification/budget fixes before later controls. |
| `islands-before` | 0/1, preserved failure | 3 | 1/1 | 0 | Genuine cold-island confirmation. |
| `attempt-02` | 22/22 | 53 | 21/21 | 12 | Modes, islands and radiation staging added. |
| `radiation-positive` | 1/1 | 4 | 1/1 | 3 | Stronger saved-target assertion through actual ray observation. |
| `legacy-final` | 1/1 | 4 | 2/2 | 90 | Separate allowed comparison after shared registration changes. |
| `consumers-final` | 2/2 | 4 | 2/2 | 15 | Actual lantern landing and follow-loan release. |
| `coupled-final` | 24/24 | 57 | 23/23 | 28 | Integrated affected checks after consumer changes. |
| `legacy-current` | 1/1 | 4 | 2/2 | 90 | Separate comparison after shared landing-consumer changes. |
| `bounded-final` | **24/24** | **58** | **23/23** | **28** | Current checks with a genuine native retirement blocked before mutation by a held read lease. |
| `legacy-bounded` | **1/1** | **4** | **2/2** | **90** | Current separate comparison after the shared physical read guard. |

Final acceptance covers 25 distinct groups: 12 new corrections, the existing
12 affected controls and one unchanged legacy comparison. The new child is
hard-limited to 64 aggregate steps; each named legacy child uses the separate
128-step authorization. Every hidden child has a 30-second timeout. Regular
fixtures have 13 source cells /18 thermal triangles; the U fixture has 7/24.
All retained receipts, cache geometry and temporary leases end at zero. Final
per-fixture peaks stay below nine combined cached/temporary shapes and 75
triangles, before the conservative reserved-fallback comparison. These are
resource checks, not runtime performance claims.

`resources.json` derives exact per-run counts from the untouched logs; receipts
pin deduplicated source snapshots. `cleanup.json` verifies all ten child PIDs
have exited, with no port or retained helper. Run `node docs/engineering/shared-maps/hybrid-world-corrections-v1/audit.mjs` for the offline
hash/scope/resource audit. It imports no runtime and replays no tests. The saved
runner refuses reused names; restart only deliberately from preserved arguments,
Node requirements and exact source contexts.

An initial patch-format validation error changed no file and ran no runtime.
The historical 96-step failure and all earlier evidence remain untouched.
The declaration stays 23 existing /55 added files against the original M29
baseline; the frozen M28 record, actual source packages and default entry paths
are unchanged. The protected unrelated proposal remains unstaged and byte-identical.

Actual New York/native proofs, the full-map diagnostic, renderer, build,
benchmark, Pages and default enablement are all zero. The two-part/320-region
pilot and eager original-pin limits remain; the 393-part saddle ancestry and
actual source-family/addition installation are later work. This correction
does not establish full-family, rendered or production acceptance.
