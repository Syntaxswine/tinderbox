# Hostile review, round 1: how fire spreads

- **Reviewed commit:** `4fc97bb`, the tip of `origin/master` on 2026-11-10.
  - The review began on `14ffede`. While it ran, master gained `fcae4d6` and its approval record: each house section now stands for 150 seconds after it first catches, then falls and leaves rubble that heats the ground.
  - Every probe was re-run on `4fc97bb`. Numbers are from that commit unless a row names another.
- **Judged against:** the owner's sentence for this review: "I want fire to spread easily and be tracked in a tile by tile modular way that moves along every axis." "Every axis" is read as both ground directions and height. The repository's own requirement (`docs/architecture.md`, "Fire spreads when a source burns hot and long enough…") and its recorded measurements are judged too.
- **Method:**
  - One hostile reviewer, a Claude subagent, read the code at `14ffede` without sight of the bench and wrote its own probes.
  - The commissioning session built a separate bench of eleven probes and one browser procedure. Each drives the published simulation through `createSimulation` and has a control.
  - Every MUST-FIX was re-run by hand on `4fc97bb`. The table near the end says how.
  - Labels: **measured** means run and quoted; **code-reading** cites source at `4fc97bb`; **judgment** is an assessment.
- **Evidence:** [`evidence/hostile-review-round-1/`](evidence/hostile-review-round-1/README.md) holds every probe, how to run it and which finding it supports.
- **Scope:** the simulation side of fire on Catalogue Street and the Ashland cottage pair, and what a frame of it costs. Art direction, UI, landmark geometry and the non-fire systems were not reviewed.
- **Direction (the owner, 2026-11-10): "Hand to Codex."** The first two fixes, grid publishing and wall contact, go to the architect to assign. The reviewer builds nothing. The brief is [`2026-11-10-hostile-review-round-1-handoff.md`](2026-11-10-hostile-review-round-1-handoff.md). The other decisions at the end of this record are still open.
- **This branch changes nothing in the game.** It adds this record, the probes, and one registry row and one index sentence in `docs/workflow.md`.

Three words are used throughout. A **cell** is one 0.5 m square of the ground heat grid. A **site** is one fire-carrying patch of a house: a band of wall, a patch of floor, a roof panel. A **section** is a 2 m by 2 m column of a house's plan, the unit that collapses. Times are world seconds, the clock fire runs on. Without powder, one world second is one real second.

## Score: 3 / 10 against the owner's sentence

| Clause | Verdict | Why |
| --- | --- | --- |
| "spread easily" | Half | One match takes a whole lawn and every house on it. Nothing crosses half a metre of bare ground, and a burning house lights nothing it does not touch. |
| "tracked tile by tile" | No | Fire lives in five trackers with different units. None of them is the map tile. |
| "modular" | No | The scenario's name decides which fire model a building gets. A building outside the catalogue burns as a flat pad or not at all. |
| "moves along every axis" | Inside two house models only | The ground is flat, no tool reaches above a ground storey, and the maps with stairs have no fire. |

The reviewer scored 3 and the bench agrees. The craft of what exists rates 7 to 8: a fixed-step deterministic core, finite fuel, a cause on every ignition event, and replay tests with shielded controls.

## MUST-FIX

### M1. Fire has no shared unit, and the scenario's name decides which model a building gets

**Claim.** Five trackers hold fire, each with its own unit, state and constants. None is the map tile. Which one a building gets depends on the scenario's `id` string.

**Evidence.**

| Tracker | Unit | Count on Catalogue Street | Height | Stops burning when | Source |
| --- | --- | --- | --- | --- | --- |
| Ground field | 0.5 m cell | 9,588 | none | its fuel amount runs out | `field.js` |
| House fire graph | site | 2,218 over 8 houses (164 to 478 each) | one stored height per site | a fixed timer per part ends (7 to 10 s) | `housing-topology.js:9` |
| House collapse | 2 m section, all storeys | 12 to 28 per house | none | 150 s after its first ignition | `housing-fire.js:91` |
| Ashland cottage, pair scene only | 1 m tile in three layers, plus wall sites | 126 supports and 52 wall sites per cottage | three layers | timers of 10 to 16 s; a 150 s clock per layer | `cottage-topology.js:15`, `cottage-fire.js:189` |
| Rubble | one emitter per fallen ground section | up to 28 per house | none | 24 s after the section falls | `rubble-heat.js:6` |

A match targets a sixth unit, the 1 m map tile, which is four cells (`tools.js:41`).

