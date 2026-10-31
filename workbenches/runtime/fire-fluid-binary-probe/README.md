# Small verified binary preload fixture

This QA-only fixture reuses every exact gzip chunk from the accepted Stage 1 payload proof. It tests the real candidate loader/provider/bootstrap and direct RGBA cache, without a renderer or game changes. Generated files remain ignored. The descriptor's repeated-1 commit is explicitly synthetic: it is not a Git/source/quality acceptance claim and must not be copied into the public descriptor.

```powershell
node workbenches/runtime/fire-fluid-binary-probe/build.mjs --stage1 artifacts/qa/fire-realism/fluid-payload-stage1-final --output artifacts/qa/fire-realism/fluid-binary-stage1-reviewed
node workbenches/runtime/fire-fluid-binary-probe/check.mjs artifacts/qa/fire-realism/fluid-binary-stage1-reviewed
```

Use a fresh output directory; prior evidence is preserved. Original `asset.js.txt` is a source template emitted as the verified index.js, with generated metadata and the unchanged packet codec/direct RGBA adapter. Native Node import compiles/evaluates the actual emitted bytes only after verification. The committed browser host imports the repository loader; the generator rebases that one import to its isolated tools copy, keeping the test cohort independent of primary source mutations.

The generated directory includes exact loader/profiling/resources source copies and their raw hashes in probe.json. Copy it unchanged to the same ignored location under the architect's existing server, then open index.html and click Run binary boot audit. Fresh documents with `?case=tamper`, `?case=missing` and `?case=cancel-prepare` exercise rejection/cleanup. The UI exposes exact JSON and a visible data export. It starts no server/browser/helper and introduces no comparison controls or production UI.

Successful boot verifies every configured source/resource before artist import, consumes each gzip once through the loader-owned provider and verifies 72 decoded scalar hashes against original metadata. The synchronous fixture owns only two RGBA slots. The host independently extracts one scalar channel into a separately reported audit-only scratch buffer for Web Crypto, not a retained renderer plane. Reimporting the same module neither prepares nor inflates again. Disposal releases owned dense slots; shared decoded bytes remain document-lived. Close the document to retire the native module map.

The reviewed cohort's native Node and actual IAB proofs match all 72 original channels: 35,660 ESM / 174,481 compressed / 363,108 sparse bytes. Two RGBA slots use 262,144 bytes, then zero owned dense bytes after disposal. Actual tamper/missing cases have zero imports; actual preparation cancellation reports one cleanup, ready=false and zero owned sparse/dense bytes. This proves small transport/byte/layout behavior, not the 193-sample budget, texture upload, flame images or GPU savings. See [binary-delivery.md](../../../docs/engineering/fire-realism/binary-delivery.md) for the full contract and evidence.
