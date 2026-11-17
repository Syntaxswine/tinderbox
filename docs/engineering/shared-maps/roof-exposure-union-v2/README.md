# Rear roof exact-union successor

Candidate on `codex/shared-map-tools-ui`, parent `1308af2e7eeec2891686d1621aa415fa0739be71`. Authority: [8dd07c0c, completeness successor review](https://github.com/Syntaxswine/tinderbox/blob/8dd07c0ca014bc889e808cd27420902a0c28025a/docs/engineering/shared-maps/roof-exposure-decision.md). This is one source-only union optimization and one rear-roof attempt. Earlier masks, both accepted area references, the original rear cap/source, and the separate train candidate are unchanged.

## Result

The one rear attempt completes at **28,350 original half-plane clips**, below the unchanged 200,000 cap, with the same 569 candidates, 12 boundary additions, 570 placements including the roof, 25 expanded geometry files and 7,468 triangles including the roof. All six original upward offsets `0,3,6,9,12,15` remain; its own non-upward offsets `18,21` remain excluded from the mask and included in the source triangle count.

The complete geometric mask has projected cover **59.35309021441505 m^2** and projected exposure **3684.6469097855847 m^2**, from total projection 3744 m^2. Sloped totals are approximately:

| Area | m^2 |
| --- | ---: |
| Total upper roof | 3873.230868322091 |
| Covered | 61.40176846922495 |
| Exposed | 3811.829099852866 |

[rear/area-reference.json](rear/area-reference.json) retains exact projected rationals, the unchanged squared slope factor through the result, all three squared-area expressions and 128-bit rational square-root enclosures. The greatest binary64 value not above the exact geometric exposed area is `3811.829099852866`, bits `40adc7a87fc6a25b`; the next value is `3811.8290998528664`, bits `40adc7a87fc6a25c`. Verification checks the exact squared bracket. These display decimals are not substitutes for the rational certificates.

This reference is **geometric only**. Weather-cover classification of the new H05/H22 sources remains for the architect. No stock, binding, support, new opacity field or runtime quantity is installed.

## Exact optimization

`exact_union.py` accelerates the existing convex-polygon operations; it does not replace the original half-plane clipper or its counter.

1. Normalize only by the existing exact operation: remove identical adjacent points and exactly collinear vertices, enforce counterclockwise winding and rotate to the lexicographically least starting vertex. No rounding, snapping, EPS, short-edge cutoff or positive-area threshold is introduced.
2. Eliminate only identical canonical polygons. Preserve the original record and the duplicate-to-original witness in each union audit. Full source ledgers and all 569 IDs remain.
3. Sort by exact descending area, then stable source keys. A smaller input polygon may be omitted from union processing only if one retained original convex polygon contains every vertex, checked with exact signed edge determinants and inclusive boundaries. Record the containing input witness. This is a set-preserving representation reduction, not deletion of source geometry or physical ownership.
4. Before intersection/difference, use exact 2D extrema of the actual polygon. Nonpositive overlap on X or Z cannot contain a positive-area intersection. Exact convex containment can settle a whole intersection or difference. Every partial overlap still uses the unchanged original clipping operations.
5. Construct the disjoint cells with the original difference-based method, largest masks first. Retain the existing subset, disjointness, conservation and piece/vertex/rational checks. Complement construction also uses the same exact fast rejection/containment decisions before the original clipper.

Duplicate removal and single-polygon containment preserve union by elementary set inclusion. Sorting preserves union by commutativity. Broadphase rejection proves zero projected overlap; it does not guess from height or rounded source bounds. Signed-edge containment is necessary and sufficient for a point in a closed convex polygon; testing every vertex therefore contains its convex hull. The fallback uses the original arithmetic and predicates. Every positive sliver survives regardless of size.

The masks are finite unions of nondegenerate closed convex polygons. Two such regular closed sets with zero symmetric-difference area are equal: a point belonging to only one would have a neighborhood in the other set's open complement and a positive-area polygon wedge. The preflight checks both inclusion directions exactly, plus disjointness; equality is not inferred from one aggregate area or a decimal comparison. Cover and exposed regions retain the original closed-boundary convention.

## Limits and work accounting

Existing limits are unchanged: 1,200 placements / 128 geometries / 20,000 triangles per roof including the roof, 200,000 half-plane calls, 32 vertices per polygon, 2,048 pieces, 8,192-bit rational polygon components and the original 55-second calculation deadline. `G.half` is never replaced; it still increments once at entry, including trivial clips. The identity and single-call increment are tested. Counters are not reset between roof faces or the H22 subset unions.

The new helper work is separately bounded and reported; it is not represented as free clipping work. Its checks share the original geometry deadline. Limits and actual rear usage are:

| Additional helper metric | Limit | Rear usage |
| --- | ---: | ---: |
| Explicit helper work units (`tick` increments) | 20,000,000 | 3,148,083 |
| Bounding-box tests | 2,000,000 | 646,482 |
| Signed-edge predicates | 8,000,000 | 44,789 |
| Canonical input records | 200,000 | 1,808 |
| Canonical input vertices | 2,000,000 | 6,505 |
| Cached selected-mask polygons | 50,000 | 3,834 |

Other helper counters, including info queries, intersections, differences, containment tests and rejections, are in [rear/optimizer.json](rear/optimizer.json). Cache keys contain only bounded selected 2D masks; no full-world mesh or spatial index is built. Sorting is bounded by the canonical record limit and existing polygon/rational limits. These are algorithmic counts, not a gameplay cost or FPS measurement.

The 12 union calls include six complete cover unions and six H22 subset comparisons. Across them, exact canonical deduplication removes 86 processing duplicates and exact containment removes 1,207 records. All 1,808 original input masks are saved in [rear/union-inputs.json](rear/union-inputs.json); no source ID is removed. Primary cover cells per roof face number `1,477,4,2,1,2`, with exposed cells `1,470,1,1,1,1`.

## Controls before the single attempt

[synthetic-checks.json](synthetic-checks.json) passes seven cases against the original operations: cyclic/reversed duplicates, strict containment, touch-only boundaries, a positive `2^-80` outside strip, an independent positive `2^-160` island, partial overlap and a bounding-box containment trap. Separate positive/negative `2^-80` height checks retain the strict-height distinction. The reference and optimized intersection/difference paths are compared on normalized source-interface polygons. All control clipping, including the reference work, uses 621 original half-plane calls.

Both old successful roofs are then recomputed from their original captured source witnesses, one at a time. Exact cover and complement sets match the accepted archives in both directions; both directed scalar bit patterns remain unchanged. End 0 uses 3,996 clips including equivalence checks; End 1 uses 4,043. Their source inputs, full masks and helper counts are in the `end-0` and `end-1` subdirectories. These are prerequisites, not additional rear attempts.

An initial control harness mistakenly sent an unnormalized clockwise polygon to a reference operation requiring counterclockwise input. Its failed comparison and source remain in [history/rejected-unnormalized-oracle.log](history/rejected-unnormalized-oracle.log) and [the original harness](history/rejected-unnormalized-oracle.py.txt). Correcting that interface precondition preceded all successful controls and source preflights; no rear attempt had started.

[attempt-started.json](attempt-started.json) is a durable single-attempt latch. The entry verifies successful prerequisites and identical hashes of all four execution scripts before creating it. A second invocation refuses to run. [attempt-outcome.json](attempt-outcome.json) and [rear-attempt.log](rear-attempt.log) retain the sole successful attempt. No automatic retry or cap widening occurred.

## Saved-certificate verification and role limits

[verification.json](verification.json) passes without transforming any source triangles or recomputing a union. It checks all 1,464 raw primary positive mask records against the final disjoint cells, every final cell's original source witness, all 1,293 duplicate/containment reductions, all six cover/complement partitions, total/projected/sloped conservation, both directed scalar endpoints and all 12 positive boundary-source records. This separate analytical check uses 15,611 original clips with its own unchanged 200,000/55-second bounds; it does not change the recorded 28,350-clip solve.

The geometric input has 563 positive-cover sources: 544 H05 and 19 H22. Final witness allocation uses 234 H05 and five H22 sources; this allocation is an analytical partition label, not new physical ownership. Of the 239 allocated sources, 238 have the existing closed/outward/convex source-envelope certificate. `rear-link-portal/arch` is the one allocated source without that certificate: its 164 source triangles exceed the unchanged per-source 128-triangle envelope-audit cutoff, so that audit was not run. This does not assert it is open or assign a closed volume. Nine positive input sources have unproved envelopes in total; the remaining eight have no allocated final witness cell.

[rear/role-evidence.json](rear/role-evidence.json) retains the exact source lists and all 12 boundary-source areas. H05's accepted material is timber-proxy and H22's is mineral-staff-proxy; original family/ownership/range evidence is in [rear/candidate-ledger.json](rear/candidate-ledger.json) and the pinned artist proposal. Accepted material family design does not automatically classify every source as a weather cover. The legacy result's H22-only proposal field applies to that subset; H22 alone does not reproduce the full rear mask. This handoff adopts no new weather-cover classification or closed-volume recipe.

## Pins, reproduction and scope

Original geometry source remains `2b350309d9116812a1d3988af090614bdaefbc25`, artist proposal `e347fe4a3eec5d57c83447144982d3a7c70713cd`. The fixed selection is the accepted 1308af2e archive, certified over 445 section files / 61,954 placements / 629 scalar palettes. Every run checks all 42 prior raw artifact hashes and the prior manifest against Git 1308af2e. The new latch/preflight records pin authority 8dd07c0c, the exact fixed selection, original cap, failed source and execution scripts. The previous 200,001-clip cap failure is untouched.

Use Python standard library and existing immutable Git objects, with `-B`. For independent **saved** verification only:

```text
python -B docs/engineering/shared-maps/roof-exposure-union-v2/verify.py
```

`preflight.py synthetic`, `preflight.py end-0`, `preflight.py end-1`, then one `attempt.py` invocation generated this delivery. Do not remove the latch to repeat the rear attempt under this grant. `support.py` imports the previous source module read-only and redirects its saves into this directory; it changes no old source file. The local attributes preserve raw proof/log bytes and recognize original CRLF log endings.

All changes are fenced to this directory. There are no artist/native/world/runtime/stock/support changes, factory execution, build, renderer, benchmark, new chat/worktree, background server or retained helper. All foreground commands and the one solve session exited. The separate train candidate remains at `fb0628605c274550ff8abad50b151843f08747d1`. Candidate push is for architect review, with no promotion or deployment.
