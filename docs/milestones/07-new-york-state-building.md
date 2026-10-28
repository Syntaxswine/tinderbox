# Milestone 07 New York State Building exterior

Status: architect proposal and artist assignment, accepted in scope by the user on 2026-10-28. Produce one reusable exterior asset of the New York State Building at the 1893 World's Columbian Exposition, supported by its published plan, elevation and built photograph. Administration is the next building after this delivery passes architect review. Follow the [existing promotion gate](../workflow.md#promotion-gate).

## Assignment and branch

TB-022 belongs to **Artist, Tinderbox**, in the existing `C:/Users/baals/.codex/worktrees/art-assets/tinderbox` checkout. Check status and branch occupancy, then create `codex/new-york-state-building-art` from the clean artist checkpoint **`f25fd7b28a9aee1d1abaef1ad65acd64d67a50e6`**. Preserve `codex/row-ignition-art` and the separate Hopkins v2 branch. This base preserves completed art work; its row/torch candidate still awaits combined review. Deliver the new task's diff against this exact base.

The architect owns TB-023: independently review the sources, dimensions, actual asset and JPGs, return revisions to the artist, and specify any later coder integration. The current architect proposal base is `1b8324ea5b9ce3fa8e0e72a0391ba740f335d144`. Existing coder/UI ignition assignments continue separately. Use the established worker and worktree; no additional chat or checkout is needed.

## Original evidence

