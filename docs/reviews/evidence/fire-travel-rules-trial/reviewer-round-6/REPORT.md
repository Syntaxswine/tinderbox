# Hostile review, Round 6: fire-travel rules (after round 5's corrections) and their kernel

Saved by the author of the rules from the reviewer's final message; the reviewer could not write a report file. The text is the reviewer's. It reviewed commit `28d3931`; its scene and measure copies (`r15-make-var.mjs` builds them) are of that commit.

Reviewed `28d3931` on `claude/hostile-review`. Everything I wrote is in `docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-6/` (probes `r01`–`r16`, outputs in `results/`). `git status` shows only that folder. I ran `trial.mjs` once and restored `results/trial.txt` and `results/trial.json` with `git checkout --`. No background job is left running. Commands below are run from the evidence folder.

**Score: 7 / 10.** Every saved number reproduces, and both kernel changes are correct. But the headline for target 5 (66 of 101) is measured with every house on bare ground, which the record never says, and the shipped street's houses stand on grass: on a lawn it is 14 of 101 and the roof question put to the owner stops mattering. One scene statement is false in 47 of 53 rooms. Two of Rule 6's new bullets are false as written. The "cause not found" for ten target 3 walls is found: nine are the kitchen oil can, one is a fault in the measure.

**Controls.**
- Targets table identical to `84941d1` (`diff` clean).
- Six surveys and six roof-delay-3 surveys re-run: byte-identical to `results/` and `results/roof-delay-3/` (`cmp`).
- `trial.mjs` re-run: `results/trial.txt` differs only in line 15 (timings). Record checked against it line by line.
- `r06-recompute.mjs results`: 2/24, 12/24, 66/101 (11, 18, 24/32, 13), 23/23, 1/6, 0/21, 10/21, 20/21, 33/101, ledger 5.5e-8; roof delay 3: 34/101, median 38.53 s.
- My scene and measure copies (`r15-make-var.mjs`) with no switch: six surveys byte-identical (`results/var-control`).
- `r09-lawn-survey.mjs <plan> bare`: 101 rows, 0 field differences from the saved survey.
- Eight reach strikes re-run on the current kernel (four "open", four "everywhere", none of them round 5's): all identical on 9 fields (`r08-reach-spot.mjs`).

## MUST-FIX

### M1. Targets 4 to 8 are measured on bare ground, which the record does not say. On a lawn target 5 is 14 of 101, not 66
- **Claims attacked:** results row 5, "66 of 101 in range ... Partly"; line 258, "5 rests on the roof"; lines 430–431, "The rules meet the second on two thirds of the strikes" and "Target 5 is met on two thirds of strikes only because a roof is slow to catch"; line 206, targets are "to be measured on the shipped street".
- **Facts:** `measure.mjs:52-56` builds the survey house with no ground cover. `src/content/neighborhood.js:19-21` puts both rows of houses on grass patches. The record gives one lawn figure (line 263, one wall strike, 22 s against 54 s) and never ties it to the target 5 count.
- **Probe:** `node reviewer-round-6/r09-lawn-survey.mjs <plan> lawn` (six plans), then `node reviewer-round-6/r10-ground-summary.mjs ground-lawn`. Same `burn()`, same 101 strikes, lawn laid round the house.
- **Numbers, lawn against bare:**
  - Target 5: 14 of 101 in range against 66. Under 40 s: 79 against 27. Median 28.1 s against 45.0 s.
  - Outside-wall strikes 0 of 24 (was 11). Inside-wall strikes 0 of 24 (was 18). Ground rooms 1 of 32 (was 24). Upstairs rooms 13 of 21 (unchanged).
  - By plan: Hopkins 15 4/18, Hopkins 12 3/16, Hopkins 9 3/18, Hopkins 13 3/17, Ashland 0/14, Monroe 1/18.
  - Grass first lights 0.43 s after an outside match, 6.6 to 22.6 s after an inside match, 11 to 31 s after a ground-room furniture fire. It then rings the house.
  - By the trial's own rule (`trial.mjs:73`, half or more is PARTLY) target 5 is MISSED on a lawn.
  - With roof delay 3 s on a lawn: 16 of 101 (`ground-lawn-rd3`). So on grass the roof number does not decide target 5, and the question the owner is asked is the wrong one for the street.
  - Target 4 outside improves on a lawn: 7 of 24, median 21.5 s. Targets 6, 7, 8 hold (102 to 193.5 s; 69.5 to 78.3 s; 0 and 20 of 21).
- **Controls:** bare run reproduces the saved survey exactly. Hopkins 15 `wall:x-:0:10` on my lawn gives 21.67 s, the trial's own lawn-pair figure.
- **Not modelled either way:** the game's stone plinth, which Limits lists as left out. If it keeps grass off the clapboard, that has to be built before either figure stands.
- **Confidence:** high on the numbers. High that it is material: it is the headline count and one of three questions handed to the owner.

## SHOULD-FIX

- **S1. "Furniture 1 in the middle of every room" is false in 47 of 53 rooms** (record lines 305 and 440). `scene.mjs:143` takes `cells[floor(length/2)]` from a list in raster order. Rooms are a whole number of metres deep, so that is the first tile of the middle row: against the room's x− wall. `node reviewer-round-6/r14-furniture-place.mjs`: 47 of 53 against the x− wall; median 1.27 m from the middle, most 2.47 m; 5 of 6 kitchens, with the oil can one tile further in. With the furniture in the tile nearest the middle (`MIDDLE=1 node reviewer-round-6/r16-survey-var.mjs <plan> middle`, then `r06-recompute.mjs reviewer-round-6/results/middle`):
  - Target 5: 66 of 101 still, median 44.2 s. The headline holds.
  - Room strikes: 2.1 to 18.7 s, median 10.5 s (record: 3 to 31 s, median 12.5 s). Inside-wall strikes 14 of 24 (record 12).
  - Target 8: low roof first in 13 of 21 (record 10); within 5 s 21 of 21 (record 20); "within and no roof first" 8 of 21 (was 11). "Partly" rests on 11 being at least half of 21; here it is 8, which the trial's rule calls MISSED.
  - Hopkins 15 kitchen 45.6 s against dining 47.4 s (record 49.1 against 48.2).
- **S2. The ten target 3 walls: cause found.** `node reviewer-round-6/r05-all-walls.mjs <plan> out`, `r07-all-walls-summary.mjs`, `r12-t3-cause.mjs`. My all-face counts match round 5: 283 of 335; behind a porch 10 of 46; other 273 of 289.
  - Nine of the ten (Hopkins 9 x−: 2.30, 2.17, 5.54, 1.96, 2.31; Monroe x−: 2.38, 5.73, 5.49, 2.46) are the kitchen's oil can. It sits one tile from the x− wall (S1). It bursts 8.4 to 11.7 s after the match and lights the wall from inside ahead of the outside front; the front then stalls at the kitchen partition. With no oil in the house all nine return to 2.76 to 3.42. With glass that cannot break, two still miss: the can also bursts through an unbroken wall.
  - The tenth (Hopkins 13 `wall:y+:1:7`, 4.73) is a fault in the measure. `measure.mjs:90` accepts any `door` fuel with the same axis and step, and here takes an interior door at (7,7) as "the wall 3 m along". 4.73 in every variant.
  - Two of the six misses round 5 put down to a porch (Hopkins 9 `y-:4:1`, `y-:10:1`, 4.06 and 4.14) are the same kind of artefact: the face 3 m along is on the other side of a bay.
  - Lines 256 and 437 ("cause was not found", "for a reason not found") can be replaced. It is not a kernel fault.
- **S3. "Across a 1 m path it does not" (line 105) is false on all six plans as the trial builds a path, and on two plans however it is built.** `node reviewer-round-6/r04-houses.mjs paths <plan>`.
  - Path round the walls only (the trial's own construction for 0.5 m): the porch deck crosses it. Ground wall faces lit within 60 s: Ashland 32 of 48, Hopkins 9 62 of 63, Hopkins 12 38 of 44, Hopkins 13 41 of 58, Hopkins 15 51 of 72, Monroe 38 of 76.
  - Path round walls and porch: 0 on four plans; Hopkins 9 32 of 63 and Monroe 38 of 76. First thing lit is the overhanging upper floor (frame, layer 2) at 7.9 to 15.3 s, from grass diagonally below it.
  - Controls: 0.5 m path, every face lights, 2.33 to 2.90 s after the grass (record 2.2 to 2.9). Hopkins 12 no-path wait 1.83 to 1.90 s.
  - Also unlisted: all 43 faces behind porch decks light from a lawn fire, through the deck (latest 16.7 to 23.9 s).
- **S4. "Downward nothing lights" (line 107) is false for oil and lacquer.** `node reviewer-round-6/r03-carry.mjs`, part 6. Nine or more tiles burning in the layer above settle the tile below at 0.538 per unit of output (`kernel.mjs:138-139`: 0.04 + 4 × 0.06/2^0.75 + 4 × 0.06/3^0.75, times 4). A 3 × 3 ceiling burning on its underside (upstairs floor, output 1.2): ground tile 0.645; lacquer lit at 0.73 s, poured oil at 1.3 s, an oil can bursts at 1.3 s. A 3 × 3 roof (output 1): 0.538; lacquer lit at 1.3 s. Cloth, grass and furniture do not light. One tile above: 0.075 to 0.09, nothing. In house burns it changes little: with both downward multipliers at 0, target 5 is 70 of 101 and target 8 is unchanged (`results/down0`). The sentence still needs "except oil, poured gas and lacquer under a burning ceiling".
- **S5. Rule 2, "Beside a steady fire a tile settles at 2.71" (line 48) is true only above a fire or beside 1.45 units of output.** `node reviewer-round-6/r02-rule2-times.mjs small`. Beside one burning wall, roof, partition or door tile (output 1) the level neighbour settles at 1.867; beside one floor tile 2.24; diagonal 1.11. The next surface of its own kind then lights after 3.27 s (clapboard), 3.57 s (partition), 5.33 s (roof), 2.37 s (floor), not 1.8, 2.0, 3.3 and 1.5. The quoted times are the minimum, at the ceiling: 1.467, 1.833, 2.033, 3.267 s, which I confirm. In six house burns the ceiling is the usual case (exposure at lighting 2.71 for 79 to 100 % of surfaces), so the owner-facing figures stand: roof median 3.5 s, clapboard 2.2 s, partition 2.2 s, floor 1.5 s; roof at delay 3: 1.4 s (`r02-rule2-times.mjs houses`).
- **S6. The S2 fix has a cost the record does not state.** `kernel.mjs:73` marks listeners stale on every new tile; `markListeners` (`:215-219`) then walks every tile. Eight idle houses, 26,368 tiles: 0 ms a step with no tile laid, 1.6 ms a step with one tile laid per step (`r01-fade-seen.mjs`, part D). That is more than one burning house costs. It matters for a game that loads sections as it goes.
- **S7. A fuel that falls is burnt twice in the step it falls.** `kernel.mjs:297-299` walks copies; `letGo` (`:158-161`) pushes the fuel into the landing tile, which is later in the walk. `node reviewer-round-6/r13-fall-twice.mjs`: the sofa loses 2.00 steps of burning in that step; ledger still closes. Tiny, but it is a second cause of the order sensitivity that Rule 12 puts down to pulses only.
- **S8. Small.**
  - `trial.mjs:99` prints "review round 2 found ... only 3 of 21"; the record says 4 of 21. Mine: 4 within 5 s, 3 if a low roof first is excluded (`results/embers01`). At 1 % embers up to 115 house fuels never light in 300 s.
  - Results heading says "fifth trial, after review round 4"; the output was regenerated after round 5.
  - README still says "corrected after each of four more reviews".
  - Windows break 0.17 to 0.63 s after a match is held under them (all-walls detail). The record gives the threshold, not the time.
  - `radiantGain`, `radiantEvery` and `radiates` produce the reach comparison and are in no table.

## Round 5 items

- **M1: closed.** Rule 2, the fuel table, the target 5 note and the owner question give 3.5, 2.1, 1.5 and 1.4 s; I measure 3.5, 2.2, 1.53 and 1.4 s. Residue is S5.
- **S1: closed.** Awake and asleep agree to three decimals for clapboard, coal, roof, furniture and a surface; coal after 600 s cold relights in 8.9 s; a wall after 120 s in 1.833 s (`r01`, parts A and B).
- **S2: closed.** A tile laid after 1 s, then held hot: the wall lights in 1.833 s (`r01`, part C). Cost is S6.
- **S3: partly.** The added routes hold (below). Two sentences in the list are false (S3, S4 here).
- **S4: partly.** Counts are quoted correctly. The cause is now found (S2 here).
- **S5: closed.** 49 and 231, 258 and 322, every miss under 40 s: all reproduce.
- **S6: closed on the text; not re-measured.**
- **S7: closed.** Lines 135 and 262.
- **S8: closed.** Kitchen 49.07 s, bedrooms 60.83 to 71.53 s from the saved survey.
- **S9: closed,** except the README count.

## DEFENDED

- **Rule 6's list, where it is right** (`r03-carry.mjs`, `r04-houses.mjs pairs`): grass never crosses one or two empty tiles. A wall burning outside lights grass across one empty tile at 0.43 s, never across two; lit inside, 13.47 s. Wall to wall, lit outside: 2.0 s at 0.5 m, 2.67 s at 1 m, never at 1.5 or 2 m. Lit inside: 12.93 and 14.9 s, which is 10.9 and 12.2 s later. Six plan pairs: 33.7 to 65.8 s at 0.5 m, 37.2 to 69.6 s at 1 m, never at 1.5 or 2 m. A deck 2.12 m over a burning roof lights at 1.6 s, not at 3.18 m. An oil can carries a lawn fire across 2.0 m of bare ground (3.47 s), not 2.5 m. Two porches 0.5 m apart never light each other; walls set corner to corner at 1 m do (28 s).
- **Margins and steps, re-measured** (`results/margins`): target 1 fails at rate +5 % (1.667) and −10 % (1.387), loss −10 % (1.667); holds at steps 1/40 (1.600) and 1/24 (1.396); fails at 1/60, 1/45, 1/20, 1/15. Bare wall 3.65, 3.57, 3.62 at rate −10 %, loss +10 %, ceiling +10 %; 3.17 to 3.48 at ±5 %.
- **Requoted figures:** all-face counts for targets 3, 4 and 5; embers at 1 %; bedroom comparison; path waits. All hold on the current kernel.
- **Reach comparison:** record block matches `summary.txt`; eight more strikes identical.
- **Rule text against code:** Rules 1–5, 7, 8, 12 and both tables match `DEFAULT_RULES` and `DEFAULT_FUELS`, apart from S4, S5 and S7.
- **Verdict count:** 4 met, 1 edge, 6 partly, 3 missed adds up on the record's own rows. Target 5's "partly" does not survive a lawn (M1); target 8's hangs on one strike (S1).
- **Downward heat is not what carries fire down:** with it off, 0 of 21 before a fall and 20 of 21 within 5 s, as before.

## Not checked

- Visiting-order scrambling (round 5 S6).
- Cost alone on the machine: 39 to 56 node processes were running throughout.
- `reach-options.mjs` as a whole; the two reach surveys beyond these eight strikes.
- Target 9 bedrooms without stores; target 2 from extra lawn starts.
- House placement origins on the street; whether the game's plinth keeps grass off the walls; today's game cost; a browser; a seventh plan.
