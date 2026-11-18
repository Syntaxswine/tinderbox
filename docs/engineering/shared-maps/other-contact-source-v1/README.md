# Eight non-cornice source representatives

This is the architect-refined first-page checkpoint under [the assignment](authority.md) and [its refinement](refinement.md). It inventories all **1,582 pairs / 1,582 regions** across the eight remaining families, but attempts exactly **eight existing regions**, one per family. **Seven source contacts are proposed, one case is unproved, and 1,574 regions are UNATTEMPTED.** Nothing is installed in a game or accepted family-wide.

The compact [proposal](contacts-proposal.json) reuses the dictionary / instance / relationship / region pattern of artist `0e9ffa764610f7ab047e3d4cdebd05342273463f`. It references 92 geometry buffers once and 1,703 logical owner instances (1,689 physical render-part IDs). Only the sixteen buffers/instances needed by this page were opened/evaluated. The other 76 buffers retain source references without a geometry-validation claim. The disjoint 1,694 cornice pairs remain artist scope.

## Exact first-page selection

The deterministic policy selects the first original relationship ordinal in each named family, without choosing a more convenient replacement after an unproved result.

| Family | Original relationship | Original region | Result |
|---|---|---|---|
| dentil-to-own-cornice | `ee839ee6ab768cb524257edd` | `715ed699e0b9c5185bf38ab4` | proposed; primitives [1, 2] |
| fixed-portal-frame | `a14702a62fb3a781b6586ac6` | `d3cb7c34cc12f1b9f3774c31` | proposed; primitives [0, 6] |
| fixed-window-frame | `9160ca1f5e1aa7bec2557b16` | `f71115f62f6048e3525b8768` | proposed; primitives [0, 5] |
| native-rail-to-real-posts | `7bd76d3d53c2d42a25489f76` | `71782e9fab029141d9eb4b3e` | proposed; primitives [0, 10] |
| native-source-paving-seams | `16c483a4b00c9eff6351e961` | `4309e63aa39a2a6241821134` | proposed; primitives [128, 30] |
| porch-rail-and-neck-frame | `7f3f70a7a9efeccf4416f6f6` | `c3ae0968d116fe97a4b2b6e2` | proposed; primitives [0, 2] |
| railing-cap-to-real-members | `9a9e1c714d76faaec8377e9c` | `5b1da7c755e4d73f34574c7e` | unproved: component helper rejected baluster |
| railing-pier-to-base | `9c0164d6ca770cf97044b888` | `d07976ddaa212af1138c11e1` | proposed; primitives [2, 7] |

The unproved railing-cap pair is `9a9e1c714d76faaec8377e9c`, region `5b1da7c755e4d73f34574c7e`. The existing exact-edge component helper rejects the original `clerestory/front-rail/baluster-0` mesh, global source part **2352**, geometry `8bab8c76f9be09b30411af10f745a5555a5c475b9e20f2d84a3dd979cc40cfa3`, raw SHA-256 `f127db015f33b5b1a7532c3c6fc3b2410564f7ecd6e21330c3f4bb29f68a7e77`. Its recorded code is `original-component-unresolved`. No face was removed, geometry repaired, component inferred or substitute representative selected. This is a helper/representation boundary, not proof that the original physical material is impossible.

## Meaning and identity

Original raw buffers, their actual emitted-world matrices and global tuple indices are pinned in [input-pins.json](input-pins.json). No runtime source decoder or source-blueprint expansion is used. Original kinds (including fixed embeds, butt joints and symmetric paving seams), roles, directions, recipes and full region hashes are retained. Historical witnesses, presence/absence of null fields, and `geometricBearing:false` remain original data. A repeated owner does not acquire fuel per relationship.

Candidates come only from existing original witnesses or interiors/centroids of actual original-facet intersections inside the original endpoint bounds and any shared selector. Null selectors remain null; endpoint bounds are checking domains, not replacement physical solids. There is no nearest surviving face, new cap, geometry alteration or tolerance increase. Connected surface components are enumerated on the full original physical mesh using the pinned existing helper. The resulting primitive/component mapping is not a general material-volume solver.

Each positive has unique original primitive membership on both ends, actual normals, selector/endpoint coverage and three unchanged contact checks. The existing symmetric paving seam also checks the reverse order, preserving its original direction rather than adding a reverse brace. Point membership uses the original `segmentTriangle` predicate with EPS **1e-7**; reported floating plane residuals are not a claim of exact rational coplanarity. The native contact closure retains its **1e-5 m** contact convention. Perpendicular faces or these binary contact results establish no horizontal load capacity, fastening strength, anchors or grounding.

The paving representative explicitly preserves source range **start 60 / count 36**. Its child uses global source index **12724**, source part `visit-cap/ny-side-approach--1/2` and render part `visit-cap/ny-side-approach--1/0/section-batch`. Absolute original buffer primitive **30** is separately recorded as range-local primitive **10**. These are source ordinals, never native clipped-face ordinals. Native record/cell identities remain null and unbound.

## Checks and reproduction

[checks-summary.json](checks-summary.json) records **24 contact-predicate checks** and **38 applicable negatives**: 14 wrong original primitives, 12 out-of-selector original vertices and 12 old volume witnesses excluded from the selected faces. Only the seven positives contribute these counts. One separate bounded verification pass rechecked the seven saved positive proofs without searching additional regions. The eighth case remains explicitly unproved.

The source calculation and verification each process at most eight regions, with a 55-second internal deadline and a 60-second hidden child timeout. [Run receipts](runs/page-000.json), [calculation](pages/page-000.json) and [verification](checks/page-000.json) retain exact source/result hashes, PIDs, executable, timestamps and completed exits. Preparation is metadata/cache work only. No process or port is retained.

For a fresh checkout, hydrate the pinned ignored cache and audit the stored checkpoint:

```powershell
python -B docs/engineering/shared-maps/other-contact-source-v1/run.py cache
python -B docs/engineering/shared-maps/other-contact-source-v1/run.py check
```

Those commands use finite hidden children and ignored fresh receipts. The original page/verification commands refuse existing attempts; failed/incomplete children stop continuation and are not silently retried. Do not expand beyond these eight representatives without the architect's next assignment. The unexecuted broader draft is preserved under [drafts.json](drafts.json); it is historical work, not a replay instruction.

[The schema](schema.md) and [machine schema](schema.json) describe the exact compact format. The cache contains pinned raw input buffers once, never per-region geometry exports; no mesh arrays occur in the proposal. Source assets, UI/runtime code, prior QA and the train branch are outside this candidate. There were **zero native/compiler, source decoder, source-blueprint, graph/world/publication, renderer, build or benchmark runs**. Actual-native allowances remain spent and the whole-New-York diagnostic remains unrun. Stop for architect/artist review.
