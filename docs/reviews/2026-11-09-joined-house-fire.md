# Joined Monroe roof fire review

Runtime candidate `790a3f52d896ce1b059080c2970922d9a9d44fdf` starts from published `5c1963ef0ad4ae6005034eb38b48aa0650a00c20`. The previous simulation compiled both real Monroe joins but kept the structural heat graphs separate. In the paving-only control the middle roof lit at 3.63 world seconds and the middle house cleared at 20.63. Both attached neighbors stayed cold for the full replay. The live cottage ground can also carry fire indirectly through grass.

The candidate links reciprocal authored neighbors with overlapping exposed segments of their clipped main roofs. The existing structural output, ignition threshold and cooling apply across each seam. The transfer uses world time, a half-second warmup in addition to travel, and a heat rate scaled by the actual overlap length. Exchange runs before individual house ignition resolution, giving each recipient its own time to heat up. `joined-roof` events record the donor roof site. The geometry comes from the reviewed catalogue panels and compiled party-wall placements. The masonry still blocks ground-level heat.

## Independent replay

- On the unchanged Monroe placements with paving, a middle-unit match lit the east roof at 8.95 s and the west roof at 9.48 s. Both showed preheat before ignition. The middle unit cleared at 20.63 s, the east at 31.20 s and the west at 31.70 s.
- With the pinned Nautilus wind from the cottage route and the same paving control, both neighbors caught through the roof seam at 8.73 and 9.85 s. The receiver section and clearance times remained separate.
- Lighting the end of a rotated row produced two successive roof transfers with the correct donor at each link. The coder also checked all four turns, reversed lot order, and irregular frame partitions. Separated roofs stayed cold. With shorter-lived donor fuel, both attached roofs warmed below threshold and cooled fully.

## Package and visual evidence

The coder and architect each passed all 251 tests with `node tools/check.mjs`. The architect rebuilt the 3,508-file package and verified its hashes and nested project URL with `node tools/build.mjs` and `node tools/check-release.mjs`. The manifest SHA-256 is `982e1ad948c0eac4a021f1650c33b3f391a0bd0dd5defac3ec327bfd8cd5c654`, matching the exact WebGL-reviewed tree.

The packaged browser replay took the bear through the normal `?cottages=1` menu, used the joystick and a match, and recorded east-roof ignition 8.72 world seconds after the strike from the middle unit's roof. Zoom stayed at its default in the 1280 × 720 view, with some rear roof edges clipped. The browser recorded zero errors, and reset restored the cold row. The architect inspected the before and after captures. JPGs and browser and cleanup receipts are in ignored `artifacts/qa/joined-house-fire/combined/`. The isolated browser and server exited and both ports were released.
