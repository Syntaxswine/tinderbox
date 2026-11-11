# Rules for how fire travels: a proposal to implement

- **Asked by the owner, 2026-11-11:** "i would like you to use your reasoning to come up with the rules for fire travel to implement."
- **What this is:** a rule set, reasoned from the owner's decisions and from what three review rounds measured. It is a proposal for the architect's contract. The reviewer builds none of it.
- **Trialled twice, outside the game, and reviewed once.** The rules as first written failed most of their targets. A hostile review of the corrected rules scored them 3 out of 10 and was right on every must-fix item. **The rules below are the second version, rewritten after that review.** The sections at the end give the second trial's results, what the review found, and what is still missed. The targets were written before the first trial and have not been changed.
- **Tree:** `c855e62`.

## What the rules must satisfy

The owner's words, each a constraint:

| # | The owner | Constraint |
| --- | --- | --- |
| a | "i want fire to spread easily and be tracked in a tile by tile modular way that moves along every axis." | One rule, on tiles, in three dimensions |
| b | "the tile is a fire unit, but it draws from the tiles around it" | No room or house objects in the fire rule. A tile's fire depends on its neighbours |
| c | "real fire is bidirectional. heat rises and flame goes up easy, but also burning materials drop down and carry fire to lower levels." | Up by heat, down by falling material |
| d | "minute or more" | A house burns for at least a minute after one match |
| e | Lacquer on furniture; oil and coal stored at points in the house | What a tile holds changes how it burns |
| f | Fire through a window: "agreed" | Openings pass tools and flame |
| g | "buildings should be usable" | The same tiles the bear walks through carry the fire |

Measured facts the rules must fix or keep:

- **Keep:** a grass front at about 1.5 m/s; a ground front within 7 % in nine directions; identical state under any frame schedule; a fuel ledger that closes.
- **Fix:** a house fully alight in 10 s and spent in 21 s; fire that climbs only 5 to 23 % faster than it creeps; fire that cannot cross 0.5 m of bare ground or leave a burning house; collapse on a 150 s clock; several trackers with their own units.

## The rules

### Rule 1. The world is tiles, and a tile holds things

A tile is a box of space: 0.5 m by 0.5 m in plan, one half-storey (1.06 m) tall. Only tiles that hold something, or are next to fire, exist in memory.

A tile has:

- **Heat**, one number, from 0 to a ceiling.
- **Fuels**, a short list. Each has a class, an amount, and optionally a finish.
- **Six faces.** Each face is open, glass, or a surface (wall, floor, roof, shut door). A surface is itself fuel that belongs to the tile it bounds, or it is masonry and never burns.
- **Support:** what holds its contents up, which is the floor surface under it, or the ground.

Nothing else is stored. There is no house state, no room state and no section clock. **The rule may read only tiles, fuels and faces.** The first trial kernel broke this in five places (it read whether a tile was indoors, its room, its building, a flag for outside walls, and the class name "coal"); the second reads none of them. Outdoor air next to a wall is a tile like any other, holding nothing.

**The time step is part of the rules: 1/30 s.** Results move with it.

### Rule 2. A fuel lights when its tile is hot enough, and burns down

Each fuel class has four numbers: the heat at which it starts to char, how long it chars before it lights, how long a full tile of it burns, and how much heat it gives while burning.

- **A fuel chars before it lights.** While the heat it is exposed to is above its lighting point, it chars at a rate in proportion to that heat, and lights after its delay: almost none for grass, oil and lacquer, 3 s for frame timber, 5 s for clapboard, 15 s for coal. Below its lighting point the char fades.
- A surface is exposed to the hotter of the two tiles it stands between.
- While burning it loses amount at its own rate and adds its heat to the tile.
- When its amount reaches zero it is spent. Spent fuel leaves ash, which is not fuel.
- **A finish is a thin fuel on top of another.** It has its own, lower, lighting point and burns for a few seconds. Lacquer lights from a touch and its flame then heats the wood under it. That is the whole of the lacquer rule.

### Rule 3. A tile draws heat from the tiles around it

Each tick, a tile's heat changes by what its 26 neighbours send it, plus what its own burning fuels give, minus what it loses.

