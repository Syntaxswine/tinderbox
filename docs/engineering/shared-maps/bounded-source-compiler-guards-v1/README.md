# Receipt and constructor boundary corrections

Successor to coder `c66e659451284309e48dc420791369dd5af37e1e`, on
`codex/shared-map-gameplay-code`. The architect's review requested these guards
before any further integration. The original authority remains
`1a88cf4748bf62c1456285ff43412c929d311199` and its
[isolated compiler contract](../bounded-source-compiler-pilot.md).

The review found that replacing a public boundary's triangle array after
`ledger.prepare(receipt)` could still commit. It also identified a constructor
loop at finite x=1e20: the resulting native x=2e20 does not advance under x+4.
The reviewer used two tiny one-region repro calls. The unsafe constructor hang
was identified from source and was not executed. This successor tests the
rejection paths after adding guards; it does not rerun the old hang or the roof.

## Physical receipt guard

Each local receipt now retains original table/record identities and shallow
property descriptors containing original references/scalars. Nested physical
data is frozen in place: triangles, solid triangles, vertex arrays, normals,
bounds and attachment/ownership metadata. The guard compares property shape,
values/references and record/table identity at both **prepare and commit**.
Replacing an array, scalar field, record or physical table is rejected even when
the original map keys and fuel amounts survive. Bin membership is guarded too.
The checked records include boundaries, fuels, source definitions and cells,
plus scene/index/profile metadata. Default shared profile objects are reference
guarded without freezing or changing their existing ownership/mutability.

There is no second full physical snapshot, geometry serialization, vertex copy
or shipping geometry cache. The guard retains only the one receipt's references
and small scalar/property descriptors; its native cell domain remains 16 cells
per source. It does not retain new geometry for all 320 regions. Ledger claims
still contain only quantities and original IDs. Disposal clears the captured
owned maps and releases guard records/references; it never clears a replacement
map supplied through a corrupted public scene.

The focused physical test reuses one tiny closed receipt. It changes triangles,
solid triangles, normal, bounds, position, closed/source-shape metadata,
boundary/fuel/cell IDs, source/carrier/instance ownership, fuel-cell references,
scene origin/profile and physical tables. Both preparation and an already
prepared commit reject, and the entire scalar ledger snapshot is unchanged.
Replacing a boundary, fuel or source-definition record also rejects. After
restoring original references, the same valid plan commits normally. Nested
vertex mutation throws immediately. A separate fixture verifies that disposal
preserves a foreign replacement map.

## Safe constructor bound

Original source bounds are still calculated with the original native formulas.
Before any region enumeration, every source min/max and exclusive end must be
a safe integer. The aligned region origins and exclusive ends must also be safe.
The constructor computes axis counts and a product bounded without overflowing;
it checks the combined catalogue across **all owners** before enumerating any
descriptor. Enumeration uses bounded counters rather than unbounded coordinate
increments.

The explicit exported ceiling is **320 descriptors total**, justified solely by
the accepted static roof's 320 potential regions. It is a rejection ceiling for
this isolated pilot, not a general map capacity or production optimization.
The lower-level capability also rejects an unsafe exclusive end. Tests reject
x=1e20, a safe source index whose aligned end is unsafe, an unsafe negative
aligned origin, unsafe capability ends, a 321-region strip, a 400-region product,
a large finite span and two individually fitting owners totalling 322 regions.
A metadata-only 320-region toy and an ordinary negative-grid toy remain valid;
neither compiles native cells.

## Partial arithmetic carry

`Math.min(Q, measuredShares)` affects **parent bookkeeping only**. A partial sum
at or below Q transfers its measured amount with zero carry. If floating
arithmetic produces a partial sum just above Q, the transferred account is Q,
cold reserve is zero and `parentArithmeticCarry = Q - measuredShares` is exposed
as a negative number. The carry must be finite and no larger in magnitude than
the separately derived source-allocation/canonical/summation roundoff bound.
Nonfinite quantities or proof sums reject. This closes an accounting overshoot;
it cannot refill a native fuel or change a measured share. Full coverage books
the proved final parent remainder once, as before.

The fixture assigns one native unit to a patch and zero to a distant extension,
with original owner Q=`1-Number.EPSILON` (a source allocation discrepancy within
its existing arithmetic proof). The first of three regions already measures
one unit. Partial and full snapshots expose carry `-Number.EPSILON`, measured
stock 1, transferred stock Q and zero reserve; the original fuel stays exactly
1 throughout. The final remainder is explicit. No fuel write or normalization
is involved, and no numeric tolerance/coefficient is raised.

## Checks and retained scope

The first focused run passes 12 tests. A final run after adding explicit finite
parent-proof checks also passes all 12. Each run uses 27 tiny synthetic native
calls: 4 pinned-original, 4 unchanged-current and 19 regional (14 previous
fixtures plus 5 new guard/carry fixture calls), **54 calls total**. Each also
rejects one partial installation before native work. `first.*` and `final.*`
preserve both logs and finite foreground runner receipts. No failed new fixture
or native calculation was hidden. The reviewer's two earlier repro calls are
separate from these counts.

The prior [roof comparison](../bounded-source-compiler-v1/README.md) remains
preserved history at c66e6594: one original reference plus exactly 960 regional
calls, all spent. No archive file is rewritten, and that old source-pinned
verifier is not run against the successor's changed module. `audit.mjs` checks
the original archive's raw bytes and its original source pins against Git
objects at c66e6594, plus current source/declaration/scope and focused logs. It
imports no simulation and runs no native calculation. Native compiler, geometry,
fuel formulas, profiles and default partition math remain byte-identical to
c66e6594. No new dataset/export/provider or full-geometry snapshot is created.

The source-only audit initially compared the deliberately uncommitted 40-line
WIP to its committed ancestor. `first-audit-failure.json` preserves that wrapper
failure. The corrected check uses the WIP's unchanged original raw input pin;
committed files retain Git-object verification. The WIP was never changed, and
no native work was run by either audit.

Commands already completed:

```text
node docs/engineering/shared-maps/bounded-source-compiler-guards-v1/run-focused.mjs first
node docs/engineering/shared-maps/bounded-source-compiler-guards-v1/run-focused.mjs final
node tools/record-shared-map-runtime.mjs
node tools/record-shared-map-runtime.mjs --check
```

The source/hash/scope audit, JavaScript syntax and scoped Git whitespace checks
are recorded alongside this file. Runtime declaration counts remain 22 modified
and 47 added modules. Each test command was finite and foreground, with a 20 s
timeout; no helper, port, server or browser is retained.

No actual-roof rerun, world/trial tick, support graph rebuild, native building
run, benchmark, renderer, browser, build or production promotion was authorized
or performed. Live query/stock/support atomicity, external support relations,
birth exceptions, cascades, followers/debris, section/reset integration and
actual interaction performance remain closed gates. The earlier 2,599.9 ms
browser failure is unchanged. This candidate stops for architect review.
