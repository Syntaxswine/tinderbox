Recommend one opt-in **2 m × 1.06 m × 2 m compiler-region pilot for the existing static clerestory roof**, under its original logical owner. Restrict the existing native cell loop, preserve original geometry/IDs and extend its stock/query/support transaction to partial ownership. This is the concrete proposal for [authority `ea0bb3db`](bounded-source-design.md); no runtime implementation, source export or shipping format is accepted here.

The [saved input](support-large-proof-v2/reference-blocks.json), SHA-256 `bfab707ff646e9dfedfaae3b80d510ac750e4f561335d895c24c4e4cc4d49418`, supplies 4,132 roof fragments and 33,558 ordered directed continuity edges. Owner `new-york::carrier/roof/clerestory` is carrier 10027, original part **10387** (`roof/clerestory`), with canonical stock **490.002072**, unchanged `roof` profile, 536 declared parents/adjacencies and zero anchors. The original part is a **closed solid**.

Assign a region by the encoded original cell: `floor(cx/N), cy, floor(cz/N)`, with N=4 or 8. Keep native y layers 20 and 21 separate. The .5/1.06/.5 m grid, 2.12 m authored storey pitch, asset dimensions and original source-face order remain unchanged. Do not use centroids or post-damage bounds to assign ownership.

| Saved roof analysis | 2 m | 4 m |
| --- | ---: | ---: |
| Nonempty native groups | 232 | 58 |
| Potential cell-box descriptors | 320 | 80 |
| Descriptors with no saved exterior fragment | 88 | 22 |
| Maximum fragments per group | **36** | **116** |
| Cross-region directed edges | 12,334 | 6,276 |
| Internal directed edges | 21,224 | 27,282 |
| Native port fragments | 3,204 | 1,884 |
| Pristine cold support components | 304 | 72 |
| Groups with two separate components | 72 | 14 |

The actual [activation radius](../../../src/simulation/source-activation.js) is `8 + hypot(.5,1.06,.5)/2 = 8.63710281744786 m`, after snapping the query to a native cell centre. The production thermal adapter supplies no override to the 8 m radiant rule. The analysis exhausts **131,600** centres, cells `[65,11,49]` through `[158,30,118]`, with an outer safety cell and no route selection. Tight saved bounds and conservative cell boxes clamped to original owner bounds give the same maxima.

| Worst single-query roof scope | 2 m | 4 m |
| --- | ---: | ---: |
| Nonempty regions | **138** | **44** |
| Native roof fragments | **2,486** | **3,112** |
| Internal directed edges | 19,438 | 24,662 |
| Directed edges across the cold boundary | 1,336 | 1,208 |
| Incident directed edges | 20,774 | 25,870 |
| Maximum candidate descriptors, including empty exterior groups | 162 | 52 |

The maximum-fragment witnesses are `[53.75,21.73,41.75]` and `[55.75,21.73,41.75]`. Candidate-descriptor maxima occur at different centres, saved in the evidence. These are roof-only counts for one frontier query. Other carriers, multiple hot sites and support cascades add work; accumulated activation can reach the whole roof. The 36-fragment regional bound is **not** a 36-fragment input-action bound. Keep the physical radius unchanged and require complete coverage before the associated command/step. Counts establish no timing budget.

Choose the compiler descriptor because [the current clipper](../../../workbenches/furnished-house/scene.js) already iterates canonical cells. Compute full-source `lo/hi` and `single` **before** restricting iteration, so region size cannot change an original `source@cell` ID into an unsuffixed ID. Preserve original triangles, solid-triangle handling, normal, EPS, denominator/source amount and native fuel IDs. No internal cut caps, new exposed faces, mesh export, UV island or texture-density change is needed. Offline geometry subdivision would additionally change asset/range IDs and require the same parent-stock, partial-proxy and support reconciliation; treating its pieces as independent carriers would not preserve this owner.

The smallest coherent interface is four staged operations, all proposed names:

