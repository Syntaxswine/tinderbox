# TB-025 — title, places menu and exploration controls

Candidate branch: `codex/explorable-places-ui`, from UI checkpoint `6659b9c19248e869b208993e15f0e80ff065ec14`. The previous `codex/row-ignition-ui` branch remains preserved. The delivery message supplies the exact resulting commit SHA.

This implements the UI-owned portion of the `docs/milestones/08-explorable-places.md` contract, read from architect commit `d281ce91af27b32ffab4dc17390cf986f11ef881` on 2026-10-29, including selectable animals and the later title → places → individual map flow. Contract SHA-256: `bf2b651d1b6c29c683a5b20d4fd5dd75c9960a9a94d64eb54e7e5d303c6e68ca`.

## Result and ownership

A dedicated TINDERBOX title leaf leads through a native Play button to destination/animal selection. The application then opens one destination as its own map; returning from that map restores selection. The selector presents Catalogue Street, New York State Building, Administration Building and Horticultural Building as a warm newspaper field guide in the existing Eastlake timber. It retains the ochre, burnt-sienna and burnt-umber direction, Besley/Old Standard TT typography, pointing-hand engraving and native buttons. Phones use one scrollable column; desktop uses two. Goat, Horse and Bear use text choices with a visible Selected state. The application supplies the initial selection; the workbench uses the architect's provisional Goat default.

Exploration retains movement, a place plan, pause, contextual interaction, overview/follow and return navigation. It presents the runtime's human location and animal name. Street gameplay retains its six-button order, handle-free glass lantern, authoritative ignition/torch feedback and walk-over medicine behavior.

Changed paths:

- `src/ui/title-screen.js` and `title-screen.css`: DOM-only title, native Play, owned focus/disposal and inherited material/engraving composition.
- `src/ui/main-menu.js`, `main-menu.css` and `navigation.css`: new DOM selector and navigation presentation.
- `src/ui/index.js`, `model.js`, `map.js` and `styles.css`: additive public API, snapshot projection, animal labels and style imports.
- `workbenches/ui/{fixtures.js,index.html,workbench.js,workbench.css}`: fixed menu/navigation examples in the existing workbench.
- `tests/ui/{browser-tests.js,model.test.mjs}`: behavior, compatibility and source checks.
- `assets/art/place-previews/`: three immutable artist JPGs and provenance.
- This handoff, machine-readable checks and browser JPG evidence.

No application composition, runtime, gameplay rules, content catalogue, world/character geometry, source baseline, donor checkout or shared architecture/workflow file is changed.

## Title-screen API and focus

~~~js
import {mountTitleScreen} from './src/ui/index.js';
const title = mountTitleScreen({root, onStart});
title.focusStart();
title.dispose();
~~~

`onStart()` requests destination selection once per mounted title. The application disposes the title and mounts the places menu; it retains the confirmed animal across those transitions. No map, graphics context or WebGL dependency is created by this factory. The title uses existing Eastlake wood, local typography and the pointing-hand atlas; no new artwork or font source is introduced.

The native Play button receives initial focus when the document body or its root owns focus, supports Enter/Space and pointer activation, and suppresses held repeats. `focusStart()` explicitly restores it and returns false after disposal. Disposal removes only its owned shell/listeners; stale controls cannot start anything. The application calls `focusStart()` after showing a returning title. The selector's optional `onBackToTitle` exposes a native Title screen button at its footer, disabled while a visit is loading. This requests the title transition without implementing runtime teardown.

## Main-menu API and focus

```js
import {mountMainMenu} from './src/ui/index.js';

const menu = mountMainMenu({
  root,
  places,                  // {id,title,description,previewUrl}[]
  characters,              // optional {id,title,description}[]
  selectedCharacterId,     // application-owned, e.g. 'goat'
  onSelect,                // (placeId) => request a visit
  onSelectCharacter,       // optional (characterId) => request a choice
  onBackToTitle            // optional () => request the title screen
});
menu.update({loadingId, error, selectedCharacterId});
menu.focusPlace(placeId);
menu.dispose();
```

Catalogue records are copied for presentation; text is inserted as text. No canvas, renderer or model is constructed by the menu. Application callbacks own selection validation, loading, cancellation, scene disposal, character models and visit lifetime.

