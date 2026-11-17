This is the source evidence for the [M29 support-preparation handoff](../support-preparation-v1.md), authority `0e4136029ecc832210e91dd609583e528e5bdfef`. No shipping dataset, large-source measurement, renderer or deployment is included.

| Evidence | Purpose |
| --- | --- |
| `extraction.json`, `extract.mjs` | Pinned `55cd` original source fragments and historical mutating extraction command; do not rerun the command over the candidate |
| `audit.mjs`, `source-audit.json` | Reconstruct the exact math/default graph, check the five scoped production source paths and preserve the unrelated WIP |
| `compiler-dependencies.json`, `source-pins.json` | Full offline compiler/producer/schema closure and exact raw New York input pins |
| `checks.mjs`, `checks.json`, `focused.log` | Final 64/64 focused correctness checks and finite child-process exit receipt; test durations are not an optimization benchmark |
| `initial-prepared-tests.mjs`, `initial-source-support-world.mjs`, `initial-focused-failure.json` | Initial 12/14 expanded test attempt with its two fixture failures; the JSON summarizes errors and the source snapshot hash, not raw stdout |
| `fixture-correction.json`, `fixture-correction.log` | Both corrected fixture cases pass without support-math changes |
| `large-proof-metadata.json` | Metadata-only large-source/pair selection with zero native source expansions; box-face estimate is not a native fragment bound |
| `handoff.json`, `manifest.json` | Final scope/check summary and raw hashes of this evidence archive |

From the repository root, run `node docs/engineering/shared-maps/support-preparation-v1/audit.mjs` and `node tools/record-shared-map-runtime.mjs --check` for static checks. The auditor requires the explicitly preserved coder WIP hash; in an architect checkout, review that worker scope assertion separately rather than overwriting another task's WIP. Focused correctness is `node docs/engineering/shared-maps/support-preparation-v1/checks.mjs`. Fresh receipts go to `artifacts/qa/shared-map-runtime/support-preparation-v1/`; these archived bytes are not overwritten.

The independent reference graph comes from Git object `55cd9b597744244fbd0168939b13fbc66662d7b3:src/simulation/source-support.js`, checked against LF SHA-256 `1e6bd6ec6921119af942cce3e3fc69bf2449b0b3ead543697f88e435039bd98c`. No new donor file or license is imported. Existing native geometry/compiler provenance remains unchanged. No helper is retained; the saved correctness receipt records the finite Node child ending with exit status zero.
