# Coupled corner transport source candidate

PRIMARY commit `8314fa36f58fff7cf8f04ce13ff460d2dd2674eb`,
`docs/proposals/coupled-corner-transport.md`, authorizes this source candidate.
It wraps immutable C90 and reuses its 64 modules, 193 resources and one original
store. The three data functions are exact aliases, with no new bootstrap.

Corner F²P becomes FP before the original spatial and temporal filtering. The
private flame-extinction coefficient changes from 0 to 6, using the existing
`reacting = filteredF * G`. Thus `j = 6G*filter(FP) + ks*S` and
`k = ks + 6G*filteredF`. Clear homogeneous `j/k = P`; mixed corners produce an
F-weighted palette. The same 6 and G occur once. Units are uncalibrated, with no
Kelvin, physical radiometry or independent gain/opacity claim. Palette, raw RGB,
smoke, associated output, blend, light, depth, geometry, masks, clocks and the
common Neutral/exposure1 route remain fixed.

All 92 distinct materials must match the complete 6,843-byte C90 fragment,
original vertex and uniform0 before any write. One source substitution and a
fixed uniform6 have a full fragment/optical-state inverse. The inverse fixture
restores the original uniform object identity and vertex. `needsUpdate` is
standard program invalidation, not a reversible GPU/cache-state claim. A
refusal or setter failure disposes the delegated private effect; a cleanup
failure retains both errors.

From the repository root, run:

```
node --experimental-vm-modules workbenches/art/fire-realism/coupled-corner-emission/check.mjs
```

This uses pure shader strings, CPU expectations and synthetic VM effects.
No real data namespace, prepare/audit/factory, renderer, GPU or helper executes.
Four syntax checks cover the two new runtime files and source.mjs/check.mjs.
The 193-resource decode audit is inherited, never replayed here. Parent Git
attributes append only the three literal LF rules; all previous raw bytes stay.

R32 already tested true6r/6r with a biased post-filter palette/local OETF on older
fields. R34 used corner F² over raw-F extinction. Matched transport is not
claimed untried, and these CPU values are not measured pixels. A darker filled
mound, black block, lost useful height/roots or changed smoke/tail rejects this
model; no brightness rescue, sweep or automatic bake follows. Raw/admitted/
inputE/reference flags remain false, including frame97's 50 positive values and
frame98 zero. Upper overhang/native bounds, global8 quality, useful R, optimized
equivalence and hardware 20–33% remain unproved. ROOT owns independent source
clearance and any later native R40 release.
