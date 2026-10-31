# Ground-char capture evidence

Architect source assignment: `107083a`,
`docs/proposals/ground-char-review-evidence.md` in the primary checkout. Before
editing, the assigned `src/art/index.js` and review driver matched root `984bfb4`
Git blobs `6202bc5ce6d6672de9555c53c3c83c31fca69108` and
`71df8f908e299c94881334ba5908094cf0c1cfcc` exactly. No baseline intake was needed.

Art diagnostics retain the existing `ground` resource counts and add
`groundChar` from the actual field's compact mode/version/count diagnostics.
The existing `lastSnapshot` provides the last successful model-update tick and
world/player times. There is no second retained snapshot or render-time record
collection.

`tools/fire-realism/ground-char-evidence.js` is called only by existing public
state/capture requests. `state().diagnostics.groundChar` and
`captureFrame().groundChar` expose the same bounded schema:

- Actual field mode/version/count, authoritative snapshot clocks, last model
  update clocks and an exact match flag.
- Available, unavailable, legacy, clock-mismatch or model-mismatch status and
  reason. A legacy record invents no consumed-fuel measurements or cell values.
- Source/model cell counts, candidate/selected/omitted counts and truncation.
- At most 32 burning or already-consumed cells, selected by ASCII ID order.
  Each records native position, size, phase, initial/remaining surface fuel,
  consumed/remaining deposited fuel, heat and intensity.
- `expectedFloat32RGBA`, computed from the existing classifier/char mapping and
  unchanged red/green/burning-alpha formulas, rounded through `Math.fround`.

The record explicitly says these are authoritative snapshot values plus a CPU
expectation. `gpuTextureReadback` and `uploadProved` are false. Even when clocks
match, this is not proof of texture upload, shader compilation or final pixels.
On a clock mismatch the current snapshot and last model times remain separate;
the CPU expectation is not relabeled as the model's uploaded data.

Selection keeps at most 32 source references during the request and returns
only detached primitives/arrays. It retains neither the source references nor
visual history. Malformed/mixed evidence, missing model updates or non-ASCII
candidate IDs are explicitly unavailable. Empty authoritative input reports
zero candidates when it matches the actual empty model branch. Legacy evidence
leaves consumed-fuel candidate coverage unknown.

The helper joins the existing adapter fingerprint list: **20 → 21 sources**.
This deliberate source-list change is proved in the public driver fixture;
historical captures keep their original 20-source fingerprints. No v1 receipt,
source-control asset, descriptor or simulation behavior is rewritten.

Focused checks:

```text
node --test tests/integration/ground-char-evidence.test.mjs tests/integration/fire-driver-results.test.mjs tests/integration/fire-binary-driver.test.mjs
```

Seven checks cover deterministic 40→32 truncation/reversed input, detached nested
data, unavailable/legacy/malformed/mismatched evidence, actual native four-cell
burnout snapshots against the actual shared-Three CPU field texture, and the
actual art diagnostics with injected renderer/asset APIs. The real driver module
is evaluated intact with declared API-only browser/renderer/art transports and
the actual GroundField. Seek frames190/192/193/194 propagate identical records
through public state, phase JSON and JPEG metadata. Repeated state requests add
zero draws/updates; each capture retains its existing single draw. Existing
measurement cancellation and prepared-binary no-refetch tests also pass.

No WebGL context, real renderer, browser, dataset audit, benchmark or retained
helper is launched. The finite API fixtures provide no GPU or pixel evidence.
Root still needs matched native captures and a representative film to judge
char appearance. This child adds observability only, with no visual score,
reference/optimized acceptance, cost claim or production publication.
