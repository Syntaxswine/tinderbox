# Rules for how fire travels: a proposal to implement

- **Asked by the owner, 2026-11-11:** "i would like you to use your reasoning to come up with the rules for fire travel to implement."
- **What this is:** a rule set, reasoned from the owner's decisions and from what three review rounds measured. It is a proposal for the architect's contract. The reviewer builds none of it.
- **Trialled five times, outside the game, and reviewed five times** (3, 5, 6, 6.5 and 7.5 out of 10). Each review reproduced every number it was given and still found something. The third found that Rule 6, reach across a gap, was the cause of the worst miss, and **Rule 6 is withdrawn.** The fourth found a fault in the kernel itself. The fifth found one sentence that misled and no fault in a result. The rules below are what is left, with the results as they now stand, what each review found, and what is still missed. The targets were written before the first trial and have not been changed.
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

- **A fuel chars before it lights.** While the heat it is exposed to is above its lighting point, it chars at a rate in proportion to that heat, and lights when the char reaches its delay number: almost none for grass, oil and lacquer, 3 for frame timber, 4.5 for clapboard, 8 for a roof, 15 for coal. **The delay number is the time to light at exactly the lighting heat. A hotter tile lights it sooner.** Beside a steady fire a tile settles at 2.71, so a floor catches in about 1.5 s, a clapboard wall in 1.8 s, a partition in 2.0 s and a roof in 3.3 s. Below its lighting point the char fades, by half a second's worth each second, whether or not the tile is being looked at.
- A surface is exposed to the hotter of the two tiles it stands between. Until review round 4 the kernel did not do this for a surface whose own tile was cold and asleep: a wall facing hot air never charred. It does now.
- While burning it loses amount at its own rate and adds its heat to the tile.
- When its amount reaches zero it is spent. Spent fuel leaves ash, which is not fuel.
- **A finish is a thin fuel on top of another.** It has its own, lower, lighting point and burns for a few seconds. Lacquer lights from a touch and its flame then heats the wood under it. That is the whole of the lacquer rule.

### Rule 3. A tile draws heat from the tiles around it

Each tick, a tile's heat changes by what its 26 neighbours send it, plus what its own burning fuels give, minus what it loses.

- **A burning neighbour sends heat** in proportion to its output, divided by distance to the power 1.5 (distance counted in tiles, so the tile above counts as 1 though it is 1.06 m away), and multiplied by the face between them (Rule 5) and by direction (Rule 4). The power 1.5 is what makes a grass front run at nearly the same speed along the grid and across it.
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
| Masonry, stone plinth | 0.005 | Never. No scene in the trial has masonry, so this number has never been exercised |

So a window is not a special case. It is a face that starts nearly shut and opens when the fire or the bear breaks it, after which flame goes through it by Rule 3.

Three more face rules, each added because a trial failed without it:

- **A surface burns from the side it was lit on.** Its heat goes to the tile on that side. The far side's share grows as the surface is consumed (the consumed share to the fourth power), so a partition holds a fire for most of its burn time and then lets it through. Through a floor to the tile below, the far share is also multiplied by Rule 4's "down".
- **A wall is one surface from storey to storey.** These houses are taken to be balloon framed, with stud spaces that run from sill to roof. That is an assumption of these rules about 1890s catalogue houses, not something read from the plans. Two wall surfaces in the same plane, one above the other, pass a little heat (0.05) between their tiles past the floor that meets them. In the first kernel this was 1, and it made every ceiling leak along every wall.
- **Doors start shut.** A door is its own fuel class, thinner than the partition round it.

### Rule 6. Withdrawn: a fire lights only what its tiles touch

**There is no reach across a gap in these rules.** A burning tile heats its 26 neighbours and nothing further.

How far that carries, by Rules 2, 3 and 5 alone:

