# Rules for how fire travels: a proposal to implement

- **Asked by the owner, 2026-11-11:** "i would like you to use your reasoning to come up with the rules for fire travel to implement."
- **What this is:** a rule set, reasoned from the owner's decisions and from what three review rounds measured. It is a proposal for the architect's contract. The reviewer builds none of it.
- **Trialled three times, outside the game, and reviewed twice.** The rules as first written failed most of their targets. A first hostile review scored the corrected rules 3 out of 10; they were rewritten. A second scored the rewrite 5 out of 10: every number reproduced, and four "met" verdicts did not survive more plans. **The rules below are the second version with round 2's corrections.** The sections at the end give the results as they now stand, what each review found, and what is still missed. The targets were written before the first trial and have not been changed.
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

A tile is a box of space: 0.5 m by 0.5 m in plan, one half-storey (1.06 m) tall. Only tiles that hold something, or lie against a surface, exist in memory. **A surface always has a tile on both sides;** where nothing else is there, it is an empty tile of air. In the trial the scene builder lays those: one ring round each house on every layer, and one layer above its highest roof. The kernel does not make tiles.

A tile has:

- **Heat**, one number, from 0 to a ceiling.
- **Fuels**, a short list. Each has a class, an amount, and optionally a finish.
- **Six faces.** Each face is open, glass, or a surface (wall, floor, roof, shut door). A surface is itself fuel that belongs to the tile it bounds, or it is masonry and never burns.
- **Support:** what holds its contents up, which is the floor surface under it, or the ground.

Nothing else is stored. There is no house state, no room state and no section clock. **The rule may read only tiles, fuels and faces.** The first trial kernel broke this in five places (it read whether a tile was indoors, its room, its building, a flag for outside walls, and the class name "coal"); the second reads none of them. Outdoor air next to a wall is a tile like any other, holding nothing.

**The time step is part of the rules: 1/30 s.** Results move with it.

### Rule 2. A fuel lights when its tile is hot enough, and burns down

Each fuel class has four numbers: the heat at which it starts to char, how long it chars before it lights, how long a full tile of it burns, and how much heat it gives while burning.

- **A fuel chars before it lights.** While the heat it is exposed to is above its lighting point, it chars at a rate in proportion to that heat, and lights after its delay: almost none for grass, oil and lacquer, 3 s for frame timber, 4.5 s for clapboard, 8 s for a roof, 15 s for coal. Below its lighting point the char fades, by half a second's worth each second.
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

**The ratio of climb to creep is hardly set by these multipliers.** A tile above a fire sits at the heat ceiling whatever the multiplier, so the ratio is set mostly by the heat ceiling and by a tile being twice as tall as it is wide. On a bare wall, with clapboard delay then at 5 s, changing up and diagonally up from 3 and 2 to 2 and 1.5 moved the ratio from 4.16 to 3.79; changing the heat ceiling from 4 to 3 moved it to 3.31. Review round 2 set both multipliers to 1 and still got 2.56.

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

This is worked out from faces, not from a label. The first kernel switched reach off "inside a building", which was a house object in the fire rule. On a panel of ten strikes with every other number the same, allowing reach under cover brought half the house forward from 31 to 52 s to 23 to 44 s and the struck room from 8 to 37 s to 2 to 23 s. On one house it raised the mean cost of a step from 2.2 ms to 5.8 ms and the worst step from 40 ms to 198 ms; with no reach at all the mean is 0.8 ms and the worst 3.5 ms (`results/reach-under-cover/`). The limit is a choice made for speed and for timing.

**This is the weakest rule here, and review round 2 showed how.**

- **Until a roof burns away, "open to the sky" is the same as "not in a house".** No tile of a Hopkins 15 is open to the sky in the first 60 s of its fire. The rule is tiles and faces in its wording and a house in its effect.
- **One tile of cover switches it off.** A fire in the open lights a wall 1.5 m away in 3.3 s. With a roof one tile deep over the fire, or over the air against the wall, never. With a 0.5 m eave on both houses the neighbour 2 m away never lights. The plans have no eaves or porches, so the trial's neighbour results are for houses without them.
- **A burning room does not reach out through its own window.** It reaches out when its wall or roof has gone. A burning room also does not light the far side of itself across open floor.

