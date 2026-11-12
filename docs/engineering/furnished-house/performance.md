# Furnished-house cost review

**Hold production integration.** The bounded replay is valid, but full-burn visual preparation dominates CPU cost. At 120 world seconds the candidate averages 186.41 ms core CPU per presented step (206.70 ms p95): 157.93 ms presentation, 26.70 ms simulation and 1.78 ms render submission. GPU time averages 7.74 ms with 11.69 ms p95. These are measured processing costs, not an end-to-end game FPS claim.

The owner accepts this expensive prototype as the reference from which to simplify. Its high cost is useful measured starting data. Preserve the accepted fire behavior and frightening escalation while profiling and reducing repeated work; keep this original replay and its measurements intact. The production hold concerns rollout readiness and does not reject the reference or require reducing fidelity before understanding its costs. See [the clarified contract](../../milestones/18-furnished-house-replay.md#accepted-reference-and-optimization-direction).

Both runs use the NVIDIA RTX 3080 / ANGLE D3D11, Edge 157 WebGL 2, 1280 × 800 preserved antialiased framebuffer, exposure 1, no tone mapping and a 12.6 m orthographic vertical span. The camera offset is [10,14,-12] around the translated house-centre ground target. Task-owned capture workers and browser helpers were stopped first; the live machine was not reserved exclusively, so unrelated application and OS activity remain uncontrolled. There is one fresh 120-sample window per stage, not repeated-trial confidence intervals.

Every CPU/GPU cell below is **mean / p95 / worst**, milliseconds. Each window advances four world seconds in 120 fixed 1/30-second samples. Core CPU is simulation + publication/presentation + render submission; API/reporting residuals remain separately recorded in the raw JSON. GPU queries bracket only renderer.render, drain at each window and reject disjoint results. Every window returned all 120 GPU results.

## Published c855e62 one-house fixture

| World start | Burning sources (window end) | Sim CPU | Presentation CPU | Render CPU | Core CPU | GPU | Draws / lights |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 5 s | 465 | 3.64 / 6.50 / 9.60 | 2.30 / 3.60 / 5.60 | 84.76 / 96.00 / 100.10 | 90.69 / 103.10 / 106.90 | 81.23 / 93.20 / 101.36 | 3060 / 6 |
| 30 s | 0 | 2.11 / 3.10 / 3.70 | 0.81 / 1.70 / 3.90 | 79.81 / 89.20 / 105.00 | 82.72 / 92.70 / 109.10 | 76.47 / 85.57 / 101.37 | 3060 / 0 |
| 75 s | 0 | 2.29 / 3.90 / 7.20 | 0.68 / 1.20 / 1.80 | 84.52 / 92.90 / 100.50 | 87.48 / 97.00 / 104.50 | 81.37 / 89.94 / 96.89 | 3060 / 0 |
| 120 s | 0 | 2.29 / 3.60 / 6.60 | 0.72 / 1.00 / 6.40 | 83.56 / 90.50 / 97.00 | 86.57 / 93.80 / 99.90 | 80.63 / 86.96 / 95.34 | 3060 / 0 |

## Furnished-house candidate

| World start | Burning sources (window end) | Sim CPU | Presentation CPU | Render CPU | Core CPU | GPU | Draws / lights |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| 5 s | 248 | 10.20 / 18.70 / 26.90 | 13.33 / 19.70 / 48.00 | 1.27 / 1.80 / 3.50 | 24.80 / 37.10 / 58.80 | 4.14 / 7.71 / 16.00 | 74 / 6 |
| 30 s | 1584 | 24.05 / 34.10 / 37.40 | 65.11 / 77.70 / 107.60 | 1.47 / 2.00 / 2.50 | 90.63 / 110.90 / 138.00 | 6.20 / 10.13 / 78.00 | 92 / 6 |
| 75 s | 3682 | 28.07 / 33.30 / 39.00 | 155.93 / 170.90 / 190.40 | 2.09 / 2.80 / 10.50 | 186.09 / 205.40 / 221.90 | 7.78 / 12.12 / 193.32 | 118 / 6 |
| 120 s | 3896 | 26.70 / 31.60 / 34.20 | 157.93 / 177.60 / 241.60 | 1.78 / 2.50 / 2.80 | 186.41 / 206.70 / 276.70 | 7.74 / 11.69 / 12.46 | 121 / 6 |
| 170 s | 3657 | 25.38 / 32.90 / 43.40 | 153.11 / 163.80 / 224.20 | 2.11 / 3.00 / 4.10 | 180.60 / 196.80 / 257.40 | 7.68 / 12.25 / 12.99 | 160 / 6 |
| 240 s | 1123 | 7.50 / 10.00 / 13.10 | 76.43 / 85.70 / 120.60 | 1.56 / 2.20 / 2.60 | 85.50 / 95.00 / 134.10 | 6.55 / 11.57 / 97.25 | 86 / 6 |

The published fixture has 465 active structural-fire samples at the end of its first window and zero by the 30-second window. The candidate has 3,896 burning fuels at the end of the 120-second window and retains coal/rubble combustion. They share the house, camera, exposure and hardware setup but differ in fire state, physical representation and visual detail. The draw-call and GPU reductions do not prove equal-quality fire or the milestone-11 cost target. GPU outliers reach 193.32 ms in the candidate; retain the observed worst values rather than presenting only averages.

Navigation-to-ready is 3.639 s published and 2.986 s candidate. The published runtime initialization is 3.399 s. Candidate first simulation compilation is 2.528 s and reset compilation is 0.486 s; those compilation terms have a narrower scope than full browser readiness.

Raw results: [published](../../art/furnished-house/replay/published-cost.json), [candidate](../../art/furnished-house/replay/candidate-cost.json). Exact runtime/art source is the recorded f79ff28a combined tree; the later launcher edits affect cleanup only. The published run finished its numerical/render measurements and saved results, then returned exit 1 on a close-promise timeout; its original browser/driver and children were independently verified absent and both ports released. The candidate measurement command exits 0 with browser exit and both released ports verified.

## Bounded next pass before integration

- Artist: profile sample preparation, support-radius/envelope lookup, connected-surface grouping, effect updates and lighting separately; cache unchanged topology and stable-ID ownership, and move repeatable animation to bounded shader/instance parameters. These are investigation targets, not claims that any single function caused the measured cost.
- Coder: profile frame publication/dirty-state export separately from thermal stepping; preserve all fuel/heat, ownership and deterministic schedule controls.
- Architect: use the same one-house inputs and normal-zoom captures for equivalence review, then repeat this measurement. Preserve exact physical results and zero missing sources. Do not add more houses as a substitute for correcting the per-house cost.

The owner has accepted the movie's behavior and visual direction as the optimization reference. Coder and artist receive this clarification of the next-pass brief. Profiling/implementation remains a bounded separate assignment; this clarification launches no long test run or rollout. Production integration remains held and the broader AAA goal stays open.
