# Bell & Alder contextual action — UI handoff

The UI candidate starts from published `b5b8de6ffabe665b82556eeb097e1983f293ba80` on `codex/shop-interactions-ui`. The wind indicator candidate `adbb401d64cd10931f712647102e6a5ab13fc286` is preserved on its own branch.

One projected timber button presents the authoritative street door or portable light interaction. It sends `{type:'interact', portalId, action}` for doors and `{type:'interact', objectId, action:'take'}` for the hand lantern. An unsafe door shows the runtime's reason. The button fits around the deck, vitals, ground plan and zoom controls. A press cannot migrate to a different target or action, including when the original prompt disappears and reappears. Picking up the light returns focus to the stick when the focused prompt disappears.

On the street, **E** uses the available prompt. **Enter** and **Space** activate the focused prompt through the native button. Space still uses the selected tool from the stick or field. Landmark doors retain their **E / Space** shortcuts and portal command shape. Pause, death, an unavailable projection and pending or active throwable aim suppress the street prompt. The portable light action sends no weapon command and never spends throwable stock in UI.

Changed production paths: `src/ui/{door-action.js,index.js,model.js}`. The existing style, projection callback and pointing-hand engraving remain in use. No runtime rules, asset bytes, source pins or menu layout enter this candidate. Focused checks extend `tests/ui/{browser-tests.js,model.test.mjs,shop-interaction-checks.js}`.

[Check record](checks.json): 225 offline tests and 3,501 packaged files passed. The existing browser suite plus nine shop cases passed 111 checks each at 1280×800, 390×844, 320×568 and 844×390. The [desktop native trace](evidence/native-desktop.json) shows one click for Open, Enter for Close and focused Space for Take, then stick focus and ordinary Space for Matches. The [phone trace](evidence/native-phone.json) shows the prompt hidden during aiming, Escape restoring it and E taking the lantern without a pause or stock change.

[Desktop Open](evidence/desktop-open.jpg) and [phone Take lantern](evidence/phone-take.jpg) show the production HUD over a controlled shop snapshot fixture. They establish UI placement and interaction only. The architect still owns the combined in-game door, pickup, light and promotion gate.

The browser tab was closed, its viewport reset, and the finite preview stopped after saving its restart record. The process exited and released port 4552.
