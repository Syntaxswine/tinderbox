# Restore the approved character fire shroud

## Owner correction and common base

On November 15 the owner identified the missing approved shroud as Tinderbox's biggest fix: characters on fire must use the earlier animation that wraps them as if mummified in fire. This is a restoration/integration task, not a new fire-art direction or a change to ignition, damage, fuel, spread, movement or police rules.

Start both existing worker worktrees from `e9fbc7bfbb5aa875ecc51f11883d75e65cf1eca3` plus this architect contract. Preserve previous candidate branches. The architect supplies the exact contract commit before implementation. Reuse the existing coder and artist chats/worktrees; create no extra worker, worktree or standing preview.

The live shared renderer in `src/art/fire.js` emits two upright cards per burning NPC and never visits the player. The approved prototype is preserved at `7c60ba4b41f79de9dcca1f10b6e1dfffe9a74b26`, especially `workbenches/art/fire-realism/gaussian-patch/bear-wrap.js`, `shroud-bands.js`, `splats.js` and the native `character.js` workbench. Locate its complete dependency/source chain and retain its exact reference. Do not silently substitute the later house/wall effect.

## Required result

Use the close connected bands, cloth-mounted flame tips and rising smoke around the actual native body, visible on its front, sides and back at normal game zoom. The effect follows the posed model, heading, movement and floor elevation. Adapt the reusable interface for the goat, horse and AFT bear and existing civilian, officer and resident models; preserve their geometry, paint, skeletons, attachments and authored scale.

One shared character effect serves every current host with a real burning-character state. Remove the two-card substitute on those characters. Presentation consumes detached authoritative state and already-posed model bindings; it cannot inspect or advance physics, create a second damage clock or ignite a character itself. Ground, structure, tool and carried-torch effects keep their existing roles.

NPC flamethrower burn remains the existing `burn.ignitedAt/expiresAt` state, with unchanged duration, damage, expiry and death behavior. The protagonist currently takes field-exposure damage without a persistent clothing-burn mechanic. For the protagonist and other characters in direct flame contact, the coder may add a detached presentation marker from actual existing burning-fuel contact, alongside the existing persistent NPC burn. It must distinguish direct flame from warm/radiant exposure: nearby heat or smoke alone must not falsely set a body ablaze. Contact presentation ends when contact ends; adding player afterburn or changing HP/ignition thresholds is outside this correction. Resolve the exact additive field/API with the architect before implementation if the existing data cannot support this distinction truthfully.

Animate from authoritative world time, with stable actor-specific phase and the current labelled host wind sampler. Pausing freezes flame/smoke motion; powder preserves the established player/world clocks while the shroud follows the actual moved body. Honor existing presentation controls where offered without altering simulation. Death/removal, expiry, reset, character changes and disposal must clear inactive effects and release owned resources. No floating shroud may remain where its body is no longer rendered.

Reuse existing shared Gaussian/splat resources and the existing lighting budget. Allocate/update active character effects only; do not add an unbounded light or fresh renderer per character. Record submitted counts, active/inactive cost and resource behavior. Current building-fire and wind models remain unchanged. No new art research, asset family, interface redesign, long burn library or city stress sweep is required.

## Ownership and interface

| Owner | Assigned branch in existing worktree | Files and delivery |
| --- | --- | --- |
| Artist | `codex/character-fire-shroud-art` | Shared character-shroud factory and adapters under a new scoped art/reuse directory; exact original source/provenance; focused art checks; normal-zoom JPGs and short animation. Own neither `src/art/fire.js` nor `src/art/index.js`. |
| Coder | `codex/character-fire-shroud-runtime` | Host art integration and posed-rig exposure, additive truthful simulation snapshot/contact metadata if needed, relevant checks and packaged browser acceptance. Own neither the artist's shared factory nor its source evidence. |
| Architect | `codex/review-character-fire-shroud` | Contract, interface decisions, exact intake, combined visual/behavior/build review and promotion. |

