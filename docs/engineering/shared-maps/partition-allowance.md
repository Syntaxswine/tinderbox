# Source-local native partition allowance

This M29 engineering implementation keeps the native `EPS = 1e-7`, clipping
operations, grid, combustion coefficients and canonical artist quantities. It
measures a separate numerical envelope before an activation can commit. The
formula and its limits remain subject to architect review. This is not a quantity
rescale, refill, additional fuel grant or whole-map relative tolerance.

The retained [first failure](source-quantity-failure.json) was legitimate: each
well-guard top has canonical stock 0.408333, but the unchanged native six-face
partition emits 0.4083343109294491. Its +0.0000013109294491053802 difference
exceeded the previous 0.000001 guard. No physical/stock transaction committed.
The [current independent envelope receipt](source-quantity-envelope-v2.json)
retains both exact sources and all six face inputs. The earlier
`source-quantity-envelope.json` is an earlier floating-point estimate, not the
current interval-propagation implementation.

## Per-surface inputs and formula

`workbenches/furnished-house/partition-error.js` accepts the very triangles,
finite core/finish quantity, grid origin and pitch supplied to the native compiler.
For one surface let Q be core plus explicit finish, A0 its original triangle area,
and T the count of candidate triangle/cell pairs using the native bin range.
Axes whose source span is below EPS are skipped exactly as in native clipping.

An independent polygon clipper uses strict comparisons, without a clipping
epsilon. It sums A+ over cells expanded by 2 EPS and A- over cells contracted by
2 EPS. These two bands cover the native cell expansion and inside comparison.
They do not modify the emitted native geometry. The estimate also records the
coordinate scale, smallest actual crossing denominator and T.

Floating-point uncertainty is propagated through every intersection subtraction,
division, multiplication and addition using u = Number.EPSILON / 2. A division
whose denominator cannot be bounded away from zero throws before commit. For
each clipped polygon, the largest Euclidean vertex uncertainty e contributes
perimeter × e + pi × vertexCount × e². A further
64 × u × vertexCount × coordinateScale² covers area/length arithmetic. Summing
both envelopes and multiplying by Q/A0 gives the reported roundoff bound R.
This operational bound is intentionally conservative; it is not an independent
formal proof for arbitrary hostile meshes or nonfinite geometry.

The separate nonnegative fuel bounds are:

```text
positive = Q × max(0, A+ / A0 - 1) + R
negative = Q × max(0, 1 - A- / A0)
         + Q × (7 × EPS × T) / A0
         + EPS × T × (1 + finish / core) + R
```

The area term permits at most seven discarded fan triangles per clipped
triangle/cell polygon (three original vertices plus six clip planes). The last
EPS term covers the unchanged native tiny-core-fuel discard and its finish ratio;
the implementation uses denominator 1 when core is zero. Per-face bounds are
summed only for their own canonical carrier. They are never borrowed from other
carriers or enlarged by distant reserve fuel.

The east/west top positive bounds are respectively 0.000002658865607071315 and
0.000002657359163280968. Their negative bounds are approximately 0.00007045548
and 0.00007045397. The measured positive deltas remain distinct from those bounds.

## Transaction and accounting checks

The source input sum must independently match its canonical account within
64 × Number.EPSILON × max(1, canonicalQuantity) × sourceCount. This summation
roundoff is unrelated to the geometric envelope. IDs, duplicate activation,
nonnegative finite quantities and explicit fuel profiles remain validated.
The native batch sum also has a separate machine-summation check.

Physical registration, cold-query retirement and stock transfer are all staged
and validated first. Their commits run synchronously without an intervening
query, await or native step. The native batch's actual sum is used for its transfer
receipt so changing summation order cannot create an apparent oil birth.

Diagnostics expose canonical initial/active/reserve quantities, actual native
static births, signed partition delta, summed positive/negative/roundoff bounds,
and the uncorrected world error. The signed discrepancy is not credited as fuel
added by play. Native combustion accounting remains separately visible.

`source-partition-error.test.mjs` checks the two real tops, a deliberately
over-bound result, wrong assigned stock, changed epsilon, a distant 1e12-unit
reserve and unchanged precommit physical/ledger state after rejection. The
579-carrier local staging receipt is not full-source acceptance. Final promotion
also requires a bounded offline sweep over every accepted carrier and closed/open
door poses, reporting worst signed errors and rollback controls, plus burning-door
pose checks for unchanged canonical remaining fuel/char and absent ghost heat.
