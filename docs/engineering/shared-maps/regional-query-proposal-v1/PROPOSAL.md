# Regional effective queries: proposed contract

**Scope and facts.** Source pin `3b1310192f3fca2ff03fd9d73b0d0d54eb5dccfb`; this is a proposal, not implementation or executed acceptance. The saved clerestory roof is closed; its 4,132 native fragments have their own closedness. The deck has four fragments. `prepareClaim` currently retires whole carriers. Boundary rays use face intersections, while swept collision additionally uses checked closed-interior parity. These are different contracts. Only static roof/deck ownership is proposed; moving doors and other carriers keep their current paths.

**Representation.** Introduce one tagged `EffectiveShape`, consumed by shared geometry operations, rather than exposing masked records as ordinary triangle arrays:

```text
EffectiveShape { originalPartRef, gridPin, generation, revision,
  originalClosedShape, cellDomains, nativeRecordRefs }
cellDomains[originalCell] = cold | native(receipt) | retired
query(view, segment | sweptCylinder | faces(surface|solid), request)
prepareDomainSwap(receipts, expectedGenerationRevision)
  -> { validate(), commit(worldTransaction) }
```

Keep the original owner, part/range, source/sheet, native boundary and fuel IDs; a region is only an activation leaf. Receipts enumerate integer `[4,1,4]` domains under the original grid, including cells yielding no exterior fragment. Missing output does not itself certify a hole. Keep immutable original geometry as a reference for cold containment and original attachment bindings, never as an additional whole-source collider.

Cold faces are original faces restricted to cold domains; cold interior is the original checked solid intersected with those domains. Native domains defer to actual native triangles, solid triangles, pose, intact state and closedness; retired domains supply neither faces nor occupancy. Do not close native fragments, manufacture cell-boundary faces, fill bounds, or flip the original source's closed flag. An empty native receipt needs explicit complete query coverage. If it cannot distinguish required interior semantics, reject installation.

**Shared operations.** `segment` filters candidate hits by authoritative domain *before* selecting each record's first hit. Preserve endpoint options, sorted ties, actual normals, existing sheet deduplication and material/opening transmission; distinct corner sheets still count. Do not add interior attenuation to currently face-based rays. `sweptCylinder` must restrict both contact polygons and original closed-interior tests in three dimensions, including intermediate domain crossings and radius/height overlap. A centre-point mask or parity on an open clipped shell is insufficient. `faces` returns scoped actual surface/solid pieces with original provenance for footprints, floor/headroom and contacts. No consumer may flatten the tagged shape into `{triangles,closed}`. If this shared kernel cannot represent a case, the claim stays disabled.

Source tolerances differ: geometry `1e-7`, cylinder `1e-6`, plan `1e-4`, follower/source support `2e-5`, and contact `1e-5`; keep them separate.

Ownership follows original integer cell classification, including its existing boundary convention; EPS-expanded compiler geometry is a query halo, not an enlarged claim. At faces/edges/corners inspect every touched domain, resolve halo replicas by original cell/primitive identity, and retain the existing geometric EPS and sheet-tie rules. Preserve existing compiler discard rules; add no new small-piece cutoff, carrier-only deduplication or centre-only body classification. Unresolvable halo provenance is an admission failure.

**Atomic replacement.** Stage domain coverage, native query records, stock and support receipts against one generation/revision. Validate disjoint claims, original identities, complete coverage and every prerequisite before mutation. Commit synchronously under the existing activation coordinator: publish one effective view/index revision and defer observers until all participants finish. Failure leaves queries, stock, probe memo and notifications unchanged. The separate support/birth gate must pass before live claims.

Invalidate old and new affected cell bounds, including interior-only changes: previously clear watched rays must wake even when mesh bounds do not move. Advance index geometry/membership and per-owner domain revisions; invalidate heat links/radiation, source/follower shapes, navigation/body views and contact/support caches. Immutable triangle preparation may survive only unchanged arrays. Reset/disposal advances generation, rejects stale receipts and clears masks, bindings, subscriptions and cached views.

