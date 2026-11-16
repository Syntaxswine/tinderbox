# Private prepared-bounds correction

Source checkpoint: `522d8c0e1cc31728bf1f90a19b8d6410e0dca68a`. This patch changes only `visibility.js` and its focused controls. Its artist base includes unsupported-channel guard `68ac1f90`; the exact combined tree must identify whether that guard is included. Coder companion `30bf843190174436b05c0324c36208fa794180a0` is separate and was not copied into this worktree.

The updated, closed coder profile attributes about 0.504 ms sampled self time per native state to `effectBounds` key matching. This is diagnostic attribution, not a benchmark saving.

`prepare()` now deeply freezes only the **new bounds object/min/max it creates**, registering that object in a private per-cache WeakSet. Caller geometry remains mutable. The same privately proven selected bounds can hit by identity after exact part/position/normal checks. Different private bounds invalidate; plain, partially frozen, accessor-backed, deeply frozen and forged caller bounds retain complete coordinate/length checking. Unknown wind, camera/frustum and cutaway remain live. Clear replaces the weak proof; existing pruning and two-envelope/source bounds remain. No frame, camera or animation result is cached.

Eighteen [focused controls](../../../tests/integration/fire-preparation-cache.test.mjs) pass. The new control observes **zero coordinate comparisons** on a private hit versus **six** for unrecognized bounds, verifies caller mutability/private freezing, changed geometry, retired proof after clear, and exact frozen-helper output. Earlier paired animation/pose/fall, generic geometry and detached inspection controls remain passing. [Checks and Git-blob hashes](private-bounds-checks.json) record scope. Preparation evaluation order and original envelope math are preserved; finisher, shaders, motion, physics and Source ownership do not change.

| Publication + art CPU | Mean | p95 |
| --- | ---: | ---: |
| Preserved round-four reference | 28.4300 ms | 34.6000 ms |
| Preserved round-four candidate: full gate failed | 14.2475 ms | 18.1000 ms |
| Required absolute ceiling, plus half the fresh reference | 14.0250 ms | 17.5500 ms |
| This correction | Pending combined measurement | Pending combined measurement |

No helper, browser, render, profile or benchmark was started. Prior failed results remain preserved. Combined checks and the unchanged paired performance/quality gate belong to architect/coder; this source checkpoint does not establish target success.
