# Consumed-fuel ground char candidate

Architect assignment: `3756bb9a3d2949be7f1f567648436da81df77aa3`,
`docs/proposals/continuous-ground-char-assignment.md` (primary checkout).
Source baseline: `d4b036ea1c7b2fcc9f3556137b0886016eec02af`.
The assigned checkout matched both baseline Git blobs before editing:

| Source | Git blob | Baseline LF SHA-256 |
| --- | --- | --- |
| `src/simulation/field.js` | `a8bb947b4eaa4a4d6cd5a42ef29d03a719048299` | `1369fb81f0f626c4950b52d56f23b692d0883280ef0b16b01bd9ed204698ec1c` |
| `src/art/ground-field.js` | `30a9adaa6b8354c59d6428c42e7cddf099b43de9` | `a836ad1687e8eb3c35233a9d75dbce40d5d3ede7ce2f8d1aee240763e45b1a86` |

The Windows working copy of the original field source was CRLF, 9,933 bytes,
SHA-256 `87239735cc608618a86d8b7bbcdf59724159a354319cd4508628f4d6fd33c61a`;
the baseline Git blob is LF, 9,784 bytes. The formula/source provenance uses
the actual Git bytes, with neither a donor update nor a wider intake.

Each new cell stores only two added presentation scalars. `initialSurfaceFuel`
is the existing configured density times the existing full/partial timber area,
captured at creation. `consumedDepositedFuel` accumulates the exact `gas` amount
already subtracted on a burning step. Physics does not read either scalar.
Subtraction, the global ledgers, terminal EPS clearing, events, spread, damage,
and clocks retain their previous rules and order. Later pouring/pools/re-ignition
do not erase consumed evidence; reset/re-entry constructs it afresh.

Blue now records the architect's prototype coverage:

```text
s = initialSurfaceFuel > 0 ? clamp((initialSurfaceFuel-surfaceFuel)/initialSurfaceFuel,0,1) : 0
g = 1 - exp(-consumedDepositedFuel/(0.16*size*size))
c = 1 - (1-s)*(1-g)
```

The fixed `0.16` litres/m² soot/coverage scale is a presentation choice. It does
not change `0.08` litres/metre pouring. Red gas, green warmth, alpha's exact
burning flag, palette/grain/opacity, native grid, nearest filtering and stage -1
stay unchanged. The new shader uses width `mix(.29,.50,c)` and continuously
interpolates each cardinal connection's center/segment distance by neighbor c.
It allocates no history or additional texture/material/geometry.

`classifyCharEvidence` validates the entire cell array before any texture resize,
clear or upload. Every new cell needs both own scalar values, finite nonnegative
evidence/remaining surface, remaining surface no greater than its initial value,
finite position and positive finite native area. The factory additionally
requires matching cell size, unique grid occupancy and in-grid positions.
Mixed/partial/malformed input throws; it does not overwrite a previously borrowed
texture. Entirely old records with neither key retain their original phase blue,
width switch and neighbor thresholds. `diagnostics()` explicitly reports
`legacy-phase`/version0, `consumed-fuel-v1`/version1, or `empty`/version1.
An absent cells property is an empty frame; null/non-array is malformed. Empty
frames clear the mask without inferring any consumed fuel. Diagnostics are small
detached values; they do not retain past char.

Verification runs with:

```text
node --test tests/integration/ground-char.test.mjs tests/integration/ground-field-order.test.mjs tests/integration/fire-receipt-step.test.mjs
npm run check
npm run build
```

The existing immutable `0a732ef91809699d9c33359e22016d5674525356` replay now embeds
its original field Git blob alongside its previously frozen changed sources,
so shallow CI does not read the new field as its oracle. Every other dependency
must still match the frozen raw hash; available original Git objects are also
cross-checked. Full snapshot comparisons strip **only** the two added cell keys.
The 2,516 exact full comparisons and 990 receipt comparisons cover all six native
review scripts, actors/player/buildings/heat/fuel/phases/events/stats/clocks,
variable production deltas, powder/pause/reset and an additional 500-step actual
pour/Molotov spent-cell re-ignition replay. No bookkeeping or other key is omitted.

Focused tests cover configured densities, a native 1×2×.16 m wall's partial cell
areas at .25/.5/1 m pitch, the existing overlapping-area cap, zero initial surface,
cold/heating no-consumption, exact gas accumulation, pools/re-ignition,
conservation, known prototype values/monotonicity and old-threshold continuity.
The old solver can clear a terminal residual of at most `1e-10` per cell without
charging its global burn ledger. Conservation assertions allow that existing
bound plus small floating-point summation error; the candidate does not repair
or reassign it. Actual injected shared-Three tests inspect mask bytes, legacy
lanes, detached snapshots, pause/reset/replay, filtering, borrowed identity,
resize/disposal and one owned texture/material/geometry. Shader source checks
and mathematical continuity limits are not WebGL compilation or pixel evidence.

This candidate leaves artist assets, V5 data, optics, historical controls,
descriptors, UI, common decoder, fixed reader and cached-field guards untouched.
It is not visual acceptance, a quality score, promotion or a cost improvement.
The architect still needs matched native before/at/after-burnout frames and a
representative movie to judge gradual irregular scarring and its interaction
with the unchanged flames.
