# Painted native stockyard workwear

Owner-requested painterly revision, 12 November 2026. Artist candidate on
codex/modular-stockyard-art, revising c39b658452638439f48aecc9b95aefe1b44466a3.
The original e98e46f11f818857a2f08054e9d1071e023cc2d3 pen/gate delivery remains intact.
The independent fire, furnished-house and architect map work remain
on their existing branches.

## Delivered

Three interchangeable looks fit each original goat, horse and AFT bear:

| ID | Clothing |
| --- | --- |
| yard-hand | Cream work shirt, brown braces, olive trousers and soft work cap |
| packing-worker | Faded blue shirt, cloth apron with split walking skirts, trousers and cap |
| yard-foreman | Cream shirt, brown sleeveless waistcoat with pockets/buttons, dark trousers and cap |

The three new 1024 by 1536 PNG atlases follow the painted native AFT3D bear, goat and
horse references: broad brushwork, warm fold highlights, colored shadows, painted
stitching, fastenings and wear. Braces, waistcoat, collar, buttons and pockets are now
painted surface detail. Geometry supplies the native silhouettes, a simple cap and a
moving apron. The original flat-colored batch remains in Git history.

The module also accepts four modest cloth tone variants (variant 0 through 3). The
JPGs and fit report use variant 0. Colors, wear, cap proportions and the occupational
labels are artist choices. These are period interpretations rather than exact
reconstructions of a documented 1893 employer uniform.

The game renderer now dresses the selected player and existing non-police native
civilian actors when stockyardWorkers is enabled. In Catalogue Street, the goat is a
yard hand, the horse a packing worker, and the selected player a foreman. This is
actual game art wiring, with normal simulation, native locomotion and existing
collisions; no new population rules or actor species are introduced.

Enable the candidate with ?stockyardWorkers=1 on the game URL, or pass
stockyardWorkers: true to createArtScene. The option defaults off while the architect
integrates the separate stockyard map. This commit does not deploy a populated
stockyard or promote the candidate to master.

## Native fit and ownership

[src/art/stockyard-worker-skins.js](../../../src/art/stockyard-worker-skins.js) exports
createStockyardWorkerSkin(THREE, character, {skin, variant, texture}) and the game-facing
dressStockyardWorker wrapper. The texture is required: missing paintings fail explicitly.
The former returns root, pieces, diagnostics and an idempotent dispose. Dispose the
previous garment before changing looks. The wrapper chains the character owner's
diagnostics and disposal.

[stockyard-worker-paint.js](../../../src/art/stockyard-worker-paint.js) loads the three
shared atlases once per enabled game art scene:

    const paint = await loadStockyardWorkerPaint(THREE, {signal});
    const clothing = createStockyardWorkerSkin(THREE, character, {
      skin: 'yard-hand', texture: paint.get('yard-hand')
    });
    // Retire clothing/characters first, then paint.dispose().

Shirts and trousers copy the original connected garment surfaces and weights.
The trouser waist clips the copied surface, interpolating the native bone influences.
Cloth sampling uses bind-space positions/normals, so the painting follows the existing
skin animation. Original mesh UVs and all source bytes remain untouched.

The caps use 96 triangles, and the optional split apron uses 48. There are no separate
braces, collar, button, pocket or waistcoat meshes. Each look uses 3 garment meshes,
or 4 with the apron, compared with 13–16 previously. Garment triangles fall from
4,039–5,333 to 3,701–3,884 across the nine pairs (7–30% fewer). This is geometry
inventory, not a measured GPU speed claim.

No character root is resized. Original heads, horns, ears, fur/paint, hands, hooves/paws,
body vertices, gait, bones, bind matrices and attachments are preserved. The protected
Chicago beat uniform is rejected by the worker factory. Original clothing visibility
is restored on disposal.

Each outfit owns its copied/new geometry and 3 or 4 materials. It borrows its atlas,
the source meshes/materials, skeleton and renderer. The paint kit owns the three
shared atlas textures and releases successful loads if any intake fails or is
cancelled. Four tone variants share those same images.

| Native species | Existing player height/radius envelope | Maximum sampled visible height/radius |
| --- | --- | --- |
| Goat | 1.66 m / 0.50 m | 1.64952 m / 0.44088 m |
| Horse | 1.66 m / 0.50 m | 1.65000 m / 0.45243 m |
| Bear | 1.68 m / 0.56 m | 1.67085 m / 0.50649 m |

All three looks preserve those measured limits. Thirty-two poses/headings per pair
cover 288 native idle/walking samples. The game snapshots are unchanged by the art
update. This is finite animation coverage, not cloth physics.

## Sources and period decisions

Native source pins stay Farmyard 30a3b8cae5f36bb0c1df3685b7fba16f701c2083 for goat/horse
and AFT 4f5f53917990ec03b2f14c65f067e4b99ec8fcaa for bear. Exact installed/original paths,
SHA-256 values, inherited rights and dependencies are in
[manifest.json](../../../art/source/stockyard-workers/manifest.json). Existing source
provenance and licenses remain authoritative; unresolved donor rights are not changed
by this delivery.

