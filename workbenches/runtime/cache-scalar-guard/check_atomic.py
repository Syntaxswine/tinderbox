"""Interposed pure filesystem checks: no Job, child process, Blender or VDB."""
import argparse
import json
import os
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import guard_policy as p

TEMP_ROOT = None


class AtomicReadyChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="atomic-ready-pure-", dir=TEMP_ROOT)
        self.root = Path(self.temp.name).resolve()
        self.gate = self.root / "guard-ready.json"
        self.pending = self.root / "guard-ready.json.publishing"
        self.value = {"kind": "interposed-test-only", "text": "x" * 2048, "numbers": list(range(50))}
        self.addCleanup(self.close)

    def close(self):
        assert self.root.name.startswith("atomic-ready-pure-") and self.root.parent == Path(TEMP_ROOT).resolve()
        self.temp.cleanup()

    def publish(self):
        return p.write_json(self.gate, self.value, exclusive=True, atomic=True)

    def test_reader_never_sees_final_before_complete_closed_temp_is_published(self):
        opened, renamed, observed = Path.open, os.rename, []
        gate, pending = self.gate, self.pending
        test = self
        active = []

        class Interposed:
            def __init__(self, stream):
                self.stream = stream
                active.append(stream)

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return self.stream.__exit__(*args)

            def write(self, raw):
                test.assertFalse(gate.exists())
                cut = len(raw) // 2
                first = self.stream.write(raw[:cut])
                self.stream.flush()
                observed.append({"duringWriteFinalExists": gate.exists(), "tempBytes": pending.stat().st_size})
                test.assertFalse(gate.exists())
                return first + self.stream.write(raw[cut:])

            def flush(self):
                test.assertFalse(gate.exists())
                return self.stream.flush()

            def fileno(self):
                return self.stream.fileno()

        def opening(path, *args, **kwargs):
            stream = opened(path, *args, **kwargs)
            return Interposed(stream) if path == pending and args == ("xb",) else stream

        def rename(source, target):
            self.assertEqual((source, target), (pending, gate))
            self.assertTrue(active[0].closed)
            self.assertFalse(gate.exists())
            self.assertEqual(json.loads(pending.read_bytes()), self.value)
            observed.append({"beforeRenameFinalExists": gate.exists(), "tempClosed": active[0].closed})
            return renamed(source, target)

        with patch.object(Path, "open", opening), patch.object(p.os, "rename", rename):
            record = self.publish()
        self.assertEqual(len(observed), 2)
        self.assertEqual(p.read_json(gate)[1], self.value)
        self.assertEqual(record["bytes"], gate.stat().st_size)
        self.assertFalse(pending.exists())

    def test_existing_final_is_never_replaced_and_completed_temp_is_preserved(self):
        self.gate.write_bytes(b"immutable existing final")
        original = self.gate.read_bytes()
        with self.assertRaises(FileExistsError):
            self.publish()
        self.assertEqual(self.gate.read_bytes(), original)
        self.assertEqual(json.loads(self.pending.read_bytes()), self.value)
        self.assertEqual(p.tree_bytes(self.root), len(original) + self.pending.stat().st_size)

    def test_existing_temporary_is_not_adopted_retried_or_overwritten(self):
        self.pending.write_bytes(b"retained failed attempt")
        with self.assertRaises(FileExistsError):
            self.publish()
        self.assertFalse(self.gate.exists())
        self.assertEqual(self.pending.read_bytes(), b"retained failed attempt")

    def test_write_and_short_write_failure_leave_only_partial_temp(self):
        opened = Path.open
        for failure in ("raise", "short"):
            with self.subTest(failure=failure):
                def opening(path, *args, **kwargs):
                    stream = opened(path, *args, **kwargs)
                    if path != self.pending or args != ("xb",):
                        return stream
                    class Broken:
                        def __enter__(self):
                            return self
                        def __exit__(self, *values):
                            return stream.__exit__(*values)
                        def write(self, raw):
                            count = stream.write(raw[:5])
                            stream.flush()
                            if failure == "raise":
                                raise OSError("synthetic write failure")
                            return count
                    return Broken()
                with patch.object(Path, "open", opening), patch.object(p.os, "rename") as rename:
                    with self.assertRaises((ValueError, OSError)):
                        self.publish()
                    rename.assert_not_called()
                self.assertFalse(self.gate.exists())
                self.assertEqual(self.pending.stat().st_size, 5)
                # Only this exact newly owned partial fixture is removed to test
                # the second independent branch; production never retries it.
                self.pending.unlink()

    def test_fsync_failure_does_not_publish_or_fallback(self):
        with patch.object(p.os, "fsync", side_effect=OSError("synthetic fsync failure")), patch.object(p.os, "rename") as rename:
            with self.assertRaises(OSError):
                self.publish()
            rename.assert_not_called()
        self.assertFalse(self.gate.exists())
        self.assertEqual(json.loads(self.pending.read_bytes()), self.value)

    def test_rename_failure_retains_closed_complete_temp_without_copy_replace_or_retry(self):
        with patch.object(p.os, "rename", side_effect=OSError("unsupported rename")) as rename, patch.object(p.os, "replace") as replace:
            with self.assertRaises(OSError):
                self.publish()
            self.assertEqual(rename.call_count, 1)
            replace.assert_not_called()
        self.assertFalse(self.gate.exists())
        self.assertEqual(json.loads(self.pending.read_bytes()), self.value)

    def test_unsupported_platform_or_nonexclusive_request_fails_before_temp_creation(self):
        # Module-local proxy leaves pathlib/the host os module unchanged.
        unsupported = SimpleNamespace(name="unsupported", path=os.path)
        with patch.object(p, "os", unsupported):
            with self.assertRaisesRegex(ValueError, "Windows"):
                self.publish()
        with self.assertRaises(ValueError):
            p.write_json(self.gate, self.value, atomic=True)
        self.assertFalse(self.gate.exists() or self.pending.exists())


def main():
    global TEMP_ROOT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--temp-root", required=True)
    args = parser.parse_args()
    TEMP_ROOT = p.safe_path(args.temp_root, True)
    result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(AtomicReadyChecks))
    print(json.dumps({"scope": "pure interposed filesystem, no child/Job/Blender/VDB", "tests": result.testsRun,
                      "passed": result.wasSuccessful()}))
    return 0 if result.wasSuccessful() else 2


if __name__ == "__main__":
    raise SystemExit(main())
