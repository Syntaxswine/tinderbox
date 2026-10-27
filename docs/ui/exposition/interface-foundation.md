# Farmyard interface continuity for the exposition study

TB-010 is a research/documentation assignment. The current controls remain intact. The opening mechanics-test review already requires a later visual pass to use Farmyard's **actual interface and assets directly**; the existing adapted Tinderbox deck is not the final visual direction. See [the accepted review](../../reviews/2026-10-27-burning-trail.md) and [site/print research](README.md).

## Direct foundation

The source pin remains `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`, as recorded in [source-baseline.json](../../source-baseline.json). A later authorized pass should begin with the donor's real live-game components, markup groupings, styles and material/state recipes. An independently arranged control deck that merely samples the atlas does not satisfy the user's direction.

| Actual pinned source | Existing component to retain as foundation | Semantic boundary |
| --- | --- | --- |
| `sites/tactical-animal/dist/game.html`, `#battle` | The live interface composition, including `.hero-strip`, `.thumb-layout`, `.left-controls`, `.stick-column`, `.right-controls` and existing options control | Source application/mission logic is not required to reuse these components. Any later component-to-command mapping needs architect review. |
| `dist/touch-controls.css` | Actual layout, joystick well/knob, north mark and touch-control treatment | Preserve raw normalized movement and the current cancellation contract. No UI inversion. |
| `dist/field-hardware.css` and `dist/industrial-switches.css` | Actual painted switch dimensions/legend grouping, pressed/lit/disabled behavior and material rendering | A label, symbol and count share the source legend state. Keep tested accessible names and readable empty/Stop feedback. |
| `dist/assets/ui/industrial-switches/{switch-skins-v2.webp,symbols.svg,manifest.json}` | Existing pixels, marks and their generation/provenance record | Preserve unchanged upstream copies. Period labels are separate adaptations, not edits to vendor bytes. |
| `dist/map-frame.css` and `dist/assets/ui/industrial-switches/map-frame-v1.webp` | Actual existing frame recipe where its component is used | Historical map content is distinct from the game input/collision model. This note does not add a map feature or menu. |
| `dist/mobile-controls.js` | Reference input conventions, including native activation and press/hold cancellation | Its inspected helper does not supply the complete disposal contract required by Tinderbox. Do not transplant the whole app or lose listener cleanup. |
| `dist/aft/tactics/animal-motion-catalog.js` | Existing species/profile identity and associated source assets | Artist/architect selects a visually verified non-red-hat profile. Catalogue presence alone does not verify headgear or final bear support. |

All `dist/` paths above are under `sites/tactical-animal/`. The source register includes exact raw-file hashes for the inspected code/style references. Existing imported UI bytes and their metadata are already inventoried in [provenance/ui.json](../../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/ui.json). These references are research, not a new import in TB-010. Later implementation still needs a selected dependency closure and adaptation record.

The donor's AP block, End Turn behavior, stance/cost labels, operations and loadout screens encode donor rules. Reusing its actual interface does not approve those mechanics. Keep the current five tools, three drug actions, movement and primary action, health/stock/effect display, and pause/reset/options semantics. This assignment adds no menu and changes no layout.

The newer `codex/farmyard-ui` candidate remains separately unapproved in the source-baseline record. Direct reuse does not silently advance to that branch. The architect must record any deliberate source-pin change.

## A later label/skin layer

The boundary should be a presentation choice around stable actions and snapshot fields. This is a proposal for the later authorized implementation, not a new runtime API:

| Stable meaning | Eligible visual/text adaptation | Invariant |
| --- | --- | --- |
| Tool IDs `matches`, `jerry-can`, `molotov`, `torch`, `flamethrower` | Source-derived labels, approved symbols and material variants | Same `select-tool` commands; exactly five tools; resource field mapping stays fixed. |
| Primary action and pouring state | Period-influenced secondary typography or label plate | Pour/Stop remains explicit, with the same press-edge toggle. Torch/flamethrower hold behavior stays unchanged. |
| Powder/healing/inversion actions | Label/skin resources and accessible descriptions | Same stock/HP/effect fields and `drug` payloads. Inversion remains exactly once in the movement adapter. |
| Player identity/health | Approved donor portrait/model identity and text styling | Same authoritative player ID, HP/maxHP and inventory; the interface does not introduce selection/progression mechanics. |
| Place identity | Sourced destination name, later print treatment, optional historical index reference | A presentation string does not change routes, object IDs, commands or the camera basis. |
| Architectural form | A replaceable facade/material/label pack on an approved basic form | Ground footprint, height/occlusion and collision remain explicit data. A footprint change requires a layout revision, not a skin swap. |

Source material stays byte-preserved under the pinned vendor tree. Later adapted label/skin resources belong to Tinderbox-owned paths with their own hashes, source IDs and processing notes. Keep period text, CSS/material resources and display labels out of simulation conditionals. Never identify an action by its translated/period-styled label or infer a gameplay material from a texture color.

Retain the current command/snapshot boundary and `mountUI({root,onCommand}) -> {update,dispose}`. Resource counts and effect remaining time still come from snapshots. Keyboard, pointer capture, cancellation, focus, accessible states, reduced motion and disposal remain behavioral acceptance requirements when presentation changes.

## Period evidence without new semantics

M01's indexed destination names and G01's title-page hierarchy can inform a later restrained print treatment: clear destination heading, smaller context, fine rules and a separate reference/index line. This is design interpretation, not identification of an official 1893 typeface.

T01 is specific to Manhattan Day; its date must not become the fair-wide default. T02's validity/serial/admission hierarchy is a research example with a restrictive institutional reproduction statement. Neither ticket adds admission currency, gates, inventory costs or a new menu to the game.

G01 tells visitors to expect directing signs and placards. It does not establish a common arrow, palette, font or signpost geometry. Any later sign that uses a historical destination with newly designed mounting/lettering must be recorded as an adaptation. Keep essential action labels understandable; an ornamental period phrase must not obscure Pour/Stop, stock, health or active inversion.

The inherited industrial UI is a deliberate game-interface foundation. It is not presented as a facsimile of an 1893 fair control panel. Period changes can be applied to approved label/skin resources while that foundation and its interaction states remain recognizable.

## Temporary animals and basic forms

Use existing Farmyard animals with **no red hat**, pending the approved custom skins. Headgear must be checked on the actual chosen mesh/paint/portrait views; profile names or material names are insufficient proof. This worker has not selected a species or certified a profile as hat-free. The architect coordinates that asset choice with the artist; no cross-worker edits or direct worker messaging are required here.

Presentation metadata should identify a temporary donor animal honestly. Do not silently rename an inherited horse/pig asset as finished bear art, add an animal-selection screen, or claim that changing a skin makes its rig a bear. Preserve the game's bear premise and keep the temporary visual substitution explicit in the review record.

For buildings, preserve an approved basic mass/footprint independently of surface appearance. Different facade packs can use the same form contract, but an incomplete front-half drawing or a printed visitor-map annotation cannot establish the unseen half, interior or exact collision dimensions. The current kit remains the architect's Horticulture-derived frontage form study. The Administration forecourt is a future historical anchor; its exact crop and geometry trace remain unapproved.

## Review boundary

For a later implementation, compare against the actual pinned Farmyard component at the intended viewport, record the chosen source closure, and repeat the existing input/state tests after visual adaptation. Confirm that a presentation-pack swap leaves command sequences and snapshot consumption unchanged, keeps five tools/three drugs, and does not alter collision/aim or movement inversion.

TB-010 itself changes only this documentation. Existing gameplay tests, runtime/UI code and art exports are outside this delivery.
