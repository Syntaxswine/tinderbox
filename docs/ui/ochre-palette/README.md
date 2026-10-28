# Warm ochre, burnt sienna and burnt umber

User direction, 2026-10-28: warm yellow ochres and a sepia feel, replacing the Tactical Animal greens; burnt sienna and burnt umber are also welcome. This UI candidate builds on `ba599f655ffb953238518a814666f7d274aee14e` on `codex/row-ignition-ui`. The delivery message identifies the exact resulting commit. Architect review/promotion remains required.

| Palette role | Color | Application |
| --- | --- | --- |
| Yellow ochre | `#c39849` | Core hue; warm tonal variations in wood finish, plan and preview |
| Aged parchment | `#f3dfb1` | Engraved plates and newspaper menu |
| Burnt sienna | `#a65d39` | Accent family, with lighter copper/sienna state cues |
| Burnt umber | `#593820` | Timber finish, outlines and inactive/empty/spent plate ink |
| Deep umber ink | `#352314` | Printed text and loading-screen ground |

The machine-readable [palette guide](../../../assets/art/ui/ochre-palette.json) records the supporting colors, material-map swatches and implementation paths. This is the user's game art direction rather than a historical paint specification.

## Applied presentation

The existing Eastlake wood finish is warmer and more amber through CSS tint layers. Engraved plates and menu paper are more yellow, with dark umber lettering. The ground plan now uses ochre/earth-tone material fills, with outlined copper fire marks. Health uses honey ochre; low health uses a burnt-sienna variation and keeps its numeric HP. Empty and spent controls use readable umber ink. The small Zoom caption has an opaque parchment backing so it remains readable over bright scenery.

The loading screen, page chrome/theme color and existing UI workbench background also use the new palette. The workbench's warm ground is a fixed illustrative input diagram. Actual world art, ground materials, lighting and fire rendering are still owned by the artist/coder; this guide supplies the direction for that work. No world-art changes are bundled here.

The six-button order, etched icons, handle-free glass oil lantern, period-inspired fonts, menu behavior, raw movement, torch state/time/event handling, and automatic walk-over medicine requirement stay as delivered in the [Eastlake ignition candidate](../eastlake-ignition/README.md). The startup help now says “tool button” to match the actual controls.

Changed implementation paths:

- `src/ui/{wood.css,print.css,styles.css,map.js}`: finish, paper/ink, status colors and map fills; map coordinates/grouping remain unchanged.
- `src/app.css` and `index.html`: warm loading/page chrome and matching help text.
- `workbenches/ui/{workbench.css,review.html}`: matching static review backdrop and readable diagnostic labels.
- `assets/art/ui/ochre-palette.json`: palette/owner handoff.
- This evidence/check record and a palette-follow-up pointer in the prior handoff.

## Sources and verification

No new raster art, font, source import or donor revision is introduced. The three engraving PNGs are byte-identical to `ba599f6`; the atlas, glass lantern and barrel retain their source prompts/provenance in `assets/art/ui/engraved-plates.json`. Farmyard remains pinned at `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`; the shared timber bitmap and upstream files are untouched. The typography check confirms all nine font/notice/source hashes and both OFL notices.

[checks.json](checks.json) records exact results, color ratios, original-image hashes, browser observations and helper cleanup.

- `node tools/check.mjs`: **92/92 tests**, 86 script checks, 110 static modules; renderer/provenance/art checks pass.
- Existing browser suite: **38/38** at **390 × 844**, **320 × 568**, **844 × 390**, and **1280 × 800** after the final CSS changes. No new tests were added for this color-only change.
- Solid color checks: paper labels **11.41:1**, selected labels **7.60:1**, inactive/spent selected labels **5.30:1**, menu secondary text **6.34:1**, preview labels at the darkest backdrop edge **4.79:1**. Health/low-health fill-to-track contrast is **8.57:1 / 5.77:1**. Textured finishes were also reviewed in the browser.
- Build/release: **155 files / 49,145,474 bytes**, hash/local-reference checks pass. Nested HTTP check verifies **153 hosted files**, module MIME and QA exclusion.
- Captured browser warning/error logs are empty. Path/reference, whitespace and owned-change checks pass before commit.

JPG evidence: [phone palette](evidence/phone-ochre.jpg), [spent/disabled plate](evidence/phone-spent.jpg), [newspaper menu](evidence/phone-menu.jpg), [desktop low health](evidence/desktop-low-health.jpg). These are the existing DOM-only fixed-snapshot workbench, with world/character art omitted. Combined gameplay/WebGL and physical-handset acceptance remain pending; this palette pass does not change those gates.

The registered hidden preview had a real 30-minute deadline and a private stop marker. Sources and restart records are preserved under ignored `artifacts/ochre-palette/helper/`; final receipts confirm the exact process exited and port 4552 was released. The owned browser tab is closed and its viewport override reset. No helper is retained.
