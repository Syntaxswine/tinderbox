"""Pure/filesystem/fake-API checks only: no OS Job, Popen, Blender or VDB read.

Tiny files named .vdb below a newly owned test directory are synthetic bytes.
Real tool/utility hash reads are mocked only at those two fixture paths. The
strict raw hashing/path/source functions are separately checked with tiny files.
"""
import argparse
from contextlib import ExitStack
import copy
import hashlib
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import sys

sys.dont_write_bytecode = True
import guard
import guard_policy as p
import startup

TEMP_ROOT = None


class Clock:
    def __init__(self):
        self.epoch, self.uptime = 1000., 900000.

    def time(self):
        return self.epoch

    def monotonic(self):
        return self.uptime / 1000

    def sleep(self, seconds):
        self.epoch += seconds
        self.uptime += seconds * 1000


class Child:
    def __init__(self, pid, executable, owner, metadata=False):
        self.pid, self.executable, self.owner, self.metadata = pid, executable, owner, metadata
        self._handle, self.returncode = pid, None

    def poll(self):
        if self.metadata and self.returncode is None and (self.owner.controller.out / "guard-ready.json").exists():
            out = self.owner.controller.out
            p.write_json(out / "metadata-report.json", {"status": "metadata-collected-review-required", "renderReady": False})
            # Artist-owned filenames must not collide with guard preservation.
            p.write_json(out / "input-hashes-before.json", ["artist fixture"])
            p.write_json(out / "input-hashes-after.json", ["artist fixture"])
            self.returncode = 0
        return self.returncode

    def wait(self, timeout):
        if self.poll() is None:
            raise RuntimeError("Fake child still live")
        return self.returncode


class FakeJob:
    def __init__(self, owner, process, aggregate):
        assert process == aggregate == 2147483648
        self.owner, self.joined, self.disarmed, self.closed = owner, False, False, False
        self.me = {"pid": os.getpid(), "creationFileTime": 116444736000000000 + 1000 * 10000000,
                   "executable": str(owner.python)}
        self.known, self.limit_readback = {}, {"status": "not-queried", "actual": None}
        self.k = SimpleNamespace(CloseHandle=lambda h: None)
        self.terminate_calls = []

    def tick_ms(self):
        return self.owner.clock.uptime

    def info(self):
        return {"processLimitBytes": 2147483648, "aggregateLimitBytes": 2147483648,
                "flags": self.owner.flags, "peakProcessCommittedBytes": 1024, "peakJobCommittedBytes": 2048}

    def join_self(self):
        self.joined = True
        actual = self.info()
        self.limit_readback = {"status": "read", "actual": actual, "validated": self.owner.flags == 8960}
        self.known[os.getpid()] = self.me
        return actual

    def sample(self, callback):
        callback()
        if self.owner.sampling_failure:
            raise RuntimeError("synthetic sampling failure")
        return {"members": [{**self.me, "privateBytes": 1024}], "sumPrivateBytes": 1024, "job": self.info()}

    def sampling_report(self):
        return {"fakeAPI": True, "failurePreserved": self.owner.sampling_failure, "events": []}

    def remember(self, handle, pid):
        if pid == self.owner.fail_identity_pid:
            raise RuntimeError("synthetic unknown child identity")
        child = self.owner.processes[pid]
        identity = {"pid": pid, "creationFileTime": self.me["creationFileTime"] + pid,
                    "executable": child.executable}
        if pid in self.known and self.known[pid] != identity:
            raise RuntimeError("Fake exact identity changed")
        self.known[pid] = identity
        return identity

    def members(self):
        return [os.getpid()] + [c.pid for c in self.owner.processes.values() if c.poll() is None]

    def open_member(self, pid):
        return pid

    def terminate_exact(self, handle, pid, code):
        if pid not in self.known:
            raise RuntimeError("Unknown lifetime cannot be explicitly terminated")
        self.terminate_calls.append(pid)
        self.owner.processes[pid].returncode = code
        return self.known[pid]

    def finish(self):
        if self.members() != [os.getpid()]:
            raise RuntimeError("Fake children remain")
        self.disarmed = True
        return {"childrenVerifiedExited": True, "killOnCloseDisarmed": True, "controllerExitPending": True}

    def close(self):
        self.closed = True


