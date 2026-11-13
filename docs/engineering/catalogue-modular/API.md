# Catalogue Street module attachment

Base: `e07487fe3299531f9205b43fc39afd3c9106e2ee`. The preserved M22/M23 fixtures remain controls. This adapter attaches independently placed physical components to the existing `NEIGHBORHOOD_SCENARIO`; it does not create another map, player or application.

## Placement and ownership

Artist-owned files live in `workbenches/catalogue-modular/`: `scene-data.json`, versioned local physical sources and `art.js`. The placement manifest is version 1, `prefabId: 'catalogue-modular-v1'`, with exactly these upgraded instance IDs:

| Instance | Existing host identity | Rigid source placement |
| --- | --- | --- |
| `bell-and-alder` | Original shop lot X36–44/Z9–17 | translation `[36,0,9]`, Three Y quarter-turn 0 |
| `hopkins-fifteen` | Original `hopkins-fifteen` building | translation `[24,0,13]`, quarter-turn 2 |

Host X/Y means world X/Z. Source shop floors remain 0/2.12 m and house floors .48/2.60 m. No scale field is accepted. IDs and references are qualified once as `instanceId::nativeId`; geometry/normals/poses receive one rigid transform, with original UVs and native asset identities preserved. Each stair flight declares its own local treads, landing source IDs and measured elevations as in the M23 API.

The artist declares the component bounds and records omitted or recomposed fixture IDs. Opposite frontage, broad test paving, test actors and the service yard do not enter the host by default. Render, collision, support and finite fuel describe the same variant. The real shop stair must leave the road and Ashland clear.

The registry identifies the old shop modules/props/door/lantern and the old Hopkins 15 collider/fire/render representation it supersedes. All other host buildings, Monroe party-wall links, obstacles, pickups and actor IDs remain. Publication retains the original placement identities for the map; a module representation never creates a second house at another coordinate.

## Host hooks

`src/runtime/index.js` retains the only renderer, camera, UI binding, animation loop, focus handling and disposal lifecycle. `src/simulation/index.js` retains the only command queue, player, inventory, effects, accepted movement path, pickup processing, event sequence and active/player/world clocks.

- **Movement:** the existing `step()` movement hook combines street/world limits and legacy obstacles with the registered native support/clearance queries. It writes the accepted X/Z/elevation/path to the same host player. Source stair geometry and measured character envelopes remain authoritative. There is no second navigation clock or spawned player.
- **Actions:** `tools.js` remains responsible for stock, match rising edges, finite carried torch, production discharge and lantern aim/trajectory. A shared contact query resolves the earliest real legacy or module obstruction. Each accepted heat/oil delivery is routed once to its declared physical owner. No rendering callback applies heat.
- **Interactions:** the host dispatch validator queries the module door/lantern registry as well as unchanged host interactions. Reach, proposed leaf clearance and actor occupancy are checked when the queued action is consumed. The old Bell controller is superseded only while its module is registered.
- **People:** retain the original host civilians and officer. Any resident uses an additive host-owned identity and the same clocks/collision queries. Do not bootstrap `createClosingRuntime` or copy the test player/officer. The portable lantern has exactly one state/owner.
- **Publication:** add explicit module metadata and qualified physical frames to the ordinary host snapshot. Host art owns all character/tool/pickup/ground presentation once; component art owns its structures and installed fixtures. Generated fuel/fall/rubble/tombstone render ownership persists independently of current support or heat receiver selection.
- **Reset/disposal:** host generation resets module physical state, door/lantern state, frame cursors and ownership receipts once. Disposal closes the attached backend and views with the host visit. Original M22/M23 controls remain independently runnable.

## Approved selectable thermal backend

The current host uses a 60 Hz step, scalar 2D `HeatField` heat/fuel, and per-lot housing adapters. The detailed trial uses fixed 30 Hz steps and a capacity/energy ledger. Running both over the same fuel or inventing an implicit energy conversion is invalid.

