# New York coverage-completion proposal

Status: **proposal only**. No material, fuel quantity, support, geometry or runtime
assignment has been applied. The coder's three-carrier CPU pilot continues separately.
This proposal uses the accepted source-binding candidate `59b9373f47d51531c7e505613f67dd1e426b37f1`
and its exact binding hash `7490e3bfeeab4a6080d2c9d97b99fc81bac875d711c83fcbe4c10e34e008b1f9`.
The [per-ID evidence](../../../art/source/shared-map-fire-bindings/new-york-coverage-proposal.json)
contains all 75 material choices, 29 cut diagnostics and 664 support records.

## Decisions requested

1. **Materials:** accept the explicit 75-ID table below as gameplay choices, with
   original historical materials still unassigned.
2. **Derived geometry:** authorize only the versioned 25-part closure and four-jamb
   zero-interior-contact correction described below, preserving original raw history.
3. **Embedded attachments:** accept the listed 652 fixed joins to actual native
   parent carriers, with their parent-dependent support/retirement behavior.
4. **Authored mounts:** accept the 12 explicitly described rail/post and panel/wall
   mounts across measured source gaps, or return those 12 for a separately bounded
   connector/placement proposal. They do not have geometric bearing as currently drawn.

These decisions precede implementation and finished-map acceptance. There is no implicit
wood/inert fallback, automatic grounding or permission to alter other parts.

## Explicit material proposal: 75 IDs

The groups partition the exact unresolved set; every ID is listed in the evidence.
The table describes prototype physical behavior, not a historical construction finding.
All original geometry, shape-dependent screening and appearance remain distinct from
these choices. Mineral pieces use the existing inert stone behavior with a declared
plaster/staff or cast-mineral interpretation; no new combustion profile is proposed.

| Group | IDs | Proposed physical choice | Proposed finite fuel |
| --- | ---: | --- | --- |
| Entry entablature and relief band | 2 | Painted substantial timber, `frame` | Actual closed volume divided by .12 |
| Large upper relief | 1 | Mineral plaster/staff proxy, inert stone behavior | 0, explicitly |
| Medallion rings/fields, cameo heads/busts | 8 | Mineral plaster/staff proxy, inert stone behavior | 0, explicitly |
| Entry and facade swag reliefs | 15 | Mineral plaster/staff proxy, inert stone behavior | 0, explicitly |
| Four niche surrounds: arches, jambs and bases | 16 | Mineral plaster/staff proxy, inert stone behavior | 0, explicitly |
| Parapet, side and porch urns | 31 | Cast-mineral/stone proxy | 0, explicitly |
| Two tower finials | 2 | Metal | 0, explicitly |

The three substantial entry elements deserve separate review:

| Exact source ID | Measured world bounds size | Proposed meaning |
| --- | --- | --- |
| `entry/entablature` | 5.3 by .4 by 1.1 m | Substantial timber fitting; 19.433335 prototype units |
| `entry/relief-band` | 14 by .85 by .16 m | Substantial timber fitting; 15.866667 prototype units |
| `entry/upper-relief` | 5.64 by 2.82 by .22 m | Large mineral relief, explicitly inert; actual closed volume approximately .585891 mÂ³ |

Those are substantial carriers and barriers, not paint or negligible trim. The upper
relief's bounds enclose an arch; they must not become a filled rectangular collider.
The two timber choices would add 35.300002 finite prototype units only after acceptance
and assignment. They receive no automatic lacquer allowance. The existing pilot's .10
coating remains the sole coating assignment. Inert ornaments still need real attachment,
screening and support-loss retirement; zero fuel does not mean permanent floating art.
New carriers for these 75 parts will need their own parent evidence when implemented.

## Exact derived-only repair: 29 IDs

The original `cutTriangles` in
[the source clipping helper](../../../art/source/exploration-access/source-geometry.mjs)
emits retained triangle fragments without reconstructing solid closure faces. The
[generator](../../../art/source/exploration-access/build-access.mjs) records the original
source-geometry hashes and cut reasons. The proposal preserves both historical files,
the original asset and the existing exploration fixture.

The evidence identifies exact replacement/source IDs, emitted geometry hashes, sections,
original source-geometry hashes, existing cut planes and every unmatched edge.

| Existing cut | World X interval | World Z interval | World Y interval |
| --- | --- | --- | --- |
| Front opening | 55..57 | 25.4..26.6 | 1.96..4.92 |
| East opening | 79.4..80.6 | 39..41 | 1.96..4.92 |
| West opening | 31.4..32.6 | 39..41 | 1.96..4.92 |
| East upper opening | 79.4..80.6 | 39..41 | 8.32..11.28 |
| West upper opening | 31.4..32.6 | 39..41 | 8.32..11.28 |

These are the existing cut prisms, not newly widened openings. The original `[56,0,26]`
offset is already applied in this table and in emitted geometry. Door bodies, moving
extensions, poses and the actual 1.88 m paired-leaf clearance remain unchanged.

**25 parts need closure on the existing cut planes.** Their unmatched edges have
multiplicity one, form boundary cycles and lie on the named existing cut planes.
Generate cap patches from the intersection of the original solid and each cut face,
constrained by the existing cut prism. Triangulate per plane, preserving holes and
outward winding. Some cycles turn across several cut planes; do not triangulate a whole
nonplanar loop or draw a face across an empty doorway. Keep every retained source surface
and its normal/UV/grossUV data. New cap UVs follow the existing physical texture density.
The native floor holes and stair openings are unchanged.

