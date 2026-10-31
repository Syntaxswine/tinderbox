# Cache-field metadata guard: source candidate

Source implementation authorized by architect proposal `d3d14bf1d7154e4324317e93d876313eeba39a65` and the reviewed `cd83360d` guard seam. This is a separate metadata-only namespace. It never accepts an authoring/bake/render permit and does not alter the nine-core authoring source or the reader experiment.

No actual execution is authorized by this source. The architect released the pure/fake test window; a later actual metadata run still requires source review, a new explicit root permit, and actual identity/Job/lifecycle evidence. Rendering remains absent and rejected.

`winjob.py` is a raw byte-identical copy of `f31e2b9977d0d1338a65d0e63d6d6f56fa34740f`'s authoring primitive:22,699 bytes / SHA-256 `2763cb83251ee15077b27acce03e448904888eaee2ed978f6fd79ffd94e8b8ee`. Strict held-handle Job membership, PID/creation/executable identity, sampling waits/census omissions, exact termination and normal disarm are unchanged. `guard.py` and `guard_policy.py` are new; they never import the old authoring policy/supervisor or accept its permits.

## Source and permit boundary

The controller runs from its reviewed project checkout, with the artist's exact eight-file metadata closure intaken at `workbenches/art/fire-realism/cache-field-diagnostic/`. It verifies six local guard files plus those eight artist files against the NEW root permit before copying them into the fresh task's source snapshot. `startup.py` and the artist module are executed from those verified snapshots, with all local dependencies together. Root independently attests the exact source commit and hashes; the controller launches no Git command. FILETIME remains an exact Python integer in the primitive and decimal text in new cross-language identity envelopes.

`permit.schema.json` describes, and `validate_permit` enforces, the new metadata-only permit. The root issues it at an explicit path below PRIMARY `artifacts/qa/fire-realism/cache-field-authorizations/<id>/metadata.json`. No permit exists in this delivery. It binds the exact candidate, all14 source byte hashes/counts, input-spec record, controller executable record, verified Blender executable/record, output/authorization paths, nonce, issuance/expiry and fixed limits. The expiry must cover the original controller-creation120s deadline; a one-use exclusive claim keyed by the permit hash prevents replay. Existing outputs/claims are never adopted, changed or removed.

Descriptive invocation **only after separate approval**:

```text
python -B workbenches/runtime/cache-field-guard/guard.py --permit PRIMARY_CACHE_AUTH/metadata.json --input-spec REVIEWED_ART/input-spec.json --output FRESH_OUTPUT --tool-record VERIFIED_TOOL_RECORD.json
```

Paths are checked component-wise and existing ancestors are rejected if symlink/junction/reparse points. The output root follows the pinned V5 input owner: `<stageDirectory>/../../cache-field-diagnostic/<fresh-run>`. Selected caches stay read-only external input references. The saved `.blend` is hashed as provenance and is never opened. There is no renderer, simulator, conversion, data repair or retry path.

## Launch and startup barrier

Before **any** child command, the controller joins its own Windows Job and durably records exact numeric2GiB per-process and aggregate committed limits/flags8960, with breakaway disabled. It also saves failures/unknown readbacks. Unsupported nested Jobs or query failures abort; there is no memory fallback. These are committed-memory limits, not an RSS/working-set/VRAM/file-cache cap.

The immutable `run-binding.json` is separate from mutable `controller.json`. The controller enrolls itself, starts the capped hidden Blender in background/factory-startup/disable-autoexec/four-thread mode, then enrolls that exact child. The startup script waits on the same original UTC/uptime deadline and private `supervisor.stop`; it cannot import or call the artist module before enrollment. Only then does the controller atomically write `guard-ready.json`, with the exact artist schema and its `runRecordSha256` bound to `run-binding.json`. The child checks its actual PID/creation/executable, all bindings/readback hashes and snapshot files again. This JSON gate is evidence binding, not a replacement for actual controller Job/member checks.

The artist entry receives only `--guard-ready`, `--input-spec`, `--input-sha256`, `--nonce` and `--output`. It owns `metadata-report.json`, `metadata-failure.json` and `input-hashes-before/after.json`. The guard uses distinct `guard-input-hashes-before/after.json`, preserving the artist receipts. A successful child can yield only `metadata-collected-review-required` with `renderReady:false`. Metadata/name/index/heat interpretation remains an architect review, never render authorization.

## Bounds, ownership and retirement

The original120-second creation-based UTC **and** uptime deadlines include verification/enrollment/startup; no phase or wait replenishes them. All waits are bounded by the original remaining budget. Sampling passes the nonrecursive STOP/clock callback into the unchanged primitive and preserves its bounded journal even on failure. A signaled owned handle proves exit only for that sampling observation; an error87 absent-census omission never grants identity/termination authority.

The512MiB fresh-output budget is a polled reject/terminate guard, **not a filesystem quota**. It counts the whole new output/isolation/log/source-snapshot tree, exact outside claim, task authorization metadata, owned lifecycle registry/snapshot files and conservative unresolved registration reserve. The reserve is charged before registration and retained on partial/unknown failure; no unrelated registry/QA scan or UUID guess is used. The pinned utility is `cleanup.py`21,149 bytes/SHA `7931a5c42fedfa345d8b5a9a402e63ac248116a2cc7e5b621d223d9187876b5d`. Cache/scene inputs are references, not copied restart sources. Final writes are counted, with a conservative4KiB close-receipt allowance before normal disarm and a final exact recount afterward. A future stage exceeding512MiB is failed evidence, even if an inter-poll overshoot occurred.

The reviewed metadata writer has only bounded JSON/log/isolation outputs; no large cache/output writer is admitted. Source/input/tool hashes must agree before and after a successful run. Failure/STOP/expiry preserves partial evidence and explicitly unproved post-checks. Graceful STOP precedes strict exact-owned termination, with bounded cleanup waits. Original and cleanup failures are preserved separately. Receipts are flushed before Job disarm/close; normal disarm requires self as the only member. The controller reports its own exit pending. Root must independently verify its exact lifetime retired; there is no retained service/port or automatic restart. Cleanup can finish after the work deadline and is reported separately, not hidden as more work time.

## Focused source checks

After an explicitly released test window, run only:

```text
python -B workbenches/runtime/cache-field-guard/check_fake.py --temp-root EXISTING_OWN_QA_DIRECTORY
```

The fixture uses tiny newly owned synthetic files and fake Job/process APIs, including fake registration, startup gates and module invocation. No actual Job/Popen/Blender/bpy/cache read occurs. It checks fixed authority/limits/source closure, numeric readback-before-child order, original clocks/STOP, junction and byte bounds, one-use ownership, conservative reserve/failure persistence, immutable binding, snapshot/gate rejection, output accounting and finally cleanup. The reused primitive's raw SHA is checked; earlier real OS enforcement is provenance, not proof of this new controller. Actual metadata, source alignment, rendering, visual quality and GPU cost remain separate gates.
