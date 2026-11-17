# Remaining cuts and primary wall faces: bounded proposal

**Unaccepted source-only proposal**, 17 November 2026.
Authority: [architect decision](../../../art/source/shared-map-fire-bindings/remaining-cut-front-proposal-v1/authority-63ec0566.md),
`63ec0566fe7fd0a8b57dc4b79d4335d6eb3e00b5`.
Parent artist candidate: `0b43868bbcc1965db9f1d1cdd132be0668e87e5d`.
Original source context: `2b350309d9116812a1d3988af090614bdaefbc25`.

The architect has accepted all 530 separately certified radial measurement
references and eight table-union measurements. Those accepted records remain
immutable. Later table accounting must count each union once, never both its
components and its union. No actual binding, stock or runtime export is assigned.

This checkpoint groups the remaining **194** exceptions and examines exactly
two original pieces. It proposes a header cut-remnant measurement reference and
an actual-triangle primary-face route for one wall. Neither proposal is accepted
or installed. Roof exposure, openings, support and runtime remain separate.

## Exact grouped scope

The [194-ID ledger](../../../art/source/shared-map-fire-bindings/remaining-cut-front-proposal-v1/scope-ledger.json)
retains exact source/render/section IDs, geometry hashes, ranges, matrices,
constructor metadata, recorded pre-cut hashes and cut reasons.
The [12 provenance buckets](../../../art/source/shared-map-fire-bindings/remaining-cut-front-proposal-v1/provenance-buckets.json)
group source operations, not accepted defect remedies:

| Unresolved recipe | Original producer and cut role | Cases |
| --- | --- | ---: |
| Closed solid | Box, portal cut | 46 |
| Closed solid | Box, stair-headroom cut | 12 |
| Closed solid | Box, gallery guard cut | 5 |
| Closed solid | Lathe baluster, gallery guard cut | 2 |
| Primary wall face | Native wall, portal cut | 52 |
| Primary wall face | Native wall, stair-headroom cut | 32 |
| Primary wall face | Level closure, portal cut | 6 |
| Primary wall face | Level closure, stair-headroom cut | 16 |
| Primary wall face | Level closure, gallery base-rail opening | 12 |
| Primary wall face | Level closure, gallery upper-rail opening | 8 |
| Weather roof | Hip, deliberately removed underside | 2 |
| Weather roof | Original hip, exposure unproved | 1 |
| Total | 65 derived solids + 126 wall faces + 3 roofs | 194 |

All 194 are distinct geometry/range cases. A shared source constructor or cut role
does not prove that every member has the same defect. Only the two IDs below
receive detailed new geometry analysis. Other members retain their unresolved
status. The two cut balusters cannot inherit the radial rule: their new clipped
hashes/ranges and missing cut boundaries require their own review.

[Input pins](../../../art/source/shared-map-fire-bindings/remaining-cut-front-proposal-v1/input-pins.json)
record source/Git hashes and 72 targeted original section descriptors.
The original `sourceGeometrySha256` pre-cut fingerprints are preserved as
recorded provenance; those original factories/surfaces are not regenerated here.

## Producer evidence and exact defect audit

The original [surface clipper](../../../art/source/exploration-access/source-geometry.mjs)
emits clipped polygons from original triangles. It does not create new
cut-plane closure faces. Its existing `1e-7` classification and `1e-9`
triangle/orientation thresholds are source facts, not a newly accepted closure
tolerance. [Access construction](../../../assets/art/exploration-access/index.js)
then preserves those clipped attributes in Float32 buffers.

The two selected compiled geometries are nonindexed, with full effective
vertex range `start:0, count:42`: 14 triangles each. Positions, normals, UVs and
metric UVs match the corresponding source fragment's Float32 conversion.

[Detailed evidence](../../../art/source/shared-map-fire-bindings/remaining-cut-front-proposal-v1/two-representative-review.json)
contains exact existing-vertex edge atomisation, source boundary vertex
references, five actual face-coverage proofs per piece and cut/constructor pins.

| Selected source | Geometry ID prefix | Missing cut plane | Finite missing face area |
| --- | --- | --- | ---: |
| `replacement/office-door-0/header` | `010537bcd0f3` | Z = 7 m | 0.0349999666214 m² |
| `replacement/office-partition-0-tier-0:1:5/wall-1` | `5dcda93fc773` | Y = 4.920000076293945 m | 0.1599998474121 m² |

Both pieces have eight boundary edges before Float32 conversion and eight
afterward. Exact subdivision at existing collinear source vertices adds zero
edge splits; eight actual boundary edges remain. Each loop has four ordinary
collinear subdivision vertices left by clipping triangle diagonals. This is not
a T-junction that disappears under exact edge subdivision, and no endpoint
distance allowance closes either finite loop.

Captured Float32 coordinate changes remain reported separately. For example,
the header's maximum coordinate change is about `1.78814e-7 m`; the wall's stored
cut Y differs from the recorded 4.92 m by about `7.62939e-8 m`. These facts do not
explain away the missing cut faces or authorize snapping, welding or opening
changes. The same finite openings already exist in the pre-Float32 surfaces.

