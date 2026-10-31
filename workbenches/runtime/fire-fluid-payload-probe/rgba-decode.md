# Direct scalar packet to RGBA upload bytes

This is an additive layout adapter for the artist's later Stage 2 factory. The reviewed `codec.js` and `runtime.js` stay unchanged. It introduces no data, texture, renderer, gameplay rule, clock or async per-frame operation.

```js
import {decodeZeroLiteralRGBA} from './rgba-decode.js';
// The artist allocates each current/next RGBA byte buffer once.
// Decode from borrowed shared-sparse packet views into those existing buffers:
decodeZeroLiteralRGBA(densityPacket, rgbaBytes, {voxelCount,channelOffset:0,stride:16});
decodeZeroLiteralRGBA(temperaturePacket, rgbaBytes, {voxelCount,channelOffset:4,stride:16});
decodeZeroLiteralRGBA(flamePacket, rgbaBytes, {voxelCount,channelOffset:8,stride:16});
```

The function is synchronous and returns the identical caller-owned `Uint8Array`. `voxelCount` must be a nonnegative safe integer matching the packet header. The target view must have exactly `voxelCount*16` bytes. `channelOffset` is the byte lane 0, 4, 8 or 12; `stride` defaults to 16 and any other stride rejects. The artist initializes reserved alpha explicitly and owns its upload/texture meaning; decoding the three scalar lanes does not touch it. Nonzero packet/target view offsets work, with all accesses relative to the views. Overlapping source/destination ranges reject; separate regions of one backing buffer are supported. Inputs must remain unchanged during the synchronous call.

A complete validation pass checks version/header, tag counts, positive runs, source lengths, exact output count and trailing bytes before any target write. A second pass writes u32LE words directly at 16-byte intervals. There is no float conversion, so signed zero and NaN payloads retain their original bits. Zero runs write positive-zero bits to only the requested lane. Malformed/layout errors leave all destination bytes unchanged.

The helper allocates zero explicit backing-buffer scratch bytes and no dense scalar plane. It creates three constant `DataView` wrappers in a valid call, including the existing packet header helper; JavaScript wrapper heap overhead is engine-managed and unmeasured. Constructor instrumentation verifies zero `Uint8Array`/`ArrayBuffer` allocations and three `DataView` constructions. This is not a zero-heap, resident-RAM or GPU claim. Caller-owned current/next RGBA storage is separately `2 * voxelCount * 16` bytes; shared sparse/source/boot transients remain separate. Borrowed packet subarrays are views, not copied planes.

For a self-contained artist asset, copy this original adapter and unchanged `codec.js` into that asset's own closure, preserve their provenance and add both raw files to its strict manifest. The artist owns packaging and the 193-sample `.samples`/`.ageSeconds` metadata mapping; this helper does not read or reinterpret that dataset. Borrow packet slices directly from the artist's shared sparse store; do not use the Stage 1 fixture's `frame()` API to materialize planes. Update only the two reusable RGBA upload slots, never retain additional RGB/scalar frame pairs. This adapter alone does not approve the future factory, data budgets, actual texture upload or visual output.

Focused tests cover all four lanes, simultaneous RGB writes with alpha canaries, byte-offset subviews, raw signed-zero/NaN/infinity/subnormal bits, malformed/truncated/trailing/overflow packets leaving the target intact, invalid layouts, source-target overlap, scratch-constructor counts and unchanged reviewed source hashes.

Validation passes 260 repository tests, syntax for 186 owned scripts, 223 static modules, shared-Three/provenance and existing art checks. Seven focused decoder/payload tests pass; no actual GPU upload or image acceptance is claimed. The separate helper is 2,463 canonical-LF bytes, SHA-256 `f65406957394a5fbf1202f0128d56a80f223893df07fda5911e95ff3f5c790e3`. Only this new helper, its tests and this guide change; no retained helper process exists.
