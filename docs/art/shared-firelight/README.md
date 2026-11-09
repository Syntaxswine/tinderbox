# Shared firelight on Catalogue Street

The regular street and the Ashland pair share six warm point lights. Ground fire uses burning `snapshot.cells`; structures use exposed, actively flaming `snapshot.structureFire` samples. The lights combine nearby sources by area and flame strength in world metres, stay above ground or outside the native surface normals, and use distance falloff. A nearby flame keeps a slot, and a substantial roof source within range can keep a slot during heavy wall fire. The street caps combined intensity at 215 cd and reach at 16 m per light. The terrain light tapers as fuel runs out. Smoke, preheat, spent sites and enclosed structural samples contribute no light.

Catalogue wall and roof effects follow the same samples at native heights. The Ashland moon, tile masks, basement openings, falling fuel and airborne embers still use their existing presentation paths. The separate Ashland and ground fire emitters are absent in the production composition. The carried torch remains its own 3.8 m source. The regular street uses Ashland's sky-fill and moon palette. The art factory replaces only the daylight objects the street runtime passes in `defaultLights`. It restores those lights on disposal. The existing section preheat still reaches the regular siding wisps.

## Matched WebGL views

The browser rendered the package at 1280 × 414 on an RTX 3080 via ANGLE/D3D11. Each row below uses the same camera, player position, world time and renderer exposure for that scene. The small fire is one burning half-metre terrain cell. The large-fire captures use wall and roof samples at native positions with no burning terrain.

| Scene | Cold | Small ground fire | Wall and roof fire |
| --- | --- | --- | --- |
| Catalogue Street | [JPG](previews/catalogue-cold.jpg) | [JPG](previews/catalogue-small.jpg) | [JPG](previews/catalogue-full.jpg) |
| Ashland pair | [JPG](previews/ashland-cold.jpg) | [JPG](previews/ashland-small.jpg) | [JPG](previews/ashland-full.jpg) |

The table reports median Rec. 709 display luma from a 9 × 9-pixel patch around each projected world point. Values range from 0 to 255.

| Surface | Cold | Small ground fire | Wall and roof fire |
| --- | ---: | ---: | ---: |
| Catalogue ground near the match | 67.6 | 142.4 | 174.4 |
| Catalogue ground by the facing house | 68.6 | 78.4 | 134.0 |
| Catalogue facing siding | 44.5 | 56.9 | 144.9 |
| Ashland paving near the match | 63.7 | 172.6 | 193.4 |
| Ashland paving by the facing house | 92.5 | 92.5 | 133.0 |
| Ashland facing siding | 47.8 | 47.8 | 95.2 |

The full Catalogue frame draws 53 wall and 27 roof sites and assigns one light to a roof cluster. The Ashland frame draws 32 wall and 28 roof sites and assigns two lights to roof clusters. Both scenes had six point lights total and no active pooled lights in the cold, smoke/preheat-only and spent frames. The ordinary smoke/preheat-only frame produced three wisps at one site. See [world points, pixel values and light positions](measurements.json).

## Checks and integration

Built from published Tinderbox `080634a0e83f8da266897d60e951b680261908fe`. This candidate uses the existing Three.js, flame materials, native house geometry and pinned Nautilus wind field. There are no new third-party asset imports. `node tools/check.mjs` passed all 207 tests. The release verifier checked all 3,478 packaged files and nested project URLs. An isolated light-pool check exercised 257 world-space clusters, one local source retained, six slots, a 211 cd measured total under the 215 cd ceiling, late-fuel taper, zero light from excluded sources, and disposal. No local helper remains running.

The JPGs use controlled snapshots to test rendering. Live wall-to-roof timing and normal-menu integration require the architect's combined review with the coder's solver. The pooled lights use outward placement and exterior-source gating with shadowless falloff. They can spill around corners without tracing occlusion.
