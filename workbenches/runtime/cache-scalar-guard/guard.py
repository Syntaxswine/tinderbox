"""One fresh scalar-only controller. Importing does not create a Job/process.

Source candidate only. A new root permit and actual source review are mandatory.
Only separately permitted fixed six-scalar rendering is implemented; no fluid/bake/retry/cache writer.
"""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import traceback
from datetime import datetime, timezone

sys.dont_write_bytecode = True
from guard_policy import (ART_FILES, GUARD_FILES, SOURCE_FILES, LIMITS, OWNER, PROPOSAL, ART_INVENTORY,
                          READY_KIND, PRIMITIVE_SHA, UTILITY_SHA, JSON_MAX, SOURCE_MAX,
                          below, deadline, digest, hash_file, json_identity, own_record,
                          read_json, registration_reserve, remaining, require, safe_path,
                          tree_bytes, unresolved_charge, validate_job, validate_permit,
                          validate_spec, validate_binding, validate_projection_report, write_json)
from winjob import OwnedJob, HANDLE, SamplingBudgetError

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
ART = ROOT / "workbenches/art/fire-realism/cache-scalar-projections"
AUTH = Path("C:/Users/baals/Documents/ChatGPT/tinderbox/artifacts/qa/fire-realism/cache-scalar-authorizations")
CLEANUP = Path("C:/Users/baals/Local Storage/AI/GTP/helper-lifecycle/cleanup.py")


