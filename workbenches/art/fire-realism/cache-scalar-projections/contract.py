"""Pure fixed projection/guard contract. Import never loads bpy or a cache."""
import hashlib
import json
import math
import re
import struct
from pathlib import Path

PROPOSAL = "c73c0fb3f266859c68c2f2f4c7b5a4a9b1a2b792"
OWNER = "01a17e9b-a6db-7490-94cd-7d863747e5d3"
SPEC_SHA256 = "335f7e6a761ac70b6503db45629354f09265b93ec2e2964a4d43836db840a5a8"
PHASE = "scalar-projections"
READY_KIND = "tinderbox-cache-scalar-guard-ready-v1"
SOURCE_FILES = ("contract.py", "coordinates.py", "scalar.py", "preview.py", "adapter.py", "projection.py", "entry.py",
                "fixed-spec.json", "fixed-spec.schema.json", "guard-ready.schema.json", "provenance.json")
CAP = 2147483648
SHA = re.compile(r"[0-9a-f]{64}")
H = .0416666679084301
DOMAIN_MIN = [-1., -1., -.16666662693023682]
RENDERER = {
    "engine": "CYCLES", "device": "CPU", "shadingSystem": False, "threads": 4,
    "width": 320, "height": 200, "percentage": 100, "samples": 8,
    "adaptiveSampling": False, "denoising": False, "motionBlur": False,
    "volumePrecision": "FULL", "volumeSpace": "WORLD", "volumeInterpolation": "LINEAR",
    "stepMetres": H / 2, "sceneStepRate": 1, "materialStepRate": 1, "maximumSteps": 512,
    "voxelClipping": 0, "background": "opaque-black-zero-world-emission",
    "filmTransparent": False, "format": "OPEN_EXR", "depth": "32", "colorMode": "RGBA",
    "compression": "ZIP", "previews": True,
    "previewFormat": "JPEG", "previewDepth": "8", "previewColorMode": "RGB", "previewQuality": 95,
    "previewViewTransform": "Standard", "previewDisplay": "sRGB", "previewExposure": 0,
    "previewGamma": 1, "previewAdditionalRenders": 0,
}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def finite(x):
    return type(x) in (int, float) and math.isfinite(x)


def f32(x):
    require(finite(x), "Finite float required")
    return struct.unpack("<f", struct.pack("<f", x))[0]


def same_path(a, b):
    return Path(a).resolve() == Path(b).resolve()


def pairs(items):
    result = {}
    for key, value in items:
        require(key not in result, "Duplicate JSON key: " + key)
        result[key] = value
    return result


def parse_json(raw):
    require(len(raw) <= 262144, "Bounded JSON exceeded")
    return json.loads(raw, object_pairs_hook=pairs,
        parse_constant=lambda x: (_ for _ in ()).throw(ValueError("Nonfinite JSON: " + x)))


def plain(path):
    path = Path(path)
    for item in (path, *path.parents):
        stat = item.stat()
        require(not item.is_symlink() and not getattr(stat, "st_file_attributes", 0) & 0x400,
                "Reparse path refused: " + str(item))
    return path


def read_json(path, maximum=262144):
    path = plain(path)
    before = path.stat()
    require(before.st_size <= maximum, "JSON ceiling before allocation")
    raw = path.read_bytes()
    after = path.stat()
    require(len(raw) == before.st_size and (before.st_size, before.st_mtime_ns) ==
            (after.st_size, after.st_mtime_ns), "JSON changed during read")
    return raw, parse_json(raw)


def hash_file(record, maximum, checkpoint=lambda: None):
    path = plain(record["path"])
    require(type(record["bytes"]) is int and 0 <= record["bytes"] <= maximum and
            SHA.fullmatch(record["sha256"]), "Invalid bounded input pin")
    before = path.stat()
    require(before.st_size == record["bytes"], "Pinned input extent differs: " + str(path))
    digest, count = hashlib.sha256(), 0
    with path.open("rb") as stream:
        while True:
            checkpoint()
            block = stream.read(min(131072, record["bytes"] - count + 1))
            if not block:
                break
            count += len(block)
            require(count <= record["bytes"], "Input grew")
            digest.update(block)
    after = path.stat()
    require((before.st_size, before.st_mtime_ns) == (after.st_size, after.st_mtime_ns) and
            count == record["bytes"] and digest.hexdigest() == record["sha256"],
            "Pinned input changed: " + str(path))
    return {"path": str(path.resolve()), "bytes": count, "sha256": digest.hexdigest()}


