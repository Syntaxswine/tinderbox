# Remaining landmark source intake — Administration / Horticulture

Read-only inventory at `2b350309d9116812a1d3988af090614bdaefbc25`, compared with that revision's [New York compact-source interface](https://github.com/Syntaxswine/tinderbox/blob/2b350309d9116812a1d3988af090614bdaefbc25/src/content/map-source-data.js). This supports a later artist binding proposal; it creates no bindings, material/fuel assignments, geometry repairs or runtime. All paths and counts below refer to that revision. The UI branch retains `47f87fb0`; no runtime intake was needed.

## Pins and source paths

| Package | Frozen source commit | Original entry / records |
| --- | --- | --- |
| Administration | `43337a33ddfe4dff6849654c827c56e1f24e1acc` | `assets/art/exposition-administration/index.js`; sibling `metadata.json`, `manifest.json`, `plan.js`, `floors.js`, `stairs.js` |
| Horticulture | `c4287338ff93907900a94a86b6c7e3bed0ae7c2f` | `assets/art/exposition-horticulture/index.js`; sibling `metadata.json`, `manifest.json`, `plan.js`, `floors.js`, `terrace.js` |
| Waterfront parent | `c6ddd51d7dd47a2ec148159e6a6d64a8d00bd2a9` | `assets/art/horticulture-waterfront/index.js`, `kit.json`, `manifest.json` |
| Additive access | `26e1b1301ce577ab8ed26afa32fdafa93d7d44e4` | `assets/art/exploration-access/index.js`, `plans.js`, `fragments.js`; summary `art/source/exploration-access/plan-summary.json` |

`assets/art/places-intake.json` records per-file hashes/dependencies. Both original building packages share unchanged `assets/art/exposition-new-york/forms.js` and Nautilus wall runs at `90054d07134116a5d9661f8318a76fe68f922aad`. Original evidence IDs are ADMIN-HUNT/FLINN/ARNOLD-1893 and HORT-CONKEY/ARNOLD/WALKER-1893; their dossiers remain under `art/source/exposition-administration/sources.json` and `art/source/exposition-horticulture/sources.json`.

Compiled records are `assets/art/place-scenes/administration/index.json`, `navigation.json` and `sections/`, and the corresponding `assets/art/place-scenes/horticulture/` paths. Geometry arrays remain deduplicated in each `geometry/` directory.

## Existing output sizes

Raw-factory diagnostics describe the original building. Compiler input counts include the composed source/access package; Horticulture also includes its terrace. Emitted logical records and batched render records are different identities, never fuel counts.

| Existing record | Administration | Horticulture |
| --- | ---: | ---: |
| Raw building source parts / triangles | 37,867 / 614,274 | 48,484 / 971,732 |
| Compiler input parts / triangles | 42,546 / 678,191 | 63,903 / 1,157,534 |
| Emitted logical parts / triangles | 41,522 / 655,739 | 63,788 / 1,154,962 |
| Render records / sections | 39,801 / 653 | 61,954 / 445 |
| Geometry / appearance records | 943 / 13 | 629 / 17 |
| Batched floor rows / merged-away records | 115 / 1,721 | 38 / 1,834 |
| Navigation surfaces / blockers / unique collision shapes | 1,305 / 20,856 / 580 | 117 / 23,427 / 470 |

Read all existing section descriptors, without geometry arrays: 17,758,264 and 26,014,816 bytes respectively. Unique render IDs, summed section part counts and summed section triangle counts agree with the manifests. Section placement is spatial/height-based (`sectionSize:16`), not a physical ownership boundary.

## Actual family and identity metadata

