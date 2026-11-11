# Evidence for the fire-travel rules trial

The rules and the trial's results are in [`../../2026-11-11-fire-travel-rules.md`](../../2026-11-11-fire-travel-rules.md).

Nothing here is game code, and nothing here is imported by the game, its tests or its build. The
only thing read from the game is the house plan data in `src/content/housing-plans.js`.
Run from the repository root with Node 22 or newer.

**This is the second version.** The first (commit `d78005b`) was reviewed and scored 3 out of 10;
see `reviewer-round-1/REPORT.md`. The kernel, the scene builder and the trial were rewritten after it.

| File | What it is |
| --- | --- |
| `kernel.mjs` | The rules, on a sparse grid of tiles 0.5 x 0.5 x 1.06 m, in steps of 1/30 s. `DEFAULT_RULES` and `DEFAULT_FUELS` hold the numbers. It reads only tiles, fuels and faces; `room` and `building` on a tile are labels for counting |
| `scene.mjs` | Builds lawns, paving and houses. A house is rasterised from a catalogue plan: rooms, outside walls, windows, partitions, shut doors, the stair opening, floors, roof, contents by room type, and one ring of empty outdoor tiles round it |
| `measure.mjs` | One burning house, measured: the strikes, room alight, half alight, flame, falls, cost |
| `survey.mjs` | Targets 4 to 8 on one plan, every strike. Run once per plan; a minute or two each |
| `trial.mjs` | All the targets. Reads the surveys. About four minutes |
| `grass.mjs`, `wall.mjs`, `pair.mjs`, `cost.mjs` | Targets 1, 3, 11 and 12, and 15, each runnable alone |
| `quick.mjs`, `panel.sh` | One house and one strike on one line; ten strikes across the plans in parallel. For checking a changed number |
| `results/trial.txt`, `results/trial.json` | The printed result of the final run, and the rule and fuel values used |
| `results/survey-<plan>.json` | Every strike of the survey |
| `results/reach-under-cover/` | The ten-strike panel and the cost of one house, with reach limited to the open (the rule) and with it allowed under cover |
| `results/first-version/` | The first trial's output. Withdrawn |
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

What was not kept: the tuning runs between the first version and the second. About fifteen numbers
were changed or added, judged on the ten-strike panel. Only the final numbers and their results are here.
