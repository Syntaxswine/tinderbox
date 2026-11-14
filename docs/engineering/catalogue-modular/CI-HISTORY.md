# Pages checkout history correction

The Pages build for production commit `b3742bc5cefc650976405bbe2707d8667dc03aaf` failed before deployment in run `43560936872`: two regression tests read frozen ancestor files with `git show`, but the default depth-one checkout did not contain those objects. The other 394 tests passed. This is a CI checkout correction; no runtime, physics, art, test assertions or frozen expected source changes.

`.github/workflows/pages.yml` now sets `fetch-depth: 0` on the existing `actions/checkout@v7` step. Its [official input definition](https://raw.githubusercontent.com/actions/checkout/v7/action.yml) specifies one commit by default and all history for zero. Both required full commits are production ancestors, so full history supplies the existing independent references without adding duplicate fixtures or replacing them with current code.

## Frozen references

The following values were independently verified from the original repository and the repaired fresh clone. Hashes cover the exact Git blob bytes, including original whitespace; no text normalization is used for these source hashes.

| Test source | Full frozen commit | Git blob | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `workbenches/furnished-house/main.js` | `d1bc6472a45c316e02c6ec020289610ef0bcbc4e` | `0dc09fbb78e2a27ac575ca001759097ef44ffa8f` | 13798 | `c4bea72873ecfec570264c798dcaa052d7e76d3d1732e25566b4cf8429ad18cb` |
| `workbenches/furnished-house/simulation.js` | `66febf337a41124e0704d1c591a09a1b396bd83f` | `282fb6dfe49e9b5613369925bf3f46443cd2f7ed` | 38769 | `27b4e80d4f07d9c3ed737627e3b3a62e90b01226d473e0e47b0405c6325efe99` |

The two unchanged regression files retain Git blobs `c1a49bc3dc35d4986626e3e86ee2148826a1005b` (`grass-comparison.test.mjs`) and `d8d84be595bfd908bf290b567f0410a41520ab06` (`receiver-selection.test.mjs`). Their existing command capture, target-order comparisons and numerical tolerances remain intact.

## Actual fresh-checkout proof

Validation used Windows Git and Node24.15, with production `master` frozen at `b3742bc5`. It was a separate, task-owned disposable clone inside the coder's ignored QA directory, not another worker worktree. The source was read-only; no primary or donor checkout was edited.

1. `git clone --no-local --single-branch --branch master --depth 1 <file-protocol-production-source> <owned-fixture>` created a real shallow repository with exactly one commit and no object alternates. Both full frozen objects were absent (`git cat-file -e` exited128).
2. Running the two original test files reproduced exactly **2 failures / 9 passes**, with both missing frozen references. No assertions were skipped or changed.
3. `git fetch --unshallow origin` repaired the same clone, supplying 224 reachable production commits. Both full references resolved, ancestry checks passed, and their raw source bytes/hashes matched the originals exactly.
4. The same two files then passed **11/11**. `node tools/check.mjs` in that repaired clone passed **396/396**, plus syntax/import/provenance/shared-Three and art checks. The clone contained the exact workflow correction; all game/test source remained the production version.

The full-history input's LF-normalized workflow SHA-256 is `d211a3b15de5e275c7586836b58fb20b5aed72971ace7ae80e9dc72cf0808e3e`. Logs, original/repaired object evidence, full source pins, unchanged-test hashes, driver source, command records and process identities remain in `artifacts/qa/catalogue-ci-history/`.

The disposable checkout was removed after validating its absolute path, owner/source/HEAD and expected workflow-only status. Its cleanup receipt confirms removal, preserved logs/restart records and no ports. Every validation process exited; no helper, server or preview remains. No game build, GPU preview or performance measurement was rerun for this workflow-only correction.

Historical-reference tests still require a Git checkout containing these ancestor objects; a source archive without history is not an equivalent test environment. The architect owns the publication retry after intake of this scoped worker commit.
