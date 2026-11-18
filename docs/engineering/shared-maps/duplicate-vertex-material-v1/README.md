# Exact duplicate-coordinate nonmaterial faces

Separate correction after `58b6820bc51e9793def70f5e47edc92c08052232`, under
the architect's `duplicate-vertex-material-faces.md` contract copied in
`authority.md`. Only `src/simulation/original-support-ports.js` changes at runtime.
The declaration retains 22 modified / 52 added entries and updates its hash.

Original component enumeration skips a face only when all coordinates are finite,
its computed area is exactly zero, and two coordinate positions compare exactly
equal. The face's raw slot remains untouched. None of its edges enter topology;
only positive-area absolute primitive IDs enter components, ports and constructor
interior checks. No mesh is compacted, renumbered, repaired or substituted.

All-empty originals reject. Malformed/nonfinite coordinates, nonduplicate
collinearity and underflow-to-zero faces still reject; positive EPS-small faces
remain material. A finite-area check also closes the old `area > 0` admission of
Infinity from finite-coordinate overflow. The baseline retains that failure.
No tolerance or ceiling changes: all supplied slots still count toward 400,000.
Authoritative current-fragment/closed-solid guards remain unchanged and continue
to reject supplied solids containing empty faces. No fuel quantity is calculated
by this helper and no fuel/material recipe changes.

`ui-result.json`, `ui-launch.json`, `ui-diagnose.mjs.txt` and `ui-diagnostic.log`
preserve the authorized read-only UI diagnostic byte-for-byte; `source-pins.json`
records their source paths, raw hashes and matching launch/result/script pins.
This historical diagnosis is not rerun or relabeled as a contact acceptance.

The new tests authenticate original part 2352, its matrix/runtime index, geometry
raw hash, and both ordered Float64 raw/world hashes. Both frames keep 200 raw
triangles, enumerate 180 positive material faces and exclude exactly the same
20 original ordinals:

`0,19,20,39,40,59,60,79,80,99,100,119,120,139,140,159,160,179,180,199`.

Other new controls reject an excluded-face port/fragment, prevent an empty face
at ground height from anchoring material above it, keep two positive components
separate despite empty faces sharing a zero-length edge, exercise strict original
membership versus unchanged current-solid authority, and check the raw ceiling.

`baseline.log` preserves 1 passing / 5 failing new groups on the previous core.
`affected.log` passes all 41 groups: six new, eight original physical support,
twelve strict-embed, four ALL/rooting, seven generic contact and four endpoint-
bounds groups. Exact runtime/test source pins and bounded process lifetimes are
in the corresponding receipts. No passing test is repeated just for packaging.
`verification.json` validates the source pins/delta/evidence and `cleanup.json`
confirms both task-owned test children exited. The unrelated support proposal
stays unchanged and unstaged.

No actual native/compiler, source-owner expansion, baluster contact search,
whole-New-York diagnostic, world/stock, renderer, benchmark, build or retained
helper. Source art, transforms, UVs, physical geometry and quantities are
unchanged. The baluster's actual joint still needs its separately authorized
source recheck after this helper candidate is reviewed. No live-map acceptance
or publication is claimed.
