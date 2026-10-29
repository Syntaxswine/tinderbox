# Administration Building: artist handoff

Candidate branch: `codex/administration-building-art`, based on `b689f5501ab06f54822f2aa724ac77de106e3b71`. Only the architect promotes it. The delivery commit is the commit containing this record; use `git log -1 --format=%H -- assets/art/exposition-administration` after checkout.

## Delivered paths

- `assets/art/exposition-administration/`: native engine adapter, plan, clipped floor cells, reusable circular stair generator, Three factory, metadata, assembly and hashed manifest.
- `art/source/exposition-administration/`: preserved original-plan/photo evidence, measurement conversions, donor preservation hashes and reproducible export/review scripts.
- `docs/art/exposition-administration/`: eight mesh views, two comparison sheets and this acceptance record.
- `workbenches/art/check-exposition-administration.mjs`: source, geometry, independent floor coverage, openings, poses, material ownership and package checks.

No existing tracked file changed. Both New York editions remain byte-identical to the 68 Git blobs in `preserved-and-engine.json`. Farmyard and Nautilus checkouts were read-only. No new donor bytes were imported: the earlier pinned Nautilus module already in Tinderbox is used directly. Its SHA-256 is `6d01eb4b49d6ba20ae71e4bb2cab095c80e63be5d14b6ff43f509a9cfc76633d`, also compared to the immutable donor revision.

## Native architecture and API

```js
import { createAdministrationBuilding } from './assets/art/exposition-administration/index.js';
const building = createAdministrationBuilding(THREE, {
  position: [0, 0, 0], quarterTurns: 0,
  materials: {}, textures: {}
});
scene.add(building.root);
// Later: scene.remove(building.root); building.dispose();
```

The host supplies its shared Three namespace (tested with the repository r180). X/Z placement must be integer metres and Y an integer multiple of 2.12 m; quarter-turns are 0--3. Local origin is ground at the centre of the front footprint, +X right and +Z rear. `bounds` is local; account for `root.matrixWorld` after placement. `metadata`, `diagnostics()`, `setAppearance({materials,textures})` and idempotent `dispose()` are returned.

Appearance slots: `facade`, `trim`, `door`, `roof`, `glazing`, `shadow`, `awning`, `dome`, `floor`, `interior`. Input materials are cloned; maps/textures and their transforms remain borrowed. Disposal releases owned geometry, clones and instancing allocations once. Physical structure and finish remain **unassigned**. The native validator's `wood` authoring enum is a required geometry token, not a combustion assignment.

Dimensions are derived from the actual pinned `WALL_KIT`: panels 1 x 2 x 0.16 m, slab 0.12 m, pitch 2.12 m; ordinary leaves retain 1 x 1.65 x 0.12 m. Native arrays and transforms are checked without scaling. Full panels keep their source arrays; opening fragments and boundary cuts are explicitly custom. Separate physical-metre UVs support reusable skins without changing geometry; curved sculpture uses the documented local/circumference approximation. The unchanged shared `exposition-new-york/forms.js` is the other local dependency. No runtime path reaches a sibling checkout or local absolute path.

Structural run lengths are 4, 6, 10, 12, 14, 16, 26, 28 or 54 m. The regular octagon has eight exact 16 m runs; its diagonal endpoints are fractional coordinates, with metre panels rotated unscaled. Dome, columns, arches, ornament, stairs and floor-edge cuts are custom parts. Body span is 80 x 80 m; full approaches/ornament bounds are approximately X -46..46, Z -6..86 and Y 0..76.32 m.

| Native level | Elevation | Use |
| --- | --- | --- |
| 1 | 2.12 m | First floor, rotunda and raised approaches |
| 3 | 6.36 m | Second pavilion floor |
| 5 | 10.60 m | Third pavilion floor |
| 7 | 14.84 m | Fourth pavilion floor |
| 9 | 19.08 m | Pavilion roofs / lower gallery |
| 19 | 40.28 m | Upper colonnade terrace |
| 23 | 48.76 m | Narrow dome spring ring |
| 36 | 76.32 m | Crown marker only; no occupied floor |

Empty levels preserve tall spaces. Upper plates have real rotunda apertures; the dome has no hidden flat cap closing the room. Four circular stair pods connect levels 1/3/5/7, with 288 treads total. Rise is 2.12/12 m per tread, with real upper-floor holes and tested landings. These are art geometry: character navigation, rails/collision and gameplay traversal still require a consumer adapter. There is no invented access stair to the upper galleries.

## Original evidence and decisions

