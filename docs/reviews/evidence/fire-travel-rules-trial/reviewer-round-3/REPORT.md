# Hostile review, Round 3: fire-travel rules (third trial) and their kernel

Saved by the author of the rules from the reviewer's final message; the reviewer could not write a report file. The text is the reviewer's. It reviewed commit `d953ce0`. Its probes use the kernel, scene and measuring code of that commit through `burn()`'s `before` hook, not copies, so they will not give these numbers against later commits.

**Score: 6 / 10.** Every saved number reproduces. Targets are unchanged. Round 2's eight must-fix items are closed or honestly left open. But the record misses the cause of its biggest miss (target 5), states one thing about the plans that is false (porches), builds two of six houses with no windows without saying so, and carries a "Met" (target 3) on a stale range that now fails on real walls.

Everything is in `docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-3/` (probes `r01`…`r17`, `lib.mjs`, outputs in `results/`). Commands below are run from the worktree root with the prefix `node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-3/`. No copy of the kernel, scene or measure was needed: scene variants go through `burn()`'s `before` hook. `git status` shows only my folder; `results/trial.txt` and `trial.json` were restored after the re-run.

**Controls.**
- Targets table: identical to `84941d1` (15 rows, `diff` clean).
- Six surveys re-run: byte-identical to `results/survey-*.json` (`cmp`).
- `trial.mjs` re-run alone: every line identical except line 15 (timings). Saved copy and re-run in `results/author-trial-*.txt`.
- `r05-table.mjs`: every survey figure in the results table recomputes (3/24, 12/24, 45/101, 0/24, 19/32, 17/21, 131–227 s, 69.5–77.27 s, 0/21, 10/21, 20/21, 40/101).
- Two identical runs give identical event logs on 4 scenes (`r10-sanity.mjs determinism`).

## MUST-FIX

### M1. Target 5 is missed because Rule 6 runs along the house's own roof and walls. The record does not say so
- Claim attacked: "With air there, fire runs over the roof and the house is half alight sooner", "Either the numbers move or the rules need something they do not have", and Limits: "With no reach at all, one house costs about a third as much, and a neighbour across bare ground can be lit only by touching."
- What happens: the air tiles above a roof are open to the sky, so every burning roof tile reaches every roof tile within 3 m. Reach was written for a gap. It is the main carrier across a continuous surface.
- `r04-reach-on-own-surface.mjs slab` (flat roof 30 m × 5.5 m, lit from above): 0.663 m/s with reach, 0.144 m/s with `{"reach":0.1}`. Lit from below: 5 m in 28.1 s. For scale (`wall.mjs`): 0.164 m/s along a clapboard wall, 0.55 m/s up it. Fire crosses a roof four times faster than it runs along a wall, and faster than it climbs.
- Reach warmth has no ceiling. `kernel.mjs:242,248` sum it; `:301-305` char in proportion to it. Peak 13.6 to 17.3 on four burns against a heat ceiling of 3 (`r10-sanity.mjs bounds`). At 15.6 a roof with an 8 s delay lights in 0.56 s. Rule 1 says heat runs "from 0 to a ceiling"; Rule 6 does not say warmth is exempt.
- All 101 strikes with `{"reach":0.1}` (`survey.mjs <plan> '{"reach":0.1}' '{}' reviewer-round-3/results/survey-noreach`, then `r08-survey-compare.mjs survey survey-noreach survey-roof3`):

| Survey | Target 5 in range | Outside wall | Inside wall | Ground rooms | Upstairs | Median half |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Air above roofs, roof delay 3 s (the state the record does not give) | 30 / 101 | 0 | 6 | 7 | 17 | 36.3 s |
| As built (roof delay 8 s) | 45 / 101 | 0 | 9 | 19 | 17 | 39.6 s |
| As built, no reach | 68 / 101 | 10 | 19 | 26 | 13 | 45.9 s |

