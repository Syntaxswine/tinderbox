# Assignments and promotion

## Worktree registry

| Role | Branch | Checkout | Responsibility |
| --- | --- | --- | --- |
| Architect | `master` | `C:/Users/baals/Documents/ChatGPT/tinderbox` | Architecture, source pins, integration, final QC |
| Artist | `codex/art-assets` | `C:/Users/baals/.codex/worktrees/art-assets/tinderbox` | Art sources/exports, visual reuse audit |
| Coder | Pending creation by architect | Pending | Runtime dependency/behavior reuse audit |

The existing artist chat is **Set up Tinderbox art worktree**. Reuse that worker. The architect assigns a coder worker to a separate worktree; no worker edits the primary checkout. Git worktree metadata is the authority for actual branch occupancy; update this table when assignments change.

## TB-001: visual reuse audit

Owner: artist. Deliver `docs/art/farmyard-reuse-audit.md` on the art branch.

Identify reusable UI skins/frames, character and environment assets, weapon art/models, painted fire/explosion effects, and barrel assets. Cite exact source paths and revisions. Record dependencies, provenance/license evidence or unknowns, scale/camera/material conventions, adaptation work, and a small recommended initial asset set. Distinguish available assets from objects actually wired into the donor game. Do not generate replacement art or bulk-import assets during this audit.

## TB-002: runtime reuse audit

Owner: coder. Deliver `docs/engineering/farmyard-reuse-audit.md` on the code branch.

Use the pinned baseline to identify the renderer/camera, UI/input, character/equipment, flamethrower/fire, explosive barrels, collision/obstruction, save handling, build, and verification entry points. Trace import/dependency closures and document whether each behavior is active in the solo game, only in the inherited designer runtime, or available only on an unmerged branch. Explain the smallest self-contained extraction and its coupling to turns, AP, missions, and storage. Recommend a first validation brief and report checks actually performed. Do not implement a new engine or full game during this audit.

## TB-003: architect reconciliation

Review both audit commits against the pinned source. Resolve inconsistent paths, state/visual claims, dependency assumptions, and rights evidence. Promote only reviewed documentation. Set the first implementation assignment from the agreed reuse plan and the user's gameplay direction.

## Promotion gate

1. Identify the exact candidate commit, assigned owner, and changed paths. Review against the intended integration base; preserve other workers' changes.
2. Confirm that the work satisfies its brief and does not silently decide open product questions. Reject unrelated changes and accidental donor writes.
3. Verify source pins, imported file hashes, dependency closure, licenses/provenance, and asset-to-gameplay footprints where relevant. Do not treat unknowns as verified.
4. Run relevant static, behavior, build, and integration checks on the combined candidate. Review UI/art/gameplay changes in the running game at the intended view size. Documentation-only changes need verified references and scope review.
5. Record passed checks, visual evidence if applicable, limitations, and the architect's decision in the handoff/review record. Correct failed checks before promotion.
6. The architect merges or cherry-picks the reviewed commit into the integration branch, verifies the resulting tree, then follows the user's commit/push/deployment instructions. Never force-push. Stop task-owned disposable helpers after verification and verify their ports are released.

This is a local workflow. GitHub branch protections, a Tinderbox remote, CI, and deployment are not configured. Do not push Tinderbox commits to the donor's remote.

## Worker handoff format

- Task ID and exact candidate commit SHA.
- Changed files and concrete result.
- Donor revisions/paths and adaptations, if applicable.
- Commands/checks run, results, and any checks not run.
- Screenshots or other visual evidence when the change affects appearance or interaction.
- Remaining limitations, unresolved decisions, and any retained helper with its lifecycle record.

The architect can return a candidate for revision. A worker commit, pushed branch, available screenshot, or passing test does not by itself mean promotion was approved.