[Hunt/Riquois sheet](https://www.loc.gov/resource/ppmsca.73183/) supplies an elevation and explicitly the **front half** of the ground-floor plan. The original 4944 x 5348 TIFF is pinned by URL/hash; derived high-resolution JPEGs are committed. Its printed ruler is metres: 1,619 px over 50 m, with an independent 30 m reading of 32.4 px/m. The front reads 79.77 m (+/-1.1 m); it is authored as 80 m. The sheet has no separate elevation ruler, so its approximately 77.52 m height reading is indicative only.

[Flinn's official 1893 guide](https://archive.org/details/officialguidetow00flin), printed pages 43 and 45 (scans 49/51), supports four-story corner pavilions, recessed grand entrances, an octagonal rotunda, circular stairs and a gilded dome. Its 250 ft height converts to 76.20 m; the candidate crown is 76.32 m. Other early height reports differ, so this is a stated grid choice rather than a resolved as-built survey. The 130 ft terrace comparison is the derived sum of two described 65 ft stages, not a separately printed dimension.

[Arnold/Higinbotham's 1893 official photographs](https://www.gutenberg.org/cache/epub/22847/pg22847-images.html), plates 23/25/33, support the built massing and ornament. Gutenberg records image gamma adjustment and repairs; later appended text is not used for measurements. The [comparison sheet](previews/source-comparison.jpg) keeps source and model at the same stated metre scale. [Measurement JSON](../../../art/source/exposition-administration/measurements.json) records endpoints, conversions and each adaptation.

Pavilions are snapped from 84 ft to 26 m; entrance fields are 16 m wide. The external dome envelope is 40.6 m, larger than Flinn's nominal 120 ft / 36.576 m diameter; this explicit difference follows the drawn silhouette and the chosen native octagon. Do not present it as exact agreement. Front office proportions are snapped and diagonal small office corners squared. Thirteen labels follow the sheet; rear rooms and upper subdivisions remain open/unverified. Four-sided exterior symmetry and hidden roof joins are adaptations. Exact sculpture, elevator machinery, interior mural and historical colour matching are deferred. Gilding is source-supported; cream/teal colours are artistic choices.

Original evidence, donor notices and the existing mixed/unknown donor rights remain separate. Source pixels stay outside the public runtime package; provenance is not a new license grant. The LOC catalogue rights wording was inherited from the inspected architect register; the current catalogue returned 403 while public TIFF/JPEG downloads succeeded. See `sources.json` for this distinction and raw hashes.

## Validation and review limits

The [check record](check-results.json) records passing repository checks (85 tests), the build and the focused `--package` run. Focused checks cover 68 preserved files, all 7,968 actual native source panels in five tiers, 5,645 complete native wall boxes, eight ordinary leaves, opaque coverage around openings, slab elevations/thickness, independently integrated floor areas, real rotunda and stair apertures, entry/landing rays, 288 treads, four poses, skin invariance and 651 owned-resource disposals. The built package loads with the shared Three module under a nested URL; all recorded runtime/dependency hashes match and research files stay out.

Default diagnostics: 412 meshes, 229 instance batches, 614,274 triangles, 411 geometries, ten materials and no owned textures. The full landmark is substantial; CPU pictures are appearance evidence, not a GPU budget acceptance. The eight views and two annotated sheets were visually inspected. See [offline-review.json](offline-review.json) for per-view findings.

The complete building is a provider candidate with five validated six-layer wall fragments and native vertical offsets. It is **not one legacy six-layer map**, not yet registered in Nautilus's fixed prefab catalogue and not placed in Tinderbox's production street. Future engine intake must deliberately accept whole-building placement, custom geometry and level offsets. Collision, traversal, fire, collapse, editor selection and WebGL performance remain coder/architect acceptance. Do not flatten levels or resize the asset during intake. No engine or gameplay code changed here.

## Reproduction and helper lifecycle

From this worktree run:

```text
node art/source/exposition-administration/build-manifest.mjs
node tools/check.mjs
node tools/build.mjs
node workbenches/art/check-exposition-administration.mjs --package
node art/source/exposition-administration/export-review.mjs
python art/source/exposition-administration/render-review.py --view front-isometric --spp 24
python art/source/exposition-administration/compare-source.py
```

Render the other seven names listed in `offline-review.json` with the same command. `prepare-evidence.py` regenerates evidence from the immutable caches specified by `sources.json`; the PDF scans were produced with Poppler. Rendering uses Python/Pillow, NumPy and Mitsuba 3.9.1; this checkout reuses its ignored `artifacts/render-deps` and the bundled Codex Python. Source scripts and recipes are durable; cached PLY/raster intermediates are disposable.

Each render has a recorded PID, exact creation time, executable, purpose and an actual 120-second deadline. The package server has a 30-second same-process deadline and closes in `finally`, checking that the port is released. All task-owned processes exited, the package port was rechecked, and no helper is retained. Local receipts are under ignored `artifacts/exposition-administration/`.
