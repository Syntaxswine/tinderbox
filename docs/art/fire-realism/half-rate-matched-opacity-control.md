# Half-rate matched-opacity control

This additive, unrendered control implements architect contract `cbcaa51c99880974c409f837765929d5c32e7bf5:docs/proposals/half-rate-matched-opacity-control.md`. It preserves the [frozen diagnostic02 delivery](half-rate-diagnostic-02-delivery.md) and its failed raw qualification. `rawGatesPassed`, `admitted` and reference acceptance remain false; optimized mode remains unavailable.

The [new entry](../../../assets/art/fire-realism/fluid-half-rate-matched-opacity.js) derives from the exact 13,701-byte factory in `f63711f1e0ffe2316ebc993fe04013ab152956ee`, SHA-256 `df2fd1c2db58b72c96f59d20d3a15ce583d982ac0d34028af53bb94b62866a43`. Only ten static imports are rebased, four exports/diagnostic labels are distinguished, and the existing generator/uniform selections change from `smoke-only` to `matched-opacity`. The [source derivation](../../../workbenches/art/fire-realism/half-rate-matched-opacity/source.mjs) reverses these edits to recover the complete original factory byte-for-byte.

The sole optical difference is the fixed flame-extinction coefficient 0 to 6. Emission remains `j = 6r * displayFire + ks * displaySoot`; extinction becomes `k = ks + 6r`. Both mode selections generate byte-identical GLSL, with the existing fixed uniform supplying 0 or 6. The original palette, local sRGB OETF, associated output/blend, step integration, smoke clearing, player legibility, light, floor, geometry, A/taper/depth, source clocks and tail retirement stay unchanged. This is an existing diagnostic coefficient and author normalization, not calibrated fire physics or photographic radiometry.

One module-level store serves all four distinct exports:

- `createHalfRateMatchedOpacityControl`
- `prepareHalfRateMatchedOpacityData`
- `auditHalfRateMatchedOpacityRGBA`
- `halfRateMatchedOpacityPayloadEvidence`

The [separate manifest](../../../assets/art/fire-realism/fluid-half-rate-matched-opacity.manifest.json) declares exactly 61 modules: the new entry plus the original 60 immutable dependencies. All 193 original binary resource records remain identical; no geometry, packets, store implementation or data are duplicated. Existing data evidence is the 193-frame/579-channel CPU audit `41a1c74f85987a7dc831a6bf7e6531de7c23e61e5ab289fdc1aaeae728bb37f7`, not a new audit of this control.

The [tiny source/transfer checks](../../../workbenches/art/fire-realism/half-rate-matched-opacity/check.mjs) pass eight groups plus three syntax checks: exact reversible source delta, shared-store export flow, reachable closure/Git source identities, unchanged binary declarations, identical shader text/fixed uniforms, correct matched-opacity closed form, finite zero limits and nine fixed cases subdivided into 1/2/17/120 segments. The smoke-only normalization oracle is deliberately not used for `k=ks+6r`. Checks read no binary fields/resources and evaluate no full effect, geometry or data namespace.

Native review remains necessary: the bounded homogeneous response can still be too opaque, conceal dark channels or retain over-range color. No rendered pixel equality, morphology improvement, raw admission, reference freeze or cost result is claimed. R30 `native-heat-v1`/`char-v1`, diagnostic support restrictions and the original terminal residual remain as documented in the frozen delivery. Descriptor changes, R32 capture and promotion belong to the architect.
