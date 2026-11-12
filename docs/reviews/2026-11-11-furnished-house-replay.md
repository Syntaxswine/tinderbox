# Furnished two-storey house: architect replay review

Owner request: one furnished two-storey house, a shared proposal for coder and artist, resolution of the two experimental fire-rule documents, and an actual replay before game integration. The implementation is isolated on `codex/review-furnished-house`. Published `master` remains `c855e627bdee963e930644839a60c027a03935de`.

This is a bounded simulation and presentation experiment. It is not acceptance of milestone 11's AAA visual score, higher-polygon equivalence or 20–33% rendering-cost target. It does not approve production integration or Pages deployment.

## Accepted proposal and resolved rules

[Milestone 18](../milestones/18-furnished-house-replay.md) is the dispatched coder/artist contract. It freezes the second reviewer experiment at `9b521a20d888a92197c75f03fbb75f762bf4ba67`; the withdrawn first trial and the moving reviewer branch are not intake. [The intake manifest](../engineering/furnished-house/intake.json) records the unmodified kernel and scene copies, source paths and SHA-256 values. Existing asset manifests and notices retain their authority; this task supplies no new third-party licence grant.

The architect resolved the material rule conflicts as follows:

- A physical surface has one canonical state shared across its adjacent thermal cells. Actual native polygons, thickness, windows, stair voids and retired supports constrain transfer. Conservative segment crossings include tied edges and corners.
- Consumed finite fuel supplies the heat budget. Local transfer, radiation, blocked energy, cooling, caps and escape are explicitly accounted for. Redistribution spends that same budget once.
- Floors retain oil and contents until an actual opening or loss of support permits passage. Falling and landed fuel retains its identity, remainder, stored heat and own burn age. Char, combustible embers and inert ash remain distinct.
- The owner's structural target remains 120–180 seconds **per segment from its own sustained ignition**. Nominal structural fuel duration is 180 seconds; the declared 15% ember remainder detaches at 153 seconds of that segment's own burn. Loss of actual bearing can release a younger segment sooner, with the mechanical cause recorded. There is no house-wide collapse timer.
- Landed fragments form a supported, nonbearing 1 cm rubble layer with exact clipped footprints. This avoids pretending to have full rigid-body debris stacks. Current fall/rubble updates and removals are applied atomically even when multiple landings occur between rendered frames.
- Radiation uses real exposed paths, source area and distance falloff. This bounded fixture uses an 8 m query range, 24 sampled links per source and at most 48 geometry queries per tick. Deferred energy cools and expires into an explicit ledger; that approximation is reported rather than hidden.
- One match supplies the same 1.05 prototype heat units in each location control. Tools, windows, floors, collision and visible fire consume the same physical state. Wind is the explicitly labelled ambient eastward 1.5 m/s sampler shared by art and simulation. There is no obstacle-resolved Hopkins wind bake.

These are tunable game rules and numerical controls, not measured calorimetry or a fire-engineering solver. The support graph establishes physical contact/connectivity, not beam stress.

## Native house and passage

The artist reused native Hopkins 15 and both furnished floors. Structural modules remain 1 × 1 × 2.12 m, walls 2 m high and slabs .12 m thick. Thermal sampling starts at .5 × 1.06 × .5 m while the exact surfaces remain authoritative. Kitchen oil and coal have finite, explicit contents. The real inert roof chimney is bound to its six actual roof hosts and gains no fictitious fuel or ground anchor.

The architect-approved doorway and stair compositions preserve body scale and native dimensions: a centred transom/frame with the original 1 × 1.65 m door leaf, native entry steps, local alcove/trim end-cuts and stair-side egress. One identified 1 m² upper fore-lip bay is removed. The floor areas are 100 m² and 68 m²; no forward upper landing is invented. [Art evidence](../art/furnished-house/README.md) and [the route record](../engineering/furnished-house/route.md) distinguish original geometry, composition changes and their controls.

Independent architect reproduction on manifest SHA-256 `3a705131c3922ab33c86e269e5020ec08bea93de0eeeaab317c6ab90f001d7a1` passed all 29 waypoints in both directions, travelling 44.932242537 m at native 9 m/s, radius .5 m, height 1.66 m and maximum step .22 m. The separate closed-door control blocks correctly. There are no mid-route teleports, disabled colliders or retired geometry in this proof. The passage has only 3.75 mm minimum entry margin; a swept route is not a claim of comfortable manual steering.

