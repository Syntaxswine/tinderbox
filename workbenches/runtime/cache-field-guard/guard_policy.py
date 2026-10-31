"""Pure metadata-only guard contract. No Job/process/Blender work on import."""
import hashlib
import json
import math
import os
import re
from pathlib import Path

OWNER = "01a17e9b-a6db-7490-94cd-7d863747e5d3"
PROPOSAL = "d3d14bf1d7154e4324317e93d876313eeba39a65"
KIND = "tinderbox-cache-field-authorization-v1"
READY_KIND = "tinderbox-cache-field-guard-ready-v1"
GUARD_FILES = ("guard.py", "guard_policy.py", "startup.py", "winjob.py", "guard-provenance.json", "permit.schema.json")
ART_FILES = ("contract.py", "space.py", "metadata.py", "input-spec.json", "input-spec.schema.json",
             "guard-ready.schema.json", "provenance.json", "render-plan.json")
SOURCE_FILES = GUARD_FILES + ART_FILES
PRIMITIVE_SHA = "2763cb83251ee15077b27acce03e448904888eaee2ed978f6fd79ffd94e8b8ee"
UTILITY_SHA = "7931a5c42fedfa345d8b5a9a402e63ac248116a2cc7e5b621d223d9187876b5d"
BLENDER_SHA = "935e4bed28e51d08b8e1fbcc31dcccc000cc1c3dd065d82dcb1da813e75db795"
LIMITS = {"wallSeconds": 120, "processCommittedBytes": 2147483648,
          "aggregateCommittedBytes": 2147483648, "freshOutputBytes": 536870912,
          "threads": 4, "automaticRetries": 0, "automaticRepairs": 0}
JSON_MAX = 131072
SOURCE_MAX = 1024 * 1024
SHA = re.compile(r"[0-9a-f]{64}")


def require(ok, message):
    if not ok:
        raise ValueError(message)


def pairs(items):
    result = {}
    for key, value in items:
        require(key not in result, "Duplicate JSON key: " + key)
        result[key] = value
    return result


def safe_path(value, exists=False):
    """Reject junctions before resolving, including existing ancestors of new paths."""
    p = Path(value)
    require(p.is_absolute(), "Explicit absolute path required")
    p = Path(os.path.abspath(p))
    for candidate in (p, *p.parents):
        try:
            info = candidate.lstat()
        except FileNotFoundError:
            continue
        require(not candidate.is_symlink() and not getattr(info, "st_file_attributes", 0) & 0x400,
                "Reparse path refused: " + str(candidate))
    if exists:
        require(p.exists(), "Required path missing: " + str(p))
    return p.resolve()


def below(value, parent):
    p, root = safe_path(value), safe_path(parent)
    require(p != root and p.is_relative_to(root), "Path escaped exact owned root")
    return p


def read_json(path, maximum=JSON_MAX):
    p = safe_path(path, True)
    before = p.stat()
    require(p.is_file() and 0 < before.st_size <= maximum, "Bounded JSON size required")
    raw = p.read_bytes()
    after = p.stat()
    require(len(raw) == before.st_size and (before.st_size, before.st_mtime_ns) ==
            (after.st_size, after.st_mtime_ns), "JSON changed during read")
    value = json.loads(raw, object_pairs_hook=pairs,
                       parse_constant=lambda v: (_ for _ in ()).throw(ValueError("Nonfinite JSON: " + v)))
    return raw, value


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def hash_file(record, maximum, checkpoint=lambda: None):
    require(set(record) == {"path", "bytes", "sha256"}, "Exact raw file identity required")
    require(type(record["bytes"]) is int and 0 <= record["bytes"] <= maximum and
            SHA.fullmatch(record["sha256"]), "Invalid bounded raw identity")
    p = safe_path(record["path"], True)
    before = p.stat()
    require(p.is_file() and before.st_size == record["bytes"], "Pinned file length mismatch: " + str(p))
    h = hashlib.sha256()
    count = 0
    with p.open("rb") as stream:
        while True:
            checkpoint()
            block = stream.read(min(1024 * 1024, record["bytes"] - count + 1))
            if not block:
                break
            count += len(block)
            require(count <= record["bytes"], "Input grew during read")
            h.update(block)
    checkpoint()
    after = p.stat()
    require((before.st_size, before.st_mtime_ns) == (after.st_size, after.st_mtime_ns) and
            count == record["bytes"] and h.hexdigest() == record["sha256"],
            "Pinned file changed: " + str(p))
    return {"path": str(p), "bytes": count, "sha256": h.hexdigest()}


