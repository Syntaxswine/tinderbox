# Short-landscape gameplay layout correction

Base: `c202d3fc87d53bfd978b1857723fb1eeb4f7f126`; existing UI branch/worktree, preserving `4498db77` and the separate train branch.

The saved New York phone review at 844 × 390 showed an 844 × 114 canvas. The existing short-landscape app rule reserved 70 px above and 206 px below the scene. The wide wooden control card occupied the lower screen. This is a layout correction; movement/tools were not exercised before that review stopped.

## Minimal CSS change

At width ≥651 px and height ≤600 px, gameplay visits now use `#viewport { inset:0 }` beneath the existing HUD. The static keyboard-help banner is hidden at this breakpoint; Controls & options and keyboard bindings remain available.

The same gameplay control card becomes 320 px wide, with 6 px vertical / 8 px horizontal padding and its existing safe-area width limit. Its wood, etchings, typography, button banks, joystick, status and menus remain the existing presentation. No button/joystick hit sizes, markup, commands, pointer-event or touch-action rules changed. At 844 × 390 the existing tool buttons remain 48 px and the joystick 96 px. At the taller end of this breakpoint, the unchanged 58 px columns and 155 px well still fit the card's 158 px centre column.

Both overrides require gameplay mode. The old exploration viewport/card, title/menu, portrait and tall-screen rules are unchanged. The viewport and canvas retain their existing percentage sizing; the runtime's resize/projection logic continues to use the actual canvas rectangle. The HUD retains its transparent pointer layer and existing interactive card/buttons.

## Source-derived expectations

These are CSS arithmetic and scope review, not new browser measurements:

| Case | Previous canvas height | Corrected target |
| --- | ---: | ---: |
| Gameplay 844 × 390 | 114 px | 390 px |
| Gameplay portrait 390 × 844 | 420 px | 420 px |
| Gameplay tall 844 × 700 | 394 px | 394 px |
| Gameplay desktop 1280 × 800 | 494 px | 494 px |
| Exploration 844 × 390 | 158 px | 158 px |
| Title/menu | Hidden visit | Hidden visit |

The goal is a full-area scene with a smaller existing HUD footprint. Actual normal-zoom readability, feedback/aim states, canvas rectangle, ground input, joystick/tool simultaneous use, contextual buttons and menu/keyboard behavior require the architect's combined phone rerun.

## Changed paths and verification

- [App viewport CSS](../../../src/app.css): two gameplay-only overrides inside the existing short-landscape query.
- [UI CSS](../../../src/ui/styles.css): existing gameplay card width/padding only.
- This handoff.

All **46 existing Node UI checks pass**, including finite menu controls, capability/state projections, input normalization, map/preferences and unchanged UI provenance/import closure. `git diff --check` passes. No new CSS-string tests, runtime/camera rules, assets, build, browser, renderer, server or helper were introduced. All finite commands completed. This is a checked candidate for combined intake; no visual/input acceptance or publication is claimed.
