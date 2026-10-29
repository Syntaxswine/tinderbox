# Fisheries Building art handoff

The asset provides the exterior and structural interiors of the Fisheries Building: a long main hall and open gallery, a high Romanesque drum, paired entrance turrets, two curved arcades and polygonal angling/aquarium wings. Branch: `codex/fisheries-building-art`. Parent: `a019fcf7254cebe24002441d7c7fdf77d6fc9812`. The preservation audit checks all 215 recorded files from the previous New York, Administration, shoreline and Horticulture deliveries, including the warmer Horticulture revision. No donor checkout, gameplay adapter, UI or previous asset is changed.

## Native assembly

The factory calls unchanged Nautilus `wallPanels`, `measureWallRun` and `wallRunErrors` at pin `90054d07134116a5d9661f8318a76fe68f922aad`. It compiles 5,228 source panels from even whole-metre runs of at most 64 m, using source-validated native-height tiers. Native walls retain 1 x2 x.16 m geometry. Full slabs retain 1 x.12 x1 m geometry. Each native door body retains 1 x1.65 x.12 m geometry. Their original position, normal, UV and index buffers are checked byte for byte; modules are rotated/placed without scale. The .12 m closure between native 2 m walls follows the 2.12 m floor pitch.

Apertures split panels in both axes, including 1 m windows centred across two panels. The clerestory is cut where it joins the central drum; its cornices do not run through the hall. Convex floor outlines are unioned before gallery voids are subtracted, so turret/core joins have no overlapping slabs. Full floor cells remain unchanged; boundary cells are explicit cuts.

| Element | Authored dimensions / level |
| --- | --- |
| Main body | 112 x50 m |
| Entrance projection / approximate envelope | 12 m /32 m |
| Main high drum | 16 unscaled 8 m wall edges |
| Annexes | Each 16 unscaled 8 m edges; 41.007 m vertex diameter /40.219 m across faces |
| Annex upper drums | Each 16 unscaled 4 m edges |
| Arcades | Four 8 m chords each; 6 m deck width; siting adapted |
| First floor | L1 =2.12 m, main 6,169.735 square metres plus wings/arcades |
| Main gallery | L3 =6.36 m, 2,329.735 square metres, with a true hall void |
| External drum balcony | L8 =16.96 m, decorative, without an upper access route |
| Main drum eave | L12 =25.44 m |
| Great cone / lantern / crown | L18 =38.16 m /L19 =40.28 m /L20 =42.40 m |
| Actual bounding crown | 42.4465 m including barrel-tile relief |
| Gallery stairs | Four 2.4 m-wide flights, 24 treads each, L1 to L3 |
| Exterior approaches | Four 4 m-wide flights, 12 treads each, ground to L1 |
| Aquarium pool | 8 m diameter, with rock, reeds and decorative water ribbons |
| Aquarium tank ring | Ten simplified large tanks; nominal 18.2 m clear centre between base inner faces |

**L20 is a height marker, not 20 occupied storeys.** The occupied floors are L1 and L3. Tall rooms contain empty intermediate native levels. The high drum balcony, turret roofs and bell stages are decorative; no hidden stair or accepted route is implied.

Roof tiles are actual curved geometry in a .4 x.5 m rhythm. Different tile planes, roof underlays, clerestory walls and gable siding are separate forms/material slots. Custom roof pitches, lanterns, ornament and tank forms do not stretch native modules. Physical structure, finish, collision, fuel and fire materials remain unassigned; the source compiler's `concrete` enum validates geometry only.

## Source evidence

The [source register](../../../art/source/exposition-fisheries/sources.json) records raw/derived SHA-256 values, creators, dates, stable URLs, rights and exact scan/plate locators. [Measurements](../../../art/source/exposition-fisheries/measurements.json) separate printed dimensions, approximate pixel readings and authored choices.

Conkey's 1893 *Plans and diagrams*, scans 34–37, supplies the description, main ground-floor diagram, main gallery diagram and a separate **angling pavilion** diagram. The ground sheet contains the whole main body but clips part of the far entrance at its edge; the gallery sheet supplies that entrance outline. The diagrams are exhibit-installation drawings, not a complete structural construction set. Numbered exhibit positions are not a structural bay schedule. No aquarium construction plan was inspected.

Flinn's original 1893 guide, printed p.73 /scan79, gives a 365 x165 ft main hall, 133 ft6 in annex diameters and 102 ft entrance pavilions projecting 41 ft. Printed p.75 /scan81 alternatively gives 135 ft for the aquarium. The 365 ft dimension calibrates the oriented ground sheet at about31.532 px/m, using recorded approximate wall-centre endpoints. The depth is an independent check. Thick line interpretation, scan distortion and endpoint selection imply about2–4% uncertainty. Written dimensions guide the 112 x50 m native body; no perspective photograph supplies a numerical height or pitch.

Conkey's printed 1100 ft extreme length is unresolved against the component dimensions and is not used to claim or scale this compound's overall footprint. The arcade chord lengths, gaps and annex placement are explicitly authored. The factory uses a local ground anchor; it does not claim a surveyed exposition-site placement or a cardinal bearing from the oblique source compass.

Arnold/Higinbotham's 1893 plate53, *Fisheries Building from Wooded Island*, confirms the built conical drum, open lantern, four small roof towers, clerestory hips, pointed entrance gable, bell turrets, polygonal annex roofs and open arcades. This monochrome perspective does not establish exact colours. The warm palette follows the user's direction, while the contemporary descriptions support a glazed Spanish-tile roof and marine ornament. Hidden elevations and rear roof joins are interpretations.

