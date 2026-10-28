# Native asset scale and cross-game compatibility

The user requires Tinderbox to extend the same reusable asset library as Animal Factory Tactics 3D / Farmyard Commando. Source asset dimensions are compatibility constraints. The earlier Tinderbox-only 3.2m story pitch, enlarged 1.4 x2.3m doorway and arbitrary wall stretching are superseded. This coder candidate builds on c3b7ec415366df09733c97146a3cfc10622ef4c4; it requires normal artist/architect integration and is not itself a live promotion.

## Source evidence

Pinned read-only Farmyard commit: `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`, inherited AFT `a20b343a0234b5d8b365a4e1668961ca1bf37653`. The relevant source directory is `sites/tactical-animal/dist/aft/tactics/`. The following bytes were checked directly with `git show <pin>:<path>` against the city provenance references; the donor checkout was not changed.

| Source | Bytes | SHA-256 |
| --- | --- | --- |
| `hybrid-geometry.js` | 1644 | `3807e3d16e372ed4ee8fbae40f799d9ed3b8d14236cf102a2de556e0f5f18eed` |
| `hybrid-world.js` | 12497 | `13d1906addb3d46872b28e46772610715c6f19a169a81e6bdef9b0e6c8c30a69` |
| `hybrid-room-art.js` | 4649 | `694de3e164710c133231d33274c730589c47f9e0afcd48deea1471df258c747f` |

`hybrid-geometry.js::roomBoxes` supplies the unchanged 1 x2 x0.16m wall/pier, 1 x0.35 x0.16m lintel, 1 x1.65 x0.12m leaf, and 0.12m roof/slab thickness. `hybrid-world.js::DIMENSIONS` independently declares tile=1, wall=2, floorSpacing=2.12, slab=.12, wallThickness=.16, doorTop=1.65 and doorThickness=.12. Its floor origins are `z * floorSpacing`; floor slabs occupy the 0.12m immediately below that origin. `hybrid-room-art.js` uses world-metre UV periods (brick/concrete=2m, wood=1m), and creates meshes from the supplied box sizes without scaling the asset to a wall envelope.

## Current implementation

- `src/content/asset-scale.js::ASSET_SCALE` derives the shared values from pinned native templates. One world unit is one metre. The source floor pitch is wall height plus slab thickness, 2.12m.
- The placement adapter calls the unchanged original `roomBoxes` and repeats wall units. It no longer contains a resize/fit operation. Wall faces remain exactly 1 x2 x0.16m at every story and heading; door lintels/leaves retain their native dimensions and mesh-centred pivot convention.
- Native `wall/doorway/pilaster/corner` assemblies use whole one-metre spans, .16m wall thickness and one through five stories. Doorways use an unchanged central one-metre door and whole-unit piers. The compiler rejects enlarged openings, arbitrary wall heights/depths and custom story-pitch overrides.
- Facade top is `2+(stories-1)*2.12`: 2, 4.12, 6.24, 8.36 or 10.48m. Each upper wall is translated to its native floor origin. New `tinderbox:facade-slab-band-1m` trim pieces fill only the .12m inter-story interval; they use the same one-metre module and .16m edge thickness and are identified separately from donor templates.
- Source template IDs appear as `parts[].sourceAssetId`. Repeated ground tiles keep the first role ID and append indices thereafter. Upper walls and interval bands have distinct IDs and explicit `supportPartIds`; duplicate resolved IDs fail validation.
- Ground collision comes only from ground structure and a closed native leaf. Upper facade pieces add no ground blockers or upper-floor navigation. The subsequently added [exterior fire model](../fire-model.md) now heats and burns wall/band surfaces in opted-in scenes; it preserves these exact dimensions. Skins never change physics.
- The coding Exposition fixture and technical workbench now use native architecture and explicitly report the original door's clearance. Civilian meshes, rigging, dimensions, radius, animation, equipment suppression and paint UV projection are unchanged. The provenance file/importer records the new scale adapter; all 20 raw city files / 13,342,315 bytes remain unchanged.
- The user's library compatibility rule is recorded in repository `AGENTS.md`. Artist guidance is to preserve source mesh/rig/UV/pivot/attachment conventions and physical texture density. New designs are separately identified native-scale assets, so later games can reuse them.

