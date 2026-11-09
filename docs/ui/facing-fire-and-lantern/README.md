# Facing fire and lantern aim — UI handoff

The UI candidate starts from published `192d3ba0ea8ae2a30e74960be3508ecc363ae3e6` on `codex/facing-fire-and-lantern-ui`. The earlier UI checkpoint `076d2dd7caf42a1354d5886fa3c562d3ea9e8b4a` remains on its own branch. The commit containing this handoff is the review candidate.

The same glass oil lantern plate now reads **Aim lantern** at rest and **Throw lantern** while armed. The joystick reads **AIM** and a parchment strip shows direction, distance and release guidance. The strip sits above the deck; the six main controls and stick origin stay in place. The cream landing mark and restrained arc dots use only the authoritative impact and path through the existing camera projection. The flamethrower plate now says to hold and spray where the character faces.

A mouse or touch tap on the lantern sends one selection and press/release pair. Enter or Space works from its plate, and the selected lantern also supports Enter or Space from the stick. A new stick drag or direction key sends the existing normalized move command. Release sends zero without cancelling the target. Throw availability follows `canThrow` and existing stock/pause gates. Escape and the contextual **Cancel aim** button issue the existing cancellation command without opening the menu. Pause, focus loss, death and selection retire held input; stale releases and key repeat cannot start a new gesture. Missing or invalid lantern state disables the plate until the compatible runtime supplies it.

The HUD neither computes the trajectory nor spends inventory. It reads the shared v1 snapshot shape `null` or `{target,impact,path,adjusting,canThrow}`, and projects `[x,h,y]` using `onProjectInteraction`. An invalid or offscreen projection hides its mark without changing the command's availability. The overlay receives no pointer input.

## Sources and scope

Read-only donor: Farmyard/AFT solo at `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`, `sites/tactical-animal/dist/app.js` (blob `79f3efff669610061409558b8a067960f82994f9`; `renderGrenadeControls`, `armGrenade`, `commitGrenade`) and `grenade-controls.js` (blob `6cd555b80ef41f779c59fd20f294994c15cb4ee0`). Its joystick displacement, 0.12 dead zone, release to hold, and second press informed the interaction. No donor bytes, assets, art provenance or pins changed.

Changed production paths: `src/ui/index.js`, `src/ui/model.js`, `src/ui/styles.css` and `src/ui/lantern-preview.js`. Checks extend `tests/ui/browser-tests.js` and `tests/ui/model.test.mjs` with `tests/ui/lantern-checks.js`. The temporary native browser fixture lives only in ignored artifacts. No public menu, game rule or scene changed in this candidate.

## Evidence

[Check record](checks.json): 214 offline tests and 3,483 packaged paths passed. The [browser suite](evidence/dom-checks.json) passed 102 checks each at 1280×800, 390×844, 320×568 and 844×390 (DPR 1). The [desktop trace](evidence/native-desktop.json) shows one arm and one throw each by mouse and keyboard, followed by Escape cancellation without pause or stock use. The [phone trace](evidence/native-phone.json) shows a native mouse drag and contextual Cancel in the phone viewport. Synthetic touch events cover the touch path; no physical handset was exercised.

- [Desktop locked aim](evidence/desktop-aim-locked.jpg)
- [Phone waiting for aim](evidence/phone-awaiting-aim.jpg)
- [Phone locked aim](evidence/phone-aim-locked.jpg)

The JPGs show the production HUD over a controlled night background with fixed preview points; they do not show game art, simulated fire or WebGL. A separate read-only Node check against coder candidate `b635889a6b062299afe6bb7187888897f97d0569` used its actual v1 snapshots: stock 4 on arm, 13 path samples, unchanged target on release, stock 3 after throw, and cancellation without pause. No runtime code was taken into the UI branch. The architect's combined in-game review and promotion remain pending.

The temporary preview was stopped after source and evidence preservation. Its process exited, port 4552 was released, and the browser tab and viewport override were closed.
