# New York State Building: separate grid edition

## Result and original preservation

The user requested fixed simulator floors and whole-metre walls, with a separate compatible copy if the detailed reconstruction diverged. The earlier `exposition-new-york-1893` is preserved: all 41 original tracked files in the source, asset, review and focused-check paths retain their Git blob identities at `5e8d64b8b41637637d57ed762eb5157e5d521b4f`. No global mesh resize or rewrite of that original was used.

The earlier asset used native-sized wall and door pieces but also arbitrary infill spans and height bands. It contained no complete interior floor schedule. Native part sizes alone did not establish tile-system conformity. The new factory compiles explicit level/plan data into its geometry. It is a grid-conforming art asset with an inspectable structural recipe, not an editor-placed simulator save. Gameplay integration remains separate.

## Physical contract

- Ground anchor: centre of the front wall at ground; +X right, +Z rear, +Y up. One unit equals one metre.
- Main body: 48 m wide by 28 m deep; stepped rear reaches Z=34 m. Every structural wall centre-line ends on integer X/Z coordinates. All run lengths are even integral metres: 2, 4, 6, 10, 16, 28 or 48.
- Walls compile to unscaled 1 by 2 by .16 m cells. Apertures cut only the cells they intersect; fractional window sill/lintel heights are explicit opening parts within those fixed envelopes. Native door leaves remain 1 by 1.65 by .12 m. No character resizing.
- Floors use native 1 by .12 by 1 m tiles, except four custom semicircular porch slabs of the same .12 m thickness. Every floor/deck top is at `level * 2.12 m`. The factory rejects placement outside integer X/Z metres or the standard Y-level pitch.
- At empty levels, .12 m closures fill the perimeter wall course gap. These are narrow wall strips, with no floor across the room.
- Roof pitches, rounded porticoes and columns, arches, cornices, rails and stair treads remain custom architectural parts. Their horizontal surfaces are not extra occupied floor levels. Curved porch decks use standard level elevations; visual stairs terminate on L1. No traversal is implemented.

| Surface | Standard level | Floor/deck top |
| --- | ---: | ---: |
| Main floor, front landing and lower porch decks | 1 | 2.12 m |
| Upper main floor and upper porch decks | 4 | 8.48 m |
| Attic floor | 7 | 14.84 m |
| Main roof deck / clerestory base | 8 | 16.96 m |
| Clerestory roof deck / tower bases | 10 | 21.20 m |
| Upper terrace and tower balconies | 11 | 23.32 m |
| Tower roof decks | 15 | 31.80 m |

L2/L3 and L5/L6 stay empty within the main rooms, giving 6.36 m floor-to-floor and 6.24 m clear height below the next slab. L9 is empty within the clerestory. L12/L13/L14 are empty inside the towers. The roof peak and terminal geometry can lie between levels, because they are roof/ornament rather than floors. Total visible top is approximately 34.34 m, including terminals.

The new floors are unpartitioned structural surfaces. Historical room divisions, interior fit-out, vertical circulation and doors connecting rooms are not inferred from this exterior adaptation.

## API and data

```js
import {createNewYorkStateBuildingTile, TILE_PLAN}
  from './assets/art/exposition-new-york-tile/index.js';
const asset = createNewYorkStateBuildingTile(THREE, {
  position: [0, 0, 0], quarterTurns: 0, materials: {}, textures: {}
});
scene.add(asset.root);
// asset.root, asset.bounds (local metres), asset.metadata
// asset.setAppearance({materials, textures}), asset.diagnostics(), asset.dispose()
// TILE_PLAN.runs / floors / levels / tallRooms / exceptions
```

Quarter turns are 0–3. A Y placement of 4.24 m, for example, offsets the entire recipe by two standard levels; fractional X/Z placement is rejected. Bounds and structural metadata remain local. Each wall fragment identifies its logical cell, run and level. Every floor mesh identifies its slab and level, including instanced parts through `userData.parts[instanceId]`. The factory's `metadata` contains actual wall fragments, closure strips and 6,744 floor-tile records. The generated [static metadata](../../../assets/art/exposition-new-york-tile/metadata.json) keeps the complete recipe, counts and a checked SHA-256 compilation digest, avoiding duplicate packaged cell records.

