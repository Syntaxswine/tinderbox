# Retained-cut references for the remaining native cases

Source-only candidate for architect review. This batch applies the accepted
construction from authority `54502507c8984b0b9c7f3b37126be2737141a80e` to exactly
29 remaining cut boxes and `replacement/rotunda-gallery-guard-12/baluster-6`.
It does not install quantities or declare the physical meshes closed.

The artist parent is `0625c637bb649a55838a5d143e52b066434450c1`; the original
scene/producer context remains `2b350309d9116812a1d3988af090614bdaefbc25`.
The [authority snapshot](../../../art/source/shared-map-fire-bindings/retained-cut-case-batch-v1/authority-54502507.md)
is checked against the committed architect document. The
[input pins](../../../art/source/shared-map-fire-bindings/retained-cut-case-batch-v1/input-pins.json)
record original producer files, the 20 targeted compiled sections, original
matrices and the accepted predicate source. Existing provenance is preserved.

| Outcome | Boxes | Clipped baluster | Total |
| --- | ---: | ---: | ---: |
| Complete source reference, awaiting review | 19 | 1 | 20 |
| Withheld; no scalar quantity | 10 | 0 | 10 |
| Examined | 29 | 1 | 30 |

The complete Administration cases are the two-component entrance header and
the jambs/mullions of rotundas 1, 3, 5 and 7: 13 sources. The seven complete
Horticulture cases are both entrance fans, the two-component guard base,
guard cap-1, both gallery handrails and baluster-6. Exact IDs, ranges, original
triangles, reference volumes and directed-lower representations are in the
[case certificates](../../../art/source/shared-map-fire-bindings/retained-cut-case-batch-v1/case-reference-certificates.json).
The [resolved/unresolved ledger](../../../art/source/shared-map-fire-bindings/retained-cut-case-batch-v1/resolved-unresolved-ledger.json)
lists every case and its physical-closedness flags.

Each component uses its actual captured Float32 triangles and existing boundary
vertices. The local predicate extension permits any *exactly planar* simple
loop: it proves coplanarity with exact rational residuals and projects along
the largest normal component. It introduces no fitted plane or planarity
allowance. Loop orientation opposes the original boundary edges. The reference
faces remain continuous mathematical disks; no cap vertex/index buffer is made.

The certificates retain the source triangle-pair and source/reference-face
intersection classifications, opposite internal-edge uses, vertex links,
boundary ownership, Euler check, separate reference-face separation, zero
closed oriented-area vector and shifted-origin volume check. A positive closed
reference volume follows only after these checks pass. Original open-integral
and strict-closure failures remain historical facts. No volume comes from an
envelope, extents or a restored whole constructor.

For every reference boundary the checker traces the raw pre-Float32 source
coordinates to a recorded subtraction plane. It records exact plane residuals,
the original Float32 rounding cell where applicable, the observed local cast
bound and signed outside-clearance intervals. Negative and nonzero clearances
remain in the evidence. This describes captured retained material; it grants
no coordinate snap, clearance change or global tolerance.

The entrance header and guard base each contain two complete reference
components. Their actual coordinate halfspaces prove disjoint *interiors*
before component volumes are summed once. These bounds establish separation
only; each volume comes from its embedded reference. The actual affine
determinant is applied once. The unchanged volume recipe uses exact binary64
`.12`, followed by the existing directed-lower binary64 and JSON/decimal
representation proof. No component stock or union stock is created.

Ten cases remain withheld:

- Administration `replacement/office-door-7/header` and
  `replacement/office-door-7/jamb-1` have literal boundary loops that are not
  exactly planar.
- Horticulture court arches `court-0-0`, `court-0-2`, `court-1-0` and
  `court-1-2`, each at `arch-10/jamb--1` and `arch-10/jamb-1`, require an
  additional exact existing-node edge-ownership argument.

There are exactly [two minimal unadopted proposals](../../../art/source/shared-map-fire-bindings/retained-cut-case-batch-v1/minimal-proposals.json):
one for `replacement/office-door-7/header`, to prove separate patches by
recorded cut-plane ownership; one for
`replacement/court-0-0-arch-10/jamb--1`, to prove its exact edge ownership and
producer correspondence. Neither proposal is applied or assigned a quantity.
They do not authorize adoption across the other held cases.

All 30 cases explicitly retain `closedSourceSolids:false`. A complete
`closedMeasurementReference` supplies no physical containment, collision or
support shortcut. There is no stock, binding, support, profile or runtime
export. No source coordinate, triangle, UV, opening, native dimension, renderer
or factory changes. Roof work remains with UI.

[Check results](../../../art/source/shared-map-fire-bindings/retained-cut-case-batch-v1/check-results.json)
record PASS: 30 exact cases, 40 negative controls, two disjoint-interior proofs,
108 prior payload/package files preserved and all 1,572 original geometry
inputs unchanged. The controls reject duplicate component counting and omission
of an actual boundary loop for each of the 20 complete cases. Earlier paired
failures and earlier proof packages are hash-preserved, not relabelled as passes.

Reproduce from the assigned artist checkout:

```powershell
Set-Location 'C:\Users\baals\.codex\worktrees\art-assets\tinderbox'
python -B art/source/shared-map-fire-bindings/retained-cut-case-batch-v1/review.py
```

The default checker refuses writes, reproduces the six saved reports and checks
the [package manifest](../../../art/source/shared-map-fire-bindings/retained-cut-case-batch-v1/review-package.json).
Python compilation, JSON/text checks, link review and scoped Git checks apply;
no runtime/browser test is claimed for this source-only candidate. The finite
generation exited before Coder's reserved cost window. Final reproduction
resumed only after Coder's explicit process-exit notice. This package contains
no benchmark or performance claim, and retains no helper, server or port.
