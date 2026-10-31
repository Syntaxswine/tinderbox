# Finite fluid contact candidate

This is an unaccepted, additive native-reference prototype for the canonical four-cell grass match source. It replaces the rejected analytic tongue topology with original Blender/Mantaflow density, temperature and flame fields. It changes no simulation or production default. R09, the cone pilot and the accepted Stage1 export probe remain unchanged.

## Exact delivery

- Factory: `assets/art/fire-realism/fluid-contact/index.js`, export `createFluidContactReference`.
- Cold preparation export: `prepareFluidContactData`; reference quality only, optimized unsupported.
- Manifest: `assets/art/fire-realism/fluid-contact/manifest.json`, 43,052 raw LF bytes, SHA-256 `34707268ac651e019cdf42c4416e4b3255c8204568b4d7a52ee2a8b25d5da32d`.
- All 58 static JS dependencies and 116 binary resources are listed and hash pinned. No asset fetch, renderer, dynamic import or asynchronous per-frame work is used.
- Runtime integration requires the architect's approved binary delivery loader (`f79ceaa0f4bb045314c144472b083a95f1c492ad`, integrated at `960edf4`). The artist creates no delivery descriptor or acceptance receipt.

## Original authoring and clocks

The one authorized bake used the verified portable Blender 4.5.15 LTS build `5afeabba6097`, executable SHA-256 `935e4bed28e51d08b8e1fbcc31dcccc000cc1c3dd065d82dcb1da813e75db795`. Sources/settings/supervisor are under `workbenches/art/fire-realism/mantaflow-contact/`; exact running pins and observed settings are preserved in its evidence directory. Settings use four threads, seed 1893, fixed two substeps, no adaptive domain, up-resolution noise or wind, resolution max 96 and observed 48×48×96 scalar arrays. The fixed 2×2×4 m domain has four voxels below the unchanged collision slab at ground level.

There are 193 actual samples, ages 0 through 6.4 inclusive at 30 Hz, with no warmup. Cache precision was actually set to 32. Initial density/temperature/flame are all observed zero. Inflow is off at sample 1, on at samples 2–96 and off from 97 onward. The original four-cell bed is inset by two voxels. The observed source has 3.2 world seconds of burning; real ignition/burnout receipts determine age. Player clocks never drive the field, so powder slows it with world time. Pause freezes age while current camera/depth bindings remain fresh.

Actual burnout gates reaction at every height, including the small residual raw flame beyond 3.2 seconds. Density remains nonzero at the 6.4-second endpoint (maximum 0.0907514691). A finite final 0.4-second fade inside the maximum 3.2-second smoke tail is an explicit presentation adaptation; the bake is not claimed to empty naturally. Initial cold startup and observed spent retirement are valid. Late attachment to burning OR spent/history cells without observed ignition age rejects; sustained burning beyond this finite asset also rejects. No active loop, persistent-source benchmark, restart or new tail is invented.

## Coordinates, contact and useful support

Scalar centers remain domain minimum plus half a voxel. Mapping is Blender (X,Y,Z) → native (X,Z,−Y) plus [5.5,0,8.5]. No mesh-modifier half-voxel correction is applied to scalar data or support prisms. Independent asymmetric landmarks, actual field byte roundtrips and current/next one-voxel halo containment are checked.

Every positive density/flame value is retained; no faint-value threshold or domain crop is used. No outermost reaction or density boundary voxel was positive. Actual low flame support can extend outside the fuel bed near ground, so the lower reaction is clipped to the live authoritative four-cell A mask with inward taper. Only above the architect-approved height 0.2733333358168602 m may measured source-owned upper support leave the vertical fuel columns. The all-sequence reactive halo is [−0.8541666623,−0.8124999944,−0.0208332893] to [0.8125000540,0.8541667219,2.3125001136] in Blender coordinates. Smoke's halo reaches native height 3.8125001583 m. Exact per-current/next-pair halos are preserved in metadata, not enlarged to a generic box. Opaque geometry still terminates every sample; no new heat, ignition or collision is introduced.

Geometry follows actual scalar support: convex hull prisms in disjoint, strict half-open height bands, using the union of current and next positive samples plus one voxel. The largest observed hull has 29 vertices. Peak support is 92 prisms / 2,510 vertices / 4,660 triangles. A camera ray integrates each convex band once, rather than traversing a whole volume again for every nonconvex front face. The initial renderer explicitly supports cameras above the volume and rejects unsupported camera/sample bounds instead of silently dropping samples. This useful support is a reference pilot, not an accepted expensive baseline or cost optimization.

Original CFD smoke is integrated in the same field as reaction and replaces contact smoke; R09 smoke is not layered over it. Initial optical coefficients and the temperature ramp are prototypes pending native images. Output uses the existing NoToneMapping/sRGB path with correct post-conversion final-alpha association. Native scale, current fuel/depth provenance and player legibility are preserved. No source photograph pixels are shipped in the effect.

