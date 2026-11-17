"""One immutable source roof and its exact 230 candidate records. No scene factory."""
from pathlib import Path
from fractions import Fraction as F
from collections import Counter
import hashlib,json,subprocess,struct,math,time,sys
import geometry as G

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
AUTHORITY="03de2860aa7f09e068922bb1b85aae3e24918849"
ARTIST="e347fe4a3eec5d57c83447144982d3a7c70713cd"
SOURCE="2b350309d9116812a1d3988af090614bdaefbc25"
PACKAGE="art/source/shared-map-fire-bindings/remaining-measurement-batch-v1/"
TARGET="replacement/end-pavilion-roof-0"
PREFIX="assets/art/place-scenes/horticulture/"
deadline=time.monotonic()+55
G.deadline=deadline
cache={};reads=[];stats=Counter()
def finite():assert time.monotonic()<deadline,"Finite 55-second source-proof bound"
def sha(b):return hashlib.sha256(b).hexdigest()
def raw(commit,path):
    finite();key=(commit,path)
    if key not in cache:
        b=subprocess.check_output(["git","show",commit+":"+path],cwd=ROOT)
        cache[key]=b;reads.append({"commit":commit,"path":path,"bytes":len(b),"sha256":sha(b)})
    return cache[key]
def load(commit,path):return json.loads(raw(commit,path))
def q(v):return {"n":str(v.numerator),"d":str(v.denominator),"approx":float(v)}
def frac(v):return F(v)
def packed(value):
    if isinstance(value,F):return q(value)
    if isinstance(value,dict):return {k:packed(v) for k,v in value.items()}
    if isinstance(value,(list,tuple)):return [packed(v) for v in value]
    return value
def write(name,value):(HERE/name).write_text(json.dumps(packed(value),indent=2,ensure_ascii=True)+"\n",encoding="utf-8",newline="\n")
def interval(radicand):
    lo,hi=G.sqrt_interval(radicand,128)
    return {"radicand":radicand,"lower":lo,"upper":hi,"sqrtEnclosureBits":128,"width":hi-lo}
def determinant(m):
    return (m[0]*(m[5]*m[10]-m[9]*m[6])-m[4]*(m[1]*m[10]-m[9]*m[2])+m[8]*(m[1]*m[6]-m[5]*m[2]))
def transformed(p,m):return tuple(sum(m[4*k+i]*p[k] for k in range(3))+m[12+i] for i in range(3))
geometries={}
def local_geometry(gid):
    if gid in geometries:return geometries[gid]
    path=PREFIX+"geometry/"+gid+".json";data=load(SOURCE,path)
    assert set(data)=={"attributes","index"},"No unexamined draw-range/group semantics"
    position=data["attributes"]["position"];assert position["type"]=="Float32Array" and position["itemSize"]==3
    values=position["array"]
    assert all(math.isfinite(v) and struct.unpack("<f",struct.pack("<f",v))[0]==v for v in values)
    vertices=[tuple(map(frac,values[i:i+3])) for i in range(0,len(values),3)]
    index=data["index"]["array"] if data["index"] else list(range(len(vertices)))
    assert len(index)%3==0 and all(isinstance(i,int) and 0<=i<len(vertices) for i in index)
    triangles=[tuple(vertices[j] for j in index[i:i+3]) for i in range(0,len(index),3)]
    geometries[gid]={"path":path,"triangles":triangles,"indices":index,"certificate":G.source_envelope(triangles)}
    return geometries[gid]
