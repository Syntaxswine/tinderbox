# Milestone 29: shared gameplay across the existing maps

## Accepted direction and baseline

The owner requests consistent standard fire tools and appropriate fire response on the other maps. They explicitly suggest reusing the existing workproduct in new maps when that is cleaner. Rehost the existing landmark geometry, access and section workproduct as gameplay-map content served by shared gameplay systems. Do not implement a separate set of fire/tool rules in each exploration runtime.

Start from published `52c0266fd1a65e67b13d7ac6a452156c6573b858` (M28 runtime publication `9a765f2f`). Catalogue Street's current modular gameplay is the control. This instruction deliberately supersedes M08's exploration-only, empty-inventory and unassigned-production-fuel restrictions for the converted destinations. Original assets, authoring records, exploration fixtures and historical checkers remain preserved.

Keep exactly four menu destinations: Catalogue Street, New York State Building, Administration Building and Horticultural Building. Reuse native scales, original skins, existing occupied interiors, entry doors, stairs, terrain/water and section streaming. These are gameplay versions of the existing places, not four additional menu entries or a larger combined city. Stockyard/Hull House blockouts and research replays remain separate.

## Scope and ownership

Reuse the three existing worker chats/worktrees. No new worker or checkout is needed. Preserve their completed M28/M24 branches before creating these task branches from the architect's committed common brief:

| Owner | Branch | Responsibility |
| --- | --- | --- |
| Architect | `codex/review-cross-map-fire` | Contract, exact intakes, material decisions, combined review, promotion and live verification |
| Coder | `codex/shared-map-gameplay-code` in `coding-9200` | Shared gameplay/map adapter, source compiler, thermal state/streaming integration, runtime/navigation, meaningful checks and engineering evidence |
| Artist | `codex/shared-map-fire-bindings` in `art-assets` | Versioned physical-material/source-part bindings, appearance/state correspondence, native support/retirement evidence and JPG review |
| UI | `codex/shared-map-tools-ui` in `fire-ui-reconcile` | Existing toolbar/HUD/aim/interaction presentation across maps, authoritative capability/snapshot consumption and UI checks |

Workers edit only their assigned worktree/paths. Coder owns gameplay and map capability contracts; UI does not invent stock or apply heat. Artist owns authored physical/material classifications; coder implements extraction and rules. Original donor checkouts remain read-only and current pins remain frozen unless a separately evidenced intake is accepted. Follow the shared modular art workflow.

## One gameplay contract

Use the current five production tool identities and their actual presentation: matches, toggle-pour `jerry-can` (current oil-barrel button), throwable `molotov` (current aim/throw oil-lantern button), timed carried torch and held flamethrower. Keep existing buttons and prototype inventory/configuration; do not introduce a new inventory design, a second throwable or manual drug controls. Keep selectable native goat, horse and AFT bear with their authored rigs/attachments. Preserve 9 m/s movement and the existing 0.22 m step limit.

All converted maps use the same command/state/event and presentation rules:

- Matches affect one reachable fuel tile/surface in front, once per press, with truthful heated/blocked/no-fuel/empty feedback. Heating does not promise that timber catches immediately.
- First torch press lights it; it remains carried for its finite world-time fuel and lights nearby ground/walls. Further presses apply heat in front. The flame/light follows the actual elevated tool anchor.
- Pouring toggles, spends stock by accepted travelled distance and deposits continuously along the actual supported 3D movement path. No frame-rate gaps or oil painted on a different floor.
- The flamethrower emits a clipped forward cone from the native muzzle; visible barriers stop heat and projectiles. The lantern uses first press to aim, joystick adjustment and a second press to throw; impact respects actual floor/wall/roof height and spills finite oil.
- Existing health, burning/shroud, shared tool effects, night/fire lighting, smoke, flame settings, pause/reset/exit cleanup and powder/inversion clocks follow the same core. Existing NPCs respond through that core where present; no new crowd, witness or mission system is assigned.

Space/tool use and E/click contextual door actions must remain distinct. The main application's mode, actual simulation and HUD must agree; merely exposing the toolbar on the old rejecting exploration model is not implementation. Use authoritative visit capabilities/snapshots rather than a list of landmark names inside UI callbacks. Keep warm browns, 1890s typography, title/options, four destinations and normal return/failure behavior.

