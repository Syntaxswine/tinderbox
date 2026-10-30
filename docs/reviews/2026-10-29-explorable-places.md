# Explorable places: architect integration review

Status: **user-authorized preview publication; full acceptance remains pending**. After the interrupted live review, the user explicitly instructed: "lets publish as is now and then you can do a correction later". That instruction authorizes publishing the existing `d889ddb1d03af26c4af8be9a62c32baf8916e086` checkpoint with the deferred checks recorded here. It is a release-specific exception to the usual promotion gate, not a claim that unfinished checks passed. No later worker changes enter this preview automatically.

The release boundary is [Milestone 08](../milestones/08-explorable-places.md): title and Options, destination/animal selection, Catalogue Street and three separate landmark visits, real doors/stairs, nearby sections, and reliable return navigation. New York requires L1/L4; its attic remains closed. Administration requires pavilion L1/L3/L5/L7 and galleries L9/L19. Horticulture requires L1/L3 and both dry ground approaches. Goat, horse and the existing native AFT bear apply throughout. Fisheries, Hopkins v2 and later palette candidates are excluded.

## Exact intake

| Owner | Candidate | Architect intake |
| --- | --- | --- |
| UI | `2b506544c41beed60a0504d34113ca23c00abee9` | `474b7cd` |
| UI Options/map clarification | `d099011d5cbaa6892703485ae635ac056e4bf51a` | `77c1fce` |
| Access art | `26e1b1301ce577ab8ed26afa32fdafa93d7d44e4` | `91681ea` |
| Medicine ground art | `b35a2790fc640fe881ef535c013b947b43ffaeff` | `efad5cf` |
| Immutable medicine symbol source | `988b4aca32343c9f2e566db74bb018c705820742` | `3deb7de` |
| Runtime, navigation and packaging review checkpoint | `b46ef4e66581983e307eb7932e7253c4f2c92064` | `7ab5a8c` (preview; full acceptance pending) |

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

The architect's pre-runtime combined check passed 109 tests. After exact runtime intake and shell conflict reconciliation, the combined check passes **169 tests** with frozen provenance. The original access checker passes: 1,084 stair/landing samples, 25 portal records, native leaves/slabs, immutable source, section-filtered construction and resource disposal. The medicine checker passes geometry, snapshots, consumption/reset presentation, borrowed-resource ownership and immutable symbol provenance. The new immutable intake additionally exposed 19 Windows checkout line-ending mismatches; exact source-commit bytes were restored and the full check passed without changing expected hashes. CPU cutaway and ground-prop JPGs were visually reviewed; these do not establish live traversal or GPU acceptance.

The architect's production build contains **3,454 files / 163,289,760 bytes**. Release hashes and relative resources pass. The independent actual nested HTTP replay verifies every file, all three landmark loaders, native animal rigs, private-path exclusion and section resource disposal. Its finite server exited and port 52629 was confirmed released. The preview snapshot is the immutable `7ab5a8c` archive under ignored `artifacts/qa/explorable-places/combined-review-01`.

Deferred corrections and acceptance: final TB-024 follow-up; actual required routes for every animal; live Chrome WebGL title/menu/gameplay/interior review at desktop and phone sizes; real section/resource/performance observations; actual visit JPGs. Doorway, stair or cutaway issues may remain in the preview. The user authorized publication before these are complete. Deployment and hosted-byte verification are still required for this publication; a successful deployment does not establish gameplay acceptance.

The live review ended on 2026-10-29 at 23:45 UTC: Computer Use stopped the turn because it could not determine the current Chrome URL confidently enough to enforce its policy. The existing public game was visible before navigation, but no successful review of the new local title/map runtime or new JPG capture is claimed. No further app input was issued. The architect's registered hidden preview (PID 15884, exact creation identity recorded) stopped through its private marker; process exit and port 64190 release were verified. Restart inputs, source archive and cleanup receipt remain under `artifacts/helpers/explorable-combined-01/`. No root preview remains running, no gate is waived and no master/Pages promotion occurred.

Local diagnostic logs are under ignored `artifacts/qa/explorable-places/`. Disposable preview helpers must stop and release their ports after review. Hosting is already configured as workflow Pages with `PAGES_ENABLED=true`; no hosting repair or new visibility change is required.

## Preview publication

Publication is being performed from the exact existing runtime checkpoint, with documentation updates only. Automated source, behavior and package results above remain applicable. The architect will record the deployment SHA, workflow result and hosted-byte verification here after completion. Subsequent corrections require a separate exact intake and review.
