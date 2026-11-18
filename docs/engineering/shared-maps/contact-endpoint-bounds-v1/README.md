# Optional shared selector, mandatory original endpoint bounds

Bounded extension of accepted `11bf4636c0b1beacdb2fdb91b95a1fb54c367b04`,
under architect contract `d37c75da782c8695c37eeef68bc6f2338a0173cf`, copied in
`authority.md`. The change admits a null/absent shared selector only when the
fixed point belongs to both selected original triangles and both explicit,
finite, ordered endpoint bounds. Null stays null; an absent selector stays absent.
Historical volume/null/false records are not replaced with an invented box.

One helper clips original and native patches by their own endpoint bounds, then
by the shared selector only when supplied. Non-null selectors retain their
existing constraints. Original predicate, geometry, projection/cell math,
immutable proof authority, exact native retirement, direction and no-anchor
behavior are unchanged. Explicit source ranges/primitive offsets still reject.

Evidence is limited to the affected tests, source example, exact delta/pins and
cleanup. Previous archives/native proofs are referenced through Git at the base;
they are not recopied or rerun. Baseline `baseline.*` retains the old deliberate
null-selector rejection. The first affected run retains a fixture-only failure:
the test flattened XYZ points before passing them to `bounds`. Its source and
diagnostic are preserved in `first-endpoint-test.mjs.txt` and
`fixture-first-failure.json`. The fixture was corrected; runtime geometry was not.

New checks cover null/absent preservation, distinct endpoint clipping, additional
shared clipping, missing/invalid/outside endpoint bounds, exact versus unrelated
retirement, altered-proof rejection and continued range rejection. All native
entries used for liveness controls are opaque-token synthetic fixtures, not
actual native records or private producer authentication.

The committed UI example is the first representative from `e67235b6`, region
`715ed699e0b9c5185bf38ab4` (dentil to its own cornice). `ui-example.json`
records only that example, its original region/binding records and provenance.
Original source bytes, runtime owner/part indices, matrices, material recipes and
both Float64 world-triangle hashes match. `ui-result.json` records one prepared
source proof, two source-owner expansions and two original-part transforms.
The cornice uses primitive 1 / original face 1; the dentil uses primitive 2 /
original face 1. Both project to source cell `[64,15,51]`. Native IDs remain
unbound. The shared null, endpoint bounds and historical witnesses/false/null
fields survive unchanged. No other UI representative was evaluated here.

The final passing scope is four new groups in `corrected.log` plus the seven
existing generic groups that passed in `affected.log`, on the identical runtime
hash. Only the failed fixture changed between those runs; passing checks were
not rerun for packaging. `baseline.log` retains the old behavior (one pass,
three deliberate null-admission failures); `affected.log` retains ten passes
and the fixture failure. The committed source example also passes in
`ui-run.log`. `verification.json` checks these exact source pins, declaration,
scope and failure records; `cleanup.json` records ended helpers. The protected
support proposal remains unrelated and unstaged.

No actual native/compiler calls, pair sessions, full New York diagnostic,
world/stock publication, renderer/build/benchmark, new source role, geometry,
anchor or solver is introduced. Prior native allowances stay spent; the full
New York diagnostic remains unrun/unused. No live factory integration is claimed.
