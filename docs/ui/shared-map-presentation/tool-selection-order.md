# Queued tool selection and immediate use

Base: `130fe10db3af8a7efcd04e71139a2fbed74b1e91`, preserving the accepted responsive correction and separate train branch.

The actual New York phone run sent Digit4 then Space before a new selection snapshot. At host tick 399, events 35/36 selected torch then matches; event 37 used a match. Global Space read the old `view.tool.id`, and `beginAction` reselected that old tool. The number-key mapping was correct.

## UI correction

`src/ui/index.js` now records the latest queued tool-selection intent separately from the authoritative view. Number keys and existing tool-button actions use the same queue helper. Global Space, and Enter for the lantern, resolve that intent before selecting the button/action. Selection and primary commands still go through the ordinary `onCommand` queue in order.

The intent persists through repeated pre-ack snapshots. Matching current-tick state, a newer host tick or a generation change reconciles it with authority; an older tool-matching snapshot cannot acknowledge it or release a pending held action. Once a fresh authoritative state settles selection, a different/disabled tool releases the held trigger through the existing path.

Cancel/blur, capability disable, reset and disposal clear pending UI intent through `cancelInput`; reset generation changes are also handled. Already queued runtime commands remain runtime-owned. The next post-cancel gesture starts from the published tool rather than a discarded UI request.

This does not change snapshot labels, stock, torch phase/time, lantern targets, capabilities, movement or gameplay rules. Existing snapshot-derived button availability still gates use, including an empty/spent torch and disabled tools. There is no timeout, frame wait or optimistic resource mutation. The existing responsive CSS, etched controls, joystick and button semantics are preserved.

## Regression evidence

- The first three mounted-UI checks failed on the original code by using matches instead of the requested torch/flamethrower. They now pass.
- Seventeen focused checks drive keyboard events on the actual mounted UI in a finite in-memory DOM. The normal UI callback queues commands to the real small CPU simulation; Space is sent before any advance/selection snapshot. No direct gameplay-command workaround or browser-harness wait was added.
- Coverage includes rapid torch use, held flamethrower/release before and after acknowledgement, repeated old updates, latest numeric choice, torch → matches, a newer authoritative override, generation reset, empty stock/capability restrictions, button-action override, lantern Enter, cancel/blur and disposal.
- The expanded older-tool-match/held test exposed a premature acknowledgement in the interim fix; acknowledgement and held-release now use the same freshness boundary. One fixture assertion initially expected the native provider's `tool-use` event name in the small legacy simulation; it now checks the actual single UI press, one-match stock debit and absence of torch ignition. Runtime behavior was not altered.
- All **63 Node UI checks pass**: 17 focused checks plus the existing 46. The changed UI module and two test modules pass syntax checks; `git diff --check` passes.

The DOM host does not load CSS/assets or emulate native browser layout, bubbling and keyboard/click defaults. It establishes queued UI command behavior, not phone rendering or native focus acceptance. No renderer, browser, server, build or retained helper was started. The architect/coder's actual New York input rerun remains the next combined gate.

## Changed paths

- `src/ui/index.js`
- `tests/ui/mock-dom.mjs`
- `tests/ui/tool-selection.test.mjs`
- This handoff.

The patch and finite test host are original Tinderbox code. Existing art, asset provenance, donor pins, runtime/simulation sources and the real-input review harness remain unchanged.