## Map and material data

Only map-specific content changes: bounds/spawn, native geometry and support, doors/stairs, physical material/fuel carriers, source/render bindings and valid wind metadata. Existing compiled navigation already supplies a declared positive-world source offset; keep that coordinate frame consistent across renderer, contact rays, thermal state and collision. Do not shrink a landmark to fit the old 64 m scenario guard or import the street's fixed lot arrangement into a landmark.

Reuse the current native thermal/combustion implementation and accepted material profiles rather than duplicating tuned constants per map. Same material, geometry, exposure and wind must follow the same rules. Preserve quick finite-energy grass, heat accumulation/cooling, visible preheat smoke, stronger sustained building fire, actual barriers/openings, local support loss, burning debris and cooling rubble. Segment lifetimes start at their own ignition under the current material rules; do not clear a whole building with one timer or revive a historical map-specific 30-second shortcut. No general solver rewrite or balancing pass is assigned; report a concrete shared-kernel defect with its control before altering it.

Original landmark assets explicitly leave combustion assignments open, and appearance palettes are not proof of physical material. Artist supplies an additive, versioned material/binding table keyed by stable source part/carrier IDs. Distinguish exposed fuel, finishes, underlying structural carriers, glass, metal, masonry/stone and water. Inert parts may heat, screen heat or lose support without becoming wood fuel. Record material facts supported by existing sources separately from architect-approved gameplay adaptations. Do not infer fuel from color or a generic authoring token named `wood`; do not mutate raw source history to claim it was assigned originally.

Physical binding records must identify exact source/section/part IDs, bounds/triangles, layer/role, material profile, finite quantity/area/thickness assumptions, support/adjacency, door pose and render-retirement ownership. Render instances may reference one physical carrier; they must not duplicate its fuel in multiple sections. Keep correct world-space closed solids and real apertures. Native floor holes, stair bearing and live door state stay authoritative. Any necessary geometry change needs a reproduced source gap and a bounded artist proposal first.

## Streaming and cost

Horticulture is large: current compiled map bounds are 352 by 144 m, with more than a million source triangles including the terrace. Preserve the existing section workproduct; do not construct or rasterize the whole detailed landmark simply to enable a match. The current full-map raster/art cell and scenario-size limits require a deliberate sparse-map adapter, not an unchecked larger dense allocation.

Keep render residency separate from persistent physical state. Load nearby geometry with the existing bounded section policy, preload traversable seams/stair destinations, and retain compact canonical heat/fuel/char/support/retirement state. Burning/cooling off-screen regions continue over world time and can heat neighbours; leaving/re-entering a visual section cannot reset fire, create fuel or resurrect walls. A fire's propagation frontier must obtain necessary neighbouring physical data before crossing a chunk boundary. Preserve source ownership and dispose late loads on exit.

Use the existing shared flame/smoke/body-shroud/tool/light services at actual surface heights and normals. Fire, carried lights and smoke should have the same appearance/intensity semantics at normal zoom on every map. Reuse the bounded light pool/whole-structure aggregate where applicable; do not add a light per thermal tile. Surface/part retirement updates visible geometry, collision, support, sight and fuel together, including after a section reload.

Report actual idle/active physical counts, render residency, lights, owned resources and representative growing-fire CPU costs at named scales. Preserve M27 caches and finite accounting. No new percentage/FPS claim or unmeasured phone-Safari claim is required. If a real hard budget cannot hold, return the measured blocker instead of changing geometry, clocks or ignition coefficients silently.

## Delivery sequence

