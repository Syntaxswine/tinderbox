# Milestone 05: a second catalogue block

Status: implementation checkpointed; **85 tests, independent source/geometry checks and package verification pass**. [Browser acceptance and promotion remain pending](../reviews/2026-10-28-catalogue-block-two.md). The user requested another chunk of buildings after reviewing the first street's JPG. This adds three existing artist designs to the three already placed, with a new JPG overview and a closer view of the additions. Runtime promotion still follows the [workflow gate](../workflow.md).

## Frozen inputs and ownership

- Combined base: `1a3e2934072f98b7be9f691cf651ee369748d66f`, preserving the first street, native painted bear and existing gameplay.
- Artist intake: `56b028c2935b5a97fe259618f38e0a1550928ab4`. Read immutable Git objects. The artist's active Hopkins v2 work is outside this intake.
- Keep Hopkins 12, Hopkins 15 and the Ashland worker cottage at their existing placements. Add Hopkins 9 (`hopkins-4-09`), Hopkins 13 (`hopkins-4-13`) and the Monroe Street brick row-house design (`monroe-row`). Six selected designs and six placed houses total.
- Deliberately adopt the committed centered sash-window update for Hopkins 13 and 15. Its unchanged Nautilus source is `90054d07134116a5d9661f8318a76fe68f922aad`; retain its five-module dependency closure, notices and inherited AFT provenance. Use the existing shared Three implementation.
- TB-016: existing **Coder Tinderbox** in its coding checkout, branch `codex/catalogue-block-two-coder` from the combined base. Own runtime/content, selective art intake, relevant tooling/checks and `docs/engineering/catalogue-block-two/`.
- TB-017: architect in the primary checkout, branch `codex/catalogue-block-two`. Own source reconciliation, this brief, coordination records, independent QC, offline JPGs and promotion. Reuse the existing workers; no new chat, worktree, UI assignment or art commission is needed.

The [source/adaptation record](../research/catalogue-block-two/README.md) identifies the original plates. This is a fictional street assembled from period designs. It does not reconstruct the exposition grounds or an actual Monroe Street block.

## Bounded street extension

Extend the south side of the existing street so the three new houses face the first row. Keep the existing player, first-row placements, civilians, road and controls. Suggested native placements are No. 9 at `(3,30)`, No. 13 at `(15,30)` and Monroe at `(27,31)`, all quarter-turn zero, within a 36 by 47 m world. Refine these only when actual source geometry requires clearance. Keep navigable side gaps and a back route; verify a continuous bear-centre path from the original sidewalk to every new frontage and behind the new block.

Preserve 1 by 2 by .16 m walls, 1 by 1.65 by .12 m doors, .12 m slabs, 2.12 m floor pitch, UVs and physical texture density. Place unchanged prefab assemblies with rigid translations/quarter turns. All mesh scales remain `[1,1,1]`; the bear retains native dimensions and .56 m collision radius. Closed doors remain nontraversable. No room/stair traversal, new UI, editor or new fire solver enters this slice.

The sash bay is 2 m wide with a 1 m opening and .5 m flanks. Verify its placement, unobstructed visual aperture and source geometry/UV preservation in Hopkins 13 and existing 15. Elevated window trim and roof overhangs do not create filled ground obstacles. Corrected No. 13 chimney seating belongs to the frozen source update.

Ground foundation, porch and entry-stair geometry must agree with collision and heat footprints for every added design. Preserve per-building partial char, finite ground-fuel accounting and atomic visible/collider removal at burnout. The brick row-house skin uses the existing coarse whole-building fuel approximation; this does not establish masonry combustion or structural fire physics. Detached placement and unseen side elevations are game adaptations.

## Acceptance and handoff

1. Exactly six selected/placed source identities; original three locations retained. Individual prefab JSON, full catalogue entry and generated synchronous plan agree. Unknown content stays rejected.
2. Reproducible selective intake from the exact artist pin. Verify raw hashes, transitive imports, notices and source chain. No live donor dependency, unrelated asset collection or second Three implementation.
3. Actual source foundations, decks and stairs match footprints through all four quarter turns. Verify the native bear's street/side/back clearance and blocked house/door entry. Verify partial/complete burnout membership, source immutability and disposal once.
4. Reuse the meaningful mechanics and production composition checks. Extend existing checks for new source geometry, centered windows, traversal and package closure. Build/package checks pass at a nested project URL. Do not create another tester just to display a preview.
5. Architect produces and inspects JPGs from the actual placed meshes and original textures, labels omitted elements, and records the result. Saved offline images do not establish browser shader, gameplay or GPU performance acceptance.
6. Deliver exact candidate SHA, changed paths, sources, checks/results, remaining limitations and helper cleanup receipts. Commit/push the candidate branch after relevant checks pass. The architect alone promotes to `master` after the required desktop/phone WebGL review; Pages remains at its existing reviewed version until then.

Temporary package servers/renders stop when their checks finish. Reuse existing dependency folders read-only; do not create a retained helper just for the JPGs.
