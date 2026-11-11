# Hull-House block: first art candidate

One block east of Hull House, bounded by S. Halsted, S. Desplaines, W. Polk and Ewing Streets, represented around 1893. This is the source-traced massing and material checkpoint authorized by proposal 955728b9ed9d196ca523864700a9c74d641dd11d. It contains 56 stable building assemblies, street ground, individual courts, property fences, a rear porch and stair, generic trade lettering and removable festival cloth.

Branch: codex/hull-house-block-art. Base: c855e627bdee963e930644839a 60c027a03935de. Only art/source/hull-house-block/, assets/art/hull-house-block/ and docs/art/hull-house-block/ belong to this candidate. Stockyard candidate e98e46f11f818857a2f08054e9d1071e023cc2d3 remains separate. [Selected helper intake](../../../art/source/hull-house-block/intake.json) records the reused sculpt, cloth and lettering source hashes.

## JPG review

- [Entire block at night](previews/block-isometric.jpg): the 258 by 74 m study, streets, rear buildings and plot divisions.
- [Ewing street and yard](previews/street-and-yard.jpg): the native goat, individual court and inferred upper rear porch.
- [Halsted shops at night](previews/halsted-street.jpg): lantern brackets, generic trade boards and restrained festival dressing.
- [Ewing155 roof corner](previews/roof-corner-review.jpg): daylight inspection of the separated eaves at the native wall junction.
- [Same yard in daylight](previews/street-and-yard-day.jpg): wall siding, roof ends, native windows and stair construction.
- [Original plan against exported footprints](previews/plan-comparison.jpg): 1895 original crop above the actual metre-grid footprints and source outline trace.

The five 3D JPGs are 1600 by 1070 pixels, including a 1600 by 950 native WebGL view and caption. The plan proof is 1920 by 1750. Camera, exposure, lights, host GPU, shader results, source manifest and JPG hashes are in [webgl.json](webgl.json). The native goat uses its original [1,1,1] scale and existing paint. The lanterns are existing Nautilus entry/hand lanterns. No scene parts are hidden in these renders.

Interiors, occupants, smoke, production controls, working doors, navigation and fire are omitted. House openings, roof choices, level counts, exact repairs and trades remain interpreted; these are repeatable first-pass facades. This preview is ready for owner and architect review before production wiring.

## What the sources establish

