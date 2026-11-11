# Hostile review round 3 on native floor fire

The published base was `968e88a8220183281e56723f8f788c049c06c807`. The coder delivered `e0b35addb3422db02f369ff51bd661ad5b76a10b` from the existing code worktree. The independent reviewer and architect tested that exact candidate, tree `40504b3bc5ca4b54d23518059012cb68cd4e187b`.

On the published build a match on Hopkins 9's east siding lit three ground-floor samples over bare stone. The first burned at local X 6.5, Y 0.50, Z 3.0, above a stone surface at Y 0.36. The unsupported fuel could light other surfaces. The reviewer also found burning floor samples over the upper stair openings on Hopkins 13 and joined Monroe. The tracked Hopkins 9 regression failed on the published runtime for the three expected samples and passed on the candidate.

The runtime now uses the area and height of the rendered oak triangles. It counts overlapping boards once, keeps authored upper bays and stair openings, and links same-storey patches at shared edges. The installed fire shroud keeps the horizontal flame footprint within its owning patch, including its wind lean. Smoke can drift from a supported source. The Ashland pair uses the same floor support with its one-metre tiles, including the lower floor and the support under falling fuel. The native art and vendor files have identical Git objects to the published base. The adapted shroud's [intake record](../engineering/playable-cottage-pair/intake.json) records its verified source and packaged SHA-256 values. [Implementation and reproduction](../engineering/catalogue-floor-fire.md#november-10-native-floor-support-follow-up)

## Independent verdict

Pass. All 28 assembled house variants matched the area of the rendered oak per section. The check covered all six Catalogue Street designs, every quarter turn and joined Monroe. The reviewer found zero unsupported origins. The 24,624 sampled flame splats stayed within their owning oak patches, including narrow supports under wind. The public-input replays on Hopkins 9, Hopkins 13 and joined Monroe found no unsupported fuel supplying light or later ignitions. Fire climbed from the wall through the upper wall and eave to the roof. The collapse mask, active collision and rubble agreed in the observed retirements.

Both paired Ashland houses retained floor fire and visible lower vents. The second house caught at +11.95 s. The reviewer verified all four observed falling-fuel contacts against live floors and checked the rubble against retired lower tiles through both completions. The previous porch control reached the far lawn from a terrain cell at 5.7167 s. The prior setback flamethrower and lantern strikes, flush-wall control and plinth movement barrier passed.

## Architect acceptance

The packaged WebGL comparison used 1280 × 720 and normal gameplay zoom on an RTX 3080. At 2.02, 4.02 and 8.02 s the published fixture reported three unsupported Hopkins 9 floor sites. The candidate reported zero at each checkpoint, with four, 19 and 33 supported floor fires respectively. Roof fire was present by 4.02 s. The standard, windy cottages and calm cottages routes opened with zero browser errors. Both isolated replays closed their browser and server and released their ports.

The full check passed 291 tests plus dependency, provenance and art checks. All ten one-match street scenarios preserved strike results, burned shares, affected and destroyed houses, barrel order, deaths and final health. Individual house burnout shifted by up to 0.15 s. The last collapse shifted by 0.02 s for the north-corner strike and 0.03 s for the Monroe sash strike.

Floor heat follows shared wood edges. The runtime estimates travel time from the straight-line distance between patch anchors, which can shorten the estimate around the Monroe stair opening. The catalogue fire graph covers above-basement storeys, and the Ashland pair also simulates its lower storeys.

The architect approved the 3,515-file package for promotion. Its manifest SHA-256 is `c592039f35d7f4173c17e4f9443726423e9d77eb8ee5bfdbb7d6430625c33987`. Matched JPGs, the independent probes, the census comparison and browser cleanup receipts are under the ignored `artifacts/qa/hostile-review-round-3/` directory.