def own_record(path, maximum=SOURCE_MAX):
    p = safe_path(path, True)
    require(p.is_file() and p.stat().st_size <= maximum, "Owned metadata size exceeded")
    raw = p.read_bytes()
    return {"path": str(p), "bytes": len(raw), "sha256": digest(raw)}


def write_json(path, value, exclusive=False):
    p = safe_path(path)
    raw = (json.dumps(value, indent=2, allow_nan=False) + "\n").encode("utf-8")
    require(len(raw) <= 4 * 1024 * 1024, "Bounded own JSON output exceeded")
    if exclusive:
        with p.open("xb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
    else:
        temporary = p.with_name(p.name + ".writing")
        with temporary.open("xb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, p)
    return {"path": str(p), "bytes": len(raw), "sha256": digest(raw)}


def tree_bytes(folder):
    root = safe_path(folder, True)
    total = 0
    for base, dirs, files in os.walk(root, followlinks=False):
        for name in dirs + files:
            safe_path(Path(base) / name, True)
        total += sum((Path(base) / name).stat().st_size for name in files)
    return total


def json_identity(identity):
    require(type(identity["pid"]) is int and identity["pid"] > 0 and
            type(identity["creationFileTime"]) is int and identity["creationFileTime"] > 0,
            "Exact raw process identity required")
    return {"pid": identity["pid"], "creationFileTime": str(identity["creationFileTime"]),
            "executable": str(safe_path(identity["executable"]))}


def validate_job(actual):
    require(type(actual["processLimitBytes"]) is int and type(actual["aggregateLimitBytes"]) is int and
            actual["processLimitBytes"] == LIMITS["processCommittedBytes"] and
            actual["aggregateLimitBytes"] == LIMITS["aggregateCommittedBytes"] and
            type(actual["flags"]) is int and actual["flags"] == 0x2300,
            "Exact hard committed caps and disabled breakaway required")


def deadline(identity, now_epoch, now_tick):
    start = (identity["creationFileTime"] - 116444736000000000) / 10000000
    require(math.isfinite(now_epoch) and math.isfinite(now_tick) and now_epoch >= start,
            "Actual controller creation/clock required")
    tick = now_tick - (now_epoch - start) * 1000
    require(tick >= 0, "Invalid controller creation uptime")
    return {"startEpoch": start, "startTickMs": tick, "deadlineEpoch": start + 120,
            "deadlineTickMs": tick + 120000, "wallSeconds": 120}


def remaining(d, now_epoch, now_tick, stop=False):
    require(not stop, "Private STOP requested")
    require(d["wallSeconds"] == 120 and d["deadlineEpoch"] == d["startEpoch"] + 120 and
            d["deadlineTickMs"] == d["startTickMs"] + 120000, "Original120s deadline changed")
    require(all(type(v) in (int, float) and math.isfinite(v) for v in
                (now_epoch, now_tick, *[d[k] for k in ("startEpoch", "startTickMs", "deadlineEpoch", "deadlineTickMs")])),
            "Finite dual clocks required")
    require(now_tick >= d["startTickMs"] and now_epoch >= d["startEpoch"], "Original clock rewound")
    value = min(d["deadlineEpoch"] - now_epoch, (d["deadlineTickMs"] - now_tick) / 1000)
    require(0 < value <= 120, "Original metadata lifetime expired")
    return value


def validate_spec(spec):
    require(type(spec["version"]) is int and spec["version"] == 1 and spec["owner"] == OWNER and spec["proposalCommit"] == PROPOSAL and
            spec["phase"] == "metadata" and spec["renderEnabled"] is False,
            "Only the exact metadata source contract is implemented")
    expected = {**LIMITS, "selectedCacheBytesMaximum": 16777216, "gridCountMaximum": 64}
    require(spec["limits"] == expected and all(type(v) is int for v in spec["limits"].values()), "Fixed typed diagnostic limits changed")
    require(spec["tool"]["version"] == [4, 5, 15] and spec["tool"]["buildHash"] == "5afeabba6097" and
            spec["tool"]["executableSha256"] == BLENDER_SHA, "Wrong exact Blender tool")
    require(len(spec["selected"]) == 2 and spec["requiredLiteralGrids"] == ["density", "flame"],
            "Exactly the two reviewed cache frames are supported")
    stage = safe_path(spec["source"]["stageDirectory"], True)
    require(stage.name == "stage-2026-10-31-v5", "Only retired V5 cache input is supported")
    for item, frame in zip(spec["selected"], (31, 61)):
        require(item["frame"] == frame and item["ageSeconds"] == (frame - 1) / 30 and
                item["resolution"] == [48, 48, 96], "Frame/age/native shape changed")
        require(safe_path(item["cache"]["path"]) == stage / "cache/data" / ("fluid_data_%04d.vdb" % frame),
                "Selected cache escaped pinned V5")
    require(spec["source"]["cacheHashLineage"]["producerVdbHashesAvailable"] is False,
            "New cache hashes are not producer raw-identity proof")
    return safe_path(stage.parent.parent / "cache-field-diagnostic")


def validate_permit(permit, permit_path, input_record, spec, output, now_epoch):
    fields = {"version", "kind", "phase", "owner", "proposalCommit", "candidateCommit", "sourcePins",
              "sourceBytes", "inputSpec", "tool", "controllerExecutable", "output", "authorizationPath",
              "issuedAtEpoch", "notAfterEpoch", "nonce", "limits"}
    require(set(permit) == fields and type(permit["version"]) is int and permit["version"] == 1 and permit["kind"] == KIND,
            "Exact NEW metadata permit required; no authoring/render/bake permit")
    require(permit["phase"] == "metadata" and permit["owner"] == OWNER and
            permit["proposalCommit"] == PROPOSAL and re.fullmatch(r"[0-9a-f]{40}", permit["candidateCommit"]),
            "Permit authority/phase mismatch")
    require(permit["limits"] == LIMITS and all(type(v) is int for v in permit["limits"].values()) and
            re.fullmatch(r"[0-9a-f]{32,64}", permit["nonce"]),
            "Permit limit/nonce mismatch")
    require(all(type(permit[k]) in (int, float) and math.isfinite(permit[k])
                for k in ("issuedAtEpoch", "notAfterEpoch")) and
            permit["issuedAtEpoch"] <= now_epoch < permit["notAfterEpoch"], "Permit expired/not issued")
    require(safe_path(permit["authorizationPath"]) == safe_path(permit_path) and
            safe_path(permit["output"]) == output and permit["inputSpec"] == input_record,
            "Exact command/input/output/authorization path mismatch")
    require(set(permit["sourcePins"]) == set(SOURCE_FILES) == set(permit["sourceBytes"]),
            "Complete unique guard and artist closure required")
    require(all(SHA.fullmatch(permit["sourcePins"][name]) and type(permit["sourceBytes"][name]) is int and
                0 < permit["sourceBytes"][name] <= SOURCE_MAX for name in SOURCE_FILES),
            "Bounded complete source identities required")
    require(permit["sourcePins"]["winjob.py"] == PRIMITIVE_SHA and
            permit["sourcePins"]["input-spec.json"] == input_record["sha256"], "Immutable primitive/input pin mismatch")
    require(permit["tool"]["sha256"] == BLENDER_SHA and
            safe_path(permit["tool"]["path"]) == safe_path(spec["tool"]["executable"]) and
            permit["tool"]["record"] == spec["tool"]["record"], "Exact verified Blender/record mismatch")
    require(set(permit["tool"]) == {"path", "bytes", "sha256", "record"}, "Exact tool fields required")


def registration_reserve(spec, identity, sizes, utility_root):
    """Same conservative model as reviewed policy13038f; utility7931a5 is pinned."""
    require(len(sizes) == len(spec["sourceFiles"]) and all(type(n) is int and 0 <= n <= 10 * 1024 * 1024 for n in sizes),
            "Bounded registration source sizes required")
    root = Path(utility_root) / "restart-records" / ("0" * 32) / "registration"
    process = {"pid": identity["pid"], "creationFiletime": identity["creationFileTime"], "executable": identity["executable"]}
    files = [{"original": name, "saved": str(root / (str(i) + "-" + Path(name).name)), "sha256": "0" * 64}
             for i, name in enumerate(spec["sourceFiles"])]
    restart = {"restart": spec["restart"], "owners": spec["owners"], "purpose": spec["purpose"],
               "process": process, "files": files, "automaticRestart": False}
    entry = {**spec, "id": "0" * 32, "process": process, "registeredAt": "Z" * 64,
             "status": "running", "restartRecord": str(root / "restart.json")}
    metadata = sum(len(json.dumps(v, indent=2).encode()) + 1 for v in (restart, entry))
    return {"reservedBytes": sum(sizes) + 2 * metadata + 4096, "sharedMetadataReserveBytes": 4096}


def unresolved_charge(attempts):
    return sum(a["budget"]["sharedMetadataReserveBytes"] if a["status"] == "resolved"
               else a["budget"]["reservedBytes"] for a in attempts)
