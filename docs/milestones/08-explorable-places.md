# Milestone 08 Explorable places from the main menu

The user requests all completed exposition buildings as explorable places on the main menu, including the new Horticultural Building. Deliver a production selector, actual player-controlled visits and a reliable return to the menu. Retain Catalogue Street and the inherited Farmyard controls and warm Eastlake presentation.

The user explicitly selected **playable interiors and stairs** and authorized breaking maps into nearby pieces instead of loading/showing everything simultaneously. Deliver grounds, enterable halls and connected occupied floors/galleries with actual stair traversal. Closed doors remain solid until opened. Multilevel fire remains separate. Descriptions must accurately explain the visit offered.

## Frozen destinations and sources

| Stable ID | Menu title | Source and asset |
| --- | --- | --- |
| `catalogue-street` | Catalogue Street | Existing six-design street and completed joined-row/ignition candidates |
| `new-york` | New York State Building | `b689f5501ab06f54822f2aa724ac77de106e3b71`; use the separate native-grid factory, preserving the detailed source study |
| `administration` | Administration Building | `43337a33ddfe4dff6849654c827c56e1f24e1acc`; pinned Nautilus panels, four pavilions and open rotunda |
| `horticulture` | Horticultural Building | `c4287338ff93907900a94a86b6c7e3bed0ae7c2f`, including waterfront parent `c6ddd51d7dd47a2ec148159e6a6d64a8d00bd2a9`; building plus companion terrace |

These are three landmarks; the two New York versions depict the same building. Keep the unrelated Hopkins v2 batch separate. Preserve authored metre scale: Horticulture has a 306 m frontage. One shared Three namespace and renderer serve each active visit. Donor checkouts remain read-only.

The user accepted the delay in Nautilus's bear delivery and asked for a selectable animal instead. Offer the existing native goat, horse and AFT bear, applying the choice to all destinations including Catalogue Street. Goat is an architect-selected initial default, not a new user requirement. Goat/horse use the existing Farmyard pin `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`; bear uses the additional AFT pin `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`. Preserve authored size, painting, rig and tool attachments; derive movement, support and headroom from each model's measured envelope. Existing .62 m goat/horse and .56 m bear radii are conservative references to verify. The delayed Nautilus bear is deferred and does not block this task. Do not relabel the AFT source as a new Nautilus import.

New York and Administration passed the architect's independent offline source/geometry/package reviews, including 85 tests and preservation of original assets. Horticulture and waterfront need their focused checks during intake. Existing source manifests, rights, uncertainties and adaptations remain authoritative. Menu thumbnails use the artist's actual-model JPGs, with provenance.

## Assignments and bases

Reuse existing chats and worktrees. Architect branch `codex/explorable-places` starts at `0891c55a0c9568fd3687a6b5eb9c3ac07fc6a59f`.

| Task | Owner and branch | Exact base and ownership |
| --- | --- | --- |
| TB-024 | Coder Tinderbox / `codex/explorable-places-coder` | From `ad80e2cf059a06cb30638db8069b2a56348d914e`; catalogue, application lifecycle, visit runtime/input/camera/collision, renderer adapters, immutable art intake, meaningful checks and engineering handoff |
| TB-025 | Set up Tinderbox UI worktree / `codex/explorable-places-ui` | From `6659b9c19248e869b208993e15f0e80ff065ec14`; `src/ui/**`, main menu, navigation HUD, thumbnails/provenance, UI fixtures/checks and handoff |
| TB-026 | Artist, Tinderbox / `codex/exploration-access-art` | From `c4287338ff93907900a94a86b6c7e3bed0ae7c2f`; additive entry/stair/landing/floor-opening art and descriptive access metadata, preserving raw landmarks |
| TB-027 | Architect | Contract, exact intake reconciliation, combined QC, JPGs and promotion decision |

Check status/occupancy and preserve earlier branches. Workers edit only their assigned checkout and paths. The architect reconciles the prior row-code candidate `ad80e2c`, row-art candidate `f25fd7b28a9aee1d1abaef1ad65acd64d67a50e6` and UI history through `6659b9c` with this task. An intake is deliberate rather than automatic approval of a candidate. Workers do not merge to `master` or deploy.

## Shared catalogue and UI API

Coder-owned `src/content/places.js` exports immutable `PLACES`: `{id,title,description,previewUrl}` records using the IDs above. Keep this lightweight menu data separate from model loading. Landmark descriptions promise grounds, halls and galleries; the street remains the fire-gameplay destination.

