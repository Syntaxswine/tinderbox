# Bell & Alder witness trial

Open `?witness=1`, press **Play**, and choose **Catalogue Street**. The visit starts on the pavement at X 40, Z 18.4. The existing native goat stands outside the shop at X 40.8, Z 19.8 and faces the entrance. The regular visit uses its usual spawn and patrols. An Ashland replay query takes precedence.

## Try the two reactions

- **Alarm.** Open the shop doors and stop on the centre aisle about 1.2 m inside the doorway. Press **1** for matches, click or tap the floor immediately inside the doorway to aim, and press **Space** or use the Match button. The clerk turns toward the player and shows a red **!** if the clerk sees the strike ignite the floor.
- **Suspicion.** Reset the visit, open the doors, and use **Take lantern** by the display at the back of the aisle. Return to the same spot inside the entrance, close the doors with **E** or the contextual button, and strike the same floor tile. The lower door panel hides the low strike. Reopen the doors to show the fire to the clerk. The clerk turns toward the flame and shows an amber **?**. The floor target used in verification is X 40.2, Z 16.48, from around X 40, Z 15.75.
- **Expiry.** After the concealed strike, walk back toward the display, stay out of range for over eight world seconds, then return and reopen the doors while the original tile is still burning. Use **Reset test scene** in the existing pause menu to clear the fire and witness state.

## Rules and scope

The clerk looks within 6 m and 60° to either side of the current heading. Sight uses the live height-aware collision boxes. At the two entry leaves, sight uses the authored 0.53 m opaque apron and allows sight through the glass above it. The trial samples the ignition 0.20 m above its source. Other furniture and frontage use their existing coarse boxes.

The clerk remembers the last clear sighting of the player carrying the actual shop lantern. The memory records player ID, world position and world time. A later confirmed fire origin within 3 m of that sighting can raise suspicion if the clerk sees it burning and the sighting is at most eight world seconds old. The cause may be unknown to the clerk. A thrown lantern landing in view from deeper inside the aisle is one verified example. Alarm takes priority. The question mark lasts five world seconds and the exclamation mark lasts seven. The tunable values are in `SHOP_WITNESS_RULES`.

Direct alarm requires seeing the player and the ignition target at the action, then seeing the confirmed new ground or structural fire. The exact target and ignition cause must match a strike from a match or an already-lit torch in the same simulation step. Both tools are verified on the shop floor. For suspicion, the trial uses new ground and structural fire origins. Propagation, reheating an already-burning tile and duds supply no new origin.

Run `node --test tests/integration/shop-witness.test.mjs` for the focused route and evidence checks.
