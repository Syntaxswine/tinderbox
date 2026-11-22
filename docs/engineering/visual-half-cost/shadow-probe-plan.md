# M30 shadow attribution preparation

Status: source-only candidate; no package copy, browser, native replay, build,
timing experiment or production optimization has run.

The architect's 2026-11-22 delegation and M30's appended "Round one result and
next source experiments" authorize this preparation. Branch
`codex/visual-shadow-probe` starts at reviewed firelit source
`e619918bb30349f1c65abe58fc76da89e03141a2`. The prior UI branch remains preserved.
Only this existing UI checkout is edited.

## Package and source pins

The immutable corrected firelit reference is the coder QA
`artifacts/qa/visual-half-cost/reference-firelit-01/reference-package`.
Its 3,676-entry canonical SHA-256 is
`a26316d6366f0f9fedb9a2e799b3b1aadc594894d5a8309b8383a0a99b53f5bc`.

The patcher requires exact Three module bytes:
`96cc39e18fde90e5a3896252775a71e8f3d3e946da0035ee27f3ecce09c60e8c`.
Its pinned renderer path is exported as SHADOW_THREE_PATH. Source line endings
are CRLF and are preserved. No production vendored or runtime source changes.

| Preparation source | SHA-256 |
| --- | --- |
| tools/review/visual-shadow-probe.mjs | f2fc1d70513d1effdb95e4b3b5da87a6de631480a60b6c77fef73970f6e36ad1 |
| tools/review/visual-shadow-probe-collector.mjs | a2dc21f60f7b0bb5fa9885cefd45bec134f3446c77a22d34da847f7fb7b10f4f |
| tools/review/visual-shadow-probe.test.mjs | a2ffa5ca1a1fc7cada66ee0554ac558fccf9993aec7b195d9138eca706210e01 |

## What is counted

There are 39 insertion sites in a copied Three module:

- 25 existing program-change branches: light layout, output colour space,
  batching and batch colour, instancing and instance colour/morph, skinning,
  environment, fog, clipping, vertex alpha/tangent, position/normal/colour
  morphs, tone mapping, morph count and material version.
- Two getProgram/getParameters entries and two actual program/material-switch
  branches. These are lookups/switches, not shader compilation counts.
- Two shadow-call scope pairs, covering grouped and ordinary shadow draws.
  Existing point versus other shadow calls are separated; the direct draw
  context labels skinned versus ordinary objects and numeric material IDs.
- Direct-submission entry/finally, vertex-binding compatibility checks,
  actual VAO-switch branch and WebGLInfo draw accounting.

The remaining insertion imports the private collector and exposes its QA API.

A submission means renderBufferDirect was entered. A draw means the existing
WebGLInfo.update accounting ran after the buffer renderer's GL draw call.
They can differ for early returns, zero-instance work or multi-draw objects.
The counters do not equate binding needsUpdate with material invalidation.

Counters contain numbers and strings only, with at most 512 material/scope rows
per enabled window; overflow is reported without interrupting rendering.
Snapshots detach their data. No render object, geometry, material, GL handle,
frame DTO, time sample or event history is retained. Counters start disabled.
Scopes restore in finally blocks on early returns and exceptions.

## Applying the preparation after a probe grant

Importing either tool does not copy files or launch anything. A future approved
driver may call prepareShadowProbeCopy, or use:

```text
node tools/review/visual-shadow-probe.mjs --prepare-copy --reference REFERENCE_PACKAGE --output FRESH_PRIVATE_QA_DIRECTORY
```

Run from the owning checkout. Output must be a fresh descendant of
`artifacts/qa/visual-half-cost`; existing outputs and symbolic-link paths are
refused. The patcher verifies the frozen inventory and every source-file hash
before creating a copy. Only the copied Three module changes; its private
collector is added beside it and the copied manifest is regenerated. All other
copied bytes are checked. preparation.json records both package hashes, code
delta and each insertion's original line/offset/hash. Source-hash or exact-match
failure stops before copying. The immutable reference is only read.

The in-page API is window.__tinderboxM30ShadowProbe.begin(label), end() and
snapshot(). The engine imports its private frozen counter object directly;
there is no externally supplied render callback. Removing every tagged
insertion restores the exact original source bytes.

