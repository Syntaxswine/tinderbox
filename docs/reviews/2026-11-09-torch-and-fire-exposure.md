# Torchlight and fire exposure review

Approved for Pages. The architect took the heat candidate `91a9ad19ef8ae4575c3f2b9e8d68b95cee1729d3` from published `801807b2e71638101861c875c2d23c9ad73ad17b` and applied artist candidate `c7dea89d1927dabc4ed4c126ef190f8be622b355` as `0a91dc970f761d1946fffe25eccf102f8162e180`. The [thermal handoff](../engineering/fire-exposure.md) and [artist handoff](../art/carried-torch-light/README.md) record the changed paths and tuning. The architect matched the artist source and seven image digests and verified the published assets, vendor files and wind bake.

The new heat rules separate output, fuel duration, cooling and the receiver's ignition threshold. In a fixed-step control, the old build ignited the same Ashland siding in about 1.77 world seconds from either grass or gas. The architect reran that geometry with a single burning ground cell in the corrected build. Heat is dimensionless.

| Source beside the Ashland wall | Burn | Peak at the receiver | Outcome |
| --- | ---: | ---: | --- |
| Grass | 3.200 s | 0.103 / 1.00 | Cooled |
| Short gas | 1.067 s | 0.676 / 1.00 | Cooled |
| Longer gas | 9.600 s | 1.011 / 1.00 | Caught after 1.567 s |
| Longer gas behind a masonry screen | 9.600 s | 0 / 1.00 | Stayed cold |

The architect also opened the packaged calm-air game through its normal menu. One match lit a short pour on the paving beside the Ashland wall. The ground burned out and the siding stayed cold. After a reset, a longer pour along the same wall carried fire from the paving into the siding. The coder's separate timed browser replays record the source duration and the receiver's heat at the same cell. The wind and calm scenarios, directional tools, timber collapse and fuel clocks passed the integration checks.

At the normal night zoom, the same unlit and lit camera showed the torch illuminate the nearby paving and facing wall while the ground plan reported zero burning cells. Sampled display luma rose from 66.93 to 115.39 on the paving and 39.61 to 47.45 on the siding. The distant cottage sample stayed at 48.49. The pool followed the player across the paving and disappeared on holstering. The torch uses one broad light with a 3.8 m cutoff and one 256 × 256 shadow view. Near a solid surface, the light sits on the holder's side of the contact.

`node tools/check.mjs` passed all 204 tests and the source and art checks. The build and release checks verified 3,474 files and 163,813,937 bytes under the project URL. The manifest SHA-256 was `5021d21da1e8f3fbc790ffda52dedfa6a070d9bedb686d46eed7c1ef6aaacf9a`. The architect's captures and test receipts are local under `artifacts/qa/torch-exposure/`. The loopback preview stopped through its marker, its tab closed, and port 4555 was verified free.
