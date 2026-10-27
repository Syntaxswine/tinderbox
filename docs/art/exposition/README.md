# TB-009 exposition art research and kit brief

This is a research/design checkpoint for the accepted 1893 World's Columbian Exposition direction, based on master `420266af6b92a4925164cdceda4ef43beb2d6a40`. The architect approved a small three-bay frontage fragment, real Farmyard surfaces and normal horse/goat civilians. It is a research-based construction kit, not a miniature of a named palace, a complete fair, or a finished historical skin.

The [source register](sources.json) records original items, stable URLs, exact plates/scans, rights evidence and limitations. The [kit brief](kit-design.md) separates source facts, derived values and game adaptations. [Donor requests](donor-requests.json) identify the exact three approved surfaces and reference recipes for the coder-owned city import manifest. No scans or photographs are runtime textures.

## Strongest original evidence

**Scaled architectural exemplar for later detailed work:** McKim, Mead & White, *A monograph of the work of McKim, Mead & White, 1879-1915*, volume I, **plate 44**, New York State Building, caption dated 1893. Getty Research Institute / Internet Archive item [gri_33125006526145, scan 99](https://archive.org/details/gri_33125006526145/page/n98/mode/1up). The plate contains an elevation and first-floor plan, dimension chains and separately graduated foot scales. Plate 43, scan 97, supplies a photograph; Arnold's original 1893 *Official views*, plate 64, supplies a clearer matching façade photograph. This is an architect-published record catalogued 1914, reproducing the 1893 work; it is not an 1893 printing or a full construction set. Fine dimension numerals are not all legible in this PDF. Do not silently transcribe uncertain numerals.

**Approved first kit reference:** the 1893 Conkey *Plans and diagrams*, Horticulture description at one-based PDF scan 29 (printed p. 9) and complete floor diagram at scan 31, together with Arnold plate 43. The description states 1,000 ft overall length, 250 ft extreme width and two 88 × 270 ft courts. The diagram shows the central pavilion, connecting curtains, courts and end pavilions. It is an exhibit-installation diagram, not an as-built construction drawing. Its numbered/lettered installation grid must not be mistaken for a structural bay schedule. Source ID: `EXPO-P01` in the architect's ledger.

Arnold plate 43 visibly distinguishes glazed pitched galleries and the large glazed dome from the repeated arched façade. Plate 53 (Fisheries) corroborates a different pitched/hipped roof family and a low gabled entrance with repeated round arches. These are useful form evidence; roof pitches and bay widths have not been measured from photographs. The bounded kit's gable/hip samples are separate generic adaptations, not replacements for Horticulture's dome.

## What changes between the reference and the game

The first frontage is three 4 m bays, with a genuine central 1.4 × 2.3 m opening. These dimensions are game adaptations. They are not measured Horticulture bays, and the 88 × 270 ft original court is not reduced to the game courtyard.

The New York plate and matching photograph support an entrance hierarchy, symmetrically arranged windows/niches, repeated trim, parapets, and paired roof towers with small hipped caps. Window/niche openings are not automatically walk-through doors. Its semicircular end porches, ornamental program and exact interior are deferred. The reference does not justify giving every fair building the same roof.

The Massachusetts Board's 1894 report is an additional primary account and photographic reference. It records Peabody & Stearns' explanation that their building enlarged and adapted the Hancock-house precedent, and distinguishes apparent granite from staff. No scaled floor plan was identified in the inspected report plates; it is not the dimensional basis for this kit.

## Direct Farmyard foundation

Only the approved donor pin is used: `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`, with AFT ancestry `a20b343a0234b5d8b365a4e1668961ca1bf37653`. The donor remains read-only. The wall/door study starts from actual `hybrid-room-art.js`, `hybrid-materials.js`, `hybrid-world.js` and the solo `original-art.js` surface/face recipes. It does not substitute a new painted look and call that reuse.

Three new raw surfaces are approved for the **coder-owned** `provenance/city.json`: brick-factory-v1, wood-factory-v2 and ground-concrete. Existing imported cargo finishes may serve as explicitly temporary cream/roof slots. No extra roof image is requested. The artist must not create a competing raw city inventory.

The coder owns the raw normal horse/goat closure and `loadCivilianKit({THREE,renderer,assetBaseUrl})`. Species-tagged civilian actors use this factory, its original paint and measured 0.62 m envelope. Headgear, Red Hat identity attachments, weapons and service caps are excluded; a recoloured uniform is not a normal civilian. Untagged old diagnostic fixtures may retain their explicitly provisional neighbor only.

## Shared interface and approval boundary

Use the coder's `world.modules[]` / `compileModules` contract; do not invent another descriptor. The current forms are `wall`, `doorway`, `pilaster`, `corner`, `roof-gable` and `roof-hip`. Positions/dimensions are metres and headings are quarter turns. `physicalMaterial` is independent of the four skin slots. Render the supplied compiled parts; the model owns collision, heat blocking, opening state and clearance.

A closed building door stays visibly closed and solid. An open gateway is a real hole through the frame. Overhead roof silhouettes introduce no walkable interior, climbing or volumetric roof fire. A borrowed renderer is used for donor paint projection and is never disposed by art.

The architect owns the arrangement's integration and publication. The research checkpoint contains no UI, simulation, root composition/build edits, finished custom skin or generated image. Runtime work follows the approved shared schema and the coder's final import checkpoint.

## Reproduction and source review

PDF inspection used bundled Poppler and Python pypdf. The architect's existing 98-page plan PDF was read in place, not copied into a second cache. Its SHA-256 is recorded in the source register. Additional PDFs, extracted OCR and plate renderings remain in ignored `artifacts/exposition-research/`; stable archive identifiers make the record usable without that local cache.

The digital Arnold photographs are Gutenberg reproductions of 1893 plates. Their transcriber documents gamma adjustment, speck/void repairs and resizing; they are not untouched negatives. Original monochrome photographs do not establish exact period paint colours.

No fire tuning follows from a skin name. Apparent plaster/stone, structural timber, glazing and observed fire behavior remain different evidence. No source here authorizes copying a modern reconstruction or claiming a complete as-built building.