- With no reach, targets 4, 6, 7 and 8 do not move (4: 2/24 and 12/24; 6: 101/101; 7: 69.5–77.27 s; 8: 0, 10, 20 of 21). By `trial.mjs:52`'s own rule 68/101 would print PARTLY, not MISSED.
- The half time is two-valued. Hopkins 15 kitchen: 45.77 s with 250 of 408 roofs lit from the air side, or 40.3 s with 360 of 408. `up` × 0.95 flips it; so do eight other one-number changes of 20 % (`r17-jump.mjs`, `r14-live-numbers.mjs`).
- So the weakest rule costs target 5 on 23 strikes, costs two thirds of the step time, and buys target 11 on 3 of 6 plans. The roof delay of 8 s treats a symptom.
- Control: as-built survey equals the saved one byte for byte; `r04 … wall` gives 3.35, as `wall.mjs`.
- Confidence: high.

### M2. "The plans have no eaves or porches" is false, and the eave sentence is false on the current kernel
- Claim attacked: Rule 6, "The plans have no eaves or porches"; "With a 0.5 m eave on both houses the neighbour 2 m away never lights"; Limits, "has not been tried on a plan with eaves or a porch".
- All six plans declare a porch: `src/content/housing-plans.js`, field `porch` (Hopkins 12: 8 m × 2 m across the whole front). The game roofs it (`src/art/hopkins-housing.js:69-70`, `src/simulation/housing-topology.js:160-178`) and has eave sites (`:152`). `scene.mjs` never reads `porch` (no match for the word).
- `r07-cover.mjs porch all`: the declared porch roof added as roof timber at layer 1. Hopkins 12, match outside the front wall: half 29.30 → 49.73 s (out of range → in). Same wall held inside: 38.83 → 41.53 s. Ashland inside: 38.03 → 41.13 s. Hopkins 15: 30.83 → 31.57 s. The others under 1 s.
- `r07-cover.mjs eave`: 0.5 m of roof timber round every roof of both houses, with air above it as Rule 1 now requires, 2 m bare gap, far-wall strike:

| Plan | Neighbour, as built | With eaves | Struck house half, as built → eaves |
| --- | ---: | ---: | ---: |
| Hopkins 15 | 6.2 s after facing | 7.8 s | 28.6 → 54.2 s |
| Hopkins 12 | 85.1 | 35.2 | 28.1 → 38.1 |
| Hopkins 9 | 25.6 | 83.7 | 27.1 → 40.6 |
| Hopkins 13 | 97.6 | 86.7 | 30.7 → 37.2 |
| Ashland | 34.2 | 73.4 | 22.8 → 27.8 |
| Monroe | 25.1 | 97.2 | 32.9 → 59.2 |

- The neighbour lights on 6 of 6, not "never". Within 30 s: 1 of 6, against 3 of 6. Eaves alone put the outside-wall strike in target 5's range on 3 of 6 plans, where the record says "A match held outside a wall never gives a house in range".
- Round 2's "never" was measured before roofs had air above them; its eave had no tile on top.
- Control: the as-built columns equal `pair.mjs` and the survey rows.
- Confidence: high that the sentence about the plans is false; medium on the eave construction (one of several fair ways to build one).

### M3. Two of the six houses have no windows, and no house has a front door
- Claim attacked: "The scene is built from the real catalogue plans: rooms, windows, doors and stairs"; Limits admits only "windows only on the 1 m grid".
- `r01-scene-audit.mjs`: glass faces 28, 28, 22, 18 on the four Hopkins plans; 0 on Ashland and 0 on Monroe. Those plans have no `windows` list; the game infers their windows (`src/content/housing-envelope.js:40`). 32 of the 101 strikes are on windowless houses.
- `scene.mjs` never reads `entry`. Every plan has one. Outside doors are clapboard.
- `r07-cover.mjs windows`: the game's inferred windows put in as glass (22 faces on Ashland, 58 on Monroe). Target 5 in range: Ashland 3 → 1 of 14, Monroe 11 → 8 of 18. Overall 45 → 40 of 101. Target 4 outside: 0 of 8 both ways. Single strikes move up to 11 s (Ashland parlor 39.07 → 27.87 s).
- Caveat: I glazed a detached Monroe on all sides; the game drops side windows on party walls.
- Control: the "as built" column equals the survey rows; ledger closes to 4e-8 with the glass in.
- Confidence: high.

