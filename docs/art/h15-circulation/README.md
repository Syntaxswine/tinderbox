# Hopkins 15 native circulation successor

Source checkpoint **`4cecd10d09eff85543996d4362c63b2297001436`** on
`codex/h15-circulation-art`, from approved contract
`32576da673524a5bbff39ea556976ab24e0310fd`. This is an explicitly versioned
1.50 m gameplay circulation adaptation, not a claim about the historical plan.
Source controls pass; actual contextual-door and mouse/keyboard acceptance in the
destination game remains with the coder and architect.

## Geometry and compatibility

The house retains its lot, exterior envelope, roof, paint, physical texture density,
origins, 1 m grid and 2.12 m floor pitch. Main walking elevations remain 0.48 and
2.60 m. The native goat/horse radius and height are 0.50 / 1.66 m; bear 0.56 / 1.68 m.
No body scaling or runtime movement/collision change is included.

The front uses two separate native 1 × 1.65 × 0.12 m leaves, with original physical
geometry and moving parts. The doorway is 2.00 m nominal width, 1.88 m between fully
open leaf faces, and 2.00 m to the header underside. Native leaves retain their
1.65 m height. Real infill/skirting was removed and casing, header, floor notch and
low trim recomposed. Closed leaves block all intended native bodies in the focused
geometric control. The porch keeps its original 1.87 m beam clearance above its
walking surface; this differs from the taller portal measurement.

The approach composes two columns of native stone blocks, 2.32 m wide, retaining
0.16 m rises and 0.44 m goings. Shifted posts provide 2.125 m clear space, with a
2.00 m railing mouth. Added stone stays inert. Kitchen-return and hall partitions
are recomposed; the complete source routes include the kitchen in both directions.

The stairs have two six-rise flights forming a quarter turn, each with actual
1.50 m tread bearing. Each original 0.25 m tread is retained; native end-cut pieces
supply another 0.125 m going and 0.25 m width on each side. Twelve rises still total
2.12 m. An intermediate landing at 1.54 m is part of the stair assembly, not a new
main floor level. Real decks, rails, posts, ledgers, bearing contacts and the upper
exit floor accompany the visible treads. The upper clear pad is X 8.3725–9.8725,
Z 3.50–5.00 at Y 2.60, in source-local metres.

A straight stair with the required landings does not fit the available depth. The
quarter turn uses the existing tall roof space. The actual export and its landmarks
are recorded in [plan.json](plan.json); the old U-shaped authoring proposal is
superseded. Furnishings retain native forms and paint; two hall consoles and the
parlor settee/rug receive rigid placement changes. The three beds remain.

## Source and exported package

The exporter consumes self-contained, immutable local controls in
`art/source/catalogue-modular/controls/h15-circulation/`:

- Live access125 house, scene and shop from
  `5deda67fbe3fe0968f90cdbc3e806e98baab0b86`.
- Original zero-margin house from
  `2db04797846c9f14e47259ae6d5282932421b4b8`.
- A preserved native egress-stock closure from
  `595ce4bd5320959a00ef119b161b2054111b2a51`, retained as evidence. The final
  quarter-turn rail cuts use the full left rail already in access125; the preserved
  right-rail stock is not used by this final export.

`reference.json` records original paths, immutable byte hashes and unchanged M27,
compiler and Bell & Alder inputs. New cuts use source triangles and interpolated
paint/UV coordinates, retain native section/density, and add explicit end caps.
Rigid transforms preserve the donor components. The change ledger in
`circulation-export-summary.json` records every retired, moved and added source,
its cut stock and measured support binding. Virtual local rail stock maps back to
its original left-rail source ID in exported mesh metadata.

Only these active data exports change:

| Export | SHA-256 of LF export |
| --- | --- |
| `house-data.json` | `c45fc8a1a2aaa1beeacfcb430d259130d34c410ad7ffa34bb5ba703223b9b77c` |
| `scene-data.json` | `c8c69e58a14231f887a0f3a2c79867469fb34e52b5980727e85f21c62f160765` |
| `shop-data.json`, unchanged control | `cd8ecffe491043546935dc162f0db88e8bd0056d1acb5fe97251db900269b2b5` |

Runtime files resolve within Tinderbox. The earlier source producer `export.mjs`
continues to describe access125; reproduce this successor with:

```powershell
node art/source/catalogue-modular/export-circulation.mjs
node art/source/catalogue-modular/check-h15-circulation.mjs
```

