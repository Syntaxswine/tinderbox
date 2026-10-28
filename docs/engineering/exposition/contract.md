# TB-008 shared exterior/civilian contract

Candidate based on master `420266af6b92a4925164cdceda4ef43beb2d6a40`. Coder owns content/compiler/scenario, raw donor extraction, `src/reuse/civilians.js`, simulation/runtime hooks, tests and `provenance/city.json`. Artist owns production art adapters, geometry and skin-slot materials. Architect owns promotion, milestone 02, central provenance index and production default selection. This contract is additive to snapshot v1.

Wall construction now directly calls the unchanged pinned `hybrid-geometry.js::roomBoxes` through `src/reuse/walls.js`; the separate duplicated wall/opening construction formulas were removed. The adapter only maps returned volumes into requested dimensions/placements. The public schema and part IDs below are preserved. See [direct-reuse correction](reuse-correction.md).

## Module data

Entry: `src/content/exterior-kit.js`. Exports `compileModules(input,world)`, `KIT_VERSION`, `MODULE_FORMS`, `DEFAULT_STORY_HEIGHT`, `WALL_STORY_OPTIONS`, `OPENING_CLEARANCE`, `SKIN_IDS`, `SKIN_SLOTS`, `CIVILIAN_PROFILES` and `validateCivilian(actor)`. Fixture: `src/content/exposition.js::EXPOSITION_SCENARIO`, selectable via `createSimulation({scenario:'exposition'})`. Existing street/chase/chain/tiny remain.

`world.modules` is always an array. Module ground-centre `(x,y)` and all dimensions use metres; Three positions are `(x,h,y)`. `heading` is radians from +X toward +Y, restricted to multiples of pi/2 and normalized to 0,pi/2,pi,3pi/2. Positive heading rotates local +X toward ground +Y; art wrapper rotation is Three Y = -heading. Width is local X, depth local Y, height vertical. Do not globally scale characters to match architecture.

```js
{
 id:'court-gate', form:'doorway', x:10,y:9,heading:0,
 width:4,depth:0.3,height:3.2, physicalMaterial:'wood',
 opening:{width:1.4,height:2.3,state:'open'}, // open | closed, static this slice
 skinSlots:{facade:'inherited-plaster',trim:'inherited-cream',
            door:'inherited-wood',roof:'inherited-roof'},
 sourceRefs:['farmyard:hybrid-wall-opening','game:exposition-courtyard-study'],
 version:1, parts:[/* authoritative resolved parts below */],
 colliderIds:['court-gate:pier-left','court-gate:pier-right'], destroyed:false
}
```

Forms: `wall`, `doorway`, `pilaster`, `corner`, `roof-gable`, `roof-hip`. Corner adds `thickness`; roof adds `baseHeight` (>=2.3) and nonempty `supportModuleIds` naming existing solid modules. Roof height is its rise above baseHeight. Gable ridge runs along local X; hip uses the same bounding envelope with slopes on all four sides. Roofs are decorative overhead descriptors; this slice adds no roof walking, climbing, vertical fire or collapse simulation. Gable/hip are game primitives referencing EXPO-P02 plates53/97; their presence is not a claim about any specific 1893 building.

Walls, doorways, pilasters and corners may opt into **one through five stories** with `stories:1|2|3|4|5`. `WALL_STORY_OPTIONS` exports the five frozen presets: 3.2, 6.4, 9.6, 12.8 and 16.0 metres, based on the existing 3.2 m game frontage. These are game dimensions, not historical measurements. Omit `height` to derive it from `stories * storyHeight`; `storyHeight` defaults to `DEFAULT_STORY_HEIGHT=3.2` and can be a positive researched/adapted dimension. When an explicit `height` is also supplied it must agree with that product. Counted modules retain `stories` and resolved `storyHeight` in snapshots so art can arrange floor bands, window rhythms and a top cornice without stretching one-story ornament. Story metadata is for vertical wall forms; roof height remains its rise and roof `baseHeight` should follow its supporting facade height. Existing arbitrary-height modules without story metadata retain their original geometry and snapshot shape.

Every option uses the same unchanged donor builder and the same number/IDs of wall parts. The opening stays ground-level at its supplied clearance: increasing the facade does not stretch the door leaf or scale any character. Upper-story facade details consume the height/metadata as appearance; this count adds no navigable floors or vertical fire model. Ground footprints and physical material remain authoritative, and skin changes remain cosmetic. See [story-option verification](wall-stories.md).

