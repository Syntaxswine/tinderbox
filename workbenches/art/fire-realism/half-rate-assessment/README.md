# Preserved half-rate field assessment — source only

Architect contract: `241248d603b49f95b8446947afe47f161c304200`, `docs/proposals/half-rate-frozen-data-assessment.md`. This delivery implements a future read-only reader. **No actual field scan is authorized by this commit.** It does not import the authoring kit, Win32/Job code, Blender, VDB, runtime assets or a renderer. No new dependency, helper, guard or transport is introduced.

The candidate remains the failed original half-rate run: immutable manifest `1a3bb8d…` and validation `8da43a6…`. The reader checks their complete byte pins, prepared scene/report, nine source snapshots and the original scene/grid/cache-inventory identities and three V5 controls. It refuses malformed clocks/mappings/channel records, absent/extra field files, symbolic links/junction ancestors, hardlinks, wrong byte counts or hashes. Each file is opened read-only; file identity/size/times are checked before/after and again after the pass. No source, raw field, validation or manifest is rewritten. Original VDB/cache contents are not read or requalified.

One reusable 884,736-byte buffer scans all 579 original candidate fields once, in X-fastest f32LE order `i=x+48*(y+48*z)`. Exact finite/min/max/nonzero/positive statistics and D/F layer support are reconciled with saved reports. Original initial/terminal/below-ground/boundary gates are recomputed without weakening them. The saved failure must still be exactly frame97/age3.2; successful byte reconciliation returns a report status **complete-bytes-reconciled-raw-gates-still-failed**, never a raw pass or admission. A mismatch or interruption exits nonzero with bounded partial evidence.

Fixed candidate F frames31/61/96/97/98 receive vertical profiles, fixed descriptive thresholds `0,.0001,.01,.1,.5`, quantiles `.5,.9,.95,.99`, and strictly-above-height fractions at `0,.1,.25,.5,1m`. These thresholds never filter data. Two additional read-only buffer uses verify the exact V5 flame31/61 inputs against its pinned manifest and independently pinned existing profile report. Thus candidate field I/O is512,262,144 bytes; baseline selected field I/O is1,769,472 bytes. No other V5 scalar buffer is read.

F is `sqrt(react)`. **ΣF·dV is a proxy-weighted integral**, and the reported heights are F-weighted scalar-centre percentiles: neither fuel mass, energy, calibrated radiance nor a visible flame dimension. Strict positive centre support, conservative one-voxel interpolation halo, 6-face positive-centre connectivity and proxy-weighted extent answer different questions. Connectivity is computed only for the five selected candidate F buffers using at most1,105,920 bytes of temporary queue/visited backing storage per invocation; no dense frame survives it. No folds, image quality, H/Kelvin, VDB/F32 bit equivalence or interpolated topology is proved. Exported T is the existing flame-derived temperature proxy, not independently measured H.

Future command proposal, **only after a separate architect reader authorization** (replace the fresh output suffix once, never reuse an existing directory):

```powershell
node --max-old-space-size=256 workbenches/art/fire-realism/half-rate-assessment/assess.mjs --output C:/Users/baals/.codex/worktrees/fire-art-corrections/tinderbox/artifacts/qa/fire-realism/half-rate-assessment/assessment-01
```

Use one attached foreground tool command. No background helper is retained. The program checks a shared180-second monotonic/UTC deadline and its private output `assessment.stop` between input reads and z layers/connectivity work. It polls RSS<=512MiB; this and Node's256MiB old-space option are **not an OS aggregate/committed-memory hard cap**. Metadata files are capped at8MiB, outputs at2MiB total, with three normal JSON files (`started.json`, `hashes.json`, `report.json`) and a bounded `failure.json` on failure. Reports include elapsed time, observed RSS/array-buffer peaks, source identities and exact field hashes. A later operator must record actual argv/executable/PID/creation/exit through the existing foreground session and verify no task process remains; this source does not launch that process or claim registration. The future execution decision belongs to the architect.

Pure check (tiny synthetic files only):

```powershell
node workbenches/art/fire-realism/half-rate-assessment/check.mjs
```

The checks exercise raw/path/hash/shape/numeric refusals, immutable input witnesses, asymmetric strides, strict positive subnormal support, negative-zero observations, component/profile distinctions, interruption and preserved terminal failure. They leave a small ignored fixture directory for inspection. They never call `run()`, read actual candidate/V5 fields, construct a controller/Job, import authoring or invoke Blender.

The original raw failure, source/tail timing, reactionGain/livePatchA and R29 underlay remain unchanged. Un-gained residual F can still affect smoke clearing after gameplay reaction is gated; eventual native review must include ticks192–196. No assessment result grants an exception, current-world cooling change, source/appearance score, R/O approval or GPU-cost credit. Fine-ash char work is separate.
