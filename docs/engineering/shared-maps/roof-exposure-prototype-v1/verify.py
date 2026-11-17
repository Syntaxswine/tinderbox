"""Source/pin/partition and accepted material-role checks; no second exposure solver."""
from pathlib import Path
from fractions import Fraction as F
import json,subprocess,hashlib,re
import geometry as G

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
SOURCE="2b350309d9116812a1d3988af090614bdaefbc25"
ARTIST="e347fe4a3eec5d57c83447144982d3a7c70713cd"
AUTHORITY="03de2860aa7f09e068922bb1b85aae3e24918849"
PACKAGE="art/source/shared-map-fire-bindings/remaining-material-proposal-v1/"
PREFIX="assets/art/place-scenes/horticulture/"
sha=lambda b:hashlib.sha256(b).hexdigest()
def load_file(name):return json.loads((HERE/name).read_text(encoding="utf-8"))
pins=load_file("input-pins.json");selection=load_file("selection.json");result=load_file("result.json")
ledger=load_file("candidate-ledger.json")["records"];partitions=load_file("exposure-cells.json")["roofPartitions"]
original={r["path"]:r for r in pins["reads"] if r["commit"]==SOURCE}
reference_reads=[]
def git(commit,path):
    raw=subprocess.check_output(["git","show",commit+":"+path],cwd=ROOT)
    reference_reads.append({"commit":commit,"path":path,"sha256":sha(raw),"bytes":len(raw)})
    return raw
def value(q):return F(int(q["n"]),int(q["d"])) if isinstance(q,dict) and "n" in q else F(q)
def poly(q):return [tuple(map(value,p)) for p in q]
def packed(v):
    if isinstance(v,F):return {"n":str(v.numerator),"d":str(v.denominator),"approx":float(v)}
    if isinstance(v,dict):return {k:packed(x) for k,x in v.items()}
    if isinstance(v,(list,tuple)):return [packed(x) for x in v]
    return v
def save(name,data):(HERE/name).write_text(json.dumps(packed(data),indent=2)+"\n",encoding="utf-8",newline="\n")
for row in pins["reads"]:assert sha(git(row["commit"],row["path"]))==row["sha256"]
for path,expected in pins["sourceFileHashes"].items():assert sha((HERE/path).read_bytes())==expected
assert len(selection["candidateRecords"])==len(ledger)==230
ids=[r["id"] for r in selection["candidateRecords"]]
assert len(set(ids))==230 and sha(("\n".join(sorted(ids))+"\n").encode())==selection["candidateIdSetSha256"]
assert [r["roofOffset"] for r in partitions]==result["roofUpperOffsets"]==[0,3,6,9,12,15]
covered=F(0);exposed=F(0)
for row in partitions:
    c=[poly(x["polygon"]) for x in row["coveredCells"]];e=[poly(x) for x in row["exposedConvexCells"]]
    # Validate retained analytical certificates; do not recompute another exposure solution.
    assert G.disjoint(c) and G.disjoint(e)
    assert all(G.area(G.intersection(a,b))==0 for a in c for b in e)
    ca=sum(map(G.area,c),F(0));ea=sum(map(G.area,e),F(0))
    assert ca==value(row["coveredProjectedArea"]) and ea==value(row["exposedProjectedArea"])
    assert ca+ea==value(row["projectedDomainArea"])
    covered+=ca;exposed+=ea
assert covered==value(result["geometricCoveredProjectedArea"])==value(result["cornicesAloneCoveredProjectedArea"])
assert exposed==value(result["geometricExposedProjectedArea"]) and covered+exposed==2736
factor=value(result["commonSurfaceAreaFactorSquared"])
for name,projection in [("actualUpperRoofArea",covered+exposed),("geometricCoveredActualRoofArea",covered),("geometricExposedActualRoofArea",exposed)]:
    certificate=result[name];rad=value(certificate["radicand"]);lo=value(certificate["lower"]);hi=value(certificate["upper"])
    assert rad==projection*projection*factor and lo*lo<=rad<=hi*hi and hi-lo<=F(1,1<<128)
assert len(load_file("negative-controls.json")["controls"])==6
assert not result["weatherExposureAccepted"] and result["quantityReference"] is None
# Accepted family scope is explicit design, distinct from the unchanged historical flags.
material_raw=git(ARTIST,PACKAGE+"horticulture-proposal.json")
assert sha(material_raw)=="c650fd0fad72a0ad926f4e6a2471d626c42da42966f6b01191753db9fac78911"
families=json.loads(material_raw)["families"]
decision=git(AUTHORITY,"docs/engineering/shared-maps/remaining-material-decision.md").decode("utf-8")
assert "Accept the exact A01" in decision and "H01" in decision and "H22" in decision
builder=git(SOURCE,"assets/art/exposition-horticulture/index.js").decode("utf-8")
assert "function cornice(poly,id,y,skip=[])" in builder and "[2,.18,.96,-.04]" in builder and "'trim'" in builder
assert "physicalMaterial:'unassigned'" in builder
selector=git(ARTIST,PACKAGE+"analyze.py").decode("utf-8")
assert "chosen=next(rule for rule in table if match(rule['scope'],row))" in selector
def match(condition,part):
    if "all" in condition:return all(match(c,part) for c in condition["all"])
    if "any" in condition:return any(match(c,part) for c in condition["any"])
    if "not" in condition:return not match(condition["not"],part)
    if "roleIn" in condition:return part.get("role") in condition["roleIn"]
    if "idRegex" in condition:return re.search(condition["idRegex"],part["id"].removeprefix("replacement/")) is not None
    raise AssertionError(condition)
