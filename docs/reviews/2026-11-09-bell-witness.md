# Bell & Alder witness trial and Chicago patrol study

Reviewed against published `92e8ec0fe3251c63a73cf1651f1e3b2c63c5cbde` and the [assignment brief](../milestones/16-bell-witness-and-chicago-uniform.md). The witness passes as an opt-in test. The uniform is reviewed as an art study for a later intake. `master` and Pages are unchanged.

## Witness test

[Coder candidate `1ee18b571e223c5ee329842dc1babac16bc65a67`](https://github.com/Syntaxswine/tinderbox/commit/1ee18b571e223c5ee329842dc1babac16bc65a67) uses one existing goat as the clerk. The [playtest steps](https://github.com/Syntaxswine/tinderbox/blob/1ee18b571e223c5ee329842dc1babac16bc65a67/docs/engineering/bell-and-alder-witness.md) are for that candidate's `?witness=1` Catalogue Street visit. The normal visit and Ashland replay keep their own routes and state.

The clerk shows an amber question mark when it notices a new fire within 3 m of a lantern sighting made in the previous eight world seconds. The larger red exclamation mark takes precedence when the clerk sees a match or lit torch actually ignite its target. A hidden throw can produce suspicion when the fire appears. Direct attribution for throws and the flamethrower is outside this trial. Duds, an old fire spreading, expired memory and sightings after the fact do not create either reaction in the tested cases.

- The architect reran `node --test tests/integration/shop-witness.test.mjs tests/integration/bell-and-alder-runtime.test.mjs` on the exact candidate: 12 passed. The diff against the release had no `src/ui` or `index.html` changes.
- The coder passed 234 tests and verified 3,504 packaged files. The packaged 1280 × 720 WebGL route exercised the title and menu, pointer joystick, contextual door and pickup, match shortcut and reset. The architect reviewed the alarm and suspicion JPGs: both cues were distinct at default zoom. JPGs and the browser and cleanup receipts are in the coder worktree under `artifacts/qa/shop-witness/verified-1794266695539/`. The temporary browser and server stopped.

## Uniform study

[Artist candidate `535150ceff835b8b64e25e10c7df568eddd92b23`](https://github.com/Syntaxswine/tinderbox/commit/535150ceff835b8b64e25e10c7df568eddd92b23) is a six-piece city patrol outfit for the pinned Farmyard goat, with no placement or gameplay changes. The [art handoff](https://github.com/Syntaxswine/tinderbox/blob/535150ceff835b8b64e25e10c7df568eddd92b23/docs/art/chicago-1893-beat-uniform/README.md) records the fit, pin, file hashes, source notes and four JPGs. Near-date city photos and period descriptions guide the appearance; exact 1893 issue details remain unverified.

The artist passed 228 tests and verified 3,503 packaged files. All 32 sampled native idle and walking poses stayed within the existing clearance. The architect reviewed the revised close front and stride views and the default night street view with the carried lantern. The uniform reads beside civilian clothes, and the coat, badge and helmet are unobstructed in the close views. The art capture helper and tab were closed and the loopback port was released.
