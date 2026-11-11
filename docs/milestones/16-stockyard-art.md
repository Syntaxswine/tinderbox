# Covered swine pen and stockyard entrance art proposal

The owner requests a modular covered swine pen based on period Chicago references, a custom entrance gate matching the supplied postcard, and JPG previews before game wiring. The first delivery is one repeatable pen bay and one entrance landmark. Their components can later form a stockyard district. The architect assigns this asset work to **Artist, Tinderbox** in its existing art checkout.

Start from published `c855e627bdee963e930644839a60c027a03935de` on `codex/modular-stockyard-art`. Check the actual worktree registry and preserve the existing `codex/ash-grey-grass-art` checkpoint before changing branches. The primary checkout owns this proposal on `codex/stockyard-art-proposal`.

## Covered pen bay

Build a compact timber holding pen with a low shed roof, closely spaced rails or boards, posts, an operable gate leaf, trough and worn service approach. Use the covered hog and sheep pens identified in the 1878 view and the roof patterns in the 1890 panorama for the main masses. Inspect the images before choosing the roof form and partition pattern. Record any material or detail inferred from a monochrome or distant view.

Use a 4 by 4 m initial bay with a 2 m clear service gate as architect-selected game dimensions, subject to a useful readable measurement from the period atlas. Compose repeatable 1 m fence runs and compatible roof spans. Provide a straight run, a corner or end closure, a gate opening and the roof pieces needed for a two-bay row. Shared boundaries should contain one partition and one set of posts. Keep the end treatment distinct from an internal joint so extending a row preserves the intended openings and roof silhouette.

Use warm weathered wood, dull ironwork and restrained earth tones that read in Tinderbox's night lighting. Show the bare ground or paving as its own surface. A reused lantern can establish atmosphere in the preview. The first assembly needs only the pen structure and its fittings.

The owner approved banners, ribbons and bunting as skins on November 10. Their direction carries the fair's jubilation into the city, including the stockyards, with an intentionally strange contrast around food production. Include a festive skin on both the pen and entrance gate and show it prominently in the JPG previews. Give the cloth pieces stable attachment points and replaceable material slots so the same treatment can extend to later city assets.

## Custom stockyard entrance

Build the Union Stock Yard Gate's principal stone masses, central arch, flanking pedestrian arches, piers and characteristic ornament from the available period views. Preserve the real architectural proportions. The overall landmark can have its own dimensions while its attachment points follow the game's metre convention. Check clear passage against the current native characters and show the scale reference in the preview.

The owner's image matches the University of Maryland-credited postcard catalogued around 1901–07. Chicago's landmark record dates the limestone gate to about 1875. Use the stone gate for the 1893 setting and provide the welcome sign, decorative framework, flags and bunting as removable dressing inspired by the later postcard. Record a decoration's construction material only where the source supports it. A plain gate view and a dressed view will let the owner judge that choice.

Take dimensions from legible scaled plans when available. Otherwise record source ratios and the chosen game dimensions as adaptations. Perspective views establish silhouette and ornament, with no implied survey accuracy. Keep later dates attached to their references.

## Native asset contract

Follow the existing native scale, UV density, shared Three.js instance and material/resource ownership conventions. Reuse appropriate Tinderbox and pinned Farmyard or Nautilus components. Custom pen and gate forms can add geometry needed for these two assets. Record any new immutable donor revision and its minimal dependency closure before importing it.

Export stable IDs for timber runs, roof pieces, posts, gate leaves, masonry, fittings and optional decorations. Supply metre bounds, ground footprints, roof overhangs, passage clearances, gate pivots and assembly connectors at all four quarter turns. Floor and roof surfaces need their actual supported polygons and elevations, including openings. Describe physical materials separately from paint or texture slots so later fire, collision and collapse can consume the same geometry.

Use a factory compatible with the existing art modules, with a root, measured bounds and disposal. Record which resources it creates and which it borrows. Publish renderable art and metadata as the candidate delivery. Gameplay integration follows the owner's JPG review and the architect's later coder contract.

