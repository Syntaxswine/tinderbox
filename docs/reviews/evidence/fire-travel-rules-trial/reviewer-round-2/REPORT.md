# Hostile review, Round 2: fire-travel rules (second version) and their trial kernel

Saved by the author of the rules from the reviewer's final message; the reviewer could not write a report file. The text is the reviewer's. It reviewed commit `9b521a2`; `kernel-var.mjs`, `scene-var.mjs` and `measure-var.mjs` here are its copies of that version with switches (`make-var.mjs` writes them).

**Score: 5 / 10.** Every number in the record reproduces. The label branches are gone, the ledger is real, and targets 4, 5, 8 and 15 are honestly marked. But four "Met" verdicts do not survive (2, 9, 11, and 8's "0 of 21"). Target 5 rests on a scene choice the rules contradict. One rule number is dead. The reach-in-the-open rule flips with one tile of roof.

All probes are in `docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/`, outputs in `results/`. Commands run from the worktree root with the prefix `node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/`. Nothing outside that folder was changed; `results/trial.txt` and `trial.json` were restored after re-running `trial.mjs` (`git status` shows only my folder).

**Controls.**
- Six surveys re-run: byte-identical to the saved `results/survey-*.json`.
- `trial.mjs` re-run: every line identical except cost timings.
- `r02-table-check.mjs`: every survey figure in the results table recomputes exactly.
- My copies (`make-var.mjs` writes `kernel-var.mjs`, `scene-var.mjs`, `measure-var.mjs`) with no switch set give identical event logs on 4 strikes (`r01-control.mjs`).
- Targets are unchanged against `84941d1` and `d78005b`.

## MUST-FIX

### M1. Target 5 depends on which air tiles the scene makes; Rule 1 says they exist, the kernel never makes one
- Claim attacked: target 5 "58 of 101 in range", and Rule 1 "Only tiles that hold something, or are next to fire, exist".
- `kernel.mjs:63` `addTile` is called only by `scene.mjs` (lines 23, 29, 49, 115). `scene.mjs:114` makes air on layers 0 to the top storey only. A low roof has air above it. A top roof has none, so it can only burn from inside.
- Probe: `r14-scene-choices.mjs air1` against `base` (one air layer added above the roofs; `air2` is identical to `air1`).

| Strike (the author's panel) | Half, as built | Half, air above roofs |
| --- | ---: | ---: |
| Hopkins 15 wall:x+:19:4 | 52.07 s | 34.43 s |
| Hopkins 15 room:0:dining | 37.30 s | 30.03 s |
| Ashland room:0:kitchen | 36.97 s | 26.97 s |
| Hopkins 12 room:0:kitchen | 35.10 s | 30.40 s |
| Monroe room:0:parlor | 44.80 s | 39.53 s |
| Hopkins 13 wall:y+:8:15 | 44.13 s | 39.53 s |
| Other four | | within 1.1 s |

- In range 40 to 70 s: 5 of 10 as built, 2 of 10 with the air. Roofs lit from the air side: Hopkins 15 72 of 408 becomes 331; Ashland 0 of 168 becomes 120.
- Room alight and first fall do not move.
- Control: `base` reproduces the author's panel exactly.
- Confidence: high.

### M2. Target 11 "Met at 2 m" holds on 2 of 6 plans
- Claim attacked: "lights a house across a 2 m gap", "8.4 s … both times". `trial.mjs:90-91` tests one pair, Hopkins 15.
- Probe: `r05-reach.mjs plans`, `strikes`, `trace`, `margin`. Control: `r05-reach.mjs control` agrees with `pair.mjs` at 1, 2 and 2.5 m.

| Pair, 2 m bare, far-wall strike | Neighbour lit after facing wall |
| --- | ---: |
| Hopkins 15 | 8.4 s |
| Monroe row | 29.0 s |
| Hopkins 12 | 83.9 s |
| Hopkins 13 | 96.2 s |
| Hopkins 9 | 104.0 s |
| Ashland | never (200 s) |

- Hopkins 15, all 18 strikes at 2 m: 14 within 30 s; the others 36.2, 87.0, 99.9 and 128.5 s. Neighbour shifted 4 m along the wall: 90.6 s.
- Why Hopkins 15 passes: fire runs over the top of its low rear roof (120 roof tiles lit from the air side), climbs the outside, and lights the facing wall from outside at layer 3. The identical 8.37 s is that one local process.
- Margin at 2 m: peak warmth on the neighbour 1.307 against 1.1 needed, held 4.5 s. At 2.5 m: 0.868.
- The −1.1 s case at 1 m: the neighbour's low roof is lit by reach from the top of A's low roof, before A's facing wall burns.
- The late lightings (100 to 131 s) exist only through "roof gone, what burns under it reaches out": with open-to-sky frozen they become never (`r05-reach.mjs late`).
- Confidence: high.

### M3. Reach in the open flips with one tile of roof, and is `inside` until the roof goes
- Probes: `r17-sky-edge.mjs`, `r05-reach.mjs eave`, `r14-scene-choices.mjs eave`, `r04-code-vs-rule.mjs sky`.
- Nine burning furniture tiles, a wall 1.5 m away: lights at 3.27 s in the open. With a roof one tile deep over the fire: never. Over the wall's air tile only: never. Over the gap only: 3.27 s. A pane of glass over the fire: never.
- `kernel.mjs:218` looks up 8 layers. A roof 8 layers up: never. 9 layers up: 3.27 s.
- A 0.5 m eave of roof timber on both houses: neighbour never lit at 2 m or 1.5 m (as built: 8.4 s and 0.4 s). The struck house's own half moves from 31.77 to 40.10 s, so reach round the outside was also speeding the first house.
- Eave on the panel: Hopkins 9 bed-a half 48.1 becomes 36.4 s; Hopkins 15 dining 37.3 becomes 41.0 s.
- House tiles open to the sky, Hopkins 15: 0 of 1,376 through 60 s; 12 at 70 s. For every result before about 69 s the test equals "not in a house".
- On a lone house, freezing open-to-sky before the fire gives a byte-identical event log on 8 of 10 strikes and identical room, half, fall and flame on all 10. It only costs: sight lines 2.3 to 6.1 million against 1.1 million.
- Rule 6's bullet "A window with a burning room behind it … can light the wall of the house next door" contradicts the paragraph above it.
- Not in Limits: eaves, porches, the 8-layer look-up.
- Confidence: high.

### M4. Target 9 is marked Met on a confound; the oil speeds the house on every plan
- Claim attacked: "The house reaches half later from the kitchen", "in the direction nobody expected".
- Probe: `r09-kitchen.mjs`. Control: reproduces 9.47 / 42.63 s and 15.10 / 37.30 s.
- Hopkins 15 with no oil: kitchen half 50.27 s, dining 37.27 s. The kitchen is 13.0 s slower by where it is. The oil brings it forward 7.6 s.
- Kitchen strike, furniture only against all contents, six plans: half is 4.0 to 8.7 s earlier with the stores, every time.
- Half by ground room with no stores, Hopkins 15: 38.4 to 50.3 s. The 5.33 s "difference" sits inside that.
- The target also asks for a difference in heat left in the wreck. At 300 s both are identical (one coal burning, summed heat 26.16).
- Confidence: high.

### M5. Target 2 is a miss on the plans not tested, and is one constant
- Claim attacked: "1.967 to 2.000 s, on 12 walls of three plans. On the edge".
- Probe: `r07-target2.mjs all`, `step`, `numbers`. Control: the author's 12 walls give 1.967 to 2.000 s.
- Same method on all six plans: 1.967 to 2.033 s. Every ground-layer wall tile: 218 of 404 at 2.000 s or more, worst 2.067 s.
- The wait is clapboard delay × lighting point ÷ (ceiling × (1 − loss × step)) = 5 × 1.1 ÷ 2.8 = 1.96 s. The lawn fire does not enter into it.
- Ceiling 2.95: fails. Clapboard delay 5.1 s: fails. Step 1/20 s: 0 of 12 (2.05 to 2.10 s). Step 1/15 s: 0 of 12.
- Confidence: high.

### M6. "Oil bursts at 1.4" is a dead number; the can bursts at 0.6
- `kernel.mjs:300` tests `burstAt`. Lines 301-304 burst the can as soon as exposure reaches the oil's lighting point 0.6, because its delay is 0.
- Probe: `r04-code-vs-rule.mjs burst`. `burstAt` at 0.7, 1.4, 2.0, 2.9 and 99 gives the same event log (3,625 events, same hash), bursts at 0.13 s and 38.1 s.
- Rule 8's "burst heat" and the number table are wrong.
- Confidence: high.

### M7. Target 8's "0 of 21" leaves out ground-storey roofs, and the record does not say so
- `measure.mjs:81` drops `cls === 'roof'`. The exclusion is in a code comment only.
- Probe: `r03-target8.mjs <plan>`. In 10 of 21 upstairs strikes a ground-storey roof is burning 1.3 to 27.3 s before anything falls (lit at 17.1 to 44.8 s, from the air tile above).
- Other ground-storey fuel is clean: highest ground heat before a fall 0.78.
- "Within 5 s" is the embers. At 1 % embers it holds in 3 of 21; the rest wait 5.5 to 95.5 s, or do not light in 130 s (6 cases). With the landing pulse off the lags hardly move.
- Confidence: high on the numbers; whether a low roof is "the ground floor" is the owner's call, but it must be stated.

### M8. Cost: "the mean is in today's range" fails at street scale
- Probe: `r12-cost.mjs one|three|eightFirst`, run alone. Control: `cost.mjs` gives 1.2 / 6.3 / 21.1 ms; mine 1.25 / 6.3 / 24.

| Scene | Mean | 95th | Worst | Steps over 16.7 ms |
| --- | ---: | ---: | ---: | ---: |
| 1 house | 1.25 ms | 6.3 ms | 24 ms | 44 of 4,500 |
| 3 houses | 4.45 ms | 12 ms | 103 ms | 210 |
| 8 houses on a lawn, first struck | 15.2 ms | 38 ms | 216 ms | 1,860 |

- Eight houses: steps that do no reach still average 10.6 ms. Today is 6 to 10 ms per 1/30 s. Round 1 measured eight houses; the record dropped that case.
- Defended: the 20 worst steps are all reach steps, in all three scenes.
- Sharing reach over the steps (`'{"xSpread":true}'`): one house worst 4.9 ms, three houses 30 ms, eight houses 72 ms; results unchanged (half 42.67 against 42.63 s). The mean rises 16 to 21 %.
- The worst steps come at 112 to 130 s, after the roofs have gone.
- Confidence: high on shape; medium on milliseconds.

## SHOULD-FIX

- **S1. Three core numbers are pinned between targets 1, 2 and 3 inside ±10 %.** `r11-sensitivity.mjs summary` (75 variants).
  - `rate` +10 %: grass 1.667 m/s, out. −10 %: climb ratio 3.60, out.
  - `loss` −10 %: grass out. +10 %: ratio 3.53, out.
  - `maxHeat` −10 %: wall wait 2.17 s. +10 %: ratio 3.58.
  - Also out at 10 %: grass delay −10 %, grass output +10 %, falloff −10 %.
  - Targets 4 to 8 are sturdy: half moves under 5 %.
  - Target 11 flips at reach or gain −20 %; target 12 at reach +20 %.
- **S2. Target 1 holds at 1/30 and 1/15 s only.** `r06-grass.mjs step`: along the grid 1.622 m/s at 1/60 s, 1.607 at 1/45, 1.667 at 1/20, all out. A tile is crossed in 9 and 10 steps alternately, not "a whole number".
- **S3. Grass slows on narrow lawns.** `r06-grass.mjs strip`: 0.75 m/s on a 0.5 m strip, 1.25 on 1 m, 1.36 on 1.5 m.
- **S4. Target 3 is met with no upward rule.** `wall.mjs '{"up":1,"upDiagonal":1}'` gives 2.56 to 1. The record also under-claims: a match held outside a real house wall gives 3.30 to 3.49 on 19 of 19 measurable strikes (`r08-climb.mjs house`), at the top of the band.
- **S5. Order still matters slightly.** `r04-code-vs-rule.mjs order`: a scrambled visiting order moves 125 of 1,545 light times, worst 0.133 s; room, half and fall do not move. The landing pulse and the burst pulse are applied mid-loop (`kernel.mjs:164`, `:178`). Rule 12's "does not change what a fuel is exposed to" is too strong.
- **S6. "Listens … changes no result" is not exact.** On the two-house scene the event log differs with the filter off (2,103 events, different hash); every measure is equal.
- **S7. Where the furniture stands moves results.** `r14-scene-choices.mjs corner`: Hopkins 15 bed-a room 17.8 becomes 25.9 s, half 48.8 becomes 59.3 s. A mirror image moves room-strike halves up to 18 % (`r16-mirror.mjs`). Hopkins 12 does not rasterise symmetrically (2 frame, 4 clapboard, 2 partition objects differ).
- **S8. Target 7's "first fall" is roof embers dropping one half-storey inside the same room in 62 of 101 strikes.**
- **S9. Numbers not in the tables:** burst pulse 2 (`:178`), char fade 0.5 /s (`:308`), the 8-layer sky look-up (`:218`), sight-line threshold 0.5 (`:201`). An ember deposit burns 1.2 s, not the table's 8 s.
- **S10. Paving holds by 9 %.** `r10-paving.mjs numbers`: grass output, rate or loss moved 10 % and a 0.5 m strip at 45° is crossed at 10.3 s.

## Round 1 items

| | Status | Evidence |
| --- | --- | --- |
| M1 grass | Closed at 1/30 s | 64 directions, 6 to 48 m: 1.50 to 1.58 m/s; 80 m straight run steady at 1.579 |
| M2 Rule 3 | Closed | One loss, `kernel.mjs:283` |
| M3 house objects | Closed in letter, partly in effect | No branch on `room` or `building`; open-to-sky equals "not in a house" until about 69 s |
| M4 match and plan | Closed | 404 wall tiles: room in range 53 (13 %), half 173 (43 %); the author's 24 give 17 % and 38 % |
| M5 conservation | Closed | My own sum before the match equals burnt plus left to 4e-8 on 5 burns; embers exactly 15.00 % of surfaces |
| M6 neighbour | Partly | Far-wall strike and sweep done; one plan pair only (my M2) |
| M7 cost | Partly | Honest form; eight houses dropped (my M8) |

## DEFENDED

- Every record figure checked: survey table, panel under cover, Rule 4's 4.16 / 3.79 / 3.31, S2's 1.9 to 26 s.
- "Room alight" leaves out up to 32 % of a room's bounding surfaces; counting them changes no verdict (4 of 24, 14 of 24).
- "Half" as ever-lit does not flatter: half burning at once comes 4.7 s later on average and is always reached.
- Heat never above 3. No negative amounts. No fuel never lit. No loose fuel hanging. Active set 0 at 400 s.
- Ring width 2 or 3: no change. Door on the first or last shared face: under 1.1 s.
- Step 1/60 to 1/15 s on ten strikes: room +8 to 13 %, half +4 to 11 %, all one way.
- Paving 0.5 m: holds at 16 angles, three placements each, as tuned.
- Radiant gain ±10 % and cadence: target 11 holds on Hopkins 15.

## Not checked
- The game, the "Today" column, a browser.
- Lanterns, other tools, wind, plinth, joined row, landmark maps.
- Tile creation order (by reading, it enters only `markListeners` and `remaining`).
- Lawn pairs beyond the saved table.
- Whether any number is physically realistic.
- Transposed plans; a true sub-tile plan shift.
