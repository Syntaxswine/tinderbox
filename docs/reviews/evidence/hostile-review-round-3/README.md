# Evidence for hostile review round 3

The review is [`../../2026-11-10-hostile-review-round-3.md`](../../2026-11-10-hostile-review-round-3.md).

Commit under test: `c855e62` (`origin/master` on 2026-11-10), which carries Codex's two
passes after round 2: the round-two corrections (`968e88a`) and the floor-fire pass.
Older trees were run beside it:

- `26931d9`, the tree round 2 reviewed: the control for both passes together
- `968e88a`, after the corrections and before the floor pass: the control for the floor pass
- `4fc97bb` and `720f7b6`, which round 2's reviewer probes still need as `old/` and `m5/`

Make any of them with `git archive <commit> | tar -x -C <empty directory>`. Probes that take
a tree accept its path as an argument, or read `TB_TREES` (a directory holding `tip2/`,
`old/`, `m5/`).

Every probe drives the published simulation through `createSimulation`, or the game's own
art modules headless. None edits the checkout, and none is imported by the game, its tests
or its build. Run each from the repository root with Node 22 or newer.

## The bench

Round 2's probes were copied here unchanged, so `results/` holds this round's output.
One probe is new:

| Probe | What it measures | Supports |
| --- | --- | --- |
| `lantern-dud.mjs [tree]` | One lantern lobbed at a Hopkins 9 wall per reach from 0.8 to 3.4 m, at a set-back row and a flush row: where it came down, oil reaching the ledger, what caught in 3 s | N3 |
| `browser-frame-cost.md` | Frame time in the real game, `26931d9` beside `c855e62`, one session | S15 |

`results/console/` holds each probe's printed output on `c855e62`, plus
`lantern-dud-26931d9.txt` for the control. `results/round-1-reviewer/` and
`results/round-2-reviewer/` hold the output of the earlier rounds' reviewer probes, run
from their own folders against this tree.

`results/console/tick-cost.txt` was taken while the reviewer's mutation batch was running,
so its absolute figures are high. It is kept because `lattice-demo.mjs` reads its JSON. For
cost, use `reviewer/results/r06-tick-cost.txt` and `browser-frame-cost.md`.

## The reviewer's probes

`reviewer/` is the work of the round's one hostile reviewer, who did not see the bench.
[`reviewer/REPORT.md`](reviewer/REPORT.md) is its report, with one line per probe and the
command for each. `reviewer/results/` holds each probe's output. `hook.mjs` applies mutants
and read-only taps in memory; no probe writes to `src/`.

| Probes | Subject |
| --- | --- |
| `r01`, `r02`, `r08`, `r14` | Floor patches against the drawn oak, links, stranded pieces, spread speeds |
| `r03`, `r13`, `r21` | How the street and the Ashland pair burn, against `26931d9` and `968e88a` |
| `r04`, `r07`, `r16`, `r18`, `r22` | Lanterns: duds, preview against flight, every set-back panel, the marker sweep |
| `r05`, `r17`, `r19` | Flamethrower: through-wall hits, exposed panels missed, grazing shots, the fan's ray budget |
| `r06` | Cost per frame, both trees interleaved in one process |
| `r09` | Determinism, reset, fuel ledger, published against live |
| `r10`, `mutants.mjs`, `r15` | 57 mutants of the code added since `26931d9`, and what each survivor changes |
| `r11` | Tool blockers during a collapse |
| `r12`, `r20` | Deck sections: directions, stairs, post, odd sizes |
