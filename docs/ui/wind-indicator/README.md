# Wind direction indicator — UI handoff

The Catalogue Street ground plan now has a small engraved vane. The arrow points **where the air is blowing**, using the plan's axes. The ordinary street and the explicit calm Ashland route show **Calm** with no arrow. Landmark exploration has no wind reading. The six gameplay buttons and their layout are unchanged.

The windy Ashland visit reads the prevailing flow from `unobstructedInflowAt3m` in the same SHA-256-checked payload already used by the fire. The source's X and Z components `(1.429, 1.703)` map to right and down on the plan. That places the arrow approximately 50° clockwise from right. Near-wall recirculation can differ from the prevailing flow; combustion and embers still use the existing local sampler. The HUD does not predict fire spread.

The UI and styling are in `src/ui/{index.js,wind.js,styles.css}`. The presentation binding is in `src/main.js`; `src/reuse/ashland/wind.js` shares the existing loaded payload between the sampler and the vane. The existing callable loader contract is preserved. No simulation, renderer, art, wind asset or source pin changed. The [check record](checks.json) gives the exact source path, pin and hash. This candidate starts from published `e2dd5ffb750d8a40ce9d4dd3c72ba30001841cd2` on `codex/wind-indicator-ui`.

The full repository checks passed 222 tests; the build and release verifier checked all 3,485 packaged files. The browser suite passed 103 cases at each of 1280×800, 390×844, 320×568 and 844×390. Its wind case uses the real checked payload, including the distinction between the prevailing arrow and the local recirculation.

The in-app browser opened Play → Catalogue Street with the game renderer. The arrow remained downwind on desktop and after resizing to phone dimensions. Both `?cottages=calm` and the ordinary URL displayed Calm with no arrow. These are viewport checks, not a physical handset test. See the [live route record](evidence/live-views.json) and captures: [desktop wind](evidence/desktop-wind.jpg), [phone wind](evidence/phone-wind.jpg), [phone calm](evidence/phone-calm.jpg). Architect review and promotion are separate.

The finite preview was stopped after its restart record and evidence were saved. Its process exited, port 4552 was released, and the browser tab was closed.