The open signed surface integrals also depend on origin. Shifting the origin
one metre along the missing face's normal axis changes the header integral by
about `0.01166665554 m³` and the wall integral by `0.05333328247 m³`, exactly
missing-face area times one metre divided by three. An open integral cannot be
silently promoted to closed volume, even if a convenient origin happens to give
a plausible number. The accepted radial seam bound is not applicable.

## Proposal 1: one original office-door cut header

Exact ID: `replacement/office-door-0/header`, original
`office-door-0/header`. Its source is the closed
`BoxGeometry(1.18,0.14,0.25)` header in the pinned Administration constructor.
The recorded cut is `admin-office-partition-0/opening`.

The actual remaining triangles cover **five complete rectangular faces**.
Their projections are pairwise nonoverlapping, their four corners are actual
source positions, their areas equal the complete face domains, and every domain
matches the same five face halfspaces plus the recorded Z=7 cut boundary.
This proves the retained shape from actual faces and the source operation;
a bounding envelope does not substitute for a solid.

Propose a source-local measurement interpretation of the closed cut remnant,
using those verified retained planes and the recorded portal subtraction.
It is an explicit mathematical closure reference, not a claim that the original
physical surface is closed. No sixth face, cap vertices, triangle indices or
UVs are generated.

Its source-retained dimensions, measured from the proved face planes, are:

- X: `0.25 m`.
- Y: `0.1399998664855957 m`.
- Z beyond the cut: `0.09000015258789062 m`.

The proposed exact reference volume is
`6926928393/2199023255552 m³`, about **0.003150002336497 m³**.
For comparison, the original unclosed surface integral at zero origin is about
0.08481659112 m³; it is not used as the proposed volume.

The proposed reference occupies Z≥7, while the actual portal interior occupies
5<Z<7. Their interiors are disjoint. Preserve the existing 2 m opening width and
2.8 m height; restoring the old 1.18 m header across that opening would defeat
the access adaptation. This proposal changes no opening and repairs no physical
face. Acceptance of this exact measurement reference is still required.

## Proposal 2: actual primary-face area on one clipped native wall

Exact ID: `replacement/office-partition-0-tier-0:1:5/wall-1`.
Original metadata identifies an unstretched `1 × 2 × 0.16 m` native wall,
`wallPanels` source and `office-partition-0` run. The source run goes from
(-30,0) to (-30,12); its native Z-facing pair maps to the source X-facing pair.

Selection uses the preserved original face-normal class and the pinned run frame,
then verifies the actual geometry. The selected native +Z member has stored
normal `(-1,0,2^-52)`. Its original triangle vertex offsets are **24, 27, 30**.
The front is not inferred from the smallest or largest coordinate of a box.

Those three actual triangles have an exact nonoverlapping projection covering
their full source face. The opposite native primary member independently covers
the same domain and area. Count one side once; the opposite side is a cross-check,
not extra fuel.

Propose primary area
`173015/131072 m²` = **1.31999969482421875 m²**.
This route proves the primary face directly. It does not require pretending that
the separate missing bottom cut face is present or that the fragment is a closed
prism. The literal bottom opening remains unrepaired.

A bounded negative omits the triangle beginning at original vertex offset 24
from the **analysis view only**. Its coordinate extents remain unchanged, but
actual coverage fails and its area falls to about 1.095599645996117 m².
The front-area proof rejects this view. No geometry/index array is changed.
This demonstrates why face extents alone are insufficient.

The source-front reference remains above the original portal ceiling. Neither
its actual 4.920000076293945 m stored boundary nor the original 4.92 m passage
definition is moved. Native dimensions, UV density and original source assets
remain unchanged. This exact-ID primary-area route still requires acceptance;
it is not automatically applied to the other wall cases.

## Roofs, verification and stop boundary

The [separate roof ledger](../../../art/source/shared-map-fire-bindings/remaining-cut-front-proposal-v1/roof-exceptions-separate.json)
retains `rear-curtain-roof` and both derived end-pavilion roofs. The latter
explicitly removed only their opaque undersides to preserve the stair arrival.
This is intentional open geometry, not a generic cap-repair assignment.
Actual weather-face exposure/duplicate coverage remains unproved for all three.
No new roof geometry analysis or quantity is supplied.

Read-only reproduction:

```powershell
$cutFrontReview = 'C:/Users/baals/.codex/worktrees/art-assets/tinderbox/art/source/shared-map-fire-bindings/remaining-cut-front-proposal-v1'
python -B "$cutFrontReview/review.py"
```

[Check results](../../../art/source/shared-map-fire-bindings/remaining-cut-front-proposal-v1/check-results.json)
record all 194 IDs/12 buckets, exactly two detailed originals, ten existing-face
coverage proofs, the unchanged-extents negative, both raw/compiled boundary
audits and preservation of 67 prior payload/package files and all 1,572 geometry
inputs. The [package inventory](../../../art/source/shared-map-fire-bindings/remaining-cut-front-proposal-v1/review-package.json)
lists exact changed paths and hashes.

All 194 exceptions remain withheld pending the relevant decisions.
This package creates no cap, mesh/UV export, repair, weld, opening change,
anchor, binding, stock, runtime, renderer, factory, build or retained helper.
It stops at the two concrete measurement proposals. Structural joins, glazing
damage ownership and living-plant stock/response retain their separate limits.
