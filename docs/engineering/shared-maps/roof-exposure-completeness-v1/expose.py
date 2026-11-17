"""Bounded triangle exposure, reusing the reviewed exact polygon operations."""
from common import *
from collections import Counter
from finish_first import scalar_reference
import importlib.util,sys

PREVIOUS=HERE.parent/"roof-exposure-prototype-v1"
spec=importlib.util.spec_from_file_location("accepted_roof_polygons",PREVIOUS/"geometry.py")
G=importlib.util.module_from_spec(spec);spec.loader.exec_module(G)
def family_for(part,families,source_id=None):
    def match(c):
        if "all" in c:return all(match(v) for v in c["all"])
        if "any" in c:return any(match(v) for v in c["any"])
        if "not" in c:return not match(c["not"])
        if "roleIn" in c:return part.get("role") in c["roleIn"]
        if "idRegex" in c:
            import re
            return re.search(c["idRegex"],(source_id or part["id"]).removeprefix("replacement/")) is not None
        raise AssertionError(c)
    return next(f for f in families if match(f["scope"]))
def main(slug):
    selected=read(slug+"/selection.json");assert selected["completeForAllCapturedPlacements"]
    assert selected["placementsIncludingRoof"]<=CAPS["placements"] and selected["expandedGeometryCountPlanned"]<=CAPS["expandedGeometries"] and selected["triangleCountPlannedIncludingRoof"]<=CAPS["triangles"]
    palette=read("palette-extrema.json")["entries"];deadline=time.monotonic()+55;G.deadline=deadline;G.clips=0
    families=load(ARTIST,"art/source/shared-map-fire-bindings/remaining-material-proposal-v1/horticulture-proposal.json")["families"]
    geometry={};vertices_transformed=0;triangles_transformed=0;bound_witnesses=[]
    def faces(part,guard,source_range=None):
        nonlocal vertices_transformed,triangles_transformed
        gid=part["geometry"]
        if gid not in geometry:
            data=raw(SOURCE,palette[gid]["path"]);assert sha(data)==palette[gid]["sha256"]
            geometry[gid]=json.loads(data)
        data=geometry[gid];a=data["attributes"]["position"]["array"];idx=data["index"]["array"] if data["index"] else range(len(a)//3)
        start=source_range["start"] if source_range else 0;count=source_range["count"] if source_range else len(idx)
        assert start%3==count%3==0 and 0<=start<=start+count<=len(idx)
        m=tuple(map(F,part["matrix"]));points={};out=[]
        def point(i):
            nonlocal vertices_transformed
            if i not in points:
                p=tuple(map(F,a[i*3:i*3+3]));w=tuple(m[k+12]+sum(m[k+4*j]*p[j] for j in range(3)) for k in range(3))
                assert all(unq(guard["min"][k])<=w[k]<=unq(guard["max"][k]) for k in range(3))
                for k in range(3):
                    lo,hi=F(part["bounds"]["min"][k]),F(part["bounds"]["max"][k])
                    if (w[k]<lo or w[k]>hi) and len(bound_witnesses)<8:bound_witnesses.append({"sourceId":part["id"],"vertexIndex":i,"axis":k,"actual":w[k],"recordedMin":lo,"recordedMax":hi,"guardContains":True})
                points[i]=w;vertices_transformed+=1
            return points[i]
        for offset in range(start,start+count,3):
            t=tuple(point(idx[j]) for j in range(offset,offset+3));n=G.cross(G.sub(t[1],t[0]),G.sub(t[2],t[0]))
            out.append({"offset":offset,"triangle":t,"normal":n,"projection":G.normalized([(p[0],p[2]) for p in t])})
            triangles_transformed+=1
            assert triangles_transformed<=CAPS["triangles"] and time.monotonic()<deadline
        return out
    roof=selected["roof"];all_roof_faces=faces(roof["part"],selected["roofSourceLocalGuard"],roof["sourceRange"])
    rf=[f for f in all_roof_faces if f["normal"][1]>0]
    excluded_roof_faces=[{"offset":f["offset"],"normal":f["normal"],"reason":"own non-upward face"} for f in all_roof_faces if f["normal"][1]<=0]
    assert [f["offset"] for f in rf]==roof["originalUpperOffsets"] and len(rf)==6
    assert G.disjoint([f["projection"] for f in rf])
    total=sum((G.area(f["projection"]) for f in rf),F(0));factor={1+sum(x*x for x in G.plane(f["triangle"])[:2]) for f in rf};assert len(factor)==1;factor=next(iter(factor))
    cover={f["offset"]:[] for f in rf};ledger=[];orientation=Counter();source_solids=[];unproved_envelopes=[]
    for row in selected["candidates"]:
        part=row["part"];fs=faces(part,row["sourceLocalGuard"]);upper=[f for f in fs if f["normal"][1]>0]
        orientation.update("zero" if f["normal"]==(0,0,0) else "up" if f["normal"][1]>0 else "down" if f["normal"][1]<0 else "vertical" for f in fs)
        family=family_for(part,families)
        # All original captured scopes are retained. No remap to a neighboring parent.
        ranges=part.get("sourceRanges") or [{"id":part["id"],"start":0,"count":palette[part["geometry"]]["effectiveIndexCount"]}]
        end=0
        for r in ranges:assert r["start"]==end and r["start"]%3==0 and r["count"]%3==0;end+=r["count"]
        assert end==palette[part["geometry"]]["effectiveIndexCount"]
        primitive=None
        if len(fs)<=128 and all(f["normal"]!=(0,0,0) for f in fs):
            primitive=G.source_envelope([f["triangle"] for f in fs])
        closed=bool(primitive and primitive["closedOriented"] and primitive["convexOutward"])
        if not closed:unproved_envelopes.append(part["id"])
        hits=[];area=F(0)
        for f in upper:
            cp=G.plane(f["triangle"])
            for r in rf:
                poly=G.intersection(f["projection"],r["projection"])
                if not poly:continue
                rp=G.plane(r["triangle"]);delta=tuple(cp[i]-rp[i] for i in range(3))
                values=[delta[0]*v[0]+delta[1]*v[1]+delta[2] for v in poly]
                above=G.half(poly,delta) if max(values)>0 else []
                if not above:continue
                a2=G.area(above)
                if not a2:continue
                area+=a2;record={"owner":part["id"],"sourceOffset":f["offset"],"roofOffset":r["offset"],"polygon":above,"family":family["id"]}
                cover[r["offset"]].append(record)
                hits.append({"sourceOffset":f["offset"],"roofOffset":r["offset"],"projectedArea":a2,"gapMin":min(values),"gapMax":max(values)})
        item={"sourceId":part["id"],"section":row["section"],"geometryId":part["geometry"],"sourceRanges":ranges,
          "familyId":family["id"],"material":family["proposedPhysicalMaterial"],"ownership":family["ownershipProposal"],
          "sourceClosedConvexEnvelope":closed,"primitiveAudit":primitive,"upperProjectedCoverAreaBeforeCrossSourceUnion":area,
          "wasInOriginalSet":row["wasInOriginalSet"],"triangleCount":len(fs),"upperOffsets":[f["offset"] for f in upper],"pairEvidence":hits}
        ledger.append(item)
        if area and family["id"]=="H22" and closed:
            source_solids.append({"sourceId":part["id"],"section":row["section"],"geometryId":part["geometry"],"family":"H22","material":"mineral-staff-proxy",
              "ownership":"one-per-original-logical-solid","positiveEnvelopeVolume":sum((G.dot(f["triangle"][0],G.cross(f["triangle"][1],f["triangle"][2]))/6 for f in fs),F(0))>0,
              "notVisualOnlyFollower":True,"weatherCoverStatus":"source-role-supported proposal; architect adoption distinct"})
    partitions=[];covered=F(0);h22covered=F(0)
    for r in rf:
        records=cover[r["offset"]];cells=G.union_cells(records);open_cells=G.complement(r["projection"],cells)
        h22=G.union_cells([p for p in records if p["family"]=="H22"])
        count=sum((G.area(x["polygon"]) for x in cells),F(0));covered+=count;h22covered+=sum((G.area(x["polygon"]) for x in h22),F(0))
        partitions.append({"roofOffset":r["offset"],"domainArea":G.area(r["projection"]),"coveredArea":count,
          "exposedArea":sum(map(G.area,open_cells),F(0)),"coverCells":cells,"exposedCells":open_cells})
    exposed=total-covered;rad=exposed*exposed*factor;lo,hi=G.sqrt_interval(rad,128)
    interval={"radicand":rad,"lower":lo,"upper":hi,"width":hi-lo,"bits":128}
    source_classified=(not unproved_envelopes and h22covered==covered)
    output={"status":"geometric-proof-complete","completenessProved":True,"target":selected["target"],"source":SOURCE,"authority":AUTHORITY,
      "sourceSelectionComplete":True,"capturedPoseOnly":True,"caps":CAPS,"placementsIncludingRoof":1+len(ledger),
      "expandedGeometries":len(geometry),"trianglesIncludingRoof":triangles_transformed,"verticesTransformed":vertices_transformed,
      "originalCandidates":selected["originalCandidates"],"newBoundaryCandidates":selected["newBoundaryCandidates"],
      "roofUpperOffsets":[f["offset"] for f in rf],"ownExcludedRoofFaces":excluded_roof_faces,
      "roofProjectedArea":total,"squaredSlopeFactor":factor,
      "roofUpperPlanes":[{"offset":f["offset"],"planeYFromXZ":G.plane(f["triangle"]),"projectedArea":G.area(f["projection"])} for f in rf],
      "coveredProjectedArea":covered,"exposedProjectedArea":exposed,"actualExposedArea":interval,
      "areaScalarDirectedLower":scalar_reference(rad,interval),
      "h22OnlyCoverEqualsAllUpperGeometry":h22covered==covered,"allCandidateEnvelopesProved":not unproved_envelopes,
      "unprovedCandidateEnvelopes":unproved_envelopes,"sourceRoleSupportedH22CoverCaseProved":source_classified,
      "newWeatherCoverAdoption":"proposed for listed substantial H22 solids; no runtime opacity field",
      "stockBindingsRuntimeAssigned":False,"exactClipOperations":G.clips,"orientationCounts":dict(orientation),
      "sourceBoundWitnesses":bound_witnesses}
    save(slug+"/result.json",output);save(slug+"/candidate-ledger.json",{"candidates":ledger})
    save(slug+"/partitions.json",{"partitions":partitions});save(slug+"/cover-role-references.json",{"source":SOURCE,"acceptedFamilyDecision":AUTHORITY,"covers":source_solids})
    print(json.dumps({"status":"geometric-proof-complete","roof":slug,"candidates":len(ledger),"newBoundary":len(selected["newBoundaryCandidates"]),
      "geometries":len(geometry),"triangles":triangles_transformed,"coveredProjected":float(covered),"actualExposedLower":float(lo),
      "h22OnlyEqualsAll":h22covered==covered,"allSourceEnvelopes":not unproved_envelopes,"scalarBits":output["areaScalarDirectedLower"]["bits"]}))
if __name__=="__main__":
    try:main(sys.argv[1])
    except Exception as e:
        save(sys.argv[1]+"/exposure-failure.json",{"type":type(e).__name__,"error":str(e),"exactClipOperations":G.clips});raise
