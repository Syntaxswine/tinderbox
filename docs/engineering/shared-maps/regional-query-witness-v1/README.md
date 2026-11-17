# Scoped containment-witness correction

Successor to `68b6e3995bc4bad5f270275578a630fb2646c501`, under the
architect's `54504bae` query review. `authority-review.md` snapshots that exact
Git object. Only the isolated query module, one new two-test regression file,
the existing runtime declaration and this new evidence directory change.
The worker remains `codex/shared-map-gameplay-code`; promotion is separate.

## Changed predicate and affected domains

The reported unit-cube cylinder at XZ `(.5,1.01)`, radius `.1`, vertical band
`[1.0000003,1.0000007]` was falsely blocked in both cold and fully native
views. An arbitrary off-centre capsule point above the actual solid passed
the original parity tolerance even though the original sweep's endpoint
samples did not. This did not involve an actual face intersection.

`closedBodyIntersects` now searches for the full capsule/cell witness inside
the intersection of the unchanged body domain and original shape bounds.
Bounds only restrict the search: the original checked-mesh containment
predicate still decides whether that witness occupies solid. Radius, vertical
extent and intermediate sweep domains still participate; a body centre in
empty native coverage does not hide actual cold interior reached by its edge.

Outside the actual shape bounds, tolerance occupancy uses only the original
sweep endpoint samples at its original midpoint height. Each sample must lie
in that same half-open body domain before the original mesh predicate can
block. A cold parent cannot claim an endpoint in native/retired coverage.
This is a scoped tolerance case, not a global centre-only clearance path or an
unscoped ordinary sweep. No bounding box supplies positive solid occupancy.

The changed predicate applies only to containment for intact closed cold
source cells and intact, unretired closed native records in their existing
native domains. Actual solid-face collision, open shells, ray and face
channels, masks, internal planes, outer geometry halos, EPS values, extent
admission, inventory, retirement and view lifecycle remain unchanged. No
synthetic face or cap is introduced. The centred near-outside and thin inside
bands still block; the farther outside band still clears.

## Reproduction and checks

The original public script/results were read from the UI worker's
`artifacts/ui-qa/regional-query-68b6e399/`. The two `review-additional*` files
preserve their exact bytes. `recheck-additional.mjs` rebases imports/output to
this checkout and adds the candidate hash/process metadata, preserving both
case inputs. `additional-successor-results.json` matches ordinary clearance
`true` in both cold and native cases. No UI checkout is written.

The preserved `focused-before.*` run passes all original eighteen tests and
fails both new regression groups. `focused-final.*` passes **20/20**. Besides
the exact two repros, the new controls keep real upper-face contact blocked,
keep genuine cold overlap beyond a native centre blocked, preserve a cold
endpoint's tolerance, and clear it after complete empty native coverage.
The original eighteen controls retain centred tolerance, mixed full body,
named-record retirement, ray/face channels, extent and provenance checks.

Exactly **one** new bounded saved-array comparison passes **239/239**. The
harness is copied from the previous boundary checkpoint, changing only its
output location, base and authority label. Its check records exactly match
the prior passing archive. No source compiler, native proof, world/trial,
support graph, consumer, renderer, build or benchmark is run. The original
saved/source pins remain `bfab707ff646e9dfedfaae3b80d510ac750e4f561335d895c24c4e4cc4d49418`
and `1e93eb730de7a978b01069df5401ea80d4ddebcff7d101010714e8b4643fc296`.
The unchanged comparison uses .02 timber/timber-covering transmission and the
existing sourceSurfaceId sheet fallback for fields omitted by the saved data.
This is correctness evidence, with no speed claim or new native allowance.

The declaration stays **22 modified / 48 added** modules. `audit.mjs` verifies
all four prior archives, their historical source pins, unchanged controls,
copied repros, saved results, narrow source scope and protected forty-line WIP.
`manifest.json` pins the exact successor. Raw logs retain their original bytes.

Four finite hidden child processes exited. `cleanup.json` independently
confirms all four recorded PIDs absent using Get-Process; no port/helper is
retained. The first CIM check was unavailable: its unverified receipt remains
in `cleanup-cim-unavailable.json` and is explicitly superseded, not accepted
as evidence of process absence.

This remains a fixed-inventory static pilot awaiting architect/UI re-review.
No live bridge, asset installation, map acceptance or Pages work is included.
The separate source-only asset and previous browser failure remain outside
this correction. All previous evidence and unrelated WIP are preserved.
