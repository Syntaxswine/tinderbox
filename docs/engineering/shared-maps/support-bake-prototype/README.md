# Offline support-block feasibility: one New York fixture

**Review candidate only.** Frozen source is `822038cc7c3f3814f8aaa8e48c7973304b384fc2`, using accepted support module `55cd9b597744244fbd0168939b13fbc66662d7b3` with LF SHA-256 `1e6bd6ec6921119af942cce3e3fc69bf2449b0b3ead543697f88e435039bd98c`. The architect's [bounded contract](https://github.com/Syntaxswine/tinderbox/blob/codex/review-cross-map-fire/docs/engineering/shared-maps/support-bake-prototype-contract.md) governs this investigation. Coder owns any eventual production consumer.

The mechanism is feasible for these static blocks: preparation records the original calculation's directed edges and typed result, then a fenced proof substitutes those records at the original cache-miss boundary. Four blocks (10,839 bytes, 28 directed edge records) replayed with identical graph order, support decisions and complete native physical snapshots. This does not establish a fix for the observed 2,599.9 ms flame-release delay or a game speedup.

## Exact scope and source

- Existing fixture: `tests/integration/source-continuity.test.mjs:63â€“74`, using its compact New York sources and original activation/clipper. Narrowed to the existing floor control `new-york::carrier/main-floor/tile--2-0` (carrier index 3199).
- One original ordered pair: `assets/runtime/map-sources/new-york/index.json`, `contacts[7397] = [3199,3200]`: `tile--2-0` **first**, `tile--2-1` second. No reverse-pair scan, sorting, re-ID, new triangulation or whole-map bake.
- Native source code: `src/simulation/source-support.js:46â€“50` captures/caches a calculation; `75â€“86` emits ordered edges and contacts; `96â€“117` owns rebuilding; `120â€“124` owns live filtering, support decisions and disposal. Its continuity predicate remains `visitSourceContinuityCandidates` at `24â€“30`; `workbenches/furnished-house/support.js:8â€“20` remains the contact predicate.
- [Source manifest](source-manifest.json) records 29 exact LF dependency hashes, three raw asset hashes, original/copied hashes, fixture pin, and import relocations. [Original module](source/original-source-support.txt), [reference copy](source/reference-support.mjs) and [prototype copy](source/prototype-support.mjs) remain separate. The exact [relocation delta](source/import-relocation.patch) and [hook delta](source/prototype-hook.patch) are auditable.

Only import paths differ in the reference copy. The prototype adds an optional `bakeHooks` argument and read/record instrumentation inside `calculate` on an original in-memory cache miss. It replays through the original `add`/capture routine and stores the same original cache entry. Existing registration, watches, rebuild schedule, anchors, declared relations, exceptions, live filtering and disposal remain unchanged. Skipping a build changes build-only `topologyCache` counters; semantic diagnostics and physical state must agree. No production source imports these copies.

## Proposed format and identity

[blocks.json](blocks.json) is the small illustrative shard. Its top-level format is `tinderbox-support-blocks-prototype-v1`, with exact source/producer identities and entries. Each entry holds:

```text
{ descriptor, signature, edges: [[originalFromId, originalToId], ...],
  result: {type: "undefined"} | {type: "boolean", value: true|false},
  blockSha256 }
```

`signature` is a SHA-256 identity, not an authenticity signature. The descriptor binds the exact original algorithm hash, complete dependency-set hash, source index/library/navigation hashes, proof-format hash, calculation key and ordered owners. It also binds the current grid origin/pitch, portal pose states, each owner's cold/active status, original fragment-ID order, carrier/part metadata and a hash of all current support geometry/pose fields. Source matrices, layouts, bounds, original fragment IDs, normals, kind, thickness, all native triangle representations, intact/open state and support bindings enter that identity. Negative zero is distinguished in geometry hashing. The prototype conservatively includes all portal states, so an unrelated door may cause a miss.

The key uses existing compact source metadata/hashes for cold owners; it does not call the cold-shape transformer. Active geometry is read from current authoritative fragments. Entries contain IDs and hashes, without cold triangle arrays. Emission order and per-node neighbor insertion order are preserved. Typed results retain continuity's `undefined`, which ordinary JSON would otherwise omit. A shipping manifest must pin reviewed shard bytes and producer/schema versions; the checksum alone does not authenticate an untrusted bake.

| Endpoint ownership | Original/replay treatment | Recorded block |
| --- | --- | --- |
| cold / cold | Original metadata link at `connectContact:85`; bypasses `calculate` already | None needed |
| active / cold | Original first-owner fragments â†’ exact cold second-owner ID | 4 directed edges, `true` |
| cold / active | Exact cold first-owner ID â†’ original second-owner fragments | 4 directed edges, `true` |
| active / active | Exact original first/second iteration order | 8 directed edges, `true` |
| First carrier continuity | Four original floor fragments, original ID-directed predicate calls | 12 directed edges, `undefined` |

The last row is deduplicated across ownership cases; no second carrier continuity block is baked. This selected pair produced no serialized `false` result; false encoding is defined but its replay is outside this proof.

## Rejection, retirement and original fallback

A missing shard/entry, source or algorithm mismatch, changed layout/grid/owner/ID order, unknown geometry or pose, invalid result/edge identity, oversized block or bad checksum must reject the record. The original calculation runs synchronously with its unchanged arguments. No record is approximated, remapped, partially used or awaited in an input callback. Corrupt/unavailable file handling belongs outside the production graph; this prototype implements no network loader or production consumer.

