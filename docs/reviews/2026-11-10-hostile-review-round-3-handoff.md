# Handoff to the architect: round 3's items, and the owner's notes on house contents

**Direction (the owner, 2026-11-11):** hand to Codex, contents included. The reviewer builds none of this. The architect owns the contract and the assignment. Everything below is a proposal for that contract.

Source: [hostile review round 3](2026-11-10-hostile-review-round-3.md), findings N3, S12 and S14, and the section "The owner's notes: what is inside the houses", at `c855e62`. Probes are in [`evidence/hostile-review-round-3/`](evidence/hostile-review-round-3/README.md); run each from the repository root with `node <path>`. The reviewer's `r` probes need `TB_TREES` set to a directory holding `tip2/`, an export of `26931d9`.

Items 1 to 3 are repairs to what shipped. Item 4 is new design from the owner.

Not handed over: round 1's M1, M2 and M4, the lattice, and the owner's open decisions on it.

## Item 1: a lantern on the plinth of Hopkins 9 or 13 does nothing (N3)

**Problem.** A lantern that comes down on the stone plinth of either set-back house, at the foot of a wall, or on a porch post is spent and leaves no oil and no fire. `lantern-dud.mjs`: 6 of 14 throws at a set-back wall and 1 of 14 at a flush wall, against 0 of 28 on `26931d9`. A lantern that does reach a set-back wall lights it and lays 0 L of its 0.3 L.

**Root cause.**
- `src/simulation/tools.js:181-183` lays the pool and the heat pulse where the lantern came to rest.
- With the authored blockers that point is on the plinth top, under a rim, or on a post, all inside the house's ground box.
- `src/simulation/field.js:81` finds no cell it may wet from there, so `addPool` returns 0 and the heat pulse is blocked.
- `lanternPoolOrigin` (`tools.js:152-164`) moves the pool outside only for a wall hit within 0.011 m of the box edge.
- `src/simulation/housing-fire.js:157` returns nothing for a post, rail or baluster hit, and `:165` for a plinth or slab hit.

