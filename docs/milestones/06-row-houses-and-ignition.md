# Milestone 06: joined row houses and deliberate ignition

Status: architect proposal and implementation assignments, based on the user's accepted corrections. Start from **`3c6001d5d4035e950f25e500294eaec55bbf81d2`**. The architect writes the contract, assigns work, reviews exact deliveries and supplies JPGs; the coder, artist and UI specialist implement their owned parts. [Promotion follows the existing gate](../workflow.md).

## User decisions

- Row houses must join consecutively, with no windows on joined sides. Exposed ends may have side windows.
- Torch: light once, carry it visibly burning for a fixed burn time, and press its action to ignite nearby tiles.
- Matches: one press ignites one tile; subsequent spread depends on fuel.
- Preserve accepted movement, distance-based pouring, powder/world clocks, 180-degree movement inversion, native assets and Farmyard UI reuse.

## Ownership and source boundary

Reuse the existing three worker checkouts. Preserve earlier branches and current unrelated work. No new chat/worktree is needed.

| Task | Owner / branch | Owned implementation |
| --- | --- | --- |
| TB-018 | Coder / `codex/row-ignition-coder` | Row adjacency/placement, authoritative snapshots and collision; match/torch simulation, fuel response, checks/tooling; `docs/engineering/row-ignition/` |
| TB-019 | Artist / `codex/row-ignition-art` | Derived Monroe variants, row rendering, carried torch flame and source-backed visual feedback; art manifests/evidence; `docs/art/row-ignition/` |
| TB-020 | UI specialist / `codex/row-ignition-ui` | Existing controls/HUD consume the new state, labels/timer/accessibility, UI fixtures/checks; `docs/ui/row-ignition/` |
| TB-021 | Architect / `codex/row-houses-and-ignition` | This brief, architecture/source/workflow records, independent combined QC, JPGs and promotion decision |

Each task branches from the exact base above. The artist must safely finish/checkpoint its active Hopkins v2 work before switching; do not discard or silently absorb it. Existing source pins and raw imported bytes stay unchanged: artist `56b028c2935b5a97fe259618f38e0a1550928ab4`, Nautilus `90054d07134116a5d9661f8318a76fe68f922aad`, and the recorded Farmyard/bear snapshots. New row art is an explicit Tinderbox adapter around preserved originals, with its adaptations documented. Do not edit the raw `gross-housing.js`, other byte-preserved modules or vendor source to make variants.

## Joined Monroe contract

The native Monroe frontage is 7 m. Derive full-side neighbors from authored placements; do not let the view guess collisions or let callers assert an arbitrary joined side. Only matching Monroe instances with the same quarter-turn orientation, aligned full-depth sides and exact 7 m local-X spacing join in this slice. Validate all four quarter turns. Reject unrelated overlaps and incomplete/misaligned joins.

Add detached `building.partyWalls = {left: neighborIdOrNull, right: neighborIdOrNull}` to authoritative snapshot descriptors. Left/right refer to source local X=0 and X=7. Joined sides have solid masonry presentation throughout basement and occupied floors. Only exposed exterior ends use the source's existing side-window recipe; front/back glazing and entry remain intact. A standalone Monroe has two exposed sides; a middle unit has none; each end unit has one. Other house types are unchanged.

Fit foundations, slab rims, roof eaves, trim and walls at the real join plane. Shared boundaries must have no walkable slit, protruding eave collision, visible doubled trim or z-fighting. Repeating the module never scales its width, walls, doors, UV density or the bear. The adapter may derive trimmed joining geometry while preserving raw originals and interpolating physical UVs; it must own/dispose its derived resources. The coder trims only the joined-side conservative footprint rim; exposed ends keep their actual rim envelope. Do not globally disable overlap checks.

Proposed bounded demonstration: keep all six existing designs/placements and add Monroe neighbors at `(34,31,q0)` and `(41,31,q0)` beside the existing `(27,31,q0)` unit. Extend width/road/yard to 51 m, retaining 47 m height. This gives eight house instances from six designs, with a three-unit attached row. The coder may refine only if actual geometry demands it. Keep a clear route to frontages, exposed ends and rear lane.

Each house retains its own finite ground-fuel/burnout group. A burned-away neighbor exposes the originally solid party wall; it must not invent windows in that wall. Keep authored party-wall intent during the run and restore the row on reset. A shared wall remains a barrier under the existing coarse solver; adjacency is not an automatic whole-row ignition rule. Room/roof fire transfer and structural collapse remain separate scope.

## Match interaction

One primary-button rising edge consumes one match and seeds exactly one targeted **1 m ground/authoring tile** within existing short reach and line of sight. This is a fixed world-area target: at .5 m fire resolution it contains four solver cells; at .25 m it contains sixteen. No initial heat reaches adjacent authoring tiles. Align the target using the world grid; clip out blocked portions. Preserve wall obstruction and deterministic frame-rate independence. The artist may use the event's authoritative tile bounds for the brief strike/flare; art must not calculate a second target.

Fuel is still necessary: gasoline deposited on paving can burn, bare paving/masonry cannot sustain fire, and a spent patch with no remaining fuel cannot be revived by inventing fuel. A used match on an unsuitable target gives explicit feedback. Holding the button does not spend extra matches. Any later spread beyond the selected tile must come from the existing finite-speed world-time solver, with its cause/fuel accounting.

