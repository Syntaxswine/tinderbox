# 1893 exposition research

The user selected Chicago's World's Columbian Exposition as Tinderbox's setting reference and asked for substantial research, original plans where possible, reusable basic walls/doors, new appropriate wall/roof forms, future interchangeable skins, and existing non-Red-Hat animals as the initial population. This folder records the architect's research; related art and wayfinding studies are linked after review.

The first implementation is a small exterior construction-kit scene. Its arrangement is a game adaptation. It is not a claim to reproduce the entire fair, a surveyed historic location, or an architect's complete construction drawing set.

## Evidence rules

1. Begin with an identified original drawing, dated map, contemporary photograph or original publication. Record the repository, item ID, creator, date, page/plate, stable item URL, accessible scan and rights statement. A modern article is a discovery aid or interpretation, not an original plan.
2. Distinguish an architect's design, construction drawing, exhibit-installation diagram, visitor map, promotional perspective and photograph of the built work. Original does not automatically mean built. In an April 17, 1893 memorandum, the landscape architects describe plans changing until the month before opening; a proposed 1891 map cannot establish every 1893 building position. See source `EXPO-P03` in [the source registry](sources.json).
3. Inspect the actual image for every dimension or repeated opening claimed from a plan. OCR is a finding aid. Preserve printed page numbers and one-based scan numbers separately; folded maps may be split, blank or incomplete in a scan.
4. Prefer written dimensions and scale bars. Derive a pixel scale only from a complete, legible sheet with recorded calibration endpoints. Give the equation and an uncertainty range. Do not obtain reliable dimensions from a perspective photograph alone.
5. Compare plan/elevation against at least one contemporary built photograph before calling a named building a reconstruction. Record discrepancies. Use multiple views for roofs and backs; an unseen surface remains unknown.
6. Separate **source fact**, **derived measurement**, **game adaptation** and **unverified lead**. Each named-building asset should cite its source IDs and exact locators. Keep a measured source dimension alongside the game dimension and explain any crop, scale change, simplified opening, omitted ornament or invented connection.
7. Keep the raw donor import and its hash/provenance separate from the Tinderbox adapter. A new skin changes the appearance slot; collision and fuel material come from explicit content data. White plaster appearance alone must not select stone physics or imply the plaster itself burns like timber.

## What the first sources establish

- `EXPO-P01`, the original 1893 *Plans and diagrams*, provides exhibit-location floor diagrams and descriptions. These are useful original published plans, but they are not a complete set of structural or construction details. The Horticulture plan is one-based scan 31. Inspection of scan 9 found an incomplete folded map; it is unsuitable as a complete site-plan measurement source.
- `EXPO-P02`, *Official views*, provides named 1893 photographic plates. The architect visually inspected plates 43, 45, 53 and 97 in the browser: Horticulture's glazed galleries/dome; the Woman's Building's arcade, pediment and raised glazed central roof; Fisheries' pitched/hipped roofs and repeated arches; and the Midway's smaller varied street fronts. Exact bay dimensions, roof pitches and original colours were not measured from these perspective monochrome images. The appended 1905 history is a separate later text, not the date or authorship of the 1893 photographs.
- `EXPO-P03` records the landscape architects' explanation of the changing plan, terrace/shore work and adjustments between buildings and landscape. It supports a versioned research method rather than a claim that a single early map is final.
- `EXPO-A01` is a particularly relevant original insurance diagram: its catalog describes material colours, dimensions, waterworks and fire equipment. Full images were not available through the accessible catalog, so no material or dimension has been measured from it.
- `EXPO-A02` is a visually inspected 1893 lithographic architectural elevation and ground-floor **front-half** plan of the Administration Building, from the Hunt collection. The catalog identifies Richard Morris Hunt as architect and A. Riquois as delineator. Its round arches, symmetric front pavilions and central dome are visible. The sheet's scale ruler has not been calibrated; it is not a full construction set. `EXPO-A03` remains a catalogued, uninspected lead from a different publication.

## Source criticism and fire

Contemporary promotional descriptions need scrutiny too. An 1893 Conkey guide describes staff as a plaster/cement/fibre covering and advertises it as fireproof (`EXPO-P04`, printed p. 68). That claim does not demonstrate that a complete timber-framed building was fireproof. The visual surface, structural material and observed fire history are separate evidence.

For this first kit, existing fire rules remain a coarse ground-plane model. A roof skin or cornice does not introduce simulated roof/upper-storey spread. Structural wood and noncombustible appearances must remain explicit; researched material descriptions are not silently converted into new fire tuning.

## Reproduction and local evidence

The public-domain plan-volume scan is cached outside the public game and Git under `artifacts/research/exposition/plans-diagrams-1893.pdf`. Its exact SHA-256, origin and scan count are in `sources.json`. The original LOC catalog states that the volume is free to use and reuse; the cached PDF is the linked Internet Archive scan mirrored by Wikimedia Commons.

The architect extracted text with bundled Python `pypdf` and rendered selected scans with Poppler `pdftoppm`. Example, from the repository root:

```powershell
pdftoppm -f 31 -l 31 -singlefile -scale-to 2200 -png artifacts/research/exposition/plans-diagrams-1893.pdf artifacts/research/exposition/horticulture-plan
```

The one-based scan 34 Fisheries description was also rendered and visually read. It identifies the central building, two polygonal wings connected by arcades and Spanish-tile roof treatment. No precise arcade-bay dimensions or roof pitch were inferred from that description.

Documentation, cached research and review workbenches are excluded from the public package. Keep sources retrievable by stable archive URL and item ID so local caches are a convenience, not the sole surviving evidence.

## Model and skin record

Every kit definition should expose a stable ID, form, metre dimensions, quarter-turn orientation, opening state/clearance where applicable, physical-material ID, named skin slots and source references. The content compiler owns solid footprints; rendering uses the same definition. A closed door remains visibly closed. A usable open passage must clear the bear and agree with the compiled collision.

Custom façade paintings, period civilian clothing and exact building reproductions are later art work. For now, preserve the existing Farmyard forms/materials and use an explicit allowlist of original normal animals, with no Red Hat service caps, uniforms, weapons or identity attachments. Cosmetic colour changes are not sufficient evidence of that exclusion.
