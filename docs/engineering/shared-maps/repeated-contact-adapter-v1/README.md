# Reusable original-contact source/receipt mapper

Isolated development candidate under `repeated-contact-adapter.md` at architect
commit `e32a998f`. The committed authority and the preceding draft are copied
verbatim; both have SHA-256
`dc91ab5ea868b9cf54651e96a5b1b3d81a640e6de0b08da271ad49dbec32b5fb`.
Base is the separately reviewed proof-guard correction
`2143d37b09e3cbba12a14fa8a465a2f8e78060bb`. That adapter, passing core, previous
tests and all historical native evidence are unchanged by this candidate.

The only artist batch consumed is committed
`0e9ffa764610f7ab047e3d4cdebd05342273463f`, root intake `cfb33dbe`, from
`cornice-front-contact-repeat-v1`. Its five named data/check files are preserved
under `artist-*`, with original paths/bytes/hashes in `artist-provenance.json`.
No artist branch history, other candidate or WIP is imported. Artist's report is
144 source-contact / 479 negative checks with 48 proved selectors, not native
bindings or family acceptance. The original `runtimeConsumable:false` proposal
and historical volume/null/false fields remain unchanged.

## Scope and preparation

`src/content/original-contact-adapter.js` provides one data-driven mapper, rather
than a separate implementation for each pair. Preparation validates all 48
selectors of the 24 selected pairs, using the 25 original source parts and 30
actual source definitions. Parent original primitives are 8/10 (24 each); child
primitives are 0/2 (23/25). Each record retains its own point, original component,
primitive, normal, role, global part index and both endpoint selector bounds.
The two Z selectors per relationship remain independent records.

`prepare-input.mjs` authenticates the original runtime inputs and artist-selected
metadata, preserving global tuple indices. It expands only these 25 original
owners, once each, plus 25 original-part transforms to verify all ordered-world
Float64 triangle hashes against the committed batch. It creates source
definitions only; no compiler is imported. The two geometry buffers and all
matrices/physical dimensions are unchanged. Source revision remains
`dcc3a17e39cdc07578b4fba5308d6c21817a6ccdd9ca98a908fb1e5a292eccea`.

Preparation owns/freeze-captures the supplied dictionary **once**, then issues
selector proof capabilities referencing it. Counts are exposed: 25 unique parts,
30 unique definitions, 48 proofs / 96 fixed ports, one owned dictionary copy,
zero per-proof geometry copies, and 300 original triangles. There is no new
resource cap. A long shared cornice is not cloned into every proof.

Each original face is checked at the supplied point against the actual triangle,
component, normal and selectors using existing geometry/contact predicates.
Source definitions determine whether that original face uses the surface
channel or a measured solid-channel side of a plane. Both signs of the original
wall side are supported; no pilot triangle or point is substituted. Projection
and source-loop cell formulas retain the existing grid/EPS math. Original
`sourceId` values are retained, not reindexed or reconstructed from a subset.

## Supplied source schema and API

```js
const prepared = prepareOriginalContacts({
  sourceRevision, grid: {origin, pitch},
  parts: [{id, ownerId, globalPartIndex, role, triangles /* original numbering */}],
  surfaces: [/* original source definitions, with id/sourceCarrierId/nativePartId */],
  contacts: [{
    id, relationshipId, direction: 'parent-to-child', point, selector,
    parent: {partId, ownerId, globalPartIndex, role, component, primitive, normal, selector},
    child:  {partId, ownerId, globalPartIndex, role, component, primitive, normal, selector},
    historicalVolume
  }]
});
const proof = prepared.proof(selectorId);
const contact = bindOriginalContact({proof, reader, slices});
const result = contact.evaluate({revision, retireRecords});
contact.dispose();
prepared.dispose();
```

The complete source definitions must also retain their original mesh bindings,
normal, kind, thickness and triangles. Parts use unique **scoped runtime source
part IDs**, not an assumption that raw art IDs are globally unique. Original
global part indices are checked against each source-definition prefix. Source
preparation reports accepted/rejected selectors explicitly; unsupported records
do not borrow a sibling proof or silently disappear.

