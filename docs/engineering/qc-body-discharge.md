# TB-004 QC follow-up: body footprint and held discharge

Contract for the architect to pass to the artist. It extends snapshot v1 without changing existing fields. Changes are confined to coder-owned simulation/runtime diagnostics, tests, examples and engineering notes; production art/UI and root composition/build files remain outside this fix.

## Body footprint

`player.radius` is the authoritative circular body radius in ground metres. Default: **0.56 m**, replacing 0.23 m. It covers the declared 1.06 m shoulder width (half-width 0.53 m) and core forward muzzle/nose extent of the provisional 2.02 m bear. Reaching equipment/held-tool poses remain cosmetic. Rendering must not shrink the gameplay footprint. Spawns are validated against the same radius as accepted motion.

## `snapshot.discharge` version 1

Every snapshot contains this serializable object. The inactive form has `active:false`, `tool:null`, null origins/lead, zero ranges, `rays:[]`, and `connectRays:false`.

```js
{
  version: 1,
  tick: 123,
  active: true,
  tool: 'flamethrower',           // Or 'torch'; null when inactive.
  origin: {x: 4, y: 8, h: 1.05}, // Authoritative bear-centre source, not cosmetic gun tip.
  shapeOrigin: {x: 4, y: 8, h: 1.05},
  heading: 0,                    // Radians from ground +X toward +Y.
  range: 4.5,                    // Configured reach from origin.
  radius: 0,                     // Torch heat radius is 0.4; flame has zero disk radius.
  halfAngle: Math.PI / 8,        // Torch disk uses Math.PI.
  connectRays: true,
  rays: [
    {angle: -0.3927, x: 8.15, y: 6.28, h: 1.05,
      distance: 4.5, obstacleId: null}
  ],
  lead: null                    // Torch: {from:{x,y,h}, to:{x,y,h}}.
}
```

All coordinates are absolute world metres; Three coordinates are `(x,h,y)`. Heights describe presentation of a planar heat model. Obstacles block held heat irrespective of height, as before; this is not a new 3D ballistic heat simulation.

For flamethrower, `origin === shapeOrigin` by value. Rays are angularly ordered across the configured cone and resolve to the first heat-blocking wall/fence or world boundary, with a 0.0001 m skin before solid surfaces. Adjacent triangles are also tested against blockers and conservatively shortened at corners; this polygon can slightly underfill the continuous heat cone but can never authorize a jet beyond it. An unobstructed centre ray reaches 4.5 m. For torch, `lead` runs from bear centre to its existing collision-resolved heat point (at most 1.1 m); `shapeOrigin` is that point and the rays bound the local 0.4 m heat disk. Torch lead uses the existing tool-impact rules; the disk/cone thermal queries retain their existing non-shielding barrel behavior.

Rays include regular samples and occluder-corner samples so a narrow wall cannot be bridged by a filled fan. `connectRays:true` permits triangles from `shapeOrigin` through adjacent endpoints. When the finite vertex budget would be exceeded, `connectRays:false` supplies a bounded set of independently clipped rays instead; do not join them across occlusion gaps. At most 256 rays are returned. `angle` is an absolute world angle, ordered without wrapping across the heading; it can lie outside [-pi, pi]. `obstacleId` identifies the limiting blocker, including conservative corner trimming. `distance` is measured from `shapeOrigin`, except the separate torch lead which explicitly supplies its two endpoints. `obstacleId:null` means range/world limit, not permission to extend the ray.

The model owns heat, range, obstruction and active state. Art consumes the resolved shape; it must not query scene meshes or terrain to rediscover targets, move the shape to the cosmetic muzzle, extend endpoints, or apply damage. The artist reports a cosmetic lance muzzle at local +1.07 m forward, +0.29 m sideways, h=1.05 m, which can lie past a nearby wall despite the body clearing it. Clip or hide the protruding weapon portion and muzzle glow whenever they fall outside the authoritative shape. Never start flame at that far-side muzzle or draw a bridge from the root through the wall. The flamer has no cosmetic root-to-muzzle lead; its `lead` is null. Only torch supplies an authoritative lead. A rendered plume must stay within the returned cone/disk/lead mask. Thin wood can occupy a partially covered heat cell: heating that surface cell is retained, while the presentation stops at the actual wood surface.

