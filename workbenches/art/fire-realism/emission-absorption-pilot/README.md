# Paired display-referred emission / absorption pilot

Unaccepted artist candidate for architect proposal `5206d34ac405836e3f9fe970b26760abc74ebf16`. Frozen V5 All, soot, color, geometry, fields, source clocks, ground presentation and all earlier evidence remain unchanged. This is an optical experiment with one fixed control, not calibrated radiometry or an accepted reference/optimization.

## Fixed pair

Both named exports in `assets/art/fire-realism/fluid-surface-emission-pilot.js` create the original All effect and guard every unique owned material before mutation. They share byte-identical fragment GLSL and an internal read-only uniform: `createFluidSurfaceEmissionPilot` binds 0; `createFluidSurfaceEmissionOpacityControl` binds 6. There is no exposed tuning control. The draft-to-uniform refinement is recorded in `implementation-decisions.json`.

The common emission is `j = r*cFire/1m + ks*cSoot`; extinction is `ks + coefficient*r`. One metre is an approved authoring normalization, not a measured physical coefficient. The palette, temperature proxy and smoke formula come from original All. The exact shared Three180 `sRGBTransferOETF` encodes local source colors before integration. The small-tau cubic limit preserves `q -> ds`; the associated output retains nonzero emission at absorption alpha zero, with explicit ONE / ONE_MINUS_SRC_ALPHA for RGB and alpha. No final gamma, alpha division, second alpha multiplication or opacity-only early termination is applied. Actual opaque-depth termination and bounded source/ray/plane/readability rules remain.

The original prepare, payload evidence and RGBA audit exports are direct aliases. A selected candidate uses the original one document-lived store and the same 193 resource paths once. This candidate adds no textures, geometry, lights, render passes, field data or per-frame asynchronous work; actual rendering cost has not been measured.

## Root's public GPU probe

1. After exact intake, use a fresh, separate document at `/workbenches/art/fire-realism/emission-absorption-pilot/probe.html` on the architect's bounded preview. Do not open it in the comparison document.
2. Press **Run native GPU checks** once. The page verifies the helper-only manifest before importing the production transfer helper. It uses shared Three180 and the same GLSL and fixed uniform bindings. It loads no V5 field resources or store.
3. Inspect the visible JSON and **Open exact JSON** link. Require `pass-native-gpu-numeric-only`, all 22 unclipped cases, the additional actual-default-target case, source/kernel hashes, zero errors, correct explicit blend state, format/encoding and successful cleanup. Cancel is public. A failure blocks native morphology review; there is no hot retry in that document.

The bounded 8 by 8 RGBA8 NoColorSpace/LINEAR UNORM attachment deliberately stores display-referred values. Tests cover pure emission at alpha zero over known backgrounds, Beer attenuation, homogeneous subdivision, small optical depth, readability fade, ordered associated bands and paired F=0. Per-channel tolerance is 2 UNORM8 levels, subdivision delta 2, paired F=0 delta 1. All test vectors are checked against clipping. A separate default-target draw checks that the shared source OETF does not turn into a second accumulated-color output conversion. Hardware/context, actual blend state, target format, shader/helper hashes, readbacks and failures are public.

The one-shot 20-second deadline is wall time, not a GPU measurement. The probe has no timer queries, animation loop, capture stream, worker, private evaluator or persistent helper. It individually disposes its two materials, plane, target and renderer, removes listeners/timer/canvas and loses only its own context. Root must verify the actual cleanup receipt and close the probe document.

## Reproduction and checks

Run from the artist checkout:

```text
node workbenches/art/fire-realism/emission-absorption-pilot/manifest.mjs
node workbenches/art/fire-realism/emission-absorption-pilot/check-transfer.mjs
node --experimental-vm-modules workbenches/art/fire-realism/emission-absorption-pilot/check-integration.mjs
node workbenches/art/fire-realism/emission-absorption-pilot/check-probe-source.mjs
node workbenches/art/fire-realism/emission-absorption-pilot/check-closure.mjs
```

`manifest.mjs` only writes the two additive manifests, helper-only probe manifest and probe hash config. It refuses changed frozen All sources/resources. Integration tests use actual shared Three with a synthetic two-voxel fixture; they establish API, ownership, clock/depth preservation and cleanup, not GPU rendering or realism. Source/vector tests and closed-form double arithmetic do not replace the actual probe.

## Remaining decision

The approximation accumulates and blends in an encoded target and remains subject to UNORM clipping/rounding, band sorting and encoded-space color errors. Temperature is an uncalibrated solver proxy. A full linear compositor remains unapproved. No native result, sampled-F=0 tail equality, morphology score, R freeze, O saving, master promotion or publication is claimed.

Root must capture the fixed pair at matched native isometric/oblique phases, including source-age/current-next blend diagnostics, terminal/tail states and played motion. Compare the pair to isolate extinction and historical All to assess improvement. Reject brighter fog, washout, lost dark channels/tongues, band seams, popping, lost smoke or reduced actor readability. The preexisting ground-char width/stamp transition is unchanged and needs a separate authoritative fuel-progress/coder correction. All wider tool/powder/pause/reset/camera/HUD and valid hardware-cost gates remain outstanding.
