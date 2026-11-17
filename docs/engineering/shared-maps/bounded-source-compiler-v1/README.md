# Isolated two-metre compiler and quantity checkpoint

Authority: `1a88cf4748bf62c1456285ff43412c929d311199`,
[bounded compiler contract](../bounded-source-compiler-pilot.md). Coder branch:
`codex/shared-map-gameplay-code`, authority intake parent
`1036f89df74425b829917ba71767c2812b76fc2a`. The candidate is the commit containing
this record. This completes the compiler/certificate/pure staging portion only.
Production map factories do not import or enable the pilot.

The compiler restricts the original loop to four native X cells, one native Y
cell and four native Z cells: 2 m × 1.06 m × 2 m. It computes original full
source bounds first. The native cell body, original single-cell decision,
geometry/solid geometry, normals, IDs, profiles, EPS and fuel denominator/formula
are byte-identical in LF text. This compiles restricted ranges directly; it
does not compile the full source and filter. Each receipt reports its actual
visited ranges. Branded descriptors pin the original owner, source identity and
generation. Off-grid, forged and stale descriptors fail closed.

`scene.js` rejects partial results at the ordinary whole-source installer and
rejects a partial data object without its isolated capability. The pilot's
staging ledger owns scalar claims and original IDs only. Preparation is read-only;
commit revalidates receipts. Duplicate/overlapping domains or IDs, corrupt
quantities/profiles, forged certificates and stale receipts cannot debit stock.
Reset/disposal invalidates descriptors and receipts and clears owned scenes.
It performs no live index, query, support, clock or world installation.

## Quantity proof

For each original source surface, let `q` be its original assigned core plus
coating amount, `A` its full original uncut triangle area, and `C[r]` the strict
area inside regional canonical cells. The fixed pre-damage share is
`q * C[r] / A`. Strict clipping uses the existing zero-tolerance intersection
routine and its existing treatment of flat source axes. Empty/interior-only
regions and tiny discarded native fragments remain in the catalogue and proof.
Uncertifiable zero/tiny denominators stop before native compilation.

The original strict inner/outer areas `L[r]` / `U[r]` at the existing ±2 EPS
bands bound the unchanged native clipping. The regional positive and negative
envelopes compare those areas to `C[r]` rather than to the whole source area.
The original `7 * EPS * candidateTriangleCells` discarded-area term and core/
coating threshold loss are retained. The original default allowance return and
strict-intersection arithmetic are unchanged. No EPS, native amount, fuel
profile, admission limit or native cap was increased.

Canonical arithmetic uncertainty is accounted separately. The same strict
intersection error convention bounds `C[r]`. The original triangle-area
arithmetic has the conservative bound `64*u*triangleCount*3*coordinateScale²`
(`u = Number.EPSILON/2`); a nonpositive lower denominator is rejected. Propagating
that denominator uncertainty through `q*C[r]/A`, plus bounded multiply/divide/
sum roundoff, yields each receipt's `canonicalRoundoff`. Original source
allocation and parent summation roundoff are accounted once in the parent.
These terms certify arithmetic; they do not transfer unrelated reserve.

The ledger exposes measured canonical shares, transferred canonical stock,
cold reserve, original native fuel, clipping delta and signed parent arithmetic
carry. Full coverage books `Q - sum(shares)` exactly once only if the separately
derived remainder bound proves it. A partial sum that crosses Q only within its
proved roundoff exposes that carry explicitly. Physical native fuel is never
refilled, rescaled or normalized. The exact closure is parent bookkeeping.

For the actual roof, Q is **490.002072**. All three orders close to that value
with zero cold reserve. The signed carries are `9.094947017729282e-13`,
`1.2505552149377763e-12` and `5.684341886080802e-14`, each within its independently
derived roughly `3.41213248e-7` bound. Native stock stays approximately
`490.00248109795`; its roughly `+0.00040909795` clipping delta remains visible.
Every individual native fuel amount is exactly equal to the original. Different
aggregate addition orders differ only by recorded summation roundoff.

## Checks and evidence

Eight focused fixtures pass: unchanged default compiler/allowance against the
pinned original; unsuffixed single-cell IDs and installation barriers; boundary
and coated cells in both orders; disconnected patches/empty regions; closed
interior; a discarded certifiable sliver; failed/duplicate/corrupt/stale claims;
and bad allocation/grid/revision/finish or unprovable source measure. There were
three finite fixture runs, each 22 native calls (4 original, 4 current and 14
regional), **66 total**, with one additional rejected-before-native install call
per run. `synthetic-first.*.txt` preserves the first test/API sources; its raw
stdout was not saved. `synthetic-second.log` initially labelled the guard call
as native work; the correction and the final exact counters are preserved in
`synthetic-checks.json`. All runs passed eight tests and retained zero receipts.

