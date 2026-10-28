# Artist handoff: Gross catalogue housing

Candidate branch: `codex/art-assets`, based on `2fd15661f1334832d5cf873fcc0c6829b5ff53e7`. The final Git commit is reported with delivery. This artist candidate does not promote or deploy the integration branch.

## Delivered

- Thirteen separately identified house prefabs from the 1891 S. E. Gross catalogue, with matching source plates, exterior assemblies, 29 interior levels and 147 labeled spaces.
- Four new painted materials, exact built-in ImageGen prompts and unchanged PNG bytes. Existing brick and slate textures carry over at their existing physical repeat sizes.
- Stable native wall, door, lintel, floor and source mesh interfaces. New Victorian sash inserts and decorative pieces are explicitly separate assets.
- Diagonal art geometry follows the coder’s `nautilus-wall-runs-v1` panel/cut-end construction, fixed at Nautilus commit `cc52f89de6333a1d94e2dfe45d47d1317369fac0`. Thirteen portable wall-run extension fragments validate against that committed implementation.
- A dedicated exterior/interior workbench, reproducible layout/trace generators, source-comparison and collection preview sheets, and checked provenance.

Owned paths: `src/art/gross-housing.js`, `assets/art/gross-housing-v1/`, `art/source/gross-housing-v1/`, `workbenches/art/gross-housing.*`, the two `check-gross-*.mjs` checks, `docs/art/gross-housing-v1/`, and the art-library guide link. No donor checkout, coder worktree, architect branch or shared gameplay compiler was modified.

## Verification

`npm run check`: 59 tests pass, 73 own-script syntax checks, 81 static modules, one shared Three pair, five unchanged vendor inventories, nine existing adapter fingerprints, and all previous facade/skin inventories pass.

`node workbenches/art/check-gross-housing.mjs`: all 13 prefab/source bindings, 29 room plans, 147 non-overlapping connected spaces, 1,935 native attribute comparisons, generated material hashes, original mesh scale and idempotent disposal pass. Current collection has 1,700 wall spans, including 54 angled spans with the decorative attic bay.

`node workbenches/art/check-gross-nautilus.mjs --nautilus-source …`: all 13 trace fragments pass the exact committed validator. Their 1,226 runs produce 1,228 native/cut panels, including 98 cut pieces. All 554 apertures retain separate measurements.

Browser review: 42 exterior/interior views at 1280 × 720 and another 42 at 390 × 844. No horizontal overflow, console warnings or errors. Four shader programs link with empty logs. Repeated collection swaps stay at 73 geometries / 7 textures for the same baseline house. Complete artist disposal returns to 0 geometries / 0 textures. Phone results emulate viewport size on the desktop GPU.

`npm run build`: the public package contains the complete local asset and module dependencies. The final inventory and served-byte verification are recorded in `package-review.json`.

## Integration boundary

The models are reusable artist prefabs with full visible interiors and exteriors. The trace files are optional `wallRuns` extension fragments, not full maps or blocks. They leave door/window gaps and record the separate sills, lintels and inserts; the current extension does not encode those vertical apertures. Interior collision, floor traversal, fire, furniture interactions and stair gameplay require consumer integration. Nautilus full-prefab intake is not claimed, and the Tinderbox consumer is not marked as supporting the new wall-run capability.

The original bear-to-door fit limitation remains. Monochrome catalogue colors, furnishings, rear elevations and some compact room dimensions are interpreted. An unplanned decorative attic bay is included on the octagonal house; it is not counted as a published interior floor.

Temporary review tabs are closed and the viewport override reset at delivery. The task-owned read-only preview server is stopped, its exact identity and restart sources are preserved under ignored `artifacts/art-preview/gross-housing-v1/`, and its port is verified released. No retained preview service is required to use the saved assets or screenshots.