# Tinderbox architecture

## Established requirements

- Isometric 3D presentation.
- One anthropomorphic bear protagonist, with drug use and setting things on fire central to the premise.
- Substantial reuse from Farmyard Commando: UI, art assets, and systems such as the flamethrower and explosive barrels.
- Separate artist and coder worktrees, coordinated and reviewed by the architect before promotion.

## Reuse-first technical direction

The inspected Farmyard baseline is a browser game using JavaScript ES modules and a vendored Three.js renderer. `field-view.js` constructs an orthographic camera. The source project builds and checks with Node.js 22 or newer, without a package installation.

Use that stack as the reuse reference. A move to Godot, Unity, or another runtime has not been approved. The first work item is to establish dependency closures and adaptation costs before importing a runtime. Tinderbox does not have a build or launch command yet.

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

The user has not yet specified the gameplay pace (real-time or turn-based), target devices, camera controls, bear appearance, setting, progression, detailed fire rules, or drug mechanics. Audit and isolate reusable systems now; do not silently decide these by importing the donor's game rules.