**Four jambs need a different correction:**

- `replacement/main/1/entry/jamb--1`
- `replacement/main/1/entry/jamb-1`
- `replacement/main/11/entry/jamb--1`
- `replacement/main/11/entry/jamb-1`

Their bad edges have multiplicity four, not a missing-cap loop. A read-only native
factory extraction reproduces each original source-geometry hash and confirms its
original closed volume, approximately .171392 mÂ³. The nominal cut merely touches the
jamb's inner face: the measured interior overlap along that axis is only
`7.450580596923828e-8 m`, below the existing 20 micrometre source diagnostic tolerance.
For these four IDs only, skip that zero-interior contact and reuse the exact original
closed jamb in the derived map. Do not cap a two-vertex/multiplicity-four seam as a
polygon, inflate an aperture, infer volume from the defective fragment, or apply a new
global epsilon rule.

Implement the accepted repair as an additive, versioned gameplay derivation/overlay,
for example a mapping from canonical part ID and old geometry hash to new closed
geometry hash. Keep original raw source, source pins, derived exploration fixture and
historical checkers intact. Record before/after hashes and the operation for each of
these 29 IDs. Canonical carrier IDs and the once-applied world frame remain stable.
Do not modify another place or regenerate Administration/Horticulture by implication.

Before quantities are assigned, verify closed welded topology, positive volume and no
degenerate/duplicate faces; preserve retained buffers, exact apertures, door poses,
floor holes and native walking elevations. Recompute only the 29 finite quantities
under their already proposed material rules. Existing physical checks continue to run
against preserved controls; new derived geometry needs its own checks, not relaxed old
pins. No repair geometry has been built for this proposal.

## Real support evidence: 664 carriers

| Current unresolved role | Count | Verified embed path proposed | Explicit mount decision |
| --- | ---: | ---: | ---: |
| Window/portal frame | 569 | 569 | 0 |
| Timber fitting | 79 | 71 | 8 |
| Column | 4 | 4 | 0 |
| Rail | 12 | 8 | 4 |
| Total | 664 | 652 | 12 |

The [evidence generator](../../../art/source/shared-map-fire-bindings/propose-new-york-coverage.py)
uses bounds only to find nearby candidates. Positive-volume overlap is then demonstrated
by either the separating-axis test on verified native box solids, or an actual source
vertex/triangle point strictly inside another verified closed convex solid. Witness
coordinates, margins and exact parent carrier IDs are recorded. The source tolerance
is 20 micrometres. Touching boxes are not labelled embedded, and the controls reject
separated rotated beams even when their broad bounds overlap.

Examples include sash/mullion members embedded in their native window rails, column
shafts embedded in their actual bases, capitals embedded in the facade, guard tops
embedded in their posts, and porch cornices intersecting real wall/column members.
This explains why a coplanar horizontal-face test alone left them unresolved.

**Recommendation for the 652:** author explicit per-ID fixed joins using the listed
parent links. Proposed links descend toward an already documented native carrier,
avoiding new mutual-support cycles. An existing native carrier may still participate
in a floor span whose stability the shared kernel must resolve. An intersection is
support evidence for this reviewed assembly, not a global rule that every overlapping
object supports every other object. Parent loss must propagate through the live support
and retirement model.

**The remaining 12 require explicit non-geometric mount decisions:**

- Four `ny-side-approach` handrails are authored in the same stair assembly as their
  seven same-side posts. Source posts reach .95 m above the stair path and the beam
  centerline sits at 1 m. Actual box projections show positive mesh separation, about
  4.65..17 mm depending on the post. Recommend an explicit fixed rail-to-post assembly
  joint representing the unmodelled fastening. The source geometry remains as drawn;
  there is no claim of direct geometric bearing. If visible contact is required instead,
  request a separately bounded connector/placement correction.
- Eight tower lower panels have a roughly 10 mm facade standoff. The exact IDs, wall
  run, native wall/closure parents, positive mount-projection overlap and measured
  separation are recorded. Recommend fixed panel-to-wall mounting metadata across that
  standoff. These panels lose their mount with their real wall parents; they never
  receive earth anchors or stretched collision boxes. Alternatively return these eight
  for a separate connector/placement proposal.

The four handrails and eight panels are explicit ID sets in the evidence; this does not
approve hidden mounting links for unrelated art. All 664 records specify
`groundAnchor: false`. No one is assigned an independent earth anchor. Geometric embed,
authored assembly attachment, existing foundation bearing and later runtime stability
remain separate claims.

## Reproduction and limits

```powershell
python art/source/shared-map-fire-bindings/propose-new-york-coverage.py
python art/source/shared-map-fire-bindings/propose-new-york-coverage.py --check
```

The bounded source scan uses the pinned accepted bindings and current exact geometry.
Its native-factory extraction is CPU only, extracts four jamb records from the
preserved source model, and disposes that model before exiting. Five intersection/containment controls,
exact set counts, source hashes, repeatability and an unchanged input binding hash are
checked. No new renderer, replay, server, watcher or retained helper is created.
The previously passing independent physical and policy checks are not broadened or
rerun for this proposal's documentation.

No finished-map acceptance is requested or implied. Materials, derived repairs and
attachment declarations remain unapplied until the architect reconciles these four
decisions. Combined runtime, support loss, local retirement, native traversal and later
bounded visual review remain required after implementation.