- **The id switch (measured, reviewer's `p04b`).** `src/simulation/index.js:27-28` turns the house models on only when `definition.id` is `'neighborhood'` or `'cottage-pair'`. The same one-house scene was run twice with nothing changed but the id:

  | `id` | What burns | Highest flame | Collapse |
  | --- | --- | --- | --- |
  | `'neighborhood'` | 284 sites of the house graph | 6.17 m | sections fall from +150 s; house gone at +155.25 s |
  | `'my-new-street'` | 284 ground cells, as a flat pad | ground level | every collider vanishes at +28.5 s |

- **One prefab, two models (measured, reviewer's `p08`).** With `fire.ignition.wood` raised from 1.1 to 3, a match on ordinary Hopkins siding only warms it. The same match on Ashland siding in the pair scene lights it. The Ashland model hard-codes its own threshold (`cottage-topology.js:15-16`) and ignores the configuration. The same Ashland prefab on the default street uses the ordinary model instead.
- **Ten heat carriers (code-reading).** Each was written separately and is active only where listed.

  | Carrier | Active in | Source |
  | --- | --- | --- |
  | Burning cell to the eight cells around it that hold fuel | every scene | `field.js:117-130` |
  | Cell to and from a ground-storey wall site, at two sample points | Catalogue Street, Ashland | `surface-fire.js:130` |
  | Site to linked site in the same house | Catalogue Street, Ashland | `surface-fire.js:52` |
  | Roof to roof across a joined Monroe seam | Monroe rows | `joined-roof-fire.js` |
  | Wall or roof to facing siding, by radiation | the two Ashland cottages only | `cottage-radiation.js:66` |
  | Roof to roof, by ember | the two Ashland cottages only | `cottage-fire.js:246-284` |
  | Roof to floor to floor, by one falling board and one crate | the two Ashland cottages only | `cottage-fire.js:217-242` |
  | Drum blast to cells, ground-storey siding, actors and drums within 2.5 m | every scene | `index.js:199` |
  | Fallen section to cells within 3 m, for 24 s | Catalogue Street, Ashland | `rubble-heat.js:6` |
  | Tools to one map tile of cells, a ground-storey wall band, or a porch | every scene | `tools.js:13-48` |

- **Constants (code-reading).** More than 100 numbers that shape fire behaviour sit outside `DEFAULT_CONFIG`, in ten files; the evidence README tallies them. `STRUCTURE_DECAY_SECONDS` is exported from `config.js:2`, beside `DEFAULT_CONFIG` and not inside it, so `configuration()` cannot override it.
- **What cannot burn (measured).** A fire on the Bell & Alder shop floor burns all 256 floor cells and nothing outside (`one-match-census.mjs`). Its 21 wall modules are masonry and hold no fuel (`src/content/bell-and-alder-layout.js:13`). The three landmark maps reject `primary` and `select-tool` and publish no cells (reviewer's `p12`; `src/runtime/navigation.js:70,130,166`). They are 112 to 352 m across with 4 to 20 levels. The fire grid is capped at 64 m a side and one level (`fixtures.js:42-49`).

**Why it matters.** "Tile by tile" and "modular" both fail here. A new building needs a generated plan record or its own hand-wired code, or it burns as a flat pad. A new map must be named `neighborhood`.

**Direction.** One lattice of tiles indexed by position and level, one fuel record per tile, behaviour chosen from content and never from `definition.id`. See the proposal.

### M2. Fire cannot leave the fuel bed it started in

**Claim.** Fire crosses any distance of continuous fuel and no distance of bare ground. A burning house lights nothing that is not touching it.

**Evidence (measured).**

- **A bare strip** (`pathways.mjs`, experiment 1). Two beds of the same fuel, one lit at its far end. With no gap, both burn completely; that is the control. With one 0.5 m cell of bare ground between them the second bed never warms: its hottest cell stays at 0. The result is the same for grass, timber and gas, and for a 1 m gap.
- **The street** (`one-match-census.mjs`). Single matches on the real Catalogue Street:

  | Strike | Flames out (s) | Lawn on the strike's side | Houses caught on that side | Across the street |
  | --- | ---: | --- | --- | --- |
  | North lawn, open grass | 35.9 | 100% | 3 of 3 | 0% of the lawn, 0 of 5 houses |
  | North lawn, far corner | 37.6 | 100% | 3 of 3 | 0%, 0 of 5 |
  | Hopkins 15 siding | 33.9 | 100% | 3 of 3 | 0%, 0 of 5 |
  | South lawn, open grass | 40.9 | 100% | 5 of 5 | 0%, 0 of 3 |
  | Hopkins 9 siding | 43.9 | 100% | 5 of 5 | 0%, 0 of 3 |
  | Monroe middle sash | 40.9 | 100% | 5 of 5 | 0%, 0 of 3 |

  Every strike took all of its own side and none of the other. Controls: a match on bare brick is `blocked`, on the road or the paving `no-fuel`.
- **House to house.** With the lawn removed, Hopkins 9 burned alone. Hopkins 13 stands 4.8 m away (`structure-spread.mjs`). Joined Monroe units are the one exception: the roof seam passes fire at 8.95 s.
- **House to lawn** (reviewer's `p17`). A fully involved Hopkins 12 lit grass touching its wall at 6.72 s, and none of 160 grass cells that began 1.5 m away.
- **A bystander and a drum** (`pathways.mjs`, experiments 2-3). The bear stood still 0.75 m from the nearest flame while Hopkins 9 burned for 18.4 s on bare paving. It had 100 hp when the flames ended. A steel drum 0.2 m from the same wall did not explode. Control on the lawn: 19.7 hp, and the drum went at 2.7 s. Only after the first section fell at 150 s did the new rubble heat reach them. The drum exploded at 152.3 s, the bear was down to 42.3 hp when the house was gone at 155 s, and it was dead by 200 s (`collapse-clock.mjs`).
- **A burning animal** (experiment 4). A goat lit by the flamethrower ran 4.7 m through dry grass while burning. No cell ignited.

**Root cause (code-reading).** Ground heat goes only to the eight neighbours of a burning cell, and only to those that hold fuel (`field.js:125`). Radiation and embers are built only for the two Ashland cottages (`index.js:90`, `cottage-radiation.js:66`). Damage and drum triggers read only the ground cell under the target (`index.js:201,309`). Nothing reads a burning actor (`index.js:222-241`).

**Why it matters.** "Spread easily" holds on a lawn and stops at every path and kerb, so the owner can burn a lawn at a time and never a street. It also strains "understandable causes" in milestone 01: standing against a burning house is safe for two and a half minutes and then lethal.

**Direction.** Let heat reach bare tiles beside a fire, and give every exposed tile one radiant reach rule. The reference kernel shows both (table C3).

### M3. A house touches the ground at two sample points per wall panel

**Claim.** Whether ground fire lights a house depends on which half-metre the fire is in. A timber porch or stair cannot catch from the ground at all.

**Evidence (measured; reviewer's `p07`, `p03` and `p08`, re-run on `4fc97bb`).**

- Gas in the cell at row 69 beside Hopkins 9's east wall lit the siding in 1.27 s. The repository's own test uses this row. The same gas in row 68, the other cell in front of the same 1 m panel, burned for 8.53 s and delivered no heat. Along that wall, rows 69, 71, 73 and 75 light the siding. Rows 68, 70, 72 and 74 never do.
- 158 grass cells burned against the porch and stairs of Hopkins 12 with no preheat and no ignition. Control: the same grass against the side wall lit it at 3.53 s.
- The flamethrower spent 0.9 L on that porch for no ignition. Control: one match lit it, and 28 sites were burning within 3 s.

**Root cause (code-reading).** `exchangeSurfaceGround` reads `field.at()` at 0.38 m and 0.84 m straight out from the centre of each 1 m panel (`surface-fire.js:7,136`). The centre lies exactly on a cell boundary and `field.at` floors to one side (`field.js:41`), so each panel reads one column of cells and ignores the other. Only ground-storey wall sites have these probes (`housing-fire.js:39`); decks, stairs and posts have none. Flamethrower rays travel at 1.05 m (`discharge.js:89`) and the contact test skips any box lower than the ray (`tools.js:102`, `geometry.js:108`). A porch top is at 0.48 m.

**Why it matters.** A trail poured straight at a wall lights the house, or does not, by 0.5 m of aim. That fails "spread easily" at the moment the player most expects fire to take.

**Direction.** Couple each ground tile to every building tile whose face it touches, decks included.

### M4. Height exists only inside the house graphs, and the player cannot reach it

**Evidence.**

- **Inside a house, fire does climb (measured,** `structure-spread.mjs`**).** One match on low siding with the lawn removed, on three houses: an upper wall caught at 0.97 to 1.17 s, the roof at 2.65 to 3.62 s, the last site at 8.4 to 10.9 s, and the flames were out at 18.3 to 20.6 s. Sites sit between 0.24 m and 6.38 m.
- **Tools stop at the ground storey (measured, reviewer's `p03`).** On a house 6.17 m tall, the match, torch and flamethrower light the wall at 0.98 m. The lantern lights it at 1.98 m, even when it strikes at 2.43 m. Nothing a player does can light an upper wall or a roof (`housing-fire.js:37,141,152`).
- **The ground has no height (code-reading).** Cells store x and y only (`field.js:26-27`). Fences, crates, the shop's furniture and its timber floor are flat cells. Damage reads the cell under the actor (`field.js:174`).
- **The Ashland floors are lit by two scripted drops (measured, reviewer's `p14`).** The upper floor first ignites at 6.22 s from one falling board, the lower at 9.03 s from one falling crate. Floor tiles have no link to walls or roof (`cottage-topology.js:59-68`).
- **Collapse ignores height (code-reading).** An ordinary house falls one 2 m section at a time, all storeys together (`housing-fire.js:91`).
- **The maps with stairs have no fire (measured, reviewer's `p12`).** New York State has 5 levels, Administration 20 and Horticulture 4. None accepts a tool or publishes a cell.

**Why it matters.** Fire and the player never share a vertical axis. Where fire climbs, the player cannot enter. Where the player climbs, nothing burns.

**Direction.** A level index on every tile, tool hits resolved in three dimensions, and "a spent tile drops heat on the tile below" in place of the two scripted drops.

### M5. Publishing the ground grid costs most of a frame before anything burns

**Evidence (measured).** The opening test street is the control: it is the scene the repository's recorded figures come from.

| Measure | Opening test street | Catalogue Street, nothing lit | Ratio |
| --- | ---: | ---: | ---: |
| Simulation, one step and one snapshot, CPU ms per frame (`tick-cost.mjs`) | 0.39 | 4.48 | 11 |
| Every per-frame pass over all cells or all tiles, CPU ms per frame (`art-cell-loops.mjs`) | 1.09 | 6.52 | 6 |
| Whole frame in the browser, median ms (`browser-frame-cost.md`) | 1.1 | 16.6 | 15 |
| Draw calls | 87 | 2,431 | 28 |

A 60 Hz frame allows 16.7 ms.

**Correction, 2026-11-10.** The first version of this table was measured while the host was at 100% CPU and gave 11.9 ms, 14.9 ms and 63 to 68 ms. The load inflated the large scene about three times. The figures above were re-taken with the host at 25% load. The ratios held; the absolute cost did not. With nothing lit, a Catalogue Street frame takes the whole 60 Hz budget on a desktop with an RTX 3080, and not four times it.

- 43% of idle simulation CPU is one line, the per-cell copy in `field.js:178` (`profile-frame.mjs`).
- During a lawn fire the simulation alone takes 4.3 to 6.7 ms of CPU per frame.
- Two consumers serialise all 2,397 map tiles to JSON every frame to learn that nothing changed (`src/art/world.js:74`, `src/ui/map.js:35`).
- The recorded figures, simulation p95 1.10 and 1.30 ms, were taken on the opening test street and never retaken on Catalogue Street.

**Root cause (code-reading).** `snapshot()` rebuilds every cell, tile and building each frame (`field.js:178`, `index.js:336-366`). `src/art/fire.js:93` and `src/art/ground-field.js:60` then walk all 9,588 cells again, and `fire.js` hashes each cell's id string every frame.

**Why it matters.** Tile tracking over a larger map or more levels is unaffordable this way, and the landmark maps are 4 to 21 times the area of Catalogue Street. It is also the game today: the idle frame already fills the budget on a strong desktop, measured with the browser pane hidden, so a phone will not hold 60 Hz.

**Direction.** Keep state in typed arrays and publish only the tiles that changed. Rendering is two thirds of the frame and outside this review; 2,431 draw calls want their own look.

## SHOULD-FIX

### S1. Collapse and rubble heat follow a clock, not what burned

**Measured (`collapse-clock.mjs`).** Through the public configuration, `fuel.surfaceBurnRate` was raised 100 times, so the struck board burns for 0.08 s and passes nothing on.

| Configuration | Sites that ever burned (of 286) | Flames out | Sections fallen (of 20) | First fell at | Hottest ground cell after 149 s | Bear at 140 s | Bear at 200 s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Default (control) | 286 | 18.35 s | 20 | 150.02 s | 4, the cap | 100 hp | 0 hp |
| Struck board burns 0.08 s | 1 | at once | 1 | 150.02 s | 4, the cap | 100 hp | 0 hp |

One scorched board brings down a two-storey column 150 s later, and its rubble kills a bear standing 0.7 m away.

**Root cause (code-reading).** A section retires when `time >= firstIgnition + STRUCTURE_DECAY_SECONDS` (`housing-fire.js:91`). Its rubble heat is `min(1, age / 8) * exp(-age / 260)` of the same age (`surface-fire.js:90`). Neither reads how much fuel burned.

**Judgment.** In default play every ignition consumes the whole house, so a player will not see this yet. It will show as soon as tuning lets a fire go out. The separate lifetimes for flame and structure were approved on 2026-11-10 and are not contested here: the Ashland cottage has no site in flame after about 40 s, stands whole until 150 s, and is gone by 170 s (`pathways.mjs`, experiment 6).

**Direction.** Start a section's clock from fuel actually burned in it.

### S2. Inside a house, fire climbs barely faster than it creeps

**Measured (`structure-spread.mjs`).** Every site names the site that lit it, so each ignition is one hop with a direction and a speed.

| House | Up, median m/s | Level, median m/s | Down, median m/s | Up : level |
| --- | ---: | ---: | ---: | ---: |
| Hopkins 9 | 2.50 | 2.03 | 1.71 | 1.23 |
| Hopkins 15 | 2.25 | 2.14 | 2.27 | 1.05 |
| Monroe middle | 2.32 | 2.22 | 1.22 (one hop) | 1.05 |

Upward flame spread is usually faster than downward or sideways spread, because the flame's own buoyant flow carries it along the fuel (sources below). `surfaceTravel` has slope terms (`surface-fire.js:34-41`), but the link gains and geometry wash them out.

**Judgment.** Fire that races up a wall reads as fire. In the proposal this is two numbers.

### S3. A poured trail's burn time depends on its heading

**Measured (reviewer's `p02`).** The same 0.08 L/m line burns 2.23 s per cell along the grid, 3.15 s at 45 degrees and 1.25 s at 26.6 degrees. Cells the line only clips burn for 0.07 to 0.13 s. The repository's 3.08% direction figure reproduces exactly, but it compares 0 and 45 degrees only. Six headings give 13.9%.

**Direction.** Deposit fuel by area, not by line length per cell.

### S4. The ground fuel rules are almost untested

**Measured (reviewer's `run-mutants.mjs`, on `14ffede`).** Of 22 in-memory mutants, 11 passed every test. Six of the eight changes to the ground rule survived:

| Mutant | What it removes |
| --- | --- |
| Cooling set to 0 | ground heat decays |
| Every fuel ignites at the gas threshold | grass and timber thresholds |
| `receiveScale` dropped | "timber needs more exposure" |
| Every fuel emits like gas | per-fuel output |
| Every fuel spreads at the gas speed | per-fuel front speed |
| `burnHeat` dropped | burning fuel under a drum sets it off |

Others that survived: a burning house no longer lights the lawn, the lantern no longer reaches the upper wall band, and house fire ignores powder.

Three of the survivors were re-run on `4fc97bb` against all 259 tests, with an identity mutant as the control: `receiveScale` dropped, every fuel igniting at the gas threshold, and a burning house no longer lighting the ground. All three still pass every test.

So the sentence in `docs/architecture.md:20`, "Grass catches easily and burns briefly. Timber needs more exposure", is not pinned for ground fuel.

**Direction.** The table printed by `ground-front.mjs` is a ready-made pin for speed per fuel.

### S5. The front speed is not a setting

**Measured (`ground-front.mjs`).** `fire.frontSpeed` 4 and each fuel's `speedScale` read as 4, 2 and 0.8 m/s. Fronts actually run at 3.62, 1.56 and 0.53 m/s, which is 91%, 78% and 67% of those. Five numbers interact to produce one speed. Together with the constants in M1, this makes "spread easily" hard to tune on purpose.

### S6. A burning animal and nearby burning fuel do not count as fire

- A burning goat lit no grass (M2).
- A drum on bare ground ignored gas burning 0.75 m from its centre, and a real pour walked past at 0.90 m, the closest the bear can get (reviewer's `p03`). `index.js:201` reads only the cells under the drum, and bare cells never warm.

### S7. Two small defects

- **Smolder samples omit `heatFraction`** (`surface-fire.js:95-100`). Milestone 12 promises that field on every `structureFire` entry. The determinism probe crashed on it on `4fc97bb` until it was patched.
- **A wooden prop lowers the fuel of the floor cell it stands on** (reviewer's `p15`). 48 of 256 shop floor cells hold 0.006 to 0.26 units instead of 0.30 (`field.js:18-27`).

### S8. Every lawn fire ends the same way (judgment)

All six burning strikes took 100% of their side in 34 to 44 s. There is no wind, moisture or chance on the ordinary street, so the result of a match is known before it is struck. Whether that is wanted is the owner's call. The Ashland wind bake shows the alternative already exists.

## DEFENDED

These objections were tried and the code beat them. They need not be raised again.

| # | Objection | Result | Evidence |
| --- | --- | --- | --- |
| D1 | Fire does not spread readily | It does wherever fuel is continuous: nine uniform beds burned 100%, and every house on a burning lawn caught | `ground-front.mjs`, `one-match-census.mjs` |
| D2 | The ground front is not round | Over nine directions the fastest and slowest differ by 5.5% for grass, 7.2% for gas and 4.2% for timber at the shipped cell size. Changing the cell from 1 m to 0.25 m moves the mean speed by at most 10% | `ground-front.mjs` |
| D3 | Powder breaks fire timing | 3.750 against 3.727 m per world second, 0.6% apart | `pathways.mjs`, experiment 5 |
| D4 | The outcome depends on frame rate | Five frame schedules, one with hitches of nine ticks, reach the identical state hash at tick 2401 | `determinism.mjs` |
| D5 | Reset leaves stale fire state | After a reset, the state and a 20 s replay match a fresh simulation on both scenes | reviewer's `p13`, re-run |
| D6 | Some house parts can never burn | Each of the 8 house graphs is one connected piece: 2,218 sites, none isolated | `scene-map.mjs` |
| D7 | Barriers leak | Brick blocks a match, the road has no fuel, a fire on the shop floor burned no lawn, and party walls hold while the Monroe roof seam passes fire | `one-match-census.mjs` |
| D8 | Fuel appears or vanishes | The ledger closes to 1.4e-14 L on deposited fuel and 1.6e-10 on 221.6 units of surface fuel burned. No event is lost from the 256-event window | reviewer's `p09`, re-run |
| D9 | The recorded performance figure is wrong | It is right for its scene: the control reads 1.0 to 1.2 ms | M5 |
| D10 | Rubble is cold while the art shows it burning | True on `14ffede`, raised by the reviewer, and fixed on master during the review: fallen sections now heat the ground | reviewer's `p08` |

## The proposal: one lattice

The ground field already has the right rule. It is deterministic, close to round, finite in speed and fuel, and it names a cause for every ignition. Milestone 06 asked for exactly this: "Make fuel identity visibly matter through the existing solver, rather than adding a second fire system." The house models went the other way. The proposal is to go back, and to give the ground rule height.

- **A fire tile** is one unit of a sparse grid indexed by position and level. It holds a fuel kind, the seconds of fuel left, its heat and its phase.
- **Each tile has six faces.** A face carries a conductance from 0 to 1. Open air is 1 and masonry is 0. A value in between is a timber wall, door or deck: it passes some heat and opens when its tile burns out.
- **One rule covers every neighbour.** A burning tile heats each of its 26 neighbours by output, times the receiver's response, times the face conductance, divided by distance, after the same travel deadline the ground field uses. Stored heat cools at a fixed rate and a tile ignites at its fuel's threshold. The only thing that tells up from sideways from down is one multiplier on the vertical part of the direction.
- **Reach is optional.** Exposed tiles that are not neighbours exchange heat by inverse square within a set distance, if nothing solid lies between them. Because stored heat cools at a fixed rate, a weak sum never warms anything. That floor is what lets a street stay a firebreak.
- **Bookkeeping is sparse.** Only burning and warm tiles are visited each tick, and each tick lists the tiles that changed.

| Today | In the lattice |
| --- | --- |
| Ground cells | Tiles at level 0 |
| House sites and their built links | The house's tiles, joined by their faces |
| Two-point siding probes | The face a ground tile shares with a wall tile |
| Roof seam code | Roof tiles of joined units are neighbours |
| Ashland-only radiation | Reach, for every exposed tile |
| The scripted board and crate | A spent tile drops heat on the tile below |
| The 150 s section clock and the rubble emitter | Two more phases of the same tile: charred, then hot rubble |
| The scenario id switch | Gone. Fuel comes from content |

### What the reference kernel measured

`lattice-kernel.mjs` is 180 lines. It is evidence that the idea works and not a candidate for the game; the evidence README lists its limits. `lattice-demo.mjs` ran four checks.

**A. Flat ground.** With the shipped constants the kernel reproduces the shipped ground field exactly. Front speeds agree to three decimals in all nine directions for gas, grass and timber.

**B. Every axis.** In a solid block of timber tiles lit at its centre, the front moves at 0.533 m/s along +x, -x, +y, -y, up and down alike. Setting the vertical multipliers to 2 and 0.5 gives up : level : down of 1.9 : 1 : 0.62.

**C. The real street,** rebuilt as tiles from the game's own ground cells, house plans and masonry.

C1, one match on the north lawn:

| Model | Flames out (s) | North lawn | South lawn | North houses caught | South houses caught | Drums |
| --- | ---: | --- | --- | --- | --- | ---: |
| Shipped game | 35.9 | 100% | 0% | 3 of 3 | 0 of 5 | 2 |
| Lattice kernel, contact only | 39.8 | 100% | 0% | 3 of 3 | 0 of 5 | 2 |

C2, one match on a low wall with the lawn removed. Lattice time first, shipped time in brackets:

| House | Upper storey (s) | Roof (s) | Last ignition (s) | Flames out (s) |
| --- | --- | --- | --- | --- |
| Hopkins 9 | 1.30 (0.97) | 1.47 (3.02) | 7.17 (8.38) | 16.17 (18.33) |
| Hopkins 15 | 1.30 (0.97) | 2.58 (2.65) | 8.87 (9.32) | 17.87 (19.25) |
| Monroe middle | 1.30 (1.17) | 2.58 (3.62) | 10.97 (10.88) | 19.97 (20.58) |

The joined Monroe neighbours caught through their roof tiles at 3.6 and 4.6 s with no seam code. The shipped seam passes fire at 8.95 s. The house constants were chosen once by hand and were not fitted.

C3, Hopkins 9 lit on bare paving, under three reach settings:

| Rule | Hopkins 13, 5 m away | Monroe row, 4 m beyond | Across the street | Tile touching the wall | Tile 0.8 m out, where the bear stood | Drum 0.75 m from the wall |
| --- | --- | --- | --- | --- | --- | --- |
| Shipped game | never | never | never | cold while the house burns | cold while the house burns | not while the house burns |
| Contact only | no | no | no | hot enough to kill | cold | never |
| Contact and weak radiation | at 6.4 s | at 15.3 s | no | hot enough to kill | cold | never |
| Contact and strong radiation | at 2.3 s | at 7.3 s | at 13.9 s | hot enough to kill | hot enough to kill | at 4.1 s |

**D. Cost** of the same north-lawn fire:

| Model | Tracked units | Step, CPU ms per tick | Published per tick |
| --- | --- | ---: | --- |
| Shipped game | 9,588 cells and 2,218 sites | 3.42 | all 9,588 cells, copied |
| Lattice kernel | 18,242 tiles, 16,230 with fuel | 1.29 | 1,531 changed tiles on average, 4,290 at the peak, none when idle |

### Proposed order

Each rung can ship alone and has a check that can fail. Nothing here is started. The runtime belongs to the coder and the order to the owner and the architect.

| Rung | Change | Behaviour | Check |
| --- | --- | --- | --- |
| 0 | Publish changes, not the grid | Unchanged | `determinism.mjs` hash unchanged; Catalogue Street idle frame inside the budget, same control |
| 1 | Fix the two-point contact and the flamethrower height filter in today's model (M3) | A trail lights a house from any row; a porch can catch | Reviewer's `p07` lights from every row; `p03` 3d lights the porch |
| 2 | Put the lattice under the ground field at level 0 | Unchanged; part A shows parity is exact | `one-match-census.mjs` identical |
| 3 | Move ordinary houses onto tiles, chosen by content and not by scenario id | House timelines within an agreed tolerance | `structure-spread.mjs`; section collapse and rubble kept as tile phases |
| 4 | Reach, damage and triggers read the lattice | A burning house can hurt, light a neighbour and set off a drum | `pathways.mjs`, experiments 2 to 4 |
| 5 | Tools hit tiles at any height; the Ashland pair moves onto the same rule | Upper walls and roofs can be lit | Reviewer's `p03` 3a; the accepted Ashland replays |
| 6 | Landmark maps get tiles from their walkable surfaces and levels | Fire on the maps with stairs | Needs an artist and coder contract for fuel materials |

### Decisions for the owner

| # | Question | Options | Recommended |
| --- | --- | --- | --- |
| 1 | How big is a fire tile? | 0.5 m, today's cell and four per map tile; or 1 m, one per map tile | 0.5 m. The art and the gas trail already use it, and parity is proven at that size |
| 2 | Should a burning house light what it does not touch? | Never, as today apart from rubble; the house next door but not across the street; across the street too | Next door but not across. It is the first setting where a street is still a barrier |
| 3 | How much faster should fire climb than creep? | About 1.1 to 1, as today; or about 2 to 1 | About 2 to 1 |
| 4 | Should the landmark maps burn? | No, as today; or yes | Yes, after rung 5. They are the only place the player can stand above or below a fire |
| 5 | Should a lawn fire always take everything? | Yes, as today; or wind and moisture can stop it | No recommendation. It is a design choice |
| 6 | How far to go now? | The whole ladder; or rungs 0 and 1 only | Rungs 0 and 1 first. They fix what a player can already see |

## Independent verification

| Finding | Raised by | Re-checked on `4fc97bb` | Result |
| --- | --- | --- | --- |
| M1, units and the id switch | Both | Reviewer's `p04b` re-run; `index.js:27-28` read; counts from `scene-map.mjs` | Holds |
| M1, Ashland ignores the configuration | Reviewer | `p08` 8b re-run | Holds |
| M2 | Both | `pathways.mjs`, `one-match-census.mjs` and `structure-spread.mjs` re-run; reviewer's `p17` and `p03` 3b re-run | Holds. Rubble now reaches the bear and the drum after 150 s |
| M3 | Reviewer | `p07`, `p03` 3d and `p08` 8a re-run; the three code paths read | Holds |
| M4 | Both | `p03` 3a, `p14` and `p12` re-run; `structure-spread.mjs` | Holds |
| M5 | Both | `tick-cost.mjs`, `profile-frame.mjs`, `art-cell-loops.mjs` and the browser comparison re-run, then re-taken on a quiet host | Holds as a ratio; the absolute figures were corrected down about three times |
| "The Ashland 30 s clock hides deleted spread" | Reviewer | The 30 s deadline no longer exists on `4fc97bb`. `collapse-clock.mjs` asks the same question of the 150 s clock | Superseded by S1 |
| "Rubble is cold" | Reviewer | `p08` 8c re-run | Fixed on master during the review (D10) |
| S3 | Reviewer | `p02` re-run | Holds |
| S4 | Reviewer | Three surviving mutants and an identity control re-run against all 259 tests | Holds: all three survive |
| S7, prop fuel | Reviewer | `p15` re-run | Holds |
| D5 and D8 | Reviewer | `p13` and `p09` re-run | Hold |

The other 19 mutants in S4 are the reviewer's measurement on `14ffede` and were not re-run.

The repository's own gate, `node tools/check.mjs`, passes on this branch: 259 tests, exit 0.

## Not checked

- **Appearance.** No pixel was judged. "The gameplay state and appearance must agree" was examined from the simulation side only.
- **The cited texts.** NIST SP 1169 section 6.1, NIST TN 1481 and the USFS residence-time page were not read. A search did not surface SP 1169.
- **Phones.** One desktop host, loaded, with a hidden browser pane.
- **Rendering cost,** beyond counting draw calls.
- **Witness logic, UI, the wind bake, memory use and landmark geometry.**
- **The lattice kernel as an implementation.** Its houses are extruded outlines with open interiors, one fuel for every house tile, radiation without facing angles, and no falling debris or embers.

## Sources

Both were found by a web search on 2026-11-10 and are quoted from the search summary. The papers themselves were not read for this review.

- A UCL Discovery paper by Torero and Cullen on upward flame spread and the fire risk classification of high-rise buildings: <https://discovery.ucl.ac.uk/10145281/1/Torero%20Cullen_Upward%20Flame%20Spread%20for%20Fire%20Risk%20Classification%20of%20High-Rise%20Buildings.pdf>. Upward spread rates are usually more rapid than downward spread.
- A paper in the PolyU repository on the limit of opposed fire spread (file name `FSJ-IAFSS_2020_Limit_opposed_fire`): <https://ira.lib.polyu.edu.hk/bitstream/10397/89510/1/FSJ-IAFSS_2020_Limit_opposed_fire.pdf>. Upward and downward spread are the common forms of concurrent and opposed spread, because of the buoyant flow from the fire.
