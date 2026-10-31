"""Guard-owned startup barrier; never imports artist code before enrollment.

The controller launches this exact snapshot under the already capped Blender.
There is no renderer, cache writer, Job constructor or child process here.
"""
import argparse
import ctypes
from ctypes import wintypes as W
import importlib.util
import importlib.abc
import os
from pathlib import Path
import sys
import time
import traceback

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from guard_policy import (ART_FILES, GUARD_FILES, READY_KIND, OWNER, PROPOSAL, digest, hash_file,
                          read_json, remaining, require, safe_path, validate_binding, validate_identity, validate_job, write_json)


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
    validate_binding(binding)
    output = safe_path(binding["output"], True)
    require(binding["phase"] == "scalar-projections" and binding["owner"] == OWNER and
            binding["proposalCommit"] == PROPOSAL, "Only the scalar binding is supported")
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
    validate_identity(ready["controllerIdentity"])
    validate_identity(ready["childIdentity"])
    receipt = ready["jobLimitReadback"]
    require(set(receipt) == {"path", "sha256", "validated", "actual"} and
            set(receipt["actual"]) == {"processLimitBytes", "aggregateLimitBytes", "flags"},
            "Exact numeric ready receipt fields required")
    validate_job(receipt["actual"])
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


MODULE_FILES = {name: name + ".py" for name in ("contract", "coordinates", "scalar", "preview", "adapter", "projection")}
MODULE_FILES["_tinderbox_cache_scalar"] = "entry.py"


class VerifiedArtistImport(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    """Only seven fixed names; no packages, sys.path fallback or pyc execution."""
    def __init__(self, binding, checkpoint):
        self.binding, self.checkpoint, self.loaded = binding, checkpoint, {}

    def create_module(self, spec):
        return None

    def find_spec(self, fullname, path=None, target=None):
        if fullname not in MODULE_FILES:
            return None
        record = self.binding["sourceSnapshots"][MODULE_FILES[fullname]]
        return importlib.util.spec_from_file_location(fullname, record["path"], loader=self)

    def exec_module(self, module):
        name = module.__name__
        require(name in MODULE_FILES, "Unlisted local artist module")
        record = self.binding["sourceSnapshots"][MODULE_FILES[name]]
        self.checkpoint()
        hash_file(record, 1024 * 1024, self.checkpoint)
        file = safe_path(record["path"], True)
        before = file.stat()
        with file.open("rb") as stream:
            raw = stream.read(record["bytes"] + 1)
        after = file.stat()
        require(len(raw) == record["bytes"] and digest(raw) == record["sha256"] and
                (before.st_size, before.st_mtime_ns) == (after.st_size, after.st_mtime_ns), "Source changed at import")
        module.__file__ = str(file)
        self.loaded[name] = module
        self.checkpoint()
        exec(compile(raw, str(file), "exec", dont_inherit=True), module.__dict__)
        require(safe_path(module.__file__) == file, "Imported local origin changed")
        self.checkpoint()

    def retire(self):
        if self in sys.meta_path:
            sys.meta_path.remove(self)
        for name, module in self.loaded.items():
            if sys.modules.get(name) is module:
                del sys.modules[name]


def invoke_scalar(binding, ready, checkpoint, *, load_module=None):
    validate_binding(binding)
    artist = safe_path(binding["artistDirectory"], True)
    for name in MODULE_FILES:
        require(name not in sys.modules, "Foreign/cached artist module: " + name)
    # Entry imports execute helpers at top level: hash ALL11 first, not only entry.
    for name in ART_FILES:
        record = binding["sourceSnapshots"][name]
        require(safe_path(record["path"]) == artist / name and record["sha256"] == ready["sourcePins"][name],
                "Artist snapshot mapping mismatch")
        hash_file(record, 1024 * 1024, checkpoint)
    loader = VerifiedArtistImport(binding, checkpoint)
    try:
        if load_module is None:
            sys.meta_path.insert(0, loader)
            spec = loader.find_spec("_tinderbox_cache_scalar")
            module = importlib.util.module_from_spec(spec)
            sys.modules[spec.name] = module
            loader.exec_module(module)
            require(set(loader.loaded) == set(MODULE_FILES), "Complete fixed local module closure did not load")
            for name, loaded in loader.loaded.items():
                require(safe_path(loaded.__file__) == artist / MODULE_FILES[name], "Foreign local dependency")
                hash_file(binding["sourceSnapshots"][MODULE_FILES[name]], 1024 * 1024, checkpoint)
        else:
            module = load_module(artist / "entry.py")  # Pure fixture seam, not a CLI option.
        checkpoint()
        module.main(["--guard-ready", str(Path(binding["output"]) / "guard-ready.json"),
                     "--input-spec", str(artist / "fixed-spec.json"), "--input-sha256", ready["inputSpecSha256"],
                     "--nonce", ready["nonce"], "--output", ready["output"]])
        checkpoint()
    finally:
        loader.retire()

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
        validate_binding(binding)
        remaining(binding["deadline"], time.time(), tick_ms(), (output / "supervisor.stop").exists())
        # The complete startup snapshot is part of the reviewed closure.
        for name in GUARD_FILES:
            record = binding["sourceSnapshots"][name]
            require(safe_path(record["path"]) == HERE / name, "Startup snapshot escaped owned closure")
            hash_file(record, 1024 * 1024)
        ready, checkpoint = await_ready(binding)
        invoke_scalar(binding, ready, checkpoint)
        write_json(output / "startup-complete.json", {"kind": "tinderbox-cache-scalar-startup-result-v1", "status": "scalar-entry-returned",
                   "diagnosticOnly": True, "runRecordSha256": args.binding_sha256}, exclusive=True)
    except BaseException as error:
        if output is not None:
            write_json(output / "startup-failure.json", {"error": str(error),
                       "traceback": traceback.format_exc(), "diagnosticOnly": True}, exclusive=True)
        raise


if __name__ == "__main__":
    main(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
