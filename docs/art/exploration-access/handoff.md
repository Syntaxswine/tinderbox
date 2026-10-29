# TB-026 access handoff

The candidate supplies additive doors, stairs, landings, guards, exact source-floor cut polygons and an explicit source-part replacement list. It uses the architect's frozen base `c4287338ff93907900a94a86b6c7e3bed0ae7c2f` and contract at `d281ce91af27b32ffab4dc17390cf986f11ef881`. Only `assets/art/exploration-access/`, `art/source/exploration-access/`, `docs/art/exploration-access/` and `workbenches/art/check-exploration-access.mjs` belong to this delivery.

## Apply all three layers

1. Load the original factory from its recorded source pin. Preserve its source files and recipe. Resolve original component IDs inside `InstancedMesh.userData.parts` as well as ordinary meshes; merged boundary floors have their own `parts` ranges.
2. Hide **only** the exact `hiddenSourceParts[].id` for its recorded `source`. `replacementId` identifies the corresponding surface supplied by the access factory; `hide` records have no replacement. Each record includes the evaluated source-geometry digest and reasons. IDs are unposed source-local IDs, not display names. Horticulture's companion terrace uses source `horticulture-terrace` and IDs beginning `terrace/`.
3. Subtract every `floorOpenings[].polygon` from its exact `sourceFloorId` at the stated native level. Multiple polygons form a union. Preserve the .12 m thickness and all other levels. `filledBy` identifies access landings/base plates that replace part of that floor area. Horticulture's two pavilion stair holes are retained exact source openings; they are included descriptively.
4. Add `createAccessGeometry` in the same unposed coordinate system. Use the same visit transform for source and access together. This factory includes retained source fragments, so do not add a second copy of those fragments yourself.
5. Derive navigation, support, headroom and interaction from the combined geometry/data. Opening/closing a leaf changes art only. Keep actor and door state authoritative in the runtime. The offline `derived-review.mjs` demonstrates the composition order, but is an authoring fixture and is excluded from the game package.

Raw source directories remain byte-identical. Source floors are not silently edited in place. Partial replacements preserve the source surface position, normal, UV and metre-UV values by interpolation; they are explicitly derived cut surfaces, not unmodified native boxes or closed physics solids. New trim covers doorway cut faces. Collision solids and floor-boundary capping belong to the derived visit compiler. Existing complete native parts are retained whenever they do not intersect a cut; exposed faces on exact cut boundaries are preserved.

## API and coordinates

```js
// Lightweight navigation data can be loaded without the geometry payload.
import {getAccessPlan} from './assets/art/exploration-access/plans.js';
import {createAccessGeometry} from './assets/art/exploration-access/index.js';
const plan = getAccessPlan('administration');
const art = createAccessGeometry(THREE, {
  placeId: 'administration',
  sectionBounds: {min: [-19, 2, 21], max: [-11, 20, 29]},
  materials: {}, textures: {}
});
scene.add(art.root);
art.setPortalState('admin-front', true);
// Remove the section later through art.dispose().
```

`getAccessPlan` is also exported from `index.js`. It returns deeply frozen `{version,placeId,portals,stairs,floorOpenings,hiddenSourceParts,notes}` plus native/source information, landings, guards and supports. Coordinates are unposed source-local metres: X right, Y up, Z rear. Native levels are multiples of 2.12 m. No new engine or donor import is introduced.

`createAccessGeometry(THREE,{placeId,materials,textures,sectionBounds})` returns `{root,bounds,metadata,setPortalState,dispose}`. `sectionBounds` requires finite ordered min/max triples. It filters each recipe component **before** creating its Three geometry; a distant empty section creates no meshes. Static descriptive arrays are loaded with the module; section bounds control geometry allocation. Use `plans.js` alone for lightweight menu/navigation bootstrap. The helper does not construct a whole raw landmark and then hide it.

The returned local bounds include closed and fully open leaf poses. Metadata lists selected part/portal IDs and construction counts. A section may contain a whole small intersecting source fragment; the bounds parameter is a construction filter, not a hard visual clipping plane. The raw landmark provider still needs the coder's own nearby-part filtering and seam/hysteresis policy.

`setPortalState(id,boolean)` poses selected door leaves only. A valid but unloaded portal is a no-op so section state can be restored from an authoritative visit snapshot. Unknown IDs and nonboolean values fail. Permanent office passages have `stateful:false` and `defaultOpen:true`; they cannot be closed. Stateful portals begin closed.

Borrowed materials are cloned. Maps/textures and their transforms remain borrowed and unchanged. The factory owns generated geometry, material adapters and instance allocations; repeated `dispose()` calls are safe. Source fragments retain their recorded default source colours/material properties. For coordinated reskinning, provide the same source material slots to the access factory. Runtime source geometry never references an absolute donor/worktree path.

## Door and animal dimensions

Fourteen paired assemblies use 28 unchanged 1 x1.65 x.12 m native leaf bodies. Each has a separate 1 x1.15 x.12 m upper panel. The nominal opening is 2 m wide and 2.8 m high; the open .12 m leaf thickness leaves **1.88 m clear width**. Handles fold outside that envelope. Frames and source glass/header remnants do not cross the usable opening. Eleven Administration office connections are permanent 2 m-wide, 2.8 m-high passages.

