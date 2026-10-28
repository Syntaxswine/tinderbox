# More Exposition facades on native AFT templates

The current art standard is the original Animal Factory Tactics 3D / Farmyard Commando scale. Each game's art extends the same reusable library; new Tinderbox work must remain compatible with earlier assets and usable in later games. The [shared art-library rules](../README.md) treat dimensions, pivots, UVs, rigs and attachment points as fixed compatibility interfaces. The user's correction supersedes the previous Tinderbox clearances and 3.2m story presets. The artist changes paint and adds compatible ornament; existing source meshes, attachments, characters and physical texture density stay intact.

This batch adds six opaque sRGB textures, 15,230,250 bytes total:

| Profile | Source facade | Repeating identity |
| --- | --- | --- |
| manufactures | Manufactures and Liberal Arts Building, Arnold plate 3 | Three round arches, medallions, geometric frieze; a separate coffered triumphal entrance |
| agriculture | Agricultural Building, Arnold plate 18 | Three arched bays, paired Corinthian columns and harvest garlands; a pedimented entrance |
| fine-arts | Palace of Fine Arts south front, Arnold plate 60 | Three Ionic bays, rectangular recesses and star lattice vents; a straight-lintel entrance |

The references are original photographs in [Arnold and Higinbotham's 1893 official album](https://www.gutenberg.org/cache/epub/22847/pg22847-images.html). Colours, compressed ornament and fragment placement are art choices from monochrome sources. These skins do not reconstruct entire buildings, domes or roof silhouettes.

[Asset manifest](../../../assets/art/exposition-buildings-v2/manifest.json) · [Exact built-in image_gen prompts](../../../art/source/exposition-buildings-v2/generation.json) · [Primary-reference hashes and roles](../../../art/source/exposition-buildings-v2/sources.json).

The exact prompts retain their original pre-correction metric descriptions. Those descriptions are superseded by the native binding below. The bitmap files have no intrinsic metre scale and were preserved without resizing or post-generation editing.

## Native geometry and repetition

The checked shared contract comes from the pinned donor's roomBoxes and hybrid-world dimensions: 1m tiles, 2m wall faces, .16m wall thickness, 1 × 1.65m door openings, .12m leaves and 2.12m floor origins. One through five facades therefore top out at 2, 4.12, 6.24, 8.36 and 10.48m.

The shared kit composes unchanged native 1m wall pieces. A wider wall adds those pieces; an upper story repeats their original 2m geometry. Compatible new .12m trim bands fill the slab intervals. No wall mesh is stretched to obtain the facade height or width. Ground openings remain native size, including the closed door leaf.

Each new texture strip contains three bays across a fixed 5m material repeat. The entrance uses one fixed 3m central material region. A 13m frontage has one complete strip on each wing; a 23m frontage has two. Smaller widths crop the repeating pattern. A width change never enlarges the entrance. Each native wall face receives a complete painted story, and the .12m floor interval holds the edge colour.

The material hook adds separate facade attributes. Original positions, normals, indices, scales, surfaceUV values, source texture periods, skeletons and projected character paint are retained. The art factory continues to consume the shared compiled parts and authoritative destruction/support flags.

The provisional bear remains 2.02m tall with its existing .56m collision radius. It does not fit a 1 × 1.65m native door. The source horse/goat models also retain their original envelopes. This asset pass does not enlarge doors or shrink characters to disguise that issue.

## Using the skins

The existing skin slots and art API remain in use:

~~~js
const art = await createArtScene({
  THREE, scene, renderer,
  skinSet: 'exposition-v1',
  facadeStyles: {
    'hall-front': 'manufactures',
    'garden-front': 'agriculture',
    'gallery-front': 'fine-arts'
  }
});
art.update(snapshot);
~~~

A requested profile loads just its bay/portal pair. For live profile changes, opt into enableBuildingFacades and use setFacadeStyle. The earlier New York, Fisheries and Transportation images remain available with corrected native bindings.

The [private skin workbench](../../../workbenches/art/skins.html) opens on a 23m native frontage. Width choices are 3, 7, 13 and 23m, with one through five stories. New building street shows the three new profiles together. Courtyard uses the game camera; single/wide studies provide closer material views. Original and painted panes share one immutable snapshot.

## Current review

The visible Review native repeats button checks source-box dimensions, unchanged mesh scales and physical facade UVs, story coordinates, native openings/leaves, all six facade profiles, GPU reuse, actor identity and destruction/support behavior. Pixel comparisons check that the entrance stays fixed across widths and that two wing patches 5m apart actually render the same pattern. A shifted patch provides a non-flat control.

[Current machine-readable handoff](building-facades-v2-review.json) records the exact source commits, checks and selected evidence. Earlier guides and screenshots are historical records of their initial deliveries; their enlarged dimensions are superseded here.
