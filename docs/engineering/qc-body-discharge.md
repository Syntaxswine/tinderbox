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

For flamethrower, `origin === shapeOrigin` by value. Rays are angularly ordered across the configured cone and resolve to the first heat-blocking wall/fence or world boundary, with a small skin before solid surfaces. An unobstructed centre ray reaches 4.5 m. For torch, `lead` runs from bear centre to its existing collision-resolved heat point (at most 1.1 m); `shapeOrigin` is that point and the rays bound the local 0.4 m heat disk. Torch lead uses the existing tool-impact rules; the disk/cone thermal queries retain their existing non-shielding barrel behavior.

Rays include regular samples and occluder-corner samples so a narrow wall cannot be bridged by a filled fan. `connectRays:true` permits triangles from `shapeOrigin` through adjacent endpoints. When the finite vertex budget would be exceeded, `connectRays:false` supplies a bounded set of independently clipped rays instead; do not join them across occlusion gaps. At most 256 rays are returned. `distance` is measured from `shapeOrigin`, except the separate torch lead which explicitly supplies its two endpoints. `obstacleId:null` means range/world limit, not permission to extend the ray.

The model owns heat, range, obstruction and active state. Art consumes the resolved shape; it must not query scene meshes or terrain to rediscover targets, move the shape to the cosmetic muzzle, extend endpoints, or apply damage. The cosmetic muzzle may lie past a nearby wall because held equipment can protrude. In that case, hide/clip the cosmetic muzzle flare to the authoritative shape rather than start a jet on the far side. A rendered plume must stay within the returned cone/disk/lead mask. Thin wood can occupy a partially covered heat cell: heating that surface cell is retained, while the presentation stops at the actual wood surface.

`active` is cleared when release, pause, cancellation, tool change or death is processed. Empty fuel stops held input and returns the inactive shape. A final partial-fuel tick may still deposit its correctly prorated heat before becoming inactive; it cannot leave a stale jet in snapshots. Taking a drug leaves the held source/pouring controls intact. Presentation does not reroll or advance heat. The shape is regenerated from the final accepted pose/obstacles for each fixed tick and snapshots detach all point/ray objects.

Implementation and verification results will be recorded here with the final candidate. This contract requires an artist consumer update before the combined production scene can use the new authoritative discharge.
