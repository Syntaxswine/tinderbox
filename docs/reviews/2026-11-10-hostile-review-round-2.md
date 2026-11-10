# Hostile review, round 2: the two fixes, and what they left

- **Reviewed commit:** `26931d9`, the tip of `origin/master` on 2026-11-10. It carries Codex's two corrections from the [round 1 handoff](2026-11-10-hostile-review-round-1-handoff.md), recorded in [`2026-11-10-hostile-round-1-fixes.md`](2026-11-10-hostile-round-1-fixes.md):
  - **Fix A, snapshot publication** (round 1's M5), complete at `720f7b6`.
  - **Fix B, wall and porch contact** (round 1's M3), `69b1904`.
- **Compared against:** `4fc97bb`, the tree [round 1](2026-11-10-hostile-review-round-1.md) reviewed, and `720f7b6`, which has Fix A only. Both were exported with `git archive` and run beside the new tree.
- **Judged against:** the owner's sentence, as in round 1: "I want fire to spread easily and be tracked in a tile by tile modular way that moves along every axis."
- **Method:**
  - One hostile reviewer, a Claude subagent, was given the two fixes and their claims and told to break them. It wrote 14 probes of its own and did not see the bench.
  - The commissioning session re-ran the whole round 1 bench and the round 1 reviewer's probes on `26931d9`, re-took the frame cost in a browser with the old tree beside the new one, and re-ran every MUST-FIX by hand. The table near the end says how.
  - Labels are as in round 1: **measured**, **code-reading**, **judgment**.
- **Evidence:** [`evidence/hostile-review-round-2/`](evidence/hostile-review-round-2/README.md).
- **This branch changes nothing in the game.** It adds this record and the probes, and merges `26931d9` so they run on the fixed tree.

A **cell** is one 0.5 m square of the ground heat grid. A **site** is one fire-carrying patch of a house. Times are world seconds.

## Score: 4 / 10 against the owner's sentence (round 1: 3)

| Clause | Round 1 | Round 2 | What moved |
| --- | --- | --- | --- |
| "spread easily" | Half | Half, and better at the seam | A lawn front now lights siding in 0.93 s where it took 1.98 s. Porches catch. Fire still stops at 0.5 m of bare ground, and a burning house still lights nothing it does not touch. |
| "tracked tile by tile" | No | No | Nothing in either fix touches the five trackers. Fix B exposed the largest non-tile unit in the game: a porch deck that burns as one 16 m² piece (N1). |
| "modular" | No | No | The scenario `id` still picks the fire model (`index.js:27-28`, unchanged). |
| "moves along every axis" | Inside two house models only | Unchanged | Tools still light at 0.98 m and 1.98 m. The three landmark maps still accept no tool. |

The reviewer scored 4 and the bench agrees.

**The fixes as delivered: 7 / 10.**

- **Fix A is close to a 10.** No instrument found a wrong published value in about 160,000 compared frames.
- **Fix B is about a 6.** It does what the handoff asked on open walls. It also wired the ground to a deck that is one site, and its claim does not hold for 30% of two houses' ground-storey walls.

## What the fixes achieved (measured)

| Round 1 finding | Check from the handoff | `4fc97bb` | `26931d9` |
| --- | --- | --- | --- |
| M5 | Simulation CPU per frame, Catalogue Street, nothing lit (reviewer's `r06`, median of five interleaved rounds) | 4.17 ms | 1.02 ms |
| M5 | Same, street burning | 5.69 ms | 2.70 ms |
| M5 | Art and map passes that re-read the grid, nothing lit (`art-cell-loops.mjs`) | 2.9 ms | 0.03 ms |
| M5 | State hash under five frame schedules (`determinism.mjs`) | `6070c114bbdaf2eb` | The same on `720f7b6`, which has Fix A only. `a8ebf447f0b3eda1` after Fix B, which changes ignition on purpose |
| M5 | Whole browser frame, nothing lit, same session (`browser-frame-cost.md`) | 30.8 ms | 21.6 ms |
| M3 | Rows along the Hopkins 9 east wall that can light it (`p07`) | Every other row | All eight, 68 to 75 |
| M3 | Hopkins 12 porch from lawn fire (`p03` 3d) | No preheat | Stairs catch at 1.85 s |
| M3 | Hopkins 12 porch from the flamethrower (`p08` 8a) | 0.9 L, no ignition | Deck catches |
| M3 | Controls: bare brick, a masonry screen, road, paving | Blocked | Blocked |
| M3 | Ten one-match cases (`one-match-census.mjs`) | 100% of the strike's side, 0% across | The same sides, houses and drums; flames out 2 to 9 s sooner |

## MUST-FIX

### N1. The porch deck is one fuel unit wired to its whole edge, so fire jumps its length in one step

**Raised by the reviewer; new with Fix B.**

Each porch footprint is one site (`housing-topology.js:130-132`). Fix B gave that site ground contact along all four sides (`housing-fire.js:40-47`). Hopkins 12's deck is 8 m by 2 m, so one site now touches about 20 m of ground. It takes heat from every burning cell along that edge at once, and when it catches it heats every cell along that edge in the same tick.

Measured on the shipped street, one match on the lawn at the west end of the Hopkins 12 porch (`porch-jump.mjs`):

| | `720f7b6` (control) | `26931d9` |
| --- | --- | --- |
| Deck ignites | 6.22 s, by spread from a wall | 0.70 s, by ground heat |
| First lawn cell beyond the east end, 8.5 m away | 5.80 s, lit by the grass front | 1.83 s, lit by the house |
| Speed over those 8.5 m | 1.5 m/s | 4.6 m/s |

A grass front moves about 1.6 m/s and a timber front 0.53 m/s (`ground-front.mjs`). The deck carries fire three times faster than grass and nine times faster than its own material.

The reviewer's `r05-porch-one-site.mjs`, re-run, adds:

- **It crosses paving.** With 8 m of bare paving between two lawn patches along the porch front, the far patch lights 1.75 s after the near one. On `720f7b6` it never lights in 40 s. Along a wall, a chain of 1 m sites, 5 m of paving takes 6.07 s.
- **It pools heat from far apart.** Two single grass cells 7 m apart light the deck at 1.73 s. One cell alone peaks at 0.83 of ignition. The same two cells 5 m apart against a wall peak at 0.83 and light nothing.
- **It releases along the whole edge.** One match on the deck lights 22 lawn cells in a single tick across 8.5 m, and 50 within a second. On `720f7b6`: none.

This serves "spread easily". It is the opposite of "tile by tile", and it is round 1's M1 made visible: the deck was always one piece, and nothing reached it before.

**Smallest fix (proposal):** split each porch footprint into one site per metre, as walls already are, and link neighbours. Fire would then run the deck at the timber speed and each metre would take heat only from the ground beside it.

### N2. Three tenths of the ground-storey clapboard on two houses still cannot be lit from the ground or by any tool

**Raised by the reviewer; older than the fix, and the remainder of M3.**

Hopkins 9 and Hopkins 13 are L-shaped. Each one's collision box is the plan's full rectangle, 4.6 m high (`buildings.js:17-18`). Walls in the notches stand 1.09 to 4.09 m inside that box. Their frontage cells are inside it too, so they hold no fuel and the line to the wall is blocked (`surface-fire.js:136,165`). Tool reach stops at the box (`tools.js:100`).

- **Frontage (reviewer's `r03-frontage-census.mjs`):** 39 of 130 half-metres of ground-storey clapboard stay cold when the cell in front is filled with gas and lit: 19 of 66 on Hopkins 9 and 20 of 64 on Hopkins 13.
- **Tools (reviewer's `r04-setback-walls.mjs`, re-run):** 21 of 21 set-back panels take no heat from burning gas, a match, a torch, 1.5 s of flamethrower or a thrown lantern.
- **By hand (`setback-wall.mjs`):** standing on the lawn 0.59 m from the box and facing Hopkins 9 panel `wall:0:6,2|6,3`, matches and torch find nothing in reach and 1.5 s of flamethrower warms no site. The flush panel 2 m along the same wall lights from the match at 0.03 s, the torch at 0.55 s and the flamethrower at 0.25 s.

These walls burn only by spread from a neighbouring panel. Fix B's record says every exposed half metre can now catch; that is true of the 388 half-metres in open air (D15) and false of these.

**Smallest fix (proposal):** build each house's collision from its plan outline, so a notch is open ground with its own cells. That is a content and collision change, the coder's and the architect's call.

### Still open from round 1, unchanged

M1, M2 and M4 were not handed over and neither fix touches them. Each was re-run on `26931d9`.

| Finding | Re-run | Result on `26931d9` |
| --- | --- | --- |
| M1. No shared unit; the scenario `id` picks the model | `p04b` | Same: `neighborhood` burns 284 sites up to 6.17 m; `my-new-street` burns 284 flat cells and loses the collider at +28.5 s |
| M2. Fire cannot leave its fuel bed | `pathways.mjs` 1 to 4, `one-match-census.mjs`, `p17` | Same: a 0.5 m bare strip stops grass, timber and gas; a bear 0.75 m from a burning house keeps 100 hp until rubble heat at 150 s; a burning goat lights no grass |
| M4. Height only inside the house graphs | `p03` 3a, `p12` | Same: tools light at 0.98 m and 1.98 m; the three landmark maps accept no tool and publish no cell |

They wait on the owner's decisions at the end of round 1.

## SHOULD-FIX

### S9. Three paths in the new publication code are not held by any test

The reviewer wrote 37 source mutants of the new code and ran each against all 274 tests: 28 are caught and 9 pass. Three of the nine change what the game publishes (reviewer's `r10`, `r11`; all three re-run by hand):

| Mutant | `field.js` | What goes wrong when it is applied |
| --- | --- | --- |
| A thrown pool is not marked changed | line 86 | A lantern broken on siding publishes 0 fuel against a live 0.033 in 746 cell-frames, and 0 L remaining against 0.3 L for 121 frames |
| The front position never retreats | line 238 | `frontX` is stale in 12,434 frames (first: published 10.75, live 10.25) |
| The fuel total is summed out of order | line 235 | The total differs from round 1 in the last digit |

The shipped code is correct on all three. The tests would not notice if it stopped being so.

### S10. The idle street still misses the frame budget in this session, and the rest is rendering

Fix A removed about 9 ms. In the same session the fixed tree's idle Catalogue Street frame was 20.3 to 24.1 ms against a 16.7 ms budget, and the game's own `renderCpuP95Ms` read 23.6 to 24.4 (`browser-frame-cost.md`). The view takes 19 to 20 ms of that, and the draw-call count is unchanged at 2,431.

Absolute figures differ between sessions on this desktop: the same `4fc97bb` tree read 16.6 ms in round 1 and 30.8 ms today, and Codex records 17.6 ms before and 11.6 ms after. All three ratios agree at about two thirds. Whether the street holds 60 Hz is therefore not settled, and no phone has been measured. Rendering was outside both rounds.

Two smaller remainders, neither urgent:

- Each snapshot still clones every module and building (`index.js:341-354`), about 0.4 ms of the 1.0 ms idle simulation frame (`profile-frame.mjs`).
- With a lawn fire burning, the art and map passes cost 2.2 ms a frame, of which the flame cards are 1.4 ms and the ground plan 0.6 ms (`art-cell-loops.mjs`).

### S11. Four smaller findings from the reviewer

- **The ground plan trusts a frozen list.** `ui/map.js:109-111` checks only that the list is frozen; the art reader checks each record (`cell-publication.js:41-44`). Given a frozen list of records that are still edited in place, the plan shows 0 fires where round 1's showed 1 (`r09`). The simulation never produces that input.
- **The "live section" gate in Fix B never decides anything.** In a whole-street burn to total collapse it skipped a contact 0 times: porch fuel is spent by 18.6 s and the first section falls at 150.7 s (`r13`). Two mutants that remove it pass every test.
- **A house off the half-metre grid loses coupling.** With the origin moved 0.04 m, up to 21 of 36 open-air wall sites on Hopkins 15 keep 57% of their ground coupling, because both depth bands land in one cell and one is dropped (`surface-fire.js:147-150`, `r07`). No shipped house is placed that way.
- **One sentence in the engineering record is out of date.** `docs/engineering/fire-exposure.md:39` says Ashland exchanges heat "only through its two existing outward ground probes". On this tree 48 of 52 half-metres per cottage warm (`r03`).

### Round 1's SHOULD-FIX list, re-run

| # | Finding | Result on `26931d9` |
| --- | --- | --- |
| S1 | Collapse follows a 150 s clock, not what burned | Same: one site burning 0.08 s still drops its section at 150.02 s (`collapse-clock.mjs`) |
| S2 | Fire climbs barely faster than it creeps | Same: 1.05 to 1.23 to 1 (`structure-spread.mjs`, identical output) |
| S3 | A poured trail's burn time depends on its heading | Same: 1.25 to 3.15 s per cell (`p02`) |
| S4 | The ground fuel rules are almost untested | **Mostly closed.** Of round 1's eleven surviving mutants, seven are now caught. Four still pass all 274 tests: a burning cell that holds no heat, the stair link removed, a thrown lantern that always hits the low band, and house fire that ignores the powder clock (`mutants-round-1-survivors.mjs`) |
| S5 | The front speed is not a setting | Same (`ground-front.mjs`, identical output) |
| S6 | A burning animal and nearby burning fuel do not count as fire | Same (`pathways.mjs` 4, `p03` 3c) |
| S7 | Smolder samples omit `heatFraction`; a prop lowers its floor cell's fuel | Same: 222,060 of 959,266 samples lack the field in a one-minute house fire; 48 of 256 shop floor cells (`p15`) |
| S8 | Every lawn fire ends the same way | Same, and sooner: 26 to 41 s |

## DEFENDED

Round 1's D1 to D10 were re-run and hold; `ground-front.mjs`, `collapse-clock.mjs` and `structure-spread.mjs` write byte-identical results. These are new:

| # | Attack | Result | Probe |
| --- | --- | --- | --- |
| D11 | Fix A publishes a stale or wrong value somewhere | All ten fields of every cell, the three diagnostics, obstacles and tiles matched live state after 42,184 advances. The scripts used all five tools, poured trails, lantern and molotov pools, both drum types, a burning actor, player death, pause, reset, pickups, the shop door, section collapse, rubble heat, the Ashland pair to full collapse, irregular frame lengths and three other grid sizes | reviewer's `r01` |
| D12 | Fix A changed what round 1 published | 45,896 of 45,896 complete snapshots are byte-identical between `4fc97bb` and `720f7b6` | reviewer's `r02` |
| D13 | The art or the ground plan shows stale fire | Fire cards, ground mask, firelight, world rebuilds and trail matched round 1's consumers in 40,326 frames; the plan matched in 29,800 | reviewer's `r08`, `r09` |
| D14 | Frozen records break a consumer, or leak | No consumer in `src/` edits or sorts shared data in place. Sixteen burn-and-reset cycles grew the heap 0.43 MB, against 0.50 MB on `4fc97bb` | reviewer's `r14` |
| D15 | Fix B leaves open-air frontage that cannot catch | 388 of 388 open-air wall half-metres on all eight street houses and both playable cottages warmed the siding within 0.2 s. The 98 that did not stand behind their own porch (59) or inside a collision box (39, N2) | reviewer's `r03` |
| D16 | Fix B depends on which way a house faces | All four quarter turns of all six prefabs give full-strength contact | reviewer's `r07` |
| D17 | Fix B made a tick more expensive | Street burning: 2.75 ms on `720f7b6`, 2.70 ms on `26931d9` | reviewer's `r06` |
| D18 | Fix B's recorded traces are wrong | Reproduced: siding at 0.933 s on a full lawn, 2.383 s on a two-cell strip, a peak of 0.567 from one cell | reviewer's `r12` |
| D19 | Fix B's own tests are weak | 10 of 12 contact mutants are caught, including a halved coupling, dropped porch fronts and masonry ignored | reviewer's `r10` |

## The proposal, after the fixes

Round 1's lattice proposal stands. `lattice-demo.mjs` was re-run against the fixed tree:

- Flat ground still matches the shipped field to three decimals in nine directions for three fuels.
- One match on the north lawn still gives the shipped outcome: north 100%, south 0%, 3 of 3 and 0 of 5 houses, 2 drums. The shipped fire is now out at 27.2 s; the kernel, with contact only, at 39.8 s.

N1 is the clearest case for it yet. A deck made of tiles could not burn as one piece.

Rungs 0 and 1 of round 1's order are done, apart from N1 and N2. Rungs 2 to 6 are untouched.

## Decisions for the owner

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | Should a porch burn as one piece? | Yes, as now: fire runs its length in under 2 s; or one site per metre | One site per metre. It keeps "spreads easily" and stops the jump across paving |
| 2 | Should the notch walls on Hopkins 9 and 13 be lightable? | Leave them to catch by spread; or build the collision from the plan outline | Build it from the outline. A player aiming a flamethrower at visible wood expects it to burn |
| 3 | Who takes N1, N2 and the three tests in S9? | Hand to Codex, as with round 1; or leave for now | Hand to Codex. All three are small and in the code the fixes just touched |
| 4 | Round 1's decisions 1 to 5 (tile size, reach, climb speed, landmark fire, whether a lawn fire always takes everything) | See round 1 | Unchanged |
| 5 | Go on to rung 2, the lattice under the ground field? | Yes; or stop at the contact fixes | Yes, after N1 and N2. Every clause of the sentence that scored "No" is still "No" |

## Independent verification

| Finding | Raised by | Re-checked on `26931d9` | Result |
| --- | --- | --- | --- |
| The fixes' headline claims | Codex | Round 1's bench and reviewer probes re-run; hash on `720f7b6` | Hold |
| N1 | Reviewer | `r05` re-run; `porch-jump.mjs` written separately, on the shipped street with a real match, against `720f7b6` | Holds: 1.83 s against 5.80 s |
| N2 | Reviewer | `r04` re-run; `setback-wall.mjs` written separately | Holds. The 39-of-130 count is the reviewer's and was not re-derived |
| S9 | Reviewer | The three mutants and one caught control re-run against all 274 tests | Holds: three pass, the control fails |
| S10 | Bench | Old and new trees alternated in one session, two passes each | Holds as a ratio; the absolute level is unresolved |
| S4 | Bench | Eleven round 1 survivors plus two controls against all 274 tests | Seven caught, four pass |
| The fixes' cost figures, D17 | Reviewer | `r06` re-run on a busier host; `tick-cost.mjs` alternated between `4fc97bb` and `26931d9` | Hold as ratios: idle 4.84 ms to 1.09 ms, burning 8.45 ms to 3.79 ms, and no cost from Fix B |
| S11, D11 to D16, D18, D19 | Reviewer | Result files read; not re-run | The reviewer's measurements |
| M1, M2, M4, S1 to S8, D1 to D10 | Round 1 | Re-run | Unchanged |

`node tools/check.mjs` passes on this branch: 274 tests, exit 0.

## Not checked

- **Appearance.** No pixel was judged in either round.
- **The real scene wiring in a browser** for Fix A's consumers. The reviewer drove five consumers headless; the housing, cottage, shop and rubble art modules were not driven.
- **Phones,** and any second desktop.
- **Wind.** The Ashland pair was run in calm air only. One seed.
- **Why the absolute frame time differs between sessions** (S10).
- **The older "controlled replays" table** in `fire-exposure.md`, which names a different source cell from the current test.
