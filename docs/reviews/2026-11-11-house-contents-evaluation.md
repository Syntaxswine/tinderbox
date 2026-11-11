# Evaluation: a house's contents as fuel

- **Asked by the owner, 2026-11-11:** "i would like you to evaluate how to implement it and what it might look like." "It" is the owner's two notes in [round 3](2026-11-10-hostile-review-round-3.md): lacquer on the furniture, and oil and coal stored at certain points in the house.
- **What this is:** an evaluation, not a review round. It rests on one trial that patches the game in memory and on four pictures. Nothing under `src/`, `tests/`, `tools/` or `assets/` changes.
- **Tree:** `c855e62`.
- **Evidence:** [`evidence/house-contents-trial/`](evidence/house-contents-trial/README.md).

A **site** is one fire-carrying patch of a house. The **shell** is the house as the game burns it today: floor, walls, roof and porch. Times are world seconds after one match.

## The short answer

1. **Adding contents is cheap.** The trial is a 50-line patch that reuses the code that already burns floors. It adds 10 to 13 sites to a house of 481.
2. **As plain extra fuel, contents change almost nothing.** Half the house is alight at 7.2 s without them and 7.1 s with furniture. Oil in the kitchen is the only kind that moves a number, and only when the fire starts at the kitchen.
3. **The reason is the house, not the contents.** One match has every site of a house alight in 10 s and the flame over in 21 s. A house has no rooms, and nothing reads what is inside it.
4. **So build what the contents do, not only what they are:** a room that goes up as a unit and vents through its windows, an oil store that bursts, a coal store that keeps the wreck hot.

## The trial

`contents-patch.mjs` adds, at the end of `createHousingTopology`, one site per item of contents. Placement comes from data the plans already hold: each room's `type` and `polygon`.

| Contents | Where the trial puts it | Burns for | Lights at | Heat given, against a wall panel |
| --- | --- | --- | --- | --- |
| Furniture, varnished | One piece at the centre of every room | 9 s | wood's threshold, 1.1 | 1 times |
| Furniture, lacquered | The same piece | 4 s | gas's threshold, 0.6 | 1.6 times |
| Lamp oil | A can in each kitchen and pantry | 14 s | 0.6 | 3 times, to every wall of the room within 3 m |
| Coal | A bin in each kitchen | 140 s | 1.1, and weakly coupled | 1.2 times |

**Every number in that table is invented**, chosen so the kinds differ enough to measure. Each new site is linked to the floor patch under it and to the room's outside walls. The existing code steps, publishes and retires them.

`trial.mjs` strikes one real match on an outside wall of Hopkins 15 on the shipped street, once at the kitchen and once at the sitting room, for each variant, and runs 165 s.

## What it measured

One match on the kitchen wall:

| Variant | Sites | Half the house alight | Upper floor reached | Neighbour (Ashland) lit | Contents' share of the fuel |
| --- | ---: | ---: | ---: | ---: | ---: |
| Shell only, as today | 481 | 7.22 s | 4.00 s | 5.55 s | 0 |
| Furniture, varnished | 491 | 7.10 s | 4.00 s | 5.55 s | 2.7 % |
| Furniture, all lacquered | 491 | 7.03 s | 4.00 s | 5.55 s | 1.9 % |
| Furniture and oil | 493 | 5.82 s | 2.07 s | 4.67 s | 3.2 % |
| Furniture and coal | 492 | 7.08 s | 4.00 s | 5.55 s | 4.6 % |
| All three, one piece in four lacquered | 494 | 5.82 s | 2.07 s | 4.67 s | 5.0 % |

One match on the sitting-room wall, the far side of the house from the kitchen: half alight between 5.78 and 5.85 s in all six variants. The oil lights at 6.1 s, after the house is already half alight, and changes nothing.

- **Lacquer:** a lacquered piece lights 0.2 to 0.5 s sooner than a varnished one. Nothing else moves.
- **Oil:** struck at the kitchen, the can lights at 0.77 s, the upper floor catches 1.9 s sooner and the neighbour 0.9 s sooner. Struck elsewhere, no effect.
- **Coal:** it burns alone from 21 s to about 143 s, at 0.6 units of heat against the house's peak of 430. Nothing in the game reads that heat.

## Why so little

**A house today, one match, shell only:**

| Time | What has happened |
| --- | --- |
| 2.2 s | The roof is alight |
| 7.2 s | Half the house's sites are alight |
| 9.6 s | Nine tenths are alight |
| 21 s | The last flame is out |
| 150 s | The first section collapses, on the clock |
| 157 s | The house is gone |

For 129 of those 157 seconds the house stands spent. Contents cannot matter inside a ten-second fire.

Three structural reasons, each read from the code:

- **No rooms.** Only outside walls are in the fire graph (`exteriorPlanEdges`, `housing-topology.js:77`). Inside partitions carry no fire and stop none. Fire runs round the continuous outside wall and through the floor whatever the rooms hold.
- **Nothing reads a store.** A site can only heat the sites it is linked to. There is no burst, no pool, and the heat a collapsed house keeps comes from the time since ignition (`retainedStructureHeat`, `surface-fire.js:90`), not from what was burning.
- **The bear cannot reach the contents.** Tools hit outside walls and decks. The street's houses cannot be entered.

