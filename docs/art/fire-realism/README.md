# TB-034 — detailed fire art, first candidate

Status: an executable high-detail reference candidate, **not a visually accepted or optimized effect**. Published control is pinned at `dc7f537a83a7e832a0dfa0757d0b2700b909c053`; scoped source hashes are in `art/source/fire-realism/control.json`. No donor files or production adapters changed. Aquarium checkpoint `e261e7c749a4957470195b993a53051cae15416f` remains on its separate branch.

## Review entry points

Import `createFireRealism` from `assets/art/fire-realism/index.js`, supplying the host's shared Three r180. Artist fixture: `workbenches/art/fire-realism/index.html`. `python workbenches/art/fire-realism/serve.py` serves this checkout on localhost:8766 for at most five minutes; a private stop file also ends it. It creates an ignored PID/creation-time receipt under `artifacts/fire-realism/preview-server/`. Stop the immediate-review helper when finished.

The fixture contains match/finite torch contact, a moving synthetic gasoline front and a ray-resolved jet ending at a native 2 m tall / 0.16 m thick wall. Bright/dim, isometric/oblique, pause, reset and quarter-speed world-clock controls are exposed. These are art fixtures; they do not establish actual gameplay or whole-map acceptance. The combined coder/UI scene owns production/HUD comparison and performance measurement.

## Source reading and visual recipe

The four inspected, unmodified acquired images, original URLs, rights basis, dimensions, SHA256 and uncertainties are in `art/source/fire-realism/references.json`. Three DVIDS acquisitions are explicitly service derivatives; they are not mislabeled full-resolution originals. The NARA file is its actual catalog Download original. Source images are research-only; the runtime effect is original procedural code with no photographs, people, military markings or inherited painted atlas.

