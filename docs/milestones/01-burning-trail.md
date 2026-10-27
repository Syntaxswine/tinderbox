# Milestone 01: the burning trail

Status: assigned for implementation. This is one small exterior test scene. The architect reviews the combined result before promotion. Read the source baseline and both reuse audits; the Farmyard donor remains read-only.

## Accepted user direction

Tinderbox is an isometric 3D game about a pyromaniac anthropomorphic bear who uses drugs and sets things on fire. Preserve these requirements:

- Exactly five initial tools: matches, jerry can, Molotov cocktails, torch, flamethrower.
- The jerry-can button toggles pouring. The bear continues moving and leaves a trail. Pouring follows the bear's speed. Powder may let the bear outrun fire advancing along the same trail being poured; this is an intended tactic.
- Powder increases bear movement speed and slows other actors and fire. Healing pills restore health. Inversion pills reverse the movement joystick by 180 degrees: NE becomes SW, N becomes S, and so on.
- Neighborhood exteriors take spatial/aesthetic cues from Paperboy. Use a street/yard/building-front setting with free movement within a tile-structured world. Interiors and a larger campaign are outside this milestone.
- Fire should look convincing, spread readily, and have understandable causes, fuel limits, barriers and burnout.

## Prototype decisions

These are architect-selected defaults to unblock work. Keep them in one coder-owned configuration and report changes; they are not final balance or additional user requirements.

- Real-time simulation, fixed 1/60-second base steps, continuous accepted movement, metre-based coordinates, 1 m authoring tiles and an initial 0.5 m fire grid. Rendering frequency is independent.
- A small flat exterior around 20 x 16 m: paving, grass, a wooden fence/prop, solid building fronts, a crate and two explosive drums. One simple moving actor demonstrates world slowdown; no new enemy AI system is needed.
- Default bear speed 3 m/s; powder player scale 1.5 and world scale 0.35. Powder and inversion each last 8 seconds of active unscaled simulation time. Pause freezes that time. Re-use refreshes duration rather than multiplying magnitude. Healing restores 35 HP, clamped to max HP (100 initially). All items have finite prototype stock.
- Movement, aim and pouring respond to the player domain. Other actors, propagated fire, burn damage, burnout and environmental flame/smoke animation use world time. UI remains responsive. Define player-generated heat/resource emission explicitly in configuration; do not let rendering frames create damage or fuel.
- Movement input is normalized before camera projection. The coder applies inversion once to the movement vector: `(x,y) -> (-x,-y)`. Aim, camera and menu controls are outside this inversion. Keyboard movement may feed the same virtual-stick adapter as a prototype alternative.
- Gas deposits over the entire collision-resolved movement path, with distance-based consumption. Faster movement keeps a continuous trail and consumes fuel for the distance covered. Stationary or blocked movement deposits no additional gas in this first version. Repeated visits add only fuel actually consumed from the can.
- Pouring changes on a primary-button press edge, never on every frame or key-repeat. Selecting another tool, empty fuel, death, pause, focus loss or explicit cancellation stops pouring. Taking a drug does not change the selected tool or stop pouring.
- Matches provide a single local ignition; a lit torch provides sustained close ignition while the primary trigger is held; Molotovs are finite thrown impact ignition sources; the flamethrower is a fuel-limited aimed heat cone while held. All use the same fuel/ignition/damage system. Define ranges/costs in configuration and distinguish them from donor tuning.

## Shared scene contract v1

Use JavaScript ES modules and the existing Three.js direction. One Three.js instance enters the rendering composition. Ground coordinates are `(x,y)` in metres, height is `h`, and Three positions are `(x,h,y)`. Headings are radians from ground +X toward +Y; a neutral bear faces +X.

The architect has imported the common `three.module.js`, `three.core.js` and MIT notice, verified against the pinned AFT manifest. All workbenches can use `vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.module.js` immediately. Preserve these shared bytes and `provenance/engine.json`. Artist/UI work need not wait for a second renderer import or introduce another framework.

Public entry points:

```js
// Coder: src/simulation/index.js
export function createSimulation({seed, scenario, config} = {}) {}
// Returns { dispatch(command), advance(realDeltaSeconds), snapshot(), dispose() }.
// advance uses a fixed-step accumulator and returns a snapshot.

// Artist: src/art/index.js
export async function createArtScene({THREE, scene, assetBaseUrl}) {}
// Returns { update(snapshot, timing), dispose() }.
// timing = {alpha, playerDelta, worldDelta, playerTime, worldTime}.

// UI: src/ui/index.js
export function mountUI({root, onCommand}) {}
// Returns { update(snapshot), dispose() }.
```

