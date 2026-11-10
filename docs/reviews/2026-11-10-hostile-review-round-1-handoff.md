# Handoff to the architect: two fixes from hostile review round 1

**Direction (the owner, 2026-11-10):** "Hand to Codex." The reviewer builds neither fix. The architect owns the contract and the assignment. Everything below is a proposal for that contract.

Source: [hostile review round 1](2026-11-10-hostile-review-round-1.md), findings M5 and M3, at `4fc97bb`. Probes are in [`evidence/hostile-review-round-1/`](evidence/hostile-review-round-1/README.md); run each from the repository root with `node <path>`.

Not handed over: rungs 2 to 6 of the record's proposed order, and its other five decisions, which are still the owner's.

## Fix 1: stop republishing the whole grid every frame (M5)

**Problem.** With nothing lit, a Catalogue Street frame costs 16.6 ms in the browser against 1.1 ms on the opening test street. The simulation's share is 4.5 ms, of which the snapshot is 3.7 ms.

**Per-frame work that touches every cell or every tile** (`art-cell-loops.mjs`, CPU ms, quiet host):

| Where | What | ms |
| --- | --- | ---: |
| `src/simulation/field.js:178`, `index.js:336-368` | Copies all 9,588 cells and 2,397 tiles, clones every building, module and obstacle, then makes three more passes over the cells for diagnostics | 3.59 |
| `src/art/fire.js:90-108` | Walks every cell, hashes its id string, updates a history map | 1.52 |
| `src/ui/map.js:12-39` | Rebuilds every tile and serialises them to JSON to detect change | 0.67 |
| `src/art/world.js:74` | Serialises every tile and obstacle to JSON to detect change | 0.43 |
| `src/art/ground-field.js:59-69` | Writes every cell into a texture and re-uploads it | 0.12 |
| `src/art/street-firelight.js:59` | Walks every cell | 0.12 |
| `src/art/index.js:99` | Filters every cell for the nearby trail | 0.08 |

**Owners.** `src/simulation/**` is the coder's. `src/art/**` is the artist's. `src/ui/**` is the UI specialist's. The snapshot contract between them is the architect's.

**Suggested shape.** Keep snapshot v1's fields. Reuse each cell's published object until that cell changes, and build `world.tiles` once. Consumers can then skip an unchanged cell by identity, and no new field is needed. Older snapshots stay valid because a changed cell gets a new object.

**Must not change.** Any fire outcome.

**Checks.**
- `determinism.mjs`: the state hash is unchanged (`6070c114bbdaf2eb` on `4fc97bb`).
- `tick-cost.mjs` and `art-cell-loops.mjs`: Catalogue Street idle falls toward the control.
- `browser-frame-cost.md`: the idle frame falls well under 16.7 ms.
- `node tools/check.mjs`.

## Fix 2: let ground fire reach the whole wall, and the porch (M3)

**Problem.**
- Only every other 0.5 m row along a wall can light it. Gas in row 69 beside Hopkins 9 lights the siding in 1.27 s; the same gas in row 68 delivers no heat.
- A porch or stair cannot catch from lawn fire: 158 grass cells burned against one for no preheat.
- The flamethrower cannot light a porch: 0.9 L for no ignition, where one match lights it.

**Root cause.**
- `src/simulation/surface-fire.js:130-150` samples the ground at 0.38 m and 0.84 m straight out from each 1 m panel's centre. The centre is on a cell boundary and `field.js:41` floors to one side, so half the panel's frontage is never read.
- `src/simulation/housing-fire.js:39` gives ground contact to ground-storey wall sites only. Deck, stair and post sites have none.
- `src/simulation/tools.js:102` with `geometry.js:108` drops a flamethrower ray's heat when the box it stopped at is lower than the ray (1.05 m). A porch top is at 0.48 m.

**The tuning choice inside this fix.** Sampling both halves at today's coupling doubles the heat a full lawn front gives a wall. Halving the coupling keeps that total and halves what a single row gives. The owner asked for fire that spreads easily, which points to the first. Either way the pinned traces in `docs/engineering/fire-exposure.md` and their tests will move and need re-measuring.

**Checks.**
- `reviewer/p07-contact-rows.mjs`: every row from 68 to 75 lights the siding.
- `reviewer/p03-vertical-and-gaps.mjs`, part 3d: the porch catches from lawn fire.
- `reviewer/p08-defects.mjs`, part 8a: the flamethrower lights the porch.
- Controls that must still hold: a masonry screen blocks, and bare brick reports `blocked`.
- `one-match-census.mjs`: the same sides burn.
- `node tools/check.mjs`, with the re-pinned traces recorded.

## Worth doing alongside

Three changes to the ground rule pass all 259 tests today (record, S4). A test that pins front speed per fuel from `ground-front.mjs` would close that.

## After the fixes

Round 2 of the review re-runs this bench on the fixed tree from the reviewer's worktree, `claude/hostile-review`.
