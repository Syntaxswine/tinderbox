# Native explicit-solid placement correction

Runtime checkpoint: `8e50a4c0e39a48241001a02f7a29c4193fdd343d`. The corrected collision initially exposed a real kitchen clearance failure in the preserved `4cecd10d` source. The architect-reviewed exact artist successor `6d145569c7b4ef5514698dcc713256de9ff7eb2b` now passes the integrated source and corrected-world kitchen checks below. Package and actual-input acceptance have separate records; earlier browser evidence remains historical.

## Exact fault and correction

The shared rigid placement walker transformed surface/floor triangles but left explicit `solidTriangles` in source-local coordinates. The pinned Catalogue house contains 417 explicit-solid surfaces. Existing compiler branches rebuild 387 of them; 30 authored attachment meshes (posts, ledgers, casing extensions and rails) retained the stale collision coordinates. The original furnished-house source has 433 explicit solids, all compiler-rebuilt; the shop sources have none.

For `circulation150/stair/rail/upper-front`, the old compiled fragment was indexed at world X approximately 16–16.5/Z9.505–9.56, while its collision vertices remained around local X6.27–8.51/Z3.44–3.50. The ordinary native sweep therefore missed a visible authored rail. An independent manual transform of the immutable source mesh rejects the same world-space sweep.

The correction adds `solidTriangles` to the existing rigid triangle transform. Retained explicit solids are then clipped to the matching world fragment, with bounds derived from the actual stored solid and thermal geometry. Cut fragments remain open; no closing faces, whole-object hulls or new railing geometry are invented. This also prevents a surviving cell from keeping an entire retired portion's original collider. Authored art, dimensions, body profiles, gait, step rules and collision tolerances are unchanged.

## First corrected-runtime gate on the preserved 4ce source

| Check | Corrected-runtime result |
| --- | --- |
| Native placement regressions | 5/5: four rotations/translation/nonmutation, actual-solid broad-phase bounds, pinned world railing, clipping/partial retirement, real aperture |
| Existing composition regressions | 8/8 |
| Pinned provider matrix | 67/67; all providers disposed |
| Repository | 511/511; syntax, imports, shared Three and provenance pass |
| Integrated source | Stops on the real kitchen target/post overlap described below |
| Build/release/nested HTTP/browser | Not run for the corrected product |

Before the fix, four of the five new regressions failed. Red/green sources and logs, exact source/runtime fingerprints and cleanup records are preserved under `artifacts/qa/house-traversal-placement/`. The affected provider matrix is `artifacts/qa/house-traversal-physical/4cecd10d-explicit-solids/`. The [explicit runtime declaration](runtime-integration.json) records the two added compose/scene hashes; original artist controls/reference/historical results remain unchanged.

## Authored route clearance blocker

The immutable source gate first fails the goat's inbound kitchen route at transverse offset −0.10 m. Its target local `[4.65,0.48,1.25]` overlaps `circulation150/stair/post/lower/left/0`: local bounds X4.685–4.75, Y0.48–1.23, Z1.4675–1.5325. The target is only 0.220298 m from that footprint for a native 0.5 m body radius; the stair body band also overlaps its height. The correctly transformed authored-mesh oracle and native target clearance both reject it. The safe accepted prefix ends around local `[4.7515625,0.48,0.9453125]`.

The architect's bounded navigation-only proposal changed only the bend `[4.75,0.48,1.25]` to `[4,0.48,0.75]`. The first goat/−0.10/inbound case instead overlaps the existing settee seat envelope at target local `[3.9,0.48,0.75]`; the other 29 cases were explicitly not run after that first block. The seat's source bounds are X2.075–3.625, Y0.76–0.96, Z0.275–0.925. No source export was edited by this disposable proposal check. Exact world/source bounds and results are in `gate/clearance-failure.json` and `kitchen-route-proposal.json` under the placement evidence directory.

These failed controls remain preserved. The post, native colliders and animal bodies were retained throughout the correction.

## Accepted exact kitchen source successor

The architect reviewed and accepted artist commit `6d145569c7b4ef5514698dcc713256de9ff7eb2b`. It translates the complete native settee 0.35 m along local −X, to `[2.5,0.48,0.6]`, and supplies the nine-point kitchen route in [the artist's handoff](../../art/h15-kitchen-route/README.md). The actual furniture passage is **1.395 m**; structural 1.50 m rules, all building surfaces, stairs, the main route, native mesh shape, paint/UVs and finite fuel remain unchanged. The immutable 4ce house/scene exports are preserved separately, as are the original checker, reference and historical receipt.

The corrected-world audit consumes the exact committed exports, without an independently shifted replacement tree. The compiled centre is explicitly `[21.5,0.48,12.4]`. All eight part/source-mesh matrices and physics bounds, 288 render vertices and their normal/UV/paint fields, and nine actual support-contact polygons agree with the native rigid placement. Their full 0.0196 m² foot area bears on the actual bound world floors. After ordinary trial advance, all eight parts remain solid and intact and the whole settee remains supported and nonfalling.

| Exact successor check | Result |
| --- | --- |
| Original integrated source assertions | 15 checks, 60 routes and 819 render registrations pass; zero retained art resources |
| Corrected world kitchen route | 30/30 cases and 240 straight segments: three animals, five local X offsets, both directions |
| Affected native provider matrix | 67/67 pass; all 67 providers disposed |

The source-local nested `circulationRoutes.kitchen` metadata is explicitly rotated by two quarter-turns and translated `[24,0,13]` for world movement. The item's reservation `footprint` is also source-local authoring metadata; active collision uses transformed bounds/parts, while floor/gravity support uses transformed `supportContacts`. No runtime transform was added for unused metadata.

Two extra audit assumptions stopped before any route movement: treating the reservation footprint as a world field, and requiring the complete Catalogue structural graph to have the isolated house's zero unresolved count. Both failures and exact validator sources are retained separately; neither was a product rejection. The final check retains actual world part/render/contact assertions, full native sweep authority and real support/nonfalling checks. The earlier synthetic proposal fixture is retired and does not qualify the shipped source.

Exact source/world receipts, all attempted validator sources and their matching hashes, route results and cleanup are under `artifacts/qa/house-traversal-placement/6d145569-source/`, `6d145569-world-final/` and `validator-source-preservation.json`. The affected matrix is under `artifacts/qa/house-traversal-physical/6d145569-explicit-solids/`. The [corrected package gate](corrected-gate.md) passes after these source-first checks; actual input review remains separate.

## Historical browser evidence

All earlier `e7e2bad3`/`c5bd20e6` package and browser results predate this collision-placement correction. They remain historical evidence rather than corrected-product acceptance. The first session completed both captured front-door regressions and the mouse barrel glance, then stopped on a misclassified stair negative. The next completed all four goat/horse full visits, then stopped on a shallow optional bear wall target. The last bear session was explicitly retired on the architect's collision HOLD. Every source/restart snapshot, failed attempt, selected/excluded matrix, JPG and cleanup receipt is preserved; none was relabeled as a corrected-product pass.

The QA runner now supports a validated HTTPS base URL and exact case selection, with intentionally excluded cases recorded as unrun rather than passed. CPU-only planning is explicit. Optional wall/unsupported probes are planned against actual incremental native movement and existing arrival/stall thresholds; a lawful stair descent or an arrived shallow target is not a failed safety control. The existing bear-mouse visit now includes the exact source-framed kitchen out-and-back before final exit and a normal-zoom passage JPG capture. These observer/tool changes remain separate from the scoped runtime correction. A fresh local renderer needs the architect's reviewed package and grant; no public session is authorized without the later live URL and a separate fresh grant.