Use source **TB009-R02** in the [artist's exposition register](../art/exposition/sources.json), following the [research method](../research/1893-exposition/README.md). The source is McKim, Mead & White's *A monograph of the work of McKim, Mead & White, 1879-1915*, volume I, Getty Research Institute / Internet Archive item `gri_33125006526145`.

| Evidence | Exact locator | Use |
| --- | --- | --- |
| Elevation and complete first-floor plan | Plate 44, one-based PDF scan 99, [viewer](https://archive.org/details/gri_33125006526145/page/n98/mode/1up) | Building outline, curved end porches, entrance and opening positions, heights supported by the elevation, printed foot scales |
| Matching built photograph | Plate 43, one-based PDF scan 97, [viewer](https://archive.org/details/gri_33125006526145/page/n96/mode/1up) | Check the silhouette, visible ornament, parapets and two capped roof towers against the published design |

The [source PDF](https://archive.org/download/gri_33125006526145/gri_33125006526145.pdf) is already cached in the artist checkout at `artifacts/exposition-research/raw/gri_33125006526145.pdf`. Its SHA-256 is **`1813cc4963681df8a6357c1553ffd4116522a19137afa6381e6b35f209f62fa0`**; the architect rechecked the cache for this assignment. Reuse that copy. Credit the architects, publication and Getty scan, retaining the recorded public-domain evidence.

This is a later publication of the 1893 building. The title/date discrepancy recorded in the source register remains unresolved. It supplies a plan and elevation rather than a complete construction or as-built drawing set. Fine dimension numerals and rear roof details require further inspection before they support exact claims. The [official 1893 photographic volume](https://www.gutenberg.org/cache/epub/22847/pg22847-images.html), plate 64, is an additional built-view lead; inspect the actual plate before adding findings from it.

## Measurement before modelling

Inspect both original plates at readable resolution. Produce an annotated source sheet and a compact measurement table covering the overall footprint, main facade, end porches, entrance and repeated bays, parapet, towers and roof profile. Include the original feet, converted metres, authored game dimensions, source locator, confidence and adaptation for each feature. Convert feet using `metres = feet * 0.3048`.

Prefer legible dimension chains. For a scale-derived measurement, record image resolution, calibration endpoints and the foot length represented: `featureMetres = featurePixels / scalePixels * scaleFeet * 0.3048`. Calibrate plan and elevation independently and account for scan distortion. Cross-check a second legible span. Report a reading uncertainty; ambiguous numerals stay unresolved. Photographs establish visible form and built differences, with perspective accounted for, rather than supplying an unqualified pixel-to-metre scale.

Keep source fact, derived measurement, game adaptation and unknown detail distinct. Build the evidenced silhouette first. A simplified rear treatment may be used where evidence remains incomplete, with its inferred surfaces identified in the handoff. Exact historic colours need colour evidence; a monochrome photograph supports tonal relationships and ornament, with the game palette recorded as an art choice.

## Asset and reusable forms

Preserve the existing Farmyard/Nautilus material language, native character scale and source kit dimensions: wall **1 by 2 by .16 m**, door **1 by 1.65 by .12 m**, slab **.12 m**, floor pitch **2.12 m**. Compose unscaled modules and author explicit infill, cornice, parapet, porch and roof pieces where the historic form needs them. Retain the physical texture density, origins and attachment conventions. Record any native-grid adjustment against the measured source dimension. A taller historic opening can use an assembled surround or transom while its reused door leaf retains native dimensions.

The asset must retain the building's central entrance, symmetry and opening rhythm, curved end porches, parapets and paired capped roof towers to the extent established by the two plates. Simplify fine ornament according to its visibility from the game's isometric camera. Reusable parts should expose named appearance slots such as `facade`, `trim`, `door`, `roof` and `glazing`; changing those slots must preserve geometry and bounds.

Keep an uncompressed measured reference outline beside the authored dimensions. If the landmark exceeds the current street's extent, deliver it separately at its documented scale. Scene placement is a later coder assignment; squeezing the building into the six-house street would defeat the source study.

Provide a self-contained factory named `createNewYorkStateBuilding`, using the host's supplied Three namespace and existing material resources. Return `root`, local metre `bounds` and `dispose()`, documenting ownership of borrowed versus created resources. Use the existing ground-plane X/Z and vertical Y conventions, a documented ground-level anchor and quarter-turn placement. Export the actual ground footprint, overhang bounds and closed/open passage intent as metadata for the coder; rendering must not independently define gameplay collision. Give components stable identifiers so a future adapter can apply existing char/fade behavior.

Appearance and physical material remain separate. Record evidenced structure/finish only where sources establish them. The white facade alone cannot select stone or timber combustion. Fire propagation, fuel values, collision behavior, interiors, stair traversal and structural collapse remain with later simulation/content work.

## Owned files and delivery

Keep new work in these task-specific paths:

- `art/source/exposition-new-york/`: editable source, source crops/annotations, measurements, repeatable export/render recipes and source/rights records.
- `assets/art/exposition-new-york/`: reusable factory, forms, necessary exports and a manifest with dependencies, hashes, bounds, appearance slots and adaptations.
- `docs/art/exposition-new-york/`: handoff, source comparison and JPG previews of the actual exported model.
- `workbenches/art/check-exposition-new-york.mjs`: focused geometry, appearance-slot and resource checks where needed.

Use existing export/render facilities for the previews. Add a small task-local wrapper only if needed; a new interactive tester or retained server is unnecessary. Preserve pinned raw donor files, other house assets, gameplay modules, production scene wiring, UI and deployment configuration. New donor imports require an explicit immutable pin and minimal provenance/dependency closure; never take a moving branch wholesale.

Deliver these JPGs from the actual asset at least 1280 by 800 pixels:

1. A front isometric view with the native bear or an accurately dimensioned scale reference.
2. A rear/side isometric view showing the full envelope and roof treatment, with inferred details identified in its caption.
3. A readable source-to-model comparison of the plan footprint and front elevation, including scale and the adaptation legend. This may be a larger JPG to keep the drawings legible.

Identify omitted gameplay effects, crowds and UI in captions. Source drawings belong in the research/evidence paths, outside the public runtime package. Record texture/mesh counts and preview camera settings; CPU/offline renders establish appearance under those stated conditions, while runtime browser acceptance follows the normal gate.

## Review criteria and handoff

The external references for correctness are the original plan/elevation, the built photograph, recorded scale calibration and the existing native unit definitions. The architect compares them against the delivered geometry rather than accepting an attractive preview alone.

- The outline, principal masses and repeated openings agree with the source or have a recorded adaptation. Numerical checks use the declared source-reading uncertainty and native-grid adjustment, with no unexplained uniform scale change.
- A plan overlay and front-elevation comparison show alignment and deviations; the built photograph resolves visible differences where possible. Rear/roof inferences remain identifiable.
- Bounds and footprint metadata contain the corresponding geometry at all four quarter turns. Skin swaps preserve dimensions, source texture density and physical-material metadata. Resource checks cover repeated construction/disposal without disposing borrowed host resources.
- Relevant existing checks plus the focused asset check pass. Review the final JPGs at game-like isometric scale for silhouette, seams, roof joins, material density and character proportion. Report browser checks as passed only when actually completed in WebGL.
- Commit only TB-022 files, push `codex/new-york-state-building-art` to the configured Tinderbox remote, and deliver the exact SHA, diff against the base, source/hash evidence, commands/results, JPG paths and remaining uncertainties. Stop disposable helpers and report any retained helper with its required lifecycle record.

Artist delivery is a candidate. The architect's separate review determines acceptance and a later coder placement contract before promotion. Administration follows this first building, using the [Hunt collection elevation and front-half plan](https://www.loc.gov/item/2024636088/) and further evidence for its remaining footprint and roof; this assignment does not extend that partial plan into an assumed complete reconstruction.