**A what-if: slow the shell.** With every link between sites six times slower and the contents left at their own pace, half the house is alight at 18.3 s without contents and 15.7 s with all three; the upper floor catches at 4.8 s instead of 9.5 s. Contents matter more when the shell is slower, but still by a seventh. The missing piece is the room, not the speed alone.

## Three ways to build it

### Route A: contents as more sites, as in the trial

- **Size:** about 50 lines in `housing-topology.js`, plus tests. No new mechanism.
- **Gives:** flames at the furniture's positions, a slightly faster kitchen fire with oil, a coal site that burns long.
- **Does not give:** any change a player would notice from the street.
- **Cost of landing it:** small. With all three kinds switched on, 290 of the 291 tests still pass; one pinned roof-seam trace moves (`results/gate-under-patch.txt`). That also says how little the tests see of a house's inside.
- **Verdict:** not worth shipping alone.

### Route B: the room as a fire unit, and stores as events

The plans already hold what this needs: each room's `polygon` and `type`, the doors between rooms (`connections`, `openConnections`), the `windows`, the `entry` and the `stairs`.

| Piece | Rule | Built from |
| --- | --- | --- |
| A room | One fire unit with a fuel load from its contents and a state: cold, growing, flashed over, burning out | The room polygons; the trial's room-to-wall test |
| Growth | How fast a room goes from first flame to flashover depends on its contents: varnished furniture slow, a lacquered piece fast, an oil can at once | The contents list |
| Flashover | Every wall panel and floor patch of the room lights together | `heatSurfaceSite` on the room's sites |
| Venting | A flashed room throws flame out of each of its windows: heat onto the ground and any wall outside | `heatBlast` and the ground exchange, both existing. This is a way for fire to cross a gap, which it cannot do today (round 1's M2) |
| Room to room | Fire passes through doors and open connections, and up the stairs, after a delay | `connections`, `openConnections`, `stairs` |
| Oil store | When its room is hot enough it bursts, by the street drum's rule (ignition heat 1.4, blast 2.5 m), and lays a burning pool outside the nearest opening | `config.js:22`, `field.addPool` |
| Coal store | A section that held coal keeps more heat when it collapses and stays hot longer | `rubble-heat.js`: the `retainedHeat` argument and `RUBBLE_BURN_SECONDS` |
| Reach | A lantern or flame through a window lands in the room behind it | The window panels; today such a hit heats the wall |

- **Size (estimate, not measured):** a few hundred lines of simulation and tests, plus art for window glow, flame at windows, and a glow in the wreck.
- **Gives:** a kitchen fire and a bedroom fire that differ; fire that leaves a house by its windows; a reason to aim at a window; a wreck that stays dangerous where coal was kept.
- **Risk:** every pinned timing on the street moves, and the house needs a longer fire for rooms to show (the first decision below).

### Route C: the lattice

In the lattice proposed in round 1, contents are a fuel class and an amount on a tile, and a room is the tiles its walls enclose. Flashover, venting and the two store events are still rules that have to be written; the lattice makes them one rule each instead of one per house model.

## Recommendation

**Superseded in part by the owner's decision 2, below: the unit is the tile, not the room.** What follows is the recommendation as it was made.

Build the room. It is the unit the owner's two notes need, and it is also a tile at the scale of a house: fire tracked room by room, moving through doors, up stairs and out of windows.

1. Decide how long a house should burn (below). At 21 s, rooms will not show.
2. Rooms, flashover and venting.
3. The two stores as events: the oil burst and pool, the coal in the wreck.
4. Furniture finish last. It is the smallest effect in the trial.

Which structure this is built in, today's house graph (Route B) or the lattice (Route C), is the lattice question the owner has not yet answered. The rules are the same in both.

## What it might look like

Four pictures, in [`evidence/house-contents-trial/pictures/`](evidence/house-contents-trial/pictures/). All use the game's own house art for Hopkins 15, rendered with the game's lights. Only the first is unaltered.

| Picture | What it shows | How real |
| --- | --- | --- |
| `1-ground-floor-furnished.jpg` | The ground floor with the roof and upper storey cut away and the furniture shown: stove and work table in the kitchen, settees, a dining table, cabinets | The game's art as it is. The street builds its houses without furniture (`furnished: false`, `src/art/neighborhood.js:53`), so a player never sees this |
| `2-stores-placed.jpg` | The same, with a lamp oil can in the kitchen and the pantry, a coal bin in the kitchen, and one lacquered settee | The stores are simple shapes added for this picture |
| `3-kitchen-fire-mock.jpg` | The kitchen with the oil gone up: a flare, a burning pool on the floor, and the coal glowing dull red beside it | A mock. The light and flame shapes are drawn by hand |
| `4-street-view-mock.jpg` | The house from outside with its roof on: flame venting from the kitchen window and lighting the wall and the lawn | A mock, and the view that matters |

**The player will not see the contents.** On the street the walls and roof hide them, and an oil can is about 15 pixels wide even in the close cutaway. What a player would read is the effect: a window that starts to glow, the room behind it going up, flame out of that window onto the lawn, a burst from the kitchen, and a red patch in the wreck afterwards.

## The owner's decisions, 2026-11-11

The owner answered all four questions. His words are quoted; the readings are the reviewer's.

| # | Question | The owner's answer | What it means for the build (the reviewer's reading) |
| --- | --- | --- | --- |
| 1 | How long should a house burn after one match? | "minute or more" | Today it is 21 s of flame. Spread between a house's pieces has to slow by several times, or the pieces have to burn longer |
| 2 | Is a room a fire unit? | "the tile is a fire unit, but it draws from the tiles around it, if that makes sense" | **Not the room. The tile.** Each tile carries its own fire, and how it burns depends on its neighbours: what they hold and how hot they are. A room is then not a thing the code names; it is what a group of tiles does when walls and a ceiling keep their heat in. This corrects the recommendation above, and it chooses Route C, the lattice, over Route B |
| 3 | Can the bear put fire inside through a window? | "agreed" | Lantern and flamethrower both pass through a window and land in the tiles behind it |
| 4 | Is furniture shown on the street? | "buildings should be usable. you will only see furniture inside when there is someone in the building or xray view." | Two things. The street's houses become places the bear can enter, which they are not today. And the inside, furniture included, is drawn only while someone is in the building or an x-ray view is on; otherwise the house shows its shell |

**What answer 2 changes.** Room-level rules in Route B (a room's state, flashover as one event) are not to be built. Their effects should come out of tiles:

- A tile heats faster when the tiles around it are burning and enclosed, so a furnished room's tiles go up close together without a rule that says "room".
- A window or door is an open face between two tiles, so flame leaves a room through it by the same rule that moves fire anywhere.
- Furniture, oil and coal are what a tile holds: a fuel class, an amount and a finish. An oil tile that bursts feeds its neighbours; a coal tile keeps burning after the tiles around it have gone.

It is also an answer, in the owner's own words, to the first half of his original sentence ("tracked in a tile by tile modular way"), and it bears on round 1's open lattice decisions. Whether that settles them is for the owner to say; this record does not assume it.

**What answer 4 adds.** Usable buildings are a larger piece of work than anything else here: doors that open, floors and stairs the bear can walk, collision inside, and a view that shows the interior. The landmark maps already have walk-in interiors and stairs; the catalogue houses on the street do not. Fire inside a building the bear is standing in also makes the inside a place where the bear can be hurt.

**A fifth direction from the owner, 2026-11-11: fire goes both ways.** "real fire is bidirectional. heat rises and flame goes up easy, but also burning materials drop down and carry fire to lower levels."

These are two different things, and a tile needs both (the reviewer's reading):

| Direction | What carries it | Rule for a tile |
| --- | --- | --- |
| Up | Heat and flame | A burning tile heats the tile above it more strongly, and sooner, than the tiles beside it |
| Down | Burning material that falls | A tile that burns through lets go of what it held. That material, still burning, lands on the first tile below that can hold it and lights it. This moves fuel as well as heat |

What the tree has today (code-reading):

- **The Ashland cottage pair already does both.** Its model drops burning pieces under gravity onto the floor below and lights it (`src/simulation/cottage-fire.js:225-251`, cause `falling-fuel`), and throws embers.
- **The street's houses do neither as a transport.** Fire moves down only along the same links it moves up, a little more slowly (`surfaceTravel`, `src/simulation/surface-fire.js:40`: the slope term is .95 upward and .42 downward). Nothing falls. Round 1 measured fire climbing only 5 to 23 % faster than it creeps.
- **The reference lattice from round 1 has only the first half.** `lattice-kernel.mjs` has an `up` and a `down` multiplier on heat. It has no falling material, so it needs that rule added before it matches this direction.

Falling material is also how the stores should behave: oil runs down and pools on the floor below, and a coal bin whose floor burns out drops, still burning, into the basement or the wreck.

## Decisions as first put to the owner
| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | How long should a house burn after one match? | About 20 s of flame, as now; or a minute or more, room by room | **Decided by the owner, 2026-11-11: a minute or more.** The fire still catches at once; it then has somewhere to go |
| 2 | Is a room a fire unit? | Yes; or keep the house as one graph of surfaces | Yes |
| 3 | Can the bear put fire inside through a window? | Yes, lantern and flamethrower; lantern only; no | Yes, both |
| 4 | Is furniture shown on the street? | Never; through windows and after a wall falls; always | Through windows and after a wall falls. Its cost in draw calls was not measured |

## Limits

- **The numbers in the trial are invented.** It shows which effects are large or small in today's structure, not what the right values are.
- **One house, one seed, calm air, two strike points.**
- **Route B was not trialled.** Its size is an estimate from reading the code.
- **Frame cost of the extra sites was not measured.** They are 2.7 % more sites on one house.
- **Pictures 2 to 4 are mocks.** None uses the game's flame art.
- **The history was not researched** beyond one search on lacquer. No real burning rates were looked up.
