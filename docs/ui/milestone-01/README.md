# TB-006: burning-trail interface

Review baseline: `fddc7ce218695dad14b6015de4019e89d53a6255`. Candidate branch: `codex/ui-design`. This is the UI specialist's bounded delivery for [Milestone 01](../../milestones/01-burning-trail.md); the architect assembles and reviews the final game.

The control deck contains exactly five tools and three drug actions. It keeps the movement stick available while pouring and taking drugs. The primary button changes from Pour to Stop only when an authoritative snapshot reports pouring. A lit red lens, a stop mark, and a POURING legend distinguish that state. Empty tools remain selectable for inspection; their primary action is disabled. Empty drugs and healing at full health are disabled. Health, all eight stock values, selected tool, pouring, effect flags and remaining times are read from snapshots.

The interface reuses Farmyard's olive switch skins and red celluloid lenses, white painted legends, and nine-slice metal frame. Original Tinderbox vector symbols identify the tools and drugs. At 390 × 844 the deck is a compact bottom panel; at 1280 × 800 the stick spans the two control rows to leave more of the field visible. Pause, resume, reset, controls help, reduced interface motion and high contrast labels are included. Preferences are session-local UI choices.

## Integration

`src/ui/index.js` exports `mountUI({root, onCommand})`, returning `update(snapshot)` and `dispose()`. It imports no simulation or art module. It does not advance clocks, subtract stock, heal, deposit fuel, invert input, pick aim, or resolve gameplay.

```js
import {mountUI} from './src/ui/index.js';

// root must cover the scene and have a positioned ancestor.
// For a dedicated overlay div, use position:absolute; inset:0; pointer-events:none.
// Interactive controls explicitly restore pointer events. Field picking stays with runtime.
const ui = mountUI({root: uiRoot, onCommand: command => simulation.dispatch(command)});
ui.update(simulation.snapshot());
// At presentation updates:
ui.update(snapshot);
// Before replacing the scene/root:
ui.dispose();
```

The module loads its own stylesheet relative to `import.meta.url`; CSS, SVG and raster URLs work under a nested static-host base. It appends one owned shell and preserves existing root children. A focusable field canvas may be a sibling under the same scene parent; keyboard movement/primary remain available there. Moving focus outside that scene clears held input. Use this HUD as the keyboard source rather than binding a second shortcut controller in composition. Multiple mounts receive unique ARIA IDs. Display updates are cached by visible state so an unchanged 60 Hz snapshot does not rebuild the controls.

Commands follow contract v1. Stick and keyboard movement emit normalized raw `move` vectors with +X right and +Y up, including during inversion; the coder applies the 180° reversal once. The UI emits no `aim` command. Tool clicks emit `select-tool`; primary pointer/keyboard press and release emit `primary`; drugs emit `drug`. It does not cancel movement for tool or drug activation. Independent pointer IDs support a held joystick plus a second touch. Discrete controls use native button activation; repeated Enter/Space does not consume items repeatedly.

Pause opens a modal, cancels held input and requests `pause:true`. Resume waits for an unpaused snapshot. Reset emits `reset`. Pointer cancellation, lost pointer capture, blur, hidden document, death/paused snapshots and disposal neutralize held input as appropriate. Releasing the joystick normally sends zero movement without cancelling toggled pouring. Event listeners and the owned stylesheet/DOM shell are removed on disposal.

Keyboard: WASD/arrows move; 1–5 select tools; Space uses the primary action; Q/E/R use powder/healing/inversion; Esc/P opens pause. Native Enter/Space works on focused buttons. The modal traps Tab/Shift+Tab including option checkboxes, and restores focus after resume. Reduced-motion media preferences and forced-color fallback styles are respected.

## Workbench and checks

The workbench uses `workbenches/ui/fixtures.js`, clearly labelled **fake snapshots / input diagram only**. Commands echo into fixed UI examples; stock is not consumed, timers are frozen, the input marker is static, and no movement/fire/damage model exists. Fixtures cover ready/hurt, pouring + powder, inversion, low health/stock, empty stock, paused and bear down. The command inspector shows the serialized output.

Start the hidden loopback preview from this worktree with the current owning chat UUID:

```powershell
./workbenches/ui/preview.ps1 -OwnerThreadId YOUR-OWNING-CHAT-UUID
```

It checks the port and prior process identity, reuses an appropriate existing owned helper, registers each new process lifetime with the user's helper-lifecycle utility, writes a restart record, and enforces a 60-minute expiry. The default URL is `http://127.0.0.1:4552/workbenches/ui/`. The utility and bundled Python paths follow this user's configured Windows setup. Use `-Port` and `-Minutes` only for deliberate new lifetimes; expiry is never extended when reusing a live helper.

Stop by creating `artifacts/ui-preview/STOP`, then verify `exit.json`, the exact process identity and the released port. Source and outputs survive. A deliberate restart through `preview.ps1` validates the old lifetime before removing its stop marker. Browser tabs are disposable review tabs.

```text
node --test tests/ui/model.test.mjs
http://127.0.0.1:4552/tests/ui/
http://127.0.0.1:4552/nested/ui-review/workbenches/ui/
```

Five Node checks cover the contracted action set, normalized raw vectors, read-only authoritative display state, empty/Stop gating and all imported byte/hash/CSS-closure records. Eighteen real-DOM browser checks cover authoritative selection/pouring, all actions, simultaneous pointer IDs, inversion, keyboard repeats/holds, cancellation/focus, modal focus, snapshot gates, full listener disposal, unique ARIA references and touch target bounds. They pass at both required viewports.

Browser review includes real pointer drags with inversion active (raw NE remains positive X/Y), native Enter/Space activation (one press/release pair per key, Pour → Stop → Pour), raw W movement, drug use, pause/options, empty and low-stock states. The workbench's oversized decorative background originally allowed focus to scroll its clipped container; `overflow:clip` prevents that. Both viewport layouts and a nested serving base resolve locally without browser console errors. This server only serves the UI, its fixed fixtures/tests and the selected local vendor UI closure.

Local evidence lives in ignored `artifacts/ui-review/`: portrait/desktop ready and pouring captures, options/empty states, browser check JSON and a real-pointer inversion command receipt. Evidence paths and the final exact candidate SHA are supplied in the handoff. They are review evidence, not game acceptance.

## Source and limits

The six unchanged imports are under `vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/`: the switch atlas, map frame, symbols, generation manifest, industrial-switch CSS and map-frame CSS. `provenance/ui.json` records exact source/installed paths, revision, SHA-256, bytes, symbol ancestry, dependencies, notices and adapter use. Both rasters match the generation manifest. The central provenance index and shared renderer are untouched.

The donor was read only through pinned `git show` objects; no donor builds, writes or candidate-branch imports were used. Reproduce extraction with `node workbenches/ui/import-ui.mjs <read-only-donor-checkout>`. Overrides live in `src/ui/styles.css`; original vendor bytes remain separate. The editable original vector source is `assets/art/ui/control-symbols.svg`.

Farmyard/AFT general code/art rights remain unresolved as recorded in the audits; preserved provenance is not a license grant. This delivery has not been combined with simulation/world art, reviewed by fresh players, or tested on physical touch hardware or assistive hardware. Browser viewport checks and synthetic multi-pointer checks do not establish physical-device performance. Fire, resources, healing, duration, aim/camera, the actual 180° movement reversal, and the bear/exterior remain the other workers' and architect's integration responsibilities.
