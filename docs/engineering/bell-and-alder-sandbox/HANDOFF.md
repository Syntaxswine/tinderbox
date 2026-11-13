# First sandbox slice: runtime handoff

November 13, 2026. Bell & Alder, one furnished Hopkins 15 and the paved service yard now run in one isolated, self-contained local workbench. This is the first Milestone 23 experiment; no Monroe pair, new district, brigade, suspicion bar, visibility indicator, production integration or Pages deployment is included. The owner's M22 deferrals remain recorded rather than silently corrected.

## Exact source and launch

| Input | Identity |
| --- | --- |
| Combined development base | `93239f1e202f05064c033038f6f343f79b905b8e` |
| Early instance API | `bcaf1b8350ce5ceb7ceb4c194dfb727a0ee05b59` |
| Runtime foundation | `20595b5b343d896748de61a76c5cd6d6ba0c82e9` |
| Frozen browser/game source | `965e628c58c5b3f862134f8cd66238a9880aea87` |
| Exact artist intake | `864713b135fee8331c70727927dd731fff0366e9` |
| Package-manifest SHA-256 | `3d8a75bbf9ac9cc7ee2e2d93e67070acfd29b8083cc1a71ba665f533d213df0d` |
| Artist placement-manifest SHA-256 | `ca2f888faa1674d88c4898b96eaf429fc5af44755d2db9324a2d7b104f7881f3` |

The final commit containing this handoff adds the review-console repair and documentation to that frozen game source; its exact SHA is returned with delivery. The console repair is tooling only. Original and corrected driver hashes/source snapshots are in their helper records. No game code or art was changed during the browser review.

Under this coding checkout, run:

```powershell
Set-Location artifacts/qa/bell-and-alder-sandbox/package-965e628c
node launch.mjs
```

Open the printed loopback URL. Node 22+ and WebGL2 are required; no package installation or sibling checkout is needed. The server serves that package only and exits after 30 minutes, Ctrl+C or its private STOP marker. There is no retained review server. The 3,644-file package is 192,916,529 bytes and contains its own manifest, notices, selected art, original source data and runtime closure. The coder branch intentionally does not absorb artist-owned exports; use this package or combine the exact commits, rather than assuming the coder checkout alone contains `art.js`/placement data.

The current six buttons, joystick/keyboard, contextual Open/Close/Take, minimap and zoom remain. Walk near the shop door, open it, take the actual lantern, then explore the yard and house. Matches uses one press on the facing target; a click can choose a reachable world target. Reset restores the whole block. Follow-interiors view uses each building's own floor geometry; explicit exterior/cutaway remain diagnostic choices. `?character=goat`, `horse` or `bear` preserves native selection and scale. Some native profiles do not fit the house approach. The package README documents the other existing controls; this pass does not claim that every tool was manually exercised.

The declaration is ambient **1.5 m/s east wind**, shared by physics and presentation. It is not the cottage-obstacle Nautilus bake. Existing donor pins/notices and the source-rights limitations are unchanged. The original closing-time scene, art and replay remain the control; there is no diff to its workbench from the combined base.

## Implementation and provenance boundary

The [instance API](API.md) was sent to the existing artist before export. `compose.js` prepares each source before qualifying IDs, then applies one rigid quarter-turn/translation to geometry, matrices, normals, bounds and poses. It preserves asset/kit identity and UVs. The runtime tags presentation ownership without filtering heat, navigation, support/contact or witness queries. `partitionSandboxFrame` sends every generated fire/fall/rubble/upsert/tombstone to one source view, even after fuel lands across an instance boundary.

The shared support adapter groups only declared instance-qualified stair flights with actual landing IDs/elevations. Legacy single-house behavior remains. Shared scene changes add instance identity to mechanical sheet groups, avoiding one fragment spanning disjoint buildings. Furniture's initial floor fallback uses its own source instance; actual falls and landings still use global live geometry. No material coefficients, ignition clocks, receiver policy or no-lawn diagnostic hook were changed.

Changed coder paths are `workbenches/bell-and-alder-sandbox/`, `tests/sandbox/instances.test.mjs`, this engineering directory, and the bounded shared adapters `workbenches/furnished-house/{scene,simulation,support}.js`. No donor checkout, other worker checkout, native profile or original closing workbench was edited.

The artist's house variant changes its demonstration navigation route to the clear hall/stair path. Eleven physical/render fields were independently compared with the installed reviewed house and remain identical: surfaces, openings, furniture parts, items, stores, levels, source meshes, render data, module, thermal pitch and grid origin. House floors remain .48/2.60 m, shop floors 0/2.12 m. Native dimensions/rails/leaves were not resized. Source/byte records are in the package and `first-slice-evidence.json`.

## Checks and actual operator pass

