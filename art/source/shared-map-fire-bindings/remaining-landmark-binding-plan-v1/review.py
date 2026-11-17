"""Path/pin, scope and count checks only. No runtime, geometry or mask execution."""
import argparse
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
REL = HERE.relative_to(ROOT).as_posix()
DOC = "docs/art/shared-map-fire-bindings/remaining-landmark-binding-plan-v1.md"
BASE = "5d40d23c8de31bbd100409c6a695486b60e8e490"
NAMES = [".gitattributes", "authority-84f9e9eb.md", "count.py", "counts-and-sizes.json",
         "format-and-examples.json", "input-pins.json", "review.py", "check-results.json"]
PAYLOAD = sorted([DOC] + [REL + "/" + n for n in NAMES])
PACKAGE = REL + "/review-package.json"
EXPECTED = set(PAYLOAD + [PACKAGE])

def digest(b):
    return hashlib.sha256(b).hexdigest()

def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, check=True).stdout

def dump(path, value):
    (ROOT / path).write_bytes((json.dumps(value, indent=2, ensure_ascii=True) + "\n").encode("ascii"))

def pointer(value, path):
    for token in path.lstrip("/").split("/") if path else []:
        token = token.replace("~1", "/").replace("~0", "~")
        value = value[int(token)] if isinstance(value, list) else value[token]
    return value