class Controller:
    def __init__(self, args, *, job_factory=OwnedJob, popen=subprocess.Popen, clock=time,
                 layout=None):
        # Internal fixture injection only; the CLI exposes no layout/OS fallback.
        self.clock, self.popen, self.job_factory = clock, popen, job_factory
        self.layout = layout or {"guard": HERE, "artist": ART, "auth": AUTH, "cleanup": CLEANUP, "cwd": ROOT}
        self.job = None
        self.children, self.streams, self.attempts = [], [], []
        self.registration_roots, self.registry_files = [], []
        self.peaks = {"sumPrivateBytes": 0, "jobCommittedBytes": 0, "scratchBytes": 0}
        self.owns_output = self.closed = False
        self.claim = self.binding = self.readback = None
        self.inputs_before = []
        self.sources_before, self.support_before, self.bindings_before = [], [], []
        self.binding_records = []
        self.failure = None
        self.phase = "preflight"
        self.permit_path = below(args.permit, self.layout["auth"])
        require(self.permit_path.name == "scalar-projections.json" and
                self.permit_path.parent.parent == safe_path(self.layout["auth"]),
                "Only a new task-scoped scalar permit path is supported")
        self.permit_raw, self.permit = read_json(self.permit_path)
        self.permit_sha = digest(self.permit_raw)
        self.artist = safe_path(self.layout["artist"], True)
        self.guard_dir = safe_path(self.layout["guard"], True)
        self.input_path = self.artist / "fixed-spec.json"
        require(safe_path(args.input_spec) == self.input_path, "Only the reviewed local input spec is supported")
        input_raw, self.spec = read_json(self.input_path)
        self.input_record = {"path": str(self.input_path), "bytes": len(input_raw), "sha256": digest(input_raw)}
        self.output_root = validate_spec(self.spec)
        self.out = below(args.output, self.output_root)
        require(not self.out.exists(), "Fresh scalar output required; no restart/adoption")
        self.stop = self.out / "supervisor.stop"
        validate_permit(self.permit, self.permit_path, self.input_record, self.spec,
                        self.out, self.clock.time())
        require(safe_path(args.tool_record) == safe_path(self.permit["tool"]["record"]["path"]),
                "Explicit verified tool-record command binding required")
        self.sources = {name: self.guard_dir / name for name in GUARD_FILES}
        self.sources.update({name: self.artist / name for name in ART_FILES})

    def save(self, name, value, exclusive=False, atomic=False):
        return write_json(self.out / name, value, exclusive, atomic)

    def budget_ms(self):
        # Nonrecursive: no full guard/sampling; preserves original phase clocks.
        try:
            return remaining(self.d, self.clock.time(), self.job.tick_ms(), self.stop.exists()) * 1000
        except BaseException as error:
            raise SamplingBudgetError(str(error)) from error

    def sample(self):
        try:
            value = self.job.sample(self.budget_ms)
            validate_job(value["job"])
            return value
        finally:
            self.save("job-sampling-diagnostics.json", {"controllerIdentity": json_identity(self.job.me),
                "candidateCommit": self.permit["candidateCommit"], "deadline": self.d,
                "sampling": self.job.sampling_report()})

    def guard(self):
        self.budget_ms()
        sample = self.sample()
        self.peaks["sumPrivateBytes"] = max(self.peaks["sumPrivateBytes"], sample["sumPrivateBytes"])
        self.peaks["jobCommittedBytes"] = max(self.peaks["jobCommittedBytes"], sample["job"]["peakJobCommittedBytes"])
        require(sample["sumPrivateBytes"] < LIMITS["aggregateCommittedBytes"] and
                all(m["privateBytes"] < LIMITS["processCommittedBytes"] for m in sample["members"]),
                "Private-memory guard reached hard committed limit")
        self.scratch_bytes()
        return sample

    def scratch_bytes(self):
        scratch = tree_bytes(self.out) + tree_bytes(self.permit_path.parent)
        if self.claim:
            scratch += hash_file(self.claim, SOURCE_MAX)["bytes"]
        scratch += sum(tree_bytes(p) for p in self.registration_roots)
        scratch += sum(safe_path(p, True).stat().st_size for p in self.registry_files)
        scratch += unresolved_charge(self.attempts)
        self.peaks["scratchBytes"] = max(self.peaks["scratchBytes"], scratch)
        require(scratch <= LIMITS["freshOutputBytes"], "512MiB polled owned-output budget exceeded")
        return scratch

    def persist(self, state=None):
        if state:
            self.phase = state
        self.save("controller.json", {"phase": self.phase, "controllerIdentity": json_identity(self.job.me),
            "deadline": self.d, "peaks": self.peaks, "claim": self.claim,
            "children": [r for _, r in self.children], "registrationAttempts": self.attempts,
            "controllerExitPending": True, "allHelpersRetired": False})

    def initialize(self):
        self.output_root.mkdir(exist_ok=True)
        safe_path(self.output_root, True)
        self.out.mkdir()
        self.owns_output = True
        self.claim = write_json(self.output_root / ("permit-" + self.permit_sha + ".claim.json"),
            {"owner": OWNER, "permitSha256": self.permit_sha, "nonce": self.permit["nonce"],
             "output": str(self.out)}, exclusive=True)
        self.job = self.job_factory(LIMITS["processCommittedBytes"], LIMITS["aggregateCommittedBytes"])
        self.d = deadline(self.job.me, self.clock.time(), self.job.tick_ms())
        require(self.d["deadlineEpoch"] <= self.permit["notAfterEpoch"], "Permit expires before original lifetime ends")
        initial = {"valid": False, "actual": None, "controllerIdentity": json_identity(self.job.me),
                   "candidateCommit": self.permit["candidateCommit"], "sourcePins": self.permit["sourcePins"],
                   "deadline": self.d, "expected": {"processLimitBytes": 2147483648,
                   "aggregateLimitBytes": 2147483648, "flags": 8960}}
        try:
            queried = self.job.join_self()
            validate_job(queried)
            # The primitive's raw five-field accounting stays in queryReadback.
            # Only validated caps/flags form the frozen three-field ready ABI.
            initial["actual"] = {key: queried[key] for key in ("processLimitBytes", "aggregateLimitBytes", "flags")}
            initial["valid"] = True
        except BaseException as error:
            initial["error"] = str(error)
            raise
        finally:
            initial["queryReadback"] = self.job.limit_readback
            if initial["actual"] is None:
                initial["actual"] = self.job.limit_readback.get("actual")
            self.readback = self.save("job-limit-readback.json", initial, exclusive=True)
        # No subprocess or VDB input read precedes this durable numeric readback.
        self.guard()
        self.snapshot_guard = self.out / "source-snapshot/guard"
        self.snapshot_art = self.out / "source-snapshot/artist"
        self.snapshot_guard.mkdir(parents=True)
        self.snapshot_art.mkdir()
        snapshots = {}
        for name in SOURCE_FILES:
            identity = {"path": str(self.sources[name]), "bytes": self.permit["sourceBytes"][name],
                        "sha256": self.permit["sourcePins"][name]}
            hash_file(identity, SOURCE_MAX, self.guard)
            target = (self.snapshot_guard if name in GUARD_FILES else self.snapshot_art) / name
            shutil.copyfile(self.sources[name], target)
            snapshots[name] = hash_file({**identity, "path": str(target)}, SOURCE_MAX, self.guard)
        require(self.permit["sourcePins"]["winjob.py"] == PRIMITIVE_SHA, "Primitive substitution refused")
        self.sources_before = [hash_file({"path": str(self.sources[name]), "bytes": self.permit["sourceBytes"][name],
            "sha256": self.permit["sourcePins"][name]}, SOURCE_MAX, self.guard) for name in SOURCE_FILES] + list(snapshots.values())
        self.save("guard-source-hashes-before.json", self.sources_before, exclusive=True)
        self.support_records = [{"path": str(self.artist / "source-pins.json"), **ART_INVENTORY},
            {"path": str(self.layout["cleanup"]), "bytes": 21149, "sha256": UTILITY_SHA}]
        self.support_before = [hash_file(record, SOURCE_MAX, self.guard) for record in self.support_records]
        self.save("guard-support-hashes-before.json", self.support_before, exclusive=True)
        self.input_records = [self.permit["controllerExecutable"],
            {k: self.permit["tool"][k] for k in ("path", "bytes", "sha256")},
            self.permit["tool"]["record"], self.spec["source"]["savedProject"],
            self.spec["source"]["rawManifest"], self.spec["source"]["prepareReport"],
            *[v["cache"] for v in self.spec["selected"]], *self.spec["evidence"].values()]
        require(safe_path(self.permit["controllerExecutable"]["path"]) == safe_path(self.job.me["executable"]),
                "Controller executable identity/pin mismatch")
        for record in self.input_records:
            maximum = 512 * 1024 * 1024 if record in self.input_records[:2] else 16 * 1024 * 1024
            self.inputs_before.append(hash_file(record, maximum, self.guard))
        self.save("guard-input-hashes-before.json", self.inputs_before, exclusive=True)
        _, tool = read_json(self.permit["tool"]["record"]["path"])
        require(safe_path(tool["executable"]) == safe_path(self.permit["tool"]["path"]) and
                tool["executableSha256"] == self.permit["tool"]["sha256"] and
                tool["authenticodeStatus"] == "Valid" and tool["version"] == "4.5.15 LTS",
                "Existing verified tool-record mismatch")
        self.save("scalar-authorization.used.json", {"permit": self.permit, "sha256": self.permit_sha}, exclusive=True)
        self.binding = self.save("run-binding.json", {"kind": "tinderbox-cache-scalar-run-binding-v1",
            "phase": "scalar-projections", "owner": OWNER, "proposalCommit": PROPOSAL,
            "candidateCommit": self.permit["candidateCommit"],
            "sourcePins": {name: self.permit["sourcePins"][name] for name in ART_FILES},
            "guardSourcePins": {name: self.permit["sourcePins"][name] for name in GUARD_FILES},
            "permitSha256": self.permit_sha, "inputSpecSha256": self.input_record["sha256"],
            "nonce": self.permit["nonce"], "output": str(self.out), "deadline": self.d,
            "controllerIdentity": json_identity(self.job.me), "sourceSnapshots": snapshots,
            "artistDirectory": str(self.snapshot_art)}, exclusive=True)
        self.binding_records = [{"path": str(self.permit_path), "bytes": len(self.permit_raw), "sha256": self.permit_sha},
                                self.claim, self.binding, self.readback]
        self.binding_value()
        self.persist("enrolling-controller")

    def launch(self, command, role, env=None):
        self.guard()
        stdout = (self.out / (role + "-stdout.log")).open("xb")
        stderr = (self.out / (role + "-stderr.log")).open("xb")
        self.streams.extend((stdout, stderr))
        startup = subprocess.STARTUPINFO() if os.name == "nt" else None
        if startup:
            startup.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startup.wShowWindow = 0
        child = self.popen(command, cwd=self.layout["cwd"], env=env or self.env,
                           stdout=stdout, stderr=stderr, startupinfo=startup,
                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        # Retain the actual handle immediately, even if strict identity then fails.
        record = {"role": role, "pid": child.pid, "identity": None, "exitCode": None,
                  "startedAtEpoch": self.clock.time(), "verifiedExited": False}
        self.children.append((child, record))
        try:
            who = self.job.remember(HANDLE(int(child._handle)), child.pid)
            require(safe_path(who["executable"]) == safe_path(command[0]), "Child executable differs from exact command")
            record["identity"] = json_identity(who)
        except BaseException as error:
            record["identityFailure"] = str(error)
            self.persist("failed-child-identity")
            raise
        self.persist()
        return child, record

    def wait(self, child, record, seconds=None):
        until = self.clock.monotonic() + seconds if seconds is not None else None
        while child.poll() is None:
            self.guard()
            if until is not None:
                require(self.clock.monotonic() < until, "Finite enrollment command timeout")
            self.clock.sleep(min(.25, self.budget_ms() / 1000))
        record.update({"exitCode": child.returncode, "verifiedExited": True,
                       "exitedAtEpoch": self.clock.time()})
        self.persist()
        return child.returncode

    def register(self, pid, role, command, executable):
        utility = safe_path(self.layout["cleanup"], True)
        hash_file({"path": str(utility), "bytes": utility.stat().st_size, "sha256": UTILITY_SHA}, SOURCE_MAX, self.guard)
        source_files = [str(p) for p in self.binding_sources()] + [self.binding["path"], self.claim["path"]]
        spec = {"pid": pid, "kind": "task_owned", "purpose": "One finite cache-field scalar: " + role,
            "ownershipEvidence": "New root scalar permit, exact identity/source/original deadline and self-owned memory Job.",
            "owners": [OWNER], "state": "stateless",
            "safeToTerminateReason": "Disposable scalar-only fresh output; selected caches remain hash-pinned read-only. Preserve partial evidence.",
            "sourceFiles": source_files, "helperDirectory": str(self.out), "ports": [],
            "expiresAt": datetime.fromtimestamp(self.d["deadlineEpoch"], timezone.utc).isoformat(),
            "stop": {"method": "stop_file", "path": str(self.stop)},
            "restart": {"cwd": str(self.layout["cwd"]), "executable": str(executable), "args": command,
                "dependencies": ["Windows Python3.12 standard library", "Exact verified Blender4.5.15; no packages/addons"],
                "inputs": [self.permit_path.as_posix(), self.input_record["path"], *[r["path"] for r in self.input_records]],
                "outputs": [str(self.out)], "pendingWork": "Never automatically restart/retry, reuse consumed permit, extend deadline or run renderer. Preserve claim and invalid partial results.",
                "secretReferences": []}}
        spec_path = self.save(role + "-registration-spec.json", spec)
        budget = registration_reserve(spec, self.job.known[pid], [safe_path(p, True).stat().st_size for p in source_files], utility.parent)
        attempt = {"role": role, "status": "inflight", "budget": budget, "targetIdentity": json_identity(self.job.known[pid])}
        self.attempts.append(attempt)
        self.save("registration-reservations.json", self.attempts)
        self.guard()
        try:
            child, record = self.launch([sys.executable, "-B", str(utility), "register", spec_path["path"]], role + "-registration")
            require(self.wait(child, record, 20) == 0, "Lifecycle registration failed")
            raw, receipt = read_json(self.out / (role + "-registration-stdout.log"))
            who = self.job.known[pid]
            actual = receipt["process"]
            require(actual["pid"] == pid and actual["creationFiletime"] == who["creationFileTime"] and
                    safe_path(actual["executable"]) == safe_path(who["executable"]), "Lifecycle exact identity mismatch")
            identifier = receipt["id"]
            require(re.fullmatch(r"[0-9a-f]{32}", identifier), "Uncertain lifecycle registration identifier")
            root = safe_path(utility.parent / "restart-records" / identifier, True)
            registry = safe_path(utility.parent / "registry" / (identifier + ".json"), True)
            require(safe_path(receipt["restartRecord"]) == root / "registration/restart.json", "Uncertain owned lifecycle path")
            _, entry = read_json(registry)
            require(entry["id"] == identifier and entry["process"] == actual and entry["owners"] == [OWNER] and
                    entry["purpose"] == spec["purpose"], "Registry record is not this exact task lifetime")
            self.registration_roots.append(root)
            self.registry_files.append(registry)
            attempt.update({"status": "resolved", "restartRoot": str(root), "registryFile": str(registry)})
            self.save(role + "-registration-receipt.json", receipt)
            self.save("registration-reservations.json", self.attempts)
            self.guard()
        except BaseException as error:
            if attempt["status"] != "resolved":
                attempt.update({"status": "failed-unresolved-reserve-retained", "error": str(error)})
            self.save("registration-reservations.json", self.attempts)
            raise

    def binding_sources(self):
        return [(self.snapshot_guard if name in GUARD_FILES else self.snapshot_art) / name for name in SOURCE_FILES]

    def publish_ready(self, record):
        self.guard()
        require(record["identity"] is not None, "Child exact identity missing")
        require({a["role"] for a in self.attempts if a["status"] == "resolved"} >=
                {"controller", "scalar-blender"}, "Both exact lifecycle enrollments must precede ready")
        ready = {"kind": READY_KIND, "phase": "scalar-projections", "owner": OWNER, "proposalCommit": PROPOSAL,
            "candidateCommit": self.permit["candidateCommit"],
            "sourcePins": {name: self.permit["sourcePins"][name] for name in ART_FILES},
            "permitSha256": self.permit_sha, "inputSpecSha256": self.input_record["sha256"],
            "nonce": self.permit["nonce"], "output": str(self.out), "runRecordSha256": self.binding["sha256"],
            "controllerIdentity": json_identity(self.job.me), "childIdentity": record["identity"],
            "deadline": self.d, "jobLimitReadback": {"path": self.readback["path"], "sha256": self.readback["sha256"],
                "actual": self.initial_actual, "validated": True}}
        self.ready = self.save("guard-ready.json", ready, exclusive=True, atomic=True)
        self.binding_records.append(self.ready)
        self.bindings_before = [hash_file(record, SOURCE_MAX, self.guard) for record in self.binding_records]
        self.save("guard-binding-hashes-before.json", self.bindings_before, exclusive=True)
        self.persist("scalar-running")

    def execute(self):
        temp = self.out / "temp"
        temp.mkdir()
        self.env = os.environ.copy()
        self.env.pop("PYTHONPATH", None)
        self.env.pop("PYTHONHOME", None)
        self.env.update({"TEMP": str(temp), "TMP": str(temp), "PYTHONDONTWRITEBYTECODE": "1", "PYTHONNOUSERSITE": "1"})
        self.initial_actual = read_json(self.readback["path"])[1]["actual"]
        controller_args = ["-B", str(self.guard_dir / "guard.py"), "--permit", str(self.permit_path),
                           "--input-spec", str(self.input_path), "--output", str(self.out),
                           "--tool-record", self.permit["tool"]["record"]["path"]]
        self.register(os.getpid(), "controller", controller_args, sys.executable)
        env = self.env.copy()
        for key, name in (("BLENDER_USER_CONFIG", "config"), ("BLENDER_USER_SCRIPTS", "scripts"),
                          ("BLENDER_USER_DATAFILES", "datafiles")):
            folder = self.out / name
            folder.mkdir()
            env[key] = str(folder)
        env.update({"OMP_NUM_THREADS": "4", "OMP_DYNAMIC": "FALSE"})
        args = ["--background", "--factory-startup", "--disable-autoexec", "--threads", "4",
                "--python-exit-code", "19", "--python", str(self.snapshot_guard / "startup.py"), "--",
                "--binding", self.binding["path"], "--binding-sha256", self.binding["sha256"]]
        child, record = self.launch([self.permit["tool"]["path"], *args], "scalar-blender", env)
        self.register(child.pid, "scalar-blender", args, self.permit["tool"]["path"])
        # Enrollment has retired; sample and strict live child membership again.
        require(child.poll() is None, "Metadata child exited before ready")
        self.job.remember(HANDLE(int(child._handle)), child.pid)
        self.publish_ready(record)
        require(self.wait(child, record) == 0, "Metadata Blender failed; preserve all output")
        require(not (self.out / "projection-failure.json").exists() and not (self.out / "startup-failure.json").exists(),
                "Projection/startup failure receipt exists")
        _, started = read_json(self.out / "startup-complete.json")
        require(set(started) == {"kind", "status", "diagnosticOnly", "runRecordSha256"} and
                started["kind"] == "tinderbox-cache-scalar-startup-result-v1" and started["status"] == "scalar-entry-returned" and
                started["diagnosticOnly"] is True and started["runRecordSha256"] == self.binding["sha256"],
                "Exact startup completion receipt required")
        _, report = read_json(self.out / "projection-report.json", 2 * 1024 * 1024)
        ready_raw, ready = read_json(self.ready["path"])
        require(digest(ready_raw) == self.ready["sha256"], "Ready changed after publication")
        inventory = validate_projection_report(report, self.spec, self.out, ready, self.guard)
        self.verify_after()
        self.guard()
        self.save("scalar-result.json", {"kind": "tinderbox-cache-scalar-result-v1", "phase": "scalar-projections",
            "status": "six-offline-scalar-projections-diagnostic-only", "candidateCommit": self.permit["candidateCommit"],
            "sourcePins": ready["sourcePins"], "guardSourcePins": self.binding_value()["guardSourcePins"],
            "report": own_record(self.out / "projection-report.json", 2 * 1024 * 1024), "outputInventory": inventory,
            "deadline": self.d, "peaks": self.peaks, "inputPreservation": True, "sourcePreservation": True,
            "actualGridValueIdentityClaimed": False, "nativeQualityAcceptance": False, "gpuCostCredit": False,
            "limitScope": "Hard committed-memory Job caps;512MiB polled output budget, not quota/RSS.",
            "controllerExitPending": True}, exclusive=True)
        self.persist("scalar-complete-awaiting-host-exit-review")

    def binding_value(self):
        raw, binding = read_json(self.binding["path"])
        require(digest(raw) == self.binding["sha256"], "Immutable binding changed")
        return validate_binding(binding)

    def verify_after(self):
        for group, records, before in (("input", self.input_records, self.inputs_before),
                ("source", self.sources_before, self.sources_before), ("support", self.support_records, self.support_before),
                ("binding", self.binding_records, self.bindings_before)):
            after = [hash_file(record, 512 * 1024 * 1024 if group == "input" else SOURCE_MAX, self.guard) for record in records]
            self.save("guard-" + group + "-hashes-after.json", after, exclusive=True)
            require(after == before, "Read-only " + group + " preservation failed")

    def terminate_child(self, child, record):
        if child.poll() is not None:
            record.update({"exitCode": child.returncode, "verifiedExited": True})
            return
        if not self.stop.exists():
            self.stop.write_text("Stop disposable scalar task; preserve evidence, no restart.\n", encoding="utf-8")
        try:
            grace = min(2, max(0, remaining(self.d, self.clock.time(), self.job.tick_ms())))
        except BaseException:
            grace = 0
        until = self.clock.monotonic() + grace
        while child.poll() is None and self.clock.monotonic() < until:
            self.clock.sleep(.05)
        if child.poll() is None:
            record["forcedTerminationIdentity"] = json_identity(self.job.terminate_exact(HANDLE(int(child._handle)), child.pid, 88))
        child.wait(timeout=5)
        record.update({"exitCode": child.returncode, "verifiedExited": True, "invalid": True})

    def preserve_failed_input_check(self):
        for group, records in (("input", self.inputs_before), ("source", self.sources_before),
                              ("support", self.support_before), ("binding", self.binding_records)):
            if not records or (self.out / ("guard-" + group + "-hashes-after.json")).exists():
                continue
            observations = []
            for record in records:
                try:
                    observations.append(hash_file(record, 512 * 1024 * 1024, self.budget_ms))
                except BaseException as failure:
                    observations.append({"path": record["path"], "verificationUnproved": True, "error": str(failure)})
            self.save("guard-" + group + "-hashes-after.json", {"status": "failed-run-preservation-observations",
                "allPinnedInputsVerified": observations == records, "observations": observations}, exclusive=True)

    def finish(self, error=None):
        if self.closed:
            return
        self.closed = True
        cleanup_errors = []
        try:
            if self.owns_output:
                self.save("controller-failure.json" if error else "controller-completion.json",
                    {"error": str(error) if error else None, "traceback": traceback.format_exc() if error else None,
                     "claim": self.claim, "controllerExitPending": True, "diagnosticOnly": True})
            if self.job and self.job.joined:
                for child, record in self.children:
                    try:
                        self.terminate_child(child, record)
                    except BaseException as failure:
                        cleanup_errors.append({"role": record["role"], "error": str(failure), "identity": record["identity"]})
                for pid in self.job.members():
                    if pid == os.getpid():
                        continue
                    handle = self.job.open_member(pid)
                    if handle is None:
                        continue
                    try:
                        self.job.remember(handle, pid)
                        self.job.terminate_exact(handle, pid, 89)
                    except BaseException as failure:
                        cleanup_errors.append({"pid": pid, "error": str(failure), "retirementUnproved": True})
                    finally:
                        self.job.k.CloseHandle(handle)
                until = self.clock.monotonic() + 3
                while sorted(self.job.members()) != [os.getpid()] and self.clock.monotonic() < until:
                    self.clock.sleep(.05)
                self.preserve_failed_input_check()
                for stream in self.streams:
                    stream.flush()
                    os.fsync(stream.fileno())
                    stream.close()
                self.streams = []
                self.persist("final-receipts-before-disarm")
                self.save("controller-final.json", {"identity": json_identity(self.job.me), "deadline": self.d,
                    "peaks": self.peaks, "claim": self.claim, "children": [r for _, r in self.children],
                    "cleanupErrors": cleanup_errors, "controllerExitPending": True,
                    "allHelpersRetired": False, "recordsFlushedBeforeDisarm": True}, exclusive=True)
                require(self.scratch_bytes() + 4096 <= LIMITS["freshOutputBytes"],
                        "Final close-receipt allowance exceeds polled output budget")
                require(not cleanup_errors, "Strict cleanup has unproved lifetimes; preserve before Job close")
                self.save("job-normal-close.json", self.job.finish(), exclusive=True)
                self.scratch_bytes()
        except BaseException as failure:
            cleanup_errors.append({"stage": "finish", "error": str(failure)})
            if self.owns_output:
                self.save("cleanup-failure.json", {"errors": cleanup_errors, "controllerExitPending": True,
                    "allHelpersRetired": False, "jobCloseWillRetainKillOnCloseIfChildrenRemain": True}, exclusive=True)
            raise
        finally:
            for stream in self.streams:
                try:
                    stream.flush()
                    stream.close()
                except Exception:
                    pass
            if self.job:
                self.job.close()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--permit", required=True)
    parser.add_argument("--input-spec", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--tool-record", required=True)
    args = parser.parse_args(argv)
    controller = None
    error = None
    try:
        controller = Controller(args)
        controller.initialize()
        controller.execute()
    except BaseException as failure:
        error = failure
        raise
    finally:
        if controller:
            try:
                controller.finish(error)
            except BaseException:
                if error is None:
                    raise
                # Original failure is already durable; cleanup-failure.json keeps
                # the second cause. Never replace the original exception with it.


if __name__ == "__main__":
    main()
