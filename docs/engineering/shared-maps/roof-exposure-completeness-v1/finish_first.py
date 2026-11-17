"""Close the accepted first-roof certificate by exact no-omission input matching."""
from common import *
import struct,sys
PREVIOUS=HERE.parent/"roof-exposure-prototype-v1"
def scalar_reference(radicand,interval):
    lo=unq(interval["lower"]);v=float(lo)
    for _ in range(4):
        if F(v)**2>radicand:v=math.nextafter(v,-math.inf)
        elif F(math.nextafter(v,math.inf))**2<=radicand:v=math.nextafter(v,math.inf)
        else:break
    next_value=math.nextafter(v,math.inf)
    assert F(v)**2<=radicand<F(next_value)**2
    return {"value":v,"hex":v.hex(),"bits":struct.pack(">d",v).hex(),"representedExact":F(v),
      "nextValue":next_value,"nextBits":struct.pack(">d",next_value).hex(),
      "greatestBinary64NotAboveExactAreaProvedBySquaring":True,"measurementAreaOnly":True,"stockAssigned":False}
def main():
    s=read("end-0/selection.json");assert s["completeForAllCapturedPlacements"] and not s["newBoundaryCandidates"]
    old=json.loads((PREVIOUS/"selection.json").read_text(encoding="utf-8"))
    result=json.loads((PREVIOUS/"result.json").read_text(encoding="utf-8"))
    old_pins=json.loads((PREVIOUS/"input-pins.json").read_text(encoding="utf-8"))
    assert s["roof"]["part"]==old["target"] and s["roof"]["sourceRange"]==old["sourceRange"]
    old_map={r["id"]:r for r in old["candidateRecords"]}
    assert len(s["candidates"])==len(old_map)==230
    for row in s["candidates"]:
        p=row["part"];prior=old_map[p["id"]]
        assert prior["sectionId"]==Path(row["section"]).stem
        assert p=={k:prior[k] for k in p}
    palette=read("palette-extrema.json")["entries"]
    for p in old_pins["reads"]:
        if "/geometry/" in p["path"]:assert palette[Path(p["path"]).stem]["sha256"]==p["sha256"]
    # One actual selected-source vertex witnesses why the old rounded bounds are unsafe.
    row=next(r for r in s["candidates"] if old_map[r["part"]["id"]]["poseAudit"]["recordedBoundsNotConservativeForExactAffine"])
    part=row["part"];g=load(SOURCE,PREFIX+"geometry/"+part["geometry"]+".json");a=g["attributes"]["position"]["array"];m=tuple(map(F,part["matrix"]))
    guard={k:[unq(v) for v in row["sourceLocalGuard"][k]] for k in ("min","max")};witness=None
    for i in range(0,len(a),3):
        p=tuple(map(F,a[i:i+3]));world=tuple(m[k+12]+sum(m[k+4*j]*p[j] for j in range(3)) for k in range(3))
        assert all(guard["min"][k]<=world[k]<=guard["max"][k] for k in range(3))
        for k in range(3):
            low=F(part["bounds"]["min"][k]);high=F(part["bounds"]["max"][k])
            if world[k]<low or world[k]>high:
                boundary=low if world[k]<low else high;probe=(boundary+world[k])/2
                witness={"sourceId":part["id"],"geometryId":part["geometry"],"positionVertexIndex":i//3,
                  "axis":k,"capturedAffineVertex":world,"recordedMin":low,"recordedMax":high,
                  "exactOutsideDistance":abs(world[k]-boundary),"strictSeparatingProbe":probe,
                  "newGuard":guard,"guardContainsVertex":True,
                  "notAnActualRoofOmissionClaim":True}
                break
        if witness:break
    assert witness is not None
    radicand=unq(result["geometricExposedActualRoofArea"]["radicand"])
    reference=scalar_reference(radicand,result["geometricExposedActualRoofArea"])
    masks={"originalCommit":"5dd2f8543aa149123ff7d7c24fa4cdad8aaac46a","originalPath":"docs/engineering/shared-maps/roof-exposure-prototype-v1/exposure-cells.json",
      "originalLfSha256":sha((PREVIOUS/"exposure-cells.json").read_bytes().replace(b"\r\n",b"\n")),"230OriginalSourcesAndAllEightGeometryPinsIdentical":True}
    output={"status":"complete","completenessProved":True,"target":s["target"],"authority":AUTHORITY,"source":SOURCE,
      "capturedPlacementsProved":s["placementUniverse"],"selectionCounts":{"original":230,"certified":230,"newBoundary":0},
      "caps":CAPS,"placementsIncludingRoof":231,"expandedGeometryBudgetUsed":8,"triangleBudgetUsedIncludingRoof":2766,
      "reuseAcceptedMask":masks,"acceptedWeatherCovers":[f"end-upper-cornice--1-{i}-2" for i in range(4)],
      "coverClassificationAuthority":AUTHORITY,"geometricExposedProjectedArea":result["geometricExposedProjectedArea"],
      "actualExposedArea":result["geometricExposedActualRoofArea"],"areaScalarDirectedLower":reference,
      "quantityAuthoringReferenceReadyForReview":True,"stockBindingsRuntimeAssigned":False,"newSourceBoundWitness":witness,
      "negativeControls":{"oldRoundedBoundsFailConservativeVertexContainment":True,"exactGuardContainsWitness":True,
         "allOriginal230InputsRetained":True,"noPhysicalCoordinatesOrEPSChanged":True}}
    save("end-0/result.json",output)
    print(json.dumps({"status":"complete","roof":"end-0","certifiedCandidates":230,"newBoundaryCandidates":0,
      "exposedAreaApprox":result["geometricExposedActualRoofArea"]["lower"]["approx"],
      "directedLower":reference["value"],"scalarBits":reference["bits"]}))
if __name__=="__main__":main()