The independent floor oracle checks 5,202 points against the published meshes, including the one authorized bay exception: zero mismatches. All seven pinned source-mesh hashes match. The prepared support graph has 4,363 initially supported wood/fitting nodes, zero unresolved nodes and zero unrooted inert nodes.

## Checks and review history

The final combined repository check on `cc8a916` passed 320 tests, syntax/dependency resolution, the shared Three implementation and pinned provenance. Eight artist check programs passed 46 grouped assertions covering exact geometry, flame supports, entry/return/stairs, prepared inert geometry, disposal and retained-state lifecycle. After the final typed-collection correction, the architect reran the renderer and retained-state checks: 13 and 8 grouped assertions pass, bringing the art controls to 48. The controls include:

- Grass propagation 1.509–1.563 m/s over 32 directions, maximum target error 4.17%; physical wall rise/creep ratio 2.109.
- Sealed-floor lower heat stays zero until its local 153-second material-age failure, then lower ignition follows the hot landing by 1.567 seconds.
- Open-aperture dose at 2 m versus 8 m is 16:1; closed glass transmits .05 of the open dose and masonry transmits zero in that fixture.
- The powder control yields 3.5 world seconds and 15 player seconds per 10 active seconds.
- Five frame schedules agree through structural burnout, landing and retained ash. Fuel transfer, finite spills, current ownership, glass-then-masonry tool contacts and inert furniture components have focused regressions.

The architect and independent reviewer returned concrete failures to the workers: diagonal leakage, metre/index distance confusion, unreported preheat/cooling, unsupported spills, falsely closed triangulated solids, stale item colliders, suspended stairs/fittings/chimney, repeated grazing impacts, airborne visual tombstones and old-to-new fuel ownership. The withdrawn exploratory images and timings remain diagnostic evidence, not passed captures.

The full WebGL attempt on `fb80e883f4d8932a2f42288381ff6040084894e7` passed through 154 world seconds but failed at 170 seconds with 51 missing active fire sources. Its artifact directory is `artifacts/qa/furnished-house-replay/kitchen-scene-review-1794449091217`. That failure was returned for an actual combined simulation/art reproduction; synthetic lifecycle tests alone did not establish late-replay correctness.

The runtime's real-bearing-area correction is `5f1793b4a22f3bd76ee5e0214e9d8633b78fbdf7`, intaken as `cc8a916`. A grazing edge cannot complete a landing without a positive-area actual bearing face. The coder's fresh paired 330-second trace passes all 66 ten-second ownership stages with zero owner failures and zero escaped fuel. Kitchen oil/coal ignition is 1.833/11.533 seconds, versus 158.3/167.733 seconds from the same match input upstairs. Both starts first lose a material floor patch at 154.033 world seconds, 153 seconds after its own ignition. The kitchen ends with 2,944 rubble records, 371 burning fuels and no airborne fragments. [The final trace summary](../engineering/furnished-house/final-trace-summary.json) preserves exact pins, input/trace digests and the distinction between persisted evidence and serialized-state digests.

The final artist correction is `ed2e81fd76c171a5b8662709a3191e15ffe2b578`, intaken as `da0a3edd`. A typed rubble removal no longer erases a current airborne object with the same ID in another collection. [The actual publication check](../art/furnished-house/actual-publication-checks.json) passes all 331 one-second publications and all 331 repeated paused-camera deltas through 330 seconds: zero missing sources, zero orphan owners, exact flight/rubble counts. At 170/210/330 seconds there are 16/125/0 live flights and 526/2,697/2,944 rubble records. Real WebGL recording and final hardware measurement follow this source-state proof.

The production build/release check passes: 3,515 files, 166,825,782 bytes, all hashes and nested resource URLs verified. The rebuilt manifest remains the frozen `c592039f35d7f4173c17e4f9443726423e9d77eb8ee5bfdbb7d6430625c33987`. No production tree path differs from published `c855e62`.

## Reproduction and delivery boundaries

[The architect QA recipe](../engineering/furnished-house/architect-qa.md) records the bounded browser launcher, fixed-tick AVC/MP4 export, native floor oracle and matched CPU/GPU measurement methods. Export throughput is not game frame rate. Every helper has a finite shutdown timer and a recorded owner, process identity, ports and restart recipe; cleanup receipts verify released ports. No preview server is retained for the portable movie.

The normal package excludes the workbench, review tools and evidence. Production runtime, assets, save state and public menus remain outside this candidate's changes. The final evidence and decision follow.

## Actual rendered replay