def review():
    spec = importlib.util.spec_from_file_location("saved_metadata_counts", HERE / "count.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    derived = module.derive()
    assert json.loads((HERE / "counts-and-sizes.json").read_bytes()) == derived
    pins = json.loads((HERE / "input-pins.json").read_bytes())
    for p in pins["gitInputs"]:
        b = git("show", p["commit"] + ":" + p["path"])
        assert len(b) == p["bytes"] and digest(b) == p["sha256"], p["path"]
    authority = pins["gitInputs"][0]
    assert (HERE / "authority-84f9e9eb.md").read_bytes() == git("show", authority["commit"] + ":" + authority["path"])

    document = (ROOT / DOC).read_text(encoding="ascii")
    words = len(document.split())
    assert words <= 700
    link_count = 0
    for link in re.findall(r"\]\(([^)]+)\)", document):
        resolved = ((ROOT / DOC).parent / link).resolve()
        assert resolved.is_relative_to(ROOT)
        assert resolved.is_file(), link
        link_count += 1
    fmt = json.loads((HERE / "format-and-examples.json").read_bytes())
    assert fmt["runtimeConsumable"] is False and len(fmt["examples"]) == 4
    references = locators = 0

    def walk(value):
        nonlocal references, locators
        if isinstance(value, list):
            for v in value:
                walk(v)
        elif isinstance(value, dict):
            if set(("path", "pointer")).issubset(value):
                target = (ROOT / value["path"]).resolve()
                assert target.is_relative_to(ROOT) and target.is_file()
                pointer(json.loads(target.read_bytes()), value["pointer"])
                references += 1
            if "descriptor" in value and "originalSourceId" in value:
                r = value["descriptor"]
                row = pointer(json.loads((ROOT / r["path"]).read_bytes()), r["pointer"])
                ordinal = value["sourceRangeOrdinal"]
                found = row["id"] if ordinal is None else row["sourceRanges"][ordinal]["id"]
                assert found == value["originalSourceId"]
                assert len(row["matrix"]) == 16
                locators += 1
            assert "fuelAmount" not in value
            if "runtimeStock" in value:
                assert value["runtimeStock"] is None
            for v in value.values():
                walk(v)
    walk(fmt)
    examples = {e["kind"]: e for e in fmt["examples"]}
    assert len({m["descriptor"]["path"] for m in examples["furniture-owner"]["members"]}) == 2
    assert examples["pane-and-frame"]["source"]["originalSourceId"] == "great-crystal-dome/glass-skin"
    c = derived["actualEvidenceCounts"]
    assert len(c["schemaGates"]) == 8 and sorted(c["plantExceptionCounts"].values()) == [2, 66, 76]
    assert c["obliqueGlassFrameCases"] == 4
    # The main table values must come directly from this same saved inventory.
    for m in derived["maps"].values():
        for field in ["logicalSourceIds", "renderRecords", "sections", "estimatedBindingBytes",
                      "estimatedManifestOnlyBootstrapBytes", "estimatedInitialMetadataBytes"]:
            assert f"{m[field]:,}" in document, field
        assert f"{m['largestEstimatedBindingPage']['estimatedBindingBytes']:,}" in document
        for s in m["loadScenarios"]:
            for field in ["sectionCount", "estimatedBindingBytes", "existingPayloadAndBindingBudgetBytes"]:
                assert f"{s[field]:,}" in document, field
    assert f"{derived['sharedDictionaryEstimate']['estimatedBytes']:,}" in document

    changed = set(git("diff", BASE, "--name-only").decode().splitlines())
    untracked = set(git("ls-files", "--others", "--exclude-standard").decode().splitlines())
    assert (changed | untracked).issubset(EXPECTED), sorted((changed | untracked) - EXPECTED)
    for f in HERE.rglob("*"):
        if f.is_file():
            assert f.relative_to(ROOT).as_posix() in EXPECTED, f
    return {
        "version": 1, "result": "pass", "scope": "source-format-planning-only",
        "artistParent": BASE, "authorityCommit": pins["authorityCommit"],
        "proposalWords": words, "proposalWordLimit": 700,
        "localMarkdownLinks": link_count, "exampleJsonPointerReferences": references,
        "exampleOriginalSourceLocators": locators, "boundedExamples": len(examples),
        "workingInputSha256Pins": len(pins["workingInputs"]),
        "immutableGitObjectPins": len(pins["gitInputs"]),
        "originalSectionDescriptorsCountedAndHashed": c["sections"],
        "originalLogicalIdsUniqueAndIdSetHashesMatched": c["logicalSourceIds"],
        "geometryFilePathsAndLengthsCheckedWithoutReadingArrays": c["geometryFiles"],
        "savedCountsReproduced": True, "mainTablesMatchSavedCounts": True,
        "allPriorTrackedPathsOutsideTaskUnchanged": True,
        "expectedTaskPathsIncludingPackage": len(EXPECTED),
        "countsAndSizesSha256": digest((HERE / "counts-and-sizes.json").read_bytes()),
        "noBindingOrGeometryExport": True, "noNativeCompilerWorldTrialGraphMaskExecution": True,
        "noRendererJpgBenchmarkBuildDependencyOrHelper": True,
        "remaining": ["New York runtime/visual/performance gate",
                      "architect/coder wrapper and consumer decisions",
                      "all eight plant/glass schema/live-path gates and exact local exceptions",
                      "complete certificate precedence/intake and source-to-consumer mapping",
                      "full runtime payload/state/residency costs and ordinary-tool acceptance"]
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--record", action="store_true")
    args = parser.parse_args()
    result = review()
    checks_path = REL + "/check-results.json"
    if args.record:
        dump(checks_path, result)
        entries = []
        for p in PAYLOAD:
            b = (ROOT / p).read_bytes()
            entries.append({"path": p, "bytes": len(b), "sha256": digest(b)})
        dump(PACKAGE, {"version": 1, "status": "SOURCE_ONLY_REVIEW_CANDIDATE",
            "artistParent": BASE, "authorityCommit": result["authorityCommit"],
            "branch": "codex/shared-map-fire-bindings",
            "scope": [REL + "/", DOC], "files": entries,
            "remaining": result["remaining"], "runtimeInstallation": False,
            "helpersRetained": False,
            "verification": "python -B " + REL + "/review.py"})
    else:
        assert json.loads((ROOT / checks_path).read_bytes()) == result
        package = json.loads((ROOT / PACKAGE).read_bytes())
        assert {p["path"] for p in package["files"]} == set(PAYLOAD)
        for p in package["files"]:
            b = (ROOT / p["path"]).read_bytes()
            assert len(b) == p["bytes"] and digest(b) == p["sha256"], p["path"]
    assert all((ROOT / p).is_file() for p in EXPECTED)
    print(json.dumps({"result": "pass", "proposalWords": result["proposalWords"],
        "sourceIds": result["originalLogicalIdsUniqueAndIdSetHashesMatched"],
        "sectionHashes": result["originalSectionDescriptorsCountedAndHashed"],
        "inputPins": result["workingInputSha256Pins"] + result["immutableGitObjectPins"],
        "exampleReferences": result["exampleJsonPointerReferences"],
        "taskPaths": result["expectedTaskPathsIncludingPackage"]}, separators=(",", ":")))

if __name__ == "__main__":
    main()
