# TB-002: Farmyard runtime reuse audit

Status: coder candidate for architect review. Recorded 2026-10-27. This audit imports no runtime or assets and approves no new gameplay rules.

## Recommendation

Keep the browser ES-module/Three.js direction. Reuse the painted UI and compact rendering/equipment libraries behind Tinderbox adapters, then implement a small validation scene with its own state. Do not adopt either donor application wholesale. The solo app has useful continuous movement and UI, but its fire is immediate character damage with a tracer. The inherited designer/playtest runtime connects persistent burning, fuel explosions and barrel chains, but carries a substantially larger grid, turn, map and campaign dependency graph.

The bear is a required Tinderbox protagonist. The inspected character catalog and painted-fire support list contain no bear; a bear rig/profile and muzzle contract need an artist/coder adaptation. The donor's six quickplay animals are reference content, not Tinderbox's character requirements. Gameplay pace, target devices, input bindings, fire tuning and drug mechanics remain open.

## Evidence and scope

The read-only donor is `C:/Users/baals/Documents/ChatGPT/Tactical Animal`. All baseline source references below resolve against **`30a3b8cae5f36bb0c1df3685b7fba16f701c2083`**, the locally cached `origin/main` recorded in `docs/source-baseline.json`. No fetch or donor checkout mutation was performed. This is not a fresh remote-state claim.

The source abbreviations in this document are exact path prefixes at that commit:

| Prefix | Repository-relative path |
| --- | --- |
| `R/` | Repository root |
| `S/` | `sites/tactical-animal/dist/` |
| `A/` | `sites/tactical-animal/dist/aft/tactics/` |
| `D/` | `sites/tactical-animal/dist/designer/a20b343a0234/tactics/` |
| `T/` | `sites/tactical-animal/tests/` |
| `U/` | `sites/tactical-animal/tools/` |

A suffix such as `S/solo-game.js:155-174` is a one-based line reference in the pinned blob, not in the donor's working copy. Functions are also named where a span contains several responsibilities.

`R/sites/tactical-animal/aft-provenance.json` and `R/sites/tactical-animal/designer-provenance.json` both name inherited AFT revision **`a20b343a0234b5d8b365a4e1668961ca1bf37653`**. They contain 1,181 and 1,318 file records respectively. That original AFT commit object is unavailable in this donor repository (`git cat-file -t` failed); inherited evidence comes from the installed pinned Farmyard blobs and their manifests. This audit does not independently attest the missing original repository tree.

The separate candidate **`ecb454a4b7513ca2ffa04bf1dac70ca6d1d909cd`** is examined only for comparison. It has not been approved for Tinderbox reuse. Later donor work is outside this audit.

## Entry points and connected behavior

| Area | Exact entry points and source evidence | Connection and adaptation cost |
| --- | --- | --- |
| Solo launch | `S/index.html`; `S/game.html:10-15`, `S/game.html:62`; `S/app.js:1-9` | Title links to solo game and separate designer. Game loads `app.js`, six CSS sheets and the UI assets. `app.js` owns DOM, input, menus, saves, frame loop and simulation/view coordination. |
| Solo renderer/camera | `S/field-view.js:20-42`, `S/field-view.js:163-182`; `S/grenade-controls.js` exports `FIELD_CAMERA`, `screenToGround`, `grenadeCameraFrame` | WebGLRenderer with sRGB output, capped pixel ratio 1.75, orthographic camera, DaylightRig and 1024 shadow map. Ground positions `(x,y)` become Three `(x,0,y)`; vertical is Three `y`. Fixed oblique framing, follow, pinch/wheel zoom, pointer pan and ray picking are connected. Camera helpers are reusable; FieldView itself imports solo missions/rules. |
| Solo UI and input | `S/app.js:158-169`, `S/app.js:348-388`; `S/mobile-controls.js:19-44`; `S/guard-alert.js`; `A/battle-control-icons.js` | Joystick, keyboard, tap picking, hold menus, stance/movement modes, end turn, grenade aim, contact eye, inventory and options are connected. Frame loop drives `tick` and view sync; blur/visibility/pointer-cancel clear held input. The existing phone layout is a donor choice, not an approved Tinderbox device target. |
| UI materials | `S/style.css`, `S/touch-controls.css`, `S/original-art.css`, `S/industrial-switches.css:28`, `S/field-hardware.css`, `S/map-frame.css:6`; `S/weapon-artwork.js:1-26` | Painted switch atlas, map nine-slice and SVG symbols are live. Keep `.switch-legend` grouping, states, crop frames, reduced-motion behavior and readable targets. Weapon art resolves relative to the module and carries the release query. `S/button-study.html` is a separate study, not the live game entry. |
| Character/equipment | `S/field-view.js:120-136`, `S/field-view.js:165-169`; `A/animal-motion-catalog.js:1-41`; `A/animal-motion-paint.js`; `A/weapon-models.js:1-20`; `A/worker-locomotion.js`, `A/battle-posture.js` | Catalog factory plus fetched mesh JSON, painted texture, weapon builder, locomotion and stance rig are connected. All catalog factories are statically imported, even though mesh JSON is fetched for the selected species. Preserve authored dimensions and equipment anchors. No bear profile exists. |
| Solo simulation | `S/solo-game.js:1-9`, `S/solo-game.js:35-44`, `S/solo-game.js:86-97`, `S/solo-game.js:153-180` | Continuous coordinates, collision, visibility, navigation, AP/stamina, guards, ammunition and mission interactions are connected. This is a separate simulation from `D/core/engine.js`; sharing weapon numbers does not share gameplay. |
| Solo fire | `A/solo-weapon-data.js`; `S/solo-game.js:155-174`; `S/field-view.js:137-160` | Immediate range/angle damage to living units; visual is an orange line for an incendiary shot. No connected persistent-burning, environmental-barrel, fuel-pack or barrel-chain rules in this solo path. Details below. |
| Designer/playtest launch | `D/editor-playtest.js:11-16`; `D/battle-map.js:7-13`; `D/battle-3d.js:43-46`, `D/battle-3d.js:136` | Editor validates a map, opens `battle-3d.html` and hands JSON to the same-origin opener/token protocol. `loadBattleMap` receives it; battle boot uses `createGame` and `BattleRenderer`. These are the inherited AFT map format and runtime, not the two solo operations. |
| Designer fire/barrels | `D/core/engine.js:19-23`, `D/core/engine.js:320-338`, `D/core/engine.js:364-403`, `D/core/engine.js:446-483`; `D/fuel-blast.js:15-44` | Ground-aimed flame template, character incineration, thin-structure damage, explosive barrels, fuel-pack blasts, fire cells, panic and chain receipts are connected through attack/turn paths. They are not merely catalog files, but no browser execution was performed for this audit. |
| Designer fire presentation | `D/battle-renderer.js:30-32`, `D/battle-renderer.js:65-68`, `D/battle-renderer.js:169-179`, `D/battle-renderer.js:218`; `D/battle-combat.js:24-50`; `D/battle-fire.js:104-137`; `D/battle-tank-effects.js:38-85` | Renderer creates and consumes BattleFlameEffects, BattleFire and BattleTankEffects. Painted operator/burn animation has species/stance restrictions; generic flame fan is a fallback. Tank/barrel burst and persistent ground-fire presentation consume committed rules state and receipts. |
| Build/check | `R/package.json`; `U/build.mjs`, `U/check.mjs`, `U/serve.mjs` | ES modules, Node >=22, no package dependency installation. These commands belong to Farmyard. Tinderbox currently has no launch/build/test command. |

