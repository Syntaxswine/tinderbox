# Portable prepared-support codec v1

This is a fenced source handoff to the coder under the architect's [consumer decision](https://github.com/Syntaxswine/tinderbox/blob/0e4136029ecc832210e91dd609583e528e5bdfef/docs/engineering/shared-maps/support-bake-consumer-decision.md). It encodes only the four [archived blocks](../blocks.json) from `e3c352265862ad39046128a9b27b2a5c10f1e6fa`. Raw blocks, source copies, proof logs/results/hashes remain unchanged. The human parent README's UTF-8 repair is a separate commit, `5ba76f6b`.

**Transport validity is separate from reviewed-byte identity and native applicability.** CRC32 detects wire corruption. It does not authenticate a shard, verify archived SHA-256 block/source signatures, approve a source/algorithm/grid/pose, or admit edges to gameplay. The decoded descriptor, source, algorithm, grid, owner-state, ordered IDs and hash fields round-trip unchanged. The coder still owns revision-pinned manifest/payload verification outside input callbacks, complete native applicability validation, fallback and eventual consumer integration.

## API for coder intake

`codec.mjs` has no imports or Node globals. It uses `TextEncoder`, fatal UTF-8 `TextDecoder`, typed arrays/DataView, Map/Set and ordinary ECMAScript. Filesystem and SHA-256 operations live only in `prepare.mjs` and the pure test harness.

```js
import {
  encodeSupportBlocks, decodeSupportBlocks,
  packResult, unpackResult, DEFAULT_LIMITS, WIRE_FORMAT, SupportCodecError
} from './codec.mjs';

const bytes = encodeSupportBlocks(archive);       // Uint8Array
const restored = decodeSupportBlocks(bytes);     // detached JSON containers
const tagged = packResult(false);                // {type:'boolean', value:false}
const nativeResult = unpackResult(tagged);       // false
```

Input/output archive shape is the existing `{format,sourceCommit,base,scope,entries}` envelope. Extra JSON identity metadata is retained. Each block must contain `{descriptor,signature,edges,result,blockSha256}`. `descriptor` is opaque JSON identity data; the codec validates transport/schema/bounds, not its application meaning. Source commit and signature/hash field syntax are checked; their contents are not rehashed by the portable module. Typed results are exactly `{type:'undefined'}` or `{type:'boolean',value:true|false}`. `unpackResult` returns native `undefined`, `true` or `false`.

Both encode/decode accept `{limits:{...}}` as a second argument. Overrides may only tighten the hard ceilings below. Complete failure throws `SupportCodecError` with a `code` (`LIMIT`, `SCHEMA`, `RANGE`, `DUPLICATE`, `TRUNCATED`, `CORRUPT`, `FORMAT` or `UTF8`). Decode returns once, after the entire payload passes validation. It supplies no edge-emission callback. Caller integration must treat every rejection or unavailable shard as an original-calculation fallback before emitting any edge.

Use decoding and pinned-byte checks in the preparation/loading phase, then hand the complete result to the coder-owned applicability validator. This directory installs no provider, loader, async wait, graph hook, source activation or runtime import.

## Wire layout

| Offset/region | Encoding |
| --- | --- |
| 0..3 | ASCII `TBSB` |
| 4..7 | Version 1, flags 0, reserved uint16 0 |
| 8..23 | Four little-endian uint32 values: exact total bytes, dictionary count, entry count, total directed-edge count |
| Dictionary | First-use-order unique UTF-8 strings, each prefixed by a canonical unsigned u32 varint byte length |
| Payload | Ordered JSON token tree; keys and string values reference dictionary indices; dedicated edge lists contain ordered pairs of dictionary indices |
| Last 4 bytes | Little-endian IEEE CRC32 of every preceding byte |

Tokens 0..7 are null, false, true, float64 LE number, dictionary string, array, ordered object, and ordered edge list. Array/object/edge counts and dictionary indices use canonical unsigned u32 varints. Object keys are emitted in their original JavaScript enumeration order, including canonical integer keys. Strict UTF-8 retains original Unicode/BOM strings without normalization; ill-formed surrogates/UTF-8 reject. Finite float64 values retain negative zero; unsafe integers reject. Non-JSON values, cycles, sparse/extended arrays, getters, symbols and hidden fields reject.

Dictionary coding covers original IDs **and** repeated keys/hash/identity strings, so the ID/string ceiling is conservative. The codec never sorts, remaps, reverses or silently deduplicates an edge. It rejects repeated dictionary strings, block signatures, object keys, directed edges, self-edges and out-of-range references. Opposite directions remain distinct. Repeated calculation keys with different signatures/owner states remain valid.

