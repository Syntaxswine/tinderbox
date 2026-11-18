# Three bounded support-core corrections

Successor to partial core `f45f0c4eac03059634d164ce5941211c5ee32e3a`.
The architect reproduced a ghost strict embed during intake `64042223` and then
forwarded the UI review's two crafted failures. This candidate corrects those
three concrete findings only. The core remains disabled and partial; the full
New York source adapters and actual map diagnostic remain unfinished.

## Corrected behavior

Strict-embed liveness now checks the **current** physical material on both sides
of the frozen common interior witness: that witness is the actual joint. It
requires a checked, connected watertight current boundary and the witness
strictly inside that material, in the fixed original part/component and native
record/cell. Existing fragment material continuity and support edges connect that
current material component to its supports. It uses the existing exact-edge
component/closedness helper, collision parity and support tolerance. No tolerances
were widened, endpoints remapped, physical caps generated, or AABBs used as volume.

Bearing-face ports still require their exact original exterior point/primitive.
Strict-embed liveness does not require that arbitrary exterior proxy to survive:
the frozen common interior joint can remain real after that exterior face is
retired. The original binding/proxy is retained unchanged as historical evidence,
not remapped to a new survivor. Native identity/cell matching remains exact.

The root repro keeps only the parent's original exterior facets between y=0 and
0.1, while the child starts at y=0.2 and the original common witness is at y=0.5.
The old original bottom ports survive but the actual surviving shapes do not
touch. The corrected core leaves the parent supported and the child unrooted,
with a nonlive embed, for both cold and native views. Open exterior facets cannot
prove a surviving interior; their diagnostic is
`strict-embed-effective-solid-unproven`.

Independence checks disable the requirement under examination, retaining all
accumulated node exclusions and disabled requirements during recursive checks.
They no longer disable every unrelated valid ALL-required fitting. Thus grounded
fitting A can independently carry a lower parent of fitting B. Both fixed lower
ports, actual fitting material continuity, and exclusion of this fitting / upper /
descendant paths remain required. No anchors or reverse support edges were added.
This remains the existing binary support approximation, not a new mechanical
solver; full-catalogue cost and behavior are not established by the tiny cases.

Original anchors are validated against the named original part and optional
component, with finite elevation. The core copies and freezes its own scalar
anchor records. Mutating the caller's original objects or array can no longer
relocate or remove grounding at unchanged generation/revision. The caller's
anchor objects remain mutable and are not retained by the core.

## Required surviving-material input

The prior constructor, fixed bindings and fragment identity schema remain as
documented in the preceding partial-core checkpoint. For a strict embed only,
each matching fragment may additionally provide:

```js
{
  // existing id/partId/ownerId/component/mode/recordId/cell/primitives/triangles
  solidTriangles: /* actual current closed physical boundary for this fragment */
}
```

`solidTriangles` must be a nonempty array of finite, nondegenerate XYZ triangles
with every exact undirected edge used twice and one connected boundary component.
It must be the authoritative
**surviving** closed material of this exact original part/component and fragment,
in the same emitted-world frame and current generation/revision/record/cell view.
It must retain real voids, separations and any native physical boundary faces.
It is not an AABB, original-parent fallback, guessed envelope, stale prior solid,
or a license to add caps. Native boundary faces in this channel are not assigned
original exterior primitive identities. Bearing-face port selection still uses
the unchanged `triangles` and original `primitives` provenance. Strict-embed native
record/cell inputs must identify the common interior joint's owner, rather than
an arbitrary exterior proxy's cell.

When `solidTriangles` is omitted, the fragment's actual current `triangles` must
itself pass the closedness check. An explicitly provided invalid/open solid fails
closed; it does not fall back to another geometry. A closed solid that loses the
witness produces `strict-embed-witness-not-in-surviving-interior`. Several closed
boundary components do not by themselves prove a single material component:
disjoint solids and nested void shells require additional authoritative material
connectivity semantics. This minimal contract fails closed with
`strict-embed-effective-component-unproven` in that case, without inferring shell
nesting or a path between disconnected bodies. These records include bond,
endpoint side, part, fragment and original primitive in `unresolvedBindings`.

The material boundary is borrowed only for the evaluation call. No geometry or
occupancy verdict is retained across evaluations, reset or disposal. This API
still relies on the caller to supply authoritative geometry and its identity;
this correction does not implement an authenticated source-volume adapter.
Exterior-only clipped views without such proof remain conservatively unrooted
for strict embeds. A source-solid plus ownership-domain volume query is **not**
implemented here. That source binding needs its own bounded assignment before
the unrun New York diagnostic. No general volume-connectivity solver or new
survivor endpoint is searched. The caller's face view must describe this same
current material component; this is an input requirement, not an implemented
source-catalogue mapping or authentication capability.

## Tests and preserved evidence

`baseline.*` runs the nine new embed groups on unchanged f45 code: one passes and
eight fail, including the exact architect gap. `rooting-baseline.*` runs the two
UI findings plus small controls: one passes and three fail. The exact original
architect script/result and UI crafted script/results/verification are preserved
as raw evidence. The `.mjs.txt` snapshots are not executable test entry points.

`corrected.*` preserves the intermediate **41/41** passing draft and its source
snapshots (`first-correction-core.js.txt`, `first-correction-embed.test.mjs.txt`).
That draft still required a surviving exterior proxy/path for strict embeds.
The architect's subsequent common-interior-joint guidance supersedes that policy.

`joint-witness.*` passes **44/44**: twelve embed groups, four rooting groups, all
eight prior physical groups and the twenty unchanged query controls. Additional
controls retain ordinary cold/native support; reject child-witness loss, open
facets, explicit open solids, a real void at the witness, ambiguous multiple
closed boundaries, disconnected current solids and a witness on a new boundary;
accept an explicit current closed solid accompanying an exterior-only view;
preserve a real surviving joint despite the loss of its original exterior proxy;
reject a closed slab whose joint material is removed and any substitution of the
fixed native record/cell; compose two
ALL fittings in both requirement orders and views; preserve missing-ground and
the original descendant/self-support rejection; and reject invalid anchors.

One prior fixture now supplies its explicit synthetic closed physical remnant
bodies through `solidTriangles` alongside its unchanged clipped exterior view.
That preserves the meaningful two-live-ports-but-disconnected-fitting control;
the former exterior-only input did not prove its strict-embed interior. No old
assertion or test group was dropped. The exact preceding test file is preserved
in `original-core-test.mjs.txt` and in f45 history. These tiny synthetic solid
inputs do not compile a roof or generate native geometry in the runtime.

All four finite test-child PIDs were checked absent. No server, browser, watcher
or port was started or retained. The runner has a 20-second timeout and records
source hashes, launch/exit timestamps, executable and PID. No restart or replay
is automatic. Earlier archives, failures, the three unfinished WIP adapter text
snapshots, and the unrelated support-regions proposal remain unchanged.

The scope is the core, its three small test files, the generated runtime
declaration and this evidence folder. The declaration stays **22 modified /
50 added**; the only runtime delta is the disabled support core. The source audit
checks every prior evidence archive and original source pin, current test pins,
protected WIP and exact file scope. No source assets or dependencies were added.

There were **zero** native compiler calls, original roof compilations, actual
New York diagnostics, world trials/steps, renderer/browser runs, builds or
benchmarks in this correction. The actual New York diagnostic remains **unrun**
and its allowance unused; old actual-roof/proof allowances remain spent. Stop
after this checked candidate is pushed for exact architect re-review. This does
not accept source-catalogue binding, any whole map, rendering or deployment.
