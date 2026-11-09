# Catalogue Street structural fire correction

The coder branch starts from the published `8f7a6b048f60f761a5fd169f479fc8ee1c0eca57` release. On that release, both Ashland cottages could have burning lower fuel behind their closed shell. Hopkins and Monroe retained the whole visible house and all three ground colliders until the last ground fuel was exhausted. The three focused regression cases reproduced the missing visible floor or façade fire before the correction.

## What the runtime does

- Ashland reuses the existing Level -1 wall groups and native sash geometry. A sash loses its glazing only after the adjacent lower tile has genuinely caught. A live lower tile can also vent through a side opened by a lost neighbor tile. Both effects use the existing lower flame batch. The camera favors a facing opening when one burning tile has several. Brick and masonry remain collision surfaces.
- A single heavier lower member per cottage receives its heat from falling debris and carries finite fuel to the end of that cottage's independent 30-second window. The other supports continue to burn out individually. The last two seconds cap any still-standing loose supports gradually, leaving at most four for the terminal clearance. The wind bake, roof contact, falling-fuel transfer and outdoor firelight use the accepted route.
- The rest of Catalogue Street retains the existing ground heat field. Each house assigns its fuel to native plan columns on a two-metre grid. Exhausting one column clears the same local footprint from collision, color and night shadows. Cold houses keep their original compact collision boxes. A live party wall remains a heat barrier, including across the rasterized slab rim. The surviving blank join is exposed as the neighboring column clears.
- In both Catalogue Street modes, a match that reaches a wooden face uses the actual swept contact and a cell in that strike tile. The 0.85 m reach and one-match action are preserved. Landmark movement, the private workbench and vendor geometry stay outside this correction.

## Reproduce

Run `node tools/build.mjs` and `node tools/serve.mjs --root dist --base /tinderbox/`. In the packaged page choose **Play → Catalogue Street**.

- Add `?cottages=1` and strike the near siding immediately next to the starting player. Watch the lower windows, then the interior as the roof and sides give way. Use the same strike with `?cottages=calm` for the control.
- For the daytime Hopkins example, use the plain URL. Approach the east side of Hopkins 9 from the gap beside Hopkins 13, around world X 10.82, Z 34.63. Aim at the base of the siding toward X 9.90 and strike. Step back slightly and leave the normal zoom in place.
- For the night Monroe example, use `?cottages=calm`. Walk to the middle Monroe front, around X 36.51, Z 30.40. Aim into the frontage toward Z 31.15, strike once and step back toward the street.

## Review evidence

The normal-menu browser runs used WebGL 2 on ANGLE D3D11 with an RTX 3080. The desktop gameplay canvas was 1280 × 414 and the calm phone canvas was 390 × 420. The local JPGs capture the gameplay canvas with the HUD outside the image. The loopback observer saved frames and state receipts while normal controls drove each visit.

In the wind run, the source at +20.43 s had 40 burning lower tiles and eight camera-facing vents. The downwind roof caught at +11.95 s. At +36.18 s, after the source had cleared, the second cottage still showed lower-floor flames through nine camera-facing openings with 15 supports left. At +41.70 s only one burning lower support remained. Clearances occurred at +30.00 and +41.95 s. The calm control kept all 126 second-cottage supports and no second-cottage fire through the first clearance.

The daytime Hopkins 9 strike heated one tile and produced three visible façade flame sites at +1.17 s. At +16.10 s, 17 of 20 sections and their clipped collision remained. The struck house cleared at +22.57 s. The connected lawn reached Hopkins 13 at +3.07 s and later reached the Monroe row, where each unit began burning at its own time.

The directly struck night Monroe unit retained 25 of its 28 sections at +17.07 s. The three empty sections were already missing from the rendered shell and collision. Both adjacent units still had all 28 sections at that point. The open lawn reached the adjacent units at +3.32 and +4.88 s. When the struck unit cleared at +31.20 s, those units still had six and eight sections respectively. The paved, quarter-turned regression kept a third unheated unit standing and checked that two direct starts cleared independently.

The images and JSON receipts are under `artifacts/qa/catalogue-floor-fire/recordings/`. Key views are `wind-floor.jpg`, `wind-exposed.jpg`, `wind-partial.jpg`, `wind-receiver-late.jpg`, `calm-cleared.jpg`, `hopkins-floor.jpg`, `hopkins-partial.jpg`, `monroe-ignition.jpg` and `monroe-partial.jpg`.

## Code and checks

`src/simulation/cottage-fire.js` owns the late lower fuel and Ashland staging. `src/simulation/housing-fire.js`, `field.js`, `geometry.js`, `index.js` and `tools.js` own ground fuel ownership, contact and collision. `src/content/housing-sections.js` shares the native plan grid with presentation. `src/art/cottage-lower-openings.js`, `cottage-pair.js`, `housing-flame-sites.js`, `housing-section-mask.js`, `neighborhood.js`, `row-house.js` and `index.js` handle the existing geometry, shader mask and fire presentation. The pinned housing catalogues, Ashland tile art, fire shroud and wind assets are reused at their published revisions.

`tests/integration/catalogue-floor-fire.test.mjs` covers both lower storeys, the real lower remnant and deadlines, a directly struck Hopkins and Monroe unit, opened collision and independent rotated row units. `node tools/check.mjs` passed 196 tests and the art checks. `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,474 resources and nested project URLs.

Section clearance uses the existing conservative exterior footprint. The renderer still submits the native meshes during partial collapse and masks color and depth at the shared column boundaries. Real heat can reach a neighboring house through connected lawn fuel. The architect owns integration and Pages publication.
