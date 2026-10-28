# Shared art library

Nautilus is the cumulative shared asset shell. Each game consumes and contributes to the same reusable Animal Factory Tactics 3D / Farmyard Commando asset library. Work made for Tinderbox must remain usable in later games, and existing assets must continue to fit together as the library grows.

An existing asset's dimensions, coordinate scale, origin/pivot, UV layout and physical texture density, rig and attachment points are compatibility interfaces. Preserve them when making a skin or visual variant. Game-specific appearance belongs in materials and ornament. Wider or taller architecture composes compatible modules.

Introduce a new shape as a separately identified library asset with declared dimensions and connections. Resolve a game's layout or character-fit needs through compatible assemblies or an explicit design decision; keep existing asset definitions stable. A new asset should add to the library without requiring previous assets to be resized or re-exported.

Deliver reusable sources and exports, stable asset IDs, source/provenance records, and evidence that the asset fits its native template or declared module interfaces. Review skins on the unchanged source geometry and verify dimensions, pivots, UV density and attachments alongside appearance.

The [native-scale contract](../engineering/exposition/native-scale.md) records the checked source measurements and module rules. The [current facade guide](exposition/building-facades-v3.md) and [review evidence](exposition/building-facades-v3-review.json) show this rule applied to the new building skins. Earlier enlarged-dimension studies are historical records and do not define the shared library.
