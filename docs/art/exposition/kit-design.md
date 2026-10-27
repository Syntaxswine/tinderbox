# Research-based frontage kit

The accepted first slice uses a repeated Horticulture-inspired frontage and separate pitched/hipped roof samples, with actual Farmyard wall/door materials and normal animals. It is a small game arrangement. The table distinguishes evidence from authoring choices.

## Source facts and derived values

| Classification | Evidence or value | Locator / limit |
| --- | --- | --- |
| Original published description | Horticulture: 1,000 ft length; 250 ft extreme width; two courts, each 88 × 270 ft | 1893 Conkey *Plans and diagrams*, printed p. 9 / PDF scan 29; plan scan 31. Overall dimensions are not individual bay measurements. |
| Original plan observation | Central pavilion, paired connecting wings and end pavilions enclosing courts; installation grid overlaid | Same floor diagram. Exhibit identifiers are not column spacing. No pixel calibration is claimed for it. |
| Original built photograph | Repeated arches below glazed pitched galleries; large glazed central dome | Arnold 1893 plate 43. No measured pitch, bay width or colour. |
| Original built photograph | Fisheries has repeated round arches, hipped/pyramidal roof masses and a lower pitched/gabled entry | Arnold plate 53. It is a different building family, not a Horticulture roof replacement. |
| Architect-published plan/elevation | New York State Building: dimensioned first-floor plan, graduated foot scales and symmetrical façade; paired roof towers and curved end porches | McKim, Mead & White vol. I, plate 44 / scan 99; caption 1893, volume catalogued 1914. Drawing is a later architect-published record of original work. |
| Matching photograph | New York's paired capped towers, broad steps, central entrance, parapets and small front openings; some ground-level openings obscured by trees | Arnold plate 64 and monograph plate 43 / scan 97. Do not infer hidden openings or all side/rear details. |
| Derived unit conversion | 88 ft = 26.8224 m; 270 ft = 82.296 m; 1,000 ft = 304.8 m; 250 ft = 76.2 m | Multiplication by 0.3048 m/ft; conversion of source statements, not new survey measurements. |
| Derived game clearance | 1.4 m gate minus 1.12 m bear diameter gives 0.14 m each side when centred; 1.24 m civilian diameter leaves 0.08 m each side | Uses current model radii 0.56 / 0.62 m. The simulation tests actual passage. |
| Derived game headroom | 2.3 m opening minus nominal 2.02 m prototype bear height gives 0.28 m | Current bear specification, not a historic doorway dimension. |

No drawing numerals are reconstructed from OCR. Plate 44's scale and dimension chains are available for future measured work; this checkpoint does not claim exact New York bay widths or construction details. Roof pitches below are game values, not photo measurements.

## Bounded shared forms

The coder's current `src/content/exterior-kit.js` defines the contract. This document names its fields; it does not define a competing schema.

| Form | Initial game dimensions | Presentation and physics |
| --- | --- | --- |
| Three frontage bays | Each width 4 m, depth 0.30 m, height 3.20 m; total run 12 m | Repeated rhythm is research-based. All dimensions are game adaptations. Use source refs `EXPO-P01:scan31`, `EXPO-P02:plate43`, `game:frontage-fragment`. |
| Central doorway | Frame is one 4 m bay; clear opening 1.40 m wide × 2.30 m high | Consume compiled left/right piers and lintel. An open gateway has no door leaf/collider. Closed state adds a visible solid wood leaf. |
| Pilaster | Width 0.45 m, depth 0.55 m, height 3.40 m in current scenario | Simple raised wall articulation; no claim of exact classical order or historic moulding profiles. Render the supplied footprint. |
| Corner | Width/depth 2 m, thickness 0.30 m, height 3 m | The two compiled legs form the real L. Never render a solid bounding cube over the open quadrant. |
| Gable sample | Width 12 m, depth 2.40 m, rise 1.60 m, base height 3.60 m | Ridge runs along local width. Derived side pitch atan(1.6/1.2) ≈ 53.13°. Generic pitched-family adaptation; no glazed dome substitution. |
| Hip sample | 2.40 m square, rise 0.80 m, base height 3.20 m | Square instance is a pyramidal hip special case. Derived side pitch atan(0.8/1.2) ≈ 33.69°. A rectangular instance must also retain real sloping end hips. |

