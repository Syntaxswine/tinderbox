# Isolated regional effective-query checkpoint

Authority: `df3dbcea`, [exact query contract](../regional-query-kernel-pilot.md),
with UI `2999e51bdd0fdc0002c9b8df2054296b6b3e3569`'s accepted representation and
inventory. Authority intake is merge `66f5bea98f102af2823acb9200aac58b228cd466`.
This candidate adds one pure runtime module, manual fixtures/tests, declaration
and this evidence. Existing factories, query registries, collision/geometry,
navigation, support, simulation and all twenty consumer adapters are unchanged.

`createRegionalQueryKernel` admits fixed original part/grid/source/native
references. It validates bounded plain data, IDs/ownership, original integer
spans, physical bounds and original checked-closed meshes, then freezes admitted
inputs in place. Rejected inputs are not frozen. No full geometry snapshot is
cloned or serialized. This prototype accepts curated manual/saved inputs; it
does not implement a shipping loader or the future compiler/world bridge.

Limits are explicit: two static parts, 4,096 cells per part, 8,192 original native
records, 65,536 input triangles, sixteen held views and 324 coverage receipts
(320 roof leaves plus four deck cells). The saved pair has 3,944 roof cells,
four deck cells, twenty original source triangles and 4,136 native records.
Data graph traversal is bounded by those cardinalities and depth 32. Moving
poses, general volume dynamics and arbitrary larger sources are not implemented.
An open mesh marked closed, unsafe/unrepresentable cell boundary, native solid
extending beyond its original cell's existing ±2 EPS query halo, or inconsistent
physical bounds is an explicit admission failure.

## Queries and view transactions

`segment` / `trace` filter original primitive hits by the effective domain before
selecting the first hit for each original record. Cold regions use original
source faces; native regions use original native records. The original boundary
EPS/broad phase, actual normals, endpoints, ignore/live choices, sheet ties and
transmission are preserved. Already-authoritative hits keep their original
values. A later coplanar authoritative interval can be found at an original grid
crossing; neighbouring representable parameters resolve floating interpolation
at that crossing. Rays never run an interior parity test or gain interior
attenuation. Provenance retains original part/range, owner, record, primitive,
canonical source cell, hit cell and halo status.

`sweptCylinderClear` first checks actual domain-scoped solid-face polygons with
the unchanged collision function. It accounts for the entire straight XZ sweep,
radius and fixed vertical band. Each touched cold cell is intersected with the
capsule-prism. Capsule/rectangle nearest points give a real intersection witness;
a bounded convex interpolation puts it inside the cell and the existing lateral
contact margin. The Y intersection includes its owned lower tangent boundary.
If no original boundary crosses that connected intersection, checked original
inside/outside is constant there. The witness is therefore tested against the
ORIGINAL closed mesh using its existing parity operation. The same argument
applies to an admitted native record only when its original closed flag permits
it. No open clipped shell is given parity and no bounding box becomes a solid.
Radius <= the existing body EPS, empty height bands, nonfinite sweeps and an
unrepresentable witness reject rather than invent clearance. This is not a
variable-height body or dynamics solver.

`faces` requires an explicit surface/solid channel and returns tagged original
primitive pieces/provenance. It clips existing faces only, retaining even tiny
edge/vertex contacts. It creates no cap. The saved deck's pre-existing native
slab caps remain original native geometry. Each original primitive is partitioned
across query domains without adding its area or duplicating a scoped identity.
Overlap already present BETWEEN distinct original EPS-clipped native records is
preserved; it is not normalized into a new fuel quantity. Halo pieces keep the
original source-cell/record ID and never create another ownership/stock claim.
The original full-span upper exterior face is retained as an explicitly tagged
outer query halo under the last original cell. The grid ownership map is not
enlarged. No caller may flatten these tagged shapes into an ordinary closed mesh.

`coverage` requires explicit complete native coverage, including empty cells.
Its supplied record IDs must match the fixed inventory for every original cell.
`prepare({expectedGeneration,expectedRevision,...})` stages disjoint domain
changes and named original-record retirement; validation is read-only and commit
publishes one immutable view. One retired record never erases another in its
cell. Malformed/overlapping/unknown/stale/duplicate claims leave the view intact.
Prior held views remain coherent until released, reset or disposal. Reset and
disposal invalidate old views/receipts and release owned masks/references. This
is not the future stock/query/support world transaction, and no attachment is
reassigned to a survivor.

## Executed results

The final manual suite (`synthetic-handoff.*`) passes **13/13**: exact ordinary
cold/native ray/body controls; empty complete coverage; radius/height/intermediate
cold interior; an actual local hole with same-cell survivors; coplanar re-entry;
face/corner and both EPS bands; raw/live transmission and sheet ties; original
face provenance/area; the exact upper-span exterior regression; distinct surface/
solid and native closedness; atomicity/stale/reset/disposal; unsupported shapes;
and nonexecuting accessor/metadata rejection. It also confirms a wholly interior
ray has no added attenuation. All are manual geometry, not native compilation.

