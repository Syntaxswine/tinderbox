# Shared-map CPU checkpoint

This worker checkpoint implements the first CPU/source slice of [M29](../../milestones/29-shared-gameplay-maps.md). It is **not a finished New York gameplay map or publication candidate**. New York's menu still opens the existing exploration scene. The activation frontier, streamed physical/render retirement, shared presentation and normal-input browser acceptance remain pending architect review.

Source baseline is `6d1061cd3ab7e6c9bff212381193376473413b30`. Exact merged intakes are UI `2c866a6bf173e1549c54d34c124a9d055febda3d` and artist `59b9373f47d51531c7e505613f67dd1e426b37f1`, preserving the earlier `a067048a` binding candidate. Original assets, source checkers, M28 declarations/control exports and the previous coding branch remain intact. No donor checkout or source pin changed.

## Implementation boundary

- `src/runtime/place-navigation.js` extracts the existing native geometry, movement, support, stairs and contextual door queries. It owns no player, inventory or gameplay clock. The old exploration controller borrows these queries and retains its diagnostic behavior.
- `src/simulation/scene-thermal.js` is the single extracted Catalogue provider. The old `catalogue-thermal.js` entry delegates to it. The existing gameplay loop now accepts a sparse `gameplayMap` adapter and keeps standard stock, five tools, character selection, clocks, accepted-path pouring, exposure, pause and reset. Catalogue-specific resident/lot registration stays explicit.
- `src/content/shared-map-pilot.js` and `tools/compile-shared-map-pilot.mjs` consume the artist's three accepted source contacts. They qualify local IDs once and use already-offset world matrices. Each pilot is independently verified as a closed rectangular native solid before extracting its actual primary face and thickness. This does not provide an AABB fallback for arbitrary/cut/pitched geometry.
- `src/runtime/native-query-registry.js` supplies lazy inert native geometry in the same physical index used by tools, sight, transport, radiation and falling payloads. Known physical footprints reserve their proxy area permanently: local retirement cannot restore the old navigation floor. Render section residency does not own this registry.
- `src/simulation/source-carriers.js` accounts for all accepted canonical static stock before activation. Activation is a transfer, duplicate activation is inert, and real oil additions remain separately debited births. A cold reserve cannot relax validation of an invalid local transfer. The current pilot installs only its three initial carriers; runtime frontier activation is not implemented.
- Factory capabilities are frozen and shared with runtime, application state and UI. Snapshots may restrict and restore factory-enabled features, never grant a disabled feature or change mode. Native scene snapshots include their actual navigation/query metrics.

The kernel's grid, `RULES` and combustion profile coefficients are unchanged. New adapter hooks install inert query bodies, preserve the explicit no-implicit-ground policy, recognize the shared scene namespace, and keep a separately finite coating attached to its structural core, including falls and visible exposed-face sampling. Finish consumption cannot retire that core. [M29 hash evidence](runtime-integration.json) records exact before/after files separately from the immutable M28 record.

Normal Catalogue selection now chooses the accepted modular host. `?catalogue=legacy`, witness and cottage wind/calm routes remain explicit compatibility controls. The cottage-specific obstacle-resolved Nautilus wind bake is not valid for a different building layout. This New York CPU pilot labels its ambient 1.5 m/s +X wind control with `obstacleResolved:false`; a resolved landmark wind field remains pending.

## Measured scope

The runtime pilot is **1,085,057 bytes**, extracted from the **27,291,670-byte** authoring sidecar. Its SHA-256 is `bd961c4a673310d3ea8a754d071568efc94847a8f740a0ae1142d46b069454ae`. The compiled artifact includes physical source hashes, explicit material/quantity records, three active native surfaces, source/render ownership and floor reservations. It never constructs the monolithic landmark factory.

| Counter | Three-source CPU fixture |
| --- | ---: |
| Canonical carriers | 12,342 |
| Active carriers | 3 |
| Reserved, not activated | 12,339 |
| Canonical initial fuel | 15,036.153906 units |
| Active initial fuel | 3.1 units |
| Cold reserve | 15,033.053906 units |
| Allocated thermal cells, idle and after 4.5 world seconds | 236 |
| Native query records | 6,295 |
| Peak queried shapes / triangles | 18 / 380 |
| Query cache ceilings | 192 shapes / 65,536 triangles |
| Dense host ground tiles | 0 |
| Initial unresolved active support nodes | 8 |

