# Tinderbox repository instructions

## Product brief

Tinderbox is an isometric 3D game about a pyromaniac anthropomorphic bear who does drugs and sets things on fire. Preserve that premise. Reuse Farmyard Commando UI, art assets, and suitable weapons/systems, especially the flamethrower and explosive barrels.

Read `docs/architecture.md`, `docs/workflow.md`, and `docs/source-baseline.json` before starting a task. Treat proposed mechanics as proposals until the user or architect accepts them.

## Roles and worktrees

- The architect owns the primary checkout, architecture, task boundaries, integration branch, final review, and promotion decisions.
- The artist owns world/character/effect art, its sources/exports, art manifests, and visual documentation in the assigned art worktree.
- The UI specialist owns interface controls, HUD, buttons, menus, and their presentation in the assigned UI worktree. Coordinate through the scene contract; do not implement gameplay rules in UI callbacks.
- The coder owns runtime code, adapters, tooling, and relevant tests in the assigned code worktree.
- Work only in the assigned worktree and branch. Do not edit another worker's checkout. Check `git status` and the worktree registry before starting.
- Only the architect promotes reviewed work to the integration branch. Workers may commit and push their own task branch to its configured Tinderbox remote according to the user's global Git instructions; pushing a candidate is not promotion.
- Do not create additional worker chats, worktrees, or background helpers when an appropriate existing one can be reused. Keep helper ownership and lifecycle records as required by the user's global instructions.

## Reuse boundaries

- New building assets preserve native Farmyard/AFT dimensions, UVs, origins, attachments and physical texture density. Native walls are 1 by 2 by .16 m; doors are 1 by 1.65 by .12 m; floor pitch is 2.12 m. Compose modules instead of stretching them or shrinking characters. The older enlarged exposition gate remains a regression fixture, not a template for new assets.

- The Farmyard checkout and its worktrees are read-only donors. Do not change, check out, reset, merge into, or push to the donor repository for a Tinderbox task.
- Use the pinned source commit. Record later source revisions deliberately, with a reason and review. A file present in an asset catalog is not proof that its gameplay is connected.
- Distinguish the approved source baseline from experimental branch work. Never silently absorb a donor work-in-progress branch.
- Imports must be self-contained inside Tinderbox. Do not leave runtime references to an absolute local path, sibling checkout, or a moving donor branch.
- Preserve embedded licenses and existing provenance. Record original paths, source commits, SHA-256 values, dependencies, and adaptations for imported files. Unknown rights remain an explicit unresolved item; provenance is not a license grant.
- Keep upstream copies distinct from Tinderbox adapters. Avoid bulk copying the entire donor game or its deployment/account configuration.
- Use a separate Tinderbox save/settings namespace. Existing Farmyard saves, missions, and controls are reference behavior, not automatically Tinderbox requirements.

## Handoff and quality

Deliver the exact commit SHA, changed paths, source/provenance evidence, checks run and results, visual evidence when relevant, and remaining limitations. Keep unrelated files and secrets out of commits.

Use the promotion gate in `docs/workflow.md`. Run checks appropriate to the change; documentation-only work needs path/reference review, not invented runtime tests. Runtime and UI changes need meaningful behavior checks and browser review at the intended scale. A failed relevant check blocks promotion.

The Pages workflow checks and packages code changes on `master`. Its deployment job runs only with configured Pages hosting and repository variable `PAGES_ENABLED=true`. Branch protection is not configured; do not describe the architect's review as a remotely enforced approval rule. Read the current review record for any hosting restriction before publishing.

## Current milestone

The active integration task is `docs/milestones/08-explorable-places.md`: main-menu destinations for New York State, Administration and Horticulture, plus Catalogue Street. The user explicitly requires playable interiors/stairs and permits loading nearby sections as needed. Coder owns lifecycle, elevation-aware navigation and streaming; UI owns selector/HUD; artist supplies additive entry/stair/floor-opening art. Preserve native scale and immutable source assets. Architect reconciles prior candidates and verifies actual traversal before promotion; assemblies and thumbnails alone do not establish working visits.

The artist's next assignment is `docs/milestones/07-new-york-state-building.md`: one measured exterior of the New York State Building, from original plan/elevation and built photographs, with reusable native forms and JPG previews. Reuse the existing artist worktree on `codex/new-york-state-building-art` from its preserved `f25fd7b28a9aee1d1abaef1ad65acd64d67a50e6` checkpoint. The row/torch and Hopkins v2 candidates remain separate and unpromoted. The artist owns art/evidence; production placement and simulation wiring require the architect's later coder contract. Administration follows this first asset's review.

The active architect contract is `docs/milestones/06-row-houses-and-ignition.md`, assigned to the existing coder, artist and UI specialist from `3c6001d5d4035e950f25e500294eaec55bbf81d2`. The user requires repeatable joined Monroe houses with blank joining sides and end-only side windows, matches that ignite one tile per press, and a torch lit once with a finite carried burn time and press-to-ignite use. The architect writes proposals and reviews deliveries; workers implement their owned parts. The contract defines shared snapshot/ownership boundaries and labels architect-selected prototype defaults. Candidate code is not promoted by a proposal or worker push.

The last implemented checkpoint is `docs/milestones/05-catalogue-block-two.md`, with six selected/placed houses, frozen artist intake `56b028c2935b5a97fe259618f38e0a1550928ab4` and committed Nautilus windows for Hopkins 13 and 15. Do not silently absorb the artist's separate Hopkins v2 work. Preserve native units and agreement between building visibility, ground footprints and burnout. Include JPG previews with visual handoffs, identifying omitted elements; the runtime browser gate remains in force.

Read `docs/milestones/04-catalogue-neighborhood.md` and its linked review for the first three-house checkpoint and its completed offline checks. The public `master`/Pages version remains the reviewed exposition study while browser acceptance is pending.

Read `docs/milestones/03-shared-bear-protagonist.md` and its linked architect review for the bear's completed offline checks and pending browser acceptance. The bear comes from the explicitly approved additional AFT pin in `docs/source-baseline.json`; do not update the Farmyard baseline or silently absorb other worker branches.

Read `docs/milestones/02-exposition-foundation.md` for the reviewed wall/door/roof kit and non-Red-Hat civilian foundation, and its linked acceptance for delivery status and remaining scope. Follow `docs/research/1893-exposition/README.md` when recording original-plan evidence, derived dimensions, uncertainties and game adaptations. Preserve shared physical dimensions when swapping skins.

The reviewed `docs/milestones/01-burning-trail.md` remains the gameplay baseline. Its prototype defaults are tunable implementation choices, not new user requirements. Keep the movement joystick's 180-degree inversion in the simulation/input adapter exactly once. Pouring follows the bear's accepted movement; fire propagation follows world time.
