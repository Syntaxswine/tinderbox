# Exact source-local guard and producer trace

All source paths below are read from immutable Git commit `2b350309d9116812a1d3988af090614bdaefbc25`. Raw hashes are in `metadata-audit.json` and `input-references.json`. This document describes captured source arithmetic, not a physical tolerance policy.

## Original descriptor producer

1. `tools/place-geometry.mjs:5-16` yields the original part geometry and its captured world/instance matrix. `geometryData` at lines 18-20 serializes the actual typed attribute/index arrays.
2. `tools/compile-places.mjs:43-46` creates the scene translation and `shiftedBox`. At lines 68-73, `emit` computes a local geometry bounding box, transforms its eight corners by `part.matrix`, then separately adds the scene X/Z offset to its endpoints. The descriptor matrix is instead `translation.clone().multiply(part.matrix)`. These floating-point operation orders are different.
3. The renderer export in `src/runtime/three.js` resolves through the pinned `three.module.js` wrapper to `three.core.js`. `BufferGeometry.computeBoundingBox` calls `Box3.setFromBufferAttribute`; the latter expands bounds from position values. `Box3.applyMatrix4` transforms all eight extrema corners through `Vector3.applyMatrix4`, then calls `setFromPoints`. `Vector3.applyMatrix4` evaluates sums/products and its homogeneous reciprocal with JavaScript Number arithmetic. `Matrix4.multiplyMatrices` separately evaluates the composed descriptor matrix entries. These operations do not produce directed outward rational bounds.
4. `tools/place-geometry.mjs:70-89`, `batchFloorFragments`, concatenates captured attributes/effective indices for same-matrix/material/layout/floor groups, retains contiguous logical source ranges, and unions the prior rounded part bounds. It does not transform the concatenated position scalars. `tools/compile-places.mjs:162-169` keeps the used palette, prunes unused files and writes every final section's parts. The new audit enumerates those final Git files rather than running this producer or reading its scene index.

The accepted first proof has real exact affine vertices outside 190 recorded descriptor bounds. This successor retains one exact source witness in `end-0/result.json`: its positive outside distance, actual source vertex, rounded endpoint, separating probe and enclosing new guard are explicit rationals. It is a counterexample to rounded-bound containment, not a claim that the first roof lost a cover. Its certified selection still equals the original 230 inputs.

## Arithmetic enclosure

The method uses the authority's allowed alternative no-omission proof: bypass the rounded endpoints and enclose the actual captured numeric inputs exactly. It does not estimate a global error or change source coordinates.

For each final palette, audit the complete `position` scalar array. Every value is finite and round-trips exactly through Float32, with `itemSize=3` and `normalized=false`. Let l_j and u_j be the smallest and largest captured scalars on axis j. Unreferenced positions can enlarge these intervals but cannot make them omit an indexed position. Indices are checked against the same position count.

Read each captured 16-entry, column-major matrix. Require its last row to be (0,0,0,1), all entries finite numeric values, and every JSON integer equal to its binary64 value. Parsed non-integer values are already binary64. Convert each numeric value directly to its exact rational representation. No scene offset is applied a second time.

For world component i, use the captured translation t_i and linear coefficients m_ij:

```text
L_i = t_i + sum_j min(m_ij * l_j, m_ij * u_j)
U_i = t_i + sum_j max(m_ij * l_j, m_ij * u_j)
```

Every multiply, add, minimum and maximum in this guard is exact rational arithmetic. The formula handles negative coefficients, translations, tiny captured sine/cosine residues and zero-width local axes without snapping. The cache holds only the unplaced linear sums, keyed by geometry and the matrix's linear portion; each translation is added for the current streamed placement. Rejected placed guards are discarded. This is not a world mesh or spatial index.

## No-omission argument

For every captured local vertex v and each component j, l_j <= v_j <= u_j. Multiplication by m_ij maps that interval to the two endpoint products, reversing their order when needed. Adding three such intervals and t_i therefore contains the exact captured affine vertex component. An affine triangle point is a convex combination of its transformed vertices, so the same box contains the entire effective triangle, including every retained logical source range. Applying this construction to the target roof also encloses its own six upward triangles.

A positive-projected-area strictly higher cover requires strictly positive X and Z interval overlap and a source maximum Y above the roof's minimum Y. Therefore reject a source only when at least one exact separation is nonnegative:

```text
source.maxY <= roof.minY
source.maxX <= roof.minX, or source.minX >= roof.maxX
source.maxZ <= roof.minZ, or source.minZ >= roof.maxZ
```

Equality leaves only a projected edge/point, or no strictly higher point, and contributes no positive-area cover under the accepted +Y upper-envelope recipe. Every other source is retained. The old artist candidate set is also explicitly retained even if the new guard would reject a member; such retention only enlarges the superset. Every original ID must be found once. All 445 section hashes, unique render IDs, metadata digest, candidate identities and per-section classification digests are checked.

Thus no effective source triangle in the captured dataset capable of positive projected, strictly higher cover is omitted by the new selection. Exact overlap and relative-height clipping of actual selected triangles remain a separate step. The guard itself neither proves a cover material nor supplies its area.

## Whole-dataset consequences and boundaries

End 0 and End 1 retain their original 230 candidates each. The first proof's raw selection/mask/result are compared with accepted Git 5dd2f854 and remain unchanged. End 1 receives its own original-matrix six-face solution and four distinct cornice geometries.

The rear selection gains 12 H05 candidates. Their rounded boxes met a roof boundary exactly; the new rational guards cross it by a positive amount. `rear/boundary-references.json` records every ID, exact overlap, matrix, geometry hash, effective range and old exclusion. These are retained candidates, not a positive-area or opacity conclusion. The one actual union attempt reached the unchanged clipping cap and stopped; no area or scalar is supplied for that roof.

Closed captured poses define this certificate. It does not assert completeness for future changed geometry, `openMatrix` poses, dynamic entities, GPU-rounded rasterization or displaced shader surfaces. The actual proof concerns the unchanged exact captured affine geometry and the accepted weather-area recipe. No new global EPS, weld, snapped grid, physical repair or runtime field is introduced.
