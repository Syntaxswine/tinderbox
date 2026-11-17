# Administration and Horticulture material-family proposals

**Unaccepted, unapplied source-review candidate**, 17 November 2026.
Prepared on `codex/shared-map-fire-bindings` from artist archive
`2b6444a7fddf257a798ca5ae888505f6169e0efd`. The containing Git commit identifies
this new candidate. It proposes materials and ownership conventions only.
Original physical materials remain unassigned, and no runtime binding, fuel,
support, anchor, repair, geometry export, build or renderer is supplied.

Inputs are accepted UI inventory `4498db77a606f87413765b26b34811ef360a4776`
and its frozen source context `2b350309d9116812a1d3988af090614bdaefbc25`.
The [exact input pins](../../../art/source/shared-map-fire-bindings/remaining-material-proposal-v1/input-pins.json)
include four original factory pins, immutable metadata/research Git objects and
strict compiled-scene fingerprints. The [accepted UI snapshot](../../../art/source/shared-map-fire-bindings/remaining-material-proposal-v1/accepted-ui-intake.md)
is preserved byte for byte. The New York archive and approved front 48-block kit
remain unchanged; no 96-repeat or 20 roof-saddle geometry is expanded here.

## Facts, adaptations and unresolved evidence

| Place/source | Historical fact | What it does not establish |
| --- | --- | --- |
| Administration, Hunt/Riquois 1893 sheet and built photographs | Front-half plan, massing and source office functions. | Concealed cores, every floor/roof substrate, rear/upper partitions or per-member material. |
| Administration, [Flinn 1893](https://archive.org/details/officialguidetow00flin), pp.43/45, scans49/51 | Gilded dome, octagonal rotunda, pavilion offices and broad stairs. | Gilding is not evidence of a solid metal dome or of a timber substrate. |
| Horticulture, [Conkey 1893](https://archive.org/details/plansdiagramsofa00worl/page/n28/mode/1up), p.9, scan29 | Cream staff exterior, glazed front-curtain roofs, crystal dome, galleries/cafes and living planting/aquatic basins. | Exact framing alloys, hidden cores, roof substrates, quay construction or plant moisture/combustion. |
| Horticulture, [Iron Age, 1 September 1892](https://americanprotectivetariffleague.org/library/1892-anon-iron-age-1892-09-01-vol-50/), Getting Ready for October | Contemporary report identifies ornamental ironwork at the dome. | Extending metal to all 453 modelled frames, including cupola/gallery/lantern parts, is a game adaptation. |
| Existing staff research, Conkey guide p.68 | Period staff composition/marketing is registered in the existing dossier. | Promotional fireproofing does not establish a whole building's fire resistance. |

The existing Conkey page was visually re-read. The new Iron Age finding is
verified in its primary transcription context; a scan folio is not asserted.
The inaccessible Administration construction-report leads remain unverified.
[Research notes](../../../art/source/shared-map-fire-bindings/remaining-material-proposal-v1/research-notes.json)
record these distinctions and retrieval limits. No new image pixels or rights
grant are imported.

**Every timber, masonry, metal, mineral-staff or soil proxy below is an explicit
game-design proposal.** Neither appearance hashes, cream/green/gold paint nor
the native `wood`/`concrete` authoring enums choose physics. Uniform solid-core
proxies are not a claim that a hollow staff-clad historical assembly was a solid
block of that material. No coating fuel or new insulation/fireproofing rule is
added.

## Exact scope and quantity vocabulary

Counts are logical source IDs after expanding `sourceRanges`, not final carrier
counts or unique mesh counts. For each row the corresponding proposal JSON gives
its ordered selector, original ID examples and SHA-256 of the complete sorted
ID set. Selectors apply only to the exact pinned descriptor inventory; a
`replacement/` prefix is stripped for semantic matching only and remains in
the actual identity. The per-section files retain every exact descriptor hash
and row count. No ID is inferred from a colour or assigned twice.

| Rule | Proposed finite convention, only after geometry review |
| --- | --- |
| `wall-area` | Actual remaining primary wall/closure area at native .16 m depth, times 1; one physical area, not both faces. Office partitions select the existing partition profile. |
| `top-area` | Actual upward projected slab/tread area times 1; preserve actual .12 m slabs and apertures. |
| `closed-volume` | Verified closed physical union volume /.12; compound intersections/cosmetic layers are not counted twice. Withhold if closure, overlap or physical ownership is unresolved. |
| `leaf-area` | Body plus existing upper extension area times .45, once per portal/sign; separate inert hardware. |
| `weather-area` | Actual exposed upward roof area times 1, excluding buried/duplicate portions; no bounds-based area or automatic cap. |
| `inert` | Proposed zero fuel; retain actual geometry, screening, breakage, attachment/mass intent and unsupported retirement. Inert does not mean grounded, indestructible or structural. |
| `withheld` | No finite assignment, including no automatic zero, dry-timber or grass fallback. |

Units would be prototype-fuel-units, not historical mass. These are proposed
measurement recipes; **no quantities are measured or assigned in this task**.
Only existing `clapboard`, `partition`, `frame`, `door`, `roof` and `furniture`
profiles are selected. Their declaration is pinned and unchanged. No new
combustion profile, rate, threshold, lacquer account or cloth substitution is
introduced. Proxy material labels are proposal descriptions, not new runtime
material IDs; an accepted compiler must explicitly map them to existing boundary
semantics rather than infer behavior from the label.

## Administration

Original factory pin: `43337a33ddfe4dff6849654c827c56e1f24e1acc`.
**41,522 logical source parts; 39,801 render records; 653 sections.**
The [Administration proposal](../../../art/source/shared-map-fire-bindings/remaining-material-proposal-v1/administration-proposal.json)
contains exact scopes and per-family ID-set hashes.

| ID | Source family / exact-selector key | Source IDs | Proposed physical material / existing profile | Quantity rule |
| --- | --- | ---: | --- | --- |
| A01 | Native approach walls/closures | 288 | masonry-proxy / inert | inert |
| A02 | Authored office partition core | 628 | timber-proxy / partition | wall-area |
| A03 | Other native wall/closure core | 10,720 | timber-proxy / clapboard | wall-area |
| A04 | Native and derived floor/deck cells | 21,204 | timber-proxy / frame | top-area |
| A05 | Exterior approach treads | 48 | masonry-proxy / inert | inert |
| A06 | Added interior stair treads | 708 | timber-proxy / frame | top-area |
| A07 | Stateful native leaf bodies/extensions | 16 | timber-proxy / door | leaf-area |
| A08 | Leaf hardware | 8 | metal-proxy / inert | inert |
| A09 | Actual glazing parts | 52 | glass / inert | inert |
| A10 | Fixed portal and window carpentry | 631 | timber-proxy / frame | closed-volume |
| A11 | Added stair rails/guards/supports | 3,154 | timber-proxy / frame | closed-volume |
| A12 | Substantial column core pieces | 96 | timber-proxy / frame | closed-volume |
| A13 | Authored office desks | 33 | timber-proxy / furniture | closed-volume |
| A14 | Dome shell/ribs/caps/terminal | 31 | metal-roof-proxy / inert | inert |
| A15 | Staff-like trim/sculpture/balustrades | 3,905 | mineral-staff-proxy / inert | inert |

A01 is explicitly the `approach-*` native runs; A02 is
`office-partition-*`; A03 is the other native wall/closure IDs. A04 includes
`ground-floor/*`, `pavilion-floor-{3,5,7}/*`,
`pavilion-roof-and-gallery/*`, `upper-colonnade-terrace/*`,
`dome-spring-ring/*` and exact added access landings.
A10 selects fixed portal/window carpentry, including eleven original cut
`office-door-*/header` IDs; it excludes moving leaves and added access rails.
A11 selects the six added access assemblies and their actual rail/guard/support
pieces. A13 is eleven authored desks, not thirteen historical desk findings.
A14's metal roof proxy is a choice for the shell, 24 modelled ribs, crown
cap/terminal and four small cupola caps; the actual substrate/load-bearing
assembly is unresolved. Decorative leaves, mouldings and staff-like sculpture
remain in A15 rather than receiving invented timber fuel.

## Horticulture

Original factory pin: `c4287338ff93907900a94a86b6c7e3bed0ae7c2f`;
waterfront parent `c6ddd51d7dd47a2ec148159e6a6d64a8d00bd2a9`.
**63,788 logical source parts; 61,954 render records; 445 sections.**
The [Horticulture proposal](../../../art/source/shared-map-fire-bindings/remaining-material-proposal-v1/horticulture-proposal.json)
contains exact scopes and per-family ID-set hashes.

| ID | Source family / exact-selector key | Source IDs | Proposed physical material / existing profile | Quantity rule |
| --- | --- | ---: | --- | --- |
| H01 | Terrace native paving cells | 10,404 | masonry-proxy / inert | inert |
| H02 | Terrace native retaining backbone | 346 | masonry-proxy / inert | inert |
| H03 | Terrace rail bars/stair rails | 1,038 | metal-proxy / inert | inert |
| H04 | Other terrace facings/coping/posts/treads | 3,445 | mineral-quay-proxy / inert | inert |
| H05 | Wall and level-closure core | 11,198 | timber-proxy / clapboard | wall-area |
| H06 | Building floor/gallery cells | 27,996 | timber-proxy / frame | top-area |
| H07 | Unoccupied spring/entry/foyer roof decks | 1,961 | timber-proxy / frame | top-area |
| H08 | Added dry approach treads | 24 | masonry-proxy / inert | inert |
| H09 | Three gallery stair tread families | 72 | timber-proxy / frame | top-area |
| H10 | Native paired leaf bodies/extensions | 20 | timber-proxy / door | leaf-area |
| H11 | Leaf hardware | 10 | metal-proxy / inert | inert |
| H12 | Glazing and vents | 381 | glass / inert | inert |
| H13 | Dome/lantern/glazed-gallery framework | 453 | metal-proxy / inert | inert |
| H14 | Cupola coverings | 2 | metal-roof-proxy / inert | inert |
| H15 | Live foliage/fruit/trunks | 412 | live-vegetation-unresolved / withheld | withheld |
| H16 | Soil/planting-bed proxies | 18 | soil-proxy / inert | inert |
| H16b | Court basin kerbs | 8 | masonry-proxy / inert | inert |
| H17 | Decorative basin water | 2 | water / inert | inert |
| H18 | Cafe tables and benches | 64 | timber-proxy / furniture | closed-volume |
| H19 | Fixed portal/window carpentry | 2,213 | timber-proxy / frame | closed-volume |
| H20 | Gallery guards and stair rails | 799 | timber-proxy / frame | closed-volume |
| H21 | Rear/end opaque roof coverings | 3 | timber-covering-proxy / roof | weather-area |
| H22 | Staff-like arcade trim/sculpture | 2,919 | mineral-staff-proxy / inert | inert |

H01-H04 cover exact `terrace/<tileIndex>/*` source IDs. Thin courses,
rusticated facings, coping and capped posts do not become a second retaining
backbone or extra fuel. Their exact follow/support mapping is unverified:
tile membership alone cannot create a load-bearing join or retirement owner.

H06 is `first-floor/*`, `pavilion-galleries/*` and
`rotunda-gallery/*`. H07 covers `dome-spring-deck/*`,
`entrance-roof/*` and `foyer-roof-{0,1}/*`. H13 comprises 166 dome-frame,
two lantern-frame, 25 lantern post/crown and 260 glazed-gallery frame pieces.
H21 is `rear-curtain-roof` plus the two derived
`replacement/end-pavilion-roof-{0,1}` coverings. Their timber-covering proxy
does not claim that the historical roofs were wood.

H15 deliberately withholds all 412 live plant parts: 390 foliage/flower/fruit
records and 22 palm, fern and orange-tree trunks. Living tropical vegetation
cannot silently inherit the dry-frame or fast-grass profile. H16's 18 soil beds
and H16b's eight basin kerbs have distinct proposed physical materials.
The empty A99/H99 catch-all scopes certify complete ID classification, not
complete historical-material verification.

## Ownership, structure and exceptions

[Compound-owner proposals](../../../art/source/shared-map-fire-bindings/remaining-material-proposal-v1/compound-owner-proposals.json)
list 53 candidate groups: eight Administration leaves, ten Horticulture leaves,
eleven three-piece desks, eight tables and sixteen separate benches. These are
grouping proposals, not bindings. Actual contacts/closed union quantities require
review. A shared mesh hash, nearby furniture, room label or section batch never
creates one fuel account. Other actual solids retain separate logical identity
pending physical/cosmetic ownership review.

Both maps retain walls 1x2x.16 m, slabs 1x.12x1 m and level pitch 2.12 m.
Native leaves remain 1x1.65x.12 m; their separate existing 1x1.15x.12 upper panels
join the same leaf account. Closed/open transforms, hinge axes, glass and
hardware come from the unchanged sources. Fixed headers depend on actual fixed
frames, not moving leaves. Administration has four stateful closed paired
portals plus eleven nonstateful office passages; Horticulture has five stateful
closed paired portals. No new leaf is invented for an open passage.

Occupied Administration levels remain1/3/5/7/9/19. Its L23 spring ring and L36
crown are not new occupied destinations. Horticulture remains occupied at L1/L3;
L5 spring/foyer decks and L16 crown are not destinations. Source-local access
plans and world matrices remain distinct: offsets[62,0,22] and[176,0,39] are
already applied to emitted geometry/navigation and are never added twice.

**No support graph or anchors are proposed here.** Inert facings, glass,
decorations and railings do not brace primary structure merely because they
touch it. Real volume, bearing, explicit carpentry and true gaps must be checked
separately on actual native facets. Preserve all local regions per canonical
pair and corresponding surviving patches when the consumer interface is
approved. No New York ten-join list, inferred anchor, coating, numerical
allowance, 29-repair pattern or 96+20 gap design is transferred.

The [Administration cut ledger](../../../art/source/shared-map-fire-bindings/remaining-material-proposal-v1/administration-cut-exceptions.json)
retains 210 explicit source substitutions; the compiler separately reports
484 cut-floor parts. The [Horticulture cut ledger](../../../art/source/shared-map-fire-bindings/remaining-material-proposal-v1/horticulture-cut-exceptions.json)
retains 61 substitutions and the compiler reports zero cut-floor parts even
though two gallery holes remain. These counts describe different operations.
Navigation marks 243/199 unique collision shapes `closed:false`; that metadata
is not an independent solid-volume verdict. All closed-volume recipes remain
withheld until actual geometry passes. No caps, replacement jambs or repairs are
authored; existing Horticulture roof underside/cut adaptations remain intact.

Glazing remains nonfuel and non-load-bearing. Open lathe/roof skins and arched
glass retain their real facets/thickness and cut holes. One large dome-skin
render ID does not establish one rigid pane or whole-dome failure: local damage
ownership and breakage are a later consumer/geometry decision. Bounds are never
substituted for a glass volume.

Horticulture's manifest lagoon rectangle is
`{x:176,y:10.5,width:352,depth:21,height:0}`, spanning world Z0-21;
plan `y` here means world Z. The two `court-basin-*/water` meshes are separate
decorative basin surfaces. Neither is a fuel account, guaranteed navigable
surface, new heat-capacity value or implemented suppression/flow system.
The water-facing central terrace stair is not a dry-land approach.

## Later compilation and independent review

These files are offline authoring evidence, not a startup table. Later approved
compilation should emit the existing compact ID/profile/quantity/range tuples
and bounded shards, qualify map/source IDs once, and keep one persistent account
through visual unload/reload. It must not fetch this complete proposal or the
original factories/research at game startup, create fuel on activation or refill
a retired owner. The 653/445-section maps also exceed the current 192-section
full overview cap: reuse the accepted lightweight plan-overview path and bounded
nearby residency rather than raising the cap or loading every section.

Actual Administration/Horticulture conversion still follows the New York
engineering visual gate. No material approval, actual quantities, local support,
destruction, traversal, water/plant behaviour, startup budget or rendered
acceptance is claimed by this proposal.

Read-only reproduction, from the assigned art checkout:

```text
python -B art/source/shared-map-fire-bindings/remaining-material-proposal-v1/analyze.py --check
python -B art/source/shared-map-fire-bindings/remaining-material-proposal-v1/check.py
```

[Focused check results](../../../art/source/shared-map-fire-bindings/remaining-material-proposal-v1/check-results.json)
pass 34 immutable input-object pins, four original factory pins, all 1,098
section descriptor bytes against the frozen Git trees, all 105,310 logical IDs,
38 nonempty proposal families, existing-profile selection and all 53 compound
groupings. All six generated scope/exception files reproduce byte for byte.
[Authoring notes](../../../art/source/shared-map-fire-bindings/remaining-material-proposal-v1/authoring-notes.json)
retain input-serialization/runtime-context distinctions and the corrected
checker lookup. The default checker denies filesystem writes even on failure.

The [package inventory](../../../art/source/shared-map-fire-bindings/remaining-material-proposal-v1/review-package.json)
lists exact changed source-review paths/hashes. No geometry arrays or factory
execution, runtime build, broad suite, renderer, browser, server or retained
helper was needed. No extra worker was created.