## Dependency closures

Counts below include the seed and each distinct `.js` file reached through literal relative `import`, `export ... from`, and literal dynamic-import specifiers. They were calculated from exact Git blobs using the donor checker's reference-matching approach, with POSIX relative-path resolution and cycle deduplication. Every reached file was read successfully. These are static reference closures: conditional imports count even if their branch is never executed. CSS, HTML, JSON, textures, worker URLs and computed imports are outside the counts and need explicit asset closure handling.

| Seed | JS files | Implication |
| --- | ---: | --- |
| `S/app.js` | 114 | 13 root solo modules plus 101 inherited modules; no designer runtime. Barrel helpers are reachable through rendering dependencies without barrel gameplay being connected. |
| `S/field-view.js` | 109 | Imports the whole animal catalog, environment and solo mission/rule helpers. Copying this class is not a minimal camera extraction. |
| `S/solo-game.js` | 9 | Compact JavaScript closure, but substantial behavioral coupling. |
| `S/mobile-controls.js` / `S/grenade-controls.js` | 1 each | Dependency-free helper modules, though grenade helper semantics are specific to aiming/viewport behavior. |
| `S/weapon-artwork.js` | 2 | Adapter plus `A/weapon-icons.js`; images and crop definitions still matter. |
| `A/weapon-models.js` | 6 | Good equipment-library boundary. |
| `A/daylight-rig.js` | 6 | Lighting imports a donor clock/movement-timing definition; provide explicit scene-time input. |
| `A/animal-motion-catalog.js` | 20 | All 12 factories and shared Three/rig helpers, before mesh or paint data. |
| `A/battle-environment.js` | 50 | Cargo renderer reaches visibility, cliffs and props; use the cargo library directly for a small scene. |
| `A/painted-cargo.js` | 4 | Smallest useful crate/drum rendering boundary. |
| `D/core/engine.js` | 117 | Pulls map validation, inventory, social, progression, combat, environment and traversal rules. |
| `D/battle-3d.js` | 392 | Entire designer playtest composition, including conditional review modules; too broad for the first slice. |
| `D/flame-cone.js` | 85 | A short cone module reaches the large projectile/map graph. |
| `D/fuel-blast.js` | 89 | Hooks avoid a direct engine import, but structural/strategic-site/map dependencies remain large. |
| `D/explosive-barrels.js` | 2 | Barrel identity, cylinder intersection and rules plus tower-height helper. |
| `D/scenery-collision.js` | 1 | Dependency-free bounds/triangle/BVH query math; requires precomputed geometry data from elsewhere. |
| `D/battle-flame-effects.js` | 48 | Generic fan effects import shot-path/visibility helpers. |
| `D/battle-tank-effects.js` | 91 | Controller depends on the full renderer contract, visibility, terrain elevation, receipt timing and cargo. |
| `D/painted-fire-effects.js` | 5 | Compact low-level painted effect builder plus fire state/zones and Three. |
| `D/painted-blast-effects.js` | 6 | Compact low-level blast/fire builder; textures are additional dependencies. |

