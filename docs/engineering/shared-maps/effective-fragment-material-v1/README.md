# Reject nonmaterial current fragments before support

Separate correction to `0ce79739c8b45a249395253f361964f343c2e576`, whose
acceptance the architect held after finding the saved grounding regression.
`authority.md` records the bounded correction and paused page work.

The old core accepted a raw empty triangle appended to current positive material.
Its ground-height coordinate could seed support after the real foundation was
gone, even though the excluded original primitive was absent from the fragment's
primitive list. `architect-repro.json` and `architect-repro.mjs.txt` preserve that
exact original failure byte-for-byte, with raw hashes in `source-pins.json`.

Current-fragment admission now requires actual triangle arrays with finite XYZ
coordinates and finite, strictly positive computed area before constructing a
physical shape, bounds, continuity links or ground roots. Invalid geometry
rejects the evaluation; a raw excluded face cannot regain material authority.
No tolerance-based deletion or generated geometry is added. Positive EPS-small
triangles and genuine supplied positive-area internal caps remain admissible.

The original component enumeration/constructor and the strict effective-solid,
interior, connectivity, fixed ownership, ALL and retirement rules are unchanged.
The only runtime edit is the fragment-admission block in
`src/simulation/original-support-ports.js`; its declaration hash updates while
the declaration remains 22 modified / 52 added files.

`baseline.log` retains one passing / two failing new groups on 0ce79739.
`affected.log` passes all 44 groups: three new plus the preceding 41 affected
physical/source/strict/contact groups. The exact original-grounded -> upper-only
unrooted sequence is checked, followed by rejection of the same appended raw
empty face and successful reuse of the clean input. Malformed/nonfinite/zero-area
fragments reject; positive EPS-small patches and cold/native internal-cap fixtures
remain valid without restoring the lost foundation.

No earlier 0ce evidence or source inputs are rewritten. The separately prepared
cornice page remains uncommitted under `cornice-page-mapping-v1/`; its one completed
25-new-owner preparation is preserved, with no rotated mapping tests resumed.
`verification.json` records the scoped delta and exact receipts; `cleanup.json`
confirms the two correction test children and the earlier paused source child
are absent. No helpers or ports remain.

No actual native/compiler, new source-owner expansion, full-New-York diagnostic,
world/stock, renderer, benchmark or build. This is a support-input correction for
architect review, with no physical baluster-joint or live-map acceptance.
