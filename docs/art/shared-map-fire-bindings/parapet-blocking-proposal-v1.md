# Main parapet: modeled timber blocking proposal

**Unapproved geometry proposal only.** The first-control authority `01da2407` requests
this design; it does not authorize adding its geometry, fuel or support links. The
accepted assembly, source history and completed bindings remain unchanged.

## One repeatable design

Use one small, newly authored timber block at the center of each of the 48 existing
one-metre bays beneath `carrier/main-parapet-0/base`. Each block sits on the actual
upper face of rooted `carrier/edge-0/cornice-7` and meets the actual parapet-base
underside. This models the intervening material rather than declaring a long empty
fastening. No additional beam or global bracing member is proposed.

| Property | Proposed value |
| --- | --- |
| Shared new fitting primitive | Closed box, 12 triangles |
| Instances / native pitch | 48 / 1 m |
| X centers | 32.5, 33.5, ... 79.5 m |
| Z center / block depth | 26 m / 0.16 m |
| Block width | 0.16 m |
| Bottom plane: actual cornice top | 17.05000000357628 m |
| Top plane: actual parapet underside | 17.26000000178814 m |
| Actual block height | 0.20999999821185966 m |
| Actual horizontal bearing area at each end | 0.0256 m² |
| Total proposed geometry | 576 triangles |
| Added finite fuel if approved | 2.1504 `frame` prototype units |
| New ground anchors / coating fuel | 0 / 0 |

The physical one-metre pattern is reusable and stays within the current cornice and
parapet footprints. These are new small fittings; existing walls, floors, doors,
assembly positions and UVs retain their exact authored measurements. The study uses a
new unit-box primitive with precise proposed transforms, not a stretched donor wall.

The [complete geometry/contact specification](../../../art/source/shared-map-fire-bindings/support-overrides-v1/parapet-blocking-proposal.json)
contains the shared indexed primitive, all 48 matrices and unique prospective IDs,
96 actual contact regions/geometry references, source hashes and 144 roof-separation
controls. It is stored under `art/source` and has no production asset registration.
The proposal reuses the cornice timber appearance `1889c49c58682807c8a86350feff6f3d04caab236cdd480952cdb1ce56996490`.
New face `uv`/`grossUV` are measured in metres at one UV unit per metre. Original paint
and UV data are unchanged. This is a game engineering adaptation, not a new claim
about documented historical construction.

## Measured contacts and existing support

All 96 top/bottom contacts are coplanar with the actual source triangles and have the
full 0.0256 m² footprint. The study computes clipped triangle-union area, rather than
using box overlap as bearing evidence. Both host-plane gaps are zero in the proposed
transforms. Every new study solid is closed, consistently wound and has positive
volume. The three nearby pitched roofs remain disjoint from all blocks: 144 true
separating-projection checks pass, with at least 0.046117679 m separation for the
closest proved projection. That value is a conservative lower bound, not an exact
nearest-distance measurement.

The cornice already has a 14-step **existing explicit parent path** to an original
native-ground-contact carrier. The exact path and its existing source evidence are
recorded in the specification. No proposed block, new support override, reversed
adjacency or invented anchor participates in that grounding proof.

## Finite ownership and local retirement

Each prospective block has its own closed solid, one canonical fuel account and
`frame` behavior using the existing closed-volume / 0.12 convention. Each adds
0.0448 prototype units; 48 add 2.1504. The actual current total stays 15,767.943953.
Only if this design is later accepted would the hypothetical total become
15,770.094353. Appearance adds no second stock account or automatic coating.

Each bottom bearing names the actual local cornice patch. Loss of that patch removes
that block's bearing; the shared kernel owns subsequent support, falling and finite
burning debris. A lost block removes only the corresponding one-metre upper bay's
direct vertical bearing. Remaining actual neighboring geometry connections are
assessed by the shared kernel. No whole-parapet or whole-cornice retirement switch,
whole-beam rigidity, extra cross-bay brace or independent earth anchor is added.

The [study receipt](../../../art/source/shared-map-fire-bindings/support-overrides-v1/parapet-blocking-checks.json)
records 48 closed solids, 96 face contacts, 144 roof controls, exact signed-volume
versus dimension-based quantities and the existing ground path. These are geometric
proposal checks, not runtime stability, visual acceptance or a load/stress analysis.

```powershell
python art/source/shared-map-fire-bindings/support-overrides-v1/parapet-blocking-proposal.py --check
```

Run without `--check` to regenerate only the study JSON/receipt. Implementation
requires a separate approval and later shared-runtime ownership, parent-loss and
rendered review. The ten-fixture support override has no reference to these new
members. No production geometry, renderer or retained helper is created here.
