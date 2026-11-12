# Hostile review, Round 7: fire-travel rules (after round 6's corrections) and their kernel

Saved by the author of the rules from the reviewer's final message; the reviewer could not write a report file. The text is the reviewer's. It reviewed commit `378c542`. This was the last round: the owner said to stop the loop after it.

Reviewed `378c542` on `claude/hostile-review`. Everything I wrote is in `docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-7/` (probes `r01`–`r13`, `run-variants.sh`, outputs in `results/`). I edited no existing file. I did not run `trial.mjs`. No background job is left running. Commands below are run from the evidence folder.

**The tree moved under me.** At 23:54 and 00:10 the author changed `kernel.mjs`, `measure.mjs`, `scene.mjs` and `survey.mjs` in this worktree and then committed `335339f4` ("Another layer"), with a new document `docs/reviews/2026-11-11-another-layer.md` and `results/layer/`. The record itself is byte-identical at `378c542` and `335339f4` (`git diff` empty). All probes except three ran on the `378c542` code. The three that ran after (`roof-delay-3`, `strip1w`, `strip2w`) are covered by controls: on the changed code, six roof-delay-3 surveys, lawn Ashland, lawn Hopkins 12 and bare Ashland are byte-identical to the saved files. The new switches (`shield`, `rises`, `hot`) are inert by default. I did not review the new document.

**Score: 7 / 10.** Every saved number reproduces. The lawn headline (14 of 101) is right and is robust to the lawn's extent, to the windows and to the roof number. The three code changes are correct. But the question now put first to the owner offers three remedies, and under these rules one cannot work, one does not exist, and the third works only in a form the record does not give; all three give up target 2, which the record does not say. And round 6's fault is repeated one row up: target 3 on the houses and target 9 are bare-ground figures, not labelled, and the author's own lawn files hold 0 of 29 for target 3.

**Controls.**
- Targets table identical to `84941d1` (`diff` clean).
- Six bare, six lawn, six roof-delay-3 surveys re-run: byte-identical (`cmp`) to `results/`, `results/lawn/`, `results/roof-delay-3/`.
- `node reviewer-round-7/r01-recount.mjs results results/lawn results/roof-delay-3 results/reach-options/open results/reach-options/cover`: every survey figure in the table, the notes and `trial.txt` lines 4–8 recounts exactly (2/24, 7/24, 12/24; 66 = 11+18+24+13; lawn 14 = 0+0+1+13, 79 under 40 s, median 28.13; roof 3: 34; 0, 10, 20 and 11 of 21; 33 of 101; reach 41 and 20; 3 and 15 of 24).
- My lawn builder with no switch (`r02-variant.mjs <plan> lawn6`): 909 fields against `results/lawn/`, 0 differ.
- `wall.mjs` 3.32; `pair.mjs` 1 m bare 69.63 s, 2 m never, 8 m lawn 18 s; `grass.mjs quick` 1.579 and 1.515; target 9 bare (`r04`) 4.0 to 9.4 s, 49.07/48.23, 56.23/47.4, 308.5/370.5. All as `trial.txt`.

## MUST-FIX

### M1. The owner question "Grass against the walls" offers three remedies. Under these rules the plinth fails, cool grass does not exist, and the strip works only at 1 m. Each one that works abandons target 2. The record says "this trial cannot say". It can.
- **Claims attacked:** record line 449 ("something has to keep a lawn fire off the clapboard: the stone plinth the game already draws, a strip of bare ground wider than 0.5 m, or grass that burns too coolly to light a wall"); line 230 ("the game's stone plinth, which might keep grass off the clapboard"); line 457 ("Whether grass reaches the clapboard on the real street decides target 5, and this trial cannot say").
- **Plinth.** The game's plinths are 0.48 m on four plans (`src/content/housing-plans.js:34,505,1441,1950`), under half a tile. I gave the plinth the whole ground layer (1.06 m) of every outside wall, masonry. `node reviewer-round-7/r08-plinth.mjs` (match in the grass beside each survey wall, lawn, furnished):
  - With plinth: the house catches in 21 of 21, first at 1.7 to 2.5 s (the clapboard one layer up, or an overhanging floor). Half alight 19.2 to 26.3 s, median 21.4 s. In range: 0 of 21.
  - Control, no plinth: 16.0 to 23.3 s, median 18.3 s; 0 of 21.
  - Cause: `kernel.mjs:36,143`. The tile above burning grass gets heat times 3 and sits at the ceiling. The wall above the stone faces that tile. Record line 107 already says a surface lights two tiles above a fire, so line 230 contradicts the record's own list.
  - A fire lit inside is protected: 53 room strikes with that plinth, 40 in range on a lawn and 40 on bare ground (`r02-variant.mjs <plan> plinth`, `plinthbare`); no plinth, 14 and 37.