The aquarium's pool/rock mound, reeds, falling water and ten large tanks follow the period descriptions. Tank shapes, centre/corridor widths, fish reliefs, boat exhibits, rod cases, railings, shell capitals and fish medallions are simplified artistic decisions. Exact exhibits, concealed services, structural engineering, crowds and individual sculpture are omitted. Public-domain image derivatives remain research outside the game package. Existing mixed/unknown donor rights remain separately recorded; provenance is not a new blanket license grant.

## Factory and doors

```js
import {createFisheriesBuilding} from './assets/art/exposition-fisheries/index.js';
const building = createFisheriesBuilding(THREE, {
  position: [0, 0, 0], quarterTurns: 0,
  sectionIds: ['main', 'west-arcade', 'east-arcade', 'angling', 'aquarium'],
  includeExhibits: true
});
scene.add(building.root);
building.setPortalState('south-entry', true);
// Later: building.dispose();
```

The anchor is ground at the middle of the front entrance. Local +X points toward the aquarium; +Z points toward the rear. Positions require integer X/Z and Y in multiples of 2.12 m. `quarterTurns` is 0, 1, 2 or 3, about local Y. Returned `bounds` conservatively include both closed and fully open leaf poses before placement. Frozen metadata records actual native fragments, clipped cells, stairs and roof surfaces.

`sectionIds` genuinely skips construction of other sections. Each selected section's geometry and placement match the same parts in the full model, within Float32 instance-transform precision. This is art grouping, not implementation of a production nearby-map streaming contract. `includeExhibits:false` omits the interpreted pool/tanks/boats/rod cases while preserving the structure.

Portal IDs are `south-entry`, `north-entry`, `angling-entry`, `aquarium-entry`. Default leaves are closed. Two 1 m native leaf bodies plus separate 1 x1.07 x.12 m upper panels form the 2 m nominal, 2.72 m-high paired assembly. The open hardware reduces the measured clear width to **1.72 m**; metadata distinguishes `openingWidth` from `clearWidth`. A 1.4 m-wide, 2.3 m-high central envelope is checked clear in the open pose. There is no fixed glass across the opening. The arched fixed glass and header remain above/beside it. `setPortalState(id, boolean)` poses art; it does not change simulation or collision.

Slots are `facade`, `trim`, `glazing`, `frame`, `roof`, `roofShadow`, `door`, `floor`, `water`, `rock`, `foliage`, `fish`, `iron`, `exhibit`. Optional `materials` and `textures`, plus `setAppearance({materials, textures})`, preserve geometry and metadata. Borrowed materials are cloned; all input maps/textures and their transforms remain borrowed. Invalid appearance input rolls back without a partial swap. Glass defaults to alpha .34, double-sided, depth writes off and no shadow casting. Native UVs remain unchanged; separate `grossUV` supplies physical metres. Curved ornament retains the documented inherited UV approximations.

The factory owns its geometry, cloned/default materials and instance buffers. Call the returned idempotent `dispose()` when removed. The moving leaf/hardware meshes remain separate from static instancing. Resource disposal is checked exactly once; borrowed maps/materials are preserved.

## Checks and review

The candidate has 1,078,034 triangles in 1,166 draw meshes, 12,545 floor fragments, 57,855 barrel-tile cells and eight native leaf bodies. These are full-detail art counts, not a GPU performance claim; production LOD/culling needs later runtime review.

The focused check validates preserved files and source hashes, actual Nautilus tier validation, unit-scale/buffer identity, complete opaque source-panel area, independent floor union area, slab levels/voids, all stair landings/headroom, closed/open door geometry, centred turret sashes, roof winding/metre UVs, all four rotated poses, independent section output, appearance rollback, frozen metadata and ownership. The saved metadata digest is compared with the live factory. The package gate verifies exact hashes at a nested URL and instantiates the packaged factory with the packaged host Three namespace.

See [offline review](offline-review.md), [check results](check-results.json) and the JPG index. CPU review exports the actual model meshes, not painted concept images. It approximates glass alpha and omits the vertex-colour variation of roof tiles, source bear paint shader, crowds, exact exhibits and gameplay. Cutaway omissions exist only in the review exporter. **WebGL/browser acceptance, production placement, provider registration, collision and traversal remain pending.** No branch push promotes this asset to `master` or Pages.

## Reproduction and helper lifecycle

```text
python art/source/exposition-fisheries/prepare-evidence.py
node art/source/exposition-fisheries/build-manifest.mjs
node art/source/exposition-fisheries/export-review.mjs
python art/source/exposition-fisheries/render-review.py --spp 32
python art/source/exposition-fisheries/compose-review.py
node tools/check.mjs
node tools/build.mjs
node workbenches/art/check-exposition-fisheries.mjs --package
python art/source/exposition-fisheries/finish-review.py
```

Evidence preparation needs the ignored exact-hash originals and Poppler-rendered scans at the recorded paths/URLs; it verifies them before deriving JPGs. Poppler renders one-based scans 34–37 of the Conkey PDF, and scans79/81 of Flinn. Rotate Conkey35/36 clockwise90 degrees. No download or image generation is required for ordinary runtime use.

The exporter uses host Three r180 and the unchanged native bear rig for scale review. Rendering uses bundled Python, Pillow, NumPy and the existing ignored Mitsuba3.9.1 scalar_rgb under `artifacts/render-deps`; no dependency was installed for this task. PLYs, raw scans and helper records remain ignored under `artifacts/exposition-fisheries/`.

Each finite renderer records PID, exact creation time, owner, purpose, inputs/outputs, expiry and an actual same-process 120-second deadline. The private package server has a 30-second deadline and closes in `finally`, with a released-port check. Source scripts and dependency/input/output records preserve restart instructions. No helper or preview service is retained. Completion receipts are verified locally before delivery.