The architect selected the existing detailed trial as the sole thermal domain for the module-enabled Catalogue visit. The unchanged legacy visit remains a selectable control. Native exterior house geometry, terrain/grass, barrels and other combustible props must register once in that domain; the legacy `HeatField` and housing solvers do not also run. Host `worldDelta` feeds an explicit 30 Hz residual; native events publish both their native tick/time and the receiving host tick/time. The provider owns contact, support, heat, exposure and retirement queries. It is a backend adapter, with no solver coefficient or controller rewrite. Direct actions use declared backend-native input profiles; no scalar heat-state conversion or forced legacy timing match is introduced.

The implementation is `src/simulation/catalogue-thermal.js`. `?catalogue=modules` selects it through the existing title/places/Catalogue visit. Omit that parameter for the preserved legacy control; cottage wind controls retain their prior precedence. `src/runtime/catalogue-modules.js` loads the versioned two-component manifest and appends the seven existing native exterior factory outputs plus the original grass mask and street props. Actual mesh material/coplanar facets supply geometry and canonical/render bindings, including the derived Monroe joining variant. This does not add interiors or open doors to the seven exterior-only lots.

Native exterior facet fuel uses half the actual exposed mesh area in finite prototype surface units (single room-floor faces use their actual area). Material names/source roles select the existing trial classes; masonry/glass/metal remain inert. These are disclosed input profiles, not measured mass. The two detailed sources retain their existing quantities/finishes/stores. Original coarse ground wood is presented as inert cleared foundation paving in this mode, preventing a phantom wooden floor beneath the registered real floors. The existing grass exclusion at original building footprints is preserved; no no-lawn diagnostic receiver selection is enabled.

The match input is the trial's 1.05 energy units. Torch presses use the existing 1.8 input. The held production cone spends the existing .3 stock/s and partitions its 12 energy units/s once over its clipped rays. The production aimed lantern keeps its original trajectory, then releases one native .5-unit oil payload at the real impact for the existing fall/landing/burst rules; no second outbound projectile is launched. Pouring consumes .08 units per accepted ground metre and groups only deposits in the same native tick/cell/support, preserving their exact finite total. The host barrel retains its original one-shot threshold/blast/damage rule; its one inert 18-sided body retires before a single native blast input is distributed. These changed prototype responses are not claimed to reproduce the scalar backend's timings.

The shop resident is a host-owned actor with the existing source routine and smoke/exit waypoints. Existing original civilian/officer routes remain. Perception borrows the existing opening/furniture visibility queries over the same trial; geometry, light, camera and effect toggles do not create evidence. Native ignitions enter `observeFire` as unresolved causal evidence, allowing remembered-lantern suspicion. Direct causal aggression is explicitly **unwired** until a real native source-budget proof can establish independent ignition. A visible flame or a last-tool label is not substituted for that proof. Original M22 blocked-route/fixture limitations are not silently declared repaired.

Ambient wind remains the declared 1.5 m/s east control until a separately reviewed field matches this exact street geometry. The Ashland bake is not a neighbourhood wind field.

## Component art interface

`createCatalogueModuleArt(THREE, {renderer, data, instances, signal})` returns `{root, update(frame, view), diagnostics(), dispose()}`. Prepared instance data is already qualified and in world coordinates. Each renderer receives only its owned physical records, including generated records and tombstones.

Additive `frame.catalogueModules` version 1 publishes generation, instance identities and the actual portable-lantern state plus host actor poses needed for its attachment. Component art creates no actor, inventory, input, physics, broad terrain or clock. The host continues using the current six-button HUD. A source-specific view preserves actual level elevations and reports its lights/resources/missing mappings.

The host owns one shared six-light/power-215 firelight pool using canonical fire samples once. Component flame/smoke views receive `lighting:false`; their installed fixtures and the one portable lamp remain separate declared lights. `view.interiorInstanceId` comes from actual accepted support and selects only that source's cutaway, including the shop's ground floor. Terrain/props have canonical records but no duplicate component structure view. The host draws their ground/barrel/pickup presentation.

## First acceptance

Use the actual Catalogue Street visit. Walk the same selected player from old street through a real upgraded entry/stair and back to the old street, retaining identity, inventory, tools and clocks. Exercise the existing pickups/barrels/tools at the changed contact boundaries, check one reset, and capture an actual host-map JPG. Preserve recorded native-width and visual limitations; do not shrink a body or skip a solid to force passage. Report working, broken, unwired and untested behavior separately. No long burn library, new tester, master promotion or Pages deployment belongs to this attachment.
