# Phone-first Eastlake controls

UI candidate on `codex/ui-design`, 2026-10-28. The commit containing this record is the implementation candidate; the final delivery reports its exact SHA. Architect review/promotion remains required.

The accepted [phone layout plan](../../engineering/phone-layout.md) arrived as coder commit `e851cfe5b206a0adc86fafdcb87761ac8a5f7886`, cherry-picked here as `40e137618bc22bd18275c13aa8b3009793a27aac`. The architecture conflict was resolved by preserving the reviewed exposition paragraphs and adding the phone requirement. This candidate builds on wood `5bb4fefcc0fea181b6d2ab90824ba622907032d8` and Eastlake/type `3a83e8dfdbd01126a08c574fe5e7fe87d488bf29`.

## Result and ownership

Exactly three persistent native buttons flank each side of the central joystick:

| Left bank | Centre | Right bank |
| --- | --- | --- |
| Powder | Selected tool, stock and status | Use / Stop |
| Heal | Movement joystick | Tools |
| Invert | | Pause |

Tools opens a compact nonmodal picker with all five existing tools. Opening it emits no command and retains held movement/pouring. Selection sends the existing command and releases the old trigger, with selection/stock still taken from snapshots. Escape closes the picker first; pause/options retain their authoritative pause and modal focus behavior. Disabled/empty/full-health states, raw stick input, independent pointers, repeat suppression and cancellation/disposal remain covered.

The upper-right ground plan uses v1 world width/height, terrain tiles, physical obstacle footprints, burning cells and bear position/heading. Logical x runs right and y down; the SVG letterboxes to preserve world aspect and uses the same heading. Terrain/building paths are cached, while fire/player update on every snapshot independently of health/inventory repaint caching. The pre-snapshot display says “Awaiting plan…”. The overview supplies no movement/visibility rules.

The retained wood grain, flat inset rails, reeded rules, incised button ornament and Eastlake corner rosettes frame the phone layout. Besley labels/titles and Old Standard TT text/italics remain self-hosted with unchanged OFL notices. Their modern, period-informed interpretation and historical sources are documented in the [Eastlake pass](../eastlake/README.md); this is not a claim of an exact 1893 type reconstruction.

Changed ownership areas: `src/ui/{index.js,map.js,styles.css}`, field framing in `src/app.css`, original Tools mark / adaptation metadata in `assets/art/ui`, UI tests/fixtures/workbench, the new `workbenches/phone` review harness and this record. `src/runtime`, `src/simulation` and `src/art` are unchanged.

## Camera adapter dependency

The UI adds optional `mountUI({root,onCommand,onZoom})`, sending `1.15` and its reciprocal through `onZoom`. Without that callback, zoom is visibly disabled. The fake-snapshot workbench logs the camera callback separately from gameplay commands.

The concrete [proposed runtime patch](../../../workbenches/phone/runtime-zoom.patch) connects the existing camera's `magnify` path, validates factors and calls renderer repaint directly so paused/manual zoom does not advance simulation. It preserves the existing 0.65..3 clamp. The coder or architect must apply this small adapter during combined integration; this UI candidate does not alter their runtime source.

For review from the repository root:

```powershell
node tools/check.mjs
node tools/build.mjs
node tools/check-release.mjs
git apply --check workbenches/phone/runtime-zoom.patch
node workbenches/phone/prepare-review.mjs
```

The last command copies the built package into ignored `artifacts/phone-ui/combined`, applies the patch **only to that generated copy**, and copies the phone/integration QA workbenches. Serve the repository with the normal bounded preview helper. Review `artifacts/phone-ui/combined/index.html`, `artifacts/phone-ui/combined/workbenches/phone/index.html` and the existing integration workbench there. Its review manifest records source, patch and resulting runtime hashes. The combined directory is a QA preview; its runtime intentionally differs from the untouched release manifest. Build and check the final integrated runtime again before promotion.

## Source and provenance

The [adaptation record](../../../assets/art/ui/phone-controls.json) verifies four source files directly with read-only `git show` at `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`: `game.html`, `touch-controls.css`, `field-hardware.css` and `map-frame.css`. All four byte lengths and SHA-256 values match the coder plan.

Farmyard's actual `thumb-layout / left-controls / stick-column / right-controls` structure, movement well, zoom marks, switch family and existing local map-frame CSS/image supply the foundation. The map fits inside the Eastlake wood frame. No donor files were modified or newly bulk imported. Existing UI/city/font manifests remain authoritative for imported bytes, license notices and upstream provenance. The Tools mark and map drawing code are original editable Tinderbox adaptations. Existing donor rights limitations remain unresolved as recorded; provenance is not a license grant.

## Verification and evidence

[Machine-readable checks](checks.json) include the full browser results, native observations, source/adaptor hashes and helper retirement receipt.

- `node tools/check.mjs`: 65 own scripts / 72 static modules resolve, one shared Three pair and pinned provenance pass; **59 tests pass**; existing art and nine font/source/license hashes pass.
- UI browser suite: **24/24 at each** of 390 × 844, 320 × 568, 844 × 390 and 1366 × 768. This covers six-button grouping, 44px targets, frame containment, picker/stock/focus, map/loading, raw inversion input, multiple pointer IDs, cancellation and repeated listener disposal.
- Proposed-adapter camera suite: **4/4 at all four sizes**. Real renderer frame counters prove manual/paused repaint; aim projection scales correctly and clamps at 0.65/3. Full snapshots and native scene transforms remain identical under zoom; invalid factors are inert; disposal clears UI/canvas/scene and GPU geometry/textures.
- Existing combined gameplay suite: **11/11 at 390 × 844 and 1366 × 768**, including real pouring/fuel, powder, once-only inversion, clock freezing, wall-clipped held flame, exposition parts/civilians and four runtime rebuilds with stable resources.
- Native browser clicks/drags exercised picker selection, held flamethrower release, pouring through joystick release, powder while pouring, zoom and pause/options. The fire-map screenshot shows six real burning cells from the existing chase fixture; it is not the fake-snapshot workbench.
- Build/release: **90 packaged files** match hashes/local URLs; **88 hosted files** match at a nested URL with correct module MIME types and no QA workbench in the release. The unpatched release truthfully disables unconnected zoom.
- Captured warning/error console logs are empty. `git diff --check` and `git apply --check` pass.

Screenshots show the generated combined preview with the proposed camera adapter:

| View | Evidence |
| --- | --- |
| Primary phone | [390 × 844](evidence/phone-390.jpg) |
| Small phone | [320 × 568](evidence/phone-320.jpg) |
| Five-tool picker | [390px](evidence/phone-tools.jpg), [320px](evidence/phone-320-tools.jpg) |
| Landscape phone | [844 × 390](evidence/phone-landscape.jpg) |
| Desktop | [1366 × 768](evidence/desktop-game.jpg) |
| Real fire / pouring | [Phone chase fixture](evidence/phone-fire.jpg) |
| Existing pause/options | [Pause](evidence/phone-pause.jpg), [Options](evidence/phone-options.jpg) |

These are desktop Chromium viewport checks, not handset performance measurements. Independent touch-pointer combinations use the browser test harness; real handset touch, nonzero hardware safe areas and browser chrome changes still need device review. The map is a current-level ground overview, without fog, routing or map expansion. Runtime callback wiring is the explicit integration dependency above.

The one hidden review helper was registered to this UI chat with an actual one-hour auto-stop and private STOP marker. It was stopped after verification; its exact process identity and port release are recorded in `checks.json`. Source/restart records remain under ignored `artifacts/phone-ui/helper`. The owned browser tab was closed and its temporary viewport override reset. No preview remains running.
