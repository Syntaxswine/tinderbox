# Hostile review, Round 5: fire-travel rules (fifth trial, kernel fix) and their kernel

Saved by the author of the rules from the reviewer's final message; the reviewer could not write a report file. The text is the reviewer's. It reviewed commit `b6cc2a5`. `kernel-var.mjs` and `measure-var.mjs` here are its copies of that commit's code with switches (`r00-make-var.mjs` builds them); `kernel-06061b0.mjs` is round 4's kernel.

Reviewed `b6cc2a5` on `claude/hostile-review`. Everything I wrote is in `docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-5/` (probes `r00`–`r13`, outputs in `results/`). `git status` shows only that folder. I did not run `trial.mjs` or `reach-options.mjs`, so nothing needed restoring. Commands below are run from the evidence folder.

**Score: 7.5 / 10.** Every saved number reproduces and the kernel fix is correct for every surface kind. One owner-facing sentence states a number 2.3 times too large. The rest is incompleteness: Rule 6's new bullets leave out three routes, "the porch is why" does not cover 10 misses, and two requoted figures have moved.

**Copies (`r00-make-var.mjs` builds them by exact text replacement).** `kernel-var.mjs` adds `shuffle`, `noWake`, `fadeAsleep`, all off by default. `measure-var.mjs` picks the kernel from `KERNEL`. `kernel-06061b0.mjs` is round 4's kernel from `git show`.

**Controls.**
- Targets table identical to `84941d1` (`diff` clean).
- Six surveys and six roof-delay-3 surveys re-run: byte-identical to `results/` and `results/roof-delay-3/` (`cmp`).
- `kernel-var.mjs` with no switch: six surveys byte-identical (`KERNEL=./kernel-var.mjs node reviewer-round-5/r12-survey-var.mjs <plan> '{}' '{}' reviewer-round-5/results/var-control`).
- `r01-recompute.mjs results`: every survey figure in the table recomputes (2/24, 12/24, 66/101, 11/18/24/13, 23/23, 1/6, 0/21, 10/21, 20/21, 33/101, ledger 5.5e-8; roof delay 3: 34/101, median 38.53 s, 63 under 40 s).
- Not re-run as a whole: `trial.mjs`. Its lines 1, 2, 3, 9 (kitchen, dining, six gains), 10, 11 and the path line reproduce through `grass.mjs`, `wall.mjs`, `quick.mjs` and my probes.

## MUST-FIX

### M1. "A roof takes 8 s to catch" is false. In the kernel a roof catches in about 3.5 s
- **Claims attacked:** record line 411, "Target 5 is met on two thirds of strikes only because a roof takes 8 s to catch. If that is not believable, the target is missed"; line 48, "lights after its delay: … 3 s for frame timber, 4.5 s for clapboard, 8 s for a roof, 15 s for coal".
- **Code:** `kernel.mjs:312` chars at `exposure / lightAt` per second. The delay is the time only at exactly the lighting heat. At the settled ceiling (2.707) every delay is divided by 2.46.
- **Probes:** `node reviewer-round-5/r02-wake.mjs` (part A) and `node reviewer-round-5/r09-roof-and-t9.mjs`.
  - A roof under a tile held at the ceiling lights after 3.267 s. Clapboard 1.833 s, partition 2.033 s, floor 1.467 s.
  - In four house burns, time from first exposure at or above the lighting point to lighting: roof median 3.5 s (10th to 90th centile 3.3 to 3.93 s, 1,296 surfaces); clapboard 2.13 s; partition 2.2 s; frame 1.5 s.
  - With roof delay 3 s the roof median is 1.37 s.
- **So the question for the owner is:** is a roof that catches in 3.5 s, against 2.1 s for a wall and 1.5 s for a floor, believable; and the 34-of-101 case is a roof that catches in 1.4 s. The record asks about 8 s.
- **Control:** clapboard's 1.833 s is the record's own target 2 constant.
- **Confidence:** high on the numbers. It is a wording error, but it is the one number the owner is asked to judge.

## SHOULD-FIX