1. **Audit and contract reconciliation.** Inventory all four menu maps and supported Catalogue/cottage/witness query routes, including their present backends. Propose one shared simulation/presentation boundary and exact material/section schema. No renderer during this read-only stage.
2. **New York gameplay pilot.** Consume existing source/access/sections in the common core. Wire all five tools, material response, night effects and native traversal. Validate one exterior timber/finish start, an elevated start and an inert blocker. Architect reviews one short normal-zoom replay/JPG handoff before the adapter is rolled out; this is an engineering gate, not a request for new owner permission.
3. **Reuse for the remaining places.** Apply the accepted adapter and bindings to Administration and Horticulture, preserving their native occupied floors and water/section boundaries. Make normal Catalogue selection use the accepted modular gameplay core. Retain supported cottage wind/calm behaviour/layout and explicitly reconcile compatibility URLs; do not leave silent production routes using different rules. Original legacy engines/replays can remain labelled diagnostic controls.
4. **Combined acceptance and normal delivery.** Reconcile exact worker commits, run relevant source/behaviour/UI/packaging gates and actual-input review, save JPGs, then architect promotes to master/Pages and verifies the public package plus a bounded live visit. No as-is preview exception is assumed.

## Acceptance evidence

- Per production destination, commands use the same tools/config/inventory and report real results. Verify match count/edge, torch lifetime/carried light/heat, forward clipped flamethrower, real-path pouring including elevated movement and lantern aim/release/impact. Pause, reset, menu return and re-entry clear held input/projectiles/owned resources correctly.
- Meaningful shared-fixture checks compare equivalent material/exposure behaviour across map adapters: easy short grass can go out before timber lights; sustained fire heats timber until it catches; cold inert barriers do not seed fuel behind them. Wind/source coordinates and energy must not change just because the host map is larger or unrelated distant data is registered.
- Follow a real tool ignition through warming smoke, sustained wall/upper/eave or roof transfer where combustible connections exist, and a representative segment's eventual retirement/rubble. Do not require glass/stone/metal to burn as timber. On a streamed map, leave a burning region, cross a seam/level, return and verify continuing state and correct geometry/collision.
- Native bodies, original geometry, real doors/stairs and supported upper-floor contacts remain correct. Verify all three profiles through representative routes in CPU/native controls; actual browser visits include meaningful keyboard/mouse movement, door actions, elevated ignition and return. No pawn teleport or forced positive fire/door state substitutes for real actions.
- Use source-controlled deterministic runs for longer material/retirement checks and normal-zoom real-input browser evidence for wiring/appearance. Keep wall/world timing, CPU and GPU claims distinct. Do not repeat full matrices/builds after documentation-only changes or generate a long replay library.
- Run one coherent relevant repository/source/build/release/nested-path gate on the combined final candidate, preserving failed attempts. The normal promotion gate applies; worker pushes are candidates, not publication.

Every helper needs ownership, source/restart inputs, exact PID/creation/ports, an actual expiry and immediate verified cleanup. Reuse the existing finite browser/review harness, one renderer at a time. A short pilot preview is retained only under an explicit bounded architect grant; no watcher, test server or browser remains after its review.

## Reconciled pilot contracts

The shared visit capability record is frozen and factory-authored: `{version:1,mode:'gameplay'|'explore',tools:boolean,health:boolean,interact:boolean,overview:boolean}`. The runtime, snapshot, application active-visit state and `mountUI` consume that same contract. Main application presentation derives its mode from the active runtime, not the place's name. A snapshot may restrict a factory capability and later restore it; it cannot grant a feature the factory disabled, or change mode within a visit. Contradictions are errors. Preserve existing tool/health/torch/aim/effect/clock/event data and `navigation:{placeId,view,waitingForSection,portalStates,collision,...streamMetrics}`. Camera commands remain `view-overview`/`view-follow`; the UI's Menu does not implement navigation or tool rules.

The artist's New York table is accepted as **prototype gameplay assignment**, not evidence of original historical materials:

| Source role | Accepted physical assignment and quantity convention |
| --- | --- |
| Foundation, approach stairs, plinth, paving | Inert stone; zero fuel |
| Exterior primary wall / identified interior partition | Timber, `clapboard` / `partition`; 1 prototype unit per m² of primary area, once |
| Floor, deck, interior stair carrier | Timber, `frame`; 1 unit per m² of actual footprint |
| Roof covering | Timber-covering adaptation, `roof`; 1 unit per m² of exposed weather-facing area, excluding duplicate/buried faces |
| Substantial columns, sash, rails and fittings | Timber, `frame`; closed volume divided by 0.12, matching the existing fitting convention |
| Moving door leaf and actual moving extension | Timber, `door`; area × 0.45; inert hardware contributes no fuel |
| Glass / metal hardware | Inert glass/metal with real screening, poses and appropriate support/retirement |
| Complete awning | `cloth`; 0.3 unit per logical cloth item, not per stripe |
| Cosmetic detail and paint | No additional fuel; follow the real carrier's visible state |