New garment maps were generated with the built-in image_gen tool, using the existing
AFT3D bear painting as the style reference; the yard-hand atlas also supplied the layout
reference for the other two. [Exact prompts and generated-file provenance](../../../art/source/stockyard-workers/paint-prompts-v2.json)
are saved alongside [the runtime PNGs](../../../assets/art/stockyard-workers/manifest.json).
These are new garment paintings; the original species paint maps and rigs are unchanged.

The dated photographs below were visually inspected at their institutional image
URLs. They are research references only; their scan pixels are absent from shipped
assets, JPG previews and the Git commit.

- Chicago History Museum ICHi-32961, **Exchange Street, 200 feet west of the main entrance
  to the Union Stockyards**, 1893. The central shirt-and-waistcoat figure supports that
  silhouette alongside coats and varied hats. It does not establish a foreman uniform.
  [Northwestern caption and source links](https://florencekelley.northwestern.edu/historical/stockyards/).
- Chicago History Museum ICHi-20069, **Workers at Horn Brothers Furniture Company,
  before the strike**, 30 April 1886. A useful Chicago workwear comparison: mixed
  shirts, braces, waistcoats, aprons and hats. This is a different trade and date.
  [Northwestern caption and source links](https://florencekelley.northwestern.edu/historical/stockyards/).
- Chicago History Museum ICHi-21839, J. W. Taylor, **Canning room, stockyards**, catalogued
  1890s. The mixed work clothing and light aprons support occupational variety. This
  is neither an exact 1893 date nor a pattern for every yard employee.
  [Northwestern caption and source links](https://florencekelley.northwestern.edu/historical/stockyards/).

Northwestern reproduces Chicago History Museum material; no item-level redistribution
grant was established for these scans. Local research-only downloads and their hashes
are recorded separately from the runtime dependency closure. Monochrome photographs
do not establish the chosen brown, blue and cream palette. Apron splitting, cap
clearance around animal ears/horns and the simplified cuts are game adaptations.

The two owner-linked stockyard/neighborhood writeups were read together. Their later
1904–1915 images and twentieth-century infrastructure remain dated context, not 1893
costume templates. See the shared [wardrobe catalogue](../period-crowds/catalogue.json).

## JPGs and browser evidence

- [game-normal.jpg](previews/game-normal.jpg): actual Catalogue Street runtime at its
  native game zoom.
- [game-close-walking.jpg](previews/game-close-walking.jpg): actual game after advancing
  the existing actors, with the normal camera zoom control at 2.15 times.
- [stockyard-crew.jpg](previews/stockyard-crew.jpg): separate fitted asset study against
  the existing two-bay jubilee pen, with the native ground alignment.
- [nine-native-fits.jpg](previews/nine-native-fits.jpg): all nine painted species/look pairs.
- [rear-native-fits.jpg](previews/rear-native-fits.jpg): the same nine pairs from behind,
  checking back painting, side transitions and moving native limbs.
- [reference-and-workers.jpg](previews/reference-and-workers.jpg): original native AFT
  paint above and revised worker paint below, with identical rigs, pose, camera and lighting.

For visibility, only the existing player/civilian starting positions and two short
routes were staged in the capture fixture. Houses, police, terrain, simulation,
paint, rig, collisions and gameplay lighting use the actual game modules. The first
two pictures are game canvas captures; HUD is outside those pictures. The other four
are explicitly labelled asset studies. There is no livestock or stockyard crowd AI
in this batch.

[webgl.json](webgl.json) records the exact source/image hashes, GPU, camera and actor
diagnostics, compiled shaders, linked programs and isolation assertion. Final capture:
27 active programs linked, 54 shaders compiled, zero recorded errors, unchanged game
snapshots. Text evidence includes raw-checkout and LF-canonical hashes for Windows/Git
line-ending comparisons. JPGs were visually reviewed after refining the apron waist join. The JPEGs are actual
WebGL captures; image generation supplied only the three garment texture PNGs.

The finite capture runner starts one hidden isolated Chrome profile and a localhost
server on 4551 with a 300-second server expiry and 60-second browser deadline. It
preserves per-run sources, launch/restart records, output and retirement receipts
under ignored artifacts/helpers/stockyard-workers-review/runs. The successful run's
browser/server exited, its port was released and its profile was removed. No task
preview remains running.

## Reproduce and validate

From this artist checkout with Node >=22 and installed Chrome:

    node --test tests/integration/stockyard-worker-skins.test.mjs
    node art/source/stockyard-workers/check.mjs
    powershell -File art/source/stockyard-workers/run-review.ps1
    npm.cmd run check
    npm.cmd run build
    node tools/check-release.mjs

The focused suite passes eight tests, including the actual civilian kit's public
wrapper shape, borrowed resource safety, native police protection, query selection
disposal chaining, shared atlas ownership, failed/cancelled intake cleanup and the
removal of trim meshes. [fit-checks.json](fit-checks.json) records four passing groups,
nine pairs and 288 poses. Repository/package results are recorded in checks.json.

The architect can intake the wardrobe/paint modules, three atlases and the small
src/art/index.js hook into its current game renderer, then select its district activation. This older
stockyard branch is not a replacement for newer renderer/fire or editor map work.
Livestock, more wardrobe families, district frequency, NPC behavior and production
map placement remain separate work.