The proof retains the original in-memory dependency watchers/invalidation and one-current-block-per-calculation policy. On source addition or boundary change the original owner invalidates its calculation. The external identity is checked again on the next cache miss. A retired original fragment remains the same authoritative node with `intact:false`; later activation cannot replace its edge with a nearby surviving fragment. Replayed edges still pass through the original graph's live filtering and exception rules. Shards are immutable preparation records; they do not contain saved heat, fuel, support reachability or live damage decisions.

## One execution and measured bounds

One hidden Node fixture process, PID **28720**, created **2026-11-17T13:01:00.0917351Z**, exited normally after **9,183.815 ms**. The parent enforced a 55-second deadline; the harness checked a 50-second cooperative bound, within the authorized 60 seconds. [Process identity/deadline/exit](process.json), [raw result](result.json) and [stdout](stdout.log) preserve the evidence. All **22** transient worlds disposed, zero remain. This was the only fixture process. [Independent cleanup](cleanup.json) confirms the PID is absent and no TCP ports remain. The installed runtime was Node 24.15.0; dependencies are the pinned repository ES modules, with no package installation.

| Observation | Result and practical limit |
| --- | --- |
| Complete harness | 8,871.617 ms; 25 exact original/prototype comparisons, sequential cases |
| Preparation phase | 2,963.556 ms, including paired world construction, activation and parity checks; isolated geometric bake cost was not measured |
| Serialized payload | 10,839 UTF-8 bytes; 4 blocks; 28 directed edge records |
| Read/parse/check of just-written shard | 0.3393 ms; warm local file, not network or cold-storage latency |
| Five successful replay lookups | 1.5317 ms total identity construction, 0.7414 ms total lookup/validation in this single run; no target native builds on those hits |
| Physical scope | At most 2 expanded native floor carriers, 8 active graph fragments and 96 thermal cells; each fresh world started with 0 thermal cells |
| Existing compact inputs | 12,666,343 raw bytes total; the full existing cold metadata graph remains, with 12,446 carriers and 25,198 indexed contacts. This proposal does not reduce that startup metadata |

The four cold/active combinations compare exact directed graph/node/neighbor order, pending cold sources, unsupported active IDs, non-cache support diagnostics, complete trial snapshots and canonical stock ledgers before/after a native physical step. Clocks and all recorded heat/fuel/boundary/event/fall fields agree.

Local loss retires one original first-floor fragment, forces the original rebuild, activates the same second floor later, and compares again after a native step. The original ID/object persists, other first-floor fragments remain live, and the loss signature invokes the original calculation. A separate diagnostic translates that same fragment 0.125 m in both worlds; its unbaked geometry also invokes the original calculation. The selected floors remain supported: pending/unsupported counts are zero, and this does **not** prove a collapse, mount failure, fire response or rubble outcome.

Six stale-key changes (algorithm, source/layout, grid, ownership, ID order and pose) plus invalid edges/result/checksum and a missing record are rejected at the format boundary. Missing-shard, local-loss and changed-geometry cases additionally exercise native fallback in the actual paired graph. Format-only grid/algorithm negatives are not resimulations under a new grid or algorithm.

## Loading proposal and remaining risks

- Prefer a small revision-pinned manifest plus lazily fetched source-local continuity and ordered-pair shards. Preserve pair orientation in the shard identity. Request only the current source neighborhood; do not load an all-landmark baked edge graph or allocate a dense thermal world at startup.
- Keep the existing bounded live calculation cache; admit one current block per calculation. This proof caps a shard at 256 KiB and a block at 4,096 edges as fixture guards, not approved production budgets. Byte/edge limits, residency/eviction and loading measurements still need coder/architect review. An over-limit source uses the original path.
- An absent, evicted, corrupt, unfinished or stale-visit request immediately falls back. Background delivery must be generation/ownership checked before later use and cancelled/discarded with the existing visit lifecycle. No new loader, retained task helper or asynchronous runtime action is implemented here.
- Geometry hashing, trusted-byte verification and shard parse/allocation can consume the saved work. Stable prevalidated native source identities could avoid repeated hashing only after their mutation/invalidation contract is proved; this experiment supplies no such optimization. Source changes, clipping/grid changes, partial activation and door poses may multiply variants or defeat hits.
- General mounts/declared relations, unsupported-source activation cascades, moving doors, demolition/falls/rubble, heat input, tools/player clocks, actual phone latency and the whole-map support-build cost remain unproved by these two floors. Those paths keep the frozen original behavior. Further fixtures, loading policy and a consumer require a separate review; do not extrapolate this payload size or one observation to the landmark or FPS.

## Delivery and restart

[Source/delta/payload checks](checks.json) passed alongside the single behavior proof. Only this fenced directory changes relative to the frozen base. Production source/assets/controls remain byte-identical to that base; completed UI work and train candidate `fb0628605c274550ff8abad50b151843f08747d1` are preserved.

[run-once.ps1](run-once.ps1) records the existing Node executable, arguments, working directory, process identity, end condition, deadline and finally stop method. The retained source/manifest/shard/results supply a restart record; no in-memory world is retained. The launcher refuses a second run when `process.json` exists. This assignment's one-process budget is spent; any deliberate new fixture run requires renewed authorization. No service, watcher, browser, renderer, build, donor write or automatically replayed restart was created.
