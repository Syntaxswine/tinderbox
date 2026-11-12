# The furnished-house replay: a reading against the rules review

- **Asked by the owner, 2026-11-11:** "you might want to review the last push the architect did on tinderbox. they added a visual referance, they are now working on simplifying the visual costs. the math was actually the cheap part."
- **What this is:** a reading of `origin/codex/review-furnished-house` at `25095656`, from the reviewer's worktree. Nothing on that branch was touched or run. It is not a hostile review round: no probe was run against the workbench, and every statement about its code is from reading it.
- **Why it matters here:** the workbench froze the fire-travel rules at reviewer commit `9b521a2`. Five more review rounds have run on those rules since. This note says which of their findings reach the workbench and which do not.

## What the architect delivered

- [Milestone 18](https://github.com/Syntaxswine/tinderbox/blob/codex/review-furnished-house/docs/milestones/18-furnished-house-replay.md) on that branch: one furnished Hopkins 15 in a workbench, with its own simulation (`workbenches/furnished-house/simulation.js`, "adapted from the frozen second fire-travel trial"), ten resolved rules, and a 330-second WebGL replay.
- My kernel and scene are kept unmodified under `workbenches/furnished-house/upstream/` as evidence. The SHA-256 of that kernel matches `9b521a2` (`16a56be0…`). The workbench does not import them.
- The owner accepted the movie as the behaviour and look to keep, and said high cost is acceptable at this stage. Production integration is held.
- Cost at 120 world seconds, one house, per 1/30 s step (their `performance.md`): **presentation 157.9 ms, simulation 26.7 ms, render submission 1.8 ms, GPU 7.7 ms.** The owner's correction stands: the fire arithmetic is about a seventh of the total and the drawing preparation is the rest. Their next pass profiles and cuts the presentation cost.

## Findings of review rounds 2 to 6 that do NOT reach the workbench

By reading `simulation.js`. Each of these was a fault in my kernel that the coder's version does not share.

| Round | Fault in the reviewer's kernel | In the workbench |
| --- | --- | --- |
| 2 | "Oil bursts at 1.4" was a dead number; the can burst at 0.6 | `burstAt` is live: a store is tested against it and never takes the ordinary lighting path (line 249) |
| 2 | Embers created fuel from nothing (round 1), then needed a ledger | A finite budget with a closing fuel and heat ledger is the contract, and has a test |
| 3 | Reach warmth had no ceiling and was not spent from any budget | Radiation is a declared 0.16 share of the heat a fuel releases, with a cap and an escape entry |
| 4 | A surface in a sleeping tile was never looked at, so a wall facing hot air never charred | Every unlit fuel is visited every step and reads the hottest of its own cells (lines 247–251) |
| 5 | Char did not fade in a sleeping tile | Same loop: it fades every step |
| 6 | A fuel that falls is burnt twice in its step | A test asserts falling lit furniture "burns once per tick" |
| 2, 3, 6 | The scene had no air above roofs, no porch, no windows on two plans, furniture against a wall | The workbench uses the artist's measured geometry, not my scene builder |

## Findings that the workbench cannot show yet, and should be checked when it can

These are not faults in the workbench. They are things the rules review learnt that a one-house fixture on no ground cannot show either way.

1. **Grass against the walls** (round 6). In my kernel a house on a lawn was half alight in a median of 28 s against 45 s on bare ground, because the grass took the fire round it; a match held outside a wall lit the grass in 0.4 s. The workbench has one house and, as far as I can read, no lawn fire. When this house goes onto the street's grass, run the kitchen and bedroom starts again with lawn up to the walls. The accepted "developing fire" may not survive it.
2. **Radiation along the house's own surfaces** (round 3). In my kernel, reach across a gap became the main carrier across a continuous roof: 0.66 m/s against 0.14 m/s by contact. The workbench radiates over 8 m through real exposed paths. A control worth having: the same burn with the radiant share set to nothing, to see how much of the spread over the house's own roof and walls is radiation.
3. **The house next door.** My kernel never settled this: three forms of reach were tried and each failed a review. The workbench reports dose at 2 m and 8 m (16 to 1) and makes no ignition claim, which is the right state. It is still the owner's open decision.
4. **Climb against creep.** The workbench's control gives 2.1 to 1. My target was 2.5 to 3.5 and the owner has not ruled on a number. Noted, not a defect.

## What this changes for the rules review

- The rules record (`2026-11-11-fire-travel-rules.md`) is no longer what the coder builds from; milestone 18's ten resolved rules are. Its remaining use is as a list of traps, and the table above says which ones the coder has already stepped round.
- A seventh review round of that record was already running when this was written. Its result will be recorded; after it, more rounds on the record have little to offer the architect.
- What would help the architect now is a hostile review of the workbench itself: the accepted replay, its controls and its cost split. That is a new piece of work and has not been started.

## Not done

Nothing was run. The movie was not watched. The workbench's tests, its 330-second trace, its cost measurements and its art were not checked. Line numbers are from `simulation.js` at `25095656`.
