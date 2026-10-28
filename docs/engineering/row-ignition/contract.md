# TB-018 shared simulation contract

Base: `3c6001d5d4035e950f25e500294eaec55bbf81d2`. Existing raw artist, Nautilus, Farmyard and bear imports are unchanged. This candidate implements code-side state/physics only. The artist owns `src/art/neighborhood.js`, joined variants and carried flame; the UI specialist owns all interface semantics. Their exact candidates and combined semantic checks remain pending.

## Row descriptors

`building.partyWalls = {left: neighborIdOrNull, right: neighborIdOrNull}` uses original local X=0/X=7. The compiler derives it only for full-depth Monroe placements at exactly 7m local-X pitch and the same quarter turn (numerical tolerance 1e-8m). Callers cannot supply a joined side. All other overlaps are still rejected. Standalone sides are null. Joined foundation rims stop at the party plane; exposed sides retain .09m. Porch/stair footprints are unchanged.

The demo has eight instances from the existing six designs: Monroe origins `(27,31)`, `(34,31)`, `(41,31)`, q0, within a 51 x 47m world. Other authored placements/player/civilians remain. Adjacency is compiled once per scenario/reset and is retained after neighbor burnout; a surviving side does not gain a window.

Each joined foundation collider carries detached `heatBarriers` for its native .16m party wall, across the 13m side and existing wall height. These are heat/impact barriers within the existing solver, not extra collision members. They override combustible-endpoint heat shortcuts. Each unit keeps its three existing collider IDs and its independent finite fuel/burnout group. A surviving unit retains its wall barrier after its neighbor disappears; the barrier leaves with its own unit. Heat can still travel by actual fueled paths around a wall end. Adjacency never ignites a whole group or row.

## Torch snapshot and actions

`player.torch = {phase: 'unlit'|'lit'|'spent', remainingSeconds, durationSeconds}` is detached. Inventory `torchFuel` remains authoritative; seconds equal fuel / `tools.torch.fuelPerSecond`. Initial default stock 5 and rate .12 give 41.6667 world seconds. First use changes unlit to lit, with no match cost and no ground heat. Fuel then ages continuously on world time, including movement, idle, other selected tools and death. Pause freezes it; powder slows it with world fire. Reset restores initial unlit stock. Zero stock is spent.

A later primary rising edge makes one bounded ignition attempt using the old 1.1m reach / .4m source disk and obstruction. Holding or repeating a true command does not repeat ignition. No new heat comes from simply carrying a lit torch. Exhaustion emits `torch-spent` once and prevents further use. Cancellation/pause/death/reset require release before a stale held primary can be reused. Tool switching does not pause the burn.

`torch-lit` carries `tool:'torch'` and `durationSeconds`. Normal `tool-use` with `result:'lit'` accompanies the first lighting. Existing discharge **v1 is unchanged**: a successful later use publishes one active simulation-tick torch disk/lead, then goes inactive on the next tick. It represents that one emitted heat source, not a held or passive flame. `usingTool` is true only for that pulse. The artist/UI must use `player.torch.phase` for the carried flame and lit/spent state, and world time for flame animation. No new visual pulse fields are required.

## Match tile and feedback

Matches retain the existing .85m directional short reach. The aim is clamped to that reach, then selects a world-aligned 1m tile. `tile = {x,y,width,depth}` gives its authoritative lower corner and clipped world extent. At .5m solver resolution it contains four cells; at .25m it contains sixteen. Only fully contained cells can receive direct heat, with obstruction/surface checks clipping blocked portions. Adjacent tiles receive no direct heat. No fuel is invented. A positive-stock match attempt consumes one match even when blocked or unsuitable; empty attempts consume none. Only a new primary rising edge strikes again.

Ignition `tool-use` / `tool-rejected` events retain unique IDs/ticks and add `result`, `heatedCells`, `cellIds`; match events also carry `tile`. Results are `ignited` (a seeded cell is actually burning after this tick's solver step), `heated` (fuel received heat but has not ignited under the chosen configuration), `no-fuel`, `blocked`, or `empty`. Rejections also carry the same `reason`. Empty match events include their tile. A torch's first `tool-use` has result `lit` and no target heat cells. These are authoritative results, not inferred from particles. Nested event/tile/cell-ID data and obstacle barriers are deep-copied in snapshots.

## Material response

The existing finite solver retains its base gas front speed 4m/world-second and heat rate 40. `fire.propagation` adds per-fuel speed/heat multipliers: gas 1/1, grass .5/.65, timber .2/.35. Edge transfer uses the slower participating policy; deposited gas takes priority while present, and the remaining substrate does not become invented wood. Existing finite density/burn rates make grass shorter-lived than timber. These are adjustable game defaults, not measured combustion properties. No wind, room/roof transfer, ventilation or structural fire model is added.