- [NARA6349328](https://catalog.archives.gov/id/6349328): a 1969 Navy test. A very narrow bright coherent stream leaves frame; terminal breakup is absent. Item-level federal provenance, unrestricted use and release statement were independently inspected. Exact calendar-day precision is uncertain. Use it as a narrow-jet counterexample, not a portable-tool scale template.
- [DVIDS8746603](https://www.dvidshub.net/image/8746603/history-motion): Katherine Devereaux's 2024 historic-equipment demonstration. Bright connected emission develops into rolling orange volumes with dark soot gaps. It is modern color evidence, not wartime footage. A still does not prove velocity or burn rate.
- [DVIDS9535915](https://www.dvidshub.net/image/9535915/joint-fire-fighter-training-aboard-mcas-beaufort): Mason Coots's interior structure-training image. Irregular attached fire leaves dark voids; chain, fuel and doorway establish occlusion. Caption/VIRIN and Date Taken disagree; the manifest preserves both.
- [DVIDS9219073](https://www.dvidshub.net/image/9219073/firefighters-extinguish-fire-training-room-during-live-burn-training): Perry Aston's 2010 training image. It supports smoke-depth and foreground legibility only; it does not show a substantial flame front. Caption/day discrepancy retained.

The [DVIDS notice](https://www.dvidshub.net/about/copyright) and item-level named military authorship support the US public-domain determinations. The appearance of U.S. Department of War (DoW) visual information does not imply or constitute DoW endorsement. No claim of unrestricted trademarks/personality rights or official approval is made.

The published control uses four interpolated atlas frames on camera-facing cards. Its painted contours and repeated smoke masses cannot provide the desired view-dependent depth. This candidate instead uses 2,016-triangle curved tongue lattices, geometric boundary deformation and 18 density/absorption samples per covered fragment. Original advected three-dimensional noise opens density gaps and gives each source a stable independent identity; a shared world clock carries the flow upward. Yellow/white cores, orange dilute edges, dark smoke density and bounded warm spill are artistic choices informed by the sources, not calibrated radiometry.

[NVIDIA GPU Gems 3 chapter 30](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-30-real-time-simulation-and-rendering-3d-fluids) is the primary conceptual technical reference for advected volumetric fields and absorption. No chapter code or simulation solver is imported. This is procedural presentation, not a fluid solver or new fire physics.

## Frame and ownership

`createFireRealism(THREE,{quality:'reference',maxCells:65536,maxRays:256})` returns `{root,update(frame),reset,dispose,diagnostics}`. `quality:'optimized'` explicitly throws until a legitimate visual baseline exists; no surrogate is mislabeled optimized. Settings are copied/frozen. Full authoritative arrays of up to 65,536 cells are supported; maxCells bounds emitting/history sources rather than the number of unlit input cells. An explicit smaller capacity throws on emitter overflow instead of dropping fire. The constructor creates no renderer, fetch or texture loader. Keep its root at the scene's identity transform; coordinates are shared native metres, ground(x,y) maps to Three(x,height,z).

`update` consumes the detached v1 frame in milestone 11. It never mutates the frame or simulation. It reads cells' existing IDs/positions/phases/intensity/size/depositedFuel, `worldTime`/tick/pause, field-uniform wrappers, clipped discharge origin/shapeOrigin/heading/ordered rays, torch phase/remainingSeconds and the coder-aligned `anchors.muzzle` and `anchors.torchTip` world-space vectors. Missing attachments suppress their effects. The source mask is explicitly borrowed and never disposed. Player/camera inputs only affect legibility/presentation. No absolute local paths or donor references occur in runtime.

Repeat frames and reset/rewind reproduce data. Fire motion uses worldTime, never playerTime or wall clock. A paused existing frame freezes emitted geometry and time. Only observed burning cells can emit finite 3.2-world-second smoke tails; spent or absent cells emit no new flames. Three spill lights are bounded. Repeated update/reset does not allocate new render resources. Warm buffer updates cover active prefixes only; unused capacity is not uploaded every frame. Disposal is idempotent and releases only owned geometry/materials/two data textures.

## First-candidate limits and next revision

Actual animated WebGL, source comparisons at gameplay scale and GPU elapsed time are **pending**. On 2026-10-30 at 03:46 UTC the in-app browser loaded the fixture and reported `GL_RENDERER = Disabled` / `Error creating WebGL context`. The helper was stopped at 03:47:19 UTC and the port released. No shader success, reference JPG/motion capture, realism approval or cost ratio is claimed. The architect is investigating a supported GPU review path.

The first reference handles connected ordered discharge fans when the actual muzzle is inside the authoritative fan. Disconnected/unordered fans and an outside-fan authoritative lead are deliberately deferred and suppressed. Explosions are not presented, so startup events cannot replay. Legitimately burning building-group presentation awaits the coder's exact prepared-anchor schema; ground fire never guesses burning facades. Smoke is a presentation field with no obstacle-flow solver or sampled scene-depth integration. Transparency order, smoke amount, surface silhouette and small-cell aliasing require actual render critique; nearby fuel cells share one density column per native one-metre source bin, with independent noise/height and finite weighted tails. This smoke recipe is still an unreviewed study, not a frozen quality target. The eventual reference must address these before approval.

No optimization credit begins here. Geometry count and CPU checks cannot establish the requested 20–33% incremental GPU cost. The eventual baseline must freeze matched scene, seeds, population, resolution, smoke and lights, then pass the architect's animation rubric and valid hardware timing gate.

## Checks

`node workbenches/art/fire-realism/check-contract.mjs` passes with the actual vendored Three classes: a full 65,536-cell input with one burning cell, source immutability, exact geometry populations, repeat/reset/rewind, pause/world clock, finite smoke, resolved endpoints/no invented fan, finite anchored torch, stable resources over 30 cycles, borrowed texture ownership and exactly-once disposal. This is offline contract evidence only. Remaining project checks and exact candidate commit are recorded in the visible handoff.

Checkpoint checks: `npm test` passed 176 tests; `node tools/check.mjs` passed static/dependency/provenance checks and 186 tests; `node tools/build.mjs` produced 3,459 files / 163,322,447 bytes before the final metadata record. Source-photo bytes remain outside the runtime distribution. The dedicated fire check passed after the final renderer edits. Actual WebGL/visual/GPU checks remain blocked as stated above.
