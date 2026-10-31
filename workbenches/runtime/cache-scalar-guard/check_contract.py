"""Bounded tiny-file contract/import/result checks; no actual guard/Job/bpy/data.

The only executed artist-shaped code is deliberately synthetic Python below.
Exact142cc JSON is a source oracle, never imported or used to read its inputs.
"""
import argparse
import builtins
import copy
import hashlib
import json
from pathlib import Path
import shutil
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import check_fake as fake
import guard_policy as p
import startup


def snapshot(h):
    h.output.mkdir(parents=True)
    guard_dir, artist_dir = h.output / "source-snapshot/guard", h.output / "source-snapshot/artist"
    guard_dir.mkdir(parents=True)
    artist_dir.mkdir()
    records = {}
    for name in p.SOURCE_FILES:
        folder, source = (guard_dir, h.runtime) if name in p.GUARD_FILES else (artist_dir, h.artist)
        shutil.copyfile(source / name, folder / name)
        records[name] = p.own_record(folder / name)
    identity = {"pid": 4321, "creationFileTime": 116444736000000000 + 1000 * 10000000, "executable": str(h.python)}
    binding = {"kind": "tinderbox-cache-scalar-run-binding-v1", "phase": "scalar-projections", "owner": p.OWNER,
        "proposalCommit": p.PROPOSAL, "candidateCommit": "a" * 40,
        "sourcePins": {n: records[n]["sha256"] for n in p.ART_FILES},
        "guardSourcePins": {n: records[n]["sha256"] for n in p.GUARD_FILES},
        "permitSha256": "d" * 64, "inputSpecSha256": p.SPEC_SHA, "nonce": "b" * 32,
        "output": str(h.output), "deadline": p.deadline(identity, h.clock.time(), h.clock.uptime),
        "controllerIdentity": p.json_identity(identity), "sourceSnapshots": records, "artistDirectory": str(artist_dir)}
    saved = p.write_json(h.output / "run-binding.json", binding, exclusive=True)
    caps = {"processLimitBytes": 2147483648, "aggregateLimitBytes": 2147483648, "flags": 8960}
    job = p.write_json(h.output / "job-limit-readback.json", {"valid": True, "actual": caps}, exclusive=True)
    ready = {k: binding[k] for k in ("phase", "owner", "proposalCommit", "candidateCommit", "sourcePins",
        "permitSha256", "inputSpecSha256", "nonce", "output", "deadline", "controllerIdentity")}
    ready.update({"kind": p.READY_KIND, "runRecordSha256": saved["sha256"],
        "childIdentity": {"pid": 8765, "creationFileTime": str(identity["creationFileTime"] + 1), "executable": str(h.blender)},
        "jobLimitReadback": {"path": job["path"], "sha256": job["sha256"], "validated": True, "actual": caps}})
    p.write_json(h.output / "guard-ready.json", ready, exclusive=True)
    return binding, ready


def synthetic_modules(h):
    sources = {"contract.py": "TOKEN = 'VERIFIED'\n",
        "coordinates.py": "from contract import TOKEN\n", "scalar.py": "from contract import TOKEN\n",
        "preview.py": "from contract import TOKEN\n", "adapter.py": "import coordinates, scalar, preview\n",
        "projection.py": "from contract import TOKEN\n",
        "entry.py": "import builtins\nfrom contract import TOKEN\nimport adapter, projection\nbuiltins._scalar_calls.append('entry-imported')\ndef main(args):\n    builtins._scalar_calls.append((TOKEN, args))\n"}
    for name, text in sources.items():
        (h.artist / name).write_text(text, encoding="utf-8", newline="\n")
        h.art_pins[name] = {k: p.own_record(h.artist / name)[k] for k in ("bytes", "sha256")}


