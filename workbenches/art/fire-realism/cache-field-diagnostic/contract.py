"""Pure cache-diagnostic contract. No Blender, process or Job work on import."""
import hashlib
import json
import math
import re
from pathlib import Path

PROPOSAL = "d3d14bf1d7154e4324317e93d876313eeba39a65"
OWNER = "01a17e9b-a6db-7490-94cd-7d863747e5d3"
CAP = 2147483648
READY_KIND = "tinderbox-cache-field-guard-ready-v1"
SHA = re.compile(r"[0-9a-f]{64}")
SOURCE_FILES = ("contract.py", "space.py", "metadata.py", "input-spec.json", "input-spec.schema.json", "guard-ready.schema.json", "provenance.json", "render-plan.json")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def finite(value):
    return type(value) in (int, float) and math.isfinite(value)


def same_path(a, b):
    return Path(a).resolve() == Path(b).resolve()


def pairs(items):
    result = {}
    for key, value in items:
        require(key not in result, "Duplicate JSON key: " + key)
        result[key] = value
    return result


def parse_json(raw):
    require(len(raw) <= 4 * 1024 * 1024, "Bounded metadata JSON exceeded")
    return json.loads(raw, object_pairs_hook=pairs,
                      parse_constant=lambda x: (_ for _ in ()).throw(ValueError("Nonfinite JSON: " + x)))


def read_json(path, maximum=4 * 1024 * 1024):
    path = Path(path)
    before = path.stat()
    require(not path.is_symlink() and not getattr(before, "st_file_attributes", 0) & 0x400,
            "Reparse JSON rejected")
    require(before.st_size <= maximum, "Metadata JSON byte ceiling exceeded before allocation")
    raw = path.read_bytes()
    after = path.stat()
    require(len(raw) == before.st_size and (before.st_size, before.st_mtime_ns) ==
            (after.st_size, after.st_mtime_ns), "Metadata JSON changed during read")
    return raw, parse_json(raw)


def hash_file(record, maximum):
    """Exact-sized, streamed read; no cache conversion or retained dense field."""
    path = Path(record["path"])
    require(type(record["bytes"]) is int and 0 <= record["bytes"] <= maximum, "Input byte ceiling")
    require(bool(SHA.fullmatch(record["sha256"])), "Input SHA-256 required")
    before = path.stat()
    require(not path.is_symlink() and not getattr(before, "st_file_attributes", 0) & 0x400,
            "Reparse input rejected")
    require(before.st_size == record["bytes"], "Pinned input size mismatch: " + str(path))
    h = hashlib.sha256()
    count = 0
    with path.open("rb") as stream:
        while True:
            block = stream.read(min(1024 * 1024, maximum - count + 1))
            if not block:
                break
            count += len(block)
            require(count <= record["bytes"], "Input grew during read")
            h.update(block)
    after = path.stat()
    require((before.st_size, before.st_mtime_ns) == (after.st_size, after.st_mtime_ns), "Input changed during read")
    digest = h.hexdigest()
    require(count == record["bytes"] and digest == record["sha256"], "Pinned input hash mismatch: " + str(path))
    return {"path": str(path.resolve()), "bytes": count, "sha256": digest}


def validate_spec(spec):
    require(set(spec) == {"version", "id", "proposalCommit", "owner", "phase", "tool", "limits", "source",
                         "selected", "space", "requiredLiteralGrids", "heatIdentity", "renderEnabled"},
            "Unsupported input-spec fields")
    require(spec["version"] == 1 and spec["proposalCommit"] == PROPOSAL and spec["owner"] == OWNER,
            "Wrong diagnostic authority")
    require(spec["phase"] == "metadata" and spec["renderEnabled"] is False, "Only metadata phase exists")
    require(spec["limits"] == {"wallSeconds": 120, "processCommittedBytes": CAP,
            "aggregateCommittedBytes": CAP, "freshOutputBytes": 536870912, "threads": 4,
            "selectedCacheBytesMaximum": 16777216, "gridCountMaximum": 64,
            "automaticRetries": 0, "automaticRepairs": 0}, "Fixed limits changed")
    require(spec["tool"]["version"] == [4, 5, 15] and spec["tool"]["buildHash"] == "5afeabba6097",
            "Wrong pinned Blender build")
    require(spec["tool"]["executableSha256"] == "935e4bed28e51d08b8e1fbcc31dcccc000cc1c3dd065d82dcb1da813e75db795",
            "Wrong verified executable")
    require(spec["source"]["cacheHashLineage"]["producerVdbHashesAvailable"] is False,
            "New cache hashes cannot impersonate producer receipts")
    require(spec["requiredLiteralGrids"] == ["density", "flame"], "Literal grid contract changed")
    require(len(spec["selected"]) == 2, "Exactly two selected frames")
    stage = Path(spec["source"]["stageDirectory"]).resolve()
    for selected, frame in zip(spec["selected"], (31, 61)):
        require(selected["frame"] == frame and selected["ageSeconds"] == (frame - 1) / 30, "Frame/age mismatch")
        require(selected["resolution"] == [48, 48, 96], "Resolution changed")
        require(same_path(selected["cache"]["path"], stage / "cache/data" / ("fluid_data_%04d.vdb" % frame)),
                "Cache path escaped selected V5 input")
        require(all(finite(x) and x > 0 for x in selected["voxelSize"]), "Voxel dimensions required")
        require(len(selected["scalarCentreOriginBlender"]) == 3 and
                all(finite(x) for x in selected["scalarCentreOriginBlender"]), "Scalar origin required")
        for axis in range(3):
            require(selected["scalarCentreOriginBlender"][axis] ==
                    selected["domainBoundsBlender"]["min"][axis] + selected["voxelSize"][axis] / 2,
                    "Authoritative scalar-centre origin changed")
        require(set(selected["originalExportChannels"]) == {"density", "temperature", "flame"}, "Export identities required")
        require(all(r["bytes"] == 884736 and SHA.fullmatch(r["sha256"])
                    for r in selected["originalExportChannels"].values()), "Original full-sized export identities")
    require(spec["space"]["translationNative"] == [5.5, 0, 8.5], "Native transform changed")
    return spec


