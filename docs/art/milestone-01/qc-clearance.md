# QC correction: footprint and resolved discharge

This bounded artist correction follows `b3c7c009706dc48a10cd97951df36f79a4d5fb21` and consumes [the final coder contract](https://github.com/Syntaxswine/tinderbox/blob/11b8cd05c0ca885f277d048c1825d0e52c0a367c/docs/engineering/qc-body-discharge.md). The user accepts the current scene as a mechanics test, not the final visual direction. The next art pass must directly reuse actual Farmyard assets as its foundation. No replacement-art scope is added here.

## Footprint

The selection ring takes positive finite `snapshot.player.radius`; older snapshots fall back to 0.56 m, derived from the 1.06 m shoulder silhouette plus 0.03 m clearance. The ring and escape arrow scale existing geometry. No movement/collision rule is implemented in art.

The labelled `corner` fixture puts the bear at `(9.06,7.56)` with radius 0.56 m, against wall faces at `x=8.5` and `y=7.0`, facing out of the corner. Desktop/phone captures show shoulder clearance. Browser checks measure the rendered diameter at radii 0.56 → 0.80 → 0.56 and verify stable GPU resource counts.

## Discharge

`src/art/discharge.js` consumes supplied absolute `origin`, `shapeOrigin`, heading, ordered ray endpoints, `connectRays`, and explicit torch lead. It performs no world/mesh collision queries, range calculation, heat application or gameplay simulation. The coder's supplied shape remains the sole authority.

Connected fans use layered ribbons inside adjacent supplied triangles and animated painted cards whose fragments are clipped to the same ray table. Planar coordinates stay within the mask; animation changes height/atlas phase using world time. The unobstructed fixture uses the full supplied 4.5 m reach. The near-wall fan ends at `x=11.4999`; the actual submitted maximum is recorded as approximately `11.499899864` after Float32 conversion.

When `connectRays:false`, the renderer draws only separate vertical strips on resolved segments. It generates no connected fan and no billboard plumes. Torch draws its supplied lead plus its local radius fan. Inactive or missing discharge immediately hides and empties the effect regardless of `player.usingTool`. Fixed clocks preserve pixels and identical shape data avoids rebuilding geometry.

The cosmetic lance anchor remains +1.07 m forward, +0.29 m sideways and 1.05 m high. Its nozzle can lie beyond a wall even when the 0.56 m body clears it. When an active connected shape contains the nozzle, the flame begins at its forward station while remaining inside the resolved mask. Otherwise the effect stays in the supplied source domain, and the entire handheld lance/torch hides conservatively. The pack/hose and anchor offsets stay intact. Independent-ray fallback also hides the handheld part conservatively. Art never bridges a wall to reach a far-side nozzle. Inactive discharge restores the held art.

## Evidence

The final browser run passed at 1280 x 800 and 390 x 844, with no errors or failed requests. The isolated near-wall GPU probe shows visible flame and **zero pixels beyond the boundary plus a one-pixel raster guard**. Independent-ray submitted triangles have zero planar area, confirming no inferred fill. Eight repeated world/actor rebuilds remain bounded, and double disposal releases all geometry/textures.

An additional read-only smoke used actual snapshots from coder commit `11b8cd05c0ca885f277d048c1825d0e52c0a367c`: free, masonry wall, thin wood, narrow corner (37 rays), clipped torch (57 rays), complex fallback, rotated aim and pause. Active state, exact ray count, connection mode, radius and snapshot immutability agree with the producer. This is consumer verification; combined gameplay acceptance remains the architect's work.

- [Current review manifest](review.json)
- [Desktop jet](../../../artifacts/art-review/qc-discharge/jet-field-1280x800.png)
- [Phone jet](../../../artifacts/art-review/qc-discharge/jet-field-390x844.png)
- [Near-wall result](../../../artifacts/art-review/qc-discharge/jet-near-wall-field-1280x800.png)
- [Desktop corner](../../../artifacts/art-review/qc-discharge/corner-field-1280x800.png)
- [Phone corner](../../../artifacts/art-review/qc-discharge/corner-field-390x844.png)
- [Actual-model smoke](../../../artifacts/art-review/qc-discharge/model-smoke.json)
- [Original anchor measurements](../../../artifacts/art-review/qc-radius/anchor-probe.json)

The renderer uses bounded preallocated GPU buffers: 256 rays, 18,000 vertices, 52,000 indices and 128 plume cards maximum. It owns two geometries, two materials and one data texture, sharing the existing flame atlas. The correction adds no raw assets or second Three instance. Whole handheld hiding is deliberately conservative; per-part mesh clipping and a final visual redesign are not claimed. All changes remain in artist-owned files.

## Explicit-LOD shader follow-up

After checkpoint `86f281e4f63825ed9c721e790f5cb00fac13de85`, the architect observed ANGLE/D3D11 warning X3595 from implicit-derivative ray-table sampling in the per-fragment binary search. The sole production change replaces that lookup with `texelFetch(rayTable, ivec2(int(i), 0), 0)`. Three r180 compiles these ShaderMaterials as GLSL 300 ES / WebGL2; exact level-zero data fetch preserves the nearest, non-mipmapped table values.

A minimal fresh Chrome 155 / RTX 3080 / ANGLE-D3D11 smoke rendered free flame, near-wall flame, torch, and independent-ray fixtures. All 12 compiled programs linked, all program/shader logs were empty, and browser warnings/errors/failed requests were empty. Disposal returned zero geometries and textures. Fourteen syntax/dependency checks and five raw import checks pass. The historical 52-capture matrix was not rerun; its source commit remains recorded separately from this shader follow-up in the review manifest. Raw smoke evidence and the reproducible script are in ignored `artifacts/art-review/shader-lod/`.
