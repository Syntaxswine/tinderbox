# New York first-control support overrides

Consume the artist's proposed small path
`assets/art/shared-map-support-overrides/new-york-controls-v1.json` offline.
The architect authorized exactly the ten control pairs and two moving-leaf support
interpretation retirements; this is not authority for all unrooted components.

Use `version:1`, `placeId:'new-york'`, `baseBindings:{path,sha256}`,
`effectiveGeometryOverlay:{indexPath,sha256}`, `coordinateFrame`, `authority`,
`joins` and `retiredSupportInterpretations`. Preserve the exact completed binding
SHA `407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba`
and overlay SHA `f1252c7364adfeb025f573fc4650020e71915a3e17e71bcf2e725e56c3f1c941`.
The frame is emitted-world with the existing source offset already applied.
`authority` may include the exact approval reference and committed policy pin when
available; do not invent a policy commit for a message-only approval.

Each of the ten `joins` records has `childCarrierId`, `parentCarrierId`, `kind`,
`direction`, `groundAnchor:false`, `childRegion`, `parentRegion` and `evidence`.
Retain the proposed bounds, frame, geometry references, witnesses and actual gap
or contact measurements in each region/evidence record. These are local selectors
over the same effective meshes, never substitute solids or new earth anchors.
Use the existing region shape from completed `attachmentRecords`.

- Measured embeds: `kind:'fixed-embed'`, `direction:'parent-to-child'`.
- The one accepted structural seam: `kind:'structural-seam'`,
  `direction:'symmetric-structural'`, only on its exact named pair.
- The one explicit carpentry joint: `kind:'carpentry-butt-joint'`,
  `direction:'parent-to-child'`, retaining its actual fastening/contact evidence.

Each of the two `retiredSupportInterpretations` records has `childCarrierId`,
`parentCarrierId`, `originalEvidenceKind`, `reason` and
`geometryEvidenceRetained:true`. These remove only that named permanent support
interpretation from the runtime graph. The original binding and observed contact
remain evidence; the moving leaf still has its real geometry, hinge and handle.
Do not remove a source part, carrier, collision shape, adjacency search record,
portal pose or fuel account. The fixed front header gains its two fixed-jamb
parent records; neither leaf pose nor leaf survival may become its earth path.

The coder will validate IDs, pins and exact scope, project these typed local
records into compact runtime metadata, and record the override as a separate
source input. No additional runtime authoring fetch or duplicated 40 MB binding
table is needed. Cold and active graph behavior must match; local parent loss
must remove the dependent support, and the control must not create a self-grounding
cycle. Remaining global components are reported rather than silently corrected.

Artist owns this additive descriptor, independent evidence/checker and the
separate unapplied parapet-blocking proposal. Coder owns runtime normalization
and behavior checks. No geometry, stock, profile, renderer or build change is
authorized by this interface.
