# Five direct tools and Menu

UI candidate on `codex/ui-design`, 2026-10-28, based on `b2960b71cffc67f702979ec7c2094237df30b910`. The commit containing this record is the candidate; delivery reports its exact SHA. Architect review/promotion remains required.

The user's physical top-to-bottom order is implemented at every reviewed size:

| Position | Left bank | Right bank |
| --- | --- | --- |
| Top | Matches | Oil barrel |
| Middle | Torch | Throw lantern |
| Bottom | Flamethrower | Menu |

All five tools have direct buttons. A tap selects and uses Matches or Lantern once. Torch and Flamethrower run while held. Oil barrel toggles the existing Pour/Stop action; Stop stays available if an authoritative pouring snapshot has zero fuel. Menu opens the existing pause/reset/options dialog. The central joystick, selected-tool feedback, upper-right map and left zoom retain their Farmyard foundation.

The generic action button and tool picker are replaced. Manual drug/medicine buttons and Q/E/R consumption shortcuts are removed. **The user's walk-over automatic-use requirement still needs implementation in the simulation; this candidate supplies its UI portion.** See the [coder/artist pickup handoff](pickup-handoff.md). UI reads health and effect timers from snapshots and never invents consumption from inventory changes.

## Behavior and interfaces

`mountUI({root,onCommand,onZoom})` and the v1 snapshot contract are preserved. A direct action sends the existing ordered `select-tool`, `primary:true`, `primary:false` commands; held tools release on their owning pointer/key. Number keys 1–5 remain selection-only in their existing ID order; Space operates the selected tool. No new gameplay command is introduced.

The display name Oil barrel retains compatibility ID `jerry-can`, stock `gas` and the existing pour rules. Throw lantern retains `molotov` / `molotovs`. The approved glass lantern without a handle is byte-for-byte unchanged.

Selection, stock, pouring and effect timers remain authoritative. The input adapter tolerates a pending selection while old snapshots arrive, preserves independent joystick/action pointers, and cancels on pause, death, blur, visibility loss, capture loss and disposal. Menu focus trapping, canvas focus restoration and scoped engraving clips remain covered. Synchronous diagnostic snapshots now preserve pouring when the same tool is reselected, matching the actual simulation.

## Sources and changed paths

The [oil-barrel engraving](../../../assets/art/ui/engraved-oil-barrel.png) was generated with the **built-in image_gen tool** for this button: a wooden stave barrel with iron hoops and a bung. Its [saved full prompt and provenance](../../../assets/art/ui/engraved-plates.json) record the original output: 1254 × 1254, 2,227,597 bytes, SHA-256 `13f5e8567003f7627216176fb8c510a67e0be53547bd6977fae63da4a1e706c4`. Alpha spans 0..255. Native SVG viewport is `232 106 789 1065`; original PNG bytes/alpha are preserved. Read-only alpha analysis was used; no bitmap editing/re-encoding was applied.

The lantern and original atlas retain their prior hashes. The three original PNG sources total 5,285,239 bytes. The matching system-color fallback now uses a barrel in place of the can. The old can/bottle atlas cells remain in source bytes and are not used for those buttons. Other archived engraving plates are retained, including unused medicine marks; they are not manual controls.

Farmyard source pin remains `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`. Actual thumb-layout/left-controls/stick-column/right-controls grouping, timber and map frame are retained. No donor checkout or vendor file was changed or newly imported. Besley/Old Standard TT and all nine pinned font/source/notice files remain unchanged. Existing rights uncertainties and the historical limits in the [engraving study](../etched/README.md) remain as recorded. The barrel illustration is an original period-inspired game adaptation.

Changed ownership areas:

- `src/ui/{index.js,model.js,styles.css,etching-frames.js}`: direct controls, labels, input and sizing.
- `assets/art/ui/{engraved-oil-barrel.png,engraved-outline-plates.svg,engraved-plates.json}`: original plate, matching fallback and adaptation record.
- `tests/ui/{browser-tests.js,model.test.mjs}`: current physical order, input lifecycle, absence of manual drugs and real simulation sequencing.
- `workbenches/ui/fixtures.js`: diagnostic same-tool selection behavior.
- `workbenches/integration/review.js`: direct-button selectors and explicit engine-effect QA fixture setup.
- `docs/ui/six-actions`: this record, pickup handoff, checks and evidence.

## Validation

[Machine-readable checks](checks.json) include all browser results, source hashes, assets and helper cleanup.

| Check | Result |
| --- | --- |
| `node tools/check.mjs` | 66 own scripts / 73 static modules; **59/59 tests**; shared Three/provenance, art and nine font/source/notice hashes pass |
| UI browser suite | **30/30 each** at 390 × 844, 320 × 568, 844 × 390 and 1366 × 768 |
| Combined game suite | **11/11 each** at 390 × 844 and 1366 × 768, plus resource sample |
| Asset audit | Three exact PNG source hashes, bounds, fallback IDs; runtime barrel/lantern viewports equal metadata |
| Build / release | **97 packaged files**, 31,295,807 bytes; package hashes/local resources pass |
| Nested hosted release | **95 hosted files** match hashes/MIME; QA excluded |
| Native production review | Matches 12 → 11; Lantern 4 → 3; barrel Pour/Stop; held Flamethrower 6 → 5.8 fuel then released; Menu/options |
| Captured warning/error logs | Empty |

The UI suite includes four actual-simulation checks of item costs, moving pour/Stop, held tools and authoritative effect updates. The combined suite uses the real runtime/art/UI and was adapted to the new controls. Its effect examples inject existing engine commands as QA setup; **they do not prove walk-over pickup detection**. There is no hidden manual consumption control in the product.

Screenshots show the unpatched production package. Optional zoom still needs the previously supplied runtime adapter; unconnected zoom is visibly disabled. These are desktop Chromium viewport checks. Actual handset touch/safe areas/performance and an OS forced-colors session were not exercised.

Views: [390px](evidence/phone-390.jpg), [320px](evidence/phone-320.jpg), [landscape](evidence/landscape.jpg), [desktop](evidence/desktop.jpg), [pouring](evidence/phone-pouring.jpg), [Menu](evidence/phone-menu.jpg), [options](evidence/phone-options.jpg).

To reproduce, run the root check/build/release commands and serve the repository using a bounded registered helper. Review `tests/ui/`, `workbenches/integration/` and the actual `dist/` package at a nested URL.

## Integration and cleanup

The [pickup handoff](pickup-handoff.md) records the remaining automatic-use mechanic and art work. This candidate changes no `src/simulation`, `src/runtime` or `src/art` files. Promotion of the walk-over requirement needs an actual pickup scenario from the coder/artist and the architect's combined review.

The one hidden review helper was registered to this UI chat with a real one-hour deadline and private STOP marker. Source/restart records and the final preserved bundle live under ignored `artifacts/six-actions/helper`. Its retirement and owned-tab cleanup are recorded in `checks.json`. No preview is retained.