- One burning grass tile gives too little to light anything across 0.5 m of paving. A street stays a barrier to a lawn fire.
- A wall burning on its outside is many tiles in a row. Together they can light the wall of the house next door across a 2 m side yard; whether they do depends on the plan (target 11).

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

- **Lamp oil.** Low lighting point. The can fails as soon as its oil would light (0.6); there is no separate burst heat. The first two versions listed one, 1.4, and review round 2 showed the number did nothing. When it fails, its oil spreads, lit, to the tiles of its own layer within 1.5 m that it can reach without crossing a closed face, and each gets a pulse of heat.
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
- The same inputs give the same state under any frame schedule, which needs one fixed step (1/30 s). No choice is a random draw. In a step, every tile's heat is settled before any fuel chars or burns. The order tiles are visited in still matters a little, because the pulse from a fall or a burst lands in the middle of a step: review round 2 scrambled the order and moved 125 of 1,545 lighting times, the worst by 0.13 s, and no measure.
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

## Results as they stand, 2026-11-11 (third trial, after review round 2)

Evidence: [`evidence/fire-travel-rules-trial/`](evidence/fire-travel-rules-trial/README.md). It is a stand-alone kernel, not the game, and nothing in the game changed. The scene is built from the real catalogue plans: rooms, windows, doors and stairs.

**Of the 14 targets that could be tested, 6 are met, 5 are partly met and 3 are missed.** Targets 4 to 8 are counted over 101 strikes: on each of the six plans, a match held outside the middle of each outside wall, the same held inside, and the furniture lit in every room.

| # | Target | Result | |
| --- | --- | --- | --- |
| 1 | Grass front 1.5 m/s, within 7 % | Straight fronts 1.58 m/s along the grid and 1.52 across it. From one tile, timed between 6 m and 24 m out in 32 directions, 1.50 to 1.58 | Met, at this time step |
| 2 | Lawn fire lights a wall in under 2 s | 1.77 to 1.83 s on 24 walls of six plans | Met |
| 3 | Up a wall against along it, 2.5 to 3.5 to 1 | 3.35 to 1 on a bare wall (0.55 m/s up, 0.16 m/s along) | Met |
| 4 | Room behind a match on a wall fully alight, 10 to 20 s | Match held outside: 3 of 24 in range, 16 to 41 s, median 27.5 s. Held inside: 12 of 24, 4 to 28 s, median 17 s. Furniture lit in a room: 3 to 31 s, median 12 s | **Missed** |
| 5 | Half the house alight, 40 to 70 s | 45 of 101 in range; 23 to 71 s, median 39.6 s. Match held outside a wall: 0 of 24. Ground-floor rooms: 19 of 32. Upstairs rooms: 17 of 21 | **Missed** |
| 6 | Flame in the house for 90 s or more | 101 of 101; 131 to 227 s | Met |
| 7 | First upper floor or roof part falls, 60 to 150 s | 101 of 101; 69.5 to 77 s | Met, see below |
| 8 | An upstairs fire reaches the ground floor only after something falls, then within 5 s | Nothing inside the ground storey lit before a fall, 0 of 21. But in 10 of 21 a low roof over a ground-storey room was burning before anything fell, lit from the air above it. Within 5 s of the first fall: 20 of 21 | Partly |
| 9 | A kitchen fire differs from a dining-room fire, in time and in heat left in the wreck | The oil and coal bring half the house forward by 0.6 to 6.6 s on six plans. The heat left at 300 s is the same from either room | Partly |
| 10 | Lawn fire does not cross 0.5 m of paving | Does not, square to the grid or diagonal | Met, with little margin |
| 11 | A burning house lights the house 2 m beside it within 30 s | Bare ground, a pair of the same plan, match on the far wall: within 30 s of the facing wall first burning on 3 of 6 plans (6, 25 and 26 s; the others 34, 85 and 98 s). Hopkins 15 with each room struck: 8 of 10. At 2.5 m and wider, never | Partly |
| 12 | Not across 8 m | Bare ground: never. Lawn between: lit at 18 s, carried by the grass | Partly |
| 13 | A lantern is never a dud | | Not tested: no plinth, no lantern |
| 14 | Same state under five frame schedules; ledger closes | Ledger closes to 5e-8 in 101 burns and nothing is created. Frame schedules not tested: the kernel has one fixed step | Partly |
| 15 | Cost per frame no more than today | Per step of 1/30 s, which covers two of today's frames. One house: 2.1 ms mean, 10 ms at the 95th centile, 42 ms worst. Three burning houses on a lawn: 7.8, 19, 134 ms. Eight houses on a lawn, one struck: 25, 65, 350 ms. Today: 3 to 5 ms per frame | **Missed** |

