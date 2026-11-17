"""Streaming complete captured-placement selection; no world boxes retained."""
from common import *
from collections import Counter
from contextlib import closing
import sys

SLUGS={"end-0":"replacement/end-pavilion-roof-0","end-1":"replacement/end-pavilion-roof-1","rear":"rear-curtain-roof"}
def main(slug):
    assert slug in SLUGS
    if slug!="end-0":
        first=read("end-0/result.json");assert first["completenessProved"],"First roof completeness must be proved before another roof"
    deadline=time.monotonic()+55
    audit=read("metadata-audit.json");palette=read("palette-extrema.json")["entries"];case=read("cases.json")[SLUGS[slug]]
    encloser=Encloser(palette);roof=encloser.box(case["part"]);old=set(case["originalCandidateIds"])
    assert sha(("\n".join(sorted(old))+"\n").encode())==case["originalCandidateSetSha256"]
    candidates=[];found_old=set();geometries={case["part"]["geometry"]};triangles=case["sourceRange"]["count"]//3
    reasons=Counter();section_results=[];minimum_margin={};scanned=0;all_digest=hashlib.sha256();new_boundary=[];old_only=[]
    def cap(placement):
        info={"status":"cap-stop","completenessProved":False,"target":SLUGS[slug],"caps":CAPS,
          "plannedPlacementsIncludingRoof":1+len(candidates),"plannedGeometriesIncludingRoof":len(geometries),"plannedTrianglesIncludingRoof":triangles,
          "stoppedAt":placement,"scanned":scanned,"candidates":candidates,"triangleExpansions":0}
        save(slug+"/cap.json",info);print(json.dumps({k:v for k,v in info.items() if k!="candidates"}));return
    with closing(batch([r["path"] for r in audit["sections"]],deadline)) as objects:
        for section,data in objects:
            expected=next(s for s in audit["sections"] if s["path"]==section);assert sha(data)==expected["sha256"]
            parts=json.loads(data)["parts"];counts=Counter();digest=hashlib.sha256()
            for ordinal,p in enumerate(parts):
                scanned+=1
                all_digest.update((section+":"+str(ordinal)+":"+json.dumps(p,separators=(",",":"))+"\n").encode())
                if p["id"]==SLUGS[slug]:counts["target-self"]+=1;continue
                box=encloser.box(p);reason,margin=relation(box,roof)
                is_old=p["id"] in old
                if is_old:found_old.add(p["id"])
                keep=reason=="candidate" or is_old
                digest.update((str(ordinal)+":"+p["id"]+":"+reason+":"+str(margin)+"\n").encode())
                counts["retained-original" if is_old and reason!="candidate" else reason]+=1
                if not keep:
                    old_min=minimum_margin.get(reason)
                    if old_min is None or margin<old_min["separation"]:minimum_margin[reason]={"sourceId":p["id"],"section":section,"separation":margin}
                    continue
                row={"section":section,"ordinal":ordinal,"part":p,"sourceLocalGuard":box,
                     "wasInOriginalSet":is_old,"exactGuardRelation":reason}
                candidates.append(row);geometries.add(p["geometry"]);triangles+=palette[p["geometry"]]["triangles"]
                if not is_old:new_boundary.append(p["id"])
                if reason!="candidate":old_only.append(p["id"])
                if 1+len(candidates)>CAPS["placements"] or len(geometries)>CAPS["expandedGeometries"] or triangles>CAPS["triangles"]:
                    return cap({"section":section,"ordinal":ordinal,"sourceId":p["id"]})
            reasons.update(counts);section_results.append({"path":section,"records":len(parts),"classificationCounts":dict(counts),"selectionDigest":digest.hexdigest()})
    assert scanned==audit["records"] and all_digest.hexdigest()==audit["metadataDigest"]
    assert found_old==old
    save(slug+"/selection.json",{"status":"selected","target":SLUGS[slug],"source":SOURCE,"authority":AUTHORITY,"caps":CAPS,
      "completeForAllCapturedPlacements":True,"capturedClosedPosesOnly":True,"placementUniverse":scanned,
      "roof":case,"roofSourceLocalGuard":roof,"candidates":candidates,"originalCandidates":len(old),"newBoundaryCandidates":new_boundary,
      "originalRetainedDespiteGuardExclusion":old_only,"placementsIncludingRoof":1+len(candidates),"expandedGeometryCountPlanned":len(geometries),
      "triangleCountPlannedIncludingRoof":triangles,"exclusionCounts":dict(reasons),"minimumExactExclusionMargins":minimum_margin,
      "sections":section_results,"unplacedPaletteLinearSpanCacheEntries":len(encloser.spans),
      "noPlacedWorldIndex":True,"triangleExpansions":0})
    print(json.dumps({"status":"selected","roof":slug,"universe":scanned,"candidates":len(candidates),"original":len(old),
      "newBoundaryCandidates":len(new_boundary),"plannedGeometries":len(geometries),"plannedTriangles":triangles,"triangleExpansions":0}))
if __name__=="__main__":
    try:main(sys.argv[1])
    except Exception as e:
        save(sys.argv[1]+"/selection-failure.json",{"type":type(e).__name__,"error":str(e)});raise
