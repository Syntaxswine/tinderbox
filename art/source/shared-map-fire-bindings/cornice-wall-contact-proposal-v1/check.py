"""One proposed original source contact; preserve the accepted volume proof."""
import argparse
import hashlib
import importlib.util
import json
import math
import re
import struct
import subprocess
import sys
from fractions import Fraction as F
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
REL = HERE.relative_to(ROOT).as_posix()
OLD = "art/source/shared-map-fire-bindings/cornice-wall-one-binding-v1/"
PAYLOAD = [".gitattributes","README.md","authority-d899d73f.md","architect-probe.json",
           "architect-probe.mjs.txt","predicate-context.json","input-pins.json",
           "check.py","check-contact.mjs","contact-record.json","attempt-01-first-record-reference-check.txt"]

def sha(b): return hashlib.sha256(b).hexdigest()
def read(path): return json.loads((ROOT/path).read_bytes())
def dump(path,value):
    path.write_bytes((json.dumps(value,indent=2,ensure_ascii=True)+"\n").encode("ascii"))
def rational(x): return {"numerator":str(x.numerator),"denominator":str(x.denominator)}
def sub(a,b): return [x-y for x,y in zip(a,b)]
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def cross(a,b): return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def float_hash(values): return sha(struct.pack("<"+str(len(values))+"d",*values))

def exact_face(triangle,point):
    a,b,c = [[F(v) for v in p] for p in triangle]
    p = list(map(F,point));v0,v1,v2 = sub(b,a),sub(c,a),sub(p,a)
    n = cross(v0,v1)
    assert dot(n,n)>0 and dot(n,v2)==0
    d00,d01,d11,d20,d21 = dot(v0,v0),dot(v0,v1),dot(v1,v1),dot(v2,v0),dot(v2,v1)
    denominator = d00*d11-d01*d01
    assert denominator>0
    v,w = (d11*d20-d01*d21)/denominator,(d00*d21-d01*d20)/denominator
    weights = [1-v-w,v,w]
    assert all(x>0 for x in weights)
    axes = [i for i,x in enumerate(n) if x]
    assert len(axes)==1
    normal = [0,0,0];normal[axes[0]] = 1 if n[axes[0]]>0 else -1
    return {"barycentricWeightsExact":[rational(x) for x in weights],
            "allWeightsStrictlyPositive":True,"exactPlaneResidual":rational(dot(n,v2)),
            "unitOutwardNormalExact":normal,"normalCrossProductExact":[rational(x) for x in n],
            "unitPlaneDotWorldEqualsExact":rational(dot(normal,a)),
            "pointMembershipNeedsNoTolerance":True}

