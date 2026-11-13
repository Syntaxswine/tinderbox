# Bell & Alder closing-time correction and replay review

The owner asked the existing coder and artist to finish the passage/smoke fixes, rerun traversal and show the closing-time replay before expanding the demo. This review follows [Milestone 22](../milestones/22-bell-and-alder-closing-time.md). [Milestone 23](../milestones/23-bell-and-alder-sandbox-demo.md) remains queued. Nothing in this review promotes `master` or Pages.

## Frozen inputs

| Input | Exact identity |
| --- | --- |
| Shared implementation base | `b6838d004778faa6ca08914546499f6af27ce0b6` |
| Corrected artist candidate | `a0eef339988c24ef5a688396f552b8661764f472` |
| Corrected physical scene SHA-256 | `15d284fbcaad23daceaf727079dbb902c072a9a0cefeaea7bd12fe89fd29c943` |
| Recorded runtime | Working snapshot descended from `a19465407abacc933aba5d296a6f30c507b81595`; that earlier commit alone does **not** contain the implementation |
| Later local diagnostic source checkpoint | `f68240257c36950ec720f9997a6a03389a4f22bb`; push held while relevant combined checks fail |
| Runtime-file manifest SHA-256 | `74d5f58d62a1d2ed3258b3bf62eb889def29bf3f938b903b31d8f66f43174ffe` |
| Combined package manifest SHA-256 | `c937e30ed7d81e89e9fae1dcc1289de1f0ed5a93feb914d6e13e54ca647934ff` |

The self-contained package and exact restart-source copies are retained under the coder checkout's `artifacts/qa/bell-and-alder-closing/`. The [source-checkpoint bridge](2026-11-13-bell-and-alder-closing-time/source-checkpoint-bridge.json) relates the frozen working inventory to the later source; capture-driver corrections are separate from the recorded game. Source notices and installed donor pins are unchanged. This is the fictional shop/lodging composition, using the declared ambient 1.5 m/s east wind, not an obstacle-resolved Nautilus shop bake.

## Corrections and traversal

The artist moved the service-door hinges to their actual outer jambs and extended the composed stair flight from 3 m to 6 m. Twelve treads retain the 2.12 m rise; native leaves, bodies, rigs, movement speed and collision settings are unchanged. Street and lantern-approach waypoints clear the real leaf tips and pedestal. The direct match stance is within the unchanged .85 m reach.

The original failed candidate `3c842b20aa9ebc8f0ec0b447282cfd17f9d6e2e1` and its diagnostics remain preserved. Its short-flight failure exposed a centre-bearing navigation approximation; it does not establish that the original stair geometry is intrinsically unusable. The longer flight is the selected local accommodation, not a shared-navigation redesign.

The architect read the corrected `preflight/native-routes-a0eef.json`: goat, horse, bear and native civilian/officer all pass the ground, ascent, descent and initial-stance checks. Door and lantern reach checks and the actual quiet closing routine also pass. The complete moving-body/carried-equipment WebGL sweep remains incomplete; sampled posed heights are not a substitute for that gate.

Smoke now uses the complete current, observer-independent `closingTime.smokeSignals` collection. It requires an active source and clear opening/rise; resident memory cannot create or retain world smoke. Runtime perception remains separate from presentation toggles.

## Saved simulation and failed control

One authoritative hero run reaches 300 world seconds with one initial match and one lantern pickup. The resident notices smoke at 41.1 s, begins leaving at 45.433 s and reaches safety at 60.633 s. The officer becomes suspicious at 58.067 s because visible new fire qualifies a recent lantern memory; there is no aggression or shot. First local structural failure occurs at 193.433 s, after that segment's own 153 s burn age. Subsequent support loss and falling material are recorded separately. Ownership, finite fuel and finite heat checks pass.

The separate 25-second direct-witness control **fails**: the actual reachable strike ignites its finite finish, but there is no draw/shot. The diagnostic finds that the aggregate material centroid is occluded while the actual strike/contact point is visible. A later route also blocks on furniture. Preserve this failure; do not move evidence or force guilt to make a screenplay succeed. The published witness baseline and this new composed-scene control are distinct results.

Hero simulation cost is 34.53 ms mean / 126.53 ms p95 per fixed tick, with sampled publication averaging 41.47 ms. These are expensive prototype measurements, not a smooth gameplay or city-scale performance claim. Software WebGL export throughput is a separate cost.

The coder's final automated check passes 365/365 tests, immutable intake/dependency checks and the shared Three check. The [retained check log](2026-11-13-bell-and-alder-closing-time/runtime-check.log) and [runtime handoff](2026-11-13-bell-and-alder-closing-time/runtime-handoff.md) preserve the exact result and additional limits. Passing unit fixtures do not override the failed combined direct control. Its reaction receipt also records a later refreshed lantern memory instead of the qualifying sighting; correct that receipt before treating its reported distance as evidence about the behavior's threshold.

