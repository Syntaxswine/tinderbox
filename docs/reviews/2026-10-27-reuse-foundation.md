# Architect review: reuse foundation

Scope: establish Tinderbox's architecture, separate worker worktrees, and an evidence-based Farmyard reuse plan. No game runtime or donor assets are imported by this milestone.

## Accepted work

| Work | Reviewed commit | Decision |
| --- | --- | --- |
| Initial art workspace | `7f116fca1d1bdc42ebeea5ff7260bbb3ec934a20` | Reviewed four scaffolding files and fast-forwarded integration |
| Architecture and source pin | `71d445eaebf427dbd764441cbffbec1ec50cd614` | Architect foundation; checked referenced source objects and local documentation links |
| Worker registry | `2c29ae39fc49033cf8a31a85e6dbdcf741b391c6` | Verified artist and coder branch/worktree assignments |
| TB-001 art audit | `15679f82d0dd8079de9be5581e2681ad7f3dc4ec` | Accepted documentation; merged as `71210bcbe2fd4b0793d5fa6be7bf0dbe98396beb` |
| TB-002 runtime audit | `ac802bceac4ebe14f134c972412e217abd2d42bd` | Accepted documentation; merged as `598c3cbfe8426160511e0712d19aabddc4efe17b` |

## Independent architect checks

- Verified five baseline source paths and both inherited manifests against Farmyard commit `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`. Both manifests identify inherited commit `a20b343a0234b5d8b365a4e1668961ca1bf37653`.
- Read the complete TB-001 report and confirmed that its exact commit changes only the assigned audit file. The committed text matches the reviewed working copy after line-ending normalization.
- Recomputed all nine recommended asset SHA-256 values from pinned Git blobs. Their total source size is 10,694,966 bytes (10.20 MiB). No assets were copied.
- Checked 74 distinct inline source paths in the art report against the cited set of baseline/candidate Git trees. The artist additionally checked its reference render and links. The nine seed hashes are verified specifically against the baseline, not a candidate branch.
- Visually inspected the existing switch-skin atlas and flame atlas directly. This establishes reference materials only; it does not validate an assembled Tinderbox scene.
- Read the complete runtime audit, then checked the immutable code handoff after its final edits. Confirmed that it changes only the assigned audit file. Its normalized document SHA-256 is `83d34a4da3a700b83d508eecf45bebc548a71257117bf16f5e80276428ed9d2f`.
- Verified 191 abbreviated source references and bounds for 78 cited line spans in the exact code handoff. Independently read the solo attack, persistent burning, fuel blast and barrel queue implementations, plus the 19-file newer-flamethrower comparison.
- Recomputed all 13 code/provenance sample hashes and sizes from pinned blobs and matched them against both provenance manifests. Reproduced all 21 listed static dependency counts, reading 512 distinct source blobs. This establishes static reference closures, not runtime behavior or a complete non-JS asset closure.
- Checked all 12 local Markdown links across eight documentation files, parsed the source-pin JSON, verified both recorded candidate commit objects, and confirmed that both promoted audit blobs exactly match their reviewed commits.
- Ran `git diff --check` for the architecture and exact worker candidates. Runtime tests, a build, browser interaction, and deployment are outside this documentation-only change.

## Review conclusions

Farmyard's JavaScript/Three.js presentation is the reuse reference. The artist's available art catalog must not be mistaken for connected solo-game behavior. In particular, painted flame assets, the barrel illustration, and the runtime painted drum have different dependencies. A new bear needs a species-specific silhouette, model/paint fit, and equipment anchors.

The recommended nine files are a proposed visual seed. This review accepts the audit, not an import or a completed rights determination. Newer donor UI/flamethrower branches retain separate pins and need their own review. Gameplay pace, device targets, fire rules, bear appearance, and drug mechanics remain open.

The runtime audit confirms that persistent burning and barrel/fuel chains belong to the inherited designer runtime, while the baseline solo game has immediate flame damage and tracer presentation. Fuel blasts have no wall visibility check. These are distinct source behaviors to address in the next brief. The [architect reuse plan](../reuse-plan.md) resolves the audits' differing layout recommendations into one vendor tree, a shared Three.js instance, separate Tinderbox adapters, and explicit scene acceptance criteria.

## Workspace and lifecycle

The primary checkout remains the architect integration workspace. The artist's `codex/art-assets` and coder's `codex/coding` worktrees are retained for the user-requested ongoing roles.

A temporary architect-owned `tinderbox-code` worktree and `coder` subagent were started before the user's separate coder chat appeared. The subagent stopped cleanly with no files, commits, helpers, or donor changes. Its read-only findings were handed to the ongoing coder. The checkout is clean at `71d445eaebf427dbd764441cbffbec1ec50cd614`; the supported app archive request returned `queued`. Verify archival completion before describing that checkout as removed.

No task-owned background servers, watchers, or retained helper processes were launched. No process cleanup or port retirement is required for this milestone. At the initial audit handoff, no Tinderbox remote or deployment was configured and commits remained local. The subsequent GitHub destination is recorded in the [project delivery status](../../README.md#delivery-status). The donor remote is never a Tinderbox publishing destination.