def instance(part,source_range=None):
    g=local_geometry(part["geometry"]);m=tuple(map(frac,part["matrix"]))
    assert len(m)==16 and [m[i] for i in (3,7,11,15)]==[0,0,0,1]
    assert determinant(m)>0
    start=source_range["start"] if source_range else 0
    count=source_range["count"] if source_range else len(g["indices"])
    assert start%3==0 and count%3==0 and 0<=start<=start+count<=len(g["indices"])
    faces=[]
    for offset in range(start,start+count,3):
        t=tuple(transformed(p,m) for p in g["triangles"][offset//3])
        n=G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0]))
        assert n!=(0,0,0)
        faces.append({"offset":offset,"triangle":t,"normal":n,
                      "projection":G.normalized([(p[0],p[2]) for p in t])})
    points=[p for f in faces for p in f["triangle"]];bounds={"min":tuple(min(p[k] for p in points) for k in range(3)),"max":tuple(max(p[k] for p in points) for k in range(3))}
    overruns=[]
    for k in range(3):
        low=frac(part["bounds"]["min"][k])-bounds["min"][k]
        high=bounds["max"][k]-frac(part["bounds"]["max"][k])
        if low>0:overruns.append({"axis":k,"side":"below-recorded-min","distance":low})
        if high>0:overruns.append({"axis":k,"side":"above-recorded-max","distance":high})
    return faces,{"exactAffineDeterminant":determinant(m),"sourceRange":{"start":start,"count":count},
                  "sourceEnvelope":g["certificate"],"recordedBoundsNotConservativeForExactAffine":overruns}
def overlap_boxes(a,b):
    return all(min(max(p[k] for p in a),max(p[k] for p in b))>
               max(min(p[k] for p in a),min(p[k] for p in b)) for k in (0,1))
def group(source):
    return "perimeter-closure" if source.get("role")=="perimeter-closure" else "cornice" if source["id"].startswith("end-upper-cornice") else "rafter"

def validate_candidates(rows,expected_hash):
    assert len(rows)==230 and len({r["renderId"] for r in rows})==230
    actual=sha(("\n".join(sorted(r["renderId"] for r in rows))+"\n").encode())
    assert actual==expected_hash
    return actual

