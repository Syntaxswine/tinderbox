# Hostile review, round 3: the corrections and the floor-fire pass

- **Reviewed commit:** `c855e62`, the tip of `origin/master` on 2026-11-10. It carries two passes by Codex since round 2:
  - **Pass 1, the round-two corrections** (`968e88a`): the porch deck in one-metre sections, tool collision built from the authored geometry above the plinth, three publication tests. Codex's record is [`2026-11-10-hostile-round-2-fixes.md`](2026-11-10-hostile-round-2-fixes.md).
  - **Pass 2, floor fire** (`c855e62`): house floor fuel follows the drawn oak boards. Codex's record is [`2026-11-10-hostile-round-3-floor-fire.md`](2026-11-10-hostile-round-3-floor-fire.md). That record is Codex's own "round 3"; this one is the reviewer's.
- **Compared against:** `26931d9`, the tree [round 2](2026-11-10-hostile-review-round-2.md) reviewed, and `968e88a`, the tree between the two passes. Both exported with `git archive` and run beside the new tree.
- **Judged against:** the owner's sentence: "I want fire to spread easily and be tracked in a tile by tile modular way that moves along every axis."
- **Method:**
  - One hostile reviewer, a Claude subagent, was given the two passes and their records and told to break them. It wrote 22 probes and did not see the bench or the [round 2 re-check](2026-11-10-hostile-review-round-2-recheck.md). Its report is [`evidence/hostile-review-round-3/reviewer/REPORT.md`](evidence/hostile-review-round-3/reviewer/REPORT.md).
  - The commissioning session re-ran the bench and the earlier rounds' reviewer probes on `c855e62`, took the frame cost in a browser with `26931d9` beside it, and re-ran the MUST-FIX by hand with a separately written probe. The table near the end says how.
  - Labels as before: **measured**, **code-reading**, **judgment**.
- **Evidence:** [`evidence/hostile-review-round-3/`](evidence/hostile-review-round-3/README.md).
- **This branch changes nothing in the game.** It adds this record and the probes.

A **cell** is one 0.5 m square of the ground heat grid. A **site** is one fire-carrying patch of a house. A **dud** is a thrown lantern that is spent and leaves nothing: no oil on the ground, no heated site, no ignition. Hopkins 9 and Hopkins 13 are the two **set-back** houses, whose walls stand back from a rectangular stone plinth. Times are world seconds.

## Score: 4 / 10 against the owner's sentence (round 2: 4, round 1: 3)

| Clause | Round 2 | Round 3 | What moved |
| --- | --- | --- | --- |
| "spread easily" | Half | Half | The deck no longer carries fire 8 m in one step, which is correct. The flamethrower and lantern now reach the set-back walls. Against that, a lantern that comes down on the plinth of those two houses now does nothing (N3). Fire still stops at 0.5 m of bare ground, and a burning house still lights nothing it does not touch. |
| "tracked tile by tile" | No | No, a little closer | The deck burns in one-metre strips and the floor in patches that match the drawn boards. Neither is a tile grid, and the several trackers with their own units remain. |
| "modular" | No | No | The scenario `id` still picks the fire model, and pass 1 added a third switch on a plan's name (S14). |
| "moves along every axis" | Inside two house models only | Unchanged | Tool collision now has height on two of six house plans. The three landmark maps still accept no fire. |

The reviewer scored 4 and the bench agrees. The score did not move because nothing structural did.

**The two passes as delivered: 6 / 10.**

- **The floor pass is clean.** The reviewer fired 1,059,200 vertical rays at the real floor meshes of 36 house variants and found no disagreement with the fuel.
- **The corrections do what the handoff asked.** All three handed items are closed (see the re-check).
- **The collision change shipped one regression a player will meet** (N3), applies to two plans by name, and costs about a tenth more per frame.
- **The new tests are thin.** 24 of 57 small breakages of the new code pass all 291 tests.

## MUST-FIX

### N3. A lantern that comes down on the plinth of Hopkins 9 or 13 is a dud (measured; new with pass 1)

**What a player sees.** Stand on the lawn beside either set-back house, put the landing marker at the foot of a wall, and throw. The lantern is spent and nothing happens: no pool, no flame. On `26931d9` every such throw left a burning pool.

