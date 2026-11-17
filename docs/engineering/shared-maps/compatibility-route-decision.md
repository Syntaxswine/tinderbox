# Production Catalogue route boundary for M29

The source-only UI audit `f23510d9b76f8578d36057a9ac69a73128b139c8`
is accepted. Root verifies its 33 links across 23 files at frozen `cd443ccd`.
See [the route matrix](../../ui/shared-map-presentation/catalogue-route-compatibility.md).
This decision defines later runtime work; it installs no route or physics change.

## Reuse what already shares the core

Default Catalogue and `?witness=1` already reach `createSceneThermal` through
the Catalogue compatibility wrapper. Retain that working wrapper and its scene
publication, shop, resident, patrol, pickups and navigation unless a concrete
consumer problem requires an adapter change. One shared set of fire/tool rules
does not require replacing every working factory with `gameplayMap`.

Do not pass Catalogue as an empty landmark map to satisfy a factory-name check.
The current mutual-exclusion guard prevents two physical providers; preserve
that single-owner protection. Any additional context must be explicit provider
data with one world, one stock account, one player and the existing lifecycle.
The production title remains exactly four destinations.

## Older production query routes

Bring `?cottages=1` and `?cottages=calm` onto the common native scene-thermal
rules while preserving their actual translated Ashland pair, baked wind/calm
sampler, camera, native skins, source dimensions and selected character. Do not
add a shop, witness controller or duplicate house to a cottage scenario. Verify
ordinary matches/torch/cone/pour/throw and local heat, retirement and cooling;
the older 30-second replay is historical evidence, not a new decay override.

The public `?catalogue=legacy` query must no longer silently select obsolete fire
rules. It may route to the common Catalogue provider with the existing context;
keep the old provider as an explicitly historical engineering fixture outside
the production menu/auto-start path. Preserve the fixture's original source and
its recorded controls rather than rewriting historical evidence. Confirm any
diagnostic caller separately before changing its entry.

Keep query precedence and context explicit: recognized cottages still win over
witness; `?witness=1` retains its spawn, officer route and memory setup; default
modular Catalogue's existing witness behavior stays intact. `physics=facets` and
`execution=reference` retain their documented common-provider diagnostic meaning.
The exported direct `startGame` helper is not evidence for URL/menu behavior.

All production routes retain the five tool identities, existing UI/capability
ceiling, selected native animal, world/player clocks and abort/disposal contract.
Verify actual production-menu dispatch and provider identity, not only a parser
or catalogue entry. No extra HUD loop, actor, firelight owner or heat provider is
introduced. Runtime and visual acceptance follow the New York engineering gate.
