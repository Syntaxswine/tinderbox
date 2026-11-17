# New York additive effective-geometry contract

Prepared shared-file contract for coder reconciliation before completed asset exports. Authority:
`fe29be3a174121914cc762e1bc9f10004186fb65`, M29 Accepted New York coverage completion.
No runtime implementation or renderer is part of this artist delivery.

## Files and frames

- Preserve `assets/art/shared-map-fire-bindings/new-york.json`, its original authoring
  files/checkers and the raw/access/exploration geometry as accepted pilot controls.
- Completed offline bindings: `assets/art/shared-map-fire-bindings/new-york-complete-v1.json`.
  It uses the existing version-1 binding record shape, adds the accepted records and
  links `effectiveGeometryOverlay: {version:1,indexPath,sha256}`. This is offline compiler
  input; the runtime does not fetch this authoring/evidence table.
- Overlay manifest: `assets/art/shared-map-derived-geometry/new-york/v1/index.json`.
- New geometry payloads: `assets/art/shared-map-derived-geometry/new-york/v1/geometry/<id>.json`.
- Authoring/evidence/checks live under `art/source/shared-map-fire-bindings/completion-v1/`.

Geometry attribute positions/normals are in each binding's local buffer frame, exactly
as in the existing scene schema. The binding's matrix is the exact emitted-world matrix
and already includes `[56,0,26]`. Every replacement keeps that matrix. The four restored
jambs bake their original source placement into the buffer once, then retain the same
existing emitted-world matrix. Bounds are measured world-space evidence; they never
replace exact collision/heat geometry. IDs stay place-local and are qualified once.

## Manifest record shape

```json
{
  "version": 1,
  "placeId": "new-york",
  "sourceScene": {"indexPath": "assets/art/place-scenes/new-york/index.json", "sha256": "<exact original index hash>"},
  "geometryCoordinateFrame": "binding-local",
  "matrixCoordinateFrame": "emitted-world; source offset already applied",
  "replacements": [{
    "sourcePartId": "replacement/main/1/cell-3-13/1",
    "partId": "replacement/main/1/cell-3-13/1",
    "sectionId": "<unchanged>",
    "operation": "append-cut-plane-caps",
    "before": {"geometryId": "<old>", "geometryPath": "<preserved>", "sha256": "<old file bytes>", "triangleCount": 14},
    "after": {"geometryId": "<new>", "geometryPath": "<new local file>", "sha256": "<new file bytes>", "triangleCount": 16},
    "matrix": ["<same sixteen numeric matrix elements>"],
    "bounds": {"min": ["<world>"], "max": ["<world>"]},
    "appearanceMaterialId": "<unchanged source appearance hash>",
    "retainedSourceTriangles": {"start": 0, "count": 14},
    "appendedClosureTriangles": {"start": 14, "count": 2},
    "provenance": {"authorityCommit": "fe29be3a174121914cc762e1bc9f10004186fb65", "originalSourcePartId": "<native original>", "originalSourceGeometrySha256": "<original factory record>", "cutIds": ["<existing cut>"]}
  }]
}
```

Example counts above illustrate fields only. Delivered counts will be measured.
Triangle intervals count triangles; any inherited `sourceRange` continues to count
index elements (vertices for nonindexed geometry), with the original explicit start/count.
Geometry payloads use the existing `{attributes:{position,normal,uv,grossUV},index?}`
shape, preserving item sizes and existing arrays. `geometryId` hashes the canonical JSON
payload without its trailing LF; `sha256` hashes actual file bytes including LF.

Exactly 25 records use `append-cut-plane-caps`: existing buffers and triangles remain
an identical prefix; new triangles close only existing retained-solid cut faces.
Exactly four use `restore-original-closed-jamb`: the full effective buffer comes from
the verified original native source, with original UV/normal/grossUV preserved; no
retained-prefix claim is made for those four. Their original/emitted before hashes and
zero-interior-contact evidence remain explicit. No other part is replaced.

Completed binding render records point directly to each effective `after.geometryId`
and `after.geometryPath`, retain their original `partId`, matrix, appearance hash and
section ID, and record `sourceGeometryId`/`sourceGeometryPath` for the preserved before
state. One shared provider applies the same manifest replacement for render, physical,
collision, aiming, heat and support. No consumer substitutes an AABB or quietly keeps
the old open mesh; the overlay must be accepted atomically for that part.

## Attachments and local retirement

Existing `supportCarrierIds` remains a compatibility index. Typed `attachmentRecords`
make the relationship explicit: `fixed-embed`, `bearing-face`, or `fixed-assembly-mount`,
with exact `parentCarrierId`, witnessed geometry/declared mount evidence, and
`groundAnchor:false`. The accepted 652 embedded joins and 12 declared mounts retain
the exact approved IDs. Mounts preserve their real geometric gaps. New material/cut
carriers get separately measured parent evidence; unsupported additions are reported.

Each join is scoped to the actual local overlap, bearing face or parent member. The
canonical carrier owns finite stock once; it may supply several local thermal/render
patches. Render/physical/support retirement follows those local patches. A single hot
patch cannot retire an entire long carrier, all section instances, or all of its joins.
Full-part retirement occurs only when the corresponding physical part is wholly gone
or its actual local supports fail under shared rules. Artist metadata does not change
solver coefficients or create a general overlap/grounding rule.

Cosmetic graphics/stripes own no fuel. Explicit `followOwnership` records identify their
real physical parent carriers, local projection/patch behavior and final retirement
condition. Existing source solids remain available for truthful screening where they
already exist. A cosmetic binding cannot resurrect a retired parent, duplicate fuel or
retire unrelated geometry sharing a material/instance batch.

## Intake and verification

The coder consumes the full completed bindings and the exact overlay offline, emitting
compact shared-runtime content. No root runtime files are imported into the artist branch.
The artist delivers unchanged original buffers, per-ID before/after hashes, closedness,
finite quantities, exact source/patch ownership and affected native clearance checks.
All 75 accepted material choices are applied explicitly, with no extra coating. Remaining
unsupported new carriers are listed rather than grounded. No renderer/JPG helper starts
until the later shared pilot grant.
