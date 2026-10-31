"""Guard-owned startup barrier; never imports artist code before enrollment.

The controller launches this exact snapshot under the already capped Blender.
There is no renderer, cache writer, Job constructor or child process here.
"""
import argparse
import ctypes
from ctypes import wintypes as W
import importlib.util
import os
from pathlib import Path
import sys
import time
import traceback

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from guard_policy import (ART_FILES, READY_KIND, OWNER, PROPOSAL, digest, hash_file,
                          read_json, remaining, require, safe_path, validate_job, write_json)


def current_identity():
    # Same Win32 identity operations as the pinned primitive; no Job creation.
    require(os.name == "nt", "Windows identity enforcement required")
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.GetCurrentProcess.restype = W.HANDLE
    kernel.GetProcessTimes.argtypes = [W.HANDLE] + [ctypes.POINTER(W.FILETIME)] * 4
    kernel.GetProcessTimes.restype = W.BOOL
    kernel.QueryFullProcessImageNameW.argtypes = [W.HANDLE, W.DWORD, W.LPWSTR, ctypes.POINTER(W.DWORD)]
    kernel.QueryFullProcessImageNameW.restype = W.BOOL
    handle = kernel.GetCurrentProcess()
    times = [W.FILETIME() for _ in range(4)]
    if not kernel.GetProcessTimes(handle, *[ctypes.byref(t) for t in times]):
        raise OSError(ctypes.get_last_error(), "Read startup child creation")
    creation = (times[0].dwHighDateTime << 32) | times[0].dwLowDateTime
    name = ctypes.create_unicode_buffer(32768)
    length = W.DWORD(len(name))
    if not kernel.QueryFullProcessImageNameW(handle, 0, name, ctypes.byref(length)):
        raise OSError(ctypes.get_last_error(), "Read startup child executable")
    return {"pid": os.getpid(), "creationFileTime": str(creation), "executable": str(safe_path(name.value))}


def tick_ms():
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.GetTickCount64.restype = ctypes.c_ulonglong
    return int(kernel.GetTickCount64())


def await_ready(binding, *, now=time.time, tick=tick_ms, sleep=time.sleep,
                identity=current_identity):
    """Only bounded gate-file waiting; fake clock/identity seams run no OS API."""
    output = safe_path(binding["output"], True)
    require(binding["phase"] == "metadata" and binding["owner"] == OWNER and
            binding["proposalCommit"] == PROPOSAL, "Only the metadata binding is supported")
    ready_path = output / "guard-ready.json"
    checkpoint = lambda: remaining(binding["deadline"], now(), tick(), (output / "supervisor.stop").exists())
    while True:
        seconds = checkpoint()
        if ready_path.exists():
            _, ready = read_json(ready_path)
            break  # Malformed/exchanged gates fail; no hot retry.
        sleep(min(.05, seconds))
    require(set(ready) == {"kind", "phase", "owner", "proposalCommit", "candidateCommit", "sourcePins",
            "permitSha256", "inputSpecSha256", "nonce", "output", "runRecordSha256",
            "controllerIdentity", "childIdentity", "deadline", "jobLimitReadback"}, "Exact ready envelope required")
    require(ready["kind"] == READY_KIND, "Wrong ready kind")
    for key in ("phase", "owner", "proposalCommit", "candidateCommit", "sourcePins", "permitSha256",
                "inputSpecSha256", "nonce", "output", "controllerIdentity", "deadline"):
        require(ready[key] == binding[key], "Ready/run binding mismatch: " + key)
    observed = identity()
    require(ready["childIdentity"] == observed, "Ready child is not this exact PID/creation/executable")
    require(int(observed["creationFileTime"]) >= int(ready["controllerIdentity"]["creationFileTime"]),
            "Child precedes original controller")
    raw, _ = read_json(output / "run-binding.json")
    require(digest(raw) == ready["runRecordSha256"], "Immutable run binding changed")
    receipt = ready["jobLimitReadback"]
    require(safe_path(receipt["path"]) == output / "job-limit-readback.json" and receipt["validated"] is True,
            "Exact owned numeric readback required")
    raw, readback = read_json(receipt["path"])
    require(digest(raw) == receipt["sha256"] and readback["valid"] is True and
            readback["actual"] == receipt["actual"], "Numeric Job receipt mismatch")
    validate_job(readback["actual"])
    checkpoint()
    return ready, checkpoint


def invoke_metadata(binding, ready, checkpoint, *, load_module=None):
    """Pinned local modules only; injection is confined to the pure test harness."""
    artist = safe_path(binding["artistDirectory"], True)
    for name in ART_FILES:
        record = binding["sourceSnapshots"][name]
        require(safe_path(record["path"]) == artist / name and record["sha256"] == ready["sourcePins"][name],
                "Artist snapshot mapping mismatch")
        hash_file(record, 1024 * 1024, checkpoint)
    if load_module is None:
        # A fresh document must not silently reuse foreign generic module names.
        for name in ("contract", "space", "_tinderbox_cache_metadata"):
            require(name not in sys.modules, "Foreign/cached metadata module: " + name)
        sys.path.insert(0, str(artist))
        spec = importlib.util.spec_from_file_location("_tinderbox_cache_metadata", artist / "metadata.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        for name in ("contract", "space"):
            require(safe_path(sys.modules[name].__file__) == artist / (name + ".py"), "Foreign local dependency")
    else:
        module = load_module(artist / "metadata.py")
    checkpoint()
    module.main(["--guard-ready", str(Path(binding["output"]) / "guard-ready.json"),
                 "--input-spec", str(artist / "input-spec.json"), "--input-sha256", ready["inputSpecSha256"],
                 "--nonce", ready["nonce"], "--output", ready["output"]])
    checkpoint()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binding", required=True)
    parser.add_argument("--binding-sha256", required=True)
    args = parser.parse_args(argv)
    output = None
    try:
        raw, binding = read_json(args.binding)
        require(digest(raw) == args.binding_sha256, "Startup immutable binding pin mismatch")
        output = safe_path(binding["output"], True)
        require(safe_path(args.binding) == output / "run-binding.json", "Exact run-binding path required")
        # The startup snapshot itself is part of the reviewed closure.
        for name in ("startup.py", "guard_policy.py", "winjob.py"):
            record = binding["sourceSnapshots"][name]
            require(safe_path(record["path"]) == HERE / name, "Startup snapshot escaped owned closure")
            hash_file(record, 1024 * 1024)
        ready, checkpoint = await_ready(binding)
        invoke_metadata(binding, ready, checkpoint)
        write_json(output / "startup-complete.json", {"status": "metadata-entry-returned",
                   "renderReady": False, "runRecordSha256": args.binding_sha256}, exclusive=True)
    except BaseException as error:
        if output is not None:
            write_json(output / "startup-failure.json", {"error": str(error),
                       "traceback": traceback.format_exc(), "renderReady": False}, exclusive=True)
        raise


if __name__ == "__main__":
    main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
