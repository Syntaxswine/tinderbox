# Remaining cornice-family source batch

Separate source-only candidate under the [amended authority](authority-family.md).
The accepted [first-page packet](../cornice-family-contact-page-01-v1/README.md)
is byte-for-byte unchanged and is neither recalculated nor reverified here.
Its recorded facts remain the separate 49-pair / 96-region reference.

| Scope | Children | Pairs | Regions |
| --- | ---: | ---: | ---: |
| Preserved first page | 1 | 49 | 96 |
| This remaining batch | 95 | 1,645 | 4,340 |
| Full original family | 96 | 1,694 | 4,436 |

All 127 planned pages completed, each containing at most 64 regions. There are
zero failed pages and zero unexecuted pages. The remaining batch proposes **1,388
proved contacts** and retains **2,952 named unproved regions**. An unproved
interpretation does not erase or reject the historical certificate.

[Input pins](input-pins.json) and the [shared dictionary](dictionary.json) preserve
1,216 actual source parts and 119 geometry/UV identities, emitted-world matrices,
global source indices, finite quantities, ownership, direction and certificate
hashes. The [inventory](inventory.json) maps every original child and region to
its page. Page files under pages/ contain actual component/primitive IDs, endpoint
points, exact barycentric weights, normals, rejected candidates and reason codes.
No mesh arrays are duplicated into this package.

Fifteen parts already use accepted effective repair buffers. Their dictionary
records point to the unchanged before/after overlay and its retained/subdivided
triangle maps. A primitive on an accepted effective buffer is explicitly distinct
from a pre-repair primitive. This batch creates no geometry or repair.

The worker validates authored bearing/surface witnesses first. It then uses only
the accepted thin-axis original-wall-face / unique cornice-top construction for
fixed embeds, trying the exact selector midpoint and original witness free
coordinate. It applies the unchanged exact face/component/contact contexts.
No jitter, added tolerance, inferred fastening, anchor or new solver is used.
All 268 original positive bearing certificates remain intact: 216 also receive
new source contacts; 52 remain unproved by the pinned component check. The 264
other authored face witnesses are retained as rejected candidates where they do
not identify one original face on both endpoints.

| Named unproved reason | Regions |
| --- | ---: |
| Bounded coordinate candidates do not prove a point | 1,612 |
| Primary face/free interval is not uniquely admitted | 382 |
| Primary vertical face or unique top plane unavailable | 672 |
| Existing native-precision face membership is ambiguous | 228 |
| Pinned original component membership/closedness unproved | 52 |
| Existing binary contact predicate does not pass all three checks | 6 |

The [calculation summary](summary.json) separates 4,164 successful contact checks
backing proved regions, 4,182 attempted predicate checks, 11,838 genuine regional
negative controls, 1,387 rejected pilot-point copies and 2,075 rejected coordinate
or authored-point candidates. Controls use existing wrong primitives, original
vertices, faces and selectors; inapplicable controls are not counted as negatives.

[Calculation progress](calculation-progress.jsonl) and
[verification progress](verification-progress.jsonl) retain per-page owned-handle
receipts, costs and hashes. Both runs reproduce the same counts, methods, reasons
and saved page records. [Verification summary](verification-summary.json) records
the second pass. All launched children exited, successful scratch was removed,
and no port or retained helper remains.

Calculation wall: 67.496 seconds; coordinator CPU: 2.781 seconds; Python page CPU: 29.844 seconds; Node CPU: 13.000 seconds.
Longest owned Python child: 1.456 seconds; Node child: 0.314 seconds. Verification wall: 58.858 seconds.
These are source-processing costs, not renderer or game benchmarks. Each owned
page child has a 60-second maximum. The foreground coordinator uses a ten-minute
monotonic deadline and reserves a complete child deadline before starting a page.
It reuses the accepted corrected runner; no new lifecycle framework is added.

The calculation marker blocks automatic retries. The default checker verifies
saved pages and source pins using task-owned workspace scratch:

~~~powershell
python -B art/source/shared-map-fire-bindings/cornice-family-contact-remainder-v1/run.py --verify
~~~

The review-package.json manifest pins every delivered payload. Source
review, native binding/liveness and live-family acceptance remain separate.
Native record/cell/face lineage stays UNBOUND. Zero native compilations, support
graphs, world steps/publications, runtime factories, renders or builds ran.

The [initial packaging failure](attempt-01-package-self-reference.txt) is preserved.
Only the manifest self-link was corrected; no calculation or verification was repeated.

The [receipt audit finding](attempt-02-receipt-pid-reuse.txt) preserves Windows PID
reuse observed in these short-lived checks. Launch and exit records match by their
recorded launch identity; cleanup always used each exact owned process handle.
