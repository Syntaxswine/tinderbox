# Milestone 08 Explorable places from the main menu

The user requests all completed exposition buildings as explorable places on the main menu, including the new Horticultural Building. Deliver a production selector, actual bear-controlled visits and a reliable return to the menu. Retain Catalogue Street and the inherited Farmyard controls and warm Eastlake presentation.

The stated first pass provides connected outdoor grounds and open ground-level areas that the adapter can correctly support. An optional clarification about playable interior floors/stairs is pending; incorporate user steering before acceptance. Closed doors remain solid. Upper-floor traversal and multilevel fire require separate acceptance. Descriptions must accurately explain the visit offered.

## Frozen destinations and sources

| Stable ID | Menu title | Source and asset |
| --- | --- | --- |
| `catalogue-street` | Catalogue Street | Existing six-design street and completed joined-row/ignition candidates |
| `new-york` | New York State Building | `b689f5501ab06f54822f2aa724ac77de106e3b71`; use the separate native-grid factory, preserving the detailed source study |
| `administration` | Administration Building | `43337a33ddfe4dff6849654c827c56e1f24e1acc`; pinned Nautilus panels, four pavilions and open rotunda |
| `horticulture` | Horticultural Building | `c4287338ff93907900a94a86b6c7e3bed0ae7c2f`, including waterfront parent `c6ddd51d7dd47a2ec148159e6a6d64a8d00bd2a9`; building plus companion terrace |

These are three landmarks; the two New York versions depict the same building. Keep the unrelated Hopkins v2 batch separate. Preserve authored metre scale: Horticulture has a 306 m frontage. One shared Three namespace and renderer serve each active visit. Donor checkouts remain read-only.

New York and Administration passed the architect's independent offline source/geometry/package reviews, including 85 tests and preservation of original assets. Horticulture and waterfront need their focused checks during intake. Existing source manifests, rights, uncertainties and adaptations remain authoritative. Menu thumbnails use the artist's actual-model JPGs, with provenance.

## Assignments and bases

Reuse existing chats and worktrees. Architect branch `codex/explorable-places` starts at `0891c55a0c9568fd3687a6b5eb9c3ac07fc6a59f`.

| Task | Owner and branch | Exact base and ownership |
| --- | --- | --- |
| TB-024 | Coder Tinderbox / `codex/explorable-places-coder` | From `ad80e2cf059a06cb30638db8069b2a56348d914e`; catalogue, application lifecycle, visit runtime/input/camera/collision, renderer adapters, immutable art intake, meaningful checks and engineering handoff |
| TB-025 | Set up Tinderbox UI worktree / `codex/explorable-places-ui` | From `6659b9c19248e869b208993e15f0e80ff065ec14`; `src/ui/**`, main menu, navigation HUD, thumbnails/provenance, UI fixtures/checks and handoff |
| TB-026 | Artist, Tinderbox | Preserve frozen deliveries; address concrete art findings returned during review |
| TB-027 | Architect | Contract, exact intake reconciliation, combined QC, JPGs and promotion decision |

Check status/occupancy and preserve earlier branches. Workers edit only their assigned checkout and paths. The architect reconciles the prior row-code candidate `ad80e2c`, row-art candidate `f25fd7b28a9aee1d1abaef1ad65acd64d67a50e6` and UI history through `6659b9c` with this task. An intake is deliberate rather than automatic approval of a candidate. Workers do not merge to `master` or deploy.

## Shared catalogue and UI API

Coder-owned `src/content/places.js` exports immutable `PLACES`: `{id,title,description,previewUrl}` records using the IDs above. Keep this lightweight menu data separate from model loading. Landmark descriptions promise exploration of their grounds; the street remains the gameplay destination.

UI-owned `mountMainMenu({root,places,onSelect})` returns `{update,focusPlace,dispose}`. `update({loadingId,error})` presents application-owned state; `focusPlace(id)` restores focus after a visit. `onSelect(id)` requests selection. UI does not instantiate renderers/buildings or decide collision/gameplay. Export the new factory from `src/ui/index.js`, preserving `mountUI`.