The [portable MP4](../art/furnished-house/replay/kitchen-night-replay.mp4) is 82.5 seconds at 4× playback, covering 330 world seconds in 2,475 actual WebGL frames at 1280 × 800. The recorded source is `f79ff28ac00337c72c97451e22c1bbb38ff6171f`. [Representative JPGs and input/state evidence](../art/furnished-house/replay/README.md) accompany it; [the manifest](../art/furnished-house/replay/manifest.json) hashes the delivered files.

All recorded presentations retain every active fire source: maximum missing count zero, maximum absolute fuel error 3.0824 × 10⁻⁸, maximum relative heat error 5.6547 × 10⁻¹¹. The kitchen ends with 371 burning fuels, 2,944 supported rubble records and zero airborne fragments. Four decoded samples at 1, 8, 41.25 and 81.5 video seconds are nonblank; the saved file has the expected duration and dimensions. Browser errors are empty. Export took 568.38 seconds and is not a game-frame-rate measurement.

The capture command returned exit 1 solely because the Windows browser-server close promise exceeded its 15-second wait after validation. The original browser and driver PIDs and direct children were subsequently verified absent, and both owned ports were closed. The original warning and independent receipt are preserved; the movie was not silently labelled a clean command exit. The bounded launcher now closes the client connection first and verifies the original process identity and released ports when a server-close promise lags an observed exit.

The independent hostile reviewer inspected actual frames at 30, 120, 180, 210 and 330 seconds and found no blocker to showing an explicitly bounded prototype preview. This does not grant production or AAA acceptance. Recorded visual limits: bloom/haze and repeated vertical flame streaks hide furniture and charring; floor retirement and rubble read as square patchwork; some roof/trim effects remain above cutaway-hidden geometry; surviving trim at 210 seconds reads as a suspended wire outline. These stills alone do not establish unsupported fuel. The exact owner/flight/rubble checks and animated record provide the state evidence.

## Hardware result and architect decision

[The cost review](../engineering/furnished-house/performance.md) supplies all ten windows, 1,200 valid GPU samples, component mean/p95/worst costs, active counts, lights and draw calls. The task's other heavy workers and browsers were stopped before measurement. This live machine was not reserved exclusively; background application and OS activity remain uncontrolled.

At 120 world seconds the furnished candidate costs **186.41 ms core CPU mean / 206.70 ms p95 / 276.70 ms worst**, dominated by **157.93 ms mean presentation**. Simulation averages 26.70 ms and render submission 1.78 ms. GPU costs **7.74 ms mean / 11.69 ms p95**. The lower draw/GPU costs do not establish equal fire quality: the published burn has ended by its 30-second window, while this candidate continues burning thousands of finite fuels. GPU outliers and the full CPU costs remain in the report. No city-scale or milestone-11 cost acceptance is awarded.

**Approved to show the owner as a prototype replay. Production integration is held.** The proposal and rule resolution are implemented in the isolated fixture, state controls and actual recording pass, and the owner can review the result before any game wiring. CPU preparation, cutaway clipping and the listed visual limitations need another bounded pass before promotion. The performance record proposes specific coder/artist profiling and caching work; workers remain idle during this handoff. The broader AAA fire goal stays open.

Exact final worker intake:

| Input | Original worker/source commit | Architect intake |
| --- | --- | --- |
| Frozen second experiment | `9b521a20d888a92197c75f03fbb75f762bf4ba67` | Preserved unmodified copies and hashes |
| Native final house/route geometry | `e3e0caa60af0238c10110dd24ebd7736e823f43c` | `caae021` |
| Runtime real bearing and re-falls | `5f1793b4a22f3bd76ee5e0214e9d8633b78fbdf7` | `cc8a916` |
| Final typed artist state and actual trace | `ed2e81fd76c171a5b8662709a3191e15ffe2b578` | `da0a3edd` |
| Runtime paired summary/helper evidence | `2042bdd653d23ab00dfa7792489212b32491db9a` | `cb346277` |
| Actual WebGL movie source | Combined `f79ff28ac00337c72c97451e22c1bbb38ff6171f` | Same runtime/art tree; later changes are QA/evidence only |

Changed paths stay in the furnished-house workbench, its art sources/checks, focused tests, architect review tools and related documentation. The stockyard, Hull-House, gallery, UI/train and donor candidates are preserved. The preview branch is `codex/review-furnished-house`; `master`/Pages is not promoted by its push.

[The final cleanup audit](../art/furnished-house/replay/task-cleanup-summary.json) verifies all three original driver/browser identities absent, no direct children, and no listeners on any owned port. The worker lifecycle records also report no retained task helpers. No preview service remains running.