`dispatch` queues commands for the next fixed tick; an optional `atTick` schedules recorded inputs. Processing order and seeded random use must be stable. Pausing/focus loss clears held input; do not resume with a large hidden-tab catch-up. Report the bounded catch-up policy.

Commands are serializable objects:

| type | Payload and meaning |
| --- | --- |
| `move` | `x,y`: raw normalized stick vector, +X right and +Y up; UI never pre-inverts it |
| `aim` | `x,y`: world-space target from field picking; independent of movement inversion |
| `select-tool` | `tool`: `matches`, `jerry-can`, `molotov`, `torch`, `flamethrower` |
| `primary` | `pressed`: boolean; rising edge activates discrete tools/toggles pour, held state drives torch/flamethrower |
| `drug` | `drug`: `powder`, `healing`, `inversion` |
| `pause` | `paused`: boolean |
| `reset` | Reset the selected fixture and seed |
| `cancel-input` | Clear movement/trigger/pouring; safe to repeat |

Snapshot v1 has these stable fields (extensions must preserve them and be reported):

```js
{
  version: 1, tick: 0, paused: false,
  clocks: {active: 0, player: 0, world: 0, playerScale: 1, worldScale: 1},
  player: {
    id: 'bear', x: 0, y: 0, heading: 0, moving: false,
    hp: 100, maxHp: 100, tool: 'matches', pouring: false,
    inventory: {matches: 0, gas: 0, molotovs: 0, torchFuel: 0,
      flamethrowerFuel: 0, powder: 0, healing: 0, inversion: 0}
  },
  effects: {powder: {active: false, remaining: 0},
    inversion: {active: false, remaining: 0}},
  world: {width: 20, height: 16, tileSize: 1, fireCellSize: 0.5,
    tiles: [], obstacles: []},
  cells: [], actors: [], events: []
}
```

Tiles have world `x,y,size,material`. Obstacles have stable `id,x,y,width,depth,height,material,kind`, where `x,y` is the ground-centre. Cells have stable `id,x,y,size,material,surfaceFuel,depositedFuel,heat,phase,intensity`; centres are world coordinates, `phase` is `cold`, `heating`, `burning`, or `spent`, and intensity is 0..1. Actors have `id,x,y,heading,moving,hp`. Events have monotonic `id,tick,type,x,y` and documented optional fields. Views must not replay an event ID, infer damage from particles, or mutate snapshots. A noncombustible substrate may carry combustible deposited gas.

The coder supplies a complete example snapshot and fixture data with the first checkpoint. Artist/UI may use local labelled fixture snapshots meanwhile. The final scene always consumes simulation snapshots. Art owns presentation; UI owns input and display; the coder owns outcomes.

## Ownership and bounded deliveries

All workers start by incorporating this master baseline normally in their own clean branch. Preserve any later local work. Keep reusable source bytes separate from adaptations and import only the selected dependency closure.

### TB-004: coder

Own `src/simulation/**`, `src/runtime/**`, `tests/simulation/**`, `workbenches/simulation/**`, `tools/**`, and root `package.json`. Own selected vendor code and non-UI/non-fire-art dependencies. Deliver the authoritative model, a diagnostic exterior scene with simple labelled visuals/controls, deterministic checks, a sample snapshot, and a short handoff in `docs/engineering/milestone-01.md`.

Implement finite-speed ignition/spread from prior state or scheduled arrivals; never ignite an entire connected trail in one flood-fill tick. Track finite material/deposited fuel, heating, burnout, collision barriers and exactly-once drum explosions. No full CFD, wind/weather system, donor campaigns/AP economy, persistence, or full enemy AI is required.

Do not wait for the artist/UI branches to make your model testable. Use clearly labelled diagnostic stand-ins in your workbench. Keep production art/UI modules out of your edits. Provide runtime/camera adapters that accept the public view factories; report a minimal composition recipe for the architect.

### TB-005: artist

