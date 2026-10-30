# Milestone 09: faster movement and reliable stair input

The user reports that movement should be three times the published preview's speed, and that the joystick sometimes stops working on stairs while the keyboard still works. Deliver this focused correction against published integration checkpoint `38f6e803bf43493fdcd641f62f8644d13b99488f`. Preserve the warm period UI, native character/building scale and the four existing destinations.

Confirmed reproduction context: **Administration Building, using a mouse**. The precise stair and gesture remain unspecified; begin with its entrance and spiral stairs without treating another building's successful test as resolution of this report.

## Accepted change and ownership

Base player speed changes from 3 to **9 metres per second**, for goat, horse and bear in Catalogue Street and every landmark. This changes player movement only. Keep the existing powder player multiplier and world-time slowdown, gas deposited per accepted metre, fire/tool/drug clocks, NPC speed and animation distance conventions. Do not speed up the global clock.

Reuse **Coder Tinderbox** and **Set up Tinderbox UI worktree** in their existing assigned checkouts. Preserve the coder's unfinished gallery/route work in a local checkpoint on its existing branch before switching; preserve all current work and do not publish that checkpoint. Begin this correction on `codex/movement-input-coder` from the exact integration checkpoint above. The UI specialist begins `codex/joystick-input-ui` from the same checkpoint after checking its clean worktree. No new chat/worktree/helper is required. Architect owns the contract, integration, independent review and publication.

TB-028: coder owns simulation configuration, elevation-aware navigation, relevant tooling/tests and `docs/engineering/movement-input/`. TB-029: UI specialist owns `src/ui/**`, UI behavior/browser tests and `docs/ui/movement-input/`. TB-030: architect owns combined review and publication. Coordinate through the existing `{type:'move',x,y}` contract: finite screen-relative analog values, +Y up, normalized maximum magnitude; inversion remains in the simulation exactly once. UI callbacks must not implement stairs, collision, speed multipliers or gameplay clocks.

## Diagnose and repair the input mismatch

Reproduce the reported difference on the same source stair geometry and direction. Trace pointer position/capture, emitted movement, accepted simulation displacement, support/headroom rejection and section readiness. Distinguish a missing/cancelled input from movement correctly blocked by geometry. State the actual cause and evidence; do not claim that an unverified hypothesis is the cause.

UI review covers held mouse/touch/pen input across repeated authoritative snapshots, stair/landing/location label changes, browser resize/scroll, pointer capture and its fallback, release/cancel/focus loss, pause/resume and keyboard takeover. Keep the joystick's actual hit target and origin stable while its labels update; do not allow a layout change to silently neutralize or redirect a held gesture. Preserve intentional analog control and a useful dead zone; any tuning must be explicit. Releasing or cancelling input must stop motion, and a fresh gesture after pause must work.

Navigation review covers ascent/descent at full input and partial analog magnitudes, oblique directions and both directions on the same source stairs. Equivalent full stick/keyboard vectors must produce equivalent accepted paths. Lower analog magnitude may take longer but must not become permanently stuck where that direction works at full input. Use all three native collision envelopes, real tread support, actual ceilings/doors and source section protection. Repair the cause rather than shrinking the animal, removing barriers, adding invisible floors, teleporting, or disabling headroom/drop checks.

## Bounded verification and delivery

- Show 9 m of unobstructed full-input travel in one active second, with normalized diagonals; verify intended powder movement and unchanged world/fire timing. Cover street and landmark models at representative frame rates and a hitch.
- Show mouse/touch input survives changing stair snapshots and reaches real landings through the same public input API used by the product. Compare full keyboard/stick paths and several partial magnitudes on a known stair ascent/descent. Save the failing reproduction before the fix and its passing result afterward.
- At 9 m/s and powder speed, preserve thin-wall, closed-door, ceiling, water/drop, unloaded-section and gasoline trail/pickup correctness. Check pause/focus loss and repeated gesture recovery. Update only tests whose old 3 m/s assumptions no longer express their intended behavior; retain meaningful collision assertions.
- Run relevant source/behavior/UI checks, production build and nested-path package verification on the combined correction. Review the actual input behavior at desktop and phone sizes where available; report tool restrictions and remaining gaps accurately. The earlier preview exception is not blanket approval for later corrections.
- Provide exact scoped commits, changed paths, reproduction/root-cause evidence, checks/results and any helper cleanup receipt. No gallery repair, new art, later assets, menu redesign or unrelated work is bundled into this correction. Workers may push passing scoped candidates to their task branches; only the architect promotes and verifies deployment.

If the user's precise stair cannot be identified, proceed with the existing native stair sets and deterministic keyboard/analog comparisons while requesting only the missing reproduction detail. Do not stop the authorized speed change or independent input diagnosis to wait for that answer.

The [architect's correction review](../reviews/2026-10-29-movement-input.md) records exact intakes, combined checks, browser evidence, limitations and publication status.
