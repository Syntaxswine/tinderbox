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
| Public-domain reference set | Original historic color Navy record independently verified | Artist source dossier, additional useful ground/structure and jet views, inspected motion selections |
| Current game control | Exact published source and atlas inspected | Matching actual WebGL captures for all review cases |
| Useful higher-detail baseline | Assigned to artist | Exact commit, animated renders, independent critique, accepted and frozen quality/cost baseline |
| Runtime and benchmark | Driver contract preparation assigned to coder | Direct-chat approval required by that worker's automatic reviewer, implementation, actual driver/adapter tests |
| Comparison interface | UI specialist building separate review shell | Exact shared driver schema, browser behavior and render/HUD review |
| GPU access | In-app game backend previously reported disabled | Independent native-browser result and a supported capture/profiling route |
| Optimized result | Not accepted | Same-view motion review and valid 20–33% incremental GPU cost result against the frozen baseline |
| Production promotion | Not performed | All relevant milestone gates, exact integration/review evidence and deployment verification |

The coder's automatic approval review rejected branch creation twice despite the owning human's explicit all-worker instruction. The architect requested the specific direct-in-coder-chat approval and continued independent references, artist work and UI work. Do not silently retry the denied mutation or infer that the missing approval has arrived.

No measured GPU ratio, AAA-quality claim or production change follows from this preliminary record. New findings replace the corresponding pending ledger entries as exact deliveries and actual render evidence arrive.
