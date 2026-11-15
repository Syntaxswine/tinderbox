# Quick grass and Catalogue startup ownership

Runtime candidate: **`8895961032f791f43c6e17dbb61beef18b077689`** on `codex/grass-mobile-startup`, from the [M26 contract](../../milestones/26-fast-grass-mobile-startup.md) at `896c18b7c9436f17e01162ac601089c6df261fef`. Probe/control checkpoint: `cfb630bf8294d64b64c5b0347a6983eac09e9ea3`. Later delivery changes add evidence and test diagnostics only. Architect owns promotion and the normal-input browser gate.

Ordinary production grass now spends its finite fuel in one world second. Its energy changes from 110 to 110/3 while its duration changes from 3 s to 1 s, preserving peak heat power. The historical furnished-house grass profile stays at 3 s / 110; oil stays at 14 s and native house segment profiles stay unchanged. Authoritative ground records distinguish `grassSpent` and `flameFuel` so exhausted grass stays scorched while independently burning oil retains its own fire. Smoke can cool separately. World/powder/catch-up clocks are unchanged.

Startup eliminates the redundant full `structuredClone` before the already-owned recursive placement walk. Frozen-source and independent-placement controls cover geometry, UV data and nested bounds metadata. Cancelled factories settle before another visit starts; partial and late image loads retire, including civilian kit loads. Runtime construction failures and disposal release simulation/art references, and civilians use the existing native paint ownership wrapper. Each private full-resolution character paint projection remains intact.

Canonical static appearance URLs now share one immutable image Source per visit. Every building retains its own Texture transforms/samplers and materials; identical deterministic city trim pixels also share one Source. Last-borrower, failed-load, abort and retry controls verify lifetime and isolation. No texture is resized, no physical source or support is removed, and no thermal calculation is culled off camera.

## Measured result and limits

The compact [measurements](measurements.json) preserve the exact counts, clocks, checks, ownership receipts and raw local evidence references. One physical cold-load ran before each browser load; no competing worker build/capture ran in those windows. Phase-sampled Node memory and logical GL payload are separate observations.

| Observation, bytes | Baseline | Candidate |
| --- | ---: | ---: |
| Node peak sampled JS heap | 1,216,548,384 | 801,705,576 |
| Node peak sampled RSS | 1,411,821,568 | 1,016,016,896 |
| Browser first-render JS heap | 1,111,522,043 | 1,105,890,040 |
| Logical GL allocation payload | 484,208,524 | 299,758,852 |
| GL texture handles | 82 | 60 |

The ordered placed-source digest is identical: `4ae3e6366d6389907f5a6ea13336c751e847d68fd313ea04c5b6e0c5dca4a4fc`. Both scenes publish 53,140 cells, 66,108 boundaries, 16,770 supports, 40 items and 159 parts. Grid pitch, total capacity, 262 structure meshes, 147 materials, 475,868 source triangles and 236 first-frame draw calls match. Donor bytes, licences and pins in [source-baseline](../../source-baseline.json) remain unchanged. The adapted Catalogue renderer retains its recorded original closing-renderer source `a0eef339988c24ef5a688396f552b8661764f472`; M26 changes only image ownership/source reuse there, with no new donor import.

Browser JS heap remains large. Twelve quiet driver-stepped frames show no general CPU improvement; they are not FPS. These are desktop observations, not iPhone measurements, and they do not identify the reported Safari crash's cause or establish a fix on that device. The actual phone retry follows architect deployment.

## Visual comparison

[Baseline opening JPG](baseline-cold-start.jpg) · [Candidate opening JPG](candidate-cold-start.jpg)

Every visible 3D world pixel matches in the saved opening frames. The strict whole-screen assertion **failed**: browser-decoded JPEGs differ in 73,664 pixels, max channel difference 15 / RMS 0.4767. Independent offline Windows decoding locates all its 70,502 differences inside the bottom HUD console, inclusive x 367–912 / y 543–784; every pixel outside that rectangle matches. UI source bytes are unchanged. No cause is claimed for the console difference. Architect accepts this bounded affected-art appearance control and retains normal UI/joystick review separately; this is not a whole-frame pass. The original probe exit 1 / failure record remains preserved.

## Verification and cleanup

- Core focused checks: 62/62 pass. Local full check: 418/418 passes including provenance/art; the later bounded grass control passes 4/4. Architect independently reports 419/419, build and nested release pass on the combined package. Package: 3,546 files / 183,181,632 bytes, manifest `d24d81cbd083b1cb89a4f644fc7881edfc323f74629a05ae52c305046aad76e2`.
- Isolated grass: first flame at 0.066667, last positive flame at 1.033333, spent at 1.066667 world seconds; exactly one world second from ignition to spent. Reheat cannot restore fuel or flame. A mixed oil control keeps `grassSpent=true`, `flameFuel=oil`, positive oil and no grass flame, then finishes at the unchanged oil lifetime. Kernel trace is not a measured wall-clock trace; architect's normal-input gate records world/wall/dropped time and a short normal-zoom replay/JPG.
- A 20 world second weak/sustained grass-to-timber control across 0.25 m of air preserves the timber dose: weak maximum exposure 0.0221, oil-fed 1.2047, neither sufficient for ignition. A finite 6 s local-flame positive control crosses the unchanged dose at 1.333333 s with 19.05 external heat input. It is explicit local heat, not forced grass spread. Fuel/heat ledgers close within 1.2e-11.
- Interrupted real image load returns to menu, settles the cancelled factory, then starts one successful retry. The held late texture retires once; one canvas/context remains during play. Final disposal leaves all three observed contexts lost with zero tracked GL resources. Failed native civilian projection cleanup restores the renderer; full 2048 × 1024 retry and idempotent disposal pass.
- The physical workers exited 0. Both browser helpers exited and released their recorded ports. No coder helper or preview is retained. Exact identities, finite 5 minute deadlines, saved sources/restart records and cleanup receipts are under `artifacts/qa/grass-mobile-startup/{baseline,candidate}/`. No automatic replay or publishing step is installed.

Changed runtime ownership: `src/{art,reuse,runtime,simulation}`, optional scalar phase hooks in content/main and furnished-house compilation, the placement adapter, and the adapted Catalogue art entry/renderer. Tests cover those boundaries. `tools/review/startup-{probe,node-worker,gpu-ledger}.mjs` preserve the bounded probe; `compare-startup-frames.ps1` performs offline JPEG analysis only. Full raw snapshots are intentionally not exported during measurements. Artist audit remains separate at `6370cdd8`; no overlapping artist checkout edits were made.
