# Catalogue Street fire and storefront review

The runtime candidate is `970548d1eaa6d0ba9f4aaa2f3e8d10874d75e12b` from published `a39c3a438ccf99ab565dda293dbb61220673084c`. It updates the simulation and the existing painted fire layer. No source pins, imported art or controls change. The added integration cases exercise the collapse, live NPC ignition, and heat transfer. The thrown-lantern assertion now distinguishes blast-started siding fire from a direct lantern impact.

## Storefront crash

After structural burnout removed earlier collision entries, Bell & Alder still used the original numeric slots for its two door leaves. The rendered leaves could disappear before the next door command, and an Open command could leave a gap that made `freePoint` throw when reading `destroyed`. The coder reproduced this with Hopkins 15. The architect reproduced it independently by lighting the middle Monroe unit and reaching the storefront at X 40, Z 18.35 before it burned down at world 20.8 s. The exact sequence before the original report is unknown.

The door now locates each current leaf by its identity in the shared collision list. Each pose change still replaces the affected collider objects so a lantern trajectory can be invalidated. After a real Monroe burnout, both regular and witness-mode simulations verified matching visual and physical leaves, opening, safe blocked closing in the threshold, closing after stepping clear, and reset.

## Fire behavior

- The facing flamethrower can ignite an exposed live NPC on bare paving. The actor carries the existing painted flame cards and takes damage for up to four world seconds after the last hit. The architect checked ongoing damage after release, defensive snapshot copies, pause and reset, plus no ignition behind the player or behind masonry.
- The existing east drum heated the exposed lower siding of Hopkins 15 on the detonation tick at world 0.133 s in a no-grass control. The first roof ignition followed at 3.30 s and the last section cleared at 20.18 s through normal structural progression. The same barrel still detonated with a masonry screen in place, while the siding stayed cold. The Ashland replay retains its own 30-second burn interval.
- The existing material heat and cooling rules govern grass next to siding. At X 24.85, Z 8.5, a match on the usual grass caught the adjacent Hopkins 15 siding after two world seconds. An isolated half-metre by one-metre patch at the same edge peaked below 57% of ignition and cooled back to zero. That difference comes from the amount of burning grass in contact range.

## Acceptance evidence

The coder and architect each passed all 248 tests with `node tools/check.mjs`. The 3,507-file WebGL package has manifest SHA-256 `b2964a3a0fe11309345fdf5004139a128e0f12ffe018c9480b3a0493a265ba87`. The browser ran at 1280 × 720 and recorded zero console, page or request errors across the witness storefront after a collapse, a moving goat burning with no ground fire, regular Catalogue Street, the cottage visit, and Administration's front door. The staged browser tree differs from the final coder commit only in a test outside the package. The architect reviewed the captures and independently checked the simulated door, actor, blast and grass outcomes against that package.

The architect's `node tools/build.mjs` and `node tools/check-release.mjs` verified all 3,507 file hashes and the nested project URL. The rebuilt manifest matches the WebGL package. The browser receipt and JPGs are in ignored `artifacts/qa/cottage-fire-interactions/combined/`. The isolated browser and its preview server exited and released both ports.
