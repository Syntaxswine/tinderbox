# Read-only art diagnostics after a failed phone review

This is a separate source-only QA follow-up to evidence checkpoint
`4e0ee5fc9d31296099a0bbd9796a95bb04d47fe3`. Active gameplay remains the restored
`55cd9b59` / `822038cc` baseline, support LF SHA-256
`1e6bd6ec6921119af942cce3e3fc69bf2449b0b3ead543697f88e435039bd98c`.
The rejected contact/live algorithms remain archived and inactive.

The existing phone harness first preserves its original finding and reached JPG.
It then invokes one best-effort helper: await the existing input stop, read the
visit's existing public `artDiagnostics` getter, and write `failure-art.json`
before the original error is rethrown and the existing finally disposal runs.
The artifact contains `{ available, diagnostics }`, preserving the whole returned
diagnostic. An absent visit/diagnostic records `available: false`.

A stop/read/write failure produces `failure-art-error.json` when possible, with
its stage. A failed stop skips the diagnostic read. Even failure of artifact
output is swallowed by this helper so the original finding/error and caller
cleanup remain authoritative. There is no new gameplay action, simulation tick,
camera/exposure setting, context, renderer, timer allowance or retry.

The source audit removes exactly the new import and capture call and recovers
the baseline harness byte for byte. The ordinary route, rapid input, scheduled
1,800 ms release, actual two-second guard, 180,000 ms absolute lifetime and
original finally path remain exact. Only this QA harness hash and one helper
are added to the declaration, now 22/41. No gameplay/source asset byte changes.

All **25 focused checks** pass: five helper controls, seven existing action
controls and thirteen mocked browser/context lifecycle controls. Syntax and
declaration checks pass. [Checks and source evidence](failure-art-qa/archive-manifest.json)
preserve exact pins, logs and the source-only verifier. The foreground check
process exits zero; no task helper remains.

No browser, build, profile, held-window measurement or real art diagnostic is
produced by this task. The v5 actual-input failure and outstanding light/visual
acceptance remain unchanged. A later architect-granted actual review is required
to exercise this new failure capture against the scene. No support-bake consumer
or further CPU optimization is implemented.