def validate_spec(spec):
    canonical = json.dumps(spec, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
    require(hashlib.sha256(canonical).hexdigest() ==
            "8ca4b816cb2fb4761b12aaaeaaae1dbd07a177d373abba90a37d9ec5f17cc095",
            "Complete fixed recipe changed; no additional fields/knobs")
    require(spec["version"] == 1 and spec["phase"] == PHASE and spec["owner"] == OWNER and
            spec["proposalCommit"] == PROPOSAL, "Wrong fixed projection authority")
    require(spec["renderer"] == RENDERER, "Fixed renderer recipe differs")
    require(spec["limits"] == {"wallSeconds": 900, "processCommittedBytes": CAP,
            "aggregateCommittedBytes": CAP, "freshOutputBytes": 536870912, "threads": 4,
            "selectedCacheBytesMaximum": 16777216, "gridCountMaximum": 64,
            "outputFileBytesMaximum": 8388608, "automaticRetries": 0, "automaticRepairs": 0},
            "Fixed limits differ")
    require(spec["tool"]["version"] == [4, 5, 15] and spec["tool"]["buildHash"] == "5afeabba6097" and
            spec["tool"]["executableSha256"] ==
            "935e4bed28e51d08b8e1fbcc31dcccc000cc1c3dd065d82dcb1da813e75db795", "Wrong tool")
    require(spec["space"]["resolution"] == [48, 48, 96] and spec["space"]["voxelSize"] == [H] * 3 and
            spec["space"]["domainMinBlender"] == DOMAIN_MIN and
            spec["space"]["nativeTranslation"] == [5.5, 0, 8.5] and
            spec["space"]["actualValueIdentityClaimed"] is False, "Wrong source space")
    require(spec["camera"]["sensorFit"] == "HORIZONTAL" and spec["camera"]["orthoScale"] == 12.8 and
            spec["camera"]["shift"] == [0, 0] and spec["camera"]["clip"] == [.1, 300] and
            spec["camera"]["ndcTolerance"] == .000002, "Wrong fixed camera")
    require(spec["scalarMapping"] == {
            "density": "literal GEOMETRY density.Fac * unit white emission",
            "flame": "literal GEOMETRY flame.Fac * unit white emission",
            "signedHeat": "literal GEOMETRY temperature.Fac -> RGB(max(H,0),0,max(-H,0))*unit emission",
            "emissionStrength": 1, "absorption": 0, "scattering": 0, "blackbody": False,
            "calibratedKelvin": False, "valueNormalization": False}, "Wrong scalar transfer")
    require(spec["source"]["cacheHashLineage"]["producerVdbHashesAvailable"] is False,
            "Producer bit identity cannot be invented")
    require(len(spec["selected"]) == 2, "Exactly two source phases")
    for row, frame, digest in zip(spec["selected"], (31, 61), (
            "562cad5ddb1e822379a2808d5325f42d22224c2b9cf512a5489e76348193edd7",
            "4410e1293e3bb51631ecfd4f7210444170ddefc390e0db64b144883eb4704083")):
        require(row["frame"] == frame and row["ageSeconds"] == (frame - 1) / 30 and
                row["cache"]["sha256"] == digest, "Wrong selected cache/clock")
        require(same_path(row["cache"]["path"], Path(spec["source"]["stageDirectory"]) /
                "cache/data" / ("fluid_data_%04d.vdb" % frame)), "Cache path differs")
    return spec


def validate_identity(value):
    require(type(value["pid"]) is int and value["pid"] > 0, "PID required")
    require(type(value["creationFileTime"]) is str and
            re.fullmatch(r"[0-9]{17,20}", value["creationFileTime"]), "Exact decimal FILETIME required")
    require(Path(value["executable"]).is_absolute(), "Executable path required")


def validate_ready(ready, spec, input_sha, nonce, output, who, now_epoch, now_tick, stop=False):
    require(set(ready) == {"kind", "phase", "owner", "proposalCommit", "candidateCommit", "sourcePins",
            "permitSha256", "inputSpecSha256", "nonce", "output", "runRecordSha256", "controllerIdentity",
            "childIdentity", "deadline", "jobLimitReadback"}, "Exact future ready fields required")
    require(ready["kind"] == READY_KIND and ready["phase"] == PHASE and
            ready["owner"] == OWNER and ready["proposalCommit"] == PROPOSAL, "Wrong guard/phase authority")
    require(re.fullmatch(r"[0-9a-f]{40}", ready["candidateCommit"]), "Candidate commit required")
    require(input_sha == SPEC_SHA256 and ready["inputSpecSha256"] == input_sha and
            ready["nonce"] == nonce and re.fullmatch(r"[0-9a-f]{32,64}", nonce), "Input/nonce mismatch")
    require(same_path(ready["output"], output), "Wrong owned output")
    require(SHA.fullmatch(ready["permitSha256"]) and SHA.fullmatch(ready["runRecordSha256"]), "Receipt pins required")
    require(set(ready["sourcePins"]) == set(SOURCE_FILES) and
            all(SHA.fullmatch(v) for v in ready["sourcePins"].values()), "Exact source closure required")
    for item in (ready["controllerIdentity"], ready["childIdentity"], who):
        validate_identity(item)
    require(ready["childIdentity"] == who and same_path(who["executable"], spec["tool"]["executable"]),
            "Exact child identity differs")
    require(int(who["creationFileTime"]) >= int(ready["controllerIdentity"]["creationFileTime"]),
            "Child precedes controller")
    d = ready["deadline"]
    require(not stop and all(finite(d[k]) for k in
            ("startEpoch", "startTickMs", "deadlineEpoch", "deadlineTickMs")), "STOP/nonfinite deadline")
    start = (int(ready["controllerIdentity"]["creationFileTime"]) - 116444736000000000) / 10000000
    require(abs(start - d["startEpoch"]) < .0001 and d["wallSeconds"] == 900 and
            d["deadlineEpoch"] == d["startEpoch"] + 900 and
            d["deadlineTickMs"] == d["startTickMs"] + 900000, "Original creation deadline differs")
    left = min(d["deadlineEpoch"] - now_epoch, (d["deadlineTickMs"] - now_tick) / 1000)
    require(0 < left <= 900, "Original deadline expired/replenished")
    r = ready["jobLimitReadback"]
    require(r["validated"] is True and SHA.fullmatch(r["sha256"]) and
            same_path(Path(r["path"]).parent, output), "Numeric Job receipt required")
    a = r["actual"]
    require(a["processLimitBytes"] == CAP and a["aggregateLimitBytes"] == CAP and
            type(a["flags"]) is int and a["flags"] == 0x2300 and
            not a["flags"] & 0x1800, "Hard caps/breakaway differ")
    return left
