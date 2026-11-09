# Fire exposure on Catalogue Street

The candidate starts from published `801807b2e71638101861c875c2d23c9ad73ad17b`. In the same controlled replays on that revision, grass and gas both ignited the Hopkins receiver after 0.667 world seconds and the Ashland receiver after 1.750 seconds. The ground solver limited outgoing heat by the receiver's output setting. The Ashland ground contact used the same flame-intensity gain for every fuel.

Fire spread depends on whether adjacent fuel heats the receiver long enough to ignite before the source goes out. The values below are game tuning in dimensionless heat units. [US Forest Service flame residence research](https://research.fs.usda.gov/firelab/projects/burningrate) · [NIST cellulosic ignition experiments](https://www.nist.gov/publications/ignition-cellulosic-fuels-heated-and-radiative-surfaces-nist-tn-1481)

## Runtime tuning

| Active fuel | Outgoing heat at unit coupling | Ground receiving multiplier | Ground ignition threshold |
| --- | ---: | ---: | ---: |
| Deposited gas | 40 | 1 | 0.60 |
| Dry grass | 6 | 1 | 0.85 |
| Timber | 44 | 0.035 | 1.10 |

After the existing distance and travel-time check, a burning ground cell transfers its own output through the receiver multiplier and distance. The receiver cools at 0.30 heat units per world second. A lit source can contribute until its finite fuel runs out. The 0.5 m grass and full timber cells last 3.20 and 12.00 world seconds. Gas duration follows the amount poured. The existing flame intensity and damage use their own values. Direct match and torch applications still seed the selected patch immediately.

Ashland exchanges heat only through its two existing outward ground probes at 0.38 m and 0.84 m. Their couplings are 0.024 and 0.018 of source output. The low wall uses its existing 1.00 threshold and 0.075 cooling per world second. A burning low wall can heat existing ground fuel through those same clear probes. This is a local, plan-view contact model. The paved gap has zero fuel until the player deposits some. The native structure's internal spread, Nautilus ember flight, roof contact, falling fuel and 30-second deadlines use the accepted paths. The shared ground solver applies the three fuel profiles in diagnostic scenes as well.

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
