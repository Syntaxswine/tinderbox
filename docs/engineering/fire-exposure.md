# Fire exposure on Catalogue Street

## November 10 porch and setback follow-up

The Hopkins 12 deck has eight 1 m timber sites at 0.48 m. Each site uses its own part of the outer perimeter. The entry, post and stairs connect to nearby deck timber, and adjacent pieces use the existing surface travel rule. The stair fire sample represents the middle tread at 0.32 m.

| Round-two replay | Result |
| --- | --- |
| Match west of the shipped Hopkins 12 porch | Lawn 8.5 m east catches at +5.72 s from adjacent grass, compared with +1.83 s from the deck on `26931d9` and +5.80 s from grass on `720f7b6`. |
| Two isolated half-metre grass cells 7 m apart | Both local deck sites warm to 0.829 of ignition and cool without catching. |
| Paved porch gap | The eight deck sites light consecutively at 0.70 s intervals from adjacent pieces. The far lawn catches at +6.65 s across this fixture. The 5 m wall control takes +6.07 s. |
| Single match against the deck | The match lights one piece. The first ground wave lights two adjacent cells spanning 0.5 m, compared with 22 cells on `26931d9`. |

Hopkins 9 and 13 retain the published rectangular movement and ground-heat collider. Elevated rays and lanterns use private blockers compiled from the native room and wall plans and clipped with the live sections. The open rectangular stone top is at 0.36 m. The 0.12 m room slab and rim bring occupied floors to 0.48 m, where the ground-storey walls start. The two porches use low decks and treads with post and rail cover. A lantern that hits the room rim immediately beside low siding can heat that timber. A lantern that hits the open plinth lands on stone. Preview and flight use the same query.

The original `r04` replay reaches all 21 setback panels with the lantern and 18 with the flamethrower. Each remaining centerline shot starts 4.60 m from its wall face, beyond the 4.50 m flame range. The same lantern replay with an aim point 0.45 m past the face instead of 0.30 m also reaches all 21, clearing the deep slab rims. The ground-only approaches in this sweep stay cold at the setback panels.

## November 10 frontage follow-up

The hostile review measured alternating cold half-metres on the Hopkins 9 east siding. The frontage now follows the native exposed edge at each of the existing 0.38 m and 0.84 m depths. Every 0.5 m of contact contributes the existing band strength. Partial lengths scale with overlap. A cell reached twice by the same site uses its strongest clear contact. The local deck and stair pieces each couple along their share of the outer perimeter. The post uses its native exposed base. Live section and masonry cover still gate those paths.

| Replay | World-time observation |
| --- | --- |
| Hopkins 9 east siding, near gas contact `cell:20,68` or `cell:20,69` | Both halves ignite at 1.267 s, with the respective ground cell as the parent. All eight exposed rows 68–75 catch in the full contact sweep. |
| Hopkins 9 east siding, farther gas contact `cell:21,68` or `cell:21,69` | Both halves ignite at 1.733 s. |
| Hopkins 15 full lawn, four cells lit by one match | Siding catches at 0.950 s, 0.933 s after the match. |
| Hopkins 15 earlier two-cell control | With both contacts exposed, siding catches at 2.383 s. |
| Hopkins 15 isolated one-cell control | Peak siding heat is 0.567 of ignition. The grass is spent and siding cools to zero by 11.567 s. |
| Hopkins 12 native front lawn | Ground fire ignites the stairs at 1.850 s and the first deck piece at 2.433 s. A separate ground source warms the exposed post before any structure ignites. |
| Hopkins 12 facing flamethrower | Three neighboring deck pieces or the stair site catch at 0.233 s in the respective exposed shots. The short masonry screen, facing away and out-of-range controls leave the porch cold. |

The single-cell torch traces in `tests/simulation/fire-exposure.test.js` were re-run at their established sources. Hopkins gas and timber still cross at 1.717 s and 1.550 s after source ignition. Its isolated grass peaks at 0.624 game heat, under the 1.10 threshold. Ashland's short gas dose peaks at 0.686 and cools. The sustained dose crosses at 1.567 s. Both masonry-screened receivers stay at zero.

The ground-front regression checks the existing gas, grass and timber arrival ticks at fixed axis and diagonal positions. An identity mutation passes. Ignoring the receiver multiplier or substituting the gas ignition threshold fails those arrivals. Suppressing ordinary house-to-ground transfer fails the separate adjacent-lawn replay. The mutation checks substitute source in memory through the review's loader hook.

The ten-case one-match census matches the published `4fc97bb` replay's burned zones, house ignition and collapse sets, and barrel order. The north and south lawn fires remain on their respective sides. The Monroe bare-brick strike reports `blocked`, and road and paving report `no-fuel`. The north-lawn active flame window ends at 27.18 s, compared with 35.93 s in the earlier census.

## Earlier exposure replays

The candidate starts from published `801807b2e71638101861c875c2d23c9ad73ad17b`. In the same controlled replays on that revision, grass and gas both ignited the Hopkins receiver after 0.667 world seconds and the Ashland receiver after 1.750 seconds. The ground solver limited outgoing heat by the receiver's output setting. The Ashland ground contact used the same flame-intensity gain for every fuel.

