# House rubble and grass scorch

A retired Catalogue house leaves split joists, an interrupted sill, fallen chimney brick and a continuous ash bed inside its original footprint. Five ember pockets flicker with low flames after the structure falls. The tongues taper out over 13–19 world seconds. The coals, smoke and low light fade by 24 world seconds, leaving the cold ruin. The grass mask keeps the scorched ground visible when its fuel has burned through, including when spilled fuel burns on the same spot again.

## Art contract

- [Rubble factory](../../../src/art/burned-house-rubble.js) reads the normal building placement and the authoritative destroyed flag. It uses Ashland's `retiredAt` or a dated `building-burnout` receipt when available. A live-to-destroyed transition starts older untimed snapshots at the observed world clock. A ruin loaded without a dated receipt starts cold.
- The pile is seeded by lot ID and uses the original footprint dimensions and quarter turn. Its mesh and coal surfaces stay in place as the light and smoke fade. Each pile retires on reset or when its building leaves the snapshot.
- [Ground field](../../../src/art/ground-field.js) reuses the existing field mask. Its burnt-grass flag remembers exhausted grass fuel for the visit. Nearby spent cells join at their common edges. Only the exposed edges feather into the surrounding ground. The live fire lane still carries the active flame bit.
- [Scene composition](../../../src/art/index.js) attaches the layers on the normal art path. The retired Ashland lot hands its footprint from the original falling-tile ash to the new ruin. Rubble smoke and tongues use the existing fire batches and its warm spill shares the street's six light slots. The rubble phase is presentation. The house's collision and any gameplay heat come from the simulation snapshot.

## Source and scale

Built on Tinderbox `a39c3a438ccf99ab565dda293dbb61220673084c`. The original placement dimensions come from the six approved plans at artist intake `56b028c2935b5a97fe259618f38e0a1550928ab4`. The new mesh uses the existing metre coordinates and rotation. [Plan intake](../../../assets/art/neighborhood-intake.json)

The flame and smoke atlases are the existing pinned Farmyard files under `sites/tactical-animal/dist/aft/assets/effects/painted-fire/`, at `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`. The new rubble and grass materials are authored in code and borrow the shared Three renderer. [Original art provenance](../../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/art.json)

| Existing file | SHA-256 |
| --- | --- |
| `flame-atlas-v1.png` | `252f9abe573b8dfade6bc265e7cf097eb2d9bf488039016f072e5bf4f0663d07` |
| `smoke-atlas-v1.png` | `facc0d32390fe79f1cf660eb4830322376f6f5bf07e920e0d5a50d77eb4752c8` |

## WebGL review

The stills use the packaged scene and actual game commands in the calm Ashland scenario. A review-only grass verge was planted between the cottages to make the two changes easy to see in one view. The first match lights Ashland at `(51, 13.5)`. A second match at world second 24 lights the verge at `(53.5, 13.5)`. The four wide views share the native night camera's projection, framing and exposure. The detail uses a closer camera under the same lights.

| View | Capture |
| --- | --- |
| Cottage and grass before the fire | [Intact](previews/intact.jpg) |
| Recently fallen cottage and burning edge of the verge | [Burning rubble](previews/burning-rubble.jpg) |
| Low glow and smoke late in the fade | [Smoldering](previews/smoldering.jpg) |
| Cold rubble and black grass scar | [Cooled](previews/cooled.jpg) |
| Close view of the wood, brick and active pockets | [Rubble detail](previews/rubble-detail.jpg) |

[Browser capture receipt](capture-receipt.json) records the shared camera, WebGL renderer and linked programs. It also records the collapse timestamp, retired tile ash layer, grass cells consumed, local light and cooled state. The temporary preview server and isolated test browser sessions retired after capture.

## Verification

- `node workbenches/art/check-burn-aftermath.mjs` passed for all six house designs at four rotations, 24-world-second retirement, reset, late mounts, legacy receipts, light slot limits and grass persistence through re-fuelling. The largest measured pile was 4,530 triangles including its glow surfaces. [Focused checks](focused-checks.json)
- `node tools/check.mjs` passed all 243 game tests and the repository source checks.
- `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,508 packaged files and the nested project URLs.
