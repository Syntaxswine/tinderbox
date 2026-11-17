# Query boundary correction checkpoint

Scoped successor to `c9b02eb278854380cc41f1de77ed4b0c57e4dc47`, following
architect/UI hostile review of the isolated
[query kernel](../regional-query-kernel-pilot.md). The worker remains
`codex/shared-map-gameplay-code`. This changes only the query module, adds focused
regressions, refreshes the declaration and records new evidence here. Existing
compiler, geometry/collision helpers, registries, factories and live consumers
are unchanged. All earlier evidence is preserved byte-for-byte.

The original public eight-case script/results were read from the UI worker at
`C:/Users/baals/.codex/worktrees/fire-ui-reconcile/tinderbox/artifacts/ui-qa/regional-query-c9b02eb/`.
`review-crafted.mjs.txt` and `review-crafted-results.json` preserve their exact
bytes. `recheck-crafted.mjs` changes only import/output locations and adds the
candidate module hash/process metadata; it executes in this worker checkout.
It writes no file in the UI checkout. `crafted-successor-results.json` retains
all eight corrected results, including the unchanged overhanging-floor rejection.

## Four corrections

**Ordinary ray channel.** Rays now select `solidTriangles || triangles`, exactly
as the ordinary boundary index does. Source ray records must refer to their
admitted surface/solid arrays; a third unchecked geometry channel is rejected.
Surface-only and solid-only face requests remain distinct. Ray primitive
provenance now names the selected channel. Both slab underside repros exactly
match ordinary IDs, t, normals and transmission .02.

**Closed-body contact tolerance.** Geometry face/ray halos remain ±2 geometry EPS
(geometry EPS remains 1e-7). Containment probes now use the ORIGINAL body
tolerance separately (body EPS remains 1e-6), including at a catalogue's outer
edge. A body-only broad-phase/probe envelope is bounded per axis by
`BODY_EPS * (1 + 2*originalShapeAxisSpan)`: the metric EPS plus a bound on the
original parity predicate's barycentric EPS extension. It is not a physical
shape, new cap, ownership cell, ray halo or acceptance tolerance. The unchanged
original checked-mesh predicate still decides occupancy.

Only outer catalogue edges use that body probe envelope; internal ownership
planes remain fixed. Every touched body/cell intersection still gets its full
radius/height/sweep witness. Native closed records also use the body envelope
for broad-phase eligibility, instead of being discarded by strict mesh bounds
before the original predicate can run. Open native shells get no parity. This
does not fall back to a whole parent or classify a mixed body by its centre.

Cold and native unit cubes block the inside band `[1-EPS/2,1-EPS/4]` and the
near-outside band `[1.0000003,1.0000007]`, matching ordinary false-clearance.
Both clear `[1.0000011,1.0000012]`, again exactly matching the original. A mixed
two-metre cube activates only its final cell: native tolerance, the far clear
band and named-record retirement stay authoritative while seven other cells
remain cold. Existing radius/height/intermediate-cold-domain controls also pass.

**Channel extent admission.** Native surface AND solid vertices must fit the
same existing original-cell ±2 EPS bound. Source surfaces must fit the fixed
catalogue derived from their admitted solid channel plus that same existing
halo. Unsupported surface escape is rejected before freezing the input or
publishing a view. No halo or numeric tolerance is widened. The originally
correct overhanging floor-solid rejection remains a rejecting control.

**Ownership provenance.** A single point-ownership resolver now supplies both
domain filtering and ray provenance. An outer cold hit reports original owner
cell `[0,0,0]`, raw `hitCell:[1,0,0]`, `halo:true` and `outerHalo:true`, agreeing
with scoped faces. Native hits retain their original native source cell and raw
hit cell. No stock or attachment is remapped.

## Checks and evidence

Two finite focused runs pass **18/18** each: all original thirteen controls plus
five grouped boundary regressions covering the eight public cases, root's extra
body bands, mixed native/cold retirement, channel identity and provenance.
`focused-first.*` and `focused-final.*` retain both logs/receipts. The exact
adapted public eight-case script also passes its result audit. No native compiler
or world operation is imported/called by these checks.

Exactly **one** bounded read-only saved-array comparison ran for this successor:
`saved-first.json` passes **239/239**, including original cold/full-native
controls, independent mixed-domain assembly, and original surface/solid face
provenance/area splits. The harness is the prior comparison copied into this
folder, with new output paths and its independent oracle corrected to select the
same ordinary solid-or-surface ray channel. All previous outputs, including the
original 13/239 acceptance and failures, remain unchanged. No old compiler proof
was replayed; its 960-call native allowance remains spent.

The two original data pins remain
`bfab707ff646e9dfedfaae3b80d510ac750e4f561335d895c24c4e4cc4d49418`
(saved roof/deck/native arrays) and
`1e93eb730de7a978b01069df5401ea80d4ddebcff7d101010714e8b4643fc296`
(original source library). As before, the saved identity's omitted transmission
uses the pinned .02 timber/timber-covering value for both controls, with the
existing sourceSurfaceId sheet fallback; this does not recover unrecorded data.

The declaration stays at **22 modified / 48 added** modules. `audit.mjs` verifies
source/scope, old archive bytes and original Git-context source pins, copied UI
evidence, all eight exact repro outcomes, focused/saved results and process
closure without rerunning geometry. The manifest covers the exact successor.
Verbatim logs retain their bytes and have a local whitespace exception; source
and prose use normal whitespace checks.

All four recorded test/repro PIDs are absent in fresh `cleanup.json`; no helper,
port, server or browser is retained. The runners were foreground, hidden child
processes bounded to twenty seconds. These are correctness results, not speed
claims. No world/trial/graph, native building/compiler run, benchmark, build,
renderer, source export, new codec, live bridge or Pages work occurred.

This remains a fixed-inventory static pilot. Live consumer adaptations and the
atomic compiler/stock/query/support bridge are still closed gates. The prior
2,599.9 ms browser failure remains unresolved. The forty-line WIP is preserved.
Stop for architect/UI re-review after scoped commit/push.
