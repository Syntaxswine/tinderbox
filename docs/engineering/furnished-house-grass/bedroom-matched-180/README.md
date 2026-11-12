# Bedroom diagnostic: the same lawn kept nonburning

The single authorized diagnostic completed **180 world seconds** on frozen source `9302065183fecf446f0485018cffaf72a839f0da`. The nonburning lawn reproduces the grass case's **50% and90% house-ignition times exactly**. Burning grass is therefore not required for those earlier timings in this model. This isolates a response to the added fixture; it does not identify which cold receiver/domain change produces it or validate the known ground/air-side approximation.

This appended leaf covers only the bedroom prefix through180s. The four original330s runs and their raw optional-stop receipts remain intact. No primary/control trajectory was rerun, and no physics, renderer, art, wind or material tuning was changed.

## Verified initialization

The actual worker loaded the93020651 sources, with exact Git-content checks accounting for normal Windows CRLF checkout conversion and actual execution-byte SHA-256 records. Its core execution bytes match the cached primary. Both serialized fixture-data bundles are byte-identical to the primary bundle. The only profile difference is grass ignition threshold **.85 → Number.MAX_VALUE**; all grass fuel/area, house profiles, rules, wind and commands remain identical.

- Domain:7270 ordered cells,5442 finite fuel identities,806.7328377358597 initial fuel units. Cell positions/capacity/membership, fuel geometry/inventory and prepared data compare equal. Domain digest `7a6915510434b8b9fad217460074006e06cf063b2bd39ee23cc609a238a3887e`.
- Initial radiation receivers:248 representatives,141 candidates for the ignition cell and the same24 selected target IDs. Eligibility/area/order digest `bdc7b989541236136741e2940e1cee51de253a1cc70e35a9672594d5819bf36f`.
- Measurement cohort:4529 original house fuel identities,879.0518539309301m² authored fuel-surface area, and the same **4988 original control-cell IDs in the same order**. The enlarged7270-cell lawn domain is not substituted into the house digest. Reference-key digest `f44f4b0e8496cbe27ed51ede7c6412f5b99f8e89f8a88a8eaaf906ede3ad42cd`.
- Reconstructed initial grass/matched states and both saved initial house digests all equal `a76fab4d59cb34cca88564e54bbe2838fa77f1ca31c241dc8def583fecc3c193`. All181 saved sample keys match exactly, tick0 through5400.

The [machine comparison](comparison.json) records source/data/options checks and exact digests. The [sample table](sample-comparison.csv) retains all181 paired current/ever area and state-equality observations.

## Prefix differences

Every saved house-state digest through **162s/tick4860** is identical, including every saved pre-grass sample. The first different saved state is **163s/tick4890**, following primary first grass ignition at **162.700s/tick4881**. The underlying first full-state difference can only be bounded to **(162,163]s** from these1Hz cached states; it is not an invented exact subsecond onset. At163s the current/ever house areas still match despite the state-digest difference.

For exact event comparison, only global event IDs are removed: grass's own events shift that counter. All other non-grass event fields/order are preserved. The first4970 semantic house events match. The first extra event is an in-place entry-rail-post ignition at **167.866667s/tick5036**, position `[4.41,.396190524,-2.66]`, source ending `44/prototype-entry-rail-post@8,-1,-6`. Its opposite post lights at **169.100s/tick5073**. Neither post ignites in the matched case by180s. They are the only original-house first-ignition differences through this horizon, totaling **.076450044m²**. The next matched event at167.900s is a landing, not the corresponding post ignition.

| House threshold | Cached grass | Matched nonburning | Difference |
| --- | ---: | ---: | ---: |
| 10% | 15.933333s | 15.933333s | 0 |
| 50% | 117.466667s | 117.466667s | 0 |
| 90% | 164.533333s | 164.533333s | 0 |

At180s the grass/matched house ever areas are823.2469358534892 /823.1704858094892m², and current burning areas630.9425926915661 /630.8661426475661m². Their difference equals those two small posts. Grass in the diagnostic has **zero ignition/burning/consumption**, with all199.5888 fuel units retained.

## Facades through180s

Every eligible original wall's ignition time and pose matches exactly through180s, verified by the complete ordered156-identity timeline digest, not merely aggregate counts. Coverage is **154/156 patches,67.31/68.37m²**, all in place. Two rear patches totaling1.06m² remain unignited in both cases at the cutoff. Completion after180s is not inferred from the longer primary.

| Facade | First ignition in both | Last eligible ignition through180s | Coverage in both |
| --- | ---: | ---: | ---: |
| West (-X) | 152.500s | 165.500s; complete | 40/40 |
| Rear (+Z) | 125.600s | 179.900s; incomplete | 38/40 |
| Front (-Z) | 128.200s | 159.600s; complete | 36/36 |
| East (+X) | 119.600s | 131.900s; complete | 40/40 |

## Finite process and checks

One new worker, PID20696 / creation FILETIME134389465178074482, ran November12,2026 **03:41:57.974–03:49:43.709 America/New_York (EST)**. Total lifetime **465.735s (7m45.735s)** includes preparation/finalization; the measured case cost is462.534s. It finished exit0 before its independent **03:56:57.974** cutoff, with no extension or retry. [The receipt](helper-receipt.json) verifies this process lifetime is absent; no port, server or GPU helper was created or retained.

Fuel error is5.36852e-9, heat relative error6.68925e-12, both cohort reconciliation errors0, and maximum burns per fuel/tick1. The compressed archive is closed/hashed. Snapshot SHA-256 is `671d896e1984ded06014de0629cfbe881a7735658b25533086b8c11af7286385`; event SHA-256 is `7c363173142d725ad8c1be05f169367ccdbe0aed035795ec0e57e4f1d73905f9`. [Checks](checks.json) record the finite runner and zero-step comparison validations. This evidence/tooling leaf adds no runtime change requiring a repeated long burn or broader application sweep.

Raw launch/owner/inputs, frozen execution files, result, snapshot, complete events, replay and sparse authoritative full-checkpoint archive remain at `artifacts/qa/furnished-house-grass-bedroom-matched-180/`. The original `artifacts/qa/furnished-house-grass/` bundle is preserved. The standalone postprocessor reads them and compiles immutable initial geometry with **zero simulation steps**:

```sh
node workbenches/furnished-house/compare-matched-prefix.mjs artifacts/qa/furnished-house-grass-bedroom-matched-180
```

The intervention isolates grass combustion within this frozen numerical model. It does **not** validate below-soil representative cells, physical return routes or real fire rates. No inference beyond180s, actual grass-art/animated WebGL/JPG acceptance or production promotion is included.
