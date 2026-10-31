"""Standalone future guarded entry. Source readiness is NOT a render permit."""
import argparse
import ctypes
import hashlib
import json
import os
import sys
import time
import traceback
from pathlib import Path
from contract import (PHASE, SOURCE_FILES, SPEC_SHA256, hash_file, plain, read_json, require,
                      same_path, validate_ready, validate_spec)
from adapter import BlenderAdapter
from projection import run_protocol

HERE = Path(__file__).resolve().parent


def current_identity():
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.GetCurrentProcess.restype = ctypes.c_void_p
    handle = kernel.GetCurrentProcess()
    kernel.GetProcessTimes.argtypes = [ctypes.c_void_p] + [ctypes.POINTER(ctypes.c_ulonglong)] * 4
    words = [ctypes.c_ulonglong() for _ in range(4)]
    require(kernel.GetProcessTimes(handle, *(ctypes.byref(x) for x in words)), "Exact creation query failed")
    kernel.QueryFullProcessImageNameW.argtypes = [ctypes.c_void_p, ctypes.c_ulong, ctypes.c_wchar_p,
                                                ctypes.POINTER(ctypes.c_ulong)]
    text, size = ctypes.create_unicode_buffer(32768), ctypes.c_ulong(32768)
    require(kernel.QueryFullProcessImageNameW(handle, 0, text, ctypes.byref(size)), "Exact executable query failed")
    return {"pid": os.getpid(), "creationFileTime": str(words[0].value),
            "executable": str(Path(text.value).resolve())}


def tick_ms():
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.GetTickCount64.restype = ctypes.c_ulonglong
    return int(kernel.GetTickCount64())


def write_once(path, value):
    raw = (json.dumps(value, indent=2, allow_nan=False) + "\n").encode()
    require(len(raw) <= 2097152, "Diagnostic JSON output ceiling")
    with Path(path).open("xb") as stream:
        require(stream.write(raw) == len(raw), "Incomplete diagnostic JSON write")
        stream.flush()
        os.fsync(stream.fileno())


def load_bpy_after_gate():
    import bpy
    return bpy


def input_records(spec):
    return [spec["tool"]["record"], spec["source"]["savedProject"], spec["source"]["rawManifest"],
            spec["source"]["prepareReport"], *(x["cache"] for x in spec["selected"]),
            *spec["evidence"].values()]


