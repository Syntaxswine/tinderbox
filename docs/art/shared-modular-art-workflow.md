# Shared modular art workflow

Version 2 · 12 November 2026

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
Record whether a level label is one-based or zero-based, its base elevation, and
its top walking-surface elevation. A layer number, a cell height and underside
clearance describe different measurements. Check openings and headroom with the
actual posed characters and carried equipment, including the largest intended
variant. Use a native character and an established prop or vehicle as scale
references; do not infer scale from an isolated render.

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

Declare visual bounds, occupied cells and physical obstruction separately. A broad
foundation does not make every tile above it impassable. Keep movement, sight,
projectile cover and any fuel/damage surfaces distinct in the handoff; foliage may
hide a character while substantial wood provides bullet cover. Show the intended
boundaries with and without debug overlays at gameplay size. Clear routes should
look usable, and blocked spaces should visibly explain their obstruction.

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
builder. Separate confirmed requirements, provisional choices and unresolved
questions. Record a measurable target for consequential details: a clear opening,
shared seat height, movement distance, contact point or duration is more useful
than an adjective alone.

### Establish a traditional 2D design

Begin with a readable character or object design that settles silhouette,
proportions, palette, materials and visual personality. Use consistent front, side
and rear views where needed. Include the connections and repeat boundaries of
modular pieces.

Choose a finished painting reference as well as a shape reference. Show the intended
brushwork, folds, seams, material transitions and wear. Review the design at the size
it will occupy in the game. For complex motion or destruction, sketch the key
poses or states first. Show where weight rests, what moves, and which components
remain. Settle that sequence with a cheap study before adding detailed effects.

### Build the working model

Sculpt or model the forms needed to realize the approved design. The AFT3D character
workflow provides a useful reference: a traditional 2D design, a working model around
30,000 **triangles**, then a simplified model around 5,000–10,000 **triangles**
with much of the detail carried by painting. These are triangle counts, not an
interchangeable count of quads or modeling faces. For example, the [AFT bear](../milestones/03-shared-bear-protagonist.md) used
27,298 author triangles and 10,050 runtime body triangles; its separate cap added
700. Count the complete visible assembly as well as its individual parts.

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
boundaries. Verify normals, intentional open versus closed surfaces, normalized
skin weights and the reduced mesh's correspondence to its source where relevant.

For character motion, inspect the support and weight transfer in side views and
at key pauses: which hand, foot, knee, belly or hip carries the load, and when that
support releases. In supported transfers, move the body's weight onto the next
support before removing the previous one. Intentional airborne phases need a
believable takeoff, trajectory and landing. Include carried mass and native limb
lengths. Check the visible
body and equipment surfaces, not only joint centers; collision proxies need
species-appropriate thickness. Diagnostic warnings expose problems but do not
prove a pose looks balanced. Hand-keyed motion and simple contact diagnostics may
be sufficient; a full physics engine is optional.

Test the largest and smallest body types and the most awkward equipment early.
Fit one representative action, then exercise the required species, outfits,
equipment and states. Shared rigs do not guarantee identical reach, stock/arm
placement, ear or horn clearance, cloth deformation, or foot orientation. Repeated
seeking, replay and cancellation should restore the same native pose and equipment
without accumulating offsets or mutating another instance's shared resources.

### Prepare mapping and paint the skins

For new assets, establish suitable UVs or a stable paint projection setup, consistent
texture density, seam placement and sufficient padding between texture regions.
For reused assets, preserve the native mapping contract. With projection painting,
render exact neutral registration views from the actual model. Preserve camera
framing, view order, image proportions and bind-space coordinates when generating
or editing the painting. A concept turnaround establishes the design; an exact
model turnaround registers the skin. An image-generation edit should change the
requested surface treatment while retaining that registration and identity.

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

Review the back, underside and interior-facing surfaces, along with underarms,
cuffs, seams, joints and attachment rims exposed by movement. Avoid duplicated
features such as competing eye projections or a painted copy of a moved tail.
Where useful, provide a coverage view that distinguishes direct mapping, reused
paint and fallback material. A covered surface is not necessarily a well-painted
one. Keep registration coordinates separate from later fitted geometry when the
existing projection contract requires it.

### Review one finished example in the engine

Complete one representative asset before expanding its family. Show its texture
sheet, useful model views and an actual game capture at the intended camera and
scale. Moving assets also need animation evidence.

Compare the runtime result with the 2D design and painting reference. Review silhouette,
material character, readable detail, texture seams, movement, attachments and
interaction with the surroundings. Check modular pieces in assembled arrangements.

Use the project's existing review process to settle the representative example,
then expand the family with the same quality and interface rules.

Keep comparison captures reproducible: record the source revision, camera,
lighting, scale, pose/time, equipment, relevant toggles and procedural seed.
Compare revisions under matching conditions and retain useful earlier controls.
Change the form or timing when the problem is structural; an extra texture or
larger effect will not repair the wrong silhouette or an unsupported movement.
Passing numeric tests and visual acceptance answer different questions.

### Review landscapes and procedural fills