The complete nine-file simulation closure is `S/solo-game.js`, `S/interactions.js`, `S/missions.js`, `S/world-dimensions.js`, `A/solo-weapon-data.js`, `A/character-stats.js`, `A/quickplay-presets.js`, `A/core/perception.js`, and `A/aim-levels.js`. The five inherited files introduce no dependencies outside this set; quickplay-presets imports character-stats, while the other four are leaves.

Compact rendering closures, with paths relative to their selected tactics directory:

| Library | Complete JS closure |
| --- | --- |
| Weapon models | `weapon-models.js`, `one-handed.js`, `grenade-model.js`, `horse-rifle.js`, `vendor/three.module.js`, `vendor/three.core.js` |
| Daylight | `daylight-rig.js`, `daylight.js`, `game-clock.js`, `movement-timing.js`, `vendor/three.module.js`, `vendor/three.core.js` |
| Cargo | `painted-cargo.js`, `painted-environment-scene.js`, `vendor/three.module.js`, `vendor/three.core.js` |
| Painted blast | `painted-blast-effects.js`, `painted-fire-effects.js`, `painted-fire-state.js`, `painted-fire-zones.js`, `vendor/three.module.js`, `vendor/three.core.js` |

Important transitive edges explain the large closures:

- `S/field-view.js` -> `S/original-art.js` -> `A/battle-environment.js` -> cargo, visibility, hybrid-world, cliff support/ramps and explosive-barrel helpers. It also imports `S/solo-game.js` and mission helpers for actors, pins and minimap. The 13 root modules reached by `S/app.js` are app, field-view, grenade-controls, guard-alert, interaction-view, interactions, missions, mobile-controls, operation-storage, original-art, solo-game, weapon-artwork and world-dimensions.
- `D/flame-cone.js` -> `D/core/projectiles.js`, `D/core/maps.js`, `D/tower-geometry.js`, `D/explosive-barrels.js`. Projectiles -> scenery rules/catalog, foliage, structure health, strategic sites, ballistics, ramps, cliffs, tower geometry, map and prop definitions. `D/core/maps.js:1-29` imports authoring validation, dialogue/tutorial, foliage, scenery placement, climbing, canopy, roof, terrain and sector helpers; it is not a small bounds accessor.
- `D/fuel-blast.js` -> map-geometry-cache, strategic-site-damage, core/maps, tower-geometry, explosive-barrels and structure-damage. Structure damage -> grenade-geometry -> map/world collision; strategic-site-damage -> projectiles and flame-cone, creating cycles. Resolve visited modules by path rather than recursively copying without a visited set.
- `D/battle-tank-effects.js` -> tank-blast-effects -> painted-blast-effects -> painted-fire-effects/state/zones, plus battle-combat receipt timing, visibility, height helpers, battle-environment and barrel-blast-motion. Reusing only the low-level effect builder removes the controller's game-state assumptions; it does not bring explosion gameplay.

Non-module closure that must accompany an eventual extraction:

| Consumer | Files/data that static import counting misses |
| --- | --- |
| Live UI | `S/assets/ui/industrial-switches/switch-skins-v2.webp`, `S/assets/ui/industrial-switches/map-frame-v1.webp`, `S/assets/ui/industrial-switches/symbols.svg`, `S/assets/ui/industrial-switches/manifest.json`; CSS relative URL bases and HTML SVG fragment references. |
| Weapon images | `A/weapon-icons.js` points into `S/aft/assets/equipment/painted-ui/`; retain selected PNGs and their `WEAPON_FRAMES` crop metadata. |
| Character rigs | Catalog `profile.file` JSON under `S/aft/tactics/`, selected paint/clothing/eye textures under `S/aft/assets/characters/`, plus motion/paint configuration. `fetch(new URL(..., import.meta.url))` must resolve inside Tinderbox. A bear needs a deliberately compatible profile, not an arbitrary species rename. |
| Cargo/materials | `S/aft/assets/environment/painted-study/material-atlas-v2.png` (`A/painted-environment-scene.js:2`) and `S/aft/assets/environment/painted-study/cargo-materials-v1.png` (`A/painted-cargo.js:3`). Cargo creates label canvases at runtime. Drum geometry exports radius `.328` and height `.8`. |
| Solo environment adapter | Its surface table adds `S/aft/assets/environment/hybrid-surfaces/brick-factory-v1.png`, `S/aft/assets/environment/ground-concrete.png`, `S/aft/assets/environment/ground-gravel.png`, `S/aft/assets/environment/ground-grass.png`; matching wall geometry uses `S/world-dimensions.js`. |
| Painted fire/blast | Under `S/designer/a20b343a0234/assets/effects/painted-fire/`: `flame-atlas-v1.png`, `smoke-atlas-v1.png`, `ash-paint-v1.png`, `tank-burst-atlas-v1.png`. Fire builder loads the first three; blast loader loads burst, flame and smoke. Preserve loader base paths or resolve explicit module-relative URLs. |
| Full designer | Editor HTML/CSS, preset/map JSON, computed asset catalogs, mesh JSON, worker paths and conditional review assets would also be needed. The 392-JS count is not a deployable designer package. Use its manifest and snapshot tool to audit the wider closure only if a later brief actually requests it. |

## Fire, barrels and fuel: actual rules

### Solo game at the approved source baseline

