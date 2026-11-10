# Ash-grey grass scorch

Exhausted grass takes on the dark, slightly cool grey of the cooled house rubble. Fine charcoal grain breaks up the interior of the scar. The feathered edge carries a lighter ash tone. The scar remains visible if fuel is poured onto the spent grass later in the same visit.

The candidate is based on Tinderbox `14ffedeff3e746a56b7035352d1a89d2f6096978`. Its [ground material](../../../src/art/ground-field.js) carries forward the grass mask from artist commit `27cdd01fa5a3c83932e5aeabac87011e16412458` and retunes its two pigments. It uses the existing half-metre fire grid, the original rubble art and the shared renderer. The ash material is authored in the shader.

The [revised grey](ash-grey.jpg) and [previous black](previous-black.jpg) are from one cooled Ashland simulation snapshot with the same 1280 × 720 night camera and exposure. The study adds a small grass verge between the cottages. A match lights the source cottage and another lights the verge at world second 24. Both renders use the packaged scene. For the comparison, the review temporarily restores the previous two pigment constants while holding the rest of the frame fixed. [Capture receipt](webgl.json)

The median sRGB sample from the new grass is `(21, 24, 29)`. The rubble in the same view is `(19, 21, 28)`. The previous grass measured `(11, 10, 8)`. The receipt records both sample regions and confirms that the rubble samples agree between frames.

## Checks

- The focused mask check passed for spent grass, adjacent live grass, wood char, re-fuelling and reset. [Mask receipt](mask-checks.json)
- `node tools/check.mjs` passed all 257 tests and the repository source checks.
- `node tools/build.mjs` and `node tools/check-release.mjs` verified all 3,510 packaged files and the nested project route.
- The fixed-camera WebGL pair was visually reviewed. All linked shader logs were empty. The disposable browser session and review server exited and released the local test port.
