# M29 isolated query-kernel review: held for correction

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