`S/app.js:169` fires through `Core.attack` against a selected living opponent. `S/solo-game.js:153` checks enemy visibility, wall clearance, range, ammunition and combat AP. `attack` validates turn ownership, stops movement, enters contact as needed, charges AP/ammo and points the shooter at that opponent.

For `w.incendiary`, `S/solo-game.js:164-166` examines every other living unit. A unit is hit when its distance is at most the weapon range, its heading offset is strictly less than 24 degrees, and `lineClear` passes. Damage is `w.damage * max(.25, 1 - distance / 14)`, then `hurt` applies the unit's resistance. This cone pass does not roll the ordinary displayed hit chance. The weapon data defines range 10, base damage 180, cost 6 and magazine/fuel count 4; these are donor tuning values, not accepted Tinderbox balancing.

`S/field-view.js:137-160` renders the event as a temporary line, colored orange for incendiary shots. It does not instantiate the inherited fire, burn or fuel-blast controllers. `tick` and `endTurn` have no persistent fire progression. The solo state has no initialized environmental prop/barrel collection or burn scheduler. `S/original-art.js:86-88` and `S/original-art.js:111` explicitly pass `props:[]` into the cargo renderer, while `S/solo-game.js:47-61` builds collision from walls, crates, chests and doors. Therefore a barrel module in the static render closure, or barrel art on disk, does not imply a barrel can be ignited or detonated in a solo mission.

### Inherited designer/playtest runtime in the same baseline

The call chain is editor launch -> `D/battle-map.js` -> `D/battle-3d.js` -> `D/core/engine.js`, with `D/battle-renderer.js` consuming the result. `D/battle-3d.js` imports FlamePlanner and barrel targeting, connects its confirm callback to `attackGround`, and picks barrels through the renderer. This establishes a connected code path; it does not establish browser/performance correctness from this static audit.

| Behavior | Connected implementation and limits |
| --- | --- |
| Aimed spray | `D/flame-planner.js` provides place/confirm/cancel UI. `D/flame-cone.js:18-25` records 37 scenery-clipped rays for a circular-mouth cone with range 10 and mouth radius 3 at current tuning. `flamePreview` validates current level, discovered terrain, fuel and optional AP charges. This is a different shape and control path from the solo angular sector. |
| Victim obstruction | `D/flame-cone.js:27-38` uses the same victims for preview and execution, excludes the shooter and absent/dead characters, checks height and shape, and traces torso/head/legs. It clears units from the trace world so characters do not shield one another; scenery still blocks the spray. Low cover can protect a prone body while exposing a standing head. |
| Direct flame damage | `D/core/engine.js:447-468` assigns each flame victim damage `max(1, current HP)`, bypasses resistance for that flame impact, commits fatal damage and records ash. Direct spray is lethal contact here, not the solo distance-falloff model and not simply a delayed burn timer. `ignite` ignores a character already killed by this pass. |
| Persistent character burning | `D/core/engine.js:364-389` sets three burning turns, zero AP and forced standing; panic chooses up to three legal same-level neighbor steps. A completed fire round decrements the counter; expiry kills the survivor and records ash. `enterFire` ignites characters stepping onto fire cells. Normal control/AI excludes burning units. This is tightly tied to turn/round settlement, including the encounter time-settlement path. |
| Structures | `D/structure-flame.js:1-7` damages eligible thin/timber surfaces in the accepted cone through structure-damage planning/commit. It is one attack, not per-frame heat damage. Engine applies strategic-site flame damage and settles structural collapse/falls. Do not advertise general combustible-material spread from this path. |
| Explosive barrel identity | `D/explosive-barrels.js:3-10` uses kind `barrel-explosive`, coordinate-derived ID, 1x1 solid gameplay footprint and cover 25. Ordinary `barrel-single`/`barrels-cluster` are distinct non-explosive prop kinds in `D/core/environment.js`. A flammable-looking drum does not automatically detonate. |
| Drum collision/targeting | Barrel intersection is a cylinder with radius `.328`, height `.8` (`D/explosive-barrels.js:14-26`), matching `A/painted-cargo.js:29`. `D/barrel-targeting.js` checks barrel presence, knowledge/line of fire, weapon/aim, ammo and AP. Projectile traces return the actual barrel prop ID. |
| Detonation triggers | `D/core/engine.js:448-457` combines projectile/pellet prop hits, explosive-blast barrel hits and `flameBarrels`. `D/flame-cone.js:54-60` requires an in-shape barrel whose cylinder is actually reached by the scene trace. No generic sprite overlap is used. |
| Fuel blast | `D/fuel-blast.js:15-28` kills present units in a same-level 3x3 center with compatible base height, ignites units within a five-unit same-level 3D radius, creates/refreshes dry non-water/non-void fire cells for three rounds, and damages structures/strategic sites. A tower-mounted source skips ground-cell creation. |
| Occlusion caveat | The fuel-radius helper, central-victim selection, fire-cell loop and next-barrel queue have no wall line-of-sight test (`D/fuel-blast.js:9`, `D/fuel-blast.js:18-25`, `D/fuel-blast.js:42`). Structural damage uses its own planning queries. Do not promise the solo grenade's wall-protected damage footprint for fuel blasts or barrel chains; Tinderbox must explicitly choose this behavior. |
| Barrel chains | `D/fuel-blast.js:33-44` removes each barrel before applying its blast and queuing remaining barrels in fuel reach. Repeated IDs are harmless after removal, and geometry is invalidated. This supports exactly-once barrel chains, including overlapping pellets/blasts. Coordinate IDs assume unique grid placements; continuous Tinderbox placement needs stable object identity and an explicit coordinate adapter. |
| Fuel-pack rupture | `D/core/engine.js:75-78` permits a fueled carried flamethrower to rupture: 25% torso hit, or 90% weapon-zone hit when equipped. Attack commits the random check; `explodeTanks` empties/removes the weapon, changes equipped weapon to hands if needed and calls the shared fuel blast (`D/core/engine.js:392-398`). The impact path also queues nearby barrels (`D/core/engine.js:466-468`). The fuel-radius rule alone does not establish automatic tank-to-tank cascades. |
| Persistence and visual receipts | Rules own `s.fires`, `burningTurns`, destroyed props, casualties and fireAnimation receipts. Renderer observes each receipt sequence and reconstructs visible persistent burns/fire from state. `D/encounter-save.js:58-64` clears transient attack/animation queues on capture/restore. Effects never become the authority for damage or repeat a blast on resume. |

