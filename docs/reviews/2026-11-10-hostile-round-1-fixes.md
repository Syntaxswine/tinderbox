# Hostile review round 1 corrections

The [owner's handoff](https://github.com/Syntaxswine/tinderbox/blob/8d8d3599ce2a08a5cb49684370ace7d754f636ef/docs/reviews/2026-11-10-hostile-review-round-1-handoff.md) assigns M5 snapshot publication and M3 fire contact from published `4fc97bb5d14fe4f5b5557e0bc3ceee57bb2d1eee`. The reviewer's worktree and original evidence are preserved for round 2.

The M5 checkpoint is `720f7b63515c88890024021b9d7ac6f7cd427947`. It includes runtime `37a7c038d8748a4307a13ee08f54aac420bf81b8` and follow-ups `0f7810d0feac4022c5aeebf24a5a6b6f85dc529d` and `7d362fad2b7bb5a08cba603ae5f9bc43bb55c684`, art `7c1095f5e2cd7f601833e2da98338c9e77230f24`, and UI `ae7b57d8cc50e1e5402883b3058a79f37b35b601`. Runtime M3 `4b73cfa85ee0cb1b85ffebef95731c15688c4fe0` enters as `69b19043a02e247d25610cca60dc48be44e280e5`. Both corrections use the existing native geometry and source pins.

## M5 snapshot publication

The published v1 keys, order and values stay compatible. Cells and their list are read-only. The simulation reuses an unchanged cell or list, and publishes a fresh record when its visible values change. It publishes terrain tiles once per reset and shares obstacle records while the visible geometry stays the same. Custom obstacle records with mutable metadata still receive a fresh detached copy. Art and the ground plan also accept legacy mutable snapshots.

The independent comparison matched 22 complete serialized snapshots across Catalogue Street fire, Bell & Alder's door, Ashland, pause, and reset. All five frame schedules reproduced the original state hash `6070c114bbdaf2eb` before the intentional ignition change. The M5 browser lawn replay agreed on 24 burning cells, 48 flame cards, and 14 smoke cards.

| Idle measurement | Published | Candidate |
| --- | ---: | ---: |
| Catalogue snapshot CPU in the reviewer's Node probe | 4.60 ms | 1.13 ms |
| Fire card update CPU in the same probe | 1.76 ms | 0.04 ms |
| Catalogue whole frame, median of three normal-entry hardware rounds | 17.6 ms | 11.6 ms |

The combined build measured 10.9–12.8 ms in three rounds on the RTX 3080 with Direct3D 11, a 1024 × 462 game viewport, and about 21% host load during the candidate arms. Both Catalogue arms issued 2,431 draw calls. The opening-street control measured 1.1 ms median. In a separate viewport-matched run with the host heavily loaded, M5 alone measured 31.7 ms versus 47.5 ms published. The absolute frame budget is verified for the quiet desktop setup.

## M3 native siding and porch contact

The two existing ground contact depths follow each exposed panel's full edge. Each half metre keeps its previous contact strength. Native deck, stair and post fuel can receive heat from burning ground. The flamethrower's forward cone can heat low exposed porch wood. Range and masonry still govern visibility.

All eight tested Hopkins 9 frontage rows, 68–75, ignited. Near gas contacts on either half lit the siding at 1.27 world seconds. Lawn fire lit the Hopkins 12 stairs at 1.85 seconds and the deck at 1.95. An isolated grass cell warmed siding to 56.7% of ignition before cooling. The short masonry screen, bare-brick, facing-away and out-of-range controls passed. All ten original census cases matched the burned zones, house ignition and collapse sets, and barrel order. The new regressions failed for all three rule mutations that survived round 1. [Engineering traces](../engineering/fire-exposure.md)

The 1280 × 720 browser replay used the native Hopkins 12 porch at default zoom. The deck was the first structure ignition at 0.233 seconds. The same package opened Catalogue Street from the title and showed the ground plan. The browser reported zero errors.

The architect's combined gate passed all 274 tests, art and dependency checks, and the nested URL check for all 3,513 packaged files. The SHA-256 of the checked manifest is `086624b2735310002a3a8b3db41b234c938ef1900366864d4e141fbf8532b4d0`. The architect approved the combined build for `master`. The captures, raw timing receipts and helper shutdown receipts are under the ignored local `artifacts/qa/hostile-review-round-1/` directory.