## Capture recovery and decision

The first bounded recording attempt produced a corrupt WebM. Its FileReader parsing split the comma in `video/webm;codecs=vp9,opus`, decoding the literal `opus;base64` into repeated seven-byte garbage. The architect independently verified that byte pattern. The corrected helper extracts after `;base64,`; a codec-comma regression passes. The failed file and complete hero/direct traces remain intact.

A separately authorized 20-minute render-only repair reuses those exact saved states, with no new fire simulation. Skipped deltas/removals are accumulated before sampling. Actual WebGL JPEG frames carry their world time, playback speed, camera and silent/sampled labels. Encoding and final media verification are recorded with the delivered movie.

## Delivered movie

The [portable closing-time MP4](2026-11-13-bell-and-alder-closing-time/closing-time-replay.mp4) is **150.733 seconds**, H.264 at 1280 × 796, with 2,261 decoded frames. It encodes 223 actual WebGL source images as explicitly labelled sampled holds, without motion interpolation or recorded audio. Quiet activity is sampled at 1 Hz, the escape at 2.5 Hz, and late fire every five world seconds; the displayed timeline runs at 1× through 65 world seconds and 4× thereafter. Export cadence is not gameplay frame rate.

The first 124.75 video seconds cover the 300-second hero trace; the reset/direct control begins at **2:04.75** and covers 25 world seconds plus its final hold. It preserves the failed reaction. No total collapse is forced: twenty fuels remain burning at the hero cutoff. Source sequences, seed/input/state reports, decoded JPGs, encoder source, file hashes and verification are included in [the manifest](2026-11-13-bell-and-alder-closing-time/manifest.json). Every inter-frame duration agrees with its world-clock delta and displayed speed; zero mapping mismatches.

The full movie decodes successfully. The architect inspected decoded frames at 40, 50, 90, 120, 145.2 and 148 video seconds, covering quiet, escape/light, broad burn, aftermath and the direct strike. The scene is nonblank and the known defects remain visible. All capture helpers ended by 06:25:20.945 UTC, before the fixed 06:26:10.355 repair deadline. The [independent cleanup receipt](2026-11-13-bell-and-alder-closing-time/architect-cleanup.json) verifies all six recorded driver/browser PIDs absent and all six owned ports free. No preview server or capture browser remains running.

## Visual review and returned issues

The architect inspected actual WebGL frames and decoded video samples at the fixed normal view. Broad warm light reaches the paving and opposite brick return. Roof loss and the surviving masonry make local destruction legible. The sampled export can show state progression but cannot establish convincing smoke motion or smooth gameplay.

The artist independently checked the 150–300 s stills against the prepared complete trace states, with no new browser or source edits. At 250 s and 300 s, both floors have zero of 256 intact patches, including the ceiling supports above the two pendants. All pendant components nevertheless survive, with empty host bindings. Their light checks component intactness rather than current ceiling support. This is a real support/ownership defect, not an inference from projection alone; it also contaminates late cooling-light comparisons.

The aftermath exposes square thermal-grid shapes. The saved state contains 1,270 rubble records, mostly ash, so these images alone do not establish a stale floor mask. Repeated roof-flame bands at 150–180 s and bright façade clipping reduce the painted detail. Smoke is visible, with motion acceptance reserved for animated review.

Returned correction proposals preserve shared rules: bind inert fixtures to actual hosts, then drive their mesh/light from authoritative support, fall, landing and retirement state. Do not hide individual lamps on a house-wide timer. The coder's direct-evidence correction must use the real action/contact and live sight while retaining the existing no-guilt handling for occluded, delayed or mixed heat. The artist/coder also need a clear cover route and less conspicuous grid repetition. No change is applied to this frozen movie to conceal the failures.

**Traversal corrections pass; the movie is suitable to show as a diagnostic replay. Combined acceptance and demo expansion remain held** for the direct-witness control, unsupported fixtures, unfinished posed/equipment sweep and the listed visual limits. This is not production acceptance or completion of the wider AAA fire goal.

## Subsequent owner decision: continue building

After watching the movie, the owner accepted moving forward experimentally: “lets keep building for now, corrections can come later.” This supersedes the expansion hold above for [Milestone 23](../milestones/23-bell-and-alder-sandbox-demo.md). It does not change the failed results or promote the candidate to production/Pages. The architect preserves the replay and assembles the exact runtime `f6824025` and art `a0eef339` as the workers' common development baseline, with the existing defects carried into the observation log.

The owner likes the current suspicion icon. A suspicion bar and a separate indication of current visibility are recorded for a later UI pass. Current buttons and the icon stay in the first sandbox increment; memory-based suspicion and live sight must remain distinct.