Only pilot wall `main/0/cell-1-22/1` receives an explicitly declared, separately accounted 0.10-unit `lacquer` prototype coating. Do not infer a finish from color or coat all painted parts. The other initial contacts are elevated `upper-floor/tile-1-16` (top approximately 8.48 m) and inert `main/0/lower-3/glass`. Their sidecar is `assets/art/shared-map-fire-bindings/new-york.json`. It references the exact emitted geometry/matrices; the existing `[56,0,26]` source offset has already been applied. Local carrier IDs are qualified once by the compiler. Include `coordinateFrame`, `quantityBasis`, source facts versus gameplay assignments, actual supports/portal poses and canonical render ownership. Unassigned IDs remain explicit. These three records establish the pilot; complete substantial New York coverage is required for its finished gameplay map. Administration/Horticulture material overrides require their own reconciliation rather than inheriting timber automatically.

Original M28 asset/control/checker/runtime declarations remain historical evidence. When an approved shared extraction changes a hashed runtime path, record exact before/after hashes and the reason in M29 integration evidence and rerun the physical assertions; do not overwrite the old reference or relax a failed assertion.

## Accepted New York coverage completion

Architect source review accepts the four decisions in artist proposal `c791c7b94da99b032ae3293395a6eb23cacf0038`, [coverage proposal](../art/shared-map-fire-bindings/coverage-proposal.md), after independent deterministic reproduction and its five intersection controls. This authorizes implementation on the existing artist branch; it is not runtime, visual or production acceptance.

- Assign exactly the 75 listed source IDs: the entablature and relief band are timber/frame with actual closed-volume quantities (35.300002 prototype units total); the large upper relief, cameo/medallion pieces, swags and niche surrounds are explicitly inert plaster/staff proxies using existing stone behavior; urns use inert cast-mineral/stone behavior; two finials are inert metal. These are gameplay choices with no new historical-material claim or automatic coating.
- Repair exactly 25 cut parts with caps constrained to the existing cut planes and restore exactly four named jambs from their verified original closed meshes at zero-interior cut contact. Use an additive versioned gameplay geometry overlay keyed by stable source IDs and before/after hashes. Preserve original raw/access/exploration geometry and checkers. No global epsilon, wider doorway, filled arch/hole or altered native elevation is authorized. Effective visible, physical, collision and support geometry must all consume the same repair.
- Author the exact 652 evidenced fixed joins, retaining the per-ID overlap witnesses and parent links. Parent loss propagates through shared support and retirement. This is not a global overlap-support rule or a new ground anchor.
- Author only the listed 12 fixed assembly mounts: four rail/post assemblies across measured 4.65–17 mm gaps and eight panel/wall assemblies across their approximately 10 mm standoff. Record these as unmodelled fastening relationships, not geometric bearing. Preserve actual gaps for sight/heat geometry and make loss of the actual parent remove support. No unrelated mounting fallback is authorized.

Artist owns the derived art/export overlay, complete material/binding/evidence updates and native art checks. Coder consumes the exact resulting candidate in the shared runtime/compiler. Coordinate the additive overlay schema before exports; do not edit the other worker's paths or checkout. The 75 newly assigned carriers also require explicit real parent/bearing evidence; return additional unsupported cases rather than silently grounding them. Resolve cosmetic follow/retirement ownership. Report final coverage, finite class totals and remaining exceptions honestly. Canonical source carriers may contain several local thermal patches: a hot patch must not retire an entire long beam or wall merely because it shares a carrier.

Reproduced retained cornice T-junctions permit one narrow topology amendment inside those same 25 cap-repair parts: subdivide derived triangle indices where necessary for closed topology. Preserve the complete original position/normal/UV/grossUV attribute buffers as an identical prefix; any appended attributes must interpolate the original face. Supply per-ID original-to-derived triangle/ownership mappings and independent coplanar, covered-area and paint/shading equivalence checks. A subdivided part cannot claim the earlier literal triangle-prefix guarantee. This does not authorize moving surfaces, changing apertures, remeshing other parts or relaxing closure checks. Coder consumes the exact effective after-mesh and mapped intervals.