- **A burning neighbour sends heat** in proportion to its output, divided by distance to the power 1.5, and multiplied by the face between them (Rule 5) and by direction (Rule 4). The power 1.5 is what makes a grass front run at nearly the same speed along the grid and across it.
- **One burning tile must be able to light its neighbour alone.**
- **Every tile loses the same share of its heat each second.** There is no enclosure term.

**Rooms do not come from loss.** The first version of this rule said they did, and review round 1 showed the opposite: the first kernel cooled indoor tiles faster than outdoor ones, and doing what the rule said made the house burn in half the time. Rooms come from Rule 5: shut doors, partitions and floors that hold fire on the side that was lit.

### Rule 4. Up is easy, sideways is normal, down is hard

Heat sent to a neighbour is multiplied by where that neighbour is:

| Neighbour | Multiplier | Why |
| --- | ---: | --- |
| Directly above | 3 | Flame and hot gas rise |
| Diagonally above | 2 | A flame leans as it climbs |
| Level | 1 | The reference |
| Diagonally below | 0.06 | |
| Directly below | 0.04 | Heat barely travels down. Fire reaches lower levels by Rule 7 |

The first values for down, 0.4 and 0.25, let heat go down an open stairwell and light the ground floor in 3.4 s. The first version also sent a blocked upward share sideways under a ceiling; review round 1 measured no effect from it and it is gone.

**The ratio of climb to creep is hardly set by these multipliers.** A tile above a fire sits at the heat ceiling whatever the multiplier, so the ratio is set mostly by the heat ceiling and by a tile being twice as tall as it is wide. On a bare wall, changing up and diagonally up from 3 and 2 to 2 and 1.5 moved the ratio from 4.16 to 3.79; changing the heat ceiling from 4 to 3 moved it to 3.31.

### Rule 5. A face decides what passes

| Face | Heat passed | Changes when |
| --- | ---: | --- |
| Open air | 1 | |
| Open door, empty window frame | 1 | |
| Glass window | 0.05 | Glass breaks when the tile on either side passes a set heat, or when a lantern or the flamethrower hits it. Then 1 |
| Timber wall, partition, shut door, floor or roof | 0.02 | It is fuel. When it is spent the face is open |
| Masonry, stone plinth | 0.005 | Never |

So a window is not a special case. It is a face that starts nearly shut and opens when the fire or the bear breaks it, after which flame goes through it by Rule 3.

Three more face rules, each added because a trial failed without it:

- **A surface burns from the side it was lit on.** Its heat goes to the tile on that side. The far side's share grows as the surface is consumed (the consumed share to the fourth power), so a partition holds a fire for most of its burn time and then lets it through. Through a floor to the tile below, the far share is also multiplied by Rule 4's "down".
- **A wall is one surface from storey to storey.** These houses are taken to be balloon framed, with stud spaces that run from sill to roof. That is an assumption of these rules about 1890s catalogue houses, not something read from the plans. Two wall surfaces in the same plane, one above the other, pass a little heat (0.05) between their tiles past the floor that meets them. In the first kernel this was 1, and it made every ceiling leak along every wall.
- **Doors start shut.** A door is its own fuel class, thinner than the partition round it.

### Rule 6. A hot fire reaches across a gap

A burning tile with a clear line to a tile up to 3 m away, not its neighbour, warms it by half its output divided by the square of the distance. A line is clear when every face it crosses is open. Reach is level or upward, never down. Grass and embers reach with a tenth of their output. Warmth that arrives this way chars fuel (Rule 2) but does not heat the tile.

**Reach is for fire in the open.** A tile reaches, and is reached, only if no closed face stands above it in its column: nothing between it and the sky. Under a roof or a floor, fire spreads by Rule 3 alone. When a roof has burnt away, what burns under it reaches out.

This is worked out from faces, not from a label. The first kernel switched reach off "inside a building", which was a house object in the fire rule. On a panel of ten strikes with every other number the same, allowing reach under cover brought half the house forward from 27 to 52 s to 23 to 42 s and the struck room from 7 to 37 s to 2 to 23 s. On one house it tripled the mean cost of a step (4.0 ms against 1.3 ms) and made the worst step 127 ms against 26 ms (`results/reach-under-cover/`). The limit is a choice made for speed and for timing, and it has a cost in realism: a burning room does not light the far side of itself across open floor, and a burning room does not reach out through its own broken window until its wall or roof is gone.

