# Fixed original contact proof validation

Validation-only successor to `f7a25711567deb95bc14db01776c4893df3ef5e2`.
The architect's intake `67fccf41` and UI review identify one confirmed P2:
changing supplied `proof.ends.parent.sourceCell` from `[67,7,52]` to `[66,7,52]`
retargeted the binder to the neighboring record. That synthetic contact then
remained live after retirement of the correct original bound record.

The UI fixture uses opaque synthetic tokens and selected original facet channels.
It is a proof-validation regression, **not** a bypass of real producer receipt
authentication. Its original driver, results, fixture, launch receipts, source
pins and verification are preserved byte-for-byte under `ui-*`. The separate
endpoint-order concern was rejected by the original predicate; its script/log /
result are preserved as a **not reproduced** control, not another confirmed bug.

## Correction and input contract

`proveCorniceWallContact` now owns a deep copy of the authoritative original
parts, source definitions, selectors and grid before running its existing checks.
It derives the original owner, part, global index, component, primitive, physical
channel, direction, source projection and source cell using the unchanged fixed
pair constants and original math. It freezes that proof and its owned source
input, then records the issued object in a module-private `WeakMap`.

`bindCorniceWallContact` requires that exact issued proof object and matching
original part data before reading a receipt context or choosing any record. It
uses the immutable validated part snapshot for all later geometry/core inputs.
Changing caller arrays after proof creation cannot change captured ownership.
Caller-frozen objects, spread/structured copies and JSON metadata carry no proof
issuance authority. A changed cell cannot select a neighboring native record.

The caller still supplies authoritative original source definitions to the
source prover and a trusted authenticated reader to the binder. This change
does not authenticate fabricated source inputs or a fabricated reader. It closes
the confirmed gap between validated source projection and later record selection.
Native IDs continue to come from matching receipt entries; no retirement ID was
hardcoded into the adapter.

Serialization preserves evidence values, not an issued proof capability. After
loading saved source data, use the existing source prover before binding:

```js
const proof = proveCorniceWallContact({
  parts: input.parts,
  surfaces: input.producerInput.data.surfaces,
  region: input.region,
  grid: input.grid
});
const pilot = bindCorniceWallContact({parts: input.parts, proof, reader, slices});
```

That operation validates the saved two-part source definitions only; it does not
invoke source-carrier expansion or native compilation. Do not rerun the old
native driver to obtain a new capability: its original two-call allowance is
spent, and its inputs, script, launch and output remain historical evidence.

## Checks and historical native context

`baseline.*` reproduces the changed-cell behavior on unchanged f7 code, recording
the selected neighboring ID and live-after-original-retirement result. One of
five validation controls passes and four fail. `corrected.*` passes **53/53**:
five new proof-validation groups and the previous 48 unchanged focused controls.
The equivalent valid-path control binds the correct original source cell,
preserves intact contact, dies for the exact original retirement and remains
live for the neighboring retirement. No anchors are introduced.

The new checks also cover immutable fixed endpoint fields, copied/frozen altered
metadata, original-part mutation, and revalidation after serialization. The
freshly issued valid proof serializes to exactly the correct source proof saved
with the original native run. The synthetic seam does not claim new real
producer authentication or native execution.

`before-adapter.js.txt` preserves the source used by the original run. The audit
removes only the new input capture, proof issuance and binding guard statements
from the current source and requires byte-equivalent LF text to f7. Thus the
geometry filter, contact predicate use, original projection/cell formula, recipe,
native compiler, direction and liveness/retirement logic remain unchanged.

The original `cornice-wall-contact-v1/native-launch.json` pins are validated
against their **f7 historical source**, including adapter SHA-256
`a7e15e55e869b3239499b31b686574f44cedfcb2b3c6d9cb8ed09ec451253069`.
The new adapter hash and exact validation delta are recorded separately. The old
native pass is preserved, not relabeled as a run of this changed adapter.

This correction made **zero native/compiler calls**, zero source-carrier
expansions, zero pair-validation sessions, and no world/thermal/stock, renderer,
build, benchmark or full-map diagnostic runs. The original one-pair session's
two non-roof native calls remain spent. The full New York diagnostic remains
unrun/unused; the older roof three-call/960-proof allowances remain spent.

Both finite test-child PIDs were checked absent. No helpers or ports remain.
There is no automatic restart/replay. Original evidence, artist/UI sources,
historical volume/null/false fields, the corrected core, all old tests and the
unfinished WIP are preserved. The declaration stays **22 modified / 51 added**,
with only this adapter's existing hash updated.

This commit is only the proof guard correction. It does not broaden acceptance
of the exploratory contact interpretation, generalize binding or integrate a
live map. Later repeated-contact work has a separate contract and commit.
