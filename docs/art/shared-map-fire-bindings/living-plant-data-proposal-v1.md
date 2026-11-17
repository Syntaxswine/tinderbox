# Living plants: minimal representation and future wet data

**Unaccepted source-only proposal**, 17 November 2026.
Authority: `4c2019abcc006b4b55c8293781a9741b9b9e3448`.
All412 H15 parts remain withheld. This document changes no material, profile,
stock, geometry, collider, response or solver.

## Minimal source representation

[Exact owner/source associations](../../../art/source/shared-map-fire-bindings/remaining-geometry-readiness-v1/living-plant-representation-proposal.json)
partition the existing 412 source IDs without creating geometry:

| Proposed group | Future stock owners | Local damage patches | Visual follow parts |
| --- | ---: | ---: | ---: |
| Existing palm/fern/orange trunks | 22 | 22 | 0 |
| Ten palm/fern crowns, twelve actual fronds each | 10 | 120 | 0 |
| Twelve orange canopies with existing fruit | 12 | 12 | 96 |
| Fifty-four shrub/two-flower clumps | 54 | 54 | 108 |
| Total | 98 | 208 | 204 |

These are proposed stock-account groupings with separately local damage, not
whole-crown first-hit retirement rules. Exact source references keep original
geometry hashes, ranges, matrices and native size. Associations do not prove
joints or earth anchors; source floor/bed contact still needs review. Plants
never brace the greenhouse. No new roots, pots or envelope colliders are made.

All owners explicitly have `profileId:null`, `finiteStock:null` and
`moistureResponse:null`. Followers have no independent assignment, including no
implicit zero: their future foliage/fruit combustible stock must be accounted
exactly once in the owner's reviewed budget.

Proposed stock measurements remain separate from response:

- Trunks: actual solid geometry can be reviewed, but dry-stock density/conversion
  and an explicitly selected existing base profile remain unapproved.
- Fronds: use one-sided authored surface area once; future areal dry-stock
  loading/conversion must be reviewed. No grass or cloth fallback.
- Canopy/shrub/fruit: the closed icosahedra are visual envelopes, not solid
  timber or measured plant biomass. Propose a reviewed finite foliage/fruit
  dry-stock budget per source owner; values remain withheld.
- Local shares must sum to the owner budget without duplicate, hidden, born-on-
  activation or refill stock. Visual residency must not change that budget.

## Current interface limitation

Coder Tinderbox confirmed that the current carrier contract has existing
`fuelClass`, finite `fuelAmount`, geometric quantity fields, physical material
and an optional separate combustible finish. It has no local wetness or
ignition-response field. Native `threshold`, `delay`, `seconds` and `energy`
belong to shared profiles; trial-level overrides affect every user of that ID.

Changing stock changes energy, not a wet ignition barrier. Adding a finish adds
another combustible account, not moisture. None of the current fields honestly
encodes a distinct wet response while preserving other profile users.

## Future contract proposal, not an installed profile

The [data-interface proposal](../../../art/source/shared-map-fire-bindings/remaining-geometry-readiness-v1/wet-material-interface-proposal.json)
requests review of an optional shared per-carrier `localIgnitionResponse`:
an explicit approved preset reference with threshold/delay scales, applied to an
explicitly selected existing base profile. That carrier field and consumer path
do not currently exist. No new profile ID or registry entry is proposed/created.
An absent field must preserve every current nonplant profile exactly.

Unselected numerical **game-control hypotheses**, not empirical moisture data:

| Control candidate | Threshold scale | Delay scale |
| --- | ---: | ---: |
| Explicit unchanged control | 1 | 1 |
| Moderate static barrier hypothesis | 1.25 | 2 |
| Stronger static barrier hypothesis | 1.5 | 4 |

No candidate is assigned to H15; base profile and selected preset remain null.
The candidate values require architect/coder approval or replacement. Existing
profile duration/output energy would remain unchanged; actual finite dry stock
is measured independently. There is no water-energy addition, latent reservoir,
dynamic drying, evaporation, moisture transport or weather solver. This is a
static prototype response proposal, not a physically complete moisture model.

Planned controls are recorded, **not run**: short exposure followed by cooling;
sustained finite exposure above both reviewed thresholds; equal explicit stock
and finite-energy bookkeeping; isolation of unrelated carriers sharing the base
profile; local patch retirement/follower consistency; and ordinary common-tool
handling of inert lagoon/basin receivers without hidden fuel.

First approve the data contract, explicit existing parent profile and stock
recipe, then choose response values and controls. No game-specific callback,
global profile override, invisible combustible proxy or implicit inert plant
may substitute for those decisions.
