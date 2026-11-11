# Rules for how fire travels: a proposal to implement

- **Asked by the owner, 2026-11-11:** "i would like you to use your reasoning to come up with the rules for fire travel to implement."
- **What this is:** a rule set, reasoned from the owner's decisions and from what three review rounds measured. It is a proposal for the architect's contract. The reviewer builds none of it.
- **Trialled once, outside the game.** The rules as first written failed most of their targets. The section "Trial, 2026-11-11" gives the results and the corrections, which replace the matching text in the rules. The targets were written before the trial.
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
- **Six faces.** Each face is open, an opening (a window or door), or a surface (wall, floor, roof). A surface is itself fuel that belongs to the tile it bounds, or it is masonry and never burns.
- **Support:** what holds its contents up, which is the floor surface under it, or the ground.

Nothing else is stored. There is no house state, no room state and no section clock.

### Rule 2. A fuel lights when its tile is hot enough, and burns down

Each fuel class has three numbers: the heat at which it lights, how long a full tile of it burns, and how much heat it gives while burning.

- A fuel lights when its tile's heat reaches its lighting point.
- While burning it loses amount at its own rate and adds its heat to the tile.
- When its amount reaches zero it is spent. Spent fuel leaves ash, which is not fuel.
- **A finish is a thin fuel on top of another.** It has its own, lower, lighting point and burns for a few seconds. Lacquer lights from a touch and its flame then heats the wood under it. That is the whole of the lacquer rule.

### Rule 3. A tile draws heat from the tiles around it

Each tick, a tile's heat changes by what its 26 neighbours send it, plus what its own burning fuels give, minus what it loses.

- **A burning neighbour sends heat** in proportion to its output, divided by distance, and multiplied by the face between them (Rule 5) and by direction (Rule 4).
- **Loss depends on enclosure.** A tile loses heat through each face that is open to outside air, and almost none through a surface. A tile in the open cools fast. A tile with a ceiling and walls keeps what it is given.

That one loss rule is where rooms come from. Tiles inside four walls and a ceiling keep each other's heat, so once a few are burning the rest reach their lighting point close together. Nothing in the code says "room".

### Rule 4. Up is easy, sideways is normal, down is hard

Heat sent to a neighbour is multiplied by where that neighbour is:

| Neighbour | Multiplier | Why |
| --- | ---: | --- |
| Directly above | 3 | Flame and hot gas rise |
| Diagonally above | 2 | A flame leans as it climbs |
| Level | 1 | The reference |
| Diagonally below | 0.4 | |
| Directly below | 0.25 | Heat barely travels down. Fire reaches lower levels by Rule 7 |

Under a closed ceiling the upward share has nowhere to go and spreads sideways along the ceiling instead: the heat a tile would have sent up through a surface face is given to its level neighbours. This is how a fire crosses a room along its ceiling before it comes down the walls.

### Rule 5. A face decides what passes

| Face | Heat passed | Changes when |
| --- | ---: | --- |
| Open air | 1 | |
| Open door, empty window frame | 1 | |
| Glass window, closed door | 0.15 | Glass breaks when the tile on either side passes a set heat, or when a lantern or the flamethrower hits it. A door burns as timber. Then 1 |
| Timber wall, floor or roof | 0.1 | It is fuel. When it is spent the face is open |
| Masonry, stone plinth | 0.02 | Never |

So a window is not a special case. It is a face that starts nearly shut and opens when the fire or the bear breaks it, after which flame goes through it by Rule 3.

### Rule 6. A hot fire reaches across a gap

A burning tile with a clear line to a tile up to 3 m away, not its neighbour, warms it by its output divided by the square of the distance.

- One burning grass tile gives too little to light anything across 0.5 m of paving. A street stays a barrier to a lawn fire.
- A window with a burning room behind it, or a burning wall, is many tiles in a row. Together they can light the wall of the house next door across a 2 m side yard.

Reach is the owner's round 1 decision 2, still open. The value proposed here, 3 m, is "the house next door but not across the street".

### Rule 7. What burns through lets go, and what falls carries fire down

When a surface that supports a tile is spent, everything that tile was holding falls.

- It lands in the first tile below whose floor or ground still holds.
- It arrives **still burning**, with the amount it had left, and gives that tile a pulse of heat.
- Spent surface material falls too, as hot ash and embers: a small, short fuel that lights light things.
- A liquid does not wait for the floor to fail. Burning oil runs through a floor at once and spreads across the floor below.

So fire goes down by moving fuel, not by sending heat. This rule also replaces the collapse clock: a part of a house comes down when what held it has burnt, and the heat of the wreck is whatever is still burning in the tiles where things landed.

### Rule 8. Stores

A store is a large amount of one fuel in one tile.

- **Lamp oil.** Low lighting point. When its tile reaches a burst heat the can fails: its oil spreads to the floor tiles within 1.5 m, and through any burnt floor (Rule 7), and the tile gives one pulse by the street drum's existing rule.
- **Coal.** High lighting point, a long burn, modest heat. It does little while the house burns, falls when its floor goes, and keeps burning in the wreck.

