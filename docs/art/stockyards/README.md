# Covered pens and Union Stock Yard entrance

Artist candidate on codex/modular-stockyard-art, based on published c855e627bdee963e930644839a60c027a03935de. The assignment is proposal 5fa7857dc8528be84e4c33846c68cfc954ca2518, with the owner's festive skin direction at 812cffa900290a04524aa3bae32676cada0ba9cb.

The export contains one repeatable covered swine pen and a custom three-arch entrance, with working and jubilee skins. All JPGs render the actual exported factory with the existing shared Three r180, an unchanged native goat and borrowed Nautilus oil lanterns. No additional donor revision was imported. Production placement and gameplay follow the owner's JPG review and the architect's separate coder contract.

## JPG checkpoint

All seven images are 1600 by 1070 pixels, including a 1600 by 950 native WebGL image above the caption.

| View | What to inspect |
| --- | --- |
| [Single pen](previews/pen-single.jpg) | 4 by 4 m bay, native goat, trough, gate, earth and separate paving |
| [Two joined pens](previews/pen-two-bay.jpg) | Continuous roof, one shared fence/post line and one fully open service leaf |
| [Joint cutaway](previews/pen-joint-cutaway.jpg) | Two 1 m roof spans hidden for inspection, exposing the single partition |
| [Pens at night](previews/pen-night.jpg) | Broad fans, bow loops and ribbon tails under warm lantern light |
| [Decorated entrance](previews/gate-jubilee.jpg) | Prominent postcard-inspired cloth, framework, flags, eagle and welcome sign |
| [Plain entrance](previews/gate-plain.jpg) | Same daytime camera and character, with optional decorations hidden |
| [Entrance at night](previews/gate-night.jpg) | Stone passages and cloth shapes under subdued sky and warm lantern light |

The single pen and normal two-bay view retain every roof span. Only the cutaway hides roof/0/3 and roof/1/0. Lantern placements and light are review fittings. Livestock, crowds, adjoining gatehouses, iron portcullis, historical side grilles, fire simulation and gameplay UI are omitted.

## Sources and dimensions

The [source and rights register](../../../art/source/stockyards/sources.json), [measurement record](../../../art/source/stockyards/measurements.json) and [research-cache fingerprints](../../../art/source/stockyards/preserved.json) distinguish facts, later documentation and inferred details.