A resolved `parts[]` entry is `{id,moduleId,role,x,y,h,width,depth,height,material,skinSlot,solid,blocksHeat,destroyed}`. Its coordinates and extents are already rotated to world axes; use them directly for rectangular wall/piers/lintel/closed leaf/pilaster/corner pieces. Do not rotate those resolved parts a second time. Roof envelopes are guides for the artist's roof mesh; use source module local dimensions/heading for slopes. Non-solid `roof-envelope` is never a filled gameplay obstruction.

Doorway piers are true separate solids. Lintel bottom is exactly opening.height, and the overhead lintel is non-solid/non-blocking in the existing planar model. A closed door adds `closed-door`, thickness <=0.12 m, with solid/heat-blocking collision; art must visibly render it CLOSED. An open gate has no leaf collision/heat barrier. Minimum **1.40 m clear width / 2.30 m clear height** is an architect-approved game adaptation, not a donor/historical measurement. Roofs/ornament must not reduce it. Skin IDs can be swapped from `SKIN_IDS` without changing physical material or collision. Current placeholders use inherited materials; they are not finished custom skins. Rendering skin must never select burn rules.

Compiler emits module parts and matching ground AABB obstacles once while defining the scenario. Snapshot modules include destruction flags derived from the same intact obstacle IDs. Render only intact solid parts; honor each overhead part's own destruction flag as well as module destruction. Each roof hides when any required support module loses a solid collider. Each lintel hides when either pier is gone. These conservative visibility rules remove unsupported art without applying collapse damage or creating physical debris; every resolved part exposes `destroyed` and must be checked by art. Art must not create new collision from meshes, or mutate descriptors to open a door. No door-interaction command was added. Stable `sourceRefs` distinguish original source recipes from adapted game placements; frontage cites EXPO-P01 scan31 / EXPO-P02 plate43; roof examples cite EXPO-P02 plates53/97. Exact dimensions/positions remain game adaptations, with the source dossier owned by architect/artist.

## Civilian loading

```js
import {loadCivilianKit} from '../../src/reuse/civilians.js';
const kit = await loadCivilianKit({THREE, renderer, assetBaseUrl});
const person = kit.create(actor); // {root,update(actor,worldTime),dispose(),bounds,diagnostics()}
scene.add(person.root);
person.update(actor, timing.worldTime);
person.dispose(); kit.dispose(); // idempotent
```

`assetBaseUrl` is the **AFT assets directory**, e.g. `.../dist/aft/assets/`, and defaults to `CIVILIAN_ASSET_BASE_URL`. Models resolve in its sibling `../tactics/`; normal paint sheets resolve below `characters/lowpoly-proof/`. Every URL remains self-contained in Tinderbox. Missing files or missing/mismatched shared renderer/Three throw a meaningful error; there is no substitute character. The kit owns its source textures and instances. Each instance owns its paint texture clone/projection target/rig/skeleton; it does not dispose the borrowed renderer, shared scene or Three namespace.

Actors must have `{id,species:'horse'|'goat',appearance:'normal',team:'civilian',headgear:'none',equipment:'none',radius:0.62,height:1.7,x,y,heading,moving,hp,travelled}`. Model initial positions/routes use the same metre-based source data. Radius >=0.62 is validated, and civilian spawns use actual collision clearance. `bounds` is `{radius:0.62,height:1.7}`. A 48-phase test samples real skinned walking bounds; 0.62 includes margin over the conservative sampled ground envelope (~0.567 horse /0.560 goat). Dimensions are not resized to fit a door. Factory roots preserve normal species meshes and paint, with no hats/uniforms or visible guns. Pig foreman is excluded because its service cap is authored into the base mesh. No Red Hat cap/uniform/tailored-paint modules are imported.

Motion is distance-driven from `actor.travelled`; it does not move the actor. Coder wrapper maps every donor carry pose to neutral, and hides weapon/mount/hose/grips after every update. Headings convert radians to donor degrees exactly once; wrapper root supplies translation only. World time remains authoritative for NPC movement/powder slowdown; presentation never creates AI, damage or actor travel. `createCivilianRig(species,data)` is exported for real-model headless measurement and is used internally; production consumers use the async kit.

Runtime now calls `createArtScene({THREE,scene,renderer,assetBaseUrl})`; renderer is a borrowed additive argument. Direct artist workbench calls also need their actual renderer. `src/art/index.js` is unchanged by the coder; the artist integrates the kit and module parts there. Production scene selection is unchanged.