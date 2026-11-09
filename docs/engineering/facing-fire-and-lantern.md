# Flamethrower facing and lantern aim

The runtime candidate starts from published `192d3ba0ea8ae2a30e74960be3508ecc363ae3e6` on `codex/facing-fire-and-lantern-coder`.

## Controls

Choose **Play → Catalogue Street**. Use the joystick or movement keys to turn and hold **Flamethrower**. The avatar and the clipped cone turn together while firing. A new scene tap with the flamethrower equipped can turn the avatar at rest. Hover updates the cursor position without turning the avatar. The default jet reaches up to 4.5 m.

| Lantern input | Runtime result |
| --- | --- |
| First press with stock | Arms with no target, path or projectile. The player stops and keeps all lanterns. |
| Move the stick while armed | Turns the avatar and aims on the current camera axes. Displacement beyond the 0.12 dead zone scales reach up to 6 m, shortened along the same ray at the map edge. |
| Center or release the stick | Locks the last intentional target. A target at least 0.15 m away can be thrown. |
| Release the launcher and press again | Throws one lantern along the locked arc. The launcher returns to idle and spends one lantern. |
| Change tool, pause, reset, lose focus, cancel input or die | Clears the aim without spending stock. If a stick direction was still held when the aim ended, it must center before it can move the player. |

A press with no aim or with the stick still adjusting reports `aim`. A locked target outside the valid throw range reports `range`. Empty stock reports `empty`. Real-time world updates continue during aiming. Inversion affects movement. Lantern aim uses the unmodified joystick direction projected through the same camera axes.

## Runtime and UI contract

`snapshot.player.lanternAim` is null when idle. When armed, it supplies `{target, impact, path, adjusting, canThrow}`. Target uses ground metres `{x,y}`. Impact and path samples use `{x,y,h}`, with `h` as height. The HUD can project those through `onProjectInteraction([x,h,y])`. The initial armed state has a null target and impact, an empty path and both flags false. Snapshots detach the aim and path from live gameplay state.

The preview and projectile share the same arc and swept collision step. The preview uses the current blockers and scheduled powder expiry. It refreshes when the target, the prospective powder schedule or collision boxes change, including collapse and burnout. A launched lantern continues checking live blockers. The path has at most 13 points. The forecast caps work at 192 sweep steps and samples more coarsely for custom timing that exceeds that budget. Default movement and powder timing fit within the budget.

`src/simulation/lantern.js` owns aim and projectile stepping. `src/simulation/index.js` routes existing input commands, cancels aim and publishes the snapshot. `src/simulation/geometry.js` shares world-edge clipping with close tools. `src/simulation/tools.js` uses avatar facing for the cone and keeps the existing lantern oil, timber contact and barrel heat paths. `src/runtime/navigation.js` provides a null lantern state in landmark visits.

The reference is the Farmyard/AFT solo build at `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`. The pinned `sites/tactical-animal/dist/app.js` blob `79f3efff669610061409558b8a067960f82994f9` supplies the arm, aim and commit interaction. The `sites/tactical-animal/dist/grenade-controls.js` blob `6cd555b80ef41f779c59fd20f294994c15cb4ee0` supplies the dead-zone and displacement reference. Tinderbox adapts that behavior with its own camera, controls and real-time projectile. No donor files are included in this change.

## Verification

- The packaged phone viewport measured 390 × 844, with a 390 × 420 game canvas. At night on regular Catalogue Street, the bear stayed at (20, 18) through arm, stick aim and release. The locked endpoint was (17.754, 19.815), about 2.89 m from the player. The launcher went from four to three only on the second press. The first impact matched the preview in all three coordinates.
- At the calm Ashland spawn, the bear and cone both faced west at π radians with the stored cursor 0.80 m east. The center ray stopped at the foundation after 0.7499 m. The jet ignited the `right:3,0` timber site while held. Both browser visits recorded zero page errors. Receipts and WebGL JPGs are in `artifacts/qa/facing-fire-and-lantern/recordings/`.
- `node tools/check.mjs` passed 220 tests plus the provenance and art checks. The focused tests cover turning a held cone and its heat, explicit tap versus hover, both ordinary and Ashland timber contacts, exact first impact during powder expiry, blocker retirement, stock, cancellation and reset. `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,483 files at a nested project URL. The manifest SHA-256 is `9312391d58d6535f566f72991cee85cb3198ee0fd21867671bdd20a508628ab3`.

The browser visits used the production buttons and joystick from the published HUD, with a diagnostic overlay that projected the new runtime path. The Aim and Throw labels, gameplay preview, Escape and on-screen cancellation, and the legacy browser HUD test update are part of the separate UI integration. The temporary browser tab and server were closed and port 4568 was released.
