# TB-029: joystick gesture recovery

Scoped UI candidate on `codex/joystick-input-ui`, based on published checkpoint `38f6e803bf43493fdcd641f62f8644d13b99488f`. Assignment: `docs/milestones/09-movement-and-joystick.md` at architect commit `556679297eed1112c653ee9539acb6bb8b6a19bf`, read directly from its Git object. Exact candidate SHA is supplied with the worker delivery; source hashes and evidence are in [checks.json](checks.json).

## Observed behavior

The human identified Administration Building and a mouse. A trusted native mouse hold through its actual `admin-approach-front` navigation climbed from grounds, across the twelve source treads, to `Rotunda and ground rooms` at 2.12 m. Capture and the emitted vector remained continuous. Changing location and interaction labels did not move the joystick well or cancel input. Full and approximately 35% mouse input reached the landing at both 1280×800 and 390×844. A trusted drag while on the treads also continued moving and released normally.

These observations do not establish the cause of the reported mouse-only stair failure. The exact interior stair and gesture remain unidentified. The fixture uses the published navigation/collision model with sections ready and displays the actual HUD; it has no WebGL world renderer. It does not establish streaming, complete interior routes, or combined game acceptance.

## Reproduced defects and repair

| Reproduction | Before | Result after repair |
| --- | --- | --- |
| Shift/resize the well after starting a 0.35/0.20 drag, then deliver the same client coordinates | Recomputed origin changes X to about 0.00067 | Original vector remains 0.35/0.20 until release |
| Miss the mouse-up, then receive a mouse hover with `buttons=0` | Stale pointer keeps moving and blocks keyboard ownership | Release joystick ownership; held keyboard movement can resume |
| Miss the mouse-up, then receive a fresh left press from the same mouse ID, without a hover | Fresh press is ignored; old vector remains | Fresh same-mouse press uses current geometry and its own vector |

The third reproduction was added and saved before its guard was changed. A live touch pointer, a different pointer ID, or a different pointer type cannot be stolen by this recovery path. [Initial failures](evidence/before-regressions.json), [fresh-press failure](evidence/before-fresh-press-recovery.json), and [passing checks](evidence/after-regressions-desktop.json) preserve the results.

`src/ui/index.js` stores the gesture's client-space origin and radius on pointer-down. Resize, scroll, font or other layout changes do not rebase that active gesture; release/cancel clears the anchor, and the next press samples the new rectangle. This is a deliberate frozen-origin policy. Normal stair/location label changes leave the actual hit target and origin stable, confirmed at all four tested sizes.

Mouse/pen hover without the left button releases only the movement stick. It preserves unrelated held tool input and an intentionally held keyboard vector. Normal pointer-up, pointer-cancel, capture loss, outside focus, blur, hidden document, pause and disposal retain their cancellation behavior. The shared release helper clears pointer identity/type, anchor and analog value consistently. Fresh same-mouse left presses recover missed release; touch and second-pointer ownership remain protected.

The existing 0.12 radial dead zone, analog curve, normalized maximum and screen-relative +Y-up contract are unchanged. A live pointer has movement priority; still-held keyboard keys resume on release. Cancel/pause clears keys and requires fresh input. UI adds no inversion, speed, stairs, collision or timing rule.

## Validation

- `node tools/check.mjs`: 169/169 tests; 139 own scripts; 175 static modules; shared renderer, immutable imports and provenance pass. Art checks: 5 preserved imports / 36 dependency and syntax checks.
- `node workbenches/ui/check-typography.mjs`: original font/notice/source bytes and both OFL notices pass.
- `tests/ui/index.html`: 77/77 at 1280×800, 390×844, 320×568 and 844×390. Eleven new checks cover label geometry, anchored gestures, mouse recovery, touch/pen ownership, full keyboard parity, partial analog, capture fallback, release/cancel, focus, pause/resume and disposal.
- Actual Administration approach via `mountUI` → `createExploration`: goat, horse and bear; full mouse vectors match keyboard paths; 0.35 mouse and 0.13 synthetic touch reach the same source landing. The published 3 m/s setting is retained in this UI branch.
- Native trusted mouse holds/drags: desktop and phone dimensions; full and partial input; source location changes and a separate long-label stress mode. Every saved trace ends with released input and one stable joystick rectangle throughout its held samples. Raw traces distinguish trusted native mouse events from synthetic test pointers.
- Build: 3,454 files / 163,290,368 bytes. Release hashes and relative resources pass. Nested HTTP check: 3,452 public file hashes and module MIME types pass; QA workbench absent.

One existing browser test still expected the pre-integration absence of `player.torch`. It now asserts the published authoritative unlit → lit behavior and retains the flamethrower hold/release check. Missing-torch-schema gating remains covered by the separate fixture test.

[Desktop evidence](evidence/after-administration-desktop.jpg), [phone evidence](evidence/after-administration-phone.jpg), and [wrapped-label evidence](evidence/after-phone-labels.jpg) show the diagnostic HUD and source-navigation result. They do not show a rendered world. Full recorded results, hashes and native event summaries are in [checks.json](checks.json).

## Reproduce and combine

Reuse the finite `tools/serve.mjs` preview under the project's helper policy. Open `tests/ui/index.html` for the full suite or `tests/ui/movement-review.html` for the recorder. Restart at the approach, hold or drag toward screen southwest, and inspect Pointer and movement evidence. The optional label cycle is a deliberate presentation stress fixture; ordinary mode displays actual navigation labels. The recorder expires after 30 minutes and disposes on page exit. The fixture and browser checks are excluded from the production package.

No assets or donor imports changed; existing Eastlake/Farmyard surfaces, font licenses, native characters, source pins and period menus are preserved. Speed 3 → 9 m/s and any navigation correction belong to the coder. Architect must combine exact candidates and perform actual WebGL/streaming review. This worker does not promote or deploy.

The temporary browser tab was closed and its viewport override reset. The finite preview helper is stopped after source/restart preservation; see [cleanup receipt](evidence/helper-cleanup.json). No helper is retained.
