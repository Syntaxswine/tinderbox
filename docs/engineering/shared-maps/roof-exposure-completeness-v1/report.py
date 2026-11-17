"""Metadata-only boundary report and concise scalar summary; no triangle work."""
from common import *
import importlib.util
from expose import family_for

def main():
    s=read("rear/selection.json");palette=read("palette-extrema.json")["entries"]
    roof={k:[unq(x) for x in s["roofSourceLocalGuard"][k]] for k in ("min","max")}
    old_roof={k:[F(x) for x in s["roof"]["part"]["bounds"][k]] for k in ("min","max")}
    families=load(ARTIST,"art/source/shared-map-fire-bindings/remaining-material-proposal-v1/horticulture-proposal.json")["families"]
    rows=[]
    for r in s["candidates"]:
        if r["wasInOriginalSet"]:continue
        p=r["part"];box={k:[unq(x) for x in r["sourceLocalGuard"][k]] for k in ("min","max")}
        old_box={k:[F(x) for x in p["bounds"][k]] for k in ("min","max")}
        old_reason,old_margin=relation(old_box,old_roof)
        reason,margin=relation(box,roof);assert reason=="candidate"
        assert old_reason!="candidate" and old_margin>=0
        overlap={str(k):min(box["max"][k],roof["max"][k])-max(box["min"][k],roof["min"][k]) for k in (0,2)}
        assert all(v>0 for v in overlap.values())
        family=family_for(p,families);assert family["id"]=="H05"
        rows.append({"sourceId":p["id"],"sourceSection":r["section"],"sourceOrdinal":r["ordinal"],"geometryId":p["geometry"],
          "geometryRawSha256":palette[p["geometry"]]["sha256"],"matrix":p["matrix"],"sourceRanges":p.get("sourceRanges") or [{"id":p["id"],"start":0,"count":palette[p["geometry"]]["effectiveIndexCount"]}],
          "capturedRole":p.get("role"),"fromAccess":p["fromAccess"],"acceptedFamilyScope":family["id"],
          "acceptedMaterial":family["proposedPhysicalMaterial"],"acceptedQuantityRule":family["quantityRule"],
          "recordedBoundsRelationToRecordedRoof":old_reason,"recordedBoundsSeparation":old_margin,
          "exactGuardRelation":reason,"exactGuardXZOverlap":overlap,"exactGuard":box,
          "positiveActualTriangleCoverOrWeatherRoleProved":False})
    assert len(rows)==12
    save("rear/boundary-references.json",{"source":SOURCE,"target":s["target"],"candidateSelectionComplete":True,
      "newBoundaryCandidates":rows,"actualCoverOrAreaWithheldAfterUnionCap":True,
      "recordedBoundsSeparationIsNotAnExactSourceExclusion":True})
    for slug in ("end-0","end-1"):
        r=read("area-references.json")[slug]
        print(json.dumps({"roof":slug,"projectedTotal":r["areas"]["total"]["projected"]["approx"],
          "projectedCovered":r["areas"]["covered"]["projected"]["approx"],"projectedExposed":r["areas"]["exposed"]["projected"]["approx"],
          "slopedTotalApprox":r["areas"]["total"]["sloped"]["lower"]["approx"],"slopedCoveredApprox":r["areas"]["covered"]["sloped"]["lower"]["approx"],
          "slopedExposedApprox":r["areas"]["exposed"]["sloped"]["lower"]["approx"],"scalar":r["directedLowerAreaScalar"]["value"],
          "scalarBits":r["directedLowerAreaScalar"]["bits"]}))
    print(json.dumps({"metadataBytes":sum(r["bytes"] for r in read("metadata-audit.json")["sections"]),
      "newRearRoles":dict(__import__("collections").Counter(r["acceptedFamilyScope"] for r in rows)),
      "oldBoundsReasons":dict(__import__("collections").Counter(r["recordedBoundsRelationToRecordedRoof"] for r in rows))}))
if __name__=="__main__":main()