## Limits, allocations and lifecycle

| Limit | Hard ceiling |
| --- | --- |
| Encoded bytes | 262,144 |
| Entries | 64 |
| Edges per entry / all entries | 4,096 / 8,192 |
| Unique dictionary IDs/strings | 4,096 |
| UTF-8 bytes per ID/string / total dictionary | 1,024 / 131,072 |
| Logical decoded nodes / nesting depth | 32,768 / 24 |
| Keys per object / elements per array | 128 / 8,192 |

These are codec guards for this source handoff, not approved production dataset budgets. A larger source must reject/fall back until a separately reviewed format/budget change. They do not establish large-carrier coverage.

Decode checks the input-byte cap before copying and header counts before allocating dictionary entries. It takes one private bounded byte snapshot, verifies CRC, then scans all tokens/ranges/counts/schemas/duplicates before materializing any decoded object or edge pair. Length prefixes, truncated values, overflowing/noncanonical varints and trailing bytes reject. The second pass materializes the already-validated payload from the owned snapshot; no caller/worker mutation can change it between passes. A VM test spies on object materialization and confirms zero decoded objects for a CRC-valid late duplicate-edge failure.

Encoder peak additional payload storage is the capped dictionary UTF-8 buffers (at most 131,072 bytes), the output buffer (at most 262,144 bytes), bounded string-index/validation tables and traversal state. Oversized strings stop at the byte ceiling; duplicate-edge checks retain ID references without serializing temporary edge keys. Decoder peak additional payload storage includes its private buffer (at most 262,144 bytes), at most 4,096 decoded strings from 131,072 UTF-8 bytes (up to 262,144 UTF-16 data bytes), bounded validation tables, and the capped decoded graph. Its node budget counts each edge pair plus both ID references. Exact object/Map/Set overhead is engine-dependent; these bounds are logical allocations, not a heap-byte measurement.

Tables and parsed containers are local to each call. Returned containers do not alias caller input arrays or binary bytes. The module retains only reusable text encoders/decoder; it starts no timers, listeners, resources or caches. Callers release bytes and decoded archives when their source/visit ownership ends. Dataset residency, cross-shard memory caps, cancellation and trusted mutation identities remain coder/architect work.

## Saved data and verification

The four-block encoding is [four-saved-blocks.tbsb](four-saved-blocks.tbsb): **3,253 bytes**, compared with 10,839 archived JSON bytes; **74 dictionary strings**, **4 blocks**, **28 directed edges**. This is a byte-size result for the saved small-floor data, not a speed, latency, heap or whole-map estimate. [Codec package record](codec-package.json) pins binary/source/test SHA-256 values and preserves all four original signature/hash pairs.

**27 focused pure tests pass** in [tests.tap](tests.tap). They cover all four saved blocks individually and together, exact re-encoding and JSON/key/edge order, synthetic false plus true/undefined, Unicode and negative zero, every truncated prefix, lowered limits, CRC corruption, CRC-valid structural corruption, overflows/ranges, duplicate data, invalid typed results and safe object-key handling. Synthetic result/identity tests establish codec behavior only; no new world data or native false-result gameplay proof is claimed.

The compatibility smoke test runs source in a `vm` context supplied only browser-standard globals, with Node globals unavailable. It does not launch a browser, renderer or server. The first attempt had a test-harness string syntax error; [failed TAP](attempt-01-syntax.tap), [exact failed source](history/attempt-01-syntax.test.mjs.txt) and [exact syntax correction](history/syntax-correction.json) preserve it. The [25-test pass](attempt-02-passed-25.tap) preceded the lowered-edge-array-limit regression; the [26-test pass](attempt-03-passed-26.tap) preceded the oversized-ID allocation guard. Both focused regressions pass in the final suite.

Commands used (ordinary foreground processes, no retained helper):

```text
node --test --test-concurrency=1 --test-reporter=tap docs/engineering/shared-maps/support-bake-prototype/portable-codec-v1/codec.test.mjs
node docs/engineering/shared-maps/support-bake-prototype/portable-codec-v1/prepare.mjs
```

`prepare.mjs` reads only the pinned archived JSON, checks its existing SHA-256 and each saved descriptor/block hash, writes the encoded copy and checks exact round-trip/re-encoding. Its output naming was clarified from `package.json` to `codec-package.json`; no npm package or installation is created. Original world proof, raw evidence and source manifests were not rerun or rewritten. No world simulation, new source dataset, benchmark, runtime/asset/UI change, build, browser, renderer, helper, donor write or train edit belongs to this handoff.
