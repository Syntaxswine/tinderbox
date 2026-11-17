# Selected routing for whole carriers and regional roofs

Architect selects this reuse direction after the UI specialist's read-only
inspection of `f79a79a9`. It is an integration decision, not a tested or wired
hybrid dispatcher. The current disabled receipt-bridge assignment is unchanged.

Keep the existing complete-carrier path for supported whole floor/small-part
recipes. `createSourceActivation.ensure()` stages the complete
`sourcesForCarrier()` bundle through trial, cold-query claim and stock ledger.
The existing rectangular floor compiler preserves measured thickness, original
IDs and its real underside/side solids; ordinary native queries consume those
solids without the regional halo restriction. Individual native retirement
does not restore the already-claimed cold proxy. This does not establish
support for arbitrary new floor geometry.

Use partial regional activation only for explicitly eligible original roof
carriers. Select one mode per original canonical owner **before** it activates,
and keep it fixed for that generation. Never invoke the whole-carrier path for
an owner already assigned to regional activation, including on a regional
failure. Do not admit an overhanging floor to the regional kernel or change its
geometry, IDs or tolerances to make it fit.

Each owner has exactly one canonical stock account and one authoritative query
representation. A full cold roof proxy must neither remain alongside regional
geometry nor disappear wholesale after one region loads. The old ledger's
boolean active flag cannot express a partial roof; its native-fuel metric must
exclude independently accounted regional births. A later hybrid dispatcher
must reconcile those owners/metrics explicitly and integrate publication,
retirement and support references; the existing sequence of three commits is
not evidence of failure atomicity. No second simulation, duplicate fuel,
nearest-survivor remapping or reactivation refill follows from this selection.

This avoids requiring a new volume/Boolean solver for the existing whole-floor
recipes. Live integration and matched whole/regional behavior controls follow
the accepted isolated bridge; they are not authorized or passed by this source
note. Exactly four destinations, original buildings/interiors and the shared
tools/thermal/presentation rules remain the M29 target.
