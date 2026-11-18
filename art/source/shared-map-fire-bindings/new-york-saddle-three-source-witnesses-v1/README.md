# Three fixed saddle source-witness proposals

**Three independent source proofs are ready for architect review.** They use
only the accepted final `c1ed407` Float32 saddle and its three fixed original
interfaces. All four saved world buffers were available, so this task performed
**zero transforms**. Native record/cell/surface IDs remain null/UNBOUND. No
runtime approval, geometry, quantity, anchor, tolerance or engine limit changed.

| Proof | Directed original primitives | Gap (m) | Projected area (m2) |
| --- | --- | ---: | ---: |
| [Cornice lower port](proof-cornice.json) | cornice 2 -> saddle 8 | 0 | 0.003692305374145156 |
| [Roof-seat lower port](proof-roof-seat.json) | roof 3 -> saddle 6 | 4.176013713749516e-10 | 0.01035798668708885 |
| [Upper port](proof-top.json) | saddle 12 -> upper 7 | 1.6280579355608324e-14 | 0.001864859693877607 |

All six endpoints belong to component 0. The full declared primitive sets
remain cornice [0,2] /saddle [8,9], roof [2,3] /saddle [6,7], and
saddle [12,13] /upper [6,7]. The chosen witnesses are immutable proposals
inside those sets; no different interface or surviving-parent substitution
was searched. Each proof includes both own points, original primitives,
components, canonical normals, own selectors, projected footprint, actual gap
vector/direction, primitive/world hashes and exact manifest pointers.

Selectors are explicitly derived from each endpoint's own declared fixed
facets. The upper endpoint additionally retains X=[49,50]. No common box was
constructed through a gap. Own-point membership uses the unchanged 1e-7
predicate; original and separately clipped faces pass unchanged
`supportSurfacesTouch`; point separation obeys the existing 2e-5 rule. The
roof normals retain their actual Float32-related angular difference. No
geometry was adjusted to make them coplanar.

Six wrong-original-face controls reject endpoint points on faces outside
the reviewed sets. Three distance controls use actual points on the same
accepted original faces and within their own selectors: native face contact
still accepts, while point separation exceeds the existing distance limit.
These controls change neither geometry nor the positive witnesses.

The [normal serialization appendix](normal-encoding.json) retains exact
binary64 normal bytes matching the hashes already frozen in each proof.
JSON normal arrays normalize negative zero; the upper child normal has an
X component of -0. This encoding clarification changes no witness or normal
calculation. Its [saved-only checker](normal-encoding.py) uses only the
existing numeric arrays/hashes.

The canonical saddle quantity remains exactly 0.04011965567822286, bits
`a2262142908aa43f` little-endian. Three proofs reference one canonical owner
and quantity; zero stock was registered. Original owner quantities, source
ranges, source frames and physical/render mapping remain pinned.
Required ALL for both lower ports, independent original-parent support,
descendant exclusions and the directed upper local interval are preserved
as data. **No support/root/ALL solve was performed.** The prior 34-pair
root proof remains a separate unchanged packet.

One hidden child reused 4 physical source shapes /48 original triangles,
examined 8 of the 12 permitted fixed primitive pairs, and performed 11 pure
numeric contact-predicate calls. It created no BufferGeometry or native
geometry object. No historical `check-buffers.mjs` experiment, native compile,
trial, clock, renderer, build or game integration ran. The child exited within
its 30-second limit; no helper, port, browser or server remains running.

- [Frozen plan](plan.json), [preflight](preflight.json), [summary](summary.json),
  [reused world table](world-tables.json) and [input pins](input-pins.json).
- [Exact authority](authority-b7958c76.md), [provenance](provenance.json),
  [source checker](source-proofs.mjs) and [finite coordinator](coordinate.py).
- [Saved-evidence checks](checks.json), [packet hashes](review-package.json),
  [owned-child receipt](helper-receipt.json) and [coordinator closure](coordinator.json).

Saved-only verification: `python -B art/source/shared-map-fire-bindings/new-york-saddle-three-source-witnesses-v1/verify.py`.
The exclusive marker prevents numerical retries. Stop here for independent
architect review and the coder's separate surface/cell mapping work.
