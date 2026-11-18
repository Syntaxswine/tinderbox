# Post-commit support-reference refresh delta

Base `aaf7a0f8015418bcef341b9c0cd1a81de93ec903`. Architect returned one
remaining exception path: support-reference refresh ran after publication
advanced but before notifications were queued and stages disposed. Its failure
was plain and skipped the activation notice. The exact root repro and scalars
are preserved in `architect-repro.mjs.txt` / `architect-repro.json`; they were
not rerun. Root reports two tiny compiler calls, one disposed trial and zero
steps; the JSON was written before finally cleanup.

One runtime line now queues refresh first in the existing guarded after-commit
dispatch. Physical and registration stages dispose before dispatch. A refresh
failure propagates in `AggregateError.errors` with `committed:true` and the
committed `publication`; remaining support, activation and queued index notices
drain. It is neither suppressed nor reported as success. The default refresh
reads the complete world and updates support references before later notices.

Two new genuine tiny-fixture tests cover the exact after-prepare replacement,
coherent physical/query/stock/support state, error classification, notice order,
stage disposal before the fault, no duplicate retry, readable normal refresh
and actual cold-to-native oil-support rebinding. Three existing notification /
reentry checks and the coupled whole/two-region control are the affected set.

`corrected-final`: **6/6 pass**, 16 tiny compiler calls, six trials created and
disposed, three aggregate steps; hidden child deadline 30 seconds /64 steps.
Each fixture uses 13 logical source cells /18 thermal triangles, below 64/256.
All receipts, source cache and temporary leases end at zero. `focused-final`
remains failed at 5/6: the first normal-control deposit at X .4 hit the existing
overlapping fitting. Only that test contact moved to exposed floor at X .2;
the runtime patch did not change. Raw logs and its exact changed-input context
are retained; unchanged control source is referenced by the base commit.

No legacy comparison was rerun: default/shared native registration did not
change. No actual New York/native proof, whole-map diagnostic, renderer, build,
benchmark, Pages or default enablement. Both owned child PIDs have exited;
`cleanup.json` records checks and no retained helper/port. Earlier archives,
assets, source pins and protected unrelated WIP remain unchanged. The runtime
declaration changes only the publisher's added-file hash.

`node docs/engineering/shared-maps/hybrid-postcommit-refresh-v1/audit.mjs`
checks this small delta, saved source pins, logs, resource limits and cleanup
without importing a runtime or replaying a test. The manifest is the scoped
handoff inventory. This remains an internal disabled candidate for review.
