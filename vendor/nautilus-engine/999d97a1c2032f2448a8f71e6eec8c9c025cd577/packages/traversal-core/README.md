# Shared contact traversal

The optional public `@nautilus-engine/map-core/traversal` entry is pure Node-safe
upright convex contact math in metres, world x/y and vertical h. It owns no actor,
clock, resources, input, persistence or renderer. A disc uses one point and a
radius; a car uses its oriented native body envelope. Consumers retain authority.

`moveWithContacts(shape, delta, obstacles)` continuously casts every accepted
segment. A glancing contact keeps 72% of the requested tangent; a head-on input
has no tangent and stops. Four contacts bound one request. There is no shoulder
selection, push-out or invented motion. Closed corners stop. Rounded Minkowski
vertices keep a disc's corners round. Vertical intervals must overlap.

`createInteractionQueries(world, {movementProfile:'disc-slide-v1', obstacles})`
selects disc sliding through the ordinary `walkActor` API. Its returned movement
record reports actual accepted distance and contacts. A host charges any movement
cost from this result, never from requested or rejected displacement. Support and
world bounds are still required along every segment. The default
`legacy-box-stop-v1` retains the existing square stop behavior.

Static candidate queries cover the full bounded reachable travel envelope. A
rounded contact can deflect motion outside its original straight sweep; every
secondary segment must still see walls there. Cars return their accepted
continuous `sweeps` (at most 70 shapes per substep), including turning prefixes
and frozen-yaw slides. Support is checked along each accepted segment. The
session first resolves against other cars' initial bodies, then compares actual
resolved routes using route and segment AABB broad phases. Intersecting routes
cancel both substeps without charging distance; this conservatively reserves
space across the whole substep rather than predicting exact contact timing.
Disjoint close parallel routes remain free to move.

`createVehicleSession({collisionProfile:'oriented-slide-v1', ...bindings})` selects
oriented continuous contact and sliding. World AABBs remain the broad phase and
conservative flat-support query. Oriented swept hulls with analytic arc padding
handle the narrow phase; first contact is refined before bounded tangential
motion. Real wheels, mirrors and the existing complete body envelope remain
covered. Actors and other cars participate as distinct current shapes. A save
with this policy is vehicle checkpoint v2; v1 keeps the old AABB stop policy.
Changing a saved policy implicitly is refused. Leases and held input never save.
Held pedal demand during contact belongs to the current lease, so tangent
slowdown is applied to intended motion once instead of compounding per frame.
It is capped by the motion profile, discarded on release/reversal/retirement,
and absent from checkpoints. Leaving contact integrates confirmed speed again,
preventing a stored-demand speed jump.

`createVehicleYard(content, {collisionProfile:'oriented-slide-v1',
movementProfile:'disc-slide-v1'})` is one reference host. The Night Ledger modular
ground composes these same public APIs with its own existing resource, plot,
recipe, checklist and persistence authority. No donor game is adopted.

This is low-speed upright contact, not crash physics, suspension, sloped support
or a general rigid-body solver. Rotation may halt while a contacting car slides;
clear steering away and reverse remain available. Original donor bytes and the
accuracy/efficiency/narrative assessment are recorded separately in source.json
and the traversal review. Callers must validate their own complete saved policy.
