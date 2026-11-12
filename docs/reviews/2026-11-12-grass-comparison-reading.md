# The furnished-house grass comparison: a reading for the architect

- **Asked by the owner, 2026-11-12.** He passed on the architect's line, "Reviewed 66febf33: accepted as a numerical research checkpoint", and said "sure" to having these points written up.
- **What this is:** a reading of `origin/codex/furnished-house-grass-comparison` at `66febf33` (`docs/engineering/furnished-house-grass/README.md`, `results.md` and `bedroom-matched-180/README.md`), from the reviewer's worktree. Nothing on that branch was run or touched. Every statement about the workbench is from the coder's own records. It is not a hostile review.
- **Why the reviewer is writing:** the trial began as the first check in [the reading of the replay](2026-11-11-furnished-house-replay-reading.md). In the reviewer's own kernel a lawn rang a burning house. These are the three things that reading turns into now that the workbench has been measured.

## 1. Answered: a house fire is not ringed by its own lawn in the workbench

| | Reviewer's kernel (rounds 6 and 7) | Workbench (the coder's results) |
| --- | --- | --- |
| Grass first lights | 0.4 s after a match outside a wall | Kitchen start: 157.0 s, from burning debris that fell on it. Bedroom start: 162.7 s |
| Outside walls by then | Not yet lit; the grass lights them | Kitchen: all 156 patches lit by 47.4 s, 110 s before the grass |
| Half the house, with and without grass | 28 s against 45 s | Kitchen: 37.0 s against 36.7 s |

The workbench is the one to believe. It has the real 0.36 m stone plinth with the timber raised clear of the turf, and its replay's match is inside the wall. My kernel put wood on the ground and the match outside. The accepted developing fire survives a lawn, for a fire that starts in the house.

## 2. Raised: the bedroom start burns 39 s sooner when cold ground exists beside the house

- Bedroom start, half the house ever ignited: **156.3 s with no ground, 117.5 s with the lawn.** 90 %: 195.9 s against 164.5 s. First lower outside timber: 156.3 s against 119.6 s.
- The grass does not light until 162.7 s.
- The coder's matched run, with the same lawn unable to burn, reproduces the 50 % and 90 % times exactly, and every saved house state through 162 s.

So the difference is caused by adding cells outside the house, not by fire in the grass. The coder says this plainly and does not call it a defect. I would chase it, for two reasons.

- **It is a quarter of the timeline of one of the two reference starts,** and it depends on something that is not fire or fuel. Which bedroom timeline is the real one, with ground or without, is not known. The kitchen replay the owner accepted moves by under a second either way.
- **I have seen this shape before.** In my kernel, round 2 found that adding empty air tiles above the roofs changed the whole-house timing with nothing new burning. There the cause was that a surface with no tile on one side could not burn from that side.

A possible cause, from the coder's own notes and not tested by me: the grass cells' representative centre is at Y = −0.05, below opaque soil, where the upward path has transmission 0. Heat that left the house and used to be written off may now land in those cells, find its way up blocked, and be spread sideways into the foot of the walls by the rule that redistributes blocked upward heat. The notes say the initial radiation receiver selections "demonstrably differ", which is a second candidate: 24 representative links are chosen per source, and more candidates change which are chosen.

Three cheap checks, none needing a long burn beyond the bedroom prefix already run:

1. **The heat ledger of the two bedroom runs, by entry, through 120 s.** If the escape entry falls in the matched run by about what the outside walls gain, the cold cells are catching heat that used to leave.
2. **The same non-burning lawn with its representative centres lifted just above the soil.** If the 39 s goes away, the below-soil centre is the cause.
3. **The same non-burning lawn with the radiation receiver list frozen to the no-ground run's selection.** If the 39 s goes away, it is the selection.

## 3. Untested: a lawn fire arriving at a house that is not burning

The contract said not to light the grass first, so this was out of scope, and rightly for a first trial. It is the case that matters on the street.

- The coder's path audit says that from burning grass the representative paths to the wall are blocked, both of them, while "a potential air-side physical path to nearby timber above the plinth is clear".
- If the blocked paths are what the simulation uses, a lawn fire may never light a house in the workbench.
- Today's game does the opposite. Round 1 of the hostile review measured one match on the north lawn taking all three houses there.
- My kernel did the opposite too, wrongly fast, and round 7 showed why: the tile above burning grass reached full heat and lit the wall over any plinth.

Neither extreme is obviously what the owner wants, and he has not ruled: "should a lawn fire always take everything" has been his open decision since round 1. One short case would show where the workbench stands: the same house and lawn, the house cold, the grass lit at the lawn's edge, run until the lawn is spent (it burnt out in about 10 s end to end in the primary cases) and a minute beyond. Report whether any house timber lights, where, and by which path.

## Smaller notes

- **The lawn burns very fast:** first to last grass ignition in 10.1 s over 200 m². The coder flags this as subject to the below-soil limitation. If check 2 above changes it, that is worth knowing before anyone judges how a lawn fire looks.
- **Wind was on** (1.5 m/s east) in every case and my lawn trials had none, so nothing in my numbers says how the ring should look by side.
- **The 3 m lawn is enough.** My round 7 reviewer got the same result at 3, 6 and 12 m in my kernel.
- **The house area is "authored fuel-surface area"**, finishes and contents included. That is a fair denominator and the coder says what it is; it is not the same as my "half of the house's fuel objects", so the two sets of percentages are not comparable and should not be put side by side.

## Not done

Nothing was run. The paired pictures and animated comparison the contract asks for were not seen; the coder's notes say they are still open. The path audit, the ledgers and the matched run were read, not checked.
