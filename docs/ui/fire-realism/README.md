# TB-036-H: development fire review interface

This is the UI correction candidate for milestone 11. It binds the real `createFireReviewDriver` from runtime delivery `dafdd44fd9177ca79ed6d9a874966e242d0cfdf7`. It does not approve detailed fire, freeze its reference closure, establish the GPU target, or publish the game.

## Exact intake and ownership

The assigned isolated branch is `codex/fire-realism-ui-reconcile`. Its architect base is `3ca35d095fc94361b2aeb3eda6e51f72394337a9`; the runtime commit was deliberately copied as `9e97b4cde5644c864fb876cb2f9ffc112654b5eb` solely for binding and validation. The eventual UI commit contains only UI-owned work and the architect-authorized narrow `src/ui/index.js` presentation option. The architect should intake that UI commit, not copy the runtime twice.

The base already includes corrective artist delivery `0b180335a007809a0e63fb69da40b0b0b59035aa`: the artist entry module Git blob is `0fc8ef9bcd0b74a56787ee506a03f1c5400ff00f` in both trees. Its manifest is version 2, unaccepted, with `referenceFrozen:false` and `optimizedAvailable:false`. The runtime handoff's older base description remains historical; it is not this combined tree's art revision.

The original UI shell was uncommitted WIP on `codex/fire-realism-ui` at `dc7f537a83a7e832a0dfa0757d0b2700b909c053`. The architect explicitly authorized a corrective intake of seven shell/test files from that checkout. [The intake record](original-shell-intake.json) preserves each original path, byte count and SHA-256. The typography, paper/wood presentation, reference column and critique structure derive from that shell. Controls, state binding and tests were reconciled to the accepted driver API. The original checkout was read only and all seven source files were independently rehashed unchanged after this work. No unrelated UI files or earlier screenshots were imported.

## Running the actual interface

Serve the repository with the existing TTL/STOP server and open `workbenches/fire-realism/index.html`. The interface loads the actual driver and `mountUI`, with one selected render and the existing six-button HUD. The public package excludes workbenches, reference photographs, review tools and documentation. Calling the package private in a build log describes exclusion; the GitHub repository itself is public.

- Modes: published current fire, detailed reference, optimized, and the identical no-fire control. Availability and exact reasons come from the driver. Missing optimized art stays unavailable.
- Scenarios: match, carried torch, gasoline, gasoline with powder, wall-clipped jet and Catalogue Street. Powder is an actual simulation scenario; the UI never multiplies its clocks. Only driver-declared cases offer 32/128/512 initial ignitions; actual burning counts are reported separately.
- Configuration: isometric/oblique, bright/dim, seed, native animal, canvas preset and pixel ratio. The driver validates these values. Mode/view/lighting/viewport changes rebuild and replay to the same frame. New scenario/seed/animal/population starts again. Manual HUD input changes the live run, so reset before a matched comparison.
- Transport: play, pause, reset, single step and deterministic seek. The outer workbench is the pause indication.
- JPEG capture: calls the driver's actual `captureFrame`, retains up to six captures, and saves each image with its exact configuration, tick, source fingerprints and hardware JSON. A missing WebGL canvas cannot produce a capture. Images are not synthetic evidence.
- Cost: invokes the driver's selected matched modes; default warm-up/sample/trial settings remain entirely in the driver. Cancel stays enabled while the measure promise is pending and calls `cancelMeasurement` immediately. Raw reports preserve source/hardware/canvas/workload information and rejected data. The UI displays supplied medians/p95/variance/ratios; it computes none of them and never approves a target from a number.

The page explains the fixed authoritative-pose benchmark separately from live motion. Sustained emission in that benchmark is an explicit adaptation. Live spread, powder timing, finite burnout and played motion still require separate review. A fitted preview scales the canvas and HUD together; actual-size inspection preserves authored CSS dimensions inside a scrollable viewport. Match the browser viewport to the canvas preset for actual HUD breakpoint review. A phone-shaped canvas is not phone hardware.

`startFireReview` accepts exact `artistDelivery` and `referenceAcceptance` metadata for architect-managed immutable R/O closures. The default local reference deliberately has an unpinned source commit and no acceptance receipt; the UI labels that condition. Before freezing the high-detail reference, the architect must supply the exact accepted closure and validated receipt. The UI does not manufacture that metadata or approve itself.

## Paused HUD presentation

The architect authorized the narrow `mountUI({autoOpenPauseMenu})` option. Its default is `true`, preserving today's production behavior: a paused snapshot automatically opens the pause menu. Only this review wrapper passes `false`. The underlying snapshot still has `paused:true`; the HUD still says PAUSED and locks the tool/joystick input. Explicit Menu still opens normally. No simulation clock or gameplay rule changes to hide the overlay.

## Photographic comparison

The four plates are read from `art/source/fire-realism/references.json`, with local original/derivative bytes already preserved by the artist. The UI displays the precise agency/photographer/date, source record, rights basis, SHA-256, acquired dimensions, derivative limits, original download URL, observed-color qualifications and unresolved date conflicts. It retains the dossier's non-endorsement text. Record links are ordinary HTTP(S) links; photo assets must be local and have the tracked item-level rights evidence. No new photograph or donor revision was imported by this UI task.

The NARA boat jet leaves the frame and cannot establish terminal breakup or portable scale. The 2024 DVIDS M2 photograph is a modern historic-equipment demonstration. The Beaufort training image has a retained date conflict and interior exposure caveat. The 2010 room photograph is smoke/legibility evidence with no substantial flame front. None establishes animation, burn rates or an 1893 reconstruction.

## Verification and limits

[Checks](checks.json) records commands and scope. The focused Node tests exercise actual public-method binding, frame replay, cancellation before unresolved measurement completion, explicit failure, JPEG/evidence pairing, detached context, source hashes and no inferred acceptance. The browser fixture at `tests/ui/fire-review.html` exercises DOM interactions and the real HUD's production/default and review/opt-out pause policies.

The browser DOM suite passes 24 checks at each of 1280×800, 390×844, 320×568 and 844×390: 96 checks. Browser Enter, Space and mouse activation dispatch once, with trusted click events and exported critique context saved separately. All four actual reference plates load at their recorded acquired dimensions. Screenshot evidence shows the real unavailable state at desktop/phone sizes, not a shader or a flame-quality result.

The available in-app backend reports `GL_RENDERER=Disabled` and fails WebGL context creation. The real page exposes that failure, keeps rendering/timing controls disabled and leaves verified references and notes usable. No browser flags, security setting, headless/CDP route or substitute renderer was used. The architect separately regained supported native Chrome access; that does not make this helper's DOM evidence a candidate WebGL, motion, GPU-cost or HUD-over-fire acceptance. Those remain the combined architect gate.

## Temporary helper

The shared hidden preview server was launched at 2026-10-30T05:08:07Z on port 4554, PID 56600, exact creation FILETIME 134378104870095736. It has a real 900-second TTL expiring 2026-10-30T05:23:07.157Z and an independently supported private STOP marker. Lifecycle registration `c837e93530ab454ab275897ba0fb1b52` records the parent task as owner and preserves the source/restart record. Local nonsecret records are under ignored `artifacts/helpers/fire-ui-review/`. The architect is reusing it for native artist-fixture review; release it once both immediate reviews finish, before completing this assignment. No deadline is silently extended. The helper retirement receipt is recorded after shutdown.
