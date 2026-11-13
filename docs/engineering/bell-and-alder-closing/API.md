# Bell & Alder closing-time scene contract v1

Early coder contract for [Milestone22](../../milestones/22-bell-and-alder-closing-time.md), base `b6838d004778faa6ca08914546499f6af27ce0b6`, brief `d7fd0d2865988779310741d8a0a69b5d16fbeb83`. This is an isolated replay candidate. The artist owns `workbenches/bell-and-alder-closing/{art.js,scene-data.json}` and art sources; the coder owns the other runtime/tooling files here. `graybox-data.js` is explicitly temporary and is not an accepted art/route/visual delivery.

## Coordinates and physical data

Use furnished-house physical `version:1`: X/Z ground, Y height, metres, fixed1/30s world step. `surfaces`, `levels`, `openings`, `items`, `furnitureParts`, `stores`, support declarations, source meshes/render data and provenance retain their existing meanings. Canonical source IDs survive thermal subdivision; compiled IDs connect art/heat/collision/retirement. Doors retain their real pivot/leaf geometry. Native bodies and modules are never rescaled to make passages work.

Proposed common transform is translation `[-36,0,-9]` from published Catalogue Street: shop X0..8/Z0..8, front +Z. The artist settles actual floor elevations and the measured new upper/stair assembly. Record one `closingTime.origin` transform; do not apply it twice. Anchors are already in scene coordinates, including Y. Physical sight/ballistic semantics must be explicit: masonry/wood opaque, glazing transparent to sight but cover for a shot while intact, and door glazing/apron matched to what is drawn.

## Additive data.closingTime

```js
{
 version:1,
 origin:{source:'Catalogue Street',translation:[-36,0,-9]},
 bounds:{min:[-4,0,-3],max:[16,7,15]},
 anchors:{
   // Stable names; positions below are examples, not an authored placement.
   playerStart:{position:[4,0,9.4],level:0},
   counter:{position:[4,0,3],level:0},
   residentView:{position:[4,2.12,7],level:1},
   safeExit:{position:[10,0,5],level:0},
   heroStrike:{position:[4.2,.015,7.48],level:0}
 },
 actors:[
   {id:'player',role:'player',characterId:'goat',anchor:'playerStart',heading:-Math.PI/2},
   {id:'resident',role:'resident',characterId:'goat',anchor:'counter',
    routine:[{anchor:'counter',hold:8},/* actual door/stair waypoints */],
    viewAnchor:'residentView',exitRoute:['safeExit']},
   {id:'officer',role:'officer',characterId:'goat',anchor:'officerStart',
    routine:[/* ordinary patrol waypoints, holds and headings */]}
 ],
 doors:[{id:'bell-and-alder:entry',openingIds:['entry-left','entry-right'],
         anchor:'entryReach'}],
 lantern:{id:'bell-and-alder:hand-lantern',assetId:'city1880-hand-lantern-lit',
          anchor:'lantern',supportSourceId:'actual pedestal/support source'},
 smokeVents:[{id:'front-entry-vent',openingIds:['entry-left','entry-right'],
              position:[4,1.1,8],outward:[0,0,1],level:0}],
 // Optional artist-authored procedural palette, no new unlicensed recordings.
 soundPalette:{},
 limitations:[]
}
```

Every referenced anchor/physical opening must exist; IDs are unique. A routine step is `{anchor,hold?,heading?,door?}`; `door` is `{id,open}` and uses the same reachable interaction as the player. Routine motion follows the actual support/collision solver; an unreachable step stops with a reason. Ordinary routines may be scheduled; smoke/evidence/fire/damage outcomes may not. Resident exit routes enumerate real connected waypoints, including tread/landing contacts. Add anchors needed for measured hero movement, door reach, lantern pickup, ignition stance/strike and the direct-witness/cover control rather than moving an actor or heat target through a wall.

`closingTime.lantern` is the one existing portable model. Its ownership is separate from throwable-tool stock. Remove the placed visual when carried and attach that same logical/model instance to the player; reset restores it exactly once. The thermal manifest must not leave an invisible duplicate of any picked-up physical object.