For repeated scenery, review a representative large fill as well as an isolated
module. Check close, gameplay and overview scales, tile grid on and off, multiple
seeds, edge conditions and the expected density extremes. Define what each control
means: occupied-area density and the ratio of trees to brush are separate choices.

Compose broad clusters, quieter areas, varied heights and small breathing spaces.
Variation should form a coherent landscape across tile and chunk boundaries;
randomly choosing among obvious repeating stamps is not sufficient by itself.
Paint can carry litter, branches and other low relief details across several tiles.
Soften surface transitions with color and sparse dressing while keeping walkable
boundaries exact. Keep substantial obstacles out of routes, and give pockets within
blocked growth visible surrounding structure that explains the intended blockage.

### Review damage and destruction

For assets with damage or destruction, keep unchanged foundations, pivots and
connections aligned between states. Design the structural transition before
obscuring it with smoke or flashes. Where fragments or dropped equipment must
remain visible, show their travel and ground contact before fading them. Specify
which debris, scorch or stain persists, its lifetime and supporting surface, and
which state changes belong to the engine. Keep ground dressing separately placeable
where it needs to blend with different local terrain.

### Measure cost and prepare runtime variants

Measure the asset in representative scenes on the target hardware and resolution.
Record rendered triangles, meshes and material use, texture memory, animation cost
and relevant rendering time. Include the expected number of simultaneous instances.
Distinguish per-asset mesh counts from triangles actually submitted by the scene,
including shadows, caps, equipment, transparent effects and other relevant passes.
Measure texture storage and transient loading memory as well as draw calls.

Where distance or scene density justifies it, provide lower detail variants,
appropriate texture filtering and other optimizations. Compare optimized output
with the accepted visual reference at matching camera settings. Preserve the source
quality and the features that make the asset important.

Large procedural fills need spatial chunks that can be culled independently;
one sector-wide batch can still submit the whole landscape when the camera sees
one corridor. Test nearby versus distant detail and shadow coverage in motion.
Fewer draw calls or triangles do not alone establish a frame-rate improvement,
and a viewer that redraws only on interaction is not a live-game performance test.
Keep resource ownership explicit and check repeated load, replace and unload cycles
for bounded geometry, texture and helper use.

### Package the shared asset

Keep the editable 2D design, working model, optimized mesh, mapping setup, paint
sources, rig, animations, procedural definitions and runtime exports together as
applicable. For generated imagery, retain the prompts and reference inputs or their
stable source records.

Deliver stable identifiers, a version, dependencies, dimensions, origins, modular
connections, rotation rules, material assignments and relevant states. Record source
revisions, original paths, hashes, existing licenses and adaptations for reused
material. Keep unresolved rights or unavailable source records explicit.

Keep shared sources distinct from game-specific skins, placements and adapters.
Deliver assets that resolve entirely within their destination project or package.
A successful game's additions should be available for deliberate reuse by later
games through the shared library.

Open the exported asset from the destination package with donor checkouts and
authoring-only paths unavailable. Verify the dependency closure and intended engine
behavior; a correct source viewer does not establish that the packaged game loads
the same asset. Where deterministic capture is feasible, compare source and package
renders at the same settings. Include concise reproduction commands and tool
versions rather than relying on an expiring preview link.

Label delivery status precisely: source asset, motion study, runtime export,
gameplay integration and approved promotion may be different milestones. Record
which actions, variants, collision checks and performance conditions were actually
verified, and carry unresolved failures or untested cases beside the affected
feature. Visual documentation should not imply that the engine builder has wired
unimplemented behavior.

## Asset brief template

Complete these fields to the level the asset requires:

| Field | Record |
| --- | --- |
| Purpose | Gameplay, story or environmental role and intended impression |
| Visual target | 2D design, painting reference, palette and materials |
| Shared basis | Existing asset, rig, component or material to reuse |
| Dimensions | Meters, occupied cells, level span, pivot and orientation |
| Assembly | Connections, neighbors, transitions, rotations and variations |
| Motion and states | Required actions, support/contact sequence, attachments, clearances and alternate states |
| Physical meaning | Movement, sight, projectile cover and relevant fuel/damage surfaces, each distinguished from visual bounds |
| Expected use | Camera, screen size, instance count and target scene |
| Resources | Geometry count and unit, textures, materials and runtime allowance |
| Main character role | Whether it is central to the game or story and the attention or resources that role warrants |
| Review evidence | Texture sheet, model views, game captures, motion evidence and reproducible capture settings |
| Verification scope | Tested variants/actions, destination package, performance conditions, status and known limitations |
| Delivery | Editable sources, exports, metadata, provenance and dependencies |

## Completion criteria

An asset is ready for handoff when its visual target is met, its shared dimensions
and interfaces are verified, and it works at its intended scale in the engine.
Modular families demonstrate compatible assembly and variation. Animated assets
demonstrate their required movement and attachments.

The handoff includes editable sources, self-contained exports, provenance, actual
runtime evidence and appropriate cost measurements. Record remaining limitations
beside the affected feature and follow the receiving project's review and promotion
process. Match the evidence to the brief: simple assets need proportionate checks,
while a reusable animated or procedural family needs representative coverage. The
workflow supports craft judgment without turning one character's production steps
into mandatory overhead for every prop.
