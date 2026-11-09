# Shared structural fire

The candidate starts at `080634a0e83f8da266897d60e951b680261908fe` on `codex/shared-structural-fire-coder`. Ordinary Catalogue Street houses and the Ashland pair share heat storage, cooling, ignition, directed surface spread and ground contact. Ordinary dry timber belongs to wall, fascia, roof and deck sites. The ground field owns grass, spilled oil and other ground fuel.

## One-match routes

Use the normal **Play → Bear → Catalogue Street** entry and the default follow zoom. Walk up to the indicated face, tap to aim at it and press **Matches** once. X and Z are ground coordinates in metres. The strike range is 0.85 m. The first two player and aim points below select one clapboard patch and one wooden window sash, respectively.

| House and target | Player (X, Z) | Aim (X, Z) |
| --- | --- | --- |
| Hopkins No. 9, east clapboard | (10.82, 34.63) | (9.90, 34.63) |
| Monroe middle unit, north window sash | (38.50, 30.35) | (38.50, 31.15) |
| Hopkins No. 15, east clapboard | (24.82, 8.50) | (23.90, 8.50) |

A strike at bare Monroe brick (37.30, 30.35) toward (37.30, 31.15) reports **blocked**. A strike from (5.60, 29.35) toward (5.60, 30.15) at Hopkins No. 9 meets the solid plinth before reaching the chamfered siding. A spent timber site in a standing section reports **no fuel**. Movement remains constrained by the standing footprint.

The fixed-step replay isolates the structures from surrounding grass. Times are world seconds after the accepted match. Each first main-roof ignition has a recorded causal chain through an upper wall and an eave.

| House | Upper wall | Upper eave | First roof | Main roof | First section clear | Last section clear |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Hopkins No. 9 | 0.97 | 2.33 | 3.02 | 3.02 | 11.48 | 18.38 |
| Monroe middle | 1.17 | 2.78 | 3.62 | 3.62 | 14.90 | 20.62 |
| Hopkins No. 15 | 0.97 | 2.52 | 2.65 (rear hip) | 3.33 | 14.23 | 19.32 |

Two separate packaged WebGL visits used the production movement and tool controls at zoom 1 with a 1280 × 414 game canvas. In No. 9, a tap from (10.666, 34.440) reached (10.080, 34.428), and the main roof caught after 3.02 seconds. In Monroe, a facing strike from (40.438, 30.350) reached the neighboring sash at (40.913, 30.920), and the main roof caught after 3.23 seconds. The first section retired at 11.50 and 14.42 seconds, respectively. The two runs finished with zero colliders for the burned house and zero recorded page errors. The JSON receipts and canvas JPGs are in the coder worktree under `artifacts/qa/shared-structural-fire/recordings/`.

## Ashland with wind and calm

Open the same Catalogue Street entry with `?cottages=1` for wind and `?cottages=calm` for still air. Walk to a chosen patch, aim at the siding and press **Matches**. Reset the scene to try a different patch. From the spawn at (52.84, 13.50), aim toward (51, 13.50) for the first cottage's east-side reference strike. With wind, an ember from that fire ignites the second roof after 11.95 seconds. The opposite wall gives a different roof path and a 10.13-second crossing. In calm air, the east-side replay leaves the second cottage cold. Every ignited cottage has its own 30-second clearance clock. The focused regressions also exercise upper and lower floor ignition from falling fuel. [Cottage route and timing record](playable-cottage-pair/handoff.md)

## Integration

- `src/content/housing-envelope.js` reads the pinned native plan and follows the existing Gross and Hopkins assembly recipes, including the intersecting gambrel faces. `src/simulation/housing-topology.js` builds local links for touching timber and supporting decks. Joined Monroe party faces and bare brick carry no wood fuel. Quarter turns transform positions, normals and directional wind response into world space.
- `src/simulation/combustion.js` and `src/simulation/surface-fire.js` supply the common rules. `field.js`, `cottage-topology.js`, `cottage-fire.js` and `housing-fire.js` adapt ground, Ashland and ordinary housing. Ordinary sections release collision after the last fuel site that section supports is spent. Ashland uses its tile masks, roof contacts and falling debris. Ordinary roofs follow local thermal links and can exchange heat with their environment through the ground field. The authored wind bake covers the Ashland pair.
- `src/simulation/index.js` and `tools.js` wire player actions and snapshots. A lantern striking timber seeds its actual structural contact and spills oil. Other impacts use the ground field, including heat to explosive barrels. The held flamethrower uses clipped rays. `src/runtime/index.js` passes the actual default daylight light objects to the art factory as `defaultLights`. `src/runtime/navigation.js` supplies an empty structural sample array on landmark visits.

`snapshot.structureFire` contains detached world-space samples for burning and warming structure sites. Each has stable `id` and `buildingId`, a `part` of `walls`, `roof` or `ground`, coordinates `x, y, z` and normal `nx, ny, nz`, area in square metres, `exposed`, normalized `flame`, `smoke` and `heatFraction`, and world-clock `ignitionTime`. Warm samples have a null ignition time. The separate Ashland frame retains mask, ember, vent and debris state. The ground renderer reads `snapshot.cells`. This candidate's ordinary browser shots use the legacy daytime presentation. The artist's matching roof effects and shared night lighting need the combined visual review.

The geometry source is the existing housing intake at `56b028c2935b5a97fe259618f38e0a1550928ab4` with the window pin `90054d07134116a5d9661f8318a76fe68f922aad`. The existing Nautilus `packages/wind-core` intake uses `4ef13e738845f9bd35aed35ea982ea4f0cbc210a` and wind-bake SHA-256 `458314f7ef202d32481a48f4447b46a9e7693080d21c73aadbf87123ef88761b`. Burn times and exposure coefficients are game tuning. [Housing intake](../../assets/art/neighborhood-intake.json) · [Wind intake](playable-cottage-pair/intake.json)

`node tools/check.mjs` passed 213 tests plus provenance and art checks. `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,479 packaged files at a nested project URL. The architect owns combined review and Pages promotion.
