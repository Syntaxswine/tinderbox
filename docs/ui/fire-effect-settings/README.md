# Furnished-house fire effect controls

Candidate from architect contract `5bcd95dc5bd5b2f8f1e65fa2de19e3d84d87ecb3`, with runtime/art frozen at `250956566a87123a521853b447991db831f4dae6`. The independent-effects contract is [milestone 19](../../milestones/19-fire-effect-settings.md).

## Interface

`workbenches/furnished-house/effect-controls.js` exports:

```js
const unmount = mountEffectControls({
  root: document.getElementById('fire-effect-settings'),
  preferences
});
```

The coder supplies the contract's preference store with `snapshot()`, `set(patch)` and `subscribe(listener)`. Subscription returns an unsubscribe function and immediately supplies its current snapshot. The UI reads and subscribes; it never resets the store. Each native checkbox sends one patch containing its own boolean key:

| Label | Preference |
| --- | --- |
| Flames | `flames` |
| Smoke | `smoke` |
| Fire lighting | `lighting` |

The store supplies the all-on defaults and persisted choices. External changes, including `window.__furnished.setEffects(patch)`, render through the same subscription without a feedback write. Fire lighting has an associated explanation: light cast by fire onto the surroundings; ambient night light stays on.

Call `unmount()` on teardown. It is idempotent and removes owned elements, input/keyboard listeners and the store subscription. A replacement mount on the same root disposes the previous one and preserves the store. It retains unrelated caller DOM. Reset/replay lifecycle belongs to the host, which should mount once and retain that store across resets.

## Presentation and input

The HTML contains one empty `section#fire-effect-settings`. The mounted fieldset's legend is **Settings**, with three enclosing labels and native checkboxes. Scoped CSS reuses the existing warm brown, ochre and Georgia typography; each labelled row has a minimum 44-pixel height. The checked accent is ochre and keyboard focus has a visible outline.

Checkboxes keep the browser's Tab, Shift+Tab and Space behavior. The group stops keydown propagation without cancelling browser defaults, so focused settings do not feed the workbench's walking keys. Key release remains available to the host.

Only the preferences store receives changes. This module imports no art, simulation, clock, storage or gameplay commands. The coder owns mounting, persistence, redraw on paused changes and `view.effects`; the artist owns independent effect work/culling. This candidate leaves `main.js`, the original movie, production controls and Pages untouched.

## Checks and combined review

Finite worker check:

```text
node --test tests/furnished-house/effect-controls.test.mjs
```

Worker results:

- `node --test tests/furnished-house/effect-controls.test.mjs`: **6 passed**.
- `node --test tests/ui/*.test.mjs tests/furnished-house/effect-controls.test.mjs`: **32 passed**.
- `node tools/check.mjs`: **326 passed**, with syntax, local dependency, shared-renderer, byte-preserved provenance and offline art checks passing.
- `git diff --check`: passed.

The Node DOM host verifies all eight combinations, independent one-key patches, all-on initialization, preserved choices, external synchronization without feedback writes, remounting, keyboard-default preservation, disposal and scoped markup. It does not emulate native focus, label clicking, Space activation, CSS layout, storage or WebGL.

Architect combined acceptance uses the real coder store and mounted workbench:

1. At normal zoom on desktop and phone, inspect the Settings group, three labels, full-row touch targets, focus outline and scroll access. Tab and Shift+Tab through all three; Space toggles the focused checkbox once. Click/tap each label and confirm one change. Walking keys while focused on settings must not move the observer.
2. Exercise all eight combinations. Confirm the checkboxes, `effects()`, art counts and output agree. With a paused replay, toggle each channel and restore it; simulation tick/state must remain unchanged and presentation must redraw immediately.
3. Change choices through `setEffects()`; verify immediate checkbox synchronization. Reset repeatedly, verify choices persist and exactly three controls remain. Refresh and test malformed/blocked storage through the coder's checks.
4. Dispose and verify subscriptions/DOM are released. Review JPGs and timing with the artist/runtime candidate; worker Node checks do not establish visual or GPU acceptance.

The contract assigns browser/GPU review to the architect; this UI worker starts no browser, server or GPU helper. No donor assets, fonts or external dependencies are imported. Styling adapts only the existing workbench HTML at the frozen source above.