- One burning grass tile gives too little to light anything across 0.5 m of paving. A street stays a barrier to a lawn fire.
- A window with a burning room behind it, or a burning wall, is many tiles in a row. Together they can light the wall of the house next door across a 2 m side yard.

Reach is the owner's round 1 decision 2, still open. The value proposed here, 3 m between tile centres, lights a house across a 2 m gap of bare ground and not across 2.5 m. **The shipped street's side yards look wider than that** (about 3 to 5 m by the positions and plan widths in `src/content/neighborhood.js`; the placement origin was not confirmed), **and they are grass.** On that street this rule would never light a neighbour, and the lawn would light every neighbour. That is the owner's open decision "should a lawn fire always take everything", and these rules do not settle it.

### Rule 7. What burns through lets go, and what falls carries fire down

When a surface that supports a tile is spent, everything that tile was holding falls.

- It lands in the first tile below whose floor or ground still holds.
- It arrives with the amount it had left, burning if it was burning, and gives that tile a pulse of heat. Falling does not light what was not lit.
- **The last 15 % of a surface does not burn in place. It falls as embers** when the rest is spent: into the surface's own tile if that still has a floor or ground, with no pulse, or to the first tile below that has. Nothing is created. The first kernel made embers out of nothing, a quarter of all the fuel it burnt.
- A liquid falls like anything else, when the floor under it fails. The first version said oil runs through a floor at once; no trial has run that, and it is withdrawn.

So fire goes down by moving fuel, not by sending heat. This rule also replaces the collapse clock: a part of a house comes down when what held it has burnt, and the heat of the wreck is whatever is still burning in the tiles where things landed.

### Rule 8. Stores

A store is a large amount of one fuel in one tile.

- **Lamp oil.** Low lighting point. When its tile reaches a burst heat the can fails: its oil spreads, lit, to the tiles of its own layer within 1.5 m that it can reach without crossing a closed face, and each gets a pulse of heat.
- **Coal.** High lighting point, a long burn, modest heat. It does little while the house burns, falls when its floor goes (lit or not), and is the last thing burning in the wreck.

### Rule 9. Air moves fire sideways

