# Hostile review, Round 1: fire-travel rules and their trial kernel

Saved by the author of the rules from the reviewer's final message; the reviewer could not write a report file. The text is the reviewer's. It reviewed the kernel as committed in `d78005b`; `kernel-var.mjs` and `scene-var.mjs` here are its copies of that version with switches.

**Score: 3 / 10.** The mechanisms hold (fast climb on walls, no heat going down, a house that burns 93 s or more), but 5 of the 11 targets marked "Met" fail when the match, the plan or the measuring radius moves. Rule 3's text is the opposite of the code. The fire rule reads house objects. A quarter of the fuel burnt is created from nothing. The "next door" result sits on a half-tile edge that the shipped street does not have.

All probes are in `docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/`, outputs in `results/`. Commands below are run from the worktree root with the prefix `node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/`. Line numbers are in the original `kernel.mjs`, `trial.mjs`, `scene.mjs`.

**Control for everything:** `kernel-var.mjs` and `scene-var.mjs` are copies with switches. With no switch set they reproduce the original's event log exactly on the trial scene: 7,857 events, identical (`r02-control-and-definitions.mjs`).

**Re-run of `trial.mjs`:** every number reproduces except cost (4.29 ms here; 5.62 in the saved `trial.txt`; 4.7 in the document). It takes 2 min 45 s, not "about a minute". It overwrites `results/trial.json`; I restored the original.

## MUST-FIX

### M1. Target 1 (grass 1.5 m/s within 7 %) passes only at the radius and the 8 directions the trial chose
- Probe: `r04-isotropy-and-order.mjs grass` (54 s); straight fronts in `r10-more-scenes.mjs` part (a).
- From one lit tile, 32 directions:

| Radius | Mean speed | Spread |
| --- | ---: | ---: |
| 3 m | 1.31 m/s | 2.9 % |
| 6 m (the trial's) | 1.45 m/s | 3.9 % |
| 12 m | 1.55 m/s | 8.6 % |
| 24 m | 1.61 m/s | 12.5 % |
| Between 6 m and 24 m | 1.67 m/s | 15.9 % |

- A straight front from a lit line is steady at 1.875 m/s along the grid axis and 1.72 to 1.77 m/s along the diagonal. That is 25 % and 14 % over target, and 8.8 % apart.
- Control: the trial's own 8 directions at 6 m give 1.463 m/s, 3.4 %, as claimed.
- Cause: `trial.mjs:27` samples only axis and diagonal, at 12 tiles, while the front is still accelerating.
- Confidence: high.

### M2. Rule 3 says the opposite of the kernel, and doing what Rule 3 says makes target 5 worse
- Rule 3: "A tile in the open cools fast. A tile with a ceiling and walls keeps what it is given… That one loss rule is where rooms come from."
- Code: an inside tile loses 2.5 /s plus 1 per open face; an outdoor tile loses 2 /s (`kernel.mjs:30`, `:114-121`). Inside cools faster.
- Probe: `r14-quick.mjs '{"lossInside":0.5}'` (15 s); full table in `r08-conservation-and-hidden-rules.mjs` part (b).

| Loss rule | Room alight | Half the house | Flame until |
| --- | ---: | ---: | ---: |
| As written (control) | 17.97 s | 36.5 s | 122.5 s |
| Every tile loses 2 /s, no enclosure term | 15.73 s | 34.2 s | 119.5 s |
| Enclosure as Rule 3 describes (inside 0.5 /s) | 12.0 s | 19.17 s | 94 s |

- Rooms therefore do not come from loss. They come from shut doors, one-sided burning (without it, half at 20.5 s) and the same-building reach exclusion (M3).
- Rule 4's "under a closed ceiling the upward share spreads sideways" (`:109`) has no measurable effect: 18.0 s / 37.07 s without it.
- Confidence: high.

### M3. The fire rule reads house objects, against the owner's "no room or house objects in the fire rule"
- `building` (`kernel.mjs:192`): reach skips targets in the source's own building. It is load-bearing. Without it, half the house is at 18.97 s instead of 36.5 s. Probe: `r14-quick.mjs '{}' '{"radiateWithinBuilding":true}'`.
- `inside` (`:114-121`, `:175-184`, `:212-213`): chooses the loss rule, decides which tiles may radiate, and lets a wall not shade itself.
- `room` (`:154`): the oil burst spreads only to tiles with the same room label. Removing it changes nothing but flame time (119 s against 122.5 s).
- `radiantTarget` (`:192`, set in `scene.mjs:26` and `:99`): only grass and outside-wall tiles can receive reach.
- `fuel.cls !== 'coal'` (`:141`): coal alone is not lit by falling.
- Reach height is hard-wired to ±3 layers (`:188`).
- Not load-bearing in this scene: dropping `radiantTarget`, the `room` test, or light-on-fall each leaves targets 4 to 7 and 11 unchanged.
- Confidence: high.

### M4. Targets 3, 4, 5 and 8 do not survive moving the match or changing the plan
- Probe: `r03-plans-and-strikes.mjs <plan>` then `r03-summary.mjs`. 77 runs: 6 plans, each outside wall, every room, 300 s, furnished.
- Quick reproductions (about 15 s each):
  - `r14-quick.mjs '{}' '{}' hopkins-4-15 wall:0` (same wall, match moved 2 m): room 21.93 s, half 38.9 s.
  - `r14-quick.mjs '{}' '{}' ashland-worker room:0:kitchen`: room 6.23 s, half 20.8 s.
  - `r14-quick.mjs '{}' '{}' hopkins-4-12 room:1:bed-b`: ground lit 12.6 s after the first fall.
- Control: the trial strike gives 17.97 s / 36.5 s.

| Target | In range | Range found |
| --- | --- | --- |
| 3, climb ratio 2.5 to 3.5 | 7 of 23 measured directions; 1 of 24 wall strikes with every direction in range | 1.63 to 12.38 |
| 4, room alight 10 to 20 s | 13 of 24 wall strikes; 40 of 77 all strikes | 1.67 to 25.53 s |
| 5, half the house 40 to 70 s | 18 of 77; 2 of 56 ground-floor strikes; 16 of 21 upstairs | 20.2 to 63.1 s |
| 8, ground lit within 5 s of a fall | 13 of 21 upstairs strikes | 8 lag 7.5 to 13.2 s (all on Hopkins 9 and 12) |

- Target 3: the climb is steady at 0.70 m/s. "Along" is 0.26 m/s inside one room and about 0.1 m/s across a partition, so the ratio depends on where the partition is.
- Target 4 on the trial's own wall: 6 of 8 match positions in range (`r10` part (c)).
- Target 5 is admitted as "missed by 4 s". It is in fact missed on 54 of 56 ground-floor strikes, by up to 20 s.
- With every door open, half the house is at 22.9 s.
- Confidence: high.

### M5. A quarter of the fuel burnt is made from nothing, and the ledger closes by construction
- Probe: `r08-conservation-and-hidden-rules.mjs` part (a); quick: any `r14-quick.mjs` line prints embers made.
- Hopkins 15 over 600 s: 1,542.1 tile-fulls laid; 373.2 tile-fulls of embers created (24.2 %); 1,915.3 burnt.
- "laid − burnt − left" is −5e-8 only because each created ember is added to `laid` (`kernel.mjs:88` through `:143`; amounts at `:167-168`).
- Every spent surface makes a "fall" event: 1,528 of them. 636 land in their own tile. 408 are ground floors "falling" onto themselves, each adding embers and a heat pulse of 2.5.
- Embers do not change targets 4 to 7 or 11 (37 s against 36.5 s without any). They are the whole of target 8: the thing that "falls" is 0.2 tile-fulls of embers from a spent wall or door face beside the stair opening.
- Rule 12's "fuel is conserved" is not met in the sense the owner would read it.
- Confidence: high.

### M6. Target 11 sits on a half-tile edge, and the shipped street has no such gap
- Probes: `r15-pair.mjs 2.5 bare` (10 s), `r15-pair.mjs 2 bare '{"reach":2.75}'`, `r15-pair.mjs 3 lawn`. Full sweeps: `r07-gaps-and-reach.mjs`, `r11-reach-edge.mjs`, `r12-shipped-gaps.mjs`.
- Bare ground, match on the facing wall:

| Gap | Neighbour lit |
| --- | --- |
| 0.5 m | 5.2 s |
| 1 m | 6.2 s |
| 1.5 m | 7.4 s |
| 2 m | 9.3 s |
| 2.5 m and wider | never (largest radiant 0.19 of the 1.1 needed) |

- Reach is measured between tile centres, and a wall's fuel lives in the tile inside it (`kernel.mjs:193-194`). A 2 m gap is 2.5 m to the kernel. "3 m" therefore means a 2 m gap.
- At reach 2.75 the 2 m neighbour never lights (radiant 1.04). At gain ×4 the 2.5 m neighbour still never lights. The cut-off decides, not the inverse square.
- `src/content/neighborhood.js:24-31` places the detached houses about 3 to 5 m apart, on grass. This is my reading of the x positions and plan widths; I did not confirm the placement origin. At 3 and 5 m on bare ground the neighbour never catches.
- With lawn between, it catches at any gap: 5.9 s at 2 m, 6.4 s at 3 m, 7.6 s at 5 m, with 3.3 % of the first house burning. A match on a wall lights the grass in 2.2 to 3.8 s.
- So on the real street Rule 6 does nothing and the grass does everything. That answers the open owner decision "should a lawn fire always take everything" by accident.
- The target says "a fully burning house". In the trial the match is on the wall facing the neighbour (`trial.mjs:90`), which lights with 9.7 % of the house burning. From the far wall it takes 55.4 s. "Within 30 s" is never checked (`trial.mjs:96`).
- Confidence: high on the numbers; medium on the street gaps.

### M7. The cost claim "the same order as today's" is false at peak
- Probe: `r09-cost.mjs` (about 10 min); `r09-cost.mjs quick` (16 s, one house).
- Today's figure is 3 to 5 ms per frame.

| Scene | Mean | p95 | Max |
| --- | ---: | ---: | ---: |
| 1 house | 2.3 ms | 10.5 ms | 27 ms |
| 3 houses, all struck | 11.3 ms | 51 ms | 110 ms |
| 8 houses, all struck | 33.6 ms | 150 ms | 317 ms |
| 8 houses, first struck | 17.8 ms | 47 ms | 90 ms |

- The trial's 4.7 ms is a mean over 300 s, most of it after the fire is out. Its pass mark is 10 ms (`trial.mjs:99`), and `trial.txt` prints PASS.
- 69 to 81 % of the time is rebuilding links. Any face opening bumps one global version (`kernel.mjs:66`, `:164`, `:268`), and every active tile then rebuilds its 26 links: 1,837 rebuilds per step with eight houses.
- `radiate()` walks every tile, burning or not, every 0.5 s (`:199`). At peak every tile of a burning house is active (1,376 of 1,376), so "only burning and warm tiles are visited" saves nothing there.
- Control: timer off gives 12.3 ms against 11.3 ms.
- Timing noise on this machine is about ±50 % between runs. The ratios hold.
- Confidence: high on the shape; medium on absolute milliseconds.

## SHOULD-FIX

- **S1. Time step.** Probe: `r05-time-step.mjs`. Results move 5 to 8 % between 1/60 s and 1/30 s. At 1/15 s, target 4 misses and target 8 misses (ground lit 12 s after the fall). The step must be stated as part of the rules.

| Step | Grass | Room alight | Half the house | Neighbour lit |
| --- | ---: | ---: | ---: | ---: |
| 1/60 s | 1.54 m/s | 17.12 s | 35.57 s | 9.12 s |
| 1/30 s | 1.46 m/s | 17.97 s | 36.5 s | 9.3 s |
| 1/15 s | 1.53 m/s | 20.53 s | 38.93 s | 10.27 s |
| 1/10 s | 1.25 m/s | 24.3 s | 42.9 s | 11.4 s |

- **S2. Upward through a ceiling is as slow as downward.** Probe: `r13-up-and-lacquer.mjs` part (a), 26 ground-floor rooms. As written, fire is truly upstairs in 2.0 to 42.4 s. With the wall-continuity correction off and the stair opening floored over, it takes 62.7 to 81.6 s, which is the 60 s floor burn-through. "Flame goes up easy" rests entirely on outside walls and the stair hole. A ceiling lit from below burns on its underside only (`kernel.mjs:223`, `:260`).
- **S3. Rule text with no code.**
  - Rule 7 "burning oil runs through a floor at once" and Rule 8 "through any burnt floor": a 3-tile can upstairs bursts at 0.13 s over 23 tiles on its own storey and never reaches the ground (`r10` part (d); `kernel.mjs:148-160`).
  - Rule 9 (wind), Rule 10 beyond the match, Rule 11, and Rule 12's "lists the tiles that changed" have no code.
  - Target 14's "same state under five frame schedules" was reduced to the ledger (`trial.mjs:98`).
- **S4. Target 7 passes by one table number.** The first fall is at 61.0 to 65.5 s in 77 of 77 runs. That is the 60 s burn time of roof and frame plus 1 to 5 s to light, sitting on the 60 s lower bound. It is a per-tile clock.
- **S5. A diagonal strip of paving one tile wide (0.35 m across) is crossed at 5.97 s.** Two tiles wide holds. Probe: `r07` part (c).
- **S6. The count "meet 12" does not match the table.** The table shows 11 "Met". The twelfth is target 15, which `trial.txt` prints as PASS and the document calls "Not shown".
- **S7. Processing order changes results slightly.** Reversing the order active tiles are processed moves 1,352 of 1,545 light times, worst 0.33 s; room alight moves from 17.97 to 18.03 s. A surface chars on its neighbour's heat from this step or the last, depending on Set order (`kernel.mjs:254`). It is deterministic, but not "derived from tile coordinates".
- **S8. Contents change almost nothing, a little worse than admitted.** No contents: half at 35.57 s. All furniture lacquered: 36.07 s. Full contents: 36.5 s. Room alight is 17.97 s in all three. After 150 s the only thing burning is 0.72 of the coal.
- **S9. Windows exist only on the 1 m grid.** `scene.mjs:52-54` matches axis-aligned segments exactly. A plan shifted 0.125 m loses all 28 glass faces; the neighbour then lights at 7.73 s instead of 9.3 s. Hopkins 9's diagonal bay is rasterised as steps. A true half-tile offset cannot be built with this scene builder.

## DEFENDED

- **Target 6, flame 90 s or more:** 77 of 77 runs, 93 to 164.5 s. The owner's "a minute or more" holds on every plan and strike.
- **Fire does not go down by heat:** 0 of 21 upstairs strikes light the ground storey before something falls. Still 0 of 21 with every piece of furniture lacquered. The largest ground-storey heat before a fall is 0.75. With face embers off, the ground lights only after a floor falls at 61.7 s or later. Probes: `r06` part (a), `r13` part (b).
- **A shut room holds until its door burns through:** 10 of 10 rooms on Hopkins 15. Door spent at 15 to 24 s; next room's floor lit about 1 s later; no partition passed fire first. Probe: `r06` part (c).
- **Target 2, lawn fire lights a wall in under 2 s:** 12 of 12 sides on three plans, 0.7 to 1.57 s.
- **A small fire does not light the house next door at 2 m:** 14 free-standing burning strips, up to 3 m by 4.24 m, none did (largest radiant 1.07 of 1.1).
- **Straight paving 0.5 m holds:** across x, across y, as empty tiles or as no tiles, on lawns of 41, 81 and 161 tiles.
- **The 0.5 s radiant cadence barely matters:** 7 values from 1/30 s to 4 s give the neighbour at 9.17 to 10.4 s.
- **Tile creation order does not matter:** 16,097 grass tiles, identical light times; point symmetry exact.
- **Mirrored and transposed house:** room alight 17.97 to 18.23 s, half 35.27 to 36.5 s.
- **Sanity:** heat stays between 0 and 3.67 (cap 4). Nothing is left unburnt in 77 runs. The active set is 18 tiles at 300 s (the coal and its neighbours) and 0 at 600 s. The numeric ledger is within 6e-8 in 77 runs.
- **The wall-continuity correction acts upward only in effect:** removing its downward half changes nothing.

## Not checked
- The game itself, the "Today" column, and the "first run, rules as written" column (no kernel was saved for it; I tested only Rules 4 and 5 at their first-written values).
- Lanterns, flamethrower, torch, poured gas, wind, the plinth, a joined Monroe row, the landmark maps.
- Rotation by anything other than mirror and transposition; a true half-tile change of room size.
- Target 9 (kitchen against dining) on other plans.
- Cost in a browser or on another machine.
- Whether any number is physically realistic.
- The exact placement origin convention behind the street gaps in M6.