## Exact data and memory

The original 579 f32LE arrays total 512,262,144 bytes. Their raw manifest SHA-256 is `2b4ee8b0728f0d6c21fade690770ada1bfc0bf817d2af86000a9fd346105ea59`. FZP1 preserves all original bits, including signed zero; only positive-zero runs are omitted. The codec and direct RGBA strided decoder are exact original copies from runtime commits `6a0942a` and `29ab15e`, with provenance/hashes in `helper-provenance.json`.

The first base64 ESM packaging exceeded the 64 MiB ceiling and is retained as a failed negative control. Under the explicitly approved binary contract, the unchanged gzip bytes fit: 15,560,554 bytes of ESM, 76,464,872 compressed bytes in 116 chunks, 88,072,548 shared sparse bytes. Each chunk stays below 2 MiB gzip / 4 MiB decoded. All configured JS and binary hashes are verified before first artist import. Preparation consumes each once-only verified resource, registers rollback before taking it, checks cancellation/generation around asynchronous work and publishes shared sparse state once.

Only two factory-owned RGBA32F current/next buffers are dense: 7,077,888 CPU bytes, with the same nominal GPU texture storage. Direct packet-to-lane decoding creates no intermediate planar frame cache. Cold scalar verification uses one separately accounted 884,736-byte scratch channel. Shared sparse data and static geometry are document-lived and borrowed by the effect; disposal clears its two slots, textures, geometry attributes, materials and light without disposing borrowed masks/depth. Browser compiler strings, JS geometry objects, native gzip/crypto, GC and physical GPU residency are not inferred from these explicit byte totals.

## Checks and observed run evidence

The original preparation failed only its exact Python-double surface-distance comparison. One architect-approved preparation-only correction logged requested .001, RNA FLOAT and observed .0010000000474974513 and compared the exact float32 storage. The physical setting did not change. Its original failed output is retained. The corrected preparation and only bake completed under the original absolute 06:11:31.320923 UTC deadline, with no extension or rebake. Bake peak private memory was 324,161,536 bytes and peak scratch 903,300,256 bytes; exit 0. All six preparation/bake lifetimes and the later Node audit are registered and verified exited; no artist server/browser/helper remains.

`evidence/actual-node-proof.json` records the single actual 193-frame Node bootstrap through the approved real verifier/resource provider. All 175 source/resource reads passed before first artist import. All 579 original-file hashes independently match channels extracted from the two RGBA buffers. Working manifest, 58 JS files and 116 binary resources were identical before/after. Both audit buffers were released before the controlled actual-data factory lifecycle test. Observed process peak RSS was 660,852,736 bytes; this includes runtime/compiler/native overhead and is not a GPU measurement.

Focused checks cover exact recipe readback, asymmetric axes, support/halo/ray ownership, world/pause/reset/powder/source age, cancellation/rollback/once-only preparation, owned/borrowed disposal, actual shared Three and the existing reference bridge's quality ABI. Source and build checks are required before this candidate is pushed. Data/API checks cannot approve flame morphology, shader compilation or animation.

## Architect browser procedure

After exact candidate intake, configure the existing architect delivery descriptor to this factory/prepare export and raw manifest pins, without any acceptance receipt. On a fresh supported preview document, open `workbenches/art/fire-realism/mantaflow-contact/audit.html` and click **Verify 579 channels**. It uses the real cold loader, then the same verified canonical module cache. It independently extracts every original channel from the two RGBA slots and displays JSON plus an **Open JSON evidence** data link. It creates no renderer or automatic download and permits one attempt per page. Its original-field hash dossier is review data, not a runtime dependency.

Then the architect uses the existing native canonical match simulation, scene/depth, cameras and recorder for isometric/oblique matched phases and full active→spent motion. Shader compilation, all-193 actual browser data proof, actual opaque clipping/motion, realism and cost remain unproved here. This finite contact-only candidate refuses other emitting layouts, no new source API or game mode. Do not run the full matrix or optimize until this one source looks convincing; no R freeze or promotion is claimed.

The full immutable .blend/cache/raw arrays and failed sizing artifacts remain ignored under `artifacts/qa/fire-realism/mantaflow-contact/stage2-2026-10-31-v1/` and `stage2-2026-10-31-v2-preparation-correction/`. Compact reports and exact hashes are tracked in the owned workbench evidence directory; historic pending statuses are preserved verbatim and are superseded only by the architect's separate decisions.

Final assigned-checkout results: `npm run check` passes 184 script syntax / 237 static module checks, 186/186 tests and 73 shared-Three/provenance checks. `npm run build` packages 3,647 files / 255,520,405 bytes. All 175 manifest/source/binary records are raw-byte identical to the actual Node proof and public package; all four authoring pins remain unchanged. Six recipe tests and support/clock/payload/factory focused checks pass. See `evidence/final-checks.json` and `final-raw-delivery-check.json`. These results precede any architect combined-source or native WebGL validation.
