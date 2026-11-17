# New York front camera, input and reachable tool contacts

This source correction follows the blocked first review in
[phone-review-v1.md](phone-review-v1.md). The original `2b350309` build remains a
diagnostic package; no corrected build/browser has been launched. The architect
authorized a bounded New York map-adapter orientation correction and ordinary
route/contact checks before renewing that visual review.

## One map configuration

New York declares one frozen visit input configuration:
`{cameraRelative:true,cameraX:10,cameraY:-12}`. The runtime resolves it with the
same validated configuration function used by simulation, then supplies that
resolved configuration to the gameplay core and camera. Partial explicit overrides
retain other map defaults. Default Catalogue remains `(10,12)`; speed, native
bodies, clocks, tools/ranges and original source geometry/materials are unchanged.

The prior camera sat across the building from the south/front approach. A normal
844 × 390 source-camera ray therefore selected distant tower geometry. The corrected
actual camera sees the original front pane. These controls use real orthographic
projection, source picking and map input transforms with no WebGL renderer or
thermal activation. They also check input/world round trips and unchanged 9 m/s.

[The finite 100-point study](camera-contact-v1.json) preserves actual source
occlusion: from supported jamb stance `[55.25,2.12,25.25]`, projecting the earlier
`[54.8,3.02,26]` point selects the nearer
`carrier/main/0/entry/jamb--1`. Thirty-four sampled coating projections select
the original coated source, but none lies within match reach from this stance.
This is a sampled local statement, not proof that the entire coating is globally
unreachable. No coating, source or geometry was moved to make a test succeed.

## Exact endpoint correction

The native crossing API normally excludes segment endpoints. A reproduced
negative control on `2b350309` showed that an exact source-picker pane endpoint
returned `heated`, although a ray extending beyond the same pane returned
`no-fuel`. The endpoint's inert receiver had been lost and cell heat reached
co-located timber. The existing glass test failed on the new exact-endpoint
assertion before correction, then passed with the adjacent real timber endpoint
positive retained.

Only shared source-map tool-contact traces now opt into the existing
`includeEndpoints:true` API, retaining the start/self-hit filter. Camera selection,
visibility/radiation defaults, native epsilon, clipper, profiles and tool reach
remain unchanged. This preserves the actual receiver selected by the pointer;
it does not widen a ray or extend a match.

## Normal-command CPU route and honest preview plan

[The complete finite route receipt](normal-contact-route-v5.json) records source
and producer hashes, actual native goat movement from spawn, front stair ascent,
door open, interior entry, return and close, then supported landing movement and
ordinary tool events. No pawn placement, direct heat command or positive fire
state is used. This is CPU evidence, not a browser/phone pass.

The original column base blocks a direct sideways path from `[56,2.12,24.8]`.
The route goes forward of that row through `z=24.5` on the existing front landing.
The original projecting window sill then stops a `.5 m` native body near
`z=25.085`. Its pane cannot be reached by a `.85 m` match from there. The corrected
preview uses the existing torch's `1.1 m` reach and a real visible timber jamb for
the match:

| Contact | Real stance `[x,height,z]` | Actual selected point `[x,height,z]` | Ordinary result |
| --- | --- | --- | --- |
| `main/0/lower-3/glass` | `[50.5,2.12,25.05]` | `[50.5166666671,3.0433333339,25.9799999995]` | Torch first lights; second press returns `no-fuel`, event 38 / tick 260, zero heated cells and input heat |
| `main/0/entry/jamb--1` | `[55.25,2.12,25.25]` | `[54.9999999553,3.2999999374,25.7600000536]` | Match returns `heated`, event 40 / tick 332, one cell `110,3,51`, heat input 1.05 |

All IDs above are qualified once with `new-york::carrier/`. The pane distance is
`0.9301493304252206 m`, within torch reach. The jamb distance is
`0.5679789406912994 m`, within match reach. The jamb's actual native contact is
`/part/6562/face/0@110,3,51`; the heated cell contains that actual source.
The receipt also retains other finite fuel sources sharing the native cell.
Immediate timber ignition is not promised by a valid heating event.

Earlier local probes remain in ignored artifacts: v1 rejected an omitted false
falling field before movement, v2 found the column obstruction, v3 found the
projecting sill, and v4 established the corrected torch/jamb route before the v5
source-hash receipt. Their failures were not fixed by changing body, range or art.

The updated single-session harness reads the same map input configuration,
follows this original landing route, performs the two ordinary torch presses and
one match, and checks actual carrier IDs (including native facet suffixes), event
IDs/points and unchanged ranges. It captures interior and exterior tool-contact
JPGs. After the match, it makes one ordinary held-flamethrower attempt at that same
target for at most two wall seconds, ending early if burning increases; existing
stock/clocks remain authoritative and a heating-only result is recorded honestly.
No positive state or ignition threshold is forced. It requires explicit accepted runtime
SHA and a renewed renderer authority, reuses the corrected early helper recording,
and retains the fixed three-minute lifetime/first-failure stop. Corrected source
checks precede any new build or browser grant.

The coherent successor source gate passes **592/592 tests**, 393 own-script syntax
checks, 410 static modules and shared-Three/source provenance; the art checker
passes 59 syntax/dependency checks. The separate preserved-native wrapper again
passes **15 physical assertions, 60 routes and 819 registrations**, retaining
the historical controls and receipts. The [check record](camera-source-checks.json)
keeps the exact finite commands and remaining visual gate. No additional build or
browser was launched while making these corrections, and all CPU fixtures and
tool-owned command lifetimes ended.