- **Cool grass.** `node reviewer-round-7/r12-cool-grass.mjs` and `grass.mjs '{}' '{"grass":{"out":X}}' quick`. Output 0.6: front 1.26 m/s, every wall lit, wait 1.80 to 1.97 s. Output 0.5: 1.03 m/s (straight front 1.20, target 1 missed), every wall lit, wait 1.87 to 2.00 s. Output 0.45 and below: the fire does not leave the lit tile (1 of 1,920 tiles burnt). No grass output both spreads and spares a wall.
- **Strip.** Full 101-strike survey per variant (`run-variants.sh`, `r01-recount.mjs`), target 5 in range:
  - lawn to the walls 14; strip 0.5 m round walls 14; 0.5 m round walls and porch 16; 1 m round walls 65; 1 m round walls and porch 66 (every recount line equal to bare ground).
  - A lawn fire lit 8 m away (`r05-strip-approach.mjs`): 1 m round walls only, 6 of 6 houses still catch (porch deck); 1 m round walls and porch, 2 of 6 (Hopkins 9, Monroe, overhang); 1.5 m round walls and porch, 0 of 6.
  - So "wider than 0.5 m" must read "1 m, round the porch too, and 1.5 m where a floor overhangs". With it the roof number matters again (66 against 34).
- **Target 2.** It asks that a lawn fire light a wall in under 2 s. At 0.5 m the wait is 2.2 to 2.9 s (record line 105); at 1 m never. With grass at 1.5 m/s (target 1) and a wall lit in under 2 s (target 2), the last ground wall is lit 12 to 21 s after the grass first lights and half the house 15 to 23 s after it (`r09-lawn-detail.mjs lawn6`). Targets 1, 2 and 5 cannot all hold on a lawn under these rules. The owner is not told that this is the choice.
- **Not an artefact:** lawn 3 m, 6 m and 12 m wide give the same 14 of 101 and the same medians (`lawn3`, `lawn12`). Windows that cannot break: 16 (`noglass`). Roof delay 3 on a lawn: 16 (`roof3lawn`; the record's quoted figure holds).
- **Corroboration:** the author's own `2026-11-11-another-layer.md`, committed during this review, reports "Plinth: 14 of 101" and "the grass flame heats the air above it and lights the wall over the stone". The record was not changed and now contradicts a document beside it.
- **Confidence:** high on the numbers. Plinth tested at full layer height only; a 0.48 m plinth can do no better.

### M2. Target 3 on the houses and target 9 are bare-ground figures, not labelled. On a lawn target 3 is 0 of 29 directions, in the author's own files.
- **Claims attacked:** row 3 ("walls with nothing against them, 23 of 23 directions in range"); row 9 ("bring half the house forward by 4.0 to 9.4 s"; coal "150 to 217 s"); line 230 ("where the two differ the lawn figure is the one that counts").
- **Target 3.** `r01-recount.mjs results/lawn`: 0 of 29 in range, 0.76 to 2.14, median 0.77. All faces (`r03-allfaces.mjs <plan> lawn`, `r13-allfaces-summary.mjs lawn`): 0 of 334 directions, median 0.77. Bare control: 283 of 334, 10 of 46 behind a porch. On a lawn the wall 3 m along is lit by the grass in about 3.9 s; fire runs round the foot of a house faster than up it. `trial.mjs:76-81` counts target 3 from the bare files only.
- **Target 9.** `node reviewer-round-7/r04-target9-lawn.mjs`. On a lawn the stores bring the kitchen fire forward by 1.4 to 4.9 s. Hopkins 15 kitchen 30.6 s against dining 34.1 s (bare 49.1 against 48.2). Coal alone for 156 and 189 s. Bedrooms unchanged (60.8 to 71.5 s).
- **Also wrong in the saved lawn files:** `measure.mjs:49` sets `behindPorch` when the outside tile holds any fuel. On a lawn that is grass: 48 of 48 wall rows in `results/lawn/` say `behindPorch: true` (6 on bare ground).
- **Confidence:** high.

## SHOULD-FIX

- **S1. "Every outside wall is lit within a few seconds of each other" (line 258) is false.** The last ground outside wall lights 12.4 to 21.4 s after the grass, median 16.0 s; nine tenths of them in 11.4 to 18.1 s (`r09-lawn-detail.mjs lawn6`).
- **S2. Three figures in the same sentence.** Grass lights 0.43 s after an outside match on 21 of 24; the three behind a porch take 3.2, 6.7 and 7.4 s. After a ground-room fire it is 11.2 to 44.4 s, not "11 to 31" (Hopkins 12 hall, 44.4 s; that house is half alight at 33.6 s before any grass burns). "Only fires that start upstairs stay in range" is 13 of the 14; the other is Hopkins 15's ground-floor hall (42.9 s).
- **S3. `results/trial.txt` and `trial.json` still say `5 PARTLY`** (`trial.mjs:86`, bare rows only). The trial's own tally is 4 met, 1 edge, 6 partly, 3 missed; the record's 5 and 4 is a hand edit.
- **S4. Rows 6 and 14 give bare figures only.** On a lawn flame lasts 102 to 193.5 s (still 101 of 101) and the ledger closes to 3e-7, not 5e-8.
- **S5. Row 15, one house "1.5 to 1.6 ms at the 95th centile".** The saved `trial.txt` says 1.9 ms and `reach-options/summary.txt` 1.8 ms.
- **S6. Stale after the measure fix.** Line 256 quotes "283 of 335 … other walls 273 of 289". On the fixed measure it is 283 of 334 and 273 of 288.
- **S7. Limits still speaks of bare ground only:** "The whole-house timing rests on one number, roof delay" (line 464) against "on a lawn the roof number does not matter" (line 258).
- **S8. Rule 10 against the survey.** Rule 10 says a match lights the lightest fuel in its tile. Outside a wall on a lawn that is the grass. The survey lights the wall. The owner question "where the bear holds the match" has no lawn case; on a lawn outside and inside both give 0 of 24.
- **S9. On `335339f4` the kernel holds three switches (`shield`, `rises`, `hot`) and a changed heat line that no rule, table or README entry in this record states.** Inert by default (controls above).

## Round 6 items

- **M1: closed for targets 4 to 8.** Lawn surveys reproduce byte for byte; row 5 says missed on a lawn. Residue is M1 and M2 here.
- **S1: closed as text** (lines 266, 306, 460). Scene unchanged, as stated. Not re-measured.
- **S2: closed.** `measure.mjs:92`; survey still 24 of 29, 23 of 23, 1 of 6. One stale count (S6).
- **S3: closed.** `r05`: 1 m round walls, 6 of 6 catch; round walls and porch, 4 untouched, Hopkins 9 and Monroe catch.
- **S4: closed as text** (line 107). Not re-measured.
- **S5: closed** (line 48; 1.867 follows from the numbers).
- **S6: closed.** `node reviewer-round-7/r06-late-tile.mjs`: six build orders give the same `listens` and `facing` as a full rebuild, no duplicates; wall, roof, floor and door light at 1.833, 3.267, 1.467 and 1.833 s; a tile laid against a spent surface agrees. Cost not timed.
- **S7: not fixed, stated** (line 181).
- **S8: closed.**

## DEFENDED

- **The lawn headline.** 14 of 101, median 28.13 s, same at 3 m, 6 m and 12 m of lawn; 16 with unbreakable windows; 16 with roof delay 3; 14 to 16 with a 0.5 m strip. Not caused by grass in the match's tile: across a 0.5 m strip the grass still lights at a median of 0.43 s.
- **Target 4 "Missed" on both grounds:** 2 and 7 of 24; all faces 49 and 107 of 404 outside, 231 of 404 inside on both.
- **Targets 6, 7, 8 on a lawn** as the trial prints them. "A minute or more" holds in all 101 on both grounds (least 102 s).
- **Upstairs fires on a lawn.** Grass lights at 31 to 90 s, median 78 s. I traced the earliest without a nearby fall (`r11-trace-grass.mjs hopkins-4-09 room:1:hall 11 21`): the ground-floor wall had burnt through from inside after embers fell down the stair. No heat went down.
- **Requoted figures on the current code:** all faces, bare: target 4 49 and 231 of 404; target 5 258 and 322, every miss under 40 s. Bedrooms 60.83 to 71.53 s.
- **Reach surveys:** eight more strikes, none used before, identical on 8 fields (`r07-reach-spot.mjs`).
- **`same()` fix and ground option:** correct; no survey figure moves.
- **Rule text against code:** Rules 1–5, 7, 8, 12 and both tables match `DEFAULT_RULES` and `DEFAULT_FUELS` at `378c542`. Verdict tally adds up on the record's rows.

## Not checked

- Cost. 35 to 97 node processes were running throughout, some the author's.
- `trial.mjs` as a whole (targets 1 in 32 directions, 2, 10, the step lines, 15); `reach-options.mjs` as a whole.
- Margins and time-step sweeps; visiting-order scrambling; embers at 1 %; furniture in the middle; round 6's S4 and S5 measurements.
- A plinth at 0.48 m; the street's real layout and where its grass meets the walls; a seventh plan; a browser.
- `2026-11-11-another-layer.md` and `results/layer/`.
