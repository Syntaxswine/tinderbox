# Verified binary preload candidate

This implements the architect's accepted `docs/proposals/fluid-binary-preload.md` transport contract. It preserves original fields and the JS-only path; it supplies no public descriptor, real asset source pin, quality acceptance or renderer. The 193-sample authoring result is unchanged and has not been booted by this runtime task.

## Source and bootstrap schema

A resource-backed manifest adds nonempty `runtimeResources`, separate from the complete static `.js` closure in `runtimeFiles`:

```js
runtimeResources: [{
  path:'assets/art/fire-realism/fluid-contact/data/chunk-000.fzp.gz',
  kind:'fzp1-gzip', bytes:123, sha256:'exact raw SHA-256', uncompressedBytes:456
}]
```

Those are the exact five allowed fields. Only canonical mode-local `.fzp.gz` paths and `fzp1-gzip` are supported. Missing/extra fields, wrong kinds/extensions, traversal/encoded escapes, duplicate/case-aliased/JS-colliding paths and invalid counts reject. Descriptor version 1 adds optional `prepareExport`, required exactly when resources exist. It names a distinct own function export from the same `factoryModule` as `factoryExport`.

Before any artist import, the loader verifies all configured JS closures, exact raw resources and optional receipts. It preflights budgets across configured entries before staging a large resource set. Limits are aggregate 64 MiB ESM, 96 MiB compressed resources, 96 MiB declared sparse output and 256 chunks, with 2 MiB compressed / 4 MiB decoded per chunk. Actual resource response streams enforce exact declared byte counts and caps; Content-Length cannot establish validity. The asset bootstrap enforces its actual decompression counts and original scalar hashes. Resource-backed unconfigured/manual debug fallback rejects.

```js
export async function prepareFluid({resources,signal,registerCleanup}) {
  registerCleanup(() => { /* synchronous, idempotent staged-data rollback */ });
  // resources.records is detached, frozen metadata. Each take transfers the
  // verified Uint8Array without another copy and removes loader retention.
  const gzip = resources.take(resources.records[0].path);
  // Check signal before/after every await and before publishing shared data.
  // Decode/verify every declared resource exactly once, then release gzip refs.
  return { /* optional small JSON-only diagnostic counts; no buffers */ };
}
```

Exactly one cleanup must be registered before the first take. Unknown/duplicate takes are sticky failures even if the asset catches their exception. The provider revokes and clears unconsumed references on every terminal path. Preparation must consume the entire declared set. Failure/cancellation invokes rollback once; throwing or asynchronous cleanup is preserved in an AggregateError alongside the original failure, including failure of a later configured mode. An outer failure rolls back modes already prepared. Successful shared decoded data transfers to the document; subsequent caller-signal abort does not tear down its active factory. The verified main function is returned unchanged, with no wrapper and no per-frame async.

The cold transaction has a 180-second deadline; each preparation has a 120-second deadline within it. Both inherit caller cancellation. Readers cancel/release their stream handles, provider references clear, and timers/listeners retire. Native imports, native crypto and arbitrary synchronous/uncooperative asset code cannot be forcibly stopped by this JavaScript API. Assets must cooperate with signal/generation checks so late completion cannot republish cleared state. Failed attempts require a fresh document; there is no hot retry.

## Identity, metadata and cost boundaries

`verifiedFireDeliveryFingerprint(record)` includes `prepareExport` and complete verified `runtimeResources` hash/bound records only for resource-backed entries; JS-only identities keep their existing shape. Its private association checks the actual selected factory and preparation functions, including mutation of the namespace export. `verifiedFireDeliveryMetadata(record)` returns detached manifest/hash/boot metadata for that same valid record, never raw buffers. The driver uses this loader-issued evidence instead of fetching and hashing the compressed dataset again. Manual/copied/mutated resource records cannot substitute for it. This is an accidental-substitution guard, not a security boundary against arbitrary same-origin scripts or injected test callbacks.

Resource-backed quality receipts add `prepareExport` and `runtimeResources`, keyed by path with exactly `{sha256,bytes,kind,uncompressedBytes}`. Missing/changed bootstrap, data hash, byte count or bounds reject. Optimized acceptance additionally links `referencePrepareExport` and `referenceRuntimeResources` when the frozen reference uses them. Existing JS-only receipt proofs remain valid and gain no extra fields. The Git-blob command verifies every named binary as well as JS/manifest bytes against the declared commit, without executing asset code.

Captures, results and each trial's existing factory/source fingerprint include those identities; the paired no-fire trial binds the same selected source. Authoritative simulation pose/workload hashes remain mode-independent, so legitimate R/O geometry/source differences do not break equivalent-input comparisons. No fake mode-specific field is added to that input hash.

Setup/network/preparation timing and explicit compressed-buffer ownership are separate from steady GPU timing. Shared sparse, geometry, stream/verification scratch and two current/next RGBA CPU/GPU buffers remain separately reported asset resources. Compressed and sparse data may coexist at boot; the 96 MiB sparse cap is not a total-RAM claim. Compiler/module/string/crypto/GC memory and externally retained buffers are unmeasured. No raw buffers enter UI state or capture JSON. The driver reports bounded JSON diagnostics and fingerprints only.

## Evidence and remaining gates

The isolated small probe is `workbenches/runtime/fire-fluid-binary-probe/`. It uses only the accepted Stage 1 gzip bytes and an explicitly synthetic QA descriptor, never a production pin. Native Node and the architect's actual IAB both independently matched all 72 original scalar hashes. The reviewed cohort is `artifacts/qa/fire-realism/fluid-binary-stage1-reviewed/`: 35,660 ESM bytes, 174,481 compressed bytes, 363,108 sparse bytes, and two RGBA slots totaling 262,144 bytes, then zero owned dense bytes after disposal. The first artist import follows eight verified reads. Tampered/missing resources fail before import; actual cancellation during preparation leaves ready=false, one cleanup and zero owned sparse/dense bytes. Root's exact success report SHA-256 is `0b225faa387e19384f7821dcb80bccc79b6bbb56a60690f7f30852968c1b43e1`.

Full validation passes 271 tests, syntax for 192 owned scripts, 229 static modules, shared-Three/provenance and existing art checks. Focused checks cover stream overflow/truncation/abort, aggregate staging caps, cleanup/late-completion/second-mode failures, malformed/tampered resources, own prepare export mutation, exact receipts, paired workload binding, binary Git blobs and the real driver reusing one resource request/preparation. API renderer/query fixtures are explicitly not WebGL/GPU evidence. The architect independently owns source review, exact intake and the later 579-channel Node/browser proof before any actual asset rendering. No new bake, changed scalar values, R freeze, GPU target or publication follows from this small transport proof.

Only four changed browser-facing files gain explicit LF attributes: delivery.js, resources.js, profiling.js and the review driver. Historical snapshots and unrelated source files are not normalized. The reviewed transport module bytes must match final Git blobs and checkout bytes at intake. No server/browser or retained helper was created by this runtime task.
