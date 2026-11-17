# Disabled lazy receipt bridge

Candidate on `codex/shared-map-gameplay-code`, based on accepted query source
`e84ed22c43d99177848c6226ad25e8eaea9678e4`. The exact contract from root
`3713e72b` is preserved in `authority-contract.md`; acceptance `f79a79a9`
activated it. The later `e440b10c` whole-floor routing note was read. No hybrid
dispatcher, floor integration, asset installation or live consumer is added.

## Producer, admission and publication

`producer.querySlice(receipt)` authenticates the private receipt and its epoch,
validates the guarded physical records, and verifies every original source's
completed restricted integer loop against its expected span/count. It maps
original IDs to their actual compiler cells. Complete coverage is the original
descriptor/part-span intersection, including cells where all completed source
loops emitted nothing. A caller boolean, missing record or zero fuel does not
establish completeness. The opaque slice is bound to that producer, revision,
epoch, grid, owner and original parts.

The private payload projects original boundary fields while omitting heatCells.
It borrows both geometry arrays, bounds, normals, native IDs, sheet/material
metadata and provenance from the guarded receipt. It contains no live scene,
thermal cells or mutable boundary record. Guarded boundary/air records remain
unfrozen; the generic kernel admission never freezes a live scene graph.

`createRegionalReceiptBridge` exclusively binds the producer to cold query
sources and **zero** native inventory. Its stock participant reuses the existing
canonical quantity/carry/proof arithmetic. Query admission validates the original
surface and solid channels, cell halo, IDs and limits, then constructs detached
per-view inventory and domains. Earlier views cannot see later admissions.

`prepare({expectedGeneration, expectedRevision, receipts, retireRecords})`
builds both complete candidates before publication. It never advances the old
numeric stock claims or old query inventory. After both participants validate,
the coordinator rechecks liveness and its current generation/revision, then
publishes one frozen `{generation, revision, stockSnapshot, queryView}` by one
pointer assignment. There are no independent participant commits. A competing
publication during guard reads is detected by the final recheck, preventing an
older stage from overwriting it. Failed stages dispose only their candidates.

## Ownership and lifetime

The producer owns pending receipts and cached slice payloads. A failed stage
does not dispose caller receipts or consume descriptors; constructor rejection
also releases its exclusive lock without advancing the producer. Successful
publication retains immutable query projections and their original geometry
references. The ledger retains numeric metadata only. Callers may dispose a
successfully published receipt; held views continue to use its borrowed arrays.

Old complete states remain held until `release(state)`, reset or disposal. The
current state cannot be released. Pending query candidates also count toward
the existing sixteen-view limit. Releasing an old state clears its owned
inventory/domain and stock metadata. Named retirement applies to already
published original records: it leaves same-cell siblings intact and does not
alter the quantity already born. Complete-empty native coverage and retirement
remain distinct from cold source ownership.

Unified reset discards pending stages, advances the producer epoch, invalidates
descriptors/receipts/slices, clears held views and generation-born inventory,
and publishes generation+1/revision0 with the original cold source. Disposal
also clears the baseline record maps and exclusive participant lock. No clock,
fuel-consumption rule, support birth or simulation state is introduced.

## Checks and preserved attempts

The final finite synthetic run passes **43/43**: the existing twenty query and
twelve compiler/guard controls plus eleven bridge groups. Coverage includes
forged/foreign/stale/incomplete/duplicate claims, real complete-empty interior
cells, zero-fuel nonempty records, detached stages, borrowed channel/reference
identity, disjoint retries, physical mutation/disposal, query admission failure,
held views and limits, named retirement, reset/disposal and reentrant publication.
Both exact hostile scripts pass all **ten** cases with the final query hash.

All attempts are retained. The first run passed 39/41: a test helper dropped
its retirement argument, and the floor test expected a halo message although
the original floor first rejected as off-grid. Correcting those assertions
gave 42/42. The later reentrant case reproduced a real missing final revision
check (42/43); the corrected final run passes 43/43. No failed check is waived.

Exactly **three original roof-region compilations** ran in **one** bounded
process, passing thirteen checks:

| Original descriptor minimum | Native records | Claimed part cells |
| --- | ---: | ---: |
| `[80,20,64]` | 3 | 1 |
| `[132,21,92]` | 2 | 16 |
| `[80,21,64]` | 0 | 1 |

The original saved records, ordered IDs, per-record quantities and full local
certificates match. Both geometry channels are borrowed by identity. A distant
region remains cold. Retiring one of the first cell's three records preserves
its two siblings and the held pre-retirement view. Receipt disposal and unified
reset release the expected references/inventory. The actual empty region exists
in the pinned catalogue; its sampled centre is outside the cold solid, so it
does not establish an interior walking hole. The synthetic closed-interior
fixture separately proves that case with sixteen complete-empty cells.

`source-at-roof.json` and two source snapshots pin the roof-tested checkpoint.
After that run, changes were limited to clearing baseline record-map references
on kernel disposal and the final coordinator revision/liveness recheck. Those
changes have final synthetic regressions; compiler, admission, stock arithmetic
and all geometric query predicates are unchanged. The source audit verifies
those exact deltas. The roof allowance is spent and was not repeated.

The raw source pins are the existing New York index/library/navigation hashes
in `roof-plan.json`; source revision remains `dcc3a17e39cdc07578b4fba5308d6c21817a6ccdd9ca98a908fb1e5a292eccea`.
The saved geometry reference remains `bfab707ff646e9dfedfaae3b80d510ac750e4f561335d895c24c4e4cc4d49418`.
No new geometry snapshot/export is written. The declaration is **22 modified /
49 added** modules. All prior evidence and the unrelated forty-line WIP remain
unchanged; audits/manifests pin this separate successor.

Ten recorded finite child PIDs are independently absent in `cleanup.json`.
No helper, service or port remains. There is no whole-roof proof replay, deck
compilation, world/trial/support graph, live adapter/consumer, renderer/browser,
benchmark/profile, build or Pages work. The old 960-call proof allowance remains
spent. Native floors remain unsupported regionally under the unchanged rejection
controls; the architect's future whole-floor route stays separate. The prior
browser failure and four-map integration remain open. Stop for architect review.
