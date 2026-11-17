# Shared-map presentation adapter — M29

Reviewed base: `f58a6562fa4bdc31f78a9be333628ae863372e4c`.
Implementation follows the exact [coder/root contract at 9d7ca049](https://github.com/Syntaxswine/tinderbox/blob/9d7ca0495ea28c35c7f103e33e462994daf7d196/docs/engineering/shared-maps/presentation-contract.md). Completed New York art/checker context `90c226f674d51a2d030fcdd4679e61a3bdd9ebfe` is already in that base. The accepted UI `2c866a6b` remains an ancestor; the train candidate `fb062860` stays separate.

## Adapter boundary

`src/runtime/shared-map-presentation.js` exports `createSharedMapPresentation(args)`.
It requires an opaque `gameplayMap` object and the coder's `createMapStructureArt` function, then calls the existing `src/art/index.js` `createArtScene` with the same supplied objects and callbacks. The optional `artFactory` override is for CPU interface checks and is removed from the forwarded options.

The returned owner handle is unchanged, including its method receivers, `anchors`, `update(snapshot,timing)`, `sampleBearBounds()`, `diagnostics()`, `dispose()`, and the coder-provided `isReadyAt(point)`, `settled()` and `streamingMetrics()`. No snapshot, timing, signal, source record, character identity or lighting object is cloned or reinterpreted.

The existing owner retains its one native kit/player, fire and smoke services, discharge and carried tools, body shroud, six-light/power-215 fire pool, night setup, update order and cleanup. The adapter creates none of those itself and adds no frame loop, abort listener, command or gameplay rule. It propagates owner success/failure; the common owner remains responsible for partial-load and late-abort disposal.

## Coder-owned work and remaining acceptance

The root-reviewed contract assigns the new core hook and structural handle to the coder. That owner receives the existing native character kit/instance/root and host root, renderer, default lights, source map and signal. It owns source terrain, sparse/elevated residue, effective section geometry/masks, char/retirement, source-aware picking and streaming. Component effects retain lighting disabled; the host keeps the shared fire-light pool.

The source audit found ground-height assumptions in the existing dense ground cards/field, pour drops and impact bursts, plus a ground-level observer in fire-light ranking. This adapter does not correct or conceal those assumptions. Their New York reconciliation belongs to the coder-owned core/source hook and combined elevated-source review. A forwarding check is not evidence that upper-floor fire or drops render correctly.

The accepted base still lacks the coder's map hook and structural delegations in `createArtScene`. This candidate tests its new adapter boundary; it does not itself open New York as gameplay. Combine it with the exact reviewed coder hook before runtime/phone/browser acceptance. No Catalogue reimplementation, second actor, renderer, inventory design, new art or light tuning is introduced.

## Owned paths and provenance

Only three new task paths:

- `src/runtime/shared-map-presentation.js`
- `tests/integration/shared-map-presentation.test.mjs`
- This handoff.

Existing art, runtime, UI controls, assets and source pins are unchanged relative to the reviewed base. The adapter is original Tinderbox glue over the approved owner. Existing services and provenance remain in their original modules.

## Verification scope

All **7 focused CPU checks pass** with `node --test tests/integration/shared-map-presentation.test.mjs`. They cover identity-preserving forwarding, the complete returned handle, native/source heights and authoritative clocks left unchanged, required map/structural ownership before startup, exact error propagation, late-load abort cleanup once, and the real default owner's pre-abort path. They create no WebGL renderer or browser and perform no network fetch. Both new JavaScript modules pass `node --check`; importing the test also resolves the adapter and approved owner imports.

Syntax, local import/reference closure, whitespace and exact changed-path checks accompany handoff. No build, server, browser, preview, renderer or retained helper was started. Normal-input, elevated fire/residue, visual parity, actual phone layout and combined runtime acceptance remain architect gates.
