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
- Setting reference: the 1893 World's Columbian Exposition, researched from original plans, contemporary photographs and publications where available. Begin with inherited basic walls/doors, appropriate new wall/roof forms and interchangeable skin slots. Existing non-Red-Hat animals populate the initial city pending custom skins. Document source facts, uncertainty and game adaptations.

## Reuse-first technical direction

The inspected Farmyard baseline is a browser game using JavaScript ES modules and a vendored Three.js renderer. `field-view.js` constructs an orthographic camera. The source project builds and checks with Node.js 22 or newer, without a package installation.

The opening mechanics test uses that stack with one pinned Three.js instance and separate simulation, art and interface factories. Build and launch commands are in the root README. A move to Godot, Unity, or another runtime has not been approved. Direct reuse of the donor game's assets/interface remains the required foundation for the next visual pass.

The source of record is the locally available `origin/main` commit recorded in `source-baseline.json`, not the donor's stale local `main` branch or an arbitrary active worktree. This pin records what was inspected; it is not a claim that a remote was freshly fetched. Farmyard has inherited Animal Factory Tactics snapshots with their own provenance manifests; preserve that chain.

## Reuse boundaries

These boundaries guide implementation and later extraction. A reuse target is not a claim that every listed subsystem is already implemented:

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

## Reviewed reuse inventory

The artist inventoried visual assets and conventions. The coder inventoried module dependencies and gameplay behavior, especially flame, barrel, camera, UI, and storage paths. The architect reconciled both audits against source before the first implementation brief.

The resulting [architect reuse plan](reuse-plan.md) resolves the audits' layout proposals and defines the next handoff boundary. Historical recommendations in individual audits remain evidence; use the reconciled plan for implementation.

The opening mechanics test combined a provisional bear, inherited painted UI surfaces, five tools, spreading fire and explosive barrels in one small isometric environment. Its [review](reviews/2026-10-27-burning-trail.md) records the tested behaviours and limits. The exposition kit extends that reviewed foundation with more direct wall/door and civilian reuse; it does not turn prototype visuals into final historical art.

The [shared-bear candidate](milestones/03-shared-bear-protagonist.md) replaces the procedural protagonist with the original AFT painted bear and native rig at source commit `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`. Nautilus's inspected record still lists this asset as incoming, so its committed AFT origin is recorded directly. The adapter retains authored scale, uses the existing shared renderer and fits the five current tools; simulation rules and building dimensions remain governed by the existing contracts. The [architect's review](reviews/2026-10-28-shared-bear-protagonist.md) distinguishes completed offline checks from pending browser acceptance and publication.

The next [catalogue neighborhood](milestones/04-catalogue-neighborhood.md) uses the artist's committed Hopkins Nos. 12 and 15 and Gross Ashland cottage. Their original plates, source locators and native adaptations are [recorded together](research/catalogue-neighborhood/README.md). The houses keep the reusable 1 by 2 by .16 m wall unit, 1 by 1.65 m door, .12 m slab and 2.12 m floor pitch. The bear and civilians retain their native scale and collision envelopes, so these ordinary closed doors are not traversable. The earlier enlarged exposition gate is historical prototype geometry rather than a new-asset template.

The street uses the existing controls and finite ground-fire model. A new house is one coarse footprint/burnout group: its visible prefab and its ground colliders leave together. This is an exterior integration boundary, not room traversal, wall-climb fire or collapse physics. Wider fire and shared-editor work remains on separate candidate branches.

The [second catalogue block](milestones/05-catalogue-block-two.md) adds Hopkins 9, Hopkins 13 and the Monroe Street brick row-house design across the same street, retaining the first three placements. Artist intake deliberately advances to `56b028c2935b5a97fe259618f38e0a1550928ab4`; the centered native sash sculptures for Nos. 13 and 15 retain their original Nautilus pin `90054d07134116a5d9661f8318a76fe68f922aad` and minimal dependency closure. The [additional source record](research/catalogue-block-two/README.md) distinguishes original plates from detached placement and native-grid adaptations. Six source designs enter this candidate; the artist's active v2 collection remains separate. Offline JPGs support visual handoffs alongside the existing runtime promotion gate.

## Decisions still open

The [burning-trail milestone](milestones/01-burning-trail.md) establishes a real-time test scene and explicit tunable defaults for initial implementation. Final target hardware, custom protagonist clothing, progression, precise balancing, and later interior gameplay remain open. The bear candidate starts with the source's normal worker painting. Do not import the donor's turn/AP rules as Tinderbox requirements.

The reviewed [exposition foundation](milestones/02-exposition-foundation.md) establishes shared wall/door/roof forms, skin slots and direct normal-animal reuse. The [source dossier](research/1893-exposition/README.md) is the authority for historical evidence; prototype game arrangements are labelled separately from exact named-building reconstructions. The [acceptance record](reviews/2026-10-27-exposition-foundation.md) defines the verified result and remaining scope.
