# Hostile review of fire spread: Round 3, reviewer report

Saved by the review's author from the reviewer's final message, unedited. The reviewer could not write this file itself.

Tree reviewed: `c855e62` (the worktree's `src/`, `tests/`, `tools/` are byte-identical to it). The gate passes on it: 291 tests, 69 s (`results/gate-baseline.txt`).
Target: the 7 commits `26931d9..c855e62`: the round-two corrections (porch deck sections, tool collision from authored geometry, publication tests, map record check) and the floor-fire pass.

Standard: "i want fire to spread easily and be tracked in a tile by tile modular way that moves along every axis."

Words used below:

- **HEAD**: this tree, `c855e62`. **tip2**: `26931d9`, the tree round 2 reviewed, the control for both passes together. **base3**: `968e88a`, after the round-two corrections and before the floor pass, the control for the floor pass alone.
- **Set-back plans**: Hopkins 9 and Hopkins 13, whose walls stand back from the rectangular stone plinth. **Flush plans**: the other four (Hopkins 12, Hopkins 15, Monroe row, Ashland worker).
- **Coarse box**: the rectangular collider a house had for everything before these passes; still used for walking, ground fire, matches and torch. **Authored blockers**: the new plinth, slab, rim, wall, post, rail and stair shapes that the flamethrower and the lantern collide with, on the set-back plans only.
- **Site**: one node of a house's fire graph (a wall panel band, a floor patch, a deck section, a roof square). **Panel**: one metre of outside wall.
- **Dud**: a thrown lantern that is spent and leaves nothing: no fuel pool, no heated site, no ignition.

All probes are in `docs/reviews/evidence/hostile-review-round-3/reviewer/`, outputs in `results/`. Unless a command says otherwise, run from that directory with `TB_TREES=<directory holding tip2/>`; the checkout is never edited (mutants and read-only taps are applied in memory by `hook.mjs`).

## Scores

- **(a) The game against the owner's sentence: 4 / 10.** Inside one fuel bed fire now moves well and piece by piece (a house is fully alight 4 to 9 s after one match, decks burn section by section, floor fire sits on the drawn boards), but the three structural gaps recorded earlier are untouched (fire cannot leave its bed, several trackers with different units, height only inside house graphs), and on two houses a lantern can now do nothing at all.
- **(b) The two passes as delivered: 6 / 10.** Every numeric claim I re-measured in the two records held, and the floor pass is clean (0 disagreements in 1.06 million rays); but the collision pass ships one regression a player will hit (dud lanterns), applies to two of six plans by name, costs about 10 % more per frame, and its tests let 24 of 57 small mutants of the new code through, including one that removes every floor-to-floor link.

## MUST-FIX

### M-1. On Hopkins 9 and 13 a lantern that comes down on the plinth, at the foot of a wall, or on a porch post is a dud

What a player sees: put the lantern's landing marker at the foot of a wall of either set-back house, throw, and the lantern vanishes. No pool, no flame, one lantern fewer. tip2 always left a burning pool.

Numbers (all through public input):

| Probe | HEAD | tip2 (control) |
| --- | --- | --- |
| `r04-lantern-sweep.mjs`: throws from a ring of stances that end past the wall line, two set-back plans x 4 quarter turns, 2,796 throws | **496 duds (17.7 %)**; 60 of 359 per turn on Hopkins 9, 64 of 340 on Hopkins 13, same count in every turn | 24 duds (0.9 %), all on Hopkins 9 where the lantern meets the box above its porch |
| same probe, the four flush plans, 1,384 throws | 0 duds | 0 duds |
| `r22-marker-sweep.mjs`: regular street, marker moved in 5 cm steps, flush east wall of Hopkins 9 | dud for a marker **from the wall face to 0.15 m past it** (4 of 35 steps) | no dud |
| same, set-back east wall behind the plinth | dud for a marker **from 0.5 m short of the wall to 0.15 m past it** (14 of 35 steps, the whole plinth) | no dud; pool and fire every time |
| `r07-lantern-dud-repro.mjs`: six named throws on the regular street | 5 duds of 6 (A, B, E, F come down on the plinth, D hits a porch post; C, marker 0.7 m past the wall, lights it) | 0 of 6 |
| `r18-lantern-panel-census.mjs`: one lantern at each set-back panel, marker 0.45 m past the face, 84 throws | wall lit 84 of 84, but **pool laid 0 L of 25.2 L** | wall lit 0 of 84, pool laid 21.6 L |

So even a throw that works (it lights the set-back wall) drops its 0.3 L of fuel from the ledger; `diagnostics.fuel.molotovFuel` stays at 0.

Cause: `src/simulation/tools.js:181-183` lays the pool and the heat pulse at the lantern's rest point. With the authored blockers that point is inside the coarse box (on the plinth top at 0.36 m, under a rim, on a post). `src/simulation/field.js:81` then drops masonry cells and needs a clear line from the pool point, which starts inside the box, so no cell qualifies and `addPool` returns 0; `field.emit` on line 183 is blocked the same way. `src/simulation/housing-fire.js:157` returns nothing for a post, rail or baluster hit and `:165` for a plinth or slab hit. `lanternPoolOrigin` (`tools.js:152-164`) moves the pool outside only for a wall hit within 0.011 m of the box edge. The flush-wall case: a lantern arriving below 0.36 m passes under the rim and hits the plinth's side 9 cm inside the box.

The team knew half of this: `docs/engineering/fire-exposure.md` says "A lantern that hits the open plinth lands on stone" and `tests/simulation/setback-wall.test.js:76-79` pins "no structure ignition" for that landing. Neither says the oil disappears, and nothing covers the wall-foot or post cases. Surviving mutant F02 (a post or rail hit heats the deck) turns the post dud into a fire and still passes all 291 tests.

Reproduce in under a minute: `TB_TREES=<dir> node r07-lantern-dud-repro.mjs` (9 s), or `TB_TREES=<dir> node r22-marker-sweep.mjs` (about 25 s).
Confidence: high. Deterministic, same counts in all four quarter turns, preview and flight agree on the impact point in every one of these throws.

## SHOULD-FIX

### S-1. The new tests let 24 of 57 mutants through; the largest hole is floor-to-floor spread

`r10-mutants.mjs` (run from the worktree root: `node docs/reviews/evidence/hostile-review-round-3/reviewer/r10-mutants.mjs - 4`) applies one small edit to a line added since `26931d9` and runs `node --test` on all 47 test files plus the art check (what `tools/check.mjs` runs after its static checks, which cannot see an in-memory patch). Controls: an identity edit survives, "never ignite" is killed (84 failures). Result: **33 killed, 24 survived** (`results/r10-mutants.txt`).

| Area | Killed | Survived |
| --- | --- | --- |
| deck sections | 5 | 5 |
| deck and wall strikes | 3 | 4 |
| authored blockers | 6 | 3 |
| geometry queries | 4 | 1 |
| tool and fan code | 5 | 3 |
| floor support and links | 8 | 7 |
| map record check | 2 | 1 |

What each survivor changes (`r15-survivor-behaviour.mjs` re-runs my probes under the mutant; outputs `results/r15-survivor-behaviour-*.txt`):

| Survivor | Behaviour it changes, measured |
| --- | --- |
| P02 no same-storey floor links | Hopkins 12's fire graph falls into 5 pieces (Hopkins 15: 15); after one match 4 of 27 floor patches never burn and the last floor patch lights at 11.0 s instead of 6.3 s |
| P15 stair foot anywhere on the lower floor | stair link starts from the first patch in the list, not the patch under the stair; last floor patch on Hopkins 12 lights at 6.55 s instead of 6.28 s |
| P12 "nearest" helper picks the farthest | post lights at 10.58 s instead of 0.65 s, stairs and entry attach to the wrong deck end |
| P11 any collinear edge counts as touching | 5 of the 8 void-side upper walls gain a floor link they should not have |
| P05 every floor patch has area 4 m2 | floor area claimed 84.5 -> 108 m2 on Hopkins 12; burned fraction shifts by up to 0.008 |
| P10 Ashland falling fuel lands at height 0 | cottage clearance moves 0.25 s (168.85 -> 169.10 s) |
| P13 anchor is the first candidate | anchors move about 0.25 m; link times change by hundredths of a second |
| D05 stairs not linked to the deck | on paving the stairs never catch from the deck, nor the deck from the stairs (every plan) |
| D06 entry door not linked to the deck | a house fire never reaches its porch: 50 of 299 sites on Hopkins 12 stay unburnt |
| D08 post linked to the far deck end | post 0.65 -> 10.58 s, porch roof 1.58 -> 11.52 s on Hopkins 12 |
| D09 each section claims the whole deck area | deck area 16 -> 128 m2; burned fraction at 4 s 0.015 -> 0.069 |
| D02 cut edges exchange ground heat | 14 m of extra contact edge under Hopkins 12's deck; no ignition time changes (cells under a deck hold no fuel) |
| F02 post or rail hit heats the deck | the post dud of M-1 becomes a fire |
| F04 rim hit heats a wall up to 0.5 m back | 3 more of 340 throws light the structure |
| F07 rim hit picks the band by height | rim hits heat nothing: 7 more duds of 340. The record's "a wall-rim impact can heat the adjacent timber" is not held by any test |
| H04 no posts, rails or balusters | lanterns and flame pass through the porch woodwork; 7 fewer duds of 340 |
| G01 shapes tested as bounding boxes | the two diagonal bay walls of Hopkins 9 cannot be lit by a lantern (2 of 21 set-back panels), 15 more duds of 359, 4 exposed panels missed by the flamethrower |
| T03 flame end height always drops | 11 more deck-section heatings of 69 on Hopkins 9 (a ray stopped by a post also reaches the deck) |
| F03, H06, H08, T04, X03, M03 | no difference in any probe I ran (likely equivalent, or only cost) |

The three old survivors, as I reconstructed them, are unchanged by the passes: "a burning ground cell holds no heat" and "a thrown lantern always hits the low band" still pass all tests; "house heat ignores the powder scale" passes in the form that keeps the world clock (`K03b`) and is killed in the form that also swaps the clock (`K03`).
Confidence: high for killed/survived (each run 70 to 240 s, four at a time; every kill names a relevant test). The behaviour column is only as wide as my probes.

### S-2. A flamethrower held along a flush wall heats nothing; on the two set-back plans the same shot now works

`r17-grazing-flame.mjs`: the bear 1 m off a long wall, firing along it. Aim 0 or 5 degrees to the wall: Hopkins 15 (coarse box) **0 of 3** panels inside the cone heated, on HEAD and tip2 alike; Hopkins 13's flush west wall (authored blockers) **2 of 2** on HEAD, 0 of 2 on tip2. In the wide sweep (`r05-flame-sweep.mjs`) the four flush plans miss 118 of 1,336 plainly exposed panel-shots (9 %) on both trees; the set-back plans miss 0 of 3,092 on HEAD.
Cause (old code, not these passes): `src/simulation/tools.js:105` extends each ray 2 cm and `src/simulation/housing-fire.js:172` needs that end point to cross the wall face, which lies 1 cm inside the coarse box; below 30 degrees to the wall it does not (0.02 x sin 30 = 0.01). The passes fixed it for two plans and left four, so the same shot now behaves differently from house to house.
Confidence: high.

### S-3. The height-aware collision is switched on by plan name for two of six plans

`src/simulation/housing-heat-volumes.js:7` (`prefabId === 'hopkins-4-09' || prefabId === 'hopkins-4-13'`). On the four flush plans the 0.48 to 2.12 m porch box still stops the flamethrower at any height: 13 of 112 ground-storey wood panels (the front walls behind porches; all 7 front panels of Hopkins 12) were never heated by any of 1,527 shots, same on tip2 (`r05`). This adds a third id-string switch to the two in `src/simulation/index.js:28-29` (known item M1).
Confidence: high.

### S-4. Per-frame cost went up

`r06-tick-cost.mjs`: both trees in one process, same inputs, alternating 120-frame blocks, wall clock, paired per-block ratios; two runs (`results/r06-tick-cost.txt`, `results/r06-tick-cost-run2.txt`; the second on a busier machine, noisier).

| Phase | HEAD ms per `advance(1/60)` (run 1) | tip2 | median paired ratio, run 1 / run 2 |
| --- | --- | --- | --- |
| idle street | 0.95 | 0.86 | 1.10 / 1.14 |
| flamethrower held 1.5 m from Hopkins 9 | 3.88 | 2.62 | 1.48 / 1.47 |
| burning, 3 to 20 s | 2.89 | 2.52 | 1.13 / 1.09 |
| burning, 20 to 60 s | 1.63 | 1.35 | 1.11 / 1.09 |
| burning, 60 to 150 s | 1.24 | 1.13 | 1.10 / 1.07 |
| collapse, 150 to 200 s | 1.68 | 1.60 | 1.04 / 1.01 |

Absolute cost is small against a 16.7 ms frame (at most +1.3 ms). Not profiled; the likely sources are the per-section deck ground contacts stepped every frame (`housing-fire.js:43-46`, `:197`) and the blocker shapes in the fan (`discharge.js:74-83`).
Confidence: medium-high on direction and size (both runs agree; idle ratio above 1 in all 32 blocks of run 1).

### S-5. Deck sections are strips, not tiles

`deckPieces` (`src/simulation/housing-topology.js:14-34`) cuts a deck along its longer side only. Hopkins 12's deck is 8 sections of 1 m x 2 m; a 3 x 3 m deck would be three 1 x 3 m strips (`r20-deck-odd-sizes.mjs`). Fire crosses the 2 m depth in one step. Against "along every axis" this is one axis.
Confidence: high.

### S-6. Old and unchanged, but met on the way: the flame fan loses its shape in 13 % of shots around the south-west block

`r19-fan-ray-budget.mjs`: regular street, 579 stances, 16 headings: 1,205 of 9,264 fans fall back to 25 unconnected rays on HEAD, 1,224 on tip2. `src/simulation/discharge.js:76-86` adds three rays per corner of every coarse box in the street at any distance and gives up above 256; `src/art/discharge.js:158` then draws 25 thin strips with no plume cards (read from the code, not rendered). The new blockers did not make it worse because they are range-filtered.
Confidence: high on the flag, medium on what it looks like.

## DEFENDED (attacked, held)

| Claim or risk | Attack | Result |
| --- | --- | --- |
| Floor patches equal the drawn oak, every plan, turn and party-wall variant | `r02-floor-vs-art.mjs` (no TB_TREES needed): a vertical ray every 0.1 m against the real assembled floor meshes, independent of the repository's triangle comparison; 36 house variants (6 plans x 4 turns, Monroe alone and in all three row positions), 1,059,200 rays | 0 disagreements; all 1,492 floor anchors on oak at the oak's height |
| No tiny, duplicate, unlinked or stranded patches; storeys connected | `r01-topology-census.mjs`, 36 variants | 0 duplicate ids, 0 sites without links, every graph one piece, stair link present in every plan that has stairs; smallest patch 1 m2, smallest flame radius 0.25 m (Monroe upper floor) |
| Walls that lost their floor link (tip2 linked within 2.2 m; HEAD links touching patches only) | `r14-wall-floor-links.mjs`, 315 wood panels on both storeys | 8 without a floor link, all 8 beside a stair opening with no oak behind them; 0 real edges missed |
| Straight-line travel time between patch anchors | `r08-spread-speeds.mjs`: shortest on-oak path (5 cm grid) for every same-storey floor link | worst case 9 % (Monroe upper floor by the stair opening, 2.77 m chord against 3.02 m, 0.21 s); no link above 10 %; every link has an on-oak path, so none crosses an opening |
| Spread speeds | same probe, one match, tap on ignition times | floor to floor 1.5 to 7.1 m/s (median 1.6 to 1.9), deck to deck 1.43 m/s (0.70 s per metre), wall along 0.7 to 4.6, wall up 2.1 to 6.8, roof 1.0 to 7.5; stairs carry fire up in 1.3 to 1.6 s (tip2: 0.4 to 0.5 s) |
| Floor pass did not change how the street burns (record: burnout shifts up to 0.15 s) | `r03-burn-differential.mjs 330`, 10 strikes x 330 s, with `TB_CONTROL=base3 TB_BASE3=<export of 968e88a>` | 37 house-runs: same houses, same ground fuel, barrels on the same tick; worst burnout shift 0.167 s, worst section retirement shift 0.5 s; collapse order differs in 14 of 37 |
| Both passes together (record: same strike results, house sets, barrel order) | same probe against tip2 | same houses and barrel order in all 10; but houses catch up to 2.83 s later, burn out up to 2.93 s later, a drum goes off up to 1.85 s later, collapse order differs in 32 of 37. Expected from the deck no longer bridging the lawn in one step |
| Flamethrower lights nothing through a wall, and nothing exposed is blocked by air, all quarter turns | `r05-flame-sweep.mjs`, judged by wall strips I built from the room plan; set-back plans 3,108 shots | 6,552 panel heatings, 0 through a wall, 0 of 3,092 exposed panels missed, 0 of 256 panels unreachable (tip2: 1,056 missed, 92 unreachable); 0 sites other than ground-storey panels and deck sections heated |
| Every set-back panel can be lit by a lantern (record: 21 of 21) | `r18-lantern-panel-census.mjs`, 4 turns | 84 of 84 (tip2 0 of 84); flush panels 172 of 172 |
| Lantern preview equals flight | `r04` 8,360 throws on both trees; `r16-preview-under-powder.mjs` 1,085 throws per tree released 0 to 1 s before the powder slow-down ends | 0 differences |
| A lantern cannot come to rest inside a house | `r04`, 4,180 throws on HEAD | 0. Held by 3 cm: the arc tops out at 2.45 m, a ground-storey wall at 2.48 m, and there are no roof blockers |
| Blockers follow the collapse | `r11-collapse-blockers.mjs` (no TB_TREES): Hopkins 9 and 13, 4 turns, every 0.25 s from first retirement to the end; 172 samples, 18,552 blocker shapes, 3,088 rays | 0 problems. Teeth: with mutant H05 the same probe reports 94,704 |
| Deck sections: both directions, stairs, post, roof, other plans, turns, odd sizes, end and cut edges | `r12-deck-sections.mjs`, `r20-deck-odd-sizes.mjs` | contact edges add up to the perimeter exactly for 24 deck and stair footprints, none on a cut; 0.70 s per section both ways; four quarter turns identical; a grass strip at one end lights that end section first (0.63 s) and fire then walks the deck; 10 odd sizes (0.6 m to 8.0001 m) all consistent |
| Determinism, reset, ledger, snapshot | `r09-determinism-ledger.mjs 200` (no TB_TREES): match, flamethrower into the notch, two lanterns, powder; 12,000 ticks | 1/60 s frames, 0.25 s frames and two random frame sequences identical at 7 comparison ticks; reset then replay equals fresh; second fresh run equals first; 600 audits, 5,752,800 published-against-live cell comparisons, 0 mismatches; ground fuel ledger closes to 1.2e-10 |
| Ashland pair after sharing the floor compiler | `r13-ashland-pair-differential.mjs`, calm and baked wind, 220 s | identical to tip2: first ignitions, 178 ignitions per cottage, 126 tile burnouts each, clearance times |

## The known items

- M1 (several trackers, model picked by scenario id): unchanged, plus one more name switch (S-3). The floor compiler is now shared by the street houses and the Ashland pair.
- M2 (fire cannot leave its fuel bed): not re-measured directly; in all ten strikes the same houses burned as on tip2. One real change: a porch no longer carries fire across a lawn gap in one step.
- M4 (height only inside house graphs; landmark maps have no fire): unchanged; tool collision now has height on two plans.
- 150 s section clock: unchanged (first retirement at 150.02 s in every run).
- The three old surviving mutants: still survive (see S-1).
- Ground fire, matches and torch not reaching set-back walls: untouched, as accepted.

## Not checked

- Anything rendered: the flame-splat fit on floor patches, WebGL, the browser, the package.
- Tool sweeps against a joined Monroe row (only single houses), the torch, matches against the set-back porches, lanterns thrown during a collapse, tools in the cottage-pair map.
- Wind on street houses, heap growth, the landmark maps.
- The record's exact lawn timings (5.72 s, 6.65 s, 1.85 s, 2.43 s) and the 24,624 splat count.
- Where the extra per-frame time goes (no profile).

## Process notes

- Two probe artefacts were caught and fixed during the run, both the reviewer's, neither a product defect: the first flamethrower "lit from behind" flags were grazing shots the test mis-measured (fixed, 0 remain), and the first "reset differs from fresh" was a one-step alignment error in the probe (fixed, identical).
- `r03` needed three launches because of illegal stances in the case table; the two result files carry a one-line note where the second run's cases are appended, and the printed SUMMARY line in each file covers only the last two cases. The all-case figures above were aggregated from the per-house lines.
- The first tick-cost run was taken before the mutation batch with the machine at about 12 % CPU; the second after it, on a visibly busier machine (absolute times roughly doubled), so run 1 is the cleaner one.
- `base3` is a `git archive 968e88a` export, made by the reviewer for attribution.
