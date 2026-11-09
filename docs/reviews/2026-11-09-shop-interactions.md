# Working shop door and portable light review

Approved for Pages from the [shop interaction brief](../milestones/15-shop-interactions.md). The tested combined tree is `2bf709b44e0062be2958b783c3dae315c59147bd`, based on the published `b5b8de6ffabe665b82556eeb097e1983f293ba80`.

- [Art](../art/bell-and-alder/interactions/README.md) `fe96bd9d85a347bc0aa475694f40c1a266bf647e`, applied as `58c0f2b0b6eea4dadd48d7955a030e7b11aa3e13`.
- Runtime `75bb7bf42b7f3b7f7c79d74a58b154b5cbd95eca`, applied as `b07c2d604ab9479169244c1854e0eb15aa8ff207`.
- [UI](../ui/shop-interactions/README.md) `b2e589c40e7c8527c2298f4e450f7c475a4e40bf`, applied as `2bf709b44e0062be2958b783c3dae315c59147bd`.

The release uses the existing Nautilus city props at `2fa0befbfbdc6b0e44f5a14a6f785f44e7a95d74`. The two native glazed leaves use the same poses for art, movement and throws. The original hand lantern and its single emitter move from the pedestal to the belt on pickup. The pendant lights the counter independently. The lantern stays on the character for the visit. Reset closes the leaves and replaces the lantern.

The normal desktop WebGL visit started at X 20, Z 18. The bear stopped at the closed leaves, clicked **Open shop doors**, and stood in the opening while **Close** displayed **Move clear of the door**. A native click took the lantern and returned focus to the stick. The bear carried the light out to the sidewalk, where it illuminated the pavement, and used **E** to close the doors from outside. The parlor display was darker after pickup. The HUD kept the existing six controls and throwable stock. The normal menu reset worked and the browser logged no errors. JPGs and a receipt are in local `artifacts/qa/shop-interactions/combined/`.

The packaged replay independently verified duplicate Open and Take requests, blocked closing in the threshold, exit with the carried lantern, reset, and separation from the Ashland replay. The runtime tests also verify that closed glass clips a thrown lantern, opening exposes the route, and carrying protects the light from its former pedestal's burnout. The artist's matched capture records parlor-floor luma falling from 70.32 to 45.89 and sidewalk luma rising from 93.46 to 171.38 after transfer. The counter sample stayed at 66.92.

The combined review passed 54 focused tests. The runtime candidate passed 227 tests and the UI candidate passed 225, plus 111 browser checks at each of four viewport sizes. A separate scripted phone-size WebGL fixture completed the route and reset with one startup MutationObserver error that had no source URL. The production source contains no MutationObserver usage. The architect verified the normal desktop route separately. The build and release checks verified 3,502 files and 166,709,746 bytes. The local manifest SHA-256 is `aa5fdcafbb39ba82d20f6da0b1ddff0ac474b66a5bacc7248d490713960ac1f6`. The review tab closed and the helper released port 4555.

The [architecture notes](../architecture.md#decisions-still-open) record the user's later direction for one world-sourced held object and stealth with witness memory.
