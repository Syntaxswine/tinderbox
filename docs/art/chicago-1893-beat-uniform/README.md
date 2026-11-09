# Chicago city beat patrol uniform

The first municipal patrol outfit for Tinderbox is fitted to the native Farmyard goat. The six pieces are the rounded helmet, high-buttoned frock coat, straight trousers, footwear, waist belt and breast star. The dark navy cloth, bright paired buttons and chest star give the patrol a distinct silhouette alongside civilian work clothes. The [source record](references.md) separates period evidence from the fitted details.

## Fit and use

This art candidate branches from published `92e8ec0fe3251c63a73cf1651f1e3b2c63c5cbde`. The witness trial uses the existing civilian and has a separate intake. The study adds no scene placement or game behavior.

Use [the factory](../../../src/art/chicago-beat-uniform.js) with the host's Three namespace and the result of the existing civilian rig factory for a goat. A `{root}` wrapper around that same native rig is also accepted.

```js
const uniform = createChicago1893BeatUniform(THREE, civilianRig);
uniform.setPieceVisible('helmet', false);
uniform.setPieceVisible('helmet', true);
uniform.dispose();
```

The uniform binds to the native skeleton with the existing bind matrix. Coat sleeves, trousers and footwear reuse the geometry and weights of the corresponding native parts in owned copies. The goat's skin, hands, head, ears and horns stay visible. The factory hides the native garments that its pieces replace and restores their original visibility on disposal. The underlying model, paint, world scale, attachment points and animation are preserved.

The pinned Farmyard intake is `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`. The [fit receipt](focused-checks.json) gives both original goat input paths and SHA-256 values. The new pieces introduce 7,313 garment triangles in 22 geometries with eight owned materials. No external runtime files are required.

The cloth palette, star, buckle and button forms can carry over to other animals. Refit the helmet against each skull and its ears or horns. Recut the shoulders, cuff placement, skirt and trouser pattern for the target bind pose, then bind those pieces to its corresponding joints. Refit footwear to the target feet and check headroom and body bounds on the target's original gait.

## Review images

| View | Capture |
| --- | --- |
| Front, both figures head to hoof | [Close front](previews/close-front.jpg) |
| Walking pose and fitted helmet profile | [Close stride](previews/close-stride.jpg) |
| Default follow camera at night | [Street at night](previews/street-neutral.jpg) |
| Same street view with the carried Bell & Alder lantern | [Street with lantern](previews/street-lantern.jpg) |

The JPGs are actual WebGL frames of the packaged street art with two controlled study actors. The night pair shares the default follow camera, exposure and clock. The Bell & Alder hand lantern moves from its shop stand to the native bear's belt in the warm comparison. The bear is offset to leave both goats legible. The close views use a study camera and neutral fill, with one native walking pose. [Browser capture receipt](capture-receipt.json)

## Checks

- [Focused uniform check](../../../workbenches/art/check-chicago-beat-uniform.mjs) passed. Across 32 native idle and walking samples, the dressed goat reached a maximum sampled height of 1.650 m and radius of 0.442 m within the civilian's 1.70 m height and 0.62 m radius. The check verified identical native bone matrices and bounds, independent piece visibility, normalized skin weights, and one disposal per owned geometry and material.
- `node tools/check.mjs` passed all 228 tests plus the byte-preservation and syntax/dependency checks.
- `node tools/build.mjs` and `node tools/check-release.mjs` passed. All 3,503 packaged files matched their hashes and resource URLs resolved under the nested project route.
- The four final browser views were visually reviewed. The temporary browser tab and loopback server were closed and port 4551 was verified released.
