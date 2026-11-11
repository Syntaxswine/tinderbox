# Evidence for the fire-travel rules trial

The rules and the trial's results are in [`../../2026-11-11-fire-travel-rules.md`](../../2026-11-11-fire-travel-rules.md).

Nothing here is game code, and nothing here is imported by the game, its tests or its build. The
only thing read from the game is the house plan data in `src/content/housing-plans.js`.
Run from the repository root with Node 22 or newer.

| File | What it is |
| --- | --- |
| `kernel.mjs` | A stand-alone kernel that runs the proposed rules on a sparse grid of tiles, 0.5 x 0.5 x 1.06 m, in steps of 1/30 s. `DEFAULT_RULES` and `DEFAULT_FUELS` hold the tuned numbers |
| `scene.mjs` | Builds lawns, paving and houses. A house is rasterised from a catalogue plan: rooms, outside walls, windows, partitions, shut doors, the stair opening, floors, roof, and contents by room type |
| `trial.mjs` | Fourteen measurements against the targets, on a scene of three Hopkins 15 houses. About a minute |
| `results/trial.txt` | The printed result of the final run |
| `results/trial.json` | The same, with the rule and fuel values used |

`node docs/reviews/evidence/fire-travel-rules-trial/trial.mjs '{"up":1.4}'` re-runs with a rule
overridden; a second argument overrides fuel values.

The kernel's numbers were changed several times to reach the final result. The record lists
every change to a rule and what showed it was needed. The intermediate runs were not saved.
