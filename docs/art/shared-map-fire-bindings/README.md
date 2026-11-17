# New York shared-map physical bindings

Artist source candidate for [Milestone 29](../../milestones/29-shared-gameplay-maps.md).
This follows [shared modular art workflow Version 2](../shared-modular-art-workflow.md),
including separate appearance, physical meaning, fuel, native dimensions and delivery status.
The original workflow and all original building, access, geometry, UV, skin and checker
files remain unchanged.

## Scope and consumption

The additive [sidecar](../../../assets/art/shared-map-fire-bindings/new-york.json) binds
the exact emitted New York composition to architect-accepted **gameplay** materials.
It is authoring/compiler input, with exact source references for review. Runtime map
extraction, sparse streaming and compact state remain coder work; this is not a claim
that a whole-map JSON fetch or raster is appropriate.

The original structure/finish material metadata remains unassigned. These choices are
not historical construction findings. Existing research and rights records remain in
[the original source dossier](../../../art/source/exposition-new-york/sources.json).
No Administration or Horticulture override is supplied or implied.

## Contract

- Version 1, `placeId: new-york`. Carrier IDs are place-local. The compiler qualifies
  them once with the place ID.
- Bounds, matrices, closed/open door poses and geometry bindings use **emitted-world
  metres**. The original `[56, 0, 26]` offset is already applied. Do not add it again.
- `nativeAccess.floorOpenings` deliberately retains original source-local access-plan
  metadata and labels that frame explicitly. Existing navigation surfaces are world
  coordinates. Native level pitch remains 2.12 m, walls 1 by 2 by .16 m, slabs .12 m,
  and door bodies 1 by 1.65 by .12 m. No geometry is rescaled.
- Each logical emitted source part has exactly one owner: carrier, graphic, or explicit
  unassigned record. A merged `sourceRange` owns only its named triangle/index interval;
  it does not retire an entire unrelated section batch.
- Exact geometry, appearance hash, matrix, bounds, triangle count and section/part IDs
  accompany render bindings. `physicalContribution` and `physicalSourcePartIds` separate
  physical source solids from awning stripes. Cosmetic stripes retain appearance and
  follow canopy char/retirement without adding surfaces, volume fuel or independent state.
- Native door body and upper extension share one leaf/fuel/retirement owner. Both actual
  open and closed matrices remain exact. Metal handles are distinct, inert attached parts.
- One canonical carrier owns persistent fuel/char/support/retirement across visual loads.
  Reloading a section cannot duplicate fuel or restore a retired carrier. Runtime must
  apply retirement consistently to render, collision, support and sight.
- Authored shadow graphics have no separate fuel/support account. The table does not
  remove existing navigation blockers or establish a newly traversable opening.

## Coverage and finite quantities

The complete emitted inventory is **12,840 render parts**, **12,858 logical source
parts** after splitting the two merged range records, and **252,406 triangles**.
12,742 source parts have assigned carriers; 12 shadow graphics have separate records;
104 source parts remain explicit and unresolved. All source triangles are accounted once.
The 12,342 canonical carriers cover the substantial native wall/closure, base/paving,
building deck, stair, frame/column/rail, glazing, awning, roof and door families.
The halls remain unpartitioned: this export does not invent historical room walls.

| Quantity family | Finite convention |
| --- | --- |
| Above-base exterior wall and level closure | Primary area at .16 m depth, times 1; no two-face duplication |
| Building decks, upper porch/terrace/balcony decks, roof decks, interior stair treads | Upward projected area times 1; actual slabs/steps retained |
| Pitched roof covering | Exposed upward triangle area times 1; buried and coplanar duplicate portions excluded |
| Substantial frames, columns and rails | Verified closed solid volume divided by .12 |
| Complete native door leaf plus extension | Total panel area times .45; ten leaf owners, 12.6 units total |
| Complete awning, including valance and stripes | .3 once; 58 awnings, 17.4 units total |
| Base, approach/paving, glazing, door hardware | Zero fuel, with physical meaning retained |
| Pilot coating | .10 lacquer only on `carrier/main/0/cell-1-22/1`, in a separate finite account |

Units are **prototype-fuel-units**, not historical mass. Per-carrier recipes and measured
areas/volumes are included. Roof exposure removes 29.270584 square metres of buried or
duplicate covering without editing geometry. All profile rates/thresholds remain owned
by the existing shared kernel. Ground grass lies outside this emitted landmark inventory
and keeps the shared map's existing finite grass rules.

The three first records are the accepted pilots:

1. `carrier/main/0/cell-1-22/1`: 1 by 2 by .16 m exterior wall, 2 clapboard units plus
   a separate .10 lacquer account. Actual base contacts are recorded.
