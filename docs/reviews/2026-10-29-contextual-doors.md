# Contextual door correction

Status: **combined review in progress; not published**. [Milestone 10](../milestones/10-contextual-doors.md) starts from published `99b95b0888298a53791db3fc5657c4de3002d488`. The user requests Farmyard Commando's interaction: a button appears near a door and a click operates it. The earlier [preview's deferred whole-map and WebGL acceptance](2026-10-29-explorable-places.md) remains separate.

The architect checked Farmyard's immutable `30a3b8cae5f36bb0c1df3685b7fba16f701c2083` objects. Its `app.js` anchors one nearby action button above the object; `field-view.js` uses current-camera projection; `interactions.js` checks clear reach and safe destination occupancy. The [runtime donor record](../engineering/contextual-doors/donor.json) preserves the five inspected paths and hashes, independently matched by the architect. No new donor files, source pins or art are imported.

| Owner | Exact candidate | Architect intake |
| --- | --- | --- |
| Contract | `92ec5d16c1129676502f61786506f3c0e2e742f7` | Same commit |
| Coder | `84928aa802fe1c10f8d6465dd1a058f11618d625` | `3fb14dd` |
| UI specialist | Pending final handoff | Pending |

Runtime now identifies a reachable stateful door and its Open/Close action, readable name, safe/blocked state and world anchor. The UI-root projection comes from the actual orthographic camera after its update. Explicit click commands revalidate that exact target and requested state when processed; repeated stale Open requests cannot toggle it closed, and a newly nearest neighbor cannot receive the action. Permanent passages, distant/wrong-floor/obstructed doors and unavailable sections yield no action. Actual destination leaf poses still reject overlap with the native animal.

Only the existing 14 stateful doors in New York, Administration and Horticulture belong to this correction. Catalogue Street's original houses retain their exterior scope. Building/character dimensions, immutable geometry, 9 m/s movement, powder, fire and medicine remain unchanged. The coder's separate gallery checkpoint `ac2c5df5f8f69d4d3f9fd2e5922c48b01b37d7c0` is excluded.

## Review evidence

The coder delivery passes 185 source tests, including 42 controlled visits covering all 14 source doors and three native animals, six source-leaf occupancy cases, stale/exact-target behavior, readiness and actual Three camera/lifecycle checks. [Its handoff](../engineering/contextual-doors/handoff.md) records methods and limits. The architect's independent 27 cases add 30/60/144 Hz front-door traversal in all three landmarks with every animal, closed collision, duplicate/unknown targeting and pause checks. These use unchanged source navigation and public commands.

Combined source, UI/browser, build, release and helper-cleanup results will be recorded after the UI candidate is integrated. A source-navigation browser fixture validates the real UI and camera without claiming a WebGL world render or complete landmark routes. No new whole-map/GPU acceptance is implied.

## Publication

Not promoted or deployed while combined review remains incomplete.
