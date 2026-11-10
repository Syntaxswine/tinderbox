# Evidence for hostile review round 2

The review is [`../../2026-11-10-hostile-review-round-2.md`](../../2026-11-10-hostile-review-round-2.md).

Commit under test: `26931d9` (`origin/master` on 2026-11-10), which carries the two
corrections from round 1's handoff. Two older trees were run beside it:

- `4fc97bb`, the tree round 1 reviewed
- `720f7b6`, which has the snapshot fix and not the contact fix

Make either with `git archive <commit> | tar -x -C <empty directory>`. Probes that take a
tree accept its path as an argument.

Every probe drives the published simulation through `createSimulation`, or the game's own
art and map modules headless. None edits the checkout, and none is imported by the game,
its tests or its build. Run each from the repository root with Node 22 or newer.

## The bench

The round 1 probes were copied here unchanged, so that `results/` holds this round's
output and round 1's folder keeps its own. Three were changed or added:

| Probe | What it measures | Supports | Runtime |
| --- | --- | --- | --- |
| `porch-jump.mjs [tree]` | One real match at the west end of the Hopkins 12 porch: when the deck catches, and when lawn 8.5 m away beyond its east end catches and what lit it | N1 | seconds |
| `setback-wall.mjs` | Matches, torch and flamethrower against a Hopkins 9 wall that stands 1.09 m inside the collision box, with a flush wall as the control | N2 | seconds |
| `mutants-round-1-survivors.mjs` | Round 1's eleven surviving source mutants, plus two controls, against all 274 tests | S4 | about 10 min |
| `art-cell-loops.mjs` | Rewritten. Every row now calls the game's own function with one shared cell reader, in three states: nothing lit, a lawn fire, and the control street. Round 1's version used hand copies for three rows and would not have seen the fix | The fixes' M5 row | seconds |
| `browser-frame-cost.md` | The real game in a browser, old tree and new tree alternated in one session, each with the control street in the same page | S10 | manual |
| `lattice-demo.mjs` | Unchanged apart from two labels that described the old snapshot | Proposal | about 3 min |
| the other round 1 probes | As in [round 1's README](../hostile-review-round-1/README.md) | Round 1's findings, re-run | |

`results/` holds the JSON each probe wrote on `26931d9`. `results/console/` holds each
probe's printed output. `results/round-1-reviewer/` holds the output of round 1's reviewer
probes (`../hostile-review-round-1/reviewer/p02` to `p17`) re-run on `26931d9`.

Timing rows were taken with nothing else running. The reviewer's `r06` interleaves the
three trees five times and is the better instrument for the simulation's cost; quote it
before `tick-cost.mjs`.

## The reviewer's probes

`reviewer/` holds the round 2 hostile reviewer's own probes, written without sight of the
bench. `hook.mjs` patches source in memory for the mutants and for the probes that read
live state (`r01`, `r03`, `r04`, `r07`, `r13`); the others use the public entry point.
`r02`, `r05`, `r06`, `r08`, `r09`, `r12` and `r14` also run the two older trees. Set
`TB_TREES` to a directory holding them as `old/` (`4fc97bb`) and `m5/` (`720f7b6`). The
in-memory patches match files by a path ending in `tinderbox/src/…`, so the checkout
folder must be named `tinderbox`.

| Probe | What it measures | Supports |
| --- | --- | --- |
| `r01-publication-audit.mjs` | Published cells, diagnostics, obstacles and tiles against live state on every advance, across every tool and event | D11 |
| `r02-cross-tree-differential.mjs` | Complete serialized snapshots, `4fc97bb` against `720f7b6` | D12 |
| `r03-frontage-census.mjs` | Every ground-storey wall half-metre of every house, lit one at a time | N2, D15 |
| `r04-setback-walls.mjs` | Ground fire and four tools against each wall that stands inside its collision box | N2 |
| `r05-porch-one-site.mjs` | The porch deck as one site: pooled heat, paving crossed, cells lit per tick | N1 |
| `r06-tick-cost.mjs` | CPU per advance on three trees, interleaved | The fixes' M5 row, D17 |
| `r07-rotation-and-offset.mjs` | Contact strength for every prefab at four rotations and three origins | S11, D16 |
| `r08-art-differential.mjs` | Fire cards, ground mask, firelight, world and trail against round 1's consumers | D13 |
| `r09-map-differential.mjs` | The ground plan against round 1's, and a frozen list of mutable records | S11, D13 |
| `r10-mutants.mjs`, `mutants.mjs` | 37 source mutants of the new code against all 274 tests | S9, D19 |
| `r11-survivor-behaviour.mjs` | What each surviving mutant changes | S9 |
| `r12-pinned-traces.mjs` | The traces recorded in `docs/engineering/fire-exposure.md` | D18 |
| `r13-support-gate.mjs` | How often Fix B's "live section" gate decides a contact | S11 |
| `r14-heap.mjs` | Heap after sixteen burn-and-reset cycles | D14 |

`reviewer/results/` holds each probe's output. The per-mutant test logs (8 MB) were not
committed; `r10-mutants.txt` has one line per mutant and `r10-mutants.mjs` rebuilds them.
