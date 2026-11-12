# Hostile review, Round 4: fire-travel rules (fourth trial, Rule 6 withdrawn) and their kernel

Saved by the author of the rules from the reviewer's final message; the reviewer could not write a report file. The text is the reviewer's. It reviewed commit `06061b0`. `kernel-var.mjs`, `scene-var.mjs` and `measure-var.mjs` here are its copies of that commit's code with switches; its probes will not give these numbers against later commits.

**Score: 6.5 / 10.** Every saved number reproduces and Rule 6 is cleanly gone. Three things are wrong or hidden: the kernel does not do what Rule 2 says for a surface whose own tile is asleep, and that produces two "never" results; target 5's "68 of 101" rests on a roof delay tuned for the withdrawn rule; and the new porch is the cause of both "not looked into" items in targets 2 and 3.

Everything is in `docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-4/` (probes `r01`–`r14`, outputs in `results/`). Commands below are run from the evidence folder (`cd docs/reviews/evidence/fire-travel-rules-trial`). `git status` shows only my folder. `results/trial.txt` and `trial.json` were restored after the re-run.

**Copies.** `kernel-var.mjs`, `scene-var.mjs` and `measure-var.mjs` are copies with switches, all off by default: `wakeFacing` in the kernel; `noPorch`, `keepPartyWindows` and `corner` in the scene. The plan objects are frozen, so a scene copy was needed.

**Controls.**
- Targets table: identical to `84941d1` (`diff` clean, 15 rows).
- Six surveys re-run: byte-identical to `results/survey-*.json` (`cmp`).
- My copies with no switch: all six surveys byte-identical to the author's (`node reviewer-round-4/r07-survey-var.mjs <plan> '{}' results/var-control`, then `cmp`).
- `trial.mjs` re-run alone (3 min 34 s): every line identical except line 15 (timings).
- `r03-recompute.mjs results`: every survey figure in the results table recomputes (2/24, 12/24, 68/101, 12/24, 19/24, 24/32, 13/21, 26/31 on 17 walls, 0/21, 10/21, 20/21, 38/101).
- `r03-recompute.mjs results/reach-options/open` and `.../cover`: the Rule 6 comparison rows recompute (43, median 39.5 s; 21, median 32.57 s; 3/24 and 12/24; 15/24 and 0/24).
- Two identical runs give identical event logs on 12 burns (`r06-sanity.mjs`).

## MUST-FIX

### M1. The kernel does not apply Rule 2 to a surface whose own tile is asleep. Two "never" results come from that
- **Claims attacked:** Rule 6, "Fire passes from a tile to its 26 neighbours and no further"; target 11, "Hopkins 15 lights its twin only at 0.5 m, where one tile of air lies between the walls"; `trial.txt`, "0.5, 1, 2 and 8 m: 65.77 s, never, never, never".
- **What the rules say:** Rule 5 puts a burning surface's heat in the tile on its lit side. Rule 3 has that tile send to its 26 neighbours. Rule 2 says "a surface is exposed to the hotter of the two tiles it stands between".
- **What the code does:** fuels are only looked at for tiles in the active set (`kernel.mjs:289-312`). A tile joins the set only when a burning tile links to it (`:278`). A warm tile with no output wakes nothing. So a wall facing a hot air tile never chars if the tile holding it is two steps from the source. `radiate()` has exactly this wake-up (`:250`), but only for reach, which is off.
- **Probe:** `node reviewer-round-4/r09-gap.mjs` → `results/r09-gap.txt`.
  - Author's kernel, 1 m gap, bare ground, six plan pairs: the air tile against B's wall reaches 2.71 (clapboard chars above 1.1). One such tile stays above 1.1 for 19.8 to 27.9 s continuously; 1.83 s is needed. The tiles holding B's wall are awake for 0 s. B never lights.
  - With `wakeFacing` (a warm tile wakes the tile holding an unlit surface that faces it): B lights at 1 m on 6 of 6 plans, at 54.3 to 69.6 s. At 0.5 m it is unchanged (65.77 s). At 1.5 m and 2 m it is still never.
