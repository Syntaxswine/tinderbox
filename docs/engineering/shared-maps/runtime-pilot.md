# New York shared runtime engineering checkpoint

This extends the historical [three-contact CPU checkpoint](cpu-pilot.md) under
[M29](../../milestones/29-shared-gameplay-maps.md). New York's normal menu route
now creates the shared gameplay runtime. This is a limited source/CPU engineering
candidate, not a finished New York map, phone/WebGL acceptance or publication.
Administration and Horticulture still use their preserved exploration routes.
Catalogue retains its modular core and explicit cottage wind/calm controls.

## Exact intake and cold package

Completed source is artist `82b7fc604eb183d65e7569366c47f45e5f07c1b5`, with
checker-context correction `90c226f674d51a2d030fcdd4679e61a3bdd9ebfe` and exactly
ten support controls from `9a88959d2011d182377a9eeb95d5ed9d222e46b1`. The UI
presentation adapter is `47f87fb01fe922b1085c05e3082986c50b04a5c7`. Original
materials/geometry/evidence, source pins, M28/M27 controls and earlier diagnostic
receipts remain unchanged. The separately approved 48 parapet blocks are excluded
until their later exact intake; this checkpoint adds no new fuel or earth anchors.

| Runtime source | Bytes | SHA-256 |
| --- | ---: | --- |
| `assets/runtime/map-sources/new-york/index.json` | 8,021,251 | `e9bee63a5a4afb0f8513d083b7e5f1ce83f25c0441ea543e14901b70e4e0cdab` |
| `assets/runtime/map-sources/new-york/library.json` | 3,150,020 | `1e93eb730de7a978b01069df5401ea80d4ddebcff7d101010714e8b4643fc296` |

The offline compiler checks the completed 40,518,109-byte binding table, effective
geometry overlay and first-control hashes. Only the two compact source files
above, plus the existing small place manifest/navigation, load at runtime; the
authoring/evidence table and detailed original world mesh are not startup fetches.
There are 12,446 carriers, 12,858 logical source parts, 434 deduplicated local
geometries, nine appearances and canonical static fuel 15,767.943953. Local buffers
and matrices retain source UVs/native dimensions and the already-applied offset.

Cold startup constructs metadata/query bins with zero transformed world shapes,
render expansions, active fuel or thermal cells. Exact query shapes use a bounded
192-shape / 65,536-triangle cache. Follow presentation expands only resident
sections and prepares native masks before visibility; cold masks create no fuel.
Overview explicitly permits the existing 148 New York sections within a 192-view
ceiling. This is not a claim that overview graphics cost has been measured.

## Shared runtime behavior

One simulation, actor, inventory, clock, UI, character kit and camera serve the
visit. Existing five-tool commands, health, powder/pause clocks, body effects,
native tools and six-light/night services remain in the common core. The UI
adapter delegates presentation rather than implementing gameplay outcomes.

Heat/tool/portal/frontier contact synchronously installs actual native geometry,
retires the corresponding cold physical proxies and transfers its canonical
stock. No section eviction resets physical state. New registrations preserve
existing heat and radiation time. Native local patches, support and retirement
remain authoritative; decorative follow masks own no independent fuel. Reloaded
views apply persistent current state before becoming visible. Inert falling bodies
keep their actual depth, material and opacity, with zero combustible stock.

The [local numerical envelope](partition-allowance.md) reports the unchanged
clipper's signed discrepancy separately. The original 0.10 lacquer coating stays
finite and attached to its timber core. Only the exact ten accepted support joins
override the proposed structural/dependent convention. Cold unrooted carriers
decrease from 1,092 to 1,038; they are exposed as unresolved, never silently rooted.
Additional global support-family reconciliation remains required for full-map
acceptance, but does not block investigation of this limited pilot.

Tools pick original/effective world triangles and actual heights. Interior camera
selection uses the same occupied-height cut as presentation; real hand/projectile
traces retain full solids. Direct inert-face contacts return no-fuel instead of
depositing heat into adjacent timber that shares a coarse thermal cell. The native
kernel still does not maintain a separate inert-body temperature state.

Navigation consumes live original/native support and door poses. The existing
9 m/s controller, 0.22 m step limit and authored goat/horse/bear envelopes remain.
Actor support loss borrows the native 9.81 gravity step on world ticks and sweeps
the full body; no new fall damage, jump, clock or airborne oil floor is introduced.
The last occupied interior cut persists during descent until a real landing.
Ground residue uses a local 32 m / 4,096-texel field; upper residue/pour details keep
their true occupied height. Native thermal patch storey labels use real world
height without moving geometry/UVs.