Own `src/art/**`, `assets/art/characters/**`, `assets/art/world/**`, `assets/art/effects/**`, `art/source/tinderbox/**` except `ui/`, `workbenches/art/**`, `docs/art/milestone-01/**`, and vendor fire atlases plus the two `aft/assets/environment/painted-study/` cargo atlases. Deliver the art factory above and a visual workbench with labelled states.

Prioritize continuous, readable gas trails; heating/ignition, coherent flame fronts, sustained burning, smoke and spent ground; a recognizably bear-shaped provisional character with a muzzle/grip contract; and a small reused exterior/material kit. Use the original painted fire assets and compact builders where suitable. Control transparency, cell seams, draw order and repeated-resource disposal. Keep bear, fuel trail and escape direction legible through effects. A provisional bear is labelled as such; do not expand into a full character animation suite or new level set. UI symbols/buttons belong to the UI specialist.

### TB-006: UI specialist

Own `src/ui/**`, `assets/art/ui/**`, `art/source/tinderbox/ui/**`, `workbenches/ui/**`, `tests/ui/**`, `docs/ui/milestone-01/**`, and vendor `dist/assets/ui/**` plus the selected industrial-switch/map-frame CSS. Deliver the UI factory above and an interactive workbench against a fake snapshot adapter.

Provide a movement joystick, exactly five tool selections, primary action/Pour-Stop state, three drug actions, health/resources, active powder/inversion feedback and remaining times, and pause/reset/options for the test scene. Borrow the painted Farmyard controls. Read states and resource counts from snapshots. Leave movement available while pouring and consuming drugs. Send raw movement vectors; the coder performs the 180-degree inversion once. Handle pointer capture, keyboard activation, cancellation/focus loss, pressed/disabled/empty states, and full event/listener disposal. Interface displays must agree with the emitted commands. Review at 390 x 844 and 1280 x 800; do not build unrelated menus or progression screens.

### Shared imports and handoff

Preserve donor-relative paths under `vendor/farmyard-commando/<baseline-commit>/`. Each worker writes only its own import inventory: `provenance/code.json`, `provenance/art.json`, or `provenance/ui.json` under that versioned directory. Record source/installed paths, revision, SHA-256, bytes, ancestry, notices and adaptations. The architect owns the eventual `provenance.json` index. Coordinate a needed ownership change through this architect instead of editing another worker's files. Newer donor branches remain separate unapproved candidates.

Commit and push only your assigned task branch after relevant checks pass. No worker merges into `master`. Handoff must include exact commit, commands/checks, evidence, limitations and any owned helper/restart record. Use your final reply for handoff; the architect reads it through the thread tools.

Suggested temporary preview ports are 4550 (coder), 4551 (artist), 4552 (UI); check availability first. Follow the user's helper lifecycle utility/registration policy, use automatic shutdown for retained previews, and stop disposable helpers when their purpose ends. Do not launch duplicate/shared browsers or leave unregistered servers running. Source workbenches stay in Git; screenshots/traces and nonsecret helper records belong in ignored `artifacts/`.

## TB-007: architect acceptance

The architect assembles the three reviewed modules after handoff, owns the production composition entry, reconciles import inventories, and runs combined checks before promotion. A first progress checkpoint is sufficient for coordination; it is not game acceptance.

- Read the exact candidate commits and verify source paths/hashes and self-contained imports. Run without the donor checkout as a runtime dependency.
- Replay normal and powder pouring, diagonal/fast motion, corners/walls, finite fuel, interruption, stationary behavior and overlapping paths. The same accepted path must deposit/account for the same fuel independent of rendering rate. Test 30/60/120 Hz and bounded hitches at matched simulation times.
- Demonstrate a finite fire front following a poured line and a fixture where powder lets the moving bear gain separation from it. Verify slowed actors/fire, expiry and restoration, healing clamp/consumption, and NE-to-SW inversion without affecting aim/menu controls.
- Verify fuel-limited heating/ignition/burnout, barriers under the chosen model, and exactly-once drum chains. Include a withheld layout and check grid-direction/resolution sensitivity; document tolerances and simplifications.
- Review the combined scene at the intended camera and both viewports. Measure simulation/render frame times and resource counts on the stated host/browser; record actual hardware/device limits rather than claiming physical-device performance from viewport emulation.
- Keep visual plausibility, automated correctness and observed player comprehension as separate evidence. Missing fresh-player testing remains an explicit limitation. No approval based on screenshots alone.
