# Architect blocker correction after 0ce79739

The architect supplied the exact read-only repro at
`artifacts/qa/m29-architect-intake/duplicate-face-grounding-repro.{mjs,json}`
in the primary checkout and held acceptance of `0ce79739`.

An originally grounded box spans Y=0..2 and includes an original empty duplicate-
coordinate face at Y=0. Current positive original faces clipped to Y>=1 correctly
have no support after foundation loss. Appending that same empty raw face to the
current fragment, even with primitive 0 excluded, incorrectly seeded grounding.

The architect explicitly authorized rejecting/ignoring nonmaterial current
fragment geometry before ANY support/continuity/ground calculation. A narrow
tightening to finite positive-area fragment triangles supersedes the previous
byte-identical-evaluate constraint. Keep effective closed-solid guards and
genuine internal caps, preserve the old failure and 0ce history, add the exact
regression and affected checks, then commit/push a separate candidate.

Further 96-contact page mapping is paused. Its already completed source input
preparation stays separate and preserved; do not repeat its geometry expansions.
No actual native/compiler, full-New-York diagnostic, world/stock, renderer,
benchmark, build or retained helper is authorized by this correction.
