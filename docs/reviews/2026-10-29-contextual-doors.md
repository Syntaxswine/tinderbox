# Contextual door correction

Status: **focused correction published and verified**. [Milestone 10](../milestones/10-contextual-doors.md) starts from published `99b95b0888298a53791db3fc5657c4de3002d488`. The user requests Farmyard Commando's interaction: a button appears near a door and a click operates it. The earlier [preview's deferred whole-map and WebGL acceptance](2026-10-29-explorable-places.md) remains separate.

The architect checked Farmyard's immutable `30a3b8cae5f36bb0c1df3685b7fba16f701c2083` objects. Its `app.js` anchors one nearby action button above the object; `field-view.js` uses current-camera projection; `interactions.js` checks clear reach and safe destination occupancy. The [runtime donor record](../engineering/contextual-doors/donor.json) preserves the five inspected paths and hashes, independently matched by the architect. No new donor files, source pins or art are imported.

| Owner | Exact candidate | Architect intake |
| --- | --- | --- |
| Contract | `92ec5d16c1129676502f61786506f3c0e2e742f7` | Same commit |
| Coder | `84928aa802fe1c10f8d6465dd1a058f11618d625` | `3fb14ddcbdb932f2eae816797f96faa6bd3ab07a` |
| UI specialist | `9c1c5672b28a5de43ae198513e2a2fb911570a15` | `4ef768531444fd30848193ce0554ffdd0e6705fd` |

Runtime now identifies a reachable stateful door and its Open/Close action, readable name, safe/blocked state and world anchor. The UI-root projection comes from the actual orthographic camera after its update. Explicit click commands revalidate that exact target and requested state when processed; repeated stale Open requests cannot toggle it closed, and a newly nearest neighbor cannot receive the action. Permanent passages, distant/wrong-floor/obstructed doors and unavailable sections yield no action. Actual destination leaf poses still reject overlap with the native animal.

The UI replaces the deck's permanent Interact plate with one floating timber button and the existing pointing-hand engraving. It follows camera projection every snapshot, fits around the actual top panels and above the control deck, and hides when paused, out of reach, offscreen or exiting. A blocked Close displays its runtime reason. Native click/Enter/Space and E/Space shortcuts use the same exact action. Held stale activations cannot redirect. The landscape fit and post-pause focus failures were reproduced and repaired before intake; [the UI handoff](../ui/contextual-doors/README.md) preserves their evidence.

Only the existing 14 stateful doors in New York, Administration and Horticulture belong to this correction. Catalogue Street's original houses retain their exterior scope. Building/character dimensions, immutable geometry, 9 m/s movement, powder, fire and medicine remain unchanged. The coder's separate gallery checkpoint `ac2c5df5f8f69d4d3f9fd2e5922c48b01b37d7c0` is excluded.

## Review evidence

The coder delivery passes 185 source tests, including 42 controlled visits covering all 14 source doors and three native animals, six source-leaf occupancy cases, stale/exact-target behavior, readiness and actual Three camera/lifecycle checks. [Its handoff](../engineering/contextual-doors/handoff.md) records methods and limits. The architect's independent 27 cases add 30/60/144 Hz front-door traversal in all three landmarks with every animal, closed collision, duplicate/unknown targeting and pause checks. These use unchanged source navigation and public commands.

The architect's combined `node tools/check.mjs` passes **186 tests**, static dependency/shared-renderer checks and every immutable source/provenance check. The independent 27 native-door cases pass again on the combined tree. Production changes are limited to `src/runtime/{navigation,camera,index,door-labels}.js` and `src/ui/{index,model,door-action}.js` plus `navigation.css`; no asset or workflow changes enter the release.

The complete browser suite passes **89/89** independently at **1280×800** and **390×844**. The UI worker additionally passes **320×568** and **844×390**. The architect's actual mouse joystick approach starts the bear at Administration's source grounds `[62,12,0]`, climbs the real approach stairs and stops at the closed front door around `[61.971,31.380,2.12]`. The floating Open button appears without moving the joystick well. One trusted click opens it; trusted Enter closes it and trusted Space opens it, each producing exactly one explicit command.

The same visit resizes to phone aspect, hides the action while paused, resumes it, and uses the mouse joystick to stand in the threshold. Close becomes disabled with `Move clear of the door.`; stepping clear permits a trusted Close. Nonzero UI-root offsets retain correct fitting/projection, and ordinary movement away removes the action. JPGs and full command/state records accompany the [worker evidence](../ui/contextual-doors/evidence/browser-summary.json); independent combined records and JPGs are under ignored `artifacts/qa/contextual-doors/`.

These browser checks use production UI, actual unchanged Administration navigation and the real Three camera, with ready sections and an SVG source-plan drawing. They validate this correction's interaction and projection, not a WebGL world render, GPU performance, streamed whole-map visit or complete gallery routes. No new whole-map/GPU acceptance is implied; the previous preview's deferred work remains open.

The combined build/release passes **3,456 files / 163,301,007 bytes**. A finite nested-path HTTP check verifies every packaged byte, all three native landmark loaders and character rigs, private-path exclusions and resource disposal; its port **59357** is released. Architect preview PID **45692**, creation FILETIME `134377981809016875`, stops through its registered private marker and releases port **64192**. Its real 15-minute TTL was a backup. The browser tab closes and its viewport override resets. Worker cleanup receipts report no retained helpers; no architect preview remains running.

## Publication

Published commit: [`11f9ef8ef0326eab7e994f36c45988ca5a9f5bb3`](https://github.com/Syntaxswine/tinderbox/commit/11f9ef8ef0326eab7e994f36c45988ca5a9f5bb3). Normal atomic fast-forward pushes updated `master` and `codex/contextual-doors`, without a force push. [Pages workflow 40988092257](https://github.com/Syntaxswine/tinderbox/actions/runs/40988092257) passed its build and deployment; deployment completed at **2026-10-30 01:50:25 UTC** (October 29 locally).

The architect's finite public verifier matched the hosted manifest and all **3,454 hosted game files** byte-for-byte to the approved package, including the new door action, projection and UI modules. The two nonruntime hosting/build markers are recorded separately. The verifier exited successfully without opening a listener; no architect helper remains running. Its receipt is `artifacts/qa/contextual-doors/published-preview-verification.json`.

Play [Tinderbox](https://syntaxswine.github.io/tinderbox/) after reloading the page. Nearby landmark doors now offer the floating Open/Close button. This correction does not absorb the separate gallery work or waive the earlier preview's deferred acceptance. This publication receipt changes documentation only.