The inherited sprite presentation also imports `D/flame-nozzles.js` and `D/flamethrower-art.js` through `D/hybrid-renderer.js:19-23`. These are sprite-pixel nozzle landmarks and weapon overlay helpers, not fire/barrel simulation. Their recorded species/pose assets do not provide a bear rig or a Three.js muzzle adapter for Tinderbox.

There is no established general fire-spread ecology in these inspected paths. Fuel blasts create temporary cells; movement can ignite characters; direct flame can damage selected structures or trigger barrels. Continuous heat, fuel consumption over time, arbitrary material ignition/spread and player drug effects would be new Tinderbox decisions.

### Newer unapproved flamethrower candidate

At **`ecb454a4b7513ca2ffa04bf1dac70ca6d1d909cd`**, the donor adds these solo modules relative to the approved baseline: `flame-aim-view.js`, `flame-controls.js`, `flame-effects.js`, `flame-event.js`, and `flame-pose.js`, all under `sites/tactical-animal/dist/`. The exact comparison changes 19 files. It adds joystick directional aim, preview/confirm flow, recorded cone/impact events, muzzle/pose integration and painted jet playback with bounded visual queues, with accompanying tests.

The candidate's `solo-game.js` adds `previewFlame` and `fireFlame`, while its `resolveFlame` retains the solo immediate cone/falloff/resistance rules. The reviewed diff does not add the designer's `s.fires`, persistent character burn/round rules, fuel tanks or barrel queue. Painted jet animation is not evidence of those systems. Its tests were read as evidence of intended scope, not executed, and the candidate remains outside the import recommendation until separately approved and checked.

## Collision, state and application coupling

| Boundary | Donor assumption | Tinderbox implication |
| --- | --- | --- |
| Continuous solo world | `S/solo-game.js:47-69`, `S/solo-game.js:90-94`: radius `.23`, swept increments <= `.07`, path samples <= `.1`, fixed 40x30 map, interior playable limits, wall/crate boxes and unit discs. Visibility uses rounded raster keys. | Reuse specific geometry/navigation patterns through scene geometry queries; remove mission dimensions and AP/stamina policy from the query layer. Preserve accepted-displacement accounting if AP is later chosen. |
| Geometry/render agreement | `S/world-dimensions.js:3`: wall height 2, thickness `.16`, length `1.12`; shared by rendering and grenade obstruction. Doors invalidate cached geometry and routes through the interaction system. | One authoritative geometry/footprint definition must feed render, movement, aim preview and damage. Camera wall fading must not change collision. |
| Solo attacks/interaction | `canControl`, `combatCosts`, player/enemy phases, contact/visibility, slots/pack/ammo, bodies, door/chest loot and objectives are bound together. | Copying simulation code silently accepts a turn economy, inventory schema and mission progression. Isolate command validation, geometry and events before choosing product rules. |
| Designer collision | `D/core/projectiles.js:1-14` / `traceProjectile`; `D/core/maps.js`; `D/scenery-rules.js` -> geometry data and `D/scenery-collision.js`; barrel-cylinder queries; tower/roof/cliff heights. | Triangle/BVH math is a useful leaf, not a complete collision system. Geometry builders, coordinate transforms and invalidation must agree. Grid levels/height spacing cannot be dropped into continuous solo coordinates unchanged. |
| Designer state | `createGame`, grid maps/upper layers, props, units, fog Sets, casualty/loot, queues, contacts, RNG seed, clocks, rules/social/progression and map geometry tracking. | Fire/fuel functions accept an engine-shaped state. Their small API does not imply a small state contract. Use narrow adapters for world queries, victims, structures, ignition and emitted receipts. |
| Turns and time | Solo moves continuously in exploration, switches to player/guard turns on contact and spends movement AP by distance. Designer panic and ground-fire expiry run through end-turn/new-round/time settlement. | Do not choose real-time or turn-based Tinderbox by importing a timer. Specify a Tinderbox simulation time contract before persistent fire; presentation time must remain separate. |
| Missions | `S/missions.js`, `S/interactions.js`, `S/operation-storage.js` and app menus assume The Night Ledger/Short Measure, first-shift completion and extraction. Designer map JSON belongs to AFT playtest. | Reuse visual/UI components and generic validation patterns without importing those objectives, campaign completion gates or incompatible map/save formats as Tinderbox defaults. |
| Bear rig | Catalog, stance/locomotion, painted burn support and weapon grip/muzzle assumptions target the named inherited species. | Artist defines bear scale/skeleton/texture/profile; coder validates locomotion, visible weapon/muzzle and hit shape. No bear support is verified by the existing fire-support predicates. |

