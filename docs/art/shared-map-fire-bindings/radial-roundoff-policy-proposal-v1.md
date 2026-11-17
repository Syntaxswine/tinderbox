# Radial roundoff: bounded source-local measurement proposal

**Unaccepted proposal; no implementation**, 17 November 2026.
Parent artist candidate: `9dfee80fcba650447d07488f67e76b1461c1d4d1`.
Frozen source context: `2b350309d9116812a1d3988af090614bdaefbc25`.

The architect accepted the previous grouped readiness evidence and the plant
partition as design intentions only. This follow-up investigates the 530 uncut
closed-solid exceptions, with detailed numerical treatment limited to two
original radial geometries. All existing proofs and all source bytes remain
unchanged. All 530 quantities remain withheld pending a later decision.

## Provenance buckets and exact scope

The [530-ID ledger](../../../art/source/shared-map-fire-bindings/radial-roundoff-policy-proposal-v1/scope-ledger.json)
and [seven provenance buckets](../../../art/source/shared-map-fire-bindings/radial-roundoff-policy-proposal-v1/provenance-buckets.json)
retain exact place, section, source/render IDs, geometry SHA-256, draw range,
original matrix and earlier proof-group references.

| Original producer | Instances | Geometry ID prefix | Treatment here |
| --- | ---: | --- | --- |
| Access centre column, upper stair, 12 segments | 2 | `b62cb7b5` | Constructor provenance only |
| Access centre column, front stair, 12 segments | 4 | `330d7160` | Constructor provenance only |
| Ionic column base, 12 segments | 32 | `7f3008f8` | Constructor provenance only |
| Ionic column shaft, 16 segments | 32 | `165a9dab` | One detailed representative |
| Gallery baluster, 10 segments, 11 profile points | 444 | `8bab8c76` | One detailed representative |
| Cafe table top, 16 segments | 8 | `a0784d61` | Constructor provenance only |
| Cafe table leg, 8 segments | 8 | `eb49ad7c` | Constructor provenance only |
| Total | 530 | Seven files | 86 cylinders; 444 lathes |

All seven unchanged files match their original producer index schedules.
That is provenance evidence, not blanket closure or quantity acceptance.
The two detailed templates have 476 exact-hash/range repetitions. Their
repetitions are a conditional future scope, with instance transforms still
requiring explicit quantity/error propagation. The other five templates,
54 instances, remain unproved here; they are not labelled broken.

The exact detailed source IDs are:

- Administration: `ionic-front/column-0/shaft`, geometry
  `165a9dab15e22ddf5d3187588f7127041c5adcad4dc778ce7d3ca9a5dbc765d1`,
  full index range `0..191`.
- Horticulture: `end-gallery-guard--1-0/baluster-0`, geometry
  `8bab8c76f9be09b30411af10f745a5555a5c475b9e20f2d84a3dd979cc40cfa3`,
  full index range `0..599`.

Both selected instances have identity linear transforms. Translation stays
outside the fixed source-origin quantity calculation.

Source constructor paths and byte/Git pins are in
[input pins](../../../art/source/shared-map-fire-bindings/radial-roundoff-policy-proposal-v1/input-pins.json).
The [shared forms](../../../assets/art/exposition-new-york/forms.js) call
`CylinderGeometry` at lines 33–36, `LatheGeometry` at lines 38–40, and define
the baluster profile at line 76. The column arguments are in
[Administration](../../../assets/art/exposition-administration/index.js) line 139.
The [Horticulture](../../../assets/art/exposition-horticulture/index.js)
rail calls are at lines 130–131 and table calls at line 133. Access column
arguments are in [access geometry](../../../assets/art/exploration-access/index.js)
line 34. These original shared constructors are read-only evidence; no New York
numerical allowance or repair is reused.

## Smallest proposed rule

The full-turn producer separately evaluates its first and last angular samples.
The stored last X coordinate is tiny but nonzero: Float32 can preserve a value
near zero even when it is far below the coordinate spacing at a radius near
one metre. This does not justify a mesh-scale epsilon.

Propose measurement recognition of **only the declared periodic endpoint
pairs** on these two pinned templates:

1. Require original constructor/full-turn provenance, exact source hash, full
   draw range and complete producer index schedule. Require original cylinder
   caps or axis-ended lathe profile.
2. For each declared endpoint pair, Y and Z must already be exactly equal.
   The first X must be zero. Certify that the last X lies in the unique Float32
   rounding cell of `radius * sin(binary64 2*Math.PI)`.
3. Derive that cell using exact rational Machin bounds for pi and a Taylor
   enclosure for the residual sine. The allowed displacement is the literal
   certified pair difference, not an adjustable distance threshold.
4. Use those parameter endpoint identities for an analytic measurement reference
   only. Require exact oriented manifold/vertex-link checks, one component,
   Euler characteristic two, convex ordered source rings and a monotone
   axis-ended/capped radial solid certificate.
5. Retain the original triangle integral and a certified seam-only error
   interval. Propose its lower endpoint as the conservative geometric volume
   if later accepted, followed by the already accepted closed-volume/reference-
   depth recipe. Keep the interval visible and finite stock separately reviewed.

No nearest-neighbour search, position snap, weld, cap, repaired mesh or geometry
export is proposed. The original physical mesh still fails the earlier strict
closure test. This is an explicit numerical measurement interpretation requiring
acceptance, not a retroactive change to those strict proofs.

