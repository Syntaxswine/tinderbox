# Frame cost in the real game, round 2's tree beside round 3's, in one session

Measured 2026-11-10 on the same machine as rounds 1 and 2 (AMD Ryzen 7 5800X, RTX 3080,
`ANGLE … Direct3D11`), Chromium in the Claude desktop browser pane, viewport 1024 x 768
(rounds 1 and 2 used 1024 x 462), device pixel ratio 1. The reviewer subagent had finished
and no other job of this review was running.

## Method

As in round 2's `browser-frame-cost.md`. Two trees served from source, each in its own tab:

- **before:** an export of `26931d9` (the tree round 2 reviewed) on port 4573
- **after:** this worktree, whose `src/` is `c855e62`, on port 4571

In each tab: the Catalogue Street runtime built the normal way, plus a second runtime for
the opening test street as the control, both driven by hand with `runtime.advance(1/60)`.
Idle: 90 control frames then 60 street frames, three times per pass, two passes per tab,
tabs alternated and each fronted while measured. Fire: the flamethrower held for 45 frames
at the north lawn from the spawn point, then ten 60-frame runs. One fire run per tab.
Figures are medians of each run, in ms per frame.

## Result

| Scene | Tree | Simulation | View | Whole frame | Draw calls |
| --- | --- | ---: | ---: | ---: | ---: |
| Opening test street (control) | before | 0.1 | 0.5 to 0.6 | 0.6 to 0.7 | 87 |
| Opening test street (control) | after | 0.1 | 0.6 to 0.7 | 0.6 to 0.8 | 87 |
| Catalogue Street, nothing lit | before | 1.3 to 1.6 | 13.4 to 14.9 | 14.7 to 16.3 | 2431 |
| Catalogue Street, nothing lit | after | 1.7 to 1.8 | 14.8 to 15.4 | 16.5 to 17.0 | 2431 |
| Catalogue Street, lawn fire, first 10 s | before | 2.9 to 5.9 | 15.7 to 18.9 | 18.8 to 24.8 | 2450 to 2465 |
| Catalogue Street, lawn fire, first 10 s | after | 3.6 to 6.2 | 16.2 to 19.5 | 20.2 to 25.6 | 2450 to 2465 |

Medians of the six idle runs per tree: 15.5 ms before, 16.8 ms after.

## What this says

- The two passes cost about 1 ms more per idle frame in the browser (about 8 %), which agrees
  in direction with the Node measurement (`reviewer/r06-tick-cost.mjs`: 10 to 14 %).
- With a lawn fire burning the street takes 19 to 26 ms per frame on both trees, over the
  16.7 ms budget. Rendering is 16 to 19 ms of that. The draw-call count has not changed
  since round 1.
- The idle street sits at the budget in this session (round 2's session read 21.6 ms for
  the same `26931d9` tree at a smaller viewport). Absolute levels still move between
  sessions on this desktop; only the same-session comparison is used.

## Limits

One host, one browser, one viewport, no phone. One fire run per tree, and the two fires are
not frame-for-frame identical inputs to the renderer. Medians only.
