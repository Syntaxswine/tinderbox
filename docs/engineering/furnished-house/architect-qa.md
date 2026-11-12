# Architect replay and measurement recipe

These tools review the isolated furnished-house candidate. They do not deploy or integrate it into the game. The final architect review records the exact tested source and worker pins; earlier failed images and timings remain separate diagnostic evidence.

Use Node 22 or later, Git, Microsoft Edge and Playwright. The launcher first resolves an installed `playwright`, then the bundled Codex runtime. `TINDERBOX_PLAYWRIGHT_ROOT` may name another `node_modules` directory containing Playwright. This is development tooling; the game has no Playwright dependency or local-machine imports.

The fixture host reads the frozen published `c855e627bdee963e930644839a60c027a03935de` package from `dist/`. Its manifest SHA-256 is `c592039f35d7f4173c17e4f9443726423e9d77eb8ee5bfdbb7d6430625c33987`; every packaged file is checked before serving it. The normal build excludes these workbenches and review files, so the candidate's unchanged production tree can reproduce that package with `npm run build`. A later production change requires deliberately rebuilding the pinned baseline, not relabelling a new package.

Run from the repository root:

```powershell
node tools/review/furnished-house/check-source-floors.mjs
node tools/review/furnished-house/review-scene.mjs 330
node tools/review/furnished-house/record-house.mjs kitchen 330 4
node tools/review/furnished-house/record-house.mjs bedroom 330 4
node tools/review/furnished-house/published-baseline.mjs
node tools/review/furnished-house/candidate-cost.mjs
```

Outputs go under `artifacts/qa/furnished-house-replay/`. Each browser run has a private profile, a read-only source allowlist, a finite deadline, a STOP file, exact driver/browser process identities and port records. It closes its browser and server in `finally` and verifies released ports. No retained preview or background service is needed for the portable MP4. The launch record preserves source/arguments/inputs for deliberate restart.

The floor oracle compares 5,202 sample points against the actual published source meshes. Its one independently pinned exception is the architect-authorized 1 m² upper stair fore-lip removal. Entry, stair, fitting and foundation adaptations have their own exact geometric controls.

The movie contains actual WebGL frames at authoritative fixed world ticks, with exterior and cutaway views and world seconds visible. A four-times replay advances four 1/30-second ticks per encoded 30 fps frame. Hardware AVC encoding and a single video-track MP4 muxer preserve those timestamps. The encoder must return every frame; the resulting file is decoded in the browser and sampled for nonblank pictures. Export throughput is reported as export throughput, not game frame rate. Stills and event traces establish the late wreck's fidelity; early decoded pixels alone do not prove it.

Timing runs exclude video encoding and disable the candidate's automatic redraw loop. Both use the same 1280 × 800 viewport, 12.6 m orthographic span, translated house-centre target and camera direction. The same preserved antialiased framebuffer is used for both render measurements. CPU terms distinguish simulation, publication/presentation, rendering and other reporting work. GPU timer queries bracket only `renderer.render`; every measurement window drains its queries and rejects disjoint results. Cold browser startup and replay reset compilation are recorded separately. The live machine is not an exclusive laboratory GPU; coordinate the task's workers and report the conditions.

This is a scene comparison, with burn stage, active counts, draw calls, lights and numerical approximations reported. Different ignition states and representation boundaries prevent it from proving visual equivalence to the milestone-11 higher-polygon reference. It does not establish the broader AAA 8/10 or 20–33% rendering-cost goal by itself.