Coder-owned `src/content/characters.js` exports immutable `CHARACTERS`: `{id,title,description}` records with IDs `goat`, `horse`, `bear`. Keep this catalogue lightweight. The application owns the selected ID; character changes happen on the menu rather than during a visit or mid-stair. No new character art is needed for this pass.

UI-owned `mountMainMenu({root,places,characters,selectedCharacterId,onSelect,onSelectCharacter})` returns `{update,focusPlace,dispose}`. `update({loadingId,error,selectedCharacterId})` presents application-owned state; `focusPlace(id)` restores focus after a visit. `onSelect(id)` requests a destination; `onSelectCharacter(id)` requests an animal. Character arguments are optional for older callers. Disable changes during loading so the selected character for an active request is unambiguous. UI does not instantiate renderers/buildings or decide collision/gameplay. Export the new factory from `src/ui/index.js`, preserving `mountUI`.

Extend `mountUI` additively with optional `onExitToMenu`, `mode` (`gameplay` or `explore`) and `placeTitle`. Explore HUD keeps movement/joystick, pause, camera and return navigation; unsupported combat actions are not presented as usable. Street retains tools, drugs and ignition feedback. Camera requests are `{type:'view-overview'}` and `{type:'view-follow'}`, handled by the runtime. Preserve the snapshot/input adapter; the coder documents additive exploration fields before delivery.

Exploration snapshots add authoritative `player.elevation` (foot height in metres), `player.level` (native level index), `player.locationLabel`, `player.characterId`/`species` and optional `player.interaction = {label,enabled}`. Runtime exposes selected-character radius/height where needed; UI does not infer collision dimensions from an animal label. UI displays the human location label and meaningful level transitions; it must not call native level 36 an occupied 36th storey. A contextual action requests `{type:'interact'}`; Space/E in explore mode may request that same edge, while gameplay key meanings stay unchanged. Runtime owns proximity, opening and collision. Floor teleport buttons do not substitute for stairs. Avoid announcing every movement/tread update to assistive technology.

UI owns `assets/art/place-previews/` thumbnails and provenance. Copy pinned JPGs byte-for-byte and frame with CSS. Agreed filenames: `new-york.jpg`, `administration.jpg`, `horticulture.jpg`; a street image is optional. Research scans remain outside runtime assets. Retain the actual Eastlake palette and imported Farmyard surfaces/components. Native keyboard/touch buttons, readable labels, focus order, loading and accessible error/status feedback must work on desktop and phone.

## Application and visit behavior

Coder owns `src/main.js` and composition. Start on the main menu and create WebGL only when a place is selected. Loading or context failures offer useful text and a working return to menu. Return cancels held input/pouring, stops the old animation loop, disposes the visit and restores focus. Guard duplicate selection and stale asynchronous completions, releasing obsolete resources. A menu remains usable on a device that cannot create WebGL.

Load actual landmark factories and their minimal self-contained dependency closure, including shared forms and the pinned Nautilus generator. Preserve units, origins, UVs, slots, source records and borrowed-resource ownership. A task intake manifest records commits, paths, SHA-256 values, adaptations and dependencies. Original research and authoring scripts stay outside the public package. Do not rewrite original artist checkers to conceal failures.

Each visit needs the selected native-scale animal, clear spawn, useful initial view, connected outdoor routes and appropriate camera bounds. Follow view keeps the player readable; overview shows the entire landmark without scaling geometry. Preserve screen-relative movement, normalization, focus-loss cancellation and 180-degree inversion exactly once where applicable. Movement must agree with visible walls, closed doors, plinths, deck heights and waterfront edges. Stop at water and unsupported drops; no floating player or walking through facades.

The coder derives floor support, wall/door barriers, headroom, stair/landing transitions and drop protection from actual geometry and descriptive access data. Use swept movement at normal/fast input and hitches. The camera follows actual elevation and reveals the active interior by a documented roof/upper-floor/wall occlusion adapter. Preserve the raw assets. Geometric stairs alone are insufficient: walk from the grounds into occupied rooms and up/down actual connected stairs without teleporting between floors.

Target routes are New York main L1/L4, Administration pavilion L1/L3/L5/L7 and lower/upper galleries L9/L19, and Horticulture main L1/galleries L3. New York attic L7 is accessible only where actual headroom permits for the selected animal; a 2 m clear bay cannot fit a standing native bear approximately 2.02 m tall. Crowns, narrow dome spring rings and unsafe roof markers are not occupied destinations. Add necessary geometric access connections as identified game adaptations, without inventing historical provenance. Existing empty levels preserve tall rooms.

