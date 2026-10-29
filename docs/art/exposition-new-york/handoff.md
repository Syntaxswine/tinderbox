# TB-022 artist handoff

Candidate branch: `codex/new-york-state-building-art`. Diff base: `f25fd7b28a9aee1d1abaef1ad65acd64d67a50e6`. The final pushed commit is identified in the artist's delivery message. The existing row/torch and Hopkins v2 branches are preserved. This asset is separate from the 51 m street; it is ready for the architect's TB-023 source/model review.

## Changed paths

The task diff owns only `art/source/exposition-new-york/`, `assets/art/exposition-new-york/`, `docs/art/exposition-new-york/` and `workbenches/art/check-exposition-new-york.mjs`. Source/rights evidence and recipes, the portable factory/forms/metadata, the six JPGs and review records, and the focused checker are confined to those paths.

## Asset and placement

Import `createNewYorkStateBuilding` from [the asset module](../../../assets/art/exposition-new-york/index.js). Its three JS modules are standalone: they import neither another Three implementation nor Tinderbox runtime code. The host supplies its existing Three namespace (r180 checked) and optional materials/maps.

```js
const landmark = createNewYorkStateBuilding(THREE, {
  materials: { facade: materials.plaster, trim: materials.ivory },
  textures: { roof: existingSlateTexture },
  quarterTurns: 0,
  position: [0, 0, 0]
});
scene.add(landmark.root);
// Later: landmark.dispose();
```

The ground anchor is the centre of the main front wall. X is facade width, +Z is rear and Y is vertical. `quarterTurns` is 0–3, applied as negative Y quarter turns. `bounds` is a local-metre `THREE.Box3`; `metadata` always remains local. The rendered envelope is approximately X −35.25…35.25, Y 0…33.5, Z −10.6…32.51 m. Do not resize it to fit the existing street. Native modules retain unit scale, original BoxGeometry positions/normals/UVs and central origins: 322 wall modules at 1 × 2 × .16 m and six door leaves at 1 × 1.65 × .12 m. Taller entrance openings have fixed transoms. Explicit infill composes the larger historic form around them. Historic sash/glazing are new assemblies around 1.5 m apertures. The published door field is approximately 2.082 × 4.213 m; the game retains two native leaves below fixed transoms. The eight lower-window centres differ from their ruler-derived source positions by at most .118 m.

`metadata.groundContact` records the actual plinth, landing, steps and open porch decks, with vertical ranges and intent. `porchColumns` lists column centres/radii above the 2.12 m deck. `passages` distinguishes closed leaves from open colonnades. `upperEnvelope` identifies roof components and source/inference; `overhangBounds` conservatively contains all above-deck geometry, including cornices and urns. The [metadata export](../../../assets/art/exposition-new-york/metadata.json) adds the uncompressed measured outline and the complete adaptation register. These declarations are inputs for a later simulation adapter, and do not create collision or traversal.

## Appearance, component IDs and ownership

Slots are `facade`, `trim`, `door`, `roof`, `glazing`, `shadow`, `awning`. `setAppearance({materials, textures})` replaces named slots without rebuilding geometry or changing bounds, placements, UVs or physical-material metadata. Supplied built-in Three materials are cloned into owned UV adapters; their original callbacks/cache keys are preserved. Default paint adapters mix the inherited texture with their base colour in linear space (facade .12, roof .45). Borrowed material adapters preserve the supplied response. Distinct transfers use distinct shader cache keys.

The additional `grossUV` attribute contains metre coordinates. Native UVs stay intact. Native walls and all authored flat faces, including slopes and mitered cornices, have metric UVs. Turned ornament uses approximate local/circumference projections. Callers prepare the borrowed maps' colour space/wrapping/repeat; the previews use the existing concrete/plaster and slate maps at a 2 m period. Keep that period when selecting replacement skins. The factory does not mutate map transforms.

