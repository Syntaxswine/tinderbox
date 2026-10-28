# TB-009 runtime art handoff

Artist research checkpoint: `86220f3f633661736438d3fe427d9a66e1661e19`. Final coder baseline: `1b51ff81f3089094c6398b05a7c26095f8ce8b91`. Normal merge into the artist branch: `76574bf1bc5fa8b75b708fefbca76b5967fb3a52`. The final artist candidate SHA is supplied in the handoff reply. Promotion and production scene selection remain architect-owned.

## Delivered behavior

- [Exterior adapter](../../../src/art/exterior-kit.js) renders supplied compiled wall, doorway, pilaster and corner parts, plus bounded gable/hip geometry. Quarter-turned rectangular parts use their resolved world dimensions directly; roof slopes use the module's local envelope/heading.
- [Art composition](../../../src/art/index.js) accepts the borrowed renderer additively, loads the three approved donor surfaces, and routes species-tagged actors through the coder's actual normal horse/goat factory. Untagged legacy diagnostic actors remain explicitly provisional.
- [Actual-scene workbench](../../../workbenches/art/exposition.html) consumes the shared simulation and descriptors. It has a visible **Run kit review** button that prints JSON results into the page, inherited finish choices, source/proposal layout comparison and a separate detail camera. Existing legacy workbench behavior remains compatible.
- [Review record](review.json) fingerprints current art/workbench sources, source recipe references, eight captures, source/camera comparison and actual checks. Raw screenshots and browser receipts remain in ignored artifacts.

No simulation, content compiler, UI, production default or root build/composition file is edited by this artist change. The coder's 19 raw files remain covered only by `provenance/city.json`; the artist inventory records separate adapters and their references.

## Exact diagnostics

`art.diagnostics()` exposes:

| Field | Contents |
| --- | --- |
| `civilianKit` | Coder factory diagnostics: instances, species, source textures, disposed state. |
| `civilianActors` | Array with actor ID, each original instance's diagnostics and measured bounds. |
| `civilians` | Compatibility alias of civilianKit. |
| `provisionalActors` | Untagged legacy stand-ins; zero in this exposition study. |
| `exterior.renderedModuleIds` | IDs with actual rendered meshes. |
| `exterior.renderedPartIds` | Actual mesh part IDs. |
| `exterior.roofIds` | IDs of currently rendered roof modules. |
| `exterior.skinBindings` | Per-part current facade/trim/door/roof skin IDs. |
| `exterior.survivingSolidParts` | Rendered solid IDs matching surviving model obstacles. |
| `exterior.suppressedSolidParts` / `suppressedCosmeticParts` | Source parts omitted because of authoritative liveness. |

The raw donor rig's diagnostics may still name its allocated default rifle/support geometry. The civilian wrapper hides that equipment after every pose update; `armed:false` describes its displayed civilian state. No Red Hat cap, uniform or tailored-paint module is imported, and no figure is globally resized to fit the architecture.

Each solid part must be alive in both its snapshot flags and surviving obstacle IDs. The adapter also honors module/part destruction for overhead geometry: a lost pier hides the lintel; a required lost support hides its roof, exactly as resolved by the coder. The view does not infer collapse, add debris/collision or advance fire. After disposal, rendered IDs and liveness lists are empty.

## Skin bindings

The three approved raw maps are brick-factory-v1, wood-factory-v2 and ground-concrete, at the pinned donor revision. Their original metre-based UV and face/cap recipes are adapted from hybrid-materials / hybrid-room-art. Facade/trim/door/roof slots are separate from physical wood/masonry/steel.

`inherited-cream` uses the previously imported cargo cream-wood crop; `inherited-roof` uses its olive-wood crop. Both are explicit temporary finishes. They do not claim period staff, Spanish tile or glazing. No extra raw roof image or bespoke skin was created.

## Proposed camera-friendly arrangement

At artist candidate `c80db1d`, this existed only in the art workbench's `scenarioFor()`, where the same simulation compiles it. The architect subsequently adopted the reviewed positions and four pilasters in production; the current workbench explicitly reconstructs the old coder arrangement for comparison. See the [combined acceptance](../../reviews/2026-10-27-exposition-foundation.md). The candidate fingerprints and browser evidence below describe the original artist checkpoint.