- **S1. Char does not fade while a tile sleeps. Rule 2 says it fades.** `kernel.mjs:318` runs only for awake tiles; a tile sleeps at `:325`. `r02-wake.mjs` part D: a wall heated 1 s keeps char 1.441 after 120 s cold and relights in 1.267 s, not 1.833 s. Coal heated 8 s keeps 12.04 of 15 after 600 s cold and lights in 1.77 s, not 8.9 s. No table figure depends on it: with the fade applied for time asleep (`fadeAsleep`), six surveys are byte-identical (`results/fade`; switch proved by `r13-fade-check.mjs`: 1.267 s off, 1.833 s on). It will matter for a torch held near a wall and brought back.
- **S2. The facing lists are rebuilt only when a surface is added** (`kernel.mjs:117`, `:214-218`; `addTile` at `:65-75` does not set the flag). `r02-wake.mjs` part C: an air tile laid after the first step, then held hot 12 s: the wall never chars. No trial scene lays tiles late. A game that loads sections as needed will.
- **S3. Rule 6's bullets leave out three routes and one mechanism** (`node reviewer-round-5/r03-carry.mjs`, `r04-houses.mjs pairs|paths|street`).
  - A burning wall lights grass across one empty tile: 0.43 s lit outside, 13.47 s lit inside; never across two. Two houses 3 m apart, each with a 0.5 m bare path, lawn between, A struck in its kitchen: the neighbour lights at 21.2 to 24.5 s on three plans (19 to 22 s with grass to the walls). With 1 m paths: never.
  - "Burning on its outside" (line 106) is not what lights the twin. A wall lit inside also carries 1 m, 11 to 13 s later, through the far-side share. Hopkins 09 at 0.5 m and 1 m: 0 of 30 of A's lit facing faces were burning outside before B lit. Ashland and Monroe at 0.5 m light 0.2 s and 1.7 s after, through open windows.
  - "1 m" is plan distance. Upward it is two tiles, 2.12 m: a deck over a burning roof lights at 2.12 m (1.6 s) and not at 3.18 m. A wall whose foot is 2.12 m above the burning wall never lights at any gap. Downward nothing lights.
  - Limits line 422, "No fire crosses more than 1 m of bare ground", is false with a store: an oil can in the first bare tile carries a lawn fire across 2.0 m of bare ground (lit at 3.03 s), not 2.5 m.
  - The claims that are stated hold: grass never crosses one empty tile; wall to wall lights at 0.5 and 1 m (2.0 and 2.67 s) and never at 1.5 or 2 m; six plan pairs light at 0.5 m (33.7 to 65.8 s) and 1 m (37.2 to 69.6 s) and never at 1.5 or 2 m.
- **S4. Target 3: "the porch is why" and "23 of 23" overstate.** `r06-all-walls.mjs` (all 404 ground faces, match outside) then `r11-t3-misses.mjs`: 283 of 335 directions in range. Behind a porch 10 of 46. Other walls 273 of 289, with 10 below (to 1.96) and 6 above (to 5.73). Six of those 16 are within 3.5 m of a porch deck. Ten are not: Hopkins 09 `x-` wall (1.96 to 2.31, and 5.54), Hopkins 13 `y+` (4.73), Monroe `x-` (2.38, 2.46, 5.49, 5.73). Cause not found. Round 4 reported 13 such misses; the record dropped them.
- **S5. Requoted all-face counts have moved** (lines 255–256, dated to the fourth trial). Current kernel and scene: target 5 outside 258 of 404, inside 322 (quoted 273 and 337); every miss is still under 40 s. Target 4 outside 49, inside 231 (quoted 44 and 232). Monroe accounts for most of it (63 and 72 of 80, was 73 and 80): its side windows came back.
- **S6. Visiting order matters more than the requoted figure** (line 179: "2 to 21 lighting times, the worst by 0.03 s, and no measure"). `KERNEL=./kernel-var.mjs node reviewer-round-5/r07-sanity.mjs order`: 24 scrambled burns moved 6 to 508 lighting times each, worst 0.133 s; in 4 burns a measure moved by 0.03 to 0.04 s (ground-floor lighting, half). Two unscrambled runs are identical.
- **S7. The shipped street has a road.** `src/content/neighborhood.js:19-21`: grass to y 16, road y 19 to 24, grass from y 25. Line 133, "on that street the lawn carries fire to every neighbour", holds within each row only. Under these rules nothing crosses the road. Also: line 25 lists "fire that cannot cross 0.5 m of bare ground" as a fact the rules must fix, and target 10 requires the same empty tile not to be crossed. The record never scores that item.
- **S8. Target 9 is restated.** The target (line 216) is kitchen against bedroom; the results row (line 240) says dining room. As written (`r09`): Hopkins 15 kitchen 49.07 s, bedrooms 60.83 to 71.53 s; stores change a bedroom fire by under 0.2 s (60.67 to 71.37 s without). On six plans the gap is the floor the room is on, not its contents. "Partly" stands.
- **S9. Small.**
  - Across a 0.5 m path the wall lights 2.2 to 2.9 s after the grass across it, on all 361 path faces of six plans (not "under 2 s").
  - "22 faces are over 1.9 s": 20 of them sit at exactly 1.900 s (rounding in `trial.mjs:49`); 2 are over. With four more lawn starts at the corners the longest is 1.967 s, one step short.
  - "150 to 215 s": 149.5 and 216.5 s.
  - Line 186 points to a heading "The second trial" that does not exist.
  - Rule 12, "Only burning and warm tiles are visited": now also tiles holding a surface against a warm tile.
  - README says "second version"; `trial.mjs` header says ten minutes, README five.

