# Furnished Hopkins 15 artist checkpoint

This candidate implements the artist side of contract 3596f41cbeb0a85c648c44b789a838ed5a8dc139 from published c855e627bdee963e930644839a60c027a03935de.

The usable entry point is workbenches/furnished-house/art.js: createFurnishedHouseArt(THREE,{renderer,data}) returns root/update(frame,view)/diagnostics/dispose. The data exporter is art/source/furnished-house/export.mjs. The coder API names are retained; art/source/furnished-house/api.json records the initial agreement.

This is an explicitly incomplete early source checkpoint for combined browser review. Seven geometry checks and eight Node presentation checks pass. Actual animated WebGL, source/normal-zoom JPGs, full swept-route proof, hardware cost and combined replay acceptance are pending. No production imports or publication are added.

Current geometry retains the 1x1x2.12m structural cell and source floor planes .48 and2.60m. Ground room support remains100m2. The authorized upper fore-lip bay removal changes upper support69 to68m2. Closed .12m slabs have one canonical support/fuel identity shared by their top, underside and edge render faces. The original stair treads and animal geometry are unchanged.

The source-derived stair alcove removes twelve directly interfering whole wall bays: ground west X4/Z3..7, both-storey east X6/Z4..7, and upper rear Z7/X5..7. One upper floor bay X5..6/Z3..4 is removed. Data records the exact removed polygons and baseline/adapted component placements. The original landing support X4..5 is retained. The two consoles move onto actual supported room floor. Posts/rails translate outward without scaling. The entrance uses an unchanged native leaf on a .15m stand-off hinge, opening180deg; its .35m transom is a separate canonical always-open boundary. Six existing-dimension .22m entry blocks compose .44m run per rise; no tread is stretched.

Furniture exports include actual part matrices/bounds and item support contacts separately from the render pivot. The kitchen work-table pivot is outside its actual feet; callers must use supportContacts/supportSurfaceIds, not item.position, for support. Prototype chair legs fill the source's missing supports; native bed posts translate downward .01m to meet their actual floor. Native source files are unchanged.

The renderer batches shared static/material work, with one physical mask shared by color and depth/shadows. It merges full/delta frames by stable source IDs and exact coverage. Falling poses are authoritative, and explicit fall tombstones remove retained flight state. Optional frame.parts or frame.furnitureParts retire individual components while preserving inert parts. Exterior/cutaway/xray/auto are presentation-only views. Xray consumes actual occupancy records.

The accepted Gaussian shroud and unchanged splat renderer are reused. A recorded scoped support-envelope adaptation clamps the same flame shape to the actual source footprint/tangent, including wind. The existing shared firelight module retains its six-light/215 budget. No Ashland frozen wind field is applied to this house. The caller supplies the same labelled ambient sampler to simulation and art.

Store positions and finite amounts are explicit prototype values: oil3 at(.65,.48,6.65); coal1 at(1.10,.48,8.65). Each store points to one fuel part, avoiding a duplicated contents amount. Physical fuel is separate from coating/appearance. All store rates and thresholds belong to the coder.

The exact west-wall starting targets are exported in data.replayTargets: kitchen(0,1.01,6.25), bedroom(0,3.13,5.25). Their sourceSurfaceIds are selected from actual timber panels away from windows.

Reproduce:
    node art/source/furnished-house/export.mjs
    node art/source/furnished-house/check-geometry.mjs
    node art/source/furnished-house/check-art.mjs

Source pins and hashes are in house-data.json, with the effect intake in art/source/furnished-house/effect-intake.json. Existing raw source notices remain unchanged. No new helper was launched for this early checkpoint; preserved stockyard/Hull-House helpers remain retired.

The entrance is now centred at X5 within the original two-metre hall. The complete native leaf/frame/transom/hinge and six-block approach translate -.5m in X. The prior 1m solid front bay becomes two end-cut piers, with .0075m jamb rebates matching the unchanged casing's 1.015m throat. The exterior right return remains solid. Porch rail sections/balusters are composed around the same centred approach. Source and adapted polygons/transforms are in navigation.routeAdaptations (centred-native-entry). The conservative route centre is X5.00375 to clear the outward180-degree leaf. This is geometry evidence; continuous full-body collision acceptance belongs to the coder and remains pending.