| Module/actor | Proposed change from coder checkpoint |
| --- | --- |
| Three court-front bays and gate | Move to y=5. |
| Court west/east returns | Centre y=3; local width=4. |
| Hall back | y=1. |
| Hall closed door and existing pilaster | y=3. |
| Gable sample | y=2. |
| Service corner and hip | y=3. |
| Horse | (7,10), route to (13,10). |
| Goat and bear | Initial source positions unchanged. |
| Four bay pilasters | x=4,8,12,16; y=5.10; width=.30, depth=.45, height=3.40; inherited cream facade. |

Every position and dimension above is a **game adaptation**, not an original plan measurement. The added pilasters use shared descriptors and real compiled collision. Opaque walls remain visible; readability is improved through arrangement rather than hiding solids.

A GPU depth-mask comparison used the same actor geometry/material override and camera, rendering each actor with the full opaque scene and in isolation. At desktop the source horse is 34.2% visible; at phone 35.5%. The proposal gives horse 98.5% /99.1%, goat 99.7% /99.1%, and bear 100% /100%. This is a geometric visibility measure, not a fresh-player comprehension result. The overview uses the actual default camera rig; detail captures are labelled separately.

## Verification

Commands:

```sh
node tools/check.mjs
node tools/build.mjs
node tools/check-release.mjs
node tools/check-site.mjs http://127.0.0.1:4551/dist/
node workbenches/art/review-exposition.mjs --playwright <path-to-playwright/index.mjs>
```

The bounded browser review verifies immutable snapshots, fixed-clock civilian pixels, exact rendered solid IDs, true open gateway and visible closed leaf, resolved part bounds, both roof envelopes, a quarter-turned rectangular hip, skin/physics invariance, original civilian identity, actor recreation, world-time movement and powder, authoritative wood burnout/lintel/roof suppression, camera visibility and idempotent disposal. It executes through the visible review control.

Expected first-use brick upload changes texture count from29 to30. After all finishes have been displayed, repeated skin switches and four two-species recreation cycles remain at47 geometries /30 textures in this scene. Final disposal reports **0 geometries /0 textures**. Normal one-second NPC travel is0.8m; under powder the next second adds0.28m, with world clock ending at1.35s.

The source checkout passes53 Node checks; syntax/dependency resolution, one shared Three pair and all five raw inventories pass. Build contains72 files; all72 packaged hashes and70 hosted file/MIME checks pass. Research, helper state and workbenches are absent from the public package. A separate legacy art smoke passes clock/event/discharge/footprint assertions and returns zero resources, without rerunning its historical screenshot matrix.

Browser: Headless Chrome155, WebGL2, ANGLE D3D11 /NVIDIA RTX3080. All shader/program logs, browser warnings/errors and failed requests are empty. Viewports1280×800 and390×844 are host emulation, not physical-phone performance evidence. Draw counts and resource counts are retained per capture; no GPU completion-time claim is made.

- [Desktop proposal](../../../artifacts/art-review/exposition/proposal-1280x800.png)
- [Phone proposal](../../../artifacts/art-review/exposition/proposal-390x844.png)
- [Phone roof/opening detail](../../../artifacts/art-review/exposition/detail-390x844.png)
- [Inherited brick alternative](../../../artifacts/art-review/exposition/brick-1280x800.png)

## Remaining boundaries and helpers

This is a source-backed form kit with temporary inherited finishes, not a named-building reconstruction or approved final art direction. Exact historic bay dimensions, custom skins, interiors, upper-storey fire, collapse physics, crowd behavior, physical-device performance and player comprehension remain outside this delivery. The New York monograph's title/catalog date discrepancy and fine dimension uncertainty remain explicit in the research register.

Disposable browsers close in finally. The registered loopback preview has an actual one-hour expiry and is stopped before handoff after exact process identity checks. Final restart/source-hash records and released-port receipts remain under ignored `artifacts/art-preview/tb009-01/`. A restart is deliberate and requires a new process registration.