## Storage and failure handling

`S/operation-storage.js:3-6` uses `tactical-animal-operation-v2`, `tactical-animal-operation-v3:` plus mission ID, `tactical-animal-first-shift-v1`, and legacy `tactical-animal-build-v1`. Its API accepts a storage backend and serializer/normalizer callbacks, but imports the donor mission registry and writes both current and legacy slots. Reuse backend injection and error handling patterns, not these keys or migrations.

`S/solo-game.js:190-200` serializes Sets explicitly and validates `solo.version === 2`, exactly one squad unit, the 40x30 map, mission IDs/objectives/clues and unit numeric fields. This is a Farmyard schema. Tinderbox should have an explicit own-game/version envelope and its own validation; old Farmyard saves should not be probed automatically.

`S/app.js:25-31` defers access to the localStorage getter inside handled reads/writes and distinguishes quota/blocked writes. Preparation failure is handled separately from readable active saves (`S/app.js:55-57`). Actions, periodic play and lifecycle events trigger saves. Preserve temporary play when storage fails and avoid hiding an otherwise readable resume because an unrelated preference write failed.

The inherited designer uses IndexedDB `farmyard-commando-designer-playtests-v1` (`D/save-store.js:3-4`) and localStorage settings `farmyard-commando-designer:options:v1` (`D/settings-3d.js:2-6`). Encounter saves use AFT format/version and extensive map/inventory validation. These must remain isolated even when two applications share an origin.

Proposed Tinderbox-only examples are `tinderbox:settings:v1` and `tinderbox:save:v1:<slot>`, with a separate database name if IndexedDB is later needed. Exact names and schema are implementation choices for the next brief. A technical scene should initially use memory/reset; if save verification is requested, isolate its own test slot. No donor keys, campaign migration, map-folder handles or hosting configuration should be carried over implicitly.

## Smallest recommended extraction

This is a proposed staged implementation boundary for architect approval; no files are imported here.

1. **Presentation slice.** Create a Tinderbox scene shell around one pinned vendored Three pair and its license. Adapt orthographic framing, resizing, follow/picking and disposal from FieldView, rather than importing FieldView's missions and simulation. Reuse DaylightRig with explicit scene time, `weapon-models` and the four-file cargo closure; select the smallest textures and UI skin closure. Keep one Three module instance across reused modules. Artist supplies the bear profile/rig contract; an interim technical stand-in must be explicitly labeled and must not be presented as completed bear art.
2. **Own state and commands.** Define scene objects with stable IDs, pose/footprint, health/combustion fields only as needed, and authoritative geometry queries. Commands validate aim/range/resource/state once, then emit immutable resolved events. View consumes events and state; render frames, replay, reduced motion and asset-loading latency cannot change outcomes. Reuse the two-file barrel cylinder/identity library only with a deliberate identity/grid-height adaptation.
3. **Fire and explosion adapter.** Reuse reviewed cone intersection, obstruction and remove-before-enqueue ideas with explicit world-query/damage/ignite/structure hooks. `flame-cone` (85) and `fuel-blast` (89) are reference algorithms, not drop-in leaves. A scoped attributed adaptation can avoid importing all map validators, sectors, social/inventory and traversal. Record precisely which functions/logic changed. Before implementing, architect chooses cone shape, damage, cover protection, persistence clock and chain rules. Start with a one-shot command; only implement ongoing burning if the brief specifies it.
4. **Effect slice.** Prefer the compact painted-fire/blast builder closure over `battle-tank-effects` or `battle-3d`. Supply the accepted scene cone/fires and visible cells, material/asset loaders, camera and committed receipts through a Tinderbox controller. Preserve visibility clipping, bounded effects and explicit texture/material/geometry disposal. Add muzzle/rig adaptation for the bear. The unapproved solo flamethrower branch is an optional later review, not a hidden dependency.
5. **Local delivery and provenance.** Stage a complete selected import closure wholly inside Tinderbox, preserving relative asset resolution or recording deliberate rewrites. Keep unmodified upstream modules separate from Tinderbox adapters. A proposed layout is `vendor/farmyard/<pin>/` for byte-preserved reusable modules/assets and `src/` for own state/adapters, with a provenance manifest under `docs/` or `vendor/`. Store Farmyard original path, exact commit, SHA-256, byte length, inherited AFT pin/source hash, installed path/hash, dependencies, license/rights status and adaptation rationale. Do not leave runtime imports into a sibling checkout or a moving Git ref. Keep deployment/account automation out of this slice.

Keeping the full 114-module solo app as a reference snapshot would preserve more existing behavior, but would also bring authored missions, animal selection, combat AP and save assumptions. The 392-module designer composition carries still more features. Neither is the smallest validation-scene extraction.

## Proposed first validation scene

This brief validates reuse and contracts. It does not settle game pacing, final devices/controls, campaign structure or drug mechanics.

