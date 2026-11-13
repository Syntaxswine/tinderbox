# Bell & Alder sandbox instance contract v1

Milestone 23 first slice starts at `93239f1e202f05064c033038f6f343f79b905b8e`, combining runtime `f68240257c36950ec720f9997a6a03389a4f22bb` and art `a0eef339988c24ef5a688396f552b8661764f472`. The owner's November 13 expansion decision defers the recorded closing-time defects. The original closing scene/data/replay remain the immutable control. This document defines the additive contract before the expanded art export.

## Ownership and scope

Artist owns `workbenches/bell-and-alder-sandbox/art.js`, `scene-data.json`, optional local physical source JSON, and matching `art/source/` and `docs/art/` paths. Coder owns other files in the sandbox workbench, its compiler/runtime/browser/package tooling, tests and engineering docs. Coordinate changes to these fields explicitly. First slice contains Bell & Alder, one existing furnished Hopkins 15 and a modest paved service yard. No Monroe pair or new building/wardrobe family yet.

The artist's `scene-data.json` is a **placement manifest**, not a second thermal snapshot. Existing source JSON is referenced inside Tinderbox. Its shape is:

```js
{
 version:1, prefabId:'bell-and-alder-sandbox-v1',
 instances:[
  {id:'shop',kind:'closing',source:'../bell-and-alder-closing/scene-data.json',
   translation:[0,0,0],quarterTurns:0,stairFlights:[/* below */]},
  {id:'house',kind:'furnished',source:'../furnished-house/house-data.json',
   translation:[/* artist measured */],quarterTurns:0,stairFlights:[/* below */]},
  {id:'yard',kind:'yard',source:'./yard-data.json',
   translation:[0,0,0],quarterTurns:0,stairFlights:[]}
 ],
 controlInstance:'shop',
 bounds:{min:[/* XYZ */],max:[/* XYZ */]},groundY:-.12,
 camera:{target:[/* XYZ */],offset:[10,14,12],span:24,exposure:1},
 // These positions/routes are already in world metres; no implicit retransform.
 anchors:{/* optional world-space navigation/check anchors */},
 checkRoutes:[{id:'shop-yard-house',anchors:['world-anchor-a','world-anchor-b']}],
 doors:[/* optional extra groups, below */],
 pickups:[/* optional automatic pickups, below */],
 provenance:{/* source pins, measured layout and explicit adaptations */}
}
```

Use stable instance IDs `shop`, `house`, `yard` in the first slice. Exactly one `closing` control instance supplies the original player/resident/officer, lantern, routines, sound palette, doors and smoke vents. The runtime adds doors from the other physical source. Added groups can override those defaults with `doors:[{id:'house::front-door',openingIds:['house::opening-id'],position:[x,y,z],label:'Front door'}]`. The supplied position is the actual reachable handle/leaf anchor. Auto-generated groups use the measured leaf centre. Both paths recheck real reach, state and actor occupancy when consumed.

The yard source uses the same physical version-1 schema (`levels`, `surfaces`, `items`, `furnitureParts`, `stores`, `sourceMeshes`, optional `render`). Paving is declared noncombustible physical geometry. Every visible yard fuel uses finite fuel and real support. No hidden fuel box, full-building disappearance clock or obstacle-specific wind is added. Use existing native source parts and painted materials. A source with no furniture still supplies empty arrays.

## Preparation, identity and rigid placement

The coder's `composeSandbox(manifest,sources)` accepts a map keyed by each manifest `source` string and returns `{data,instances}`. It clones each source and runs its existing source preparation **before** qualifying identifiers and applying placement. This binds each Hopkins native chimney to its own roof before combining sources. Raw source JSON and existing adapters are not rewritten.

One coordinate transform per instance is `world = Ry(quarterTurns * PI/2) * local + translation`, using Three's positive Y rotation: `[x,z] → [z,-x]` for one quarter turn. Only integer quarter turns 0–3 and a finite translation are supported in this first slice. Native dimensions, UVs, physical texture density, rigs and storey pitches remain unchanged. Bounds are recomputed from transformed corners; normals/directions rotate without translation; source/render matrices and item quaternions receive the same rigid rotation. World vertices/normals in render geometry are transformed without touching UVs or material parameters. The instance root stays at identity after compilation; do not place already transformed geometry a second time.

Every source canonical identifier becomes `instanceId::sourceId`; raw IDs and instance names may not contain `::`. All ID references are remapped consistently: physical surfaces/openings, source meshes/render geometry/materials, furniture parts/items/stores, level/room IDs, support/attachment host references, mesh/material bindings and source-preparation adaptations. Closing-time anchor dictionary keys and their actor/routine/door/lantern/replay references are qualified too. Stable `instanceId` and `nativeId` metadata preserve the source identity. Paths, asset catalogue IDs, material/fuel class names and ordinary labels are not identifier references and are not rewritten. Unknown dangling references fail composition rather than silently binding to the other house.

Compiler output uses one complete version-1 physical manifest, one shared grid (`gridOrigin:[0,0,0]`, `thermalCell:[.5,1.06,.5]`) and the existing declared terrain support. Source floors retain their actual elevations: shop 0/2.12 m, Hopkins .48/2.60 m before placement. No character, floor or doorway is rescaled to align them. The terrain elevation is explicit and the artist supplies any real connected entry geometry needed by the layout.

