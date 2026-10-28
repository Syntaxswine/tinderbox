# Milestone 03: shared bear protagonist

Status: implementation candidate checkpointed; offline checks pass, browser acceptance and promotion pending. The user authorizes replacing the provisional protagonist with the existing bear reported through Nautilus Engine. [The architect's review](../reviews/2026-10-28-shared-bear-protagonist.md) records the exact candidate, completed checks and restart checkpoint. Promotion requires the architect's combined review.

## Bounded change

Replace Tinderbox's procedural bear body with the genuine painted, reduced bear and native rig. Preserve the existing exposition scene, five tools, three drug effects, input semantics, authoritative simulation and UI. Use normal worker paint initially. Keep the source's authored model proportions and document the body envelope; do not resize it to fit a doorway or another species.

Nautilus's inspected editor record `4c21f7c97fb9400c60ef9ec753cf1ff99ef3cb96` still marks this bear as incoming and absent from its current pinned snapshot. Actual model/paint/animation assets are in the shared AFT source. Record the exact reviewed original-source commit and dependency closure instead of claiming a completed Nautilus intake. This assignment changes Tinderbox only.

The architect approved candidate intake from `Syntaxswine/animal-factory-tactics-3d` commit `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`, containing the complete bear animation integration. Its original delivery records a 27,298-triangle author sculpt reduced to a 10,050-triangle body, native normal paint and a 17-bone rig. That source approval permits implementing the candidate; it does not waive imported-byte, attachment, bounds or combined visual checks.

The root integration base is reviewed `master` `8a8405681614662a92f9b98fb9b9600bd06d3ad1`. Existing worker branches contain later, separately requested housing, editor, scale and fire work. Preserve those branches and omit their unrelated changes from this candidate.

## Ownership

| Task | Owner | Delivery |
| --- | --- | --- |
| TB-012 | Existing coder | Source audit and exact pin; minimal immutable imports and provenance; native rig/paint/loading/animation adapter; existing tool anchors and equipment fitting; meaningful identity, bounds, input/timing and lifecycle checks |
| TB-013 | Architect | Review source and integration, independently verify imported bytes, inspect the actual character and all five tools, run combined/package checks, approve and publish only the reviewed change |

The artist is already working on a user-requested roof correction. Do not interrupt or absorb that work for this swap. Any later artist fitting correction should be explicitly assigned after inspecting this candidate.

## Runtime and acceptance contract

- Preserve one shared Three implementation and the borrowed renderer. Keep raw donor files distinct from Tinderbox adapters and record every transformed import or fitted attachment.
- The bear view consumes the existing detached v1 player snapshot. Player travel, heading, tool selection, stock, pouring, pause and drug clocks remain model-owned. Locomotion follows accepted player distance; powder changes its cadence through actual travel, while NPCs and fire remain on world time.
- Retain the view's `root`, `anchors`, `update`, `setHeldVisible`, `dispose` and diagnostics/counts responsibilities. Grip, support, muzzle, spout and backpack anchors must remain finite and update with the evaluated pose before fire/projectile/pour detail reads them.
- Fit all five existing tool presentations to reachable native hand contacts. No default rifle or unrelated equipment may appear during idle, movement, selection, pause or rebuild. Tool range, fuel, fire clipping and ignition continue to come from the existing authoritative model, including near-wall nozzle suppression.
- Measure the rendered body over walking/held poses and headings. Compare that envelope to the current 0.56 m collision radius and 1.4 by 2.3 m gate. Document any necessary shared-physics correction; do not quietly scale the mesh or change passage geometry.
- Fail clearly on missing model/paint or incompatible shared renderer. Do not fall back to the old procedural bear while reporting the shared model loaded.
- Verify source hashes and closure, original species/paint, immutable snapshots, stable pause/fixed-clock poses, player/world timing, skin/gear visibility, full disposal and repeated scene rebuilds.
- Inspect idle/walking/turning/pouring/held fire and all five tools in the actual game at desktop and phone viewports. Record what was visibly checked and any renderer limitation; offline evidence does not establish browser WebGL acceptance.
- Run the relevant repository checks, production build and nested-path packaged smoke. Publish after approval under the user's default Git delivery rules, verify deployment and hosted hashes, and retire registered disposable helpers with restart records and port receipts.
