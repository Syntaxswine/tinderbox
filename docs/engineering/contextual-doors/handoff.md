# TB-031 contextual-door runtime delivery

Branch: `codex/contextual-doors-coder`, from exact published `99b95b0888298a53791db3fc5657c4de3002d488`. Architect contract: `92ec5d16c1129676502f61786506f3c0e2e742f7`, `docs/milestones/10-contextual-doors.md`. Only the architect promotes or deploys this candidate.

Nearby reachable landmark doors now expose an authoritative ID, Open/Close action, readable label, enabled reason and native floor+2.15 m world anchor. Exact-target commands recheck current reach/floor, intervening source collision, section readiness, desired state and destination-leaf occupancy. Duplicate Open commands do not close a door, stale targets cannot select a neighbor, and legacy untargeted interaction still works. Door actions preserve held movement and all 9 m/s/world timing.

Runtime supplies `onProjectInteraction` in UI-root pixels from the actual current orthographic camera. Projection follows camera update and responds to follow/overview, movement, zoom and resize without advancing simulation time. Invalid, clipped, offscreen, behind-camera, unavailable-root and disposed callbacks return a hidden projection. Root/canvas offsets, content scroll and border origins are handled. `contract.md` defines the exact additive interface for the UI worker.

## Source and scope

The Farmyard interaction pattern was inspected directly at pin `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`. `donor.json` records original paths, exact bytes and SHA-256 values for `app.js`, `field-view.js`, `interactions.js`, `touch-controls.css` and `game.html`. The adaptation keeps rounded clear reach, safe authoritative action and current-camera positioning; the native-3D reach corridor uses torso/hand height so low original sills and stairs do not invent a vertical barrier. Only the selected door's own leaves are omitted from reach. Actual closed/open source poses remain the authority for movement and destination occupancy.

No donor source text or asset is copied. No new source pin, AP/turn/menu/save/hosting system is imported. Existing Three MIT/provenance and the source baseline's unresolved donor application/art rights are preserved. Human door names live in the adapter, preserving compiled source IDs/labels byte-for-byte.

Changed runtime paths: `src/runtime/{navigation,camera,index,door-labels}.js`. Checks: `tests/integration/{contextual-doors,interaction-camera}.test.mjs`. Evidence/documentation: this folder only. No UI, art, compiled geometry/navigation, body profile, movement configuration or source pin is changed. Older worker branches and unfinished gallery checkpoint `ac2c5df5f8f69d4d3f9fd2e5922c48b01b37d7c0` remain separate.

## Completed validation

- `node tools/check.mjs`: **185 tests passed**, 144 authored scripts checked, 179 static modules resolved, one shared Three implementation and all immutable provenance checks passed. Original retained art check also passed.
- Actual original source visits: **42** successful approach/closed blocking/Open/traverse/Close cases, covering all **14** stateful doors across New York, Administration and Horticulture with goat, horse and bear. `source-doors.json` records each door/body, readable label, actual anchor and unchanged compiled navigation hash. These are fresh controlled source approaches, not whole-map routes.
- Actual original New York leaves: **6** unsafe destination-pose cases, opening and closing for every native animal, remain blocked without trapping or moving the animal. `source-occupancy.json` records exact native positions and source hash.
- Targeting regressions cover malformed/unknown/stale IDs, duplicate requested states, a newly nearest neighbor, wrong floors, permanent passages, solids/real source fragments, queued readiness changes, a newly closed intervening door, pause and held movement. Camera regressions use the real shared Three orthographic camera at desktop/phone aspects, nonzero roots, resize/zoom/view transitions, clipping and disposal. Renderer API injection checks lifecycle/order; it is not a WebGL rendering claim.
- Production build/release and actual nested HTTP loading pass: **3,455 files / 163,294,843 bytes**, all three landmark loaders, all three native rigs, private-path exclusion and resource disposal. `package-smoke.json` preserves the reused checker's original receipt and identifies its TB-031 scope.

The finite package verifier's PID **48484**, creation FILETIME `134377967394545938`, exited through its `finally` cleanup; port **52515** was independently confirmed released. No coding-task server, browser, route worker or retained helper remains. No other worker/app process was stopped.

The UI specialist owns the floating button, single click/native-key activation, E/Space target binding, fitting/visibility and stable joystick layout. Architect must combine its exact passing commit with this runtime, review desktop/phone behavior using actual navigation/camera, then decide publication. This runtime-only candidate does not claim that the floating UI is already published, or that deferred whole-map/gallery/WebGL performance acceptance has passed.
