# Carrier-local native continuity experiment

This candidate changes only the uncached same-carrier continuity broadphase in
`src/simulation/source-support.js`, after the separately committed
[final-source attribution](../support-cache-attribution-v1/README.md) at
`a5e171d9d924b6baf46151f416f23cd0d5746120`. **Performance readiness remains FAIL.**
No contact/region, activation, native compilation, rule, material or map data is
changed. No profile, build, renderer or publication is run.

The helper builds the existing native `createBoundaryIndex` from one carrier's
current registered fragments, preserving the native default one-metre bins,
overlap/EPS/thickness behavior and ordering. It verifies each input is exactly
the current global index/native-node object. Candidate IDs are rebound to those
authoritative objects before the unchanged ID, carrier/node and ordered contact
predicate. Retired original fragments remain in the list; live filtering and
no-remap ownership are unchanged. Temporary bins become unreachable after the
synchronous calculation. The cache retains only its previous edge-ID blocks.

## Source and behavior gates

The [source audit](source-audit.json) reconstructs the exact `0e1ab9dd` module
outside this helper, its continuity call site and diagnostic counts. The only
declaration delta is the support-module hash; counts remain 22/40 and compact
source pins remain `e9bee63a` / `1e93eb73`, 12,446 carriers. Every other production
file stays exact to `0e1ab9dd`.

All **46 focused checks** pass, including exact ordered candidate IDs and actual
geometry for overlapping unrelated cold/active objects, notified kind/normal/
thickness/bounds changes, clipped real doors/poses, retired patches, asymmetric
facets and all ten accepted New York support-control families. A stale owner copy
is rejected. Local visits create no global query/subscription, extra source
transform, fuel birth or clock step. The full physical/support/local-loss/reset/
disposal checks remain passing. The native wrapper again passes **15 assertions /
60 routes / 819 registrations**.

The one authorized unprofiled measurement uses the same `43f508cb` route/contact
fixture, command tape, snapshot reads and returned-publication host timer. All
cold/before/after native physical, damage, fuel, heat, full directed support and
replay/registration digests match. All three raw host preimages strictly match
the accepted candidate. Against `cd443ccd`, only the same previously approved five
cache observations differ; no new comparison exception is needed.

## Single-run timing and limits

| Observed candidate work | Result |
| --- | ---: |
| Whole fixture wall / actual process CPU | 8.887 / 12.812 s |
| Fixed 32-step held window wall / process CPU | 3.549 / 5.156 s |
| Worst host, glass step 260 | **2.139 s** |
| Held host steps 340 / 344 | **1.496 / 1.258 s** |
| Worst recorded native step | 0.745 s |

**Possible external contention:** after this run had completed, the architect
reported that its read-only Python geometry checks had begun shortly before the
measurement update; detail check session 68954 was still finishing. It later
exited zero. Preserve this possible CPU/memory overlap: its exact duration is not
measured. The run was not repeated and is not an isolated wall-time benchmark or
matched improvement claim. Actual process CPU and pauses remain reported as
observed. [timing-contention.json](timing-contention.json) records the disclosure.

The same 11 held / 21 released host steps spend 0.055 flamethrower stock, activate
720 → 1,577 carriers and 14,694 → 27,952 cells, with one natural burning patch.
Substantial first-use and held stalls remain. Prior profiled or historical
unprofiled timings are not silently reused as a matched control for this source.

There are 1,581 completed temporary continuity builds. Independent completed-build
peaks are **2,124 records** and **9,068 native-bin memberships**. Membership counts
use the exact native bin policy and do not represent filled material voxels.
Only scalar peaks are retained; no temporary index variant or cold mesh is kept.
Existing cache counts remain 7,487 entries / 535,031 directed edge-ID records,
within the 52,929 fixed-key bound. Disposal releases entries, edges and owned
subscriptions. Becoming unreachable is not a claim of immediate GC.

Stage diagnostics across the held window record about 661 → 781 MB RSS and
496 → 600 MB used JS heap. Copies, GC timing, instrumentation and possible external
pressure limit these observations. There is no allocation timeline, new profile,
phone/FPS claim or production memory budget.

## Preservation and cleanup

Reusable producer/audit/verifier sources, the exact generated fixture, raw host
preimages, commands, source pins, receipts, checks and cleanup are archived with
byte hashes. [verification.json](verification.json) retains strict full-state
comparisons, timing context and the unresolved readiness result. Original raw
measurement files are unchanged.

Node PID 51712 / FILETIME `134393886842818297` runs from
11:31:24.996 to 11:31:33.883 UTC on 2026-11-17, inside its original fixed
11:32:24.996 expiry. It uses 366 of at most 1,000 host steps and exits zero.
The independent check finds the original identity absent; ordinary simulation,
compiled-owner and subscription disposal completes. No inspector profile, server,
browser, port or retained helper remains. The one timing grant is consumed.
The unrelated support-region documentation WIP remains outside this candidate.
