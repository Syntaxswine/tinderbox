# One-through-five-story wall options

User direction: provide one-to-five-story walls so the artist has a larger facade canvas for the period buildings. This additive coder candidate follows the direct-reuse correction at base 8c8ecfd15d85e88740ccbbf034a68a9bb6f950a0. Architect promotion and final skin selection remain separate.

## Contract and use

`src/content/exterior-kit.js` exports `DEFAULT_STORY_HEIGHT=3.2` and frozen `WALL_STORY_OPTIONS`. The game presets use the existing frontage height per story:

| Stories | Wall height (m) |
| --- | --- |
| 1 | 3.2 |
| 2 | 6.4 |
| 3 | 9.6 |
| 4 | 12.8 |
| 5 | 16.0 |

These are game adaptations, not measurements attributed to an 1893 building. A source-backed facade may provide a positive `storyHeight` instead. For `wall`, `doorway`, `pilaster` and `corner`, supply `stories` and omit `height`, or spread a preset onto an existing valid module. If both dimensions are supplied, the compiler rejects disagreement. A count must be an integer from one through five. Legacy modules that only specify height keep their prior behavior and metadata shape.

```js
const fiveStoryGate = {
  id:'five-story-gate', form:'doorway', x:10, y:5, heading:0,
  width:6, depth:0.3, stories:5,
  physicalMaterial:'wood',
  opening:{width:1.4, height:2.3, state:'open'},
  skinSlots:{facade:'inherited-plaster', trim:'inherited-cream',
    door:'inherited-wood', roof:'inherited-roof'},
  sourceRefs:['farmyard:hybrid-wall-opening', 'game:story-canvas-study']
};
// Compiled snapshot: stories=5, storyHeight=3.2, height=16.
// A matching roof uses baseHeight=16; roof height is its own rise.
```

Art can use `stories` and `storyHeight` to place repeated windows and story divisions, with the upper cornice at `height`. Each option consumes the same byte-preserved `hybrid-geometry.js::roomBoxes` builder through the existing resizing adapter. It creates no extra wall parts per story. Ground-level openings and closed leaves retain their supplied width/height; neither doors nor characters scale with the facade. Skin slots and part IDs remain unchanged.

This is an exterior-height contract. The simulation still uses its existing ground-plane movement/fire model; these options introduce no accessible upper floors. Workbench framing for taller facades must include the whole envelope. Production scene composition and camera acceptance remain with the combined architect/art review.

## Verification

- `npm run check`: passed all 56 behavior tests, 57 own-script syntax checks, 65 resolved static modules, the single shared Three pair, all five raw provenance inventories and the inherited art smoke check.
- Added 80 explicit-height comparisons across all five counts, four wall forms and four quarter-turns. Resolved parts and ground collision match exactly; parts start at ground and end at the requested facade height.
- All five counts pass open/closed ground passage checks, retain a 2.3 m-high lintel clearance and closed leaf, and allow a non-solid roof at the matching support height. Invalid counts, conflicting dimensions and invalid story heights fail; custom story spacing and legacy heights pass.
- `npm run build`: passed, 73 public files / 25,288,936 bytes. No new donor imports or vendor changes.
- Browser geometry review at 1280 x 800 and 390 x 844: five progressively taller walls, unchanged ground doorway size, closed leaves, rotated geometry, no phone overflow and no warning/error logs. The local fixture draws the compiled authoritative parts with diagnostic colours and story guide lines; it is not finished facade artwork.
- Four rebuilds retain stable GPU geometry counts. Full geometry release returns 0 geometries / 0 textures before rebuilding. Open five-wall study: 19 geometries; closed: 24; individual five-story closed sample: 5. No textures are needed for this diagnostic.

Local visual evidence (outside the public package):

- Desktop: `C:/Users/baals/.codex/visualizations/2026/10/27/01a17ea3-b99b-74d2-8a74-56d2556a19cb/wall-stories-desktop.png`.
- Phone: `C:/Users/baals/.codex/visualizations/2026/10/27/01a17ea3-b99b-74d2-8a74-56d2556a19cb/wall-stories-phone.png`.
- Review source/restart inputs: `artifacts/helpers/wall-stories-01/{qa.html,qa.js,registration.json}`. Reuse requires a deliberate fresh process lifetime and registration; the prior STOP marker must not be reused.
- Preview registration `25e4e7da3dd24ed1bd3a4a19cb96b0ef` preserved its complete source closure before retirement. Exact process PID 38268 / creation FILETIME 134376196914923446 exited via its private stop file; port 4550 was released at 2026-10-28T00:10:27Z. Receipt: `artifacts/helpers/wall-stories-01/cleanup-receipt.json`. Temporary browser tab closed and viewport override reset. No helpers retained.

## Changed paths

`src/content/exterior-kit.js`, `tests/content/exterior.test.js`, `docs/engineering/exposition/contract.md`, and this handoff. Existing donor geometry, art-owned code, production default scenario and physics remain unchanged.
