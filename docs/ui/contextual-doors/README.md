# TB-032: contextual door button

UI-only candidate on `codex/contextual-doors-ui`, from published `99b95b0888298a53791db3fc5657c4de3002d488`. Contract: `docs/milestones/10-contextual-doors.md` at `92ec5d16c1129676502f61786506f3c0e2e742f7`. Combine with coder candidate `84928aa802fe1c10f8d6465dd1a058f11618d625`; no runtime file is absorbed here. Exact worker SHA is supplied with delivery. [Checks and source hashes](checks.json) identify the reviewed tree.

## Result and API

The permanent Interact plate is removed from the exploration deck. Places/Menu and the joystick remain. One floating timber button uses the existing pointing-hand etching, warm ochre/brown materials and local period-inspired typography. It shows the authoritative Open/Close label and E/Space help, with a small pointer above the nearby door. A blocked action is disabled and displays the runtime's reason.

`mountUI` accepts optional `onProjectInteraction(anchor)`. The callback owns camera/world projection and returns `{x,y,visible}` relative to the UI root. UI calls it on every snapshot, even when the same door/state remains selected, then fits the measured button around actual title/map panels and above the control deck. It also refits on resize/scroll. The safe empty central header gap remains usable in landscape. A 44 px minimum target is enforced; unavailable/invalid/offscreen projection or insufficient safe space hides and disables the action. No camera, proximity, collision or door-pose rule is implemented in UI.

Only complete `player.interaction` door records are presented: `{id,kind:'door',action:'open'|'close',label,enabled,reason,anchor:[x,y,z]}`. The model copies the anchor and never mutates the snapshot. Legacy/partial records, passages and missing projection support stay unavailable. Click and E/Space emit `{type:'interact',portalId:id,action}` using that exact current target/state; there is no optimistic door toggle.

Native Enter/Space on the focused button delegates to its native click and cannot also trigger the global shortcut. Repeats are suppressed. A target/state change between pointer/key press and native activation cancels that held activation rather than redirecting it. Pause, exit and disposal hide the action, clear listeners and reject stale callbacks. Resume restores focus after repaint, with Menu as fallback if the prior door disappeared. Unchanged labels/status text are not rewritten every frame; projection continues to update.

The 9 m/s setting, analog curve/dead zone, inversion, frozen joystick gesture origin, mouse-release recovery, fixed-step behavior, menus, fonts, art and source pins are unchanged. Door appearance and label/state changes do not move the well or cancel a held joystick.

## Farmyard provenance

Read-only inspection used Farmyard pin `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`: `app.js` (`positionInteractionHand`, `renderInteractionHand`), `field-view.js` (`interactionAnchor`), `interactions.js`, `game.html` and `touch-controls.css` (`.interaction-hand`). [Donor evidence](donor-evidence.json) records exact paths, original byte counts and SHA-256 values. This adapts the interaction recipe with existing imported Tinderbox/Farmyard surfaces and engraving; no new donor source file, asset, AP/turn system, long-press menu, save namespace or deployment configuration is copied. Existing provenance/licenses remain authoritative.

## Verification and evidence

- `node tools/check.mjs`: 174/174 tests, 144 own scripts, 179 static modules, shared renderer/provenance and all immutable intake checks pass. Art: 5 preserved imports / 36 dependency and syntax checks.
- Typography check passes: original 9 font/notice/source files, three faces and both OFL notices.
- Full UI browser suite: 89/89 at 1280×800, 390×844, 320×568 and 844×390. Existing movement, title/menu and six-tool coverage remains. New cases cover explicit target/state, per-snapshot projection, invalid/offscreen/throwing callbacks, unsafe reason, native activation, stale held activation, unchanged text, stable joystick geometry, safe fitting, offset roots, pause/exit/disposal and resume focus.
- Trusted browser mouse and native Enter/Space: exactly one `admin-front` command per activation and actual source door state changes. Source phone review steps into the open doorway, sees disabled Close with `Move clear of the door.`, steps clear and closes it. E/Space, movement away, pause/resume, resize and nonzero UI-root offsets are recorded. Synthetic pointers cover touch/pen; hardware touch/pen acceptance is not claimed.
- Build: 3,455 files / 163,296,532 bytes. Release hashes/relative URLs pass. Nested HTTP: 3,453 public hashes and module MIME types pass; QA is excluded. Console errors/warnings: zero. Final review-fixture syntax was checked after its manual-input takeover refinement.

[Desktop Open](evidence/desktop-open.jpg), [desktop Close](evidence/desktop-close.jpg), [phone Open](evidence/phone-open.jpg), and [unsafe Close](evidence/phone-unsafe.jpg) show the actual HUD, source-derived SVG plan, door and animal markers. These are navigation/camera diagnostics, not a rendered WebGL world. [Checks](checks.json) include native state/command records, all viewport results and portable evidence hashes. The saved pre-fix landscape and resume-focus failures explain the corresponding fitting/focus corrections.

## Review fixture and combination

After combining the exact UI and coder candidates, serve the checkout with the existing finite preview/helper policy and open `tests/ui/door-review.html` with no query parameter. It uses real `createExploration` and `createCameraRig`; the production UI receives `rig.projectInteraction(anchor,hud)`. The SVG drawing uses Three's actual camera for source-plan/door/animal markers. The UI callback does no projection math. `tests/ui/index.html` runs the full UI suite.

Visible review controls start at source grounds `[62,12,0]` or deliberately create a near-door fixture at `[62,30.05,2.12]`, near `admin-front` at `[62,2.12,32]`. Reset focuses movement. Step into opening/Step clear/Walk away send ordinary public move commands, respect actual source collisions, and yield to manual movement. They do not teleport the live player. Offset UI root and resize exercise root-relative placement. Pause/resume and the real floating button use the ordinary UI/navigation APIs. The fixture disposes on page exit and after 30 minutes.

Before the architect combined the candidates, browser evidence used ignored private runtime copies. [Runtime source evidence](runtime-source-evidence.json) verifies all three original modules against exact coder commit `84928aa802fe1c10f8d6465dd1a058f11618d625`; the private copies relocate dependency imports only. The diagnostic `runtime=candidate` query is private and unnecessary in the combined checkout. No copied runtime code or private helper is committed. An uncombined UI-only checkout reports that contextual-door runtime support is required.

This gate does not establish full WebGL rendering, streamed sections, complete landmark/gallery routes, or promotion. Architect owns combined production review and publishing. The temporary browser tab is closed and its viewport override reset. The finite preview helper is stopped after source/restart preservation; [cleanup receipt](evidence/helper-cleanup.json). No helper is retained.