## Round 4 items

- **M1 (surface asleep never chars): closed.** Clapboard, partition, door, floor from below and roof from above all light at delay × lighting point / 2.707; none lights on `06061b0` (`r02-wake.mjs`, both kernels). Residue is S1 and S2.
- **M2 (roof delay): partly.** 66 and 34 reproduce and both are in the table. The sentence that hands it to the owner is wrong (M1).
- **M3 (porch): partly.** Target 2 closed: 361 faces, 1.833 to 1.933 s, 0 samples dropped, EDGE is right. Target 3: the split reproduces (23/23, 1/6), but the cause is incomplete (S4).

## DEFENDED

- **The fix.** Active set drains: empty 3.83 s after release; 0 active at 420 s in 8 burns and at 500 s with two houses on a lawn. A pulse on the facing tile reaches the surface (char 0.564). A spent surface's holder does not stay awake.
- **Cost of the fix** (`r08-cost.mjs`, alternating kernels; 29 other node processes were on the machine): one house 0.79 to 0.91 ms against 0.73 to 0.74; three 4.0 to 4.2 against 3.6 to 3.8; eight 16.0 against 15.0 ms. Mean active tiles +0.3 %. About 7 % dearer. The record's cost row and "missed at street scale" are fair.
- **Path and neighbour claims.** Hopkins 12: 44 of 44, first 7.07 s. All six plans: every path face lights. Hopkins 15 twin 65.77 and 69.63 s. A 1 m path leaves four plans untouched; Hopkins 09 and Monroe catch only where an upper floor overhangs grass.
- **Margins, re-measured on this kernel:** unchanged. Target 1 fails at steps 1/60, 1/45, 1/20, 1/15 s, at rate +5 % and −10 %, loss −10 %; holds at 1/40 and 1/24 (1.396). Target 2 fails at ceiling −5 % (12 of 361). Target 3 bare wall 3.65, 3.57, 3.62 at rate −10 %, loss +10 %, ceiling +10 %; in range at ±5 %. Embers at 1 %: 4 of 21.
- **Reach comparison.** Record block matches `summary.txt`. Eight strikes re-run (five open, three everywhere): all identical.
- **Conservation and sanity.** Ledger worst 4.9e-8 (4.0e-7 on the lawn scene); no negative amounts; hottest tile 2.9000; nothing unburnt; nothing never lit.
- **Rule text against code.** Rules 1–5, 7, 8, 12 and both tables match `DEFAULT_RULES` and `DEFAULT_FUELS`, apart from M1, S1 and S2.
- **Verdict count.** 4 met, 1 edge, 6 partly, 3 missed adds up. Target 8 is 11 of 21, so PARTLY is right. Target 10 cannot fail for an empty square tile with no surface or store beside it.

## Not checked

- Furniture in a corner on this kernel.
- The two reach surveys beyond eight strikes; `reach-options.mjs` itself.
- Today's game cost; frame schedules; lanterns; wind; masonry; a browser; a seventh plan.
- The cause of the ten target 3 misses away from porches.
- Whether house placements on the street use a corner origin.
