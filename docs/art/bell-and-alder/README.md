# Bell & Alder

Bell & Alder is a fictional dry-goods shop on Catalogue Street in the 1893 setting. The room occupies X 36–44 and Z 9–17. Its 2.00 m opening faces the road at X 39–41, Z 17. The timber floor follows the metre grid. Twenty-one native 1 × 2 × .16 m wall modules and nine of the Nautilus glazing bays define the room. The open top and glazed front and east sides show the interior from the default street camera.

Stocked shelf bays, the paneled sales counter, a brass scale, a glazed case and a fabric rack occupy the west side. The settee, pedestal table and side chair form the Eastlake display on the east side. The hanging cloth-spool sign marks the frontage. Two localized point lights sit at the Nautilus pendant and parlor lamp flame anchors. The original metre scale, pivots, map-density geometry and UVs carry through.

## Intake

The exact Nautilus source is `2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74`, styled for about 1885 in the source record. The intake preserves 14 files, totaling 2,807,915 bytes. The ten host-Three modules and original paint atlas provide the runtime closure. The original recipe generates the trim paint at runtime. The ledger records exact Git blobs, byte counts and SHA-256 values for every copied file and the inspected source documentation, catalogue, workshop sample and baked trim reference. The pinned source supplies provenance and original notices. Separate per-file licensing is unspecified. [Intake ledger](../../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/provenance.json) · [Original city props notice](../../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/assets/city-props/NOTICE.md)

## Play-scale review

The JPGs show a local composition of the packaged Catalogue Street renderer, solver, native bear and default night camera at 1280 × 414. The review starts immediately outside the shop and moves the bear into the aisle through the real collision model. The coder's production composition and the normal menu remain separate integration work.

- [Approach with lamps on](previews/approach.jpg)
- [The same view with the two point lights off](previews/approach-lamps-off.jpg)
- [Inside the shop with the native bear](previews/inside.jpg)

The matched control keeps the camera, player, world time and exposure fixed. The median 7 × 7 pixel luma on the 0–255 display scale rises from 42.26 to 65.85 on the sales floor and from 42.40 to 74.71 by the Eastlake table. The road control reads 46.46 in both frames. [Capture receipt and world-space probes](browser-measurements.json)

## Verification

The shared layout provides 25 placements and 19 fitted solid boxes. The focused check compares all solid boxes to rotated mesh bounds within 2 µm, walks the .56 m-radius native bear in and out, rejects walking through glazing, and finds 1–8 occupied fire-grid centers in each of the ten timber footprints. In a seeded simulation replay the parlor stand burns out at 9.75 world seconds. The lamp, light and collider retire together while the settee remains present. The factory also passes repeated disposal and late atlas cancellation checks. [Focused results](focused-checks.json)

`node tools/check.mjs` passed all 221 tests and the host-Three art check. `node tools/build.mjs` and `node tools/check-release.mjs` verified all 3,501 packaged files. The packaged donor bytes match the intake manifest. The temporary capture tab and loopback helper were retired.
