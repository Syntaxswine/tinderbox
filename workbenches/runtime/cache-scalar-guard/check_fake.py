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
    def __init__(self, pid, executable, owner, scalar=False):
        self.pid, self.executable, self.owner, self.scalar = pid, executable, owner, scalar
        self._handle, self.returncode = pid, None

    def poll(self):
        if self.scalar and self.returncode is None and (self.owner.controller.out / "guard-ready.json").exists():
            out = self.owner.controller.out
            self.owner.emit_projection_report()
            # Artist-owned filenames must not collide with guard preservation.
            p.write_json(out / "projection-input-hashes-before.json", ["artist fixture"])
            p.write_json(out / "projection-input-hashes-after.json", ["artist fixture"])
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
        actual = self.info()  # Match the unchanged real primitive, including both peaks.
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
        self.output_root = stage.parent.parent / "cache-scalar-projections"
        selected = []
        for frame in (31, 61):
            file = stage / "cache/data" / ("fluid_data_%04d.vdb" % frame)
            file.write_bytes(b"tiny non-VDB synthetic bytes")
            selected.append({"frame": frame, "ageSeconds": (frame - 1) / 30,
                             "resolution": [48, 48, 96], "cache": p.own_record(file)})
        # The committed fixture is exact142cc JSON, not an artist import or data read.
        fixture_raw = (Path(__file__).parent / "fixtures/artist-spec-142ccf2.json").read_bytes()
        assert hashlib.sha256(fixture_raw).hexdigest() == "335f7e6a761ac70b6503db45629354f09265b93ec2e2964a4d43836db840a5a8"
        self.spec = json.loads(fixture_raw)
        self.spec["tool"]["executable"] = str(self.blender)
        self.spec["tool"]["record"] = p.own_record(tool)
        self.spec["selected"] = [{**original, **tiny} for original, tiny in zip(self.spec["selected"], selected)]
        self.spec["source"].update({"stageDirectory": str(stage), "savedProject": p.own_record(stage / "surface-source.blend"),
            "rawManifest": p.own_record(stage / "raw-manifest.json"), "prepareReport": p.own_record(stage / "prepare.json")})
        for key in self.spec["evidence"]:
            file = self.root / ("synthetic-" + key + ".json")
            file.write_bytes(b"tiny synthetic evidence, never parsed as native data")
            self.spec["evidence"][key] = p.own_record(file)
        for name in p.SOURCE_FILES:
            folder = self.runtime if name in p.GUARD_FILES else self.artist
            (folder / name).write_bytes(b"synthetic source " + name.encode())
        (self.runtime / "winjob.py").write_bytes((Path(__file__).parent / "winjob.py").read_bytes())
        p.write_json(self.artist / "fixed-spec.json", self.spec)
        (self.artist / "source-pins.json").write_bytes(b"synthetic support inventory")
        self.output = self.output_root / "new-run"
        self.permit_path = self.auth / "scalar-projections.json"
        sources = {name: p.own_record((self.runtime if name in p.GUARD_FILES else self.artist) / name) for name in p.SOURCE_FILES}
        self.permit = {"version": 1, "kind": p.KIND, "phase": "scalar-projections", "owner": p.OWNER,
            "proposalCommit": p.PROPOSAL, "candidateCommit": "a" * 40,
            "sourcePins": {n: r["sha256"] for n, r in sources.items()},
            "sourceBytes": {n: r["bytes"] for n, r in sources.items()},
            "inputSpec": p.own_record(self.artist / "fixed-spec.json"),
            "tool": {**p.own_record(self.blender), "bytes": 96106968, "sha256": p.BLENDER_SHA, "record": p.own_record(tool)},
            "controllerExecutable": p.own_record(self.python), "output": str(self.output),
            "authorizationPath": str(self.permit_path), "issuedAtEpoch": 900., "notAfterEpoch": 2000.,
            "nonce": "b" * 32, "limits": dict(p.LIMITS)}
        p.write_json(self.permit_path, self.permit, exclusive=True)
        self.layout = {"guard": self.runtime, "artist": self.artist, "auth": self.auth.parent,
                       "cleanup": self.utility, "cwd": self.root}
        # Explicit test-only pins admit tiny sandbox bytes; no runtime CLI bypass.
        self.art_pins = {name: {k: sources[name][k] for k in ("bytes", "sha256")} for name in p.ART_FILES}
        self.stack.enter_context(patch.object(p, "ART_PINS", self.art_pins))
        self.stack.enter_context(patch.object(p, "SPEC_SHA", self.permit["inputSpec"]["sha256"]))
        self.stack.enter_context(patch.object(p, "SPEC_CANONICAL_SHA", p.digest(json.dumps(self.spec, sort_keys=True, separators=(",", ":"), allow_nan=False).encode())))
        self.stack.enter_context(patch.object(guard, "ART_INVENTORY", {k: p.own_record(self.artist / "source-pins.json")[k] for k in ("bytes", "sha256")}))
        self.report_mutation = lambda report: None
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

    def emit_projection_report(self):
        c = self.controller
        ready = p.read_json(c.out / "guard-ready.json")[1]
        view = {"viewTransform": "Standard", "look": "None", "exposure": 0., "gamma": 1., "displayDevice": "sRGB"}
        jpg = {"file_format": "JPEG", "color_mode": "RGB", "color_depth": "8", "color_management": "FOLLOW_SCENE", "quality": 95, "exr_codec": "ZIP"}
        restored = {**jpg, "file_format": "OPEN_EXR", "color_mode": "RGBA", "color_depth": "32", "quality": 17}
        settings = [{"rna": "FixtureRNA", "property": key, "actual": value} for key, value in
                    (("engine", "CYCLES"), ("threads", 4), ("device", "CPU"), ("samples", 8))]
        for _ in range(7):
            for value in (95, 17):
                settings.append({"rna": "ImageFormatSettings", "property": "quality", "type": "INT", "requested": value, "actual": value})
        projections = []
        for frame in (31, 61):
            for channel in ("density", "flame", "signedHeat"):
                stem = "scalar-frame%03d-%s" % (frame, channel)
                exr, preview = c.out / (stem + ".exr"), c.out / (stem + ".jpg")
                exr.write_bytes(b"tiny synthetic non-image EXR bytes")
                preview.write_bytes(b"tiny synthetic non-image JPG bytes")
                original = p.own_record(exr)
                projections.append({**original, "frame": frame, "sourceAgeSeconds": (frame - 1) / 30, "channel": channel,
                    "nodes": {}, "inspection": {"emptyRgb": True}, "rerun": False,
                    "preview": {**p.own_record(preview), "additionalRenders": 0, "normalization": False,
                        "clippingProne": True, "format": dict(jpg), "view": dict(view), "restoredExrFormat": dict(restored),
                        "derivedFromExrSha256": original["sha256"], "linearExrUnchanged": True, "loadedFloatImageUnchanged": True}})
        report = {"kind": "tinderbox-v5-six-cached-scalar-projections-v1", "phase": "scalar-projections",
            "sourcePins": ready["sourcePins"], "inputSpecSha256": p.SPEC_SHA, "guardReadySha256": p.own_record(c.out / "guard-ready.json")["sha256"],
            "childIdentity": ready["childIdentity"], "actualGridValueIdentityClaimed": False, "renderPermitIsSeparate": True,
            "verifiedExecutable": {"path": str(self.blender), "bytes": 96106968, "sha256": p.BLENDER_SHA},
            "actualTool": {"version": [4, 5, 15], "buildHash": "5afeabba6097", "binaryPath": str(self.blender)},
            "status": "six-offline-scalar-projections-diagnostic-only", "projections": projections,
            "frames": [{"frame": frame, "sourceAgeSeconds": (frame - 1) / 30} for frame in (31, 61)],
            "nativeQualityAcceptance": False, "gpuCostCredit": False, "warnings": ["SYNTHETIC API ONLY"],
            "preparation": {"sourceProjectOpened": False, "fluidEvaluated": False, "hasLinearOutputColorSpace": True,
                "fileColorManagement": "FOLLOW_SCENE", "settings": settings,
                "previewPreflight": {"format": dict(jpg), "view": dict(view), "restoredBeforeAnyRender": True, "additionalRenders": 0}},
            "camera": {}, "cleanup": [{"id": 0, "label": "fake resource", "removed": True}]}
        self.report_mutation(report)
        p.write_json(c.out / "projection-report.json", report, exclusive=True)
        p.write_json(c.out / "startup-complete.json", {"kind": "tinderbox-cache-scalar-startup-result-v1",
            "status": "scalar-entry-returned", "diagnosticOnly": True, "runRecordSha256": c.binding["sha256"]}, exclusive=True)

    def make(self):
        args = SimpleNamespace(permit=str(self.permit_path), input_spec=str(self.artist / "fixed-spec.json"),
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
        scalar = command[0] == str(self.blender)
        child = Child(pid, command[0], self, scalar)
        self.processes[pid] = child
        self.calls.append({"command": command, "env": options["env"], "scalar": scalar})
        if not scalar:
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

    def test_scalar_only_authority_rejects_old_render_bake_and_changed_limits(self):
        h = self.h
        for key, value in (("version", True), ("phase", "render"), ("phase", "bake"), ("kind", "tinderbox-surface-source-authorization-v1"),
                           ("owner", "other"), ("proposalCommit", "c" * 40), ("nonce", "short")):
            candidate = copy.deepcopy(h.permit)
            candidate[key] = value
            with self.assertRaises(ValueError):
                p.validate_permit(candidate, h.permit_path, h.permit["inputSpec"], h.spec, h.output, 1000)
        candidate = copy.deepcopy(h.permit)
        candidate["limits"]["wallSeconds"] = 120
        with self.assertRaises(ValueError):
            p.validate_permit(candidate, h.permit_path, h.permit["inputSpec"], h.spec, h.output, 1000)
        changed_spec = copy.deepcopy(h.spec)
        changed_spec["version"] = True
        with self.assertRaises(ValueError):
            p.validate_spec(changed_spec)

    def test_complete_source_closure_and_exact_primitive_are_required(self):
        for mutation in (lambda v: v["sourcePins"].pop("preview.py"),
                         lambda v: v["sourcePins"].update({"extra.py": "a" * 64}),
                         lambda v: v["sourcePins"].update({"winjob.py": "a" * 64})):
            candidate = copy.deepcopy(self.h.permit)
            mutation(candidate)
            with self.assertRaises(ValueError):
                p.validate_permit(candidate, self.h.permit_path, self.h.permit["inputSpec"], self.h.spec, self.h.output, 1000)

    def test_original_creation_exact900s_and_decimal_filetime(self):
        who = {"pid": 1, "creationFileTime": 134379091985924153, "executable": str(self.h.python)}
        start = (who["creationFileTime"] - 116444736000000000) / 10000000
        d = p.deadline(who, start + 5, 100000.)
        self.assertEqual(p.json_identity(who)["creationFileTime"], "134379091985924153")
        self.assertAlmostEqual(p.remaining(d, start + 5, 100000), 895.)
        for epoch, tick, stop in ((start + 900, 995000, False), (start + 5, d["startTickMs"] - 1, False), (start + 5, 100000, True)):
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
        bound = p.read_json(c.out / "run-binding.json")[1]
        self.assertEqual((len(ready["sourcePins"]), len(bound["guardSourcePins"]), len(bound["sourceSnapshots"])), (11, 6, 17))
        self.assertEqual(len(c.inputs_before), 13)
        self.assertTrue({r["path"] for r in self.h.spec["evidence"].values()}.issubset({r["path"] for r in c.inputs_before}))
        self.assertEqual(len(c.sources_before), 34)
        for group in ("source", "support", "binding"):
            self.assertEqual(p.read_json(c.out / ("guard-" + group + "-hashes-before.json"))[1],
                             p.read_json(c.out / ("guard-" + group + "-hashes-after.json"))[1])
        self.assertEqual(p.read_json(c.out / "scalar-result.json")[1]["kind"], "tinderbox-cache-scalar-result-v1")
        self.assertEqual(len(p.read_json(c.out / "scalar-result.json")[1]["outputInventory"]), 12)
        self.assertEqual([v["role"] for v in c.attempts], ["controller", "scalar-blender"])
        self.assertTrue(all(v["status"] == "resolved" for v in c.attempts))
        self.assertEqual(p.read_json(c.out / "projection-input-hashes-before.json")[1], ["artist fixture"])
        self.assertEqual(p.read_json(c.out / "guard-input-hashes-after.json")[1], c.inputs_before)
        call = [v for v in self.h.calls if v["scalar"]][0]
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
        self.h.clock.sleep(899.9)
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
        (c.snapshot_art / "preview.py").write_bytes(b"changed")
        with self.assertRaises(ValueError):
            startup.invoke_scalar(binding, ready, checkpoint,
                                    load_module=lambda file: self.fail("tampered snapshot imported"))
        c.finish(ValueError("synthetic tamper"))

    def test_snapshot_entry_receives_only_exact_scalar_arguments(self):
        c = self.h.make()
        c.initialize()
        c.execute()
        binding = p.read_json(c.binding["path"])[1]
        ready = p.read_json(c.out / "guard-ready.json")[1]
        calls = []
        startup.invoke_scalar(binding, ready, lambda: None,
                                load_module=lambda file: SimpleNamespace(main=lambda args: calls.append(args)))
        self.assertEqual(calls[0][0:2], ["--guard-ready", str(c.out / "guard-ready.json")])
        self.assertNotIn("--render-frame", calls[0])
        self.assertIn(str(c.snapshot_art / "fixed-spec.json"), calls[0])
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
