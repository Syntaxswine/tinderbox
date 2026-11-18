# One cornice-wall source volume embed

Source-only investigation of relationship `fa9dc4a25193e94ce7b5793e`, region
`19428b0ef95337ce4e9f64a6`, at emitted-world witness
`[33.5,8.23,25.96000000089407]`.

| Original physical part | Component | Original primitives | Physical closure | Checked interior |
| --- | ---: | --- | --- | --- |
| main/0/cell-3-1/1 | 0 | 0 through 11 | Watertight | Inside |
| edge-0/cornice-1 | 0 | 0 through 11 | Watertight | Inside |

[Source record and proof](source-record.json) retain exact matrices, raw geometry
hashes, ordered world-triangle hashes, original index/implicit-position
membership, exact coordinate equivalence classes and shared edges. Both meshes
have 8 exact vertices, 18 edges and 12 triangles, with opposite edge directions
and cyclic vertex links. No physical seam, cap reference or tolerance weld is
needed. Exact original outward halfspaces independently prove strict interior;
the old source predicate reproduces margins approximately 0.04 m and 0.10 m.

Neither exact part is in the accepted 29-repair overlay. Original descriptors,
physical owners, geometry/UV bytes, matrices and source ordering remain unchanged.
The offset `[56,0,26]` is already included; no extra offset is applied.

`sourceFace` and `sourceRange` stay null. This is a volume witness, not an
exterior-face hit. Each part's complete original component is identified; no
surface primitive is invented to replace that meaning. Native record, cell,
face lineage and any separate core boundary-port derivation remain unbound.
Generated cell-plane caps cannot acquire original exterior identities.

[Input pins](input-pins.json) preserve the [authority](authority-916b3e44.md),
[coder input](frozen-unresolved-binding.json), original physical evidence and
unchanged pure predicate excerpts. The input's second region is preserved
without extending this investigation to it.

~~~powershell
python -B art/source/shared-map-fire-bindings/cornice-wall-one-binding-v1/check.py
~~~

The finite check calls only component, closure and interior helpers on these two
parts. Four outside/double-offset point controls reject. It creates no support
factory, kernel, native compiler, world, graph diagnostic, renderer or retained helper.
Corrected core admission and source-to-native/runtime integration require
separate coder/architect review. No other relationship is normalized.
