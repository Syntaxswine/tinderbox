# Ashland cottage playtest review

**Approved for the opt-in GitHub Pages playtest.** The user asked to publish after retesting outdoor firelight and match feedback so they could choose their own ignition points.

The reviewed tree starts at published `dc7f537a83a7e832a0dfa0757d0b2700b909c053` and takes the coder's playable pair `581b56b8475b32953633fffdb654550ba8bbc213` and lighting/range correction `5f519af2ae50dc11f908f8ac199f0fb96a0f4225` in order. Runtime changes are in the Catalogue Street entry, the cottage content, art and camera adapters, the fire and tool simulation, and the release build. The exact source paths, adaptation notes and byte hashes are in the [intake](../engineering/playable-cottage-pair/intake.json). The architect verified all eight installed payloads against their Git sources and packaged copies. The [coder handoff](../engineering/playable-cottage-pair/handoff.md) and [lighting review](../engineering/playable-cottage-pair/night-light-review.md) record the Nautilus pin, native dimensions and test timings.

## Packaged checks

- `node tools/check.mjs` passed all 192 tests and the art and dependency checks. The integration cases cover alternate walls, the 0.85 m reach limit, roof-to-floor debris, both independent 30-second deadlines, and the calm comparison.
- `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,469 files and 163,789,611 bytes with relative resources under the project URL. The local manifest SHA-256 was `896492b545db33973a53507580cf5c0b5f1bb05c7c54e3c82f28f2d5f1d58425`.
- The architect played the packaged game through its title and map selector in WebGL at a 1280 × 720 viewport with the native AFT Bear. A distant strike gave **Target out of reach. Move closer.** The reachable Space strike gave **Match ignited the targeted tile.** Both debited one match.
- In wind, the first burn lit the paving and facing siding before the second roof caught. By the next capture the second roof was burning and sections of the first roof had cleared. Both houses cleared in the final capture.
- In calm air the architect walked along the wall and used the Matches button to strike a different spot. The source cleared and the other house stood cold. Reset restored both houses and 12 matches. The bare project URL opened the regular daytime Catalogue Street.

The architect sampled the same areas in the cold, first-match and pre-transfer full-burn images with the camera and exposure fixed. Values are 8-bit display luma.

| Surface | Cold | First match | Full burn |
| --- | ---: | ---: | ---: |
| Paving between houses | 90.80 | 90.80 | 166.84 |
| Facing siding on the cold house | 45.04 | 45.04 | 102.45 |
| Sheltered siding on the cold house | 49.01 | 49.01 | 52.67 |

The JPGs, original screenshots and match HUD receipts are local under `artifacts/qa/playable-cottage-pair/architect-5f519af/`. The finite loopback preview was stopped via its marker and port 4555 was verified free.

## Play and scope

Open [wind](https://syntaxswine.github.io/tinderbox/?cottages=1) or [calm air](https://syntaxswine.github.io/tinderbox/?cottages=calm). Choose **Play → Catalogue Street**, approach wooden siding, aim and press **Space** or **Matches**. Use **Menu → Reset test scene** for another run.

The playtest is an exterior scene with a fixed Nautilus wind bake and a tuned, shadowless outdoor light budget. The broader fire milestone has separate quality and rendering-cost gates.
