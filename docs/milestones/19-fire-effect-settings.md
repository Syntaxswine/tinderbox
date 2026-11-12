# Independent fire effect settings and early visibility

The owner requests independently selectable flames, smoke and lighting, and proposes avoiding rendering work for things that cannot be seen. Implement this first in the existing furnished-house workbench. Preserve the accepted expensive reference at `ee1d10b374ebe91ecc0011bedf39dab1e8fd8874` and its movie. Start candidates from the architect's `25095656` checkpoint. This assignment does not integrate the new simulation into production or deploy Pages.

## Behavior and shared interface

1. Provide three independent native checkboxes in a Settings section: **Flames**, **Smoke**, **Fire lighting**. All default to on. Use warm browns and the existing typography. Explain that fire lighting is the light cast onto the surroundings. Ambient night illumination stays available.
2. Preferences are presentation only. Disabling a channel cannot alter heat, fuel, ignition, damage, burn ages, support, falling pieces, clocks, collision or commands. Restoring it shows the current world state without restarting the fire or its animation age.
3. Pass `view.effects = {flames, smoke, lighting}` to the art factory. Omission means all on; known boolean keys are the complete interface. The artist accepts this additive interface without breaking existing consumers.
4. The coder owns `workbenches/furnished-house/effect-preferences.js`, exporting `DEFAULT_EFFECTS`, `normalizeEffects(value)` and `createEffectPreferences({storage} = {})`. The store supplies `snapshot()`, `set(patch)`, `subscribe(listener)` and `dispose()`. Snapshots are detached; missing/invalid keys use current/default values as appropriate. Read/write `tinderbox.furnished-house.effects.v1` defensively. Corrupt or unavailable storage must leave usable controls. Resetting a replay preserves preferences.
5. The UI specialist owns `workbenches/furnished-house/effect-controls.js`, exporting `mountEffectControls({root, preferences})`, returning a disposer. It owns labels, focus/keyboard behavior and checkbox synchronization. Changes call the preference store only. The UI specialist also owns the HTML/CSS placeholder in `index.html`, with `id="fire-effect-settings"`. The coder mounts it and passes the preference snapshot to art in `main.js`.
6. The workbench exposes `effects()` and `setEffects(patch)` on `window.__furnished` for review, with the same store as the controls. Setting a preference while paused redraws immediately and advances no simulation tick. Disposal unsubscribes listeners; reset must not create duplicate controls.

## Avoid work before building effects

Disabled channels skip their independent preparation and generation, not merely their final draw. Flame-off skips flame splats and flame-only envelope work; smoke-off skips smoke splats, including preheat smoke; lighting-off skips firelight clustering and zeros the owned pooled point lights. Flame self-emission is part of visible flame art. Fire lighting means illumination cast onto surfaces, not the ambient night light or unburned materials. Preserve charred geometry, physical debris and the authoritative heat/fuel state with every channel off. Shared preparation required by another enabled channel may remain and must be identified.

Filter definitely hidden levels/cutaway sources before costly support-envelope and splat work. Preserve underside ceiling fire, actual current elevations of falling/landed material, and visible window vents. Use conservative camera bounds to reject off-screen flame/smoke effects only when the entire effect envelope is known to be outside. Account for flame extent, smoke rise, wind displacement and current moving poses; retain uncertain cases. Do not add thousands of per-source occlusion rays or a new physics/LOD scheme to this pass.

Keep illumination eligibility separate from visible flame eligibility: an off-screen fire may illuminate visible ground or walls. A hidden base may still produce a visible plume. Channel toggles and culling cannot become new gameplay rules. The first pass can retain conservative false positives; it must not lose visible effects.

Expose counts for supplied, prepared, disabled, view-culled and camera-culled sources, generated flame/smoke splats and active fire lights. Document any changes to existing represented/missing diagnostics: intentional omissions must be distinguished from invalid/unmapped sources, and malformed or unknown data cannot be hidden as a convenient cull. All-on output at the reference camera should retain the accepted visual behavior.

## Ownership and branches

Reuse the existing assigned worktrees, preserving their current task branches and unrelated work:

| Owner | New branch | Paths |
| --- | --- | --- |
| Artist | `codex/fire-effect-visibility-art` | `workbenches/furnished-house/art.js`, art source effect/debris/presentation modules, artist API/docs and focused art checks |
| Coder | `codex/fire-effect-settings-runtime` | `main.js`, preference store, runtime/API docs and focused checks |
| UI specialist | `codex/fire-effect-settings-ui` | Effect controls module, `index.html` and focused control checks/docs |
| Architect | `codex/review-fire-effect-settings` | Contract, combined intake, actual browser review, measured toggles and delivery |

No worker edits another checkout or silently absorbs the train, gallery, stockyard, Hull-House or donor candidates. Keep the original expensive replay and its evidence unchanged. Coordinate a shared-name change before editing another owner's path.

## Acceptance and measurement

- Exercise all eight channel combinations. Enabled flames/smoke/lights work independently, off channels produce no corresponding splats/point-light power, and restoring a channel uses current authoritative time.
- Prove preference changes and view/camera changes do not change the simulation snapshot. Check UI/store/API agreement, keyboard activation, refresh persistence, malformed/blocked storage, reset/disposal and the all-on default.
- Use actual cutaway/underside, current falling/rubble ownership, off-camera and nearby off-camera-light controls. Check actual conservative plume bounds and compare returning to view with continuously visible output at the same world time. No hidden-frame cold start or false missing-source diagnosis.
- Preserve existing fire-rule, ownership, geometry and source/provenance checks. Run the relevant regression/build/package checks on the combined candidate. The old movie remains a reference, not proof of the new settings.
- Capture the real browser at normal zoom with controls visible. Provide JPG comparisons and a usable preview when practical; HTML source is not a visual handoff.
- Measure the eight combinations on the same representative full-burn state, camera, exposure and hardware. A bounded paused-state draw comparison is valid for isolating presentation and render work; label it as such. Keep authoritative simulation state fixed, exclude diagnostics/encoding from timed draws, record active/cull/splat/light counts, and report CPU and GPU separately. Do not compare a paused draw directly to the earlier whole-step timing or add CPU/GPU costs as a frame-rate estimate. Account for shared work when interpreting channel savings.

The architect may use one owned browser/server for combined checks. Workers use finite checks and avoid overlapping GPU sessions; retain no test service without an explicit lifetime and lifecycle record. Each delivery names the exact commit, changed paths, source baseline, checks/evidence and remaining limits. The architect alone decides promotion.
