"""Read saved metadata only; estimate packaging without emitting bindings or geometry."""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
PREFIX = "art/source/shared-map-fire-bindings/"
MATERIAL = PREFIX + "remaining-material-proposal-v1/"
READY = PREFIX + "remaining-geometry-readiness-v1/"
VEG = PREFIX + "vegetation-pane-proposal-v1/"

def raw(path):
    return (ROOT / path).read_bytes()

def read(path):
    return json.loads(raw(path))

def compact(value):
    return json.dumps(value, ensure_ascii=True, separators=(",", ":"), allow_nan=False).encode("ascii")

def sha(value):
    return hashlib.sha256(value).hexdigest()

def pages(records, limit=65536, header=128):
    # Count a proposed JSON record layout; never construct/export a library.
    count = total = largest = entries = 0
    used = header
    for record in records:
        n = len(compact(record)) + 2  # comma and newline, conservatively for every row
        assert n + header <= limit, "An indivisible dictionary record exceeds its proposed page cap"
        if used + n > limit:
            count += 1
            total += used
            largest = max(largest, used)
            used = header
        used += n
        entries += 1
    if entries:
        count += 1
        total += used
        largest = max(largest, used)
    return {"records": entries, "estimatedPages": count, "estimatedBytes": total,
            "largestEstimatedPageBytes": largest}

