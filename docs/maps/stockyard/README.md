# Stockyard entrance blockout

This is a first editable stockyard sector in the existing Nautilus Map Workshop. It places the artist's actual covered pens and Union Stock Yard gate, alongside native map-editor terrain, rail routes, open-pen fences and provisional industrial massing. The separate wardrobe, livestock and working-clutter assignment remains with the artist.

The approximately 140 by 115 m crop contains one entrance gate, twelve six-bay covered rows (72 bays), four open holding compartments, two railway routes and three placeholder masonry masses. The original 4 by 4 m pen bays and 15 m gate facade keep their authored scale. This is a compact game adaptation of period-map relationships, not a surveyed reconstruction of the entire stockyards.

## Open and edit

1. Prepare a fixed copy of the existing editor from a read-only Nautilus checkout: `node tools/stockyard/prepare-editor.mjs "PATH TO NAUTILUS CHECKOUT"`. It reads Git commit `6a9d93c0a5fceefe5799448da4e69c83b65e3ce9`, exports into ignored task storage, and builds that copy. It never checks out or modifies the donor.
2. Serve Tinderbox with the existing bounded `tools/serve.mjs`, then open `/workbenches/stockyard/`.
3. Use the native tools for ground, walls, open fences and rail routes. The Stockyard assemblies panel selects, moves, turns, duplicates, removes or changes the skin/bay count of the existing pen/gate models. These changes use the same native document and undo/redo history.
4. Export the edited map for a portable backup. The original draft is [stockyard-1893.map.json](../../../maps/stockyard/stockyard-1893.map.json); [layout.json](../../../maps/stockyard/layout.json) is its readable stockyard-layer record. Regenerate the original from its authoring recipe with `node tools/stockyard/create-map.mjs`.

The host uses the **actual built-in editor**, not a substitute scene viewer. Its native map-v2 document preserves the game-owned `tinderboxStockyard` field through import/export and history. The supplied Tinderbox layer renders and edits those custom assemblies. A plain Nautilus editor retains this field but does not install the stockyard art provider automatically. Keep the supplied entry point and the pinned art kit with the map. Unsupported assembly IDs fail explicitly.

This is an authoring blockout. Stockyard navigation, collision, animal behavior and fire are later integration work. Required legacy squad/exit staging records stay in the map's original remote margin; they are not stockyard inhabitants. No playable stockyard is added to the main menu or Pages by this candidate. Editor illumination is for layout inspection; the game's night setting and Volaire art direction remain.

## Period layout evidence

| Source | What informs this blockout | Limit |
| --- | --- | --- |
| [Rascher, 1890 panorama](https://www.loc.gov/item/98687207/) | Dense repeated pen rows, the relation of yards to packing houses and railway approaches | Perspective supports rhythm and topology, not one uniform measured scale |
| [Museum copy of the May 1, 1891 plan](https://chicagohistoryresources.org/greatchicagostories/pdf/artifacts/artifacts_hotdog.pdf), page 10 | Exchange approach, the rail-connected stockyard grid and broader industrial relationships | Low-resolution copy; no bay dimensions or exact gate-to-building distances are inferred |
| [Newberry 1891–92 fire-insurance atlas](https://collections.newberry.org/archive/-2KXJ8Z814UYL2.html), printed sheet 15 / scan 28 | Packinghouse blocks around service tracks and passages | This inspected sheet covers packing houses, not an entrance/individual-pen survey |
| [Existing gate/pen research](../../art/stockyards/README.md) | Native forms, measured gate proportions and removable festive dressing | Some pen detail is interpretation; the decorative postcard is circa 1901–07 |

The gate stands at the east side of an Exchange Avenue-inspired east/west spine. Covered/open pens lie inward, with the industrial edge and Centre Avenue-inspired rail/service corridor to the west. Two rail routes imply district connections beyond the crop. Their relative roles come from the maps; exact crop, spacing, bay count, route endpoints and placeholder building positions are deliberate game choices. Provisional office/packinghouse blocks are not reconstructions of named historical buildings. Later sheets can refine the district without stretching native modules.

The artist's source research cache was inspected read-only. The 1891 museum PDF was inspected only for research; no modern packet or unrelated photographs are redistributed. The imported stockyard kit preserves its own licenses/source records. [Provenance](provenance.json) records exact code/art pins and file hashes. No moving donor branch or donor working file is a runtime dependency.

## Review

Run `node art/source/stockyards/check.mjs` for the unchanged kit's 62 geometry/clearance/rotation/ownership checks. Map creation runs native validation and exact extension import/export comparison. `node tools/stockyard/review.mjs` runs a bounded actual-browser review of layout, native terrain editing, assembly movement/turn/copy, undo/redo, map export/import, roof inspection and native scale. Its isolated browser/server stop in `finally`; any retained owner preview has a separate expiry and lifecycle record.

The fire/grass comparison remains on its own branches and continues with the existing coder. This blockout does not retune or replace the accepted furnished-house replay.
