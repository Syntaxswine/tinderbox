# Architect reuse plan

The art and engineering audits support retaining Farmyard's browser ES-module/Three.js direction. Their acceptance is documentation approval; no runtime, art import, new bear, or playable scene is delivered in this milestone.

The foundation above is followed by the authorized [burning-trail milestone](milestones/01-burning-trail.md), which supplies the current implementation assignments and shared interfaces. Its common Three.js dependency is now imported with provenance; the worker deliverables remain subject to architect review.

## Import layout

The audits propose different source homes. Use one canonical layout for implementation:

| Content | Home |
| --- | --- |
| Unchanged selected Farmyard code and art | `vendor/farmyard-commando/<full-commit>/`, retaining donor-relative paths |
| Import inventory and provenance | `vendor/farmyard-commando/<full-commit>/provenance.json` |
| Tinderbox simulation, adapters and presentation controllers | `src/` |
| New editable art and generation/export inputs | `art/source/tinderbox/` |
| Derived or adapted game art | `assets/art/`, with source and processing recorded |

Do not create a second unchanged art snapshot under `art/source/farmyard-commando/`. Existing relative paths within the selected donor tree should continue to resolve. Preserve source bytes through checkout with suitable Git attributes when imports are added. A byte-preserved import and its Tinderbox adaptation must have separate paths and hashes.

Select one canonical vendored Three.js pair and notice for the running scene. All reused modules must resolve the same Three.js module instance; record any import rewrites. The first import manifest must enumerate the complete selected JS/CSS/HTML/JSON/texture closure and explain every URL rewrite. The nine proposed art files are a seed set, not that complete closure.

## Runtime boundary

Adapt the camera, UI materials, equipment, cargo, lighting, and compact painted effect builders behind Tinderbox interfaces. Avoid importing the complete solo app (114 statically reachable JS modules) or designer/playtest app (392). Those applications include donor missions, selection, turn/AP rules, and persistence assumptions.

Use authoritative object state, stable IDs, shared geometry, validated commands, and resolved events. Rendering must not decide damage, repeat an explosion, or advance burning. Barrel visual dimensions, collision and targeting must agree. Own save/settings names and schemas are mandatory even if the apps share a web origin.

Keep newer donor UI and flamethrower candidates separate from the baseline. Their attractive effects or targeting UI do not provide persistent burning or explosive-barrel gameplay by themselves.

## Next implementation brief

Use a small isometric validation yard with inherited controls/materials, a bear, a flamethrower, ordinary and explosive drums, a wall, and a crate. The artist owns bear silhouette/model/paint and equipment fit. The coder owns self-contained imports, scene state, geometry/commands, adapters, and meaningful behavior checks. The architect reviews the combined running scene before promotion.

Specify these choices in that brief before their dependent implementation: bear appearance/scale, review devices and inputs, gameplay pace, cone/damage rules, wall/elevation protection for blasts, the persistence clock, chain radius and resource costs. The donor's fuel blast lacks a wall visibility check; do not silently assume that its behavior matches the solo grenade rules. Drug mechanics and broader progression need their own gameplay brief.

Required evidence includes actual bear/muzzle fit, readable UI at the selected viewport, matching preview/execution geometry, invalid commands spending nothing, exactly-once barrel chains, scene/effect disposal, and a launch with the donor checkout unavailable. Add persistence checks only when persistence is included. A temporary technical stand-in must be labelled and leaves finished-bear acceptance incomplete.

This plan establishes the handoff boundary. It does not assign an unrequested full game implementation or claim that unresolved product choices have been made.
