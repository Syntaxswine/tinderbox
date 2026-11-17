# Proposed next boundary: carrier-local continuity candidates

Status: accepted as the next separate bounded experiment after this attribution;
not implemented or measured here. The accepted final `0e1ab9dd` code, prior
measurements and this attribution stay frozen.

The first-use continuity block accounts for 1.068 sampled inclusive seconds;
its global candidate-query subpath accounts for 0.735 seconds. The current block
queries the whole native scene index once per registered patch, sorts candidates,
then discards candidates with a different source carrier or without a native node.
The held window shows the same path at 0.661 / 0.284 seconds. The scene constructs
its index with the existing native default one-metre bins.

The smallest proposed experiment changes only that continuity calculation on a
cache miss. Construct a temporary `createBoundaryIndex(list)` from that carrier's
current registered native fragments and use its candidate query in the existing
loop. Reuse the native binning, bounds/overlap behavior, EPS, thickness margin,
locale ordering and exact ordered `supportSurfacesTouch(a,b)` predicate. Keep the
original `a.id < b.id`, carrier and node-membership conditions. Do not modify
cross-carrier contacts, regions, roles, anchors, rebuild schedule or live filtering.

```js
// Proposed shape only; this is not an installed runtime implementation.
calculate('continuity:' + id, [id], () => {
  const local = createBoundaryIndex(list);
  for (const a of list)
    for (const b of local.candidates(a.bounds))
      if (a.id < b.id && b.sourceCarrierId === a.sourceCarrierId &&
          nodes.has(b.id) && supportSurfacesTouch(a, b))
        add(a.id, b.id, true);
});
```

The list includes original retired fragments exactly as the current calculation
does. It is not filtered to surviving material, and it cannot select replacement
owners. Actual live filtering and local retirement retain their existing meaning.
Poses/geometry invalidate the current edge block through owned subscriptions;
the temporary index is reconstructed from current native data on the next
original rebuild boundary. It creates no cold geometry or thermal/fuel state.

The temporary bins contain references to already registered fragments. They are
not retained after that synchronous calculation; there is no persistent index
variant or new subscription. At most one such temporary index is in build scope.
Actual peak records/bin memberships and GC/heap effects still require measurement;
becoming unreachable is not a claim of immediate physical memory release.

Before any authorized timing run, require exact ordered candidate-ID equality
against the old global query after its original carrier/node filter, and equality
of all actual predicate inputs: bounds, clipped/solid triangles, kind, normal,
thickness and pose. Cover native clipping boundaries, multiple parts, asymmetric
open facets, thick floors, door poses, cold/active transitions, original local loss
and no remap. Preserve the full directed graph, physical/damage/fuel/heat/replay
digests and raw host contract. Verify zero new cold transforms, fuel/thermal births
and global subscriptions, and bound temporary storage by the current carrier's
registered fragment/bin counts without truncating geometry.

This targets unnecessary scene-wide enumeration in one existing algorithm.
Fresh compilation, cross-carrier contact, graph replay and other activation work
remain separate measured costs. No input-latency target or improvement is claimed,
in this attribution. The architect's subsequent instruction separately authorizes
focused equivalence checks and one bounded unprofiled continuity experiment after
this checkpoint. Family/port/block/material work stays outside that boundary.