| Fixture or action | Proposed acceptance evidence |
| --- | --- |
| Bear and inherited materials | One artist-approved bear rig/profile, inherited flamethrower, painted controls and one small orthographic yard. Check silhouette, grip, real muzzle position, draw order and scale at the selected review viewport. If the bear is unavailable, report that acceptance item as incomplete. |
| Shared footprints | One wall, one crate, one ordinary drum and three explosive drums. Drum cylinder dimensions and rendered shell agree; walls/crates have matching movement/aim/damage shapes. Ordinary drum and explosive kind remain distinct. |
| Cone boundary and cover | Fixed open, edge-of-cone, behind-wall and low-cover targets. Preview and command use the same resolved geometry. Assert target outcomes from the chosen rule, including whether prone/standing differs. Test out-of-range, empty fuel, cancelled aim and invalid commands spend nothing. |
| Single detonation and chain | One drum reached directly, a second within the accepted chain radius and a third outside. Assert each eligible drum is removed and emits exactly one event despite repeated hit IDs or overlapping hits. Specify wall protection and elevation before writing expectations. Chain behavior is proposed; its exact gameplay remains an architect choice. |
| Persistent burning, if approved | Specify simulation time/round semantics, expiry, entry ignition and save/load behavior. Assert state changes once at simulation boundaries; pausing, slow frames, reduced motion and reloading never rerun damage or duplicate bursts. Do not treat a painted flame as this test passing. |
| Input and storage | Exercise whichever pointer/keyboard/touch paths the next brief selects, including cancellation/focus loss and menu capture. Verify explicit disposal on scene reset. If saves are included, use only Tinderbox keys and test denied/quota writes while readable data remains intact. |
| Self-contained import | Launch from Tinderbox with the donor path unavailable; all chosen JS/CSS/JSON/texture URLs resolve locally, including under a nested static-host base path. Confirm selected-file hashes, provenance and license files. |

New scene code, tests, assets and any preview server require the subsequent implementation assignment. No scene or runtime acceptance is claimed by this document.

## Provenance and license checkpoint

Selected pinned blobs were hashed from raw Git bytes and compared with their manifest SHA-256 and byte counts. All 13 comparisons passed (five AFT records and eight designer records). Designer `sourceSha256` equals the installed hash for these eight samples.

| Manifest/path | SHA-256 | Bytes |
| --- | --- | ---: |
| AFT `tactics/weapon-models.js` | `9827dacd81d430a6f92123ce9592d7f79c73e4e707462287a49abcb8529933a3` | 19315 |
| AFT `tactics/explosive-barrels.js` | `7e012463105901dfc19b82d28794444f5c45099774b54eaf819393d177fe9e45` | 1859 |
| AFT `tactics/battle-flame-effects.js` | `e47c034ba4a145a9d6f41db0319301ff4d013fd70b4ed0b30107f62577308b24` | 3509 |
| AFT `tactics/vendor/THREE-LICENSE.txt` | `df2a91696186fe58c92518a25d48bc59c8ee2edc7cac9ca6d19a5a0d599a2a05` | 1102 |
| AFT `tactics/solo-weapon-data.js` | `d9de4d8cde50262e1889a4e19a457da1a39e32e2eb21b8e97d38fa097ae93bb5` | 1757 |
| Designer `tactics/battle-flame-effects.js` | `e47c034ba4a145a9d6f41db0319301ff4d013fd70b4ed0b30107f62577308b24` | 3509 |
| Designer `tactics/core/engine.js` | `6c05dd9a65999e0914650d6b8ffdd7edacb9fa4712f6f7ad8d05fe9e5dff8584` | 103739 |
| Designer `tactics/explosive-barrels.js` | `7e012463105901dfc19b82d28794444f5c45099774b54eaf819393d177fe9e45` | 1859 |
| Designer `tactics/flame-cone.js` | `5194879964cd7218ad729cb4ca010b37b0bd2fbc9e18a4713e7a25a140dde1cb` | 3993 |
| Designer `tactics/fuel-blast.js` | `42f77e6a806d4ca2cb0d05c14d0ff9f93744a27dd9ed7853b10c014f5ffd2322` | 3520 |
| Designer `tactics/scenery-collision.js` | `bbeb8a7d9a18445b9486f9a7eb208f90f23572555043e72bb27715209f3caaec` | 2344 |
| Designer `tactics/vendor/THREE-LICENSE.txt` | `df2a91696186fe58c92518a25d48bc59c8ee2edc7cac9ca6d19a5a0d599a2a05` | 1102 |
| Designer `tactics/weapon-models.js` | `9827dacd81d430a6f92123ce9592d7f79c73e4e707462287a49abcb8529933a3` | 19315 |

`A/vendor/three.module.js` and `A/vendor/three.core.js` retain license headers; `A/vendor/THREE-LICENSE.txt` and the designer equivalent contain the MIT license and Three.js authors' copyright notice. Retain them with copies. The broader designer also includes `D/vendor/babble/LICENSE`; a narrow scene should avoid importing unrelated dependencies, and any later inclusion needs its own notice review.

No repository-root license granting general reuse of Farmyard/AFT application code and art was found in the pinned tree. The asset prompts/manifests and user reuse request establish context and provenance, not a blanket third-party rights grant. Per-file rights/embedded notices for the actual selected imports remain unresolved at the import gate. The 13 samples do not verify every asset or all 2,499 manifest records; shared hashes do not justify silently mixing two different installed roots or later revisions.

## Verification entry points and checks actually performed