## First JPG delivery

Render the actual exported geometry at least 1280 by 800 pixels using the existing art render tools. Include these views in the first handoff.

- One pen bay at a readable isometric angle with a native character for scale.
- Two joined bays showing the shared partition, roof joint and open service gate.
- The custom entrance gate with the postcard-inspired decoration and a scale reference.
- The same gate without the decoration, showing the stone architecture clearly.

Give the pen and gate one night treatment with a reused lantern or the existing game lighting among those views. Record camera, light and exposure settings. Brief captions should identify game dimensions and inferred details. The architect sends the JPGs to the owner before assigning production wiring.

## Period references and city maps

| Source | Established use | Reference |
| --- | --- | --- |
| Charles Rascher, The Great Union Stock Yards of Chicago, 1878 | The original caption identifies covered hog and sheep pens. The Library of Congress lists no known publication restrictions. | [Original print record](https://www.loc.gov/pictures/item/90712275/) |
| Charles Rascher, stockyard panorama, 1890 | Period roof masses, pen groupings, rail approaches and industrial surroundings. Inspect its perspective image for appearance. The Library of Congress map collection supplies its reuse statement. | [Original map record](https://www.loc.gov/item/98687207/) |
| Central Map, Survey and Publishing Company, Union Stock Yards and packing houses, 1891–92 | A fire insurance atlas containing 41 maps. Use accessible sheets and their printed legends and scales for detailed placement or dimensions. This pass verified its catalogue metadata. The Newberry lists No Copyright in the United States. | [Atlas record and viewer](https://collections.newberry.org/archive/-2KXJ8Z814UYL2.html) |
| Rand McNally, standard map of Chicago, 1892 | City streets and the stockyards' relationship to the rest of Chicago. The university catalogue lists four sheets at approximately 1 to 20,000. Its research/download conditions apply to copies of its scans. | [University of Chicago period map collection](https://www.lib.uchicago.edu/e/collections/maps/chi1890/) |
| Treutlein, 1893 grand view of Chicago | Overall urban massing, waterfront and district context. The Library of Congress identifies it as a perspective view without a measured scale. | [City overview](https://www.loc.gov/item/75693211/) |
| Union Stock Yard Gate, Chicago landmark record | Limestone structure, approximate 1875 date and gate identity. The site also provides a view dated around 1905. | [City landmark record](https://webapps1.chicago.gov/landmarksweb/web/landmarkdetails.htm?lanId=1441) |
| Alfred Holzman Company postcard, around 1901–07 | The owner's decorated entrance reference. The Commons record identifies its University of Maryland source and United States public-domain status. Verify the source record before importing a scan. | [Postcard and original-source link](https://commons.wikimedia.org/wiki/File:Union_Stock_Yards,_Chicago,_Illinois,_circa_1901-1907.jpg) |

For future district planning, use the street map to select the location, the insurance atlas for individual blocks and structures, and the period views for appearance. The stockyard district layout is a later architect task. Each measurement should retain its sheet and date, source scale or calibration, uncertainty and game adaptation under the existing [research method](../research/1893-exposition/README.md).

## Owned files and handoff

Keep editable sources and rights records in `art/source/stockyards/`, exported art and its manifest in `assets/art/stockyards/`, and visual evidence and handoff notes in `docs/art/stockyards/`. Reuse an existing render/check tool or add a small task-local wrapper if needed. Keep image evidence outside the public runtime distribution.

Verify a single bay, a two-bay joint and the gate's clearances at four rotations. Check resource disposal and actual geometry against bounds and footprint metadata. Review the JPGs at game-like zoom for repetition, roof seams, scale and night readability. Record the exact candidate SHA, changed paths, provenance and adaptations, checks and results, JPG paths and uncertainties. Push only the task's candidate branch to the configured Tinderbox remote. Retire temporary helpers under the existing lifecycle policy.
