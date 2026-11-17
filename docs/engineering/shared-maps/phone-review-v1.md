# First bounded phone review: launch failure

Authority `a01df472` allowed one build and one existing finite browser session at
844 × 390, normal zoom, stopping at the first unexpected failure. Runtime source
remained exactly `2b350309d9116812a1d3988af090614bdaefbc25`; harness-only source
was `13c1af192a803fb813f055576e2ab9224785ae7b`.

The single build passed: 3,617 files / 264,347,370 bytes. Its manifest SHA-256 is
`b0d02460235a205a28f8bd3c043a7b3de4b6998263875db4d372247a67ab117b`.
No second build has run. Local evidence is retained under
`artifacts/qa/shared-map-runtime/phone-review-v1/`: the exact build manifest,
build receipt, plan, original `failure.json` and `cleanup-stage.json`.

The default Windows filesystem-sandbox launch failed in Edge's
`Browser.getVersion` handshake: internal server error/session closed. The launch
log records temporary-profile/site-list write errors. No page, browser context,
WebGL scene, rendered interaction or JPG was produced. This is an environment
launch failure, not a game behavior or visual pass. The run stopped immediately;
no alternate lane or retry was launched under this grant.

Playwright recorded task browser PID 39952 exiting with code 0. A subsequent
`Get-Process -Id 39952` found it absent. The existing finally path closed the local
server; its final cleanup-stage record names the server, and the driver exited.
However, the earlier harness wrote `helper.json` only after successful browser
launch. The original ephemeral server port and browser creation identity were
therefore not recorded. No exact original-port release receipt can be claimed or
reconstructed. No process was manually killed or inferred disposable by name.

## Source-only lifecycle correction

The shared finite harness now writes driver PID/creation time/executable, source
restart arguments and one absolute deadline before server/browser startup. It
records the actual local listening port immediately after listen, then records
the browser identity/debug port only when the launch API returns that handle.
A late handle after STOP/deadline is closed. A failed launch preserves its original
error/logs and emits a cleanup receipt even without a page. The receipt verifies
recorded ports and process exit; it reports incomplete cleanup when launch exit
cannot be established instead of inventing a missing identity.

The focused lifecycle batch passes **13/13** without launching a renderer. Three
new injected controls cover pre-page launch failure plus actual-record ordering
and cleanup, refusal to certify an unverified browser exit, and a successful
mock launch with unchanged original expiry and both ports released. The other ten
page ownership/closure controls remain passing. Both harness files pass syntax;
`git diff --check` passes. Production `src`, `assets`, `art`, `vendor` and
`workbenches` have no difference from runtime `2b350309`.

The original build remains available for a renewed architect-granted single
session using normal reviewed `require_escalated` Windows launch execution. No
renewed renderer attempt is implied by this source correction, and no new owner
permission question is needed. The first review still has no visual acceptance.