A button emits intent without inventing a successful selection or loading state. Update promptly with the application's loading ID to disable every destination, animal choice and title-return action. Loading text names the confirmed animal when available. Omitted character arguments preserve older callers. A missing choice callback makes supplied animal buttons unavailable; an unknown selected ID leaves every choice unselected. The UI never chooses or resizes a model.

`update` treats loading/error as the supplied current state; omitted loading/error clear them. An omitted `selectedCharacterId` preserves the last supplied choice. Supply the application's complete loading/error/selection state on normal updates.

Errors accept a string, an Error-like message, or `{placeId,message}`. The failed ID otherwise falls back to the last request/loading ID. A new failure focuses and scrolls its described recovery heading into view once; identical updates preserve the user's current focus. Try again emits the failed place ID. Back to places or Escape dismisses that error presentation and restores its destination button. This local Back action does not cancel a running runtime; loading cancellation and lifecycle remain application-owned.

On initial mount, an attached menu focuses its heading when focus is in its root or on the document body. Tab then traverses animal choices, destination buttons and optional title return in visual order. Native Enter/Space activate buttons; held repeats are suppressed. Animal choices are native toggle buttons with application-controlled `aria-pressed`. Focus outlines use dark umber on paper. `focusPlace(id)` scrolls the destination into view; an unknown ID falls back to the first place, and unavailable/empty menus focus the heading. It returns false after disposal. Disposal removes only the owned shell and listeners, preserving caller siblings and making stale controls inert.

## HUD API and snapshot contract

```js
const hud = mountUI({
  root, onCommand,
  mode: 'explore',          // optional; default 'gameplay'
  placeTitle,
  onExitToMenu             // optional; return controls disabled if absent
});
hud.update(snapshot);      // existing v1 snapshot contract
hud.dispose();
```

Explore mode accepts v1 snapshots without combat health/inventory/tool fields. It presents `player.locationLabel`, optional `player.interaction = {label,enabled}` and `player.characterId`/`species`. Known IDs goat/horse/bear become human names; absent/unknown identity stays generic. These names also update the street health/death/map labels when supplied. Older street snapshots retain Bear as their existing fallback.

`player.level` is retained only as native structural metadata. A native index of 36 is never displayed as an occupied 36th storey. The runtime must provide meaningful room/floor wording through `locationLabel`. Changes to x/y, elevation or native index alone do not rewrite the location announcement. Human location, interaction availability and pause transitions announce once. No UI clock or floor teleport control is added.

The contextual button, E and Space request `{type:'interact'}` only when the supplied action is enabled. Space on other native controls keeps its normal activation behavior. Repeated keys emit no extra interaction. The full action appears in the central hint, tooltip and accessible button name; long plate text is limited to two lines. Runtime owns proximity, doors, collisions and stairs.

Overview and Follow request `{type:'view-overview'}` and `{type:'view-follow'}`. Movement remains the existing normalized raw input; camera/interaction presses preserve held movement. The simulation/input adapter still owns inversion exactly once. Explore ignores combat number/Q/R actions and hides street tools, effects, health, zoom and reset.

Return emits input cancellation before `onExitToMenu()`; it never emits reset or resume. Pause still waits for an authoritative snapshot and traps keyboard focus. The application must dispose the visit and then call `menu.focusPlace(id)` after returning. The optional callback also adds Return to places to the street pause menu.

## Thumbnails, typography and provenance

The [thumbnail manifest](../../../assets/art/place-previews/provenance.json) records exact paths, full commits, bytes, SHA-256, rights and dependencies:

| Destination | Artist commit | Original source |
| --- | --- | --- |
| New York | `b689f5501ab06f54822f2aa724ac77de106e3b71` | `docs/art/exposition-new-york-tile/previews/front-isometric.jpg` |
| Administration | `43337a33ddfe4dff6849654c827c56e1f24e1acc` | `docs/art/exposition-administration/previews/front-isometric.jpg` |
| Horticulture | `c4287338ff93907900a94a86b6c7e3bed0ae7c2f` | `docs/art/exposition-horticulture/previews/waterfront-exterior.jpg` |

All three 1600×1200 JPGs are byte-identical to their immutable artist Git objects. CSS frames the first 1060 image rows, omitting the review-caption footer; no image pixels are repainted, filtered or regenerated. The Horticulture source includes waterfront parent `c6ddd51d7dd47a2ec148159e6a6d64a8d00bd2a9`. Catalogue Street uses a typographic timber sign. The images are actual-model CPU previews and do not prove live interiors.

