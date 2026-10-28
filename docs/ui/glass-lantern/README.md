# Glass oil lantern

UI candidate on `codex/ui-design`, 2026-10-28, based on `6a0793981862205b72c290f7036f0264bb2606ab`. The commit containing this record is the candidate; delivery reports its exact SHA. Architect review and promotion remain required.

The user approved the glass lantern and requested removal of its metal-style carrying handle. The revised engraving removes the arched bail, side loops and diagonal carrying supports. It retains the clear glass reservoir, visible oil level and submerged wick, chimney, flame, brass burner and functional wick-adjustment knob. The matching system-color fallback has its carrying handle removed too.

The menu still displays **Oil lantern**, uses **Throw**, and retains internal `molotov` / `molotovs` IDs. Native selection and Throw in the production package changed stock from 4 to 3. Gameplay, input, layout, camera, typography and the other engravings are unchanged.

## Sources and changed paths

- `assets/art/ui/engraved-oil-lantern.png`: revised illustration in its existing asset path.
- `assets/art/ui/engraved-outline-plates.svg`: handle removed from the fallback.
- `assets/art/ui/engraved-plates.json`: current prompt, edit-target commit/hash and 3D brief.
- `src/ui/etching-frames.js`: viewport for the revised silhouette.
- `docs/ui/glass-lantern`: current handoff, checks and six refreshed screenshots.

The [final PNG](../../../assets/art/ui/engraved-oil-lantern.png) was edited with the **built-in image_gen tool**. The [saved prompt and provenance](../../../assets/art/ui/engraved-plates.json) record the approved glass illustration at the parent commit as its edit target. Earlier versions remain in Git history.

The original generated PNG bytes and alpha are preserved: 1254 × 1254, **1,063,533 bytes**, SHA-256 `0bbd7272471c21ca34d97065f9c25d1799d726facdd7e3a0feb09461f755d698`. Alpha spans 0..255. Read-only alpha analysis informed native SVG viewport `356 128 544 1108`; no bitmap cropping/re-encoding was applied. The atlas is unchanged. The two active PNG sources total 3,057,642 bytes.

The [original engraving handoff](../etched/README.md) supplies the newspaper/Eastlake source context and historical limits. Donor pin `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`, imported art, fonts and notices are unchanged. No donor edits or new imports were made. Existing rights uncertainties remain as recorded.

## Verification and evidence

[Machine-readable checks](checks.json) contain full browser results, source hashes and helper retirement evidence.

| Check | Result |
| --- | --- |
| `node tools/check.mjs` | 66 own scripts / 73 static modules; **59/59 tests**; shared Three/provenance, art and nine font/source/notice hashes pass |
| Existing UI suite | **24/24 each** at 390 × 844, 320 × 568, 844 × 390 and 1366 × 768 |
| Asset audit | 17 active plates, both PNG hashes/bounds/fallback IDs; runtime viewport equals metadata; fallback hash matches |
| Build / release | **96 packaged files**, 29,068,612 bytes; hashes/local resources pass |
| Nested hosted release | **94 hosted files** match hashes/MIME; QA excluded |
| Native production review | Selection, Throw stock 4 → 3, phone/small-phone/landscape/desktop display |
| Captured warning/error logs | Empty |

Views: [390px picker](evidence/phone-tools-390.jpg), [320px picker](evidence/phone-tools-320.jpg), [selected lamp](evidence/phone-selected-390.jpg), [landscape](evidence/landscape-tools.jpg), [desktop](evidence/desktop-tools.jpg), [engraving sheet](evidence/engraved-plates.jpg).

These screenshots show the unpatched production package. The previous optional zoom adapter remains a separate integration dependency; unconnected zoom is visibly disabled. The previous combined gameplay suite was not repeated for this illustration-only correction. Actual handset performance/touch/safe areas and OS forced colors were not exercised.

## Integration and cleanup

**Artist/coder brief:** clear glass reservoir and chimney, visible oil/wick, small brass burner and functional wick-adjustment knob; **no carrying handle, bail, side loops or diagonal carrying supports**. The carried/flying 3D model still needs this update. This candidate changes no `src/art`, `src/runtime` or `src/simulation` files and adds no shattering/balance rules.

The bounded hidden preview was registered with a one-hour auto-stop and private STOP marker. Final source/restart records and cleanup receipt are under ignored `artifacts/lantern-no-handle/helper`; retirement and owned-tab cleanup are recorded in `checks.json`. No preview is retained.
