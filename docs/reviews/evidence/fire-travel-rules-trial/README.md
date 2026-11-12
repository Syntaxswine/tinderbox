# Evidence for the fire-travel rules trial

The rules and the trial's results are in [`../../2026-11-11-fire-travel-rules.md`](../../2026-11-11-fire-travel-rules.md).

Nothing here is game code, and nothing here is imported by the game, its tests or its build. Two
things are read from the game: the house plan data in `src/content/housing-plans.js` and the outside
wall edges, windows and front door from `exteriorPlanEdges` in `src/content/housing-envelope.js`.
Run from the repository root with Node 22 or newer.

**This is the second kernel, corrected after each of five more reviews.** The first (commit `d78005b`) was
reviewed and scored 3 out of 10; see `reviewer-round-1/REPORT.md`. The kernel, the scene builder and the
trial were rewritten after it (commit `9b521a2`). That was reviewed and scored 5 out of 10; see
`reviewer-round-2/REPORT.md`. Its corrections (commit `d953ce0`) were reviewed and scored 6 out of 10; see
`reviewer-round-3/REPORT.md`. Round 3's corrections, the largest being that reach
across a gap (Rule 6) is withdrawn (commit `06061b0`), were reviewed and scored 6.5 out of 10; see
`reviewer-round-4/REPORT.md`. Round 4's corrections, the largest being a kernel
fix (a warm tile wakes the surfaces standing against it; commit `b6cc2a5`), were reviewed and scored 7.5 out
of 10; see `reviewer-round-5/REPORT.md`. Round 5's corrections (commit `28d3931`) were reviewed and scored 7 out of 10; see
`reviewer-round-6/REPORT.md`. Round 6's corrections, the largest being that the survey
is also run with each house on a lawn (commit `378c542`), were reviewed and scored 7 out of 10; see
`reviewer-round-7/REPORT.md`. The owner stopped the loop there. Round 7's must-fix items are corrected in the
record's text; its should-fix items are open and listed in the record.

| File | What it is |
| --- | --- |
| `kernel.mjs` | The rules, on a sparse grid of tiles 0.5 x 0.5 x 1.06 m, in steps of 1/30 s. `DEFAULT_RULES` and `DEFAULT_FUELS` hold the numbers. It reads only tiles, fuels and faces; `room` and `building` on a tile are labels for counting. Reach (`reach`, `reachUnderCover`) is still in the code, off by default, so its cost can be measured |
| `scene.mjs` | Builds lawns, paving and houses. A house is rasterised from a catalogue plan: rooms, outside walls, partitions, shut doors, the stair opening, floors, roof, the porch, contents by room type, one ring of empty outdoor tiles round it and one layer of them above its highest roof. Windows and the front door come from the game's `exteriorPlanEdges` |
| `measure.mjs` | One burning house, measured: the strikes, room alight, half alight, flame, falls, cost |
| `survey.mjs` | Targets 4 to 8 on one plan, every strike. Run once per plan; a minute or two each. A last argument `lawn` stands the house on grass |
| `late-tile.mjs` | A check of one kernel path no scene uses: a tile laid after the first step |
| `trial.mjs` | All the targets. Reads the surveys. About five minutes |
| `reach-options.mjs` | What each form of reach would buy and cost. Reads three surveys: the main one, and `survey.mjs <plan> '{"reach":3}' '{}' results/reach-options/open` and `survey.mjs <plan> '{"reach":3,"reachUnderCover":true}' '{}' results/reach-options/cover` for each plan. The last takes over half an hour |
| `grass.mjs`, `wall.mjs`, `pair.mjs`, `cost.mjs` | Targets 1, 3, 11 and 12, and 15, each runnable alone |
| `quick.mjs`, `panel.sh` | One house and one strike on one line; ten strikes across the plans in parallel. For checking a changed number |
| `results/trial.txt`, `results/trial.json` | The printed result of the final run, and the rule and fuel values used |
| `results/survey-<plan>.json` | Every strike of the survey |
| `results/reach-options/` | The two reach surveys and `summary.txt` |
| `results/lawn/` | The survey with each house on a lawn: `survey.mjs <plan> '{}' '{}' results/lawn lawn`. The trial reads it |
| `results/layer/` | Lawn surveys for the proposals in `../../2026-11-11-another-layer.md`: a stone plinth (`survey.mjs <plan> '{}' '{}' <dir> lawn plinth`), a low grass flame (fuels `'{"grass":{"rises":0.2}}'`), a cool grass flame (`'{"grass":{"hot":1.6}}'`) and their combinations. `summarise.mjs <dir> ...` prints targets 4 and 5 for any survey directory. These three numbers are off by default and are not part of the reviewed rules |
| `results/roof-delay-3/` | The survey with roof delay 3 s in place of 8 s: `survey.mjs <plan> '{}' '{"roof":{"delay":3}}' results/roof-delay-3`. The trial reads it for target 5 |
| `results/first-version/` | The first trial's output. Withdrawn |
| `reviewer-round-7/` | The round 7 reviewer's probes, results and report. They ran against commit `378c542` |
| `reviewer-round-6/` | The round 6 reviewer's probes, results and report. They ran against commit `28d3931` and its own copies of that scene and measuring code |
| `reviewer-round-5/` | The round 5 reviewer's probes, results and report. They ran against commit `b6cc2a5` and its own copies of that kernel and measuring code |
| `reviewer-round-4/` | The round 4 reviewer's probes, results and report. They ran against commit `06061b0` and its own copies of that kernel, scene and measuring code |
| `reviewer-round-3/` | The round 3 reviewer's probes, results and report. They ran against commit `d953ce0`, using that commit's kernel and scene directly |
| `reviewer-round-2/` | The round 2 reviewer's probes, results and report. They ran against commit `9b521a2` and its own copies of that kernel, scene and measuring code |
| `reviewer-round-1/` | The round 1 reviewer's probes, results and report. They ran against the first kernel and its own copies of it (`kernel-var.mjs`, `scene-var.mjs`); `r02` compares against the first `kernel.mjs`, which is now only in git |

To reproduce:

```bash
for p in hopkins-4-15 hopkins-4-12 hopkins-4-09 hopkins-4-13 ashland-worker monroe-row; do node docs/reviews/evidence/fire-travel-rules-trial/survey.mjs $p; done
```

```bash
node docs/reviews/evidence/fire-travel-rules-trial/trial.mjs
```

To change a number without editing a file, most scripts take rule and fuel overrides as JSON, for
example `quick.mjs hopkins-4-15 room:0:kitchen '{"through":2}' '{"door":{"burnFor":30}}'`.

What was not kept: the tuning runs. About fifteen numbers were changed or added between the first
version and the second, judged on the ten-strike panel, two more after round 2 (clapboard delay,
roof delay) and three after round 3 (heat ceiling, door delay, reach off). Only the final numbers and their results are here.
