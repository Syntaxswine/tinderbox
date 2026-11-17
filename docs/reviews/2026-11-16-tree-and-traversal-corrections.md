# Hopkins 15 traversal and native edge sliding

Status: **published and verified** through architect commit `9a765f2f24171ba4cab82432bfb5778544fe4572`. Pages, complete public package/resource verification and all three selected public input checks pass. All nine local actual-input cases and five archived actual-game JPG reviews pass. No helper is retained.

## What changes

Hopkins 15 is the house with a porch directly north of the Catalogue Street starting position. The published-package reproduction caught the bear on a porch post and the goat on interior skirting after a walked 20 mm sideways offset. Held input remained present. The [baseline capture](2026-11-16-house-traversal-baseline.md) preserves both failures.

The accepted [M28 contract](../milestones/28-tree-and-traversal-corrections.md) combines a real supported circulation adjustment, Nautilus edge sliding and correct native collision placement. It keeps native animals, 9 m/s movement, powder/world clocks, physical headroom, the 0.22 m step rule, finite fuel, fire/shroud/lighting rules and M27 cache ownership. It is a detailed-Catalogue correction; it does not imply new acceptance of every legacy, cottage or landmark controller.

The artist's structural source `4cecd10d09eff85543996d4362c63b2297001436` composes two native front leaves with 1.88 m between open faces, a 2.00 m portal and a supported 2.32 m approach. The retained porch beam has 1.87 m headroom. The stair has 1.50 m actual tread bearing, two six-rise flights, a supported quarter-turn and unchanged 2.12 m floor pitch. Render, collision, support, sight and fuel agree. The structure fuel sum changes from 586.8832628 to 565.9190473 and upper-floor area from 67 to 62.6397 m². These are deliberate gameplay adaptations, not historical measurements. See the [source handoff](../art/h15-circulation/README.md).

Paired-action compiler `c64e42f0be08e82992601c882c6d70e038cb18a6` consumes both leaves once, preserves one contextual target and rejects unknown, repeated or cross-instance groups. Occupancy keeps the whole pair safe.

## The floating steps

The owner correctly flagged the gap in the first entry JPG; the architect missed it during initial visual review. All twelve stone solids begin at Y=0. The preview ground was at Y=-0.125, producing the visible 12.5 cm gap. Preview-only `3471160b3386f8cb53a705b66bad23ab09948b68` corrects that datum at the same camera/light/exposure. The physical exports, steps and actors were not shifted and no footing was added.

The architect inspected the corrected [entry](../art/h15-circulation/previews/entry.jpg), [exterior](../art/h15-circulation/previews/exterior.jpg) and [stair assembly](../art/h15-circulation/previews/stairs.jpg). Rejected images from `98c8ae1e` remain preserved. These static source previews predate the later interior settee shift; their omissions and actor/door poses are labelled. They are separate from actual gameplay evidence.

## Nautilus movement and native solids

The initial material interpretation of “greasy walls/trees” was wrong. At the owner's explicit direction, the architect contacted **Architect, Nautilus Engine**, who identified slippery edge movement. The read-only material audit imported no shader, tree or car asset.

