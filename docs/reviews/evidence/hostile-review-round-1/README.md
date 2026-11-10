# Evidence for hostile review round 1

The review is [`../../2026-11-10-hostile-review-round-1.md`](../../2026-11-10-hostile-review-round-1.md).

Every probe here drives the published simulation through its public entry point
(`createSimulation`: `dispatch`, `advance`, `snapshot`). None edits game state directly,
and none is imported by the game, its tests or its build. Run each from the repository
root with Node 22 or newer. No install is needed.

Commit under test: `4fc97bb` (`origin/master` on 2026-11-10). The review began on
`14ffede`; every probe was re-run after master moved.

## The bench

| Probe | What it measures | Supports | Runtime |
| --- | --- | --- | --- |
| `scene-map.mjs` | The compiled Catalogue Street as a 1 m map, the ground fuel census, and each house's fire graph: sites, links, connected pieces | M1, D6 | seconds |
| `one-match-census.mjs` | Ten single-match strikes on the real street: how much lawn burns, which houses catch and when, what never catches | M2, D1, D7 | about 10 min |
| `pathways.mjs` | Six pathway checks, each with a control: a bare gap, a bystander and a drum beside a burning house, a burning animal in grass, powder time scaling, the Ashland cottage's flame and collapse times | M2, S1, S6, D3 | about 5 min |
| `structure-spread.mjs` | Fire inside a house by direction: time to upper wall, eave, roof and floors, and the speed of every parent-to-child hop, split into up, level and down | M2, M4, S2 | about 4 min |
| `collapse-clock.mjs` | Whether a house section falls because it burned or because 150 s passed | S1 | about 2 min |
| `ground-front.mjs` | Ground front speed for gas, grass and timber in nine directions at three cell sizes | S5, D1, D2 | about 1 min |
| `determinism.mjs` | The same street fire under five frame schedules, compared by state hash at one tick | D4, S7 | about 2 min |
| `tick-cost.mjs` | CPU time per tick, split into step and snapshot, idle and through a lawn fire, with the opening test street as the control | M5, D9 | about 2 min |
| `profile-frame.mjs` | A V8 sampling profile of the same frames: where the CPU goes, as shares | M5 | about 1 min |
| `art-cell-loops.mjs` | CPU per frame of the snapshot plus the two art modules that re-read every ground cell | M5 | seconds |
| `browser-frame-cost.md` | The same question in the real game in a browser, with a control in the same page | M5, D9 | manual |
| `lattice-kernel.mjs` | The reference kernel for the proposal: the shipped ground rule on a sparse 3D lattice of tiles | Proposal | library |
| `lattice-demo.mjs` | Four measurements on that kernel: parity with the shipped ground field, spread along every axis, the real street, cost | Proposal | about 3 min |
| `lib.mjs` | Shared helpers: match press, event log, table printer | | library |

`results/` holds the JSON each probe wrote on the review host at `4fc97bb`. Re-running
a probe overwrites its file. `lattice-demo.mjs` reads three of those files to print the
shipped game's numbers beside its own, so run `ground-front.mjs`, `tick-cost.mjs`,
`structure-spread.mjs` and `one-match-census.mjs` first.

## The reviewer's probes

`reviewer/` holds the hostile reviewer's own probes for the findings the review adopted.
They were written without sight of the bench. Only their path constants were changed,
to make them portable. `reviewer/results/` holds each one's output on
`4fc97bb`.

| Probe | What it shows | Supports |
| --- | --- | --- |
| `p02-anisotropy.mjs` | A poured line's burn time by heading; the repository's 3.08% figure reproduced, and 13.9% over six headings | S3 |
| `p03-vertical-and-gaps.mjs` | The height each tool can light; hit points beside a burning wall; a drum beside burning fuel; lawn fire against a porch | M3, M4, S6 |
| `p04b-id-switch.mjs` | One house, two scenario ids, two fire models | M1 |
| `p07-contact-rows.mjs` | Which ground cells along a wall can light its siding | M3 |
| `p08-defects.mjs` | Flamethrower against a porch; the ignition threshold in the configuration; rubble heat; a drum beside a burning wall | M1, M2, M3, D10 |
| `p09-determinism-ledger-events.mjs` | Frame-schedule digests, the fuel ledger, the event window | D4, D8 |
| `p12-landmarks.mjs` | The three landmark maps: size, levels, accepted commands, fire state | M1, M4 |
| `p13-reset.mjs` | Reset against a fresh simulation | D5 |
| `p14-cottage-vertical.mjs` | What first lights each layer of an Ashland cottage | M4 |
| `p15-floor-fuel.mjs` | Fuel in the shop floor cells under wooden props | S7 |
| `p17-house-to-lawn.mjs` | How far a burning house lights grass | M2 |
| `run-mutants.mjs`, `mutant-hook.mjs` | The repository's tests run against in-memory mutants. Usage: `node run-mutants.mjs all <name>[,<name>]` | S4 |

