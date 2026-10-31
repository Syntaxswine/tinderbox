# R0.9: calibrate attached ground reaction in native metres

This is a quality prototype before reference freeze, not an optimized variant or an accepted baseline. It follows rejected0.8 (`13ad95c2d131e3dab28e775c1d33c121ea50d5ed`) and the separate immutable-control preservation child `68d649fa44ef1c05eaaa9737c5f739e82b15b639`. Published gameplay, source fuel/heat/clock rules, native geometry, exposure and underlay are unchanged.

## Actual evidence and reference reading

The primary's `render-round-13-controlled-diagnostic09` separates All/flame/smoke and32/64 at actual frozen phases. I viewed native60 All/flame32/flame64 and120 All/flame32/smoke32. Smoke obscures reaction, but flame-only remains weak at120;64 does not appreciably recover the inspected flame. The real RGBA8/LINEAR/UNSIGNED_NORMALIZED unit probe's sub-unit controls agree, while linear1.65 at alpha0.25 over black reads64RGB straight versus79RGB correctly associated.

The following `render-round-14-field-association10` confirms actual field source factors SRC_ALPHA770 versus ONE1, correct associated shader and successful restoration. I viewed native associated All/flame at60/120. The gain is modest and All120 remains pale. The lossless actual source has four0.5m cells at intensity1 at all15/30/60/120 phases;120 still has0.03041666666666665 surface fuel per cell. This is not a legitimate intensity fade or burnout.

I re-opened the existing DVIDS112603 exterior service file, NARA6349328 original and DVIDS9219073 room-training file. The exterior has dense attached orange/ivory reaction surfaces, dark structural openings and a broad dark soot plume. Its fully involved wood structure, fuel burden and camera exposure cannot set the size or optical coefficient of an early grass match. The distant NARA jet remains a bright connected line in daylight; this supplies a readability cue, not changed stream reach or geometry. The room image is primarily smoke/firefighter evidence, not a clear attached-flame calibration. All five verified [reference records](../../../art/source/fire-realism/references.json) and their bytes remain untouched; no photographic pixels enter the renderer.

## Bounded correction

The common fragment output now associates encoded RGB by FINAL alpha after colorspace conversion, including player legibility. The material uses NormalBlending with premultipliedAlpha:true, selecting the matching ONE source factor. There is exactly one association, no state-only brightening, additive shortcut, global exposure change or HDR pipeline.

Regional ground fire uses extinction22.2 per native metre instead of7.4. This is a bounded prototype response to loss of integrated density in the non-overlapping physical domains; it is NOT proof of physical equivalence to three former local overlapping envelopes. The1.65 linear emission ceiling/color ramp,32 physical renderer samples and all useful detailed geometry remain.

The added lower attached contribution is `(1-smoothstep(.025,.24,h))*(.035+.36*sheet)*(.35+.65*pocket)`, before the existing actual intensity/outer-coverage factors. Here h is metres above the native contact base. Shared sheet and pocket values prevent an independent per-cell stamp. The layer approaches zero smoothly and is EXACTLY zero from0.24m upward, retaining genuine higher sheet/air gaps. It has no flat lid or persistent column floor. Curved height, sheet bandwidth, rising flow, upper pockets, zero outer occupancy/full internal joins, mask cutoff and opaque per-sample termination are unchanged.

The jet, torch, facade and smoke shape/density/emission branches are byte-unchanged; they receive only the correct common RGB association. Sub-unit paths are mathematically equivalent apart from quantization. High-value flame components can change visibly, so actual torch/jet regression review remains required. No source, light, fuel, attachment, clock, finite tail or lifecycle change is used to improve the picture.

## Source quadrature, not pixel proof

[The reproducible audit](../../../workbenches/art/fire-realism/audit-ground-optics.mjs) and [full numerical receipt](calibration-09-ray-audit.json) use actual full-intensity source phases and pinned isometric/oblique cameras. They integrate128 midpoints per exact non-overlapping source AABB interval, with the native live mask and zero-edge shared field. Value noise is evaluated in JS double precision; GPU float/fast-sin hashes can differ, and the true deformed shell shifts entry/quadrature phase. Raw opacity is measured before smoke, player legibility or scene-depth occlusion. This is neither GPU32 equivalence, rendered RGB nor quality/performance acceptance.

| Isometric phase | Control08 lower median | Extinction-only22.2 | R09 contact +22.2 |
| --- | ---: | ---: | ---: |
|15|0.239|0.560|0.622|
|30|0.381|0.763|0.820|
|60|0.349|0.724|0.767|
|120|0.192|0.472|0.492|

At120 the oblique lower median changes0.174 to0.436. Upper rays below0.02 opacity remain about72% isometric/60% oblique. These distributions support testing greater attached optical depth while preserving voids; they cannot show whether foreground smoke still overwhelms it or whether broad street fronts become overly solid.

## Isolation, checks and next gate

The current art fixture's normal synthetic views use R09. **DIAGNOSTIC08** lazy-loads the exact original five JS files/manifest from its own self-contained workbench directory; its original proof hashes do not silently become R09. The original association wrapper rejects already-associated source. Workbench controls are excluded from the shipped game.

Focused optics guards constrain the exact source delta, verify proper single association/state and compare every prepared source attribute, sorted ID, owned source texture and light against control08 for four actual match phases, normal/powder edges, finite torch and the real25-ray independent resolver case. Existing mask/seam/entry-exit/order/reset/rewind/depth/facade/smoke/lifecycle checks pass. Full repository186/186,165 own-script syntax/205 module checks, strict shared source/dossier2/2, build3462files/163368273bytes and whitespace checks pass.

The architect must compile this exact R09, capture played full-intensity contact phases and normal/powder/street motion, then check jet/torch/opaque-camera/readability regressions. No new R09 WebGL image or motion was generated by the artist. No helper, browser or server was started; no reference freeze, optimization credit or cost claim is made.