The coder adds the chosen tile bounds and result to the existing `tool-use`/`tool-rejected` event payload, so views distinguish successful ignition, blocked reach and no fuel. Keep event identity/deduplication rules.

## Torch interaction and shared snapshot

Add detached `player.torch = {phase: 'unlit'|'lit'|'spent', remainingSeconds, durationSeconds}`. Existing finite `inventory.torchFuel` remains the resource authority; seconds derive from the configured burn rate. Retaining 5 units at .12 units/second gives an initial approximately 41.67 world-second burn, an adjustable prototype value rather than a new user requirement.

- Selecting the tool equips it. First Use lights it; later Use presses apply one bounded close-range ignition to nearby fuel using existing reach, obstruction and the finite-fuel solver. A held button does not repeat ignition.
- Once lit, fuel burns continuously on **world time**, including idle/movement and while another tool is selected. Switching tools cannot pause or replenish it. The flame is visible when carried/equipped; holstered state still ages. Pause freezes the timer. Powder slows it with world fire; input/action responsiveness stays in the player domain.
- Burnout makes it spent, ends the carried flame and prevents further ignition. Reset restores the configured initial unlit stock. Death/focus loss stops active input; no stale press may fire on resume. No automatic relight/refill or hidden cross-item match cost is introduced in this prototype.
- A lit carried torch is not a constant flamethrower: nearby ignition is deliberate on Use. Its visual flame alone does not heat every tile the bear passes. The coder may choose a short simulation-driven gesture/discharge pulse for readability, but applies gameplay heat only once per press.
- Emit `torch-lit`, `torch-spent` and normal `tool-use` results as appropriate. Both the artist and UI read `player.torch`, not `usingTool` or held-button state, to decide whether the torch remains lit.

Keep the existing discharge schema for active use. The artist owns the small carried flame at the original torch anchor, using existing painted fire assets and world animation time. It must be visible during locomotion without a pressed action, disappear at exhaustion, freeze on pause, and never imply a heat cone that the simulation did not emit. The coder documents exact event/pulse fields before handoff if an addition is necessary.

## Fuel response proposal

Make fuel identity visibly matter through the existing solver, rather than adding a second fire system. Prototype intent: deposited gasoline advances quickly along connected wet ground; grass spreads more slowly and burns out sooner; timber takes longer to pass ignition onward and sustains a longer burn. Bare paving/masonry stops unsupported flame. Gas over a noncombustible substrate remains combustible; once that gas is spent, the substrate does not become invented timber fuel. These are game tuning choices, not physical measurements.

The coder owns a small configuration-driven material propagation policy and supplies held-out traces showing the relative ordering, finite arrival/burnout, barrier behavior and normal/powder clocks. Keep current gasoline trail chase behavior as the regression baseline. Do not add wind, weather, indoor ventilation, accelerant crafting, enemy systems or structural fire physics. Building footprints still use the documented coarse combustible-building proxy; a brick skin does not establish masonry combustion.

## UI contract

Keep the existing selected-tool / primary-action model. Labels: matches **STRIKE**; torch unlit **LIGHT**, lit **IGNITE**, spent **SPENT** (disabled). Show the torch's authoritative remaining burn seconds and visible lit/spent status, including when the user returns after another tool. Avoid two competing timers/units. Use existing Farmyard controls/materials; no new menu system or gameplay timers in UI callbacks. Keyboard/pointer activation sends the same existing command edges. Feedback must explain no fuel, blocked action and empty stock without inferring success from a particle effect.

## Acceptance and delivery

1. Standalone, two-unit and three-unit Monroe rows at all quarter turns: exact pitch, correct end-only side windows on every level, sealed joins, valid UV density/resource disposal, no overlap loophole. Rendering and snapshot join IDs agree. Partial/complete per-unit burnout preserves neighbor art/colliders and blank party-wall intent; reset restores all.
2. Match presses seed one 1 m tile at multiple aim offsets/grid resolutions, with one stock decrement per edge and no adjacent-tile direct ignition. Test bare substrate, deposited gas, barriers, spent fuel, key repeat, frame rate and powder.
3. Torch first-light / carry / press-to-ignite / selection switch / pause / powder / exhaustion / reset all follow the state contract. No held auto-repeat, free burn timer pause, fuel duplication or visual-only ignition. Body/tool anchors and native character scale remain unchanged.
4. Material traces establish the proposed relative response while retaining finite fuel, no flood-fill ignition, barriers and the gasoline outrun tactic. Clearly separate prototype rates from accepted user requirements.
5. Relevant existing checks/build/nested-path package verification pass. Reuse existing diagnostics; no extra tester for a JPG. Artist supplies source-backed row and carried-flame visual evidence. Architect independently verifies the combined candidate and saves JPGs. Real desktop/phone WebGL review still gates promotion.
6. Each worker commits only its assigned files and pushes its candidate branch after checks, with exact SHA, sources/adaptations, commands/results and helper cleanup. No worker promotes `master`. No new retained helper is needed; stop disposable processes promptly.