**Not in either trial.** Wind, where a map has it, multiplies the heat a tile sends downwind and divides what it sends upwind, and carries embers (Rule 7's hot ash) along the ground. The Ashland pair's wind and ember rules already do this and should be kept as the source.

### Rule 10. Tools put heat or fuel into tiles

**Only the match is in the trials.** A match lights one fuel; held against a surface, it lights the side it is held on.

| Tool | What it does to tiles |
| --- | --- |
| Match | Lights the lightest fuel in one tile within reach |
| Torch | The same, repeatedly |
| Flamethrower | Heats every tile along each ray, at the ray's height, until a face that passes less than half stops it. Glass breaks and the ray goes on |
| Lantern | Flies as now. It breaks on the first face that would stop it or on a floor. Its oil goes into the tile it broke in and runs by Rule 8: down off stone to the nearest tile that can hold it. Glass breaks and the lantern goes through |
| Poured gas | A fuel in ground tiles, as now |

The dud lantern of round 3 (N3) cannot happen under this rule: oil always ends in a tile that can hold it.

### Rule 11. What the fire does to the bear and the world

**Not in either trial.** Damage, explosions and anything else that reacts to fire read the heat of the tile they are in. A burning house then hurts whoever stands in or beside it, at any height, with no separate rule.

### Rule 12. Bookkeeping that must not change

- Only burning and warm tiles are visited each tick. At the peak of a house fire that is every tile of the house, so this saves nothing when it matters most.
- Each tick lists the tiles that changed; nothing is copied whole. Not in either trial.
- The same inputs give the same state under any frame schedule, which needs one fixed step (1/30 s). No choice is a random draw. In a step, every tile's heat is settled before any fuel chars or burns, so the order tiles are visited in does not change what a fuel is exposed to.
- Fuel is conserved: laid, burnt and left must sum, and nothing is created.

## Fuel classes, as first written

Superseded by the table under "The second trial". Kept to show what changed.

Lighting point is in today's heat units (grass 0.85, wood 1.1, gas 0.6). Burn time is for a full tile. Output is against a clapboard wall as 1.

| Class | Lights at | Burns for | Output | Notes |
| --- | ---: | ---: | ---: | --- |
| Grass | 0.85 | 3 s | 0.15 | As today |
| Poured gas, lamp oil | 0.6 | 14 s per tile of pool | 3 | Flows |
| Clapboard, shingle | 1.1 | 25 s | 1 | Today 8 to 10 s |
| Floor and frame timber | 1.3 | 60 s | 1.2 | Supports. Its burn time sets when things fall |
| Furniture | 1.1 | 30 s | 1.5 | Per piece, in the tile it stands in |
| Cloth, bedding | 0.8 | 10 s | 1 | |
| Lacquer finish | 0.5 | 4 s | 1.6 | A finish (Rule 2). One piece in four at most |
| Coal | 1.6 | 300 s | 0.8 | A store |
| Ash and embers | 0.7 | 6 s | 0.3 | What falls from spent surfaces |

The longer burn times are how the house reaches "a minute or more". Spread between tiles stays quick; each tile then burns for longer, and frame timber longest.

## Targets the rules must meet

To be measured on the shipped street with the review's probes, before any of this is accepted.

| # | Measurement | Target | Today |
| --- | --- | --- | --- |
| 1 | Grass front speed, nine directions | 1.5 m/s, within 7 % | 1.5 m/s, 7.2 % |
| 2 | Lawn fire reaches a clapboard wall and lights it | Under 2 s | 0.93 s |
| 3 | Fire up a wall against along it | 2.5 to 3.5 to 1 | 1.05 to 1.21 to 1 |
| 4 | One match on a wall: the room behind fully alight | 10 to 20 s | The whole house in 10 s |
| 5 | Same: half the house alight | 40 to 70 s | 7.2 s |
| 6 | Same: flame in the house for | 90 s or more | 21 s |
| 7 | Same: first floor or roof part falls | When its support is spent, between 60 and 150 s | 150 s, on a clock |
| 8 | A fire started on the upper floor reaches the ground floor | Only after something falls; then within 5 s of the fall | By links, in a few seconds |
| 9 | A kitchen fire against a bedroom fire, same house | A stated, measured difference in time to half alight and in heat left in the wreck | None |
| 10 | Lawn fire across 0.5 m of paving | Does not cross | Does not cross |
| 11 | A fully burning house lights the clapboard house 2 m beside it | Yes, within 30 s | Never |
| 12 | The same across the street, 8 m | No | No |
| 13 | A lantern anywhere on or beside a house | Never a dud | 496 of 2,796 on two houses |
| 14 | Same state under five frame schedules; ledger closes | Yes | Yes |
| 15 | Simulation cost per frame, burning street | No more than today's | About 3 to 5 ms |

## The second trial, 2026-11-11

Evidence: [`evidence/fire-travel-rules-trial/`](evidence/fire-travel-rules-trial/README.md). It is a stand-alone kernel, not the game, and nothing in the game changed. The scene is built from the real catalogue plans: rooms, windows, doors and stairs.

**Of the 14 targets that could be tested, 7 are met, 1 is met on the edge, 4 are partly met and 2 are missed.** Targets 4 to 8 are counted over 101 strikes: on each of the six plans, a match held outside the middle of each outside wall, the same held inside, and the furniture lit in every room.

| # | Target | Result | |
| --- | --- | --- | --- |
| 1 | Grass front 1.5 m/s, within 7 % | Straight fronts 1.58 m/s along the grid and 1.52 across it. From one tile, timed between 6 m and 24 m out in 32 directions, 1.50 to 1.58 | Met |
| 2 | Lawn fire lights a wall in under 2 s | 1.967 to 2.000 s, on 12 walls of three plans | **On the edge** |
| 3 | Up a wall against along it, 2.5 to 3.5 to 1 | 3.31 to 1 on a bare wall (0.50 m/s up, 0.15 m/s along). In a house the creep slows at each partition and the ratio is higher | Met on a bare wall only |
| 4 | Room behind a match on a wall fully alight, 10 to 20 s | Match held outside: 4 of 24 in range, 16 to 41 s, median 27 s. Held inside: 14 of 24, 4 to 29 s, median 17 s. Furniture lit in a room: 2 to 27 s, median 12 s | **Missed** |
| 5 | Half the house alight, 40 to 70 s | 58 of 101 in range; 26 to 77 s, median 43 s. By plan, the median runs from 36 s (Hopkins 12, 3 of 16 in range) to 52 s (Monroe row, 12 of 18) | Partly |
| 6 | Flame in the house for 90 s or more | 101 of 101; 131 to 236 s | Met |
| 7 | First upper floor or roof part falls, 60 to 150 s | 101 of 101; 69 to 81 s | Met, see below |
| 8 | An upstairs fire reaches the ground floor only after something falls, then within 5 s | Never before a fall, 0 of 21. Within 5 s of the first fall: 20 of 21; the other waits 11 s | Partly |
| 9 | A kitchen fire differs from a dining-room fire | The kitchen itself is alight at 9.5 s against 15.1 s, its oil going at 0.1 s. The house reaches half **later** from the kitchen: 42.6 s against 37.3 s. At 300 s only the coal burns in either | Met on the trial's 5 s mark, in the direction nobody expected |
| 10 | Lawn fire does not cross 0.5 m of paving | Does not, square to the grid or diagonal | Met |
| 11 | A burning house lights the house 2 m beside it within 30 s | Bare ground, match on the far wall or in the kitchen: 8.4 s after the facing wall first burns, both times. At 2.5 m and wider, never | Met at 2 m |
| 12 | Not across 8 m | Bare ground: never. Lawn between: lit at 18 s, carried by the grass | Partly |
| 13 | A lantern is never a dud | | Not tested: no plinth, no lantern |
| 14 | Same state under five frame schedules; ledger closes | Ledger closes to 6e-8 in 101 burns and nothing is created. Frame schedules not tested: the kernel has one fixed step | Partly |
| 15 | Cost per frame no more than today | Per step of 1/30 s, which covers two of today's frames. One house: 1.3 ms mean, 7 ms at the 95th centile, 26 to 30 ms worst. Three burning houses on a lawn: 4.8 ms, 11 ms, 96 to 104 ms worst. Today: 3 to 5 ms per frame | **Missed on the worst step** |

What the results mean:

- **2 is on the edge.** One more step of delay and it fails. It was 1.53 s before the heat ceiling was lowered to fix target 3.
- **4 is missed, and where the match is held decides it.** A match held outside burns the outside of the wall. The fire gets in when a window above breaks or the wall burns through, so the room behind takes about 27 s, and by then the fire has often climbed the outside and is upstairs. Held inside, the median is 17 s and 14 of 24 are in range.
- **5 depends on the plan.** The small plans go faster. No setting found puts both 4 and 5 in range on most strikes: what speeds a room speeds the house.
- **7 is a table number.** A floor falls when its frame timber is spent, and frame timber burns for 68 s once lit. Every first fall is that plus the time to light. It is not a clock on the house, but it is one number.
- **9: contents still matter less than the shell,** and not in a way anyone would design. The oil makes the kitchen go at once; why the rest of the house is then slower was not looked into.
- **12 and the street:** with grass between houses, a match on a wall lights the grass in 0.4 s and the grass lights every wall it touches. The same match gets the struck house to half alight in 18 s on a lawn against 32 s on bare ground. On the shipped street the lawn decides, not Rule 6.
- **15:** the mean is in today's range and the worst steps are not. They are the steps that work out reach (Rule 6), twice a second. With reach switched off, one house costs 0.7 ms mean and 2.4 ms worst. The kernel is unoptimised and today's figure is the whole game street in a browser, so this is not a like-for-like comparison in either direction.
- **The time step:** at 1/60, 1/30 and 1/15 s one wall strike gives room alight at 27.3, 27.9 and 29.4 s and half the house at 50.2, 52.1 and 54.7 s. Grass speed is quantised by the step: a front crosses a tile in a whole number of steps, so its speed moves in jumps of 5 to 6 %.

### The numbers, second version

| Class | Chars above | Delay | Burns for | Output |
| --- | ---: | ---: | ---: | ---: |
| Grass | 0.85 | 0.18 s | 3 s | 0.7 (a tenth of it across a gap) |
| Poured gas, lamp oil | 0.6 | 0 | 14 s | 3 |
| Clapboard | 1.1 | 5 s | 20 s | 1 |
| Partition | 1.1 | 5 s | 90 s | 1 |
| Door | 1.1 | 5 s | 50 s | 1 |
| Roof | 1.1 | 3 s | 80 s | 1 |
| Floor and frame timber | 1.3 | 3 s | 80 s | 1.2 |
| Furniture | 1.1 | 3 s | 30 s | 1.5 |
| Cloth, bedding | 0.8 | 0.5 s | 10 s | 1 |
| Lacquer finish | 0.5 | 0 | 4 s | 1.6 |
| Coal | 1.6 | 15 s | 300 s | 0.8 |
| Embers | 0.7 | 0 | 8 s | 1 (a tenth across a gap) |

A surface burns in place for 85 % of its time; the rest falls as embers.

| Rule | Number | Value |
| --- | --- | ---: |
| 1 | Time step | 1/30 s |
| 3 | Heat sent per unit of output, level, one tile away | 4 per second |
| 3 | Power of distance | 1.5 |
| 3 | Loss, every tile | 2 per second |
| 3 | Heat ceiling | 3 |
| 4 | Up, diagonally up, diagonally down, down | 3, 2, 0.06, 0.04 |
| 5 | Glass, timber, masonry | 0.05, 0.02, 0.005 |
| 5 | Glass breaks at | 1.6 |
| 5 | Far side's share of a burning surface | consumed share to the power 4 |
| 5 | A wall past a floor | 0.05 |
| 6 | Reach, gain, worked out every | 3 m, 0.5, 0.5 s |
| 6 | Reach under cover | None |
| 7 | Share that falls as embers; pulse on landing | 15 %, 2.5 |
| 8 | Oil bursts at; spreads over | 1.4, 1.5 m |

## Review round 1, 2026-11-11, and what changed

The owner asked for the review ("Review it"). One hostile reviewer read the corrected rules and the first kernel and ran its own probes: [`evidence/fire-travel-rules-trial/reviewer-round-1/REPORT.md`](evidence/fire-travel-rules-trial/reviewer-round-1/REPORT.md). **Score: 3 out of 10.** I re-ran its reproductions for M2, M3, M4 and M6 and got its numbers. Every must-fix item was right.

| | The reviewer found | What was done |
| --- | --- | --- |
| M1 | Grass passed only at the radius and the eight directions the trial chose. Steady fronts ran 1.88 and 1.75 m/s | Measured on steady fronts and in 32 directions past the start-up. Distance power changed from 1 to 1.5 and grass delay to 0.18 s |
| M2 | Rule 3 said rooms come from enclosure. The kernel cooled indoor tiles faster, and the rule as written halved the burn | Rule 3 rewritten: one loss for every tile. Rooms are credited to Rules 5 and 6 |
| M3 | The fire rule read `inside`, `room`, `building`, `radiantTarget` and the class "coal" | All five removed. Reach is limited to tiles open to the sky, which is worked out from faces; oil spreads by line of sight; falling lights nothing |
| M4 | Targets 3, 4, 5 and 8 failed when the match or the plan moved | The trial now counts every plan and strike. 4 is reported as missed and 5 and 8 as partly met. 3 is measured on a bare wall and said to hold only there |
| M5 | A quarter of the fuel burnt was created as embers; ground floors "fell" onto themselves | Embers are the last 15 % of the surface that sheds them. Nothing is created. A fall is only a fall if something moves down |
| M6 | The neighbour result sat on a half-tile edge, with the match on the facing wall; the street's gaps are wider and grassed | Match moved to the far wall and the kitchen; gaps from 1 to 8 m reported, bare and lawn. The street finding is in Rule 6 and is the owner's to decide |
| M7 | "The same order as today's" was false at the peak | Cost reported as mean, 95th centile and worst step, and target 15 marked missed. Links are now rebuilt only round a face that changed, and reach is not worked out under cover |
| S1 | Results move with the time step | The step is in Rule 1 and its effect is reported |
| S2 | Fire goes up through a ceiling as slowly as down | Not re-measured. A floor lit from below now passes a growing share upward as it burns. From a ground-floor strike, something upstairs is first lit at 1.9 to 26 s, median 3.5 s, mostly by the outside wall, the windows and the stair |
| S3 | Rule text with no code | Oil through a floor withdrawn. Rules 9, 10 and 11 marked as not trialled |
| S4 | Target 7 passes by one table number | Said so under the results |
| S5 | A diagonal strip of paving one tile wide was crossed | It now holds at one and two tiles wide. The likely cause is that diagonal neighbours receive less; that was not isolated |
| S6 | "Meet 12" did not match the table | The first trial's table is withdrawn |
| S7 | The order tiles are visited in changed results slightly | Heat is settled for every tile before any fuel chars |
| S8 | Contents change almost nothing | Not re-measured without contents; see target 9 |
| S9 | Windows are only found on the 1 m grid | Not fixed. It is a limit of the scene builder |

The reviewer's own probes ran against the first kernel (commit `d78005b`) and its copies of it; they do not run against the second.

## The first trial, withdrawn

The first trial (same day, commit `d78005b`) reported 12 of 14 testable targets met after nine corrections. Review round 1 showed that five of those passes depended on where the match was, which plan was used, or how the measurement was taken. Its results table is withdrawn. Its printed output is kept in `evidence/fire-travel-rules-trial/results/first-version/`. What survives from it is in the rules above: charring, the lower values for down, the face numbers, doors that start shut, surfaces that burn from one side, and walls that run from storey to storey.

## What these rules decide, and what they leave to the owner

They follow the owner's five answers of 2026-11-11 without change. They also propose a value for three of round 1's open decisions, which the owner has not yet ruled on and said "not yet" to starting:

| Round 1 decision | Proposed here | Still the owner's |
| --- | --- | --- |
| Tile size | 0.5 m by 0.5 m by 1.06 m | Yes |
| Should a burning house light what it does not touch | Across 2 m of bare ground, not 2.5 m (Rule 6) | Yes |
| How much faster fire climbs | About 3 to 1 on a bare wall | Yes |
| Should the landmark maps burn | Not addressed; the rules do not depend on it | Yes |
| Should a lawn fire always take everything | Not addressed. Under these rules it does | Yes |

Two more questions the second trial raises for the owner:

- **Targets 4 and 5.** A room in 10 to 20 s and half the house in 40 to 70 s were my numbers, written before any trial. The rules meet the second on a little over half the strikes and the first only when the match is held inside. Either the numbers move or the rules need something they do not have.
- **Where the bear holds the match.** Outside a wall, the fire climbs the outside first. Inside, it takes the room first. Both are in the trial; the game has to say which a match on a wall means.

## Limits

- **A kernel only, written and tuned by the author of the rules.** One independent review so far, of the first version. The second version has not been reviewed.
- **The numbers are tuned, not sourced.** No fire-science figure was looked up. About fifteen numbers were changed or added between the first version and the second, against the same six plans the results are counted on, using a panel of ten of the 101 strikes. They may not hold on a seventh plan.
- **The tuning runs were not saved.** Only the final numbers and their results are in the evidence.
- **One run per case; no wind; no randomness.** The scene builder finds windows only on the 1 m grid and puts one piece of furniture in the middle of each room.
- **Not tested:** lanterns and every tool but the match, the plinth, wind, a joined row, the landmark maps, the shipped street's layout, a browser, and anything a player would see.
- **Cost is not solved.** See target 15.
- **Reach in the open only** (Rule 6) was added late in the second trial, after the measurements showed what reach under cover cost. It has had the least thought of any rule here.
- **Smoke, water and people inside a burning building are not covered.**
