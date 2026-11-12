# Shared modular art workflow

Version 1 · 12 November 2026

This is the shared production guide for artists creating characters, props,
architecture, environments and visual effects for games using Nautilus Engine.
Build a reusable asset library in which each game's work can strengthen later games.
Preserve compatible dimensions and interfaces while allowing each game its own
subjects, palette, mood and visual priorities.

The default visual approach is **simple, purposeful geometry with rich painterly
skins**. Establish a clear visual design, build the form it needs, and let painting
carry much of the surface detail. Artists retain discretion over technique and
complexity within the asset brief.

## Shared dimensions and compatibility

Use meters and the stock **1 × 1 × 2.12 m cell**: a 1 × 1 m ground footprint and a
2.12 m vertical level pitch. The pitch describes the spacing between levels.
Individual pieces may occupy part of a cell, several cells, or a documented
overhang.

Preserve existing native component dimensions when reusing them:

| Component | Native reference |
| --- | --- |
| Wall | 1 m wide × 2 m high × 0.16 m deep |
| Door | 1 m wide × 1.65 m high × 0.12 m deep |
| Floor slab | 0.12 m thick |
| Level pitch | 2.12 m |

Architectural assemblies connect on the shared grid. Openings, trim and other
subcomponents may subdivide a cell while the assembly retains its declared
connections. Diagonal and curved pieces record their endpoints, occupied cells
and connection dimensions.

Reuse the engine's established origin, axis and attachment conventions. On reused
characters, preserve native proportions, skeletons, bind poses, UVs and equipment
attachments.
Characters and small props retain their authored size within the shared world.

Compose modules to make larger structures. When a project needs a different form,
create a clearly versioned variant and preserve the reusable source. Retain valuable
bespoke work and supply a compatible version when it belongs in the shared library.

## Modular design for procedural assembly

Decide how a piece connects, repeats and varies before detailed sculpting or painting.
Each modular family records:

- Physical dimensions, occupied cells, pivot, forward direction and placement offsets.
- Connection points, compatible edges, permitted neighbors and clearances.
- Allowed rotations and whether mirroring preserves the geometry and painting.
- Straight, corner, junction, transition and end pieces needed for its intended use.
- Interchangeable skins and variations that preserve the same interfaces.
- Intentional asymmetry, overhangs or other placement restrictions.

Patterns should meet coherently at compatible edges. Maintain consistent physical
texture density across neighboring modules and use the available surface width for
repeating designs. Supply variation through approved forms, painted skins and
dressing options.

Review a family in representative assembled arrangements, including repetition,
turns, transitions and exposed ends. Where procedural generation is intended, check
varied generated arrangements with the engine builder. Artist metadata describes
valid combinations; the engine implements placement and behavior.

## Main character and resource priorities

**The main character of the game can receive extra attention and resources. The
main character can be a person, creature, place, object or effect central to the
game or story.**

The project brief identifies what fills this role and explains the experience it
must convey. This may come from gameplay, narrative, emotional meaning or the game's
visual identity. Allocate additional research, production time, iteration, geometry,
texture resolution, animation, shading or other rendering resources where they
improve that experience. The appropriate technique and level of detail depend on
the asset and the game.

Set the intended quality, target hardware, expected scene use and resource allowance
with the project lead. Artists make routine craft decisions within that brief.
Judge additional expense by its visible contribution at the intended viewing scale
and its measured cost in representative scenes.

Resource exceptions retain the shared compatibility requirements wherever the asset
connects to the modular library. Game-specific direction belongs in that game's
brief, alongside this shared workflow.

## Production stages

The full sequence is a reference for character production. Artists may combine or
omit authoring stages for simple props or specialized assets while preserving the
agreed visual target, compatible interfaces and review in the engine.

### Define the brief and inspect reusable assets

Establish the asset's purpose, visual reference, intended viewing distance, maximum
expected screen size, dimensions, modular role and required movement or state changes.
Identify existing engine assets, rigs and materials that can supply part of the work.

Set provisional budgets for geometry, textures, materials, animation and rendering
cost according to expected use. Consider how many copies may appear together.
Name the counting unit when setting geometry budgets and report final rendered
triangles so comparisons remain clear.

Plan relevant alternate states early, such as wear, damage, seasonal changes,
breakage or destruction. Coordinate their dimensions and behavior with the engine
builder.

### Establish a traditional 2D design

Begin with a readable character or object design that settles silhouette,
proportions, palette, materials and visual personality. Use consistent front, side
and rear views where needed. Include the connections and repeat boundaries of
modular pieces.

Choose a finished painting reference as well as a shape reference. Show the intended
brushwork, folds, seams, material transitions and wear. Review the design at the size
it will occupy in the game.

