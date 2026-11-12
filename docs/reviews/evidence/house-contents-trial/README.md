# Evidence for the house-contents evaluation

The evaluation is [`../../2026-11-11-house-contents-evaluation.md`](../../2026-11-11-house-contents-evaluation.md).

Commit under test: `c855e62`. Nothing here edits the checkout, and nothing here is imported by the
game, its tests or its build. The trial changes the game **in memory only**, through `hook.mjs`.
Run from the repository root with Node 22 or newer.

| File | What it is |
| --- | --- |
| `contents-patch.mjs` | The trial itself: a block added at the end of `createHousingTopology` that places furniture, oil and coal sites by room type. Its `PROFILES` table holds the invented numbers. Also a second what-if that slows the shell, and a read-only tap |
| `hook.mjs` | The loader hook that applies a patch in memory (copied from round 3's reviewer) |
| `trial.mjs` | One real match on an outside wall of Hopkins 15, at the kitchen and at the sitting room, for nine variants, 165 s each. About 4 minutes |
| `results/trial.txt` | Its printed output |
| `results/trial.json` | The same, with every contents site's ignition time and the heat rate once per second |
| `results/gate-under-patch.txt` | The game's 291 tests run with all three kinds of contents switched on |
| `pictures/` | Four pictures of Hopkins 15, taken in the Claude desktop browser pane from the game's own art modules and lights |

## The pictures

Taken by building one Hopkins 15 with `createHopkinsHouse(..., {furnished: true})` in a page served
from this tree, with the runtime's and the art scene's lights, and the game's camera direction.

1. `1-ground-floor-furnished.jpg`: `setView({view: 'cutaway', level: 0, showFurniture: true})`. Unaltered art.
2. `2-stores-placed.jpg`: the same, plus simple shapes for two oil cans and a coal bin, and one settee given a glossy dark finish.
3. `3-kitchen-fire-mock.jpg`: the day lights dimmed, a point light, a disc and cones drawn by hand. A mock.
4. `4-street-view-mock.jpg`: `setView({view: 'exterior'})`, with a glow in the kitchen window and cones outside it. A mock.

## To re-run the tests under the patch

```
node -e "import('./docs/reviews/evidence/house-contents-trial/contents-patch.mjs').then(m=>process.stdout.write(JSON.stringify([m.CONTENTS_PATCH])))" > patch.json
NODE_OPTIONS="--import file:///<absolute path to>/hook.mjs" TB_PATCHES="$(cat patch.json)" TB_CONTENTS='{"furniture":true,"lacquer":"some","oil":true,"coal":true}' node --test --test-reporter=tap
```
