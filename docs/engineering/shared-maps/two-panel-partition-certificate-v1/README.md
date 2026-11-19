# Two-panel source-local partition certificates

Coder delivery for architect `e2b8d83662a1bfbbb4b01c5684d727064b438c9f`, using
accepted `beafca54b7f6c18058a4a56f700e7303acede7aa` source/API evidence. The
contract is copied under `authority/` with exact Git/path/byte provenance; no
architect branch was merged. The user authorized this certificate calculation
after the earlier read-only check found the envelope inputs missing.

## Numerical result

Both generated whole-source certificates **pass the existing numerical ledger
gate with the certificate present**. Each canonical quantity stays 2 and each
saved raw native quantity stays 2.0000007051926145. The positive drift is
7.051926145251741e-7 per owner; no amount, formula, source point or tolerance
was tuned or normalized.

| Child/bond | Certificate positive | Certificate negative | Certificate roundoff |
| --- | --- | --- | --- |
| `main/5/cell-4-1/1` /008 | 1.6021640082178225e-6 | 1.2002163057223785e-5 | 2.163676437173736e-9 |
| `main/6/cell-4-8/1` /026 | 1.6019054663486856e-6 | 1.2001904515576692e-5 | 1.9051345680368344e-9 |

Each owner has sourceCount 1, sourceQuantity 2, finish null, epsilon 1e-7 and
source area 2. `sourcePartitionAllowance` examines twelve triangle-cell pairs
per surface (six canonical source cells, two thermal triangles). Full lower/
upper-area, discard, coordinate-scale, minimum-crossing and roundoff evidence
is preserved in the two `surface-legacy-pair-*.json` files and owner rows in
`certificates.json`.

The ledger's unchanged input-roundoff addition is 2.842170943040401e-14 per
owner. Final positive allowances are 1.602164036639532e-6 and
1.601905494770395e-6; both exceed the saved drift. Aggregate canonical stock
is 4, raw stock 4.000001410385229, delta 1.4103852290503482e-6, and positive
allowance 3.2040695314099267e-6. Negative and roundoff sums are recorded too.
This replaces the earlier missing numerical envelope with computed evidence;
it does not replace any source witness or native binding.

The disposable local ledger used `prepareHybridActivations(rows, [], rawTotal)`
and `validate()`, exercising its existing whole-owner certificate branch and
batch checks. The stage was never committed. Before and after snapshots retain
activeInitial 0, coldReserve 4 and nativeStaticBirths 0; both the stage and
ledger were disposed. The no-certificate fallback was not used. No producer
receipt was issued, and receipt authenticity/coupled installation remain
unestablished. Future production native IDs stay null.

## Exact calculation and provenance

The two unchanged source blueprints are copied byte-exact as
`inputs/selected-blueprints.json`, SHA-256
`31cffb6c03f393446d10c4dd42b4242751ab895926b416e1b8a290f60e46076e`.
Original path in `beafca54`:
`docs/engineering/shared-maps/new-york-two-panel-native-diagnostic-v1/selected-blueprints.json`.
This is the complete numerical geometry input: two surfaces /four thermal
triangles /twelve canonical source cells. No original physical mesh or native
output geometry was parsed or recomputed. Saved native stock comes from the
accepted diagnostic's `diagnostic-results.json`, SHA-256
`026c11002fb0f0f2a513f3a71a7b832b269a5695a4a9b1e52db81e7f75d66cb7`.

The grid remains origin [0,0,0], pitch [.5,1.06,.5], pinned to the existing plan
metadata in `source-grid.json`. `native-stock-inputs.json` records exact owner/
canonical/raw values without receipt authority. `preflight.json` and the
certificate provenance include all source/grid/API pins and source revision.

Existing functions are unchanged at `beafca54`:

- `sourcePartitionAllowance` in `workbenches/furnished-house/partition-error.js`, LF SHA-256 `418dfed7111863c5519ac258c97227a61adf96fe5aa103c0086980654a2faab1`.
- `prepareSources` in `workbenches/furnished-house/scene.js`, LF SHA-256 `b80ce81dfa615d419421437076d3bdd69fa5bba48fde4e6ef7f7492b1e908655`, supplied the aggregation/registration row shape only; it was never called.
- `prepareActivations` /`prepareHybridActivations` in `src/simulation/source-carriers.js`, LF SHA-256 `a564bbef05996c8a62027d319bf99d8b79360dfe7c2d6a9e1b9beae7b30ecfd6`.

Diagnostic tooling directly calls the existing certificate function once per
surface and aggregates its fields in the exact `prepareSources` arithmetic
order. It returns numerical registration-shaped rows, not native receipts.
Geometry EPS, the coupled coordinator and source-span API are pinned alongside
these functions in `preflight.json`.

## Controls, limits and cleanup

The synthetic child passes **4/4** controls: exact per-owner aggregation with
two source/finish contributions; positive drift with unchanged raw stock and
an uncommitted ledger; positive/negative overrun, wrong input, invalid epsilon
and batch refusal; a present zero allowance overriding fallback, missing
certificate refusal and a geometry-bound refusal. It made five synthetic
certificate calculations over ten thermal triangles /twenty canonical cells,
eight ledger checks, seven created/disposed ledgers and zero native compiler,
trial or step calls. These stay within the 64-cell /256-thermal-triangle and
30-second /64-step limits. Exact checked source snapshots and log are preserved.

The one actual numeric child made **two certificate calculations**, processed
four thermal triangles /twelve canonical cells, and performed one local ledger
validation (one created/disposed ledger). Native compiler, source asset decode/
expansion/transform, producer, graph, trial, clock, renderer and build counts
are zero. The stage was not committed and production state was not mutated.
No source witness/contact task or combined integration was performed.

The actual numeric allowance is **spent**. All earlier native/source/endpoint
allowances remain spent and old packets remain immutable. Do not replay the
numeric child. `audit.mjs` checks saved scalar evidence, source text and opaque
input byte pins without importing the certificate function, parsing geometry
or recreating a ledger. `manifest.json` pins the task payload and
`verification.json` summarizes scope/count/result checks. Runtime declaration
is 23 existing files /67 added files; the two additions are diagnostic tools.

Both finite children exited and their PIDs were verified absent in
`cleanup.json`; no helper or port remains. Restart inputs, exact source
versions, executable, deadlines, checkpoints and spent-allowance restrictions
are preserved. Protected support-regions WIP retains its raw hash and stays
unstaged. Runtime behavior, production policy, raw fuel, original geometry,
source tuples and every older evidence packet remain unchanged. Architect
review of this candidate and the artist's separate proposals precedes any
newly bounded combined check; no map/Pages acceptance is claimed.
