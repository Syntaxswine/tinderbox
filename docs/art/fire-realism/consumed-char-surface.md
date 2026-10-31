# Consumed-char surface source candidate

Architect contract: `docs/proposals/irregular-consumed-char-surface.md` at `e1fe8913ea6aca8d4bfdc32090fe41a637b526fc`. Derivative correction: `docs/proposals/consumed-char-uniform-derivatives.md` at `e30c90cab6957b3c8b50acec27d0b50c2ab6ebf9`. This is original Tinderbox GLSL authored for the artist assignment. It is an unconnected visual prototype; the native compiler, matched consumption phases and played burnout review remain pending. The round-28 regular patch and separate heat-pop evidence remain unchanged. This module does not repair flame morphology, alter heat presentation or establish a quality/cost score.

## Delivery and inputs

`assets/art/fire-realism/consumed-char-surface.js` exports only `CONSUMED_CHAR_SURFACE_GLSL`. Its two functions have local variables and return values; no texture, uniform, mutable global, clock, geometry, pass, light, history or disposal ownership is added. The caller supplies finite native-grid inputs: world X/Z metres, nonnegative connected distance and current width in **cell-normalized units**, consumption, and the positive native cell pitch. Convert the supplied distance/width to metres exactly once inside the scar function. Runtime integration is a separate architect assignment; preserve the legacy branch and all gas/heat/burning-alpha formulas.

Consumption is clamped to [0,1]. Both derivative operands/AA and their fixed noise work run before any varying eligibility return. An authoritative zero-consumption cell still returns exactly zero, including one adjacent to a charred cell; safe zero-width return happens before the boundary smoothsteps. The caller must keep its existing eligible cells/ground extent and connected distance. This module has no authority to sample another cell, add fuel/destruction or make a cold cell eligible. Scar coverage is zero whenever distance reaches/exceeds the supplied width; the antialias band stays inside that extent. Pigment is a linear RGB input for the existing ground material, with no extra output transfer or emission.

## Authored spatial design

Three fixed value-noise octaves have nominal lattice pitches .72, .288 and .1152 metres, weights .56/.29/.15 and a fixed orthonormal .8/.6 axis rotation. Cubic interpolation makes the field and its first spatial derivative continuous at each lattice boundary. Deterministic shifted coordinates and the metre pitches avoid locking the pattern to .5-metre fuel cells. This is a fixed procedural field, not evidence that combustion has those characteristic scales. It is translation-coherent, not a mathematical guarantee against every visible procedural motif.

The broad field erodes the supplied width inward by .02–.23 cell pitches (.01–.115 m at the current .5 m pitch). The finest octave makes occasional porous breaks instead of four repeated discs or a fully filled grey stamp. It also varies warm charcoal/brown pigment. These are authored interpretations of irregular scorched material. The existing verified USFWS/Hagerty grass reference informs the orange/dark-gap reading but supplies no pixels, radiometric calibration, measured scar contours or new rights claim. The source-bound round-28 frame193 supplied the concrete regular-patch defect.

Boundary AA uses `fwidth(distanceMetres + erosion)`, clamped to .0125–.12 cell pitches; fine porosity uses a bounded derivative band. Neither derivative includes consumption or width. This requires the existing fragment-stage derivative support. The runtime caller must invoke the function in uniform flow before any per-fragment guard/discard; moving derivatives inside this function cannot repair a divergent caller. The fixed noise work now also executes on cold fragments. Camera motion may change normal pixel filtering; the underlying coordinates/pigment do not move with the camera or time. Native zoom/readability and aliasing still require actual rendered review.

## Bounds and progression

For finite native inputs, each interpolated octave lies in [0,1]; the weights sum to one and the combined field is clamped. Every smoothstep mask lies in [0,1]. Coverage is `clamp(consumed,0,1) * body * extent * pores`, hence finite in [0,1] and exactly zero at consumed0. No consumed1 branch exists.

At a fixed point, distance, width, cell pitch and screen derivatives, the three spatial masks are independent of consumption: coverage is linear and nondecreasing in clamped consumption. If the current continuous width also grows, the radius and outer extent both grow while the AA band stays independent of width; neither mask can decrease. For the currently reviewed `.29 + .21*c` width and AA minimum `.0125*cell`, a conservative coverage slope bound is `1 + .21*(.75+1.5)/.0125 = 38.8` per unit consumption. Thus the final increment has no special discontinuity; this is an algebraic bound, not a native-pixel or temporal acceptance test. Changing connected distance/other neighbouring inputs is outside that fixed-point proof and remains part of runtime/native review.

The pigment shade lies in [.756,1]. Its RGB ranges are bounded by [.02646,.018144,.010584] and [.092,.060,.030], maintaining a warm dark palette. Pigment darkens continuously with consumption. It is invisible where scar coverage is zero; it is not heat or a physical soot concentration.

## Cost, checks and handoff limits

Each call has one fixed three-iteration loop, four scalar hash-sines per iteration and bounded interpolation/AA operations. Calling both functions adds24 scalar sine evaluations, no texture samples, resource allocations or draw passes. There is no cold-fragment procedural early-out assumption. No measured GPU cost or optimization credit is claimed. All ownership stays with the existing material; this export owns only source text.

Source verification covers JavaScript syntax, the single constant export/import closure, the two fixed pure function signatures and raw/Git identity. Bounds/progression above are analytical; no second CPU implementation is presented as a shader oracle. Actual GLSL compilation, the irregular silhouette, warm pigment, empty-neighbour containment and before/at/after native burnout are pending architect/runtime/UI review. No Blender, helper/server, image render/save, new photo acquisition or production wiring was run for this assignment.

Module raw LF SHA-256: `0a8b2ea290e4aea955879b8f21da551d52e9515cd34aaeb1635b468cff84e468`.

The new module is outside the current enumerated LF checkout rules. Artist staging preserves its raw LF bytes; architect intake should add its own explicit module LF rule before raw-served fingerprint review. Do not normalize a mismatched runtime hash during verification.
