# Handoff to the architect: three items from hostile review round 2

**Direction (the owner, 2026-11-10):** hand to Codex. The reviewer builds none of this. The architect owns the contract and the assignment. Everything below is a proposal for that contract.

Source: [hostile review round 2](2026-11-10-hostile-review-round-2.md), findings N1, N2 and S9, at `26931d9`. Probes are in [`evidence/hostile-review-round-2/`](evidence/hostile-review-round-2/README.md); run each from the repository root with `node <path>`. The reviewer's `r` probes that compare trees need `TB_TREES` set, as that README says.

Not handed over: round 1's M1, M2 and M4, the lattice, and the owner's open decisions.

## Item 1: a porch deck should not burn as one piece (N1)

**Problem.** One match on the lawn at the west end of the Hopkins 12 porch lights lawn 8.5 m away, beyond the east end, 1.83 s later. On `720f7b6` the grass front took 5.80 s. The deck carries fire at 4.6 m/s; grass burns at about 1.6 m/s and timber at 0.53 m/s. The deck also carries fire across 8 m of bare paving in 1.75 s.

**Root cause.**
- `src/simulation/housing-topology.js:130-134` makes one site per porch footprint: `deck:porch` and `deck:stairs`. The Hopkins 12 deck is 8 m by 2 m.
- `src/simulation/housing-fire.js:40-47` gives that one site ground contact along all four sides. It takes heat from every burning cell on its edge at once, and once lit it heats every cell on its edge in the same tick.

**Suggested shape.** Split each porch footprint into one site per metre along its length, as walls already are, and link each to its neighbours. Give each piece only the outer edges it owns. The entry link and the post link go to the nearest piece. Fire then runs the deck at the house's own spread rate.

**Owners.** The simulation is the coder's. More deck sites mean more `structureFire` samples on a porch, so the artist should check the flame and smoke placement on a burning deck.

**Checks.**
- `porch-jump.mjs`: the first lawn cell beyond the east end is not lit by the house sooner than the grass front reaches it (5.8 s on `720f7b6`).
- Reviewer's `r05-porch-one-site.mjs`:
  - P1: two single grass cells 7 m apart do not light the deck.
  - P2: 8 m of paving along the porch is crossed no faster than paving along a wall (6.07 s for 5 m today).
  - P3: one match on the deck does not light 22 lawn cells in one tick.
- Must still hold: the porch catches from lawn fire (`p03` 3d) and from the flamethrower (`p08` 8a); `one-match-census.mjs` burns the same sides.
- `node tools/check.mjs`, with any re-pinned porch traces in `docs/engineering/fire-exposure.md` recorded.

## Item 2: walls above the plinth on the two L-shaped houses cannot be hit (N2)

**Problem.** On Hopkins 9 and Hopkins 13, 21 ground-storey clapboard panels (39 of 130 half-metres) take no heat from ground fire, a match, a torch, 1.5 s of flamethrower or a thrown lantern. They burn only by spread from a neighbouring panel.

**Root cause.**
- `src/content/buildings.js:17-19` builds one `foundation` box per house: the plan's full rectangle, as tall as the whole house (4.6 m for Hopkins 9).
- The comment at `buildings.js:7-9` says the low plinth really does fill that rectangle. The walls above it follow the L, so in each notch a wall stands 1.09 to 4.09 m behind the box face.
- `src/simulation/tools.js:100` stops a flamethrower ray at the box. `src/simulation/surface-fire.js:136,165` finds no fuel and no clear line in the notch cells.

**What is and is not wrong (reviewer's judgment).** Ground fire stopped by a metre of masonry plinth is defensible, and matches and a torch are short-range tools. The defect is that the flamethrower and thrown fire cannot reach visible wood 1.1 m away, because the box is full height where the house is not.

**Suggested shape.** Keep the rectangular plinth at its real height (0.48 m), and build the solid above it from the plan's rooms. Flame rays at 1.05 m and thrown lanterns then pass over the plinth to the wall. Movement is unchanged, since the plinth still blocks the player.

**Owners.** Collision and content are the coder's and the architect's. If the art draws anything in the notch above the plinth, the artist should say so.

**Checks.**
- `setback-wall.mjs`: the flamethrower lights `wall:0:6,2|6,3` on Hopkins 9. The flush-wall control still lights.
- Reviewer's `r04-setback-walls.mjs`: the flamethrower and lantern columns read LIT for the set-back panels the player can face. The ground column may stay cold.
- Must still hold: the player cannot walk into a notch; party walls and bare brick still block; `one-match-census.mjs` burns the same sides.
- `node tools/check.mjs`.

## Item 3: three tests for the new publication code (S9)

The shipped code is correct here. Each line below can be removed and all 274 tests still pass.

| `src/simulation/field.js` | What the test should pin | The mutant that shows the gap |
| --- | --- | --- |
| line 86, the changed mark on a thrown pool | After a lantern breaks, each pool cell's published `depositedFuel` and the published remaining fuel equal the live values on the next snapshot | `A02-pool-not-marked-dirty` |
| line 238, the front retreat | When the front-most burning column burns out, `diagnostics.frontX` falls back to the next burning column | `A12-frontX-never-retreats` |
| line 235, the sort | Either pin the fuel total to the row-order sum, or drop the sort and say the last digit may move | `A11-remaining-fuel-summed-out-of-order` |

**Check.** Reviewer's `r10-mutants.mjs A02-pool-not-marked-dirty A12-frontX-never-retreats A11-remaining-fuel-summed-out-of-order` reports KILLED for each, and `r11-survivor-behaviour.mjs` shows what each one breaks.

## Small, if convenient

- `src/ui/map.js:109-111` trusts a frozen list; the art reader also checks each record (`src/art/cell-publication.js:41-44`).
- `docs/engineering/fire-exposure.md:39` still says Ashland exchanges heat only through two outward probes.
- Four of round 1's mutants still pass every test (`mutants-round-1-survivors.mjs`): a burning cell that holds no heat, the stair link removed, a thrown lantern that always hits the low band, and house fire that ignores the powder clock.

## After the fixes

Round 3 re-runs both benches on the fixed tree from the reviewer's worktree, `claude/hostile-review`.