class Harness:
    def __init__(self):
        self.stack = ExitStack()
        self.temp = self.stack.enter_context(tempfile.TemporaryDirectory(prefix="cache-guard-pure-", dir=TEMP_ROOT))
        self.root = Path(self.temp).resolve()
        self.runtime, self.artist, self.auth = [self.root / x for x in ("runtime", "artist", "auth/one")]
        for folder in (self.runtime, self.artist, self.auth):
            folder.mkdir(parents=True)
        self.clock, self.flags, self.processes, self.calls = Clock(), 8960, {}, []
        self.sampling_failure = False
        self.fail_identity_pid = None
        self.fail_registration = False
        self.python, self.blender = self.root / "python.exe", self.root / "blender.exe"
        self.python.write_bytes(b"synthetic controller executable")
        self.blender.write_bytes(b"synthetic Blender marker; never executed")
        self.utility = self.root / "lifecycle/cleanup.py"
        self.utility.parent.mkdir()
        self.utility.write_bytes(b"synthetic utility marker; never executed")
        tool = self.root / "tool.json"
        p.write_json(tool, {"executable": str(self.blender), "executableSha256": p.BLENDER_SHA,
                           "authenticodeStatus": "Valid", "version": "4.5.15 LTS"})
        stage = self.root / "inputs/mantaflow-surface-source/stage-2026-10-31-v5"
        (stage / "cache/data").mkdir(parents=True)
        for name in ("surface-source.blend", "raw-manifest.json", "prepare.json"):
            (stage / name).write_bytes(b"synthetic input")
        self.output_root = stage.parent.parent / "cache-field-diagnostic"
        selected = []
        for frame in (31, 61):
            file = stage / "cache/data" / ("fluid_data_%04d.vdb" % frame)
            file.write_bytes(b"tiny non-VDB synthetic bytes")
            selected.append({"frame": frame, "ageSeconds": (frame - 1) / 30,
                             "resolution": [48, 48, 96], "cache": p.own_record(file)})
        self.spec = {"version": 1, "phase": "metadata", "renderEnabled": False, "owner": p.OWNER,
            "proposalCommit": p.PROPOSAL, "limits": {**p.LIMITS, "selectedCacheBytesMaximum": 16777216, "gridCountMaximum": 64},
            "tool": {"version": [4, 5, 15], "buildHash": "5afeabba6097", "executable": str(self.blender),
                     "executableSha256": p.BLENDER_SHA, "record": p.own_record(tool)},
            "selected": selected, "requiredLiteralGrids": ["density", "flame"],
            "source": {"stageDirectory": str(stage), "savedProject": p.own_record(stage / "surface-source.blend"),
                       "rawManifest": p.own_record(stage / "raw-manifest.json"),
                       "prepareReport": p.own_record(stage / "prepare.json"),
                       "cacheHashLineage": {"producerVdbHashesAvailable": False}}}
        for name in p.SOURCE_FILES:
            folder = self.runtime if name in p.GUARD_FILES else self.artist
            (folder / name).write_bytes(b"synthetic source " + name.encode())
        (self.runtime / "winjob.py").write_bytes((Path(__file__).parent / "winjob.py").read_bytes())
        p.write_json(self.artist / "input-spec.json", self.spec)
        self.output = self.output_root / "new-run"
        self.permit_path = self.auth / "metadata.json"
        sources = {name: p.own_record((self.runtime if name in p.GUARD_FILES else self.artist) / name) for name in p.SOURCE_FILES}
        self.permit = {"version": 1, "kind": p.KIND, "phase": "metadata", "owner": p.OWNER,
            "proposalCommit": p.PROPOSAL, "candidateCommit": "a" * 40,
            "sourcePins": {n: r["sha256"] for n, r in sources.items()},
            "sourceBytes": {n: r["bytes"] for n, r in sources.items()},
            "inputSpec": p.own_record(self.artist / "input-spec.json"),
            "tool": {**p.own_record(self.blender), "sha256": p.BLENDER_SHA, "record": p.own_record(tool)},
            "controllerExecutable": p.own_record(self.python), "output": str(self.output),
            "authorizationPath": str(self.permit_path), "issuedAtEpoch": 900., "notAfterEpoch": 1200.,
            "nonce": "b" * 32, "limits": dict(p.LIMITS)}
        p.write_json(self.permit_path, self.permit, exclusive=True)
        self.layout = {"guard": self.runtime, "artist": self.artist, "auth": self.auth.parent,
                       "cleanup": self.utility, "cwd": self.root}
        real_hash = guard.hash_file

        def fixture_hash(record, maximum, checkpoint=lambda: None):
            if Path(record["path"]) in (self.blender, self.utility):
                checkpoint()
                # Only fake external API identities; never read a real binary/cache.
                return {"path": str(Path(record["path"]).resolve()), "bytes": record["bytes"], "sha256": record["sha256"]}
            return real_hash(record, maximum, checkpoint)

        self.stack.enter_context(patch.object(guard, "hash_file", fixture_hash))
        self.stack.enter_context(patch.object(guard.sys, "executable", str(self.python)))
        self.stack.enter_context(patch.object(guard.subprocess, "Popen", side_effect=AssertionError("Actual Popen forbidden")))

    def make(self):
        args = SimpleNamespace(permit=str(self.permit_path), input_spec=str(self.artist / "input-spec.json"),
                               output=str(self.output), tool_record=self.permit["tool"]["record"]["path"])
        self.controller = guard.Controller(args, job_factory=lambda a, b: self.make_job(a, b),
                                           popen=self.popen, clock=self.clock, layout=self.layout)
        return self.controller

    def make_job(self, a, b):
        self.job = FakeJob(self, a, b)
        return self.job

    def popen(self, command, **options):
        assert (self.controller.out / "job-limit-readback.json").exists()
        assert p.read_json(self.controller.out / "job-limit-readback.json")[1]["valid"] is True
        pid = 100000 + len(self.processes)
        metadata = command[0] == str(self.blender)
        child = Child(pid, command[0], self, metadata)
        self.processes[pid] = child
        self.calls.append({"command": command, "env": options["env"], "metadata": metadata})
        if not metadata:
            spec = p.read_json(command[-1])[1]
            target = self.job.known[spec["pid"]]
            identifier = "%032x" % spec["pid"]
            root = self.utility.parent / "restart-records" / identifier
            (root / "registration").mkdir(parents=True)
            p.write_json(root / "registration/restart.json", {"fixture": True})
            registry = self.utility.parent / "registry"
            registry.mkdir(exist_ok=True)
            identity = {"pid": target["pid"], "creationFiletime": target["creationFileTime"], "executable": target["executable"]}
            p.write_json(registry / (identifier + ".json"), {"id": identifier, "process": identity,
                         "owners": [p.OWNER], "purpose": spec["purpose"]})
            options["stdout"].write((json.dumps({"id": identifier, "process": identity,
                                    "restartRecord": str(root / "registration/restart.json")}) + "\n").encode())
            options["stdout"].flush()
            child.returncode = 7 if self.fail_registration else 0
        return child

    def close(self):
        # Revalidate the exact newly created test directory, never a broad sweep.
        assert self.root.name.startswith("cache-guard-pure-") and self.root.parent == Path(TEMP_ROOT).resolve()
        self.stack.close()


