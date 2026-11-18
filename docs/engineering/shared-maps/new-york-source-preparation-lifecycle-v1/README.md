# Deferred preparation respects host disposal

Focused P2 correction against `adb902d2a7a06108261b7b48c5c3df739cefed57`.
The existing compiled host's disposed flag now supplies one `assertLive`
closure, reused by `createQuerySource` and the source-preparation path.
Preparation checks this owner at entry and existing await boundaries, and
passes the same check into `prepareSharedMapProjections`. The loader therefore
rejects before appending anything if its owning host was disposed while waiting.
Default/factory behavior and approved projection identities remain unchanged.

The controlled regression defers all three synthetic projection loads without
aborting their signal, disposes the compiled host, then releases the loads.
Against original `adb902d2` it reproduces late mutation: parts/owners and their
lookup maps increase from 3 to 4, physical/render keys are retained, the library
object changes, one bin appears and query construction is attempted. The
original error arrives only after those writes. The saved failing source and
observation show this without any native compiler/trial or transform.

With the correction, preparation rejects with `Compiled map disposed` before
those writes: same original library and three geometry keys, three parts/owners
and unchanged lookup sizes, no new owner order entry or spatial bins, no query
attempt, no world/blueprint persistence callback, and zero retained blueprint/
attribute buffers or geometry transforms. Repeated disposal stays harmless.

`corrected` passes **31/31**: the same 30 relevant controls plus the disposal
regression. This run records **50 synthetic compile calls, 15 disposed trials
and four steps**. The focused reproduction has zero compiles/trials/steps; the
new regression adds none. Both hidden children have 30-second deadlines and a
64-step ceiling; existing fixtures remain within 64 source cells /256 thermal
input triangles. Both children exited, with no retained helper or port.

There is **no actual New York preparation, geometry read/expansion/transform,
native compile/trial/clock/support evaluation, renderer or build** in this
correction. The consumed one-source allowance remains consumed. Saved
`selected-world.json` and `selected-blueprints.json`, all prior packets and
source archives are byte-identical. The evidence audit only hashes their bytes;
it does not parse the saved geometry or repeat the old preparation/audit.

The architect's separate recheck identifies the 17 prior boundaries as exact
source maxima and a missing cell-ownership rule. This correction leaves that
rule unchanged. The three artist source proofs approved separately at
`fdd27ffe` are intentionally not intaken. Runtime policy, source points/selectors,
quantities, grid and tolerances are unchanged; native IDs remain unbound.

Immutable saved world SHA:
`5353b5f6d6ccae1d13931bfa93f4bbdcfd498994f33a5eff49db82c2ece5c8fd`.
Saved blueprints SHA:
`1685e0afc81e21b16f8db3fa00e81bc326a9b1ca24453c759abcf55df28ebbf2`.
Original plan/policy/projection and independent source witness pins remain as
recorded in the earlier packet. Runtime declaration stays 23 existing /60 added
files. The protected `support-regions-proposal.md` WIP stays unstaged and has SHA
`56c5e514ec7c0ba59ff10772345d3f16eb0f11f53924146738ef3811ed07fc5f`.

`audit.mjs`, the input snapshots, scalar logs, `manifest.json` and
`cleanup.json` provide the exact checks, scope, source pins and process exits.
This candidate stops for architect review; no deployment or map enablement.
