# Proposed consumer interface for pair-local support regions

Status: **source-only proposal, unaccepted and unapplied**. This records the
architect's requested consumer boundary after the UI handoff. It does not import
family relationships, implement a new support rule, alter roles or authorize art.
The base-plus-ten preview and approved separate front 48 retain their own gates.

## Reviewed inputs and existing limitation

The artist proposal was read only from the assigned art worktree at HEAD
`88538bb687e06911d63f728a17bd8668448805fe`; its proposal files were uncommitted.
Review-package SHA-256 is
`a61291dc69000c7511db975c6688e02eeb39d5e2257b575bffc632c3e45bb271`.
Relationships SHA-256 is
`34b25f91d457fb65e611b89f182c0e05bb946d7506a0581b53e945a2d9731e06`.
The table has 3,276 canonical pairs / 6,018 `localRegions`, with stable pair and
region IDs. Its source interpretation is pinned to coder `2b350309`, diagnostic
`83ac99b3`, compact index `e9bee63a`, original binding `407c0f8b` and controls
`f3f28fda`. The later camera/input correction does not change these support inputs.
An immutable architect-approved archive is required before any implementation.

Current `source-support.js` selects the first attachment for each parent, then
cross-pairs every selected parent and child patch for a non-coplanar relation.
Appending the proposed table to that path would discard regions and create
unproved cross-bay links. A broad selector or shared carrier ID does not fix this.

## Normalize identities without losing regions

Use one normalized pair per `(place, child, parent, direction)`:

```js
{
  id, childCarrierId, parentCarrierId, direction,
  regions: [{
    id, kind, frame: 'emitted-world', selector,
    childRegion, parentRegion, certificateRef, geometryRefs
  }],
  provenanceRefs,
  groundAnchor: false,
  wholeCarrierRetirement: false
}
```

Adapt the old single `childRegion`/`parentRegion` to a one-element `regions` list.
Normalize **all** attachment and evidence records for the exact pair, not `.find()`.
Preserve stable region IDs, bounds, witnesses, certificate kinds, effective source
part/triangle references and direction. Deduplicate identical region IDs only
after proving their records identical. A conflicting ID/direction or missing
geometry reference is a validation error, never a last-wins merge.

Artist fields `localRegions[].childBounds`, `parentBounds`, witnesses and
`actualGeometryCertificate` map directly to that common shape. Bounds are finite
selectors/broadphase aids, not substitute solids. A missing region may use only
the previously named legacy assembly's existing bounded interpretation; it cannot
introduce a new generic mount. Qualify place-local IDs once. Preserve current
roles and every exact accepted hinge/mount/seam direction; do not promote a
dependent because its geometric intersection is large.

The proposed eight moving-header and 216 dependent-bracing interpretation
retirements remain separate exact records awaiting approval. Preserve their raw
contacts and source geometry. Neither raw contact nor adjacency automatically
becomes a replacement support edge.

## Compile corresponding ports, not a Cartesian product

For each accepted region, independently enumerate the actual effective child and
parent material fragments intersecting **that same local region**. Emit only
proved, corresponding fragment pairs. A possible compact port row is:

```js
{
  regionId, childPatchRef, parentPatchRef,
  componentId, proofMode, localProofRef
}
```

Patch references include exact source part/surface identity and original native
cell coordinates, tied to effective geometry hashes, unchanged grid/pitch and
compiler/kernel pins. A component ID prevents disconnected pieces in one source
or selector from being conflated. No all-parent × all-child product, nearest
surviving patch, remote bay, bounding-box-filled aperture or carrier-wide fallback
is permitted. Evaluate every region independently, then union its proved edges;
duplicate edges do not discard their independent region provenance.

Keep the detailed certificates/triangles offline. The compact runtime holds IDs,
local selectors and port references, not a second authoring table or detailed
whole-world geometry. Active registration reconstructs only the relevant native
fragments and verifies those references before the existing atomic transaction
commits. A stale/missing port is a diagnostic/staging failure, not permission to
relax a pin or attach to another patch.

## Actual contact and strict volume embeds

Retain distinct proof modes:

1. **Native contact.** Actual clipped fragments inside the pair's local region
   pass the unchanged native contact predicate. Preserve its result and tolerance.
2. **Strict volume embed.** The same local region has common strict interior in
   both actual closed material fragments. An independently verified interior
   point with positive surface distance is a positive existence certificate even
   when outer facets do not cross. It must belong to the corresponding fragments,
   not merely the historical whole carriers. Derive all relevant local components;
   one witness does not prove full long-beam coverage.
3. **Already approved fastening.** Preserve the named measured gap/socket and its
   exact original fragment owners. Do not pretend it is surface contact or use it
   as a general gap exception.

The artist reports 2,646 source-facet positives and 630 pairs with strict solid
overlap but no crossing outer facets. A surface-only false therefore cannot be
labelled separation. Conversely, a common interior point in the original whole
meshes does not by itself define support after a local native fragment retires.

For closed native fragment `solidTriangles`, use that actual material geometry.
An open zero-thickness facet is **not** a closed solid suitable for winding or
volume membership. Where the existing kernel represents a closed fitting through
several open surface patches, a future implementation must supply a bounded
`materialForPatch`/port-ownership adapter over the same effective source part and
native fragment. That adapter must establish which current, surviving local
material the patch owns, including disconnected components and cuts. A clipped
source cell is only a candidate bound; it is not an automatically solid voxel.

If current native data cannot establish that ownership, report the particular
region as `unresolved-material-ownership`. Do not keep using the intact historical
solid after its owners retire, invent an any/all survival rule, create a support
lattice/thermal cell, or project to a distant exterior face. The exact ownership
adapter and any required solver hook need architect acceptance before coding;
this interface does not claim that all 630 cases are already implementable.

## Cold/active parity and local loss

Cold metadata can summarize the existence of verified local ports while their
geometry remains unexpanded. When either endpoint activates, bind each port to
its exact original patch references. Cover all four cold/active combinations
without a transient duplicate or missing bearing. Rebinding is part of staged
validation before physical install, proxy claim and canonical transfer commit.

An active edge is available only while its corresponding actual material owners
and local proof remain present. Parent patch retirement removes its particular
ports. Other independently proved ports remain; actual native material continuity
determines whether a long child can span them. No forced one-metre break or
whole-carrier retirement is added. Detached/fallen geometry does not regain a
fixed attachment at a new position by nearest-parent search; native landing/contact
behavior retains its separate authority.

## Bounded checks required before accepted implementation

- Old single-region and current ten-control parity, including header/leaf poses,
  original source quantities and unchanged canonical stock.
- Two regions for the same long child/parent: losing one local parent removes only
  that port, with no remap or cross-bay edge. Preserve independent support at the
  other region and native continuity across a real unsupported span.
- A disconnected multi-part source and a cut/mitred void: overlapping bounds or
  matching native cell IDs do not bridge absent material.
- A true strict embed with no crossing outer facets: both current closed-fragment
  memberships pass. A real positive gap, open-facet pseudo-volume and stale
  historical solid after retirement fail or remain explicitly unresolved.
- Exact corresponding-port counts and geometry after cold/active transitions,
  local loss, reset and section reload. No new earth anchors, roles, material,
  fuel, profile, clock or activation birth/refill.

Do not claim the proposal's hypothetical 692/111/235 dispositions as runtime
acceptance. New 96 repeat blocks and 20 roof-saddle designs, their stock and joins
remain unaccepted/unexported; the separate approved front 48 are not silently
absorbed. These source decisions do not block the UI-owned limited preview.
