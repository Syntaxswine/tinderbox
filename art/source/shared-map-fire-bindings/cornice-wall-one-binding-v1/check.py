"""One source volume embed: two immutable original parts, no native binding."""
import argparse
import collections
import hashlib
import importlib.util
import json
import math
import struct
import subprocess
import sys
from fractions import Fraction as F
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
REL = HERE.relative_to(ROOT).as_posix()
IDS = ["carrier/main/0/cell-3-1/1", "carrier/edge-0/cornice-1"]
PARTS = [s.removeprefix("carrier/") for s in IDS]
RELATION = "fa9dc4a25193e94ce7b5793e"
REGION = "19428b0ef95337ce4e9f64a6"
PAYLOAD = [".gitattributes", "README.md", "authority-916b3e44.md",
           "frozen-unresolved-binding.json", "predicate-context.json", "input-pins.json",
           "check.py", "check-interior.mjs", "source-record.json"]

def sha(b): return hashlib.sha256(b).hexdigest()
def read(path): return json.loads((ROOT / path).read_bytes())
def dump(path, value):
    path.write_bytes((json.dumps(value, indent=2, ensure_ascii=True) + "\n").encode("ascii"))
def rational(x): return {"numerator": str(x.numerator), "denominator": str(x.denominator)}
def sub(a,b): return [x-y for x,y in zip(a,b)]
def cross(a,b): return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def packed_hash(values):
    return sha(struct.pack("<" + str(len(values)) + "d", *values))