**Measured, the bench's own probe** (`lantern-dud.mjs`, the shipped street, the bear at x 11.4 east of Hopkins 9, one lantern per reach from 0.8 to 3.4 m):

| Row of the house | Tree | Duds | Detail |
| --- | --- | --- | --- |
| Wall set back 1.09 m behind the plinth | `c855e62` | 6 of 14 | Every marker from the plinth's edge to the wall's foot, a band 1 m deep |
| Same | `26931d9` | 0 of 14 | |
| Wall flush with the plinth | `c855e62` | 1 of 14 | The marker 0.09 m inside the plinth's face; the lantern comes to rest 9 cm inside the stone |
| Same | `26931d9` | 0 of 14 | |

**A throw that works still loses its oil.** The five throws that reach the set-back wall light it (51 house sites in 3 s), but no oil reaches the ground: the ledger reads 0 L where it read 0.3 L, and 2 lawn cells catch in 3 s where 209 did on `26931d9`.

**Measured, the reviewer** (independent probes, public input only):

- `r04`: 496 duds in 2,796 throws (17.7 %) at the two set-back plans over four quarter turns, the same count in every turn. On `26931d9`: 24 (0.9 %). On the four other plans: 0 of 1,384 on both trees.
- `r22`: the marker moved in 5 cm steps. Dud from 0.5 m short of the set-back wall to 0.15 m past it; at the flush wall, dud from the wall's face to 0.15 m past it.
- `r07`: a lantern that hits a porch post of Hopkins 13 is also a dud.
- `r18`: 84 lanterns, one at each set-back panel, light 84 of 84 walls and lay 0 L of 25.2 L.

**Cause (code-reading, both the reviewer and the bench).**
- `src/simulation/tools.js:181-183` lays the pool and the heat pulse where the lantern came to rest.
- With the new blockers that point is on the plinth top, under a rim or on a post, which is inside the house's ground box.
- `src/simulation/field.js:81` then finds no cell it may wet from there, so the pool is empty and the heat pulse is blocked.
- `lanternPoolOrigin` (`tools.js:152-164`) moves the pool outside only for a wall hit within 0.011 m of the box edge.

**What Codex already knew.** `docs/engineering/fire-exposure.md` says a lantern that hits the open plinth "lands on stone", and `tests/simulation/setback-wall.test.js` pins "no structure ignition" for it. Neither says the oil vanishes. That test's street has no lawn, and nothing covers the wall-foot or post cases.

**Proposed (judgment).** Oil that lands on stone inside a house's outline should run to the nearest open ground at the plinth's edge, and the heat pulse should land with it. A lantern that breaks on a wall should heat the wall and also drop its oil at that wall's foot, as it did before. A hit on a post or rail should heat the deck section under it.

### Still open from earlier rounds, unchanged

