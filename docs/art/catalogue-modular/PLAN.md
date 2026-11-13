# Catalogue Street module connection plan

Measured from exact common base `e07487fe3299531f9205b43fc39afd3c9106e2ee` on `codex/catalogue-modular-art`. The frozen small-scene artist pin remains `864713b135fee8331c70727927dd731fff0366e9`. This plan attaches components to the existing 51 × 47 m host, not a new map. [Exact measurements and source IDs](../../../art/source/catalogue-modular/attachment-plan.json), [reproduction script](../../../art/source/catalogue-modular/measure-fit.mjs), [plan diagram](fit.svg).

## Placement and native registration

| Component | Correct host placement | Walking levels | Fit |
| --- | --- | --- | --- |
| Bell & Alder | Closing-local + `[36,0,9]`, no rotation | 0 / 2.12 m | Main lot X36..44 / Z9..17. All exterior source decoration and access bounds must be considered separately. |
| Existing `hopkins-fifteen` | Native house + `[24,0,13]`, half-turn | .48 / 2.60 m | Visual bounds X13.695..24.305 / Z2.75..16.32. Main body/roof aligns to the existing house; native furnished access geometry differs as noted below. |

Host ground x/y becomes world X/Z. World Y remains the authored elevation. The host renderer uses Three Y angle `-quarterTurns*PI/2`; the component compiler uses `+quarterTurns*PI/2`. Convert with `(4-hostQuarterTurns)%4`; the present shop0/house2 are unchanged. Do not transfer the isolated house placement `[-5,0,8]`, translate published source-location metadata a second time, or rescale bodies, walls, floors or UVs.

The furnished house entry centre is X18.99625, versus the old coarse stair centre X18.5: a **.49625 m lateral change** already present in the reviewed furnished variant. Its steps extend **.6438253 m farther toward the street** than the old visible asset, ending at Z16.32, still **2.68 m short of the road** at Z19. Entry approach is `[18.99625,0,16.8]`; native front handle is approximately `[18.99625,1.38,13.15]`. The whole house placement stays unchanged. This access adaptation must be labelled; do not describe it as merely adding furniture to byte-identical old exterior geometry.

The house entry clear width remains approximately 1.015 m. Goat/horse cylinder routes passed in the frozen exemplar; bear/civilian approach rails remain blocked. New host routes and full posed/equipment clearance are unverified.

## Shop omissions and stair connection

Omit the four `pavement/{west,east,rear,front}` records, all eighteen `opposite/*` wall records and all five `street-lamp/*` records from source meshes, canonical surfaces, render geometry, collision/fuel/support intake and light metadata. The exact 27 IDs are enumerated in the JSON. Drop `street-lamp:light`, including its three removed fixture refs. The physical reference scan found **zero retained surface/item/part/opening references to those 27 removed IDs**. Recompose scene bounds, exterior anchors and old replay metadata; those were stage-specific.

This leaves 516 canonical shop surfaces and 633 source meshes, preserving the actual shop/lodging/fittings. Keep the real source sign/cornices and front fair ribbons unless later host review finds a specific conflict. The standalone `yard-data.json` is not imported: its paving, crate and fence placements were fixture scenery.

At the correct shop translation the existing south-facing flight is X45..47 / Z13..19. Its two foot-deck slabs (`stair/base/9,10`, `stair/base/10,10`) occupy X45..47 / Z19..20, overlapping **2 m² of road**. Stringers extend another .0333 m and rail trim .0075 m beyond the road edge. Simply shifting the full fixture would therefore alter the street.

**Recommended recomposition:** rotate the same 42 `stair/*` source components by 180° about local `[10,0,3]` (world `[46,0,12]`). Keep the six upper landing slabs and four landing posts in place. The native flight becomes X45..47 / Z5..11; its own two foot-deck slabs move to Z4..5. No registered source mesh then overlaps road Z19..24. The full retained module visual bounds are X35.92..47 / Z4..18.0409441, Y-.24..4.30. This uses the same twelve rises, 6 m run, 2 m width, 1.90 m inner rail clearance and 2.12 m rise.

The new upper bearing is the real north landing pair `landing/9,2` and `landing/10,2`, replacing the old south pair `landing/9,3` and `landing/10,3`. Lower refs remain the rotated two foot-deck source IDs. Rotate canonical/render geometry, normals, matrices and bounds together, retain native UVs, and recompute moved attachment/contact/support references from actual joins. Native-ID coordinate text is provenance, not a substitute for measured world bounds.

Proposed host connection points are foot `[46,0,4.5]`, upper landing `[46,2.12,11.75]`, service outside `[44.9,2.12,12]`. Approach around the east at X48.5; the narrow strip between shop and flight is not the intended passage. These are measured route candidates, not passed navigation. Keeping the original south flight would instead require an explicit connection to real host-road support and removal/recomposition of the overlapping wooden foot deck; no hidden ground or dangling lower landing is acceptable.

## Replace owners once; preserve the host

The upgrade must replace the old `hopkins-fifteen` visual model, per-house coarse burnout and the three solid envelopes `hopkins-fifteen:{foundation,porch,stairs}`. Do not leave a 4.6 m solid foundation block inside a detailed walkable model. The seven other house instances and existing Monroe joins at X34/X41 remain registered in their original placements and blank joining skins.

For the shop replace its 21 old wall owners, 19 obstacle owners and 25 prop owners with their registered detailed counterparts. Exact IDs are in `hostReplacement`. Replace the shop-owned 8 × 8 m wood floor patch at `(36,9)` once, including fuel/visual ownership, rather than retaining another floor/fuel layer underneath. Keep `bell-and-alder:entry` and the existing single `bell-and-alder:hand-lantern` logically bound to the new geometry.

Preserve the full host street, grass bands, barrels, pickups, existing actor routes, player/inventory/tools/UI and their clock. Art renders structures, installed lights and the one authoritative portable lantern; it creates no extra player, officer, resident, ground or old tiny-scene bootstrap. Ground walk elevation stays0; after omitting fixture pavement, the real host terrain must supply support. Visual bounds, occupied cells and obstruction remain separate, especially under porches/overhangs.

## Coder boundary and next checks

The proposed two owned exports are `workbenches/catalogue-modular/{scene-data.json,shop-data.json,house-data.json,art.js}` with native source data prepared before qualification and one world placement. Final field names follow the documented coder API. Component-owned bounds, omitted/recomposed IDs, frame ownership, actual native poses/lantern state and independent stair flights must be explicit.

Root now requires one reused `createTrial` domain including host terrain, other houses and props. The structural renderer is data-driven beyond its prefab guard; accepting coder-registered native exterior views is feasible without building another art family. Those views must include valid canonical/render bindings, actual levels, independent placement and source join/party-wall geometry. Do not infer a Monroe join from a nearby AABB. The inherited six-light pool per source would multiply to nine pools for eight houses plus shop, so aggregate light ownership/counts need an explicit policy and measurement rather than a claimed old single-house cap. This is a rendering boundary, not an additional thermal simulation.

Before final export: reconcile source/schema ownership; recheck the recomposed stair contacts; verify host replacement removes both old model and collider/fuel ownership; run native continuous street–shop–stair and street–house checks on the actual host. Deliver a labelled host overview JPG and a normal-game-zoom attachment/route JPG from the running existing map. No helper, new building family, long fire capture, promotion or Pages publication is started by this measured plan.