There are 24 logical wall runs, 1,420 unchanged native wall geometries, 312 opening-cut fragments, 1,590 perimeter closure fragments, six native door leaves and four curved slabs. The full art contains 325 rendered meshes, 207 instance batches, 249,708 triangles and seven material adapters. Native floor tiles share geometry and are instanced. Resource counts cover the complete art including custom ornament.

This asset shares the unchanged `forms.js` and `native-contract.js` from the original asset directory. The new manifest records their SHA-256 values as explicit local dependencies. Include both dependencies when transferring the asset. There is no runtime dependency on an absolute path, donor checkout, moving branch, network service or second Three copy. Host Three r180 was checked.

The factory owns geometries, cloned/default material adapters and instancing allocations. The host owns its Three namespace and supplied textures/maps/materials. Maps and texture transforms are neither modified nor disposed. `dispose()` is idempotent. Appearance changes leave geometry, floor schedule and bounds invariant. Appearance slots are facade, trim, door, roof, glazing, shadow and awning. Physical structure/finish remain unassigned; facade colour is not combustion evidence.

## Evidence, adaptations and provenance

The unchanged [source record](../../../art/source/exposition-new-york/sources.json), [measurements](../../../art/source/exposition-new-york/measurements.json) and [source comparison](../exposition-new-york/source-comparison.md) remain the evidence authority: McKim, Mead & White, monograph volume I, plates 43 and 44, Getty Research Institute / Internet Archive `gri_33125006526145`, source TB009-R02. Source-page hashes and recorded `NOT_IN_COPYRIGHT` evidence are preserved. Native geometry derives from Farmyard commit `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`; the inherited provenance chain and unresolved rights limitations remain unchanged. No new donor import occurred.

This is a deliberate tile adaptation. The printed 154 ft facade converts to 46.9392 m; the original game study used 47 m and this edition uses 48 m. Main depth changes from 27 to 28 m, rear projection from 32 to 34 m, and rear shoulder/centre half-widths from 13.25/7.25 to 14/8 m. New bay centres and two-metre opening assemblies align to the wall grid. Paired porch columns retain the original source-derived rhythm, with the neck changed from 1.25 to 1 m and the portico attached at X=±24, Z=14. Their placement is custom ornament, outside the structural wall-run grid. The complete adaptation table is in the manifest. Historical colours, fine sculpture and rear roof/opening details retain the original uncertainties.

The [grid audit sheet](previews/grid-audit.jpg) compares both actual models, overlays the new elevation with all standard levels and compares original/new plan centre-lines. [Front](previews/front-isometric.jpg), [rear](previews/rear-isometric.jpg), [elevation](previews/front-elevation.jpg) and [cutaway](previews/structural-cutaway.jpg) show actual exported meshes. The cutaway clips at Z=14 m, hides ornament and colours floor slabs green; it does not invent a different structural model.

Reproduction uses `art/source/exposition-new-york-tile/build-manifest.mjs`, `export-review.mjs`, `render-review.py --view NAME --spp 24` and `compare-grid.py`. These reuse the existing local Mitsuba/Pillow review environment; no package installation or retained server is needed. Each render has a real 120-second deadline and PID/creation-time receipt in ignored artifacts. Five JPGs are review evidence, outside the public runtime package.

## Checks and integration boundary

`node workbenches/art/check-exposition-new-york-tile.mjs --package` verifies original preservation; native dimensions and geometry arrays; actual even-metre wall endpoints and unscaled cell placements; complete opaque coverage outside apertures; .12 m slab thickness and exact level elevations; complete, nonduplicated one-metre floor coverage; actual empty-room/ceiling rays; door/window/porch rays; four poses; appearance invariance; owned and borrowed disposal; hashes; and nested-path packaged imports/resources. Detailed results and JPG hashes are recorded in [check-results.json](check-results.json) and [offline-review.json](offline-review.json).

Relevant repository checks and the production build must pass before this branch candidate is pushed. CPU previews establish appearance under their recorded settings. In-game WebGL shader/performance acceptance, physical collision, floor/room traversal, fire/collapse behavior, an editor-save adapter and production scene placement remain later coder/architect work. The existing ground-plane module compiler cannot consume this multi-level recipe without an adapter. No gameplay, UI, production wiring or deployment configuration changed. Only the architect can promote the candidate.
