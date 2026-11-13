# Bell & Alder closing-time runtime checkpoint

November 13, 2026. This is the isolated Milestone 22 diagnostic candidate, not a production or Pages promotion. The commit containing this document pins the coder source. The artist files remain owned by the artist and are loaded into the review package from the exact Git pin below. No Milestone 23 expansion is included.

## Source and reproduction

- Runtime base: `b6838d004778faa6ca08914546499f6af27ce0b6`; copied brief: `d7fd0d2865988779310741d8a0a69b5d16fbeb83`; early schema parent: `a19465407abacc933aba5d296a6f30c507b81595`.
- Selected art: `a0eef339988c24ef5a688396f552b8661764f472`. Raw scene-data SHA-256: `15d284fbcaad23daceaf727079dbb902c072a9a0cefeaea7bd12fe89fd29c943`.
- Installed shop/Eastlake provenance remains at Nautilus `2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74`. No donor checkout or new moving donor revision was imported.
- Frozen recorded working-runtime inventory SHA-256: `74d5f58d62a1d2ed3258b3bf62eb889def29bf3f938b903b31d8f66f43174ffe`. Frozen package-manifest SHA-256: `c937e30ed7d81e89e9fae1dcc1289de1f0ed5a93feb914d6e13e54ca647934ff`.
- That manifest records a **working snapshot on parent a194654**, not a claim that the early parent contains this implementation. Recording-tool fixes made afterward have separate source hashes and restart snapshots; game runtime and selected art stayed frozen during the render repair. Do not rewrite the original manifest or trace source stamp to imply otherwise.

Local evidence is under `artifacts/qa/bell-and-alder-closing/` (ignored, preserved outside Git). `combined-package-a0eef/` contains 3,628 files, approximately 186 MB, including exact artist Git blobs, installed dependencies and notices. Run `node launch.mjs` inside that package and open its printed loopback URL. It needs Node 22+ and WebGL2, with no package installation. The server stops after 30 minutes or Ctrl+C. The current control strip offers Manual, Hero, Direct and Quiet, pause/reset, independent effects and gesture-started procedural sound. Native goat is default; `?character=horse` or `?character=bear` selects the other existing profiles. Click a reachable surface and press Matches/Space to choose a manual ignition point.

To build a fresh package deliberately, use `node workbenches/bell-and-alder-closing/package.mjs --art-commit a0eef339988c24ef5a688396f552b8661764f472 --out artifacts/qa/bell-and-alder-closing/NEW-OUTPUT`. Existing evidence outputs cannot be overwritten. Do not rerun the long fire reference simply to regenerate the movie: `render-retained.mjs` reads the saved authoritative trace and never steps physics.

## Implemented boundary

The runtime supplies real door interaction and collision, one placed/carried lantern, native navigation/actor poses, actual shopkeeper and patrol routines, sustained visible-vent smoke perception, the scene-only 45-second lantern memory, causal witness adapters, finite tool inputs and furnished-house thermal/support/falling/rubble state. It reuses the current UI and native rigs. Full-input movement remains 9 m/s; powder/inversion and automatic walk-over pickups retain separate clocks. Scene/audio events are unique per reset generation, consumed once, and independent of camera, effect and mute switches.

The shared witness default remains 8 seconds. Its optional override and live three-dimensional sight/ballistic query are additive. Furnished-house changes expose a pure fire-sample read and a finite supported oil-deposit command; receiver coefficients, failure clocks, geometry and the diagnostic receiver hook are unchanged. The scene uses the declared **eastward 1.5 m/s ambient control**, not the cottage-specific Nautilus obstacle bake.

The artist's selected local correction uses a 6 m, twelve-tread service stair, corrected outer-jamb hinges and an approach turn around open leaves. Native dimensions, cylinders, gait and global navigation remain unchanged. The prior 3 m stair diagnostic remains preserved; it exposed centre-support/cylinder-ordering sensitivity rather than proving that every shorter authored stair is intrinsically invalid.

## Actual behavior and evidence

The authoritative runs use seed 1893 and are under `first-recording-a0eef/`, with separate `hero` and `direct` report/input/event/snapshot/cost files and compressed frame streams. These are completed traces, not screenplay events.

| Observation | Actual world time/result |
| --- | --- |
| Hero initial action | Exactly one match and one actual lantern pickup |
| Resident notices smoke | 41.1 s |
| Resident begins exit / reaches safety | 45.4333 s / 60.6333 s |
| Officer suspicion | 58.0667 s; no aggression and no shots |
| First local structural failure | 193.4333 s; that segment's own burning age 153 s, nominal lifetime 180 s |
| Mechanical support loss | 202.6667 s, separately recorded cause |
| End of hero | 300 s, twenty burning fuels remain; no forced total collapse |
| Direct control | Match command 20.1 s, real same-cell ignition 20.1333 s; **no aggression, shot or completed cover test** by the 25 s horizon |

`preflight/native-routes-a0eef.json` passes ground/ascent/descent, initial stances, the actual 40-second quiet routine, five door interactions, lantern reach, and both strike reaches for goat, horse, bear and resident/officer profiles. The source/native modules are not rescaled. `preflight/native-routes.json` and `original3m-stair-diagnostic.json` preserve the earlier failed layout/control.