`node tools/check.mjs` passes **373/373 tests**, source/import/provenance checks, one shared Three implementation and art checks (`final-source-check.log`). The final operator-console-only change also passes syntax and was used successfully. Focused tests cover native source preparation, rigid UV/level preservation, malformed finite fuel with qualified source diagnostics, independent stair failures, semantic actors/asset identity/reset, one-owner generated records/tombstones, powder-plus-pour clocks/automatic pickup state, real cross-instance heat, and an actual thrown-oil landing on another instance's geometry. The production build and nested-resource check also pass; neither integrates this workbench.

`native-965e628c.json` is the final-package continuous native route evidence:

| Profile | Shop ground/stairs | House approach/interior/stairs | Connected shop–yard–house route |
| --- | --- | --- | --- |
| Goat | Pass | Pass | Pass |
| Horse | Pass | Pass | Pass |
| AFT bear | Pass | Blocked by original house approach rail | Blocked at that rail |
| Civilian/officer envelope | Pass | Blocked by original house approach rail | Blocked at that rail |

The closed house door blocks the separate control. These are cylinder/support checks; full posed mesh/equipment clearance remains narrower/unaccepted. The browser separately reproduced the goat entering, ascending and descending the house with actual native presentation. The wider limits are retained, not bypassed or reclassified as resized successes.

The actual current-HUD operator pass is preserved in `operator-965e628c-fixed/`: 67 operator-selected input batches, 13 actual JPEGs, compressed frame/input/event snapshots, raw per-step CPU samples, and a real six-second live clip. Most exploration was operator-stepped in Manual mode, with actual keyboard, Matches and contextual buttons plus accepted world-movement inputs; it is **not** a completed continuous 10–15-minute game session or the M22 hero replay. The six-second live section used hardware wall clocks without virtual time.

Observed sequence:

- Arrow-left accepted 1.5 m over five world ticks, retaining 9 m/s full-input movement.
- Actual Open/Take buttons opened the shop and transferred one lantern to the player. The player walked through the yard, opened the house, climbed all twelve treads, returned and closed its front door.
- One actual Matches button press consumed one match (12 → 11). Crate finish ignited at 12.3 world seconds; crate timber at 13.0333 s; shop glazing finish at 15.8667 s. There was one 1.05-energy heat input, with no scheduled extra fires. By 22.6667 s, 51 fuels were burning, including shop floor/upper-floor patches. This is an observed sequence, not proof of a calibrated real-world spread speed or a unique heat path; the known receiver-selection sensitivity remains.
- The resident noticed smoke at 17.1 s and stopped against the original open-door geometry at 17.7 s. This reproduces a deferred M22 route limitation. The officer remained relaxed in this case; no aggression was manufactured.
- Turning all presentation effects off/on left the physical snapshot unchanged. Pause preserved world time. Browser reset restored world time 0, three actors, one placed lantern with no owner, twelve matches and zero burning fuels. The post-reset image and full state are retained.
- Actual 390 × 844 portrait captures show the current minimap, joystick and three buttons on each side. Touch dragging itself was not exercised. The diagnostic strip overlaps part of the title panel; the original opposite brick frontage can occlude the pawn. Neither is claimed as final phone acceptance.

The map has **no placed drugs/medicine**. Powder/pour and one-time pickup behavior are focused-fixture coverage, not evidence that pickup objects are present/visible here.

## Timing, media and limits

Tested on Windows, headless Edge via Playwright, NVIDIA RTX 3080 / ANGLE Direct3D11, device scale 1. Desktop captures are 1280 × 720; phone captures 390 × 844. Exposure is 1; gameplay span 16 m and the explicitly marked overview span 23 m. Exact browser build and measured GPU timer samples were not captured.

| Measurement | Actual result |
| --- | --- |
| Native quiet physics, 60 steps | Mean 2.451 ms; p95 4.316 ms; max 14.400 ms |
| Browser small-fire physics, 120 individually timed steps | Mean 5.144 ms; p95 9.300 ms; max 13.400 ms |
| Browser setup before first draw | 9,268 ms |
| First/cold maximum renderer call | 6,047.7 ms, including driver/shader wait; not GPU time |
| Live simulation advance calls, 146 samples | Mean 8.826 ms; p95 17.300 ms; max 24.700 ms; batches may contain multiple steps |
| Mixed publication calls | Mean 7.438 ms; p95 11.300 ms |
| Mixed presentation calls | Mean 11.876 ms; p95 11.900 ms; max 585.400 ms |
| Mixed renderer calls | p95 8.600 ms; mean 41.867 ms includes the cold outlier |
| Real live window | World 16.7 → 22.6667 in 6.0618 wall seconds |
| Live render | 222 calls / 153,660 submitted triangles |
| Art resources before fire / after reset | 257 → 260 meshes/geometries; 84 → 87 materials; 16 texture references throughout |