Extend `mountUI` additively with optional `onExitToMenu`, `mode` (`gameplay` or `explore`) and `placeTitle`. Explore HUD keeps movement/joystick, pause, camera and return navigation; unsupported combat actions are not presented as usable. Street retains tools, drugs and ignition feedback. Camera requests are `{type:'view-overview'}` and `{type:'view-follow'}`, handled by the runtime. Preserve the snapshot/input adapter; the coder documents additive exploration fields before delivery.

UI owns `assets/art/place-previews/` thumbnails and provenance. Copy pinned JPGs byte-for-byte and frame with CSS. Agreed filenames: `new-york.jpg`, `administration.jpg`, `horticulture.jpg`; a street image is optional. Research scans remain outside runtime assets. Retain the actual Eastlake palette and imported Farmyard surfaces/components. Native keyboard/touch buttons, readable labels, focus order, loading and accessible error/status feedback must work on desktop and phone.

## Application and visit behavior

Coder owns `src/main.js` and composition. Start on the main menu and create WebGL only when a place is selected. Loading or context failures offer useful text and a working return to menu. Return cancels held input/pouring, stops the old animation loop, disposes the visit and restores focus. Guard duplicate selection and stale asynchronous completions, releasing obsolete resources. A menu remains usable on a device that cannot create WebGL.

Load actual landmark factories and their minimal self-contained dependency closure, including shared forms and the pinned Nautilus generator. Preserve units, origins, UVs, slots, source records and borrowed-resource ownership. A task intake manifest records commits, paths, SHA-256 values, adaptations and dependencies. Original research and authoring scripts stay outside the public package. Do not rewrite original artist checkers to conceal failures.

Each visit needs a native-scale bear, clear spawn, useful initial view, connected outdoor routes and appropriate camera bounds. Follow view keeps the bear readable; overview shows the entire landmark without scaling geometry. Preserve screen-relative movement, normalization, focus-loss cancellation and 180-degree inversion exactly once where applicable. Movement must agree with visible walls, closed doors, plinths, deck heights and waterfront edges. Stop at water and unsupported drops; no floating bear or walking through facades.

The coder may derive explicit conservative outdoor movement proxies from metadata/geometry, documenting them as adaptations. Check real reachability and swept movement, including fast input and frame hitches. Decorative stairs and upper galleries are not accepted traversable routes merely because their meshes exist.

Landmark visits are exploration scenes while physical/fuel materials remain unassigned. Preserve the street's fire gameplay. Avoid a huge dense fire field merely to support Horticulture movement: existing art accepts at most 65,536 fire cells. Reuse suitable camera/input/bear code and document any dedicated exploration adapter. Do not invent combustion materials, stretch models or add another engine copy.

Instantiate only the selected place and release it on exit. Use existing instancing/frustum culling and report actual WebGL draw calls, memory and timing. Horticulture plus terrace exceeds one million source triangles. Handle loading and view scale deliberately; no unmeasured frame-rate claim or silent replacement with boxes. Document rendering adaptations while preserving the source asset.

## Acceptance and delivery

1. All four production menu entries open their actual scenes. Keyboard/touch selection, loading failures, context errors, rapid exit/re-entry and repeated visits remain usable and leave one active runtime.
2. Each landmark supports actual bear movement, correct native scale, colliders/deck/water boundaries and overview/follow views. Check a frontage route, a reachable side/grounds route and return to spawn. Document conservative limits.
3. Catalogue Street retains row joins, one-tile matches, timed torch, powder, pouring and inversion after the prior candidates are reconciled. Source pins and inherited UI remain intact.
4. Focused artist checks, lifecycle/navigation/UI checks, relevant repository checks, production build and nested-path resource verification pass. Hosting paths remain relative under `/tinderbox/`; research/caches/secrets are excluded.
5. Review the actual menu and each visit in WebGL at desktop/phone sizes: transparency, occlusion, bear paint, input and performance. Save JPGs of the menu and actual visits. Offline images support this gate rather than establishing browser acceptance.
6. Workers commit/push owned files after relevant checks and provide exact SHA, paths, sources, commands/results, visual evidence and limits. Stop disposable helpers and verify ports; register any retained preview. Architect returns failed work to its owner and applies the [promotion gate](../workflow.md#promotion-gate).
