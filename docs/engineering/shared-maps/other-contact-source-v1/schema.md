# Source input schema, version 1

The proposal is JSON and is not runtime-consumable. All IDs retain their original spelling. Numeric dictionaries are referenced by zero-based `id`; their arrays are ordered by `id`.

| Dictionary | Identity and required content |
|---|---|
| `geometries` | One record per original geometry ID/path/hash: pinned commit, raw SHA-256, source path. `originalTriangles`/`positionType` are null for unopened buffers; status distinguishes referenced-unattempted from pinned-representative-buffer. No vertex/index arrays. |
| `topologies` | Deduplicated existing-helper component results: component ID, absolute original-buffer primitive indices and closed flag. Closedness is the helper's surface-edge result, not volume-connectivity acceptance. |
| `instances` | Logical owner plus render/source part identity, original global source-part/carrier indices, geometry dictionary index, actual 16-number matrix, original source range, primitive base, role and canonical recipe. Attempted instances carry ordered Float64 geometry hashes and a topology reference or component failure; other instances remain UNATTEMPTED. Native ID/cell stay null. |
| `relationships` | Original relationship ID/ordinal/family, parent/child instance references, roles, original kind/action/direction/accepted/applied/anchor/retirement flags, original region IDs and full original-record canonical hash. No new relationship or quantity. |
| `regions` | Original region ID/source pointer/hash, relationship/family, parent/child references, original selector (including null), two original endpoint bounds and historical witness/certificate fields. Exactly one status below. |

`source-contact-proposed` requires `contact` and `checks`. Contact contains one finite XYZ point, two original component IDs, two **absolute original-buffer triangle ordinals**, separate `rangeLocalPrimitives`, two actual unit normals, derivation and membership method. The original source range's `start/3` maps absolute to range-local indices; neither is a native clipped-face ordinal. Checks retain three contact booleans (six for the original symmetric seam), facet counts, applicable negative counts and float plane residuals.

`unproved` carries a stable `unprovedCode` and named affected instance references; it contains no accepted contact. This checkpoint has one `original-component-unresolved` case. No component/geometry repair is implied.

`UNATTEMPTED` contains no contact, checks or failure claim. Exactly 1,574 regions retain this status. Shared instances being measured for a representative does not validate another region's contact.

Full original records remain referenced by source commit/path/JSON pointer plus SHA-256 of UTF-8 sorted-key compact JSON, so unprojected fields are preserved without per-region prose copies. Historical field presence is retained: an absent field is not rewritten as null. Recipe values come once from the original indexed carrier row and are never copied as per-contact fuel.

The first-page scope, IDs and status counts are enforced by `check.py`; original coordinate/provenance/contact checks have the separate bounded page receipt. `schema.json` supplies the structural JSON schema. No external schema library or runtime dependency is introduced.
