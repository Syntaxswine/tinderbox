# Nonmaterial duplicate-vertex faces: one concrete source case

Checkpoint the endpoint-bounds extension separately first. Coder may then make
this narrowly scoped correction in the existing support source/adapter code.
No source-art buffer, transform, UV, native recipe or quantity may change.

The read-only UI diagnosis of `e67235b6` proves that original global part 2352,
`clerestory/front-rail/baluster-0`, geometry
`8bab8c76f9be09b30411af10f745a5555a5c475b9e20f2d84a3dd979cc40cfa3`,
has 200 finite triangles, exactly 20 zero-area triangles, and no positive
EPS-small triangle in either raw or world coordinates. Each failing face has
two exactly identical coordinate positions despite distinct vertex indices.
The same original ordinals fail before/after transformation:
`0,19,20,39,40,59,60,79,80,99,100,119,120,139,140,159,160,179,180,199`.
The existing component helper rejects the whole part. Diagnostic inputs/result
are in the UI worktree's ignored
`artifacts/ui-qa/baluster-2352-e67235b6/`; pin and preserve this original failure.

Treat only these provably empty **duplicate-coordinate, zero-area** faces as
nonmaterial during original component enumeration. Keep the complete raw
triangle array and absolute primitive ordinals unchanged; do not compact or
renumber it. Such faces cannot be ports, join components, prove interior,
create support or contribute fuel. Preserve existing rejection of nonfinite,
malformed and other unproved zero-area inputs; no general collinearity solver,
epsilon removal or new tolerance is needed. An all-nonmaterial part cannot
become a support-bearing original. Existing triangle ceilings still count all
supplied slots, with no cap increase.

Reconcile the constructor/strict original-material checks as necessary so they
use the actual positive-area components. Do not relax the authoritative current
fragment/closed-solid guards or bridge a missing material path. Preserve normal
inputs, fixed native IDs, anchors, ALL requirements and generation/retirement
rules. Source geometry and renderer output remain byte-identical.

Verify the real 200/180/20 case and exact retained ordinals, a port rejected on
an excluded face, nonfinite/all-empty rejection, and two real components that
cannot be joined by empty faces. Run affected existing physical/strict-embed
regressions; do not repeat unrelated native or render checks. A new component
result does not by itself prove this baluster's physical joint: that contact
gets a separate source recheck after the helper candidate is reviewed.

No actual native/compiler, world/stock, whole-New-York diagnostic, renderer,
benchmark, build or retained helper is authorized. Preserve old source results
and failed controls as historical facts; keep evidence compact and deliver a
separate checked commit/push for architect review.

## Confirmed current-fragment admission gap

Root's independent `duplicate-face-grounding-repro.mjs` in ignored M29 QA shows
that `0ce79739` still permits a raw empty original face to seed a surviving
fragment at elevation zero. The original box genuinely touches ground. After
its actual surviving original faces are clipped to Y >= 1, it is unrooted;
appending the original empty face to the fragment geometry grounds it again,
although the declared primitive list excludes that empty ordinal. Source
component enumeration alone does not exclude it from current root seeding.

Acceptance of `0ce79739` is held. Reject or exclude nonmaterial current fragment
geometry before all continuity/contact/root use. A narrow **tightening** of
current fragment admission to finite positive-area physical triangles is allowed;
this supersedes only the earlier byte-identical-evaluate constraint. Keep the
effective closed-solid proof guard, original IDs, legitimate internal caps and
valid positive fragments unchanged. Preserve and add this exact foundation-loss
regression; no new native/world or geometry/quantity work is authorized.
