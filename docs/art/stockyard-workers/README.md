# Native stockyard workwear

Owner-authorized first stockyard crowd batch, 12 November 2026. Artist candidate on
codex/modular-stockyard-art, extending the existing e98e46f11f818857a2f08054e9d1071e023cc2d3
pen/gate delivery. The independent fire, furnished-house and architect map work remain
on their existing branches.

## Delivered

Three interchangeable looks fit each original goat, horse and AFT bear:

| ID | Clothing |
| --- | --- |
| yard-hand | Cream work shirt, brown braces, olive trousers and soft work cap |
| packing-worker | Faded blue shirt, cloth apron with split walking skirts, trousers and cap |
| yard-foreman | Cream shirt, brown sleeveless waistcoat with pockets/buttons, dark trousers and cap |

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
createStockyardWorkerSkin(THREE, character, {skin, variant}) and the game-facing
dressStockyardWorker wrapper. The former returns root, pieces, diagnostics and an
idempotent dispose. Dispose the previous garment before changing looks. The wrapper
chains the owning character's diagnostics and disposal.

Shirts and trousers are copies of the original connected garment surfaces. Trouser
waists and waistcoat seams clip those copies while interpolating their native bone
influences. New braces, collars, apron, cap and details borrow the same skeleton and
bind matrix. No character root is resized. Original head, horns, ears, fur/paint,
hands, hooves/paws, body vertices, gait, bones, bind matrices and attachments are
preserved. Source garment visibility is restored on disposal. The protected Chicago
beat uniform is rejected by the worker factory.

Each outfit owns its copied/new geometries and materials; it borrows the skeleton,
source geometry/materials and renderer. No clothing texture or new donor import is
required. The three looks use 4,039–5,333 garment triangles across species, including
replacement shirt/trousers. These counts are inventory, not performance measurements.

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
- [nine-native-fits.jpg](previews/nine-native-fits.jpg): all nine species/look pairs,
  using the same renderer and unchanged native body scale.

For visibility, only the existing player/civilian starting positions and two short
routes were staged in the capture fixture. Houses, police, terrain, simulation,
paint, rig, collisions and gameplay lighting use the actual game modules. The first
two pictures are game canvas captures; HUD is outside those pictures. The other two
are explicitly labelled asset studies. There is no livestock or stockyard crowd AI
in this batch.

[webgl.json](webgl.json) records the exact source/image hashes, GPU, camera and actor
diagnostics, compiled shaders, linked programs and isolation assertion. Final capture:
23 active programs linked, 46 shaders compiled, zero recorded errors, unchanged game
snapshots. Text evidence includes raw-checkout and LF-canonical hashes for Windows/Git
line-ending comparisons. JPGs were visually reviewed after refining the waistcoat seams.

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

The focused suite passes five tests, including the actual civilian kit's public
wrapper shape, borrowed resource safety, native police protection, query selection
and disposal chaining. [fit-checks.json](fit-checks.json) records four passing groups,
nine pairs and 288 poses. Repository/package results are recorded in checks.json.

The architect can intake just the new wardrobe module and the small src/art/index.js
hook into its current game renderer, then select its district activation. This older
stockyard branch is not a replacement for newer renderer/fire or editor map work.
Livestock, more wardrobe families, district frequency, NPC behavior and production
map placement remain separate work.