[Hull-House Maps and Papers](https://homicide.northwestern.edu/docs_hc/pdf/Hull-House-Maps-and-Papers-1895.pdf), published in 1895, supplies the outline base: Nationalities Map No. 1 at PDF page 257 and Wage Map No. 1 at page 261. [Northwestern's account](https://florencekelley.northwestern.edu/historical/hullhouse) dates the underlying survey to April 6–July 15, 1893. Household colors and large lot numerals never determine materials, buildings or storeys.

Printed pages 4 and 6 (PDF 14 and 16, visually inspected) support predominantly timber cross-street dwellings, some brick shops, rear houses, outside passages and wooden street bins. They explicitly describe no public alley between Polk and Ewing. This asset therefore preserves an individual court, terminating at rear-property bounds. Its fences follow interpreted property divisions; their construction is inferred.

The [1891 Hull-House photograph](https://collections.carli.illinois.edu/digital/collection/uic_7sh/id/3488) is a nearby comparison across Halsted. It supports brick, sash and cornice vocabulary. It does not picture a modeled property. The [c.1900 neighborhood yard](https://collections.carli.illinois.edu/digital/collection/uic_7sh/id/3446) supports timber siding, repairs, rear porches and outside wooden steps. Its exact location is unresolved. UIC labels it c.1900 while crediting Lewis Hine; this catalogue combination needs curator confirmation before claiming a precise exposure date or author. A [c.1900 settlement exterior](https://collections.carli.illinois.edu/digital/collection/uic_7sh/id/3491) is also a later comparison; later settlement additions are excluded.

These UIC scan files remain research cache only. Their item rights allow attributed research/study/educational use and direct other uses to UIC for permission. No photograph pixels are redistributed or used as textures, and no permission request was sent. The original 1895 map crops are retained as public-domain source plates. The LOC Sanborn record identifies its online collection as public domain. The full [source and rights register](../../../art/source/hull-house-block/sources.json) and [cached evidence hashes](../../../art/source/hull-house-block/preserved.json) preserve item dates, distinctions and limitations.

## Measurement and uncertainty

The [1906 Sanborn Vol. 1 North and West Division](https://www.loc.gov/item/sanborn01790_018/), sheet 100W, covers the exact block. Its 0–150 feet ruler spans 221 pixels in the complete 1458 by 1802 quarter-size scan, from [1153,1752] to [1374,1752]. That gives 45.72/221 = 0.206878 m/pixel. Stable block bounds are approximately 257 by 73.3 m, adapted to 258 by 74 whole metres.

This later sheet is a block-scale check. Its building revisions, colored construction and industrial premises are not silently backdated. In particular, uncolored 1895 plots are not assumed vacant; the orange masses in the plan proof preserve uncertain commercial footprints/use. No readable original 1894 core-city insurance volume was located in the LOC Chicago index consulted.

The [editable trace](../../../art/source/hull-house-block/trace.json) preserves source coordinates, printed number groups, confidence and all adaptations. Paper skew is straightened to a rectangle. The largest vertex shift from the common projection to the game grid is 0.695 m. Overall scale uncertainty is about +/-2 m length and +/-1 m depth; individual plot dimensions can differ locally by about 15%.

The narrow court is an explicit larger exception: its printed 8 ft is about 2.44 m, while the common image projection snaps to 3 m nominal, or 2.84 m conservative clear. The game opening is about 23% wider than the printed dimension. This is an adaptation, not survey accuracy. Printed address groups are recorded independently from stable art IDs; IDs such as halsted-348 are working identifiers, not a verified door-number attribution.

Snapping closes a small source gap at the Ewing155 front/rear corner. The native wall corners meet. The inferred rear house uses one native level so its eaves stay below the front roof; its original height is unknown.

The trace has 4,684 square metres of building ground and 14,408 square metres of open block ground, with no overlapping building cells. Ground slabs exclude building polygons. The building ground floors fill those holes. Unsupported gaps are not filled with a house fuel plane.

## Native construction and export

Use [index.js](../../../assets/art/hull-house-block/index.js), [block.json](../../../assets/art/hull-house-block/block.json) and [manifest.json](../../../assets/art/hull-house-block/manifest.json).

    const block = createHullHouseBlock(THREE, {
      quarterTurns: 0,
      position: [0, 0, 0],
      skin: 'jubilee'
    });
    scene.add(block.root);
    block.setSkin('working');
    const placement = block.metadata;
    block.dispose();

createHullHouseBuilding selects any stable ID in BLOCK_PLAN.buildings and anchors its first footprint vertex at the requested native placement, including all four quarter turns. It omits block ground and shared fences. The full factory can select buildingIds and choose ground:false for an art composition.

Walls remain 1 by 2 by .16 m. Doors remain 1 by 1.65 by .12 m. Slabs remain 1 by .12 by 1 m, placed through translation-only instances. Storeys use 2.12 m pitch. Roofs use the existing 1:1 slope or a flat deck, selected per mass. Their geometry is composed at metre spacing. Gable end faces use siding or brick rather than roof covering. Procedural roof UVs preserve physical density along the slope.

The actual pinned Nautilus window-bay-period model is used:2 m total, .5 m pier +1 m opening +.5 m pier. Its bevelled frames, sashes, glass and source UVs are preserved. Nautilus pin 90054d07134116a5d9661f8318a76fe68f922aad and Farmyard pin 30a3b8cae5f36bb0c1df3685b7fba16f701c2083 remain unchanged. Existing upstream notices and unresolved per-file rights remain inherited; provenance does not grant a new license. No donor worktree was written and no new donor revision was imported.

Metadata includes world placement and measured vertex bounds, physical wall versus appearance slots, floor/attic/porch and roof support polygons/elevations, ground holes, wall runs, native door pivots and closed orientation, window openings, roof overhangs, court clearances, separate inferred fitting footprints, lantern attachment transforms, cloth anchors and block connectors. These records support a later integration contract; the asset installs no collision or fire behavior.

Native doors are closed. Their 1.65 m height is below the native goat's traversal envelope, so they are explicitly marked nonpassable for native actors. The court clears a tested 1.44 m wide by 1.72 m high envelope. This is a mesh clearance check, not a production navigation or gameplay visit.

The Besley glyph subset derives from the already pinned font; its [raw OFL license](../../../assets/art/hull-house-block/LETTERING-OFL.txt) is preserved. Generic GROCER, ROOMS, SHOE REPAIR and workroom lettering does not assert historical proprietors. Festival placement and cloth are game art direction. Physical materials and appearance colors remain distinct.

The host Three namespace and supplied materials/textures are borrowed. Generated geometry, instance buffers and default/cloned materials are owned. Skin changes allocate nothing. Disposal detaches the root, frees owned resources once and preserves borrowed resources and their shader hook.

## Checks and reproduction

Run from the artist checkout:

    python art/source/hull-house-block/trace-plan.py
    node art/source/hull-house-block/build-plan.mjs
    node art/source/hull-house-block/export.mjs
    node art/source/hull-house-block/check.mjs
    python art/source/hull-house-block/make-plan-proof.py
    & art/source/hull-house-block/run-review.ps1
    node tools/check.mjs
    node tools/build.mjs
    node tools/check-release.mjs

The optional lettering generator uses FontTools 4.61.1 and the plan-proof generator uses Pillow 11.3.0, currently in ignored artifacts/stockyard-build-deps/. The original reference crops are committed; full scans and UIC comparisons stay in the ignored research cache.

[Focused checks](checks.json) cover source footprint areas, exact native walls/doors/windows/slabs, slab vertex colors, floor support, gable skins, metric slope UVs, court clearance, porch landing, four turns, standalone anchors, adjacent complete assemblies, input rejection, resource ownership, borrowed shader hooks, canonical source/export bytes and font/dependency hashes. [Validation](validation.json) records the repository/package result and checked evidence links.

All 21 active WebGL programs and their shaders compiled and linked without logged errors on the host RTX 3080. This full-block art study is about 2.6 million submitted triangles and 670 visible asset meshes before fixture lights/actor. Streaming, culling strategy and whole-map production performance need the later coder contract.

The hidden capture helper has a 300-second server expiry and a 60-second browser deadline. It stops immediately after capture, releases port 4552 and removes its isolated browser profile. The [cleanup receipt](helper-retirement.json) records retirement; deliberate restart inputs remain under ignored artifacts/helpers/hull-house-review/. No preview is retained.