The [1878 LOC print](https://www.loc.gov/pictures/item/90712275/) identifies covered hog and sheep pens. The [1890 panorama](https://www.loc.gov/item/98687207/) supports repeated roof strips. Their distant views establish type and rhythm rather than close carpentry. Timber color, single roof slope, six boards, bracing, trough and fittings are interpreted game details.

The accessible [Newberry atlas item](https://collections.newberry.org/archive/-2KXJ8Z814UYL2.html) is printed sheet 15, marked SKELETON, in scan filename 00000028.tif. Its displayed full sheet shows packing houses and rails. No readable scale suitable for a pen-bay measurement was found. The 1890 panorama's printed baseline scale was also inspected and was not used as a perspective-wide calibration. The pen keeps the architect's provisional 4 by 4 m bay and 2 m service opening.

The [NPS nomination](https://npgallery.nps.gov/NRHP/GetAsset/NHLS/72000451_text), PDF page 5, provides later written dimensions. The game facade is 15 m nominal versus approximately 50 ft. Its central opening is 5 m wide and 5.18 m at the crown, versus nearly 16 ft and 17 ft. The unequal north and south openings are 2.5 and 2 m versus 7.5 and 6 ft. Conservative passages include the plinth and are 4.92, 2.42 and 1.92 m wide. Native characters pass all three in the geometry checks.

The [city record](https://webapps1.chicago.gov/landmarksweb/web/landmarkdetails.htm?lanId=1441) dates the gate around 1875; the NPS account says around 1879. Both predate 1893; this asset does not settle the discrepancy. The later description supports the rear false gable. Roof depth, some heights and simplified details remain adaptations. The NPS restoration account separates replacement copper from earlier sheet metal. The brown finish does not assert a particular 1893 alloy or fire response.

The owner's [Holzman postcard](https://commons.wikimedia.org/wiki/File:Union_Stock_Yards,_Chicago,_Illinois,_circa_1901-1907.jpg) is dated circa 1901-07. It governs the removable dressing, extended to the pens under the owner's direction. Attribution and the US public-domain label were verified on Commons. The original Maryland catalogue redirected but returned an empty HTTP 202 response, so its current record remains unread. No scan pixels are redistributed or used in a texture. Framework material, cloth fiber, exact star count and decoration event remain unknown. The flags use a reduced star-field motif.

## Export contract

Use [index.js](../../../assets/art/stockyards/index.js), [kit.json](../../../assets/art/stockyards/kit.json) and [manifest.json](../../../assets/art/stockyards/manifest.json). The factory receives the host Three namespace.

    const pens = createStockyardAsset(THREE, {
      id: 'covered-swine-pen',
      bays: 2,
      skin: 'jubilee',
      quarterTurns: 0,
      position: [0, 0, 0],
      gateAngles: [Math.PI / 2, 0]
    });
    scene.add(pens.root);
    pens.setSkin('working');
    pens.setGateAngle(0, Math.PI / 2);
    pens.dispose();

The union-stockyard-gate ID selects the entrance. createStockyardPiece exposes 35 stable component IDs, including unequal side arches and roofs. The pen assembler emits shared partitions and posts once. Roof end pieces occur only at the row ends. A continuous timber deck supports the board pattern across internal joints.

Placements use integer X/Z metres and native floor-pitch Y. The existing Nautilus WALL_KIT pin remains 90054d07134116a5d9661f8318a76fe68f922aad. No native wall, character or door was resized. Custom gate masonry and partial-height fences are original forms. Floor polygons stay at native level zero; roofs expose supported polygons and elevations.

Metadata and bounds reflect the current skin, gate angles and quarter turn. They include named parts, physical-material tags separate from appearance slots, measured vertex bounds, conservative projected part envelopes, actual ground-contact polygons, floor/roof surfaces, passages, hinges, row connectors and cloth attachment anchors. Contacts wholly covered by a larger contact in the same part are removed. Separate trough feet remain separate. This geometry data does not install collision or fire rules.

Host Three, supplied materials and textures are borrowed. Generated geometry and default or cloned materials are owned. Skin and gate-angle changes reuse allocations. Disposal is idempotent, removes the root and leaves borrowed resources intact.

SWINE and WELCOME lettering derives from the already pinned Besley font. The outline subset retains an [OFL copy](../../../assets/art/stockyards/LETTERING-OFL.txt) and points to the [original typeface manifest](../../../assets/art/ui/typography/manifest.json).

## Verification and reproduction

Run from the art checkout.

    node art/source/stockyards/export.mjs
    node art/source/stockyards/check.mjs
    & art/source/stockyards/run-review.ps1
    node tools/check.mjs
    node tools/build.mjs
    node tools/check-release.mjs

Editable sources and the bounded render wrapper are in art/source/stockyards/. The lettering generator uses FontTools 4.61.1 from the ignored artifacts/stockyard-build-deps/ folder and the existing pinned TTF. Exported runtime modules are canonical copies of editable modules.

[Focused checks](checks.json) pass 62 groups covering every component, a single bay, the two-bay joint, both skins, all four rotations, passage rays through actual meshes, closed/open gate presentation, roof-seam coverage, native floor elevations and resource ownership. [WebGL evidence](webgl.json) records cameras, lights, exposure, source hashes, asset diagnostics, native character and JPG hashes. All 12 active programs and their shaders compiled and linked without logged errors on the host RTX 3080.

The full-sized JPGs were reviewed for the roof joint, repeated board scale, shared fence, readable sign and cloth, native character size and night treatment. Whole-map performance, production controls, navigation, livestock and fire behavior remain outside this art checkpoint.

Temporary server and isolated headless-browser lifetimes were retired after capture. Port 4551 was released and the disposable profile removed. Restart inputs and cleanup receipts remain under ignored artifacts/helpers/stockyard-review/. No preview is retained.

The [delivery validation receipt](validation.json) records 291 repository tests passing, zero failures, canonical exports and checked reference/hash links, plus the final 3522-file package and its build-manifest hash.
