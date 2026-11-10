# Frame cost in the real game, before and after the fix, in one session

Measured 2026-11-10 on the same machine as round 1 (AMD Ryzen 7 5800X, RTX 3080,
`ANGLE … Direct3D11`), Chromium 152 in the Claude desktop browser pane, viewport
1024 x 462, device pixel ratio 1. Host load was 26% to 33% during the runs.

## Method

Two trees were served from source by their own `tools/serve.mjs`, each in its own tab:

- **before:** an export of `4fc97bb` (the tree round 1 reviewed) on port 4573
- **after:** this worktree, whose `src/` is `26931d9`, on port 4571

In each tab the page built the Catalogue Street runtime the normal way and a second
runtime for the opening test street (the control), exactly as in round 1's
`browser-frame-cost.md`. Each runtime was driven by hand with `runtime.advance(1/60)`:
90 control frames, then 60 Catalogue Street frames, three times. The tabs were measured
alternately, each one fronted while it was measured, two passes each. Medians of each
60-frame or 90-frame run are below. "Simulation" is the game's own `simulationMs`;
"view" is the rest of `advance()`.

## Result (ms per frame, range of the per-run medians)

| Scene | Tree | Simulation | View | Whole frame | Draw calls |
| --- | --- | ---: | ---: | ---: | ---: |
| Opening test street (control) | before | 0.5 to 0.7 | 0.9 to 1.4 | 1.3 to 2.1 | 87 |
| Opening test street (control) | after | 0.0 to 0.1 | 0.5 to 0.7 | 0.5 to 0.8 | 87 |
| Catalogue Street, nothing lit | before | 5.4 to 6.5 | 20.8 to 26.4 | 26.5 to 33.2 | 2431 |
| Catalogue Street, nothing lit | after | 0.9 to 2.3 | 19.2 to 22.7 | 20.3 to 24.1 | 2431 |
| Catalogue Street, lawn fire, first 5 s | before | 4.4 to 4.9 | 20.9 to 25.0 | 25.4 to 30.5 | 2461 |
| Catalogue Street, lawn fire, first 5 s | after | 0.9 | 18.4 to 20.1 | 19.3 to 21.1 | 2461 |

Medians of the nine "before" and twelve "after" idle runs: 30.8 ms and 21.6 ms.

## What this says

- The fix is real. In the same session the idle frame fell by about 9 ms (30%), of which
  about 5 ms is the simulation and the rest is the art and map passes.
- The draw-call count did not change (2,431), and the view is still about 19 to 20 ms.
  Rendering now takes nine tenths of the frame.
- **In this session the idle street is still over the 16.7 ms budget.** The game's own
  counters agreed: `renderCpuP95Ms` 23.6 to 24.4 on the fixed tree.
- Absolute figures move between sessions. Round 1's quiet-host figure for the *same*
  `4fc97bb` tree was 16.6 ms; today it is 30.8 ms. Codex's record reports 17.6 ms before
  and 11.6 ms after. The three before/after ratios agree (about two thirds); the absolute
  level does not. So "under budget" is true on some sessions of this desktop and false on
  others, and that was not resolved here.

## Limits

- One host, one browser, one viewport. No phone.
- The pane was displayed in this session and hidden in round 1; that is one candidate for
  the different absolute level and was not isolated.
- `observedHz` was read but is not reported: the pane throttles animation frames while
  another tab is fronted.

## How to reproduce

As in round 1's `browser-frame-cost.md`, once per tree. The "before" tree is
`git archive 4fc97bb | tar -x -C <dir>`, served with
`node <dir>/tools/serve.mjs --root <dir> --port 4573 --ttl 1800`.
