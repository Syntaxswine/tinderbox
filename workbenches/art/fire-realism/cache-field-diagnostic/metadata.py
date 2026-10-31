"""Source-only metadata entry. Never launches Blender or another process.

A separately reviewed controller must launch the exact verified Blender with
--background --factory-startup --disable-autoexec --threads 4, then publish the
bound guard-ready envelope. This entry cannot replace that hard-limit guard.
No renderer, fluid evaluation, cache write, conversion or saved-scene load exists.
"""
import argparse
import ctypes
from ctypes import wintypes as W
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import traceback

from contract import (SOURCE_FILES, hash_file, read_json, require,
                      same_path, validate_ready, validate_spec)
from space import coordinate_report, matrix

HERE = Path(__file__).resolve().parent


def atomic_json(path, value):
    temporary = path.with_name(path.name + ".writing")
    with temporary.open("x", encoding="utf-8", newline="\n") as stream:
        json.dump(value, stream, indent=2, allow_nan=False)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)


def current_identity():
    """Exact decimal FILETIME; no process creation or termination."""
    require(os.name == "nt", "Reviewed Windows execution required")
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.GetCurrentProcess.restype = W.HANDLE
    kernel.GetProcessTimes.argtypes = [W.HANDLE] + [ctypes.POINTER(W.FILETIME)] * 4
    kernel.GetProcessTimes.restype = W.BOOL
    kernel.QueryFullProcessImageNameW.argtypes = [W.HANDLE, W.DWORD, W.LPWSTR, ctypes.POINTER(W.DWORD)]
    kernel.QueryFullProcessImageNameW.restype = W.BOOL
    handle = kernel.GetCurrentProcess()
    a, b, c, d = (W.FILETIME() for _ in range(4))
    if not kernel.GetProcessTimes(handle, *[ctypes.byref(x) for x in (a, b, c, d)]):
        raise OSError(ctypes.get_last_error(), "Read exact child creation time")
    creation = (a.dwHighDateTime << 32) | a.dwLowDateTime
    text = ctypes.create_unicode_buffer(32768)
    size = W.DWORD(len(text))
    if not kernel.QueryFullProcessImageNameW(handle, 0, text, ctypes.byref(size)):
        raise OSError(ctypes.get_last_error(), "Read exact child executable")
    return {"pid": os.getpid(), "creationFileTime": str(creation), "executable": str(Path(text.value).resolve())}


def tick_ms():
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.GetTickCount64.restype = ctypes.c_ulonglong
    return int(kernel.GetTickCount64())


