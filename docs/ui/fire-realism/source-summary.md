# Live scene and historical evidence source summary

This UI-only child of `605a5ba98e81fea728962033c742fca408ff2ec8` corrects presentation after a viewport change. Architect review at `5ec15032af74eae19eb1bc5aecc0b2e70fd2e328` observed a live desktop configuration/renderer beside hardware from an older portrait JPEG. The driver supplied fresh capture and timing metadata correctly; this is not evidence of timing contamination.

The visible Exact sources, hardware & workload JSON now separates two records:

- `liveScene` contains the supplied current configuration, source fingerprints, renderer, workload, frame/tick/clocks and unchanged small `latestCpu` / `playbackClock` objects. It contains no inferred current hardware.
- `historicalEvidence` contains a small `timingReport` projection, the `latestJpeg` projection and existing `latestMotion` metadata. Each report/JPEG hardware record stays paired with that record's original configuration and source fingerprints. JPEG frame/tick are supplied capture values; report `poseFrame` is its supplied protocol request, not an invented current or successfully sampled frame.

Missing records/fields remain null. The redundant `captureHardware` publication is removed. The summary does not clone, mutate or replace archived reports, JPEG metadata/payloads, motion records, downloads or the exact raw-report resource. Source fingerprints retain their existing small closure records. No raw GPU trial arrays, full fire diagnostics, JPEG payloads or full reports enter the continuously rendered projection. Raw report serialization still occurs only through the existing post-sampling evidence path. No runtime, artist, production UI, timing math, delivery descriptor or acceptance logic changed.

Two focused Node regressions verify portrait 390×844/DPR 1.75 capture followed by live 1280×800/DPR 1 configure, later report replacement, exact per-record attribution and unchanged JPEG export. The projection also rejects poisoned fire/report sample serialization and JPEG payload access while ready and measuring. The existing DOM CPU/clock poison guard now reads `liveScene`; one added DOM case checks the same viewport/history split and unchanged visible JPEG metadata.

Validation: 51 focused Node tests pass. The full `node tools/check.mjs` passes 264 tests, 166 own-script syntax checks, 203 resolved static modules, pinned provenance, five byte-preserved imports and 41 art checks. Diff whitespace, strict UTF-8, local documentation references and task-only paths pass. The prior 33-case DOM suite passed at each of four viewports in architect-observed `artifacts/qa/fire-realism/ui-public-cpu-5ec1503/` (132 checks); those results precede this correction. The updated 34-case fixture is prepared for architect execution after exact intake. This worker used no browser/server/helper and no hardware or visual acceptance is claimed.

## Independent static readability note

Observer `/root/fire_ui` inspected the architect's existing R08 round11 bright frames 60/120 and dim frame120, R05 round06 bright frame60, plus the already reviewed NARA 6349328 and DVIDS 112603 photographs. No image was edited, imported into this branch or recaptured. The four game JPEGs are 1280×800/DPR 1, isometric `match-contact`, seed 1893 with the AFT bear; paired JSON identifies their exact source closures and RTX 3080 WebGL2 context. They are canvas-only stills, without the six-button HUD.

At matched bright frame60, R08's pale translucent contact and tongues are less readable than R05's brighter orange flame body. At bright120 the base can read as haze over a square fuel patch; the broad warm spill is more conspicuous than the attached reaction region. Dim120 makes the spill easier to see but still leaves weak contact definition. The animal remains clear in these stills. R05 is easier to identify as fire, while its smooth body/smoke is not an accepted realism target.

The NARA jet preserves a conspicuous bright core against gray surroundings, and the hut photograph separates bright/orange reaction regions, dark internal gaps, recognizable structure and dense rolling soot. These are qualitative readability references with different exposure, scale and fuel conditions, not numeric luminance or smoke targets for a one-tile fire. Neither photograph establishes animation. This note supports the architect's existing weak-contact rejection; it does not freeze R, score the whole goal, prove HUD/motion or approve GPU cost.

Exact inspected file identity (paths relative to the architect checkout):

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `artifacts/qa/fire-realism/render-round-11-reaction08/reference-match-contact-isometric-bright-frame60.jpg` | 162227 | `c8ec5befa1376bcd50ab115906a111f4b5358cff630bc881c42c4960bb269abb` |
| `artifacts/qa/fire-realism/render-round-11-reaction08/reference-match-contact-isometric-bright-frame120.jpg` | 161969 | `6fadbd5153fc85aad9f5b0d4cd259c7a5e3fb664f81366b36f7ddc19c2605e19` |
| `artifacts/qa/fire-realism/render-round-11-reaction08/reference-match-contact-isometric-dim-frame120.jpg` | 102882 | `f5950113fb845be3a60199b65c7f68eebc29a39f86af840e437be6cded252b2c` |
| `artifacts/qa/fire-realism/render-round-06-smoke05/reference-match-contact-isometric-bright-frame60.jpg` | 162257 | `92e0a3a6fe01a59bd20355d8598e194e6c1680e7a164d2827a3f79fb7e6c228c` |
| `art/source/fire-realism/references/nara-6349328-original.jpeg` | 1931733 | `8b49c1b531cb1fa076cfb8e23900e4366e6776701df60740f2b3561c0e747cd1` |
| `art/source/fire-realism/references/dvids-exterior-112603-service.jpg` | 194342 | `9d1f412ddb76f6825b1adbd05aefe0e55e21d934407663bcadf71578d662c991` |
