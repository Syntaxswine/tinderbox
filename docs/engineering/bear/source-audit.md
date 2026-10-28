# TB-012: source audit and native bear intake

Approved pin: **4f5f53917990ec03b2f14c65f067e4b99ec8fcaa**, AFT “Wire bear outfits, weapons, and shared animations.” The body was introduced at `240c274e3ed43c995c652d6af00958465a9c13de`; `466aae478c007b4a36de885c12a03bcde585d248` corrected the tail. The complete approved integration contains both changes.

Read-only GitHub inspection found AFT main at `25d0e91858be0fa5ea7d54132a4a642624bd9aa7` and its bear study at `3c14cd090b0f7786737f33dd24f0c46aa598a1bf`. All 21 selected source dependencies have identical Git blob IDs in those commits and the approved pin. AFT main contains the bear integration in its ancestry. Farmyard main `60aeeed5e7f4283d46253c46654fb44af7636e6d` has no bear paths. Nautilus main `d3c577fbf78974dc0a20660d46748a83758fd51f` still pins pre-bear AFT; editor record `4c21f7c97fb9400c60ef9ec753cf1ff99ef3cb96` explicitly calls the bear incoming. This is original AFT reuse, not a completed Nautilus intake.

## Dependency closure and provenance

[The import manifest](../../../vendor/animal-factory-tactics-3d/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa/provenance/bear.json) records source and installed paths, full revision, byte count, SHA-256, adaptations and rights status. `tools/import-bear.mjs` reads immutable Git objects and refuses changed installed files. No unfinished worker files were imported.

Nineteen original files total 2,187,774 bytes: bear worker/profile, bear paint adapter, reduced body, normal painting, Three MIT notice, and the static rig/paint/locomotion/equipment closure. JS dependencies are `horse-light-model`, `horse-model-paint`, `horse-rifle`, `horse-graphic-paint`, `horse-grip-hand` plus data, `clothing-weights`, `worker-locomotion`, `roof-mantle-equipment`, `hen-motion`, `dog-motion`, `weapon-models`, `one-handed` and `grenade-model`. Alternate motion/equipment branches remain static dependencies; other animal meshes, tactical runtime, editor, campaign, recruitment, Red Hat cap/painting and speaking heads are excluded.

| Source | SHA-256 |
| --- | --- |
| `bear-worker.js` | `6c71a33a94d508ba51ff5072277f6c11f2b6825b029c7549693b88dfb85d235b` |
| `bear-10k-data.json` | `3a449fe96a28a712cb1aaf4cdc76d44cc07163ec949aebc2d086dfa48a3a0823` |
| `bear-paint.js` | `4b9380494a20ff9bb3d6d86e073e7c84b6d357015d4d9738eeb392fa0b6975f5` |
| Normal paint PNG | `7b0fd63d06c840497c1a03967f06b9bdce30c0ce119040740e4651fc459fa5a0` |

Original artist, animation and painting-prompt records and the author mesh are hashed evidence references, not runtime downloads. The artist records ImageGen generation of the 1774 × 887 normal painting using the native author registration sheet and existing costume/style references. This provenance is not a blanket license; upstream game/art rights remain undeclared, as recorded explicitly. Three retains its MIT notice. No new painting was generated for this swap.

## Native dimensions and animation

The body has 10,050 triangles across eight named surfaces, reduced from a 27,298-triangle author, and a native 17-bone skeleton. Neutral source bounds: X −0.2695303…0.2328318, height 0…1.6708453, Z −0.4857703…0.4859749 metres. Rest-arm span is about 0.9717452 m. Forty-eight native walk phases reach a body radius of 0.5083899 m. These are offline posed-vertex measurements, not browser appearance or phone performance evidence. Final fitted-tool envelope tests cover Tinderbox's actual adapter. The existing 0.56 m collider and 1.4 × 2.3 m gate are retained; the separate unpromoted scale/fire branch is excluded.

Paint registration is a four-view projection frame 1.18 × 2.36 m centred at height 0.84, not body dimensions or a conventional UV atlas. Source +X forward and Y up remain native. `hand1`/`hand-1`, native palm `(0.052,-0.010,0)`, equipment `grip`/`support`/`muzzle` anchors and the source IK solver establish reachable contacts. The source factory's default rifle is immediately replaced by a selected Tinderbox tool and cannot return during locomotion.

## One Three strategy

Both bundles report Three r180, but their module/core hashes differ. Byte identity is not claimed. The new raw snapshot excludes both Three implementation files. One separately recorded adapter at its expected `dist/tactics/vendor/three.module.js` re-exports Tinderbox's existing `src/runtime/three.js`. The facade is not labelled an original source file. Checks verify its bytes, every export's object identity, the actual native rig/anchors and the sole implementation pair. Browser WebGL paint compatibility remains an independent gate.

The source PNG, geometry, weights, bone lengths and origins remain intact. Four existing Tinderbox prop forms use native hand fitting; the actual AFT flamethrower retains its geometry, backpack, hose and anchors, with a documented +X carry. Locomotion uses accepted `player.travelled`; pause preserves the evaluated gait; the view never changes gameplay stock, pouring, inversion or fire timing. Existing resolved discharge still determines nozzle suppression. Detailed skinned bounds are sampled only through an explicit review call.

`BEAR_ASSET_BASE_URL` addresses the new self-contained AFT model/paint bundle. Existing Farmyard `assetBaseUrl` continues to serve fire, scenery and civilians. Optional `bearAssetBaseUrl` overrides only the bear bundle. Missing model/paint or an incompatible borrowed renderer fails explicitly, without a procedural fallback. Additive `bearProtagonist` diagnostics describe the actual rig, tool roots, world anchors and disposal while `bear` retains its resource-count fields.