Bind oil, followers and support witnesses to original local source/cell contacts before damage; resolve those tokens to current cold/native records. Lost original contacts report loss; no nearest-survivor or remote-parent reassignment. Later falling/landing uses real current contacts. Support selection must receive scoped faces and stable original endpoints, while graph components, anchors, birth exceptions and cascades remain outside this proposal.

**Differential gate, all unrun.** Use saved roof/deck geometry and original IDs without recompiling here. Wholly cold compares original `shapeForPart`; fully native compares saved original fragment records, including their closed flags. One-region partial compares the explicit original-domain plus native oracle, with distant cold queries unchanged. Retire an actual mapped patch and test its hole, oil and actor support (`native-map-queries`, `source-activation`, `actor-support`). Sweep/ray across a seam and through a cold closed interior with no nearby exterior (`source-collision`); compare effective hits, normals, endpoint inclusion, transmission and clearance. Test opposite observers, exact faces/corners and both sides of existing EPS bands (`geometry.test`). Failed/overlapping/stale claims, reset and disposal must preserve or invalidate the complete view atomically (`native-source-registration`). Query references, follower bindings and support endpoint selections must remain original; existing controls are source references, not evidence that regional behavior passes.

<!-- consumer-table-start -->
| Consumer / pinned source seam | Current path and required common interface |
| --- | --- |
| `geometry.js` [G1-G6] `crossings`, `trace`, `supportAt`, `change`, `addBatch` | Shared physical index; raw crossings can include retired transparent records. Compare effective hits after existing live/pass filters; preserve first hit, sheet ties, transmission and watchers. Route through tagged queries; invalidate interior domains too. |
| `simulation.js` [T1-T4] `localLinks`, `buildRays`, `applyCommand`, `moveFalls` | Heat, tools and falls share the index. Preserve ray options and path invalidation; contacts need scoped solid faces. |
| `visibility.js` [V1]; `scene-thermal.js` [H1-H3] `tracePart`, `trace`, `surfacePoints` | Sight uses index plus independent moving-furniture/render-mesh traces; tool trace also has that second path. Keep furniture authority separate; source-bound static paths must use the same effective view. |
| `collision.js` [C1-C3]; `native-disc-slide.js` [D1] | Sweep parity and height-clipped contact polygons are direct triangle consumers, separate from boundary rays. Both need domain-aware shape operations. |
| `place-navigation.js` [P1-P3]; `map-navigation.js` [M1]; `navigation.js` [N1-N3] | Independent plan support/headroom, raw live shapes, extra render stair meshes and furniture envelopes. Scope source surfaces and live clearance; preserve unrelated extras and measured body/step rules. |
| `actor-support.js` [A1]; `simulation.js` [T5-T7] `resolveLanding`, `replaceSupportReferences` | Actor gravity, oil support, falling footprints and rebinds share hits but read faces directly. Return stable contact tokens; no blanket whole-proxy rebind. |
| `source-follow.js` [F1-F3]; `source-support-calculations.js` [S1-S3]; `support.js` [B1] | Independent cold/native parent switch and raw face contact/selectors. Preserve pristine bindings, argument order and existing tolerances; graph/birth behavior stays a separate gate. |
| `source-query-registry.js` [Q1-Q3]; `native-query-registry.js` [R1-R2]; `map-source-geometry.js` [O1-O2]; `source-activation.js` [X1] | Producers and transaction seam: replace whole-carrier claims with versioned domain views. Preserve floor top versus solid channels and original source/range/pose identity. |
<!-- consumer-table-end -->

Full paths, exact line anchors, source hashes, fixture identities and existing test titles are in [inventory.json](inventory.json). Recheck with `python -B docs/engineering/shared-maps/regional-query-proposal-v1/inventory.py`. Only the static inventory/word/reference checks are executed. No native/compiler/world/physics, export, runtime, benchmark, build, renderer or helper work is authorized or performed.
