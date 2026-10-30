# Fire realism: architect review in progress

The [milestone-11 goal](../milestones/11-realistic-fire.md) is active. This record begins with independent reference reading and the published control. No new effect, higher-detail quality baseline, optimized result or rendering-cost claim is accepted yet. The published gameplay release remains `dc7f537a83a7e832a0dfa0757d0b2700b909c053`; the initial goal contract is `8d7fb452b2a9994f44ca5bbbe9a81822809568bb` on `codex/fire-realism`.

## Independent reference check

The architect opened [National Archives item 6349328](https://catalog.archives.gov/id/6349328) in the in-app browser and inspected the actual color photograph. The record identifies local item `330-CFD-DN-SC-82-03009.jpeg`, agency identifier `DNSC8203009`, a Navy boat demonstration catalogued as January 1, 1969, and an unknown camera operator. Both **Access** and **Use** are **Unrestricted**. The catalog day is not independently established as the photographic exposure date. The later DVIC creator/series dates do not change the depicted event to the 1980s or 1990s.

The primary record's [original JPEG](https://catalog.archives.gov/medialz/stillpix/330-cfd/DN-SC-82-03009.jpeg) was downloaded independently, at 3000 by 2257 pixels. Its SHA-256 is `8b49c1b531cb1fa076cfb8e23900e4366e6776701df60740f2b3561c0e747cd1`. The local QA copy, saved DOM, and rights-statement JPG are under `artifacts/qa/fire-realism/references/`. The artist owns the portable source intake and its final source identifiers; this QA cache is not a runtime dependency.

**Visible evidence:** a narrow, nearly continuous luminous stream extends beyond the left edge of the photograph; broader orange/yellow turbulence and a localized dark smoke mass appear near the boat's nozzle. Background and water remain visible around the stream. A broad uniformly opaque cone would not reproduce this view. This is a boat-mounted open-air discharge, not a measurement of the game's portable weapon. The terminal breakup is outside the photograph; the still cannot establish its motion, complete range or a temporal ignition delay. The scan and exposure also prevent treating sampled RGB values as measured flame temperatures.

The [Fort Benning training video](https://www.dvidshub.net/video/723217/fort-benning-fire-department-conducts-training-burning-building), VIRIN `191116-A-KC746-025`, was checked against its original item record. It credits Sgt. Charles Gilbert / Fort Benning Public Affairs Office, dates the event November 16, 2019, and labels the item public domain with the linked DVIDS use notice. The sampled shots inspected so far show personnel and the structure; they have **not** established a useful flame-motion reference. Its title alone does not qualify it for the final visual comparison set. Individual still and motion selections still need actual pixel/frame inspection and any item-specific notices recorded by the artist.

## Published control: source observations

The architect inspected the pinned flame and smoke PNGs and the current adapters. These are observations about the assets/code, not acceptance of an unrendered game view.

- The flame atlas contains four painted, similarly dense flame silhouettes with repeated curved lobes and brush contours. The smoke atlas bakes similarly sized rounded rolls into four stacked silhouettes.
- Ground fire places two camera-facing flame cards per burning cell and one smoke card. Atlas blending and sine displacement add motion, but cannot themselves establish parallax through the painted density or independently moving lobes.
- Carried torch fire uses one native-anchor card and a four-frame world-clock sequence. Discharge uses the authoritative wall-clipped fan/ray boundary. A replacement must retain those attachment and obstruction rules while changing appearance.
- The existing field mask, finite smoke/event history, reset handling, and bounded resource ownership are useful safeguards to retain. More detailed fire must not invent burning fuel or replay old effects.

The first detailed candidate must demonstrate connected fuel contact, changing depth and silhouette from more than one view, rising breakup, varied smoke density, and a readable player/HUD. Extra triangles behind the same repeated opaque painting are not sufficient evidence of improved realism.

## Intake and acceptance ledger

| Item | Current finding | Evidence still required |
| --- | --- | --- |
| Public-domain reference set | Four acquired photo files and source dossier checked against artist `3f7b8f3`; historic Navy record and named official DVIDS records independently checked | A useful inspected flame-motion selection; any further exterior-structure source needs its own rights/pixel check |
| Current game control | Exact published source and atlas inspected | Matching actual WebGL captures for all review cases |
| Useful higher-detail baseline | Artist `3f7b8f3` copied to architect intake `93b59fa`; hostile round 1 rejects it at 1/10 product evidence, visual score unavailable | Six corrections below, exact new commit, actual animation, accepted and frozen quality/cost baseline |
| Runtime and benchmark | Direct runtime helper implementing accepted contract in existing root-attached code checkout; original coder remains read-only | Exact implementation commit, independent driver/adapter checks and actual hardware trials |
| Comparison interface | UI specialist has an uncommitted development shell; source inspected without intake | Exact committed delivery, live driver binding, cancellation behavior and render/HUD review |
| GPU access | Both Tinderbox and Farmyard reported disabled WebGL in-app; native Chrome attempt stopped by URL-identification guard | User-opened known Chrome game page and a supported capture/profiling route; no guard bypass |
| Optimized result | Not accepted | Same-view motion review and valid 20–33% incremental GPU cost result against the frozen baseline |
| Production promotion | Not performed | All relevant milestone gates, exact integration/review evidence and deployment verification |

The original coder chat's automatic approval review rejected branch creation twice despite the owning human's explicit all-worker instruction. That denied operation was not retried. The architect instead delegated a scoped runtime helper with the original human request inherited; normal branch creation succeeded in a different clean, existing root-attached checkout. This permits implementation to continue while the original chat stays read-only. A separate managed art-correction worktree isolates factory fixes from the original artist's stalled research/download action. See the current [ownership registry](../workflow.md).

## Hostile review, round 1 — October 30

The independent reviewer examined artist `3f7b8f34de99f3483b0e13a991aef7abd0455da2`, contract `699b09e0686aed1e7de434aeea160c7872806a82` and published control `dc7f537a83a7e832a0dfa0757d0b2700b909c053`. Decision: **reject, 1/10 product-evidence score; visual-only baseline unavailable**. Category scores were 0/2 realism, 0/2 motion/depth, 0/2 gameplay/contact/occlusion, 0/2 measured equivalent-quality performance and 1/2 robustness/provenance/readability. No actual rendered candidate frame or animation was available; zero visual credit is missing evidence rather than a judgment of unseen appearance. Actual motion, the measured GPU target and complete core-tool/building presentation are independent hard gates.

Verified findings and assigned corrections:

1. Valid discharges disappear: a real published resolver case with 80 small blockers produced 25 independent rays, rendered by the control with 500 ribbon triangles and by the candidate with zero jet instances. A short connected fan with an outside native muzzle also disappeared (control 174 total triangles, candidate zero). Art must retain legitimate clipped-ray/nozzle handling without widening gameplay reach; runtime supplies the unchanged native anchors.
2. Shader integration has no opaque-depth termination. Ordinary shell-entry depth testing does not prevent density sampled behind an intersecting wall/animal from contributing. Runtime supplies a current, opacity-respecting depth texture; art terminates samples using it. The visible severity still needs actual renders.
3. Fixed smoke-after-flame ordering and unsorted instances cannot establish correct transparency. Art must test reversed cameras and shuffled equivalent source order, including lights and smoke clustering, without deleting smoke. Any remaining volume-overlap approximation must be explicit and judged in motion.
4. An isolated liquid-fuel jet produces 27 flame instances and zero soot/smoke columns. Add bounded, world-clock smoke constrained by legitimate source/obstruction data and distinguish the two jet-photo references.
5. The candidate only counts building records and suppresses explosion events. Runtime supplies legitimate coarse building groups and event receipts; art consumes building presentation. Existing barrel/Molotov transients remain an explicitly separate, measured component until replaced.
6. Art preview uses ACES filmic output while production uses the renderer's default tone mapping. Match and record output color space, exposure and transform before visual comparison. Resulting color differences have not yet been rendered.

The architect independently ran the actual-Three artist contract check and the complete project check on intake `93b59fadec1fbfd36dec559fcb896f67f7d81221`: **186 tests passed**, with 149 script, 187 static-module and source/provenance/dependency checks. Twelve additional immutable-byte checks matched runtime manifest files, all four photographs, four unchanged control files and the separately acquired NARA original. These passes do not negate the hostile compatibility failures or prove shader compilation. The frozen published control remains unchanged.

Detailed local reports and reproducible Git-object probes are retained under `artifacts/qa/fire-realism/hostile-review/` (`round-01.md`, `round-01.json`, `compatibility-probes.mjs` and the artist-SHA-labelled results). They are ignored QA artifacts; this committed record preserves the decision and assigned corrections. Next review must identify the exact corrected candidate and preserve the first round's failures rather than replacing its evidence.

The native Chrome Computer Use attempt ended because its policy guard could not identify the current Windows browser URL confidently. No alternative input/CDP/headless route was used to bypass that guard, no candidate GPU render was claimed, and no application-managed Chrome process was stopped. A pending request asks the user to open the known published Catalogue Street page in Chrome so supported URL inspection can be attempted safely.

No measured GPU ratio, AAA-quality claim or production change follows from this preliminary record. New findings replace the corresponding pending ledger entries as exact deliveries and actual render evidence arrive.
