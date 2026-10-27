# Tinderbox architecture

## Established requirements

- Isometric 3D presentation.
- One anthropomorphic bear protagonist, with drug use and setting things on fire central to the premise.
- Substantial reuse from Farmyard Commando: UI, art assets, and systems such as the flamethrower and explosive barrels.
- Separate artist and coder worktrees, coordinated and reviewed by the architect before promotion.
- A UI specialist owns the joystick, HUD, buttons and menus in a separate worktree.
- Tools: matches, jerry cans, Molotov cocktails, torches, and the flamethrower. Pouring toggles on/off while moving and follows the bear's speed; escaping fire advancing along that trail is an intended tactic.
- Powder speeds the bear and slows everyone else, including fire. Healing pills restore health; inversion pills reverse the movement joystick by 180 degrees (NE becomes SW).
- Explore neighborhood exteriors with Paperboy as a spatial/aesthetic reference. Interiors may come later. Combine tile-based world structure with free movement.
- Fire quality and readily spreading, causally plausible fire are central. Its gameplay state and appearance must agree.

## Reuse-first technical direction

The inspected Farmyard baseline is a browser game using JavaScript ES modules and a vendored Three.js renderer. `field-view.js` constructs an orthographic camera. The source project builds and checks with Node.js 22 or newer, without a package installation.

The opening mechanics test uses that stack with one pinned Three.js instance and separate simulation, art and interface factories. Build and launch commands are in the root README. A move to Godot, Unity, or another runtime has not been approved. Direct reuse of the donor game's assets/interface remains the required foundation for the next visual pass.

The source of record is the locally available `origin/main` commit recorded in `source-baseline.json`, not the donor's stale local `main` branch or an arbitrary active worktree. This pin records what was inspected; it is not a claim that a remote was freshly fetched. Farmyard has inherited Animal Factory Tactics snapshots with their own provenance manifests; preserve that chain.

## Candidate boundaries

These boundaries guide the audit and first implementation, rather than describe modules already built:

| Area | Reuse target | Tinderbox responsibility |
| --- | --- | --- |
| Presentation | Orthographic camera, painted materials, lighting, model/equipment builders | Bear readability, scene framing, and a coherent art direction |
| Interface | Painted industrial controls, map frame, weapon illustrations, input patterns | Tinderbox actions, labels, device layout, and accessible states |
| Simulation | Collision, aiming, selected flame/barrel logic | Own game state and rules; do not import Farmyard's turn economy by accident |
| Fire and explosions | Existing effects and applicable damage/obstruction logic | Deliberately choose ignition, persistence, spread, chain reactions, and tuning |
| Content | Selected character/environment/equipment assets | Stable asset identifiers, provenance, and gameplay footprints |
| Persistence | Storage failure handling and serialization patterns | Separate Tinderbox namespaces and versioned save data |

Simulation must own gameplay outcomes; rendering consumes state and events. Shared dimensions and object footprints must agree between geometry, collision, aiming, and damage. An attractive flame effect is not evidence that burning gameplay works.

Imports will be small, pinned, reproducible snapshots with preserved licenses and explicit adapters. Runtime imports must resolve inside Tinderbox. New snapshots should include only the files and dependencies needed by the reviewed feature. Farmyard hosting configuration, save namespaces, and release automation must not be copied as Tinderbox defaults.

## First milestone: verified reuse inventory

The artist inventories visual assets and conventions. The coder inventories module dependencies and gameplay behavior, especially flame, barrel, camera, UI, and storage paths. The architect reconciles both audits against source and sets the first implementation brief.

The resulting [architect reuse plan](reuse-plan.md) resolves the audits' layout proposals and defines the next handoff boundary. Historical recommendations in individual audits remain evidence; use the reconciled plan for implementation.

A useful subsequent validation scene would put a bear, inherited UI, a flamethrower, and explosive barrels into one small isometric environment. Its acceptance criteria must distinguish artwork from collision and actual fire/explosion behavior. It remains a proposed next milestone, not a completed or fully specified game.

## Decisions still open

The [burning-trail milestone](milestones/01-burning-trail.md) establishes a real-time test scene and explicit tunable defaults for initial implementation. Final target hardware, bear appearance, progression, precise balancing, and later interior gameplay remain open. Do not import the donor's turn/AP rules as Tinderbox requirements.