def validate_evidence(spec):
    _, metadata = read_json(spec["evidence"]["metadataReport"]["path"])
    _, native = read_json(spec["evidence"]["nativeCamera"]["path"])
    require(metadata["renderReady"] is False and metadata["rendererCreated"] is False and
            metadata["simulationEvaluated"] is False and len(metadata["frames"]) == 2,
            "Only the exact observed metadata report is admitted")
    require(native["camera"]["matrixWorld"] == spec["camera"]["nativeWorldColumnMajor"] and
            native["camera"]["matrixWorldInverse"] == spec["camera"]["nativeViewColumnMajor"] and
            native["camera"]["projectionMatrix"] == spec["camera"]["nativeProjectionColumnMajor"],
            "Native camera file/spec identity differs")
    for selected, frame in zip(spec["selected"], metadata["frames"]):
        require(selected["frame"] == frame["frame"] and selected["ageSeconds"] == frame["ageSeconds"] and
                selected["cache"]["sha256"] == frame["cache"]["sha256"], "Metadata cache/age differs")
    return metadata


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--guard-ready", required=True)
    parser.add_argument("--input-spec", required=True)
    parser.add_argument("--input-sha256", required=True)
    parser.add_argument("--nonce", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args(argv)
    require(same_path(args.input_spec, HERE / "fixed-spec.json"), "Only the exact sibling fixed spec")
    raw, spec = read_json(args.input_spec)
    require(hashlib.sha256(raw).hexdigest() == args.input_sha256 == SPEC_SHA256, "Fixed input bytes differ")
    validate_spec(spec)
    output = plain(args.output).resolve()
    assigned = Path(spec["source"]["stageDirectory"]).resolve().parents[4]
    require(output.parent == (assigned / "artifacts/qa/fire-realism/cache-scalar-projections").resolve(),
            "Fresh output escaped assigned scalar QA")
    ready_path = plain(args.guard_ready).resolve()
    require(ready_path == output / "guard-ready.json", "Exact private ready path")
    ready_raw, ready = read_json(ready_path, 131072)
    ready_sha, who = hashlib.sha256(ready_raw).hexdigest(), current_identity()

    def checkpoint():
        validate_ready(ready, spec, args.input_sha256, args.nonce, output, who,
                       time.time(), tick_ms(), (output / "supervisor.stop").exists())
        current, _ = read_json(ready_path, 131072)
        require(hashlib.sha256(current).hexdigest() == ready_sha, "Immutable ready changed")

    checkpoint()
    require(not any((output / name).exists() for name in
            ("projection-report.json", "projection-failure.json", "projection-input-hashes-before.json",
             "projection-input-hashes-after.json")), "Fresh child output required")
    for selected in spec["selected"]:
        for channel in ("density", "flame", "signedHeat"):
            require(not (output / ("scalar-frame%03d-%s.exr" % (selected["frame"], channel))).exists(),
                    "Prior projection output exists")
    for name in SOURCE_FILES:
        source_path = plain(HERE / name)
        before = source_path.stat()
        require(0 < before.st_size <= 262144, "Source ceiling before allocation")
        with source_path.open("rb") as stream:
            source = stream.read(262145)
        after = source_path.stat()
        require((before.st_size, before.st_mtime_ns) == (after.st_size, after.st_mtime_ns) and
                len(source) == before.st_size and hashlib.sha256(source).hexdigest() == ready["sourcePins"][name],
                "Reviewed source closure changed: " + name)
    binding_raw, _ = read_json(output / "run-binding.json", 131072)
    require(hashlib.sha256(binding_raw).hexdigest() == ready["runRecordSha256"], "Run binding changed")
    job_raw, job = read_json(ready["jobLimitReadback"]["path"], 131072)
    require(hashlib.sha256(job_raw).hexdigest() == ready["jobLimitReadback"]["sha256"] and
            job.get("valid") is True and job.get("actual") == ready["jobLimitReadback"]["actual"],
            "Numeric initial Job receipt differs")
    report = {"kind": "tinderbox-v5-six-cached-scalar-projections-v1", "phase": PHASE,
              "sourcePins": ready["sourcePins"], "inputSpecSha256": args.input_sha256,
              "guardReadySha256": ready_sha, "childIdentity": who,
              "actualGridValueIdentityClaimed": False, "renderPermitIsSeparate": True}
    inputs, problem, problem_trace, progress = [], None, None, 0

    def publish(value):
        nonlocal progress
        require(progress < 32, "Fixed diagnostic progress bound")
        destination = output / ("projection-progress-%03d.json" % progress)
        progress += 1
        write_once(destination, value)

    try:
        # These are streamed identity reads, not VDB decoding or raw-field conversion.
        for record in input_records(spec):
            inputs.append(hash_file(record, 16777216, checkpoint))
        executable = {"path": who["executable"], "bytes": 96106968,
                      "sha256": spec["tool"]["executableSha256"]}
        report["verifiedExecutable"] = hash_file(executable, 134217728, checkpoint)
        write_once(output / "projection-input-hashes-before.json", inputs)
        metadata = validate_evidence(spec)
        checkpoint()
        bpy = load_bpy_after_gate()
        require(list(bpy.app.version) == spec["tool"]["version"] and
                bpy.app.build_hash.decode() == spec["tool"]["buildHash"] and
                same_path(bpy.app.binary_path, spec["tool"]["executable"]), "Actual Blender runtime differs")
        report["actualTool"] = {"version": list(bpy.app.version),
                               "buildHash": bpy.app.build_hash.decode(), "binaryPath": bpy.app.binary_path}
        adapter = BlenderAdapter(bpy, spec, metadata, output, checkpoint)
        run_protocol(adapter, spec, checkpoint, publish, report)
    except BaseException as error:
        problem, problem_trace = error, traceback.format_exc()
    finally:
        after = []
        for record in inputs:
            try:
                after.append(hash_file(record, 16777216, checkpoint))
            except BaseException as error:
                after.append({"path": record["path"], "preservationFailed":
                              type(error).__name__ + ": " + str(error)})
        try:
            write_once(output / "projection-input-hashes-after.json", after)
            require(after == inputs, "Read-only input preservation did not complete")
        except BaseException as error:
            report["preservationFailure"] = type(error).__name__ + ": " + str(error)
            if problem is None:
                problem, problem_trace = error, traceback.format_exc()
    if problem is not None:
        write_once(output / "projection-failure.json", {"status": "failed-stop-preserve-no-retry",
                   "error": type(problem).__name__ + ": " + str(problem), "traceback": problem_trace,
                   "partial": report})
        raise problem
    write_once(output / "projection-report.json", report)
    return report


if __name__ == "__main__":
    main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
