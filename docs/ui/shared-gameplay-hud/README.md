# Shared gameplay HUD — M29 UI candidate

Base: `6d1061cd3ab7e6c9bff212381193376473413b30` on `codex/shared-map-tools-ui`, in the assigned UI worktree. Scope is the [New York pilot contract](../../milestones/29-shared-gameplay-maps.md). This is a UI candidate for combined architect review, not a map conversion or publication.

## Host boundary

The coder's version-1 capability proposal is consumed directly:

```js
const capabilities = Object.freeze({
  version: 1,
  mode: 'gameplay', // or 'explore' for an unchanged diagnostic host
  tools: true,
  health: true,
  interact: true,
  overview: true
});
mountUI({
  root, onCommand, onZoom, onProjectInteraction, onExitToMenu,
  capabilities, placeTitle: 'New York State Building'
});
// The same host publishes snapshot.capabilities alongside its real v1 snapshot.
```

Explicit mount capabilities select the presentation mode. A snapshot can restrict an affordance; the UI never obtains permission from a destination ID, inventory count, location label or the presence of navigation metadata. Malformed explicit records, contradictory snapshot modes and a capability mode change within a visit throw at the boundary. Changing mode requires a fresh mount. No additional runtime field is requested beyond the coder's proposal.

For unchanged callers that omit capabilities, the existing `mode` option retains its behavior: gameplay has tools/health/interactions and no Overview affordance; exploration has interactions/Overview and no tools/health. An absent snapshot capability record inherits the mount record. Explicit `null` does not count as absent.

The existing five tool IDs and six-button layout remain. Stock, pouring, torch phase/seconds, lantern target/path/impact, effects and feedback events come from the snapshot. Revoking tool availability cancels held input. Health availability controls the health presentation and death lock; pause always locks gameplay controls. Contextual actions additionally require `interact` and the existing exact, enabled, projected `player.interaction` record. The runtime still validates every command.

## Presentation

On a gameplay host with `overview: true`, Menu gains etched **Show place overview** and **Follow player** actions using the existing newsprint menu style. The current host camera view is marked. The group shows the supplied place title, human location and native character name. It accepts `navigation.view: 'overview' | 'follow'`; location uses `player.locationLabel`, then `navigation.locationLabel`. Native numeric levels remain metadata, never invented floor names.

Camera actions stay disabled until the host acknowledges pause. Choosing one cancels held input, emits the existing `view-overview` or `view-follow` command, then requests resume. Exiting and pending resume block repeated requests. Exploration diagnostic controls retain their existing toolbar placement. No tool buttons are displaced.

Goat, horse and the AFT bear use the same HUD projection; their native art, dimensions, rigs and anchors are untouched. Gameplay global **E** and contextual click interact; **Space** uses the selected tool. Focused native buttons retain their own Enter/Space activation. Title and gameplay Options explain tap controls first and distinguish interaction from tool use. Medicine remains automatic on walk-over.

## Changed paths and provenance

- `src/ui/index.js`: capability consumption/input gating and pause-menu connection.
- `src/ui/model.js`: strict capability projection and human navigation metadata.
- `src/ui/menu-navigation.js`: bounded camera-menu presenter and disposal.
- `src/ui/title-screen.js`: shared, phone-first help text.
- `tests/ui/capabilities.test.mjs`: capability/state/native-character checks.
- `tests/ui/menu-navigation.test.mjs`: finite DOM readiness, labels, stale clicks and disposal.
- This handoff.

The implementation is original Tinderbox presentation code built on the UI at the base above. Existing engraved plates, warm wood/newsprint CSS, Besley and Old Standard TT fonts, and pinned Farmyard UI bytes are reused unchanged. No new donor imports or pin changes. The completed brigade study and train-control candidates remain on their separate branches.

## Checks and limits

- All **40** Node UI checks pass: the existing model/map/preferences checks plus nine capability and five finite menu checks. They include all five tools for all three native characters, invalid/contradictory capability records, real stock/torch/aim constraints, copied interactions, pause readiness, unsupported camera actions, disposal and unchanged-label stability.
- Syntax checks pass for the four changed UI modules and two added test modules. The UI import closure passes syntax/reference checks for 10 local modules and 9 asset URLs; the handoff link resolves. `git diff --check` passes.
- The existing UI provenance and place-preview byte checks pass within that suite.

No browser, preview server or build was started, as required for this bounded worker assignment. The finite DOM host does not establish native keyboard/touch behavior or layout at phone scale. No visual evidence or runtime gameplay acceptance is claimed, and no helper remains running.

**Runtime still unwired on this UI branch:** the coder owns publishing `runtime.capabilities` / active-visit capabilities / `snapshot.capabilities`, forwarding mount options, application mode, navigation camera state/actions and the actual shared New York simulation. This candidate alone does not enable fire on the old exploration backend. The architect must review the combined New York host with real input and normal-zoom phone/JPG evidence before rollout. Production-wide flame/smoke/light settings, inventory and suspicion work are outside this UI change.