The old living-actor navigation freezes when support disappears. The M29 support-loss adapter may reuse the existing native 9.81 m/s² debris integration through one shared helper, advancing the single authoritative actor on native world ticks against live swept body/solid/support geometry. Preserve the original debris result, native body radius/headroom, pause/powder timing and supported-path pouring; do not create an airborne floor. Add no fall damage, jumping or separate movement clock. Check a ticking shared-host actor's descent/landing after local floor retirement while a neighboring floor remains intact, including newly registered physical fragments.

Review of the completion export's explicit four additional mount proposals accepts these exact child-to-parent pairs:

| Child carrier | Parent carrier |
| --- | --- |
| `carrier/entry/medallion--1` | `carrier/main/0/cell-4-18/1` |
| `carrier/entry/medallion-1` | `carrier/main/0/cell-4-28/1` |
| `carrier/tower-east/terminal` | `carrier/tower-east/cap-hip` |
| `carrier/tower-west/terminal` | `carrier/tower-west/cap-hip` |

The two backing-disc mounts span their measured approximately 20 mm facade gaps; other medallion/cameo members retain measured internal joins. The finials use explicitly declared socket/fastening relationships at their roof point contacts (approximately 1.7956 µm separation), not positive-area bearing. Preserve exact local child/parent regions, actual gaps and `groundAnchor:false`. Local parent loss removes support; none becomes an independent earth anchor or whole-building fallback. No geometry, movement, fuel/profile change or other new mount is authorized. Verify the resulting graph rather than assuming these four mounts clear every remaining exception.

Full-source integration may derive a source-local numerical partition allowance from the unchanged 1e-7 clipper epsilon and that source's geometry, with documented formula/inputs and over-bound controls. Assigned canonical quantities remain strict; expose signed local/summed native discrepancies separately, with no refill/birth credit, stock rescale or global/reserve-relative tolerance. Exact implementation remains subject to architect review. Support reconciliation follows the existing kernel's actual/declared structural contact convention; attachment/mount/hinge/cosmetic dependents remain parent-dependent. Generic adjacency does not establish bearing. Diagnose exact unrooted components before proposing any additional local join or material-role correction; missing-record counts alone do not establish ground reachability.

To parallelize the required New York integration, reuse the existing UI specialist for a bounded presentation-only adapter, proposed path `src/runtime/shared-map-presentation.js`, focused lifecycle/presentation tests and its interface document. First reconcile a versioned factory/update/dispose/abort contract with the coder. Reuse the approved fire, smoke, held-tool, body-shroud and night-light services with authoritative snapshots and a passed native character kit/runtime-owned lighting; add no art redesign, extra player, renderer, simulation, clock or gameplay rule. Coder retains physical/section geometry, local char/retirement, navigation/camera/runtime and route wiring. Artist retains sources and support-evidence work. Existing HUD intake and the unrelated train branch stay preserved. No helper, build or renderer grant follows from this source assignment.

The reconciled contract is `9d7ca0495ea28c35c7f103e33e462994daf7d196`, [presentation interface](../engineering/shared-maps/presentation-contract.md). UI implements `createSharedMapPresentation` by forwarding to the existing `createArtScene` owner; coder adds that core's `gameplayMap`/`createMapStructureArt` hook and owns source terrain, elevated residue, resident masks and structural services. No second character/effect/light loop is introduced. Implementation follows the exact borrowed-resource, authoritative timing and idempotent abort/disposal contract.

## Support reachability first control set

The artist's bounded `reachability-review-v1` examines 74 affected families and 19 native-contact controls without changing the accepted data. Approve only these exact child-to-parent first-control relationships (all IDs prefixed `carrier/`):