Nautilus [PR 60](https://github.com/Syntaxswine/nautilus-engine/pull/60) supplies exact pure-kernel pin `999d97a1c2032f2448a8f71e6eec8c9c025cd577`, integrated upstream through `09efd6580023ab4bca263fb9d7538858b0eaac1e`. Its inherited Farmyard Fighters reference is `7cd3d56e62a8087133a9fdf2f521cf92d310d6fd`. The architect independently compared all five installed source/notice files byte-for-byte with donor Git objects. The primary Farmyard baseline stays unchanged; dependency closure is empty. Original notices and the explicit unresolved rights status remain in the [import record](../../vendor/nautilus-engine/999d97a1c2032f2448a8f71e6eec8c9c025cd577/provenance/disc-slide.json).

The pure continuous contact kernel keeps 72% of a glancing tangent, bounds a request to four contacts and invents no head-on shoulder or push-out. Tinderbox's adapter queries the full reachable envelope, clips individual native triangles and validates every accepted segment against live solids, furniture, support, headroom and steps. Actual polyline distance/height feeds movement and pouring. Detailed Catalogue selects the profile explicitly; original stop controls remain. The flat/AABB reference controller was not imported wholesale. An endpoint-only furniture guard found during architect review was replaced by a real segment sweep before acceptance.

Final review of `e7e2bad3` then found a second real defect: 30 attachments had world-space index bounds but source-local explicit collision triangles. The concrete upper-front rail was queried around world X=16–16.5/Z=9.505–9.56 while its swept mesh stayed near source X=6.27–8.51/Z=3.44–3.50. Runtime correction `8e50a4c0e39a48241001a02f7a29c4193fdd343d` applies the rigid placement to explicit triangles, clips actual native solids into matching fragments and includes them in query bounds. It preserves apertures and avoids whole-mesh collision ghosts after local retirement. Five meaningful placement tests reproduce four failures before the fix and pass afterward; eight existing composition checks also pass.

## Kitchen source reconciliation

Correct collision placement exposed an authored kitchen target inside a retained stair post. A proposed bend then intersected the native settee. Neither failure was waived. Artist successor `6d145569c7b4ef5514698dcc713256de9ff7eb2b` moves the complete eight-part settee 0.35 m along local −X, to `[2.5,0.48,0.6]`, and changes only the kitchen route plus explicit source/version/support metadata.

The [successor handoff](../art/h15-kitchen-route/README.md) records all nine bearing foot contacts, no overlap, the exact nine-point route and a **1.395 m movable-furniture passage**. This is an explicit furnishing adaptation; structural entry/stair dimensions remain unchanged. Worst tested bear margins are 25–50 mm. The architect independently compared immutable Git objects: every structural surface, main stair route, material, other item/part and other render mesh is unchanged. All 288 settee render vertices translate rigidly with unchanged Y/Z, normals, UVs and paint. The shop remains byte-identical. Original `4ce` exports, rejected proposals, source producer, checker and reference remain preserved.

The [integrated source validator](../../tools/review/check-h15-integrated.mjs) checks the exact approved successor/export hashes and declared runtime exceptions while running the original geometric/stop-mode/registration assertions. It does not overwrite the historical art checker, reference or passing receipt. Sliding, world placement and actual input have their own evidence.

## Candidate validation

The [corrected gate report](../engineering/house-traversal/corrected-gate.md) and [machine record](../engineering/house-traversal/corrected-gate.json) identify exact source inputs, hashes, prior failures and cleanup.

| Check | Accepted result |
| --- | --- |
| Repository | 511/511 tests; 339 syntax scripts; 366 static modules; provenance/shared Three pass |
| Placement and composition | 13/13 focused tests; all four native rotations, vertical translation, independent H15 native sweep, broad-phase bounds, partial retirement and real aperture |
| Integrated original source | 15 checks, 60 routes, 819 render registrations; zero retained resources |
| Exact exported kitchen in world | 30 cases, 240 straight segments; three native bodies, five offsets, both directions; actual centre, eight parts, 288 render vertices and nine floor contacts agree |
| Affected provider matrix | 67/67; 61 route cases, paired occupancy/12 exclusive leaf poses and three support-retirement negatives; all providers disposed |
| Build/release/nested loader | 3,554 files, 183,508,404 bytes; all hashes, relative resources/MIME and three actual JSON responses pass; one paired action and two flights |
| Final real keyboard/mouse matrix | 9/9 pass; 366 arrivals, nine actual closed/occupied-door negatives, zero page/console/HTTP errors |
| Architect actual-game JPG review | Five fresh normal-zoom captures accepted, including the kitchen passage and upper landing |
| Pages and public package verification | Run `43990743600` succeeds; complete canonical manifest and 18 actual HTTP/hash/MIME resources match |
| Fresh public input spot check | 3/3 pass; 90 arrivals, two occupied-door negatives, kitchen out/back and barrel glance; six other cases explicitly excluded |

The frozen local raw manifest is `be39c5910422c731fbe35fa3acfbc4a2c8e36683818dd8796dc61aad991de77d`. Common canonical identity is `9ef4ce5a7fa9efa4eb33f8381a91929d2348edac72da43bf9170002b0de25178`: ordinal-sort files by path and all object keys, preserve other metadata/array order, then hash compact UTF-8 JSON. Fifteen runtime files change or are added relative to M27; none are removed. A prior files-only sorted digest is a different serialization of the identical raw manifest, explicitly distinguished in the gate report.

Earlier `e7/C5` input passes and pre-sliding package checks remain historical. The final matrix must use the new package and normal title/animal/spawn flow. It covers both captured regressions, actual street-barrel glancing, all three animals by keyboard/mouse and the bear's real kitchen out-and-back. It advances the actual application at fixed 1/60 s with trusted DOM controls and read-only snapshots; it does not measure FPS or establish iPhone Safari acceptance. Bell & Alder's entire species/input matrix is not repeated here.

## Preserved failures and helper lifecycle

Prior false probes targeted legal descending stairs or a wall target within ordinary arrival tolerance. Their failures are preserved; normal arrival/stall limits and native bodies were not relaxed. Optional canonical browser negatives require a real blocked interval; unavailable probes are marked unrun, while mandatory isolated physical support/occupancy controls remain passing. An extra source-local item-footprint assertion and a whole-map zero-unresolved-support assumption were rejected as audit-frame/scope mistakes; actual settee collision and contact checks remain intact.

The first nested HTTP attempt closed its server but its cleanup assertion masked the original inner error. No specific permission cause or package defect is inferred. Only that finite HTTP stage was repeated, against identical package bytes, with error capture and explicit loopback access. It passed. All seven gate process lifetimes ended, and ports 60639/59309 were released and independently checked by the architect. Earlier preview and input helpers also have preserved closure receipts. No prior service is retained.

The sole final local input helper ran from 2026-11-17 00:31:34.986 to 00:36:50.391 UTC (November 16, 7:31–7:36 p.m. Eastern), 315,405 ms, before its unchanged 00:51:34.986 absolute expiry. Its one context closed, maximum live contexts was one, and no process or service remains. The architect independently found driver 38220/browser 23580 absent and ports 49509/49510 released at 00:40:38.949 UTC. Exact creation identities, restart sources and retirement receipts remain with the machine evidence; no replacement or deadline extension was used.

## Actual-input and visual acceptance

The complete nine-case matrix passes on exact candidate `605ce43e`, source `6d145569` and raw package `be39c591`. Both captured regressions pass through real mouse input, including the walked 20 mm exit offset. The actual street-barrel glance passes. Goat, horse and bear each complete keyboard and mouse entrance, both-flight ascent/stop/reverse/descent and exit. The bear's mouse visit also walks the nine-point kitchen path both ways, returns to its normal inside stance and leaves through the contextual door.

The 12 optional canonical wall/unsupported browser probes are explicitly **unrun**: corrected visible geometry provides no exclusive approach for the existing planner. This is not reported as negative coverage. Nine actual door/occupancy checks and the mandatory 67-case physical safety controls remain passing. There are no unexpected stalls or runtime/console/network errors.

The architect inspected the actual [bear entry](media/2026-11-16-house-traversal-corrected/bear-entry.jpg), [goat offset exit](media/2026-11-16-house-traversal-corrected/goat-offset-exit.jpg), [kitchen passage](media/2026-11-16-house-traversal-corrected/bear-kitchen-passage.jpg), [upper landing](media/2026-11-16-house-traversal-corrected/bear-upper.jpg) and [barrel slide](media/2026-11-16-house-traversal-corrected/barrel-slide.jpg). Source-backed steps, native bodies and the settee placement agree with the accepted paths. The existing upper-level cutaway presentation remains; this task does not redesign that renderer.

The primary checkout's three source exports were byte-identical to HEAD but stale index state blocked the intake. The architect compared raw Git-object hashes and refreshed only those three index entries, producing no staged content change, then fast-forwarded the candidate while preserving review documents. No user geometry or unrelated work was discarded.

## Publication receipt

The architect fast-forwarded the accepted history to `master` and pushed release `9a765f2f24171ba4cab82432bfb5778544fe4572`. [Pages run 43990743600](https://github.com/Syntaxswine/tinderbox/actions/runs/43990743600) completes both build and deploy successfully. No force push or approval exception is used. The live destination is [Catalogue Street](https://syntaxswine.github.io/tinderbox/?catalogue=modules).

At 2026-11-17 00:53:20.697 UTC, independent architect HTTP verification matches the complete 3,554-entry manifest, preserving every metadata field and the other array orders. The public raw manifest is `9d88f92977fe9d146a1ea0d92822eafde1473886c925c0f936346e93b0f38b92`; its canonical identity is exactly the reviewed `9ef4ce5a7fa9efa4eb33f8381a91929d2348edac72da43bf9170002b0de25178`. Different raw serialization is not treated as different file content. All 15 changed runtime resources plus the actual index, main entry and module loader return matching bytes/SHA-256 and appropriate MIME: **18/18**. The receipt and complete live manifest remain in `artifacts/qa/m28-architect-intake/public-43990743600/`.

The separately granted public followup passes **3/3** at the exact deployed HTTPS base: the goat's walked 20 mm offset exit, bear mouse stairs/kitchen roundtrip and street-barrel mouse glance. It records 90 waypoint arrivals, two actual occupied-door rejections, the nine kitchen points in and out plus normal inside return, and no page/console/HTTP errors or unexpected stalls. Six other public cases are explicitly excluded; two optional canonical wall/unsupported probes are unrun. The complete nine-case matrix and mandatory physical negatives remain the separate acceptance evidence. Existing arrival/stall/90-second limits are unchanged.

This one public helper ran from 01:07:11.346 to 01:09:20.026 UTC on November 17 (November 16, 8:07–8:09 p.m. Eastern), 128,680 ms, before its unchanged 01:27:11.346 expiry. It created/closed one context, maximum one live, none remaining. Two source-planning H15 providers and one barrel fixture disposed before launch. There was no local HTTP server. The architect inspected the actual public kitchen JPG and independently confirmed driver 40860/browser 34744 absent and port 64608 released at 01:13:41.899 UTC. No service remains. Exact source, selected/excluded matrix, trusted input, snapshots, JPGs and cleanup receipts remain under `artifacts/qa/house-traversal-gameplay/be39c591-public-43990743600/`.

This final receipt changes Markdown only. It leaves the reviewed/deployed package unchanged and uses the workflow's documented Markdown exclusion; no additional build or deployment is required.
