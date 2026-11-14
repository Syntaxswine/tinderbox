# Catalogue Street artist handoff

Artist branch: `codex/catalogue-modular-art`, existing art worktree. The final candidate SHA is reported with the delivery. Include measured route commit `28ac3dfacf8e4997834b02919daccab0dfb5a857` if intake already contains only artist `5b957764` (coder `41a260e9`). No integration branch or Pages promotion is performed by the artist.

## Result

The two existing detailed components attach to the full 51x47 m Catalogue Street: Bell & Alder at `[36,0,9]`, turn 0; Hopkins 15 at `[24,0,13]`, turn 2. All seven other houses keep their full native models and original placements. The eight house identities, joined Monroe row, original terrain, people, pickups and barrels remain host-owned. Components add no actor, inventory, input controller, terrain, thermal backend or fire-light pool.

The shop omits the recorded 27 staging IDs and rotates the same 42 stair components. The latest approach follows world `[48.5,0,3]`, `[46,0,3]`, `[46,0,4.5]` to enter the foot from its open end. Resident routine and reverse exit share these anchors. All eight physical/render source collections remain identical to 5b957764; house bytes are unchanged. Actual native house/shop traversal remains the coder's combined check.

The artist view preserves qualified material/normal bindings, original UV/color tuples, native openings, real floor unions and stair voids. Native render triangles have one local physical owner; char and retirement do not remove a whole house. The existing player-occlusion fade, masked picking and shadow restoration reach these material/state wrappers. Unchanged state uploads, retirement/char scans and door recalculation are cached with exact reference equivalence. Dynamic effects, poses, clocks and light states continue normally.

## Evidence and checks

- [All-mesh registration](registration-check.json): nine structure views, 7,189 native meshes; zero missing/duplicated submitted area. [Material scale](material-registration.json): all 14 brick/slate instances preserve native repeat 0.5.
- [Native local-state check](state-check.json): actual native frame plus declared art-only char/retirement deltas; subset changes, empty-delta retention, reset, fade/aim restoration and disposal pass. It is not a gameplay collapse test.
- [Cache equivalence](cache-check.json): exact RGBA and door quaternions against 28ac3dfa, including door/char/heat/retirement/reset. 100 quiet frames produce zero texture invalidations or door-pose recalculations; focused one-house CPU means are 0.022 ms cached/0.892 ms reference. No full-map FPS claim.
- [Actual desktop HUD/actions](desktop-actions.json): native mouse input, visible held tool, real match-lit grass, real horse burning/health loss, existing fade/hidden picking, powder pickup, reset and disposal. [Phone](phone-actions.json): current source at 390x844, normal HUD, native touch/release, reset and disposal.
- [Final native WebGL](webgl.json): real large host under `/tinderbox/`, RTX 3080/D3D11, all 34 programs linked with no recorded errors, native max texture side 16,384, state textures fit, one portable lantern and zero component fire pools. Disposal returns component and renderer geometry/texture memory to zero.
- [Evidence/source cross-check](evidence-check.json), [derivative provenance](../../../art/source/catalogue-modular/provenance.json), [export hashes](../../../art/source/catalogue-modular/export-summary.json) and [motion record](motion.json) are included. Desktop action frames precede only the checked caching change; current phone/quiet captures use final source hashes. Frozen coder input filenames/hashes are recorded; later causal/performance work is not silently included.

[JPG full host overview](previews/host-overview.jpg) uses explicitly expanded QA framing. [Normal shop attachment](previews/shop-stair-attachment.jpg) uses the 12.6 m game span and a measured route overlay, not traversal proof. [Native HUD/fire](previews/desktop-local-grass-fire.jpg), [native horse burn](previews/desktop-native-actor-contact.jpg), [held tool at rest](previews/desktop-ready-flamethrower.jpg), [restored existing fade](previews/desktop-occlusion-restored.jpg), [phone HUD](previews/phone-native-hud.jpg), and [short fire motion](previews/desktop-grass-fire-motion.gif) are actual native captures. The 8-frame GIF quantizes 1/30 s samples to 30 ms, about 11 percent faster than native time; originals remain in the same folder.

## Runtime package boundary

Include only the production dependencies required by the loader:

- `workbenches/catalogue-modular/{art.js,scene-data.json,shop-data.json,house-data.json}`.
- `art/source/catalogue-modular/{thermal-art.js,frame-view.js}`.
- Their existing furnished-house renderer/effect helpers, selected native textures and pinned Nautilus city-prop dependencies.

QA/review/capture/check/freeze/animation scripts, these docs/media, frozen overlays and raw `artifacts/` are not production dependencies. Do not copy them into the Pages package. Runtime/data/texture paths were exercised at the nested `/tinderbox/` base; the architect/coder still owns production package closure and deployment checks.

## Remaining combined acceptance

Coder/architect retain actual full-map route acceptance, native officer patrol/resident door reach and escape, direct causal witness and officer draw/fire, all production tool/pickup/barrel variants, representative whole-map performance, final package review and Pages deployment. The current actor-burning screenshot does not prove officer aggression. The existing body fade is connected; optional native muzzle/trail samples are accepted but require host forwarding for those additional samples.

The Monroe open rear/end appearance matches the original native factory at the same camera and remains an inherited source limitation. Original M22 fixture/hip-loop/cosmetic limits and large-body access limits are retained. Unobscured street cases establish visible local fire; the earlier obscured views and failed launches/routes remain local controls and are not marked passed.

No helper is retained. [Quiet capture](helper-retirement.json), [desktop actions](desktop-helper-retirement.json) and [phone actions](phone-helper-retirement.json) record exact retirement and released ports. Original M22/M23 source controls and prior artist branches remain unchanged. The shared artist workflow remains version 2 from the original AFT artist's revisions.
