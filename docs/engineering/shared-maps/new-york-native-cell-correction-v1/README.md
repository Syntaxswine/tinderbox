# Native clipping and fixed-point membership correction

Coder correction to `1f857eac5f2140becf707a6f02f49626cf8c6289`, assigned by
architect `9a07b6169a6882053cca7e4abaf4ee6e6d91ae42`. Its amended contract and
returned review are copied byte-exact under `authority/`. This candidate
changes the shared mapper/factory predicate and supplies a separate proposal;
production policy, inputs, gameplay, original archives and the prior **70/4**
packet remain unchanged. There was no actual native New York world/test,
source transform, support solve, renderer, game build or Pages run.

## Saved validation: 72 mapped, two UNBOUND

The new, explicitly authorized single saved-only validation inspected the same
74 fixed endpoints and 152 cell candidates, at most four per endpoint (limits
74 /592 /eight). All four returned cases now have positive retained patches
containing their unchanged projected points under `segmentTriangle`:

| Child endpoint | Proposed cell | Saved retained area, m² |
| --- | --- | --- |
| `legacy-pair-012` | [128,4,119] | 0.5300001718463285 |
| `legacy-pair-014` | [128,2,118] | 0.5300002132204816 |
| `legacy-pair-030` | [110,4,120] | 0.5300001718463285 |
| `legacy-pair-032` | [111,2,120] | 0.5300002132204816 |

Of the other seventy binding plans, **68 reproduce exactly**. Two previously
mapped child endpoints now remain UNBOUND:

- `legacy-pair-008`: previous cell [128,7,119].
- `legacy-pair-026`: previous cell [110,7,120].

Both have positive clipped candidates but their fixed projected points fail
retained-triangle membership in every examined candidate. Their reason is
`FIXED_POINT_NOT_IN_RETAINED_NATIVE_PATCH`. This is a source-mapping boundary,
not a claim that the original physical parts have no contact. All unchanged
source tuples and candidate area/membership evidence are preserved. The tool
did not move a witness, choose a new face, rerun a contact/witness search or
retry the saved validation. All six separately approved saddle endpoints retain
their previous binding plans.

`endpoint-results.json` contains all 74 results, the four named cases, all six
differences and the complete other-seventy comparison. `mapped-plan-proposal.json`
contains the updated mapping plans. Native record/cell IDs and generated
mapping approval references remain null. Source-policy proposal bytes are
identical to the prior separately reviewed proposal: 34 original tuples plus
the three exact artist source tuples, total 37. It does not grant new source
or mapping approval.

Metadata admission remains **NOT_READY**: 38 surface-plan approval findings,
74 mapping approval findings, 32 ordinary-alternative approval findings and
32 ordinary-binding findings. All 179 ordinary alternatives in 33 rows remain,
including 141 unresolved outside-cohort references. Canonical quantities,
finish, modes, grid, original anchors/root boundaries, lower ALL and directed
upper semantics remain unchanged. Actual native lineage and playable-map
acceptance still require architect review and separate authorization.

## Correction and checks

The old shared function discarded a neighboring upper cell using one
EPS-expanded AABB before native clipping. The native clipper also uses its
existing EPS polygon comparisons, so that filter could discard a retained
original bottom edge. A positive clipped area alone also did not establish
that the fixed point belonged to the retained triangles.

The corrected shared function considers the floor cell and its nearer neighbor
on each axis, restricted to the unchanged canonical source loop. These at most
eight cells form a conservative broad phase; they do not establish ownership.
Each candidate runs the unchanged native clipper with its unchanged expanded
bounds and area threshold, and must pass the existing zero-length
`segmentTriangle` membership predicate at the unchanged projected point. A
valid floor cell wins; otherwise numeric lexicographic order selects a valid
cell. No global tolerance, point, loop, projection or native geometry algorithm
changed. No live-record search or post-retirement substitution is introduced.
Mapper and factory already call this one shared function.

Preserved finite synthetic runs:

| Run | Result | Synthetic compiler calls | Trials created/disposed | Aggregate steps |
| --- | --- | --- | --- | --- |
| `original-failure` | Expected reproduction: 1 failed control against exact `1f857eac` function; all four native Float32 patches contain their points while the mapper refuses them | 4 | 0/0 | 0 |
| `synthetic-ready` | 37/38; corrected geometry controls pass, new birth fixture incorrectly specified zero regional owners | 59 | 17/17 | 4 |
| `synthetic-corrected` | **38/38** after selecting one synthetic regional root owner | 78 | 20/20 | 4 |

Total: 141 synthetic compiler calls, 37 created/disposed trials, eight steps.
Each child had a 30-second timeout /64 aggregate-step ceiling and fixtures
within 64 logical source cells /256 thermal input triangles. The final run
includes both Float32 elevations near 2.12 and 4.24 in both wall orientations,
four genuine native births and fixed-record retirements, and the existing
35 controls. Another genuine incident record remains intact after each new
retirement while the fixed ALL port and upper dependency remain broken. The
negative control rejects a positive nearby patch that does not retain the fixed
point, plus genuinely missing/empty/outside-source cases. Caches, active
bindings and producer receipts are released. Snapshots preserve the exact
source/test versions of the expected and fixture failures; no failed artifact
was overwritten.

## Provenance and execution limits

The saved input pins are unchanged, under
`../new-york-source-preparation-v1/`:

| Input | SHA-256 |
| --- | --- |
| `selected-world.json` | `5353b5f6d6ccae1d13931bfa93f4bbdcfd498994f33a5eff49db82c2ece5c8fd` |
| `selected-blueprints.json` | `1685e0afc81e21b16f8db3fa00e81bc326a9b1ca24453c759abcf55df28ebbf2` |

The new child parsed the saved 38 parts /456 original triangles and 78
blueprints /156 thermal input triangles. Exact ordered facet reference sharing
was restored as before: 96 references across 48 facet surfaces; all 30 derived
planes stay derived. No geometry decode/expansion/transform or component
recomputation occurred. Actual native compiler/producer/trial/support/clock/
renderer/build counters remain zero.

The three approved raw artist proofs under `source-intake/` are unchanged from
`6c8e7198040395978ba1f7f786a089efea8f687d`, source-approved by architect
`fdd27ffe`; all exact paths/hashes are in `preflight.json`. Both old source
archives and prior proposal metadata have pinned opaque bytes. The new policy
is byte-identical to the prior policy proposal; generated mapping digests are
not used as their own approval.

The amended saved-data allowance is **spent**. Do not replay either saved child
or overwrite the prior packet. The new source/logs/receipts/one-use markers and
all outputs are pinned by `manifest.json`. `audit.mjs` checks scalar output
metadata, source text and opaque byte provenance without importing the mapper,
parsing source geometry or recomputing membership. Runtime declaration: 23
existing files /63 added files.

All four finite children exited; PIDs were verified absent in `cleanup.json`.
No helper or port remains. That record preserves source versions, launch
arguments, working directory, runtime, checkpoints and spent-allowance restart
restrictions; no automatic restart is installed. Protected support-regions WIP
retains its original raw hash and is excluded from the commit.

Commands run: `run-synthetic.mjs original-failure`, `synthetic-ready`,
`synthetic-corrected`; `tools/validate-saved-new-york-source-cells.mjs --preflight`
and **once** `--saved-once`; runtime declaration record/check; metadata-only
`audit.mjs --write` and verification; scoped `git diff --check`. The architect
owns intake and any further source/native authorization.
