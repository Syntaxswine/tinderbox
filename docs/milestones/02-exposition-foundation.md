# Milestone 02: researched exposition construction kit

Status: approved after combined review on the architect's `codex/exposition-foundation` branch. Exact candidates, passed checks, source evidence, limitations and publication status are in the [architect's acceptance](../reviews/2026-10-27-exposition-foundation.md).

## User direction and bounded result

Use the 1893 World's Columbian Exposition as the setting reference. Begin with the existing Farmyard basic wall/door settings, add appropriate basic wall/roof forms, and expose replaceable skin slots for future custom artwork. Populate the initial scene with existing non-Red-Hat animals until custom civilian skins are available. Research the originals thoroughly and use original plans wherever possible; document the evidence and adaptations.

The result for this assignment is a small exterior construction-kit scene plus a source dossier. It demonstrates shared wall/door geometry, two roof primitives, replaceable appearance slots and a small original-animal civilian population. It does not imply a complete fair reconstruction, new interiors, a crowd AI system, custom historical character skins or finished facade paintings.

The [research method and registry](../research/1893-exposition/README.md) distinguish original drawings, contemporary published floor diagrams, built photographs, later interpretations and uninspected leads. Plans establish geometry only to the level supported by the particular sheet. Keep source facts, measurements, uncertainty and game adaptations separate.

## Shared contract

The coder owns the exact validated schema in `src/content/exterior-kit.js`. The source scenario adds `world.modules` to snapshot v1 while preserving existing fields and legacy fixtures. Module forms are `wall`, `doorway`, `pilaster`, `corner`, `roof-gable` and `roof-hip`.

A module has an ID, centre `(x,y)`, quarter-turn heading in radians, metre `width/depth/height`, explicit `physicalMaterial`, named `skinSlots` (`facade`, `trim`, `door`, `roof`) and `sourceRefs`. Doorways specify open/closed state and clear opening width/height; corners specify thickness; roofs specify `baseHeight` above the ground.

The content compiler produces renderable parts and ground collision from the same dimensions. Art consumes those parts and does not choose a separate footprint. Skin selection does not change collision, fuel or ignition rules. Roofs and door lintels are elevated geometry; the ground-plane model does not treat their entire projected envelope as an impassable wall.

The initial usable doorway minimum is **1.4 m wide and 2.3 m high**, selected to clear the current 0.56 m bear radius and approximately 2.02 m bear height. These are explicitly tunable game dimensions, not measurements asserted from an 1893 plan. A closed door is visibly closed and solid; an open passage uses split wall solids with a real navigable gap. No opening animation or interior level is required.

The civilian adapter API is:

```js
const kit = await loadCivilianKit({THREE, renderer, assetBaseUrl});
const actor = kit.create(snapshotActor);
// actor: {root, update(snapshotActor, worldTime), dispose(), bounds}
// kit: {create, dispose, diagnostics}
```

`createArtScene` receives `renderer` additively for original model-paint projection. It borrows the shared renderer and Three namespace; it must not dispose or replace either. Civilian identity is explicit: initial species allowlist `horse` and `goat`, normal paint, civilian team, no headgear or equipment. The original models and paint enter through pinned donor imports. A normal-outfit flag alone does not establish that Red Hat caps/uniforms are absent. Measure animated visible-body bounds and choose conservative collision radii; weapons/attachments cannot appear during animation.

## Assignments

| Task | Owner | Owned delivery |
| --- | --- | --- |
| TB-008 | Existing coder | `src/content/**`, `src/reuse/civilians.js`, additive simulation/runtime support, meaningful contract tests, selected raw donor closure and `provenance/city.json`, engineering handoff |
| TB-009 | Existing artist | Original-plan/photo building study in `docs/art/exposition/**`, art geometry/material-slot adapters, direct civilian-factory integration, small art workbench and visual handoff |
| TB-010 | Existing UI specialist | Original site-plan/wayfinding/signage research in `docs/ui/exposition/**`; document continued direct Farmyard UI reuse and future period labels/skins; retain current controls |
| TB-011 | Architect | Reconcile source evidence, update architecture/provenance index, select production scene only after review, run combined checks and decide promotion/deployment |

Use the existing assigned worktrees, starting normally from reviewed `master` 420266a. The donor is read-only at `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`; newer donor branches require separate review. One coder-owned city manifest records all new raw code/model/paint/texture imports to avoid competing inventories. Preserve raw bytes and ancestry; keep adaptations separate. Existing provenance inventories remain intact. All new imports must be covered by checks and the final root index.

## Acceptance before promotion

- Verify exact candidate commits, changed-path ownership, raw donor hashes, dependency closure, original animal identity and absence of donor runtime/path dependencies. Preserve one shared Three pair.
- Verify original source records, exact page/plate/scan locators, source images actually inspected, rights evidence and uncertainty. A catalogued but inaccessible plan is a lead, not a measured drawing. A published design is not automatically an as-built survey.
- Cross-check open/closed passages against the same compiled solids; drive the actual bear through an open gate and against a closed one, including a rotated fixture and hitches. Verify skin changes preserve simulation results and no roof envelope blocks the ground by accident.
- Confirm original horse/goat models and normal paint render in the scene, animations keep weapons and forbidden headgear absent, measured body envelopes match conservative collision bounds, and world time/powder slow their motion consistently.
- Inspect wall forms, seams, material scale, doors, roof silhouettes, civilians and player/fire readability in the combined game at desktop and phone view sizes. The scene must visibly use the existing Farmyard assets; similar-looking replacement primitives do not establish that reuse.
- Re-run relevant simulation/UI/integration checks, production build, asset resolution, provenance and disposal checks. Check multiple scene rebuilds for retained resources and surface load errors. Record performance on the actual host; a phone viewport is not a physical-device test.
- Publish only the reviewed combined candidate, verify GitHub build/deployment and hosted bytes, preserve a review record, stop disposable helpers, verify exits/port release, and close temporary research/test tabs.

Exact historic building reconstructions will need a plan/elevation/photo comparison, calibrated source dimensions, a list of retained/omitted details and a record of every game-scale adaptation. The reusable forms and skin slots are the starting infrastructure for that work.
