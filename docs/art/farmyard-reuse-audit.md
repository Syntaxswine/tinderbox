# TB-001: Farmyard Commando art reuse audit

Recorded 2026-10-27. Owner: artist, `codex/art-assets`.

Recommend a small first reuse set of the existing industrial UI, flamethrower illustration, painted fire/explosion sheets, and cargo materials. The bear needs a new species-specific asset and equipment fit. This milestone delivers an inventory and adaptation brief; no donor assets or runtime modules are imported, and no finished art is generated.

## Source pins and review boundaries

Donor: `C:/Users/baals/Documents/ChatGPT/Tactical Animal`, repository [Syntaxswine/farmyard-commando](https://github.com/Syntaxswine/farmyard-commando.git). Inspection was local and read-only. No fetch, remote-main verification, deployment check, or donor build was performed.

| Pin | Exact revision | Meaning at this audit |
| --- | --- | --- |
| M | `30a3b8cae5f36bb0c1df3685b7fba16f701c2083` | Approved inspection baseline: locally cached `origin/main`, also the donor primary checkout HEAD. References below use M unless explicitly marked otherwise. |
| A | `a20b343a0234b5d8b365a4e1668961ca1bf37653` | Original `AnimalFactory3D/game/dist` snapshot revision recorded by the AFT/designer manifests. This is upstream provenance, not a Farmyard branch tip. |
| F | `ecb454a4b7513ca2ffa04bf1dac70ca6d1d909cd` | Observed flamethrower candidate on `codex/painted-flamethrower-effects`; five commits ahead of M, none behind. Separate review required. |
| U | `c8a03373bdc6ae515765d081d26d615b4c72e9c8` | Observed `codex/farmyard-ui` candidate; four commits ahead of M, none behind. Separate review required. |
| Environment branch | `2885156ca8e8fd139881aefe4c288bea7d55e2a6` | `codex/short-measure-environment` is already an ancestor of M. Its art kit is present on M, although its runtime binding remains unfinished. |
| Stale local main | `abe4da91452f7c3c9a6ac5ff72c0f813b9916859` | Donor local `main` is 28 commits behind M; do not use it as the extraction baseline. |

The graphics worktree was actively changing during inspection. Its uncommitted work and later branch tips are excluded; findings marked F refer only to the committed revision above. The environment and UI worktrees were clean when inspected. These observations do not approve any donor candidate.

The donor workflow deploys pushes to main, but presence on cached M establishes repository contents only. The inventory distinguishes art used by the main solo presentation, art merely available in its inherited catalog, and art from the candidate commits.

Evidence: [art direction at M](https://github.com/Syntaxswine/farmyard-commando/blob/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/ART_DIRECTION.md), [AFT provenance at M](https://github.com/Syntaxswine/farmyard-commando/blob/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/aft-provenance.json), [designer provenance at M](https://github.com/Syntaxswine/farmyard-commando/blob/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/designer-provenance.json). All file paths below are donor-repository-relative.

## Reusable visual sources

### Industrial controls and map frame

Main solo presentation uses these project-authored files:

- `sites/tactical-animal/dist/assets/ui/industrial-switches/switch-skins-v2.webp`: 1254 x 1254, a 2 x 2 atlas of green off/on and red off/on skins. The worn olive housing stays opaque while the inset face illuminates.
- `sites/tactical-animal/dist/assets/ui/industrial-switches/map-frame-v1.webp`: 1254 x 1254 with a transparent center. The actual manifest and CSS use a 16% nine-slice border.
- `sites/tactical-animal/dist/assets/ui/industrial-switches/symbols.svg`: live control symbols on a 32-unit grid, separate from the painted surfaces.
- `sites/tactical-animal/dist/assets/ui/industrial-switches/manifest.json`: generation prompts, image dimensions, hashes, material rules, and symbol ancestry.

Direct presentation companions are `sites/tactical-animal/dist/industrial-switches.css`, `sites/tactical-animal/dist/field-hardware.css`, and `sites/tactical-animal/dist/map-frame.css`. The markup/state bindings live in `sites/tactical-animal/dist/game.html` and `sites/tactical-animal/dist/app.js`.

The pixels can be reused unchanged. Tinderbox needs its own action labels, state bindings, input layout, and selected/disabled meanings once its gameplay and devices are decided. Keep labels, symbols, counts, and cost text inside one shared white-painted legend so they illuminate together. Main's End Turn/AP/stance semantics are donor behavior, not accepted Tinderbox mechanics.

At U, `sites/tactical-animal/dist/assets/ui/industrial-switches/shooting-switch-skins-v1.webp` adds amber and red warning states in a 1774 x 887, 2 x 2 rectangular atlas. Its prompt and hash are in `sites/tactical-animal/dist/assets/ui/industrial-switches/shooting-switches-v1.json`. The candidate also changes the shared symbol file and styles. Treat this as an optional later extension, with its complete U metadata. [Candidate metadata](https://github.com/Syntaxswine/farmyard-commando/blob/c8a03373bdc6ae515765d081d26d615b4c72e9c8/sites/tactical-animal/dist/assets/ui/industrial-switches/shooting-switches-v1.json).

### Existing terminal surfaces

The inherited M catalog also contains `sites/tactical-animal/dist/aft/assets/ui/dialogue-terminal/field-terminal.webp`, `sites/tactical-animal/dist/aft/assets/ui/dialogue-terminal/message-paper.webp`, and `sites/tactical-animal/dist/aft/assets/ui/dialogue-terminal/crt-green-v1.webp`. Companion `sites/tactical-animal/dist/aft/assets/ui/dialogue-terminal/manifest.json` records the shell/paper prompts and hashes; `sites/tactical-animal/dist/aft/assets/ui/dialogue-terminal/crt-green-v1.json` records the CRT treatment.

These are available materials, not evidence of a Tinderbox dialogue system. The shell records a 7% slice; the CRT is a complete 4:3 screen material and should retain its curvature and scanline scale. U's `sites/tactical-animal/dist/targeting-monitor.js` and `sites/tactical-animal/dist/target-sprites.js` adapt inherited character images into a CRT target preview, with `sites/tactical-animal/dist/shooting-controls.js` and CSS/state bindings. Its species/pose lookup, measured image bounds, and body-region targeting need bear-specific data if that interface is adopted.

### Characters and a bear adaptation

`sites/tactical-animal/dist/aft/tactics/animal-motion-catalog.js` contains 12 authored profiles: horse, goat, bull, cow, donkey, sheep, skunk, pig foreman, pig director, rabbit, dog, and hen. No bear profile or bear-named asset was found in the inherited catalog. The library's 704 character entries include poses, references, paint sheets, and manifests; that count is not 704 complete 3D characters.

Concrete visual references reviewed at M:

- `sites/tactical-animal/dist/aft/assets/characters/lowpoly-proof/pig-foreman-model-paint-v1.png`: 1774 x 887, four body views; useful evidence of the painted clothing, broad mass, and front/side/back continuity.
- `sites/tactical-animal/dist/aft/assets/characters/weapon-expansion/normal/horse-flamethrower-standing.png`: 384 x 256, a finished three-quarter equipment pose with alpha. Its stance/anchor metadata is in `sites/tactical-animal/dist/aft/assets/characters/weapon-expansion/manifest.json`.

The main battlefield uses 3D species models and projected paint through `sites/tactical-animal/dist/aft/tactics/animal-motion-paint.js`, `sites/tactical-animal/dist/aft/tactics/horse-model-paint.js`, `sites/tactical-animal/dist/aft/tactics/worker-locomotion.js`, and `sites/tactical-animal/dist/aft/tactics/battle-posture.js`. For example, `sites/tactical-animal/dist/aft/tactics/pig-foreman.js` pairs its paint with `sites/tactical-animal/dist/aft/tactics/pig-foreman-10k-data.json`. A pose illustration is not a replacement for this 3D asset/rig.

Reuse existing species as themselves where a later brief calls for them. For the protagonist, propose a distinct rounded-ear, short-muzzle, broad-shoulder bear silhouette with readable paws and equipment clearance; fur, clothing, height, and character styling remain open. Prepare a consistent turnaround, model/paint fit, and grip/muzzle anchors before finished bear production. Calibrate any target-preview regions and portraits to the bear's proportions. Existing pig or horse paint cannot supply that species identity unchanged.

### Flamethrower image and equipment model

`sites/tactical-animal/dist/aft/assets/equipment/painted-ui/flamethrower.png` is already used by main's loadout. Its full image is 1979 x 795; `sites/tactical-animal/dist/aft/tactics/weapon-icons.js` records content crop `[29,48,1927,700]`. `sites/tactical-animal/dist/weapon-artwork.js` resolves the source URL and applies that crop without changing the original pixels. Preserve alpha, aspect ratio, and the crop metadata when adapting the inventory art.

The world equipment is generated separately by `sites/tactical-animal/dist/aft/tactics/weapon-models.js`, with direct imports from `sites/tactical-animal/dist/aft/tactics/one-handed.js`, `sites/tactical-animal/dist/aft/tactics/grenade-model.js`, `sites/tactical-animal/dist/aft/tactics/horse-rifle.js`, and vendored Three.js. The flamethrower has backpack/hose geometry and grip, support, and muzzle anchors. Its painted icon is directly reusable; bear shoulder clearance, hand spacing, tank harness, hose routing, and emitted-flame origin require a model/rig fit pass. The coder audit owns the complete module closure.

### Fire and explosion effects

The following inherited M assets all come from A and are 1254 x 1254:

- `sites/tactical-animal/dist/aft/assets/effects/painted-fire/flame-atlas-v1.png`: four painted orange/cream flame variants in a 2 x 2 sheet.
- `sites/tactical-animal/dist/aft/assets/effects/painted-fire/smoke-atlas-v1.png`: four grey painted smoke plumes in a 2 x 2 sheet.
- `sites/tactical-animal/dist/aft/assets/effects/painted-fire/tank-burst-atlas-v1.png`: four phases from bright burst to dark billowing smoke, in a 2 x 2 sheet.
- `sites/tactical-animal/dist/aft/assets/effects/painted-fire/ash-paint-v1.png`: an additional inherited effect texture; defer it until persistent aftermath is deliberately specified.

Direct renderer sources are `sites/tactical-animal/dist/aft/tactics/painted-fire-effects.js`, `sites/tactical-animal/dist/aft/tactics/painted-fire-state.js`, `sites/tactical-animal/dist/aft/tactics/painted-fire-zones.js`, and `sites/tactical-animal/dist/aft/tactics/painted-blast-effects.js`. Their materials interpolate atlas cells, use camera-facing geometry, manage alpha/depth/color space, and clip against gameplay-supplied visibility/fire regions. The explosion also builds transient fragments and lighting. These PNGs are usable source art; reproducing the intended effect requires its rendering contract.

Main `sites/tactical-animal/dist/field-view.js` does not import those painted VFX modules: its effect queue draws lines and grenade rings. Catalog presence therefore does not establish painted flame or barrel explosions in the solo presentation.

F adds `sites/tactical-animal/dist/flame-effects.js`, `sites/tactical-animal/dist/flame-pose.js`, `sites/tactical-animal/dist/flame-event.js`, `sites/tactical-animal/dist/flame-aim-view.js`, and `sites/tactical-animal/dist/flame-controls.js`, with accompanying app/field-view changes. It adapts the inherited flame atlas into sustained overlapping plumes and an operator pose. It loads the flame sheet, not a complete smoke/ash/victim system. Before reuse, review bear bone/weapon-anchor compatibility, map-size-specific fog masking, wall clipping, timing, reduced-motion behavior, and resource disposal. F remains an observed candidate. [Candidate effect source](https://github.com/Syntaxswine/farmyard-commando/blob/ecb454a4b7513ca2ffa04bf1dac70ca6d1d909cd/sites/tactical-animal/dist/flame-effects.js).

### Explosive barrels and other environment art

`sites/tactical-animal/dist/aft/assets/environment/barrel-single.png` and `sites/tactical-animal/dist/aft/assets/environment/barrels-cluster.png` are catalog illustrations. The inspected single-barrel PNG is a rusty red/oxide drum with alpha. It is separate from the runtime drum's painted 3D construction.

The runtime path is `sites/tactical-animal/dist/aft/tactics/battle-environment.js` -> `sites/tactical-animal/dist/aft/tactics/painted-cargo.js`, using both `sites/tactical-animal/dist/aft/assets/environment/painted-study/material-atlas-v2.png` and `sites/tactical-animal/dist/aft/assets/environment/painted-study/cargo-materials-v1.png`. The first is 1254 x 1254 with four surface cells; the second is 1536 x 1024 with six cargo finishes. `sites/tactical-animal/dist/aft/tactics/painted-environment-scene.js` supplies the shared geometry helper. The `explosiveRed` finish includes a shader treatment and a procedural canvas FLAMMABLE label, so the appearance is not contained in one red-barrel PNG.

`sites/tactical-animal/dist/aft/tactics/explosive-barrels.js` records drum radius 0.328 m and height 0.8 m, matching cargo geometry: 0.656 m diameter, with a one-cell placement rule. Preserve an unmistakable hazard marking and agree visible dimensions with collision, aiming, and damage. Tinderbox needs its own placement and destruction states. In main, `sites/tactical-animal/dist/original-art.js` calls the cargo renderer with `props:[]`; the imported barrel art/rule helpers alone do not establish solo explosive-barrel integration.

Main already renders painted ground and brick through `sites/tactical-animal/dist/original-art.js`, including `sites/tactical-animal/dist/aft/assets/environment/ground-concrete.png`, `sites/tactical-animal/dist/aft/assets/environment/ground-gravel.png`, `sites/tactical-animal/dist/aft/assets/environment/ground-grass.png`, and `sites/tactical-animal/dist/aft/assets/environment/hybrid-surfaces/brick-factory-v1.png`. These can extend a later environment kit without importing the whole catalog.

The merged Short Measure kit is `sites/tactical-animal/dist/mission-art/short-measure/kit.js`, with `sites/tactical-animal/dist/mission-art/short-measure/placements.json`, `sites/tactical-animal/dist/mission-art/short-measure/reserve-7.svg`, and `sites/tactical-animal/dist/mission-art/short-measure/shipping-manifest.svg`. Its scales, sacks, desk, cargo, and paint are useful references. The placement manifest still says the runtime adapter is not installed. New solids require matching navigation and solid-mesh-part occlusion bindings; decorative placement is insufficient. Reserve 7 markings and mission papers need a Tinderbox content pass if selected. [Placement/rights evidence](https://github.com/Syntaxswine/farmyard-commando/blob/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/mission-art/short-measure/placements.json).

## Material, camera, and scale conventions

- Preserve broad painted shapes, restrained brushwork, softened highlights, chipped olive enamel, oxide red, dull steel, warm brass, cream paper, and dark ink. UI light belongs to the inset material; opaque mounting metal retains its material identity.
- Keep atlas margins and transparent edges. Use recorded crops and pivots, with original aspect ratios and explicit cell bounds. The sources use non-power-of-two dimensions; do not assume square 256-pixel cells.
- Main uses `T.OrthographicCamera`, camera offset `(10,14,12)`, and a default 13 m vertical span. `sites/tactical-animal/dist/grenade-controls.js` records the basis; `sites/tactical-animal/dist/field-view.js` records projection/framing. This is the donor's oblique three-quarter view, not a guarantee of mathematically equal isometric axes.
- The Short Measure review at `docs/art/short-measure/arrival-phone.jpg` demonstrates this camera at 390 x 844. It is an art-review pan with no player/combat/fog, rather than a live gameplay screenshot. Check a future bear, tanks, muzzle, drum label, and occluding walls at the agreed Tinderbox view size.
- World units are metres. Retain the inherited 2 m wall height as a comparison reference; barrel and prop dimensions must be explicit. Main uses `sites/tactical-animal/dist/aft/tactics/daylight-rig.js`, morning lighting, and a 1024-pixel mobile shadow map. Tinderbox camera, lighting, and device choices remain review decisions.
- Main's white legend paint is `#e9e1cd`, warming to `#fff4dd` when lit. Preserve readable symbol/label states. The donor's 44-pixel zoom touch target is useful evidence for phone UI, while Tinderbox's target devices are still open.

## Provenance and rights record

`sites/tactical-animal/aft-provenance.json` maps each imported `aft/` file to A with its original relative path, SHA-256, and byte count. The inherited bank is 1,181 files, including 949 categorized art/manifests. `sites/tactical-animal/designer-provenance.json` describes a separate editor dependency snapshot from the same A revision; it is not a second independent art source. Prefer one selected source copy.

The switch/map generation manifest records built-in image generation, exact prompts, original output identifiers, WebP conversion settings, and hashes. It traces the original symbols to `sites/tactical-animal/dist/field-radio-icons.svg` at `d1e84684058c8d44298432a00c6ea9a6bd2b2cf6`; the M symbol file also contains later adaptations. Preserve the actual M file and its manifest, rather than treating that older revision as the current UI source.

No repository-wide art/software license or upstream AFT art license was found in the tracked M tree. The Short Measure rights manifest explicitly records these unknowns. The user's reuse request is recorded project direction; it is not evidence of a third-party license grant. Keep rights unresolved in future per-file import records for architect review.

`sites/tactical-animal/dist/aft/tactics/vendor/THREE-LICENSE.txt` separately carries the Three.js MIT notice. The designer additionally has `sites/tactical-animal/dist/designer/a20b343a0234/tactics/vendor/babble/LICENSE`; preserve any notices that enter a reviewed code dependency closure. A vendor software notice does not license the illustrated assets.

The audited raster paths supply flattened PNG/WebP exports and some prompt/manifest evidence. Editable layered masters and some original generated output files are not supplied at these paths. A prompt and image hash can document provenance without reproducing the same pixels.

## Recommended first asset set

Propose these nine unchanged files from M for the next reviewed import: eight rasters and one symbol sheet, about 10.2 MiB of source art before companions. This is a visual seed set, not a runnable dependency closure. Hold the U shooting bank/CRT interaction and F runtime adaptation for separate review; defer ash, broad scenery, mission-specific markings, and character imports.

| Exact source file at M | Source layout | SHA-256 |
| --- | --- | --- |
| `sites/tactical-animal/dist/assets/ui/industrial-switches/switch-skins-v2.webp` | 1254 x 1254; 2 x 2 | `2894c3ebed7ffd229aea9dbc632a7ccac76b50130d98ab4ee6050eeb60f19f2b` |
| `sites/tactical-animal/dist/assets/ui/industrial-switches/symbols.svg` | 32-unit symbols; canonical LF text | `a7772b6274fed2efc0681b38bfda60546db754f2d3f88c3100feefce99891e88` |
| `sites/tactical-animal/dist/assets/ui/industrial-switches/map-frame-v1.webp` | 1254 x 1254; alpha center | `de448296888095d958a84afe0cdafdd8f268034c380d97a0a1f5f8cd30a9aae0` |
| `sites/tactical-animal/dist/aft/assets/equipment/painted-ui/flamethrower.png` | 1979 x 795; recorded crop | `b117fdd18e31ac4e82658acb4de4d18438928d73ea05db58132eaa371f6d7dde` |
| `sites/tactical-animal/dist/aft/assets/effects/painted-fire/flame-atlas-v1.png` | 1254 x 1254; 2 x 2 | `252f9abe573b8dfade6bc265e7cf097eb2d9bf488039016f072e5bf4f0663d07` |
| `sites/tactical-animal/dist/aft/assets/effects/painted-fire/smoke-atlas-v1.png` | 1254 x 1254; 2 x 2 | `facc0d32390fe79f1cf660eb4830322376f6f5bf07e920e0d5a50d77eb4752c8` |
| `sites/tactical-animal/dist/aft/assets/effects/painted-fire/tank-burst-atlas-v1.png` | 1254 x 1254; 2 x 2 | `1bee9c7cf145f7ce1f7cbb011cd420d92b6110873b74a9097de1915f7a56f01c` |
| `sites/tactical-animal/dist/aft/assets/environment/painted-study/material-atlas-v2.png` | 1254 x 1254; 2 x 2 | `4b0c64828a25507a07e26f48fa83bc805908e03f29ed297e83d002e9b2e25e05` |
| `sites/tactical-animal/dist/aft/assets/environment/painted-study/cargo-materials-v1.png` | 1536 x 1024; 3 x 2 | `032e09c8fa111f2e05f4b54acca5b46b97588241e234573e68117dbaba95db8e` |

Carry the relevant AFT provenance entries, switch generation manifest, crop data, and any required notices with that later import. The two cargo atlases depend on the model/material recipe for their intended drum appearance. Bear production should begin from a separately approved species/rig brief. No existing asset in this set is labelled as a finished bear.

Keep unchanged donor bytes and source metadata under `art/source/farmyard-commando/<revision>/`, new editable Tinderbox masters under `art/source/tinderbox/`, and approved game exports under `assets/art/`. Preserve donor-relative paths inside each source snapshot. A later asset manifest should record stable ID, donor revision/path, upstream A revision when applicable, source/export SHA-256, dimensions/alpha, crop/pivot, world scale/footprint, dependencies, rights status, and exact processing. These are layout recommendations; this audit creates no snapshots.

## Verification and limitations

- Read Tinderbox's architecture/workflow/source-baseline instructions from architect commit `71d445eaebf427dbd764441cbffbec1ec50cd614` without switching the art branch.
- Used read-only `git show`, `git ls-tree`, `git rev-list --left-right --count`, source searches, and worktree status inspection. The source links and referenced files were checked against their indicated pinned Git objects; HTTP availability was not probed.
- Compared all nine proposed source files with M's Git blobs, applying checkout text normalization for the SVG. Checked nine sampled inherited PNGs against AFT SHA-256 metadata, both main UI WebPs against their manifest, and the U shooting atlas against its own manifest.
- Read PNG header dimensions and visually inspected 13 raster files: the eight recommended rasters, single-barrel illustration, pig-foreman paint, horse flamethrower pose, Short Measure arrival render, and U shooting atlas. SVG symbol markup was inspected separately. The linked source files and supplied render are the visual evidence; no new screenshots or rendered gameplay claims are introduced.
- Ran the report's path/link/hash review and `git diff --check`. Documentation-only scope does not require donor runtime tests. No browser/gameplay validation or complete runtime extraction was attempted.

Remaining work: architect reconciliation with TB-002; asset-rights resolution; selection of bear appearance, devices, camera and game rules; full self-contained extraction/adapter review; and a future in-engine scale, alpha, clipping, and equipment-fit review. No task-owned servers, watchers, or retained helper processes were started.
