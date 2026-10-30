# Milestone 10: Farmyard-style door buttons

The user specifies Farmyard Commando's door interaction: a button appears when the animal is near a door, and one click uses it. Start from published checkpoint `99b95b0888298a53791db3fc5657c4de3002d488`. Preserve the completed 9 m/s movement/input correction and all existing source pins. This focused correction covers the existing stateful doors in landmark visits; it does not add interiors to the catalogue houses or absorb the coder's separate gallery work.

## Verified donor behavior

Read-only inspection of Farmyard pin `30a3b8cae5f36bb0c1df3685b7fba16f701c2083` establishes the pattern in `sites/tactical-animal/dist/`:

- `app.js`, `positionInteractionHand` / `renderInteractionHand`: one contextual button anchored above the selected nearby object, hidden when unavailable, paused, loading or outside the view. The first action is invoked on a tap.
- `field-view.js`, `interactionAnchor`: project the object's world position through the current camera; doors use a 2.15 m anchor height.
- `interactions.js`, `accessible` / `preview` / `perform`: clear reach and authoritative action checks; Open/Close depends on the actual door state; an animal in the destination door pose blocks the action.
- `game.html` and `touch-controls.css`, `.interaction-hand`: a floating button with a small pointer and readable action label.

Adapt this interaction pattern to Tinderbox's existing warm brown panels and period typography. Do not import Farmyard's turn/AP system, long-press menus, save state or deployment configuration. No new donor asset intake is required. If copying source text or assets, record the exact paths, hashes, adaptations and existing license evidence rather than silently treating the recipe as an imported file.

## Ownership and shared API

Reuse **Coder Tinderbox** in its existing coding worktree on `codex/contextual-doors-coder`, and **Set up Tinderbox UI worktree** in its existing UI worktree on `codex/contextual-doors-ui`. Both start at the exact checkpoint above, after verifying a clean checkout. Preserve all previous branches, including the coder's unfinished `codex/explorable-places-coder` checkpoint. Architect uses `codex/contextual-doors` and owns integration, independent QC and promotion. Artist has no new assignment.

TB-031: coder owns runtime/navigation/camera adapters, relevant behavior tests and `docs/engineering/contextual-doors/`. TB-032: UI specialist owns `src/ui/**`, UI/browser checks and `docs/ui/contextual-doors/`. TB-033: architect owns this contract, reconciled review and publication. Workers must not edit each other's paths.

The navigation snapshot exposes `player.interaction = null` when there is no reachable stateful door. Otherwise it supplies `{id, kind:'door', action:'open'|'close', label, enabled, reason, anchor:[x,y,z]}`. `label` includes the action and door's name; `reason` is an empty string when usable or a short explanatory string when blocked. `anchor` is a finite world position above that door, at its floor elevation plus 2.15 m. Reach, floor eligibility, obstruction and safe destination pose belong to runtime, never UI callbacks. Keep existing reach dimensions; permanently open passages do not produce an action.

Runtime supplies `onProjectInteraction(anchor)` to `mountUI`, returning `{x,y,visible}` in pixels relative to the UI root. Coder owns camera projection and viewport/root offset conversion. UI owns the button, its size, label and fitting inside the visible viewport without covering the joystick/control deck. Update projection after the camera updates, including while the same door remains selected, on movement, view changes, zoom and resize. A hidden/offscreen/invalid projection must not leave a clickable ghost button. UI must not infer world coordinates or reimplement camera math.

The floating button emits `{type:'interact', portalId:interaction.id, action:interaction.action}` exactly once per click or native keyboard activation. Runtime revalidates that exact target and requested state when processing it, rejecting stale, distant, wrong-floor, obstructed, unknown or unsafe requests without choosing a different door. Repeated stale Open requests must not toggle a door closed again. Keep legacy untargeted `{type:'interact'}` nearest-door behavior for existing keyboard/tooling callers. The production UI's E/Space shortcut uses the same current authoritative target/action. No optimistic collision or state changes in UI.

## Presentation and bounded checks

Remove the permanent Interact plate from the exploration control deck; Places/Menu remain. Show the floating Open/Close button only for a valid nearby door with a visible projection. A nearby unsafe action may remain visible disabled with its reason. Hide it during pause, menu exit, disposal and unavailable context. Use a real accessible button, warm browns and existing period type, a clear action label and at least a 44 px target. Keep E/Space help. Native Enter/Space activation on the focused button must not also trigger the global interaction shortcut. Do not displace or interrupt a held joystick merely because a door label/button appears or changes.

- Runtime checks: approach/open/traverse/close on actual landmark source doors; closed/open leaf collision and unsafe open/close occupancy; no action for permanent passages, another floor, out-of-reach or through intervening solids. Explicit target/state commands reject stale requests and cannot act on a newly nearest neighbor. Preserve section readiness, collision, native dimensions and all movement timing.
- Camera checks: real orthographic projection in follow/overview, desktop/phone aspect, nonzero root offsets, resize and offscreen/behind-camera cases. UI checks: appear/disappear, Open-to-Close label, disabled reason, one command per mouse/touch/Enter/Space activation, stale snapshots and no joystick geometry change.
- Combined browser review uses actual navigation/camera projection and actual UI at desktop and phone sizes. Exercise a door approach and click, state change, moving away, pause/resume and resize. Report WebGL restrictions accurately; a DOM/source-navigation review does not establish a rendered whole-map acceptance. Retain the older preview's deferred map review as a separate limitation.
- Run appropriate source/static/behavior checks, production build and nested-path release verification. Deliver exact scoped commit(s), changed paths, donor evidence, checks/results, visual/interaction evidence and helper cleanup receipts. Failed relevant checks block promotion. Workers may push passing candidates; architect alone promotes to `master` and verifies Pages.

This contract accepts the user's contextual door behavior and the architect's bounded implementation choices above; it does not itself promote candidate code.

The [architect review](../reviews/2026-10-29-contextual-doors.md) records exact intakes, checks, limitations and the later promotion decision.
