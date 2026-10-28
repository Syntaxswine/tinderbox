# TB-011: exposition foundation review

Decision: **approved for promotion** as a small researched construction-kit study. The combined checks pass. Publication and live-byte verification are recorded below after deployment. This approval covers the basic forms, direct asset reuse and source dossier; custom historical skins and a named-building reconstruction remain later work.

## Reviewed deliveries

| Owner | Exact worker candidate | Integrated commit |
| --- | --- | --- |
| Coder, TB-008 | `1b51ff81f3089094c6398b05a7c26095f8ce8b91` | `e18c93e` |
| UI specialist, TB-010 research | `f1cdf7bb9bb3f4d42dc22fa10cc72d3a0076880e` | `ab0ccc4` |
| Artist, TB-009 research | `86220f3f633661736438d3fe427d9a66e1661e19` | `97460f3` |
| Artist, TB-009 runtime | `c80db1da0ccc6c62ccd6bb0c865e2802a21fefa4` | `3a1e8e8` |

The architect assembled these on `codex/exposition-foundation`, reviewed their assigned paths and kept the donor checkout read-only. Root integration adopts the artist's far-side layout and four descriptor-based bay pilasters, keeps the original eleven-module layout reproducible in the art workbench, selects the exposition as the production default, updates the scene labels and extends combined acceptance. The final scene has fifteen modules and two original civilians. All placement, opening and roof dimensions are explicit game adaptations.

## Evidence and reuse

The [reconciled dossier](../research/1893-exposition/README.md) links the architect, artist and UI source registers. Independently inspected evidence includes the 1893 Conkey Horticulture floor diagram (scan 31) and description (scan 29 / printed p. 9), contemporary Arnold photographs, the Hunt/Riquois Administration elevation and front-half ground plan, and the later architect-published New York State Building plan/elevation and matching photograph. The New York monograph's title/catalog date discrepancy remains unresolved and explicit. It is not presented as an 1893 printing.

Original site-plan and wayfinding evidence includes the Smithsonian Rand McNally map, PDF page 4, and Flinn's guide, printed p. 17 / PDF page 23. The inspected map prints 580 feet per inch; a different catalog's 610-foot edition is not used interchangeably. No exact plan-derived bay dimension, colour, roof pitch or lettering specification is invented. The inaccessible insurance drawings and other catalog-only items remain leads. Cached PDFs, exact hashes, scan locators, rights evidence, observations and reproduction commands are documented; source scans are not runtime textures.

The three added wall surfaces and the normal horse/goat model, paint and rig closure come from Farmyard pin `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`, preserving AFT ancestry `a20b343a0234b5d8b365a4e1668961ca1bf37653`. The architect independently compared 104 unique pinned source blobs, including all nineteen new raw imports, with Git objects. All installed raw bytes match. The five provenance inventories now cover 33 raw files; adapter recipes and their references remain separate from the raw inventories. The final checks preserve one shared Three r180 pair and local dependency closure.

The actual original normal horse/goat factories render at authored scale, with measured 0.62 m conservative body radii. No Red Hat cap/uniform module is imported. The civilian wrapper hides allocated weapon helpers after every pose update; raw donor diagnostics naming a rifle do not describe visible equipment. The combined scene reports two original civilians and zero provisional NPCs. The protagonist bear remains provisional.

## Model, view and input acceptance

The compiler produces visible parts and solid footprints from the same module descriptors. A 1.4 by 2.3 m open gate clears the current bear; a closed leaf blocks it. Roof and lintel envelopes do not create filled ground-plane obstacles. Physical materials remain independent of facade, trim, door and roof skin slots. Swapping the facade leaves collision, clocks, movement, fuel and thermal state identical.

The final source passes **56 Node tests**, **60 own-script syntax checks**, **67 static-module checks**, all five provenance inventories and the artist's seventeen syntax/dependency checks. Architect-held-out replays exercise a quarter-turned passage beneath a roof at 30/60/120 Hz and 0.2-second hitches. Powder pouring has identical accepted paths and fuel accounting; the closed variant stops at the same solid part.

The actual combined browser page passes **11/11 at 1280 by 800 and 390 by 844**. The real UI toggles pouring, preserves the distance-accounted trail under powder, reverses movement once while retaining aim, pauses without stale input, heals from authoritative stock, clips held flame at walls, and separates the bear from a pursuing finite fire front. New checks cross the visible exposition gate, stop at its closed door, slow the original civilians and compare rendered solid IDs with the model. Four complete exposition runtime rebuilds retain stable live resource counts.

The visible art-workbench review also passes at both viewports: immutable snapshots, fixed-clock poses, actual skinned original models, true open/closed geometry, bounded gable/hip roofs, a rotated rectangular hip, warmed skin reuse, civilian recreation and authoritative burnout. A lost pier removes its lintel and supported roof; the surviving pier remains. This is visibility cleanup, not collapse physics. Full disposal returns zero geometries and textures. With the reviewed arrangement, the bear is fully visible and both civilians have over 98% geometric visibility in these host captures. This mask test does not establish fresh-player comprehension.

An actual 260-frame animation sample, using the warm final 240-frame window, observed **59.75 Hz**, simulation CPU p95 **2.40 ms**, render/submission CPU p95 **3.80 ms**, 200 draws, 51 geometries and 29 textures. Browser: Chromium 155, WebGL 2, ANGLE D3D11 / RTX 3080 on Windows. These are host observations, not GPU elapsed time or physical-phone performance. Browser warning/error logs are empty.

## Package and lifecycle

The production build has **72 inventoried files, 25,294,340 bytes**, plus its generated manifest. All packaged hashes and dependency URLs pass. A separate server exposed only `dist/` beneath `/tinderbox/`; all seventy non-dot hosted files, MIME types and hashes match, and the QA workbench is absent. Native held-key movement, toggled pouring, powder during pouring and finite flame use work there. Both layouts were visually inspected. The donor and source checkout cannot supply missing runtime files to that server.

Reproducible entry points are `npm run check`, `npm run build`, `node tools/check-release.mjs`, the source-only `/workbenches/integration/` and `/workbenches/art/exposition.html`, and `node tools/check-site.mjs BASE_URL`. Local evidence is under ignored `artifacts/qa/exposition-*`: desktop/phone combined acceptance, kit checks, real-frame performance, package/file receipts and captures. The artist's committed `review.json` fingerprints its exact historical candidate; root's small arrangement/comparison changes and final acceptance are recorded here separately.

Both root previews were registered with actual TTLs, then retired immediately after review. Final sources, launch arguments, dependency requirements, outputs and restart records were preserved before exact PID/creation-time validation and STOP signals. Source PID 70256 and package PID 8296 exited; port 4553 was released after each. Their receipts are `artifacts/helpers/exposition-{source,package}-01/cleanup-receipt.json`. The artist and coder also confirmed their own previews stopped. Temporary root tabs closed and the viewport override was reset. No disposable task helper remains running.

## Remaining art scope

The facade uses actual inherited concrete as a temporary pale finish; roof and cream trim use inherited cargo materials. These are not finished staff, period glazing or Spanish tile. The present rectangular openings and generic roof samples establish editable forms, not an exact Horticulture, Fisheries or Administration reconstruction. Custom skins, arches/ornament needed by a selected building, calibrated named-building dimensions, interiors, upper-storey fire, physical collapse and crowd AI remain separate assignments. The existing interface retains imported Farmyard control assets; its next layout pass must start from actual donor components and recipes.

## Publication

Pending promotion of this reviewed candidate and verification of the GitHub Pages deployment.