| Family | Administration render roles / examples | Horticulture render roles / examples |
| --- | --- | --- |
| Walls / closures | `structural-wall` 5,850, `perimeter-closure` 5,786; `body-0-tier-0:0:0/wall-1`, `.../seam-1` | Same labels: 5,968 / 5,230; `outer-0-piece-0-tier-0:0:0/wall-1`, `court-*` |
| Floors | `floor` 19,483; `ground-floor/cell-*`, `pavilion-floor-*`, `admin-*/landing-*` | `floor` 38,527; `first-floor/*`, `pavilion-galleries/*`, `rotunda-gallery/*`, `terrace/<tileIndex>/*` |
| Access / stairs | 756 treads, 1,488 stair rails, 100 guard rails, 8 access supports; `steps-*/tread-*`, `admin-front-west/*`, `admin-upper-west/*` | 108 treads, 58 stair rails; `west-gallery/step-*`, `east-gallery/step-*`, `rotunda-gallery/step-*`, `hort-dry-approach-*/*` |
| Portals | `portal-frame` 45; leaf / extension / hardware 8 each; `admin-west/native-leaf--1` | Frames 15; leaf / extension / hardware 10 each; `hort-main/native-leaf--1` |
| Dome / detail | `great-dome/shell` (one custom shell), 24 custom ornaments, 94 source ornaments/replacements | 166 dome-frame, 361 window-glass, 1 dome-glass, 16 roof-glass, 1 lantern-glass, 2 lantern-frame, 2 cupola-roof, 2 cupola-vent; `great-crystal-dome/*`, `great-dome/lantern-*`, `curved-gallery-connector-*/*` |
| Waterfront / garden | No water field in the Administration scene manifest | Retaining-backbone 346, custom-facing 2,074, rusticated-pier-facing 332, coping 334, rail-bar 1,008; `terrace/*`. Plant 390, planting-bed 18, decorative-water 2; `palm-*/*`, `court-basin-*/water`. Ornament 432, source-ornament 30 |
| Unclassified role | `role:null` on 6,142 records, including sash jambs | `role:null` on 6,501 records, including terrace toes |

These are render labels, not accepted physical materials or carrier roles. Metadata/manifest `physicalMaterial.structure` and `finish` are explicitly **unassigned on both buildings**. At this pin, the binding and compact-runtime directories contain New York tables only. Palette hashes, apparent glass, gilding, the native `wood` authoring token and plant labels cannot supply missing combustion/support decisions.

Merged rows retain `sourceRanges:[{id,start,count}]`. Examples: Administration `sections/1_3_18.json` contains `admin-upper-west/landing-19/cell-0/section-batch` with source `admin-upper-west/landing-19/cell-0`, range 0/36; Horticulture `sections/10_2_2.json` contains `rotunda-gallery/cell--15-8-0/section-batch`, source `rotunda-gallery/cell--15-8-0`, range 0/24. Expand logical ownership by the recorded ranges; do not retire an unrelated merged batch.

## Native access, floors and water

- **Administration:** world bounds 124 × 124 m; source offset `[62,0,22]`. Occupied native levels 1/3/5/7/9/19 are at 2.12/6.36/10.60/14.84/19.08/40.28 m. Floor IDs are `ground-floor`, `pavilion-floor-{3,5,7}`, `pavilion-roof-and-gallery`, `upper-colonnade-terrace`. `dome-spring-ring` L23 and crown L36 are not occupied destinations. Four stateful closed portals are `admin-{front,east,rear,west}`; `admin-office-partition-0..10` are nonstateful open passages. Ten stair records comprise four original approaches, four added L1→L9 spiral wells, and two added L9→L19 gallery stairs. Access declares 20 exact floor openings, 20 landings, 23 cut volumes, and 1,249 source suppressions (210 fragment substitutions / 1,039 hides); the compiler reports 484 cut floor parts.
- **Horticulture:** world bounds 352 × 144 m; source offset `[176,0,39]`. Occupied L1/L3 are at 2.12/6.36 m: `first-floor`, `pavilion-galleries`, `rotunda-gallery`; waterfront terrace/aprons remain L1. L5 spring deck/entry/foyer roofs and L16 crown are not declared occupied destinations. Closed stateful portals are `hort-main` and `hort-court-{−1,1}-{front,rear}` (literal negative IDs use ASCII `--1`). Three original gallery stairs and two added dry approaches are recorded. Two retained gallery holes exist despite `cutFloorParts:0`; eight cut volumes and 115 suppressions (61 substitutions / 54 hides) remain explicit. End-gallery underside-cap removal is a declared derivative adaptation. The central waterfront stair faces water and is not a dry-ground access route.
- Both retain metre-native walls 1 × 2 × .16, slabs .12, pitch 2.12, leaves 1 × 1.65 × .12 m. Stateful paired-door openings declare 1.88 m clearance and 2.8 m clear height using separate top panels; open/closed matrices are recorded for 24 Administration and 30 Horticulture moving render records. Access plans remain **source-local**, while navigation positions, part matrices and section bounds already include their offsets. `navigation.sourceBounds` remains source-local too: do not apply the offset twice.
- Horticulture's manifest water rectangle is `{x:176,y:10.5,width:352,depth:21,height:0}` (plan `y` means world Z), spanning Z 0–21. Dry-ground polygons exclude it. The two `court-basin-*/water` render parts are separate decorative-water records; neither role label establishes a new water/fuel rule.