The artist records the factory's exact imports, update/bind/unbind/reset/dispose interface and diagnostics before coder intake. Bind stable actor IDs to actual already-evaluated native roots/cloth parts; the coder exposes only the needed rig bindings and updates the effect after posing and elevation. Keep raw source copies distinct from adapted code, with full commit/path/SHA-256/dependency evidence. Do not add another Three.js instance, absolute runtime path or donor write. The [shared modular art workflow](../art/shared-modular-art-workflow.md) applies.

Each worker first checks status and actual branch occupancy, then branches from the common contract commit. Each owns its files and pushes only its candidate branch. The coder intakes the artist's exact reviewed commit once available; avoid repeated previews or duplicate helpers. Preserve the current primary deployment and the earlier shroud control.

### Approved interface decisions

Common dispatched contract commit: `064d41865ae35f00f8a33d7cf1bd6f368f327c17`. Both existing worker worktrees have switched to their assigned task branches from that exact commit.

The additive detached per-character field is `characterFire: {version: 1, active, mode, intensity, age}`. Modes are `none`, `contact`, `timed` and `both`. A positive direct-lit-fuel sample or the existing NPC timer activates it while the body is alive. Age measures the continuous active union from world time and clears when that union ends, including death/reset. The backend returns numeric exposure and direct-flame information from the same existing sample reads; damage still consumes precisely its previous numeric exposure. The native adapter retains its three body-height queries; flat legacy ground cannot establish elevated fuel contact and therefore reports ground-plane contact only. Warm unlit exposure is an explicit negative control.

The artist's accepted entry is `src/art/character-shroud/index.js`, exporting `createCharacterShroud(THREE, {maxCharacters: 16})`. It provides `root`, `bind(id, {species, worker})`, `update`, `unbind`, `reset`, `dispose` and diagnostics. The minimal native binding exposes actual already-posed `worker.root` and skinned `worker.parts`. Update receives world time, camera, the labelled XYZ wind sampler, effect masks and detached `{id, active, startedAt, intensity}` records. The coder maps `startedAt = worldTime - characterFire.age`, binds only on model identity/generation changes and rebinds after reset, since reset clears bindings. No heading/elevation is applied twice. The explicit prototype capacity is 16 bodies and at most 88 splats per active body in a lazily created shared pool; current five-body capacity fits within it and any unsupported/capped input must appear in diagnostics. No new lights, textures or renderer are introduced.

## Focused acceptance and delivery

1. Demonstrate real production flamethrower ignition on a moving native NPC and the same shroud on the officer/resident. Show actual player direct-flame contact with the additive state, plus a warm-only negative control. Do not present an injected render-only flag as real gameplay ignition.
2. Show normal-game-zoom before/after JPGs and a short moving/turning clip. Cover the three selectable native silhouettes with clearly labelled posed/factory controls where actual host ignition is not used. A rendered still alone cannot establish animation, attachment or actual game wiring.
3. Check the effect around front/back/legs/torso, on an elevated floor, through movement/turning, and at expiry/exit-contact/death. Verify world-time pause/powder, no mutation of snapshots, no ground-card duplicates, and bounded reset/removal/disposal resources. Include meaningful negative controls rather than tests that only repeat the implementation.
4. Test in the real larger Catalogue host and check legacy/cottage shared-host compatibility. Identify a separate host that cannot yet report character burning rather than claiming unsupported universal gameplay. Keep four title maps, current buttons, native movement and all previous connections intact.
5. Run affected tests, then the combined check/build/nested-path package gate once on the exact integrated candidate. Measure one short representative active-character window with the number of burning characters stated; do not infer city-scale performance or repeat the old fire library. Stop disposable helpers promptly and preserve exact identities, inputs, outputs and restart/cleanup receipts.

Deliver exact source/commit IDs, scoped paths, checks/results, original and new visual evidence, measured counts/costs and remaining limits. The architect reviews actual WebGL at normal zoom, corrects relevant failures, then promotes/pushes the reviewed fix under the existing delivery policy, monitors Pages and verifies live resources/behavior. No additional owner permission is needed for this authorized correction; previous preview exceptions do not waive its checks.