class PureGuardChecks(unittest.TestCase):
    def setUp(self):
        self.h = Harness()
        self.addCleanup(self.h.close)

    def test_metadata_only_authority_rejects_old_render_bake_and_changed_limits(self):
        h = self.h
        for key, value in (("version", True), ("phase", "render"), ("phase", "bake"), ("kind", "tinderbox-surface-source-authorization-v1"),
                           ("owner", "other"), ("proposalCommit", "c" * 40), ("nonce", "short")):
            candidate = copy.deepcopy(h.permit)
            candidate[key] = value
            with self.assertRaises(ValueError):
                p.validate_permit(candidate, h.permit_path, h.permit["inputSpec"], h.spec, h.output, 1000)
        candidate = copy.deepcopy(h.permit)
        candidate["limits"]["wallSeconds"] = 900
        with self.assertRaises(ValueError):
            p.validate_permit(candidate, h.permit_path, h.permit["inputSpec"], h.spec, h.output, 1000)
        changed_spec = copy.deepcopy(h.spec)
        changed_spec["version"] = True
        with self.assertRaises(ValueError):
            p.validate_spec(changed_spec)

    def test_complete_source_closure_and_exact_primitive_are_required(self):
        for mutation in (lambda v: v["sourcePins"].pop("space.py"),
                         lambda v: v["sourcePins"].update({"extra.py": "a" * 64}),
                         lambda v: v["sourcePins"].update({"winjob.py": "a" * 64})):
            candidate = copy.deepcopy(self.h.permit)
            mutation(candidate)
            with self.assertRaises(ValueError):
                p.validate_permit(candidate, self.h.permit_path, self.h.permit["inputSpec"], self.h.spec, self.h.output, 1000)

    def test_original_creation_exact120s_and_decimal_filetime(self):
        who = {"pid": 1, "creationFileTime": 134379091985924153, "executable": str(self.h.python)}
        start = (who["creationFileTime"] - 116444736000000000) / 10000000
        d = p.deadline(who, start + 5, 100000.)
        self.assertEqual(p.json_identity(who)["creationFileTime"], "134379091985924153")
        self.assertAlmostEqual(p.remaining(d, start + 5, 100000), 115.)
        for epoch, tick, stop in ((start + 120, 215000, False), (start + 5, d["startTickMs"] - 1, False), (start + 5, 100000, True)):
            with self.assertRaises(ValueError):
                p.remaining(d, epoch, tick, stop)

    def test_path_sibling_and_reparse_ancestor_refused(self):
        with self.assertRaises(ValueError):
            p.below(self.h.root.parent / (self.h.root.name + "-other"), self.h.root)
        original = Path.lstat
        ancestor = self.h.root / "junction"
        ancestor.mkdir()

        def marked(path):
            if path == ancestor:
                return SimpleNamespace(st_file_attributes=0x400, st_mode=0)
            return original(path)

        with patch.object(Path, "lstat", marked):
            with self.assertRaisesRegex(ValueError, "Reparse"):
                p.safe_path(ancestor / "not-created-yet")

    def test_bounded_json_duplicate_nonfinite_and_preallocation_rejection(self):
        file = self.h.root / "bad.json"
        for raw in (b'{"x":1,"x":2}', b'{"x":NaN}'):
            file.write_bytes(raw)
            with self.assertRaises(ValueError):
                p.read_json(file)
        file.write_bytes(b"x" * 20)
        with self.assertRaisesRegex(ValueError, "Bounded"):
            p.read_json(file, 10)

    def test_streamed_hash_mismatch_stop_and_no_input_write(self):
        file = self.h.root / "tiny.bin"
        file.write_bytes(b"abcd")
        identity = p.own_record(file)
        self.assertEqual(p.hash_file(identity, 4), identity)
        before = file.read_bytes()
        with self.assertRaisesRegex(RuntimeError, "synthetic stop"):
            p.hash_file(identity, 4, lambda: (_ for _ in ()).throw(RuntimeError("synthetic stop")))
        file.write_bytes(b"abce")
        with self.assertRaises(ValueError):
            p.hash_file(identity, 4)
        self.assertEqual(before, b"abcd")

    def test_hard_readback_failure_is_durable_before_any_fake_child(self):
        self.h.flags = 8960 | 0x800
        c = self.h.make()
        with self.assertRaises(ValueError):
            c.initialize()
        receipt = p.read_json(c.out / "job-limit-readback.json")[1]
        self.assertFalse(receipt["valid"])
        self.assertEqual(receipt["actual"]["flags"], 8960 | 0x800)
        self.assertFalse(self.h.calls)
        c.finish(ValueError("synthetic invalid readback"))

    def test_full_fake_enrollment_ready_is_immutable_and_never_renders(self):
        c = self.h.make()
        c.initialize()
        binding = (c.out / "run-binding.json").read_bytes()
        c.execute()
        ready = p.read_json(c.out / "guard-ready.json")[1]
        self.assertEqual(ready["runRecordSha256"], p.digest(binding))
        self.assertEqual((c.out / "run-binding.json").read_bytes(), binding)
        self.assertEqual([v["role"] for v in c.attempts], ["controller", "metadata-blender"])
        self.assertTrue(all(v["status"] == "resolved" for v in c.attempts))
        self.assertEqual(p.read_json(c.out / "input-hashes-before.json")[1], ["artist fixture"])
        self.assertEqual(p.read_json(c.out / "guard-input-hashes-after.json")[1], c.inputs_before)
        call = [v for v in self.h.calls if v["metadata"]][0]
        self.assertIn("--factory-startup", call["command"])
        self.assertNotIn("--render-frame", call["command"])
        self.assertEqual(call["env"]["OMP_NUM_THREADS"], "4")
        c.finish()
        self.assertTrue(self.h.job.closed and self.h.job.disarmed)
        self.assertLess(c.peaks["scratchBytes"], 536870912)

    def test_ready_refuses_missing_enrollment_and_never_exposes_early_gate(self):
        c = self.h.make()
        c.initialize()
        c.initial_actual = self.h.job.info()
        with self.assertRaisesRegex(ValueError, "enrollments"):
            c.publish_ready({"identity": p.json_identity(self.h.job.me)})
        self.assertFalse((c.out / "guard-ready.json").exists())
        c.finish(ValueError("synthetic no enrollment"))

    def test_changed_source_fails_before_any_process_or_selected_input_read(self):
        c = self.h.make()
        (self.h.runtime / "guard.py").write_bytes(b"source changed after permit")
        with self.assertRaises(ValueError):
            c.initialize()
        self.assertFalse(self.h.calls)
        self.assertFalse(c.inputs_before)
        self.assertFalse((c.out / "guard-ready.json").exists())
        c.finish(ValueError("source mismatch"))

    def test_unknown_child_identity_never_grants_explicit_termination_or_disarm(self):
        c = self.h.make()
        c.initialize()
        c.env = {}
        self.h.fail_identity_pid = 100000
        with self.assertRaisesRegex(RuntimeError, "unknown child identity"):
            c.launch([str(self.h.blender)], "unknown-identity")
        self.assertEqual(len(c.children), 1)
        self.assertIsNone(c.children[0][1]["identity"])
        with self.assertRaisesRegex(ValueError, "cleanup"):
            c.finish(RuntimeError("original unknown identity"))
        self.assertTrue(self.h.job.closed)
        self.assertFalse(self.h.job.disarmed)
        self.assertFalse(self.h.job.terminate_calls)
        self.assertTrue((c.out / "controller-failure.json").exists())
        self.assertTrue((c.out / "cleanup-failure.json").exists())

    def test_failed_registration_keeps_conservative_reserve_and_no_ready(self):
        self.h.fail_registration = True
        c = self.h.make()
        c.initialize()
        with self.assertRaisesRegex(ValueError, "registration failed"):
            c.execute()
        self.assertEqual(c.attempts[0]["status"], "failed-unresolved-reserve-retained")
        self.assertEqual(p.unresolved_charge(c.attempts), c.attempts[0]["budget"]["reservedBytes"])
        self.assertFalse(c.registration_roots)
        self.assertFalse((c.out / "guard-ready.json").exists())
        c.finish(ValueError("original registration failure"))

    def test_sampling_failure_journal_is_saved_on_raise(self):
        c = self.h.make()
        c.initialize()
        self.h.sampling_failure = True
        with self.assertRaisesRegex(RuntimeError, "sampling"):
            c.guard()
        journal = p.read_json(c.out / "job-sampling-diagnostics.json")[1]
        self.assertTrue(journal["sampling"]["failurePreserved"])
        self.h.sampling_failure = False
        c.finish(ValueError("synthetic sampling"))

    def test_fresh_output_and_existing_claim_are_never_adopted(self):
        self.h.output.mkdir(parents=True)
        marker = self.h.output / "old.txt"
        marker.write_text("preserve")
        with self.assertRaisesRegex(ValueError, "Fresh"):
            self.h.make()
        self.assertEqual(marker.read_text(), "preserve")

    def test_exclusive_prior_claim_is_preserved_without_adopting_ownership(self):
        c = self.h.make()
        c.output_root.mkdir()
        old = c.output_root / ("permit-" + c.permit_sha + ".claim.json")
        old.write_bytes(b"old claim must stay byte-identical")
        original = old.read_bytes()
        with self.assertRaises(FileExistsError):
            c.initialize()
        self.assertIsNone(c.claim)
        self.assertIsNone(c.job)
        c.finish(ValueError("exclusive claim rejected"))
        self.assertEqual(old.read_bytes(), original)

    def test_private_stop_and_original_deadline_precede_any_child_launch(self):
        c = self.h.make()
        c.initialize()
        c.stop.write_text("stop")
        with self.assertRaisesRegex(Exception, "STOP"):
            c.execute()
        self.assertFalse(self.h.calls)
        c.finish(ValueError("original STOP"))

    def test_polled_output_budget_counts_exact_outside_claim_and_failed_reserve(self):
        c = self.h.make()
        c.initialize()
        before = c.scratch_bytes()
        c.attempts.append({"status": "failed-unresolved-reserve-retained", "budget": {"reservedBytes": 12345, "sharedMetadataReserveBytes": 4096}})
        self.assertGreaterEqual(c.scratch_bytes(), before + 12345)
        self.assertGreater(c.claim["bytes"], 0)
        c.attempts[0]["budget"]["reservedBytes"] = p.LIMITS["freshOutputBytes"] + 1
        with self.assertRaisesRegex(ValueError, "output budget"):
            c.guard()
        c.attempts.clear()
        c.finish(ValueError("synthetic reserve evidence"))

    def test_gate_barrier_does_not_invoke_artist_before_ready_and_preserves_clock(self):
        c = self.h.make()
        c.initialize()
        binding = p.read_json(c.binding["path"])[1]
        original = copy.deepcopy(binding["deadline"])
        self.h.clock.sleep(119.9)
        with self.assertRaisesRegex(ValueError, "expired"):
            startup.await_ready(binding, now=self.h.clock.time, tick=lambda: self.h.clock.uptime,
                                sleep=self.h.clock.sleep, identity=lambda: self.fail("identity before ready"))
        self.assertEqual(binding["deadline"], original)
        self.assertFalse(self.h.calls)
        c.finish(ValueError("synthetic missing ready"))

    def test_gate_and_snapshot_failures_stop_before_any_artist_import(self):
        c = self.h.make()
        c.initialize()
        c.execute()
        binding = p.read_json(c.binding["path"])[1]
        ready = p.read_json(c.out / "guard-ready.json")[1]
        identity = lambda: ready["childIdentity"]
        actual, checkpoint = startup.await_ready(binding, now=self.h.clock.time,
            tick=lambda: self.h.clock.uptime, sleep=self.h.clock.sleep, identity=identity)
        self.assertEqual(actual, ready)
        (c.snapshot_art / "space.py").write_bytes(b"changed")
        with self.assertRaises(ValueError):
            startup.invoke_metadata(binding, ready, checkpoint,
                                    load_module=lambda file: self.fail("tampered snapshot imported"))
        c.finish(ValueError("synthetic tamper"))

    def test_snapshot_entry_receives_only_exact_metadata_arguments(self):
        c = self.h.make()
        c.initialize()
        c.execute()
        binding = p.read_json(c.binding["path"])[1]
        ready = p.read_json(c.out / "guard-ready.json")[1]
        calls = []
        startup.invoke_metadata(binding, ready, lambda: None,
                                load_module=lambda file: SimpleNamespace(main=lambda args: calls.append(args)))
        self.assertEqual(calls[0][0:2], ["--guard-ready", str(c.out / "guard-ready.json")])
        self.assertNotIn("render", calls[0])
        self.assertIn(str(c.snapshot_art / "input-spec.json"), calls[0])
        c.finish()

    def test_primitive_copy_remains_exact_and_import_created_no_job(self):
        source = (Path(__file__).parent / "winjob.py").read_bytes()
        self.assertEqual(len(source), 22699)
        self.assertEqual(hashlib.sha256(source).hexdigest(), p.PRIMITIVE_SHA)
        self.assertFalse(self.h.calls)


def main():
    global TEMP_ROOT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--temp-root", required=True)
    args = parser.parse_args()
    TEMP_ROOT = p.safe_path(args.temp_root, True)
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(PureGuardChecks))
    print(json.dumps({"scope": "pure/fake API/tiny synthetic files only", "tests": result.testsRun,
                      "passed": result.wasSuccessful(), "actualJobProcessBlenderVdbRuns": 0}))
    return 0 if result.wasSuccessful() else 2


if __name__ == "__main__":
    raise SystemExit(main())