Fire spread depends on whether adjacent fuel heats the receiver long enough to ignite before the source goes out. The values below are game tuning in dimensionless heat units. [US Forest Service flame residence research](https://research.fs.usda.gov/firelab/projects/burningrate) · [NIST cellulosic ignition experiments](https://www.nist.gov/publications/ignition-cellulosic-fuels-heated-and-radiative-surfaces-nist-tn-1481)

## Runtime tuning

| Active fuel | Outgoing heat at unit coupling | Ground receiving multiplier | Ground ignition threshold |
| --- | ---: | ---: | ---: |
| Deposited gas | 40 | 1 | 0.60 |
| Dry grass | 6 | 1 | 0.85 |
| Timber | 44 | 0.035 | 1.10 |

After the existing distance and travel-time check, a burning ground cell transfers its own output through the receiver multiplier and distance. The receiver cools at 0.30 heat units per world second. A lit source can contribute until its finite fuel runs out. The 0.5 m grass and full timber cells last 3.20 and 12.00 world seconds. Gas duration follows the amount poured. The existing flame intensity and damage use their own values. Direct match and torch applications still seed the selected patch immediately.

Ashland exchanges ground heat along the full exposed siding at 0.38 m and 0.84 m. Each 0.5 m of contact contributes 0.024 or 0.018 of source output at its respective depth. The low wall uses a 1.00 threshold and cools at 0.075 per world second. A burning low wall heats existing ground fuel through the same clear frontage. The paved gap has zero fuel until the player deposits some. Internal spread, Nautilus ember flight, roof contact and falling fuel advance on world time. Each structural component has its own 150-second decay clock from ignition. The shared ground solver applies the three fuel profiles in diagnostic scenes as well.

## Controlled replays

Run `node --test tests/simulation/fire-exposure.test.js`. The test lights one real ground source with the two-phase torch. The Hopkins test retains the native Hopkins 9 placement and its wall fuel. The Ashland test uses its native `right:3,0` siding. Each comparison retains the same source cell and receiver. The shielded runs add a solid masonry screen. The table measures world seconds from source ignition and reports the highest sampled receiver heat before ignition or the heat on the crossing tick.

| Receiver and source | Source burn | Receiver heat | Outcome |
| --- | ---: | ---: | --- |
| Hopkins `cell:20,69`, grass | 3.200 s | 0.310 / 1.10 | Cooled below 0.001 by +4.250 s |
| Same Hopkins receiver, gas | 8.533 s | 1.125 / 1.10 | Ignited at +1.067 s |
| Same Hopkins receiver, timber | 12.000 s | 1.112 / 1.10 | Ignited at +1.017 s |
| Same Hopkins receiver, gas behind masonry | 8.533 s | 0 / 1.10 | Cold throughout |
| Ashland `right:3,0`, grass | 3.200 s | 0.106 / 1.00 | Cooled below 0.001 by +4.600 s |
| Same Ashland receiver, short gas dose | 1.067 s | 0.686 / 1.00 | Cooled below 0.001 by +10.250 s |
| Same Ashland receiver, longer gas dose | 8.533 s | 1.011 / 1.00 | Ignited at +1.567 s |
| Same Ashland receiver, gas behind masonry | 8.533 s | 0 / 1.00 | Cold throughout |

A separate test directly strikes Ashland siding and observes it ignite a real grass cell through the outward contact. The cool cottage stays cold and the paved gap retains zero fuel.

## Normal-menu playtest

Build with `node tools/build.mjs` and serve with `node tools/serve.mjs --root dist --base /tinderbox/`. Open `/tinderbox/?cottages=calm`, choose **Play → Catalogue Street**, and use **Oil barrel** and the movement controls to leave a small trace on the paving alongside the cottage. Stop pouring and aim at the paving just outside the wall before pressing **Matches**. Repeat from a fresh visit and walk farther along the same tile while pouring. Both review strikes used tile X 52, Z 13 and lit the one paved cell centered at X 52.75, Z 13.75. The first pour stepped mostly into the wall, which limited travel. The second moved along the wall and laid more fuel in that cell.

| Pour in the struck cell | Source burn | Result at the same Ashland siding |
| --- | ---: | --- |
| 0.0240 L | 1.350 s | Peaked at 0.871 and cooled below 0.001 by +12.950 s |
| 0.0471 L | 2.617 s | Ignited at +1.567 s, crossing at 1.011 heat units |

The normal title, menu, Oil barrel, joystick, ground click and Matches button drove both visits. The observer only recorded snapshots. The renderer was WebGL 2 on ANGLE D3D11 with an RTX 3080 at a 1280 × 414 canvas. The receipts `short.json` and `long.json` include sampled heat, source duration, the match event and the siding's recorded parent cell. Canvas JPGs `short-ground.jpg`, `short-outcome.jpg`, `long-ground.jpg` and `long-outcome.jpg` are in `artifacts/qa/fire-exposure/recordings/` with those receipts.

## Paths and verification

`src/simulation/config.js` and `field.js` separate outgoing heat, receiving response and ignition. `src/simulation/cottage-fire.js` and `index.js` exchange heat between the exterior probes and the ground field before either side advances. `tests/simulation/fire-exposure.test.js` contains the controlled traces. The correction uses the published asset and wind revisions.

`node tools/check.mjs` passed 204 tests and the source and art checks. Coverage includes directional matches and torch, finite gas and powder clocks, Monroe and Hopkins sectional collapse, Ashland wind and calm, the +11.95-second wind crossing, and exact independent deadlines. `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,474 files and 163,811,859 bytes at the nested URL. The manifest SHA-256 is `31ad84cafb951692229853d0b660245f3b61caae1d826a5a9d453106166ef49a`. The architect owns integration and Pages promotion.