The shared API and examples are in [contract.md](contract.md). This source scale is distinct from historical calibration: layout and new roof/ornament choices remain game adaptations unless the research evidence establishes their dimensions.

## Verification

`npm run check` passed all **59 tests**, 58 own-script syntax checks, 66 resolved static modules, the single shared Three pair, every raw provenance inventory and the inherited art smoke check. Direct template checks cover five counts x four forms x four quarter-turn headings (80 assemblies), comparing every donor wall/lintel/leaf size to `roomBoxes`. They also check floor origins, .12m intervals, ground-only obstacles, door leaf size, support removal, rejection of rescaling and collision-ID aliasing. Existing fire, tools, drugs, body clearance, clock, UI and integration checks pass.

`npm run build` passed: **74 public files / 25,291,735 bytes**. Build/workbench asset paths and the pinned source reference hashes pass. No additional donor files were imported.

Browser review passed at **1280 x800** and **390 x844**: all five native heights, fixed doorway dimensions, closed leaves, quarter turns, no horizontal phone overflow, and no warning/error logs. Four rebuild cycles retain stable geometry counts and release to 0 geometries /0 textures. The coloured diagnostic includes edge outlines, giving 154 geometries for the five open facades, 164 closed, and 57 for the single five-story closed sample. These are diagnostic counts, not production art performance measurements.

The real source civilian workbench also passes at both view sizes: original horse 10,300 triangles and goat 9,994 triangles, normal/no hat/unarmed, radii .62m. Twelve temporary painted instances dispose with stable 22 geometries /10 textures. The full-size bear approaches the native opening and stops at y=9.35 rather than clipping through; radius stays .56m and poured fuel remains accepted distance x.08L/m (2.65m / .212L in the browser case).

Local visual evidence is outside the public package:

- `C:/Users/baals/.codex/visualizations/2026/10/27/01a17ea3-b99b-74d2-8a74-56d2556a19cb/native-scale-desktop.png` — unchanged units repeated across five heights.
- `C:/Users/baals/.codex/visualizations/2026/10/27/01a17ea3-b99b-74d2-8a74-56d2556a19cb/native-scale-phone.png` — five-story closed example at phone size.
- `C:/Users/baals/.codex/visualizations/2026/10/27/01a17ea3-b99b-74d2-8a74-56d2556a19cb/native-scale-civilians.png` — original source civilians with native architecture in the technical view.

The temporary preview is stopped. Registration `cefac75c0b50449f982f7604ced87f2a`, PID 71032, creation FILETIME 134376303984718092, preserved all 88 source/asset inputs plus its final QA source before signaling its private STOP file. Exit and port 4550 release verified at 2026-10-28T03:09:52.0274048Z. Restart bundle and cleanup receipt are under `artifacts/helpers/native-scale-01/`; restart is deliberate and needs a new process registration/stop marker. Both temporary browser tabs closed; viewport reset. No helper is retained.

## Character fit and integration

The provisional bear is about 2.02m high with a .56m collision radius; the unchanged native single doorway is only 1m wide x1.65m high. The existing civilian conservative envelopes also remain at their original size. Preserving source dimensions means this opening is not currently traversable by the bear. This is recorded as a fit limitation, not hidden through wall enlargement, actor scaling or a smaller collision body. A larger entrance should be a separately identified compatible assembly, or character behavior/design must be reviewed explicitly.

The artist received the user's correction and native source measurements. Their current facade/character skin masters should be preserved and rebound to these templates. The artist/architect must update older 3.2m story fixtures and .3m wall-depth layouts to the new contract before combining/promoting this candidate. Do not apply the old visual workbench's enlarged dimensions as export templates. Architect owns the final composition, camera/readability review, promotion and live verification.