Re-run on `c855e62` (bench and round 1's reviewer probes):

| Finding | Round 3 reading |
| --- | --- |
| M1: several fire trackers; the scenario `id` picks the model | Unchanged (`p04b`). One more switch on a name (S14) |
| M2: fire cannot leave its fuel bed | Unchanged. Ten one-match cases: each takes 100 % of its own side and 0 % of the other; road and paving light nothing |
| M4: height only inside house graphs; landmark maps have no fire | Unchanged (`p12`, 0 changed lines) |
| Collapse and rubble heat follow a 150 s clock | Unchanged: first section retires at 150.02 s |
| Fire climbs barely faster than it creeps | Unchanged: up against along 1.05 to 1.21 to 1 (`structure-spread.mjs`) |

## SHOULD-FIX

### S12. 24 of 57 breakages of the new code pass every test (measured, reviewer)

`r10-mutants.mjs` makes one small edit in memory to a line added since `26931d9` and runs all 291 tests. 33 were caught, 24 were not. Controls: a no-op edit passes, "never ignite" fails 84 tests. The ones that matter, with what each changes in play (`r15`):

| Breakage that passes | What it does |
| --- | --- |
| No links between floor patches on a storey | A house's fire graph falls into 5 pieces (Hopkins 12) or 15 (Hopkins 15); 4 of 27 floor patches never burn |
| The entry door not linked to the deck | A house fire never reaches its porch: 50 of 299 sites on Hopkins 12 stay unburnt |
| The stairs not linked to the deck | On paving the stairs never catch from the deck, on every plan |
| The post linked to the far end of the deck | The post lights at 10.58 s where it lit at 0.65 s; the porch roof at 11.52 s for 1.58 s |
| Each deck section claims the whole deck's area | Deck area 16 m² becomes 128 m²; the burned share at 4 s reads 0.069 for 0.015 |
| Shapes tested by their bounding boxes | The two diagonal bay walls of Hopkins 9 cannot be lit by a lantern |
| A rim hit picks its band by height | A lantern on a wall's rim heats nothing. Codex's record says such a hit "can heat the adjacent timber"; no test holds that |

Round 2's three old survivors still pass: a burning cell that holds no heat, a lantern that always hits the low band, house fire that ignores the powder clock. The fourth (the stair link removed), which the re-check could not run, was not rebuilt. The nearest new one, a stair link that starts from the wrong floor patch, also passes.

### S13. A flamethrower held along a wall heats nothing on four of six plans (measured, reviewer; old)

`r17`: the bear 1 m off a long wall, firing along it at 0 or 5 degrees. On Hopkins 15: 0 of 3 panels inside the cone heat, on both trees. On Hopkins 13's flush wall: 2 of 2 on `c855e62`, 0 of 2 on `26931d9`. In the wide sweep the four flush plans miss 118 of 1,336 plainly exposed panel-shots (9 %) on both trees; the two set-back plans now miss 0 of 3,092.

Cause: `tools.js:105` extends each ray 2 cm and `housing-fire.js:172` needs the end to cross a wall face that lies 1 cm inside the box, which fails below 30 degrees. Pass 1 fixed this for the two plans it touched, so the same shot now behaves differently from house to house.

### S14. The height-aware collision is switched on by plan name (code-reading and measured, reviewer)

`src/simulation/housing-heat-volumes.js:7` tests for `hopkins-4-09` or `hopkins-4-13`. On the other four plans the porch is still one box from 0.48 to 2.12 m that stops the flamethrower at any height: 13 of 112 ground-storey wood panels, including all 7 front panels of Hopkins 12, were never heated directly by any of 1,527 shots. They catch by spread from the deck.

### S15. The two passes cost about a tenth more per frame (measured, three ways)

| Instrument | Idle street | Burning |
| --- | --- | --- |
| Reviewer's `r06`, both trees in one process, paired blocks, two runs | 1.10 and 1.14 times | 1.07 to 1.13 times; 1.48 with the flamethrower held |
| Same probe re-run by the bench on a quiet machine | 1.14 times | 1.11 to 1.15 times; 1.39 with the flamethrower held |
| Browser, both trees in one session (`browser-frame-cost.md`) | 15.5 ms to 16.8 ms per frame | 19 to 25 ms to 20 to 26 ms |

The simulation's share is small (at most +1.3 ms). The frame it lands in is not: with a lawn fire burning the street takes 19 to 26 ms per frame on both trees, over the 16.7 ms budget, and 16 to 19 ms of that is rendering 2,450 draw calls. That is round 2's S10, still open.

**Correction to the re-check.** It said "no measurable cost from either pass". Its instrument (`tick-cost.mjs` alternated twice) had run-to-run scatter of about 15 % and could not see a 10 % change. The paired measurement above can.

### S16. Deck sections are strips, not tiles (code-reading, reviewer)

`deckPieces` (`housing-topology.js:14-34`) cuts a deck along its longer side only. Hopkins 12's deck is eight pieces of 1 m by 2 m; a 3 m by 3 m deck would be three strips of 1 m by 3 m. Fire crosses the depth in one step. Deck fire runs at 1.43 m/s, grass at 1.5 m/s, a wall at about 1.0 m/s, and timber laid as ground fuel at 0.53 m/s: three rates for one material, which is M1 again.

### S17. The flamethrower's fan loses its shape in 13 % of shots near the south-west block (measured, reviewer; old)

`r19`: 1,205 of 9,264 fans fall back to 25 unconnected rays (1,224 on `26931d9`). `src/simulation/discharge.js:76-86` adds three rays per corner of every box in the street at any distance and gives up above 256. What it looks like was read from the art code, not rendered.

## DEFENDED

Attacked by the reviewer and held. D20 to D31 continue round 2's numbering.

| | Claim | Attack | Result |
| --- | --- | --- | --- |
| D20 | Floor fuel equals the drawn oak | 1,059,200 rays, 36 house variants | 0 disagreements; all 1,492 anchors on oak |
| D21 | No stranded, duplicate or unlinked floor patches | 36 variants | Every graph is one piece; a stair link in every plan with stairs |
| D22 | Walls that lost their floor link | 315 wood panels | 8 without, all beside a stair opening with no oak behind them |
| D23 | Straight-line travel time between patches | Shortest on-oak path for every link | Worst 9 %; no link crosses an opening |
| D24 | The floor pass did not change how the street burns | 10 strikes, 330 s, against `968e88a` | Same houses, fuel and barrels; burnout shifts at most 0.17 s |
| D25 | The flamethrower lights nothing through a wall | 3,108 shots on the set-back plans | 0 through a wall; 0 of 3,092 exposed panels missed |
| D26 | Every set-back panel can be lit by a lantern | 84 throws, four turns | 84 of 84 |
| D27 | The lantern's preview equals its flight | 8,360 throws, and 1,085 across the end of a powder slow-down | 0 differences |
| D28 | No lantern comes to rest inside a house | 4,180 throws | 0, by a 3 cm margin |
| D29 | Tool blockers follow the collapse | 172 samples, 3,088 rays | 0 problems; the same probe reports 94,704 when the code is broken |
| D30 | Deck sections in both directions, at odd sizes, in all turns | 24 footprints, 10 odd sizes | Contact edges sum to the perimeter exactly; 0.70 s per section both ways |
| D31 | Determinism, reset, fuel ledger, published against live | 12,000 ticks with every tool; 5,752,800 cell comparisons | Identical under four frame schedules; 0 mismatches; ledger closes to 1.2e-10 |

Also held on the bench: the state hash under five frame schedules, reset against fresh, no open-air wall half-metre without a usable ground cell (`r03`), and `ground-front.mjs` and round 1's two cottage probes with 0 changed lines. The reviewer found the Ashland pair identical to `26931d9` over 220 s, calm and windy.

## The owner's notes: what is inside the houses

Two notes from the owner, one during the round and one after it. Both say the same thing about the model: a house is not only its shell.

### Lacquer on the furniture

**The owner, 2026-11-10, during this round:** "there is a non zero chance of nitrocellulose lacquer on the furniture."

What the game does today (code-reading):

- **In the houses, furniture is not fuel.** The catalogue houses have beds, tables, a cabinet and chairs modelled (`src/art/gross-housing.js:183-196`), hidden on the street (`src/art/neighborhood.js:54`, `src/art/cottage-pair.js:49`). A house's fire graph has floor, wall, joinery, fascia, roof and porch sites only (`housing-topology.js:10`).
- **In the Bell & Alder shop, ten furniture pieces are tagged `wood`** (`src/content/bell-and-alder-layout.js:22-33`) and burn as wood obstacles, the same as a crate.
- **No fuel has a finish.** The three fuel classes are gas, grass and wood (`config.js:12-13`).

On the history, from a short search and not from a fire-science source: nitrocellulose lacquer as a furniture finish dates from the 1920s. For an 1893 street the usual finishes are shellac and oil varnish, so "non-zero" is the right size of chance. No measured flame-spread comparison between the finishes was found.

The design reading (judgment): house contents as their own fuel, placed where the furniture is drawn, with a finish that sets how readily a piece lights and how fast flame runs over it. A lacquered piece would light at a touch and flash over its surface before the wood under it burns. In the proposed lattice this is one more fuel class on a tile, not a new mechanism.

### Oil and coal stores

**The owner, 2026-11-11, after the round:** "oil and coal are stored in abundance in certain points in the house."

What the game does today (code-reading):

- **No house holds any stored fuel.** A house's fire graph is its surfaces: floor, wall, joinery, fascia, roof, porch.
- **The rooms that would hold it are already named.** Every plan has a kitchen; four of six have a pantry; the two plans with a basement (Ashland worker, Monroe row) have "service" rooms there (`src/content/housing-plans.js`). Each kitchen has a cast-iron stove modelled (`src/art/gross-housing.js:186-187`), hidden on the street with the furniture.
- **The only stored fuel in the game is outdoors.** Two steel drums stand in Catalogue Street (`src/content/neighborhood.js:34-35`). A drum goes off at heat 1.4 with a 2.5 m blast (`src/simulation/config.js:22`), on the ground grid.
- So the mechanism exists, a point store that goes off when heated, but a house has nowhere to put one.

On the history, from general knowledge and not looked up: an 1893 house burned coal in the kitchen stove and for heat, kept in a bin in the cellar or by the kitchen with a scuttle at the stove, and lit its rooms with kerosene lamps, with the oil kept in a can in the kitchen, pantry or cellar. Every lamp is itself a small oil store.

The design reading (judgment): two stores that behave in opposite ways, placed by room type.

| Store | Where | How it should burn |
| --- | --- | --- |
| Lamp oil | A can in the kitchen or pantry; a lamp in each lit room | Lights readily, flares, and spills as a burning pool. The lantern and the street drum already do each half of this |
| Coal | A bin in the basement or by the kitchen; a scuttle at the stove | Hard to light, then burns hot for a long time. It would give the heat of a collapsed house a cause, where today that heat follows a 150 s clock |

Both make where a fire starts in a house matter: a kitchen fire and a bedroom fire would not be the same fire. In the proposed lattice a store is a fuel load of a given class and amount on one tile. In today's house graph it would be a new kind of site with its own rules, a fifth special case.

## The proposal, after the passes

Unchanged from round 2. The two passes are a second and third local repair of the seam between the ground grid and the house graphs, and each added a special case: a deck cut one way, a blocker set for two plans by name, a pool origin moved for a wall within 0.011 m. N3 came out of that seam. One lattice of fire tiles, with height, would not have the seam.

## Decisions for the owner

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | What should a lantern do when it comes down on stone inside a house's outline? | The oil runs to the nearest open ground and burns there; or the lantern is a miss, as now | The oil runs off. A spent lantern that does nothing reads as a bug |
| 2 | Who takes N3, the tests in S12, and S14? | Hand to Codex, as before; or leave | Hand to Codex |
| 3 | Should a house's contents be fuel: furniture with a finish that can flash, oil stores, coal stores? | Yes, all three, placed by room; yes, stores only; no | Yes, all three, after the lattice decision, because each is one fuel class on a tile there and a new special case here |
| 4 | Round 1's decisions 1 to 5 and whether to start rung 2 | See rounds 1 and 2 | Unchanged: start rung 2 |

## Independent verification

| Finding | Raised by | Re-checked on `c855e62` | Result |
| --- | --- | --- | --- |
| Codex's claims for the three handed items | Codex | The [re-check](2026-11-10-hostile-review-round-2-recheck.md) | Hold |
| N3 | Reviewer | `r07` re-run; `lantern-dud.mjs` written separately, another stance, against `26931d9`; the cause lines read | Holds: 7 duds in 28 throws against 0 |
| S15 | Reviewer | `r06` re-run on a quiet machine; browser A/B in one session | Holds |
| S13 | Reviewer | `r17` re-run | Holds |
| S14 | Reviewer | The switch read at `housing-heat-volumes.js:7`; the 13-of-112 count not re-derived | Holds as code |
| S12, S16, S17, D20 to D31 | Reviewer | Result files read; not re-run | The reviewer's measurements |
| M1, M2, M4, the clock, the climb ratio | Rounds 1 and 2 | Bench re-run | Unchanged |

`node tools/check.mjs` passes on `c855e62`: 291 tests, exit 0.

## Not checked

- **Appearance.** No pixel was judged, including the flame fit on floor patches that Codex's own review covered.
- **Lanterns against a joined Monroe row, during a collapse, or on the cottage-pair map.** Tool sweeps used single houses.
- **Wind on street houses.**
- **Where the extra frame time goes.** No profile was taken.
- **Phones,** and any second desktop. The absolute frame time still moves between sessions.
- **The lacquer history** beyond one search, and any real burning rates.