def derive():
    pins = json.loads((HERE/"input-pins.json").read_bytes())
    for item in pins["snapshots"]:
        b = (ROOT/item["snapshotPath"]).read_bytes()
        assert len(b)==item["bytes"] and sha(b)==item["sha256"]
    for item in pins["physicalSourcePins"]:
        b = (ROOT/item["path"]).read_bytes()
        assert len(b)==item["bytes"] and sha(b)==item["sha256"],item["path"]
    old_package = pins["acceptedVolumePackage"]
    b = (ROOT/old_package["path"]).read_bytes()
    assert len(b)==old_package["bytes"] and sha(b)==old_package["sha256"]
    for item in old_package["payloadPins"]:
        b = (ROOT/item["path"]).read_bytes()
        assert len(b)==item["bytes"] and sha(b)==item["sha256"],item["path"]
    context = pins["predicateContext"]
    b = (ROOT/context["path"]).read_bytes()
    assert len(b)==context["bytes"] and sha(b)==context["sha256"]

    old = read(OLD+"source-record.json")
    frozen = read(OLD+"frozen-unresolved-binding.json")
    relationship = frozen["originalRelationship"]
    assert old["relationshipId"]==pins["selectedRelationshipId"]
    assert old["localRegionId"]==pins["selectedRegionId"]
    region_index,region = next((i,r) for i,r in enumerate(relationship["localRegions"]) if r["id"]==old["localRegionId"])
    assert region["actualGeometryCertificate"]["geometricBearing"] is False
    assert region["actualGeometryCertificate"]["proof"]["sourceFace"] is None
    assert old["sourceFace"] is old["sourceRange"] is None
    assert old["worldWitness"]==[33.5,8.23,25.96000000089407]
    probe = json.loads((HERE/"architect-probe.json").read_bytes())
    point = pins["candidatePoint"]
    assert point==probe["candidateActualSurfacePoint"]==[33.5,8.330000001490117,25.92000000178814]
    assert point==[old["worldWitness"][0],old["parts"][1]["worldBounds"]["max"][1],old["parts"][0]["worldBounds"]["min"][2]]
    assert point!=old["worldWitness"]

    spec = importlib.util.spec_from_file_location("original_source_triangles",
        ROOT/"art/source/shared-map-fire-bindings/export.py")
    G = importlib.util.module_from_spec(spec);spec.loader.exec_module(G)
    bindings = read(old["physicalBindingsPath"])
    source_indices = [6304,2406]
    node_parts = []
    result = []
    for i,previous in enumerate(old["parts"]):
        endpoint = previous["endpoint"]
        primitive = pins["selectedOriginalPrimitives"][endpoint]
        assert primitive==[10,0][i] and previous["connectedPhysicalComponent"]["id"]==0
        assert primitive in previous["connectedPhysicalComponent"]["originalPrimitives"]
        assert previous["geometry"]["sourceRange"] is None
        assert previous["sourceFace"] is previous["nativeRecordId"] is previous["nativeCell"] is None
        c = bindings["carriers"][source_indices[i]]
        assert c["id"]==previous["ownerId"] and c["role"]==["exterior-wall","timber-fitting"][i]
        geom = read(previous["geometry"]["path"])
        assert sha((ROOT/previous["geometry"]["path"]).read_bytes())==previous["geometry"]["rawSha256"]
        matrix = previous["emittedWorldMatrix"]
        assert float_hash(matrix)==previous["matrixFloat64LittleEndianSha256"]
        ts = G.triangles(geom,matrix,None)
        assert len(ts)==12
        assert float_hash([v for t in ts for p in t for v in p])==previous["originalOrderedWorldTrianglesFloat64LittleEndianSha256"]
        selected = ts[primitive]
        exact = exact_face(selected,point)
        assert exact["unitOutwardNormalExact"]==[[0,0,-1],[0,1,0]][i]
        endpoint_bounds = region[endpoint+"Bounds"]
        for box in [endpoint_bounds,region["selector"]]:
            assert all(F(box["min"][a])<=F(point[a])<=F(box["max"][a]) for a in range(3))
        old_point_residual = dot(exact["unitOutwardNormalExact"],sub(list(map(F,old["worldWitness"])),list(map(F,selected[0]))))
        assert old_point_residual != 0
        result.append({
            "endpoint":endpoint,"partId":previous["partId"],"ownerId":previous["ownerId"],
            "placeId":"new-york","role":c["role"],
            "originalPhysicalBindingsPointer":"/carriers/"+str(source_indices[i]),
            "globalSourcePartIndexRequiredByContract":source_indices[i],
            "component":0,"selectedOriginalPrimitive":primitive,
            "originalVertexRecords":previous["connectedPhysicalComponent"]["originalVertexRecordIndicesByPrimitive"][primitive],
            "geometry":previous["geometry"],"emittedWorldMatrix":matrix,
            "matrixFloat64LittleEndianSha256":previous["matrixFloat64LittleEndianSha256"],
            "originalOrderedWorldTrianglesFloat64LittleEndianSha256":previous["originalOrderedWorldTrianglesFloat64LittleEndianSha256"],
            "contactFaceProof":exact,"originalEndpointBounds":endpoint_bounds,
            "contactOnEndpointBoundary":[{"axis":a,"side":side} for a in range(3) for side in ["min","max"] if F(point[a])==F(endpoint_bounds[side][a])],
            "historicalVolumeWitnessSignedPlaneDistanceExact":rational(old_point_residual),
            "originalSourceRange":None,"nativeRecordId":None,"nativeCell":None,"nativeFaceLineage":None})
        node_parts.append({"partId":previous["partId"],"triangles":ts,"selectedPrimitive":primitive,"endpointBounds":endpoint_bounds})
    assert dot(result[0]["contactFaceProof"]["unitOutwardNormalExact"],result[1]["contactFaceProof"]["unitOutwardNormalExact"])==0
    completed = subprocess.run(["node",str(HERE/"check-contact.mjs")],cwd=ROOT,
        input=json.dumps({"parts":node_parts,"point":point,"selector":region["selector"],"oldVolumeWitness":old["worldWitness"]}),
        capture_output=True,text=True,timeout=30)
    assert completed.returncode==0,completed.stderr
    contact = json.loads(completed.stdout)
    assert all(contact["contact"].values()) and len(contact["negativeControls"])==8
    assert all(n["rejected"] for n in contact["negativeControls"])
    return {
        "version":1,"status":"UNACCEPTED_ONE_CONTACT_SOURCE_INTERPRETATION","runtimeConsumable":False,
        "authorityCommit":pins["authorityCommit"],"artistParent":pins["artistParent"],
        "relationshipId":old["relationshipId"],"localRegionId":old["localRegionId"],
        "interpretation":"proposed-fixed-original-surface-contact","runtimeKind":None,
        "direction":"parent-to-child","geometricBearing":False,"groundAnchor":False,
        "candidatePoint":point,"frame":"emitted-world","units":"metres",
        "sourceOffsetAlreadyApplied":True,"additionalOffsetApplied":False,
        "parts":result,"originalSharedSelector":region["selector"],
        "preservedVolumeEvidence":{"sourceRecordPath":OLD+"source-record.json",
            "sourceRecordSha256":sha((ROOT/(OLD+"source-record.json")).read_bytes()),
            "sourceRelationshipInputPath":OLD+"frozen-unresolved-binding.json",
            "selectedRegionPointer":"/originalRelationship/localRegions/"+str(region_index),
            "worldWitness":old["worldWitness"],"sourceFace":None,"sourceRange":None,
            "geometricBearing":False,"recordReplacedOrJittered":False,
            "allNineAcceptedPayloadFilesAndPackageUnchanged":True},
        "nativeContactGeometryVerification":contact,
        "approximation":{
            "meaning":"For this one source proposal, use the existing binary non-volume contact path at a real fixed original surface intersection, instead of claiming a strict single-native-record volume embed.",
            "geometry":"The selected vertical rear wall face and horizontal cornice top face meet transversely. The exact point is strictly inside both original triangles and inside the closed original selectors.",
            "bearing":"Perpendicular normals and geometricBearing false remain explicit. Surface contact alone establishes no mechanical fastener, load capacity or assembly grounding.",
            "direction":"The contact predicate is geometric; its symmetric answer does not authorize a symmetric support edge or reverse brace. The proposed dependency remains parent-to-child.",
            "clipping":"Selector-clipped facets are temporary subsets of the original surfaces, with original primitive provenance; no generated closing cap or new geometry asset is used.",
            "scope":"No global volume rule is changed. The original source volume embed remains valid and preserved; the candidate is an alternative interpretation pending review."
        },
        "remaining":[
            "Architect acceptance of this one contact interpretation and runtime kind is separate from source contact truth.",
            "Coder must derive fixed native owner record/cell and face lineage from actual source projection/loop and authenticated receipts, not centroid, witness cell, guessed suffix or survivor.",
            "Wall selected physical face must map through its actual solid channel, and the cornice selected face through its original surface channel; the separately authorized one-pair native validation is not run by this artist check.",
            "Intact/bound-owner/unrelated-retirement liveness and corrected core admission are untested here.",
            "No full catalogue, native/world/support-graph, live adapter, grounding or production acceptance is claimed."
        ],
        "checks":{"originalParts":2,"originalTriangles":24,"selectedOriginalPrimitives":[10,0],
            "exactBarycentricAndPlaneChecks":True,"exactClosedSelectorChecks":True,
            "unchangedNativeContactOnSelectedAndClippedFacets":True,"negativeControls":8,
            "priorVolumeProofPreserved":True,"originalGeometryUvMatricesRolesQuantitiesIdsUnchanged":True,
            "newAnchorsReverseBracesOrMountGeometry":False,"artistNativeCompilerCalls":0,
            "artistNativePairAllowanceConsumed":False,"supportFactoryWorldGraphRendererBuildBenchmarkOrRetainedHelper":False}
    }