The initial gable/hip dimensions follow the coder's small scenario. They can be tuned through shared descriptors after review. They do not reduce a named building to a misleading model. No domes, semicircular porch builder, interiors, full fair geography or bespoke ornament suite are included.

## Slots and direct reuse

Each module has `skinSlots.facade`, `trim`, `door`, `roof`, using the coder's stable inherited IDs. All four are present. Assigning a different skin must not change the compiled solid parts or physical material.

| Skin ID | Intended initial source | Status |
| --- | --- | --- |
| inherited-brick | Raw `hybrid-surfaces/brick-factory-v1.png` | Actual donor room/solo surface, original 2 m period and warm tint recipe. |
| inherited-plaster | Raw `ground-concrete.png` | Actual donor concrete surface used as temporary pale finish; not a finished staff façade skin. |
| inherited-wood | Raw `hybrid-surfaces/wood-factory-v2.png` | Actual donor 1 m wood surface; usable for closed door leaves. |
| inherited-cream | Existing imported cargo cream finish | Temporary placeholder slot, retained explicitly. |
| inherited-roof | Existing imported cargo wood/cream finish as documented by the adapter | Temporary roof placeholder; not historic glazing or tile artwork. No extra raw roof image requested. |

The donor's `hybrid-room-art.js` places the main surface on vertical wall faces and concrete on caps/reveals, keeps material periods distinct, and uses world-aligned UVs. Preserve those recipes when adapting shared metre geometry. Closed-door sprites are not pasted over an open passage. The raw sprites are unnecessary for this first solid-leaf geometry.

The current descriptor uses `physicalMaterial` (`wood`, `masonry`, `steel`) separately from appearances. A pale finish on a wood-structured module does not turn it into stone. Fire remains the accepted coarse planar system. Roof parts are overhead decoration with no new ground obstacle, climbing, interior access or upper-storey burning.

## Authoritative parts and lifecycle

`world.modules[]` carries `id, form, x, y, width, depth, height, heading, physicalMaterial, skinSlots, sourceRefs`, plus `opening` or `baseHeight` where required. The coder compiles `parts[]` with centre height, dimensions, solidity and slot. Art consumes these parts and excludes their `moduleId` obstacles from the legacy stand-in builder, preventing duplicated filled doorways.

Door state changes must update both leaf visibility and model solidity from the same snapshot. Quarter-turn orientation uses the same ground X/Y convention as the model. Roof geometry stays inside its descriptor envelope. Openings are never invented by transparency.

Species-tagged actors use the coder's allowlisted normal horse/goat factory and their original paint/rig at authored scale. The scene borrows the renderer for paint projection. Dispose instance and paint resources when actors leave or change species; factory cleanup is idempotent and never disposes the borrowed renderer.

## Review required before promotion

Verify the repeated bays, open 1.4 × 2.3 m gateway, solid closed door, true corner, gable ridge and hip end slopes at desktop and phone scales. Compare skin changes while preserving physical parts. Check actual civilian identity after gait updates, immutable snapshots, old-fixture compatibility, resource stability and full disposal. The architect performs combined movement/fire acceptance and decides publication.

## Occlusion proposal and destruction policy

For the fixed camera looking from ground +X/+Y, the original near frontage at y=9 risks concealing a horse at (7,7) and the bear entering the gate. Proposed coder-owned arrangement change: put the three-bay frontage on the far side around y=5, keep the near courtyard open, start the normal horse at (7,10) with a route along y=10, and the goat at (13,12). Service/roof specimens should stay toward the back. These positions are game adaptations; the final coder scenario and actual camera review determine the delivered layout. No solid wall is made invisible as an occlusion workaround.

For solid compiled parts, the renderer uses surviving IDs from authoritative world.obstacles, including destroyed flags; static world.modules must never resurrect a burnt pier or closed leaf. An overhead lintel may be cosmetically suppressed when all solid parts of its own frame have disappeared, with that suppression reported in diagnostics. This is visibility cleanup, not a falling/collapse, heat or damage event. Separate roof modules have no support relationship in the current schema: their non-solid overhead silhouettes persist until their descriptor is removed. No view-owned support physics or roof fire is inferred. This limitation must be visible in the handoff and diagnostics.
