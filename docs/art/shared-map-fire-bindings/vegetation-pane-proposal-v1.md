# Vegetation and pane source proposal

Concrete source-only checkpoint for architect/coder schema review.
Authority: `02aa95bbcc2b95927837fbab05a4a6002f201ff9`.
Artist parent: `e3b301860fad13855c7d2a8926f81bb1c4aed6be`.
Original geometry context: `2b350309d9116812a1d3988af090614bdaefbc25`.
The source proposal preserves all 144 earlier proof files and 1,572 geometry
inputs. No binding, canonical stock, profile, geometry or runtime is installed.

[Authority](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/authority-02aa95bb.md),
[input/provenance pins](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/input-pins.json)
and the committed [coder draft](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/coder-bounded-source-5478eb5c.md)
separate the selected design controls from the unaccepted general schema.

[Plant ownership](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/vegetation-owners-proposal.json)
keeps exactly 98 logical owners, 208 source damage patches and 204 followers:

| Source group | Owners | Local patches | Followers | Selected authoring control |
| --- | ---: | ---: | ---: | --- |
| Trunks | 22 | 22 | 0 | Timber / existing frame profile; conservative captured reference volume / exact binary64 .12 |
| Palm/fern crowns | 10 | 120 | 0 | Existing cloth proxy; 0.30 per owner, normalized by actual one-sided frond area |
| Orange canopy and fruit | 12 | 12 | 96 | Existing cloth proxy; fruit included once in the owner's 0.30 |
| Shrub/flower clumps | 54 | 54 | 108 | Existing cloth proxy; flowers included once in the owner's 0.30 |

These are gameplay proxies, not biomass or moisture measurements. The finite
0.30 budget is recorded as its exact binary64 dyadic value. Frond shares are
exact normalized area expressions with finite enclosures; their weights sum to
one under the sole owner account. Followers add zero fuel. Neither residency
nor local activation can mint, refill or duplicate stock.

The [quantity evidence](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/plant-quantity-proofs.json)
contains 22 trunk certificates and 120 one-sided frond-area certificates using
the actual captured arrays and original affine transforms. Trunks retain their
raw seam failures and use the existing periodic-reference/error-bound method.
No physical closedness or support shortcut follows. Double-sided frond material
does not duplicate area. Existing frame/cloth profiles retain their original
threshold, delay, duration and energy; response scales remain 1/1. No wet field,
moisture solver, global override or drying claim is introduced.

[Parent evidence](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/plant-parent-evidence.json)
traces original floor/bed/trunk source geometry and exact contact/clearance
witnesses. The [remaining gates](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/dependency-exceptions.json)
include 76 unproved ground/bed attachments, 66 finer-envelope local-retirement
schema needs and the fern-2/fern-3 crown contact gaps. These are explicit limits
of the first wiring proposal, not new roots, joints or earth anchors. Plants
cannot brace the greenhouse.

The compact [glazing catalogue](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/glazing-source-catalogue.json)
preserves all 433 original glass source/range/matrix identities. Glass has zero
combustible stock with explicit physical screening and local retirement.
[Local damage recipes](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/glazing-local-damage-proposal.json)
retain 28 source mask templates and twelve disconnected authored vent-opening
memberships, each containing six original triangles. These authored openings
are proposed damage/pane groups; no historical or verified framed-pane boundary
is claimed. Continuous window/dome/gallery sheets remain identified as sheets.

The preserved calculation examined 45,970 source-local native-scale masks and
530,596 candidate glass/frame triangle pairs. Those observations are not
canonical native-cell admission or a full authoring export. The existing
.5/1.06/.5 thermal scale and 1/2.12/1 authored tile remain distinct and unchanged.
The original source frame/grid/compiler mapping still needs schema review.
Four oblique clipped Administration sheets retain an explicit front/back/edge
counterpart-frame gate; no whole-sheet first-hit fallback is authorized.

