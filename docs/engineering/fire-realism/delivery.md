# Fire delivery loader

This is delivery plumbing for the private comparison workbench. No actual descriptor, commit pin or acceptance receipt is supplied by this implementation. The artist reference is still unaccepted. The UI boot does not call this loader until its separately assigned integration.

`loadFireReviewDelivery({descriptorUrl, signal})` in `tools/fire-realism/delivery.js` reads the optional architect-owned `workbenches/fire-realism/delivery.json`. Its default URLs resolve from the project module, so a deployed project prefix is retained. The descriptor uses version 1 with these fields:

```typescript
{
  version: 1,
  byMode: {
    reference: {
      sourceCommit: string,       // exactly 40 lowercase Git hex characters
      factoryModule: string,      // canonical project-root-relative .js path
      factoryExport: string,      // actual named function export
      manifestUrl: string,        // canonical project-root-relative .json path
      manifestSha256: string,     // exactly 64 lowercase hex, raw manifest bytes
      manifestBytes: number,      // exact positive integer byte length
      acceptanceUrl?: string,     // optional architect receipt: all three or none
      acceptanceSha256?: string,
      acceptanceBytes?: number
    },
    optimized?: null | { /* same fields, its own commit/closure/receipt */ }
  }
}
```

Reference factory, manifest and runtime modules must remain under `assets/art/fire-realism/`, excluding `optimized/`. Optimized code is self-contained under `assets/art/fire-realism/optimized/`; it cannot silently share or mutate the frozen reference closure. A future extension permitting shared reference helpers would need explicit review and identical already-verified reference bytes. Receipts must be JSON under architect-owned `docs/reviews/fire-realism/`.

Every configured path is strict project-root-relative, with no empty/hidden/dot/traversal segments, backslashes, encoded escapes, URL schemes, query or fragment. Fetches use `redirect:error` and `cache:no-store`; changed response URLs or redirect receipts reject. Manifest/runtime/receipt bytes are SHA-256 verified with required Web Crypto, without line-ending normalization. Duplicate JSON keys, duplicate or case-aliased runtime paths, missing entry membership, unlisted dependencies, extra unreachable modules and invalid raw byte counts reject. The static ESM dependency graph must be complete and self-contained. Only unescaped `./...js` import/re-export specifiers are supported; dynamic imports, import attributes and `import.meta` are outside this closure contract. Template expressions are scanned as code; comments/string/template text/regex bodies are not mistaken for static imports. This verifier is not a JavaScript sandbox or a general proof about arbitrary evaluated strings or network operations; source review remains required.

All configured mode closures and receipts verify before the first artist module import. The imported named export must be an own function; missing/malformed files, exports, bytes or receipts throw rather than using default reference. Optional receipts must match the established architect receipt kind, exact mode commit and complete runtime hash set. Optimized receipts must also name the configured frozen reference commit. No descriptor status field or manifest availability flag creates quality approval. Synthetic receipt fixtures exist only in tests.

A 404 for the descriptor alone returns `{status:'unconfigured', artistDelivery:null, referenceAcceptance:null, descriptor:null}`. It grants no acceptance. A configured result returns `artistDelivery.byMode.reference` and optional `byMode.optimized` with their actual imported `createFireRealism`, declared source commits and absolute resolved project-local `manifestUrl`. Their raw descriptor fields remain attached. Reference acceptance returns separately as `referenceAcceptance`; optimized acceptance uses the existing `byMode.optimized.retainedQualityAcceptance`. The descriptor's actual raw SHA/byte count is returned as diagnostic evidence. No new UI approval switch is introduced.

## Cold document and cache contract

Call the default loader once on a fresh document before any artist-module evaluation. A second call, including retry/reconfiguration after an aborted or missing-descriptor load, rejects and requires a new document. The driver no longer statically evaluates default reference art. Configured delivery requires its supplied verified factory and never falls back. Only unconfigured debug initialization may first verify its default manifest/static closure, then dynamically import default reference; that path keeps a null source commit and no quality receipt. Truthful older flat reference-factory arguments remain supported by the driver, but are not a substitute for the configured loader's byte/closure proof.

Serve immutable bytes for the entire boot and measurement. Native ESM import fetches/evaluates by its canonical module URLs after verification; there is no source rewriting or hash-query cache busting. The loader cannot vouch for modules evaluated elsewhere beforehand, warm module maps, service-worker substitutions or files changed between verification and native import. Do not hot reload a frozen delivery. Fetch/hash aborts prevent imports; an already-begun native import cannot be undone, but abort prevents returning its factory or importing later modes. Use a fresh document afterward. `createFireReviewDeliveryLoader` and injected transports allow isolated offline test contexts; they do not prove a real document was cold.

## Repository Git-blob proof

Browser verification proves source format and served bytes. It cannot establish that a declared 40-hex source commit actually exists in the repository. Before using any configured descriptor, run:

```sh
node tools/fire-realism/check-delivery.mjs
```

`--root PROJECT` is available for a deliberately selected repository. The command is read-only, executes no artist factory and creates no receipt. It verifies the same raw closure and receipt rules, requires each named SHA to be an actual commit, requires regular Git blobs at the named manifest/runtime paths and compares their exact bytes with the current working files. It rejects symbolic-link resources and paths resolving outside the repository. Receipt bytes are pinned by the descriptor but may be authored after the immutable artist commit; the command makes no claim about receipt authorship or visual/GPU acceptance. `tools/check.mjs` invokes this proof only when the optional descriptor exists. Missing descriptor reports unconfigured and leaves debug preview available.

Focused tests cover configured R/O routing and pre-import ordering, absent metadata, malformed paths/commits/receipts/JSON, corruption, complete static dependency closure, missing exports, redirects, Crypto absence, aborts and cold reload rejection. They also verify the actual committed artist closure without evaluating it, and exercise named commit/regular-blob mismatch detection in a finite synthetic temporary Git repository removed afterward. No browser, server or retained helper is needed for these checks. Actual configured cold-browser boot, quality acceptance, immutable reference freeze and valid hardware measurements remain architect gates.

Validation: all 230 repository tests, 169 script syntax checks, 206 static module resolutions, pinned provenance and existing art checks pass. The public build remains 3,464 files / 163,352,080 bytes; no public game or artist source files changed. `git diff --check` passes. The optional descriptor is absent, so the CLI correctly reports unconfigured. The actual current primary artist manifest/five-module closure also passed a read-only raw-byte verification without module evaluation. Synthetic test repositories are removed in `finally`; no browser, server or retained helper remains.