| Operation | Contract / current seam |
| --- | --- |
| `regionsNear(point,radius)` | Original owner/part/source IDs plus integer `[4,1,4]` cell ranges, source/compiler/grid pin and install key; extend `createMapSourceGeometry` |
| `prepareRegion(descriptor)` | Same native cell algorithm and original boundary/fuel IDs; disjoint source/cell installation tracking in `compileScene`/`prepareSources` |
| `prepareRegionClaim(receipt)` | Nested original-owner stock claim plus matching cold-query replacement; extend carrier ledger, query registry and source activation |
| `prepareSupportRegion(receipt)` | Fixed original ports/parent selections and local cache dependencies; extend source support and follower adapters |

A region alias is an activation leaf, not a new canonical stock owner. One original source definition may be installed over disjoint cell domains, but overlapping domains and duplicate fuel/native IDs reject. Preserve source provenance, metric geometry, UVs and attachments. The owner state becomes cold/partial/full, with region claims monotonic cold/native/retired until reset; existing whole-carrier booleans must not erase the cold remainder after the first claim. Other carriers and moving doors keep their current path.

**Stock certificate is an unresolved implementation prerequisite.** Keep Q=490.002072 authoritative. Fixed regional canonical shares must come from the original pre-damage source allocation and unique strict canonical-cell measure, including degenerate planes and EPS-discarded cells. They cannot come from fragment counts, surviving geometry or normalized biased native areas. Native fragment amounts retain the original formula. Each region needs the existing source-local epsilon/roundoff proof restricted to its owned cells, with its native-minus-canonical delta exposed. No halo may claim stock twice, and no unrelated reserve or larger tolerance may hide a local mismatch.

The canonical shares and a separately certified arithmetic residue must roll up to the original Q. Close that residue into parent bookkeeping once at full activation, without changing any physical fuel or topping up a last fragment; the parent's active amount is then Q and cold reserve zero. Keep that roundoff distinct from native clipping delta. The saved identity lacks full fuel/certificate records, so this step proves no regional amounts. Zero saved exterior fragments also do not prove zero canonical share or closed-volume coverage. A missing or invalid certificate prevents installation.

Validate the physical batch, local query replacement, stock claim and support replacement together. Commit through one world transaction with no intervening tick, await, query, publication or reentrant world read. Failure leaves the world and probe memo untouched. Reuse existing air-cell remapping and radiation/link invalidation; preserve existing heat, incoming energy, fuel state and queued work. Mark a snapped point probed only when its complete required coverage commits. Reloading a visual section cannot refill stock or turn retired cells cold again.

**Mixed closed-solid query semantics are unresolved and required.** [The current claimant](../../../src/runtime/source-query-registry.js) retires an entire part proxy. A regional install must retire the whole proxy only while atomically replacing it with exact remaining cold coverage and the installed native records. Cold exterior queries must exclude active/retired cells, without an uncut whole-source ghost or artificial cut faces. The source's closed interior test must remain correct in cold cells and defer to the native representation in claimed cells. The existing binary closed flag cannot silently be set false on all cold pieces or true on clipped open geometry. The implementation must choose and prove a common effective-query representation through heat, sight, collision, navigation and falling-material consumers before enablement.

Oil, actors, furniture and rubble must rebind by their original local contact/source-cell mapping. A remote cold contact stays cold; an activated contact selects the matching original native patch set. Do not use a nearest surviving patch to repair a lost original parent. Query caches include ownership state and release stale whole-part geometry.

**Support ports and canonical birth classification are unresolved implementation work.** One node per region would weld disconnected pieces: 2 m needs 304 pristine component nodes across 232 nonempty regions. Preserve exact original cross edges and their direction, with no new anchor. Contraction preserves the saved pristine graph's single component, but that alone proves neither damage behavior nor all external contacts. Only saved contact 3555 is available; its 72 active directed edges touch four roof regions in both groupings. All 536 declared parent relationships require original local endpoint/witness coverage.

