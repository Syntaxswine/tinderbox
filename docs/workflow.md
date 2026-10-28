# Assignments and promotion

## Worktree registry

| Role | Branch | Checkout | Responsibility |
| --- | --- | --- | --- |
| Architect | `master` | `C:/Users/baals/Documents/ChatGPT/tinderbox` | Architecture, source pins, integration, final QC |
| Artist | `codex/art-assets` | `C:/Users/baals/.codex/worktrees/art-assets/tinderbox` | Art sources/exports, visual reuse audit |
| Coder | `codex/coding` | `C:/Users/baals/.codex/worktrees/coding/tinderbox` | Runtime dependency/behavior reuse audit |
| UI designer | `codex/ui-design` | `C:/Users/baals/.codex/worktrees/tinderbox-ui/tinderbox` | Player controls, HUD, buttons, menus, layout, and interaction states |

The existing worker chats are **Artist, Tinderbox**, **Coder Tinderbox**, and **Set up Tinderbox UI worktree**. Reuse those workers. No worker edits the primary checkout. Git worktree metadata is the authority for actual branch occupancy; update this table when assignments change.

The UI designer works from the dedicated UI worktree. Coordinate new asset exports with the artist and gameplay/runtime contracts with the coder. Follow the [reconciled reuse plan](reuse-plan.md) for Farmyard UI reuse; unresolved gameplay and device choices remain proposals. UI candidates follow the same architect promotion gate.

## TB-001: visual reuse audit

Owner: artist. Deliver `docs/art/farmyard-reuse-audit.md` on the art branch.

Identify reusable UI skins/frames, character and environment assets, weapon art/models, painted fire/explosion effects, and barrel assets. Cite exact source paths and revisions. Record dependencies, provenance/license evidence or unknowns, scale/camera/material conventions, adaptation work, and a small recommended initial asset set. Distinguish available assets from objects actually wired into the donor game. Do not generate replacement art or bulk-import assets during this audit.

## TB-002: runtime reuse audit

Owner: coder. Deliver `docs/engineering/farmyard-reuse-audit.md` on the code branch.

Use the pinned baseline to identify the renderer/camera, UI/input, character/equipment, flamethrower/fire, explosive barrels, collision/obstruction, save handling, build, and verification entry points. Trace import/dependency closures and document whether each behavior is active in the solo game, only in the inherited designer runtime, or available only on an unmerged branch. Explain the smallest self-contained extraction and its coupling to turns, AP, missions, and storage. Recommend a first validation brief and report checks actually performed. Do not implement a new engine or full game during this audit.

## TB-003: architect reconciliation

Review both audit commits against the pinned source. Resolve inconsistent paths, state/visual claims, dependency assumptions, and rights evidence. Promote only reviewed documentation. Set the first implementation assignment from the agreed reuse plan and the user's gameplay direction.

Initial status: TB-001 and TB-002 are reviewed and promoted to integration. TB-003 is recorded in the [architect review](reviews/2026-10-27-reuse-foundation.md) and [reconciled reuse plan](reuse-plan.md). No runtime or asset import is promoted by these documentation approvals.

## Opening implementation assignments

The shared brief, APIs, ownership and acceptance criteria are in [Milestone 01: the burning trail](milestones/01-burning-trail.md).

| Task | Owner | First delivery |
| --- | --- | --- |
| TB-004 | Coder | Fixed-step simulation, tools/drugs, fuel trails/fire, deterministic checks, diagnostic scene |
| TB-005 | Artist | Bear/exterior and fire visual module, selected asset imports, visual workbench |
| TB-006 | UI specialist | Movement joystick, tool/drug HUD, buttons/menus, interactive UI workbench |
| TB-007 | Architect | Reconcile handoffs, assemble the scene, run combined behavior/visual checks, and decide promotion |

Assignments may be developed concurrently because their owned files and public interfaces are separate. Prototype workbenches are explicitly labelled. No candidate merges itself to `master`.

TB-004 through TB-007 are approved as the [opening mechanics test](reviews/2026-10-27-burning-trail.md).

## Reviewed exposition assignments

The bounded result, APIs, ownership and acceptance criteria are in [Milestone 02: researched exposition construction kit](milestones/02-exposition-foundation.md).

| Task | Owner | Delivery |
| --- | --- | --- |
| TB-008 | Coder | Shared wall/door/roof content and collision, inherited normal horse/goat adapter, verified city imports and tests |
| TB-009 | Artist | Original-plan/photo study, basic forms and replaceable material slots, direct civilian presentation and visual review |
| TB-010 | UI specialist | Original site-plan/wayfinding evidence and continued inherited UI foundation; no new menu system |
| TB-011 | Architect | Reconcile sources, integrate exact candidates, review the actual scene and decide promotion/deployment |

The architect's review branch is `codex/exposition-foundation`. Worker ownership/worktrees remain as recorded above. Historical research is [indexed separately](research/1893-exposition/README.md), with original sources, uncertainties and game adaptations distinguished.

All four bounded deliveries passed the architect's combined gate. See the [exposition acceptance](reviews/2026-10-27-exposition-foundation.md) for exact candidates, integration corrections, checks and deployment status. Further custom skins or building reconstructions require a new bounded assignment.

## Promotion gate

1. Identify the exact candidate commit, assigned owner, and changed paths. Review against the intended integration base; preserve other workers' changes.
2. Confirm that the work satisfies its brief and does not silently decide open product questions. Reject unrelated changes and accidental donor writes.
3. Verify source pins, imported file hashes, dependency closure, licenses/provenance, and asset-to-gameplay footprints where relevant. Do not treat unknowns as verified.
4. Run relevant static, behavior, build, and integration checks on the combined candidate. Review UI/art/gameplay changes in the running game at the intended view size. Documentation-only changes need verified references and scope review.
5. Record passed checks, visual evidence if applicable, limitations, and the architect's decision in the handoff/review record. Correct failed checks before promotion.
6. The architect merges or cherry-picks the reviewed commit into the integration branch, verifies the resulting tree, then follows the user's commit/push/deployment instructions. Never force-push. Stop task-owned disposable helpers after verification and verify their ports are released.

The public GitHub repository is [Syntaxswine/tinderbox](https://github.com/Syntaxswine/tinderbox), configured as `origin`; `master` is the integration branch. Worker candidate branches share that remote. Pages is configured and repository variable `PAGES_ENABLED=true`; the workflow checks/packages code changes on `master` and deploys the reviewed artifact. Documentation-only pushes do not run this workflow. Current publication and live verification are recorded in the [exposition review](reviews/2026-10-27-exposition-foundation.md); the [opening-test review](reviews/2026-10-27-burning-trail.md) preserves the earlier delivery. Branch protection is not configured. Do not push Tinderbox commits to the donor's remote.

## Worker handoff format

- Task ID and exact candidate commit SHA.
- Changed files and concrete result.
- Donor revisions/paths and adaptations, if applicable.
- Commands/checks run, results, and any checks not run.
- Screenshots or other visual evidence when the change affects appearance or interaction.
- Remaining limitations, unresolved decisions, and any retained helper with its lifecycle record.

The architect can return a candidate for revision. A worker commit, pushed branch, available screenshot, or passing test does not by itself mean promotion was approved.
