# Applied kitchen return end-cut

The architect approved the measured .10 m cut on November 11, 2026. It is applied by the default exporter and included in the main house-data.json.

The native parlor/kitchen return at Z5/X3..4 previously ended at X4. The translated stair newel begins at X4.9275, leaving only .9275 m for the conservative 1 m-diameter body. The applied cut retains .90 m of the original bay, including full 2 m height and .16 m wall thickness. Skirting and picture rail receive the same cut; physical UV density and phase and all mesh scales remain unchanged. An explicit .10 m always-open air boundary records the removed strip.

The clear throat is 1.0275 m. Route centre X4.41375 leaves .01375 m on each side. Keep the existing dogleg via (4.6,3.35) and (X4.41375,3.65) around the earlier parlor door casing, then enter the kitchen at (X4.41375,5.75). These are house-local X/Z metres at floor Y.48.

The exact applied geometry passes 398 continuous sweeps at a maximum .025 m step with production sweptCylinderClear, radius .5 m and standing height 1.66 m, through the kitchen route and back. The unchanged 10b4 return is a blocked control. Its 41 actual nearby source solids are frozen in control-kitchen-return.json with the whole-source SHA256 and original source hashes. They are triangle geometry, not substitute boxes.

Reproduce:

    node art/source/furnished-house/export.mjs
    node art/source/furnished-house/check-return.mjs

kitchen-return-checks.json records both controls and exact hashes. The optional --proposal-kitchen-return flag remains restricted to artifacts/proposals output for future diagnostic variants. The main export now applies the authorized .10 m cut. This proves standing-body geometry at the passage; actual support-aware walking and the full stair route remain the coder's check.
