# TB-028: faster player movement

Candidate branch: `codex/movement-input-coder`, based on exact published checkpoint `38f6e803bf43493fdcd641f62f8644d13b99488f`. Architect contract: `docs/milestones/09-movement-and-joystick.md` at `556679297eed1112c653ee9539acb6bb8b6a19bf`. This worker candidate does not promote or deploy itself.

The shared player speed is **9 m/s**, three times the published preview. Goat, horse and bear use it on Catalogue Street and all three landmarks. Normalized diagonals retain that speed. Powder retains its 1.5 multiplier, giving 13.5 m/s in the street, while its world scale remains .35. Fire, tools, medicine duration, NPCs, accepted-distance animation and gas per accepted metre keep their existing clocks/rules.

The two source-only route controllers now take their default speed and input projection from `DEFAULT_CONFIG`. At the new speed their old independent `speed=3` assumptions overshot short waypoints and produced false stalls. Explicit diagnostic overrides remain available. No gameplay navigation or source geometry changes are needed by the controlled Administration probes.

## Evidence

- `node tools/check.mjs`: **173 tests passed**, 139 authored scripts checked, 174 static modules resolved, one shared Three implementation and immutable source/provenance verified. The new behavior checks cover 9 metres in one active second for every animal on all four actual maps, normalized diagonals, boosted speed, unchanged fire/NPC/torch clocks, native collision/drop/headroom/closed-door/unloaded-section protection, and cancel/pause/fresh-input recovery on the actual Administration spiral.
- `node tools/check-movement-input.mjs`: **261 actual Administration stair out-and-back probes** passed, plus **54 full keyboard/mouse command comparisons**. All ten source stair orientations and all three native body envelopes are covered. Speeds 3/9, analog .13/.35/1, additional .2/.5/.75 at 30/144 Hz and bounded hitches pass. Maximum accepted rise is .176669 m; no stationary active tick occurred. `stairs.json` records every case, the unchanged navigation SHA-256 and method limits.
- Existing fuel, swept pickups, inversion, thin-wall, door-leaf, floor-hole, streaming, native-rig and route-playback regressions pass at the new default. Historical test fixtures were given enough unobstructed space or a shorter duration for the same intended journey; physical constraints and assertions remain.
- Production build/release and the actual nested HTTP package/source loader pass: **3,454 files / 163,289,760 bytes**, three landmark loaders, all three native character rigs, public-path exclusions and resource release. `package-smoke.json` preserves the original checker's receipt and identifies its reuse for TB-028.

`reproduction.md` distinguishes the reproduced QA overshoot from the human's real mouse-input report. The controlled navigation probes do not reproduce a permanent partial-analog stair stall. The UI specialist owns pointer/capture/layout corrections and their actual browser evidence; this code delivery does not claim to establish that UI report's cause.

## Scope and preservation

Production code changes only `src/simulation/config.js`. Tool defaults change `tools/place-routes.mjs` and `workbenches/places/route-driver.js`; `tools/check-movement-input.mjs`, relevant tests and these evidence records complete the delivery. No `src/ui/**`, imported asset, compiled navigation, body envelope, collision function, global clock or source pin is changed. No new asset, gallery correction or menu redesign is included.

All unfinished TB-024 work is preserved locally and unpushed on `codex/explorable-places-coder` at **`ac2c5df5f8f69d4d3f9fd2e5922c48b01b37d7c0`**. That checkpoint records the user's instruction to follow Horticulture's original structure, keep closed roof bays outside normal access, and require an explicit condition for any extraordinary access. Its pending target correction and complete route gate are separate work.

The three old route diagnostics were retired with exact PID/creation checks and restart records before switching branches. The finite package server (PID 69800, creation FILETIME `134377945514019482`, port 61144) exited through its `finally` cleanup; receipt records closure/port release. No coder preview, route worker, browser session or retained helper is required by this candidate.

The architect still combines the exact passing UI correction, reviews real mouse behavior at desktop/phone scale and decides publication. This worker's isolated source checks and HTTP loader do not establish WebGL rendering or the deferred whole-map gallery-route acceptance.