What the results mean:

- **1, 2 and 3 are pinned against each other.** Review round 2 moved the heat sent per second, the loss and the heat ceiling by 10 % each way, and each move pushed one of the three out of range. Target 1 holds at steps of 1/30 and 1/15 s and fails at 1/60, 1/45 and 1/20 s (1.61 to 1.67 m/s along the grid). Grass on a strip narrower than 2 m is slower: 0.75 m/s on 0.5 m, 1.36 on 1.5 m.
- **2 is one constant:** clapboard delay times lighting point over the heat ceiling, 1.77 s, rounded up to a step. The lawn fire does not enter into it. It was 1.97 to 2.03 s before round 2, a miss on about half of all wall tiles; clapboard delay went from 5 s to 4.5 s to give it room.
- **3 is at the top of its band.** Round 2 measured 3.30 to 3.49 on 19 real house walls with the match outside.
- **4 is missed, and where the match is held decides it.** A match held outside burns the outside of the wall. The fire gets in when a window above breaks or the wall burns through, so the room behind takes about 27 s. Held inside, the median is 17 s.
- **5 is missed, and it got worse when the scene got more honest.** Round 2 found the highest roofs had no air above them and so could burn only from below. With air there, fire runs over the roof and the house is half alight sooner: 58 of 101 in range became 45 after a roof delay of 8 s was set to slow it. A match held outside a wall never gives a house in range; the outside burns first.
- **7 is a table number.** A floor falls when its frame timber is spent, and frame and roof timber burn for 68 s once lit. In 40 of the 101 strikes the "first fall" is the embers of a spent roof or wall dropping one half-storey with nothing on them.
- **8 rests on embers.** What falls first is the last 15 % of a wall or door beside the stairwell. Round 2 cut that share to 1 % and only 3 of 21 upstairs fires then reached the ground floor within 5 s of a fall. Whether a low roof catching from the wall above it counts as "reaching the ground floor" is the owner's call.
- **9: stores matter a little, and only to time.** Kitchen against dining room on Hopkins 15 is 45.8 s against 41.1 s with stores and 46.3 s against 42.2 s without: that difference is where the room is, not what is in it. The second trial's "the kitchen is slower" was that confound.
- **10 holds by about 9 %:** round 2 moved grass output, heat sent or loss by 10 % and a diagonal 0.5 m strip was crossed.
- **11 depends on the plan.** Round 2 traced the earlier version: where it worked quickly, fire had run over a low roof and down the outside of the facing wall; where it was slow, the neighbour waited until the first house's roof had gone. That was not re-traced on these numbers.
- **12 and the street:** with grass between houses, a match on a wall lights the grass in 0.4 s and the grass lights every wall it touches. On the shipped street the lawn decides, not Rule 6.
- **15:** in round 2's runs every one of the worst steps was a step that works out reach, twice a second, and they came after the roofs had gone. Round 2 shared that work over the steps between and brought the worst step for one house from 24 ms to 5 ms with the same results; the mean rose by a fifth. That is not in this kernel. With eight houses even the steps with no reach in them averaged 10.6 ms in round 2's run. The kernel is unoptimised and today's figure is the whole game in a browser, so the comparison is rough in both directions, but it is not close.
- **The time step:** at 1/60, 1/30 and 1/15 s one wall strike gives room alight at 27.2, 27.8 and 29.3 s and half the house at 35.1, 36.0 and 38.2 s.
- **Where the furniture stands matters.** It is put at the middle of each room. Round 2 moved it to a corner: one bedroom went from 17.8 s to 25.9 s and its house from 48.8 s to 59.3 s. A mirror image of a plan moved some results by up to 18 %.

### The numbers, second version