- **Second consequence:** `node reviewer-round-4/r13-path.mjs`. A house with 0.5 m of bare ground round it and lawn beyond. The strip tiles reach 2.71. Author's kernel: 0 of 404 ground wall faces light in 60 s. With `wakeFacing`: 404 of 404, the first at about 9 s. So in this kernel a half-metre path makes a house immune to a lawn fire, and no rule says so.
- **Controls:** r09(a) reproduces 65.77 s, never, never. The six-survey byte comparison above covers the copies.
- **What does not change:** the 101-strike survey barely moves under `wakeFacing`: 66 of 101 against 68, median 45.57 s against 45.67 s (`r07-survey-var.mjs <plan> '{}' results/wake '{"wakeFacing":0.001}'`). Target 11 at 2 m is still missed.
- **What is needed:** either state the rule the code follows (a surface chars only when the tile holding it is within one tile of a burning tile), or fix it and re-measure the 1 m row and the path case.
- **Confidence:** high.

### M2. Target 5's "68 of 101" depends on roof delay 8 s, a number set for the withdrawn rule. Put back to 3 s it is 39 of 101
- **Claims attacked:** "Withdrawing reach did three things … target 5 is in range on 68 of 101 strikes against 43"; "Roof delay is 8 s … raised to slow the house when reach was running across the roofs, and was not put back". The record admits the number is a leftover. It does not say what it carries.
- **Probe:** `node survey.mjs <plan> '{}' '{"roof":{"delay":3}}' reviewer-round-4/results/roof3` for six plans, then `node reviewer-round-4/r03-recompute.mjs reviewer-round-4/results/roof3`.

| No reach | Target 5 in range | Outside wall | Inside wall | Ground rooms | Upstairs | Median half |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Roof delay 8 s (as proposed) | 68 / 101 | 12 | 19 | 24 | 13 | 45.67 s |
| Roof delay 3 s | 39 / 101 | 1 | 9 | 13 | 16 | 39.3 s |

- By plan at 3 s: Ashland 1 of 14, Hopkins 12 2 of 16, Hopkins 09 7 of 18, Hopkins 13 8 of 17, Hopkins 15 11 of 18, Monroe 10 of 18. 58 strikes are under 40 s.
- 39 of 101 is below half, so `trial.mjs:52` would print MISSED, not PARTLY.
- Against round 3's figure for reach with roof delay 3 s (30 of 101), withdrawing reach buys 9 strikes. The 8 s roof delay buys 29.
- The Rule 6 comparison table is a fair same-numbers comparison. Its "no reach" row is only as good as a roof that takes 8 s to light where frame timber takes 3 s and clapboard 4.5 s.
- **Control:** the same script with no override is byte-identical to the saved survey.
- **Confidence:** high.

### M3. The porch is the cause of both "not looked into" items, and target 2's "24 walls" includes three no lawn touches
- **Claims attacked:** target 2, "1.27 to 1.90 s on 24 walls of six plans. Met"; "One of the 24 walls lights at 1.27 s; why was not looked into"; target 3, "five directions fall below the band, down to 1.53; why was not looked into".
- **Target 2** (`node reviewer-round-4/r02-target2.mjs`, `r04-porch.mjs`):
  - Three of the 24 walls are behind a porch deck: Hopkins 15, 12 and 13, side `y-`. `lawn()` skips the deck tiles (`scene.mjs:29`), so no grass touches those walls.
  - `trial.mjs:38` times them from `wall.outside.fuels[0]`, which there is the deck's frame timber, not grass. The 1.27 s is Hopkins 13's porch wall, timed from its deck tile lighting.
  - Timed from the grass at the porch edge, those walls light after 8.73 s, 8.77 s and 4.80 s (r04 part b).
  - 43 of 404 ground wall faces (11 %) are behind a porch.
  - On the 361 faces grass touches, lit from four sides: 1.800 to 1.967 s, none at 2 s or more. 32 are over 1.9 s, which `trial.mjs:40` would label EDGE. The margin is one step (0.033 s).
- **Target 3** (`r12-climb-cause.mjs`, `r07-survey-var.mjs <plan> '{"noPorch":true}' results/noporch`, `r05-all-walls.mjs` with `r05b-summary.mjs`):
  - The five low ratios are exactly the three porch walls. The burning deck carries fire along the wall foot at 0.20 to 0.25 m/s against 0.16. On Hopkins 13 the porch roof also holds the climb to 0.34 m/s against 0.53.
  - With the porch switched off: 31 of 31 directions in range, 2.77 to 3.45.
  - On all 404 ground faces, match outside: 314 of 363 directions in range (87 %). Behind a porch 10 of 46 (22 %, median 2.14). Elsewhere 304 of 317 (96 %), 8 below, 5 above, up to 5.71.
  - Up-speed is one constant: each layer lights 2.0 s after the one below, 0.53 m/s on every wall measured. Only "along" varies.
