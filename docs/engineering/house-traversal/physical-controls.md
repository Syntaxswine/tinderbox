# Pinned H15 physical controls

The provider-only controls pass **67/67** on artist `4cecd10d09eff85543996d4362c63b2297001436`, merged with the paired-door compiler through `0970b7339356add4d2a3e0fb7e80452418f16beb`. This is an intermediate [Milestone 28](../../milestones/28-tree-and-traversal-corrections.md) result. Actual full-Catalogue browser, world-clock, visual and package acceptance remain pending. The [machine record](physical-controls.json) contains every case, source/script hashes, evidence hashes and process cleanup.

## Source and method

The checker requires a full immutable `--art-commit`, reads its scene/house/shop Git objects and verifies the checked-out files agree. Windows adds only one CRLF byte to each of these three checked-out JSON files; normalizing that byte gives exact Git-object equality. No working artist file or moving branch is used as intake. The exact physical source closure is:

| Export | Git-object SHA-256 |
| --- | --- |
| House | `c45fc8a1a2aaa1beeacfcb430d259130d34c410ad7ffa34bb5ba703223b9b77c` |
| Scene | `c8c69e58a14231f887a0f3a2c79867469fb34e52b5980727e85f21c62f160765` |
| Shop | `cd8ecffe491043546935dc162f0db88e8bd0056d1acb5fe97251db900269b2b5` |

The exported flight array has two six-rise flights, a supported turn, lower/turn/upper elevations 0.48/1.54/2.60 m and unchanged 2.12 m floor pitch. The checker groups each flight's actual tread patches by height and derives its direction and mid-tread stop/reverse point. It uses `CHARACTER_PROFILES` and the existing input transformation, movement provider, support queries and contextual interaction path. Requested movement uses the unchanged 9 m/s configuration; native 0.22 m step limits and solid collision remain authoritative.

One inside door-control stance is interpolated on an existing level route segment, because the exported segment crosses a reachable stance without making it a vertex. The driver walks there. For offset targets, an existing native support query supplies the actual expected elevation; it never moves the player, alters geometry, enlarges a step or changes tolerances. Both the original target and actual support target/ID are retained in the trace.

## Coverage and limits

Sixty route cases cover goat, horse and AFT bear, keyboard direction commands and analog magnitudes 1/0.5/0.2, centred and ±0.05/±0.10 m offsets. Each walks out and back through the actual paired entrance, both stair flights and upper exit, stops/reverses on each flight, and uses inside/outside contextual Open/Close. The centred bear case covers the captured approach regression. A further goat case repeats a real requested 20 mm world-X side step before leaving the open door. All **61 route cases** pass.

Three controlled occupancy fixtures use actual closed/open leaf shapes and supported positions clear in the current pose. For each native profile, a separate occupant overlaps only the left or only the right destination leaf during opening and closing. All **12 exclusive pose samples** reject the whole action and preserve both leaves' state. Unoccupied group transitions and actual closed-pair movement rejection also pass.

Three isolated negative fixtures retire actual support boundaries beneath an upper route target through the existing index. Each unchanged native body rejects the resulting unsupported crossing without silently dropping to another floor. These are explicit negative-test modifications to disposable provider state, not source changes.

These are static physical-provider controls. The keyboard model sends quantized direction commands; it is not a browser key event. Native physics advances for accepted door actions, rather than simulating a complete world/fire trajectory during every movement budget. No UI, moving equipped mesh, full-map, powder/world-clock, wall-clock FPS or phone Safari acceptance is inferred. The owner's exact original house/backend remains unconfirmed.

## Preserved initial harness failure

The first attempt passed six cases, including both captured regressions, then exhausted a keyboard checkpoint budget. A +0.10 m offset placed the turning-landing target on the next actual 1.7166667 m tread while the harness demanded the original 1.54 m height. The animal alternated between two supported positions with no collision blocker. The first run and its failure remain in `artifacts/qa/house-traversal-physical/4cecd10d-first/`.

The corrected checker derives expected target height from existing support geometry and records that decision. A fresh same-pin run in `artifacts/qa/house-traversal-physical/4cecd10d-support-targets/` passes all 67 cases. Neither source geometry nor movement/step/tolerance rules changed to obtain that result.

## Reproduction and cleanup

```powershell
node tools/review/house-traversal-physical.mjs --art-commit=4cecd10d09eff85543996d4362c63b2297001436 --output=artifacts/qa/house-traversal-physical/new-fresh-output
```

The runner requires a fresh output directory, records source and script hashes, preserves inputs/accepted paths and the first failure, and enforces a finite 15-minute synchronous deadline, STOP marker and row bound. Restart sources and nonsecret launch details are saved before case execution. Every provider is disposed in `finally`. Both recorded Node processes exited, all providers were disposed and no ports were opened. No renderer or retained helper was created; the artist retained the sole preview renderer.

The paired-registration checks pass 21/21, the existing host-registration compatibility check passes 1/1, and both tool modules pass syntax checks. No browser, build or full suite ran in this stage. `dist/build-manifest.json` remains the previous `d99c663be72954bcf749e96bb3dd18561055bcc89ed6ac7eb33f290e1d92b2b9` package; it does not contain this candidate until the later authorized build and review.