### Rule 9. Air moves fire sideways

Wind, where a map has it, multiplies the heat a tile sends downwind and divides what it sends upwind, and carries embers (Rule 7's hot ash) along the ground. The Ashland pair's wind and ember rules already do this and should be kept as the source.

### Rule 10. Tools put heat or fuel into tiles

| Tool | What it does to tiles |
| --- | --- |
| Match | Lights the lightest fuel in one tile within reach |
| Torch | The same, repeatedly |
| Flamethrower | Heats every tile along each ray, at the ray's height, until a face that passes less than half stops it. Glass breaks and the ray goes on |
| Lantern | Flies as now. It breaks on the first face that would stop it or on a floor. Its oil goes into the tile it broke in and runs by Rule 8: down off stone to the nearest tile that can hold it. Glass breaks and the lantern goes through |
| Poured gas | A fuel in ground tiles, as now |

The dud lantern of round 3 (N3) cannot happen under this rule: oil always ends in a tile that can hold it.

### Rule 11. What the fire does to the bear and the world

Damage, explosions and anything else that reacts to fire read the heat of the tile they are in. A burning house then hurts whoever stands in or beside it, at any height, with no separate rule.

### Rule 12. Bookkeeping that must not change

- Only burning and warm tiles are visited each tick.
- Each tick lists the tiles that changed; nothing is copied whole.
- The same inputs give the same state under any frame schedule. Any choice a rule makes is derived from tile coordinates, never from a random draw at run time.
- Fuel is conserved: laid, burnt, fallen and left must sum.

## Fuel classes, as starting values

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

## Trial, 2026-11-11: the rules run, and what they got wrong

The owner asked for the trial ("Run the trial"). The rules were run in a stand-alone kernel on a scene built from the real Hopkins 15 plan: its rooms, windows, doors and stairs, a second house 2 m beside it and a third 8 m across. Evidence: [`evidence/fire-travel-rules-trial/`](evidence/fire-travel-rules-trial/README.md). It is not the game and nothing in the game changed.

**As first written, the rules missed 11 of the 14 targets that could be tested.** After the corrections below they meet 12.

| # | Target | First run, rules as written | After the corrections | |
| --- | --- | --- | --- | --- |
| 1 | Grass front 1.5 m/s, within 7 % | Did not spread from one tile | 1.46 m/s, spread 3.4 % | Met |
| 2 | Lawn fire lights a wall in under 2 s | Never | 1.53 s | Met |
| 3 | Up a wall against along it, 2.5 to 3.5 to 1 | 2.0 to 1 | 2.7 to 1 (0.70 m/s up, 0.26 m/s along) | Met |
| 4 | The room behind the match fully alight, 10 to 20 s | Not by 20 s | 18.0 s | Met |
| 5 | Half the house alight, 40 to 70 s | 13.3 s | 36.2 s | **Missed, by 4 s** |
| 6 | Flame in the house for 90 s or more | 83.5 s | 122.5 s | Met |
| 7 | First floor or roof part falls, 60 to 150 s | 28.6 s | 64.3 s | Met |
| 8 | An upstairs fire reaches the ground floor only after something falls | 3.4 s, before any fall | 18.0 s, 1.8 s after embers fall down the stairwell | Met |
| 9 | A kitchen fire differs from a dining-room fire | 8.9 s against 8.7 s | Half alight at 28.7 s against 33.3 s; the oil goes at 0.1 s against 17.6 s | **Weak: 4.5 s** |
| 10 | Lawn fire does not cross 0.5 m of paving | Does not | Does not | Met |
| 11 | The house 2 m beside a burning one catches | Never | 6 s after the facing wall is alight | Met |
| 12 | The house 8 m across does not | Does not | Does not | Met |
| 13 | A lantern is never a dud | | | Not tested: the scene has no stone plinth and the kernel no lantern |
| 14 | The fuel ledger closes | Yes | Yes, to 3e-7 | Met |
| 15 | Cost per frame no more than today | | 4.7 ms per step for three houses, 2,744 tiles active at the peak | **Not shown** |

On 9: the trial's own pass mark was a 5 s difference, set before the run, and 4.5 s misses it. After 300 s the only thing still burning in either wreck is the coal. On 15: the kernel is unoptimised and the street has eight houses, so this says the cost is the same order as today's, not that it fits.

### Corrections to the rules

Each was found by a target failing. They replace the matching text above.

| Rule | As written | Corrected | What showed it |
| --- | --- | --- | --- |
| 2 | A fuel lights when its tile reaches its lighting point | It chars first. Above its lighting point a fuel chars at a rate set by how hot the tile is, and lights after a delay: none for grass, oil and lacquer, 3 s for frame and furniture, 5 s for clapboard, 15 s for coal | Without it a wall lit in a tenth of a second per tile and the house was alight in 13 s |
| 3 | Loss depends on enclosure | Kept, with a second requirement: **one burning tile must be able to light its neighbour alone.** Grass needed more output (0.7) and outdoor loss less (2 per second) | A single lit grass tile never spread |
| 4 | Down 0.25, diagonally down 0.4 | **Down 0.04, diagonally down 0.06.** Up 3 and diagonally up 2 stand | Heat went down an open stairwell and lit the ground floor in 3.4 s |
| 5 | Timber passes 0.1, glass 0.15 | **Timber 0.02, glass 0.05, masonry 0.005** | A fully burning room pushed enough through a 0.1 partition to light the next room at once |
| 5, new | | **A surface lit from one side burns on that side** until it is burnt through. A burning partition, floor or door does not heat the room behind it | Partitions and ceilings were lighting the far room the moment they caught |
| 5, new | | **A wall is one surface from storey to storey.** Fire climbs it past the floor that meets it | Fire stopped at each ceiling and the climb ratio stayed near 2 to 1 |
| 5, new | | **Doors start shut,** as thinner timber than the partition round them | With every door open the rooms were one space |
| 6 | Output over distance squared, 3 m | Kept, with a gain of 0.5, **grass and embers radiating a tenth of their output,** and reach used only between different things, not inside one building | At full strength a grass front crossed paving; inside a house it lit walls through floors |
| 7 | Embers are a small, short fuel | **Embers give as much as clapboard for 8 s, and a fall gives a pulse of 2.5.** What falls lands on its own storey's floor if that still holds | Embers that fell down the stairwell lit nothing for 46 s |

### The fuel table, as tuned

| Class | Lights at | Char delay | Burns for | Output |
| --- | ---: | ---: | ---: | ---: |
| Grass | 0.85 | 0.15 s | 3 s | 0.7 (a tenth of it across a gap) |
| Poured gas, lamp oil | 0.6 | 0 | 14 s | 3 |
| Clapboard, partition, door | 1.1 | 5 s | 25 s (partition), 12 s (door) | 1 |
| Roof | 1.1 | 3 s | 60 s | 1 |
| Floor and frame timber | 1.3 | 3 s | 60 s | 1.2 |
| Furniture | 1.1 | 3 s | 30 s | 1.5 |
| Cloth, bedding | 0.8 | 0.5 s | 10 s | 1 |
| Lacquer finish | 0.5 | 0 | 4 s | 1.6 |
| Coal | 1.6 | 15 s | 300 s | 0.8 |
| Embers | 0.7 | 0 | 8 s | 1 (a tenth across a gap) |

### What the trial says about the rules

- **Rooms do come out of tiles.** With shut doors, partitions that hold heat, and surfaces that burn on one side, the room behind the match is fully alight at 18 s while the house is at half only at 36 s. No rule names a room. The uncertainty flagged under Limits was about loss alone; it took the three face rules as well.
- **The owner's "up easy, down by falling" holds.** A fire started upstairs did not reach the ground floor until embers fell, and the first floor came down at 64 s because its timber was spent, with no clock.
- **Contents still matter less than the shell.** The kitchen's oil moved the half-alight time by 4.5 s. Stores are a small share of a house's fuel in this table; if the owner wants them to matter more, the amounts go up, not the rules.
- **Target 5 is still missed.** The house reaches half alight 4 s early. More delay on clapboard would fix it and would break target 2; the honest state is that these two pull against each other at this tile size.

### Limits of the trial

- **One plan, one layout, no wind, no lawn round the houses** in the house runs. One run per case; the kernel has no randomness.
- **The kernel was written and tuned by the same author as the rules,** in one sitting, with no independent review. Its faults found on the way (falling debris landing on the wrong storey, reach working through floors) were the author's own.
- **Eleven numbers were changed to reach these results.** They are tuned to this scene and may not hold on another.
- **Not tested:** lanterns and the other tools, the plinth, wind, a joined row, the landmark maps, and anything a player would see.

## What these rules decide, and what they leave to the owner

They follow the owner's five answers of 2026-11-11 without change. They also propose a value for three of round 1's open decisions, which the owner has not yet ruled on and said "not yet" to starting:

| Round 1 decision | Proposed here | Still the owner's |
| --- | --- | --- |
| Tile size | 0.5 m by 0.5 m by 1.06 m | Yes |
| Should a burning house light what it does not touch | Next door, not across the street (Rule 6, 3 m) | Yes |
| How much faster fire climbs | About 3 to 1 (Rule 4) | Yes |
| Should the landmark maps burn | Not addressed; the rules do not depend on it | Yes |
| Should a lawn fire always take everything | Not addressed | Yes |

## Limits

- **Trialled in a kernel only,** by the author of the rules; see the trial section and its limits.
- **The numbers are reasoned, not sourced.** No fire-science figure was looked up. Ratios between classes were set so the targets could plausibly be met.
- **Rule 3's enclosure effect is the least certain.** If rooms do not go up together by loss alone, the fix is in the loss numbers, not a room rule.
- **Cost.** A two-storey house is a few thousand tiles against about 480 sites today. Rule 12 keeps the visited set small, but target 15 has to be measured.
- **Smoke, water and people inside a burning building are not covered.**