Every mesh has a stable `componentId` and appearance slot. Repeated parts use `InstancedMesh.userData.parts[instanceId]`, which preserves the original component ID/form. An infill assembly's `parts` supplies stable IDs and vertex ranges. A later adapter can use these records for char/fade state. There is no fire or material-combustion selection here; both structure and finish remain `unassigned` pending evidence.

Final geometry: **316 rendered meshes, 164 instance batches, 316 geometries, 178,224 triangles and seven owned materials**, composed from 7,041 source parts. Defaults own zero textures; reviews borrow two existing maps. `dispose()` is idempotent, detaches/clears the tree, disposes owned geometries/materials/instance allocations and releases instance references. It leaves supplied materials and maps undisposed. Geometry/appearance/ownership checks cover four placements and repeated disposal.

## Evidence and adaptation

[The source comparison](previews/source-comparison.jpg) includes the first-floor outline, actual model roof plan, published elevation and actual front elevation at matching metre density/ground datum. [Calibration](../../../art/source/exposition-new-york/annotated-calibration.jpg) records the independent rulers: plan 20–40 ft =124 original pixels; elevation =123 pixels. The 10–30 ft spans independently agree. Only the legible two 77 ft chains are used as exact dimension transcriptions. The resulting 154 ft /46.9392 m facade receives +.0608 m across its width to compose 47 native tiles. Other source-to-game deltas and reading allowances appear in the [measurement table](source-comparison.md).

Source TB009-R02 is McKim, Mead & White's monograph, volume I, plates44/43 (one-based scans99/97), Getty/Internet Archive `gri_33125006526145`. PDF SHA-256: `1813cc4963681df8a6357c1553ffd4116522a19137afa6381e6b35f209f62fa0`. Same-volume JP2 ZIP SHA-256: `dddd19dad3ca5c68e4fe3651e0ab7611e8ea5dcd9eee99bf0a63d283cc171cc8`. Exact original page hashes, member names, source URLs, transformations and the catalogued `NOT_IN_COPYRIGHT` evidence are in [sources.json](../../../art/source/exposition-new-york/sources.json). The two small original JP2 pages are committed in the evidence tree; the full PDF/ZIP remain in ignored research caches. No additional donor revision was imported.

Built plate43 supports striped awnings, low hipped tower caps and parapet urn/plant displays. Plants, fine sculptural figures/relief and street furnishings are omitted or simplified. Rear openings, tower back faces, roof depth/plan and rear roof joins are identified as inferences. Warm ivory, muted olive/slate, teal glass and awning colours are art choices. The later-publication title/catalogue-date discrepancy and small dimension numerals remain unresolved. The monochrome images do not establish structural or combustion materials.

## Validation and remaining gate

[Check results](check-results.json) and [offline visual review](offline-review.json) record the commands, counts, image hashes and limits. Repository checks passed 85 tests, 87 script syntax checks, 114 resolved static modules and the existing donor/provenance gates. The focused check verifies 23 calibrated measurements and eight source-checked front window centres, all 328 native wall/door modules, 295,665 finite bounded vertices, 1,158 ground-contact vertices, 258,444 planar metric edges (including 132 roof edges), actual window/porch openings, four rotations, skin invariance and 489 owned resource disposals. Package review verifies the standalone factory and borrowed textures beneath `/nested/review/tinderbox/` and releases its private port.

All five model JPGs are 1600 × 1200; the source comparison is 2700 × 3070. They are diffuse CPU renders of exported actual Three meshes (including instance transforms), using Mitsuba 3.9.1 scalar_rgb, 24 spp, the recorded cameras and existing maps. Native bear geometry/base colours are retained; its multi-view paint shader is omitted. No interiors, crowds, fire, gameplay or UI appear. WebGL shader/performance acceptance, collisions, traversal, physical material assignment, final scene placement and promotion remain with the architect/later coder contract. No service or preview is retained.
