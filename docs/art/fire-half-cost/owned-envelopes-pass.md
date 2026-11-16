# Owned geometry and static envelope correction

Source checkpoint: `68ac1f908a902e91a036e12c8f03ab9bee5b463e`. The shared leaf `src/reuse/publication-geometry.js` is copied **byte-for-byte** from coder checkpoint `f2ef339e222d956bf2da767c658f16f76b56603b`; its Git-blob SHA-256 is `94cbb817e238f00d4aae4e039c75cda87d29585b856f12665b596007c4260fdf`. No coder producer changes were copied into this artist branch.

`visibility.js` recognizes the leaf's private factory proof before generic certification, avoiding a redundant descriptor walk and second clone. Generic ordinary frozen, mutable, partially frozen, accessor-valued and Proxy behavior remains unchanged. Factory proof does not bypass triangle-shape/finite-value validation.

Each current source also retains at most one flame and one smoke envelope. Keys contain the helper's exact channel, part, position, normal, selected-bounds presence and complete min/max lengths/values. The original `houseEffectBounds` math is unchanged. Camera/frustum, cutaway, wind eligibility, time and animation remain live; unknown wind still produces null envelopes. Unsupported channels retain the original uncached null result. Entries prune with source ownership and clear on reset/disposal. No q/frame/camera is retained.

`inspect().emitters` now returns detached diagnostic data, preventing callers from corrupting cached bounds. New counters are `preparationCache.effectBoundsEntries` and `effectWork.work.{effectBoundsComputations,effectBoundsCacheHits}`.

Seventeen [focused controls](../../../tests/integration/fire-preparation-cache.test.mjs) pass. Owned inputs cause zero consumer descriptor reads/second clones; generic frozen inputs still take the original certificate. In the four-source control, a fresh animated frame goes from eight cold helper calls to zero recomputations/eight hits with exact reference output. Position/normal/support changes rebuild; camera/wind/cutaway/fall/reset and inspection mutation remain covered. These counts are correctness/work evidence, **not timing savings**. [Checks and hashes](owned-envelopes-checks.json) record exact scope.

| Publication + art CPU | Mean | p95 |
| --- | ---: | ---: |
| Preserved round-three reference | 29.363 ms | 33.800 ms |
| Preserved round-three candidate: full gate failed | 14.304 ms | 18.400 ms |
| Required absolute ceiling, plus half the fresh reference | 14.025 ms | 17.550 ms |
| This correction | Pending shared measurement | Pending shared measurement |

Finishing, prepared geometry/envelope math, motion, shaders, native body fire, physics and Source-pool lifecycle remain unchanged. Prior failed evidence/checkpoints are preserved. No helper, browser, render or benchmark was started. Architect/coder retain the combined gate and matched comparison; no final cost/quality acceptance is claimed.