Proofs are immutable, privately issued objects, not authority conferred by
deserialized fields. The existing altered-cell regression rejects a copied
proof before receipt access. On bind, the reader's actual generation/revision /
grid, payload owner, original part, source definition and exact source cell must
match. The native record ID is read from the matching receipt entry, never
guessed from a centroid or string suffix. The reader remains caller-supplied and
must authenticate genuine producer slices; synthetic readers are test fixtures,
not proof of real private authentication.

The existing original-face patch filter and native contact predicate are reused.
Only surviving patches of the selected original triangle inside both selectors
are admitted. Generated caps cannot receive original exterior face identity.
Each bound contact owns one local two-endpoint core without anchors; there is no
assembly/full-source support graph evaluation or grounding claim. Retirement
removes only the exact bound native ID; an unrelated record cannot replace it.

Bindings freeze the original native IDs/cells for their generation. Reset and
disposal clear born fragment/slice references. A changed source revision/grid or
generation, an expired reader, or disposed preparation rejects old bindings and
releases their geometry. Static preparation can be reused for a fresh generation
only through a new authenticated bind; it cannot reuse the old born records.
Source-disposal closes all owned local bindings. Errors carry frozen
`diagnostic` records with selector ID, stage and reason for later integration.

## Checks and retained findings

`source-final.json` revalidates the cached original source definitions with the
final adapter: **48 prepared, zero unsupported in this batch**. It records no
native bindings. `focused.*` passes **60/60**: seven new generic mapping groups
plus all 53 prior focused controls. New controls cover a real translated pair
from the committed batch, distinct selectors/triangles, opaque supplied record
IDs, the altered-proof-cell regression, wrong owner/part/cell, exact versus
unrelated retirement, cap rejection, unsupported selectors, and generation /
revision/reset/disposal. All new native-entry controls are **synthetic opaque
token fixtures**, not actual native recompilations or geometry replay.

Two source-tool findings remain preserved:

- `source-first-failure.json` / `first-prepare-input.mjs.txt`: JavaScript JSON
  number spelling was incorrectly treated as equivalent to the artist's Python
  canonical serialization. No source expansion had occurred. The corrected
  extractor authenticates the original family file's exact raw SHA and selects
  exact original pointers/IDs, retaining the artist canonical hashes unchanged
  as provenance. It does not relabel a JS hash as the Python canonical hash.
- `source-first-report.json` / `source-module-first.js.txt`: initial strict normal
  comparison rejected the 25 primitive-2 cases because reciprocal multiplication
  produced Y=0.9999999999999999. `normal-comparison.json` confirms real point /
  selector membership and shows the existing core/artist division order yields
  Y=1. The new mapper uses that existing operation order. Shared helpers,
  tolerances, geometry and artist records were not changed.

The initial completed extraction performed 25 source-owner expansions and 25
original-part transforms; all later checks use cached arrays. The source helper
refuses to repeat extraction once `input.json` exists. Source transformations
are distinct from native compilation and publish no stock or thermal state.

## Explicit limits and delivery

This candidate supports the committed full-part 24/48 batch. It reports
`shared-selector-required` for null shared selectors and `source-range-not-supported`
for explicit ranges/primitive offsets. It expects complete original triangle
numbering and unique scoped source-part keys. Shared raw art IDs with different
owners/ranges need a separately reviewed identity adapter; none are collapsed
or renumbered here. Other buffers, rotated/end pairs, the larger cornice family
and the separate non-cornice inventory are outside this intake. No mount, anchor,
symmetric brace, volume filling or Boolean/domain solver is added.

There were **zero new actual native/compiler calls**, pair-validation sessions,
world/thermal steps, stock publications, full-New-York diagnostics, renderer /
browser runs, builds or benchmarks. Previous actual native allowances remain
spent; the full New York diagnostic remains unrun/unused. The actual native
IDs/cells for this repeat batch remain unbound. No live factory imports this
module, and general query-bridge admission/full-map acceptance is not established.

The finite test child exited and its PID is absent. No helper/server/port remains;
there is no automatic replay. Declaration: **22 modified / 52 added**, with the
new generic module only. The separate 2143 proof guard and all old core/helpers,
tests, WIP and raw native evidence remain unchanged. Commit/push this candidate
separately for architect/independent review before larger normalization or live use.
