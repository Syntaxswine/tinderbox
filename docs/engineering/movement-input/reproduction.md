# Movement/input reproduction

The reported location is the Administration Building and the input device is a mouse. The published integration base is `38f6e803bf43493fdcd641f62f8644d13b99488f`.

## Actual native navigation

Run `node tools/check-movement-input.mjs` from the coding checkout. It uses the exact published Administration navigation and collision shapes, all three native body profiles, the production simulation and public `{type:'move',x,y}` commands. It does not disable a wall, adjust a body, move a running player to another floor or modify geometry.

Each case starts a fresh isolated model at a real source support point, climbs the first flight onto its actual native landing, and walks back through the same treads. Every approach, pavilion rotation and upper spiral is included. Speeds 3 and 9 with magnitudes .13/.35/1 pass for every animal; three representative stair forms additionally pass .2/.5/.75 at 30/144 Hz and a mixed schedule containing .2-second hitches. Baseline cases use 60 Hz. The first native flight is tested, not an invented complete building itinerary.

Travel vectors at magnitude .12 or above pass through the published `pointerStick` mapping of real mouse coordinates and then through the same public simulation command. Tiny endpoint corrections use ordinary analog commands below the mouse dead zone, explicitly to finish a deterministic waypoint. This is an input/support comparison, not actual pointer capture or a browser gesture. All section readiness is true in this isolated probe; independent source-streaming tests retain readiness blocking.

The full-input comparison quantizes the local source-stair tangent to an actual WASD/arrow direction, then derives the equivalent full mouse vector. Ascent/descent bursts produce equivalent accepted subpaths and section-wait states at 30/144 Hz and hitches. Lower magnitude takes longer but does not stall in these cases. The final record contains 261 successful out-and-back cases, 54 equivalent command comparisons, zero stationary active ticks and the unchanged source navigation hash.

When a probe stalls, the tool fails with the last commands, accepted positions, support IDs, readiness and the real `probeStep` support/headroom/solid/source-triangle rejection. No such stall occurred. The evidence therefore does not justify a navigation workaround or establish the precise cause of the user's mouse report. Real capture, held gestures, layout changes and lost releases remain the UI specialist's investigation.

## Reproduced tooling overshoot

Changing only the shared speed to 9 reproduced failures in the existing route-playback tests. The old offline `walkRoute` and live workbench `createRouteDriver` independently assumed 3 m/s. For example, `walkRoute` oscillated between points near `(3.3,3)` and target `(3.25,3)` on clear ground, finally reporting a movement stall with `waiting=false` and no support/collision rejection. The visible route driver likewise exhausted its stall timer on an unobstructed fixture.

The requested movement was accepted; the controller chose an excessive magnitude because its stopping-distance divisor still used the old speed. This is a source-only QA controller fault, separate from the user's joystick report. The baseline failure is preserved in ignored `artifacts/TB-024/movement-initial-check.log`; the original defaults are also visible at the immutable published base.

Both controllers now default to `DEFAULT_CONFIG.player.speed` and `DEFAULT_CONFIG.input`, retaining explicit overrides. Their previously failing public-input stair/return and 30/60/144 Hz playback tests now pass. Runtime support/collision/step/headroom code remains byte-for-byte unchanged.