Support belongs to the original connected pane/sheet component, while masks
select local breakage. **An interior mask need not touch a frame directly.**
[Four representative paths](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/glazing-component-path-proposal.json)
connect masks without direct frame contact to fixed original frame ports inside
their same original intact source facet. Their endpoints are actual
triangle/frame intersections. These are pristine within-facet paths, not proof
of dynamic connectivity after a hole appears.

The future consumer must exclude broken/retired portions from paths, retain
original local frame-port liveness, and mark affected components unsupported
when all valid paths are lost. It must not bridge disconnected panes, make
glass a greenhouse brace, or remap to another surviving frame. An original
triangle surviving somewhere is insufficient after partial retirement.
The 15,784 masks lacking direct frame contact are not labelled unsupported.

[Eight schema gates and the interface note](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/interface-note.md)
keep normalized owner debits, nonfuel followers, triangle-portion retirement,
canonical grid admission, physical-only screens, fixed frame ports, finer
plant-envelope damage and live sheet connectivity separate from implementation.
Coder's `5478eb5c` proposal covers only a static-roof pilot.

[Checks](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/check-results.json)
pass for source quantities/conservation, archive/source integrity, the four
representative paths and twelve rejecting source/data controls. No exhaustive
live glass-path, native admission, world, runtime or renderer test is claimed.

~~~powershell
Set-Location 'C:\Users\baals\.codex\worktrees\art-assets\tinderbox'
python -B art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/review.py
~~~

The default checker refuses writes. The complete earlier calculation is preserved
in a roughly 10 MB compressed [source-evidence archive](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/calculation-archive/manifest.json)
with raw/compressed sizes and hashes. Its old direct-contact exception labels
are observations only; the compact proposal above supersedes that interpretation.
The optional full source calculator remains separate; it was not rerun to
manufacture cleaner results. No helper or service is retained.

[All changed payload paths and hashes](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/review-package.json)
accompany this source-only checkpoint. Full authoring export and runtime wiring
remain separate tasks.

## Verifier portability correction

The original c50f590c default check rejected the combined M29 compiler at
calculate.py:33 because the entire scene.js differed from the original artist
parent. The [preserved failure](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/profile-context-original-failure.json)
records the architect's intake finding and a read-only, in-memory reproduction
using the exact approved source bytes. No working scene file was swapped.

The current default verifier admits exactly three complete scene.js verification contexts
after CRLF-to-LF normalization:

| Context | Whole-source LF SHA-256 |
| --- | --- |
| e3b301860fad13855c7d2a8926f81bb1c4aed6be, original calculation | 5629ace39f09b407b6c2ef0567ea5b4cfba2e90916f4820dd65d821bf07ab859 |
| 1a88cf4748bf62c1456285ff43412c929d311199, explicitly approved combined compiler | 5f763d6e9a28174f64d908e4ffca8284beca24ecfaf8afff671870a448473f36 |
| c66e659451284309e48dc420791369dd5af37e1e, candidate verification only | 8acefb0429d03033ecb81d8fa76fc3d56d6bba3ef910dbe104aa75ed5411d21b |

[Exact context policy](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/compiler-contexts.json)
and [admission controls](../../../art/source/shared-map-fire-bindings/vegetation-pane-proposal-v1/profile-context-verification.json)
verify the complete LF bytes and each committed Git blob, plus byte-identical
frame/cloth blocks and explicit equality of all four required profile values.
Six positive LF/CRLF controls pass; three rejecting controls retain protection
against arbitrary compiler and profile changes. An unapproved full source is
rejected even if it copies the required profile blocks unchanged.

The current working context is reported in stdout, separately from the
unchanged calculation reports. All three verification contexts retain response scales
1/1. This source-check correction does not claim new compiler execution or
rebase source measurements onto the combined compiler.

The original calculate.py, all compressed/original calculation evidence, all
geometry inputs and the 34 unaffected c50f590c payload files remain unchanged.
The optional full calculator keeps its original e3b30186 source requirement;
the portable default review.py applies the separately approved compiler-context
admission. The c66e6594 source pin grants verification only; it does not accept
the runtime candidate, its receipt/catalogue guards, or the regional pilot.
No full calculation, native/world or renderer run was added.