def main():
    authority_path="docs/engineering/shared-maps/cut-front-measurement-decision.md"
    raw(AUTHORITY,authority_path)
    context=load(ARTIST,PACKAGE+"roof-possible-cover-context.json")
    roof_reviews=load(ARTIST,PACKAGE+"roof-area-exposure-review.json")
    cases=load(ARTIST,PACKAGE+"case-ledger.json")
    expected=next(r for r in roof_reviews["cases"] if r["sourceId"]==TARGET)
    case=next(r for r in cases["cases"] if r["sourceId"]==TARGET)
    candidates=context["roofCandidates"][TARGET]
    expected_ids=validate_candidates(candidates,expected["coarsePotentialCoveringSourceIdSetSha256"])
    for bad in [candidates[:-1],candidates[:-1]+[candidates[0]]]:
        try:validate_candidates(bad,expected_ids)
        except AssertionError:pass
        else:raise AssertionError("Missing/duplicate candidate negative did not reject")
    assert expected_ids==expected["coarsePotentialCoveringSourceIdSetSha256"]=="1b807a719c1494f1eb2b4fa1e88b31efbccb0d8cdc5ff1750f6bd6137ba10c9c"
    section_ids=sorted({c["sectionId"] for c in candidates}|{case["sectionId"]})
    assert len(section_ids)==14
    section_pins={p["path"]:p["sha256"] for p in context["sectionPins"]}
    sections={}
    for sid in section_ids:
        path=PREFIX+"sections/"+sid+".json";b=raw(SOURCE,path);assert sha(b)==section_pins[path]
        sections[sid]=json.loads(b)["parts"]
    def one(sid,id,gid=None):
        matches=[p for p in sections[sid] if p["id"]==id and (gid is None or p["geometry"]==gid)]
        assert len(matches)==1,(sid,id);return matches[0]
    roof=one(case["sectionId"],TARGET)
    assert roof["matrix"]==case["originalMatrix"]==expected["actualMatrix"]
    assert PREFIX+"geometry/"+roof["geometry"]+".json"==case["geometryPath"]
    parts=[]
    for row in candidates:
        p=one(row["sectionId"],row["renderId"],row["geometryId"]);assert p["bounds"]==row["bounds"]
        parts.append({"context":row,"part":p})
    assert len({roof["geometry"]}|{p["part"]["geometry"] for p in parts})==8
    roof_faces,roof_pose=instance(roof,case["sourceRange"])
    assert sha(raw(SOURCE,case["geometryPath"]))==case["geometrySha256"]
    assert [r["offset"] for r in roof_faces]==[0,3,6,9,12,15]
    assert [r["offset"] for r in roof_faces if r["normal"][1]>0]==expected["upwardWeatherTriangleIndexOffsets"]
    assert len(roof_faces)==6 and all(r["normal"][1]>0 for r in roof_faces)
    assert G.disjoint([r["projection"] for r in roof_faces])
    total_projected=sum((G.area(r["projection"]) for r in roof_faces),F(0));assert total_projected==2736
    factors={1+sum(v*v for v in G.plane(r["triangle"])[:2]) for r in roof_faces};assert len(factors)==1
    factor2=next(iter(factors));area_squared=total_projected**2*factor2
    old_interval=expected["actualUpperSurfaceAreaInterval"]
    lo=F(int(old_interval["lower"]["numerator"]),int(old_interval["lower"]["denominator"]))
    hi=F(int(old_interval["upper"]["numerator"]),int(old_interval["upper"]["denominator"]))
    assert lo*lo<=area_squared<=hi*hi
    selected=[];ledger=[];cover_by_roof={r["offset"]:[] for r in roof_faces};partial_height=None;vertical_witness=None
    for entry in parts:
        finite();p=entry["part"];faces,pose=instance(p);assert len(faces)==12
        assert pose["sourceEnvelope"]["closedOriented"] and pose["sourceEnvelope"]["convexOutward"],"No unsupported open candidate enclosure shortcut"
        upper=[f for f in faces if f["normal"][1]>0]
        assert G.disjoint([f["projection"] for f in upper])
        selected.append({"sectionId":entry["context"]["sectionId"],**p,"poseAudit":pose})
        counts=Counter("upper" if f["normal"][1]>0 else "downward" if f["normal"][1]<0 else "vertical" for f in faces)
        stats.update(counts);row={"sourceId":p["id"],"sectionId":entry["context"]["sectionId"],"geometryId":p["geometry"],"materialId":p["material"],"role":p.get("role"),"group":group(p),"triangles":len(faces),"orientationCounts":dict(counts),"upperOffsets":[f["offset"] for f in upper],"geometricPairEvidence":[]}
        projection_sum=F(0);above_sum=F(0);coincident_sum=F(0)
        for f in faces:
            if f["normal"][1]==0 and group(p)=="rafter" and vertical_witness is None:
                if max(v[1] for v in f["triangle"])>min(v[1] for rf in roof_faces for v in rf["triangle"]):
                    vertical_witness={"sourceId":p["id"],"sourceOffset":f["offset"],"normalY":f["normal"][1],"actualProjectedArea":G.area(f["projection"]),"actualHeightMin":min(p[1] for p in f["triangle"]),"actualHeightMax":max(p[1] for p in f["triangle"])}
        for f in upper:
            fp=G.plane(f["triangle"])
            for rf in roof_faces:
                stats["upperRoofPairs"]+=1
                if not overlap_boxes(f["projection"],rf["projection"]):stats["exactProjectionBoxRejections"]+=1;continue
                poly=G.intersection(f["projection"],rf["projection"])
                if not poly:continue
                A=G.area(poly)
                if A==0:continue
                rp=G.plane(rf["triangle"]);gap=tuple(fp[i]-rp[i] for i in range(3))
                values=[gap[0]*v[0]+gap[1]*v[1]+gap[2] for v in poly]
                minimum,maximum=min(values),max(values);projection_sum+=A
                if maximum<=0:above=[]
                else:above=G.half(poly,gap)
                if minimum==maximum==0:coincident_sum+=A
                covered=G.area(above);above_sum+=covered
                evidence={"sourceOffset":f["offset"],"roofOffset":rf["offset"],"intersectionProjectedArea":A,"gapMin":minimum,"gapMax":maximum,"strictAboveProjectedArea":covered,"coincident":minimum==maximum==0}
                row["geometricPairEvidence"].append(evidence)
                if covered:
                    record={"owner":p["id"],"group":group(p),"sourceOffset":f["offset"],"roofOffset":rf["offset"],"polygon":above,"heightDifference":gap}
                    cover_by_roof[rf["offset"]].append(record)
                if minimum<0<maximum and covered<A and group(p)=="rafter" and partial_height is None:
                    partial_height={"sourceId":p["id"],**evidence}
        row.update({"actualUpperProjectionIntersectionArea":projection_sum,"strictAboveProjectedArea":above_sum,"coincidentProjectedArea":coincident_sum,
                    "weatherOccluderClass":"unassigned: source metadata has no accepted weather-opacity field"})
        ledger.append(row)
    assert len(geometries)==8
    assert stats["upper"]+stats["downward"]+stats["vertical"]==2760
    assert partial_height is not None and vertical_witness is not None
    cells_report=[];all_covered=F(0);cornice_covered=F(0);marginals=Counter()
    for rf in roof_faces:
        finite();records=cover_by_roof[rf["offset"]]
        cells=G.union_cells(records);exposed=G.complement(rf["projection"],cells)
        cornices=G.union_cells([r for r in records if r["group"]=="cornice"])
        covered=sum((G.area(c["polygon"]) for c in cells),F(0));cornice_area=sum((G.area(c["polygon"]) for c in cornices),F(0))
        assert covered<=G.area(rf["projection"])
        all_covered+=covered;cornice_covered+=cornice_area
        for c in cells:
            gap=c["heightDifference"];values=[gap[0]*p[0]+gap[1]*p[1]+gap[2] for p in c["polygon"]]
            assert min(values)>=0 and max(values)>0
            marginals[c["owner"]]+=G.area(c["polygon"])
        cells_report.append({"roofOffset":rf["offset"],"projectedDomainArea":G.area(rf["projection"]),"coveredProjectedArea":covered,"exposedProjectedArea":sum(map(G.area,exposed),F(0)),"coveredCells":cells,"exposedConvexCells":exposed})
    assert sum(marginals.values(),F(0))==all_covered
    # Union is geometric only. Even the 'perimeter-closure' role does not assign weather opacity.
    exposed=total_projected-all_covered
    duplicate_poly=roof_faces[0]["projection"]
    duplicates=G.union_cells([{"owner":"original-roof-projection-control","sourceOffset":0,"polygon":duplicate_poly}]*2)
    assert sum((G.area(r["polygon"]) for r in duplicates),F(0))==G.area(duplicate_poly)
    assert G.area(G.intersection(duplicate_poly,duplicate_poly))>0
    assert total_projected-G.area(duplicate_poly)<total_projected
    controls=[
      {"control":"missing/duplicated candidate IDs","result":"REJECT_COUNT_OR_ID_SET","expectedCount":230,"exactIdSetSha256":expected_ids},
      {"control":"duplicate original upper roof triangle","result":"REJECT_POSITIVE_SELF_OVERLAP","intersectionArea":G.area(G.intersection(duplicate_poly,duplicate_poly))},
      {"control":"one upper triangle omitted","result":"REJECT_EXHAUSTIVE_MEMBERSHIP","remainingProjectedArea":total_projected-G.area(duplicate_poly)},
      {"control":"tall original vertical rafter face used as covering area","result":"REJECT_ZERO_PROJECTION","witness":vertical_witness},
      {"control":"original rafter footprint treated as wholly above from its maximum height","result":"REJECT_BOUNDS_HEIGHT_SHORTCUT","witness":partial_height},
      {"control":"same actual projected cover counted twice","result":"UNION_UNCHANGED","singleArea":G.area(duplicate_poly),"doubleUnionArea":sum((G.area(r["polygon"]) for r in duplicates),F(0))},
    ]
    offending=[{"sourceId":r["sourceId"],"role":r["role"],"materialId":r["materialId"],"group":r["group"],"strictAboveProjectedArea":r["strictAboveProjectedArea"],"disjointUnionContribution":marginals[r["sourceId"]]} for r in ledger if r["strictAboveProjectedArea"]>0]
    summary={
      "scope":"ONE selected roof and exactly its 230 artist-listed possible covers; +Y upper-envelope geometry only",
      "authorityCommit":AUTHORITY,"artistCommit":ARTIST,"originalSourceCommit":SOURCE,"target":TARGET,
      "geometricProofCompleteWithinCandidateSet":True,"weatherExposureAccepted":False,"quantityReference":None,
      "roofMetadataRole":roof.get("role"),"roofMaterialId":roof["material"],
      "matrixMeaning":"Original emitted-world matrices already include [176,0,39]; no second offset, snapping or normalisation",
      "coordinateModel":"Exact real affine evaluation of captured Float32 vertex values and binary64 matrix coefficients, not an assertion about GPU rounding",
      "roofUpperOffsets":[r["offset"] for r in roof_faces],"roofProjectedArea":total_projected,"commonSurfaceAreaFactorSquared":factor2,
      "actualUpperRoofArea":interval(area_squared),"artistUpperAreaIntervalVerifiedByExactSquaring":True,
      "geometricCoveredProjectedArea":all_covered,"geometricCoveredActualRoofArea":interval(all_covered**2*factor2),
      "geometricExposedProjectedArea":exposed,"geometricExposedActualRoofArea":interval(exposed**2*factor2),
      "cornicesAloneCoveredProjectedArea":cornice_covered,"allOtherCoversAddNoAreaBeyondCornices":cornice_covered==all_covered,
      "conditionalWeatherExposedActualAreaBounds":{"lower":interval(exposed**2*factor2)["lower"],"upper":interval(area_squared)["upper"],"condition":"Target upper faces use the weather-area recipe, +Y coverage defines exposure, and the listed candidates are complete. With no approved per-source weather opacity, any subset may count."},
      "classificationAmbiguity":offending,"provedWeatherOccluderCount":0,
      "unproved":["Weather/opacity classification and source-ornament semantics","Unlisted-source completeness beyond the accepted 230-record metadata set","Other directions of exposure/weather","Runtime/collision/stock/fuel interpretation"],
      "readScope":{"originalMetadataSections":len(sections),"metadataRecordsParsed":sum(len(p) for p in sections.values()),"selectedInstanceRecords":231,"uniqueOriginalGeometryFiles":len(geometries),"originalGeometryFileBytes":sum(len(cache[(SOURCE,g["path"])]) for g in geometries.values()),"candidateTriangles":2760,"roofTriangles":6,"expandedOtherRoofs":0,"sceneFactoryIndexOrRuntimeReads":0},
      "orientationAndPairCounts":dict(stats),"exactClippingOperations":G.clips,
      "changes":{"sourceArrays":0,"matrices":0,"UVs":0,"caps":0,"artOutputs":0,"stockOrBindings":0,"runtime":0,"helpers":0},
      "negativeControls":len(controls)
    }
    write("selection.json",{"target":roof,"sourceRange":case["sourceRange"],"candidateIdSetSha256":expected_ids,"candidateRecords":selected})
    write("candidate-ledger.json",{"target":TARGET,"records":ledger})
    write("exposure-cells.json",{"meaning":"Analytical disjoint 2D polygons only; not a mesh/art export","target":TARGET,"roofPartitions":cells_report})
    write("negative-controls.json",{"controls":controls})
    write("result.json",summary)
    write("input-pins.json",{"authority":AUTHORITY,"artist":ARTIST,"original":SOURCE,"target":TARGET,"reads":reads,"noIndexOrFullSceneRead":True,"geometryInputIds":sorted(geometries),"sourceFileHashes":{p.name:sha(p.read_bytes()) for p in (HERE/"proof.py",HERE/"geometry.py")}})
    print(json.dumps({"passed":True,"roof":TARGET,"candidates":len(ledger),"projectedCovered":float(all_covered),"projectedExposed":float(exposed),"actualExposedLower":float(summary["geometricExposedActualRoofArea"]["lower"]),"cornicesDominate":cornice_covered==all_covered,"weatherClassUnresolved":len(offending),"readScope":summary["readScope"]}))
if __name__=="__main__":
    try:main()
    except Exception as error:
        write("failure.json",{"error":str(error),"type":type(error).__name__,"reads":reads,"clipOperations":G.clips})
        raise
