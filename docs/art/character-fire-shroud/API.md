# Shared character shroud API

Contract base: `064d41865ae35f00f8a33d7cf1bd6f368f327c17`. Runtime entry: `src/art/character-shroud/index.js`, export `createCharacterShroud`.

```js
const shroud = createCharacterShroud(THREE, {maxCharacters: 16});
scene.add(shroud.root); // identity-transform world-space effect container
shroud.bind(actorId, {species, worker}); // worker.root and native worker.parts
shroud.update({
  worldTime, camera, sampleWind, windMetadata,
  characters: [{id: actorId, active: true, startedAt, intensity: 1}],
  effects: {flames: true, smoke: true}
});
shroud.unbind(actorId);
shroud.reset();
shroud.diagnostics();
shroud.dispose();
```

`characters` is a detached presentation array. Version 1 entries are `{id, active, startedAt, intensity?}`. Intensity is normalized 0..1 and defaults to 1 for explicit posed controls. It is separate from activation. Coder derives active/intensity from the approved `characterFire` snapshot and maps `startedAt = worldTime - characterFire.age`. Existing timed NPC burn and proven direct lit-fuel contact retain their authoritative semantics; warm-only exposure is inactive.

The factory neither reads physics nor creates ignition, damage, expiry or an afterburn timer. It derives visual onset age from the supplied start timestamp. An absent/inactive ID clears its effect immediately. Direct-contact disappearance, expiry and death must publish inactive/absent state; hidden ancestors and removed native roots are also suppressed. With no impact direction supplied, the angular starting point is explicitly a deterministic actor-ID visual default.

Bind after the native model exists. `worker` supplies its actual already-posed root and native skinned `parts`; weapons, helmets, badges and metal are excluded from fitting. The existing tagged `chicago-1893-city-beat` outfit is inspected once at fitting: its visible replacement coat/trousers/footwear supply the actual clothing envelope and cloth anchors, while hidden original garments are excluded. This uses the same worker/root/parts binding and creates no new garment. Goat, horse and AFT bear are supported. The factory reads the evaluated pose and world matrices, never calls the rig's pose/update function or changes its geometry, scale, paint or attachments.

Update after all native poses, patrol aim and floor elevation have been applied. Root matrices carry heading, translation and elevation; do not apply those transforms twice. `worldTime` drives onset and animation. Constant world time freezes effect motion, while anchors still follow the actual posed body. No wall clock is used. `sampleWind(x,y,z,out)` returns XYZ m/s, +Y up; `windMetadata` records the existing host's labelled model.

Bind/unbind/reset/dispose are idempotent for lifecycle use. Rebinding the same ID/worker retains its fitted anchors. `bind` replaces an ID's old binding. Reset clears bindings and active effect data; bind the current rigs again after reset/character change. Dispose releases only owned effect resources. One shared bounded splat pool is created lazily for active characters, with at most 88 submitted splats per active body. No lights, textures, model loads, renderer or physics instance are created. Unsupported species return false from bind and are listed in unsupportedIds/unsupportedBindings; malformed native bindings throw. Capped active IDs are listed in cappedIds. No substitute body or card fallback is created.

Diagnostics report bound/active IDs, native species and scale, source/fit identity, mounted bands/tips, submitted flame/smoke counts, capacity, world time, wind label and owned resources. The artist's posed/factory preview is not evidence of host ignition; coder/architect own actual game wiring and combined acceptance.

Runtime imports are only `./splats.js`, `./fit.js` and `./mounts.js`; these accept the supplied shared Three.js namespace and have no further imports. No runtime code imports raw source copies or private workbench/HDR harnesses.
