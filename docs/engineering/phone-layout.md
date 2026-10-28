# Phone layout plan and UI handoff

User requirement, 2026-10-28: Tinderbox is a cellphone-formatted game, using the existing Farmyard Commando arrangement: **three buttons on each side of the joystick, map in the upper right, and zoom controls on the left**. The user explicitly asked the coder to finish this plan and pass it to the existing UI agent. This is a planning handoff; the layout implementation belongs to `codex/ui-design`, with architect integration/review.

## Accepted arrangement and recommended action mapping

The layout and six-button count are user requirements. The following mapping is the recommended implementation choice using the existing Tinderbox actions:

| Position | Controls, top to bottom | Existing meaning |
| --- | --- | --- |
| Bottom left of joystick | Powder / Heal / Invert | Existing three `drug` commands and inventory/effect states |
| Bottom centre | Movement joystick | Existing raw normalized movement, independent pointer capture |
| Bottom right of joystick | Use or Stop / Tools / Pause or Menu | Existing primary action; compact picker for the five tools; existing pause/options flow |
| Upper right | Mini-map | Overview from authoritative world/player state |
| Left edge above the control bank | Zoom + / Zoom - | Camera projection only |
| Upper left | Compact health/status and active effects | Existing snapshot fields |

Keep exactly three persistent action buttons in each joystick bank. Move the separate five-tool rack into the Tools picker so it does not consume permanent phone playfield space. Preserve the selected-tool icon/name, remaining stock, explicit Pour/Stop state, and visible empty/disabled feedback. The picker includes Matches, Jerry can, Molotov, Torch and Flamethrower; opening it is presentation, and selecting a tool emits the existing `select-tool` command. Pause/Menu opens the existing pause/options flow.

```text
Health / status                       Map
Zoom +
Zoom -            Game field

Powder                              Use / Stop
Heal           Movement joystick    Tools
Invert                              Pause / Menu
```

Portrait is the primary review view. Start with the inherited well/ring/knob, vertical three-button banks and responsive sizing, keeping touch targets at least the existing 44 CSS-pixel acceptance size. Respect safe-area insets, browser chrome changes and dynamic viewport height. Preserve a useful field view on 320px-wide phones; the bottom deck and upper-right map must not overlap one another or the essential status readout. Landscape and desktop remain usable while retaining the same groups. Keep the current wood/Eastlake/typography work; this task changes grouping and connects view controls.

## Reuse evidence and current UI baseline

The source pin stays `30a3b8cae5f36bb0c1df3685b7fba16f701c2083`. All source paths below are under `sites/tactical-animal/dist/`; bytes were inspected directly with read-only `git show`.

| Source | Bytes | SHA-256 |
| --- | --- | --- |
| `game.html` | 10366 | `106b8cef84728459dc6e6d64bc9c9ef64e3479796307da232b087eeec3e6111b` |
| `touch-controls.css` | 10486 | `27b7c45a74c45ee3d8c23f9baa84961e73baf99285e2f413562280ec0a343ef2` |
| `field-hardware.css` | 3210 | `dd6accfe14fff84077dd362124e4895ce180e149647e9567f97a827ee190f900` |
| `map-frame.css` | 1191 | `51d64eebd2ba6a52c4ec2c47e7ce3d0aa9b348043a52ecf49e0e354880b23753` |

`game.html` lines33-34 provide `.view-controls`, `#zoom-in`, `#zoom-out` and `#minimap-button`. Lines51-63 provide `.thumb-layout`, the three `.left-controls` buttons, `.stick-column`, and the three `.right-controls` buttons. Source `touch-controls.css` places the minimap upper right and uses the inherited control-bank/well components. Reuse that actual structure and the existing local switch/map-frame assets; keep donor bytes and source inventories intact.

The UI agent's current branch checkpoint is `3a83e8dfdbd01126a08c574fe5e7fe87d488bf29`, with wood/Eastlake styling and period typography. Its current markup already has three drug buttons on the left and a central joystick; the right bank has primary and pause. This plan adds Tools as the third right-bank button and supplies the missing map/left zoom placement. Preserve the agent's later work if the branch advances. Existing source comparison/review notes are `docs/ui/wood/README.md` and `docs/ui/eastlake/README.md` on that branch.

## Runtime boundary for implementation

`mountUI({root,onCommand}) -> {update(snapshot),dispose()}` and snapshot v1 remain the existing base. Movement, five tools, primary press/release, drugs, pause/reset and cancellation use the current command vocabulary. The UI emits raw movement; the simulation applies the 180-degree inversion once. Joystick plus drug/action touches must retain independent pointer IDs, and releasing the stick must not cancel toggled pouring. Preserve blur, pointer-cancel, lost-capture, focus, death, pause and disposal behavior. Reusing the donor controls does not introduce its AP, end-turn or stance rules.

Mini-map content comes from `snapshot.world.width/height/tiles/obstacles`, `snapshot.player` and current fire-cell state. Keep world aspect ratio; map logical x to horizontal and y to vertical, with heading from the same snapshot. Use ground footprints and existing state, never geometry-driven collision or a second simulation. The first pass is an overview, with readable player orientation, terrain/building footprints and active fire. It needs no new movement or visibility rules.

The runtime already exposes `runtime.zoom(factor)` in `src/runtime/index.js`, backed by `createCameraRig().magnify`. Its existing camera zoom clamp is 0.65..3. Zoom must use that camera path, keep native world/asset dimensions fixed and never enter simulation `dispatch`.

Recommended additive integration contract: let `mountUI` accept an optional `onZoom(factor)` callback, with `1.15` for Zoom + and `1/1.15` for Zoom -. The coder/runtime owner or architect must wire it to the existing camera adapter before combined acceptance. This callback is a **planned extension, not implemented by this documentation commit**. UI can inject the callback in its workbench. Record any required runtime wiring in the candidate handoff rather than editing another worker's checkout. Camera zoom must repaint a paused/manual runtime without advancing simulation time. Existing `update(snapshot)` already supplies the map data, so no additional gameplay state is needed.

## UI-agent delivery and acceptance

Implement in the existing UI worktree/branch, preserving current wood/Eastlake assets and work. Provide an exact candidate SHA, changed paths and source/adaptation record, and leave promotion to the architect.

Verify the actual game/workbench at 390 x844, 320 x568 and a landscape phone view, plus the existing desktop smoke view. Required evidence:

- Exactly three visible action buttons on each joystick side, with all five tools reachable from Tools; upper-right map; zoom controls on the left; no horizontal overflow, clipped touch targets or safe-area collisions.
- Native pointer use: move while using a drug and primary action; held torch/flamethrower releases correctly; Pour toggles to Stop from the authoritative snapshot; choosing a tool preserves the existing selection behavior; inversion stays exactly once.
- Map markers and fire match snapshots, preserve aspect/heading and update without changing the model. A missing snapshot shows a truthful loading state.
- Zoom visibly changes camera framing and aim projection, while player/world state, clocks, resources and native asset dimensions remain unchanged. Verify minimum/maximum zoom and manual/paused repaint after the runtime hook is connected.
- Existing stock/health gating, keyboard shortcuts, pause/options, focus, accessible names, modal behavior and disposal checks still pass; repeated mounts leave no listeners or GPU/DOM resources behind.
- Run relevant UI/model/integration checks and build. Save phone screenshots and console results, then commit/push only the UI task files. Stop disposable helpers and record cleanup under the user's lifecycle policy.

This coder planning commit changes only the requirement/plan documents. Source paths/selectors and handoff references were reviewed; runtime/browser tests are intentionally left for the implementation candidate. No helper was started for this planning task.