def exact_component(geom, matrix, ts, witness):
    positions = geom["attributes"]["position"]["array"]
    index = geom.get("index")
    index = index["array"] if isinstance(index,dict) else list(range(len(positions)//3))
    assert len(index) == 36 and len(ts) == 12
    assert matrix[:12] == [1,0,0,0,0,1,0,0,0,0,1,0] and matrix[15] == 1
    world = [[F(positions[3*i+a]) + F(matrix[12+a]) for a in range(3)]
             for i in range(len(positions)//3)]
    # Exact affine images equal the existing export helper's emitted binary64
    # coordinates. No new conversion, snapping, welding or coordinate repair.
    for i,t in enumerate(ts):
        assert [[F(v) for v in p] for p in t] == [world[j] for j in index[3*i:3*i+3]]
    classes = collections.defaultdict(list)
    for i in dict.fromkeys(index):
        classes[tuple(world[i])].append(i)
    representatives = {v:min(ids) for v,ids in classes.items()}
    edge_map = collections.defaultdict(list)
    adj = [set() for _ in ts]
    exact_ts = [[tuple(world[j]) for j in index[i:i+3]] for i in range(0,36,3)]
    assert len({tuple(sorted(t)) for t in exact_ts}) == 12
    for primitive,t in enumerate(exact_ts):
        n = cross(sub(t[1],t[0]),sub(t[2],t[0]))
        assert dot(n,n) > 0
        for a,b in zip(t,t[1:]+t[:1]):
            edge_map[tuple(sorted((a,b)))].append((primitive,a,b))
    assert len(classes) == 8 and len(edge_map) == 18
    edges = []
    for (a,b),incidence in edge_map.items():
        assert len(incidence) == 2
        first,second = incidence
        assert first[1] == second[2] and first[2] == second[1]
        adj[first[0]].add(second[0]); adj[second[0]].add(first[0])
        edges.append({"endpointsByFirstOriginalVertexRecord": [representatives[a],representatives[b]],
                      "originalPrimitives":[x[0] for x in incidence], "oppositeDirections":True})
    seen = {0}; queue = [0]
    for i in queue:
        for j in sorted(adj[i]):
            if j not in seen: seen.add(j);queue.append(j)
    assert seen == set(range(12))
    # Each exact coordinate vertex has one cyclic link, not a pinched surface.
    for v in classes:
        links = collections.defaultdict(list)
        for t in exact_ts:
            if v in t:
                a,b = [x for x in t if x != v]
                links[a].append(b);links[b].append(a)
        assert all(len(xs) == 2 for xs in links.values())
        visited = {next(iter(links))}; todo = list(visited)
        for a in todo:
            for b in links[a]:
                if b not in visited:visited.add(b);todo.append(b)
        assert visited == set(links)
    wf = list(map(F,witness)); distances = []
    for t in exact_ts:
        n = cross(sub(t[1],t[0]),sub(t[2],t[0]))
        # Literal original winding is outward; every vertex is in its closed
        # supporting halfspace, while the supplied witness is strictly inside.
        assert all(dot(n,sub(v,t[0])) <= 0 for v in classes)
        gap = -dot(n,sub(wf,t[0]))
        assert gap > 0
        distances.append(gap*gap/dot(n,n))
    minimum = min(distances)
    return {
        "id":0, "originalPrimitives":list(range(12)),
        "originalIndexOrImplicitPositionEntryOffsets":list(range(0,36,3)),
        "originalVertexRecordIndicesByPrimitive":[index[i:i+3] for i in range(0,36,3)],
        "exactCoordinateEquivalenceClasses":[{"representative":min(ids),"originalVertexRecords":sorted(ids)}
            for v,ids in sorted(classes.items(),key=lambda pair:min(pair[1]))],
        "exactSharedEdges":edges,
        "physicalTopology":{"uniqueExactVertices":8,"edges":18,"triangles":12,"eulerCharacteristic":2,
            "connectedComponents":1,"boundaryOrNonmanifoldEdges":0,"sameDirectionEdgePairs":0,
            "simpleCyclicVertexLinks":True,"coordinateOrEdgeSplits":0,"physicalSeamsFound":[],
            "watertightFromOriginalTriangles":True,"referenceClosureUsed":False,
            "originalOutwardSupportingHalfspaces":True,"convexClosedBoundaryFromOutwardOriginalFaces":True},
        "strictWitness":{"insideEveryOriginalSupportingHalfspace":True,
            "minimumSquaredPlaneDistanceMetresSquared":rational(minimum),
            "minimumPlaneDistanceMetresApproximate":math.sqrt(float(minimum))}
    }

def derive():
    pins = json.loads((HERE / "input-pins.json").read_bytes())
    assert pins["partIds"] == PARTS
    for p in pins["workingInputPins"]:
        b = (ROOT / p["path"]).read_bytes()
        assert len(b) == p["bytes"] and sha(b) == p["sha256"],p["path"]
    for p in pins["snapshotPins"]:
        b = (ROOT / p["snapshotPath"]).read_bytes()
        assert len(b) == p["bytes"] and sha(b) == p["sha256"]
    assert sha((ROOT / pins["predicateContext"]["path"]).read_bytes()) == pins["predicateContext"]["sha256"]
    frozen = json.loads((HERE / "frozen-unresolved-binding.json").read_bytes())
    assert frozen["selectedLocalRegionId"] == REGION
    rpath = "art/source/shared-map-fire-bindings/coverage-family-proposal-v1/relationships.json"
    gpath = "art/source/shared-map-fire-bindings/coverage-family-proposal-v1/geometry-bindings.json"
    for p in frozen["sources"]:
        assert sha((ROOT / p["path"]).read_bytes()) == p["rawSha256"]
    relationship_rows = read(rpath)["relationships"]
    ri,relationship = next((i,r) for i,r in enumerate(relationship_rows) if r["id"] == RELATION)
    assert relationship == frozen["originalRelationship"]
    region_index,region = next((i,r) for i,r in enumerate(relationship["localRegions"]) if r["id"] == REGION)
    witness = region["actualGeometryCertificate"]["proof"]["worldWitness"]
    assert witness == [33.5,8.23,25.96000000089407]
    assert region["parentWitness"] == region["childWitness"] == witness
    assert region["actualGeometryCertificate"]["proof"]["sourceFace"] is None
    for box in [region["selector"],region["parentBounds"],region["childBounds"]]:
        assert all(box["min"][a] < witness[a] < box["max"][a] for a in range(3))
    bindings_path = "assets/art/shared-map-fire-bindings/new-york-complete-v1.json"
    base = read(bindings_path)
    assert sha((ROOT / base["sourceScene"]["indexPath"]).read_bytes()) == base["sourceScene"]["sha256"]
    by = {c["id"]:c for c in base["carriers"] if c["id"] in IDS}
    assert set(by) == set(IDS)
    assert base["coordinateFrame"]["sourceOffsetAlreadyApplied"] is True
    assert base["coordinateFrame"]["sourceOffset"] == [56,0,26]
    overlay_path = base["effectiveGeometryOverlay"]["indexPath"]
    overlay = read(overlay_path)
    assert sha((ROOT/overlay_path).read_bytes()) == base["effectiveGeometryOverlay"]["sha256"]
    assert len(overlay["replacements"]) == 29
    assert not [r for r in overlay["replacements"] if r["sourcePartId"] in PARTS or r["partId"] in PARTS]
    geometry_bindings = read(gpath)["carriers"]
    # Import only the earlier source geometry helper. Never call inputs.load(),
    # its graph/reachability audit or any native/world entry point.
    s = importlib.util.spec_from_file_location("existing_two_part_geometry",
        ROOT / "art/source/shared-map-fire-bindings/coverage-family-proposal-v1/geometry.py")
    C = importlib.util.module_from_spec(s);s.loader.exec_module(C)
    existing = C.Geometry(by)
    result = []
    node_parts = []
    for endpoint,cid in zip(["parent","child"],IDS):
        c = by[cid]
        assert c["retirement"]["ownerId"] == cid
        physical = [b for b in c["renderBindings"] if b["physicalContribution"] == "carrier-solid"]
        assert len(physical) == 1
        b = physical[0]
        assert b["partId"] == b["sourcePartId"] == cid.removeprefix("carrier/")
        assert b.get("sourceRange") is None
        refs = geometry_bindings[cid]
        assert len(refs) == 1 and refs == frozen[endpoint+"GeometryBindings"]
        for key in ["partId","sourcePartId","geometryId","geometryPath","matrix"]:
            assert b[key] == refs[0][key]
        path = ROOT/b["geometryPath"]
        assert sha(path.read_bytes()) == refs[0]["sha256"]
        section_path = "assets/art/place-scenes/new-york/sections/"+b["sectionId"]+".json"
        source_rows = read(section_path)["parts"]
        row_index,row = next((i,r) for i,r in enumerate(source_rows) if r["id"] == b["partId"])
        assert row["geometry"] == b["geometryId"] and row["matrix"] == b["matrix"] and not row.get("sourceRanges")
        geom = json.loads(path.read_bytes())
        shape = existing.shape(cid)
        assert shape["refs"] == refs and shape["closed"]
        ts = shape["triangles"]
        assert C.G.bounds(ts) == b["bounds"] == c["physicalBounds"]
        component = exact_component(geom,b["matrix"],ts,witness)
        inside = existing.inside(shape,witness)
        assert inside == region["actualGeometryCertificate"]["proof"][endpoint+"Membership"]
        result.append({
            "endpoint":endpoint,"partId":b["partId"],"sourcePartId":b["sourcePartId"],
            "ownerId":cid,"placeId":"new-york","qualification":"place-local; common consumer qualifies once",
            "originalDescriptor":{"path":section_path,"pointer":"/parts/"+str(row_index)},
            "geometry":{"id":b["geometryId"],"path":b["geometryPath"],"rawSha256":refs[0]["sha256"],
                "sourceRange":None,"positionStorage":geom["attributes"]["position"]["type"],
                "indexStorage":geom["index"]["type"] if geom.get("index") else None,
                "fullOriginalTriangleCount":len(ts)},
            "acceptedRepair":{"overlayIndexPath":overlay_path,"overlayIndexSha256":base["effectiveGeometryOverlay"]["sha256"],
                "replacementEntry":None,"meaning":"Neither exact original part is among the 29 accepted replacements."},
            "emittedWorldMatrix":b["matrix"],"matrixFloat64LittleEndianSha256":packed_hash(b["matrix"]),
            "originalOrderedWorldTrianglesFloat64LittleEndianSha256":packed_hash([x for t in ts for v in t for x in v]),
            "worldBounds":b["bounds"],
            "witnessInGeometryLocalFrameExact":[rational(F(witness[a])-F(b["matrix"][12+a])) for a in range(3)],
            "connectedPhysicalComponent":component,"existingSourceInteriorResult":inside,
            "sourceFace":None,"nativeRecordId":None,"nativeCell":None,
            "nativeFaceIds":None,"surfacePortPrimitive":None})
        node_parts.append({"partId":b["partId"],"triangles":ts,"bounds":b["bounds"]})
    completed = subprocess.run(["node",str(HERE/"check-interior.mjs")],cwd=ROOT,
        input=json.dumps({"parts":node_parts,"witness":witness,"sourceOffset":[56,0,26]}),
        text=True,capture_output=True,timeout=30)
    assert completed.returncode == 0,completed.stderr
    checked = json.loads(completed.stdout)
    for part,report in zip(result,checked["parts"]):
        assert report["partId"] == part["partId"]
        assert report["components"] == [{"id":0,"primitives":list(range(12)),"closed":True}]
        part["existingCheckedInteriorResult"] = report
    return {
        "version":1,"status":"SOURCE_COMPONENT_AND_VOLUME_WITNESS_PROVED_NATIVE_LINEAGE_UNBOUND",
        "runtimeConsumable":False,
        "authorityCommit":pins["authorityCommit"],"coderInputCommit":pins["coderInputCommit"],
        "artistParent":pins["artistParent"],"relationshipId":RELATION,"localRegionId":REGION,
        "relationshipRef":{"path":rpath,"pointer":"/relationships/"+str(ri)},
        "selectedRegionPointer":"/relationships/"+str(ri)+"/localRegions/"+str(region_index),
        "geometryBindingsPath":gpath,"physicalBindingsPath":bindings_path,
        "kind":"fixed-embed","direction":"parent-to-child","worldWitness":witness,
        "coordinateFrame":{"frame":"emitted-world","units":"metres","sourceOffset":[56,0,26],
            "sourceOffsetAlreadyApplied":True,"additionalOffsetApplied":False},
        "sourceFace":None,"sourceRange":None,"parts":result,
        "sourceGeometryBlockers":[],
        "nativeLineageBlockers":[
            "Canonical native record ID and native cell remain null; derive them from the original source-to-native adapter, never a guessed suffix or surviving sibling.",
            "Authoritative native fragment/face/component lineage to these fixed original primitives is not supplied. Generated cell-plane caps cannot become original exterior faces.",
            "The fixed volume witness is not an exterior-face hit. Original sourceFace/sourceRange nulls stay null; any core boundary-port selection must be a separate reviewed derivation.",
            "Corrected core admission, native birth/liveness and runtime installation require coder/architect review."
        ],
        "checks":{"selectedOriginalParts":2,"originalTrianglesExamined":24,
            "exactSourceGeometryAndMatrixPins":True,"sourceOffsetsAppliedOnce":True,
            "exactSharedEdgeComponents":True,"originalPhysicalMeshesWatertight":True,
            "strictConvexInteriorWitnessInBoth":True,"existingCheckedInteriorPredicatesPass":True,
            "outsideAndDoubleOffsetControlsRejected":4,"nativeIdsInvented":False,
            "newRepairsAnchorsProfilesQuantitiesOrRuntimeMetadata":False,
            "nativeCompilerWorldTrialGraphRendererBenchmarkBuildOrRetainedHelper":False},
        "scope":"Only the selected region of the selected relationship is investigated; no second region or full family normalization is performed.",
        "proofNotes":"Exact equality uses the unchanged original coordinates, index/implicit position order and matrices. No tolerance weld, triangle/vertex rewrite, mathematical cap/reference closure or new solid is used. Binary64 arrays are hashed little-endian in original order; original geometry/UV bytes remain unchanged."
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--record",action="store_true")
    args = parser.parse_args()
    result = derive()
    expected = set(PAYLOAD+["review-package.json"])
    for p in HERE.rglob("*"):
        if p.is_file(): assert p.relative_to(HERE).as_posix() in expected
    if args.record:
        dump(HERE/"source-record.json",result)
        entries = []
        for name in PAYLOAD:
            b = (HERE/name).read_bytes()
            entries.append({"path":REL+"/"+name,"bytes":len(b),"sha256":sha(b)})
        dump(HERE/"review-package.json",{
            "version":1,"status":"SOURCE_ONLY_ONE_BINDING_CANDIDATE",
            "artistParent":result["artistParent"],"authorityCommit":result["authorityCommit"],
            "coderInputCommit":result["coderInputCommit"],
            "scope":[REL+"/"],"files":entries,"nativeOrRuntimeInstallation":False,
            "remaining":result["nativeLineageBlockers"],"helpersRetained":False,
            "scopeVerification":"Validate this candidate's commit against its own parent; do not compare an architect's combined tree against the old artist parent.",
            "verification":"python -B "+REL+"/check.py"})
    else:
        assert json.loads((HERE/"source-record.json").read_bytes()) == result
        package = json.loads((HERE/"review-package.json").read_bytes())
        assert {p["path"] for p in package["files"]} == {REL+"/"+n for n in PAYLOAD}
        for p in package["files"]:
            b = (ROOT/p["path"]).read_bytes()
            assert len(b) == p["bytes"] and sha(b) == p["sha256"],p["path"]
    print(json.dumps({"result":"pass","relationship":RELATION,"region":REGION,
        "parts":2,"triangles":24,"components":[0,0],"checkedInterior":[True,True],
        "negativePointControls":4,"nativeRecordAndCellIds":"null/unbound"},separators=(",",":")))

if __name__ == "__main__":
    main()