- **Verdicts:** target 2 is met only where grass touches the wall. Target 3's "partly" is right; its cause is known.
- **Controls:** r02 part (a) reproduces the trial's 1.267 to 1.900 s. The no-porch copy with the switch off is byte-identical.
- **Confidence:** high.

## SHOULD-FIX

- **S1. Target 10's "little margin" is stale; without reach it cannot fail.** `r14-t10-margin.mjs`: the grass tile past a 0.5 m square strip receives exactly 0 heat. It holds at rate ×1.5, loss ×0.667 and grass output +21 %. Heat never goes more than one tile from a burning tile. The record's "holds by about 9 %" and the Limits line listing target 10 as within 10 % are true only for the one-tile diagonal strip (0.35 m), which is crossed at rate ×1.1 or loss ×0.9 (`r08-fragile.mjs`). The owner should know the other side: any single empty tile stops any ground fire, whatever its size.
- **S2. Target 1 at other steps is misquoted.** By the trial's own criterion (straight fronts plus 32 directions, 1.395 to 1.605 m/s), `node grass.mjs '{"step":…}'` (`results/grass/`) gives: 1/15 s fails (lowest 1.392); 1/24 s passes by 0.001 (1.396); 1/40 s passes (1.472 to 1.600); 1/60, 1/45 and 1/20 s fail (1.622, 1.607, 1.667). The record says it "holds at … 1/15". Round 3 checked the two straight fronts only.
- **S3. Current margins, since the record says they were not re-run** (`r08-fragile.mjs`, `results/grass/`):
  - Target 1: fails at rate +5 % (1.667), rate −10 % (1.387) and loss −10 % (1.667). The heat ceiling does not touch it.
  - Target 2: fails at heat ceiling −5 % (3 of 63 faces at 2 s or more) and −10 % (55 of 63). It sits at exactly 2.000 s at rate −5 %, rate −10 % and loss +10 %.
  - Target 3, bare wall: 3.65 at rate −10 %, 3.57 at loss +10 %, 3.62 at ceiling +10 %. In range at ±5 %.
  - "Pinned against each other" still holds.
- **S4. The Monroe house has no side windows and stands alone.** `scene.mjs:63` drops every window on an x-constant wall of a plan with `partyWalls`. The game drops them only where a neighbour is joined (`src/simulation/housing-topology.js:79-84`). `r01-scene-audit.mjs`: the game gives Monroe 31 window edges; the scene builds 11. 18 side windows are dropped and 2 upstairs are on a diagonal. The other five plans match the game exactly (edges, windows, one entry of two door faces each). The scene comment says "as in the game"; the record and Limits say nothing. With side windows kept (`r07-survey-var.mjs monroe-row '{"keepPartyWindows":true}' results/sidewindows`): 12 of 18 in range either way, median 47.2 s against 51.3 s.
- **S5. The Hopkins 15 front-wall strike is the front door, under the porch** (`r01`: struck fuel `door`, outside tile holds the deck). It gives the plan's fastest half, 33.3 s. The record describes it as a match on the middle of an outside wall.
- **S6. Porch falls are not counted in target 7.** Porch tiles carry no building label, so `measure.mjs:79` skips them. On three front-wall strikes the porch roof falls at 71.43 s, before the counted first fall at 78.0 to 78.3 s (`r04`). Still inside 60 to 150 s.
- **S7. Small errors.**
  - "53 s (Hopkins 15)" is the upper of two middle values; the true median is 51.9 s.
  - "2 is one constant: delay times lighting point over the heat ceiling, 1.83 s": that formula gives 1.71 s. The 1.83 s needs the loss factor that `trial.mjs:40` includes.
  - Embers at 1 %: 4 of 21 within 5 s now, not 3 (`survey.mjs <plan> '{"emberShare":0.01}' '{}' reviewer-round-4/results/embers01`).
  - `README.md:6` says only `housing-plans.js` is read from the game; `housing-envelope.js` is now read too.
  - `embers.lightAt` and every `radiates` value are dead in the default path.
  - Cost worst-step for one house ran 2.8, 3.1, 3.8 and 4.4 ms across four runs; the record quotes 2.8.

## Round 3 items

