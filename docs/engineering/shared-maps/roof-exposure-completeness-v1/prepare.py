"""Finite descriptor/palette scalar audit, one source phase per command."""
from common import *
from collections import Counter
from contextlib import closing
import struct,sys

def metadata():
    deadline=time.monotonic()+55
    context=load(ARTIST,PACKAGE+"roof-possible-cover-context.json")
    reviews=load(ARTIST,PACKAGE+"roof-area-exposure-review.json")
    ledger=load(ARTIST,PACKAGE+"case-ledger.json")
    expected={p["path"]:p["sha256"] for p in context["sectionPins"]}
    paths=tree(PREFIX+"sections")
    assert len(paths)==445 and set(paths)==set(expected)
    roof_ids={r["sourceId"] for r in reviews["cases"]}
    assert roof_ids=={"replacement/end-pavilion-roof-0","replacement/end-pavilion-roof-1","rear-curtain-roof"}
    geometry_ids=set();seen=set();sections=[];roof_parts={};ranges=0;logical=0;digest=hashlib.sha256()
    with closing(batch(paths,deadline)) as objects:
        for path,data in objects:
            assert sha(data)==expected[path]
            parts=json.loads(data)["parts"];ids=[]
            for ordinal,p in enumerate(parts):
                assert len(p["matrix"])==16 and all(isinstance(x,(int,float)) and math.isfinite(x) for x in p["matrix"])
                assert [p["matrix"][i] for i in (3,7,11,15)]==[0,0,0,1]
                assert p["id"] not in seen,"Captured render ID duplicate"
                seen.add(p["id"]);geometry_ids.add(p["geometry"]);ids.append(p["id"])
                rs=p.get("sourceRanges")
                logical+=len(rs) if rs else 1
                if rs:ranges+=1
                digest.update((path+":"+str(ordinal)+":"+json.dumps(p,separators=(",",":"))+"\n").encode())
                if p["id"] in roof_ids:roof_parts[p["id"]]={"section":path,"part":p}
            sections.append({"path":path,"sha256":sha(data),"bytes":len(data),"records":len(parts),"idSetSha256":sha(("\n".join(ids)+"\n").encode())})
    geometry_paths=tree(PREFIX+"geometry")
    assert len(geometry_paths)==629
    assert {p.rsplit("/",1)[1][:-5] for p in geometry_paths}==geometry_ids
    assert len(roof_parts)==3 and len(seen)==61954 and logical==63788
    cases={}
    for id in sorted(roof_ids):
        row=next(r for r in ledger["cases"] if r["sourceId"]==id)
        review=next(r for r in reviews["cases"] if r["sourceId"]==id)
        assert roof_parts[id]["part"]["matrix"]==row["originalMatrix"]==review["actualMatrix"]
        cases[id]={**roof_parts[id],"sourceRange":row["sourceRange"],"originalCandidateIds":[r["renderId"] for r in context["roofCandidates"][id]],
                   "originalCandidateSetSha256":review["coarsePotentialCoveringSourceIdSetSha256"],
                   "originalUpperOffsets":review["upwardWeatherTriangleIndexOffsets"]}
    producer_paths=["tools/compile-places.mjs","tools/place-geometry.mjs","src/runtime/three.js",
      "vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.core.js"]
    producer=[]
    for path in producer_paths:
        data=raw(SOURCE,path)
        producer.append({"path":path,"sha256":sha(data),"bytes":len(data)})
    save("metadata-audit.json",{"source":SOURCE,"artist":ARTIST,"authority":AUTHORITY,"records":len(seen),"logicalSources":logical,"sourceRangeRows":ranges,
       "allSourceSectionsEnumeratedFromGitTree":True,"noSceneIndexRead":True,"metadataDigest":digest.hexdigest(),"sections":sections,
       "geometryPaths":geometry_paths,"producerPins":producer,"metadataOnly":True})
    save("cases.json",cases)
    print(json.dumps({"phase":"metadata","passed":True,"sections":len(sections),"records":len(seen),"logicalSources":logical,"geometryPalette":len(geometry_paths),"triangleExpansions":0}))

def palette():
    deadline=time.monotonic()+55
    audit=read("metadata-audit.json");entries={};total_bytes=0;values_seen=0
    with closing(batch(audit["geometryPaths"],deadline)) as objects:
        for path,data in objects:
            id=path.rsplit("/",1)[1][:-5]
            assert data.endswith(b"\n") and sha(data[:-1])==id,"Original producer content identity"
            g=json.loads(data);p=g["attributes"]["position"];a=p["array"]
            assert p["type"]=="Float32Array" and p["itemSize"]==3 and p["normalized"] is False
            assert len(a)>0 and len(a)%3==0
            lo=[math.inf]*3;hi=[-math.inf]*3
            for i,v in enumerate(a):
                assert isinstance(v,(int,float)) and math.isfinite(v) and struct.unpack("<f",struct.pack("<f",v))[0]==v
                k=i%3
                if v<lo[k]:lo[k]=v
                if v>hi[k]:hi[k]=v
            index=g["index"];count=len(index["array"]) if index else len(a)//3
            assert count%3==0
            if index:assert all(isinstance(x,int) and 0<=x<len(a)//3 for x in index["array"])
            entries[id]={"path":path,"sha256":sha(data),"bytes":len(data),"min":lo,"max":hi,"positionValues":len(a),
                         "effectiveIndexCount":count,"triangles":count//3,"normalized":False,"numericType":"captured Float32"}
            total_bytes+=len(data);values_seen+=len(a)
    assert len(entries)==629
    save("palette-extrema.json",{"source":SOURCE,"geometryCount":len(entries),"geometryBytes":total_bytes,"positionScalarsAudited":values_seen,
      "triangleOrWorldVertexExpansions":0,"extremaAreCapturedValues":True,"entries":entries})
    print(json.dumps({"phase":"palette-scalars","passed":True,"geometries":len(entries),"bytes":total_bytes,"positionScalarsAudited":values_seen,"triangleExpansions":0}))
if __name__=="__main__":
    try:
        if sys.argv[1]=="metadata":metadata()
        elif sys.argv[1]=="palette":palette()
        else:raise ValueError("Choose metadata or palette")
    except Exception as error:
        save("preparation-failure.json",{"phase":sys.argv[1:],"type":type(error).__name__,"error":str(error)})
        raise