Exactly one actual-data process ran, using the same original roof/deck pair:

| Check | Result |
| --- | --- |
| Pinned original pair reference | 4,136 boundaries/fuels; 9,520 cells |
| Forward, reverse, scattered | 320 descriptors each; exactly 960 regional calls total |
| Each roof order | 4,132 exact boundaries/fuels; 232 nonempty + 88 empty regions; max 36 fragments |
| Iteration coverage | 8,228 original candidate cells per roof order, disjoint and complete; 24,684 regional visits total |
| Geometry/source/fuel comparison | Exact original IDs, triangles/solids, normals, bounds, closed metadata, profiles, individual amounts and definitions |
| Combined cell union | Exactly 9,520 original cell IDs, reusing the reference deck only |
| Parent stock | Full original Q, zero reserve; explicit proved arithmetic remainder |
| Saved maximum witness | 162 candidate descriptors: 138 nonempty + 24 empty; 2,486 requested / 1,646 unrequested roof fragments |
| Witness iteration traces | 4,372 selected source-cell visits reused from forward receipts; no fifth native pass |

The local witness selects saved receipts at `[53.75,21.73,41.75]`, radius
`8.63710281744786`. Each selected receipt's native loop stayed inside its own
restricted range. The full comparison orders intentionally visited all regions;
the witness adds no native evaluation. This is no live frontier query, action
latency bound, support-cascade bound or accumulated-residency claim.

`plan.json` pins the three original source payloads, 30-module closure plus four
saved/input records, and exact harness sources. The original compiler comes
from authority Git objects with only relative import paths retargeted reversibly.
`preflight.json` proves source-body identity and preserves 53 earlier raw archive
files, eight design archive files, their three manifests, the parent LF text and
the unrelated WIP hash. No donor checkout or asset was changed.

`iterations-*.jsonl` retains region IDs/digests, quantity certificates and actual
ranges/counts, rather than full native geometry identity clones. `final.json`
and the matching `partial.json` retain all nine passing stages and no unrun or
failed stages. `audit.mjs` checks these saved rows, every arithmetic prefix,
source pins, declarations, scope and cleanup without another native calculation.

The text-only preparatory Git read first hit its default 1 MiB output buffer
while reading the original vendored `three.core.js`. The compact preserved
failure is `preflight-first-failure.json`. The corrected source reader has an
explicit 8 MiB buffer and short errors. No native work or actual launcher had
started at that failure; no physical or proof cap changed.

Relevant commands already completed:

```text
node docs/engineering/shared-maps/bounded-source-compiler-v1/run-synthetic.mjs
node docs/engineering/shared-maps/bounded-source-compiler-v1/prepare-harness.mjs
./docs/engineering/shared-maps/bounded-source-compiler-v1/launch.ps1
node tools/record-shared-map-runtime.mjs
node tools/record-shared-map-runtime.mjs --check
node docs/engineering/shared-maps/bounded-source-compiler-v1/audit.mjs
```

JavaScript syntax, PowerShell parsing and scoped Git whitespace checks also pass.
The runtime declaration records 22 modified and 47 added runtime/tool modules.
Do not rerun the fixture/preparation/launcher commands from this archive: the
actual allowance is consumed and one-run markers reject another launch. Review
saved evidence with `node .../audit.mjs --check`. Full repository/world tests,
build, browser, renderer and production rollout were excluded by this contract.

## Process closure and remaining gates

`launch.json` / `receipt.json` record literal Node 24.15.0, PID **6520**, creation
FILETIME **134394141609502425**, exact inputs/arguments/working directory, owner,
expiry, source preservation and stop method. The finite supervisor was PID
**2976**. The process exited 0 inside the 60-second limit. The recorded lifetime
exists only to verify the limit; it is not an interaction/performance result.
The 50-second cooperative / 55-second exact-identity termination branches were
not exercised and are not reported as tested. `cleanup.json` verifies both PIDs
absent; scenes, receipts, ledger, metadata and trace files are closed. No port,
server, browser, watcher, worker or retained helper remains. No automatic restart
is authorized.

Mixed closed-solid query replacement, all 536 external support relations,
canonical birth exceptions, cold support components/cascades, followers/debris,
reset/section integration and atomic query/stock/support commit remain separate
gates. The prior 2,599.9 ms browser failure remains unresolved. There is no live
activation or production/Pages acceptance in this delivery. Stop for architect
review before implementing the next interface.
