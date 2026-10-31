# Ground-char atomic resize correction

Architect contract: `490a98a`, `docs/proposals/ground-char-atomic-resize.md`.
This is a separate child after evidence candidate
`33a43328c3374ec6f1181f6853ad9499c5bcc864`; that candidate is unchanged.

The independent exact709 witness is preserved in the primary QA report
`char-malformed-grid-root-witness.json`, SHA-256
`b0ac7530d41ebeacd4d9d19f30282b71d456661b71541c6d47bdb8aedd247f09`.
Previously, width1e40 reached allocation after retiring the old mask, and an
explicit zero/NaN pitch silently selected .5. This correction does not relabel
the earlier passing tests as having covered that failure.

Evidence-bearing grids now require explicit finite positive dimensions and
pitch, dimensions at most64m, pitch .125–1m, alignment within the simulation's
existing1e-8 tolerance, and at most65536 cells. These are the existing authoring
rules in `src/simulation/fixtures.js`, not a new gameplay limit. Actual columns,
rows, cell count, four-channel length and Float32 byte count must be safe positive
integers within65536 cells/262144 lanes/1048576 bytes before allocation.
Legacy/empty input retains its .5 missing/zero/NaN pitch fallback and ceiling
geometry; its actual allocation arithmetic is checked too. The owned art scene
already limits every mask to65536 cells.

Strict aligned grids deliberately use the solver's rounded counts. At decimal
pitch .15, width .15*7 can divide back to7.000000000000001; the old ceiling made
an extra empty column. The corrected new path uses7, matching HeatField. Normal
.125/.25/.5/1m native grids, shader/mapping, R/G/alpha, palette, filtering and
stage -1 remain unchanged. No simulation rule or source clock is edited.

Resize first prepares its new bounded buffer, texture, geometry, mesh and settings
as local candidates. It changes no active data, borrowed uniforms or ownership
sets before preparation succeeds. A failed preparation removes/disposes only
new candidates, attempting every cleanup. If cleanup also fails, an
AggregateError retains the primary exception as cause/first error plus the
cleanup errors. The old material is shared and is never candidate cleanup.
Success commits the new mask and retires the old texture/geometry/mesh once.
Retirement errors are explicit; both old resource disposals are attempted.

Focused command:

```text
node --test tests/integration/ground-field-resize.test.mjs tests/integration/ground-char.test.mjs tests/integration/ground-char-evidence.test.mjs tests/integration/ground-field-order.test.mjs
```

The21 checks include zero attempted typed allocations for the huge finite grid,
invalid/missing explicit pitch, misalignment and excessive cells; the actual
65536-cell boundary uses only a1MiB buffer. Bounded injected texture, geometry,
mesh-setting and post-add failures assert the old texture/data/version/uniform,
geometry/material/mesh parent/counts/diagnostics survive exactly. They then prove
valid update/resize and disposal. A separate cleanup-failure case proves the
original error is retained and remaining cleanup is attempted. Legacy/empty
fallbacks, original lane values and the consumed-fuel mapping remain checked.

These are source/shared-Three object tests without a renderer or browser. The
transaction does not promise recovery from fatal process out-of-memory, a hard
RAM quota or arbitrary external mutations. It fixes validation and owned-resource
lifecycle; it gives no native visual,8/10,reference/optimized,cost or publication
acceptance. Root/peer replay and native review remain separate gates.
