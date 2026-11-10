# Segment decay and rubble heat review

The coder's candidate `fcae4d6a84221ace2000469e00b0d0aa122dcc1d` starts at the published Ashland release `14ffedeff3e746a56b7035352d1a89d2f6096978`. Catalogue Street uses its native 2 m plan sections. Ashland uses 1 m plan columns with separate clocks for the roof, upper layer and lower layer. Every burning section gets 150 world seconds from its own ignition. Loss of support can bring down pieces directly above it in the same column. An early falling board or crate can still carry fire to a lower layer without retiring the section that shed it.

Active flame and structural decay have separate lifetimes. After the main flames go out, charred wood retains some heat and smolders as the structural clock advances. Each ground section exposes its own part of the rubble mesh and carries its residual heat into the existing ground heat field. Its source strength fades over 24 world seconds. Transfer falls with distance, is blocked by solid cover, and uses the existing accumulation, ignition and cooling rules. Nearby paving contributes to the normalized area heat index without catching. The pile remains visible after it cools.

This is a Tinderbox adaptation of the previously accepted rubble factory from `27cdd01fa5a3c83932e5aeabac87011e16412458`, with the native plan and atlas provenance in the [Ashland intake review](2026-11-10-ashland-radiant-heat.md). The underlying asset intake, donor files and scale are unchanged.

## Behavior on the packaged game

- One match in calm Ashland with radiation and embers disabled lit a lower floor through falling fuel at 9.03 world seconds. The first natural collapse was at 150.02 s and the last was at 168.85 s. All 111 natural retirements occurred 150 seconds after their own ignitions, within one simulation tick. The 15 support retirements were confined to the affected column. The 42 ground sections started cooling at 27 distinct times.
- The first pile warmed paving while 66 structural pieces were still standing and the test grass was green. The nearer strip caught at 162.70 s from `ashland-cottage/section:29`. The farther strip and the second cottage stayed unlit in this control. The area heat index returned to zero, pause froze the clocks and heat, and reset cleared the rubble. The grass strips exist only in this test.
- The Hopkins 15 replay retired its 25 sections at separate times between 150.02 s and 156.63 s. The near test strip caught from rubble and the farther strip did not. A screened Ashland-size pile warmed no grass; brief unscreened exposure warmed it without ignition, then sustained exposure ignited it. The wind-only replay still ignited the receiver at `roof:9` at 11.97 s.

## Package and browser evidence

The coder's `node tools/check.mjs` passed all 259 tests, including the art, provenance and dependency checks. The architect's `node tools/build.mjs` and `node tools/check-release.mjs` rebuilt and verified 3,511 files and their nested project URL. The resulting manifest SHA-256 `8e6eee2712cb437f6d49e4624c8c94fa4115901d838d25158d62d2685370a219` matches the packaged replays.

In the 1280 × 720 WebGL replay of `?cottages=1` at normal game zoom, the first upper section fell while the lower walls still stood. At 159.10 s the first ground section glowed while the rest of the structure remained partly standing. At 183.22 s the oldest pile was cold and newer debris still glowed. At 197.73 s the cold ruins remained visible and no house collision remained.

In the normal Catalogue Street visit at the same zoom and resolution, the first Monroe pile glowed at 153.72 s with 27 of 28 sections still present. At 177.83 s the oldest pile had gone dark and 27 newer piles still glowed. At 191.35 s all 28 piles were cold and their house colliders had cleared. Reset restored the structure and cleared the rubble. The native run rendered active fire and standing smolder. The final replay kept the full packaged simulation and art updates and drew the checkpoint frames in WebGL to fit the software renderer's time limit. The completed normal route reported zero browser errors. These runs verify appearance and behavior at play scale.

The architect approved the exact candidate for `master`. JPGs and replay receipts are in the ignored local folder `artifacts/qa/segment-decay/combined/`.