Artist-owned additions live in `art/source/exploration-access/`, `assets/art/exploration-access/`, `docs/art/exploration-access/` and `workbenches/art/check-exploration-access.mjs`. Export `getAccessPlan(placeId)`, returning a frozen `{version,placeId,portals,stairs,floorOpenings,hiddenSourceParts,notes}`, and `createAccessGeometry(THREE,{placeId,materials,textures,sectionBounds})`, returning `{root,bounds,metadata,setPortalState,dispose}`. `setPortalState(id,open)` changes the art pose only; the coder owns permission/collision. All coordinates are unposed source-local metres (+X right, +Z rear, +Y up); `sectionBounds` is an optional `{min:[x,y,z],max:[x,y,z]}` for section-friendly construction. Borrow the host namespace and inputs; dispose only owned resources. Runtime interactions and collision stay coder-owned.

Portal records identify stable IDs, position/heading, raw part IDs to replace/hide, opening geometry and measured clear width/height. Playable passages need at least 1.4 m clear width and 2.3 m height, enlarged through composition if the largest selectable native animal requires more. Compose unscaled native leaves with custom surrounds/attached panels as necessary; never shrink an animal or stretch the source doors. Stair records include ID, from/to levels, physical walk path/treads, width, headroom and landing polygons. Floor-opening records identify source floor ID, native level and polygon. The coder consumes those descriptors in a derived rendering/collision adapter, so a visible stair cannot end beneath an intact slab. Raw landmark source directories remain byte-identical.

Landmark visits are exploration scenes while physical/fuel materials remain unassigned. Preserve the street's fire gameplay. Avoid a huge dense fire field merely to support Horticulture movement: existing art accepts at most 65,536 fire cells. Reuse suitable camera/input/bear code and document any dedicated exploration adapter. Do not invent combustion materials, stretch models or add another engine copy.

Keep lightweight navigation/section metadata available while loading nearby spatial and floor sections. Preload adjacent seams and stair destinations before the bear crosses, retain its current support surface, and release distant owned geometry/materials with hysteresis. Do not construct the whole detailed landmark and merely hide it as a substitute for bounded section construction. Use derived provider/part filtering and source-preserving adapters where existing factories build monolithically. Only one place is active. Record bounded active section/resource counts during an out-and-back route and repeated visits.

Use existing instancing/frustum culling and report actual WebGL draw calls, memory and timing. Horticulture plus terrace exceeds one million source triangles. Overview may use a lightweight plan or documented distant representation without loading the complete detailed model. Follow view exposes the nearby interior and actual bear elevation. No unmeasured frame-rate claim or silent asset replacement; preserve originals and identify adaptations.

## Acceptance and delivery

1. All four production menu entries open their actual scenes. Keyboard/touch selection, loading failures, context errors, rapid exit/re-entry and repeated visits remain usable and leave one active runtime.
2. Each landmark supports actual movement of every selectable animal, native scale, support/headroom/collision, open/closed doors, water/drop boundaries and overview/follow views. Verify grounds-to-interior access, occupied rooms, stair ascent/descent to the target floors and return to spawn. Check chunk seams and unloaded-neighbour protection; no teleport substitute or invisible floor blockers.
3. Catalogue Street retains row joins, one-tile matches, timed torch, powder, pouring and inversion after the prior candidates are reconciled. Check all three characters' native tool anchors and poses. Source pins and inherited UI remain intact.
4. Focused artist/access checks, lifecycle/navigation/streaming/UI checks, relevant repository checks, production build and nested-path verification pass. Preserve source asset hashes and validate derivative floor openings, door clearance and stair geometry together. Hosting paths remain relative under `/tinderbox/`; research/caches/secrets are excluded.
5. Review the actual menu and each visit in WebGL at desktop/phone sizes: destination/animal selection, transparency, occlusion, native paint, input and performance. Save JPGs of the menu and actual visits. Offline images support this gate rather than establishing browser acceptance.
6. Workers commit/push owned files after relevant checks and provide exact SHA, paths, sources, commands/results, visual evidence and limits. Stop disposable helpers and verify ports; register any retained preview. Architect returns failed work to its owner and applies the [promotion gate](../workflow.md#promotion-gate).