## Stair flights

Every sandbox `supportType:'stair-tread'` source must appear in exactly one declaration in its own instance. These references are **unqualified source IDs** in the placement manifest:

```js
{id:'service-stair',treadSourceIds:['tread-0','tread-1'],
 lower:{elevation:0,surfaceIds:['lower-landing-source']},
 upper:{elevation:2.12,surfaceIds:['upper-landing-source']}}
```

The compiler qualifies the flight and all references, adds `stairFlightId` to each tread, and emits `data.stairFlights` with actual world landing elevations and qualified surface IDs. List the full actual tread set, not just the two example IDs. Landings reference declared source geometry, never another instance. Lower/upper floor source lists may include multiple measured patches. The existing geometric contact test selects actual landing contacts from those declared candidates. Missing, duplicate or cross-instance flight/landing bindings fail validation. No sandbox tread may fall back into the old scene-wide flight.

The bounded shared support adapter evaluates each explicit flight independently. It retains legacy single-house behavior for data without this sandbox contract. A disjoint-flight regression verifies that removal of one landing cannot brace, detach or otherwise change the other building's stair support. This adds identity boundaries and declared landings; it does not introduce a new stress solver.

## Runtime, frames and art

`createSandboxRuntime(compiledData,{seed=1893,characterId='goat'})` wraps the existing closing-time runtime and supplies one authoritative trial for **all** physical instances. Navigation, heat, openings, tool targets, collision, support/falls, witness sight and actor queries consume that same domain. Ambient east 1.5 m/s wind remains explicit. The no-lawn diagnostic receiver hook stays disabled. Native selectable profiles, 9 m/s full movement, world/powder/inversion clocks, walk-over pickup rules and current six buttons remain unchanged. Pickups use `{id,kind:'powder'|'inversion'|'healing',position:[x,y,z]}` in world space and remain simulation-owned.

Thermal frames keep full/reset, delta upserts, tombstones and stable qualified IDs. `frame.closingTime` remains the complete original actor/door/lantern/resident/event snapshot; only source IDs/positions and combined bounds are adapted. Additive `frame.sandbox={version:1,instances:[{id,kind,prefabId,translation,quarterTurns}],generation,pickups}` identifies the shared composition. `pickups` is the complete current automatic-pickup snapshot (`id,kind,position,consumed`, plus current adapter fields); draw unconsumed world objects once and remove them when consumed/reset dictates. Do not infer actor reactions or missing thermal state in art. Reset restores the whole composition and one placed lantern without retaining old falls, fire, door states or duplicate actors.

Artist exports `createSandboxArt(THREE,{renderer,data,instances,signal})` → `{root,update(frame,view),diagnostics(),dispose()}`. `data` is the complete compiled physics data. Each `instances` entry also contains its prepared, qualified, world-space source `data`, preserving its original prefab ID for reuse of the existing art factories. The closing factory handles the two original NPCs/player/portable lamp/reaction cue once; furnished and yard views add structure only. Do not create additional actors/lanterns from the other source views. Renderers receive the **same** full world-space authoritative frame and filter their own qualified sources; never run per-building simulations or double-transform poses.

All effect toggles, exterior/cutaway view, level, observer, camera and wind use the existing furnished-house view contract. A renderer that creates a local firelight pool for each source must report the total pool count/power; multiple pools are a declared presentation approximation, not a claim that the old single-house cap remains the whole-block budget. No effect switch changes physical state. Diagnostics report instance IDs, submitted draw/triangle/material/texture/light counts, missing physical mappings, resources, reset/disposal and actual current world time. The artist may share the existing thermal art factory through an additive source view; leave original M22 exports unchanged.

**Frame ownership helper:** import `partitionSandboxFrame` from `./runtime.js` and call it once per instance before forwarding to a legacy factory: `view.update(partitionSandboxFrame(frame,instance.id),options)`. The runtime tags each boundary/support/item/part/fire/fall/rubble/upsert/removal/event/occupancy record with `ownerInstanceId`. The helper filters every such collection, including generated IDs and tombstones; passing the unfiltered whole frame to each legacy debris/effect view would duplicate dynamic geometry. Fuel ownership is fixed at birth from source/parent or the actual support/release point, and survives flight, landing across another instance, re-fall and retirement. Render ownership is separate from current physical support and never selects heat receivers. Mechanical sheet groups include instance identity so disconnected sources do not become a single cross-building fragment. Keep source-specific levels in each instance data view. Qualified actor IDs, lantern owner/event references and native asset identities remain consistent; reset restores exactly one player/resident/officer and portable lantern.

The API deliberately retains the current suspicion icon. A suspicion bar and a current-visibility indicator are deferred. No invented continuous suspicion value, stealth rules, UI callback gameplay or global witness changes are part of this increment.

## First-slice evidence

Deliver native passage/interaction checks for the actually supported profiles; failures are reported without shrinking bodies or skipping solids. Verify source/ID/reference integrity, disjoint support, one shared heat domain, reset/event/lantern ownership and independent presentation. Do one short manual exploratory pass, quiet/small-fire measurements and useful actual WebGL JPG/clip evidence. Keep working/broken/unwired/untested findings and propose the next three issues. Preserve known M22 findings; no long fire library, Monroe expansion, production promotion or Pages deployment is authorized here.