- **Fuel that lies in a tile, such as grass, is stopped by one empty tile.** The empty tile gets warm; the grass beyond it gets nothing. Any gap of 0.5 m square to the grid stops a ground fire, whatever its size.
- **A surface can be lit across one empty tile,** because it is exposed to the tile it stands against. A lawn fire lights a wall across a bare path 0.5 m wide, 2.2 to 2.9 s after the grass at the path's edge (round 5, all six plans); across a 1 m path it does not. It works the other way too: a burning wall lights grass across one empty tile, and not across two.
- **A burning surface can light a surface 1 m away on the level.** Its heat is in the air tile against it, which warms the next air tile, which the far wall stands against. A wall burning on its outside does it at once; a wall lit from inside does it 11 to 13 s later, when enough of it is consumed, or sooner through a window that has broken (round 5). Six plan pairs light their twins at 0.5 m and at 1 m, after 34 to 70 s, and never at 1.5 m or 2 m.
- **Upward it is two tiles, which is 2.12 m:** a deck that far above a burning roof lights. Downward nothing lights.
- **A store breaks these limits.** Oil spreads 1.5 m when its can fails, so a can on bare ground carried a lawn fire across 2 m of it in round 5's test.

Beyond that, a burning house lights the house beside it only if grass, a fence or anything else that burns joins them.

Rule 6 was reach: a burning tile warming tiles up to 3 m away along a clear line, by the inverse square of the distance. It was tried in three forms and each failed a review.

1. **Everywhere except inside the source's own building** (first trial). That put a house object in the fire rule.
2. **Everywhere** (tried during the second trial). Rooms flashed over in a few seconds, houses burnt too fast, and it took most of the kernel's time.
3. **Only for tiles open to the sky** (second and third trials). Review round 2 showed it was "not in a house" in effect and switched off under one tile of cover. Review round 3 showed the worse fault: the air above a roof is open to the sky, so reach carried fire across a house's own roof at 0.66 m/s against 0.14 m/s without it, faster than fire climbs a wall. The warmth it delivered also had no ceiling: 14 to 17 where heat stops at 3.

What the last two forms buy and cost against no reach, every other number the same (`evidence/fire-travel-rules-trial/reach-options.mjs`; the first form is not in the kernel any more):

```text
no reach (the rules as proposed)
  survey of 101 strikes: half the house in 40 to 70 s on 66, median 45.03 s; room in 10 to 20 s on 2 of 24 outside-wall strikes and 12 of 24 inside
  neighbour 2 m away on bare ground, six plan pairs: lit within 30 s of the facing wall on 0, lit at all in 200 s on 0 (H15 never, H12 never, H09 never, H13 never, ashland never, monroe never)
  one Hopkins 15 burning from its kitchen, per step: 0.9 ms mean, 1.8 ms 95th centile, 3.5 ms worst
reach 3 m, tiles open to the sky only
  survey of 101 strikes: half the house in 40 to 70 s on 41, median 38.83 s; room in 10 to 20 s on 3 of 24 outside-wall strikes and 12 of 24 inside
  neighbour 2 m away on bare ground, six plan pairs: lit within 30 s of the facing wall on 1, lit at all in 200 s on 6 (H15 6 s, H12 72 s, H09 57 s, H13 93 s, ashland 38 s, monroe 41 s)
  one Hopkins 15 burning from its kitchen, per step: 2.9 ms mean, 16.1 ms 95th centile, 51.4 ms worst
reach 3 m, everywhere
  survey of 101 strikes: half the house in 40 to 70 s on 20, median 31.87 s; room in 10 to 20 s on 15 of 24 outside-wall strikes and 0 of 24 inside
  neighbour 2 m away on bare ground, six plan pairs: lit within 30 s of the facing wall on 6, lit at all in 200 s on 6 (H15 6 s, H12 22 s, H09 22 s, H13 22 s, ashland 21 s, monroe 6 s)
  one Hopkins 15 burning from its kitchen, per step: 7.7 ms mean, 30.7 ms 95th centile, 331.5 ms worst
```

**Whether a burning house should light what it does not touch is the owner's round 1 decision 2, still open.** If the answer is yes, it needs a rule that works across a gap and not along a surface, and none of these three is it. The shipped street's side yards are grass (about 3 to 5 m wide by the positions and plan widths in `src/content/neighborhood.js`; the placement origin was not confirmed), so on that street the lawn carries fire to every neighbour in the same row with or without reach. A road runs between the two rows, and under these rules nothing crosses it. That is the owner's other open decision, "should a lawn fire always take everything".