The initial native clipping discrepancy is about `9.8e-7` fuel units. Diagnostics expose it as `nativeClippingDelta` and retain the canonical/world error; no coefficient or authored quantity was altered to hide it. The native trial's own finite ledger remains balanced.

One direct source-contact fixture measured 134.944 ms construction and 0.137 ms mean / 0.151 ms p95 / 6.304 ms maximum per native advance over 135 steps. These are CPU-only measurements for **three sources**, not representative whole-building performance, normal gameplay FPS, graphics cost or phone Safari acceptance. No renderer, lights or section-render residency was measured.

## Checks and retained failures

- A 140-test affected navigation, host, native collision, application and UI batch passed 139 checks, including 42 native landmark door visits. Its one failure was a cached reserve subtraction producing `2.9999999999999996` rather than the original sequential sum of 3. Reserve sums now update only on activation, preserving the original sum order without scanning every publication.
- The final focused run passes **25/25**: all three animals at 9 m/s in the New York host; standard five-tool stock and oil debit; match press edges; torch world time; lantern joystick aim/release; pause/reset; elevated heat without a ground projection; local lacquer ignition/exhaustion without core retirement; shared obstruction, falling-lantern impact/spill, no floor resurrection, unrelated distant geometry and canonical accounting; runtime lifecycle and capability restrictions. Lifecycle renderer APIs are mocks; this was not a browser/GPU session.
- The separate M29 source wrapper executes all **15** preserved M28 physical assertions, **60** routes and **819** source/render registration comparisons. All pass. It preserves the old checker, reference, declaration and receipt, and audits the additional runtime hashes. This retains stop-only geometric controls; new movement/provider controls are the separate tests above.
- Artist `check.py --compare-binding-ref a067048a84e91a049a5cfcbc9209e84e118fc1af` passes: 575 physical dependencies, identical canonical carriers/quantities, six negative controls and original physical assertions.
- Pilot regeneration, runtime declaration checks and `git diff --check` pass. No repository-wide build/package, nested-host release or browser matrix ran under this CPU grant.

Earlier local test attempts remain findings: the test initially used the wrong `worldToStick` signature, omitted the lantern's required joystick aim/release, and incorrectly expected every unlit coating patch to exhaust on the first patch's clock. Those fixture expectations were corrected; per-patch lifetimes and production input rules were retained. An initial hash-recording script also assumed the new UI menu file existed at baseline; the durable recorder now handles added files explicitly. The failed source-output directory is preserved.

Local evidence is under `artifacts/qa/shared-map-pilot/`: `final-cpu/focused-null-capabilities.log`, `m29-native-source-checked/`, `three-source-cost/counts.json`, `failed-attempts.json` and earlier source attempts. These artifacts are excluded from the commit. All finite commands completed; all providers disposed. No server, browser, watcher or retained helper was started.

## Remaining engineering gate

Full accepted-material activation and propagation-frontier loading are pending. The 12,339 reserved carriers currently cannot receive combustion as active native fuel. The pilot's eight active structural nodes have unresolved support rather than invented anchors; the full artist table separately records 664 unresolved support cases. This checkpoint does not establish complete collapse behavior.

The artist retains 75 material-unassigned ornaments and 29 open access-cut meshes with withheld finite quantities. The three pilot solids pass independent closure checks. Existing faces of the 29 open sources screen rays, but their missing caps prevent a closed-solid screening claim. No caps or source arrays were changed. A bounded artist/compiler correction and architect geometry decision remain separate from this source-pilot pass.

Next work is persistent activation with honest reserve transfer, actual source support/door bindings, source-range render char/retirement across section reloads, bounded elevated surface presentation, source-aware aiming, New York main-route conversion, and an architect-granted normal-input visual review. Administration/Horticulture conversion and compatibility-route reconciliation follow the reviewed pilot. Exactly four menu destinations remain.