`preflight/direct-contact-diagnostic.json` records the direct-control failure. At the strike, the player and chosen contact point are visible and the actual cold p0 lacquer catches. The adapter evaluates an aggregate fuel centroid that is self-occluded by a broad furniture-part bounds proxy. This is a concrete evidence/geometry mismatch requiring a later bounded correction; the capture does not move the evidence point, weaken cover or force guilt. The early direct fire also blocks the resident's viewing route at 24.1 s; that failure remains visible.

The first continuous encoder attempt is **failed evidence**: its data-URL parser split a comma inside `video/webm;codecs=vp9,opus`, writing MIME-fragment bytes instead of WebM. The 3,948-byte `closing-time.webm` is unusable and preserved as such. The parser now finds the `;base64,` delimiter, validates the payload and checks the first encoded EBML header. The regression test reproduces the codec-comma case. The original batch closed within its original 30-minute window; cleanup was independently verified.

The separately authorized render-only repair uses the exact saved states, fixed camera/exposure and actual WebGL JPEGs. `render-repair-a0eef/sparse/sequence.json` contains 62 complete hero frames through 300 s. Its `durationSeconds` values define the variable-duration timeline; do not encode at a constant frame rate and call that constant world speed. A single residual-time continuation uses already prepared states, ending no later than the same original repair deadline, **2026-11-13 06:26:10.355 UTC**. `render-repair-a0eef-residual/` contains the denser hero and failed direct-control sequences, complete markers and cleanup receipts as produced. Movies are silent, sampled holds, without interpolated actor motion. The architect encodes and independently validates the final portable movie from those sequences.

## Checks, cost and limitations

`node tools/check.mjs` checks source syntax/import closure, immutable vendor/art intake, one shared Three implementation, all unit regressions and art checks. The final run passed **365/365 tests**, including the codec parser regression; its exact result is retained in `preflight/final-check.log`. The focused closing runtime/audio/replay tests pass, including unit-fixture direct evidence and glass cover, event/reset isolation, safe doors, finite deposits, smoke visibility and clocks. Those fixtures do not override the failing combined direct scene. Native-route and source/package checks pass; combined visual acceptance remains open.

`node tools/build.mjs` and `node tools/check-release.mjs` also pass: 3,515 production files, 166,826,332 bytes, packaged hashes and nested-project resource resolution. This verifies the existing production package; it does not integrate or approve the isolated scene. `git diff --check` passes. `source-checkpoint-bridge.json` confirms the frozen game's eighteen-file inventory matches this working source except the capture-only parser correction.

The 300-second authoritative hero took 412.79 real seconds. Physics: 9,000 steps, mean 34.53 ms, p95 126.53 ms, maximum 181.58 ms. Frame publication: 1,446 samples, mean 41.47 ms, p95 125.34 ms. Serialization: mean 16.59 ms, p95 47.71 ms. These are CPU costs. The software-WebGL capture/export cost is recorded separately per JPEG and is not a mobile GPU budget.

Remaining acceptance failures and limits:

- The combined direct-witness draw/shot/cover control fails as described above. Preserve this before a bounded correction; do not mark the scene accepted.
- Suspicion behavior uses its qualifying pending lantern sighting, but the reaction log reports distance/expiry from the latest refreshed memory. A future receipt correction must preserve the qualifying sighting. The hero report's 11.096 m distance is not evidence that the configured 3 m behavior test was removed.
- Actual late images expose checkerboard-like rubble and suspended lights. Artist read-only QC confirms both floors have zero of 256 patches intact, the pendant ceiling hosts are gone, and both lamp components remain intact with empty host bindings. The fixture/light lifecycle needs real support, fall, landing and removal binding; hiding lamps at a timestamp would not correct it. There are 1,270 real, mostly-ash rubble records; no floor-mask leak was inferred. Roof flame repetition also needs visual review. No asset edit was hidden in capture.
- Full posed equipment/vertex/headroom and intended phone-scale visual acceptance are incomplete. Numeric native-cylinder passage checks are narrower evidence. The manual diagnostic strip is not an approved HUD redesign.
- Tool adapters supply finite heat/fuel; full production flamethrower cone/discharge and persistent actor-burning presentation are outside this isolated replay.
- The carried lantern has an authoritative logical point, while the artist retains the published native hip attachment. Reconcile the origin contract before claiming exact attachment parity.
- Smoke is a bounded geometric/perception approximation, not a fluid/optical-density solver. The reference remains CPU expensive. Audible recording, production rollout and additional maps are unaccepted.

All disposable capture helpers have private stops, exact PID/creation records, source/restart bundles and finite deadlines in their output directories. Check each final `cleanup.json` and independent process/port verification before handoff. No app-managed runtime or unrelated process is disposable. No server is intentionally retained for this checkpoint.

Default remote delivery is held while relevant combined checks fail. A local diagnostic commit preserves the source for architect review; it is not promotion or a waiver of the gate.

Follow-up ownership: coder investigates contact-based direct evidence with live actor sight and unchanged delayed/mixed-heat safeguards, records the qualifying memory receipt, and checks the blocked resident viewing route. Artist supplies explicit fixture host declarations and reviews rubble/flame composition; coder binds authoritative fixture falling/retirement to those hosts. Architect defines the bounded correction and its replay/acceptance gate before implementation. These are findings/proposals, not edits to the frozen run or permission to expand Milestone 23.
