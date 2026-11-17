# M29 isolated query-kernel review: held for correction

## Successor re-review, 17 November

Coder `68b6e3995bc4bad5f270275578a630fb2646c501`, intaken as `3a99e328`,
corrects all four original findings. Root independently passes 18 focused tests,
23 manifest pins/24-path scope, declaration 22/48 and one fresh read-only
239-check saved-array comparison with exact archive-record agreement. All 92
prior raw archive files, seventeen original source pins and eight unchanged
query/control files pass. All four recorded test PIDs are absent. No old archive
is rewritten and no compiler, proof replay or world operation runs.

The UI specialist independently reruns the exact original eight public repros
and 18-test baseline. All pass. Its two permitted additional cases expose one
new P2 at successor lines 155–156, in both cold and fully native unit cubes:

```js
const p = {x: .5, y: 1.01}; // XZ; vertical cylinder is wholly above the cube.
kernel.sweptCylinderClear(view, p, p, .1, 1.0000003, 1.0000007);
```

Regional clearance is false while the unchanged ordinary sweep is true.
The expanded body envelope allows an off-centre parity witness to introduce
blocking absent from the original control. Preserve the correctly blocked
centred near-outside band and inside band while removing this false block.
Keep logical planes, original tolerances, scoped native retirement and mixed
full-body overlap semantics unchanged. Do not fall back globally to a centre
point, bounding-box solid, whole-parent barrier or unscoped query.

The exact two-case public script/results remain in the UI worker's ignored
`artifacts/ui-qa/regional-query-68b6e399/additional.mjs` and
`additional-results.json`. The coder receives those paths and this concrete
regression. Make a bounded correction and focused regression, rerun relevant
small controls and one saved-array correctness comparison if the correction
changes that path, then commit/push the scoped candidate and stop for re-review.
No native/compiler/world/graph, live consumer, renderer, benchmark or build is
granted. Root push and promotion remain held. All passing and failing evidence
is preserved; the four earlier findings are resolved rather than reclassified.

## Original candidate and first hostile review

Coder candidate `c9b02eb278854380cc41f1de77ed4b0c57e4dc47` is intaken locally
as `ae83cbcd`. This is an isolated static prototype; no existing factory,
registry, collision kernel, simulation or live consumer is changed.

Root independently passes 13 manual tests, declaration 22/48, all 49 manifest
pins/50-path scope, the saved/source audit and a fresh read-only 239-case
comparison whose check records exactly match the archive. No source archive is
written, native compiler/proof replay or world step run. All fifteen recorded
test PIDs are absent. Worker WIP is verified at its actual checkout path and
is not copied into root.

Those results are insufficient for acceptance. The existing UI specialist's
read-only hostile review passes the 13-test baseline and runs eight crafted
public-API cases, reproducing four issues in the exact candidate:

| Priority | Finding | Required correction |
| --- | --- | --- |
| P1 | Rays use surface rather than ordinary solid-or-surface geometry. A top-surface slab misses its underside, returning transmission 1 instead of .02. Both cold and native cases reproduce. | Preserve the original boundary index's `solidTriangles || triangles` ray channel. |
| P2 | A unit cube's thin upper interior band is incorrectly clear for a stationary body, both cold and native. | Retain real outer-halo occupancy in full-body witnesses without enlarging logical claims or tolerances. |
| P2 | Surface geometry can escape the validated solid-derived catalogue/native cell halo, becoming a remote hit or disappearing from scoped faces. | Validate both channels and reject unsupported extents explicitly. |
| P2 | A cold outer-face hit returns an unclaimable ownership cell and false halo flag. | Keep the raw hit cell separately and return actual original ownership/halo provenance. |

The hostile script/results are in the UI worker's ignored QA directory
`artifacts/ui-qa/regional-query-c9b02eb/`; the coder has the exact paths and is
assigned the regressions. The intentionally unsupported overhanging-floor solid
is correctly rejected and is not counted as a bug. No hostile review commits,
runtime edits, large-data replay or retained helper are created by that worker.

Hold the query checkpoint and root push until the scoped corrections and
independent re-review pass. Preserve the passing evidence and all earlier failed
attempts. No live integration, source compiler, world, support graph, renderer
or benchmark grant follows. Remaining source metadata omissions and the fixed
inventory/static limits are separate from these actual defects; this prototype
is not yet a lazy compiler/query bridge or a general four-map adapter.

The source-form saddle proposal `9df30ffc` separately passes its 303 checks,
three finite contacts, package and two JPG review. Its
[native-buffer gate](../engineering/shared-maps/saddle-native-buffer-pilot.md)
keeps actual quantization, one-piece export and support implementation separate
from this query correction. Master/Pages remains unchanged.