def main():
    parser = argparse.ArgumentParser();parser.add_argument("--record",action="store_true")
    args = parser.parse_args();result = derive()
    if args.record:dump(HERE/"contact-record.json",result)
    expected = set(PAYLOAD+["review-package.json"])
    for p in HERE.rglob("*"):
        if p.is_file():assert p.relative_to(HERE).as_posix() in expected
    for link in re.findall(r"\]\(([^)]+)\)",(HERE/"README.md").read_text()):
        assert (HERE/link).resolve().is_file(),link
    if args.record:
        files = []
        for name in PAYLOAD:
            b=(HERE/name).read_bytes();files.append({"path":REL+"/"+name,"bytes":len(b),"sha256":sha(b)})
        dump(HERE/"review-package.json",{"version":1,"status":"SOURCE_CONTACT_PROPOSAL_ONLY",
            "artistParent":result["artistParent"],"authorityCommit":result["authorityCommit"],
            "scope":[REL+"/"],"files":files,"remaining":result["remaining"],
            "nativeOrRuntimeInstallation":False,"retainedHelpers":False,
            "scopeReview":"Candidate commit against its own parent; unrelated combined-tree edits are outside this source check.",
            "verification":"python -B "+REL+"/check.py"})
    else:
        assert json.loads((HERE/"contact-record.json").read_bytes())==result
        package=json.loads((HERE/"review-package.json").read_bytes())
        assert {p["path"] for p in package["files"]}=={REL+"/"+n for n in PAYLOAD}
        for p in package["files"]:
            b=(ROOT/p["path"]).read_bytes()
            assert len(b)==p["bytes"] and sha(b)==p["sha256"],p["path"]
    print(json.dumps({"result":"pass","relationship":result["relationshipId"],"region":result["localRegionId"],
        "point":result["candidatePoint"],"originalPrimitives":[10,0],
        "selectedAndBothClippedContactChecks":3,"negativeControls":8,
        "oldVolumeProof":"unchanged","artistNativeCompilations":0},separators=(",",":")))

if __name__ == "__main__":main()
