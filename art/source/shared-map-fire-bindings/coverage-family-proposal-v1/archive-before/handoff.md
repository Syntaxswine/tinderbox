# New York family support proposal, version 1

Status: **unaccepted, unapplied source-only review**, 17 November 2026.
Artist branch `codex/shared-map-fire-bindings`, HEAD
`88538bb687e06911d63f728a17bd8668448805fe`. The review remains uncommitted:
this assignment is analysis/proposal work, not an implemented asset change.

The proposal batches New York frame, rail, cornice, post and paving families
against original physical geometry. Original geometry, bindings, roles, hinges,
material quantities, ground anchors and runtime remain unchanged. The base-plus-ten
engineering pilot and separately approved front 48-block kit retain their own gates.

## Exact inputs and evidence

Frozen coder checkpoint: `2b350309d9116812a1d3988af090614bdaefbc25`.
Its v3 graph is a proposed dependency interpretation, not a declaration of
1,038 art defects.

| Input | SHA-256 |
| --- | --- |
| Diagnostic v3 at coder checkpoint | `83ac99b3895cfa2df23810d518b4669dee975c763123e597bec393b00243120c` |
| Compact New York index at coder checkpoint | `e9bee63a5a4afb0f8513d083b7e5f1ce83f25c0441ea543e14901b70e4e0cdab` |
| Original complete physical bindings | `407c0f8bd582f8d95b9ade1471cd51892ac7b9a40fd2c005696bcc5485991eba` |
| Ten-control override | `f3f28fda72742c6bc04d32f70331ab96e036662f953153952297fae9ce3bc915` |
| Separate approved front 48-block manifest | `a5a34f18a4d18b5a316096edf58b941e727a7546e544636a5a29469bc5c5b1c2` |

The [proposal index](../../../art/source/shared-map-fire-bindings/coverage-family-proposal-v1/proposal-index.json)
records exact paths and producer hashes. The
[relationship table](../../../art/source/shared-map-fire-bindings/coverage-family-proposal-v1/relationships.json),
SHA-256 `34b25f91d457fb65e611b89f182c0e05bb946d7506a0581b53e945a2d9731e06`,
has one canonical pair per row with separate measured local regions.
[Geometry bindings](../../../art/source/shared-map-fire-bindings/coverage-family-proposal-v1/geometry-bindings.json)
retain original mesh paths, hashes, source ranges and world transforms.
The [review package](../../../art/source/shared-map-fire-bindings/coverage-family-proposal-v1/review-package.json)
lists hashes for every review file.

## Family proposal

There are 3,241 new directed dependencies and 35 local normalizations of existing
pairs proposed: **3,276 pairs / 6,018 local regions**. None is accepted or applied.

| Family | Pairs | Regions | Intended dependency |
| --- | ---: | ---: | --- |
| Cornices, full native column coverage | 1,694 | 4,436 | Actual local wall, deck, base, column or existing cornice/eave holds trim. |
| Fixed window frames | 649 | 649 | Actual wall/seam holds jamb; existing sash/glass relationships remain. |
| Fixed portal frames | 26 | 26 | Footer holds fixed jamb; fixed jambs hold header. |
| Dentils | 202 | 202 | Own actually intersecting cornice holds each tooth. |
| Railing caps | 479 | 479 | Actual balusters/piers hold their cap; explicit carpentry at real butt faces. |
| Railing piers | 84 | 84 | Own base holds pier at actual overlap. |
| Rail tops/handrails | 34 | 34 | Own actual posts hold rail. |
| Porch rail/neck frames | 92 | 92 | Own balusters, neck pieces or actual wall holds trim. |
| Named original paving seams | 16 | 16 | Actual closure contacts its named porch assembly. |

Certificates distinguish 5,590 actual strict closed-solid overlaps, 268 horizontal
bearing regions, 144 explicit carpentry contact regions and 16 native closure
seams. An AABB is a finite selector/broadphase aid, never a substitute solid.

Proposed interpretation retirements preserve physical contact evidence:

- [Eight additional moving-leaf header interpretations](../../../art/source/shared-map-fire-bindings/coverage-family-proposal-v1/retired-moving-frame-interpretations.json).
  The first two front-door retirements remain in the ten-control pilot and are
  not duplicated. Fixed headers do not depend on moving leaves. Native jamb/leaf
  hinges and leaf/hardware relationships remain.
- [216 dependent bracing interpretations](../../../art/source/shared-map-fire-bindings/coverage-family-proposal-v1/retired-dependent-bracing-interpretations.json):
  206 dentil-to-cornice and ten clerestory upper-railing-to-cornice interpretations.
  Teeth and the railing above do not brace their host cornice. Correct family
  directions are separately listed; original shapes, overlaps and raw records remain.