def derive():
    pins = read(str(HERE.relative_to(ROOT) / "input-pins.json"))
    for pin in pins["workingInputs"]:
        b = raw(pin["path"])
        assert len(b) == pin["bytes"] and sha(b) == pin["sha256"], pin["path"]
    fmt = read(str(HERE.relative_to(ROOT) / "format-and-examples.json"))
    row_bytes = fmt["sizeModel"]["associationTupleUpperBytes"]
    header = fmt["sizeModel"]["sectionHeaderBudgetBytes"]
    assert row_bytes == 59 and header == 128
    assert fmt["runtimeConsumable"] is False
    # Eight JSON integer references, at most six decimal digits per field:
    assert row_bytes == 8 * 6 + 2 + 7 + 2

    cases = read(READY + "geometry-cases.json")["cases"]
    groups = read(READY + "geometry-groups.json")["groups"]
    linear = read(READY + "linear-transforms.json")["transforms"]
    compounds = read(READY + "compound-review.json")["groups"]
    plants = read(VEG + "vegetation-owners-proposal.json")
    glass = read(VEG + "glazing-source-catalogue.json")["sources"]
    local_damage = read(VEG + "glazing-local-damage-proposal.json")
    schema = read(VEG + "schema-proposal.json")["proposals"]
    exceptions = read(VEG + "dependency-exceptions.json")
    geometry_pins = read(READY + "geometry-pins.json")["files"]
    geometry_sizes = {p["path"]: p["bytes"] for p in geometry_pins}
    for p in geometry_pins:
        # Stat only: no geometry arrays, native compiler, mask or contact calculation.
        assert (ROOT / p["path"]).is_file()
        assert (ROOT / p["path"]).stat().st_size == p["bytes"]
    assert (len(cases), len(groups), len(linear), len(geometry_pins)) == (5100, 7446, 476, 1572)
    assert (len(plants["owners"]), len(plants["localPatches"]), len(plants["followers"]), len(glass)) == (98, 208, 204, 433)
    assert len(schema) == 8 and all(p["accepted"] is False for p in schema)
    plant_gates = dict(sorted(Counter(p["kind"] for p in exceptions["plantExceptions"]).items()))
    assert sorted(plant_gates.values()) == [2, 66, 76]
    assert len(exceptions["glazingExceptions"]) == 4

    # These are projections of ALREADY EXISTING proof/owner records for size
    # estimation. No source part -> carrier, quantity, support or native mapping
    # is made. Full certificate bodies remain immutable cold audit evidence.
    layers = {}
    layers["geometryCases"] = pages(
        [c["id"], c["sourceGeometryPath"], c["sourceRange"]] for c in cases)
    exception_rows = read(READY + "quantity-exceptions.json")["records"]
    assert len(exception_rows) == 724
    layers["rawQuantityExceptionLookup"] = pages(
        [e["placeId"], e["sourceId"], i] for i, e in enumerate(exception_rows))
    # This preserves the raw failure index. Later accepted routes remain
    # separate pinned certificates; no export precedence/binding is derived.
    layers["quantityGroups"] = pages(
        [g["id"], g["baseCaseId"], g["linearTransformId"], sorted(g["recipes"])] for g in groups)
    layers["exactLinearTransforms"] = pages(
        [t["id"], t["rowMajor3x3"], t["exactDeterminant"]] for t in linear)
    layers["compoundIntentions"] = pages(
        [g["placeId"], g["proposalKey"], g["kind"], [m["sourceId"] for m in g["members"]]]
        for g in compounds)
    layers["plantOwners"] = pages(
        [o["logicalOwnerKey"], o["kind"], o["originalSourceIds"], o["proposedExistingProfileId"],
         o["localPatchKeys"], i] for i, o in enumerate(plants["owners"]))
    layers["plantPatches"] = pages(
        [p["localPatchKey"], p["logicalOwnerKey"], p["originalSourceReference"]["sectionId"], i,
         p["finerEnvelopeDamageSchemaNeeded"]] for i, p in enumerate(plants["localPatches"]))
    layers["plantFollowers"] = pages(
        [p["originalSourceReference"]["sourceId"], p["logicalOwnerKey"], p["fixedOriginalParentPatchKeys"],
         p["parentSemantics"], i] for i, p in enumerate(plants["followers"]))
    layers["glassComponents"] = pages(
        [g["placeId"], g["originalSourceId"], g["maskTemplateId"],
         g["sourceFrameAssociationIdsPreserved"], i] for i, g in enumerate(glass))
    # IDs above are preserved strings, not new canonical IDs or physical ports.

    families = []
    maps = {}
    for name in ("administration", "horticulture"):
        base = "assets/art/place-scenes/" + name + "/"
        index = read(base + "index.json")
        nav = read(base + "navigation.json")
        prop = read(MATERIAL + name + "-proposal.json")
        section_pins = read(MATERIAL + name + "-section-pins.json")["sections"]
        assert sha(raw(base + "index.json")) == prop["sourceIndexSha256"]
        assert sha(raw(base + "navigation.json")) == prop["navigationSha256"]
        selected = [f for f in prop["families"] if f["logicalSourceCount"]]
        families.extend(
            [name, f["id"], f["proposedPhysicalMaterial"], f["existingSharedProfile"],
             f["quantityRule"], f["scope"], f["logicalIdSetSha256"]] for f in selected)
        chunks = {c["id"]: c for c in index["chunks"]}
        section_stats = []
        ids = []
        geometry_refs = {}
        original_id_bytes = 0
        max_range_members = 0
        merged = 0
        for pin in section_pins:
            b = raw(pin["path"])
            assert len(b) == pin["descriptorBytes"] and sha(b) == pin["sha256"], pin["path"]
            parts = json.loads(b)["parts"]
            n = 0
            refs = set()
            for part in parts:
                path = base + index["geometries"][part["geometry"]]
                refs.add(path)
                ranges = part.get("sourceRanges")
                if ranges:
                    merged += 1
                    max_range_members = max(max_range_members, len(ranges))
                for source in ranges or [{"id": part["id"]}]:
                    source_id = source["id"]
                    ids.append(source_id)
                    original_id_bytes += len(source_id.encode("utf-8"))
                    n += 1
            assert n == pin["logicalSourceIds"] and len(parts) == pin["renderRecords"]
            assert n <= fmt["sizeModel"]["maxAssociationsPerSectionPage"]
            assert chunks[pin["id"]]["parts"] == len(parts)
            geometry_refs[pin["id"]] = refs
            section_stats.append({"id": pin["id"], "logicalSourceIds": n, "renderRecords": len(parts),
                                  "originalDescriptorBytes": len(b), "estimatedBindingBytes": header + row_bytes * n})
        assert len(ids) == len(set(ids)) == prop["logicalSourceParts"]
        assert sha(("\n".join(sorted(ids)) + "\n").encode("utf-8")) == prop["logicalIdSetSha256"]
        assert sum(s["logicalSourceIds"] for s in section_stats) == sum(f["logicalSourceCount"] for f in selected)
        assert max(len(ids), len(groups), len(cases), len(linear)) < 10 ** 6
        # Data-only read scenarios; not the engine's stream policy or a visit.
        scenarios = [("saved-spawn", [nav["spawn"]["x"], nav["spawn"]["y"], nav["spawn"]["elevation"]]),
                     ("interior-study", [62, 62, 2.12] if name == "administration" else [176, 75, 2.12])]
        loads = []
        lookup = {s["id"]: s for s in section_stats}
        for label, (x, z, elevation) in scenarios:
            low = [x - 24, elevation - 2.12, z - 24]
            high = [x + 24, elevation + 4.24, z + 24]
            wanted = [key for key, c in chunks.items()
                      if all(c["bounds"]["max"][a] >= low[a] and c["bounds"]["min"][a] <= high[a] for a in range(3))]
            refs = set().union(*(geometry_refs[key] for key in wanted))
            loads.append({"name": label, "centerXZAndElevation": [x, z, elevation],
                          "queryBounds": {"min": low, "max": high},
                          "sectionCount": len(wanted), "sectionIdSetSha256": sha(("\n".join(sorted(wanted)) + "\n").encode()),
                          "logicalSourceAssociations": sum(lookup[k]["logicalSourceIds"] for k in wanted),
                          "estimatedBindingBytes": sum(lookup[k]["estimatedBindingBytes"] for k in wanted),
                          "existingDescriptorBytes": sum(lookup[k]["originalDescriptorBytes"] for k in wanted),
                          "uniqueExistingGeometryFiles": len(refs),
                          "existingGeometryFileBytes": sum(geometry_sizes[p] for p in refs)})
        maps[name] = {
            "logicalSourceIds": len(ids), "renderRecords": sum(s["renderRecords"] for s in section_stats),
            "sections": len(section_stats), "nonemptyMaterialFamilies": len(selected),
            "sourceIdUtf8BytesAlreadyInDescriptors": original_id_bytes,
            "mergedRenderRows": merged, "maxOriginalRangesInOneRenderRow": max_range_members,
            "originalSceneIndexBytes": len(raw(base + "index.json")),
            "originalSectionPinCatalogueBytes": len(raw(MATERIAL + name + "-section-pins.json")),
            "originalNavigationBytes": len(raw(base + "navigation.json")),
            "originalSectionDescriptorBytes": sum(s["originalDescriptorBytes"] for s in section_stats),
            "existingUniqueGeometryFiles": len(index["geometries"]),
            "existingGeometryFileBytes": sum(geometry_sizes[base + p] for p in index["geometries"].values()),
            "existingAppearanceMaterials": len(index["materials"]),
            "estimatedBindingPages": len(section_stats),
            "estimatedBindingBytes": sum(s["estimatedBindingBytes"] for s in section_stats),
            "largestEstimatedBindingPage": max(section_stats, key=lambda s: s["estimatedBindingBytes"]),
            "loadScenarios": loads}
    layers["materialFamilies"] = pages(families)
    definition_bytes = sum(x["estimatedBytes"] for x in layers.values())
    page_count = sum(x["estimatedPages"] for x in layers.values())
    pin_table_bytes = len(compact([[p["path"], p["sha256"], p["bytes"]] for p in pins["workingInputs"] + pins["gitInputs"]]))
    # Directory budget includes one 128-byte row per proposed dictionary page.
    bootstrap = pin_table_bytes + 128 + 128 * page_count + len(raw(READY + "geometry-pins.json"))
    for m in maps.values():
        m["estimatedManifestOnlyBootstrapBytes"] = bootstrap + m["originalSceneIndexBytes"] + m["originalSectionPinCatalogueBytes"]
        m["estimatedInitialMetadataBytes"] = m["estimatedManifestOnlyBootstrapBytes"] + m["originalNavigationBytes"]
        for s in m["loadScenarios"]:
            s["estimatedMetadataAndBindingsBytes"] = m["estimatedInitialMetadataBytes"] + s["estimatedBindingBytes"]
            s["existingPayloadAndBindingBudgetBytes"] = s["estimatedMetadataAndBindingsBytes"] + s["existingDescriptorBytes"] + s["existingGeometryFileBytes"]
            s["upperBudgetWithEverySharedDictionaryPageBytes"] = s["existingPayloadAndBindingBudgetBytes"] + definition_bytes
    return {
        "version": 1, "status": "SOURCE_PLANNING_ESTIMATES_NOT_EXPORT",
        "inputPinManifestSha256": sha(raw(str(HERE.relative_to(ROOT) / "input-pins.json"))),
        "formatProposalSha256": sha(raw(str(HERE.relative_to(ROOT) / "format-and-examples.json"))),
        "sizeModel": fmt["sizeModel"], "maps": maps,
        "sharedDictionaryEstimate": {"layers": layers, "estimatedBytes": definition_bytes,
            "estimatedPages": page_count, "largestEstimatedPageBytes": max(v["largestEstimatedPageBytes"] for v in layers.values()),
            "pinTableCompactBytes": pin_table_bytes, "bootstrapDirectoryAndPinsBudgetBytes": bootstrap,
            "existingGeometryPinCatalogueBytes": len(raw(READY + "geometry-pins.json")),
            "pinnedWorkingEvidenceFiles": len(pins["workingInputs"]),
            "pinnedColdAuditBytesExcludingOriginalIndexNavigation": sum(p["bytes"] for p in pins["workingInputs"] if p["path"].startswith(PREFIX)),
            "pinnedUIRoofReferenceGitObjectBytes": sum(p["bytes"] for p in pins["gitInputs"] if p["path"].endswith("area-references.json") or p["path"].endswith("area-reference.json"))},
        "actualEvidenceCounts": {
            "logicalSourceIds": sum(m["logicalSourceIds"] for m in maps.values()),
            "sections": sum(m["sections"] for m in maps.values()),
            "effectiveGeometryRangeCases": len(cases), "linearGeometryQuantityGroups": len(groups),
            "exactLinearTransforms": len(linear), "geometryFiles": len(geometry_pins),
            "preservedRawQuantityExceptionRows": len(exception_rows),
            "compoundGroupingIntentions": len(compounds), "plantOwners": len(plants["owners"]),
            "plantPatches": len(plants["localPatches"]), "zeroExtraFuelFollowers": len(plants["followers"]),
            "glassSourceComponents": len(glass), "authoredVentMemberships": len(local_damage["authoredVentOpeningMemberships"]),
            "maskTemplates": len(local_damage["maskTemplateSummaries"]), "schemaGates": [g["id"] for g in schema],
            "plantExceptionCounts": plant_gates, "obliqueGlassFrameCases": len(exceptions["glazingExceptions"])},
        "limits": [
            "No new binding/carrier rows, geometry, masks, canonical cells or stock were generated.",
            "Byte estimates are uncompressed serialized-reference budgets, not measured runtime memory or performance.",
            "Counts of source IDs are not final carrier counts. Compound/plant/support/damage admissions remain gated.",
            "Shared dictionary projections retain exact references; full proof bodies stay pinned cold audit evidence.",
            "Load scenarios use existing chunk AABB intersections; they are not a chosen stream policy or traversability proof.",
            "Scenario geometry bytes deduplicate existing files, without evaluating geometry arrays or compiling shapes.",
            "Initial metadata includes existing scene index, section/geometry pin catalogues and full navigation. Scenario totals additionally count existing descriptors and unique geometry. Cold proof bodies, images, unaccepted fine masks/connectivity/state, native/GPU expansion and dependency-closure loads remain excluded.",
            "No complete contributor mapping exists yet; nearby dictionary demand is between bootstrap and the separately reported all-dictionary upper budget.",
            "The 192-section overview cap is not raised; selected-level plan overview and bounded nearby residency need consumer review."
        ]}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="write only this packet's count/size report")
    args = parser.parse_args()
    result = derive()
    target = HERE / "counts-and-sizes.json"
    if args.write:
        target.write_bytes((json.dumps(result, indent=2, ensure_ascii=True, allow_nan=False) + "\n").encode("ascii"))
    else:
        assert json.loads(target.read_bytes()) == result, "Saved deterministic counts/sizes differ"
    print(json.dumps({"result": "pass",
        "sourceIds": result["actualEvidenceCounts"]["logicalSourceIds"],
        "sections": result["actualEvidenceCounts"]["sections"],
        "dictionaryPages": result["sharedDictionaryEstimate"]["estimatedPages"],
        "dictionaryEstimatedBytes": result["sharedDictionaryEstimate"]["estimatedBytes"],
        "largestAssociationPageBytes": max(m["largestEstimatedBindingPage"]["estimatedBindingBytes"] for m in result["maps"].values())
    }, separators=(",", ":")))

if __name__ == "__main__":
    main()
