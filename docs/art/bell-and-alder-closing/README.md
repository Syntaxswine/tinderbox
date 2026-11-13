# Bell & Alder at closing time: art candidate

This isolated artist candidate adds a native-grid lodging and external stair to the
published single-storey shop. Its first evidence is a quiet WebGL exemplar and
explicit physical export. Full actor traversal, causal reactions and the combined
300-second replay remain the coder/architect gate in
[Milestone 22](../../milestones/22-bell-and-alder-closing-time.md).

## Files and reproduction

- [Measured source plan](../../../art/source/bell-and-alder-closing/layout.json).
- [Native assembly](../../../art/source/bell-and-alder-closing/assembly.js).
- [Physical/render export](../../../workbenches/bell-and-alder-closing/scene-data.json).
- [State-driven art factory](../../../workbenches/bell-and-alder-closing/art.js).
- [Export and dimension checks](../../../art/source/bell-and-alder-closing/check.mjs).
- [WebGL receipt](webgl.json) and [source/reference checks](checks.json).

From this checkout, run `node art/source/bell-and-alder-closing/export.mjs`, then
`node art/source/bell-and-alder-closing/check.mjs`. On this Windows review host,
`art/source/bell-and-alder-closing/run-review.ps1` launches a private installed
Chrome profile and finite local server, extracts JPGs and stops both helpers.
The local restart/identity/retirement records live under the ignored
`artifacts/helpers/bell-and-alder-closing-review/` directory. Nothing is retained
for ongoing preview. No production menu or Pages integration is included.

Use `createClosingTimeArt(THREE,{renderer,data,signal})`. It returns the specified
`root`, `update(frame,view)`, `diagnostics()` and idempotent `dispose()`. Every
thermal delta still requires the complete `frame.closingTime` snapshot. Native
actor identity/pose comes directly from `actor.native`; no placeholder animal,
wardrobe family or body rescaling is introduced. Player kits support the existing
goat, horse and AFT bear choices; only the selected player is instantiated.

## Measured composition

The source transform is translation **[-36,0,-9]**, applied once. Ground-shop walking
Y is **0**; lodging walking Y is **2.12**. Their slab thickness is .12m. Native walls
are 1 by 2 by .16m; native door leaves remain 1 by 1.65 by .12m. Each paired entrance
occupies two metres. Separate fixed transom glazing closes the head opening above
the native leaves, with its lower edge 1.71m above the walking surface. This very
small clearance above the 1.7 m civilian envelope needs the actual combined posed-body
sweep; no passage acceptance is inferred from the plan.

The new lodging spans 8 by 8 m with a 2 m partition opening and three original 2 m
Nautilus period sash bays. Roof slabs finish at Y 4.24. The simplified flat timber
roof/deck and covering are an authored prototype, with drainage construction
outside this study. The service flight is 2 m wide: twelve .1766667m rises over 3 m,
.25 m going,1.90 m inside the iron handrails, and a real landing at Y 2.12. Bottom
bearing deck, treads, stringers, landing posts and rails all have physical records.

The 25 original shop fittings retain their source positions and rotations; the 21
unit walls retain their source locations. One additional original native ceiling
pendant over the front shop establishes warm display glazing. A native entry
lantern on a simple 2.12 m iron post supplies the small street light. The new upper
floor has four installed Eastlake furniture pieces. No source building is silently
relabeled as a historical two-storey delivery.

The shallow opposite brick frontage includes a one-metre-grid diagonal return so
an actual wall receiving firelight can be read from the fixed isometric view.
This is a fictional composition, with no opposite interior or hidden combustible
building mass. The first fixture is paved; no grass receiver or Ashland obstacle
wind bake is imported.

## Physics and presentation agreement

Canonical IDs bind surfaces, render meshes, door interactions, glazing, heat and
retirement. Furniture retains its native painted atlas and vertex shading. Trim
uses the installed procedural paint; wall and roof textures use metric mapping.
Glass has its own physical records and is transparent to sight while intact glass
remains projectile cover. The renderer never decides either query.

Every active combustible piece has finite core/cloth/trim fuel or an explicit
finite finish. Amounts retain furnished-house prototype units, not calibrated
mass. Glass, masonry, stone and metal have zero fuel. Mounted lamps, cornice and
sign pieces are supported structural attachments. Ordinary furniture uses actual
downward source facets clipped to real floor contacts. There is no duplicate
static thermal lantern: the one portable model/light changes ownership, and its
actual pedestal is separately identified.

The presentation retains the existing six-light/power 215 fire pool. Four fixed
lamps and one portable lantern establish quiet light. Only the front pendant and
portable point lights cast additional point shadows; the review host also uses
its existing directional moon shadow. No camera exposure change is driven by fire.
The actual submitted counts, source triangles, materials, textures and owned
resources are recorded in the WebGL receipt; renderer units are not lumen claims.

The local [thermal renderer adapter](../../../art/source/bell-and-alder-closing/thermal-art.js)
is derived from the existing furnished-house renderer at `b6838d00`. Its declared
changes are scene identity, data-driven thermal grid origin/pitch, walking Y 0/2.12,
source vertex colors and the texture resolution base. The original renderer stays
unchanged. The flame envelope, small directional details, finite-state masks,
falling debris and broad-building light are reused without thermal coefficient or
narrative timing changes.

[Vent smoke](../../../art/source/bell-and-alder-closing/vent-smoke.js) displays the
runtime's **current observer-independent `closingTime.smokeSignals` collection**.
It requires the current thermal smoke source and validated source/opening/clear-rise
signal. Resident evidence and memory never create or retain world smoke. An empty
collection, closure, blocked path or reset removes the live plume immediately.
The display follows the same measured .2 m outside/1.6 m rise proxy towards
upper-front-4, with declared ambient wind drift. It supplies no perception or
simulation input and is not a fluid solver. A missing collection draws no vent
plume and is reported in diagnostics. Flame/smoke/light toggles remain
presentation-only. Combined readability needs the real replay.

The sound palette records restrained street air, real wood/pavement contacts,
hinge/latch, handle contact, small resident/officer reactions and fuel-driven fire
crackle. Sources are procedural or existing licensed material; playback, limits,
pause/reset/disposal and recording belong to the coder.

## Source pins and limits

Implementation base: `b6838d004778faa6ca08914546499f6af27ce0b6`.
Brief: `d7fd0d2865988779310741d8a0a69b5d16fbeb83`.
Early additive coder API: `a19465407abacc933aba5d296a6f30c507b81595`.
Shared art workflow Version 2 is preserved at `4001bfb5` on the stockyard branch.

Installed Nautilus furniture/shop/lamps: `2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74`,
with the unchanged [source provenance and notices](../../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/provenance.json).
Period sash: original Nautilus `90054d07134116a5d9661f8318a76fe68f922aad` through the
installed window adapter. Native character/Three donor:
`30a3b8cae5f36bb0c1df3685b7fba16f701c2083`; AFT bear/sidearm retain their separate
`4f5f53917990ec03b2f14c65f067e4b99ec8fcaa` provenance. No donor checkout is changed.
The export records actual file SHA-256 values; existing notices and unresolved
rights limitations remain unchanged. User-directed reuse is not a new license grant.

Quiet JPGs are actual shared-WebGL static art fixtures. They do not claim completed
movement, causally witnessed ignition, resident exit, burn progression or final
combined replay acceptance. The receiver-selection sensitivity and ambient-wind
limitation remain declared. The queued neighborhood expansion is outside this
candidate until the closing-time replay has been finished and reviewed.
