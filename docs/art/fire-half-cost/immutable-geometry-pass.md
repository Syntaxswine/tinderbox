# Immutable geometry preparation pass

Source checkpoint: `8c19cc9077f90f02ea038cf6a4299f4607811b48`. This additive correction preserves artist leaf `bb91b404` and the failed first comparison; it does not implement the rejected material-finisher proposal.

The coder's bounded ticks 721–780 profile attributes 116.759 ms total to `matches` across 60 frames (about 1.95 ms/frame). Geometry and classification totals are inclusive, not additional costs. The finisher callback costs only 1.085 ms total, so it remains unchanged.

Certified, deeply frozen geometry now reuses preparation by array identity across current sources. Certification requires dense ordinary arrays, frozen descendants and finite own data values; indexed accessors are excluded. A one-time clone rejects Proxies. Eligibility is weakly cached. Mutable, partially frozen, accessor-backed and uncertified inputs retain exact value comparisons. Equal immutable clones can reuse the source's existing numeric preparation after certification/value checking.

The active immutable-geometry map prunes unused identities each update and clears on reset/disposal. Certification retains only weak keys/booleans. No animated sample, frame or camera is cached. `diagnostics().preparationCache.immutableEntries` exposes the active geometry count. Publication should retain frozen DTO identities to obtain the fast path; newly cloned arrays remain correct but need their own certification.

Twelve [focused controls](../../../tests/integration/fire-preparation-cache.test.mjs) pass, including persistent/cloned frozen geometry, partial freezing with mutable descendants, frozen accessor-valued points, cross-source sharing, Proxy fallback and bounded replacement/reset/disposal. Original animated-output and same-ID mutation controls remain. [The check record](immutable-geometry-checks.json) contains exact Git-blob hashes and scope.

| Publication + art CPU | Mean | p95 |
| --- | ---: | ---: |
| Preserved round-one reference | 29.284 ms | 38.400 ms |
| Preserved round-one candidate: target missed | 16.707 ms | 21.600 ms |
| Required absolute ceiling, plus fresh paired half-cost gate | 14.025 ms | 17.550 ms |
| This second pass | Pending shared measurement | Pending shared measurement |

Only `visibility.js`, the additive thermal-art diagnostic and focused controls change. Finishing, flame/smoke motion, shaders, native body fire, physics and Source-pool ownership remain unchanged. No helper, browser, render or benchmark was started. Shared combined checks, captures and paired CPU/GPU acceptance remain with coder/architect.
