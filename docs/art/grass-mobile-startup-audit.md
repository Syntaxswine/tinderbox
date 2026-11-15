# Grass presentation and mobile startup allocation audit

November 15, 2026. Documentation checkpoint from contract `896c18b7c9436f17e01162ac601089c6df261fef`, examining runtime baseline `b72f327ff7b55976b04880c6c276a370204866b2`. The confirmed iPhone 16 Safari failure occurs after Catalogue selection and before fire. Source estimates below identify allocation candidates. The coder's shared desktop baseline is interpreted below; the actual phone cause remains unconfirmed.

## Startup allocations

The default Catalogue creates five painted bodies: player goat, two neighbours, goat officer and horse resident. Each native paint instance retains a 2048 × 1024 colour/depth projection target. Its shader samples both textures throughout the model's life, so deleting targets immediately after baking would break the paint. [Projection and paint ownership](../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/horse-model-paint.js).

| Allocation | Source dimensions | Logical estimate |
| --- | --- | --- |
| Five projection colour attachments | 2048 × 1024 RGBA8 each | 40 MiB total |
| Their depth attachments | 2048 × 1024, unsigned-int depth request | Additional roughly 30–40 MiB, depending on storage/padding |
| Five validity masks | 1774 × 887, one byte per pixel | 7.5 MiB GPU plus retained CPU mask data |
| Decoded paint image | 1774 × 887 RGBA | About 6 MiB per decoded image, before mipmaps |
| Mask construction scratch | RGBA readback, background, queue and validity arrays | About 15 MiB per creation, excluding canvas backing |

The fixed projection sizes do not fall with canvas DPR. Production caps canvas DPR at 1.75 and uses no viewport-sized HDR compositor in the examined art path. The approved character shroud creates no particle geometry/material until an actor is actively burning. [Renderer](../../src/runtime/index.js), [shroud allocation](../../src/art/character-shroud/index.js).

The contract also records Node heap observations of about 562 MB at native registration and 1.049 GB after initialization, before rendering. Those are separate platform observations: paint sharing alone cannot be assumed to resolve that retention or the Safari failure. Prior M25 desktop evidence reports 300–301 draws, 358–359 geometry registrations and 88 textures; it is not a mobile measurement. [Contract](../milestones/26-fast-grass-mobile-startup.md), [recorded desktop window](../engineering/character-fire-shroud/active-character-cost.json).

## Grass ownership and residual appearance

Native structure views exclude terrain/props and select samples by owner. Ground flames use the shared raster/card path; its `lit` flag is limited to ground-owned fuels. Active flame cards require `phase === 'burning'`. The legacy `spent` branch adds a 3.2-second smoke tail, not active flame. No duplicate grass emitter or stale active-flame tail is established by this source review. [Ownership](../../workbenches/catalogue-modular/art.js), [raster](../../src/simulation/catalogue-thermal.js), [cards](../../src/art/fire.js).

Two presentation distinctions need the shared trace. The raster's grass label can persist after grass fuel is exhausted while ground oil continues burning. It also publishes `heating` whenever residual heat is positive and never publishes `spent`; the ground shader gives heating a minimum warmth of 0.24 and reserves lasting black scorch for `spent`. This can leave exhausted grass looking warm without a continuing grass flame. [Ground presentation](../../src/art/ground-field.js).

The frozen production target is one world second for ordinary grass with energy `110/3`; peak power must not triple. Existing threshold, delay and fuel rules, oil's 14-second profile, house clocks, historical three-second controls and powder's world-time slowdown remain as specified in the contract. Runtime tuning and fuel-specific publication belong to coder.

## Minimal proposals after the shared baseline

1. Prioritize the measured scene-copy/retention peak, then share truly identical native projection and validity data. The default five rigs represent two native species; sharing could remove three targets, roughly 42–48 MiB of logical colour/depth storage. Use model/source/frame/mapping keys, private per-rig materials and paint-part attributes, and reference-counted disposal. The existing `preparedProjection` hook alone does not settle ownership.
2. Share immutable structure textures by canonical URL and sampler settings. The current texture cache is per building view; trim finishing also regenerates identical 768 × 576 maps, about 1.69 MiB each before mipmaps. Preserve repeat, colour space, filtering and UV density. [Structure textures](../../art/source/catalogue-modular/thermal-art.js), [trim finishing](../../workbenches/catalogue-modular/art.js).
3. Keep exhausted grass, continuing oil and cooling smoke distinct in the authoritative trace before assigning an art correction. Conservative off-screen card work is a later candidate if counts justify it; it must retain visible plume bounds and all physical heat.

Runtime, paint loaders, civilian wrappers and integration files remain unchanged. No helper, GPU preview, new asset or benchmark was started. The shared baseline below informs the next candidate review; real iPhone acceptance remains unavailable until an actual device retry.

## Shared baseline allocation ledger

The coder's single desktop baseline reports these explicit GL payload estimates, excluding driver padding, default framebuffer/MSAA, decoded images and engine overhead:

| Category | Logical bytes |
| --- | ---: |
| Textures | 404,896,862 |
| Buffers | 66,728,750 |
| Renderbuffers | 12,582,912 |
| Total | 484,208,524 |

Initial renderer counters are 236 draws, 277 geometry registrations and 78 textures. The GL ledger counts 82 texture handles. Last-per-texture records reconcile the texture total: 346,176,578 bytes tagged `storage`, 58,720,256 `target`, and 28 `typed`. Upload-event byte values are cumulative and must not be summed. The largest dimensional group is 33 mipmapped 1254 × 1254 sRGB textures, 276,674,508 bytes. These tags contain no image URL; equal dimensions alone do not prove identical artwork.

The `target` tag means an initial null GL allocation, not ownership. The source API and five paint-ready phases establish the paint budget: they reach 73,400,320 texture bytes above the 28-byte bootstrap: exactly 70 MiB of colour/depth targets. First-render completion then reaches the full ledger. Subsequent uploads retain the last `native-civilian-paint-ready` phase label, so that label cannot attribute all later textures to character paint.

The smallest source-supported sharing proposals remain renderer-scoped, reference-counted native projection/validity leases (default five targets to two could save 42 MiB in this ledger's format) and a canonical URL/sampler cache for repeated building maps. Keep per-rig materials, paint-part initialization and mutable per-building state textures private; disposing one borrower must not invalidate others. Only one 768 × 576 trim texture was uploaded here, so this snapshot establishes no duplicated trim GPU saving.

Node peaks are 1,216,548,384 heap bytes and 1,411,821,568 RSS bytes; desktop render-ready heap is 1,111,522,043 bytes, separate from GL accounting. Physical source digest is `4ae3e6366d6389907f5a6ea13336c751e847d68fd313ea04c5b6e0c5dca4a4fc`. Disposal shows zero art/GL counters with `lost:true` and 861 truncated ledger events; it supports final teardown, not complete per-resource lease or cancel/retry proof. None of these desktop records establishes iPhone hardware acceptance or the crash cause.

Inputs under the coder worktree's `artifacts/qa/grass-mobile-startup/baseline/` are `browser-helper/browser-initial.json`, `browser-helper/browser-disposal.json` and `node-summary.json`. They were inspected read-only; no benchmark or helper was repeated. Runtime changes remain coder-owned.
