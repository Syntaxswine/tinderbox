# Complete captured-source selection for the three roof exceptions

Source-only successor to `5dd2f8543aa149123ff7d7c24fa4cdad8aaac46a`, on `codex/shared-map-tools-ui`. Authority: [68dc1533, roof exposure decision](https://github.com/Syntaxswine/tinderbox/blob/68dc15337cb29c79d7fb9e84f8be3d09bdd688fe/docs/engineering/shared-maps/roof-exposure-decision.md). The original proof directory and the separate train/UI candidates are unchanged.

Two complete geometric area references are delivered. The rear roof has complete candidate selection but **no final exposure area**: its one union attempt reached the existing 200,000 exact clipping-operation cap. That attempt stopped and was not retried or given a wider limit. This is a bounded proof report, not three finished roof quantities or a runtime delivery.

## Outcomes

| Captured roof | Original candidates | Certified candidates | Added boundary IDs | Placements including roof | Geometry files | Triangles including roof | Outcome |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `replacement/end-pavilion-roof-0` | 230 | 230 | 0 | 231 | 8 | 2,766 | Accepted prior mask now has complete source selection |
| `replacement/end-pavilion-roof-1` | 230 | 230 | 0 | 231 | 8 | 2,766 | Separate complete geometric mask; four H22 cover classifications proposed |
| `rear-curtain-roof` | 557 | 569 | 12 | 570 | 25 | 7,468 | Selection complete; union cap-stop; area withheld |

The three expansion caps remain 1,200 placements, 128 geometries and 20,000 triangles **per roof, including the roof**. The inherited polygon limits also remain: 200,000 half-plane clips, 32 vertices per polygon, 2,048 pieces and 8,192-bit rational components. The substantive metadata, palette, selection and exposure loops use a 55-second internal deadline. The rear failure occurred at clip attempt 200,001, during union, after the bounded source-face pass. Its input counts did not exceed the three expansion caps.

## Area references

The following are display approximations in m^2. [area-references.json](area-references.json) contains the exact projected rationals, each actual-area squared expression, 128-bit rational square-root enclosure, all six roof planes, original cover matrices/ranges, and the directed-lower binary64 scalar and next value.

| Roof | Projected total | Projected covered | Projected exposed | Sloped total | Sloped covered | Sloped exposed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| End 0 | 2736 | 31.618301495298564 | 2704.3816985047015 | 2901.7656241970826 | 33.53395481526191 | 2868.2316693818207 |
| End 1 | 2736 | 31.61816915696509 | 2704.381830843035 | 2901.7656241970826 | 33.53381445896555 | 2868.231809738117 |

The greatest binary64 values not above the exact sloped exposed areas are:

- End 0: `2868.23166938182`, bits `40a668769d5e84ce`.
- End 1: `2868.2318097381167`, bits `40a66876afc41836`.

Each is checked by exact squaring: value^2 <= exact squared area < nextBinary64(value)^2. A displayed nearest decimal is not the enclosure. Preserve the two roofs' distinct source results; do not average them or copy one scalar to the other.

End 0 retains exactly the accepted old 230 sources, geometry hashes and mask. Its four substantial `end-upper-cornice--1-{0,1,2,3}-2` source prisms were classified as weather covers by authority 68dc1533. The first final area reference is now ready for quantity-authoring review under that decision.

For End 1, four actual closed, outward convex `end-upper-cornice-1-{0,1,2,3}-2` prisms alone reproduce the complete 230-source cover union. Their exact H22 scope, mineral-staff-proxy material, inert quantity recipe and one-per-original-logical-solid ownership are accepted family design. Counting these four new source IDs as weather covers remains an explicit proposal for the architect. Their original appearance slot or unassigned physical token is not an opacity argument. No runtime opacity field or support role is introduced.

## Candidate completeness and read scope

[producer-trace.md](producer-trace.md) gives the producer trace, numeric model and no-omission proof. The replacement guard uses actual captured palette extrema and captured matrix values with exact rational affine arithmetic; it does not widen a physical tolerance, snap coordinates or reuse rounded descriptor bounds.

At immutable source `2b350309d9116812a1d3988af090614bdaefbc25`, the complete Git-tree universe is 445 Horticulture section files: 61,954 unique render IDs and 63,788 logical-source occurrences, with 38 source-range batches. All 445 raw hashes match the artist's pinned section list. Those descriptors total 26,014,816 bytes. All 629 referenced palette files, 17,368,159 bytes, were audited as scalar arrays: 392,061 position scalars, finite and exactly captured Float32 values, with valid index ranges. No scene index, factory or whole-world mesh was loaded.

The palette audit does not expand or place triangles. Selection streams each descriptor and discards rejected world guards. Its cache contains only unplaced geometry/linear-matrix scalar spans. Actual face transforms are confined to a selected roof, its bounded candidates, the first roof's source-bound witness, and the small verification cases.

The 12 newly retained rear candidates all lie in accepted family scope H05. Against the old rounded roof/part bounds, eight were excluded at the front boundary, one at the right and three at the left. Exact guards have positive projected overlap. Their full IDs, original section/ordinal, geometry hash, matrix, full effective ranges, exact overlaps and accepted family metadata are in [rear/boundary-references.json](rear/boundary-references.json). Positive guard overlap is candidate evidence; it is **not** a claim that these 12 contribute actual weather cover. That remains unresolved after the union cap.

## Evidence and checks

- [metadata-audit.json](metadata-audit.json): every section path/hash/count, the full streaming metadata digest, referenced palette paths and producer pins.
- [palette-extrema.json](palette-extrema.json): every raw palette hash, exact captured scalar extrema, numeric type, position count and effective index count.
- [input-references.json](input-references.json): additional immutable source/proposal/authority references and their hashes. The accepted H01-H22 family decision is `03de2860aa7f09e068922bb1b85aae3e24918849`; the unchanged proposal hash is `c650fd0fad72a0ad926f4e6a2471d626c42da42966f6b01191753db9fac78911`.
- Each roof's `selection.json`: complete source-range/placement/matrix records for all candidates, original-set flags, explicit added IDs, exact guards and per-section selection digests.
- [end-0/result.json](end-0/result.json): accepted-mask identity, new source-bound counterexample, completeness closure and scalar reference. The old [mask](../roof-exposure-prototype-v1/exposure-cells.json) is reused unchanged.
- [end-1/result.json](end-1/result.json), [candidate ledger](end-1/candidate-ledger.json), [partitions](end-1/partitions.json) and [cover references](end-1/cover-role-references.json): independent second-roof source and exact disjoint union/complement evidence.
- [rear/cap.json](rear/cap.json), [failure](rear/exposure-failure.json), [log](rear-result.log) and [executed source](history/expose-at-rear-cap.py.txt): retained third-roof cap failure. It has no result, area, scalar, successful union or new weather-cover adoption.

The local .gitattributes preserves raw certificate and tool-log bytes, including the original log line endings; Git recognizes CR at the end of these archived log lines. [artifact-manifest.json](artifact-manifest.json) lists the raw hashes of every other task file.

Final [verification.log](verification.log) and [checks.json](checks.json) pass. Verification rechecks all section/palette pins and selection digests, compares the accepted old artifacts to Git 5dd2f854, and independently checks each successful roof's six-face domain, four H22 source solids, mask nonoverlap, conservation, square-root intervals and binary64 brackets. This small geometry verification uses five placements, five geometry files and 54 triangles for each proved roof, sequentially; it expands no rear triangles and never reruns its stopped union. Twelve [negative controls](negative-controls.json) include missing/duplicate IDs, a missing section, a trimmed palette extremum, exact equality versus positive 2^-80 overlap/height, duplicate cover union, a real vertex outside rounded bounds and area withholding after the cap. Verification uses 1,267 exact clips.

An initial verification assertion incorrectly expected a literal H21 mention in the family decision, which instead accepts the H01-H22 range. Its original script and failure log are preserved in `history/verification-1-provenance-assert.*`. The corrected check validates that range, the exact accepted proposal hash and H21's weather-area recipe. This diagnostic did not run a geometry proof.

## Reproduction and limits

Use Python standard library and existing immutable Git objects. Run from the assigned UI checkout with `python -B`; no package install is needed. The saved evidence can be checked with:

```text
python -B docs/engineering/shared-maps/roof-exposure-completeness-v1/verify.py
python -B docs/engineering/shared-maps/roof-exposure-completeness-v1/report.py
```

`prepare.py metadata`, `prepare.py palette`, `select.py end-0` and `finish_first.py` generated the first closure. After that proof, `select.py end-1` and `expose.py end-1` generated the second. Finally `select.py rear` and one `expose.py rear` attempt produced the complete third selection and its cap failure. Preserve the failed attempt; do not rerun the rear solve to seek an area under this grant. `history/expose-at-rear-cap.py.txt` records the source that includes only the six upward roof faces; its own two non-upward offsets 18 and 21 stay excluded from the weather mask and included in the eight-triangle source budget.

The certificate applies to the captured source dataset and closed poses. It is not a dynamic open-door, actor, shader-displacement or general weather solver. There is no stock, binding, physical underside/cap repair, geometry export, support change, native/world simulation, build, renderer, browser review or cost/FPS run in this successor. The rear quantity and End 1's new weather-cover classification remain for architect review.

The source commands finished before the coder's reserved cost observation, held during its explicit window, and resumed after its process-exit notice. Short-lived foreground Git readers close in `finally`; all task command sessions exited. No background helper, server, port or retained process was created.
