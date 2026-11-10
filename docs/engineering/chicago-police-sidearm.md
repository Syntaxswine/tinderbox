# Catalogue Street Chicago patrol

The candidate starts from published `92e8ec0fe3251c63a73cf1651f1e3b2c63c5cbde` and takes the reviewed uniform at `535150ceff835b8b64e25e10c7df568eddd92b23`. One native goat patrols the 4.8 m sidewalk beat in front of Bell & Alder at 0.8 m/s. The Catalogue Street snapshot identifies the officer's uniform and pistol. The existing waypoint walker drives the patrol on world time. The pistol rides muzzle-down at the front of the waist belt on the native hip bone. The six-piece uniform, goat and sidearm retain their authored scale. [Uniform fit and goat source hashes](../art/chicago-1893-beat-uniform/README.md)

## TT-33 source comparison

The published Farmyard Fighters `sites/tactical-animal/dist/field-view.js` imports `createWeaponModel` from `./aft/tactics/weapon-models.js` and equips the model from the unit's weapon key. Both pinned factories label `pistol` as the TT-33.

| Source pin | Factory path in source | Git blob | Source SHA-256 |
| --- | --- | --- | --- |
| [Farmyard Fighters `f6332900296d1e2727deaca875aa43a8c3f81b84`](https://github.com/Syntaxswine/farmyard-fighters/tree/f6332900296d1e2727deaca875aa43a8c3f81b84) | `sites/tactical-animal/dist/aft/tactics/weapon-models.js` | `388021c5005fce9fc5d210f82546c161c3bb37f5` | `9827dacd81d430a6f92123ce9592d7f79c73e4e707462287a49abcb8529933a3` |
| [Animal Factory Tactics 3D `4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`](https://github.com/Syntaxswine/animal-factory-tactics-3d/tree/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa) | `dist/tactics/weapon-models.js` | `9ce0e89212602908ce1aa6ec479ffd5f72d188af` | `d41f0a59d7ac32331e095a5019bb93d8d40f5f2817c24c0a8e0c05ecf412253f` |

The architect ran `createWeaponModel('pistol')` from each pin. All 15 parts matched in geometry indices, positions, normals, UVs, transforms and material values. The carry specification and grip and muzzle anchors also matched. The normalized model SHA-256 was `39d68fe6342714c5a02eb327a76fee58d7e4d9c43e5c9ba2f77ff65013b64cf9` in both runs.

The patrol therefore uses the AFT factory already vendored in Tinderbox and its existing shared Three facade. The carry adapter positions the group on the hip. The user-requested TT-33 is anachronistic in the 1893 setting. Rights for the reused AFT source are unresolved in the existing intake. [AFT provenance](../../vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/provenance/bear.json)

## Verification

- `node tools/check.mjs` passed 231 tests. The patrol checks cover the allowlisted identity, idle and moving snapshots, a full beat and return, and separation from Ashland. The pose check measures the pistol against the deformed coat, trousers and hands at native scale. The composition check confirms one attached pistol after reset and one release per used geometry and material on disposal.
- `node workbenches/art/check-chicago-beat-uniform.mjs` passed all 32 uniform poses on the native goat. The sampled uniform stayed within the existing 0.62 m radius and 1.70 m height.
- `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,503 packaged files at a nested project URL. The package manifest SHA-256 was `dec829a842af580f4378991731ab9f43de43bb682ea27d221581c0fbc879b80d`.
- Packaged WebGL ran through **Play → Bear → Catalogue Street** at 1280 × 720 and 390 × 844. The joystick route put the officer and the player together at Bell & Alder at default zoom. The desktop run checked the return turn, scene reset, and the separate calm Ashland visit. A second desktop view used the existing torch and zoom controls to show the belt fit. Both runs completed without browser errors and released their helper ports.