class ScalarContractChecks(unittest.TestCase):
    def setUp(self):
        self.h = fake.Harness()
        self.addCleanup(self.h.close)

    def report_fixture(self):
        binding, ready = snapshot(self.h)
        self.h.controller = SimpleNamespace(out=self.h.output, binding=p.own_record(self.h.output / "run-binding.json"))
        self.h.emit_projection_report()
        return p.read_json(self.h.output / "projection-report.json", 2097152)[1], ready

    def test_exact_142cc_fixture_and_new_schema_maps_are_frozen(self):
        raw = (Path(__file__).parent / "fixtures/artist-spec-142ccf2.json").read_bytes()
        self.assertEqual(len(raw), 11930)
        self.assertEqual(hashlib.sha256(raw).hexdigest(), "335f7e6a761ac70b6503db45629354f09265b93ec2e2964a4d43836db840a5a8")
        canonical = json.dumps(json.loads(raw), sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
        self.assertEqual(p.digest(canonical), "8ca4b816cb2fb4761b12aaaeaaae1dbd07a177d373abba90a37d9ec5f17cc095")
        schema = json.loads((Path(__file__).parent / "permit.schema.json").read_bytes())
        self.assertEqual(set(schema["properties"]["sourcePins"]["required"]), set(p.SOURCE_FILES))
        self.assertEqual((len(p.ART_FILES), len(p.GUARD_FILES), len(p.SOURCE_FILES)), (11, 6, 17))
        self.assertFalse(schema["additionalProperties"])

    def test_binding_distinguishes11_artist6_guard17_snapshots_and_refuses_unknown_or_old_fields(self):
        binding, ready = snapshot(self.h)
        self.assertEqual(p.validate_binding(binding), binding)
        self.assertEqual(len(ready["sourcePins"]), 11)
        for mutate in (lambda b: b.update(kind="tinderbox-cache-field-run-binding-v1"),
                lambda b: b["sourcePins"].update(b["guardSourcePins"]), lambda b: b["guardSourcePins"].pop("startup.py"),
                lambda b: b.update(extra=True), lambda b: b["sourceSnapshots"].pop("preview.py")):
            changed = copy.deepcopy(binding)
            mutate(changed)
            with self.assertRaises(ValueError):
                p.validate_binding(changed)

    def test_all11_precede_import_even_when_last_json_is_tampered(self):
        synthetic_modules(self.h)
        binding, ready = snapshot(self.h)
        (Path(binding["artistDirectory"]) / "provenance.json").write_bytes(b"changed after snapshot")
        with patch.object(builtins, "_scalar_calls", [], create=True):
            with self.assertRaises(ValueError):
                startup.invoke_scalar(binding, ready, lambda: None)
            self.assertEqual(builtins._scalar_calls, [])

    def test_adjacent_verified_import_wins_foreign_path_and_retires_all_own_module_names(self):
        synthetic_modules(self.h)
        binding, ready = snapshot(self.h)
        foreign = self.h.root / "foreign"
        foreign.mkdir()
        (foreign / "contract.py").write_text("raise RuntimeError('foreign module executed')\n")
        before = list(sys.meta_path)
        with patch.object(sys, "path", [str(foreign), *sys.path]), patch.object(builtins, "_scalar_calls", [], create=True):
            startup.invoke_scalar(binding, ready, lambda: None)
            self.assertEqual(builtins._scalar_calls[0], "entry-imported")
            self.assertEqual(builtins._scalar_calls[1][0], "VERIFIED")
            self.assertEqual(builtins._scalar_calls[1][1][2:4], ["--input-spec", str(Path(binding["artistDirectory"]) / "fixed-spec.json")])
        self.assertEqual(sys.meta_path, before)
        self.assertTrue(all(name not in sys.modules for name in startup.MODULE_FILES))

    def test_cached_preview_is_refused_without_adopting_removing_or_executing_it(self):
        synthetic_modules(self.h)
        binding, ready = snapshot(self.h)
        sentinel = SimpleNamespace(__file__="foreign-preview")
        with patch.dict(sys.modules, {"preview": sentinel}), patch.object(builtins, "_scalar_calls", [], create=True):
            with self.assertRaisesRegex(ValueError, "Foreign/cached"):
                startup.invoke_scalar(binding, ready, lambda: None)
            self.assertIs(sys.modules["preview"], sentinel)
            self.assertEqual(builtins._scalar_calls, [])

    def test_gate_uses_numeric_receipt_and_both_original_clocks_without_renewal(self):
        binding, ready = snapshot(self.h)
        actual, _ = startup.await_ready(binding, now=self.h.clock.time, tick=lambda: self.h.clock.uptime,
            identity=lambda: ready["childIdentity"])
        self.assertEqual(actual, ready)
        with self.assertRaises(ValueError):
            startup.await_ready(binding, now=lambda: 1001., tick=lambda: binding["deadline"]["deadlineTickMs"],
                identity=lambda: ready["childIdentity"])
        (self.h.output / "supervisor.stop").write_text("stop")
        with self.assertRaisesRegex(ValueError, "STOP"):
            startup.await_ready(binding, now=self.h.clock.time, tick=lambda: self.h.clock.uptime,
                identity=lambda: ready["childIdentity"])

    def test_original_quality17_is_valid_and_all12_named_files_are_independently_hashed(self):
        report, ready = self.report_fixture()
        inventory = p.validate_projection_report(report, self.h.spec, self.h.output, ready)
        self.assertEqual(len(inventory), 12)
        self.assertTrue(all(p.hash_file(row, 8388608) == row for row in inventory))
        self.assertTrue(all(row["preview"]["restoredExrFormat"]["quality"] == 17 for row in report["projections"]))

    def test_ready_nested_unknown_fields_and_nondecimal_identity_cannot_reach_artist(self):
        binding, original = snapshot(self.h)
        for mutate in (lambda r: r["childIdentity"].update(extra=True),
                lambda r: r["childIdentity"].update(creationFileTime=116444746000000001),
                lambda r: r["jobLimitReadback"].update(extra=True),
                lambda r: r["jobLimitReadback"]["actual"].update(extra=True),
                lambda r: r["jobLimitReadback"]["actual"].update(flags=True)):
            changed = copy.deepcopy(original)
            mutate(changed)
            # Deliberately corrupt only this synthetic fixture, not an actual gate.
            p.write_json(self.h.output / "guard-ready.json", changed)
            with self.assertRaises(ValueError):
                startup.await_ready(binding, now=self.h.clock.time, tick=lambda: self.h.clock.uptime,
                    identity=lambda: self.fail("Malformed nested ready reached identity/import"))

    def test_preview_restoration_derivation_extra_render_and_quality_flags_cannot_pass(self):
        report, ready = self.report_fixture()
        for mutate in (lambda r: r["projections"][0]["preview"]["restoredExrFormat"].update(quality=95),
                lambda r: r["projections"][0]["preview"].update(derivedFromExrSha256="a" * 64),
                lambda r: r["projections"][0]["preview"].update(additionalRenders=1),
                lambda r: r.update(nativeQualityAcceptance=True), lambda r: r.update(extra=True),
                lambda r: r["cleanup"][0].update(removed=False),
                lambda r: r["preparation"]["settings"].append({"property": "device", "actual": "GPU"})):
            changed = copy.deepcopy(report)
            mutate(changed)
            with self.assertRaises(ValueError):
                p.validate_projection_report(changed, self.h.spec, self.h.output, ready)

    def test_missing_corrupt_oversized_or_extra_images_preserve_failure_without_substitution(self):
        report, ready = self.report_fixture()
        preview = Path(report["projections"][0]["preview"]["path"])
        original = preview.read_bytes()
        preview.write_bytes(b"corruption with a different checksum")
        with self.assertRaises(ValueError):
            p.validate_projection_report(report, self.h.spec, self.h.output, ready)
        preview.write_bytes(original)
        extra = self.h.output / "extra.jpg"
        extra.write_bytes(b"synthetic extra")
        with self.assertRaisesRegex(ValueError, "Unexpected image"):
            p.validate_projection_report(report, self.h.spec, self.h.output, ready)
        extra.unlink()  # Only this exact new synthetic fixture, never actual output.
        changed = copy.deepcopy(report)
        changed["projections"][0]["bytes"] = 8388609
        with self.assertRaises(ValueError):
            p.validate_projection_report(changed, self.h.spec, self.h.output, ready)
        preview.unlink()
        with self.assertRaises((ValueError, FileNotFoundError)):
            p.validate_projection_report(report, self.h.spec, self.h.output, ready)

    def test_unknown_owned_output_is_not_hidden_by_image_only_inventory(self):
        report, ready = self.report_fixture()
        (self.h.output / "unexpected.txt").write_text("preserve unexpected evidence")
        with self.assertRaisesRegex(ValueError, "Unexpected owned output"):
            p.validate_projection_report(report, self.h.spec, self.h.output, ready)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--temp-root", required=True)
    args = parser.parse_args()
    fake.TEMP_ROOT = p.safe_path(args.temp_root, True)
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(ScalarContractChecks))
    print(json.dumps({"scope": "synthetic source/import/output protocol only; no actual artist/bpy/Job/VDB/image",
        "tests": result.testsRun, "passed": result.wasSuccessful(), "actualRuns": 0}))
    return 0 if result.wasSuccessful() else 2


if __name__ == "__main__":
    raise SystemExit(main())
