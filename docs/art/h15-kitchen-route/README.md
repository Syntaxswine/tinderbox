# Hopkins 15 kitchen route successor

The accepted bounded correction moves the complete native parlor settee 0.35 m
along local −X, from `[2.85, 0.48, 0.6]` to `[2.5, 0.48, 0.6]`, and replaces only
the kitchen route with the nine-point path below. It is versioned as
`catalogue-h15-circulation-150-kitchen-v2` on corrected runtime checkpoint
`8e50a4c0e39a48241001a02f7a29c4193fdd343d`.

This is a local artist source candidate. Corrected-world/provider and combined
source acceptance remain with the coder. Push is held until that acceptance.

## Actual passage and placement

The passage between the movable settee arm at X 3.29 and the unchanged lower-left
stair post at X 4.685 is **1.395 m**. This is a movable-furniture passage; the
structural 1.50 m rules remain. No stair post or structural source was moved.
Across the required five X offsets, the worst 0.56 m-radius bear has 40 mm spare
at the front parlor post, 50 mm at the settee arm and 25 mm at the stair post.

All eight native mesh/part records, actual render vertices, matrices, bounds,
parent position, footprint and nine support-contact polygons move together.
Normals, UVs, color, materials, shape, rig, scale and finite fuel remain unchanged.
The nine contacts bind to actual floor sources under all four feet. Their complete
0.0196 m² area is covered; the entire horizontal settee footprint, 1.1455 m², also
lies over real floor. New bounds are `[1.71, 0.48, 0.26]` to
`[3.29, 1.38, 0.985]`. The new placement overlaps no other source solids. The rug
and all other furniture retain their previous positions.

```text
[5,       .48, -1]
[5,       .48,  .5]
[5,       .48,  .75]
[4,       .48,  .75]
[4,       .48, 1.8]
[3,       .48, 2]
[3,       .48, 3.5]
[3.87125, .48, 4.5]
[3.87125, .48, 5.75]
```

## Controls and semantic scope

Immutable prior house and scene bytes from
`4cecd10d09eff85543996d4362c63b2297001436` are self-contained in
`art/source/catalogue-modular/controls/h15-kitchen-route/`. The new reference
records their original paths/hashes and preserves the original circulation
producer, checker and reference by hash. Those original files are unedited.
The original access125/zero-margin controls remain intact.

[The bounded semantic diff](semantic-diff.json) verifies equality of every
structural surface, all other items/parts/source meshes/render geometry, the main
`prototypeRoute`, stairs, paired-door IDs, scene placement, flights, materials,
paint attributes and fuel. The only geometry delta is the rigid placement of the
eight settee meshes. Metadata changes record the new version, cumulative placement,
actual support bindings, kitchen route, source lineage and the 1.395 m furniture
passage. House and scene provenance both record that passage. Bell & Alder is
byte-identical.

The unsuccessful unmoved-settee bend and diagonal approach are preserved in
[rejected](rejected/proposal-clearance.json) and
[diagonal approach](rejected/settee-proposal-diagonal-rejected.json).
[The accepted proposal](accepted-proposal.json) preserves the independent source
sweeps that preceded implementation.

## Verification and reproduction

[The delivered-source checks](checks.json) pass all 30 source-local route cases:
goat, horse and bear; X offsets −0.10, −0.05, 0, +0.05 and +0.10 m; both directions.
They include 240 straight closed-solid sweeps, 10,956 floor-support stations, all
nine actual foot contacts and source overlap checks. Full native radius/height and
the existing collision predicate are retained; both front leaves are explicitly
posed open in this source fixture. This evidence is separate from world placement,
held input, actual game traversal and final combined acceptance.

```powershell
node art/source/catalogue-modular/export-kitchen-route.mjs
node art/source/catalogue-modular/check-h15-kitchen-source.mjs
```

The predecessor `export-circulation.mjs` deliberately continues to reproduce its
historical v1 source. Use the new command for this successor.

| Export | SHA-256 |
| --- | --- |
| `house-data.json` | `c89b46f600965bca778bba69a9c6a7f7845972d84e2f0745d26c69f54e9085a7` |
| `scene-data.json` | `ae0863da72f2cda8e0ea7c0b73c8d2b1aec583d38b31548ca4d04a67b72cfdb9` |
| `shop-data.json`, unchanged | `cd8ecffe491043546935dc162f0db88e8bd0056d1acb5fe97251db900269b2b5` |

No renderer, browser or retained helper was launched for this correction. The
approved preview-ground correction at `3471160b` remains unchanged; its JPGs
predate the new settee placement. Existing provenance and rights records continue
to apply. Local source checks do not imply gameplay acceptance or publication.
