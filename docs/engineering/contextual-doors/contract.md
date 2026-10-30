# TB-031 runtime/UI boundary

Base: `99b95b0888298a53791db3fc5657c4de3002d488`. Architect contract: `docs/milestones/10-contextual-doors.md` at `92ec5d16c1129676502f61786506f3c0e2e742f7`. Work is limited to the assigned coding branch, `codex/contextual-doors-coder`.

`snapshot.player.interaction` is `null` without a reachable stateful door; otherwise:

```js
{id, kind:'door', action:'open'|'close', label, enabled, reason, anchor:[x,y,z]}
```

`id` is the unchanged source portal ID. `label` is a readable action/name, for example `Open front doors`, `Close upper east doors` or `Open west court rear doors`; raw source labels are adapted in `src/runtime/door-labels.js`. `reason` is empty when enabled, `Move clear of the door.` for unsafe destination occupancy, or `Paused.` while paused. The anchor uses the actual source portal position plus 2.15 metres in Y. Snapshot arrays are detached.

Distance, native floor eligibility and source destination-leaf occupancy retain their previous dimensions. Rounded clear reach uses the real source collision at torso/hand height and excludes only the selected door's own leaves. Other closed/open leaves, source triangles and intervening solids block reach. Both current and target source sections must be ready. Permanent passages never expose an action. No collision/support geometry or character size changes.

The floating action sends exactly `{type:'interact',portalId:interaction.id,action:interaction.action}`. Runtime checks the exact portal, current reach, floor, obstruction, readiness, requested state and destination occupancy when processing the command. Already-satisfied Open/Close commands have no effect. An unknown/stale/blocked target cannot fall back to a different nearest door. Malformed targeted commands return `false` from dispatch. Legacy `{type:'interact'}` still toggles the current reachable nearest door for existing tooling/callers. A door action leaves movement input untouched.

Runtime supplies `onProjectInteraction(anchor)` to `mountUI`. It returns `{x,y,visible}` in pixels relative to the UI root, accounting for actual canvas/root rectangles and root border/scroll origins. Invalid, clipped, offscreen, behind-camera or unavailable projections return `{x:0,y:0,visible:false}`. The callback becomes hidden after runtime disposal. `createCameraRig.projectInteraction(anchor,uiRoot)` supplies the underlying real orthographic projection.

Each presentation updates the camera before calling `ui.update`. View changes, zoom and resize also present/reproject immediately without advancing simulation time. UI must project on each update even when the door identity/label is unchanged. UI owns button fitting, pause/menu visibility, native single activation, current-target E/Space commands and retaining stable joystick geometry. No UI files are edited by this candidate.

`tests/integration/contextual-doors.test.mjs` exercises actual original landmark doors and exact-target rejection. `tests/integration/interaction-camera.test.mjs` checks real camera math/order with an injected renderer API. These source checks do not claim WebGL rendering or actual browser interaction acceptance; the architect combines and reviews the exact UI candidate separately.