- **M1 (reach along the roof): closed.** Reach is 0 by default. With every other reach number changed, the event log is identical over 2,360 events (`r11-reach.mjs`). The only number the default path still reads from that group is `sight`, used by the oil burst and listed in the table.
- **M2 (porches): partly.** Every plan's porch is built, is in the ledger and burns out (0 never lit, `r04`, `r06`). Its effect on targets 2 and 3 was not examined (M3 above). Eaves are still absent and that is stated.
- **M3 (windows and front door): partly.** Five plans match `exteriorPlanEdges` exactly. Monroe has 11 of 31 window edges (S4).
- **M4 (target 3 on house walls): partly.** Measured and marked partly, and 26 of 31 reproduces. The cause was left open and is the porch.

## DEFENDED

- **Reproduction.** Surveys byte-identical. Trial identical bar timings. Bare wall 3.32 (0.53 up, 0.16 along). Grass 1.579, 1.515, 1.502 to 1.579 m/s. Paving and pair rows identical.
- **Target 5 against the choice of strikes.** All 404 ground wall faces, 150 s each (`r05-all-walls.mjs <plan> <out|in>`): outside 273 of 404 in range (68 %, median 44.3 s); inside 337 of 404 (83 %, median 45.8 s). The survey's 12 of 24 and 19 of 24 understate it slightly. Every miss is under 40 s; none is over 70 s. By plan, outside: Ashland 48 %, Hopkins 13 45 %, Hopkins 12 58 %, Hopkins 09 65 %, Hopkins 15 84 %, Monroe 91 %. "Depends on the plan" is right.
- **Target 4.** Outside 44 of 404 (11 %, median 27.2 s). Inside 232 of 404 (57 %, median 17.25 s). "Missed, and where the match is held decides it" stands.
- **Porch and target 5.** Without porches, 66 of 101, median 46.17 s.
- **Furniture in a corner** (`'{"corner":true}'`): target 5 on 69 of 101, median 45.4 s. The room-strike median rises from 12.47 s to 17.43 s.
- **Targets 11 and 12 in the author's kernel.** 36 plan pairs at 1 m and 2 m: 0 of 72 lit. Hopkins 15 to Hopkins 12 at 1 to 8 m, shifted 0 and ±3 m: none lit. The 1 m rows are true of the code and wrong against the rules (M1).
- **Reach comparison.** Eight strikes re-run from the two saved reach surveys: all identical. Cost alone: 0.7, 2.2 and 5.8 ms mean; 4.4, 41.7 and 188.8 ms worst. Same shape as the record's 0.8, 2.2 and 6.7.
- **Cost.** Alone: one house 0.8 ms mean, 1.6 ms 95th centile, 3.1 ms worst; three houses 3.5, 7.6, 21.4 ms; eight houses 13.0, 27.4, 56.9 ms. That is 17 to 20 % under the record's means, the same shape. "Missed at street scale" is fair.
- **Conservation and sanity** (`r06-sanity.mjs`, 12 burns of 420 s, plus one on a lawn): ledger worst 2.5e-7; porch fuel in the ledger; no negative amounts; hottest tile 2.9000; nothing never lit in the whole world; active set 0 at the end; nothing left unburnt.
- **Kitchen slow by position** (`r10-kitchen.mjs`): not a bug. The dining room is open to the living room (`openConnections`); the kitchen is shut in by partitions and three shut doors. Fuels lit by 30 s: 511 from the dining room, 329 from the kitchen. "Slow by how it is enclosed" is the more exact wording.
- **Rule text against code.** Rules 1 to 5, 7, 8 and 12 and both number tables match `DEFAULT_RULES` and `DEFAULT_FUELS` line by line, apart from M1. Every table number is live except masonry, which is stated.
- **Verdict count.** 5 met, 6 partly, 3 missed adds up. Target 2's "Met" is the one I dispute.
- **Target 9, 12, 14 and the time-step figures** reproduce in the trial re-run.

## Not checked

- Order sensitivity (scrambled visiting order) on the current kernel.
- The "everywhere" reach survey beyond four strikes.
- Today's game cost (3 to 5 ms): taken as given.
- The street's gap widths beyond reading `neighborhood.js`: 3 to 5 m is consistent with a corner origin and a 180° turn; the three Monroe houses are joined at 0 m, which the trial does not build.
- Frame schedules, lanterns, wind, masonry and anything in a browser.
- A seventh plan.
- Whether `wakeFacing` is the right fix; it is only a demonstration of what Rule 2 as written gives.
