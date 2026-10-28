# Walk-over drugs and medicine: implementation handoff

User requirement, 2026-10-28: drugs or medicine are used automatically when picked up; the bear walks over them to use them. The user also assigns both control banks to tools, so there are no manual drug buttons or Q/E/R consumption shortcuts in this UI candidate.

## Delivery boundary

Implemented by UI: exact six-button order, removal of manual drug controls/shortcuts, authoritative health and powder/inversion feedback, and no UI-originated `drug` command. Inventory changes alone cause no consumption or invented effect. Tests cover engine-supplied effects during movement and pouring.

**Still required from coder/artist:** actual world pickup objects, overlap detection, automatic effect application and consumption, and matching world presentation. No walk-over pickup mechanic is implemented in this UI branch. The simulation currently retains its earlier drug-command/inventory API; that is not evidence of walk-over behavior.

## Concrete owner brief

- Coder: detect the bear crossing a usable pickup on the accepted movement path. Use the authoritative collision/path result, not HUD overlap, visual particles or an unaccepted movement endpoint. A stable pickup identity must prevent repeat consumption while the bear remains over it or crosses it again.
- Coder: apply the appropriate medicine/drug automatically at the simulation's fixed-step boundary and retire the consumed world item exactly once. Preserve existing healing clamp, powder/inversion timing and the once-only movement inversion unless deliberately revised by the owner. The UI must not require an extra press or selection.
- Coder: taking a pickup must preserve current movement, aim, held tool and pouring, apart from the intended effect. Keep pause/death/collision handling authoritative. Existing consumable values, full-health healing behavior, pickup footprint and placement are owner decisions to record, not rules silently added by UI.
- Artist: present distinct readable ground pickups and remove/mark each according to authoritative consumed state. Preserve physical dimensions agreed with the coder. The carried/flying lantern should use the approved clear glass body, visible oil/wick, small brass burner and wick knob, **without a carrying handle or supports**.
- Artist/coder: match the Oil barrel button with suitable barrel presentation for the existing pour tool. Compatibility ID remains `jerry-can` in this UI candidate. This is not a request to change the existing explosive obstacle-barrel rules.

A snapshot extension for pickup IDs/positions/consumed state and pickup-use events may be appropriate, but it is a **proposal for the owner**. UI already reads `player.hp` and `effects.powder/inversion` from v1 snapshots. Do not simulate effects in UI callbacks or infer collection from an inventory increment.

## Required acceptance before declaring walk-over use complete

1. Walking over each drug/medicine applies its own effect automatically with no click/key command, and the world item is consumed exactly once.
2. Standing over, re-entering or replaying the same consumed item cannot apply it again. The chosen full-health medicine policy is explicit and tested.
3. Fast/powdered movement cannot tunnel over a pickup; blocked movement cannot collect through a wall. Verify at the existing render schedules while preserving fixed-step outcomes.
4. Collection does not cancel movement, aim, held torch/flamethrower or pouring; inversion remains exactly once and health is clamped appropriately.
5. Paused/dead states and disposal do not create a delayed/double pickup. UI health/timers and ground-item disappearance agree with the authoritative snapshot.
6. Review the combined running game on the phone layout with actual world pickups. Current UI/combined tests use effect fixtures and do not substitute for this gate.

The architect integrates and reviews exact coder/artist/UI candidates. The UI candidate can be reviewed independently, but it must not be described as a completed walk-over implementation.
