# Square steam-train controls

Candidate on `codex/steam-train-controls-ui`, based on published `c855e627bdee963e930644839a60c027a03935de`.

The lever and pull-chain brake occupy the joystick's existing square. The raised wooden grip is 80 px wide on the standard phone layout, twice its original 40 px width. It fits at 70 px on the narrow phone and 42 px in compact landscape. Rounded highlights, a visible lower face, a brass stem and cast shadows give it depth. The selected gear is marked on the grip. The measured phone sizes are 138 × 138 at 390 × 844, 124 × 124 at 320 × 568, and 96 × 96 at 844 × 390. The lever uses four fixed stops, F II, F I, N and R. It holds a notch until the drag crosses 62% of the distance to its neighbour. Each accepted shift produces a short locally synthesized click. Mount, snapshot refresh and boundary jitter keep the cue quiet.

The selected gear stays engaged when the finger lifts. Pulling the chain applies full brake and selects neutral. Releasing it retires the original input lease, whose Nautilus policy retains neutral/full brake. The chain takes priority over an ongoing lever drag. Pause, pointer cancellation, lost capture, blur, hidden page, context change, revoked lease and disposal also retire the original input. A fresh gear selection supplies a new lease after retirement.

Forward I and Reverse use half power and Forward II uses full power. These are UI prototype defaults chosen for this review. Neutral sends zero power with the brake released, allowing the host's normal coasting. Reverse eligibility and every movement outcome come from the supplied connector.

## Host binding

The normal HUD entry accepts the optional train binding.

```js
const ui = mountUI({
  root,
  onCommand,
  train: {
    session: host.trainConnector,
    actorId: 'player',
    muted: false
  }
});
```

The connector uses the published Nautilus v1 methods `readForActor`, `subscribe` and `dispatch`. The UI retains exact actor/train/lease identity and uses fresh expected revisions for drive requests. Driver or rider occupancy gates the ordinary movement and tool input. Confirmed return to walking restores the joystick. The host supplies boarding, world placement, simulation, motion, collision and the train connector. This delivery establishes the optional UI binding and a scripted review fixture. Playable train adoption in Tinderbox requires the architect's combined integration.

The slider supports arrows, Home for Reverse and End for Forward II. B and the focused chain's Space/Enter apply brake. The host can use `ui.trainControl.setMuted(value)` for its sound preference.

## Checks and evidence

- The initial functional review with `node tools/check.mjs` passed 294 tests, 218 script syntax checks and 263 resolved static modules. Imported-source and art checks passed.
- `node --test --test-concurrency=1 tests/ui/*.test.mjs` passed all 29 focused tests.
- The browser suite passed 117 of 117 at 390 × 844, 320 × 568, 844 × 390 and 1280 × 800. It checks the square footprint, 44 px input areas, detent hysteresis, persistent gear, independent chain pointer, refusals, original-lease cleanup and return to walking. [Results](evidence/browser-results.json)
- The trusted mouse replay at phone size selected half forward, full forward and reverse through the intermediate stops, then pulled the brake chain. The WebAudio context ran and played six clicks across those shifts, with zero active voices after the brake. Two-finger coverage uses synthetic touch events. Physical handset review remains pending. [Input record](evidence/native-input.json)
- `node tools/build.mjs` and `node tools/check-release.mjs` verified 3,519 packaged files and 166,847,051 bytes. Manifest SHA-256 is `78092c513d38fc3300e4da2c1bde18698067baad6e99614ede612e7f968f92a8`.

[Phone Forward I](evidence/phone-forward.jpg) · [Narrow phone](evidence/narrow.jpg) · [Landscape](evidence/landscape.jpg)

The exact Nautilus source references and hashes are in [the reference record](provenance.json). The wood grain and Besley/Old Standard TT typography use the existing Tinderbox/Farmyard source records and notices. The square fascia, lever, chain and sound are authored in the local UI modules.

Production paths are `src/ui/index.js` and `src/ui/train-{control.js,control-model.js,control.css,click.js}`. The review entry is `workbenches/ui/train.html`, with its workbench and scripted connector. Focused coverage is in `tests/ui/train-{checks.js,control.test.mjs}` and the existing browser-suite entry.