## Source control result

Command:
`node --experimental-vm-modules --test --test-timeout=10000 tools/review/visual-shadow-probe.test.mjs`

Node 24.15.0: six controls pass, zero fail; final control duration 169.6639 ms.
The first invocation stopped at the exact-match guard before controls ran:
the multiline end anchor assumed LF. After correcting the anchor and harness
extraction to preserve CRLF, the changed control passed. This was a source
correction, not an unchanged-build performance retry. The unchanged control was
then moved to tools/review (outside the ordinary integration-test glob) and
verified again at its final path.

The controls parse both ES modules without evaluating the renderer, restore
source bytes exactly, reject changed/repatched input and production output,
exercise all 25 decision branches with equal original mutations, and compare
ordered mock draw/callback/state traces from the actual extracted renderer
functions. Grouped/ordinary shadows, nested ordinary drawing, early return,
failure cleanup, disabled counters, binding compatibility and bounded detached
snapshots are covered. This proves the tested source/mock behavior; actual
WebGL pixels and workload attribution remain untested.

## Proposed finite untimed replay — requires separate review and grant

One invocation, ten-minute absolute deadline, one owned hidden browser and
maximum one live renderer, with two sequential contexts: unchanged firelit
reference, then instrumented copy. Stop on first failure; no automatic retry,
build, source regeneration, new gameplay map or production material change.

Reuse the coder's existing workspace-temp launcher, catalogue-browser helper
and installVisualBaseline command/visit adapter. The coder should own execution
in its existing checkout, using reviewed preparation source hashes. The existing
helper serves dist and one referencePackage. Verify dist's complete canonical
inventory equals the frozen firelit reference before using it as the unchanged
lane; serve the instrumented QA copy through the referencePackage route. If
dist differs, stop rather than rebuild or substitute it. Recheck reusable helper
source hashes before the reviewed wrapper is launched.

Observed coder helper SHA-256 pins at preparation:

- visual-half-cost-page.mjs: `19ca1b5ebbc4f8c1c81a311575ca38cd7ccefab2c819d3e64320870eb0727c9b`
- catalogue-browser.mjs: `a2ef2a2831a0f98231236627d0af4b89c12f264bff7123389692b1d7dd6cd376`
- visual-half-cost-baseline.mjs: `e9f4387ee336d133ea6903f7a410210e9ddf5baa52c051023340dfa3a30f55e1`

Frozen workload.json SHA-256:
`d5536971472b3f109a93b27840455d18b71b26039bda03f7f8df55e2da77c8d7`.
Use the same 309 production commands, explicit reset/generation sequence,
Catalogue scenario, goat, seed 1893, 1/60 host step and final host tick 1620.
Use current native states; never import saved thermal snapshots.

Collect only quiet generation 0 ticks 1–60 and growing-later generation 1 ticks
1501–1620. Begin immediately before each selected window's first advance, end
immediately after its last displayed render, and leave startup/warm-up disabled.
Retain two bounded counter summaries, scalar workload/draw counts and the
current native snapshot only. Existing adapter timings/GPU queries are not
scored or used to make a speed claim; no CPU profiler runs.

Keep normal zoom, camera, resolution, exposure, antialiasing, all flame/smoke/
light channels and shadow settings equal. Compare scalar workload, draw/
triangle counts and endpoint state digest across the two lanes. Save matched
quiet/dense stills outside collection for shadow, cutaway, fade, body, paint and
light review; no new mature-body recipe or extra native steps are proposed.

Require zero collector overflow, balanced scopes, no page errors and complete
source/package identity. Reconcile counted draws with renderer accounting.
Report how many point-shadow program changes are skinning transitions versus
other reasons, their materials, actual program/material switches and binding/
VAO checks. A low skinning share invalidates the proposed material-family
optimization even if sampled getParameters remains hot. This probe establishes
attribution and correctness only; a later optimization needs fresh paired cost
and appearance checks against the unchanged M30 target.

Before launch, record source/input hashes, owner, PID/creation identity, ports,
workspace temp, restart command, deadline and finally stop method using the
existing helper lifecycle utility. Verify contexts, browser/driver and ports
close. No helper has been created or retained by this preparation.