Eight inherited tower cap-eave-to-trim dependencies are locally normalized:
their assembly differs from an upper railing bracing its own cornice. No global
reversal of dependent links or promotion to a structural role is proposed.

## Long cornices and normalization

[Full cornice coverage](../../../art/source/shared-map-fire-bindings/coverage-family-proposal-v1/cornice-coverage.json)
audits **all 109 original pieces**, including rooted long pieces, mitred ends
and existing opening cuts. Of 3,844 full-height 1 m XZ columns, 3,302 have actual
local hosts, 222 rely on native material continuity/cantilevering, and 320 have no
positive source boundary projection. Actual triangles demonstrate those empty
columns; outer carrier bounds do not fill them.

The 222 continuity-only columns receive no invented bearing. Whether surviving
damaged material carries adjacent regions remains the shared solver's job.
There is no forced metre break or whole-cornice rigidity rule.

**Coder normalization requirement:** consume every local region for a canonical
pair and connect only corresponding actual surviving source patches. At the
frozen checkpoint, `src/simulation/source-support.js:30` selects the first
attachment per parent; line 70 cross-pairs all selected parent/child pieces for
non-coplanar region relations. Appending this table to that path would not
implement the proposal. No coder file has been edited.

Fresh unchanged-kernel checks find 2,646 source-facet contacts. Another 630 pairs
have actual strict closed-solid overlap without crossing boundary facets;
independent winding/distance checks verify common interior. These are not labelled
facet intersections or discarded because a surface-only query returns false.

## All diagnostic IDs and separate true gaps

The current source interpretation has 12,446 carriers, 231 original anchors,
11,408 rooted carriers and 1,038 unrooted carriers. The
[per-ID dispositions](../../../art/source/shared-map-fire-bindings/coverage-family-proposal-v1/original-diagnostic-dispositions.json)
account for every flagged ID:

- 692 become reachable under the proposed family records.
- Another 111 become reachable only after also projecting the separate approved front 48.
- 235 remain: eleven separated parapet bases, 214 dependent railing pieces and
  ten urns whose existing bearing chains await upstream support.

These are hypothetical cold source-reachability results. Runtime stability,
active fire, cold/active stock accounting and visual acceptance remain separate.
The new gap designs are excluded from both projections.

The [separate gap design](../../../art/source/shared-map-fire-bindings/coverage-family-proposal-v1/separate-parapet-gap-design.json)
measures bases `carrier/main-parapet-1/base` through
`carrier/main-parapet-11/base` against their actual `edge-N/cornice-7` tops.
The vertical gaps are positive, about 0.21 m. They are not contacts, implicit
mounts or permission to move existing geometry.

One compact support per original 1 m bay is proposed separately. Of 116 tentative
positions, **96 are clear rectangular repeats** of the approved front profile.
**Twenty intersect the existing rear-tail roof** at parapets 5, 6 and 7 and need
separately authored roof-saddle profiles trimmed to the recorded actual upward
roof facets. Each facet range leaves positive pad height; no saddle mesh, stock
or join has been exported or approved.

If separately approved/exported, the 96 clear repeats would account for 4.3008
prototype frame-fuel units. Saddle stock requires actual accepted closed geometry;
5.1968 is only the untrimmed 116-block upper estimate. No quantity is assigned.
The approved front 48 are excluded from all 116 positions.

## Checks and handoff

Passed focused commands, from the assigned art checkout:

```text
python art/source/shared-map-fire-bindings/coverage-family-proposal-v1/propose.py --check
python art/source/shared-map-fire-bindings/coverage-family-proposal-v1/gap-design.py --check
node art/source/shared-map-fire-bindings/coverage-family-proposal-v1/check-native-contacts.mjs --record
python art/source/shared-map-fire-bindings/coverage-family-proposal-v1/check.py --record
```

Both generators reproduce outputs byte for byte.
[Check results](../../../art/source/shared-map-fire-bindings/coverage-family-proposal-v1/check-results.json)
include 14,566 independent source-solid winding memberships, geometry/matrix/hash
checks, all 109 cornices, 3,844 columns and 1,038 dispositions, unchanged native
facet queries, ten accepted pattern controls and three physical negative controls
for real gaps and a remote bay selector.
[Review attempts](../../../art/source/shared-map-fire-bindings/coverage-family-proposal-v1/review-attempts.json)
preserve the initial scope failure and its explicit dependency correction.

No renderer, browser, JPG export, server, watcher or retained helper was started.
No runtime or broad unchanged source suite was run. Visual review follows
separately approved authoring. Review these exact families and the separate gap
design before implementation; the limited preview retains its own scope.

Administration/Horticulture material proposals remain a later source-only
follow-up using accepted UI inventory
`4498db77a606f87413765b26b34811ef360a4776`. No New York material assignment is
silently transferred to those maps.
