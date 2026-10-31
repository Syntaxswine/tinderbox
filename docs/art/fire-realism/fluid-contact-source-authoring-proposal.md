# Proposal: one additive surface-source contact candidate

Status: **proposal only; no authoring, Blender launch or bake is authorized by this document**. Architect approval and critical runtime review precede source implementation and a separately confirmed finite run. This proposal addresses one canonical four-cell grass source, not a scene matrix, persistent loop, optimized mode or accepted R.

## What the evidence supports

I viewed all six round20 reaction-only native stills and all three raw-slice screenshots in the primary `artifacts/qa/fire-realism/render-round-20-reaction-diagnostic/`, as well as round19 All views, the verified USFWS grass photograph and bounded original motion representatives. The square hot bed and narrow mature body remain with CFD smoke removed. The lowest measured raw plane is almost uniformly hot; a renderer cannot create separate roots missing there. The original recipe constructs a filled square inflow with only sub-voxel top jitter; it requests full interior emission when that RNA property exists. The actual observed field, rather than an assumed default, proves the basal reservoir.

The independent [UI causal review](C:/Users/baals/.codex/worktrees/fire-ui-reconcile/tinderbox/artifacts/qa/fire-realism/hostile-review/round-11-reaction-diagnostic/ui-source-vs-optics-review.md) adds a necessary limit: middle planes contain separated arcs and changing unequal lobes, and upper planes contain smaller structure. Reaction-only largely merges them. **The current native baseline fails; the entire dataset is not proved useless, and a source change alone is not proved sufficient.** Horizontal slices do not establish convincing three-dimensional folded tongues. Transfer/path-opacity loss remains open. No transfer experiment, new coefficient or optical gain is assigned or implemented here.

There is a second demonstrated source defect at retirement. Read-only original full-grid statistics give:

| Source age | Maximum raw flame | Positive voxels | Sum(flame) × voxel volume |
| --- | --- | --- | --- |
|3.0 s|0.9682459831|6,822|0.2553892467|
|3.1666666667 s|0.8086719513|6,580|0.1903639857|
|3.2 s|0.6347984672|4,936|0.0940095370|
|3.2333333333 s|0.3931637108|2,328|0.0254207066|
|3.2666666667 s|0|0|0|

Thus the actual 3.2-second gameplay gate removes substantial residual authored reaction. This scalar sum is an uncalibrated field-volume proxy, not energy or luminosity. Earlier source withdrawal is justified; altering game fuel, delaying burnout or adding a post-gate shader fade is not.

For context, a simple horizontal centre-row quadrature of the existing raw slices at phase60 gives optical depth about4.72 at0.104m and2.42 at0.313m under the current6/m bulk mapping, corresponding to theoretical alpha0.991 and0.911. This is **not a native-camera ray, depth trace, GPU readback or proof of the transfer defect**. It explains why useful spatial variation may merge even without smoke; this proposal does not claim that surface authoring resolves that limitation.

## One causal source design

Replace the filled bed with **one connected, asymmetric, three-lobed open surface** at the original bed-bottom height0.02m. Unequal bent lobes, off-centre necks and two broad concave notches span the existing bed; they do not form three identical posts or a tile lattice. Their projection stays within the original two-voxel inset, with genuine emitting area in each of the four actual fuel cells. Draw and record the exact source mesh/normal/bounds before any run. Primary lobe width is about0.25–0.30m, secondary about0.18–0.24m, smallest about0.14–0.18m; broad differences are resolved by several96-domain voxels, unlike the original less-than-one-voxel top jitter. These are explicit art-authoring choices, not measurements of the photograph or new gameplay fuel distribution.

Use a planar mesh flow (`use_plane_init=true`), **surface distance1.0 voxel** and **volume_density=0**. This removes the continuously replenished interior slab rather than hiding it with opacity. Keep `BOTH` flow type, density1, fuel amount1, temperature2 and flame-smoke1 outside the finite terminal envelope. No smoke is dropped from the final All presentation. Do not use a density vertex group as an assumed fuel mask; the exact source geometry supplies the spatial variation. Upward normals and the ground effector must be verified.

The unequal source widths/concave gaps produce differentiated upflows and cooler entrainment lanes across a broad footprint. Their shear and mutual interaction are intended to roll and merge into rising folds, rather than collapse immediately into the symmetric central chimney produced by the old square. Pin domain **vorticity0.25** for a single modest rotational contribution; retain flame vorticity0.5. Keep gravity−9.81, buoyancy alpha/beta1, ignition1.5, maximum flame temperature3 and burning rate0.75. No external wind, initial velocity, animated source displacement, procedural shader noise, up-resolution noise or guiding domain is added. Vorticity can add small swirls; it does not itself guarantee broad folds. The proposed source topology, rather than increasing a turbulence number alone, carries that hypothesis.

This thin source may reduce path-integrated flame too much or still merge into one stem. That risk is explicit. **No optical gain rescue is allowed**; visible attached reaction and a differentiated moving body must survive under the unchanged All/reaction-only optical mappings. Three static candles also fail.

## Finite source and unchanged clocks

Preserve193 samples, age0..6.4 inclusive at30Hz, observed zero initial fields, no preroll, the actual ignition receipt, native world-time playback and the actual3.2s all-height reaction gate. Powder and pause remain the existing world-clock behavior. No retiming, reversed sequence, loop or sustained-source benchmark is implied.

Use one declared source envelope: full authoring fuel until **age2.6**, smooth withdrawal from2.6 to **3.0**, then **inflow off from3.0 onward**. The previous source reached zero only about0.0667s after its3.2 endpoint; stopping injection0.2s earlier provides a measured burn-down margin. This is a hypothesis from the old recipe, not a promise that the changed surface has the same delay. The original game fuel, damage and source eligibility still burn for3.2s. Earlier withdrawal is a declared finite visual-source setup, not a simulation edit.

