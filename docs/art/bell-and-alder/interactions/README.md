# Bell & Alder door and portable light

The two glazed leaves use the native 1 × 1.65 × .12 m envelope. Their green lower panels, glazed upper panes and brass plates use the installed Nautilus storefront paint, trim and glass. Each mesh follows the live leaf ID, position and heading in `world.shop.door`. The closed pair centers at X 39.5 and 40.5 on Z 17. The open pair centers at X 39 and 41 on Z 16.5.

The old `bell-and-alder:parlor-lamp` footprint now represents the original Nautilus pedestal. Its planar box remains .623894 × .656 m and its top is .747 m above the floor. The `bell-and-alder:hand-lantern` object uses the original map-density model and a single warm point light at its pinned wick anchor. A leather hanger holds the native loop near the player's waist in the carried pose. The model follows position and heading and uses the same emitter after pickup. The art reads the stand and carried light independently after pickup. Legacy art fixtures without `world.shop` show the lantern on a live stand and hide it on burnout.

The source stays at the installed Nautilus pin `2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74`. The new leaf and hanger geometry borrow the existing storefront materials. The source ledger covers the copied geometry recipes and paint atlas. [Nautilus intake ledger](../../../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/provenance.json)

## Matched views

The default Catalogue Street camera rendered at 1280 × 414 with the same player pose, clock and exposure. The fixture supplies controlled shop snapshots to the packaged street art. Normal-route input, reach, collision and interaction acceptance belong to the combined review.

- [Closed pair and placed lantern](previews/closed.jpg)
- [Open pair and placed lantern](previews/open.jpg)
- [Open pair and carried lantern](previews/carried.jpg)

After transfer, median display luma in a 7 × 7 pixel parlor-floor sample fell from 70.32 to 45.89. The sidewalk sample near the belt rose from 93.46 to 171.38. The floor at the sales counter read 66.92 in both frames. [Capture receipt and sample positions](browser-measurements.json)

## Checks

The existing art workbench verifies all 19 static solid boxes, the earlier aisle and floor, four live leaf meshes within 2 µm of their boxes, an exact stand-flame anchor, and the same lantern and emitter after moving and turning. It verifies placed-light burnout in the legacy fixture, carried-light independence after actual pedestal burnout, reset, repeated disposal and late atlas cleanup. [Focused check receipt](focused-checks.json)

`node tools/check.mjs` passed 224 tests and the host-Three art check. `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,501 files. The temporary review tab and capture server were retired.