Raw physics samples are preserved. Publication/presentation/renderer summaries are preserved, but their raw sample arrays were not exported by the original browser diagnostics. The extra effect geometry/materials remain allocated after reset; this one cycle does not establish a leak or a repeated-cycle bound. Desktop hardware timing is not a mobile performance claim.

The declared light policy is three reused six-light pools (18 potential fire lights, sum power cap 645), plus four installed lamps and one portable lantern: 23 point lights. This is an additive presentation approximation, not a single 215-power block cap or a lumen calibration. No physical source was culled/extinguished to meet a budget.

Media under `artifacts/qa/bell-and-alder-sandbox/operator-965e628c-fixed/`:

- `sandbox-first-slice-live-cfr.mp4`: actual live WebGL overview, silent, H.264, 1280 × 720, six seconds / 90 decoded output frames. The original variable-cadence MediaRecorder WebM is preserved. Normalizing its cadence to 15 Hz repeats/holds frames; it adds no interpolated motion. The first VFR MP4 and its null-muxer timestamp warnings are retained separately; the CFR movie fully decodes without those warnings.
- `002-shop-interior.jpg`, `006-hopkins-upper-floor.jpg`, `009-yard-small-fire.jpg`, `010-small-fire-overview.jpg`, `011-phone-fire-hud.jpg`, `012-phone-reset-hud.jpg` are useful actual views. All 13 captions/camera/state references are in `captures.json`.
- `operations.json`, `step-costs.json`, `*-state.json.gz`, `live-record.json`, `live-summary.json`, `presentation-check.json`, encoding/decode logs and `final-state.json` preserve the findings. `first-slice-evidence.json` records source/package identities, material/route comparisons and media hashes.

The source checkpoint also preserves the [portable clip](evidence/overview-live.mp4), [house interior](evidence/hopkins-upper-floor.jpg), [yard fire with HUD](evidence/yard-fire-hud.jpg), [phone fire](evidence/phone-fire-hud.jpg), [phone reset](evidence/phone-reset-hud.jpg), [hash/native-check manifest](evidence/manifest.json) and [concise play log](evidence/play-log.json). These are byte-identical copies of selected actual captures; the full raw evidence stays under artifacts.

## Working / broken / unwired / untested

Working: launch/relative resources; goat keyboard and native connected traversal; current door/lantern/Matches buttons; one shared heat domain and recorded cross-address ignition; source-qualified render ownership; separate flights; automatic per-building interior view; reset and pause/effect separation.

Broken or limited: bear/civilian house approach; resident's deferred open-door viewing route; weak exterior fire readability (the crate mostly reads as a glowing dark cube despite valid flame/smoke splat counts); pawn occlusion by the original opposite wall; cold startup hitch and retained effect allocations. Raw crate fuel samples originate at its interior centre `[-4.5,.5,9.5]`, within its box `[-5,0,9]..[-4,1,10]`; checking the final emitted surface anchor is a concrete artist/runtime follow-up, not a reason to alter heat or fabricate a larger fire. No shader/page error or missing physical sample mapping was reported.

Unwired or absent: placed automatic pickups; full production cone/discharge and persistent actor-burning presentation in the isolated point-heat adapter; explosive-barrel placement; the deferred suspicion bar/current-visibility indicator. Existing finite tool adapters are not proof of every production behavior.

Untested: manual use of every remaining tool; touch joystick gestures; full posed/equipment sweep; audible capture; collapse/cooling over a long burn; multi-cycle memory growth; more than the observed short fire envelope; a continuous 10–15-minute session; actual phone GPU performance. Existing M22 witness/fixture/destruction/attachment/CPU findings remain deferred.

The next three bounded issues are: (1) make finite contents fire readable at actual source surfaces, using the saved crate evidence and retaining canonical ownership/heat; (2) decide between the current profile limitation and an explicitly composed wider native house approach, without shrinking bodies or raw modules; (3) separate cold-start/effect-allocation/raw render sampling costs before judging a longer exploratory session. Stop at this first useful slice; no row pair or solver rewrite is proposed as part of this delivery.

## Cleanup and Git delivery

The first review launcher loaded the scene but failed to attach its operator console. It performed no actions/captures and closed before the corrected launch. Both attempts used the same frozen package and the **same** original 4:48:49.547 p.m. Eastern deadline. The corrected pass finished at 4:48:41.209 p.m.; there was no capture-window extension. Original driver source/restart records are preserved separately from the explicit-REPL repair.

`cleanup-verification.json` independently confirms all four exact driver/browser identities absent and ports 50661, 50662, 53276 and 53277 refusing connections. No preview, browser, watcher or encoder remains running. No app-managed or unrelated runtime was terminated.

This is a local diagnostic candidate. Remote push is held while the new crate/exterior fire-readability finding prevents a clean combined visual check under the repository's normal Git policy. The owner's M22 deferral does not mark this new result passed. The architect receives the concrete package, exact commits and evidence for review; this is not production/Pages promotion or approval to add the row pair.