The envelope record evaluates actual goat, horse and bear source body vertices at 100 neutral/walking samples per species, across four headings and 25 gait phases. Their original scales remain `[1,1,1]`. Maximum sampled heights are approximately 1.650, 1.650 and 1.671 m; radial body envelopes are approximately .438, .451 and .508 m. Checks conservatively use **.62 m radius and 2.3 m headroom**, exceeding all three measured bodies. This art measurement does not change the runtime character collision defaults, native rigs, painting or tool anchors.

New York/Administration source materials and original dimensions are preserved. The base is the frozen Horticulture candidate, not a silent intake of the later warm palette or Fisheries. Those commits remain separately available for deliberate integration.

## Connected routes

| Landmark | Access provided |
| --- | --- |
| New York | Existing broad front approach; two gentler 6 m side approaches; front/side L1 doors and new L4 porch doors; a 3 m-wide return stair connecting L1 to L4 through an exact upper-floor opening |
| Administration | Four retained broad ground approaches; four repaired entry screens; eleven widened office connections; four replacement pavilion spirals connecting L1/L3/L5/L7/L9; two supported exterior spirals and guarded bridges connecting L9 to L19 |
| Horticulture | Repaired main entry; four court passages; three retained L1-to-L3 flights; opened rotunda gallery guard at arrival; dry side approaches through terrace rail gaps; sloped end roofs retained with their incorrect opaque flat underside caps removed |

New York's return stair uses an L2 intermediate landing. It is a stair landing, not an additional occupied room/storey. The upper floor is L4 =8.48 m. The attic L7 is omitted from the route because its ordinary roof-deck underside gives only 2.00 m clear height, below the 2.3 m passage target. The original attic remains as an asset.

Administration's replacement spirals fit the source stair motif/envelope: inner radius 1.3 m, outer 3.4 m, .12 m treads, 24 rises per two native levels, followed by six flat landing sectors. Thirty 12-degree sectors form a turn. Rise remains .176667 m. New inner/outer rails leave a conservative 1.71 m walk width; the next turn is 4.24 m higher. Flat branch landings meet exact 3.6 m source-floor holes. Intersecting arch ornament/native wall fragments are trimmed only in the derivative to clear the bodies.

The two upper stairs stand at X=-33/+33, Z=40, outside the original colonnade. Native-level base plates, supports and guarded bridges connect the existing lower and upper galleries. Original colonnade piers/columns remain intact. Rest landings at intermediate native heights are not additional occupied storeys. `stairs[].path`, actual `treads`, `branches`, `landingIds` and `landingPolygons` describe the ascent and exits. Guards remain closed at intermediate upper-stair rest landings.

Horticulture's end-gallery pitched roofs originally included a flat bottom face at L4 that unnecessarily sealed the occupied L3 space. Only those flat underside faces are removed in the derivative; exterior slopes remain. The central gallery arrival opens a real guardrail gap without cutting the last tread. The original centre water stair remains water-facing. New side approaches begin on dry ground; the visit still owns terrain/water/drop boundaries.

## Verification and limitations

The focused checker composes actual source geometry, exact floor cuts and the new factory. It verifies source digests, open/closed portals, native box position/normal/UV/index identity, unit scale, 1,084 stair/landing support and headroom samples, all three animal envelopes, section construction, shader metre-UV wiring, frozen metadata and owned/borrowed disposal. Ground-level approach starts rely on the visit's ground surface; the art provides the rising treads and upper connections. The helper tests upward-facing support surfaces, not underside faces.

The saved JPGs show actual composed source/access meshes, including review-only cutaways/sections. Native bear geometry and base colours provide scale; projection paint, gameplay and crowds are omitted. CPU alpha blending approximates WebGL. **Production traversal, interaction permissions, collision solids, occlusion, active section budgets and actual WebGL/browser acceptance remain coder/architect work.** No teleport substitute is supplied or claimed; the full physical stairs and landings exist.

Reproduction:

```text
node art/source/exploration-access/measure-animals.mjs
node art/source/exploration-access/build-access.mjs
node art/source/exploration-access/build-manifest.mjs
node art/source/exploration-access/export-review.mjs
python art/source/exploration-access/render-review.py --spp 24
node tools/check.mjs
node tools/build.mjs
node workbenches/art/check-exploration-access.mjs --package
python art/source/exploration-access/finish-review.py
```

Sources, original plan/photo rights, uncertainties and native pins remain in the unchanged landmark manifests. All new access arrangements are game adaptations, not claims of historical reconstruction. No new blanket licence grant is inferred.

CPU review reuses the existing ignored Mitsuba3.9.1 scalar_rgb setup and bundled Python/Pillow/NumPy; no package was installed. Renderers have recorded PID/creation identity, owner/purpose, inputs/outputs and an actual same-process 120-second deadline. The private nested-path package server has a 30-second deadline, a `finally` close and a released-port check. Durable scripts and source/input records support deliberate restart. No preview/helper service is retained.
