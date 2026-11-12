# Fire effect settings: runtime candidate

Contract: `5bcd95dc5bd5b2f8f1e65fa2de19e3d84d87ecb3` plus the building-light comparison addition `95dceb1a`, [milestone 19](../../milestones/19-fire-effect-settings.md). Frozen runtime/art base: `25095656`. The accepted `ee1d10b374ebe91ecc0011bedf39dab1e8fd8874` reference and its movie remain unchanged. This candidate is confined to the furnished-house workbench; promotion and combined browser/timing evidence belong to the architect.

## Preference contract

`workbenches/furnished-house/effect-preferences.js` exports:

- `DEFAULT_EFFECTS`: frozen `{flames:true,smoke:true,lighting:true}`.
- `normalizeEffects(value)`: returns a detached plain snapshot of those three keys. Only own literal booleans are accepted. Missing/invalid values use the all-on defaults. Unknown keys and malformed getters do not propagate into settings.
- `createEffectPreferences({storage}={})`: reads `tinderbox.furnished-house.effects.v1` from injected storage or, by default, browser `localStorage`. Explicit `storage:null` disables persistence. Access, parse, read and write exceptions are contained; controls continue in memory. Other application/donor keys are neither read nor written.

Each store provides `snapshot()`, `set(patch)`, `subscribe(listener)` and `dispose()`. A patch changes only known literal booleans and otherwise keeps the current choice. No-op patches neither write nor notify. Setters and readers return detached values; listeners each receive a separate snapshot. Subscription immediately sends current values, then sends one notification per actual change, and returns an idempotent unsubscribe function. Store disposal removes subscribers and makes subsequent stale setters/subscriptions inert; the last snapshot remains readable. It never deletes persisted preferences.

`main.js` creates one store for the page lifetime, mounts the UI specialist's `mountEffectControls({root,preferences})` once in `#fire-effect-settings`, and passes a snapshot as `view.effects` on every art update. The native inputs are excluded from movement key handling. The UI owns checkbox presentation, native keyboard behavior and synchronization; UI callbacks only set preferences.

## Review API and lifetime

`window.__furnished.effects()` reads the same store as the controls. `setEffects(patch)` updates it and returns the detached resulting mask. Diagnostics also report `effects`.

Every actual change redraws immediately, including while paused and with automatic rAF rendering disabled. The redraw uses the existing frame at its authoritative `worldTime`; it changes no tick, accumulator, command or physical snapshot. Retained camera-only deltas continue to omit reset/upsert/removal arrays while carrying current fire samples. Restoring a channel therefore forwards current state/time, without a replay reset or artificial animation age.

The optional comparison `lightingMode()`/`setLightingMode(mode)` reads/sets the page-only `local` or `building` mode. A changed mode redraws immediately and survives replay reset. It is independent of the preference store, adds no fourth checkbox and writes no storage key. Omission and every invalid value consistently fall back to `local`. Opening `/workbenches/furnished-house/?lighting=building` selects the artist's building-glow trial; the plain link remains the local-light reference. Mode and the boolean mask are both visible in diagnostics and the art view. Its power/distribution is artist-owned and changes no heat or fuel.

Reset and the kitchen/bedroom replay actions replace the trial, not the page preference store or controls. They create no extra subscriptions. Workbench disposal cancels its rAF, unmounts the controls, unsubscribes the redraw listener, disposes the store and retires its existing runtime/art resources. Repeated disposal is harmless.

The runtime does not remove samples or change thermal rules. Independent generation/culling and the diagnostic source/splat/light counts are artist-owned. Ambient night illumination remains separate from fire lighting. An omitted `view.effects` remains all-on for older art consumers. The runner supplies `trial.windMetadata` alongside the sampler so art can establish the known ambient/calm bounds and keep uncertain arbitrary samplers conservative.

## Finite verification

Run:

```
node --test tests/furnished-house/effect-preferences.test.mjs tests/furnished-house/effect-bindings.test.mjs
```

Nine coder-focused groups pass. Store checks cover defaults, normalization, detached reads/notifications, partial updates, reload through injected/default storage, separate namespaces, corrupt/blocked/quota-failing storage and disposal. The entrypoint check executes the actual `main.js` body with the real preference, UI controls, clock, thermal and navigation modules. It substitutes only import-loader seams, DOM primitives, the art sink and GPU resources; it is a wiring check, not a browser/renderer visual check. The UI dependency is frozen at `459daf204c5a547cb898308d77c5e213ea7df976`, with its six additional controls groups passing.

At one short live-fixture state, all eight masks reach art and the actual control subscriber immediately while the full physical snapshot, replay commands and clock diagnostics stay identical. A real checkbox change also updates the store/API/art without changing that state. Camera/view and local/building mode changes preserve the same physical state. Additional checks verify reset/replay store and mode persistence, query/invalid modes, one mount, refresh, teardown, stale API setters and keyboard input isolation. No per-mask long burn is run.

Relevant existing fire/ownership regressions and static/build checks are recorded in the handoff. The architect's combined browser review checks the actual native controls, all-on visual reference, independent generation/culling, eight-mask CPU/GPU costs and screenshots at one fixed full-burn state. These are separate from the finite store/entrypoint checks.

The combined candidate with frozen UI passes 335/335 repository tests, syntax for 240 owned scripts, resolution of 281 static modules, one shared Three pair and existing provenance checks. The normal public build and `tools/check-release.mjs` both pass: 3515 files, 166825782 bytes. Its manifest SHA-256 remains `c592039f35d7f4173c17e4f9443726423e9d77eb8ee5bfdbb7d6430625c33987`, identical to the prior public artifact. Detailed source/output digests and scope are in [effect-settings-checks.json](effect-settings-checks.json); raw repository/build/release receipts are under `artifacts/qa/fire-effect-settings/`.

No browser, server, watcher or retained helper is created by this task. Finite test commands exit naturally. The completed runtime branch and its old evidence remain preserved; simulation, original movie, production sources and Pages are outside this candidate's changes.