The actual producer/Float32 results, rather than universal libm accuracy, are
certified. ECMAScript `Math.sin` is not assumed correctly rounded on every
platform. A new source hash, producer or platform must supply its own evidence;
this proposal does not establish a portable global trigonometry tolerance.

## Bounded measurements

[Representative evidence](../../../art/source/shared-map-fire-bindings/radial-roundoff-policy-proposal-v1/representative-reviews.json)
contains exact rational measures/bounds, original boundary evidence, source
vertex indices for the permitted pairs and analytic certificates.
Displayed decimals below are rounded; the JSON rationals are authoritative.

| Selected source | Maximum endpoint displacement | Original area | Absolute area error bound | Original volume integral | Absolute volume error bound |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ionic shaft | 1.49407e-16 m | 43.76104144 m² | 1.79671e-15 m² | 11.42883342 m³ | 4.82893e-15 m³ |
| Gallery baluster | 2.93915e-17 m | 0.55404049 m² | 4.22044e-17 m² | 0.01995776 m³ | 3.75243e-17 m³ |

The shaft has four endpoint pairs. The baluster has nine nonzero-radius pairs;
its two axis endpoints already coincide exactly. The original strict defects
remain six and twenty boundary/nonmanifold edges, respectively. Periodic
parameter labels yield a closed oriented reference for each, without changing
any coordinate. Twenty exact zero-area axis triangles in the baluster remain
recorded and excluded only from integrals.

Closure topology alone is insufficient. Exact quadratic Bernstein signs prove
clockwise polar order in every open height band: 32 tests for the shaft and
160 for the baluster. Positive sector directions exclude the axis, endpoint
rings wind once, distinct bands occupy disjoint height intervals, and original
convex cap fans close the reference. This is an analytic certificate over the
existing source references, not an exhaustive pose sweep or a generated mesh.

For one original triangle `(a,b,c)` at fixed local origin, let endpoint movement
L1 bounds be `da,db,dc`. Sum these rational upper bounds over original triangles:

`Ev = (da|b|₁|c|₁ + db|a|₁|c|₁ + dc|a|₁|b|₁
       + da·db|c|₁ + da·dc|b|₁ + db·dc|a|₁ + da·db·dc) / 6`

For `u=b-a`, `v=c-a`, `alpha=da+db` and `beta=da+dc`:

`Ea = (alpha|v|₁ + beta|u|₁ + alpha·beta) / 2`

These follow determinant multilinearity and the cross-product triangle
inequality; L1 bounds Euclidean norms. The exact one-axis volume shift is also
computed algebraically and lies within Ev. No replacement vertex/index array
is made. Proposed volume is bounded by `[V-Ev,V+Ev]`. Quantities divided by the
existing 0.12 m reference depth retain that uncertainty; none is assigned.

These errors cover **only** periodic endpoint interpretation while retaining
every other Float32 sample and original triangle. They do not hide faceting,
replace a polygon with `pi*r²*h`, erase other authoring/Float32 errors, measure
exposed weather area or establish physical loading.

For future nonidentity transforms, volume/error scale by `abs(det(L))`.
Area bounds must use actual transformed triangle edges and displacement bounds.
No instance can inherit a local area bound by an unproved unit-rotation claim.

## Real open-gap negative and retained exceptions

The negative uses unchanged, authored
`great-dome/lantern-glazing`:
`CylinderGeometry(4,4,height,48,1,true)`.
Its two ends are deliberately open, with diameter 8 m. Even after recognizing
the full-turn parameter seam, **96 actual boundary edges remain**, 48 per end.
The proposed closed-solid quantity is rejected. No caps or negative fixture
geometry were created. See [open-gap negative](../../../art/source/shared-map-fire-bindings/radial-roundoff-policy-proposal-v1/open-gap-negative.json).

The 65 derived closed-solid cuts, 126 wall primary-face exceptions and three
roof/weather-area exceptions stay separate. So do glazing local-damage splits,
joints/support ownership and all plant quantities/profiles/response.
The accepted 98-owner/208-patch/204-follower plant partition remains design
intention only. No wall front face is inferred and no cut receives a cap.

## Verification and decision boundary

Read-only reproduction:

```powershell
$radialReview = 'C:/Users/baals/.codex/worktrees/art-assets/tinderbox/art/source/shared-map-fire-bindings/radial-roundoff-policy-proposal-v1'
python -B "$radialReview/review.py"
```

The check reproduces only this bounded proposal, verifies all 530 IDs/seven
provenance buckets and both representative certificates, and rejects the actual
open negative. It preserves the prior 23-file payload and verifies all 1,572
original geometry hashes. [Check results](../../../art/source/shared-map-fire-bindings/radial-roundoff-policy-proposal-v1/check-results.json)
and the [package inventory](../../../art/source/shared-map-fire-bindings/radial-roundoff-policy-proposal-v1/review-package.json)
record exact scope and hashes.

No factory, runtime, binding, stock, renderer, build, repair/export or retained
helper is added. Existing source UVs, normals, origins, matrices, dimensions,
previous proofs and New York/cache work remain unchanged.

The review decision is whether this two-template source-local measurement rule
and its conservative interval are acceptable. Later implementation, expansion
to the other five templates, transformed-instance quantities and actual stock
assignment require their own accepted scope. This delivery stops at the proposal.
