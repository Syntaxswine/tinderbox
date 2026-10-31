"""Pure scalar-only guard contract. No Job/process/Blender work on import."""
import hashlib
import json
import math
import os
import re
from pathlib import Path

OWNER = "01a17e9b-a6db-7490-94cd-7d863747e5d3"
PROPOSAL = "c73c0fb3f266859c68c2f2f4c7b5a4a9b1a2b792"
KIND = "tinderbox-cache-scalar-authorization-v1"
READY_KIND = "tinderbox-cache-scalar-guard-ready-v1"
GUARD_FILES = ("guard.py", "guard_policy.py", "startup.py", "winjob.py", "guard-provenance.json", "permit.schema.json")
ART_FILES = ("contract.py", "coordinates.py", "scalar.py", "adapter.py", "projection.py", "entry.py", "fixed-spec.json", "fixed-spec.schema.json", "guard-ready.schema.json", "provenance.json", "preview.py")
ART_PINS = {
  "contract.py": {
    "bytes": 10271,
    "sha256": "9413105bfdec47d91143dc6aa209a0aae0c94a58186104d995364b2efad9fbd6"
  },
  "coordinates.py": {
    "bytes": 5707,
    "sha256": "6683d64dc5192ed5f83a59110e84ff339cd4b038db90b8ac59c3c7133fb315c1"
  },
  "scalar.py": {
    "bytes": 6307,
    "sha256": "8a5637f4b160c509b882574b78d24cb49d6621d7bbce86e8a68a50700e1bdbb3"
  },
  "adapter.py": {
    "bytes": 18206,
    "sha256": "f13ccb79789fa624d6d5aabddfe92779148082b49e713ec870a65f883758190e"
  },
  "projection.py": {
    "bytes": 3149,
    "sha256": "e5a33dad543897ed12103b53b2dd47ef1307e43b953b2a64f37289444b4ec415"
  },
  "entry.py": {
    "bytes": 9696,
    "sha256": "4d18290429180b30a6477f5349ddf31d2475df9c9b82e1f1b52cd2cca422d702"
  },
  "fixed-spec.json": {
    "bytes": 11930,
    "sha256": "335f7e6a761ac70b6503db45629354f09265b93ec2e2964a4d43836db840a5a8"
  },
  "fixed-spec.schema.json": {
    "bytes": 13050,
    "sha256": "1a9094fbf08b38caf03165736b7e79d93c3e66811338ff0c821fc1a0e031ea99"
  },
  "guard-ready.schema.json": {
    "bytes": 5463,
    "sha256": "81a42e0184fe58885e4510a3174205c4bf0eab9c85a26c17bb263f3f7d5ac285"
  },
  "provenance.json": {
    "bytes": 7219,
    "sha256": "c34c6642166e803d00c9b59dd2d6fde32f9f11a2a92e4c6bc6fcbdcb5e420087"
  },
  "preview.py": {
    "bytes": 3641,
    "sha256": "af25176fe20b8c931d4cabdb9daca53ad7384cec6df7616d9323ce3f213158df"
  }
}
SPEC_SHA = "335f7e6a761ac70b6503db45629354f09265b93ec2e2964a4d43836db840a5a8"
SPEC_CANONICAL_SHA = "8ca4b816cb2fb4761b12aaaeaaae1dbd07a177d373abba90a37d9ec5f17cc095"
ART_INVENTORY = {"bytes": 2123, "sha256": "b8d296a26828cef094b3e18ae180e00c69fac5ab2e50b7a3d643347b7cdfb2e1"}
SOURCE_FILES = GUARD_FILES + ART_FILES
PRIMITIVE_SHA = "2763cb83251ee15077b27acce03e448904888eaee2ed978f6fd79ffd94e8b8ee"
UTILITY_SHA = "7931a5c42fedfa345d8b5a9a402e63ac248116a2cc7e5b621d223d9187876b5d"
BLENDER_SHA = "935e4bed28e51d08b8e1fbcc31dcccc000cc1c3dd065d82dcb1da813e75db795"
LIMITS = {"wallSeconds": 900, "processCommittedBytes": 2147483648,
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
    require(p.is_file() and p.stat().st_size <= maximum, "Owned scalar size exceeded")
    raw = p.read_bytes()
    return {"path": str(p), "bytes": len(raw), "sha256": digest(raw)}


def write_json(path, value, exclusive=False, atomic=False):
    p = safe_path(path)
    raw = (json.dumps(value, indent=2, allow_nan=False) + "\n").encode("utf-8")
    require(len(raw) <= 4 * 1024 * 1024, "Bounded own JSON output exceeded")
    if atomic:
        require(exclusive and os.name == "nt", "Atomic no-replace publication requires Windows rename")
        temporary = p.with_name(p.name + ".publishing")
        # A failed/temp file is preserved and never adopted/retried. Only ready
        # uses this path; it is inside the already-counted fresh output tree.
        with temporary.open("xb") as stream:
            require(stream.write(raw) == len(raw), "Incomplete ready temporary write")
            stream.flush()
            os.fsync(stream.fileno())
        require(temporary.stat().st_size == len(raw), "Incomplete closed ready temporary")
        # CPython/Windows os.rename uses MoveFileExW(flags=0): neither replace
        # nor cross-volume copy. Other platforms deliberately have no fallback.
        os.rename(temporary, p)
    elif exclusive:
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
    return {"startEpoch": start, "startTickMs": tick, "deadlineEpoch": start + 900,
            "deadlineTickMs": tick + 900000, "wallSeconds": 900}


def remaining(d, now_epoch, now_tick, stop=False):
    require(not stop, "Private STOP requested")
    require(d["wallSeconds"] == 900 and d["deadlineEpoch"] == d["startEpoch"] + 900 and
            d["deadlineTickMs"] == d["startTickMs"] + 900000, "Original900s deadline changed")
    require(all(type(v) in (int, float) and math.isfinite(v) for v in
                (now_epoch, now_tick, *[d[k] for k in ("startEpoch", "startTickMs", "deadlineEpoch", "deadlineTickMs")])),
            "Finite dual clocks required")
    require(now_tick >= d["startTickMs"] and now_epoch >= d["startEpoch"], "Original clock rewound")
    value = min(d["deadlineEpoch"] - now_epoch, (d["deadlineTickMs"] - now_tick) / 1000)
    require(0 < value <= 900, "Original scalar lifetime expired")
    return value


def validate_spec(spec):
    canonical = json.dumps(spec, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
    require(digest(canonical) == SPEC_CANONICAL_SHA, "Complete fixed scalar recipe changed")
    require(type(spec["version"]) is int and spec["version"] == 1 and spec["owner"] == OWNER and
            spec["proposalCommit"] == PROPOSAL and spec["phase"] == "scalar-projections", "Only reviewed scalar projections")
    expected = {**LIMITS, "selectedCacheBytesMaximum": 16777216, "gridCountMaximum": 64, "outputFileBytesMaximum": 8388608}
    require(spec["limits"] == expected and all(type(v) is int for v in spec["limits"].values()), "Fixed typed scalar limits changed")
    require(spec["tool"]["version"] == [4, 5, 15] and spec["tool"]["buildHash"] == "5afeabba6097" and
            spec["tool"]["executableSha256"] == BLENDER_SHA, "Wrong exact Blender tool")
    stage = safe_path(spec["source"]["stageDirectory"], True)
    require(stage.name == "stage-2026-10-31-v5", "Only retired V5 cache input")
    require(len(spec["selected"]) == 2 and len(spec["evidence"]) == 5, "Exact two phases/five evidence records")
    for item, frame in zip(spec["selected"], (31, 61)):
        require(type(item["frame"]) is int and item["frame"] == frame and item["ageSeconds"] == (frame - 1) / 30 and
                item["resolution"] == [48, 48, 96], "Frame/age/shape changed")
        require(safe_path(item["cache"]["path"]) == stage / "cache/data" / ("fluid_data_%04d.vdb" % frame), "Wrong selected cache")
    require(spec["source"]["cacheHashLineage"]["producerVdbHashesAvailable"] is False, "No producer bit identity claim")
    return safe_path(stage.parent.parent / "cache-scalar-projections")

def validate_permit(permit, permit_path, input_record, spec, output, now_epoch):
    fields = {"version", "kind", "phase", "owner", "proposalCommit", "candidateCommit", "sourcePins",
              "sourceBytes", "inputSpec", "tool", "controllerExecutable", "output", "authorizationPath",
              "issuedAtEpoch", "notAfterEpoch", "nonce", "limits"}
    require(set(permit) == fields and type(permit["version"]) is int and permit["version"] == 1 and permit["kind"] == KIND,
            "Exact NEW scalar permit required; no metadata/authoring/bake permit")
    require(permit["phase"] == "scalar-projections" and permit["owner"] == OWNER and
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
            permit["sourcePins"]["fixed-spec.json"] == input_record["sha256"] == SPEC_SHA, "Immutable primitive/input pin mismatch")
    require(permit["tool"]["sha256"] == BLENDER_SHA and
            safe_path(permit["tool"]["path"]) == safe_path(spec["tool"]["executable"]) and
            permit["tool"]["record"] == spec["tool"]["record"], "Exact verified Blender/record mismatch")
    require(set(permit["tool"]) == {"path", "bytes", "sha256", "record"}, "Exact tool fields required")
    require(set(input_record) == {"path", "bytes", "sha256"} and input_record["sha256"] == SPEC_SHA and
            input_record["bytes"] == ART_PINS["fixed-spec.json"]["bytes"], "Exact fixed-spec bytes required")
    for name, identity in ART_PINS.items():
        require(permit["sourcePins"][name] == identity["sha256"] and permit["sourceBytes"][name] == identity["bytes"],
                "Wrong reviewed artist source: " + name)
    for record in (permit["controllerExecutable"], permit["inputSpec"], permit["tool"]["record"]):
        require(set(record) == {"path", "bytes", "sha256"} and type(record["bytes"]) is int and
                0 < record["bytes"] <= 536870912 and type(record["sha256"]) is str and SHA.fullmatch(record["sha256"]),
                "Exact bounded identity required")
    require(type(permit["tool"]["bytes"]) is int and permit["tool"]["bytes"] == 96106968, "Exact executable extent")



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
    scalar = sum(len(json.dumps(v, indent=2).encode()) + 1 for v in (restart, entry))
    return {"reservedBytes": sum(sizes) + 2 * scalar + 4096, "sharedMetadataReserveBytes": 4096}


def unresolved_charge(attempts):
    return sum(a["budget"]["sharedMetadataReserveBytes"] if a["status"] == "resolved"
               else a["budget"]["reservedBytes"] for a in attempts)


def validate_identity(value):
    require(set(value) == {"pid", "creationFileTime", "executable"} and type(value["pid"]) is int and
            value["pid"] > 0 and type(value["creationFileTime"]) is str and
            re.fullmatch(r"[0-9]{17,20}", value["creationFileTime"]), "Exact decimal process identity required")
    safe_path(value["executable"])


def validate_binding(binding):
    fields = {"kind", "phase", "owner", "proposalCommit", "candidateCommit", "sourcePins", "guardSourcePins",
              "permitSha256", "inputSpecSha256", "nonce", "output", "deadline", "controllerIdentity",
              "sourceSnapshots", "artistDirectory"}
    require(set(binding) == fields and binding["kind"] == "tinderbox-cache-scalar-run-binding-v1" and
            binding["phase"] == "scalar-projections" and binding["owner"] == OWNER and
            binding["proposalCommit"] == PROPOSAL, "Exact scalar run binding required")
    require(re.fullmatch(r"[0-9a-f]{40}", binding["candidateCommit"]) and
            re.fullmatch(r"[0-9a-f]{32,64}", binding["nonce"]) and
            SHA.fullmatch(binding["permitSha256"]) and binding["inputSpecSha256"] == SPEC_SHA, "Run identity differs")
    require(set(binding["sourcePins"]) == set(ART_FILES) and set(binding["guardSourcePins"]) == set(GUARD_FILES) and
            set(binding["sourceSnapshots"]) == set(SOURCE_FILES), "Exact11/6/17 source maps required")
    out = safe_path(binding["output"], True)
    require(safe_path(binding["artistDirectory"]) == out / "source-snapshot/artist", "Exact artist snapshot required")
    for name in SOURCE_FILES:
        record = binding["sourceSnapshots"][name]
        expected = binding["guardSourcePins"] if name in GUARD_FILES else binding["sourcePins"]
        folder = "guard" if name in GUARD_FILES else "artist"
        require(set(record) == {"path", "bytes", "sha256"} and type(record["bytes"]) is int and
                0 < record["bytes"] <= SOURCE_MAX and SHA.fullmatch(record["sha256"]) and
                record["sha256"] == expected[name] and safe_path(record["path"]) == out / "source-snapshot" / folder / name,
                "Snapshot record escaped exact source mapping: " + name)
        if name in ART_FILES:
            require(record["bytes"] == ART_PINS[name]["bytes"] and record["sha256"] == ART_PINS[name]["sha256"],
                    "Unreviewed artist snapshot: " + name)
    require(binding["guardSourcePins"]["winjob.py"] == PRIMITIVE_SHA, "Primitive differs")
    validate_identity(binding["controllerIdentity"])
    d = binding["deadline"]
    require(set(d) == {"startEpoch", "startTickMs", "deadlineEpoch", "deadlineTickMs", "wallSeconds"} and
            type(d["wallSeconds"]) is int and d["wallSeconds"] == 900, "Exact original deadline fields")
    start = (int(binding["controllerIdentity"]["creationFileTime"]) - 116444736000000000) / 10000000
    require(abs(d["startEpoch"] - start) < .0001 and d["deadlineEpoch"] == d["startEpoch"] + 900 and
            d["deadlineTickMs"] == d["startTickMs"] + 900000, "Creation-derived900s changed")
    return binding


def validate_projection_report(report, spec, output, ready, checkpoint=lambda: None):
    fields = {"kind", "phase", "sourcePins", "inputSpecSha256", "guardReadySha256", "childIdentity",
              "actualGridValueIdentityClaimed", "renderPermitIsSeparate", "verifiedExecutable", "actualTool",
              "status", "projections", "frames", "nativeQualityAcceptance", "gpuCostCredit", "warnings",
              "preparation", "camera", "cleanup"}
    require(set(report) == fields and report["kind"] == "tinderbox-v5-six-cached-scalar-projections-v1" and
            report["phase"] == "scalar-projections" and
            report["status"] == "six-offline-scalar-projections-diagnostic-only", "Exact successful scalar report required")
    require(report["sourcePins"] == ready["sourcePins"] and report["inputSpecSha256"] == SPEC_SHA and
            report["guardReadySha256"] == own_record(Path(output) / "guard-ready.json")["sha256"] and
            report["childIdentity"] == ready["childIdentity"], "Report/source/child binding differs")
    require(report["actualGridValueIdentityClaimed"] is False and report["nativeQualityAcceptance"] is False and
            report["gpuCostCredit"] is False and report["renderPermitIsSeparate"] is True, "Diagnostic scope changed")
    tool = report["actualTool"]
    require(set(tool) == {"version", "buildHash", "binaryPath"} and tool["version"] == [4, 5, 15] and
            tool["buildHash"] == "5afeabba6097" and safe_path(tool["binaryPath"]) == safe_path(spec["tool"]["executable"]),
            "Actual tool readback differs")
    require(report["verifiedExecutable"] == {"path": str(safe_path(spec["tool"]["executable"])), "bytes": 96106968,
            "sha256": BLENDER_SHA}, "Reported executable identity differs")
    preparation = report["preparation"]
    require(preparation["sourceProjectOpened"] is False and preparation["fluidEvaluated"] is False and
            preparation["hasLinearOutputColorSpace"] is True and preparation["fileColorManagement"] == "FOLLOW_SCENE",
            "Source project/fluid/linear output evidence differs")
    settings = preparation["settings"]
    for property, value in (("engine", "CYCLES"), ("threads", 4), ("device", "CPU"), ("samples", 8)):
        readbacks = [row for row in settings if row["property"] == property]
        require(readbacks and all(row["actual"] == value and type(row["actual"]) is type(value) for row in readbacks),
                "Missing/changed actual fixed renderer readback: " + property)
    qualities = [row for row in settings if row["rna"] == "ImageFormatSettings" and row["property"] == "quality"]
    require(len(qualities) == 14 and all(row["type"] == "INT" and type(row["actual"]) is int and
            row["actual"] == row["requested"] for row in qualities), "Seven actual JPG/restore quality pairs required")
    original_quality = qualities[1]["actual"]
    require(0 <= original_quality <= 100 and all(row["actual"] == (95 if i % 2 == 0 else original_quality)
            for i, row in enumerate(qualities)), "EXR original quality restoration differs")
    view = {"viewTransform": "Standard", "look": "None", "exposure": 0., "gamma": 1., "displayDevice": "sRGB"}
    jpg = {"file_format": "JPEG", "color_mode": "RGB", "color_depth": "8", "color_management": "FOLLOW_SCENE",
           "quality": 95, "exr_codec": "ZIP"}
    restored = {**jpg, "file_format": "OPEN_EXR", "color_mode": "RGBA", "color_depth": "32", "quality": original_quality}
    preflight = preparation["previewPreflight"]
    require(preflight["format"] == jpg and preflight["view"] == view and preflight["restoredBeforeAnyRender"] is True and
            type(preflight["additionalRenders"]) is int and preflight["additionalRenders"] == 0, "Preview preflight differs")
    require(len(report["frames"]) == 2 and [(row["frame"], row["sourceAgeSeconds"]) for row in report["frames"]] ==
            [(31, 1), (61, 2)], "Exact observed source phases required")
    require(type(report["projections"]) is list and len(report["projections"]) == 6, "Exactly six scalar outputs required")
    inventory, seen = [], set()
    for row in report["projections"]:
        checkpoint()
        require(type(row["frame"]) is int and row["frame"] in (31, 61) and row["sourceAgeSeconds"] == (row["frame"] - 1) / 30 and
                row["channel"] in ("density", "flame", "signedHeat") and row["rerun"] is False, "Wrong scalar projection identity")
        key = (row["frame"], row["channel"])
        require(key not in seen, "Duplicate scalar projection")
        seen.add(key)
        stem = "scalar-frame%03d-%s" % key
        preview = row["preview"]
        require(type(preview["additionalRenders"]) is int and preview["additionalRenders"] == 0 and
                preview["normalization"] is False and preview["clippingProne"] is True and
                preview["format"] == jpg and preview["view"] == view and preview["restoredExrFormat"] == restored and
                preview["derivedFromExrSha256"] == row["sha256"] and preview["linearExrUnchanged"] is True and
                preview["loadedFloatImageUnchanged"] is True, "Fixed same-EXR preview/restoration differs")
        for record, extension in ((row, ".exr"), (preview, ".jpg")):
            require(type(record["bytes"]) is int and 0 < record["bytes"] <= 8388608 and
                    safe_path(record["path"]) == safe_path(output) / (stem + extension), "Exact bounded scalar output path required")
            inventory.append(hash_file({k: record[k] for k in ("path", "bytes", "sha256")}, 8388608, checkpoint))
    require(seen == {(frame, channel) for frame in (31, 61) for channel in ("density", "flame", "signedHeat")}, "Incomplete scalar outputs")
    require(type(report["cleanup"]) is list and report["cleanup"] and all(row["removed"] is True for row in report["cleanup"]),
            "Every owned child resource must retire")
    actual_images = {p.name for p in safe_path(output, True).iterdir() if p.suffix.lower() in (".exr", ".jpg", ".jpeg", ".png")}
    require(actual_images == {Path(row["path"]).name for row in inventory}, "Unexpected image output")
    allowed = {"guard-ready.json", "run-binding.json", "job-limit-readback.json", "job-sampling-diagnostics.json", "controller.json",
        "scalar-authorization.used.json", "registration-reservations.json", "startup-complete.json", "projection-report.json",
        "projection-input-hashes-before.json", "projection-input-hashes-after.json"}
    allowed.update("guard-" + group + "-hashes-" + side + ".json" for group in ("input", "source", "support", "binding") for side in ("before", "after"))
    allowed.update(Path(row["path"]).name for row in inventory)
    for file in safe_path(output, True).iterdir():
        if file.is_dir():
            require(file.name in {"source-snapshot", "temp", "config", "scripts", "datafiles"}, "Unexpected owned output directory")
        else:
            require(file.name in allowed or re.fullmatch(r"projection-progress-[0-9]{3}\.json", file.name) and
                    int(file.stem.rsplit("-", 1)[1]) < 32 or re.fullmatch(r"(controller|scalar-blender)-registration-(spec|receipt)\.json", file.name) or
                    re.fullmatch(r"(controller-registration|scalar-blender|scalar-blender-registration)-(stdout|stderr)\.log", file.name),
                    "Unexpected owned output file: " + file.name)
    return inventory