def validate_identity(value):
    require(type(value["pid"]) is int and value["pid"] > 0, "Exact PID required")
    require(type(value["creationFileTime"]) is str and re.fullmatch(r"[0-9]{17,20}", value["creationFileTime"]),
            "New FILETIME must be exact decimal text, never a rounded JS number")
    require(Path(value["executable"]).is_absolute(), "Exact executable required")


def remaining(ready, now_epoch, now_tick, stop=False):
    d = ready["deadline"]
    require(not stop, "Private STOP requested")
    require(all(finite(d[k]) for k in ("startEpoch", "startTickMs", "deadlineEpoch", "deadlineTickMs")),
            "Finite original clocks required")
    require(d["wallSeconds"] == 120 and d["deadlineEpoch"] == d["startEpoch"] + 120 and
            d["deadlineTickMs"] == d["startTickMs"] + 120000, "Original metadata deadline changed")
    seconds = min(d["deadlineEpoch"] - now_epoch, (d["deadlineTickMs"] - now_tick) / 1000)
    require(0 < seconds <= 120, "Original UTC/uptime deadline expired or replenished")
    return seconds


def validate_ready(ready, spec, input_sha, nonce, output, current_identity, now_epoch, now_tick, stop=False):
    require(ready["kind"] == READY_KIND and ready["phase"] == "metadata", "Wrong guard phase")
    require(ready["owner"] == OWNER and ready["proposalCommit"] == PROPOSAL, "Guard authority mismatch")
    require(re.fullmatch(r"[0-9a-f]{40}", ready["candidateCommit"]), "Exact candidate commit required")
    require(ready["inputSpecSha256"] == input_sha and ready["nonce"] == nonce and
            re.fullmatch(r"[0-9a-f]{32,64}", nonce), "Guard/input/nonce mismatch")
    require(same_path(ready["output"], output), "Wrong owned output")
    require(SHA.fullmatch(ready["permitSha256"]) and SHA.fullmatch(ready["runRecordSha256"]), "Guard receipt pins required")
    for name in SOURCE_FILES:
        require(SHA.fullmatch(ready["sourcePins"].get(name, "")), "Missing reviewed source pin: " + name)
    for identity in (ready["controllerIdentity"], ready["childIdentity"], current_identity):
        validate_identity(identity)
    require(ready["childIdentity"]["pid"] == current_identity["pid"] and
            ready["childIdentity"]["creationFileTime"] == current_identity["creationFileTime"] and
            same_path(ready["childIdentity"]["executable"], current_identity["executable"]), "Child identity mismatch")
    require(same_path(current_identity["executable"], spec["tool"]["executable"]), "Wrong child executable")
    require(int(current_identity["creationFileTime"]) >= int(ready["controllerIdentity"]["creationFileTime"]),
            "Child precedes controller")
    start = (int(ready["controllerIdentity"]["creationFileTime"]) - 116444736000000000) / 10000000
    require(abs(start - ready["deadline"]["startEpoch"]) < .0001, "Deadline not bound to controller creation")
    readback = ready["jobLimitReadback"]
    require(readback["validated"] is True and SHA.fullmatch(readback["sha256"]), "Numeric Job receipt required")
    require(same_path(Path(readback["path"]).parent, output), "Job readback must be owned output")
    actual = readback["actual"]
    require(actual["processLimitBytes"] == CAP and actual["aggregateLimitBytes"] == CAP and
            type(actual["flags"]) is int and actual["flags"] & 0x2300 == 0x2300 and
            not actual["flags"] & 0x1800, "Hard caps/breakaway state mismatch")
    return remaining(ready, now_epoch, now_tick, stop)