def source_faces(part):
    metadata_path=PREFIX+"sections/"+part["sectionId"]+".json"
    original_part=next(r for r in json.loads(git(SOURCE,metadata_path))["parts"] if r["id"]==part["id"])
    assert original_part=={k:part[k] for k in original_part}
    path=PREFIX+"geometry/"+part["geometry"]+".json";data=git(SOURCE,path);assert sha(data)==original[path]["sha256"]
    geometry=json.loads(data);a=geometry["attributes"]["position"]["array"]
    vertices=[tuple(map(F,a[i:i+3])) for i in range(0,len(a),3)]
    indices=geometry["index"]["array"] if geometry["index"] else list(range(len(vertices)))
    m=tuple(map(F,part["matrix"]))
    def point(v):return tuple(m[k+12]+sum(m[k+4*j]*v[j] for j in range(3)) for k in range(3))
    return [(i,tuple(point(vertices[j]) for j in indices[i:i+3])) for i in range(0,len(indices),3)]
cornices=[]
for part in selection["candidateRecords"]:
    if not part["id"].startswith("end-upper-cornice"):continue
    family=next(f for f in families if match(f["scope"],part))
    assert family["id"]=="H22" and family["proposedPhysicalMaterial"]=="mineral-staff-proxy"
    assert family["ownershipProposal"]=="one-per-original-logical-solid" and family["quantityRule"]=="inert"
    faces=source_faces(part);triangles=[t for _,t in faces]
    envelope=G.source_envelope(triangles);assert envelope["closedOriented"] and envelope["convexOutward"]
    volume=sum((G.dot(t[0],G.cross(t[1],t[2]))/6 for t in triangles),F(0));assert volume>0
    upper=[(i,t) for i,t in faces if G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0]))[1]>0]
    assert len(upper)==2
    points=set((p[0],p[2]) for _,t in upper for p in t);assert len(points)==4
    rectangle={(x,z) for x in (min(p[0] for p in points),max(p[0] for p in points)) for z in (min(p[1] for p in points),max(p[1] for p in points))}
    assert points!=rectangle,"The archived rectangular-top shortcut must remain rejected"
    cornices.append({"sourceId":part["id"],"originalSection":part["sectionId"],"originalGeometry":part["geometry"],
      "capturedMaterialId":part["material"],"capturedRole":part.get("role"),"fromAccess":part["fromAccess"],
      "originalAppearanceSlot":"trim","originalPhysicalToken":"unassigned","originalBuilderReference":"assets/art/exposition-horticulture/index.js:15-18,76-83",
      "acceptedDesignFamily":"H22","acceptedMaterial":"mineral-staff-proxy","acceptedQuantityRecipe":"inert",
      "acceptedOwnership":"one-per-original-logical-solid","notVisualOnlyFollowerUnderAcceptedOwnership":True,
      "closedConvexCapturedSourceEnvelope":envelope,"positiveEnvelopeVolume":True,"numericVolumeQuantityAssigned":False,
      "topTriangleOffsets":[i for i,_ in upper],"actualTopProjectedVertices":sorted(points),
      "actualMiteredTopIsNotItsAxisAlignedBoundsRectangle":True,
      "weatherCoverDecision":"Architect may classify these substantial accepted inert trim source solids as covers; no new runtime opacity field is required."})
assert len(cornices)==4
roof_family=next(f for f in families if match(f["scope"],selection["target"]))
assert roof_family["id"]=="H21" and roof_family["quantityRule"]=="weather-area"
save("material-role-references.json",{
  "authorityCommit":AUTHORITY,"acceptedFamilyProposalCommit":"5da6393cc5be1041d1042f7b6214d2d7ff9ae764",
  "proposalReadCommit":ARTIST,"proposalSha256":sha(material_raw),
  "decisionPath":"docs/engineering/shared-maps/remaining-material-decision.md",
  "acceptedScopeDoesNotAssignStockBindingsOrSupport":True,"historicalProposalAcceptedFlagsLeftUnchanged":True,
  "targetFamily":{"id":"H21","material":roof_family["proposedPhysicalMaterial"],"quantityRule":"weather-area","metadataRole":selection["target"]["role"]},
  "cornices":cornices,"additionalReferenceReads":reference_reads[len(pins["reads"]):],
  "classificationRecommendation":"For this roof, accept the actual upper-envelope calculation with the four closed H22 cornices counted as cover. This is a proposal for the architect, not an installed quantity or runtime rule.",
  "noRuntimeFieldOrNewSolverProposed":True})
checks={"passed":True,"originalPinsVerified":len(pins["reads"]),"exactCandidateCount":230,"selectedGeometryFiles":8,
        "disjointAnalyticalPartitionVerified":True,"projectedAreaConserved":2736,"areaRadicandsAnd128BitIntervalsVerified":True,
        "cornicesOnlyUnionMatchesAll230":True,"fourH22OwnSourceSolidsVerified":True,"retainedRectangleShortcut":"rejected on actual mitered tops; no bounds substitution",
        "failedShortcutSource":"history/rejected-rectangle-check.py.txt","failedShortcutLog":"history/rejected-rectangle-check.log",
        "weatherCoverRemainsArchitectDecision":True,"runtimeFieldOrAdditionalExposureSolver":False,
        "sourceHashes":{p.name:sha(p.read_bytes()) for p in (HERE/"proof.py",HERE/"geometry.py",HERE/"verify.py")}}
save("checks.json",checks)
print(json.dumps({"passed":True,"pins":len(pins["reads"]),"candidates":230,"corniceFamily":"H22","closedOwnSourceSolids":len(cornices),"rectangularShortcutRejected":True,"weatherDecision":"architect"}))
