# Centered window sculptures

Open **Asset library → Windows** to inspect the compact and period sash bays. Each bay is **2 m wide in total: 0.5 m wall + 1 m centered opening + 0.5 m wall**. The wall sections are cut to width; the opening, frame and texture scale retain their original dimensions. The assembly is 2 m high and 0.16 m thick, with wall joins at local X = −1 m and +1 m. All coordinates are metres; the host can translate and rotate the assembly without scaling it. Fixed-frame projections extend to −0.14 / +0.15 m through the wall.

| Sculpture | Rough opening | Sill / head | Opening inside the fixed frame | Panes |
| --- | --- | --- | --- | --- |
| Compact sash | 1 × 0.7 m | 0.85 / 1.55 m | 0.92 × 0.62 m | Two over two |
| Period sash | 1 × 1.2 m | 0.35 / 1.55 m | 0.92 × 1.12 m | Six over six |

The wall has a real aperture. Its separate solids are the left panel, right panel, wall below the window and lintel. Jambs, face casings, a sill/stool, aprons and an exterior drip cap form the fixed frame. Two independent sash groups contain their own rails, glazing bars, panes and brass fittings. The trim and sash edges have small physical bevels; wall ends stay square to join the existing panels. Removing sashes in the inspector leaves the fixed frame and exposes the aperture from either face. This view is an art inspection, not an opening or climbing action.

Wood, brick and concrete use the existing pinned wall pixels at one texture repeat per metre. The masonry UV phase continues across the panels, sill wall and lintel. Cream casings and muted green sashes follow the workshop's existing visual palette. Clay mode makes the shape readable without wall paint.

## Reuse

The sculpture recipes and headless JSON compiler are in `packages/window-kit/index.js`; the renderer is in `packages/window-kit/three.js`. The IDs are `window-bay-compact` and `window-bay-period`. Both use the same 2 m overall width.

```js
import {compileWindowBay} from '@nautilus-engine/map-core/windows';
import {createWindowBayModel} from '@nautilus-engine/map-core/windows/three';

const sculpture = compileWindowBay('window-bay-period'); // Headless, copied data.
const model = createWindowBayModel(THREE, sculpture.id, {wall: 'brick'});
scene.add(model.root);
model.setView({sashes: false}); // Art inspection; no navigation change.
// Later:
model.dispose();
```

The renderer takes the host's Three instance. Optional `materials` entries (`wall`, `trim`, `sash`, `brass`, `glass`) are borrowed and remain owned by the host. Disposal releases only the model's own geometry, default materials and default wall texture, once. Returned `groups`, `parts` and `panes` expose the separate pieces for future adapters. Vertices use assembly-local coordinates; sash groups have no implemented travel/hinge animation.

`compileWindowBay` returns `nautilus-window-sculpture-v1` JSON with explicit axes, rough and frame-clear openings, wall join/sill/head anchors, named beveled box parts and fixed source references. The inspector's **Download sculpture JSON** exports this art data plus the current preview choices. It is independent of the portable map/block schemas.

## Scope and adoption

This step implements sculpture and editor inspection. Window placement, wall-run apertures, save-format capabilities, collision, breakable glass, opening actions, climb/vault animations and character traversal rules remain deferred. Both sculptures are clearly preview-only and cannot select a legacy prop tool. The kit does not advertise a consumer capability or alter a game's movement, sight or fire behavior. Its frame-clear dimensions describe geometry and do not certify an actor can fit.

The [design review](reviews/2026-10-28-window-sculptures.md) records source comparisons and the recommendation. New art is separate from byte-preserved donor snapshots and the immutable whole-building catalogue.
