# Character fire host adapter

Contract: [M25](../milestones/25-character-fire-shroud.md), common base `064d41865ae35f00f8a33d7cf1bd6f368f327c17`. The artist owns the shared factory and its original-source evidence. Runtime consumes that factory through its [frozen API](../art/character-fire-shroud/API.md). This adapter does not introduce another fire, damage, movement, wind or character controller.

Exact artist intake: `a69f0920728fac774094d98923cab735db5b1d43`, preserved with `cherry-pick -x` as `f6ab3f665aa907c8ec78c343f3d5af2361b2ada2`. [Runtime delivery and actual gameplay evidence](character-fire-shroud/DELIVERY.md) record the completed checks, measured scope and cleanup.

## Authoritative presentation state

Player and NPC snapshots add a detached `characterFire` record:

```js
{version:1, active:false, mode:'none', intensity:0, age:0}
```

| Field | Meaning |
| --- | --- |
| `active` | Alive and in proven current lit-fuel contact, or carrying the existing timed NPC burn. |
| `mode` | `none`, `contact`, `timed`, or `both`. |
| `intensity` | Normalized current direct flame intensity, or 1 for the existing timed burn. Warm heat never contributes. |
| `age` | World seconds since the continuous union of those two existing causes began. Reading a snapshot never starts or advances this epoch. |

The private presentation store is keyed by entity identity. It owns no ignition threshold, damage, fuel, persistent afterburn, timer expiry or movement. End-of-step publication follows environmental damage, the existing timed NPC damage and officer updates. Death clears presentation. Contact-only presentation stops on the first step outside contact. The original NPC `burn.ignitedAt/expiresAt` remains separate and unchanged. Reset/disposal clear the presentation store; returned records cannot mutate it.

Both thermal backends expose `sampleCharacterExposure(point) -> {exposure,directFlame}`. Their numeric `exposure(point)` API remains compatible. Damage and direct-contact metadata share the same existing cell reads in the host damage pass. Radiant/warm heat can still hurt a character without activating its shroud.

The native Catalogue backend preserves the existing three samples at foot, waist and upper-body heights, including actual floor elevation. A sample proves contact only when its existing fuel record is lit and has positive remaining fuel. This retains the thermal grid's existing spatial approximation; it does not create mesh/flame collision physics. The older flat backend has ground-plane fuel only. Its old two-dimensional damage value is preserved, but direct contact is conservatively disabled for an elevated body. It cannot prove contact with a wall flame on another floor. Existing timed NPC burns work in both backends.

## Posed body and lifecycle

Native player/civilian wrappers expose a frozen `bodyBinding` containing only the live native root and a frozen array of its skinned parts. It provides no pose, equipment, damage or movement callbacks. The uniformed officer keeps the same binding API; the artist factory reads the existing visible replacement cloth under that root and excludes metal/headgear/weapons.

`src/art/index.js` updates player gait, NPC gait/patrol aim, actual elevation and world matrices before `src/art/fire.js` submits the shroud. Stable IDs bind once per native model identity and simulation generation. The factory receives `{id,active,startedAt:worldTime-age,intensity}`. Translation, heading and elevation come from the evaluated model matrices; the host adds none a second time.

The two old NPC body cards are removed. Ground fire, rubble, discharge and carried-torch effects retain their previous jobs and resources. The shared shroud has its own bounded 16-character pool and diagnostic counters; it adds no character lights, textures, physics or renderer. Hidden/dead/removed bodies submit no shroud. Reset clears bindings and fits before rebinding current models. Disposal releases the factory's owned resources. Provisional debug actors without native rig bindings are explicitly listed in `fire.unsupportedCharacterIds`; they receive no replacement body cards.

Animation uses world time, so pause freezes it and powder uses the existing slower world clock while the real player can move faster. Catalogue modules pass their current labelled 1.5 m/s east ambient sampler. The cottage host passes its existing checked sampler unchanged; other legacy hosts use a calm presentation control. This correction does not provide a new whole-map obstacle-resolved Nautilus bake.

## Focused reproduction

After the exact artist intake and combined build:

```powershell
node --test tests/integration/character-fire-state.test.mjs tests/integration/character-fire-host.test.mjs tests/sandbox/catalogue-host.test.mjs tests/integration/art-cell-publication.test.mjs tests/integration/neighborhood.test.mjs
npm run check
npm run build
node tools/check-release.mjs
node tools/review/character-fire-shroud.mjs artifacts/qa/character-fire-shroud/host
node tools/review/character-fire-hosts.mjs artifacts/qa/character-fire-shroud/shared-hosts
```

The browser driver uses the actual packaged `/tinderbox/?catalogue=modules` title/menu and normal `autoStart:true` game loop. It uses the mounted joystick/tools, keyboard and rendered-surface aim. It never injects a burning snapshot, teleports a character or substitutes a renderer. It records actual held-flamer NPC ignition, the uniformed officer/resident, a match on inert paving, player contact with a poured oil trail, contact exit, pause and real service-stair/elevated contact. JPGs, short WebM motion, actual markers, input traces and a short frame/resource window are stored together. The active-character measurement includes MediaRecorder overhead and is not a city-scale performance claim.

The same bounded helper supports the published URL after promotion:

```powershell
node tools/review/character-fire-shroud.mjs artifacts/qa/character-fire-shroud/live --npc-only --url https://syntaxswine.github.io/tinderbox/
```

It checks the runtime/factory manifest hashes against the local reviewed package before performing real gameplay ignition. `--npc-only` keeps the warm-negative, moving NPC, clear/reset/disposal and short actual frame window. The existing helper owns a temporary hidden Edge process, local server only when needed, exact identity/port record, 15-minute automatic close, STOP-file control and finally cleanup receipt. No standing preview is retained.

Landmark visits have no character-fire gameplay state. Their selectable native actors remain supported models for the shared factory; that is not a claim of newly connected landmark fire gameplay. The artist's posed three-species/all-around controls establish fitting separately from the host's actual gameplay evidence. Final measured results and exact intake are recorded in the delivery/review handoff.
