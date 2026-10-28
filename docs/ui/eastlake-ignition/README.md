# Eastlake UI with authoritative torch state

Branch: `codex/row-ignition-ui`. This correction builds on `35c9f85c0564eb301d2185f0d6b22ebcf10a9387` and restores the user's UI source from `997a12470b05c7cda1db675f667967a67ef97cbf`. The delivery message supplies the exact resulting commit. Architect review and promotion remain required.

The previous handoff screenshot showed the old industrial control deck. This candidate replaces that presentation with the preserved wooden Eastlake panels, rosettes/rules, engraved paper buttons, local period-inspired type and newspaper menu. It carries the authoritative timed-torch update into that design. The prior row-ignition images describe the earlier candidate only.

## Player controls

| Top to bottom | Left | Right |
| --- | --- | --- |
| Top | Matches / STRIKE | Oil barrel |
| Middle | Torch / LIGHT, IGNITE or SPENT | Throw lantern |
| Bottom | Flamethrower | Menu |

The central movement stick, ground plan and optional zoom controls retain the user's previous layout. The glass oil lantern has its original reservoir, chimney, brass burner and wick knob, without a carrying handle.

A tool button selects and uses its own tool through the existing ordered `select-tool` and primary press/release commands. Oil barrel toggles Pour/Stop; Flamethrower remains held. Torch sends one rising edge per press, reads `player.torch` and displays LIGHT/IGNITE/SPENT plus supplied seconds. Its burning lens comes from phase rather than a held pointer. No UI-owned clock, ignition, resource cost or world pickup rule is introduced. Missing/malformed torch state disables use with WAIT; the legacy base therefore safely waits until the coder supplies the new fields. Number-key selection remains available.

New action feedback and current seconds have scoped accessible descriptions. Initial/replayed events are ignored; reset/generation/rewind clear stale feedback. Countdowns do not rewrite the polite live status or accessible button name. The event mappings and neutral unknown-result fallbacks remain those in [the ignition handoff](../row-ignition/README.md).

There are no manual medicine/drug buttons or Q/E/R consumption shortcuts. Controls help explicitly says **“Walk over it to use it.”** Health and active effects remain snapshot-driven. Actual ground pickups, overlap detection, automatic effect application and removal still require coder/artist work; the [preserved pickup handoff](https://github.com/Syntaxswine/tinderbox/blob/997a12470b05c7cda1db675f667967a67ef97cbf/docs/ui/six-actions/pickup-handoff.md) records that boundary. An inventory increment does not simulate consumption in UI.

## Sources and boundaries

This is selective reuse of our existing UI candidate, not a merge of its older world/runtime. Restored paths are the UI's CSS/JS/map/engraving frames, `assets/art/ui/`, local font/source notices, existing map/browser checks and workbench styling. The original atlas, glass lantern and barrel PNGs are byte-identical to `997a124`; frame source is identical after LF normalization. [checks.json](checks.json) records hashes and original provenance.

The six imported Farmyard UI files and shared timber texture retain their existing source pins/bytes. Only their local UI adaptation metadata is restored. `assets/art/ui/engraved-plates.json` preserves the earlier generated plates' prompts/adaptations. No new image generation occurred. Besley and Old Standard TT retain all nine pinned font/notice/source hashes and both OFL notices; two narrow `.gitattributes` entries preserve those distributions verbatim, including their original license whitespace, across Windows checkouts. These are modern digital faces chosen for their historical idiom, as recorded in the typography manifest.

No gameplay, runtime, world art, house geometry, shared source-baseline or donor checkout changes occur. The integration review harness uses the new direct-button selectors while retaining its newer house checks. Drug effects there are explicit QA setup commands, not hidden product controls or proof of walk-over collection. The harness's selection-only rig inspection uses its diagnostic command path. A production zoom callback remains a runtime integration limitation; disconnected zoom controls stay disabled.

## Validation and evidence

- `node tools/check.mjs`: **92/92 tests**, 86 own scripts, 110 static modules; source/provenance/shared renderer/art checks pass.
- `node workbenches/ui/check-typography.mjs`: **9/9** exact font/notice/source records pass.
- Existing DOM browser suite: **38/38** at **390 × 844**, **320 × 568**, **844 × 390**, **1280 × 800**. Includes actual CPU-simulation tests for matches/lantern costs, moving Pour/Stop, legacy torch fallback, held flamer and authoritative effects.
- Native Enter on the Torch plate produces one selection and one press/release pair. The fixed example remains unlit; no optimistic lighting or timer appears.
- Build: **154 files / 49,142,369 bytes**. Release hash/local-resource check passes; nested HTTP check passes **152 hosted files**, module MIME and QA exclusion. Captured browser warnings/errors are empty.
- Whitespace, path/reference and change-boundary checks pass before commit.

JPGs: [390px phone](evidence/phone-lit-390.jpg), [320px feedback](evidence/phone-blocked-320.jpg), [390px feedback](evidence/phone-blocked-390.jpg), [landscape](evidence/landscape-lit.jpg), [desktop](evidence/desktop-lit.jpg), [newspaper menu](evidence/phone-menu.jpg), [controls help](evidence/phone-options.jpg).

These are browser renders of the existing **fixed-snapshot UI workbench**. They omit bear/civilians, houses, carried flame and the live solver. Combined WebGL gameplay/handset review, exact coder event-payload confirmation, actual timed-torch mechanics and walk-over pickups remain integration gates. No GPU recovery was attempted and no new gameplay acceptance is claimed.

The one hidden DOM preview was lifecycle-registered with an actual 30-minute deadline and private stop marker. Sources/restart instructions and final stop/port receipts are preserved under ignored `artifacts/eastlake-ignition/helper/`. The owned browser tab is closed and its viewport override reset. No helper is retained.
