# One proposed cornice-wall contact

Proposed alternative for relationship `fa9dc4a25193e94ce7b5793e`, region
`19428b0ef95337ce4e9f64a6`, under the [bounded contract](authority-d899d73f.md).
The fixed contact point is `[33.5,8.330000001490117,25.92000000178814]` in emitted world metres.

| Original part | Component | Primitive | Outward normal |
| --- | ---: | ---: | --- |
| main/0/cell-3-1/1 | 0 | 10 | [0,0,-1] |
| edge-0/cornice-1 | 0 | 0 | [0,1,0] |

[Contact record and exact proof](contact-record.json) verify coplanarity and
strictly positive barycentric weights on both original triangles. The point
belongs to both closed original endpoint bounds and their shared selector.
The unchanged native contact predicate accepts the selected triangle pair,
shared-selector facets and endpoint-bound facets. Eight negative controls
reject wrong primitives, the old volume point as a face hit, out-of-selector
original vertices, separated real faces and the opposite wall face.

This is a proposed fixed surface-contact interpretation using the existing
binary contact approximation. Perpendicular faces do not establish horizontal
bearing, fastening strength or grounding. Roles and parent-to-child direction
remain fixed; no symmetric brace or new anchor follows.

The accepted volume witness `[33.5,8.23,25.96000000089407]`, its null face/range
fields and `geometricBearing:false` are unchanged. This proposal does not jitter
or replace them. All prior proof bytes, geometry, matrices, UVs, quantities and
IDs are pinned and preserved. Native record/cell/face lineage remains unbound.

[Input pins](input-pins.json) distinguish committed authority/helper context
from the architect's frozen working probe artifacts. Only the pinned pure
geometry/contact functions run; the older local helper versions are not substituted.

~~~powershell
python -B art/source/shared-map-fire-bindings/cornice-wall-contact-proposal-v1/check.py
~~~

No native compilation, support graph, world, renderer or retained helper is
created. The coder's separately authorized actual native-pair/liveness check
and architect acceptance remain required before this interpretation expands.

The [first recording failure](attempt-01-first-record-reference-check.txt) is preserved.
Its output/link-check order was corrected; all geometric checks remain unchanged.