## Reuse and later-rollout constraints

1. Reuse `src/content/map-source-data.js` tuple packing, exact attributes/matrices/ranges, one-time ID qualification, explicit cosmetic follow ownership, and lazy `map-source-geometry.js` queries/resident expansion. Its non-box sources retain exact facets; AABBs are search bounds. New bindings still need physical roles, core/finish quantities, real support/attachment parents, closure and local retirement evidence.
2. Raw render roles are not the carrier taxonomy consumed by `map-source-support-data.js`. Native geometry includes rotated octagonal/curved/dome pieces, thin glazing and cuts. Navigation marks 243/199 unique collision shapes `closed:false`; those are metadata counts, not a new closure/volume verdict. Do not transfer New York's 29 repair IDs, ten-pair first-control support overrides, lacquer account, numerical allowances or anchors to either place.
3. `tools/compile-map-sources.mjs` currently pins New York's binding/overlay/control paths and hashes. The encoder is reusable after new accepted inputs; the command and `src/runtime/shared-map.js` New York entry are not an Administration/Horticulture intake. Larger binding tables need bounded shards or compact authoring rules; do not fetch full authoring evidence at startup.
4. **Overview portability:** `src/art/shared-map.js` requests `overview:'sections'`; `src/runtime/sections.js` fails when wanted sections exceed `maxSections:192`. New York's 148 fit; 653/445 do not. Reuse the existing lightweight path in `src/runtime/landmark.js`: `shapeMesh` / `makePlan` draw the chosen occupied level from navigation polygons/holes, while the streamer's default `overview:'plan'` requests no full-map sections. Keep nearby render residency bounded and canonical heat/fuel/retirement persistent independently of overview display. This identifies a later integration requirement; it does not raise the cap or change the NY checkpoint.

## Review scope and fingerprints

Only existing manifests, navigation, source metadata and section descriptors were read via Git objects. No factory/mesh regeneration, geometry transforms, route matrix, material assignment, repair, runtime change, build, browser or server ran. All finite read commands completed; no helper was retained. Source/path review passes for 40 path references, four byte-identical original entry pins and four manifest/navigation fingerprints, plus the stated manifest counts, unassigned material fields and overview guard/plan path; no runtime acceptance is claimed.

SHA-256 at the audited revision:

| File | SHA-256 |
| --- | --- |
| Administration `index.json` | `4de71aac210f28b1becbf3bafd4d9bbcd9ad6ed36a8fb978c685ee3ee5802497` |
| Administration `navigation.json` | `06ac8d1a329550345855cb0894e8de49e2cc78e6c476b656a345943b6bb9fb54` |
| Horticulture `index.json` | `45d31d5e3580e25664135063474bbe14e82d7e86b9c9fe513157a58f783d37c7` |
| Horticulture `navigation.json` | `46b35ad5aed3dbb699fed9d96c256d3fac79ce04e678fbce672b4e46eb7ba3c6` |
