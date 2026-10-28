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

- All Tinderbox assets use the native Animal Factory Tactics 3D / Farmyard Commando scale so they remain compatible with later games. Reskins preserve original dimensions, mesh/rig/UV layout, origins, attachment points and physical texture density. Taller or wider buildings compose compatible modules; do not stretch existing wall/door assets or resize characters to force a fit. The source measurements, reusable kit rules and current character-fit limitation are in `docs/engineering/exposition/native-scale.md`.

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

Read `docs/milestones/01-burning-trail.md` for the accepted user requirements, shared APIs, file ownership, bounded TB-004/TB-005/TB-006 assignments, and acceptance evidence. Its prototype defaults are tunable implementation choices, not new user requirements. Keep the movement joystick's 180-degree inversion in the simulation/input adapter exactly once. Pouring follows the bear's accepted movement; fire propagation follows world time.