### Rule 7. What burns through lets go, and what falls carries fire down

When a surface that supports a tile is spent, the loose things that tile was holding fall: contents, stores and embers. **Walls, partitions and roofs do not fall in this kernel.** They burn where they stand, even over a floor that has gone. A collapse a player would see is not modelled.

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

**Not in any trial.** Wind, where a map has it, multiplies the heat a tile sends downwind and divides what it sends upwind, and carries embers (Rule 7's hot ash) along the ground. The Ashland pair's wind and ember rules already do this and should be kept as the source.

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

**Not in any trial.** Damage, explosions and anything else that reacts to fire read the heat of the tile they are in. A burning house then hurts whoever stands in or beside it, at any height, with no separate rule.

### Rule 12. Bookkeeping that must not change

- Only burning and warm tiles, and tiles holding a surface against a warm tile, are visited each tick. At the peak of a house fire that is every tile of the house, so this saves nothing when it matters most.
- Each tick lists the tiles that changed; nothing is copied whole. Not in any trial.
- The same inputs give the same state under any frame schedule, which needs one fixed step (1/30 s). No choice is a random draw. In a step, every tile's heat is settled before any fuel chars or burns. The order tiles are visited in still matters a little, because the pulse from a fall or a burst lands in the middle of a step: review round 5 scrambled the order in 24 burns and moved 6 to 508 lighting times in each, the worst by 0.13 s; in 4 of the 24 a measure moved, by 0.03 to 0.04 s.
- Fuel is conserved: laid, burnt and left must sum, and nothing is created.

## Fuel classes, as first written

Superseded by the table under "The numbers, second version". Kept to show what changed.

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

## Results as they stand, 2026-11-11 (fifth trial, after review round 4)

Evidence: [`evidence/fire-travel-rules-trial/`](evidence/fire-travel-rules-trial/README.md). It is a stand-alone kernel, not the game, and nothing in the game changed. The scene is built from the catalogue plans: rooms, partitions, doors between rooms, the stair opening, the windows and front door the game itself gives each plan, and the porch each plan declares. What it leaves out is in Limits.

**Of the 14 targets that could be tested, 4 are met, 1 is met on the edge, 6 are partly met and 3 are missed.** Targets 4 to 8 are counted over 101 strikes: on each of the six plans, a match held outside the middle of each outside wall, the same held inside, and the furniture lit in every room. One of the 24 "walls" is a front door under a porch (Hopkins 15).

| # | Target | Result | |
| --- | --- | --- | --- |
| 1 | Grass front 1.5 m/s, within 7 % | Straight fronts 1.58 m/s along the grid and 1.52 across it. From one tile, timed between 6 m and 24 m out in 32 directions, 1.50 to 1.58 | Met, at this time step |
| 2 | Lawn fire lights a wall in under 2 s | 1.83 to 1.93 s on all 361 ground wall faces that grass touches, six plans, lawn lit from four sides. 43 more faces are behind a porch deck; no grass touches them | **On the edge** |
| 3 | Up a wall against along it, 2.5 to 3.5 to 1 | 3.32 to 1 on a bare wall (0.53 m/s up, 0.16 m/s along). On the houses: walls with nothing against them, 23 of 23 directions in range (2.77 to 3.45); walls behind a porch, 1 of 6 (1.53 to 2.63) | Partly |
| 4 | Room behind a match on a wall fully alight, 10 to 20 s | Match held outside: 2 of 24 in range, 16 to 39 s, median 27.5 s. Held inside: 12 of 24, 4 to 29 s, median 17.5 s. Furniture lit in a room: 3 to 31 s, median 12.5 s | **Missed** |
| 5 | Half the house alight, 40 to 70 s | 66 of 101 in range; 27 to 77 s, median 45.0 s. **With roof delay 3 s, as other timber has, instead of 8 s: 34 of 101, median 38.5 s** | Partly, and only on a tuned roof number |
| 6 | Flame in the house for 90 s or more | 101 of 101; 131 to 236 s | Met |
| 7 | First upper floor or roof part falls, 60 to 150 s | 101 of 101; 69.5 to 78 s | Met, see below |
| 8 | An upstairs fire reaches the ground floor only after something falls, then within 5 s | Nothing inside the ground storey lit before a fall, 0 of 21. In 10 of 21 a low roof over a ground-storey room was burning before anything fell, lit from the air above it. Within 5 s of the first fall: 20 of 21 | Partly |
| 9 | A kitchen fire differs from a bedroom fire, in time and in heat left in the wreck (measured against the dining room, on the same floor) | The oil and coal bring half the house forward by 4.0 to 9.4 s on six plans. In the wreck, the coal burns on alone for 150 to 217 s after the last other flame | Partly |
| 10 | Lawn fire does not cross 0.5 m of paving | Does not, and cannot: see Rule 6 | Met |
| 11 | A burning house lights the house 2 m beside it within 30 s | Bare ground, 2 m: never, on six plan pairs. Hopkins 15 lights its twin at 0.5 m and 1 m | **Missed** |
| 12 | Not across 8 m | Bare ground: never. Lawn between: lit at 18 s, carried by the grass | Partly |
| 13 | A lantern is never a dud | | Not tested: no plinth, no lantern |
| 14 | Same state under five frame schedules; ledger closes | Ledger closes to 5e-8 in 101 burns and nothing is created. Frame schedules not tested: the kernel has one fixed step | Partly |
| 15 | Cost per frame no more than today | Per step of 1/30 s, which covers two of today's frames. Over two runs of the trial: one house 0.8 to 0.9 ms mean, 1.5 to 1.6 ms at the 95th centile. Three burning houses on a lawn: 4.3 to 4.7 and 9 to 11 ms. Eight houses on a lawn, one struck: 16 to 18 ms mean, 35 to 40 ms at the 95th centile. Today: 3 to 5 ms per frame | **Missed at street scale** |

What the results mean:

- **Withdrawing reach, on the same scene and numbers** (the block under Rule 6): target 5 is in range on 66 of 101 strikes against 41 with reach in the open; one house costs 0.9 ms a step against 2.9 ms; and the 2 m neighbour is lit within 30 s on none of six plans against 1. Reach everywhere would light the neighbour on 6 of six and bring the room behind an outside match into range on 15 of 24 walls, and would put half the house in range on only 20 of 101.
- **1, 2 and 3 are pinned against each other.** Review round 4 measured the margins and round 5 confirmed them on the current kernel. Target 1 fails if the heat sent per second rises 5 % or falls 10 %, or the loss falls 10 %. Target 2 fails if the heat ceiling falls 5 %. Target 3 on a bare wall holds at 5 % either way and fails at 10 % (heat sent down, loss up, or ceiling up).
- **1 depends on the step.** By the trial's own test, rounds 4 and 5 found it holds at steps of 1/40, 1/30 and 1/24 s (the last by 0.001 m/s) and fails at 1/60, 1/45, 1/20 and 1/15 s. Grass on a strip narrower than 2 m is slower: round 3 measured 0.75 m/s on 0.5 m and 1.36 on 1.5 m.
- **2 is on the edge and is one constant.** A wall held at the heat ceiling lights after delay times lighting point over what the ceiling settles to: 4.5 x 1.1 / (2.9 x 0.933) = 1.83 s. Where the wall sees a little less, it takes up to 1.93 s; 117 of the 361 faces are at 1.90 s or more. Round 5 started the lawn fire from four more places and the longest wait was 1.97 s, one step short of 2 s. The lawn fire's size does not enter into it.
- **3 is partly met, and the porch is most of why.** A burning porch deck carries fire along the foot of the wall behind it faster than the wall does, and round 4 found a porch roof also holds back the climb. But round 5 struck every ground wall face of the six plans: 283 of 335 directions in range; behind a porch 10 of 46; other walls 273 of 289, and ten of those sixteen misses are nowhere near a porch (from 1.96 to 5.73, on Hopkins 9, Hopkins 13 and the Monroe house). Their cause was not found. The climb itself is one constant, 0.53 m/s on every wall. Rule 4's multipliers hardly set the ratio: round 2 set both upward ones to 1 and still got 2.56.
- **4 is missed, and where the match is held decides it.** A match held outside burns the outside of the wall; the room behind takes about 27 s. Held inside, the median is 17.5 s and half are in range. Round 5 struck every ground wall face of the six plans: outside, 49 of 404 in range; inside, 231 of 404.
- **5 rests on the roof.** Roof delay is 8 where frame timber is 3 and clapboard 4.5, which in a burning house means a roof catches in about 3.5 s where a wall takes 2.1 s and a floor 1.5 s (round 5's medians over four burns). With roof delay 3 a roof catches in 1.4 s. It was raised when reach was running fire across the roofs, and withdrawing reach did not make it unnecessary: with it at 3 s the house is half alight too soon on two thirds of the strikes. Nothing but the target justifies 8 s. By plan, at 8 s, the median runs from 39 s (Ashland, 6 of 14 in range) to 52 s (Hopkins 15, 15 of 18). Round 5 struck all 404 ground wall faces: outside 258 in range, inside 322, every miss under 40 s.
- **7 is a table number.** Frame and roof timber burn for 68 s once lit, and every first fall is that plus the time to light. Round 3 found the first fall carries nothing in any strike: it is the embers of a spent roof or floor. Falls of a porch roof are not counted; round 4 saw one at 71 s, before the counted fall at 78 s.
- **8 rests on embers.** Rounds 4 and 5 cut their share from 15 % to 1 % and only 4 of 21 upstairs fires then reached the ground floor within 5 s of a fall. Whether a low roof catching from the wall above it counts as "reaching the ground floor" is the owner's call.
- **9: stores matter a little, and the floor matters more.** The target says kitchen against bedroom. On Hopkins 15 round 5 measured the kitchen at 49.1 s and the bedrooms, which are upstairs, at 60.8 to 71.5 s; stores change a bedroom fire by under 0.2 s. So that gap is the floor, not the contents. On the same floor, kitchen against dining room is 49.1 s against 48.2 s with stores and 56.2 s against 47.4 s without. Round 4 found why the kitchen is slow: it is shut in by partitions and three doors, and the dining room is open to the living room. The oil makes up for that. The coal lights early from the kitchen and late from the dining room, so the kitchen's wreck goes cold at 309 s and the dining room's at 371 s.
- **10 cannot fail, and that cuts both ways.** Without reach, any single empty tile square to the grid stops a ground fire of any size, unless a surface or a store stands beside it. The list of faults to fix at the top of this record includes "fire that cannot cross 0.5 m of bare ground"; target 10 asks for the opposite on paving, and these rules give the target and not the fix. A strip one tile wide on the diagonal (0.35 m across) holds as tuned and was crossed in round 4's sweep with the heat sent up 10 % or the loss down 10 %.
- **12 and the street:** with grass between houses, a match on a wall lights the grass in 0.4 s and the grass lights every wall it touches. The struck house is half alight at 22 s on a lawn against 54 s on bare ground.
- **15:** one house is well inside today's cost and eight are not: 16 to 18 ms a step in the trial's runs (13 to 16 in the reviewers', alone on the machine), against today's 6 to 10 for the same span of time. Worst-step times are not quoted: they ran from 3 to 18 ms for one house across runs. The kernel is unoptimised and today's figure is the whole game in a browser, so the comparison is rough in both directions.
- **The time step:** at 1/60, 1/30 and 1/15 s one wall strike gives room alight at 27.4, 28.0 and 29.4 s and half the house at 51.6, 53.6 and 57.1 s.
- **Where the furniture stands matters to the room, not the house.** Round 4 moved it to a corner on the fourth trial's kernel: the median room went from 12.5 s to 17.4 s, and target 5 from 68 of 101 to 69.

### The numbers, second version

| Class | Chars above | Delay | Burns for | Output |
| --- | ---: | ---: | ---: | ---: |
| Grass | 0.85 | 0.18 s | 3 s | 0.7 |
| Poured gas, lamp oil | 0.6 | 0 | 14 s | 3 |
| Clapboard | 1.1 | 4.5 s | 20 s | 1 |
| Partition | 1.1 | 5 s | 90 s | 1 |
| Door | 1.1 | 4.5 s | 50 s | 1 |
| Roof | 1.1 | 8 s | 80 s | 1 |
| Floor and frame timber | 1.3 | 3 s | 80 s | 1.2 |
| Furniture | 1.1 | 3 s | 30 s | 1.5 |
| Cloth, bedding | 0.8 | 0.5 s | 10 s | 1 |
| Lacquer finish | 0.5 | 0 | 4 s | 1.6 |
| Coal | 1.6 | 15 s | 300 s | 0.8 |
| Embers | made burning | | 8 s | 1 |

The delay column is the time to light at exactly the lighting heat; at the heat a tile settles to beside a steady fire, 2.71, divide by 2.71 and multiply by the lighting point. A surface burns in place for 85 % of its time; the rest falls as embers. A deposit of embers is 15 % of a tile, so it burns for 1.2 s, not the 8 s a full tile of embers would.

| Rule | Number | Value |
| --- | --- | ---: |
| 1 | Time step | 1/30 s |
| 3 | Heat sent per unit of output, level, one tile away | 4 per second |
| 3 | Power of distance | 1.5 |
| 3 | Loss, every tile | 2 per second |
| 3 | Heat ceiling | 2.9 |
| 4 | Up, diagonally up, diagonally down, down | 3, 2, 0.06, 0.04 |
| 5 | Glass, timber, masonry | 0.05, 0.02, 0.005 |
| 5 | Glass breaks at | 1.6 |
| 5 | Far side's share of a burning surface | consumed share to the power 4 |
| 5 | A wall past a floor | 0.05 |
| 7 | Share that falls as embers; pulse on landing | 15 %, 2.5 |
| 2 | Char fades, below the lighting point | 0.5 s of char per second |
| 8 | Spilt oil is stopped by a face that passes less than | 0.5 |
| 8 | Oil spreads over; pulse on each tile | 1.5 m, 2 |
| | A link weaker than this is dropped; a tile cooler than this goes to sleep, and does not wake the surfaces against it | 0.0001; 0.001 |

What the scene puts in a house, in tile-fulls: a floor, wall, partition, door or roof surface 1 each; furniture 1 in the middle of every room; bedding 0.6 in a bedroom; lacquer 0.3 on one piece in four; oil 3 in a kitchen or pantry; coal 1 in a kitchen.

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

## Review round 3, 2026-11-11, and what changed

One fresh reviewer, on commit `d953ce0`: [`evidence/fire-travel-rules-trial/reviewer-round-3/REPORT.md`](evidence/fire-travel-rules-trial/reviewer-round-3/REPORT.md). **Score: 6 out of 10.** It reproduced the six surveys byte for byte and every figure in the results table, and judged round 2's items closed, with M3 "not fixed, stated". Its four must-fix items were all right. I confirmed M1 and M3 by re-running the surveys with the change made, and M4 by adding its measurement to the survey; M2's porch fact is plain in the plan data.

| | The reviewer found | What was done |
| --- | --- | --- |
| M1 | Target 5 was missed because reach ran along each house's own roof: 0.66 m/s across a roof against 0.14 m/s without. With no reach, 68 of 101 in range against 45. Reach warmth had no ceiling | Rule 6 is withdrawn. The three forms tried are measured side by side in `reach-options.mjs` |
| M2 | "The plans have no eaves or porches" was false: every plan declares a porch. The eave result quoted from round 2 was false on the current kernel | The scene builds each plan's porch. The sentences are gone with Rule 6. Eaves are still not built, and say so in Limits |
| M3 | Two of six houses had no windows, and no house had a front door | Windows and the front door now come from the game's own edge list for every plan |
| M4 | Target 3 was "met" on a bare wall; on house walls it went over 3.5 | Measured on every outside-wall strike of the survey: 26 of 31 in range. Marked partly. Heat ceiling 3 to 2.9 |
| S1 | The wreck was compared at the one moment it could not differ | Compared by when the last thing stops burning |
| S2 | The survey's four walls a plan are not typical | Its all-tile counts are quoted under target 4; not re-run |
| S3 | The neighbour result depends on the neighbour's plan and place | Moot without reach |
| S4 | Cost detail | Re-measured without reach |
| S5 | Dead and missing numbers | Masonry marked as never exercised; embers' unused numbers removed; contents amounts and two thresholds added; "distance in tiles" said |
| S6 | Figures requoted from round 2 had gone stale | Each requoted figure now says which round measured it, or is gone |
| S7 | Rule 7 said more than the code: only loose contents and embers fall | Rule 7 says so |
| S8 | Medians were the upper of two middle values; small wording | True medians; wording fixed |

The reviewer's probes ran against commit `d953ce0`.

## Review round 4, 2026-11-11, and what changed

One fresh reviewer, on commit `06061b0`: [`evidence/fire-travel-rules-trial/reviewer-round-4/REPORT.md`](evidence/fire-travel-rules-trial/reviewer-round-4/REPORT.md). **Score: 6.5 out of 10.** It reproduced the surveys byte for byte and every figure in the results table. Its three must-fix items were all right. I confirmed each by re-measuring: the 1 m neighbour and the path after the fix, the survey at roof delay 3 s, and the wall faces behind a porch.

| | The reviewer found | What was done |
| --- | --- | --- |
| M1 | The kernel did not apply Rule 2 to a surface whose own tile was asleep: a wall facing hot air never charred. A house 1 m away never lit, and a 0.5 m bare path made a house immune to a lawn fire | Fixed: a warm tile wakes the tiles holding a surface against it. The 1 m neighbour lights at 70 s; behind a 0.5 m path all 44 wall faces of Hopkins 12 light, the first at 7 s. Rule 6 says how far fire carries. Everything re-run |
| M2 | Target 5's 68 of 101 depended on roof delay 8 s; at 3 s it was 39 | Not changed. Both figures are in the results table and the verdict says so. On this kernel: 66 and 34 |
| M3 | The porch caused both things marked "not looked into"; target 2 counted three walls no grass touches | Target 2 is measured on every wall face grass touches and marked on the edge. Target 3 is split by walls behind a porch and others |
| S1 | Target 10 cannot fail without reach; the "little margin" was stale | Said, with the other side of it |
| S2, S3 | Target 1 at other steps was misquoted; current margins | Quoted from its measurements |
| S4 | The Monroe house had lost its side windows though it stands alone | It keeps them |
| S5 | One front-wall strike is the front door under the porch | Said |
| S6 | Porch falls are not counted in target 7 | Said |
| S7 | Small errors: a median, the formula's wording, embers at 1 %, the README, worst-step spread | Corrected |

The reviewer's probes ran against commit `06061b0`.

## Review round 5, 2026-11-11, and what changed

One fresh reviewer, on commit `b6cc2a5`: [`evidence/fire-travel-rules-trial/reviewer-round-5/REPORT.md`](evidence/fire-travel-rules-trial/reviewer-round-5/REPORT.md). **Score: 7.5 out of 10.** It reproduced the six surveys and the six roof-delay surveys byte for byte, found the round 4 kernel fix correct for every kind of surface, and found no result wrong. One must-fix, and it was right.

| | The reviewer found | What was done |
| --- | --- | --- |
| M1 | "A roof takes 8 s to catch" was false. The delay number is the time at exactly the lighting heat; in a burning house a roof catches in about 3.5 s, a wall in 2.1 s, a floor in 1.5 s | Rule 2, the fuel table, the target 5 note and the question to the owner now give the times a player would see |
| S1 | Char did not fade while a tile slept, though Rule 2 says it fades | Fixed in the kernel. Its test showed no survey figure moves; the surveys were re-run and are unchanged |
| S2 | A tile laid after the first step was not told about the surfaces against it | Fixed in the kernel. No trial scene lays tiles late |
| S3 | Rule 6's "how far" list left out three routes and one mechanism; one Limits line was false with a store | Added, from its measurements |
| S4 | "The porch is why" did not cover ten misses of target 3 away from any porch | Said, with its counts. Cause still not found |
| S5, S6 | Two requoted figures had moved | Replaced with its figures on the current kernel |
| S7 | The street has a road between its rows; one listed fault is never scored | Said under Rule 6 and target 10 |
| S8 | Target 9 says bedroom; the results said dining room | Both are given |
| S9 | Small errors | Corrected |

The reviewer's probes ran against commit `b6cc2a5`.

## The first trial, withdrawn

The first trial (same day, commit `d78005b`) reported 12 of 14 testable targets met after nine corrections. Review round 1 showed that five of those passes depended on where the match was, which plan was used, or how the measurement was taken. Its results table is withdrawn. Its printed output is kept in `evidence/fire-travel-rules-trial/results/first-version/`. What survives from it is in the rules above: charring, the lower values for down, the face numbers, doors that start shut, surfaces that burn from one side, and walls that run from storey to storey.

## What these rules decide, and what they leave to the owner

They follow the owner's five answers of 2026-11-11 without change. They also propose a value for three of round 1's open decisions, which the owner has not yet ruled on and said "not yet" to starting:

| Round 1 decision | Proposed here | Still the owner's |
| --- | --- | --- |
| Tile size | 0.5 m by 0.5 m by 1.06 m | Yes |
| Should a burning house light what it does not touch | Only within 1 m: Rule 6 is withdrawn. Three forms of reach were tried and measured | Yes |
| How much faster fire climbs | About 3 to 1 on a bare wall | Yes |
| Should the landmark maps burn | Not addressed; the rules do not depend on it | Yes |
| Should a lawn fire always take everything | Not addressed. Under these rules it does | Yes |

More questions the trials raise for the owner:

- **Targets 4 and 5.** A room in 10 to 20 s and half the house in 40 to 70 s were my numbers, written before any trial. The rules meet the second on two thirds of the strikes, and the first on half of them only when the match is held inside. Either the numbers move or the rules need something they do not have.
- **The roof.** Target 5 is met on two thirds of strikes only because a roof is slow to catch: about 3.5 s in a burning house, where a wall takes 2.1 s and a floor 1.5 s. Set like other timber it catches in 1.4 s and the target is missed. If the slow roof is not believable, the target is missed.
- **Where the bear holds the match.** Outside a wall, the fire climbs the outside first. Inside, it takes the room first. Both are in the trial; the game has to say which a match on a wall means.

## Limits

- **A kernel only, written and tuned by the author of the rules.** Five independent reviews. The first four each found a fault in a result; the fifth found none. The corrections made after the fifth have not been reviewed.
- **Ten walls climb outside the band for a reason not found** (target 3).
- **The numbers are tuned, not sourced.** No fire-science figure was looked up. About fifteen numbers were changed or added between the first version and the second, against the same six plans the results are counted on, using a panel of ten of the 101 strikes. They may not hold on a seventh plan.
- **The tuning runs were not saved.** Only the final numbers and their results are in the evidence.
- **One run per case; no wind; no randomness.** The scene builder finds windows only on the 1 m grid and puts one piece of furniture in the middle of each room.
- **Not tested:** lanterns and every tool but the match, the plinth, wind, a joined row, the landmark maps, the shipped street's layout, a browser, and anything a player would see.
- **Cost is not solved.** See target 15.
- **Without a store in the way, no fire crosses more than 1 m of bare ground on the level,** and no ground fire crosses one empty tile. Whether that is wanted is the owner's.
- **The whole-house timing rests on one number,** roof delay, that nothing but the target justifies.
- **What the scene leaves out:** eaves, roof pitch (every roof is flat), porch posts and steps, the plinth, basements, chimneys, windows on a diagonal wall, and a joined row (every house stands alone, so the Monroe house has side windows the game would drop where a neighbour joins). The porch is built but its fuel and its falls are not counted as the house's. Nothing collapses: walls and roofs burn where they stand.
- **Several results sit within 5 to 10 % of failing:** targets 1, 2 and 3, by round 4's sweeps on the fourth trial's numbers. Round 5 re-measured them after the kernel fix and they had not moved.
- **Smoke, water and people inside a burning building are not covered.**
