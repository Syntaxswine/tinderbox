# Two retained-cut source prototypes

Both exact prototypes have complete source-reference proofs, pending independent
architect review. This candidate installs no quantity or physical geometry.
Authority is `89d4073103f436187236ee0272c1ceac6067fe02`; the artist parent is
`30499d04069bea041bf7cf06b4b0e6ba9bff0291` and the frozen original scene/producer
context is `2b350309d9116812a1d3988af090614bdaefbc25`.

[Authority snapshot](../../../art/source/shared-map-fire-bindings/cut-partition-edge-ownership-v1/authority-89d40731.md)
and [input pins](../../../art/source/shared-map-fire-bindings/cut-partition-edge-ownership-v1/input-pins.json)
retain the committed decision, original producer hashes, exact source ranges,
two targeted compiled sections and original matrices. All 121 earlier
payload/package files and 1,572 geometry inputs remain hash-identical.

| Exact source | Original triangles | Analytical edge splits | Implicit patches | Reference volume, m3 |
| --- | ---: | ---: | ---: | --- |
| Administration `replacement/office-door-7/header` | 13 | 0 | 2 | `6926928393/4398046511104` |
| Horticulture `replacement/court-0-0-arch-10/jamb--1` | 25 | 2 | 2 | `2060077252821575/18014398509481984` |

The [certificates](../../../art/source/shared-map-fire-bindings/cut-partition-edge-ownership-v1/prototype-certificates.json)
contain every source triangle, edge partition, patch owner, topology,
intersection classification, exact integral and directed-lower scalar proof.
The [two-case ledger](../../../art/source/shared-map-fire-bindings/cut-partition-edge-ownership-v1/resolved-unresolved-ledger.json)
summarizes status and physical-closedness flags. The other eight held sources
are untouched; no prototype is automatically applied to them.

The header was clipped by **two** recorded operations, in order:
`admin-office-partition-6/opening` and `admin-office-partition-7/opening`.
Its nonplanar boundary partitions into the captured Z=12 and X=28 cut-plane
patches. Both are exactly planar and share only the edge between existing
point references 26 and 17, used in opposite directions. Its closed reference
has 13 vertices, 26 atomic edges and 15 faces; Euler characteristic is two.
The whole original boundary remains nonplanar.

The court jamb retains its original 25 triangles and the raw 13-bad-edge
finding. Exact analytical subdivision of two edges uses existing points only:

- Edge 44 -> 25 contains point 53 at `1530921/3869245`.
- Edge 20 -> 60 contains point 65 at `2338324/3869245`.

Point references are vertex ordinals in the original captured position
attribute. Triangle offsets 0, 3, ... identify consecutive triples of those
ordinals. Equal captured positions share an analytical node; per-corner source
arrays, normals and UVs stay intact. Every subdivided edge proves ordered,
collinear, complete coverage of its original [0,1] parameter interval. Every
original triangle retains its exact boundary domain, oriented area vector and
volume integral.

The jamb's boundary partitions into the captured X=-76 and maximum-Y patches.
They share only the existing edge between points 65 and 53, with opposite uses.
The reference has 20 vertices, 45 atomic edges and 27 faces; Euler characteristic
is two. Analytical ownership does not repair the physical mesh or overwrite
its raw closure failure.

Each patch is a continuous planar polygon, with no exported cap vertex/index
buffer. Boundary edges have unique recorded-operation/plane owners. Exact
Float32 cell evidence traces original recorded coordinates and pre-cast source
points to captured coordinates. The jamb's captured maximum Y is
4.9200000762939453125; its signed outside clearance from the recorded binary64
4.92 plane is `42949673/562949953421312 m` (about +76.3 nm). That difference
remains explicit. Header X=28 and Z=12 correspond exactly.

Finite-domain checks prove each convex patch lies within its owner's captured
opening, survives every other recorded cut, and preserves all original-plane
residuals. Every original source triangle is outside the interior of every
captured cut. Captured plane certificates prove their original Float32
rounding cells; no clearance is zeroed and no global allowance is introduced.
The original operation order and both header cuts remain in the certificate.

The complete polygon complex proves two opposite uses per edge, connected
cyclic vertex links, one face component and Euler characteristic two. Every
face is exactly planar, simple and convex. Exact face-pair tests cover source
faces, source/patch pairs and the shared patch joints; intersections are allowed
only on their owned existing subcomplex. No overlapping interiors are found.
The closed oriented-area vector is zero, and translation of the integration
origin by (1,2,3) preserves the exact positive volume.

The open source integrals remain diagnostic values, about 0.1145081414 and
18.4186427110 m3; neither supplies the quantity. Closed reference volumes are
about 0.001575001168 and 0.114357259929 m3. Applying the actual determinant and
existing exact-binary64 `.12` recipe gives source-only directed-lower scalar
values 0.013125009735404092 and 0.9529771660787718. Each includes adjacent-bit,
exact dyadic and JSON/decimal rounding-cell evidence. No fuel, component stock
or union stock is assigned.

All records retain `closedSourceSolids:false`. A closed measurement reference
grants no physical containment, collision or support shortcut. There is no
physical mesh/cap/index/UV/coordinate/opening/native-scale change, stock,
binding, support, profile or runtime install. Renderer/factory work is absent,
and roofs remain UI-owned.

[Checks](../../../art/source/shared-map-fire-bindings/cut-partition-edge-ownership-v1/check-results.json)
pass for exactly two prototypes and
[12 rejecting controls](../../../art/source/shared-map-fire-bindings/cut-partition-edge-ownership-v1/negative-controls.json).
They reject omitted/reversed patches, omitted/duplicated source triangle records,
a single disk over each nonplanar boundary, bypassed court edge atomisation and
a non-source endpoint offered as a split/weld. Physical source arrays are
unchanged in every control. Python syntax, JSON/UTF8/LF, links, package hashes
and scoped Git checks accompany the required read-only reproduction.

~~~powershell
Set-Location 'C:\Users\baals\.codex\worktrees\art-assets\tinderbox'
python -B art/source/shared-map-fire-bindings/cut-partition-edge-ownership-v1/review.py
~~~

The default checker refuses writes, reproduces the five saved reports and
verifies the [payload manifest](../../../art/source/shared-map-fire-bindings/cut-partition-edge-ownership-v1/review-package.json).
Source calculations resumed only after Coder's explicit corrected-cost-process
exit notice. No benchmark or performance claim is made. No renderer, browser,
runtime or whole-map test is claimed for this source-only candidate; no helper,
server or port remains retained. Architect review is required before adopting
either new reference.
