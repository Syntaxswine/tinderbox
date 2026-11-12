# Stockyard map blockout review

The owner requested a stockyard sketch in the built-in map builder using the existing pens and gate, informed by period maps, while the artist works separately on specialized assets. This first sector is saved as an editable native Nautilus map with a Tinderbox stockyard layer. It remains an authoring candidate; production and Pages are unchanged.

## Exact sources and scope

- Baseline `691b57c33428244ba7ed22ddedb85eea18cf5c75`; the separate furnished-house/grass branches are preserved.
- Artist kit `e98e46f11f818857a2f08054e9d1071e023cc2d3`, intake `9a0b936e43ba7357ccd12f882de126993183a682`. All eight exported art files compare byte-for-byte with that Git source; notices, source records and the unchanged native WALL_KIT pin remain.
- Native Nautilus editor `6a9d93c0a5fceefe5799448da4e69c83b65e3ce9`, verified against public main, exported from Git objects into ignored task storage and built there. No donor checkout or branch was edited. The unmodified engine build verified 596 module paths and own/adapted syntax. This is a deliberate authoring-tool pin, not a production engine update.
- Final runtime/browser capture `31eaec8145dd5a7221e386b946dc7acb7a7acd0d`. Earlier complete behavior capture `cd441d0a02b341ed0d3e1b51b49602a251da11f0` precedes the final packed-earth paint, opaque panel and inspector-toggle/download checks.

Native map fields hold the terrain, two rail routes, open-pen fences and provisional masonry masses. The native editor's preserving map-v2 extension holds thirteen exact stockyard assemblies: one gate and twelve six-bay rows. A small Tinderbox layer presents and edits those assemblies through the same native document/history. A plain Nautilus editor preserves the field but requires this layer to display the custom kit. No asset is disguised as a different supported prop. Four required legacy staging starts/exits remain in the remote original margin, not as stockyard residents.

The layout uses the period maps for district relationships and pen/rail rhythm. Its approximately 140 by 115 m crop, bay count, spacing and provisional masses are game adaptations. Native 4 m bays, gate proportions, rotations, UV density and root scales remain intact. The specialist wardrobe, livestock and clutter are neither imported nor invented by this pass. [Layout notes and primary references](../maps/stockyard/README.md) distinguish inspected evidence from adaptations; [provenance](../maps/stockyard/provenance.json) records exact pins and digests. The museum research PDF is not redistributed.

## Verified result

- The unchanged kit passes **62** geometry, shared-joint, passage, rotation and resource-ownership groups.
- The map is generated using the pinned native map document and railway commands. Native validation reports no errors and retains the stockyard extension through exact JSON import/export.
- Actual 1600 by 1000 Edge WebGL captures show the built-in workshop, the actual models, pen roofs/cutaway, rails, fences and placeholder blocks. Final captured instances all retain scale `[1,1,1]`; the layer and native scene report no errors.
- Actual browser actions verify assembly movement, quarter turn, copy, undo, redo, native terrain editing and JSON export/import. The final check also verifies a real downloaded JSON file and the panel toggle that exposes the native inspector. All acceptance assertions pass. The overview, gate/pen detail, lanes and roof cutaway were visually inspected.
- Native terrain and custom assembly data survive the same document/history. Snapshot identities and the asset set are preserved through round trips. This establishes an editable blockout, not navigation/fire/AI integration or a new engine-wide catalogue provider.

The first harness attempt used a directory URL unsupported by its strict static router; the explicit entrypoint corrected that before capture. The earlier complete run exited successfully. On the final run every behavior assertion and capture completed, but Edge's server-close promise exceeded its 15-second bound. The exact owned browser subsequently exited naturally. An independent cleanup recheck confirms that PID/creation identity is gone and both ports are released; no force termination was used. Both the original receipt and recovery record are retained. The earlier two-hour fire-settings preview also expired and released its process/port.

[Final acceptance](../maps/stockyard/browser/acceptance.json), [capture result](../maps/stockyard/browser/result.json), [original cleanup receipt](../maps/stockyard/browser/cleanup-receipt.json), [verified cleanup](../maps/stockyard/browser/cleanup-recheck.json) and the [evidence manifest](../maps/stockyard/browser/manifest.json) are retained. A new owner-review HTTP preview, if running, has its own registered two-hour lifetime and restart record. The QA browser is not retained.

## Delivery and limits

The native [saved map](../../maps/stockyard/stockyard-1893.map.json), [readable layout](../../maps/stockyard/layout.json), authoring recipe, optional editor host and JPGs are committed on `codex/stockyard-map-blockout`. [Overview](../maps/stockyard/previews/stockyard-editor-overview.jpg), [entrance](../maps/stockyard/previews/stockyard-gate-and-pens.jpg), [pens](../maps/stockyard/previews/stockyard-pen-lanes.jpg) and [cutaway](../maps/stockyard/previews/stockyard-roof-cutaway.jpg) show the same candidate. The complete original stockyards, specialist assets and playable district wiring remain later work. Editor work lighting does not change the game's night/Volaire direction.

This review does not promote the furnished-house simulation, resolve its grass sampling questions, merge the review archive PR or claim completion of the broader realistic-fire goal. `master` remains `c855e627bdee963e930644839a60c027a03935de`.
