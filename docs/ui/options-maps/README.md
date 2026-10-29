# UI follow-up — Options and four test maps

This builds on `2b506544c41beed60a0504d34113ca23c00abee9` on `codex/explorable-places-ui`. The user requested Options and a map list, then explicitly selected the four current destinations on 2026-10-29. The delivery message records the resulting commit SHA.

## Result

The title has native Play and Options buttons, composed from the existing pointing-hand/book engravings, Eastlake timber and local period-inspired typography. Options offers Reduce interface motion, High contrast labels and an expandable Controls reference. Back and Escape restore focus to the Options button; `focusStart()` closes Options and focuses Play.

Play opens **Choose a map**, with **Open map** actions for exactly these current destinations:

| ID | Map |
| --- | --- |
| `catalogue-street` | Catalogue Street |
| `new-york` | New York State Building |
| `administration` | Administration Building |
| `horticulture` | Horticultural Building |

The selector still consumes the application's supplied catalogue and emits its IDs through `onSelect`. It shows no combined map or additional historic test scene. Loading, retry, return focus, animal selection and optional Title screen navigation retain their existing contract.

## Shared interface preferences

Existing callers need no changes. `mountTitleScreen`, `mountMainMenu` and `mountUI` now share one browser-page session of interface preferences by default. The title choices carry into the map picker, successive visits and the existing pause-menu Options; changes there also carry back. No settings are written to OS preferences, save games or browser storage. Reloading starts a fresh interface session. Existing CSS support for the OS reduced-motion preference remains in place.

For an explicit application-owned or isolated session:

~~~js
import {createInterfacePreferences, mountTitleScreen, mountMainMenu, mountUI}
  from './src/ui/index.js';

const preferences = createInterfacePreferences({
  reduceMotion: false,
  highContrast: false
});
// Pass the same optional {preferences} argument to each factory.
preferences.get();                         // immutable snapshot
preferences.update({highContrast: true});  // partial boolean update
const unsubscribe = preferences.subscribe(value => { /* presentation only */ });
unsubscribe();
~~~

Unknown fields and non-boolean values do not become settings. Subscribers receive changed values once and detach on disposal. The binding updates only interface classes and checkboxes; it emits no movement, fire, consumption or other gameplay command. The high-contrast paper variant keeps dark ink on light ochre paper, while existing HUD contrast styling remains in use.

The original [title/menu/HUD API and source handoff](../explorable-places/README.md) still applies. The application continues to own title → selection → visit lifetime and actual map loading. No required callback or runtime API was changed.

## Changed paths and provenance

- `src/ui/preferences.js` and `preferences.css`: shared session state, scoped bindings and paper contrast.
- `src/ui/title-screen.js` and `title-screen.css`: working Options view, controls reference, keyboard/focus behavior and responsive actions.
- `src/ui/index.js`, `main-menu.js` and `styles.css`: additive preference support, map-selection wording and style import.
- `tests/ui/preferences.test.mjs` and `browser-tests.js`: state isolation, subscription disposal, cross-screen behavior, native targets and all four map IDs.
- This handoff/evidence and a follow-up pointer in the preceding handoff.

No new art, fonts, model assets, source pins, gameplay rule, application composition or catalogue entries were introduced. The raster engravings, [font distribution](../../../assets/art/ui/typography/manifest.json), [palette](../../../assets/art/ui/ochre-palette.json) and [three pinned preview JPGs](../../../assets/art/place-previews/provenance.json) are retained without edits. Binary images/fonts match the base Git objects byte-for-byte. Nine existing SVG/JSON files retain their checkout line endings and match Git clean-filter content. Source rights/provenance records remain authoritative.

## Verification and evidence

See [checks.json](checks.json) and the [complete browser report](evidence/browser-results.json).

- `node tools/check.mjs`: 99/99 tests; 90 own scripts and 114 static modules; shared Three/provenance and 5 art imports/25 syntax checks passed.
- Browser: 66/66 at 390×844, 320×568, 844×390 and 1280×800, including all preceding 62 checks.
- Native review: Enter opens Options; Back/Escape restore focus; both settings persist through title → map picker → exploration HUD; Horticulture Enter activation requests its exact ID. The browser suite checks all four map IDs and focus restoration; phone/landscape Back remains reachable.
- Typography: nine font/notice/source files and both OFL notices passed.
- Build/release: 166 packaged files, 51,722,016 bytes. Nested HTTP check verified 164 public file hashes/MIME types; QA workbench remains outside the public package.
- All 25 retained art/font/preview files match Git content; 16 also match raw Git blob bytes. The other nine preserve pre-existing checkout line endings. No console errors or warnings were observed.

| Preview | Purpose |
| --- | --- |
| [Title desktop](evidence/title-options-desktop.jpg), [phone](evidence/title-options-phone.jpg), [small phone](evidence/title-options-small-phone.jpg), [landscape](evidence/title-options-landscape.jpg) | Play and engraved Options actions |
| [Options desktop](evidence/options-desktop.jpg), [phone](evidence/options-phone.jpg), [small phone](evidence/options-small-phone.jpg) | Working display controls |
| [Controls/contrast](evidence/options-controls-contrast-desktop.jpg), [phone controls](evidence/options-controls-phone.jpg), [landscape Back](evidence/options-landscape-back.jpg) | Expanded help, high contrast and keyboard reach |
| [Four maps](evidence/four-maps-desktop.jpg), [with carried contrast](evidence/four-maps-contrast-desktop.jpg) | The confirmed map list |
| [Shared HUD Options](evidence/hud-options-shared-desktop.jpg) | Both title choices reflected in the visit interface |

These are actual DOM UI screenshots. The HUD backdrop and location values are fixed workbench examples; they do not establish playable interiors or streaming. The inherited startup in this UI branch still opens the prior street until the architect combines the coder's application/maps candidate. Actual map visits and combined WebGL acceptance remain with that integration; this change supplies the controls and stable requests.

The temporary IAB review tab is closed and its viewport override reset. The registered preview has a real 30-minute TTL and is stopped before delivery with an exact-identity cleanup receipt and preserved restart sources. No worker promotion or deployment is performed.
