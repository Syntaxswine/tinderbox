# Bell & Alder officer trial

The candidate starts at published patrol `f82ec409ad46cda62b98c21c0b555307083f4b11`. It takes the reviewed witness trial `1ee18b571e223c5ee329842dc1babac16bc65a67` as `9450d77d10f53d42267182a7c409bf72f07243f6`. The uniformed goat uses the trial's observation post at X 40.8, Z 19.8 and faces the entrance. The player spawns on the pavement at X 40, Z 18.4. The two civilian routes and the normal Catalogue Street patrol use their published placements. Ashland retains priority when its query is present.

## Reproduce in the packaged game

Open the game with `?witness=1`, choose **Play → Catalogue Street**, and use the regular shop and fire controls.

- **Suspicious.** Open the shop and take the display lantern. Return to X 40, Z 15.75 inside the entrance. Close the doors with **E** or the contextual button, then aim a match at X 40.2, Z 16.48. Reopen the doors to reveal the fire. The officer turns toward it, shows an amber **?**, and keeps the pistol at the belt.
- **Aggressive.** Reset, open the doors, and repeat the match from the same spot with the doors open. The officer turns toward the player, shows a red **!**, and draws the pistol. Stay exposed for the shot. To take cover, close the shop doors during the draw. The glazing still gives the officer a view of the player above the apron. The full closed leaf blocks the ballistic ray.
- **Relaxed.** The officer begins at the belt and returns there when the reaction expires. A match on the bare pavement near the spawn is a dud. For a sighting expiry replay, leave the doors closed after a concealed match, retreat beyond sight for eight world seconds, then return and open them. **Menu → Reset test scene** clears the fire, memory, draw, and shots.

## Prototype rules

- The officer sees up to 6 m and 60° to either side of his current heading. The entry's opaque apron is 0.53 m tall. Fire sight samples 0.20 m above each confirmed fuel origin. A prior visible sighting of the actual carried shop lantern stays eligible for eight world seconds and within 3 m of the new origin. Suspicion lasts five world seconds and can be superseded by direct evidence.
- A match, lit torch, held flamethrower, or thrown lantern must contribute heat to the exact site that catches in that advancing simulation step. Its heat must cross the cooled threshold independently. Ground fire also tests incoming transfer so a stale tool label on advancing spread cannot stand in for an observed action. The officer must see the action and the new ignition. A thrown lantern requires sight of its release and actual impact, tied together by its projectile ID. An unseen action can still supply a real nearby fire for suspicion when the prior carried-lantern sighting qualifies.
- Direct evidence authorizes the draw only for those four heat tools. Oil pouring deposits fuel. Indirect barrel chains, spread, and unresolved mixed or delayed heat are outside direct attribution. Observed contacts use the authored site sample and live collision volumes for visibility. The officer holds aim at the last seen position while the player is out of sight.
- The draw takes 1.2 world seconds. The 4.5-second aggressive window permits a shot every 1.8 world seconds while the live player stays visible, 0.85–6 m away, and the muzzle-to-torso ray is clear of solid geometry. A shot applies up to 24 HP through the existing damage path. The muzzle flash and tracer use the original pistol's full-aim muzzle and decay on world time. Pause freezes the draw, cooldown, and cue clocks. Reset restores the relaxed officer, and death stops further shots.

## Pose sources

The same installed native goat, six-piece uniform and TT-33 from the published patrol supply the pose and geometry. The TT-33 retains its anachronistic design at the user's request. The draw fits the original grip to the native right palm and aims the actual muzzle along the simulation ray. It uses the donor palm orientation and two-bone bend-plane solve as an adapted reference through Tinderbox's shared Three renderer. The normal left arm and the native skeleton and limb lengths supply the rest of the pose. [Patrol and pistol provenance](chicago-police-sidearm.md)

The read-only pose reference is Farmyard Fighters `f6332900296d1e2727deaca875aa43a8c3f81b84`. `src/reuse/patrol-pistol.js` is the local adaptation. Its packaged SHA-256 is `5ee7edbb8d687dc431245b2d4cd653492d6eb49be27bd35d473da39c2af05a33`. The donor's game-art rights remain unresolved.

| Source path | SHA-256 |
| --- | --- |
| `sites/tactical-animal/dist/weapon-pose.js` | `ab02101e2261536c0aa18f1ae080301ec8c8f784499ecbe699fe5027ac50d9d9` |
| `sites/tactical-animal/dist/weapon-pose-rig.js` | `c1744efa29c566e2c76e9035e15670a4e195c159da8892ef5eaa0dbd84cb784a` |
| `sites/tactical-animal/dist/aft/tactics/idle-rig-math.js` | `764539010c4647f4470962c20ed9d70ed1393a7e5434765f3f6ab3403f66a6b3` |

## Checks

- `node tools/check.mjs` passed 243 tests and the source, syntax, and art checks. The focused tests verify evidence and timing for all four tools, covered and clear shots, expiry, duds, ordinary spread, pause, death, reset, and the separate normal street and Ashland routes. The native pose checks measure palm contact, muzzle location, and bore alignment during the draw and at full aim.
- `node workbenches/art/check-chicago-beat-uniform.mjs` passed 32 poses of the six-piece uniform against the native skeleton.
- `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,507 packaged files at the nested project URL. The package manifest SHA-256 was `da868073f334c91c1671c49ed5469d7e5a0178711c8752615ac28ed9774ac0ee`.
- Packaged WebGL replayed **Play → Bear → Catalogue Street** at 1280 × 720. The concealed strike and reveal produced the amber cue and zero shots. The visible match produced the red cue, draw, and first shot after 1.20 world seconds. The flash started at the rendered muzzle and the hit applied 24 HP of pistol damage. Closing the glass doors during the draw produced zero shots through expiry. Pause, reset, a paving dud, the normal visit and Ashland passed. The browser reported zero errors. The local JPGs and receipt are in `artifacts/qa/bell-and-alder-officer/verified-1794273679292/`. The preview and browser helpers exited and released their ports.
