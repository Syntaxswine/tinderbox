# One-roof exposure proof and classification proposal

Authority: [`03de2860aa7f09e068922bb1b85aae3e24918849`](https://github.com/Syntaxswine/tinderbox/blob/03de2860aa7f09e068922bb1b85aae3e24918849/docs/engineering/shared-maps/cut-front-measurement-decision.md#L104-L126). Artist package: `e347fe4a3eec5d57c83447144982d3a7c70713cd`. Immutable original source: `2b350309d9116812a1d3988af090614bdaefbc25`. Existing UI/codec branch is preserved; this adds only this fenced research directory.

**Geometric proof complete within the supplied candidate set.** For `replacement/end-pavilion-roof-0`, all 230 candidate records were matched to their actual original triangles and poses. The four cornices below alone cover exactly the same roof area as all 230 candidates combined. The resulting +Y upper-envelope exposure is approximately **2,868.2316693818207 m² of sloped roof surface**, not its horizontal projection.

**Recommendation for architect review:** count these four substantial H22 inert trim solids as covers when adopting this roof's weather-area reference. This requires a classification decision, not a new opacity field or solver. No quantity, stock, binding, collision/support role, anchor, mesh or runtime rule is installed by this proof.

## Areas and exactness

| Measure | Horizontal XZ projection, m² | Actual sloped roof surface, m² |
| --- | --- | --- |
| Original six upper roof triangles | 2,736 | 2,901.7656241970826 |
| Strictly higher candidate cover, counted once | 31.618301495298564 | 33.53395481526191 |
| Geometrically exposed remainder | 2,704.3816985047015 | 2,868.2316693818207 |

[result.json](result.json) retains exact rational projected areas, exact squared area expressions and 128-bit rational square-root enclosures. Each reported total sloped-area enclosure is at most `2^-128 m²` wide. This is mathematical enclosure width for the captured arrays/matrices, not physical accuracy, authoring uncertainty or a GPU-rounding guarantee. All six roof faces share the same exact squared slope factor, so projected measure times that factor's square root gives actual roof area. The original artist interval is independently respected by exact squaring.

If the architect has not yet chosen which physical sources count as weather covers, the conditional exposed-surface interval is approximately **[2,868.2316693818207, 2,901.7656241970826] m²**. Its conditions are the target's accepted weather-area recipe, +Y upper-envelope exposure and completeness of the supplied 230-record set. The exact outward rational endpoints are in `result.json`. It is not an unconditional whole-scene or oblique-weather bound.

## Four decisive original solids

All four have captured material ID `e783ac891d10a54c3ea9dbcd129a913aac18fc1987820f8909e6fa14eb8f36ce`, original metadata `role:null` / `fromAccess:false`, and original appearance slot `trim`.

| Exact original ID | Original section | Geometry ID prefix | Accepted design/ownership |
| --- | --- | --- | --- |
| `end-upper-cornice--1-0-2` | `2_3_3` | `ff8d117a…` | H22 mineral-staff proxy; inert; one original logical solid |
| `end-upper-cornice--1-1-2` | `1_5_3` | `cfdda715…` | H22 mineral-staff proxy; inert; one original logical solid |
| `end-upper-cornice--1-2-2` | `2_7_3` | `04237f0c…` | H22 mineral-staff proxy; inert; one original logical solid |
| `end-upper-cornice--1-3-2` | `3_5_3` | `bfbe0380…` | H22 mineral-staff proxy; inert; one original logical solid |

[material-role-references.json](material-role-references.json) contains full IDs, poses, source paths/hashes and the exact first-matching family result. It verifies 12 actual triangles per cornice, closed consistently oriented convex source envelopes, positive geometric volume, and two actual upper triangles per piece. These are substantial captured source prisms with mitered tops, **not visual-only followers under the accepted ownership intention**. No numeric volume/stock quantity is assigned.

The original [Horticulture builder at 2b350309](https://github.com/Syntaxswine/tinderbox/blob/2b350309d9116812a1d3988af090614bdaefbc25/assets/art/exposition-horticulture/index.js#L76-L83) constructs them with the recorded offset polygon, the `j=2` course (`h=.18`, `w=.96`, `delta=-.04`) and slot `trim`. Its raw `physicalMaterial:'unassigned'` token and appearance colour/opacity are preserved; they are not used to infer physics.

The [architect's material decision at the authority pin](https://github.com/Syntaxswine/tinderbox/blob/03de2860aa7f09e068922bb1b85aae3e24918849/docs/engineering/shared-maps/remaining-material-decision.md#L17-L40) accepts H01–H22 scopes/material recipes except living plants H15. The unchanged [Horticulture proposal](https://github.com/Syntaxswine/tinderbox/blob/e347fe4a3eec5d57c83447144982d3a7c70713cd/art/source/shared-map-fire-bindings/remaining-material-proposal-v1/horticulture-proposal.json) has SHA-256 `c650fd0fad72a0ad926f4e6a2471d626c42da42966f6b01191753db9fac78911`; first matching scope places every one of these IDs in H22. Its historical `accepted:false` / `applied:false` fields are not rewritten. The decision accepts design, not stock/support/export. Target roof H21 is the accepted timber-covering proxy with the weather-area recipe, despite its generic captured `source-ornament` role.

The raw candidate ledger's unassigned-weather field describes the absence of a per-part weather flag in original section metadata. It does not supersede accepted H22 material ownership or require such a runtime flag. Weather-cover interpretation remains the architect's decision; the geometric answer is already available.

## Exact triangle procedure

1. Match the supplied 230 IDs and ID-set SHA-256 to original section records; retain original IDs, geometry paths, effective ranges and matrices. Read eight geometry files only. Roof range is exactly `start:0,count:18`; each candidate uses its complete 36-index/vertex effective range. No other roof is expanded.
2. Interpret captured Float32 position values and binary64 matrix coefficients as exact rationals. Apply each original column-major world matrix once: its source offset is already present. Do not snap near-zero rotation entries or normalize captured transforms. Verify candidate source envelopes from their actual triangles; no fabricated hull or cap is constructed.
3. Use only actual upward triangles. The roof's six projections are nonoverlapping; the intentionally absent underside remains absent. Of 2,760 candidate triangles, 464 point upward, 464 downward and 1,832 are vertical. Downward faces do not add roof area; vertical triangles have zero projected area.
4. Intersect each candidate upper-triangle projection with each original roof triangle, then clip by the exact affine height difference `candidateY - roofY > 0`. Coplanar positive-area equality is recorded separately, never promoted to a strict cover. Recorded descriptor bounds are not cover evidence. Exact triangle-projection bounds only reject pairs with impossible positive overlap.
5. Partition covers into disjoint convex cells and subtract them from the original roof domains. Assert exact area conservation and pairwise nonoverlap at each relevant step. The final certificate has 15 covered and 15 exposed convex cells across the six roof triangles. The separate cornice-only union equals the complete 230-candidate union exactly.

[exposure-cells.json](exposure-cells.json) contains analytical 2D polygons with exact source/triangle witnesses, not art meshes. [candidate-ledger.json](candidate-ledger.json) retains every candidate, actual intersection/relative-height evidence and area. Its `disjointUnionContribution` is an order-dependent allocation to a witness, not a causal removal experiment: two already-contained seam witnesses receive about `9e-18 m²` each in that partition. The separately calculated equality of the complete and cornice-only unions establishes that seams/rafters add no area beyond the four cornices.

## Scope, checks and retained rejection

[input-pins.json](input-pins.json) records 26 exact calculation inputs: authority text, three artist metadata payloads, 14 original sections and eight original geometry files. The geometry files total **34,137 bytes**. The sections contain 944 metadata records; only the selected roof plus its 230 candidates are transformed. [selection.json](selection.json) records those 231 original records/poses. No scene index, full factory, whole-scene geometry, world simulation, renderer, build, benchmark or helper is created.

The source/role follow-up reads the original builder **as text**, accepted material-decision/proposal text, and repeats four already-selected cornice geometries/sections. Its additional references are recorded separately; it expands no new geometry. Codec and train work are unchanged.

[proof.py](proof.py) / [geometry.py](geometry.py) pass the bounded exact calculation. [verify.py](verify.py), [checks.json](checks.json) and [verify.log](verify.log) verify original pins, source hashes, all 230 IDs, analytical partition nonoverlap/conservation, squared-area enclosures and four H22 own-solid references. [negative-controls.json](negative-controls.json) records missing/duplicate IDs, duplicate/omitted roof triangles, a tall original vertical rafter face, an actual rafter triangle only partly above the roof, and duplicate-cover union invariance.

An optional independent **rectangular-top shortcut failed** on the first actual mitered cornice. [Exact failed source](history/rejected-rectangle-check.py.txt) and [raw failure log](history/rejected-rectangle-check.log) are preserved. Actual top vertices do not occupy the Cartesian corners of their bounds rectangle; the active checks confirm this for all four cornices. That shortcut is rejected, not relabelled as a successful independent area proof. The original triangle-clipping procedure does not use it or restore those missing rectangle corners.

Exact affine evaluation protrudes beyond 190 recorded descriptor bounds by up to `4.440892098500626e-16 m`; those discrepancies are retained in each pose audit, not erased with an epsilon. The provided candidate set's whole-scene completeness was not re-derived. The result is scoped to that set and the exact captured affine model; runtime/GPU rounding, oblique exposure, live damage and other roofs remain separate.

Run the bounded source calculation/checks from this checkout with Python's standard library:

```text
python -B docs/engineering/shared-maps/roof-exposure-prototype-v1/proof.py
python -B docs/engineering/shared-maps/roof-exposure-prototype-v1/verify.py
```

The commands are ordinary foreground source checks. No background process remains. Source arrays, UVs, matrices, missing underside, stairs/arrival, source pins, quantities, bindings, physics and art outputs remain unchanged. Artist's 67 scalars and two retained-cut references are separate. This candidate stops at the geometric/material-role handoff and architect classification proposal.
