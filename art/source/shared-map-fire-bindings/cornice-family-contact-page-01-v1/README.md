# First cornice-family source page

The [latest checkpoint](checkpoint-refinement.md) narrows the [family draft](authority-family-draft.md) to one original child, carrier/edge-0/cornice-1.

| Scope | Children | Pairs | Original regions |
| --- | ---: | ---: | ---: |
| Full inventory | 96 | 1,694 | 4,436 |
| Checked first page | 1 | 49 | 96 |
| UNATTEMPTED | 95 | 1,645 | 4,340 |

[Inventory](inventory.json) keeps every other child UNATTEMPTED, not failed or proved. No other geometry is expanded. The [compact source page](source-page.json) references three geometry buffers and 50 actual source parts, with original global indices, matrices, owners, ranges and primitive order.

All 96 regions have proved contacts: 288 existing-predicate contact checks, 862 regional negatives and 95 copied-pilot-point rejections. The 24-pair/48-region reference is unchanged. Parent primitive counts are 8:49 and 10:47; cornice primitive counts are 0:46 and 2:50. These are source facts only.

The bounded method intersects the actual cornice top plane with the actual thin-axis wall face. It tries the exact selector midpoint, then the unchanged historical free coordinate. The two rotated ends reject the first candidate and prove the second; both negative candidates remain in the page. No general solver, jitter, source repair or new geometry is used.

Historical volume witnesses and certificate hashes are preserved, including the two non-null historical sourceFace records. Existing bearing certificates elsewhere remain untouched and UNATTEMPTED. Geometry, UV identity, roles, direction, quantities and native dimensions are unchanged. Native record/cell/face lineage stays UNBOUND.

[Source pins](input-pins.json) and the [source producer snapshot](source-producer-context.json) verify actual captured world triangles against the unchanged producer. No runtime factory or native compiler is called.

Recorded source costs (not a renderer benchmark):

- Inclusive calculation wall: 1479.064 ms.
- Coordinator CPU delta: 953.125 ms; page Python CPU delta: 250.000 ms; Node process CPU: 155.000 ms.
- Longest calculation child: 485.786 ms, under the 60-second ceiling; the page has 96 regions, under 256.
- Saved-page verification wall: 1388.548 ms. All calculation and verification children exited; no port or retained helper remains.

The [initial syntax-receipt failure](attempt-01-syntax-receipt-identity.txt) is preserved with the [retired wrapper](preserved-win32-receipt-wrapper.py.txt). It was a post-exit receipt lookup failure, before source calculation. The current runner uses a finite hidden foreground process and its owned handle; no registry, daemon or Win32 identity framework is used.

~~~powershell
python -B art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/check.py
~~~

The calculation marker prevents automatic page retries. Default checks verify the saved page under the same bounds and preserve any failed verification scratch. Source acceptance, native mapping/liveness and live family acceptance remain separate. Stop here for architect review.

The [packaging-only missing-import failure](attempt-02-package-reference-check.txt)
is preserved; it was corrected without retrying the source calculation.

The [raw stdout whitespace finding](attempt-03-raw-stdout-whitespace.txt) records
the file-specific CRLF rule; the original stdout bytes remain unchanged.

## Journal-failure cleanup correction

Architect intake of 6c13bc5e exposed a launch journal write outside the cleanup
block. A denied Temp journal could raise after Python launch and bypass cleanup.
The [original runner](historical-lifecycle-6c13bc5e.py.txt) remains byte-for-byte
identical to the original calculation marker's lifecycleSha256. Original source
results, calculation receipts and verification receipts remain unchanged.

The active runner now prepares metadata before launch and protects every
post-launch operation. Cleanup waits on the exact launched handle and closes its
pipes before the exit journal. The original exception receives the PID/exit
receipt and a traceback note; a second journal failure cannot replace it.

The [single failure control](check-runner-cleanup.py) injects denied launch and
exit journal writes for one harmless ten-second child, checks that it was alive
at the first failure, and verifies forced exit before its own expiry. The
[control receipt](runner-cleanup-control.json) retains the original PermissionError
and owned-handle exit evidence. Run the control with:

~~~powershell
python -B art/source/shared-map-fire-bindings/cornice-family-contact-page-01-v1/check-runner-cleanup.py
~~~

The [saved-page verification](runner-cleanup-verification.txt) uses task-owned
workspace scratch through process-local tempfile.tempdir. Global environment
settings stay unchanged. Package pins include the active runner and historical
runner separately; the old calculation marker still names its historical bytes.
No original source calculation is repeated and all other children remain UNATTEMPTED.
