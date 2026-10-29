# Medicine ground-art handoff

The packet, medicine jar and inversion tin supply the missing world presentations for the user's accepted automatic walk-over use. This candidate owns appearance and snapshot visibility. The coder owns placement, accepted swept movement, use/effects and consumption. Catalogue Street is the intended consumer; the landmark exploration visits remain free of pickups.

## Runtime API and coordinates

```js
import {createMedicinePickups} from './assets/art/medicine-pickups/index.js';
const medicine = createMedicinePickups(THREE, {materials, textures: assets});
scene.add(medicine.root);
medicine.update(snapshot.pickups, {
  worldTime: snapshot.clocks.world,
  paused: snapshot.paused
});
// On visit disposal:
medicine.dispose();
```

Use the host's shared Three namespace. The factory is synchronous and requires no DOM, loader, additional renderer or engine copy. `update` takes a complete array of up to 64 `{id,kind,x,y,radius,consumed}` records. Kinds are `powder`, `healing`, `inversion`. `x/y` maps to scene X/Z in metres; the local ground is Y=0. The props remain at scale `[1,1,1]` and keep their physical dimensions when the authoritative collection radius changes. Put the root under the street's ground transform if needed; do not scale it with a landmark.

Unconsumed stable IDs retain their group across moves/reordering. Consumed or omitted IDs are removed immediately, including paused snapshots. Resetting to an unconsumed record restores the prop. There is no independent clock, bob, timeout, proximity test, event handling or healing decision. A snapshot with invalid/duplicate records is rejected before the previous valid snapshot is modified. `worldTime` and `paused` are accepted for API compatibility; these grounded props are static. `diagnostics()` additionally reports current mesh/template and owned-resource counts.

## Size and appearance

| Kind | Physical X / Y / Z extent | Maximum horizontal radius | Meshes / triangles |
| --- | --- | --- | --- |
| Powder | 0.356 / 0.1165 / 0.240 m | 0.214672 m | 9 / 312 |
| Healing | 0.360 / 0.2925 / 0.360 m | 0.180000 m | 6 / 444 |
| Inversion | 0.404 / 0.1205 / 0.404 m | 0.202000 m | 8 / 232 |

All geometry fits the coder candidate's current default 0.22 m radius. The radius field is a collection envelope rather than a request to stretch the art; a materially smaller future envelope needs review against these footprints. Actual vertex bounds are recorded in the manifest and focused check report.

The reused marks are exact contours from the [preserved original SVG](../../../art/source/medicine-pickups/control-symbols-source.svg), copied byte-for-byte from `26e1b1301ce577ab8ed26afa32fdafa93d7d44e4:assets/art/ui/control-symbols.svg`: powder's lightning inset, healing's cross counterform rendered as positive ink, and all inversion arrow contours. Their historical `sourceSymbol` IDs identify that original asset path; they do not read the evolving UI file. The symbols are shallow upward-facing geometry, so this adapter needs no additional texture or font. The physical forms also distinguish the kinds without relying on colour alone.

Borrowed host material slots are `shirt`, `leather`, `brass`, `steel`, `ivory`, `dark`, `glass`. Matching optional texture slots override a clone's map. Unrelated material/texture keys are ignored, so the existing full `materials` and loaded `assets` dictionaries can be passed unchanged. Default material colours and recipes come from `src/art/materials.js`. Factory templates share geometry/materials across IDs. `dispose` is idempotent, removes its root and disposes generated geometry and cloned/default materials once. Input materials, maps and textures remain owned by the caller. No input repeat, offset, wrap or shader source is changed.

## Sources and verification

The [provenance record](../../../art/source/medicine-pickups/provenance.json) pins the project palette, original control marks, source hashes, contract and direct human request. It also identifies the native AFT bear used only as a review scale reference. Project text hashes use UTF-8 with LF line endings, matching committed Git bytes. The preserved SVG is checked as exact raw Git-blob bytes, with text conversion disabled locally; the generator and checker never read the evolving UI SVG. The checker also compares the actual selected runtime/recorded contours with the preserved input and independent hashes of the reviewed `b35a279` contours. The runtime folder explicitly keeps LF on checkout; its hashes also match the packaged files. No additional donor files were imported and all existing licenses/provenance remain in effect.

Reproduce from this branch:

```text
node art/source/medicine-pickups/build-marks.mjs
node workbenches/art/check-medicine-pickups.mjs --write
node art/source/medicine-pickups/build-manifest.mjs
node art/source/medicine-pickups/check-provenance-compatibility.mjs
node art/source/medicine-pickups/export-review.mjs
python art/source/medicine-pickups/render-review.py
node tools/check.mjs
node tools/build.mjs
```

The render uses the existing ignored `artifacts/render-deps` Mitsuba/Pillow dependencies and Windows Arial for evidence captions. No package installation is needed for runtime or focused checks. The render source and ignored per-run records preserve launch inputs, process identity, outputs, exit time and its actual 120-second deadline. No service or helper is retained.

The provenance regression runs the actual generator and full art checker beside changed UI bytes and with the UI SVG absent. It verifies byte-identical regenerated runtime marks and rejects both source-byte and selected-contour tampering. To exercise the exact newer UI intake, pass `--ui-commit d099011d5cbaa6892703485ae635ac056e4bf51a` when that immutable Git object is available.

The focused check covers measured physical footprints, ground contact, unit scale, exact state-driven removal/restoration, stable identities, kind changes, invalid snapshot preservation, 80 snapshots of 64 changing IDs without resource growth, DOM-free construction and idempotent ownership-safe disposal. Repository and packaged-path results are recorded in [delivery checks](delivery-checks.json).

[Kit](previews/medicine-kit.jpg), [native scale](previews/native-scale.jpg) and [consumed state](previews/consumed-state.jpg) JPGs were visually inspected. They render actual factory meshes. CPU lighting uses base colours; borrowed texture maps, native bear projection paint, gameplay and real UI are omitted. The kit caption identifies its actual camera order: inversion, healing, powder. The native bear stays unscaled and is fully in frame. The consumed view has no medicine-jar geometry or shadow.

The candidate does not establish automatic collection, HUD agreement, phone-size WebGL readability or performance. Those require the coder/architect's combined browser gate. The architect decides intake and promotion; this branch is not a live release.
