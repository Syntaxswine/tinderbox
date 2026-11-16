# Structural fire preparation candidate

Source checkpoint: `02f1e63c5a4fb4e358f503f7789965e2c183af43` on `codex/fire-half-cost-art`, from the exact [M27 contract](../../milestones/27-half-cost-fire.md). Architect promotion remains separate.

The candidate caches detached geometry validation/bounds, primitive triangle/edge keys, tangent ranges, support-anchor preparation and connected envelopes. Primitive keys remain reusable when growing fire changes group membership. Motion phases are cached by stable ID; flames, smoke, wind, camera visibility, cutaway, doors and falling poses still update from current inputs.

Each current source/group keeps one latest entry. Replacement and pruning prevent historical-signature accumulation; reset/disposal clears ownership. Cache records contain geometry and primitive inputs, with no retained animated sample/frame. Per-structure `diagnostics().preparationCache` reports `sourceEntries`, `groupEntries`, `phaseEntries` and group hits/computations.

Runtime changes are limited to `art/source/catalogue-modular/thermal-art.js` and `art/source/furnished-house/{presentation,visibility,shroud}.js`. Native body shroud, Ashland renderer/shaders, immutable house/shop geometry and M26 Source ownership are unchanged.

| Shared production CPU target | Mean | p95 |
| --- | ---: | ---: |
| Frozen publication + art, new native ticks 721–780 | 28.050 ms | 35.100 ms |
| Required candidate ceiling | 14.025 ms | 17.550 ms |
| This artist candidate | Pending shared measurement | Pending shared measurement |

Eight [focused controls](../../../tests/integration/fire-preparation-cache.test.mjs) pass: exact anchors/envelopes/splats/packed submission, cloned and reused geometry, active-neighbor changes, camera/cutaway/wind, doors/falls/landing/collapse, rewind/reset and bounded retention/disposal, plus shared wall/house compatibility and empty-runtime-geometry fallback/rejection parity. Command: `node --test --test-concurrency=1 tests/integration/fire-preparation-cache.test.mjs`. Syntax/whitespace and all five frozen reference **Git blob** hashes pass; [checks.json](checks.json) records scope and source hashes.

The [uncached reference manifest](../../../art/source/catalogue-modular/controls/fire-half-cost/reference/reference.json) preserves the five affected original modules from the common contract. Existing source provenance/licenses are retained. These are CPU-only presentation fixtures, not new asset work or a game trajectory. No helper/browser/render/benchmark was started. The coder owns actual production replay, matched captures and paired CPU/GPU measurement; no 50% saving or visual promotion is claimed here.

The added empty-geometry control confirms the frozen Catalogue path accepts an empty runtime floor with a valid explicit footprint, but rejects a floor without that fallback and a wall lacking support bounds. No stricter policy was introduced.
