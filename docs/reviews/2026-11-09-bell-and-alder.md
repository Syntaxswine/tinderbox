# Bell & Alder release review

Approved for Pages from the [shop brief](../milestones/14-bell-and-alder.md). The tested composition is `33355076466996ca2d6224df69357b0ef3107874`, based on the published `e2dd5ffb750d8a40ce9d4dd3c72ba30001841cd2`.

The [artist delivery](../art/bell-and-alder/README.md) is `119500d70cb72b68d1efddeca1de8c241cbe60db`, applied as `ae38e49d7a475ab1a0d1a6be89578567c16b7204`. Runtime `2631b98a551c40acf85671841ecf0dde452a9a1e` is applied as `33355076466996ca2d6224df69357b0ef3107874`. The combined production paths and tests match the coder's tested tree.

Bell & Alder is a fictional shop east of Ashland Cottage on standard Catalogue Street. Its two-metre opening faces the road at X 40, Z 17. Twenty-one native wall modules and nine storefront bays frame the timber floor. The counter, scale, glazed case, shelves and rack sit across the aisle from the Eastlake settee, pedestal table and side chair. Two kerosene fixtures illuminate the displays. The Ashland replay uses the base street data for its own map.

The 14 preserved files match the original Nautilus Git objects at `2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74` in Git and in the package. The [intake ledger](../../vendor/nautilus-engine/2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74/provenance.json) records 2,807,915 bytes, source notices and SHA-256 values. The host Three namespace produces native map-density models. The focused art check matches all 19 solid boxes to the rotated mesh bounds. In the artist's matched night captures, the lamps raised the sampled floor luma from 42.26 to 65.85 and the Eastlake area from 42.40 to 74.71. The road sample stayed at 46.46.

The architect walked the native bear in and out through the normal menu and joystick in WebGL at the 1280 × 720 default viewport. A match lit one timber floor tile and the fire spread. After a scene reset, the bear exited from Z 16.2 to Z 18.8 at X 40. The browser reported no errors. An independent package replay also walked from spawn across the doorway and back at the 0.56 m radius. It verified that the cottage scenario has no shop fixtures. Local JPGs and the browser receipt are under `artifacts/qa/bell-and-alder/combined/`.

The runtime replay burned out the parlor lamp stand after 10.52 world seconds and verified that the model, light and collision cleared together. That replay disabled player damage so it could observe the full burnout. The fixed timber footprint cache produced identical simulation snapshots through burnout. In the coder's local timing sample, the median cold 15-tick update fell from 46.48 ms to 21.86 ms.

`node tools/check.mjs` passed 224 tests, 185 script syntax checks, 230 static module checks and art verification. The build and release checks verified 3,501 files and 166,696,725 bytes. Manifest SHA-256 `e735c979cde9ba28ddfe73fd8f8967dc7e91c10dfc270e8585d3689e2be8efc3`. The preview tab closed, and the loopback helper expired and released port 4555.
