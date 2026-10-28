# Milestone 04: catalogue neighborhood

Status: implementation checkpointed; 81 automated tests and the architect's source, geometry, behavior and package checks pass. [Browser acceptance and promotion remain pending](../reviews/2026-10-28-catalogue-neighborhood.md). The user reports the artist's new assets are ready to use. This candidate builds one small playable exterior street from the existing houses, on top of the shared-bear checkpoint. The architect owns combined review and promotion.

## Frozen inputs and ownership

- Integration base: `b2942f98ed177faa7f319156d7bbdd24e35c5162`, including the shared painted bear candidate. Its offline acceptance is complete; its browser visual gate remains pending.
- Artist intake pin: `14d18d7de667c7b83955150313347e198869f5ee` on `codex/art-assets`. It includes the approved No. 15 gambrel correction and the 25-house siding review. The artist is actively importing corrected Nautilus windows for Nos. 13 and 15. Leave that work alone; a later committed update needs explicit intake review.
- Select three existing designs: Hopkins Book 4 No. 12 (`hopkins-4-12`), Hopkins No. 15 (`hopkins-4-15`) and Gross Ashland worker cottage (`ashland-worker`). Use the artist's real exterior assemblies, materials and source records. Preserve their catalogue identities.
- TB-014: existing coder in the existing coding checkout, new `codex/catalogue-neighborhood-coder` branch from the integration base. Preserve both earlier coding branches.
- TB-015: architect on `codex/catalogue-neighborhood`, owning this brief, source/scope reconciliation, independent review, combined browser checks and promotion. The existing artist continues its current task. No additional worker chat or worktree is needed.

This is a fictional street assembled from period catalogue designs, not a reconstruction of a surveyed part of the 1893 exposition grounds. No new historical research or raster art is needed for this slice.

## Native art intake

Inspect the exact committed dependency closure first. Copy only the selected housing assemblers, necessary catalogue data, six shared housing textures and source/provenance records. Full catalogue JSON may remain intact to preserve source identity; load/render only the three selected houses. Do not bring every facade variant, preview, editor, character reskin or unrelated artist/runtime change into the public game.

The housing modules need `src/content/asset-scale.js` and its original pinned Farmyard `hybrid-geometry.js` templates. Record that one new raw dependency deliberately, preserving the existing Farmyard source commit and license chain. A separate minimal native-unit helper intake is sufficient; do not silently replace the old exposition compiler or merge the vertical-fire branch. Keep old reviewed scenarios available as regression fixtures.

Preserve the native one-metre tile, 1 by 2 by .16 m wall unit, 1 by 1.65 by .12 m door, .12 m slab and 2.12 m floor pitch. Preserve mesh/rig origins, UVs, physical texture density and `[1,1,1]` scales. Repeat modules and place houses with rigid translation/quarter-turns. Do not stretch the buildings or shrink the bear. Narrow native doors remain closed and nontraversable in this exterior-only scene.

Record exact original paths, commit, bytes, hashes, generated-art provenance, dependencies and adaptations. Keep import evidence separate from consumer adapters. No moving checkout or local donor path may be required at runtime. Keep the single existing Three implementation and borrowed renderer.

## Playable street contract

Add a `neighborhood` scenario and use it as the production opening scene. Arrange three houses, a readable street/sidewalk, usable gaps and original normal horse/goat civilians. Reuse the existing controls, tools, drug effects, gas trail, barrels and fire presentation. Keep the bear at native scale. Frame the street so the actual bear, held tool and fresh trail remain readable at desktop and phone sizes; a bounded scenario-specific camera/follow option is allowed if a whole-map overview would make them too small. Retain camera-relative input and aiming behavior.

Add detached, validated building-instance descriptors to the existing snapshot rather than letting the view choose gameplay positions. Derive ground collision/heat footprints from the selected original plan/structural foundation and porch/steps where they block ground movement. Respect wall thickness and true quarter-turn placement. Roof overhangs and elevated ornament do not become filled ground obstacles. The bearer cannot enter the filled house mass through a painted window or narrow door. Render the actual prefab once, without a second generic box occupying the same position.

The selected houses use the user's dry-wood gameplay direction. Retain the existing finite ground heat/fuel model; do not invent a second spread solver. Treat each new prefab as one coarse building group for burnout: derive its state from its ground fuel footprint, keep its collider group until the group is spent, then remove the group and visible prefab together. A derived char tint may show consumed surface fuel. No independently disappearing collider may leave an intact-looking house or an invisible blocking mass. Document this footprint approximation; wall climb, room-by-room destruction and collapse physics are outside this slice.

Loading, reset, pause, powder, inversion, stock, projectiles and pouring remain authoritative. Pouring follows accepted movement, locomotion follows accepted distance, and environmental fire/civilians follow world time. Do not add a catalogue browser, interiors traversal, new inventory, new UI flow or asset-placement editor.

## Acceptance and handoff

Verify source hashes and closure, one renderer, actual selected house identities, native dimensions and unchanged source data. Test placement/quarter-turns, footprint-to-visible foundation agreement, bear clearance, obstruction, accepted-distance gas along the street, powder clocks, group burnout/removal agreement, pause/reset and idempotent disposal. Keep all existing meaningful regressions passing; update assertions only for explicitly changed production defaults.

Provide an explicit browser review page/control using the actual model, production art and UI. Review all three houses and the native bear at 1280 by 800 and 390 by 844, including walking near foundations/porches, all five tools, powder pouring, held fire, pause, camera aim, burnout and repeated scene rebuilds. Offline mesh or renderer-API fixtures are useful evidence but do not establish GPU appearance or browser acceptance.

Run the repository checks, production build, nested-path package smoke and hash verification. Report exact commit, changed paths, source evidence, checks, visual evidence and remaining limits. Commit/push the task branch after passing available checks. Only the architect promotes to `master` and publishes after the combined gate. Register/retire any task-owned preview under the user's helper policy; leave no disposable helper running at handoff.