`reviewer/results/mutants-14ffede-*.txt` is the reviewer's full run of 22 mutants and two
controls. `mutants-4fc97bb.txt` is the re-run of three survivors and the identity
control against all 259 tests.

## Reading the numbers

- Times are **world seconds**, the clock fire runs on. Without powder one world second
  is one real second.
- A **cell** is one 0.5 m square of the ground field. A **site** is one fire-carrying
  patch of a house. A **section** is a 2 m column of a house's plan. A **tile** is one
  unit of the proposed lattice.
- The review host was at 100% CPU from unrelated jobs. Cost figures are therefore CPU
  time (`process.cpuUsage`) averaged over a window, profiler shares, or medians checked
  against a control measured under the same load. No wall-clock percentile is quoted.

## Tuning constants outside `DEFAULT_CONFIG`

Counted by reading the source at `4fc97bb`. Geometry offsets and numbers that only shape
smoke are left out. The counts are approximate; the point is the order of magnitude and
where the numbers live.

| File | About | Examples |
| --- | ---: | --- |
| `src/simulation/cottage-fire.js` | 37 | ember limit 84, ember ignition 0.30, flight 9.35 s, wave timing 4.4 and 0.69 s, falling-fuel heat 1.24, flamethrower share 0.42 |
| `src/simulation/surface-fire.js` | 30 | siding probes at 0.38 and 0.84 m with couplings 0.024 and 0.018, grass gain 2.5, travel base 1.17 with slope terms 0.95 and 0.42, retained heat `min(1, age/8) * exp(-age/260)` |
| `src/simulation/housing-topology.js` | 27 | burn times 7 to 10 s per part, cooling 0.075, link gains 1.8, 1.65, 1.55 and 1.4, linking distances |
| `src/simulation/cottage-topology.js` | 12 | burn times 10 to 16 s, threshold 1, cooling 0.075, heat limit 2.5 |
| `src/simulation/cottage-radiation.js` | 5 | range 16 m, near floor 1 m, gain 2.4 |
| `src/simulation/rubble-heat.js` | 4 | range 3 m, rate 1.5 per metre, fade exponent 1.35 |
| `src/simulation/joined-roof-fire.js` | 2 | seam warm-up 0.5 s, 0.58 heat per metre second |
| `src/content/housing-sections.js` | 2 | section 2 m, rubble 24 s |
| `src/simulation/tools.js` | 2 | flamethrower share 0.42, lantern share 0.70 |
| `src/simulation/config.js`, outside the object | 1 | `STRUCTURE_DECAY_SECONDS` 150 |

## What the lattice kernel is and is not

`lattice-kernel.mjs` is 180 lines. It is `src/simulation/field.js`'s rule (a travel
deadline, stored heat with cooling, finite fuel) with three additions: a height index,
a conductance on each tile face, and a multiplier for the vertical part of a direction.
Part A of the demo shows it reproduces the shipped ground field exactly on flat ground.

It is evidence that the proposal is workable. It is not a candidate for the game:

- Houses are extruded from the plan outline with open interiors. Rooms, stairs and
  internal walls are not modelled.
- Every house tile carries the same fuel. The shipped model separates wall, floor,
  joinery, fascia and roof burn times.
- Radiation has no facing-angle term and runs between house shells only.
- There is no falling debris, no embers, no structural clock and no rubble.
- The house constants (`speed 1.5`, `receive 0.5`, `up 1.6`, `down 0.5`, 9 s of fuel)
  were chosen once by hand to land near the shipped timings. They were not fitted.
