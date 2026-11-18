# Bounded lower-root source trace

**Result: source roots remain unproved.** This one cohort examined 36 original
parts / 428 triangles and 34 declared pairs. It found 17 positive source contacts
and 17 named unproved contacts. Both existing declared ground anchors have
positive original faces exactly at their declared Y=0 plane. Neither selected
route forms a complete proved original path. This does not reject unexamined
alternatives or establish that the building has no valid support path.

The cornice trace has seven unproved joins. Its first declared seam-to-cornice
contact is positive, but the selected ancestor chain contains six empty
intersections and one contact that the unchanged method cannot establish.
The roof's first two candidates, `main-roof-deck/tile--1-31` and
`main-roof-deck/tile--1-32`, declare neither parents nor anchors; their
`native-face-connected-span-needs-kernel-resolution` status remains explicit.
The third candidate, `main-roof-deck/tile--1-33`, has a declared ancestor chain
with an actual-material ground anchor, but seven joins in that chain remain
unproved. All three tested roof-to-deck pairs have an exact measured vertical
separation of 3.8281083192259757e-7 m. Their new exact intersection selector is
empty. No padding, snapping, coordinate repair or tolerance change was made.

These are named source-proof boundaries, not declarations that such microscopic
gaps are physically meaningful, nor proof of load capacity. Historical
`2e-5 m` contact evidence is preserved separately. It does not override the
new source selector or become a new port. Historical fixed-embed records remain
unchanged; a newly established exterior contact is only bearing evidence.

The conditional cold original-support allowance was unused because both
complete routes were not ready. No native producer, compiler, simulation clock,
thermal trial, renderer, whole-map diagnostic, build or benchmark ran. Native
records, cells and host face bindings remain **UNBOUND**. The saddle, upper
member and descendants contribute no links or geometry to this cohort. The
three approved saddle ports/Float32 mapping are references only. Required ALL
and the upper member's existing local [49,50] interval remain unchanged.

- [Frozen plan](plan.json): first declared cornice chain; roof's first three
  alternatives and their first declared chains. Unexamined alternatives and
  attachment/adjacency records remain exact metadata references.
- [Source result](result.json): all 34 contacts/selectors, original primitive
  and component IDs, exact normal/hash evidence, anchor triangles and paths.
- [Input pins](input-pins.json), [selector lineage](selector-lineage.json), and
  [referenced saddle/context](references.json).
- [Authority](authority.md), [one-cohort coordinator](coordinate.py),
  [source checker](source-check.mjs) and [metadata verifier](verify.py).
- [Owned helper receipt](helper-receipt.json), [coordinator closure](coordinator.json),
  [check results](checks.json) and [packet hashes](review-package.json).

The first cornice pair already has typed local selectors. The computed common
selector equals both existing bounds exactly, and the point/facet proof uses
that same region. The execution records' `originalSelector:null` is clarified
in selector-lineage.json: it describes an unsupplied method input, not absence
of historical selectors. Those original typed records remain verbatim; the
other 33 legacy pairs receive newly constructed selectors. No source result
was rewritten and no calculation was repeated.

The plan was written before geometry reads/expansion. The coordinator then
recorded opaque source hashes and launched one hidden child with a 60-second
deadline. That child transformed each admitted part exactly once and reused
20 raw geometry buffers and its 36 transformed buffers. Positive contacts were
validated immediately using those same cached buffers. Saved-evidence review
performs no further transforms or contact searches. The normalized cornice
23-positive/11-unproved records are pinned references and were not recalculated.
No geometry buffers were copied or changed; no full 393-part ancestor graph
was flattened. No second cohort or retained helper exists.

Verification: `python -B art/source/shared-map-fire-bindings/new-york-lower-root-trace-v1/verify.py`.
The calculation marker deliberately prevents rerunning the source cohort.
`prepare.py` and `coordinate.py` preserve how this finite result was made;
do not delete the marker or retry the source calculation.