| Class | Chars above | Delay | Burns for | Output |
| --- | ---: | ---: | ---: | ---: |
| Grass | 0.85 | 0.18 s | 3 s | 0.7 (a tenth of it across a gap) |
| Poured gas, lamp oil | 0.6 | 0 | 14 s | 3 |
| Clapboard | 1.1 | 4.5 s | 20 s | 1 |
| Partition | 1.1 | 5 s | 90 s | 1 |
| Door | 1.1 | 5 s | 50 s | 1 |
| Roof | 1.1 | 8 s | 80 s | 1 |
| Floor and frame timber | 1.3 | 3 s | 80 s | 1.2 |
| Furniture | 1.1 | 3 s | 30 s | 1.5 |
| Cloth, bedding | 0.8 | 0.5 s | 10 s | 1 |
| Lacquer finish | 0.5 | 0 | 4 s | 1.6 |
| Coal | 1.6 | 15 s | 300 s | 0.8 |
| Embers | 0.7 | 0 | 8 s | 1 (a tenth across a gap) |

A surface burns in place for 85 % of its time; the rest falls as embers. A deposit of embers is 15 % of a tile, so it burns for 1.2 s, not the 8 s a full tile of embers would.

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
| 2 | Char fades, below the lighting point | 0.5 s of char per second |
| 6 | A face blocks a line of sight, or the sky, if it passes less than | 0.5 |
| 8 | Oil spreads over; pulse on each tile | 1.5 m, 2 |

## Review round 1, 2026-11-11, and what changed

The owner asked for the review ("Review it"). One hostile reviewer read the corrected rules and the first kernel and ran its own probes: [`evidence/fire-travel-rules-trial/reviewer-round-1/REPORT.md`](evidence/fire-travel-rules-trial/reviewer-round-1/REPORT.md). **Score: 3 out of 10.** I re-ran its reproductions for M2, M3, M4 and M6 and got its numbers. Every must-fix item was right.

| | The reviewer found | What was done |
| --- | --- | --- |
| M1 | Grass passed only at the radius and the eight directions the trial chose. Steady fronts ran 1.88 and 1.75 m/s | Measured on steady fronts and in 32 directions past the start-up. Distance power changed from 1 to 1.5 and grass delay to 0.18 s |
| M2 | Rule 3 said rooms come from enclosure. The kernel cooled indoor tiles faster, and the rule as written halved the burn | Rule 3 rewritten: one loss for every tile. Rooms are credited to Rules 5 and 6 |
| M3 | The fire rule read `inside`, `room`, `building`, `radiantTarget` and the class "coal" | All five removed. Reach is limited to tiles open to the sky, which is worked out from faces; oil spreads by line of sight; falling lights nothing |
| M4 | Targets 3, 4, 5 and 8 failed when the match or the plan moved | The trial now counts every plan and strike; see the results table |
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

## Review round 2, 2026-11-11, and what changed

One fresh reviewer, on the rewrite (commit `9b521a2`): [`evidence/fire-travel-rules-trial/reviewer-round-2/REPORT.md`](evidence/fire-travel-rules-trial/reviewer-round-2/REPORT.md). **Score: 5 out of 10.** It re-ran the six surveys and the trial and got every number in the record. It judged round 1's items closed except M3 ("closed in letter, partly in effect"), M6 and M7. Its eight must-fix items were all right. I confirmed M1, M2, M4 and M7 by re-measuring them, and M5 by its constant predicting the new wait; M6 is plain in the code; M3 and M8's eight-house figures I took from its probes, and the trial's own eight-house run is slower still.

