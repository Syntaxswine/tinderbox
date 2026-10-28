# Shared exterior/civilian contract

The user's cross-game asset compatibility requirement supersedes the former Tinderbox-specific 3.2m story height and 1.4 x2.3m door enlargement. All new skins and architectural assets use the Animal Factory Tactics 3D / Farmyard Commando scale. Original asset templates retain their dimensions; larger buildings compose native units. Coder owns the content/compiler, raw extraction, adapters and behavior tests. Artist owns skins, production art and previews. Architect owns integration/promotion. See [native scale evidence and handoff](native-scale.md).

## Shared native scale

`src/content/asset-scale.js::ASSET_SCALE` derives dimensions from the unchanged pinned `hybrid-geometry.js::roomBoxes` templates. `hybrid-world.js::DIMENSIONS` is the independent source reference for the same floor spacing.

| Setting | Native world units (1 unit = 1 metre) |
| --- | --- |
| Ground tile / repeated wall width | 1 |
| Wall face height | 2 |
| Wall thickness | 0.16 |
| Slab / floor interval | 0.12 |
| Floor origins | 2.12 apart |
| Door opening / leaf | 1 wide x1.65 high |
| Door leaf thickness | 0.12 |

Preserve mesh/rig/UV layout, pivots, attachment conventions and physical texture density when exporting skins. Layout can move, repeat and quarter-turn assets; it cannot stretch an existing asset. New ornaments/roof forms are separate assets measured in this same metre scale. Do not enlarge original doors or shrink actors to force a fit. The provisional bear remains 0.56m radius and about 2.02m high, so it cannot pass the original single doorway. Native horse/goat bounds also remain unchanged. A larger entrance or character-fit solution needs its own compatible asset/behavior review.

## Module data

Entry `src/content/exterior-kit.js` exports `compileModules(input,world)`, `KIT_VERSION`, `MODULE_FORMS`, `ASSET_SCALE`, `DEFAULT_STORY_HEIGHT`, `WALL_STORY_OPTIONS`, `OPENING_CLEARANCE`, `SKIN_IDS`, `SKIN_SLOTS`, `CIVILIAN_PROFILES`, and `validateCivilian`. Existing source scenarios remain; `exposition` uses native-sized architecture.

Coordinates and dimensions are metres, module centre `(x,y)` is on the ground plane, and Three positions are `(x,h,y)`. Heading is radians from +X toward +Y and is restricted to quarter turns. Resolved parts are already placed/rotated in world coordinates; do not rotate them again. Roof meshes use the source module's local footprint and heading.

```js
{
 id:'native-gate', form:'doorway', x:10,y:9,heading:0,
 width:3,depth:0.16,stories:1,physicalMaterial:'wood',
 opening:{width:1,height:1.65,state:'open'},
 skinSlots:{facade:'inherited-plaster',trim:'inherited-cream',
            door:'inherited-wood',roof:'inherited-roof'},
 sourceRefs:['farmyard:hybrid-wall-opening','game:frontage-fragment']
 // Resolved: height:2, storyHeight:2, floorSpacing:2.12, parts, colliderIds
}
```

`wall`, `doorway`, `pilaster` and `corner` assemble one-metre wall units. Width must be whole metres. Wall/door/pilaster depth is exactly 0.16m; corners use whole-metre legs and 0.16m thickness. A doorway has the unchanged 1 x1.65m opening and equal whole-unit piers (total width 3,5,7,... metres). An open frame has no leaf; a closed frame adds the original 1 x1.65 x0.12m leaf. The 1 x0.35 x0.16m lintel is unchanged and stays overhead.

Use `stories:1..5` with height omitted, or spread an entry from frozen `WALL_STORY_OPTIONS`. `DEFAULT_STORY_HEIGHT=2` is the native wall-face height. Floor origins are at `level * ASSET_SCALE.floorSpacing`, so facade top is `2 + (stories-1)*2.12`: **2, 4.12, 6.24, 8.36, 10.48m**. Snapshots retain `stories`, `storyHeight:2`, and `floorSpacing:2.12`. `storyHeight` and `floorSpacing` are fixed compatibility values. A supplied explicit height must match one of the five native assemblies. The previous arbitrary wall resizing and custom story-height override are rejected.

Every upper wall remains a native 1 x2 x0.16m template. A new `tinderbox:facade-slab-band-1m` trim piece fills each 0.12m interval at the facade edge; it uses the native one-metre span and wall thickness and does not stretch a donor slab. Upper facade panels/bands are presentation in this ground-plane simulation. They add no ground blockers, upper-floor navigation, vertical fire or collapse physics.

Roof forms `roof-gable` / `roof-hip` remain new primitive assets in native metre units. `height` is the rise and `baseHeight` is the supporting facade top, at least 2m. Require nonempty `supportModuleIds` naming existing solid modules. Gable ridge is local X; hip slopes on four sides. Their reference is EXPO-P02 plates53/97, with retained game adaptations documented by art.

Resolved parts are `{id,moduleId,role,x,y,h,width,depth,height,material,skinSlot,solid,blocksHeat,destroyed}`, with wall-part `sourceAssetId` and optional `supportPartIds`. Ground part roles preserve the first `wall`/`pier-left`/`pier-right`/`lintel`/`closed-door`/`leg-x`/`leg-y` names. Repeated ground tiles append `-1`, `-2`, etc.; upper walls use `story-<level>:<role>` and interval bands use `floor-<level>:<role>`. Part IDs cannot alias any other module's parts.

Art consumes resolved dimensions and flags. Ground solid parts emit matching obstacles. A cosmetic part's `supportPartIds` makes it hide if a required ground support is gone; each roof hides if a required support module loses a collider. Do not infer replacement collision or change a door state in art. Skin slots `facade/trim/door/roof` are appearance only; physical `wood/masonry/steel`, thermal rules, clocks and collision are separate. `sourceRefs` retain the original builder, original plan/photo evidence and game-layout adaptations.

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