New York explicitly uses an ambient 1.5 m/s +X control with
`obstacleResolved:false`. The cottage's Nautilus obstacle-resolved bake is retained
on its own supported layout. A New York wind bake is not fabricated or implied.

## Evidence and retained failures

Focused checks cover staged-native parity/rollback, strict canonical stock,
source-local bounds, query ownership, local partial-floor retirement, oil support
rebinding, inert falls, cosmetic follows, ten support-control parity and local
header support loss, elevated residue/picker behavior, section cleanup and UI
delegation. The full-source traversal test uses normal movement/interact/reset
commands for all three animals from the real spawn, up front stairs, through the
real door and into the original interior at 2.12 m; walking creates no thermal
cells. These CPU tests are not a browser visit or a normal-input upper-floor route.

The coherent final `node tools/check.mjs` gate passes **586/586 tests**, 389 own
script syntax checks, 409 resolved static modules, shared-Three/provenance checks
and the art checker's 59 syntax/dependency checks. The separate M29 native wrapper
passes all **15 physical assertions, 60 routes and 819 registrations**, preserving
the frozen checker/reference/receipt. Compiler regeneration and the M29 runtime
declaration check pass. [The source-check receipt](runtime-source-checks.json)
records these finite commands; local full logs retain the earlier failed attempt.

The artist's next proposal can reproduce the new
[base-plus-ten graph](unrooted-components-v3.json): 11,408 rooted, 1,038 unrooted,
458 weak components and 231 original carrier anchors. Its SHA-256 is
`83ac99b3895cfa2df23810d518b4669dee975c763123e597bec393b00243120c`.
The diagnostic includes exact IDs/relations, local regions, source/producer hashes
and bounded contact witnesses. It remains a proposed source interpretation,
excluding the separately approved blocks and unaccepted global family changes.

Finite 91-native-tick source fixtures retain these outcomes:

| Receipt | Outcome |
| --- | --- |
| `source-wall-v2.json` | Real coated wall contact; 44 recorded ignitions in 3.0333 world seconds |
| `source-upper-v2.json` | Real elevated timber contact; one burning patch in 3.0333 world seconds |
| `source-inert-v4.json` | Real glass contact; no-fuel, zero heat input and zero burning |
| `source-quantity-envelope-v2.json` | 579 local sources staged, including both formerly rejected well-guard tops |

These are source-contact fixtures with declared CPU stances, not traversal or
WebGL evidence. Wall/upper activation costs are approximately 877/418 ms and
activate 549/652 carriers initially. Both expand further on native hot-frontier
ticks. The wall's final signed partition delta is approximately +0.00101212 units;
the upper delta is +0.00168336. Their native heat/fuel ledgers remain separately
visible. No phone FPS, GPU or whole-building performance claim follows from this.

Earlier unsuccessful attempts are preserved in the JSON receipts and
[failed-attempt record](runtime-failed-attempts.json). They include initial numeric
guard rejection, omitted donor stair classification, an outside-polygon landing
filter, a column blocking an intended wall aim, a supposed glass probe actually
hitting a mullion, and then real glass contact heating co-located timber. The
last case has a reproduced failing test and corrected real-timber positive.

## Finite review proposal and remaining gate

After the architect checks this exact candidate, request a fresh bounded grant
for one existing browser/review harness, one renderer and one New York page.
Proposed first investigation: normal menu selection and native goat at phone
landscape 844 × 390, normal zoom, at most three minutes of rendered interaction.
Walk from spawn, climb the front stair, open/close the real front door, enter and
return, aim at exterior timber/glass and use a match through normal input. Capture
one exterior ignition and one entry/interior JPG with logs of source/section
counts, frame timing and actual contacts; then return to menu, dispose and verify
owned helpers/ports are gone. No teleport, forced fire, inspection overview or
made-up door state substitutes for those actions. This initial review may expose
problems and does not accept a complete upper-floor/retirement route.

Before final promotion: all-carrier/closed/open partition coverage and burning-door
fuel/char/ghost-heat controls; a real upper-floor route and ignition; streamed
leave/return with persistent local retirement; longer material/support behavior;
normal-scale long-column upper fire/VFX clipping; measured phone graphics cost;
and the coherent build/package/nested-host gate. Administration/Horticulture and
their material/wind decisions follow New York review. No renderer/build/helper
has been launched for this checkpoint and no Pages promotion is requested here.