**Suggested shape (the reviewer's recommendation; the owner has not ruled on it).** Oil that lands on stone inside a house's outline runs to the nearest open ground at the plinth's edge and burns there, and the heat pulse lands with it. A lantern that breaks on a wall heats the wall and also drops its oil at that wall's foot. A hit on a post or rail heats the deck section under it.

**Owners.** The simulation is the coder's. If the pool is drawn where the lantern broke, the artist should check that the oil now reads as running off the stone.

**Checks.**
- `lantern-dud.mjs`: 0 duds in both rows, and the set-back wall hits lay 0.3 L each.
- Reviewer's `r07-lantern-dud-repro.mjs`: 0 duds of 6. `r04-lantern-sweep.mjs`: duds on the set-back plans back to the `26931d9` level (24 of 2,796) or below. `r18-lantern-panel-census.mjs`: oil laid, not 0 L.
- Must still hold: the lantern preview equals its flight (`r04`, `r16`); no lantern comes to rest inside a house; every set-back panel can still be lit (`r18`, 84 of 84); the fuel ledger closes (`r09`).
- `node tools/check.mjs`, with a test that fails on today's tree for each of the three cases: plinth, wall foot, post.

## Item 2: tests for the new code (S12)

The shipped code is correct here. Each breakage below passes all 291 tests today. Names are the reviewer's, in `reviewer/mutants.mjs`.

| Breakage | What a test should pin |
| --- | --- |
| `P02-floor-patches-not-linked` | One match on a house reaches every floor patch of that storey; the fire graph is one piece |
| `D06-entry-door-not-linked-to-deck` | A fire that starts inside a house reaches its porch |
| `D05-stairs-not-linked-to-deck` | On bare paving the stairs catch from the deck, and the deck from the stairs |
| `D08-post-linked-to-far-deck-end` | The post catches from the deck section beside it (0.65 s on Hopkins 12, not 10.58 s) |
| `D09-each-section-claims-whole-deck-area` | The deck sections' areas sum to the deck's area |
| `F07-rim-hit-picks-band-by-height` | A lantern on a wall's rim heats the adjacent wall, as the round-two record says it can |
| `G01-shapes-tested-as-bounding-boxes` | A lantern can light each diagonal bay wall of Hopkins 9 |

**Check.** `node docs/reviews/evidence/hostile-review-round-3/reviewer/r10-mutants.mjs <names>` reports KILLED for each. The other 17 survivors are listed in `reviewer/REPORT.md` with what each changes; six of them changed nothing the reviewer could measure.

## Item 3: the height-aware collision on all six plans (S14)

**Problem.** `src/simulation/housing-heat-volumes.js:7` turns the authored blockers on for `hopkins-4-09` and `hopkins-4-13` by name. On the other four plans the porch is still one box from 0.48 to 2.12 m: 13 of 112 ground-storey wood panels, including all 7 front panels of Hopkins 12, cannot be heated directly by the flamethrower. The same four plans also miss every flamethrower shot held within 30 degrees of a wall (S13: 118 of 1,336 exposed panel-shots), which the authored blockers already cure on the two plans that have them.

**Suggested shape.** Build the blockers for every catalogue plan from its geometry, and drop the name test. Fix Item 1 first or with it, because the lantern duds follow the blockers to every plan they reach.

**Checks.**
- Reviewer's `r05-flame-sweep.mjs`: 0 exposed panels missed and 0 unreachable on all six plans; still 0 heated through a wall.
- `r17-grazing-flame.mjs`: a shot along a Hopkins 15 wall heats the panels inside the cone.
- `r04-lantern-sweep.mjs`: no new duds on the four plans.
- Cost: `r06-tick-cost.mjs` against `26931d9`. The two passes already cost about 10 % per frame, and 1.4 times with the flamethrower held; say what this adds.

## Item 4: a house's contents as fuel (the owner's notes)

**The owner's words.**
- 2026-11-10: "there is a non zero chance of nitrocellulose lacquer on the furniture."
- 2026-11-11: "oil and coal are stored in abundance in certain points in the house."

**What exists today.**
- No house holds contents. Its fire graph is floor, wall, joinery, fascia, roof and porch sites (`src/simulation/housing-topology.js:10`).
- Furniture is modelled for the catalogue houses (`src/art/gross-housing.js:183-196`: bed, stove, work table, cabinet, dining table, chairs) and hidden on the street (`src/art/neighborhood.js:54`, `src/art/cottage-pair.js:49`).
- Rooms are typed in `src/content/housing-plans.js`: a kitchen in all six plans, a pantry in four, basement "service" rooms in Ashland worker and Monroe row.
- The only stored fuel is two street drums (`src/content/neighborhood.js:34-35`; ignition heat 1.4, blast 2.5 m, `src/simulation/config.js:22`).
- The three fuel classes are gas, grass and wood (`config.js:12-13`). None has a finish.

**Suggested shape.** Three kinds of contents, placed by room type from the plan, each a fuel load at a point in the house:

| Contents | Where | How it should burn |
| --- | --- | --- |
| Furniture | Where the art already places it, room by room | As wood, with a finish that sets how readily it lights and how fast flame runs over it. A lacquered piece lights at a touch and flashes over its surface before the wood under it burns. Lacquer should be the rare case |
| Lamp oil | A can in the kitchen or pantry; a lamp in each lit room | Lights readily, flares, and spills as a burning pool. The lantern and the street drum each do half of this already |
| Coal | A bin in the basement service room or by the kitchen; a scuttle at the stove | Hard to light, then burns hot for a long time. It should feed the heat of the collapsed house, which today follows a 150 s clock whatever burned |

**Evaluation, added 2026-11-11 at the owner's request.** [`2026-11-11-house-contents-evaluation.md`](2026-11-11-house-contents-evaluation.md) trials the table above in memory and finds it changes almost nothing as plain extra fuel: one match has a house fully alight in 10 s whatever is inside. It recommends building the room as a fire unit that flashes over and vents through its windows, with the oil store as a burst and the coal store as heat in the wreck, and it has four pictures of what that might look like. Read it before writing the contract; its four decisions are the owner's.

**Decided by the owner, 2026-11-11:** a house should burn for a minute or more after one match, not the 21 s of flame it has today. He then answered the other three:

- **The unit is the tile, not the room:** "the tile is a fire unit, but it draws from the tiles around it, if that makes sense." Do not build room-level states or a flashover event. A tile's fire depends on what its neighbours hold and how hot they are; a room's behaviour should come out of that.
- **Fire through a window:** "agreed", for the lantern and the flamethrower.
- **Usable buildings:** "buildings should be usable. you will only see furniture inside when there is someone in the building or xray view." The street's houses become enterable, and the interior is drawn only while someone is inside or an x-ray view is on.

- **Fire goes both ways:** "real fire is bidirectional. heat rises and flame goes up easy, but also burning materials drop down and carry fire to lower levels." Up is heat and flame; down is burning material that falls and lights what it lands on. The Ashland pair already drops burning pieces (`src/simulation/cottage-fire.js:225-251`); the street's houses and round 1's reference lattice do not.

The evaluation's section "The owner's decisions" gives the reviewer's reading of each.

**Rules, added 2026-11-11 at the owner's request.** [`2026-11-11-fire-travel-rules.md`](2026-11-11-fire-travel-rules.md) turns those answers into twelve rules for how fire travels on tiles, with a fuel table and fifteen targets. They were trialled, reviewed (3 out of 10) and rewritten; after three reviews (3, 5 and 6 out of 10) the rules meet 5 of 14 testable targets, partly meet 6 and miss 3: their own room timing, the house next door (the reach rule was withdrawn), and cost at street scale (read the results section), and the owner has said "not yet" to starting the lattice, so treat them as the proposal to write a contract from when he says go. The tile answer points at the lattice of round 1; whether it settles round 1's open lattice decisions is the owner's to say.

**Sequencing (the reviewer's recommendation; the owner's call).** In the proposed lattice each of these is a fuel class and an amount on one tile. In today's house graph each is a new kind of site with its own rules. The owner has not yet decided the lattice questions from round 1. The architect should say which way the contract goes before a coder starts, and should not let this wait behind Items 1 to 3.

**Owners.** The fuel model is the coder's. Placement, whether furniture is shown on the street, and how a flashing piece or a burning coal bin looks are the artist's. Anything the player is told about a store is the UI specialist's.

**Checks, to be written with the contract.**
- A fire started in a kitchen and one started in a bedroom of the same house differ in a stated, measured way (time to full involvement, heat left after collapse).
- An oil store heated past its threshold flares once and lays a pool that the ground ledger accounts for. A coal store does not light from a brief touch, and once lit outlasts the timber around it.
- The same inputs still give the same state under any frame schedule, and reset still equals fresh.
- `one-match-census.mjs`: any change in which houses burn is recorded, since stores are meant to change outcomes.
- `node tools/check.mjs`.

**Not established.** The history behind the notes was not researched beyond one search for the lacquer (a furniture finish from the 1920s; shellac and oil varnish in 1893). No burning rates were looked up. Rates and amounts are the architect's to source.

## Small, if convenient

- S16: `deckPieces` (`housing-topology.js:14-34`) cuts a deck along its longer side only, so fire crosses its depth in one step.
- S17: the flamethrower's fan falls back to 25 loose rays in 13 % of shots near the south-west block (`src/simulation/discharge.js:76-86`), because it counts every box in the street at any distance.
- Three older breakages still pass every test: a burning ground cell that holds no heat, a lantern that always hits the low band, house fire that ignores the powder clock.

## After the fixes

Round 4 re-runs the benches on the fixed tree from the reviewer's worktree, `claude/hostile-review`.
