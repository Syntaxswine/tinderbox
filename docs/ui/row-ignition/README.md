# TB-020: match and timed-torch HUD

> Presentation superseded by the [Eastlake ignition correction](../eastlake-ignition/README.md). This record and its JPGs describe candidate 35c9f85 only. The current UI restores the user's six-button wooden Eastlake design.

Candidate branch: `codex/row-ignition-ui`, based on `3c6001d5d4035e950f25e500294eaec55bbf81d2`. The delivery message identifies the exact commit containing this record. The architect owns combined review, integration and promotion.

## Result and ownership

The existing selected-tool/primary-action interface now reads `player.torch = {phase, remainingSeconds, durationSeconds}`. Matches show **STRIKE** and “One press · one ground tile”. Torch shows **LIGHT / UNLIT**, **IGNITE / LIT**, or disabled **SPENT**, with remaining seconds in both the rack and selected-tool detail. The rack remains selectable for inspection. Missing or malformed torch fields show **WAIT / Awaiting torch state** and disable use.

The UI neither lights the torch nor advances its timer. It never derives remaining time from frame rate, powder, held input or `inventory.torchFuel`; that existing resource remains internal. A lit snapshot keeps its lens lit after release. Switching away and returning displays the latest supplied phase/time. Pause and powder consume the same authoritative snapshots. The existing normalized raw joystick, once-only upstream inversion, pour toggle, flamethrower hold, focus/menu cancellation and command vocabulary are unchanged.

The main action describes the current resource and any feedback through mount-scoped ARIA IDs. Phase transitions and new action events enter the polite status; timer-only updates do not change that status or the action's accessible name. The current seconds remain available in the resource description.

Changed implementation paths are `src/ui/{model.js,index.js,styles.css}`, `tests/ui/{model.test.mjs,browser-tests.js}`, and `workbenches/ui/{fixtures.js,index.html}`. All other changes are this handoff/evidence directory. No simulation, runtime, world art, geometry, shared contract or vendor files change.

## Event consumption for integration

New safe-integer event IDs are consumed in order. Initial historical events are skipped; repeated IDs do not announce again. Reset, a diagnostic generation change, or a rewind clears feedback. Feedback is visible only for its selected tool.

For `tool-use` / `tool-rejected` with `tool: 'matches' | 'torch'`, a string `reason` takes precedence over `result`. Supported values are `empty`, `spent`, `blocked`, `range`, `no-fuel`, and successful `ignited`. Unknown rejections say “Ignition was not applied”; an otherwise unspecified use stays neutral (“Match used” / “Torch action used”). `torch-lit` and `torch-spent` are also supported, including an implicit torch tool. Particle effects and accepted input never imply successful ignition.

The proposal specifies results without pinning every event code. The coder branch still pointed to the common base at final inspection. Confirm its exact delivered payloads during integration; neutral fallbacks do not prove a complete combined feedback contract.

## Sources and preserved work

The assignment was read from the architect's `docs/milestones/06-row-houses-and-ignition.md`, SHA-256 `d59ddc6c89e76175735c3882244b0f77c14875c86d3e79c9acce1fc010c6ebe0`, in the primary checkout. This file is not copied or edited by UI.

The six preserved Farmyard UI imports and their dependency closure retain the original pin `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`; `vendor/.../provenance/ui.json` and its imported-file tests supply byte evidence. No new art, font or donor intake occurred. The artist `56b028c`, Nautilus `90054d0`, bear `4f5f539`, native dimensions, and their existing provenance remain untouched.

The separate Eastlake/wood/engraving, handle-free glass lantern and direct six-button design remains at [prior UI candidate 997a124](https://github.com/Syntaxswine/tinderbox/commit/997a12470b05c7cda1db675f667967a67ef97cbf). Its `docs/ui/six-actions/pickup-handoff.md` records the user's requirement: **walk over drugs or medicine to use them automatically**, with no manual drug buttons or Q/E/R shortcuts. The UI portion is implemented there; actual world pickup detection/application remains a coder/artist integration requirement. This bounded candidate starts from the architect's older base and deliberately retains that base's controls. Its screenshots are not approval to replace the user's newer design or to reintroduce manual medicine controls in the final game. Reconcile the two candidates deliberately.

## Verification and limits

[checks.json](checks.json) contains results, source/evidence hashes and cleanup.

- `node tools/check.mjs`: **89/89 Node tests**, 82 own scripts / 106 static modules, renderer/provenance and art checks pass. The UI subset is **9/9**, including four new model checks.
- Existing DOM browser suite: **26/26** at **390 × 844** and **1280 × 800**. Eight new checks cover phases, missing state, single edges, countdown silence, switching, exhaustion, feedback/deduplication and raw joystick preservation.
- Native Enter in the fixed unlit workbench emits exactly one primary press/release pair; the snapshot stays unlit. Paused use is disabled. Powder and torch times remain supplied examples. Captured browser warnings/errors are empty.
- Build: **129 files / 43,140,987 bytes**. Release hashes/local references pass. Nested HTTP verification checks **127 hosted files**, correct module MIME and exclusion of the QA workbench.

Evidence is the existing **DOM-only fixed-snapshot workbench**: [desktop lit](evidence/desktop-lit.jpg), [phone unlit](evidence/phone-unlit.jpg), [phone blocked](evidence/phone-blocked.jpg), [phone spent](evidence/phone-spent.jpg), [missing state](evidence/phone-pending.jpg), [match with no fuel](evidence/phone-match-no-fuel.jpg). It has no bear, carried flame, joined-row art, fuel solver or live burn clock. These images and tests do not establish the new gameplay rules. At this base the legacy simulation does not yet supply `player.torch`, so the integrated old runtime safely waits. Exact coder/artist integration and real desktop/phone WebGL review still gate promotion; WebGL recovery was not attempted.

The temporary hidden DOM preview had a real 30-minute deadline and lifecycle registration. Final source/restart preservation and exact-identity stop receipts live in ignored `artifacts/row-ignition-ui/helper`. It is stopped after review; the owned test tab is closed and the temporary viewport reset. No helper is retained.