Existing atlas, oil barrel and glass oil lantern bytes are unchanged from the UI base. [Typography provenance](../../../assets/art/ui/typography/manifest.json) retains all nine local font/notice/source files and both OFL notices. Farmyard UI stays at its existing `30a3b8cae5f36bb0c1df3685b7fba16f701c2083` pin. The inherited [palette record](../../../assets/art/ui/ochre-palette.json) is unchanged.

## Checks and visual evidence

[checks.json](checks.json) contains commands, results, asset audit, source hashes and cleanup status. [Browser results](evidence/browser-results.json) records all 62 checks at 390×844, 320×568, 844×390 and 1280×800.

- Repository check: 96/96 tests; 88 own scripts, 112 static modules, shared Three/provenance; art 5 imports and 25 syntax/dependency checks passed.
- Browser: 62/62 at all four sizes, including all prior 38 street checks; no console errors/warnings in the final run.
- Typography: all nine files and both notices passed.
- Three source JPG Git objects, retained engraving/palette/font manifest hashes and five solid color contrast pairs passed.
- Build: 164 packaged files, 51,714,284 bytes. Release validation passed. Nested HTTP check verified 162 public file hashes/module MIME types and absence of the QA workbench.
- Native browser keyboard/click review covered title Enter/Space/Play clicks, returning to title with restored Play focus and retained animal choice, animal selection, Tab scrolling to Horticulture, loading locks, failure focus, retry/back, overview/follow, E interaction, pause and return focus.

| Evidence | What it shows |
| --- | --- |
| [Title desktop](evidence/title-desktop.jpg), [phone](evidence/title-phone.jpg), [small phone](evidence/title-small-phone.jpg), [landscape](evidence/title-landscape.jpg) | Title typography, frame containment and Play focus |
| [Title return](evidence/menu-title-return-desktop.jpg) | Places footer requests a return to the title |
| [Desktop menu](evidence/menu-desktop.jpg) | Four destinations, Goat/Horse/Bear, actual-model thumbnails |
| [Phone menu](evidence/menu-phone.jpg), [small phone](evidence/menu-small-phone.jpg) | Single column and readable signage |
| [Phone bottom](evidence/menu-phone-bottom.jpg), [keyboard focus](evidence/menu-keyboard-focus-phone.jpg) | Native focus scroll and umber focus outline |
| [Phone error](evidence/menu-phone-error.jpg) | Visible recovery after a below-fold request |
| [Explore phone](evidence/explore-phone.jpg), [small phone](evidence/explore-small-phone.jpg), [landscape](evidence/explore-landscape.jpg) | Movement, camera, contextual action and navigation plates |
| [Pause](evidence/explore-pause-phone.jpg), [gallery](evidence/explore-gallery-desktop.jpg) | Engraved pause and human location display |

Run the existing workbench at `workbenches/ui/?surface=title&clean=1`, `?surface=menu&clean=1` or `?surface=explore&clean=1`. F2 restores its inspector; simulated failures and fixed room/stair/gallery snapshots are diagnostic controls. The backdrop, plan data and navigation locations in these HUD images are fixed examples. They omit actual landmark rendering, moving characters, interior occlusion, stairs and streaming.

## Integration boundary and remaining review

This branch intentionally leaves `src/main.js`, application lifecycle and both content catalogues with the coder. Its inherited startup still opens the old street until the architect combines the coder's new composition. UI fixtures are examples, not a production catalogue. Read-only inspection of the in-progress coder main/catalogues confirmed the optional API and IDs agree; no uncommitted coder files were imported. Use plain player-facing animal descriptions in the production catalogue rather than source/rig implementation details.

Actual visits, selectable-model fitting, interiors/stair traversal, section lifetime, camera rendering and real WebGL performance still need the combined runtime/artist/UI gate. The architect owns the separate Chrome/WebGL review; this task used its own temporary IAB DOM tab only. No worker promotion, deployment, donor mutation or cross-chat message is performed here.

Both disposable helpers are stopped with verified port release. The final two-minute helper checked the exact packaged bytes after newline normalization; its receipt is in [package-helper-cleanup.json](evidence/package-helper-cleanup.json). Its final nonsecret source/restart bundle and exact process identity/port cleanup receipt are recorded under `artifacts/explorable-places-ui/helper/`; no automatic restart is executed. Both temporary IAB review tabs are closed and their viewport overrides reset.
