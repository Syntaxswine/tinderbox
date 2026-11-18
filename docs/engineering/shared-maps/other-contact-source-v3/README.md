# Closed-flag-only source contact delta

This separate delta follows [the architect's instruction](authority.md) and references the unchanged `aeb6e169` v2 packet. It rechecks only the **419 previously component-blocked regions**, beginning with the original baluster representative. The **1,019 prior positives** and **144 other failures** are not scheduled for calculation. The old `6f5d8981` / `aeb6e169` packets, receipts and failed gates remain historical records.

## Checked result

All **419 cases met the exact condition and produced source contact proposals**: 80 porch/neck-frame cases and 339 railing-cap cases. The original baluster passed first, then the remaining 418 were processed. The combined inventory is **1,438 positives / 144 unproved / zero unattempted**. The preserved failures are the original 140 empty selector intersections and four ambiguous point-membership cases.

The original representative is region `5b1da7c755e4d73f34574c7e`, including source part **2352**, `clerestory/front-rail/baluster-0`. Its [actual calculation](pages/page-000.json) and [saved-proof verification](checks/page-000.json) select original parent/child primitives **[16, 6]** at emitted-world point **[42.35027960488854, 22.26000015437603, 34.11713533817962]**. The point is proved by the existing witness/facet method, unique original primitive membership, actual endpoint/selector facet coverage and three unchanged contact predicates. The material diagnosis alone was not used as contact proof.

Raw part 2352 has 200 retained original slots, 180 positive material faces and the same 20 nonmaterial original ordinals in both frames. Its raw component records `closed:false`; its emitted-world component records `closed:true`. Both full positive component partitions and nonmaterial ordinals match exactly. The [architect's diagnostic](provenance/baluster-frame-topology-diagnostic.json) and [original diagnostic source](provenance/baluster-frame-topology-diagnostic.mjs.txt) are preserved read-only; neither was rerun.

## Exact scope of the admission

A previously blocked source instance may pass this delta's gate only when:

1. Raw and emitted-world positive component IDs and complete primitive partitions match exactly.
2. Nonmaterial original primitive ordinals match exactly.
3. Removing only each component's `closed` flag makes the complete component records identical, and at least one closed flag differs.
4. The instance was explicitly blocked by the old raw/world-classification gate.

Actual emitted-world components then supply surface membership. Both frames and flags are recorded in shared frame dictionaries, with raw nonmaterial face hashes and full raw/world geometry hashes. **No volume, bearing capacity, closed solid, anchor or live support claim follows from these flags or contacts.** No flag is forced, geometry snapped/repaired, tolerance widened or fill invented. A partition/nonmaterial mismatch remains unproved without contact search.

The witness/facet candidate, contact and negative-check function block is byte-identical to the v2 source method. Existing witnesses or actual original-facet intersections supply candidates inside the original bounds; there is no new solver or fallback. Original primitive IDs and separate range-local IDs remain distinct. Canonical division-order normals are exported as metadata; the original reciprocal-multiplication source-predicate normals are retained alongside them, with no predicate change.

The [delta](contacts-delta.json) references the exact entire base proposal by commit/path/raw hash, and each old region by pointer/canonical hash. Original kinds, directions, recipes, source ranges, matrices, global IDs, historical null/false fields and quantities remain in that immutable base. The exported overlay changes only the status/proof of these 419 cases. It does not install or accept gameplay.

## Checks and finite execution

Three calculation pages and three verification pages processed **[1, 256, 162]** regions. Verification rechecks saved positives without candidate searches. The six source children exited successfully; the foreground coordinator completed in **7.328 seconds**, within its 540-second working deadline / 600-second maximum. Each hidden child is bounded to 60 seconds, with a 55-second internal source deadline and <=256 regions.

There are **1,257 positive contact-predicate checks** and **2,512 applicable negatives** (838 wrong primitives, 836 outside-selector vertices and 838 historical witnesses). All 415 formerly blocked instances satisfy the exact closed-flag-only condition; 502 endpoint instances and 12 original source buffers were needed. Twenty-four shared topology/frame dictionaries export no vertex/index arrays.

[Source pins](input-pins.json), [method provenance](provenance.json), [aggregate results](checks-summary.json), [metadata audit](audit.json) and [batch record](batch.json) identify exact inputs and limits. The exception-safe owned-handle runner is copied byte-for-byte from the prior UI packet, ultimately artist `b93dcee2`; no lifecycle framework or unrelated artist work is imported. Unexpected failures stop and preserve their evidence; no source page was retried. No process or port is retained.

The original one-shot command is `python -B docs/engineering/shared-maps/other-contact-source-v3/run.py batch`; it refuses an existing attempt. To hydrate the immutable cache and audit saved proofs without source calculation:

```powershell
python -B docs/engineering/shared-maps/other-contact-source-v3/check.py --hydrate
```

See [schema.md](schema.md) and [schema.json](schema.json). There are **zero actual native/compiler calls, runtime source decoders/blueprints, live world/graph, rendering/build/Pages or whole-map diagnostic runs**. The native contact closure is a pinned source predicate, not an actual-native/compiler invocation. Consumer mapping and architect promotion remain separate.