The canonical contextual target is
`hopkins-fifteen::opening/l0/5-0-6-0`. Its `openingIds` contain that ID and
`hopkins-fifteen::opening/l0/5-0-6-0/right`; the world action point is
`[19, 1.35, 13.15]`. The scene exports both explicit stair flights and their actual
landing IDs. Source-local route landmarks and unsupported-edge control are in
`plan.json`; conversion to world coordinates is `[24-X, Y, 13-Z]`.

Surface fuel changes from 586.8832628 to 565.9190473 (−20.9642155), following real
removed and added geometry. Counted upper-floor surface area changes from 67.0000
to 62.6397 m²; restored floor stock supplies 2.025 m² and the intermediate landing
2.7873 m². Added tread pieces supply 3.75 surface-fuel units; added stone volume is
0.4899839723 m³ with zero fuel. No material coefficient or fire algorithm changes.
These are exported surface quantities; they are not a fire-performance measurement.
Existing provenance/license records continue to apply, including their unresolved
rights status.

## Focused checks and JPG evidence

The November 16 owner review rejected the initial JPGs from `98c8ae1e`: their
preview ground was at Y=−0.125 while every real stone solid, the source/scene ground
and ground-level native feet use Y=0. The preserved rejected images and original
receipt are in [rejected-ground-datum](rejected-ground-datum/rejection.json).
[The measured correction](ground-datum-correction.json) changes only the preview
plane to Y=0; all three asset exports and the completed stair remain unchanged.
The three corrected JPGs are now in `previews` and `preview.json`. They retain the
original camera, lighting, exposure, actor poses and shadow settings. All twelve
stone render/physical minima are Y=0; measured native foot contact error is below
5e−16 m. The source asset version and all three export hashes remain unchanged.


[checks.json](checks.json) records **15 passing checks and 60 passing routes**:
three native profiles, both directions, and offsets −0.10, −0.05, 0, +0.05 and
+0.10 m, for the complete chain and kitchen return. Both frozen access125 and
successor have zero unresolved initial supports. All twelve new tread elevations
have measured 1.50 m bearing coverage. The captured 20 mm open-door skirting case
still fails on access125 and clears on the successor; closed-door rejection and
unsupported-edge rejection remain. All 819 compared mesh registrations match
physical area, with maximum relative error below 1.3e−14. Source render resources
dispose to zero. These controls explicitly pose doors and drive source navigation;
they do not establish actual held-input gameplay acceptance.

The static captures use the existing Catalogue renderer, actual exported source
and native painted bear/goat rigs at authored scale. [preview.json](preview.json)
records camera, lighting, pose, input hashes and image hashes. Character positions
and door states are explicitly posed for this source review. No simulator is run.

- [Retained exterior](previews/exterior.jpg): full house and closed paired entry.
- [Open entry](previews/entry.jpg): native leaves, porch and stone approach.
- [Full stair assembly](previews/stairs.jpg): walls, roof, other upper floors,
  upper furniture and non-circulation trim omitted for visibility. The actual upper
  exit landing remains visible; the omission is a review mask, not destruction.

Captured with Node v24.15.0 and Chrome 156.0.8078.80 on Windows, at device scale 1.
All are 1400 × 1050 JPGs. Visual review checked the retained roof/siding, leaf and
approach placement, full stair turn, guard geometry, upper landing and native scale
references. The images do not test animation, carried equipment or a horse pose.

Reproduce deliberately from this worktree, with Node ≥22 and installed Chrome:

```powershell
& ./art/source/catalogue-modular/run-circulation-preview.ps1
```

The one isolated browser session and localhost server have closed. Both task-owned
process identities, their creation times, released ports 4568/4569, removed private
profile and zero-resource disposal are recorded in
[helper-retirement.json](helper-retirement.json). The wrapper has an actual
5-minute absolute retirement deadline and registers each new process lifetime. No helper
is retained. Durable restart source remains in the repository and the ignored local
helper record identified by the receipt.

## Remaining acceptance

Coder-owned paired-action registration, real contextual Open/Close from both sides,
held mouse/keyboard movement, partial/full input, occupied threshold, all species,
wall sliding, complete ascent/descent and offset travel remain for the exact
combined candidate. Destination packaging, ordinary gameplay zoom and final browser
acceptance belong to the architect's combined gate. No source/JPG pass promotes
this branch or publishes Pages. Bell & Alder, other lots and M27 files are unchanged.
