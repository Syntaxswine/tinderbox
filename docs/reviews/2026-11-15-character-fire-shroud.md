# Character fire shroud restoration review

The owner identified missing character shrouds as the priority fix on November 15. Production emitted two camera-facing flame cards per burning NPC and did not visit the protagonist. [Milestone 25](../milestones/25-character-fire-shroud.md) restores the approved close body wrap from `7c60ba4b41f79de9dcca1f10b6e1dfffe9a74b26`; it preserves ignition, damage, movement, world/powder clocks and the current controls.

Common worker base is `064d41865ae35f00f8a33d7cf1bd6f368f327c17`. The architect's follow-up interface record is `ccb4927d615e1dd6abc6c9e68a37689fc16422ad`. Existing coder and artist worktrees are reused; no new worker chat, worktree or standing service is created.

## Artist candidate and source review

Exact candidate: `a69f0920728fac774094d98923cab735db5b1d43`. Runtime is the four files under `src/art/character-shroud/`, receiving the already-shared Three.js namespace. It adds no renderer, texture, light, physics or model load. Its flat presentation API consumes authoritative active/intensity and `startedAt = worldTime - characterFire.age` after native pose, aim and elevation. One lazy shared pool supports the explicit prototype limit of 16 active bodies / at most 88 splats per body, with unsupported/capped inputs reported.

Architect source review covers the binding/lifecycle, native fits, actual skin anchors and cloth mounts. The officer's tagged replacement coat/trousers/footwear are fitted instead of hidden original garments, without including helmet, weapons or metal. The final runtime contains only an unsupported-binding diagnostic change after the visual capture; focused checks compare supported buffers exactly against the preserved capture code across all four bodies and five world ages.

Independent Git-blob verification passes for all seven verbatim original files against their pinned historical blobs and recorded SHA-256/byte counts. All three captured media files and the unchanged original comparison match their recorded hashes. The original comparison SHA-256 is `2b480f02600121003059cea71b7b473f2754753e1f94c9f33768e27c61a28878`. The archived sources are byte-preserved and are not runtime imports; their checks read self-contained preserved files rather than requiring a private historical Git object. Local independent proof is `artifacts/qa/character-fire-shroud/architect/art-hashes.json` with its saved verifier source.

The 13 focused artist checks pass. The architect visually inspected matched normal-zoom before/after JPGs: boots and torso are enclosed, heads remain readable on bear/goat/horse and the uniformed officer, and the horse follows a 2.12 m floor. These explicitly labelled posed/factory controls do not prove production ignition. At the captured four-body frame, 272 flame and 53 smoke splats share one draw. Factory-only active CPU median 0.700 ms / p95 1.000 ms excludes posing, rendering and encoding; it is not game FPS or GPU timing. The preview's ordinary sRGB path differs from the historical neutral-HDR reference, with no change to the game's display pipeline.

The exact helper-retirement record reports browser/server exit, released ports 4558/4559 and removal of the private profile. Its finite driver/server and restart sources are preserved. Effect/renderer resources reach zero after disposal. No artist helper remains. **Artist intake is accepted for the combined runtime gate, with actual in-game appearance still required.**

## Runtime and publication

Pending exact coder candidate, combined primary check/build/browser review and live verification. The coder's 21 focused state/native tests pass, including actual inert-paving heat without false flames, direct lit contact at both elevations, unchanged numeric exposure/damage stacking, timed expiry, union age, pause/powder, disabled-damage contact and exit/death. These are preliminary behavior results, not release acceptance.

The additive presentation marker reflects existing timed NPC burn or proven lit-fuel contact. Warm/radiant heat alone is inactive; the protagonist gains no persistent afterburn or new HP rule. Flat legacy ground reports ground-plane contact only because it has no elevated fuel data. The old live demo remains unchanged until the normal architect gate passes.
