# TB-007: opening mechanics test review

Decision: **approved for promotion as the opening mechanics test**. All required corrections and combined checks pass. Pages publication remains subject to the user's repository visibility choice below. This approval does not establish the final art/interface direction.

## Reviewed candidates and corrections

- Coder initial delivery: `8af72ff1b644df31c2f899bb765d8e4e6a99460a`; returned for body/collision agreement and authoritative long-discharge presentation. Correction: `11b8cd05c0ca885f277d048c1825d0e52c0a367c`.
- Artist initial delivery: `b3c7c009706dc48a10cd97951df36f79a4d5fb21`; returned for full flame reach, authoritative clipping and footprint display. Correction `86f281e4f63825ed9c721e790f5cb00fac13de85`, followed by final shader fix `3ac7032be1698405ac717d6f9bbb460076ffabaa`.
- UI delivery: `2b33b528de724adec3ddf3b7227dfed0ec2210d5`; functional checks pass.

The architect assembled the exact candidates on `codex/review-burning-trail`, leaving `master` unchanged until acceptance. Root integration adds the playable entry, shared factories, responsive scene framing, a production-only static package, provenance reconciliation and a Pages workflow. Runtime URLs are local and resolve below `/tinderbox/`; the donor checkout is not needed to run or build the result.

The collision correction replaces the 0.23 m disc with a 0.56 m disc appropriate to the provisional 1.06 m body width. Accepted segments use swept clearance, including corners and slide paths. Held equipment remains cosmetic. The model supplies bounded, wall-clipped discharge geometry; art consumes that shape and cannot choose gameplay range, ignition or obstruction.

## Acceptance evidence

The final combined candidate passes **43 Node tests**, 50 script syntax checks (including the final hosted-package checker), 46 static module/dependency checks, all four provenance inventories, the artist's 14 syntax/dependency checks, the production build and packaged-file validation. Import inventories preserve pinned source bytes; every production module uses the same Three r180 pair.

Architect-held-out tests exercise an offset L-shaped wall with powder, inversion and pouring at 30/60/120 Hz plus 0.2 s hitches. Accepted body clearance, identical final state and fuel accounting hold across schedules. A separate burning-pool fixture confirms that an unfuelled paving gap prevents spread, while deposited/remaining/burned fuel stays conserved. The measured axis/diagonal and 0.5/0.25 m grid-front arrivals differ by about 3.08% in the supplied sensitivity cases; this does not establish general grid independence.

The final live combined browser acceptance page passes **9/9 at both 1280 x 800 and 390 x 844**: real UI commands reach the model, powder pouring preserves the continuous path, inversion reverses movement without changing aim, pause freezes clocks and clears input, healing agrees with HP/stock, held flame consumes fuel and releases, a near wall clips before the protruding cosmetic nozzle, the bear escapes a finite chasing front, and four complete runtime rebuilds preserve stable resource counts. The UI browser suite passed 18/18 at each viewport.

The final browser review caught an ANGLE shader warning in the ray-table search. The artist replaced implicit-derivative texture sampling with an exact `texelFetch` at LOD 0. A fresh combined browser run at both sizes reports no warnings/errors. The complete 4.5 m discharge remains within the model-supplied mask. The handheld lance/torch hides conservatively when the cosmetic nozzle is outside that mask; per-part clipping is not claimed.

A final 260-frame real-animation sample, with the full flame scene and a warm final 240-frame window, ran at **60.0 Hz**, with simulation CPU p95 **1.30 ms** and view/render submission p95 **2.30 ms**, 136 draws, 19 geometries and 22 textures. Host: Windows, Ryzen 7 5800X, 63.9 GiB RAM, RTX 3080, Chromium 155 / ANGLE D3D11. CPU/RAM were independently read from the host and GPU/browser reported by the renderer. This is desktop CPU/submission evidence, not GPU elapsed time or physical-phone performance. Manual stepping cadence is not reported as real FPS.

The last smoke served only `dist/`, at the nested `/tinderbox/` path. `tools/check-site.mjs` verified 46 hosted files against the reviewed hashes, correct module MIME types and absence of the QA workbench. Native held-key movement, toggled pouring and taking powder while pouring work in that packaged scene; the HUD reports stock/effect changes and the trail is visible. Both packaged layouts were inspected without the source root or donor as a fallback. The package has 48 inventoried files, about 11.9 MB, plus its generated manifest.

Ignored local evidence: `artifacts/qa/final-{desktop,phone}-acceptance.json`, `final-desktop-performance.json`, `final-{desktop,phone}.jpg`, and `packaged-{game,phone}.jpg`. The committed integration workbench and CLI checks reproduce the review. No screenshots or helper metadata are shipped in the public package.

## Product scope and limits

The user accepts this as an opening mechanics test and specifically objects to insufficient direct Farmyard Commando asset/interface reuse. Acceptance of this milestone does not approve the final bear, buildings, control-deck layout or overall visual direction. The next visual pass must use the existing game assets and interface directly; copying a visual style or a few atlases does not satisfy that direction.

The fire model is a flat, coarse gameplay grid with finite fuel and local timed propagation, not a thermodynamic solver. Narrow geometry/material boundaries and conservative discharge corners have documented approximation limits. Fresh-player comprehension testing, physical touch/controller devices and lower-end GPU testing remain unperformed. No interiors, campaign, persistence or expanded enemy system is part of this milestone.

## Publication and helper lifecycle

GitHub rejected Pages creation with HTTP 422: the current account plan does not support Pages for this private repository. The user has been asked whether to make `Syntaxswine/tinderbox` public; no visibility change is inferred from silence. CI can still validate and package the approved code. Its deployment job runs only when Pages is configured and repository variable `PAGES_ENABLED` is `true`. A prepared workflow is not evidence of a live deployment. The architect's final delivery reports the pushed commit and actual CI outcome.

All disposable review helpers are stopped. Source preview registration `10e7a168ff12490f971817513dcedf4d` (PID 58156) stopped after an 87-file current source/restart snapshot and output preservation. Packaged preview registration `fde4028212cd41d3b68b4a28d70a1514` (PID 70268, actual 15-minute expiry) stopped after its 51 served source/dependency files and launch/retirement records were preserved. Exact process identities were revalidated before private stop-file signaling; both exits and port release were confirmed. Ports 4550–4553 were all free at final cleanup. Workers report clean checkouts and stopped helpers; owned browser tabs are closed and viewport overrides reset. Helper restart records contain no publishing command; every helper restart is deliberate.