The required raw terminal gate is **every actual flame voxel exactly zero at age3.2 and every later sample**, through6.4. Count and export all values, including faint positives; never threshold, crop, overwrite a terminal frame or force a scalar fade to pass. If the criterion fails, preserve the candidate and stop. Retain smoke density and its existing finite tail/explicit endpoint retirement. With unchanged light inputs, native motion must also show no noticeable unattached spill or abrupt terminal pop; failure does not authorize a light adjustment.

## Exact additive implementation boundary, if approved

- New original authoring folder: `workbenches/art/fire-realism/mantaflow-surface-source/`, containing its own source recipe, settings and provenance. Preserve every original contact author/settings/grid/supervisor, .blend, cache, f32 array, manifest and QA image.
- New candidate asset folder: `assets/art/fire-realism/fluid-contact-surface/`, with its own metadata, geometry, gzip resources, preparation state and complete raw static import/resource manifest. Do not import the old `index.js` or singleton store, which could load the previous76MB dataset.
- Deliberately reuse/copy pure unchanged codec, direct RGBA decoder, scalar-space/support utilities, source clock and optical shaders with exact original hashes/provenance. Create one new store only for the new dataset. Existing native adapter/depth/player/camera/output paths remain untouched.
- Reuse the verified portable Blender4.5.15 build `5afeabba6097`, exe SHA `935e4bed28e51d08b8e1fbcc31dcccc000cc1c3dd065d82dcb1da813e75db795`, and the existing reviewed guard/registration logic. No install, custom solver, additional authoring system or renderer.

Proposed single-run limits: **15 minutes,2GiB process RAM,2GiB scratch, four threads, resolution max96, fixed2×2×4m domain, original lower padding/ground, fixed2substeps/CFL2, cache32, no adaptive domain/noise, seed1893, no retry or automatic repair/rebake**. The new task lifetime/deadline and exact reviewed source pins must be recorded before launch. A finite prepare-only invocation records actual RNA and geometry before the one bake; an unsupported/mismatched property stops without a fallback. Original process records are not reused as authorization for a new lifetime.

## Primary evidence and API uncertainty

The old executed recipe/readbacks are in `workbenches/art/fire-realism/mantaflow-contact/evidence/observed-prepare.json`, `authoring-run.json`, the preserved original `author.py` and raw-export/support reports. They establish the exact installed tool and observed old output; they do not verify new planar settings.

Official indexed API text describes planar surface emission and `volume_density` as interior emission; the flow controls include source enable and fuel amount. The [official Flow API](https://docs.blender.org/api/current/bpy.types.FluidFlowSettings.html) is a moving/current page, so new flags still require actual4.5.15 RNA readback. The [official4.5 domain API](https://docs.blender.org/api/4.5/bpy.types.FluidDomainSettings.html) documents separate global/flame vorticity and fuel reaction controls. The [official4.5 flow manual excerpt](https://docs.blender.org/manual/vi/4.5/physics/fluid/type/flow.html) identifies surface distance in voxels and distinguishes surface from interior emission. These support the causal design, not a realism claim.

Retrieval limitation: direct full-page requests returned HTTP402; only official indexed excerpts were available. No full manual inspection or new installed-build API observation is claimed. Actual requested/typed-stored/observed values, animation evaluation at key ages, planar flag, normals, surface kernel and zero interior emission must pass in the separately approved prepare. A missing RNA property or ineffective source is a stop, not permission for an unreviewed alternative.

## Gates and stop rule

Before any asset import, independently verify all579 raw arrays are full-sized, finite, bit-preserved and initial-zero; record all positive support and current/next one-voxel halos. **Any positive reaction voxel on a domain boundary or below ground fails.** The source mesh plus its unobstructed surface-emission kernel must remain inside the four-cell contact XY footprint. The planned0.02m surface and one-voxel kernel overlap the unchanged ground effector slightly; record that intersection and require zero actual below-ground reaction after the solver's collision handling. Do not lift roots, crop fields or waive the below-ground gate after a failure. Report any advected lower-band positive support outside A without deleting it; existing strict native lower A/inward taper and opaque termination remain mandatory. Negative interpolation halo bounds are reported separately from positive voxel centres and are stopped by actual floor depth. No old overhang receipt is reused: new measured source/pair halos need architect review before native integration.

Keep64MiB ESM,96MiB compressed/sparse,256chunks,2MiB gzip/4MiB decoded per chunk, two direct RGBA slots and once-only boot ownership. Failed sizing is a stop; do not lower precision or raise caps. No new API/data bootstrap mechanism is needed.

Inspect fixed raw planes and the same matched native phases30/60/120 in both existing cameras plus one oblique active→spent clip. No wider matrix. A successful morphology pilot must preserve unequal attached roots and show broad differentiated curling/rising structures with dark gaps through motion, with a legible native actor and smooth authored terminal burn-down. Raw iso-level/plane diagnostics may measure multiple branches at fixed declared levels, but those levels never crop exports and do not grant visual acceptance. Shape must survive in final All as well as isolated reaction; useful data alone is insufficient.

If one candidate remains a reservoir/stem, becomes three static candles, loses clear contact, violates raw zero/bounds/clock/byte gates, or needs arbitrary optical gain, **stop this source attempt and report the evidence**. No automatic second recipe, larger bake, cleanup of failed evidence or promotion follows. Transfer loss remains open regardless; architect chooses any separately approved transfer diagnosis. This proposal promises a bounded test of two demonstrated source defects, not8/10 or AAA acceptance.
