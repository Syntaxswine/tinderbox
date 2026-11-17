# New York shared presentation interface

This is the coder/UI interface for the architect's bounded M29 New York stage.
It grants no renderer, build, Administration/Horticulture rollout or promotion.
The completed art inputs stay pinned to `82b7fc60` with checker context `90c226f6`.

Reuse the existing `src/art/index.js` `createArtScene` as the presentation owner.
It already loads one native character kit and owns the ground/fire, carried tools,
body shroud, six-light pool and night services. The UI adapter must delegate those
services to that factory, preserving their existing appearance, clocks and order.
It must not create another player, character kit, camera, renderer or animation loop.

## UI-owned adapter

Add only `src/runtime/shared-map-presentation.js` (and focused interface checks).
Export `createSharedMapPresentation(args)`. Its arguments are the existing
`createArtScene` arguments plus `gameplayMap` and required `createMapStructureArt`.
The adapter may accept an injected `artFactory` for CPU interface checks, defaulting
to `createArtScene`. Forward the same objects, signal and callbacks to that owner;
do not clone or reinterpret the snapshot, material quantities, character or lights.

The coder's runtime composes this adapter with the coder's structural factory:

```js
createSharedMapPresentation({
  THREE, scene, renderer, world, pickups, characterId, signal, defaultLights,
  assetBaseUrl, onLoadPhase, gameplayMap, createMapStructureArt
})
```

The result is the common art handle: `update(snapshot, timing)`, `dispose()`,
`diagnostics()`, `anchors`, `sampleBearBounds()`, plus structural delegation
`isReadyAt(point)`, `settled()`, `streamingMetrics()`. No new UI control or gameplay
command is introduced. Source-aware picking remains the simulation/runtime's job.

## Coder-owned core hook and structures

The coder extends `createArtScene` with the two arguments above. After loading its
one native kit and creating its one native character/root, it invokes:

```js
createMapStructureArt({
  THREE, scene, renderer, signal, gameplayMap, world,
  nativeCharacterKit, nativeCharacter, characterRoot, hostRoot,
  defaultLights, onLoadPhase
})
```

The kit, character, roots, renderer and default lights are borrowed. The structural
factory owns only its returned root, section views, masks, geometry/materials and
subscriptions. The common core adds that root and disposes that returned handle.
The structural factory must not dispose borrowed resources or allocate fire lights,
body effects, held tools, animals or its own clock. Coder owns this hook, source
terrain, bounded ground/elevated residue presentation, section residency and local
char/retirement. Existing art/source controls remain unchanged.

The structural handle has `root`, `update(snapshot,timing)`, `dispose()`,
`diagnostics()`, `isReadyAt(point)`, `settled()` and `streamingMetrics()`.
Presentation geometry expands only for resident source sections. Cold render masks
can exist before thermal activation, but allocate no simulation cells or fuel.
Every mask uses the same effective source buffers/matrices as cold and active
physics; native activation updates existing mask identities rather than replacing
the building or refilling its state. Reloaded views receive persistent current
boundary state before becoming visible. Cosmetic masks own no independent fuel.

## Authoritative update and lifecycle

The common core receives the normal version-1 gameplay snapshot. Relevant fields:
`player`/`actors` including native dimensions, elevation and body-fire state;
`world` with `sparse:true,sourceSections:true`; sparse `cells` and `pickups`;
`discharge`, `projectiles`, `structureFire`; `scene` (the shared physical frame,
with `scene.generation`, native tick, boundaries, supports, falls, rubble, fire
samples and tombstones); and `navigation` with view, portal states and residency.
These fields are simulation outputs, never positive states invented by an effect.

Timing is the existing `{playerTime,worldTime,playerDelta,worldDelta,camera,
viewMode,viewport,alpha}`. Core update order remains native pose/elevation/world
matrices, structural samples, shared light pool, character/body fire and held-tool
anchors. Powder and pause affect the existing clocks. Components use lighting
disabled because the host retains its one six-light fire pool; no light per tile.

Use the existing factory's abort and partial-load cleanup. `dispose()` is idempotent
and releases only owned resources. A late load after abort disposes its own result;
reset/menu/re-entry cannot leave old views, held input, effects or section requests.
No server, watcher, browser, animation helper or retained process is authorized by
this interface. Browser/normal-zoom evidence awaits the architect's fresh grant.