### M4. Target 3 "Met" rests on the bare wall; on the plans' own walls it now goes over 3.5
- Claim attacked: "3 is at the top of its band. Round 2 measured 3.30 to 3.49 on 19 real house walls".
- That range was measured with clapboard delay 5 s. `r15-requoted.mjs climb` on the current numbers, round 2's method: 19 measurable walls, 3.34 to 3.54, median 3.41, 17 in range. Out: Hopkins 12 `wall:x+:15:7` 3.54 and `wall:y+:8:13` 3.51.
- Also out at ±10 % on the bare wall (`r06-fragile.mjs`): `rate` −10 % 3.62, `loss` +10 % 3.56, `maxHeat` +10 % 3.59.
- Control: `r06` base gives 3.35, as `trial.txt`.
- Confidence: high.

## SHOULD-FIX

- **S1. Target 9's wreck comparison is taken at the one moment it cannot show a difference.** At 300 s one coal tile burns in both (26.2). The coal lights at 8.7 s from the kitchen and 69.4 s from the dining room, and is spent at 308.7 s and 369.4 s (`r12-target9.mjs heat`). The wreck goes cold 61 s apart. The gains 0.57 to 6.63 s reproduce (`… gains`); the coal adds nothing to them (oil only: same to 0.04 s). Hopkins 15's 0.57 s sits on the slow branch of M1's two-valued half.
- **S2. The survey's four walls per plan are not typical.** Every ground wall tile of four plans, 244 tiles (`r13-all-walls.mjs <plan>`): match inside, room in range 181 of 244 (74 %; the record's 12 of 24 is 50 %). Match outside: 33 of 244. Half in range, outside: 12 of 244 (Hopkins 12: 7 of 60, up to 48.2 s), so "never" is too strong. Hopkins 15 and Monroe not finished.
- **S3. Target 11 also depends on the neighbour's plan and where it stands.** `r09-neighbour.mjs mixed <plan>`: within 30 s on 13 of 18 mixed pairs; Ashland as the neighbour is late or never in 3 of 3. `… shift`: Hopkins 15 neighbour moved 4 m along: 68.5 s. Hopkins 9 moved 4 m: never. The record's cause holds on the current numbers (`… trace`): the three slow plans light the neighbour only after 212/224, 224/224 and 168/168 roofs are spent.
- **S4. Cost: the worst steps no longer wait for the roofs.** `r16-cost.mjs one|three|eight`, run alone: one house 2.1 / 10.1 / 49 ms; three 7.8 / 16.8 / 144; eight 25.5 / 61.6 / 335. The shape matches the record. The 20 worst steps are all reach steps, at 59–126 s, 47–121 s and 61–130 s; no house tile is open to the sky before 70 s (`r07-cover.mjs sky`). Reach steps average 19.1, 63.1 and 174.7 ms. Eight houses, steps with no reach: 14.9 ms mean, not round 2's 10.6. Sight lines for one house: 5.56 million, against round 2's 1.1 million. The air above roofs did that.
- **S5. Dead and missing numbers.** `pass.masonry` 0.005: no masonry face exists in any scene; ±20 % leaves the event log identical (`r14-live-numbers.mjs`). Embers' "chars above 0.7" and "delay 0": embers are always made lit (`kernel.mjs:162`). Not in any table: store and contents amounts (`scene.mjs:125-130`: oil 3, coal 1, furniture 1, cloth 0.6, lacquer 0.3), the link cut-off 1e-4 (`kernel.mjs:139`), the wake threshold 1e-3 (`:290`). Rule 3's "distance" is counted in tiles, so 1.06 m up counts as 1 (`:138`); Rule 6's is in metres.
- **S6. Requoted figures that are stale.** Wall 1.5 m from an open fire: 3.0 s, not 3.3 (`r15-requoted.mjs sky`). Upstairs first lit from a ground strike: 1.87 to 32.43 s, not "1.9 to 26". Scrambled order: 2 to 21 lighting times moved, worst 0.033 s, no measure moved (`r10-sanity.mjs order`), not 125 and 0.13 s. Corner furniture: bed-a 20.4 → 29.17 s, house 52.2 → 62.13 s (`r11-embers-corner.mjs corner`). "Target 1 holds only at 1/30 and 1/15 s": it also holds at 1/40 and 1/24; and at 1/15 target 2 reaches 2.000 s and fails (`r06-fragile.mjs`).
- **S7. Rule 7 says more than the code does.** Only loose contents and embers fall (`kernel.mjs:192-193`). Walls, partitions and roofs stay over a spent floor: 40 surfaces at 80 s on Hopkins 15, all already burning (`r10-sanity.mjs stand`). The first fall carries nothing in 101 of 101 strikes (59 are a floor's own embers dropping two layers), not only the 40 named. "Roof or wall" is roof only: `measure.mjs:79` leaves wall falls out.
- **S8. Small.** The medians 27.5 and 17.3 are the upper of two middle values; 27.29 and 17.2. "Shared that work … with the same results": round 2 reported 42.67 against 42.63 s. "Not in either trial" appears three times; there are three trials.

## Round 2 items

| | Status | Evidence |
| --- | --- | --- |
| M1 air above roofs | Closed | 0 of 4,967 surfaces lack a far tile; glass 0 missing a side (`r01`). One or two more air layers, ring 2 or 3 wide: identical event logs on 10 of 10 panel strikes (`r03-roof.mjs panel`). Its consequence is mis-explained (my M1) |
| M2 target 11 on six plans | Closed | 6, 85, 26, 98, 34, 25 s reproduce through my own builder (`r09 … control`) |
| M3 reach in the open | Not fixed, stated | 0 house tiles open to the sky through 70 s on all six plans. The look-up now has no limit: a roof 20 layers up switches reach off (`r15 … sky`). The statement carries one false sentence (my M2) |
| M4 target 9 | Closed | Gains and the four Hopkins 15 times reproduce; see S1 |
| M5 target 2 | Closed | Every ground wall tile, six plans, four lawn starts: 1,616 waits, 1.733 to 1.867 s, none at 2 s (`r02-target2.mjs`). Margin is 10 %: clapboard delay +10 % or ceiling −10 % gives 1.967–2.000 s |
| M6 burst number | Closed | No `burstAt` in `kernel.mjs`; `burstPulse` and `burstRadius` are live (`r14`) |
| M7 low roofs | Closed | 10 of 21 recomputes |
| M8 eight houses | Closed | Reported and reproduced in shape; see S4 |

## DEFENDED

- Targets 6 and 7: 101 of 101 with and without reach, and with roof delay 3 s.
- Target 8's embers sentence: at 1 % embers 3 of 21 within 5 s (`r11 … embers <plan>`), as quoted.
- ±10 % fragility as stated: `rate`, `loss`, `maxHeat` each push target 1 or 3 out (`r06`). Paving 0.5 m square holds on all 23 variants; a one-tile diagonal is crossed at `rate` +10 %, `loss` −10 %, grass output +10 %.
- Step line: 27.18 / 27.8 / 29.33 s and 35.07 / 35.97 / 38.2 s. Grass strips: 0.75 and 1.364 m/s. Target 1 at 1/60, 1/45, 1/20 s: 1.622, 1.607, 1.667 m/s.
- Conservation: my own fuel sum before the match equals burnt plus left to 5e-8 on four burns, including two oil bursts each. Heat 0 to 3. No negative amounts. Nothing never lit. No loose fuel hanging. Active set 0 at 420 s, except one late coal on Monroe.
- Reach-under-cover panel and cost figures match `results/reach-under-cover/`.
- The count "6 met, 5 partly, 3 missed" follows from the verdict column as printed.

## Not checked

- The game, the "Today" column, a browser, whether any number is physically realistic.
- Lanterns, other tools, wind, plinth, joined row, landmark maps, the shipped street.
- `r13` on Hopkins 15 and Monroe (stopped after 33 CPU-minutes each).
- Round 2's reach-sharing variant and its mirror test; a true 0.5 m strip at 45°.
- Lawn pairs beyond the saved table.
- Cost timings were taken with other users' Node processes alive on the machine; the author's re-run came out 15 to 55 % slower than the saved line, my own runs within 5 % of it.