The final saved-array comparison (`saved-final.*`) passes **239/239**: 86 ray
option cases, fourteen body cases and two scoped-face cases for each of wholly
cold and fully native, followed by 33 independent mixed-domain ray cases and two
whole-body cases. Systematic roof/deck stations, opposite directions, original
face/corner/EPS bands, a retired pitched patch, two surviving corner records and
explicit empty native coverage are included. Cold controls use ordinary original
queries; full-native controls use saved records. The mixed oracle independently
enumerates original primitive hits and an explicit domain/native table before
per-record first-hit selection. The retired-body case proves its ENTIRE bounding
prism lies in that claimed native cell; the empty case compares original geometry.

| Scoped channel | Pieces / original primitives | Largest original-primitive area delta |
| --- | --- | --- |
| Cold surface and solid, each | 4,429 / 20 | 1.5205614545266144e-12 |
| Native surface | 53,648 / 8,555 | 3.885780586188048e-15 |
| Native solid | 53,742 / 8,598 | 3.885780586188048e-15 |

Each scoped identity is unique and every record/normal/primitive remains
original. Area diagnostics use an explicit `64*Number.EPSILON*scale²*(vertices+3)`
arithmetic enclosure, not a relaxed geometry/contact EPS or fuel certificate.
Original ray results/normals/ties are compared exactly; body booleans are exact.
The 1e-7 geometry/grid and 1e-6 body constants stay distinct. Other consumer
tolerances and all their source files remain unchanged.

The original saved arrays are pinned to raw SHA-256
`bfab707ff646e9dfedfaae3b80d510ac750e4f561335d895c24c4e4cc4d49418`; the original
library is `1e93eb730de7a978b01069df5401ea80d4ddebcff7d101010714e8b4643fc296`.
Only its twenty original source triangles are transformed with the existing pure
helper. Existing undefined/-0 tags are revived in place; native coordinate arrays
are not copied. The saved identity omits transmission/sheetKey: both ordinary
and regional controls use pinned timber/timber-covering transmission .02 and
the existing sourceSurfaceId sheet fallback. No omitted sheetKey is invented.
This comparison does not claim recovery of unrecorded fields beyond that scope.

## Preserved failures and process closure

All ten finite synthetic attempts and five saved-array attempts remain here.
The first synthetic run failed a coplanar default-hit comparison; station
insertion is now limited to a nonauthoritative first hit. The second run's oracle
omitted a valid native triangle hit. The third also exposed floating crossing
rounding and a re-triangulated coplanar oracle's different internal edge; the
corrected oracle uses an independent monotone original-domain interval and the
ordinary native primitive. Those logs remain; later suites pass.

The first saved attempt stopped at setup because it assumed the roof material
was literally `timber`; it is `timber-covering`, with the SAME original .02
transmission. The second passed 235 ray/body checks. Adding the face check found
the concrete deck upper-span exterior omission after 100 checks in the third.
The fourth and final comparisons pass all 239, with the outer-face correction
and then final immutable admission guards. None of these runs compiles native
cells, replays the spent proof or performs a world/trial step. Earlier transient
source versions were not separately snapshotted; their logs/inputs/failures and
corrections are retained. Final source pins identify the executed final candidate.

Runners were foreground, hidden child processes with explicit twenty-second
timeouts and no automatic replay. Receipts retain owner, purpose, executable,
arguments, PID, start/end, exit/signal and deadline. Every attempt exited; fresh
`cleanup.json` confirms all fifteen recorded PIDs absent. No port or retained
helper exists. Syntax, source/archive/proposal pins, declaration 22/48, scoped
whitespace and manifest checks pass. Review them
with `audit.mjs --check`; do not rerun the old compiler/proof packages.

The source-only audit first compared a UI-pinned contract document to its later
architect-amended version. `audit-first-failure.json` preserves that wrapper
failure. The corrected audit verifies the UI's original pins against its source
commit and current documents against the exact authority intake; unchanged
runtime pins still compare directly. No query or physical test was rerun by it.
Verbatim Node assertion logs retain their original space-only diff lines;
local attributes exclude those raw `.log` bytes from whitespace formatting checks.

The compiler's 960-call actual comparison remains SPENT and byte-preserved, as
do the guard checkpoint, UI proposal and unrelated forty-line WIP. This delivery
does not adapt any live consumer or install stock/support/query atomically.
External support ports, birth classification, cascades, followers/debris,
section/reset integration, remaining maps, performance and rendering remain
closed gates. The 2,599.9 ms browser failure remains unresolved. No build,
renderer, browser, benchmark, new export/codec/provider or Pages promotion ran.
Stop for architect and independent UI review of this concrete candidate.
