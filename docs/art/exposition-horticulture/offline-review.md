# Horticultural Building offline art review — 2026-10-29

Artist candidate on `codex/horticultural-building-art`, from `c6ddd51d7dd47a2ec148159e6a6d64a8d00bd2a9`. The exact delivery commit is the Git commit containing this record and is reported in the user handoff. This is an art/evidence delivery; architect promotion and runtime acceptance remain pending.

## Checks performed

| Command / evidence | Result |
| --- | --- |
| `python art/source/exposition-horticulture/prepare-evidence.py` | Public-domain evidence, raw/derived hashes, explicit measurements and 165 preserved prior-delivery files recorded |
| `node art/source/exposition-horticulture/build-manifest.mjs` | Runtime closure and metadata hashed; 6,076 actual Nautilus panels in validated wall fragments |
| `node tools/check.mjs` | 91 own scripts pass syntax, 132 static modules resolve, 85 tests pass; shared renderer/provenance checks pass |
| `node tools/build.mjs` | 162 packaged files; relative resource paths; research/preview sources excluded |
| `node workbenches/art/check-exposition-horticulture.mjs --package` | Pass: dimensions, topology, native buffer identity, openings, eave closures, floor/landing rays, all four poses, ownership and nested-path package |
| Actual-mesh export and Mitsuba scalar render | Seven final building views rendered at 32 samples per pixel |
| Source-plan comparison / height audit | Two additional JPGs reviewed |
| `python art/source/exposition-horticulture/finish-review.py` | JSON, Python syntax, local links, LF text and exact helper lifetime/port verification |

The focused check independently reconstructs the source panels from the saved Nautilus fragments and accounts for every wall/closure interval against the aperture union. It verifies 4,464 full native walls, two ordinary native door leaves, 28,085 full native building slabs, 5,976 structural fragments, 5,240 seam fragments and 2,915,196 bounded mesh vertices. The native buffers, units and transforms remain unchanged; custom boundary cuts and ornament are labelled separately.

Independent triangle area sums conserve the 22,032-square-metre first floor and 4,288-square-metre pavilion galleries, plus the central rings and separate foyer/entry roof slabs. Rays verify the central vertical void, clear window/vent apertures, three stair top landings, stair slab holes, end gallery wells and native eave closure. Seventy-two treads reach the standard L3 height. Four rotated/translated building and terrace poses retain their expected bounds.

The assembled terrace preserves the original shoreline recipes. Its 10,404 native slab cells are unique, level and complete across the waterfront strip and approach aprons, with no first-floor overlap or gap. Seven owned prototypes feed 46 instance batches. Reskinning preserves geometry/metadata; invalid inputs leave existing appearance intact. Generated resources dispose once, and borrowed materials/textures remain untouched.

## Visual review

Nine final JPGs have individual SHA-256/review receipts in [previews](previews/). Reviewed views are the full waterfront exterior, central pavilion, rear, roof plan, structural interior cutaway, gallery stair, native bear/entry/water stair, period plan comparison and native height audit. See the [gallery](README.md) and [handoff](handoff.md).

The complete building has a glazed great dome and lantern, twin low ribbed front caps, peach arcades, ivory details and floral friezes. The long galleries, open courts and end roofs remain legible at whole-building scale; detail views retain native bear/door proportions. The upper end-pavilion wall bands and cornices meet their taller roof eaves. The open ground-level side in the gallery cutaway is the connection to the front curtain, revealed by review-only roof/high-wall removal.

CPU glass uses null/diffuse alpha blending to approximate the actual default Three material. The render proves the submitted geometry's stated appearance only. It does not establish WebGL shader compilation, alpha sorting, interactive performance, navigation or game-scale acceptance. The inherited workflow records disabled WebGL in the available review browser; no real browser acceptance or production promotion is claimed here.

## Source and delivery scope

[Conkey's description/diagram, Arnold/Higinbotham photographs and the research-only Walker observation](../../../art/source/exposition-horticulture/sources.json) are separately located and hashed. The [measurement record](../../../art/source/exposition-horticulture/measurements.json) retains source dimensions beside authored values, calibration endpoints, the width/projection discrepancy and uncertainty. The exhibit grid is not used as a wall bay schedule. No perspective-photo height was invented.

Unknown rear profiles, concealed services, exact exhibits, material physics, fine sculpture and original colours beyond cream staff remain explicit. No Walker image pixels, new donor imports, private account settings or secrets enter the asset package. New York, Administration and shoreline source/export bytes remain unchanged.

Changed paths are confined to `assets/art/exposition-horticulture/`, `art/source/exposition-horticulture/`, `docs/art/exposition-horticulture/` and the focused art workbench. The production game/editor is not wired to this whole-building asset. Provider registration, placement, multilevel fire, collision/traversal, GPU review and performance/LOD decisions remain with the architect/coder contract.

Temporary render/package helpers have durable source and restart instructions in the [handoff](handoff.md). Exact PID/creation receipts and released-port checks are under ignored `artifacts/exposition-horticulture/`. No service is retained; no unrelated process was stopped.

## Soda-green / warm peach palette revision

The user requested greener soda glass and peach warmth like waning sunlight. The building now defaults to palette `soda-green-waning-sun-v1`; its assembled terrace uses matching warm materials. The palette changes actual material colours. All seven mesh views use the original camera/light setup. Historical source records retain the original cream-staff statement; current colours are an explicit art adaptation.

A direct comparison against `c4287338ff93907900a94a86b6c7e3bed0ae7c2f` verifies identical building and terrace mesh buffers, indices, instance transforms, bounds and structural recipes. Consumer material overrides remain borrowed/cloned and survive later texture-only updates; default terrace colours also survive texture-only updates. No new geometry or gameplay behavior is introduced. Final commands/metrics remain recorded in `check-results.json`; package and helper receipts remain ignored locally.
