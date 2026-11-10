# Hostile review round 2 corrections

The owner assigned the porch spread, setback walls, and publication regressions from the review of `26931d90a86faf0d93de0e05794d0571ff99c904`. The round-two runtime candidate is `97267e616cc4c48873aba193556c1160c5ca9dda` after the publication tests in `363a152adba15ba2125e074adc3328555eaba336`. The ground-plan candidate is `b53861ae140b63ec89eb785a271bc155fbb3e003`. The torch presentation follow-up is `dca6063db04099eb212cba36a3e6a480a3fa1765`. The exact combined package was built from `97808ee81c5b64bad25194b369ca72beb6428d44`. [Owner handoff](https://github.com/Syntaxswine/tinderbox/blob/ef2d7c8af259e0c44ae792e8b23287d933d5b898/docs/reviews/2026-11-10-hostile-review-round-2-handoff.md)

## Porch progression

The native Hopkins 12 deck has eight one-metre timber sections. Each exchanges heat along its own exposed edges. Adjacent sections use the existing structural spread rule, and the entry, post, and stairs connect to nearby timber. The stair sample sits on the 0.32 m tread.

- A match on the lawn reaches the far grass at 5.72 s via an adjacent grass cell. On the prior release it reached that cell from the deck in 1.83 s. The grass control from before frontage coupling took 5.80 s.
- Two single grass cells seven metres apart warm their local deck sections without igniting them. In the paved crossing, the eight sections ignite in order at 0.70 s intervals and the far grass catches at 6.65 s. The shorter wall fixture takes 6.07 s. A match on the deck lights one section directly and its first lawn ignition wave is two cells, down from 22.
- Lawn fire still lights the Hopkins 12 stairs at 1.85 s and the first deck section at 2.43 s. An exposed flamethrower shot lights the low timber. Facing away, exceeding range, and the masonry screen still protect it. [Engineering traces](../engineering/fire-exposure.md)

## Setback walls

The native rectangular plinth still blocks walking and ground contact. The tool collision uses the 0.36 m open plinth, 0.48 m room rim, and the walls, posts and rails from the authored geometry. The live section bounds also limit those tool blockers during collapse. The lantern preview and flight share the blocker query. A wall-rim impact can heat the adjacent timber, and a flush impact still deposits its fuel pool outside the small movement margin.

The original setback sweep records 21 of 21 direct lantern ignitions and 18 of 21 direct flamethrower ignitions. The other three panels are 4.60 m from the closest legal centreline stance. The cone has 4.50 m reach. Eight independent packaged tool and rotation cases ignited the Hopkins 9 window panel with both tools and left the player outside the plinth.

The art review also found a published floor flame sample at 0.50 m over a bare 0.36 m plinth in Hopkins 9 during later spread. The sample comes from the existing ground-floor fire graph.

## Publication and review checks

The three publication regressions pin equal pool-cell fuel and its ledger on impact, the retreat of `frontX`, and the exact row-order fuel sum. The reviewer's full mutation runner reported all three as killed. Its A02 run also caught the torch presentation regression in the earlier candidate. On the corrected revision, the same mutation hook cleanly failed each new regression while its control passed. The ground plan's focused test verifies in-place edits to mutable records inside frozen lists.

All ten committed-mechanics census cases matched the prior release's strike results, burned fractions, house ignition and collapse sets, barrel order, deaths, and final health. The runtime `node tools/check.mjs` passed 286 tests. The architect ran 38 focused tests on the final combined tree after the torch correction. The earlier full combined run passed 286 of 287 and isolated the torch regression.

The hardware browser replay used 1280 × 720 at normal zoom. One match directly lit one deck section. Two sections were burning at 0.73 s and all eight had caught by the 6.23 s checkpoint. The exact Hopkins 9 setback panel lit at 0.25 s from the flamethrower. The lantern preview and live impact met at the wall at about 0.527 m above the ground. The torch trace stopped at x=10.0901 m and lit the flush wall. The normal and cottage street visits both opened, with zero browser errors. The temporary browser and server exited and released their ports. The artist reviewed the porch progression and verified the flame anchors on the native deck and stair tread. Later soot is visible near the eave.

The reviewed package contains 3,514 files and its manifest SHA-256 is `824cc1264223cf4651fa34a7c251fae93969a85a9244e351eb00271b10219bff`. The architect approved this package for `master`. The local captures and raw receipts are in the ignored `artifacts/qa/hostile-review-round-2/` directory.
