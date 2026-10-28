# Exterior fire model v1

Tinderbox's playable buildings are **dry wood: zero moisture by dry mass**, as requested. Brick/plaster skins remain appearance choices. Native wall, door and floor-band dimensions are unchanged. This implementation adds exterior wall heat transfer to the existing ground fire, tool inventory, collision and world clock.

## Evidence used

- [USDA Wood Handbook, chapter 18 (2021)](https://research.fs.usda.gov/download/treesearch/62268.pdf), pp. 18-11–18-15: wood ignition depends on exposure and thermal properties; piloted surface temperatures cluster around 350–380 °C. It distinguishes piloted ignition from unpiloted heating, discusses moisture and protective char, and reports effective heat release. Our representative wood profile uses 365 °C for piloted ignition and 13 MJ/kg effective combustion energy. The density, constant thermal properties, 500 °C unpiloted threshold, mass-flux ceiling and char response are engineering approximations, not measurements of a specific Tinderbox timber species.
- [A Computer Model of Upward Flame Spread on Vertical Surfaces, IAFSS 5 (1997)](https://publications.iafss.org/publications/fss/5/297/view/fss_5-297.pdf), equations 2 and 8–10: wall flame height uses heat release per unit width; absorbed heat drives gasification and combustion. We use the published Tu/Quintiere coefficient 0.0666 and minimum flame/pyrolysis height ratio 1.1 for the connected luminous wall front. The finite-volume implementation and energy allocation are our reduced model, not a port of that validated research program.
- [NISTIR 6293, Painted Stairwell Fires (1999)](https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nistir6293.pdf), section 1.4: buoyancy carries hot gases upward and preheats material ahead of the burning front. The implementation gives the plume a preferred upward direction, rather than prescribing an equal spread speed in every direction. An open exterior does not inherit the enclosed stairwell's heat trapping or test timings.
- [Cohen, Structure Ignition Assessment Model (1995)](https://www.fs.usda.gov/psw/publications/documents/psw_gtr158/psw_gtr158.pdf), pp. 85–92: radiant exposure combines magnitude, duration, source size and separation. Its tests demonstrate that changing exposure can separate ignition from no ignition. We therefore integrate heat over time, include receiving orientation and occlusion, and allow a close burning neighbor to increase feedback. The game does not adopt SIAM's worst-case blackbody assumptions or its clearance estimates.
- [Smith and Hoehler, Imaging Through Fire (2018)](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=925024), flame-height discussion: Heskestad's correlation supplies the free/pool-fire reach proxy for existing ground fuel sources. Wall flames use the separate wall correlation above.

## Solver and units

Simulation coordinates are x/y on the ground and h vertically, in metres. State uses kelvin, kilograms, joules, watts, square metres and **world seconds**. No scientific equation consumes the old normalized ground heat value as if it were watts.

Each exposed box face is divided into patches, default maximum span 0.5 m. Each patch has four finite-volume layers (approximately 1, 3, 12 mm and the remaining interior depth). Assigned column volumes sum to the original part volume; mesh subdivision cannot create fuel. Column backs exchange heat through a conservative part-core junction. Covered face samples are removed. This center-sample surface extraction approximates partial overlaps.

For each node, heat changes its enthalpy. Water first heats to 100 °C, then uses its latent heat of evaporation; dry material can continue warming. Losses include convection to ambient and emissivity times the Stefan–Boltzmann temperature-fourth-power difference. Conduction uses conductivity, layer spacing and temperature difference. A stable material-dependent substep handles steel as well as wood.

A combustible surface needs both sufficient temperature and dry surface fuel. Flame contact supplies a pilot; radiation without contact uses the higher unpiloted threshold. A cold neighbor is never ignited simply because a graph edge connects it to fire.

Burning consumes kilograms, and heat release is consumed mass times effective combustion energy. Extra imposed heating increases pyrolysis through heat of gasification. A representative 25 g/m²/s ceiling and an increasing char resistance bound the material response. Combustion energy is partitioned into local feedback (25%), outward radiation (35%) and plume heat (40%). Absorbed transfer is capped by these budgets; the remainder escapes. Cooling, gasification, evaporation, sensible heat and escaped energy have separate counters.

Connected burning patches on the same building plane form a wall plume. A cold gap separates these components. Its height comes from the component's total heat release per burning width, with the published minimum ratio to pyrolysis height. This avoids treating each simulation tile as an independent tiny pool fire. The unburned wall above it receives hot-gas exposure; temperature excess decays above the flame region. Wind displaces this prescribed plume at a nominal 5 m/s rise speed. That rise speed, lateral entrainment kernel and heat-transfer coefficient are reduced-order approximations, not a solved outdoor flow field.

Radiation uses a softened diffuse flame-sheet view-factor approximation plus a smaller gas-flame component. Receiving orientation, distance and solid line of sight matter. Normalization prevents many recipients from absorbing more radiation than a source emitted. Every native elevated wall/band shields in 3D even though it is not a ground-navigation obstacle. Burned-out parts stop blocking cached transfer paths.

## Existing game integration

- Street and exposition opt into surface fire. Street building bodies become wood; native exposition modules already use wood. All have zero default moisture.
- Ground walls managed by this model are excluded from the legacy ground surface-fuel ledger, so the same wall is not burned twice. Gasoline on the ground stays in the existing finite inventory/field.
- Consumed ground fuel supplies an explicit bridge: 32 MJ/litre for deposited gasoline and 13 MJ/kg for ground biomass. Only energy actually burned is passed to surface transfer. The old ground front remains the established gameplay approximation. This bridge currently runs from ground fire to walls; new wall fires do not yet heat the legacy ground field or trigger drums through that field.
- Tool pulses have explicit finite adapters: matches 600 J per old heat unit, torch 3 kJ, Molotov 100 kJ and flamethrower 40 kJ. These are provisional game source budgets, not calibrated replicas of physical equipment. An empty tool supplies zero energy. Torch/flamer emission still follows the existing player clock; material response follows world time.
- Powder slows the thermal clock, pause freezes it, reset rebuilds it, and snapshots are detached. Damage reads authoritative burning surfaces. A part retires collision only when its assigned combustible mass is exhausted. This is burnout, not a load-bearing collapse calculation.
- The runtime owns one disposable instanced surface visualization, alongside the artist's unchanged scene. Hot patches and flame roots follow the model. It never applies ignition or damage.

## Shared snapshot contract

The v1 simulation snapshot adds top-level `structureFire`, without changing existing commands or ground cells:

- `version: 1, time, wind: {x,y}`.
- `surfaces[]`: stable `id, partId, moduleId, buildingId`; `x,y,h`; outward `nx,ny,nh`; `area,spanA,spanB,faceAxis`; `material,phase,temperatureK,waterKg,fuelKg,powerW,netHeatingWm2,ignitedAt,plumeTopM,flameHeight`.
- `diagnostics`: initial/remaining/burned fuel, heat release, supplied/absorbed/escaped energy, stored heat, losses, patch/link counts and highest burning surface. Watts are authoritative heat release, not a visual intensity multiplier.

Native part IDs are the join key for skins and damage presentation. Managed upper walls retire according to their own fuel state; the old purely cosmetic support-hiding rule remains for un-managed legacy fixtures. Roof-envelope boxes stay decorative because their bounding boxes are not the sloped roof meshes. Renderers must not infer fuel from a skin name.

## Verification and reproduction

Run `node tools/check.mjs`, `node tools/build.mjs`, and `node tools/check-release.mjs`. `tests/simulation/structure.test.js` covers exposure/ignition ordering, energy balance, finite burnout, dry defaults, view-independent materials, upward spread, neighboring buildings, wind direction, shielding, ground/tool fuel budgets, clock determinism and numerical sensitivity.

Generate the [physics evidence](fire/physics-evidence.json) with `node tools/fire-evidence.mjs docs/engineering/fire/physics-evidence.json`. Diagnostic wet/steel/masonry controls test the general solver; playable Tinderbox buildings remain dry wood. Close-gap calm and downwind cases, a 3 m gap, a noncombustible screen and a wet control use the same native geometry and 30-second source exposure. These comparisons verify causal ordering; their ignition times are not claims of agreement with a full-scale experiment.

Serve the source root and open `/workbenches/fire/` for the responsive 3D laboratory. It offers calm, wind and wide-gap dry-wood cases plus all five native story counts. Manual fast-forward runs ordinary fixed ticks, without changing the material equations or simulation clock scale. Workbenches and evidence are excluded from public builds.

## Current approximation boundaries

Exterior oxygen is assumed available. Airborne embers, smoke/oxygen transport, roof combustion, interior ventilation, window failure, suppression and structural collapse are not implemented. In particular a wide gap remaining unlit in this model says nothing about ember ignition. Radiative links are truncated at a configurable 12 m by default, with bounded patch/link allocations for phone-oriented scenes. Large city layouts need separate convergence and device profiling. This is a science-informed game model; the tests do not establish fire-engineering validation.
