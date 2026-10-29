# Explorable places: architect integration review

Status: **combined review in progress; not approved for publication**. The public release is still the earlier Exposition Study. This record supersedes no historical acceptance until the remaining gates below pass.

The release boundary is [Milestone 08](../milestones/08-explorable-places.md): title and Options, destination/animal selection, Catalogue Street and three separate landmark visits, real doors/stairs, nearby sections, and reliable return navigation. New York requires L1/L4; its attic remains closed. Administration requires pavilion L1/L3/L5/L7 and galleries L9/L19. Horticulture requires L1/L3 and both dry ground approaches. Goat, horse and the existing native AFT bear apply throughout. Fisheries, Hopkins v2 and later palette candidates are excluded.

## Exact intake

| Owner | Candidate | Architect intake |
| --- | --- | --- |
| UI | `2b506544c41beed60a0504d34113ca23c00abee9` | `474b7cd` |
| UI Options/map clarification | `d099011d5cbaa6892703485ae635ac056e4bf51a` | `77c1fce` |
| Access art | `26e1b1301ce577ab8ed26afa32fdafa93d7d44e4` | `91681ea` |
| Medicine ground art | `b35a2790fc640fe881ef535c013b947b43ffaeff` | `efad5cf` |
| Immutable medicine symbol source | `988b4aca32343c9f2e566db74bb018c705820742` | `3deb7de` |
| Runtime, navigation and packaging | Awaiting final committed TB-024 delivery | Pending |

Earlier exact street, row, ignition and landmark intakes are preserved on the review branch and in their manifests. Donor pins remain unchanged. Historical source drawings and uncertainty records govern the landmark exteriors; added playable door surrounds, openings, stairs, supports and cutaways are game adaptations rather than claims about original construction.

## Corrections found during independent review

- Opening a door could swing its leaf into the animal and trap it. The coder now checks occupancy at the proposed pose for opening and closing. The architect independently repeated the original trap: unsafe opening is disabled, the leaf stays closed, the body remains valid and movement away succeeds.
- Clipped wall/pane fragments need triangle-level collision after an AABB broad phase. Their whole bounding box cannot fill a visible doorway. The coder added narrow-phase collision and concrete fragment regressions; the combined intake still needs final verification.
- A retained title instance stopped accepting Play/Options after returning. Fresh instances and disposal now preserve repeated navigation. Error recovery also retains focus on its heading. The UI specialist independently rechecked repeated returns, recovery and retry against the revised runtime without changing UI files.
- Horticulture's dry approach treads begin at L0. An exterior ground fill at L1 would bury them. The coder is reconciling terrain heights, descent/return routes and exterior tread cutaway tags. New York landing/porch joins must use matching rendered support, never an invisible navigation floor.
- Accepted walk-over medicine was present in the six-button UI handoff but absent from simulation/world art. The architect restored the exact handoff and assigned automatic swept collection and matching ground props. Manual drug controls are not part of this release.
- Medicine art initially checked an evolving UI SVG against its earlier source hash. The artist preserved that original Git blob separately and pinned selected contours. The combined checker now passes beside the newer UI and with the UI source absent, while altered source/contours still fail.
- Four original New York `.gitattributes` files acquired CRLF on Windows. Exact original bytes were restored; narrow LF checkout rules preserve those hashes. No original geometry or checker was changed to conceal the mismatch.

## Completed checks and remaining gates

The architect's pre-runtime combined check passed 109 tests. The original access checker passes: 1,084 stair/landing samples, 25 portal records, native leaves/slabs, immutable source, section-filtered construction and resource disposal. The medicine checker passes geometry, snapshots, consumption/reset presentation, borrowed-resource ownership and immutable symbol provenance. CPU cutaway and ground-prop JPGs were visually reviewed; these do not establish live traversal or GPU acceptance.

Remaining: exact runtime intake; combined source/behavior checks; actual required routes for every animal; production build and nested-path package verification; live Chrome WebGL title/menu/gameplay/interior review at desktop and phone sizes; real section/resource/performance observations; actual visit JPGs; final promotion decision and deployment verification. A successful worker check is evidence for its scope, not architect approval of the combined release.

Local diagnostic logs are under ignored `artifacts/qa/explorable-places/`. Disposable preview helpers must stop and release their ports after review. Hosting is already configured as workflow Pages with `PAGES_ENABLED=true`; no hosting repair or new visibility change is required.
