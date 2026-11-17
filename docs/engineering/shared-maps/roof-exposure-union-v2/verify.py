"""Check saved analytical certificates only: no source triangles and no union solve."""
from support import *
from collections import Counter
import math,struct
def main():
    input_pins=pins();latch=read(HERE/"attempt-started.json");outcome=read(HERE/"attempt-outcome.json")
    assert latch["attempt"]==1 and outcome["status"]=="geometric-proof-complete"
    assert latch["sourceInputs"]==input_pins and outcome["sourceInputs"]==input_pins
    for slug in ("end-0","end-1"):
        c=read(HERE/(slug+"/preflight.json"));assert c["passed"] and c["sourceInputs"]["sourceCodeHashes"]==execution_hashes()
    assert read(HERE/"synthetic-checks.json")["sourceCodeHashes"]==execution_hashes()
    s=read(OLD/"rear/selection.json");result=decode(read(HERE/"rear/result.json"))
    ledger=decode(read(HERE/"rear/candidate-ledger.json"))["candidates"]
    parts=decode(read(HERE/"rear/partitions.json"))["partitions"]
    inputs=decode(read(HERE/"rear/union-inputs.json"))["unions"]
    audit=read(HERE/"rear/optimizer.json")
    ids=[r["part"]["id"] for r in s["candidates"]]
    by_id={r["sourceId"]:r for r in ledger}
    assert len(ids)==len(set(ids))==len(ledger)==len(by_id)==569 and set(ids)==set(by_id)
    assert result["placementsIncludingRoof"]==570 and result["expandedGeometries"]==25 and result["trianglesIncludingRoof"]==7468
    assert sum(r["triangleCount"] for r in ledger)+s["roof"]["sourceRange"]["count"]//3==7468
    assert result["exactClipOperations"]==audit["originalHalfPlaneClips"]==28350<=200000
    assert len(inputs)==len(audit["unions"])==12 and len(parts)==6
    assert result["roofUpperOffsets"]==[0,3,6,9,12,15]
    assert [r["offset"] for r in result["ownExcludedRoofFaces"]]==[18,21]
    for name,value in audit["helperCounts"].items():
        if name in audit["helperCaps"]:assert value<=audit["helperCaps"][name]
    G=module("saved_certificate_polygons",FIRST/"geometry.py");G.deadline=time.monotonic()+55
    engine=ExactUnion(G) # No install and no union_cells call; original clipper retained.
    def area_intersection(a,b):
        if not engine.overlaps(a,b):return F(0)
        # Exact convex containment is checked directly; partial overlap uses
        # the unmodified reference half-plane clipper.
        if engine.contains(a,b):return G.area(b)
        if engine.contains(b,a):return G.area(a)
        return G.area(engine.base_intersection(a,b))
    def disjoint(polys):
        for i,a in enumerate(polys):
            for b in polys[:i]:assert area_intersection(a,b)==0
    # Verify every duplicate/containment reduction against original input polygons.
    reductions=0
    for batch,entry in zip(inputs,audit["unions"]):
        records=batch["records"];assert len(records)==entry["inputRecords"]
        for change in entry["reductions"]:
            reductions+=1;p=records[change["input"]]["polygon"]
            if change["reason"]=="zero area":assert G.area(p)==0;continue
            q=records[change["witnessInput"]]["polygon"]
            if change["reason"]=="exact cyclic duplicate":assert engine.canonical(p)==engine.canonical(q)
            else:assert change["reason"]=="exact convex containment" and engine.contains(q,p)
    # All final cells have an original source witness; every raw input mask is
    # covered by the final disjoint cells. No greedy union is recomputed here.
    marginal=Counter();covered=exposed=total=F(0);input_count=0;closed_witnesses=set();open_witnesses=set()
    for i,row in enumerate(parts):
        batch=inputs[2*i];raw=batch["records"];h22=inputs[2*i+1]["records"]
        assert h22==[r for r in raw if r["family"]=="H22"]
        c=[r["polygon"] for r in row["coverCells"]];e=row["exposedCells"]
        assert len(c)==audit["unions"][2*i]["outputCells"]<=G.MAX_PIECES and len(e)<=G.MAX_PIECES
        for p in c+e:assert G.area(p)>0 and len(G.normalized(p))<=G.MAX_VERTICES
        disjoint(c);disjoint(e)
        for a in c:
            for b in e:assert area_intersection(a,b)==0
        witnesses={}
        for r in raw:
            assert r["roofOffset"]==row["roofOffset"] and r["owner"] in by_id
            hit=next(h for h in by_id[r["owner"]]["pairEvidence"] if h["sourceOffset"]==r["sourceOffset"] and h["roofOffset"]==r["roofOffset"])
            assert hit["projectedArea"]==G.area(r["polygon"])>0 and hit["gapMax"]>0
            witnesses.setdefault((r["owner"],r["sourceOffset"]),[]).append(r["polygon"])
            assert sum((area_intersection(r["polygon"],p) for p in c),F(0))==G.area(r["polygon"])
            input_count+=1
        for r in row["coverCells"]:
            assert any(engine.contains(p,r["polygon"]) for p in witnesses[r["owner"],r["sourceOffset"]])
            marginal[r["owner"]]+=G.area(r["polygon"])
            (closed_witnesses if by_id[r["owner"]]["sourceClosedConvexEnvelope"] else open_witnesses).add(r["owner"])
        ca=sum(map(G.area,c),F(0));ea=sum(map(G.area,e),F(0))
        assert ca==row["coveredArea"] and ea==row["exposedArea"] and ca+ea==row["domainArea"]
        covered+=ca;exposed+=ea;total+=row["domainArea"]
    assert total==3744 and covered==result["coveredProjectedArea"] and exposed==result["exposedProjectedArea"]
    assert covered+exposed==total and covered==sum(marginal.values(),F(0))
    factor=result["squaredSlopeFactor"]
    assert all(1+sum(v*v for v in p["planeYFromXZ"][:2])==factor for p in result["roofUpperPlanes"])
    areas={}
    for name,projection in (("total",total),("covered",covered),("exposed",exposed)):
        rad=projection*projection*factor;lo,hi=G.sqrt_interval(rad,128)
        assert lo*lo<=rad<=hi*hi and hi-lo<=F(1,1<<128)
        areas[name]={"projected":projection,"sloped":{"radicand":rad,"lower":lo,"upper":hi,"bits":128}}
    assert result["actualExposedArea"]["radicand"]==areas["exposed"]["sloped"]["radicand"]
    scalar=result["areaScalarDirectedLower"];v=scalar["value"];n=math.nextafter(v,math.inf)
    assert F(v)**2<=areas["exposed"]["sloped"]["radicand"]<F(n)**2
    assert struct.pack(">d",v).hex()==scalar["bits"] and struct.pack(">d",n).hex()==scalar["nextBits"]
    boundaries=[{"sourceId":id,"inputProjectedAreaBeforeUnion":by_id[id]["upperProjectedCoverAreaBeforeCrossSourceUnion"],
                 "allocatedWitnessArea":marginal[id],"retainedInFixedSelectionAndLedger":True} for id in s["newBoundaryCandidates"]]
    assert len(boundaries)==12 and all(r["inputProjectedAreaBeforeUnion"]>0 for r in boundaries)
    positive=[r for r in ledger if r["upperProjectedCoverAreaBeforeCrossSourceUnion"]>0]
    save("rear/area-reference.json",{"source":C.SOURCE,"authority":AUTHORITY,"geometricOnly":True,"areas":areas,
       "directedLowerAreaScalar":scalar,"weatherCoverClassification":"withheld for architect review; no opacity inferred",
       "runtimeStockAssigned":False})
    save("rear/role-evidence.json",{"source":C.SOURCE,"fixedSelectionSha256":input_pins["selectionSha256"],
       "positiveInputFamilies":dict(Counter(r["familyId"] for r in positive)),
       "positiveInputSourceCount":len(positive),"allGeometricMasksCoveredByOriginalSourceWitnesses":True,
       "witnessFamilies":dict(Counter(by_id[id]["familyId"] for id in marginal if marginal[id])),
       "closedWitnessSources":sorted(closed_witnesses),"unprovedEnvelopeWitnessSources":sorted(open_witnesses),
       "positiveInputUnprovedEnvelopes":[r["sourceId"] for r in positive if not r["sourceClosedConvexEnvelope"]],
       "originalSourceRolesAndRecipesRemainInCandidateLedger":True,
       "maskWitnessAllocationIsNotPhysicalOwnership":True,"newWeatherClassificationsAdopted":False,
       "boundaryCandidates":boundaries})
    save("verification.json",{"passed":True,"sourceInputs":input_pins,"noSourceTriangleTransforms":True,"noUnionRecalculation":True,
       "fixed569LedgerAndTwelveBoundarySourcesVerified":True,"allSixMasksAndComplementsDisjointAndConserved":True,
       "allRawPositiveMasksCoveredAndAllCellsHaveOriginalWitness":True,"primaryInputMaskRecordsVerified":input_count,
       "exactReductionWitnessesVerified":reductions,"128BitIntervalsAndDirectedScalarVerified":True,
       "verificationClips":G.clips,"verificationHelpers":engine.snapshot(),"originalAttemptClips":28350,
       "weatherCoverAdoptionRemainsArchitectDecision":True})
    print(json.dumps({"savedVerificationPassed":True,"inputMasks":input_count,"reductions":reductions,"verificationClips":G.clips,
       "coveredProjected":float(covered),"exposedSlopedScalar":v,"closedWitnesses":len(closed_witnesses),"unprovedWitnesses":len(open_witnesses)}))
if __name__=="__main__":main()
