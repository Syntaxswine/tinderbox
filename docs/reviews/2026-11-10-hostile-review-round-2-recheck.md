# Round 2 re-check: the three handed items on `c855e62`

This is not a review round. No reviewer was run and no score is issued. It re-runs the checks named in the [round 2 handoff](2026-11-10-hostile-review-round-2-handoff.md) against the two passes Codex landed after it, on `master` at `c855e62`. Nothing under `src/`, `tests/`, `tools/` or `assets/` is changed by the reviewer.

**Result: all three handed items are closed.** Every check the handoff named passes. One of round 1's old mutants could not be re-run, and Codex's second pass (floor fire) has had no independent review from this worktree.

## What landed

Seven commits, `26931d9..c855e62`, in two passes:

| Pass | Tip | Codex's record | What it changed |
| --- | --- | --- | --- |
| 1 | `968e88a` | [round-two corrections](2026-11-10-hostile-round-2-fixes.md) | Porch deck in one-metre sections, tool collision from the authored geometry above the plinth, three publication tests, the ground plan's frozen-record check |
| 2 | `c855e62` | [round-three floor fire](2026-11-10-hostile-round-3-floor-fire.md) | House floor fuel follows the rendered oak boards. Found by Codex's art review during pass 1, reviewed by Codex's own reviewer |

Codex's second record is named "round 3". The reviewer's rounds in this worktree are still 1 and 2; its next would also be its third.

## Item 1: the porch deck (N1), closed

| Check | Round 2, `26931d9` | Now, `c855e62` |
| --- | --- | --- |
| `porch-jump.mjs`: first lawn cell beyond the east end, 8.5 m from the match | 1.83 s, lit by the house | 5.72 s, lit by the adjacent grass cell (5.80 s before any contact fix) |
| Same run: deck sections | one site, lit whole | eight, lit in order, 0.63 to 0.70 s apart |
| `r05` P1: two single grass cells 7 m apart | deck ignites at 1.73 s | no ignition; highest preheat 0.829 |
| `r05` P2: 8 m of bare paving along the porch | crossed in 1.75 s | 6.65 s (5 m along a wall: 6.07 s) |
| `r05` P3: one match on the deck, first wave of lawn ignitions | 22 cells in one tick, 8.5 m wide | 2 cells, 0.5 m wide |
| `p03` 3d: porch catches from lawn fire | stairs at 1.85 s | stairs at 1.85 s |
| `p08` 8a: porch catches from the flamethrower | yes | yes, sections 1 and 2 |
| `one-match-census.mjs`, ten cases | | same strike results, sides burned, houses lit and gone, drums, deaths and health; times up to 2.6 s later |

Two readings beside the checks, neither a defect:
- After its first section lights, the deck carries fire at about 1.3 to 1.5 m/s. A wall on the same bench carries it at about 1.0 m/s, grass at 1.5 m/s, and timber laid as ground fuel at 0.53 m/s. Three rates for timber is round 1's M1 (several trackers with their own units), not a new finding.
- In the reviewer's P2, the control "same patches joined by a 0.5 m lawn strip" reads the same as the bare-paving case in both rounds. That control never tested anything.

## Item 2: the notch walls (N2), closed

| Check | Round 2, `26931d9` | Now, `c855e62` |
| --- | --- | --- |
| `setback-wall.mjs`: flamethrower at `wall:0:6,2\|6,3` on Hopkins 9 | no ignition | ignition at 0.25 s |
| Same: flush-wall control, three tools | all light | all light |
| `r04`: set-back panels no ground fire or tool can heat | 21 of 21 | 0 of 21 |
| `r04`: lantern, direct | 0 of 21 | 21 of 21 |
| `r04`: flamethrower, direct | 0 of 21 | 18 of 21; the other three stand 4.09 m back and light by spread |
| `r04`: ground fire, matches, torch | cold | cold, as the handoff accepted |
| `notch-walk.mjs` (new): the bear walks at the notch wall | stops at x 10.66 | stops at x 10.66, the same as at the flush wall; walks 11.9 m on open ground |

`setback-wall.mjs` prints only the first ignition event, which is the neighbouring panel `6,1|6,2`. Codex's test `tests/simulation/setback-wall.test.js` pins `6,2|6,3` itself in the same 0.25 s, and passes.

## Item 3: the three publication tests (S9), closed

`r10-mutants.mjs` on the three named mutants, 291 tests each:

| Mutant | Round 2 | Now | Killed by |
| --- | --- | --- | --- |
| `A02-pool-not-marked-dirty` | passes all tests | KILLED | "a lantern that breaks against siding publishes its unlit pool on impact" |
| `A12-frontX-never-retreats` | passes all tests | KILLED | "the fire front retreats to the rightmost cell still burning" |
| `A11-remaining-fuel-summed-out-of-order` | passes all tests | KILLED | "remaining deposited fuel uses the exact published row-major reduction" |

## Small items

- `src/ui/map.js` now checks each record, not only the list. Done.
- The stale sentence in `docs/engineering/fire-exposure.md` is gone. Done.
- Round 1's four surviving mutants (`mutants-round-1-survivors.mjs`): three still pass all 291 tests (a burning cell that holds no heat, a lantern that always hits the low band, house fire that ignores the powder clock). The fourth, the stair link removed, **could not be run**: pass 2 rewrote the line it patches. Whether a test holds the new stair link is unknown.

## What still holds

- `node tools/check.mjs`: 291 tests pass, with the dependency, provenance and art checks.
- `determinism.mjs`: the state hash is identical under all five frame schedules (`c7f05f3cea1fff45`; it changed from round 2's, as it must when behaviour changes).
- `r01-publication-audit.mjs`: published equals live in every one of 17,056 audited advances.
- `tick-cost.mjs`, both trees alternated twice in one session, CPU ms per frame:

| Phase | `26931d9` | `c855e62` |
| --- | --- | --- |
| idle street | 0.87, 0.74 | 0.91, 1.06 |
| lawn fire 0 to 4 s | 3.06, 2.67 | 2.80, 3.08 |
| lawn fire 8 to 12 s | 4.10, 4.11 | 4.09, 3.90 |
| lawn fire 12 to 16 s | 3.58, 3.01 | 3.96, 3.17 |

  No cost that this instrument can see. **Corrected by [round 3](2026-11-10-hostile-review-round-3.md), S15:** these readings scatter by about 15 % between runs, and a paired measurement found the two passes cost about 10 % more per frame.

## Not checked

- **Codex's floor-fire pass.** About 500 new lines of runtime (`housing-floors.js`, `housing-heat-volumes.js`, the floor links in `housing-topology.js`). Its own reviewer passed it. From here only the gate, the hash, the publication audit, the census and the tick cost were run over it. None of its claims (28 house variants, 24,624 flame splats, zero unsupported origins) was re-measured.
- The browser. No frame time was taken, so round 2's S10 (idle street over 16.7 ms in the reviewer's session) stands as it was.
- Round 1's M1 and M4, not re-measured. M2 shows unchanged in the census: each match still takes all of its own side of the street and none of the other.
- Appearance, and any phone.

Outputs are in [`evidence/hostile-review-round-2/results/recheck-c855e62/`](evidence/hostile-review-round-2/results/recheck-c855e62/).
