# Review presentation labels

The live workbench now labels the restored outer renderer as **Outer renderer**.
For common HDR snapshots it separately shows immutable declared settings, public
availability and the reported actual target fields. A declared four-sample
contract never fills a missing actual sample count, target size or format.
Unknown contracts and missing or unavailable target evidence stay explicit.
Ordinary snapshots state that no common HDR contract was reported.

The UI reads only the existing public source identity and presentation state.
These labels do not independently verify a GPU allocation or transfer, enable
hardware timing, accept a reference or change rendering. Source/media pairing,
recording leases, cancellation, timing refusals and the production HUD are
unchanged. No effect, shader, driver, transport or acceptance code is changed.

Base: UI `e7e729110f996bb1d2ee79b781ef759844bc5ca1`, independently compared with
PRIMARY `5b90ebd297a6a77cca7a4932c363ba15586bdab0`. All three edited UI source/test
Git blobs matched exactly; original raw CRLF delivery is preserved in ignored
QA snapshots and compared separately from canonical Git bytes.

Validation: all 110 focused Node UI checks pass with zero exclusions; review and
DOM fixture syntax and `git diff --check` pass. The suite checks ordinary output, distinct declared
and actual samples/dimensions, absent and unavailable targets, missing fields,
unknown contracts and missing immutable identity. The existing browser fixture
has one added presentation-label case, prepared for architect DOM review;
no browser, renderer, GPU probe, timing run or visual acceptance occurs here.
Exact source hashes, check results and candidate commit are in the frozen
`artifacts/qa/fire-realism/presentation-labels-ui` handoff/index.
