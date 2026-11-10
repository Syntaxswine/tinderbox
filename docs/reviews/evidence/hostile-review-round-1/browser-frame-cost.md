# Frame cost in the real game, with a same-page control

Measured 2026-11-10, twice: on `14ffede` and again on `4fc97bb` after master moved.
The game was served from source with the repository's own `tools/serve.mjs` and opened
in Chromium 152 (the Claude desktop browser pane). Renderer string reported by the
game: `ANGLE (NVIDIA GeForce RTX 3080, Direct3D11)`. CPU: AMD Ryzen 7 5800X. Viewport
1024 x 462.

This is the same machine the repository's own performance records were taken on.

## Why there is a control

The host was at 100% CPU from unrelated jobs during the review, and the pane was
hidden, so `requestAnimationFrame` was throttled. Neither a wall-clock figure nor an
observed frame rate can be trusted on its own.

The control removes both problems. The opening test street (`scenario: 'street'`,
20 x 16 m) is the scene the repository's recorded figures come from: simulation p95
1.30 ms and view p95 2.30 ms (`docs/reviews/2026-10-27-burning-trail.md`). A second
runtime for that scene was created **in the same page**, and both runtimes were driven
by hand with `runtime.advance(1/60)`, 50 to 120 frames at a time, alternating. Same
origin, same load, same instrument. `simulationMs` is the game's own metric
(`src/runtime/index.js:40`); "view" is the rest of the `advance()` call, which is
`art.update` + `ui.update` + `renderer.render`.

If load or the hidden pane inflated the numbers, the control would read high. It reads
1.0 to 1.2 ms and 2.1 to 2.8 ms, which is the recorded figure.

## Correction, 2026-11-10: quiet-host figures

The control did not remove the load effect. Load inflated the large scene about three
times and the small control much less. Re-taken on `4fc97bb` with the host at 25% load:

| Scene | Simulation | View | Whole frame | Draw calls |
| --- | ---: | ---: | ---: | ---: |
| Opening test street (control) | 0.4 | 0.7 | 1.1 | 87 |
| Catalogue Street, nothing lit | 4.2 to 4.4 | 11.9 to 12.3 | 16.6 | 2431 |

Use these. The tables below are the loaded-host sessions, kept for the record.

## Loaded-host sessions (medians, ms per frame)

| Commit | Scene | State | Burning cells / sites | Simulation | View | Whole frame | Draw calls |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| `4fc97bb` | Opening test street (control) | idle | 0 / 0 | 1.0 | 2.1 | 3.1 | 87 |
| `4fc97bb` | Opening test street (control, repeat) | idle | 0 / 0 | 1.0 | 2.2 | 3.2 | 87 |
| `4fc97bb` | Catalogue Street | idle, nothing lit | 0 / 0 | 11.5 | 51.0 | 63.0 | 2431 |
| `4fc97bb` | Catalogue Street (repeat) | idle, nothing lit | 0 / 0 | 11.8 | 55.0 | 68.3 | 2431 |
| `4fc97bb` | Catalogue Street | lawn fire | 58 / 0 | 14.7 | 48.8 | 63.6 | 2464 |
| `4fc97bb` | Catalogue Street | lawn fire | 177 / 18 | 16.3 | 52.1 | 68.2 | 2459 |
| `14ffede` | Opening test street (control) | idle | 0 / 0 | 1.2 | 2.6 | 4.3 | 87 |
| `14ffede` | Opening test street (control, repeat) | idle | 0 / 0 | 1.1 | 2.8 | 4.3 | 87 |
| `14ffede` | Catalogue Street | idle, nothing lit | 0 / 0 | 12.9 | 42.8 | 56.5 | 2431 |
| `14ffede` | Catalogue Street | lawn fire | 238 / 35 | 16.7 | 45.9 | 65.0 | 2452 |
| `14ffede` | Catalogue Street | lawn fire | 333 / 283 | 15.9 | 46.9 | 63.7 | 2451 |
| `14ffede` | Catalogue Street | lawn fire | 371 / 572 | 16.2 | 46.5 | 63.0 | 2450 |

The 60 Hz budget is 16.7 ms. With nothing lit, Catalogue Street spends 56 to 68 ms of
main-thread time per frame. That is 13 to 21 times the control and 3.4 to 4.1 times
the budget. Fire adds a few milliseconds on top.

## Where a Catalogue Street frame goes

One more pass (on `14ffede`) wrapped the four WebGL draw functions to time-stamp the
first and last draw call of each frame: 50 frames, lawn fire, medians. The wrapper
itself adds about 1 ms.

| Part of the frame | ms |
| --- | ---: |
| Simulation: one step plus one snapshot | 18.4 |
| After the simulation, before the first draw call (`art.update`, `ui.update`, Three.js scene traversal) | 29.5 |
| First to last draw call (2450 calls) | 25.3 |
| After the last draw call | 0.8 |

`art-cell-loops.mjs` measures the part of this that belongs to the fire grid, headless.

## How to reproduce

1. `node tools/serve.mjs --root . --port 4571 --ttl 1800` and open `http://127.0.0.1:4571/`.
2. In the page console:

```js
const m = await import('/src/main.js'), app = m.currentApplication;
app.openMenu(); app.selectCharacter('bear'); await app.select('catalogue-street');
const rt = app.visit(); rt.dispatch({type: 'pause', paused: false});
const [{createRuntime}, {createArtScene}] = await Promise.all([import('/src/runtime/index.js'), import('/src/art/index.js')]);
const host = Object.assign(document.createElement('div'), {style: 'position:fixed;left:0;top:0;width:1024px;height:462px;opacity:.01;pointer-events:none;z-index:-1'});
const hud = Object.assign(document.createElement('div'), {style: 'display:none'}); document.body.append(host, hud);
const control = await createRuntime({root: host, uiRoot: hud, scenario: 'street', seed: 1947, createArtScene, autoStart: false});
control.dispatch({type: 'pause', paused: false});
const median = a => [...a].sort((x, y) => x - y)[a.length >> 1];
const measure = (runtime, frames) => { const total = [], sim = [];
  for (let i = 0; i < frames; i++) { const t = performance.now(); runtime.advance(1 / 60); total.push(performance.now() - t); sim.push(runtime.metrics().simulationMs); }
  return {sim: median(sim), view: median(total.map((v, i) => v - sim[i])), frame: median(total), drawCalls: runtime.metrics().drawCalls}; };
measure(control, 90); measure(rt, 50);          // repeat, alternating
```

3. To light the north lawn from the spawn point:
   `rt.dispatch({type:'select-tool',tool:'flamethrower'}); rt.dispatch({type:'aim',x:20,y:13.5}); rt.dispatch({type:'primary',pressed:true});`
   then 45 frames of `rt.advance(1/60)` and `rt.dispatch({type:'primary',pressed:false})`.

## Limits

- One host, one browser, one viewport. No phone was measured.
- Medians only. The 95th percentiles were two to nine times the medians on this loaded
  host and are not reported.
- The split between `art.update` and Three.js scene traversal inside the 29.5 ms was not
  separated in the browser.
- Most of the frame is rendering 2431 draw calls and the house art, which this review
  did not examine.