def observe_metadata(bpy, spec, checkpoint, publish):
    """Only ordinary Volume metadata is read. Injectable for pure fake-API tests."""
    require(not bpy.data.filepath, "Fresh factory scene required; never open the saved fluid project")
    require(not any(m.type == "FLUID" for obj in bpy.data.objects for m in obj.modifiers),
            "No live fluid modifier may exist in the diagnostic document")
    report = {"status": "metadata-observation-in-progress", "frames": [],
              "rendererCreated": False, "simulationEvaluated": False, "sourceProjectOpened": False,
              "renderReady": False, "cleanup": []}
    diagnostic_scene = bpy.data.scenes.new("V5 cache metadata only")
    try:
        for selected in spec["selected"]:
            checkpoint()
            volume = obj = None
            frame = {"frame": selected["frame"], "ageSeconds": selected["ageSeconds"],
                     "cache": selected["cache"], "grids": []}
            report["frames"].append(frame)
            try:
                volume = bpy.data.volumes.new("V5 cache frame %d" % selected["frame"])
                volume.filepath = selected["cache"]["path"]
                volume.is_sequence = False
                obj = bpy.data.objects.new(volume.name, volume)
                diagnostic_scene.collection.objects.link(obj)
                frame["untouchedVolumeObjectWorld"] = matrix([list(row) for row in obj.matrix_world])
                require(frame["untouchedVolumeObjectWorld"] == [[1., 0., 0., 0.], [0., 1., 0., 0.],
                        [0., 0., 1., 0.], [0., 0., 0., 1.]], "Untouched Volume object transform changed")
                require(volume.grids.load(), "VDB metadata load failed: " + volume.grids.error_message)
                checkpoint()
                frame["observedGridCount"] = len(volume.grids)
                require(frame["observedGridCount"] <= spec["limits"]["gridCountMaximum"], "Bounded grid count exceeded")
                for grid in volume.grids:
                    require(0 < len(grid.name) <= 128, "Invalid bounded grid name")
                    frame["grids"].append({"name": grid.name, "dataType": grid.data_type,
                                          "channels": grid.channels, "treeLoadedAtObservation": bool(grid.is_loaded),
                                          "indexToObject": matrix([list(row) for row in grid.matrix_object])})
                publish(report)  # Preserve actual names/transforms even if a later gate fails.
                frame["coordinateReconstruction"] = coordinate_report(frame["grids"], selected,
                                                                       spec["space"]["translationNative"])
                frame["heatIdentity"] = {"status": "unassigned-requires-source-review",
                    "observedNames": [g["name"] for g in frame["grids"]],
                    "temperatureNameIsNotAnAlias": True,
                    "rendererAttributeConversion": "Not established; no renderer was created."}
                checkpoint()
            finally:
                failures = []
                for label, action in (("unload metadata", lambda: volume.grids.unload() if volume else None),
                        ("remove own object", lambda: bpy.data.objects.remove(obj, do_unlink=True) if obj else None),
                        ("remove own volume", lambda: bpy.data.volumes.remove(volume) if volume else None)):
                    try:
                        action()
                    except BaseException as error:
                        failures.append({"stage": label, "error": str(error)})
                report["cleanup"].append({"frame": selected["frame"], "failures": failures})
                publish(report)
                require(not failures, "Own metadata resource cleanup failed")
        report["status"] = "metadata-collected-review-required"
        report["renderGate"] = {"status": "blocked", "reasons": [
            "Root must review actual metadata and logical-index/centre alignment lineage.",
            "Actual V5 heat-grid identity and renderer attribute conversion are unproved.",
            "A pinned native camera and separate render authorization do not exist in this entry."]}
        publish(report)
        return report
    finally:
        try:
            bpy.data.scenes.remove(diagnostic_scene)
            report["sceneCleanup"] = {"ownSceneRemoved": True}
        except BaseException as error:
            report["sceneCleanup"] = {"ownSceneRemoved": False, "error": str(error)}
            raise
        finally:
            publish(report)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--guard-ready", required=True)
    parser.add_argument("--input-spec", required=True)
    parser.add_argument("--input-sha256", required=True)
    parser.add_argument("--nonce", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args(argv)
    output = Path(args.output).resolve()
    ready_path = Path(args.guard_ready).resolve()
    require(ready_path == output / "guard-ready.json", "Exact owned guard-ready path required")
    # No wait/retry. The future guard must arrange readiness before script execution.
    require(same_path(args.input_spec, HERE / "input-spec.json"), "Only the pinned additive input spec is supported")
    _, ready = read_json(ready_path, 131072)
    raw, spec = read_json(Path(args.input_spec))
    require(hashlib.sha256(raw).hexdigest() == args.input_sha256, "CLI input pin mismatch")
    spec = validate_spec(spec)
    assigned_root = Path(spec["source"]["stageDirectory"]).resolve().parents[4]
    owned_root = assigned_root / "artifacts/qa/fire-realism/cache-field-diagnostic"
    require(output != owned_root and output.is_relative_to(owned_root.resolve()), "Output escaped assigned fresh QA")
    who = current_identity()
    checkpoint = lambda: validate_ready(ready, spec, args.input_sha256, args.nonce, output, who,
                                        time.time(), tick_ms(), (output / "supervisor.stop").exists())
    checkpoint()
    require(output.is_dir() and not (output / "metadata-report.json").exists() and
            not (output / "metadata-failure.json").exists(), "Fresh guard-owned metadata output required")
    for name in SOURCE_FILES:
        data = (HERE / name).read_bytes()
        require(hashlib.sha256(data).hexdigest() == ready["sourcePins"][name], "Reviewed source changed: " + name)
    binding = output / "run-binding.json"
    binding_raw, _ = read_json(binding, 131072)
    require(hashlib.sha256(binding_raw).hexdigest() == ready["runRecordSha256"], "Stable run binding changed")
    job_path = Path(ready["jobLimitReadback"]["path"])
    job_raw, job = read_json(job_path, 131072)
    require(hashlib.sha256(job_raw).hexdigest() == ready["jobLimitReadback"]["sha256"], "Job receipt changed")
    require(job.get("valid") is True and job.get("actual") == ready["jobLimitReadback"]["actual"], "Numeric Job receipt mismatch")
    inputs = []
    try:
        for record in (spec["tool"]["record"], spec["source"]["savedProject"], spec["source"]["rawManifest"],
                       spec["source"]["prepareReport"], *(s["cache"] for s in spec["selected"])):
            checkpoint()
            inputs.append(hash_file(record, spec["limits"]["selectedCacheBytesMaximum"]))
        atomic_json(output / "input-hashes-before.json", inputs)
        import bpy  # Only the authorized verified Blender can reach this point.
        require(list(bpy.app.version) == spec["tool"]["version"] and
                bpy.app.build_hash.decode() == spec["tool"]["buildHash"], "Actual Blender build mismatch")
        publish = lambda report: atomic_json(output / "metadata-report.json", report)
        observe_metadata(bpy, spec, checkpoint, publish)
    except BaseException as error:
        atomic_json(output / "metadata-failure.json", {"status": "failed-stop-preserve", "error": str(error),
                    "traceback": traceback.format_exc(), "renderReady": False})
        raise
    finally:
        after = []
        for record in inputs:
            try:
                after.append(hash_file(record, spec["limits"]["selectedCacheBytesMaximum"]))
            except BaseException as error:
                after.append({"path": record["path"], "preservationFailed": str(error)})
        atomic_json(output / "input-hashes-after.json", after)
        require(after == inputs, "Read-only input preservation failed; retain all diagnostics")


if __name__ == "__main__":
    main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