`active` is cleared when release, pause, cancellation, tool change or death is processed. Empty fuel stops held input and returns the inactive shape. A final partial-fuel tick may still deposit its correctly prorated heat before becoming inactive; it cannot leave a stale jet in snapshots. Taking a drug leaves the held source/pouring controls intact. Presentation does not reroll or advance heat. The shape is regenerated from the accepted player pose and the obstacles at emission time in each fixed tick (a later same-tick burnout may remove a blocker; that tick keeps its conservative emitted shape) and snapshots detach all point/ray objects.

## Implementation and verification

Implemented on `codex/coding` after contract checkpoint `33dd929f92c9834b1b235aaf7f6a016420020082`. Exact final candidate SHA is the handoff reply/branch tip. Changed paths are restricted to `src/simulation/{config,geometry,index,tools,discharge}.js`, `src/runtime/diagnostics.js`, `tests/simulation/{model,body,discharge}.test.js`, `workbenches/simulation/{example-snapshot.json,qc.html,qc.js}` and these engineering notes. Production art/UI, package.json, root composition/build/check/serve files and vendor bytes were not changed.

- `npm run check`: **36/36 tests pass**, 23 own scripts pass syntax, 21 statically reached modules resolve, exactly one shared Three r180 pair and both provenance inventories pass. `npm run build` passes using the existing coder diagnostic build.
- Four new body tests validate every published spawn, reject old narrow clearance, exercise a rounded-corner chord whose endpoints are individually free, sample every accepted segment at <=1 mm through normal/powder/high-speed masonry/fence/drum/edge cases, verify finite gas against accepted metres, and distinguish a 1.10 m blocked gap from a 1.20 m traversable one. Movement still substeps at <=0.04 m, with an exact swept-disc distance check on each accepted segment and slide. Radius is available in every snapshot.
- Nine new discharge tests cover full 4.5 m reach and matching heated-cell ranges, world-space serialization/detachment, masonry and thin wood occlusion when the cosmetic muzzle is already beyond a wall, off-axis narrow blockers and filled-triangle corner safety, torch lead/disk clipping, release/pause/cancel/tool-change/reset/death, zero/partial stock with proportional heat and one empty event, powder/inversion/player-time fuel, rotated aim, world boundaries, bounded complex-mask fallback, and identical active output at 30/60/120 render Hz. The existing 23 fire/time/fuel/input tests all remain green, including powder while pouring and exactly-once raw-stick inversion.
- Packaged `dist/` browser review passes at **1280x800** and **390x844** in the Codex in-app Chromium browser. The free jet centre reaches 4.500 m; the wall fixture centre stops at 0.700 m despite a cosmetic muzzle beyond the wall; torch lead stops at 0.698 m with its forward disk ray limited to 0.002 m. The narrow-corner fan shows the model's shadow gaps. Release and pause clear all ray/lead geometry; powder retains held emission with separate player/world clocks. No browser warnings/errors, one canvas, and no portrait horizontal overflow. The packaged factory page again passes six WebGL create/update/dispose cycles, shared Three, scripted blur pause/cancellation, frozen clocks/safe resume, and failed-factory/update cleanup.

Reproduce the diagnostic at `/workbenches/simulation/qc.html` after starting the existing server. `tools.presentationHeight` is centrally tunable (default 1.05 m); it changes presentation height only. The diagnostic ring uses `player.radius`; its orange lines/fan consume the same snapshot shape intended for the artist, with no scene collision queries. This is geometry evidence using stand-ins, not production flame art.

Thermal behavior remains the existing planar, coarse-grid model. A torch disk heats intersecting cell footprints, so a partially covered cell centre can fall outside the nominal disk; wood surface cells can straddle a thin fence. The returned mask remains conservative and clips at actual solid geometry. Barrels retain their existing non-shielding cone/disk thermal behavior, while the torch lead follows existing impact rules. Complex masks return independent rays with `connectRays:false`; an artist must honor that fallback. This delivery requires an artist consumer update before the combined production scene can render the new authoritative discharge.

Ignored local evidence: `artifacts/qa/qc-discharge-{free-desktop,wall-desktop,corner-desktop,free-phone}.jpg` and `qc-body-discharge-browser.txt`. No retained helpers remain. The registered hidden loopback preview (PID 60680, creation `2026-10-27T21:39:59.7968155Z`, registration `7182de8711dc4f5ea9b54de365ed24f9`) had an actual ten-minute self-expiry and was stopped after review through its private STOP file. PID/creation/executable were revalidated, process exit and port 4550 release verified, owned tab closed and viewport reset. `artifacts/helpers/qc-body-discharge-01/` holds the receipt and 30 hash-verified served source/dependency files, restart arguments and runtime requirements. Restarts are deliberate and require a fresh process registration.