Smoke perception uses real thermal smoke/preheat samples and an authored actual opening/vent with a clear source→vent→outside plume path. A sustained signal is then tested from the current resident eye through live geometry. Vents are bounded observation proxies, not a fluid solver or permission for smoke to cross a solid floor. Renderer culling and effect toggles do not enter perception. The exact thresholds/proxy heights and limitations will be recorded with runtime evidence.

## Thermal frame + frame.closingTime

Keep the established thermal fields, full/reset, delta upserts and tombstones. `frame.closingTime` is an additive **complete current snapshot** on every published frame:

```js
{
 version:1, revision, worldTime,
 actors:[{id,role,characterId,position:[x,y,z],heading,travelled,moving,
          height,radius,hp,state,lookAt:null,
          // officer only: existing witness snapshot including reaction/aim/shot
          witness:null}],
 doors:[{id,openingIds,openFraction,intact}],
 lantern:{id,phase:'placed'|'carried'|'spent',ownerId:null|'player',
          position:[x,y,z],supportSourceId},
 resident:{state,evidence:null,routeIndex,blocked:null},
 // Only newly emitted events; globally unique within this reset generation.
 events:[{id,worldTime,tick,type,actorId?,position?,reason?,details?}],
 replay:{id:'manual'|'hero'|'direct'|'quiet',seed,stage,speed}
}
```

Pose snapshots and lantern ownership supersede previous values even on a thermal delta. Event IDs include reset generation and a monotonic sequence; a paused/camera draw carries `events:[]` and cannot replay footsteps or reactions. A full/reset starts a fresh generation and clears retained state/events. Event types include `footstep`, `door`, `lantern-pickup`, `smoke-noticed`, `resident-look`, `resident-exit`, `route-blocked`, `officer-reaction`, `officer-shot`, `match`, plus routine/input diagnostics. Thermal ignition/failure/fall/landing events remain thermal events. Sound consumes state/events and never creates them.

## Renderer and view

Artist export: `createClosingTimeArt(THREE,{renderer,data,signal})` → `{root,update(frame,view),diagnostics(),dispose()}` using the shared Three instance. `view` follows the furnished-house contract: exterior/cutaway/auto, `level`, `camera`, observer in scene XYZ, deterministic sampleWind/metadata, `effects:{flames,smoke,lighting}`, and preferred `lightingMode:'building'`. All effect settings affect presentation only. Art owns native actors/uniform/pistol/lantern attachment and scene dressing; actor routes, evidence, door state, pickup and thermal retirement remain runtime-owned.

Report actual submitted geometry/material/texture/draw/light counts and owned resources. Broad shop/fire light must reach the opposite frontage using the bounded shared budget. No receiver-selection diagnostic hook is enabled. Wind is declared ambient1.5m/s east; the Ashland obstacle bake is not a shop bake.

## Runtime, input and replay surface

`createClosingRuntime(data,{seed=1893,characterId='goat'})` owns reset, fixed steps, commands, actor navigation, trial and evidence. Its renderer-free surface is `step(count)`, `command(input)`, `frame({full})`, `snapshot()`, `replay()`, `metrics()`, `dispose()`. Input commands use the existing action meanings: movement, reachable Open/Close/Take, match/aim and existing tools. Full-input movement stays9m/s. Replay movement uses those commands/navigation, never a path of teleports; reset alone restores initial anchors.

The browser exposes `window.__closing` for deterministic play/pause/reset, hero/direct/quiet selection, exact tick stepping, camera/effect/audio controls, diagnostics and export. Reuse `mountUI` and the current buttons; any replay/capture strip is diagnostic, not a HUD redesign. Audio starts only after a user gesture, is bounded/event-driven, and pauses/resets/disposes without changing simulation. The carried-lantern memory override is45world seconds in this scene only; normal witness defaults remain8s.

The first combined recording batch is capped at30 real minutes. Hero horizon300world seconds, hard cap330, followed by at most30s direct control. Freeze all physical dressing and pin exact artist/runtime commits before that batch; preserve seed, actual inputs, source/data hashes, trace, timing/cost and partial artifacts. No production/menu/Pages integration precedes the owner's actual combined replay review.