| | The reviewer found | What was done |
| --- | --- | --- |
| M1 | Target 5 rested on a scene choice: no air above the highest roofs, so they could not burn from above. With air, 2 of 10 panel strikes in range, not 5 | The scene lays air above every roof. Roof delay raised from 3 s to 8 s. Target 5 re-measured: 45 of 101, now marked missed. Rule 1 says who lays the air |
| M2 | Target 11 held on 2 of 6 plans | Measured on six plan pairs and ten strikes: 3 of 6 and 8 of 10. Marked partly |
| M3 | Reach in the open flips with one tile of roof and is "not in a house" until the roof goes | Not fixed. Said plainly under Rule 6 and in Limits. The sky look-up now goes to the top of the world, not 8 layers |
| M4 | Target 9 was marked met on a confound; the oil speeds the house on every plan | Kitchen fires with and without stores on six plans; the wreck's heat compared. Marked partly |
| M5 | Target 2 missed on the plans not tested, and is one constant | Measured on six plans. Clapboard delay 5 s to 4.5 s. The constant is stated |
| M6 | "Oil bursts at 1.4" did nothing; the can bursts at 0.6 | The number is removed from the kernel and the rule |
| M7 | Target 8's count left out low roofs without saying so | The count is in the table: 10 of 21 |
| M8 | "The mean is in today's range" fails with eight houses | Eight houses measured and reported; that sentence is gone |
| S1 to S3, S10 | Targets 1, 2, 3 and 10 are fragile to 10 % and to the step; grass slows on narrow lawns | Said under the results, from the reviewer's numbers; not re-measured |
| S4 | Target 3 is met with no upward multiplier | Said under Rule 4 |
| S5, S6 | Visiting order and the "listens" short cut change the event log a little, and no measure | Rule 12 and the kernel's comment corrected |
| S7 | Furniture position and mirroring move results | Said under the results; not fixed |
| S8 | The "first fall" is often embers dropping one half-storey | Counted in the trial: 40 of 101 |
| S9 | Four numbers were missing from the tables | Added |

The reviewer's probes ran against commit `9b521a2` and its own copies of it.

## The first trial, withdrawn

The first trial (same day, commit `d78005b`) reported 12 of 14 testable targets met after nine corrections. Review round 1 showed that five of those passes depended on where the match was, which plan was used, or how the measurement was taken. Its results table is withdrawn. Its printed output is kept in `evidence/fire-travel-rules-trial/results/first-version/`. What survives from it is in the rules above: charring, the lower values for down, the face numbers, doors that start shut, surfaces that burn from one side, and walls that run from storey to storey.

## What these rules decide, and what they leave to the owner

They follow the owner's five answers of 2026-11-11 without change. They also propose a value for three of round 1's open decisions, which the owner has not yet ruled on and said "not yet" to starting:

| Round 1 decision | Proposed here | Still the owner's |
| --- | --- | --- |
| Tile size | 0.5 m by 0.5 m by 1.06 m | Yes |
| Should a burning house light what it does not touch | Across 2 m of bare ground on some plans, not 2.5 m on any (Rule 6) | Yes |
| How much faster fire climbs | About 3 to 1 on a bare wall | Yes |
| Should the landmark maps burn | Not addressed; the rules do not depend on it | Yes |
| Should a lawn fire always take everything | Not addressed. Under these rules it does | Yes |

Two more questions the second trial raises for the owner:

- **Targets 4 and 5.** A room in 10 to 20 s and half the house in 40 to 70 s were my numbers, written before any trial. The rules meet the second on under half the strikes, and the first on half of them only when the match is held inside. Either the numbers move or the rules need something they do not have.
- **Where the bear holds the match.** Outside a wall, the fire climbs the outside first. Inside, it takes the room first. Both are in the trial; the game has to say which a match on a wall means.

## Limits

- **A kernel only, written and tuned by the author of the rules.** Two independent reviews. The corrections made after the second have not been reviewed.
- **The numbers are tuned, not sourced.** No fire-science figure was looked up. About fifteen numbers were changed or added between the first version and the second, against the same six plans the results are counted on, using a panel of ten of the 101 strikes. They may not hold on a seventh plan.
- **The tuning runs were not saved.** Only the final numbers and their results are in the evidence.
- **One run per case; no wind; no randomness.** The scene builder finds windows only on the 1 m grid and puts one piece of furniture in the middle of each room.
- **Not tested:** lanterns and every tool but the match, the plinth, wind, a joined row, the landmark maps, the shipped street's layout, a browser, and anything a player would see.
- **Cost is not solved.** See target 15.
- **Reach in the open only** (Rule 6) is a house rule in effect, switches off under one tile of cover, and has not been tried on a plan with eaves or a porch. With no reach at all, one house costs about a third as much, and a neighbour across bare ground can be lit only by touching.
- **Several results sit within 10 % of failing:** targets 1, 2, 3 and 10, by the reviewer's sweeps. Target 1 holds only at steps of 1/30 and 1/15 s.
- **Smoke, water and people inside a burning building are not covered.**