### Build the working model

Sculpt or model the forms needed to realize the approved design. The AFT3D character
workflow provides a useful reference: a traditional 2D design, a working model around
30,000 polygons, then a simplified model around 5,000–10,000 polygons with much of the detail
carried by painting.

Those approximate counts guide comparable character work. A crate may use a painted
cube, and an asset serving as the main character may justify greater complexity.
Use the stages and density that serve the asset rather than treating the character
ranges as universal quotas.

Spend geometry on silhouette, depth that matters from the game camera, deformation,
movement and gameplay function. Preserve the working model as an editable source.

### Simplify and test the structure

Create a runtime mesh that preserves the important forms. Place topology deliberately
around joints, faces, moving parts and attachment points. Keep modular boundaries and
dimensions fixed through the reduction.

For animated assets, fit the shared rig and test the poses and actions the game uses
before final painting. Check deformation, foot contact, hand grips, attachments and
the movement envelope. For modular assets, test connections, rotations and repeat
boundaries.

### Prepare mapping and paint the skins

For new assets, establish suitable UVs or a stable paint projection setup, consistent
texture density, seam placement and sufficient padding between texture regions.
For reused assets, preserve the native mapping contract.

Transfer useful form information from the working model where it helps. Baking,
projection painting and direct texture painting are available techniques; choose a
combination that keeps the result stable during animation and lighting changes.

Paint cloth folds, stitching, seams, pockets, fastenings, surface grain, wear and much
of the form shading into the skin. Use geometry for details whose silhouette,
movement, depth or function needs it. Flat color materials are useful during blockout;
the final painterly finish requires intentional surface artwork.

Choose texture resolution and any additional material maps according to visible
benefit and scene cost. Share compatible textures and materials across variants.
Check the painting under the game's relevant lighting conditions while preserving
the approved painterly finish.

### Review one finished example in the engine

Complete one representative asset before expanding its family. Show its texture
sheet, useful model views and an actual game capture at the intended camera and
scale. Moving assets also need animation evidence.

Compare the runtime result with the 2D design and painting reference. Review silhouette,
material character, readable detail, texture seams, movement, attachments and
interaction with the surroundings. Check modular pieces in assembled arrangements.

Use the project's existing review process to settle the representative example,
then expand the family with the same quality and interface rules.

### Measure cost and prepare runtime variants

Measure the asset in representative scenes on the target hardware and resolution.
Record rendered triangles, meshes and material use, texture memory, animation cost
and relevant rendering time. Include the expected number of simultaneous instances.

Where distance or scene density justifies it, provide lower detail variants,
appropriate texture filtering and other optimizations. Compare optimized output
with the accepted visual reference at matching camera settings. Preserve the source
quality and the features that make the asset important.

### Package the shared asset

Keep the editable 2D design, working model, optimized mesh, mapping setup, paint
sources, rig, animations, procedural definitions and runtime exports together as
applicable. For generated imagery, retain the prompts and reference inputs or their
stable source records.

Deliver stable identifiers, a version, dependencies, dimensions, origins, modular
connections, rotation rules, material assignments and relevant states. Record source
revisions, original paths, hashes, existing licenses and adaptations for reused
material.

Keep shared sources distinct from game-specific skins, placements and adapters.
Deliver assets that resolve entirely within their destination project or package.
A successful game's additions should be available for deliberate reuse by later
games through the shared library.

## Asset brief template

Complete these fields to the level the asset requires:

| Field | Record |
| --- | --- |
| Purpose | Gameplay, story or environmental role and intended impression |
| Visual target | 2D design, painting reference, palette and materials |
| Shared basis | Existing asset, rig, component or material to reuse |
| Dimensions | Meters, occupied cells, level span, pivot and orientation |
| Assembly | Connections, neighbors, transitions, rotations and variations |
| Motion and states | Required actions, attachments, clearances and alternate states |
| Expected use | Camera, screen size, instance count and target scene |
| Resources | Geometry count and unit, textures, materials and runtime allowance |
| Main character role | Whether it is central to the game or story and the attention or resources that role warrants |
| Review evidence | Texture sheet, model views, game captures and motion evidence |
| Delivery | Editable sources, exports, metadata, provenance and dependencies |

## Completion criteria

An asset is ready for handoff when its visual target is met, its shared dimensions
and interfaces are verified, and it works at its intended scale in the engine.
Modular families demonstrate compatible assembly and variation. Animated assets
demonstrate their required movement and attachments.

The handoff includes editable sources, self-contained exports, provenance, actual
runtime evidence and appropriate cost measurements. Record remaining limitations
beside the affected feature and follow the receiving project's review and promotion
process.