2. `carrier/upper-floor/tile-1-16`: 1 by 1 by .12 m slab, top 8.48 m, 1 frame unit.
   It lies outside the actual stair hole. It connects to its native slab neighbors;
   the shared support kernel must resolve the span rather than grounding it independently.
3. `carrier/main/0/lower-3/glass`: actual 1.86 by 2.78 by .07 m glass, zero fuel,
   with native frame attachment references. It remains a real physical blocker.

Full finite class totals and the separate finish total are in `finiteLedger`.

## Remaining assignments and reproduced source gap

`coverage.unassignedSourceIds` and `unassignedBindings` name every unresolved part.
Unknowns do not become dry timber or silently become verified inert material.

- **75 ornaments:** reliefs, cameos, medallions, niche ornament, urns and tower terminals
  lack an accepted physical-material decision.
- **29 derived access-cut meshes:** the gameplay material/profile can be named, but
  their original emitted triangles have open boundaries. Closed-volume quantities are
  withheld. Exact IDs, geometry hashes, sections, bounds and unmatched-edge diagnostics
  are retained in the [source evidence](../../../art/source/shared-map-fire-bindings/new-york-evidence.json).

Concrete reproduction: `replacement/main/1/cell-3-13/1` ends at world Y=8.32 m and
has no top cap triangles. Boundary segments on that cut plane run between X=79.92
and X=80.08 and Z=39..40. An independent check measures zero area on that cap plane.
The other affected pieces include clipped cornices, entry headers/jambs/mullions,
wall fragments and porch cornices. Existing original native checkers pass; those
checks did not certify this new finite closed-volume calculation.

**Bounded correction proposal, not implemented:** coder should review capping only the
existing derived access-cut boundaries, at the existing planes, in the compiler.
Preserve source arrays/UV contracts, original apertures, native origins and original
asset history. Reproduce current boundaries first, verify the resulting closed solids,
then regenerate this additive sidecar to assign finite quantities to those 29 pieces.
An architect geometry decision is required before changing the existing workproduct.
There is no request here to rebuild the landmark or alter original source assets.

## Support evidence and remaining runtime work

`supportCarrierIds` records positive-area coplanar horizontal triangle contacts and
explicit native hinge/window/awning attachments. `adjacencyCarrierIds` separately records
native face contacts; adjacency is not a claim of vertical bearing. Geometry contact
uses 20 micrometre coordinate tolerance and at least one square millimetre of area.
Contacts describe the emitted closed source pose. Live portal geometry must update contact,
heat and screening relationships when a door moves; the closed-pose graph cannot override
its open matrices. Bounds provide broadphase/evidence, not replacement collision solids. Roofs retain
actual pitched volumes; no thin collision shell is invented.

Large floor spans connect through native tile faces. The shared support kernel still
owns propagation, load/span rules and live door/retirement state. Parts without recorded
bearing or attachment are listed in `supportUnresolvedCarrierIds`; connected spans without
direct bearing are separately labelled. Non-coplanar overlaps are not silently anchored.
Shadow graphic dependencies that remain unknown are also listed explicitly.
These lists must accompany integration review rather than being treated as passed
collapse or traversal checks.

## Reproduction and checks

Use Python 3.12 and the repository's existing Node runtime. No package installation,
renderer, server, watcher or background helper is required.

```powershell
python art/source/shared-map-fire-bindings/export.py
python art/source/shared-map-fire-bindings/export.py --check
python art/source/shared-map-fire-bindings/check.py --record
node workbenches/art/check-exposition-new-york-tile.mjs
node workbenches/art/check-exploration-access.mjs
```

The exporter pins the scene index, navigation, sections, geometry and original source
closure. The independent checker verifies exact ownership, poses, ranges and world
coordinates; recomputes finite quantities and roof fragment areas; checks the original
workproduct against common base `6d1061cd3ab7e6c9bff212381193376473413b30`; and rejects
four deliberate bad controls: duplicate fuel ownership, double-applied source offset,
a second coating and fuel assigned to glass. The receipt records the exact artifact hash.

During authoring, checks caught an unterminated JSON export, duplicate area from a roof
polygon clipping edge case, a contact sliver that rounded to zero, and the open-source
closed-volume assumption above. The JSON writer/clipping/contact issues were corrected;
the unverified source quantities remain explicit rather than being waived.

This is an **artist source-binding candidate**. No renderer, JPG, actual-input tool
ignition, streamed retirement, live collapse, gameplay traversal, CPU/GPU cost or
production promotion is claimed. The native CPU geometry checks are source controls.
JPGs and combined in-game review wait for the architect's bounded renderer grant.
All foreground exporters/checkers exit when done; no task helper is retained.