Donor commands identified from the pin, but **not executed for this documentation-only task**:

| Command/entry | What it covers; practical restriction |
| --- | --- |
| `npm run check` | `U/check.mjs` syntax-checks 14 own application modules, resolves relative module links, checks HTML/control references and 1,318 installed designer hashes, then Node runs `T/*.test.mjs`. `T/original-art.test.mjs` verifies the AFT snapshot hashes. Run only against an approved isolated Tinderbox import/copy in future work, not as a reason to write donor outputs. |
| `T/solo-game.test.mjs`, `T/grenades.test.mjs`, `T/interactions.test.mjs`, `T/running-stamina.test.mjs` | Relevant reference assertions for continuous/AP movement, collision, attack resources, grenade obstruction, object state and turn ownership. All animal/primary combinations establish loadout construction, not persistent fire or barrel-chain correctness. |
| `T/operation-storage.test.mjs`, `T/storage-failure-input.test.mjs`, `T/release-integration.test.mjs` | Slot isolation, legacy save handling, failed preference/storage writes, resume and combined lifecycle behavior. |
| `T/mobile-controls.test.mjs`, `T/grenade-controls.test.mjs`, `T/operation-input.test.mjs`, `T/interaction-input.test.mjs`, `T/burst-effects.test.mjs` | Input/helper/UI lifecycle and presentation references. `app-harness.mjs` supplies a fake app environment; these are not physical-device/WebGL performance measurements. Baseline has no dedicated solo flame-aim or barrel-chain test suite. |
| `T/map-designer.test.mjs`, `T/designer-textures.test.mjs` | Imported map/block editing, export compatibility and texture references. They do not substitute for a Tinderbox fire/barrel integration scene. |
| `npm run build` | Copies the entire authored static application to root `dist/`, with marker-guarded output replacement and cache-versioned top-level modules/styles/assets. It writes files and would bulk-package both snapshots; do not run it in the read-only donor. |
| `npm run serve` | `U/serve.mjs` defaults to localhost:4495, retires after 30 minutes and honors `artifacts/preview/STOP`. No server was needed or started here. Any later retained helper still needs the user's lifecycle registration/expiry policy. |
| `U/snapshot-designer.mjs <original-dist-directory> --dry-run` | Donor-documented dependency-closure tool for a deliberately selected original source tree. Not run: no new snapshot requested and the original AFT commit object is absent here. |

Checks actually completed for this candidate:

- Confirmed the coding worktree was clean on `codex/coding`, then fast-forwarded only that branch to architecture baseline `2c29ae3`; no primary checkout changes.
- Reviewed AGENTS, architecture, workflow and source-baseline instructions. Read source using pinned `git show`, `git grep`, `git ls-tree`, `git diff` and `git cat-file` operations only. Did not fetch, alter the donor, or run donor scripts.
- Traversed literal relative JavaScript closures for the listed 21 seed modules (counting mobile/grenade separately). No reached file was missing and no dependency escaped the pinned application root. This is static reference verification, not runtime execution.
- Verified the 13 raw-byte provenance hash/size samples above. Inspected the original-code/third-party license evidence and recorded the missing AFT history limitation.
- Compared only the exact unapproved candidate revision with the baseline to separate newer solo aiming/painted effects from baseline rules.
- Verified all 194 abbreviated source references, including 78 line spans and four directory references, against pinned blobs/trees. Executed the embedded reproduction script and confirmed the 114-module app closure. Checked the changed-path scope and ran `git diff --check` before commit. No runtime tests, build, browser review, new artwork, import or deployment was performed.
- No preview/browser/worker helper was retained; short-lived read-only command processes completed.

There is no configured Tinderbox GitHub remote. This candidate is committed locally on `codex/coding` for architect review; no donor remote is a Tinderbox publishing destination. The handoff reports the exact commit separately. Only the architect may promote it to `master`.

## Reproducing a static closure

The following read-only Node script mirrors the closure method. Supply any seed from the table relative to `S/`; run with `node` on stdin from the donor directory. It prints every path in that seed's closure, so later import planning can inspect the complete set rather than treating this audit's critical-edge examples as a file manifest. It does not load or execute donor JavaScript.

```js
const {execFileSync} = require('node:child_process');
const path = require('node:path').posix;
const pin = '30a3b8cae5f36bb0c1df3685b7fba16f701c2083';
const root = 'sites/tactical-animal/dist/';
const seed = 'app.js'; // Replace with an S-relative seed from the table.
const cache = new Map();
const seen = new Set();
const todo = [root + seed];
const references = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g;
while (todo.length) {
  const file = todo.pop();
  if (seen.has(file)) continue;
  if (!file.startsWith(root)) throw Error('Import leaves application: ' + file);
  seen.add(file);
  if (!cache.has(file)) {
    cache.set(file, execFileSync('git', ['show', pin + ':' + file], {
      maxBuffer: 32 * 1024 * 1024
    }).toString('utf8'));
  }
  for (const match of cache.get(file).matchAll(references)) {
    const specifier = match[1].split(/[?#]/)[0];
    const dependency = path.normalize(path.join(path.dirname(file), specifier));
    if (!dependency.startsWith(root)) throw Error('Import leaves application');
    if (dependency.endsWith('.js')) todo.push(dependency);
  }
}
console.log('JS files including seed:', seen.size);
console.log([...seen].sort().join('\n'));
```