| Child | Parent | Relationship |
| --- | --- | --- |
| `ny-front/jamb--1` | `main-floor/tile--2-0` | Measured footer embed |
| `ny-front/jamb-1` | `main-floor/tile-1-0` | Measured footer embed |
| `ny-front/header` | `ny-front/jamb--1` | Fixed header embed |
| `ny-front/header` | `ny-front/jamb-1` | Fixed header embed |
| `main/0/frieze-1/jamb--1` | `main/0/cell-7-7/1` | Fixed frame embed |
| `edge-0/cornice-1` | `main/0/cell-3-0/1` | One-metre local embed fixture |
| `clerestory/front-rail/base` | `clerestory/cornice` | Measured local overlap |
| `ny-main-flight-2/handrail--1` | `ny-main-flight-2/post--1-10` | Measured intermediate-post overlap |
| `visit-cap/ny-side-approach--1/7` | `porch-west-1` | Exact structural source seam |
| `upper-terrace/rail-front/cap-2` | `upper-terrace/rail-front/pier-2` | Explicit carpentry butt joint at native precision |

Artist authors a small additive support override and evidence, not a second 40 MB bindings copy. Preserve completed bindings `407c0f8b`, geometry `f1252c73`, materials and fuel. Coordinate its typed schema with coder. The fixed header's permanent support uses its fixed jambs; moving-leaf observed contact remains physical evidence rather than load-bearing support for that frame. Preserve hinge/hardware relationships. Validate cold/active parity, actual local parent loss, header independence from moving leaves, no self-grounding cycle and unchanged stock. The cornice fixture does not establish full 48 m coverage; the remaining graph stays an explicit finding.

The reconciled data interface is `6a01e2bb1281fcb037c25208d0a70b35442c9c1c`, [support override contract](../engineering/shared-maps/support-overrides-contract.md), with the small `new-york-controls-v1.json` descriptor. After its exact controls and the numerical guard pass, prioritize a source-checked playable New York engineering checkpoint and finite normal-input preview plan while broader source-support proposals proceed separately. Known global support limits must be explicit. They do not prevent a limited visual investigation, but still prevent finished-map acceptance/promotion. No renderer/build launch is granted here; the architect must grant the specific bounded review separately.

For separated `main-parapet-0/base`, prepare a bounded proposal for minimal modeled timber blocking/corbel supports to actual rooted roof/cornice geometry, preserving original assembly positions, native dimensions, UVs and raw history. Supply precise added-member/contact geometry, finite fuel and local retirement/ownership. No parapet geometry addition or unmodelled quarter-metre mount is approved by this proposal assignment.

The resulting exact proposal in artist `9a88959d2011d182377a9eeb95d5ed9d222e46b1`, SHA-256 `ba25706bd1cf0895e36b16465dd2c6a5acebbcafe30d30b8e51b9d56ec9d13b4`, is now accepted for source implementation. Add 48 dedicated timber blocks at X=32.5..79.5 m in 1 m steps, Z=26 m, width/depth .16 m, from the actual cornice top Y=17.05000000357628 to parapet underside Y=17.26000000178814. Reuse one new 12-triangle primitive with metre-based UVs; 48 instances add 576 triangles and 48 canonical `frame` accounts of .0448 units each. Added static fuel is exactly 2.1504, giving 15,770.094353 total prototype units. Add no coating or earth anchor.

Keep this as a separate small versioned support-addition manifest/geometry after coder/artist schema reconciliation. Preserve original assembly positions, native dimensions/UVs, base bindings `407c0f8b`, overlay `f1252c73` and control descriptor `f3f28fda`. Each block uses its exact local cornice bearing and one-metre parapet bay; loss of one support must not retire the entire cornice/parapet or invent a cross-bay brace. The 96 actual .0256 m² contacts, 144 roof separation controls and 14-step existing parent-to-ground path remain source evidence. The source proposal adds nothing to production until implementation/intake; runtime ownership, cold static accounting, local failure and visual acceptance remain separate. No other component, geometry addition or structural rule is authorized.

The coder's corrected CPU extraction is source accepted through `6f54554ceaefe0d63ad617836bd30e63466d66d4`. Continue New York runtime/presentation, source-aware aiming and persistent sparse activation, preserving local retirement and atomic replacement of static proxies. No renderer is granted by this amendment. Administration/Horticulture rollout still follows the actual New York pilot review; plan bounded source shards or compact authoring rules before exporting their larger tables, and keep authoring evidence out of startup fetches.