Reuse the existing support predicates and original argument order. Own a continuity pair in the region of the original `a` selected by `a.id < b.id`; retain both directed emissions. Candidate halos use the existing one-metre memberships and canonical insertion order, including native y strata. Local invalidation must not rebuild the whole active owner for every small birth. Original emission ordinals may be reviewed topology metadata for exact stream reconstruction; no geometry snapshot or runtime topology format is installed here. Bind ports and parent selections before damage, never to the nearest survivor. Cold unsupported components request their exact region and may legitimately cause a wider cascade. Preserve original `initiallySupported`, exception and live-filter semantics; a late region cannot gain fresh support immunity. No rejected contact/direct-live algorithm is adopted.

Section residency stays separate from physical ownership. Existing native patch presentation reads original source/fragment state, preserving geometry, paint and UVs; a partial burn cannot hide the whole roof or restore holes on reload. Source followers need mixed local cold/native parents with fixed original cell bindings. Falling debris retains origin owner/region for stock while its current position drives queries/heat; keep native fuel, char, velocity, inert behavior and the one world/wind/FX clock. Reset/disposal clears claims, masks, ports, caches, probe coverage and pending work under the current visit generation, then a new world may restore Q. General vegetation/pane schemas are outside this static-roof pilot.

Compact immutable identities are complementary, not a reason to ship the full-snapshot format. The actual reference JSON was 24,151,806 bytes; identity construction was observed at 192.503 ms versus original continuity 102.399 ms, and active-contact identity at 179.042 ms versus calculation 2.984 ms. These are sequential observations, not speed ratios. Compact authenticated admission could remove copying but would not bound whole-source native birth. Public mutable records/resolvers prevent ID-only trust: source/grid/compiler admission and audited native ownership/writers need proof. No cheap stamp, codec adapter, cap increase or provider enablement is proposed for this step.

Authorize implementation only as one disabled, opt-in static-roof pilot with these acceptance gates:

1. Full activation in forward, reverse and scattered region order reproduces all original IDs, triangles/solid triangles, normals, bounds/closed semantics, fuel IDs/amounts/profiles, cell union and stock/error roll-up. Require the roof's 4,132 fragments and exact 33,558 ordered edges; with the same deck part, compare the saved 4,136-fragment/9,520-cell reference.
2. At the 2 m maximum witness, exactly 2,486 roof fragments become native and 1,646 remain cold. Prove actual compiler iteration is restricted rather than filtering a whole-source result. Certify empty/sliver/closed-volume descriptors and test distant/seam/opposite-side requests; no route whitelist or reduced radius.
3. Match all original external relations, anchors, canonical birth exceptions and supported/unsupported outcomes. Test two-component regions, the four-region contact, cross-boundary parent loss and cold cascades without new anchors or surviving-parent remaps.
4. Differentially test shared heat/sight/collision/support at region faces, corners, EPS bands, cold closed interiors, native interiors and retired holes. Verify actor/oil/rubble/follower bindings, native fall/debris, section reload and reset without fuel duplication or a second clock.
5. Reject stale source/grid/compiler, overlapping or duplicate claims, bad local quantity/error proofs, unsupported mixed-query semantics and failed staging atomically. Disposal cancels late work. Other maps/carriers retain their approved behavior and existing checks.

These are future gates. Current evidence verifies only saved grouping, exhaustive/inverse frontier counts, original ID/edge coverage, pristine component contraction and source/archive integrity. The stock certificates, mixed closed queries and birth-support classification are not solved or validated by grouping. The snapshot provider stays disabled, its six later stages stay unrun, and the 2,599.9 ms held-fire finding remains open. No new native/world/trial, source dataset/export, runtime change, timing experiment, renderer or build occurred. [Evidence and reproduction](bounded-source-regions-v1/README.md) retain exact pins and all prior receipts.
