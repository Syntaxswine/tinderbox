# Faster movement and joystick correction

Status: **focused correction approved for publication; deployment pending below**. This is [Milestone 09](../milestones/09-movement-and-joystick.md), from published checkpoint `38f6e803bf43493fdcd641f62f8644d13b99488f`. The [earlier preview review](2026-10-29-explorable-places.md) retains its broader deferred gallery and WebGL acceptance.

The user requests three times the preview's movement speed and reports unreliable joystick movement on Administration stairs, using a mouse. The accepted shared base speed is 9 m/s; powder retains its existing multiplier and world-time slowdown. Character geometry, source stairs, fire/tool clocks and the four-map release boundary remain governed by their existing contracts.

The existing coder and UI specialist implement separate scoped candidates. The coder's earlier gallery work is preserved at `ac2c5df` on its separate branch and is excluded from this correction. No later art, donor revision or gallery reconstruction is included.

## Reproduction and evidence

The architect's baseline controls use the actual published source support/barriers and ordinary movement commands from controlled stair starts. New York's second interior flight passes 12 bear cases at 3/9 m/s and six analog magnitudes. Administration's front-west spiral passes 32 local bear segments at four magnitudes. These isolate analog support; they do not establish complete routes or identify the user's exact failing gesture.

The UI specialist's first trusted mouse hold also traversed Administration's approach stairs without losing capture or its movement vector. Its separate reproductions found that layout movement could reinterpret a held gesture against a new origin, and a missed release could leave stale joystick ownership. The architect additionally identified fresh mouse press recovery without an intervening hover as a necessary regression. The exact user-reported stair failure is not yet established as either defect.

The reviewed UI repair anchors a gesture's input rectangle at press time, clears stale mouse/pen ownership when a no-buttons hover arrives, and accepts a fresh left press from the same mouse after a missed release. Touch ownership, release/cancel/focus/pause stopping and analog values remain covered. The coder also synchronizes both diagnostic route controllers with shared configuration so their waypoint calculations follow the new movement speed.

| Owner | Exact candidate | Architect intake |
| --- | --- | --- |
| Coder | `4c70225ed66b787b874ddc22835f802aab087c75` | `eb3b3d7f57ede6db23c293e7927f08cd1babcada` |
| Coder delivery record | `97d2cde173740d0d117546c7bb8d938b876b3d68` | `33fd287b926584afe28f6a2bedfd3384b640f7ef` |
| UI | `ae54b175546c689d46060e1cc035cd906e6c5276` | `2440e4ece0f5834cfd7bbf155c90a5cd7bac9f80` |

Only `src/simulation/config.js` and `src/ui/index.js` change in production source. Diagnostic tools, tests and evidence accompany them. Assets, navigation/collision geometry, native envelopes, shader/render code and donor pins are unchanged. The [coder handoff](../engineering/movement-input/handoff.md) and [UI handoff](../ui/movement-input/README.md) preserve exact methods, before/after reproductions and limits.

## Combined acceptance

The architect's combined source/provenance/behavior check passes **173 tests**. Independent measurements pass **36 cases** across the three animals at 30/60/144 Hz and 250 ms hitches: 9 m of normal movement per active second, normalized diagonals, 13.5 m under powder, unchanged world-time scaling, accepted-distance fuel use and pause stopping. The coder's committed evidence adds **261 Administration stair round trips and 54 keyboard/mouse-vector comparisons** across native animals and stair orientations, with no unsupported collision workaround.

The architect independently reviewed the combined 9 m/s code in the browser at **1280×800** and **390×844**. A trusted full mouse hold with the bear reached Administration's ground rooms at 2.12 m over 91 held frames; a partial mouse hold at approximately .352 magnitude reached the same landing over 238 frames. Both retained one stable control rectangle and continuous input, then released to a zero vector. The complete browser suite passes **77/77** at both sizes, including the three repaired gesture cases. The UI worker additionally checked small-phone and landscape sizes.

These browser checks use the production controls and actual source navigation model, with ready sections and no WebGL world renderer. They validate this correction's mouse behavior and support transitions. They do not establish the precise cause of the user's original interior stair incident, GPU performance, or the broader milestone-08 whole-map/gallery acceptance. Those limits remain open; no new whole-map visual acceptance is claimed.

The combined production build and release check pass **3,454 files / 163,290,368 bytes**. Actual nested-path HTTP verification checks every packaged byte, all three landmark loaders, native rigs, private-path exclusions and resource disposal. Its server exited and port 49197 was confirmed released. The architect's registered browser preview (PID 70380, exact lifetime recorded) stopped through its private marker and released port 64191. The temporary browser tab closed and its viewport override was reset. No architect helper remains running.

Local finite diagnostic scripts and receipts are under ignored `artifacts/qa/movement-input/`. Publication status will be recorded below after deployment verification. Future gallery work remains a separate candidate.

## Publication

Pending push, workflow completion and hosted-file verification for this exact combined correction.
