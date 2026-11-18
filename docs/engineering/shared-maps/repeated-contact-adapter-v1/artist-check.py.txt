"""Bounded repeat source contacts: two geometry buffers, 24 pairs, 48 selectors."""
import argparse
import collections
import hashlib
import importlib.util
import json
import re
import struct
import subprocess
import sys
from fractions import Fraction as F
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
REL=HERE.relative_to(ROOT).as_posix()
PILOT="art/source/shared-map-fire-bindings/cornice-wall-contact-proposal-v1/"
VOLUME="art/source/shared-map-fire-bindings/cornice-wall-one-binding-v1/"
SOURCE="art/source/shared-map-fire-bindings/coverage-family-proposal-v1/"
BASE="assets/art/shared-map-fire-bindings/new-york-complete-v1.json"
IDENTITY=[1,0,0,0,0,1,0,0,0,0,1,0]
FILES=[".gitattributes","README.md","authority-message.md","input-pins.json","check.py",
       "check-batch.mjs","contacts-proposal.json","checks-summary.json"]
def sha(b):return hashlib.sha256(b).hexdigest()
def read(path):return json.loads((ROOT/path).read_bytes())
def compact(x):return json.dumps(x,separators=(",",":"),sort_keys=True,ensure_ascii=True,allow_nan=False)
def packed(xs):return sha(struct.pack("<"+str(len(xs))+"d",*xs))
def module(name,path):
 s=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def dump(path,x):path.write_bytes((json.dumps(x,indent=2,ensure_ascii=True)+"\n").encode("ascii"))
def dump_proposal(path,x):
 # One line per existing instance/pair/region, no duplicated geometry arrays.
 rows=[]
 for key,value in x.items():
  if key in {"geometries","instances","relationships","regions"}:
   body="[\n"+",\n".join("    "+compact(v) for v in value)+"\n  ]"
  else:body=compact(value)
  rows.append("  "+json.dumps(key)+": "+body)
 path.write_bytes(("{\n"+",\n".join(rows)+"\n}\n").encode("ascii"))
def eligible(row,refs,pins):
 if row["family"]!=pins["family"] or row["childCarrierId"]!=pins["targetChildCarrierId"]:return False
 a,b=refs[row["parentCarrierId"]],refs[row["childCarrierId"]]
 return len(a)==len(b)==1 and a[0]["geometryId"]==pins["wallGeometryId"] and b[0]["geometryId"]==pins["corniceGeometryId"] and a[0]["matrix"][:12]==b[0]["matrix"][:12]==IDENTITY and a[0]["matrix"][15]==b[0]["matrix"][15]==1
def exact_membership(triangle,point):
 a,b,c=[[F(v) for v in p] for p in triangle];p=list(map(F,point))
 sub=lambda a,b:[x-y for x,y in zip(a,b)]
 dot=lambda a,b:sum(x*y for x,y in zip(a,b))
 v0,v1,v2=sub(b,a),sub(c,a),sub(p,a)
 n=[v0[1]*v1[2]-v0[2]*v1[1],v0[2]*v1[0]-v0[0]*v1[2],v0[0]*v1[1]-v0[1]*v1[0]]
 if not any(n) or dot(n,v2)!=0:return None
 a00,a01,a11,a20,a21=dot(v0,v0),dot(v0,v1),dot(v1,v1),dot(v2,v0),dot(v2,v1)
 den=a00*a11-a01*a01
 if den<=0:return None
 v,w=(a11*a20-a01*a21)/den,(a00*a21-a01*a20)/den
 weights=[1-v-w,v,w]
 return weights if all(x>=0 for x in weights) else None
def axis_normal(triangle):
 a,b,c=[list(map(F,p)) for p in triangle]
 u,v=[b[i]-a[i] for i in range(3)],[c[i]-a[i] for i in range(3)]
 n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
 axes=[i for i,x in enumerate(n) if x]
 if len(axes)!=1:return None
 out=[0,0,0];out[axes[0]]=1 if n[axes[0]]>0 else -1
 return out

def derive():
 pins=json.loads((HERE/"input-pins.json").read_bytes())
 authority=pins["authoritySnapshot"];b=(ROOT/authority["path"]).read_bytes()
 assert len(b)==authority["bytes"] and sha(b)==authority["sha256"]
 for key in ["contactPilot","volumeProof"]:
  p=pins[key]["package"];b=(ROOT/p["path"]).read_bytes()
  assert len(b)==p["bytes"] and sha(b)==p["sha256"]
  for p in pins[key]["payloadPins"]:
   b=(ROOT/p["path"]).read_bytes();assert len(b)==p["bytes"] and sha(b)==p["sha256"],p["path"]
 for p in pins["physicalSourcePins"]+pins["additionalSectionPins"]:
  b=(ROOT/p["path"]).read_bytes();assert len(b)==p["bytes"] and sha(b)==p["sha256"],p["path"]
 gi=pins["globalIndexGitPin"]
 b=subprocess.run(["git","show",gi["commit"]+":"+gi["path"]],cwd=ROOT,capture_output=True,check=True).stdout
 assert len(b)==gi["bytes"] and sha(b)==gi["sha256"]
 global_index=json.loads(b);assert global_index["encoding"]=="tuples-v1" and global_index["sourceOffsetApplied"] is True
 global_parts={r[0]:(i,r) for i,r in enumerate(global_index["parts"])}
 assert len(global_parts)==len(global_index["parts"])
 metadata=read(SOURCE+"relationships.json")["relationships"]
 refs=read(SOURCE+"geometry-bindings.json")["carriers"]
 inventory=[(i,r) for i,r in enumerate(metadata) if r["family"]==pins["family"] and r["childCarrierId"]==pins["targetChildCarrierId"]]
 selected=[(i,r) for i,r in inventory if eligible(r,refs,pins)]
 excluded=[(i,r) for i,r in inventory if not eligible(r,refs,pins)]
 assert len(inventory)==49 and len(selected)==24 and len(excluded)==25
 end=next(r for i,r in excluded if r["id"]==pins["excludedRotatedEndRelationshipId"])
 assert refs[end["parentCarrierId"]][0]["geometryId"]==pins["wallGeometryId"]
 assert refs[end["parentCarrierId"]][0]["matrix"][:12]!=IDENTITY
 other=[r for i,r in excluded if r["id"]!=end["id"]]
 assert len(other)==24 and all(refs[r["parentCarrierId"]][0]["geometryId"]!=pins["wallGeometryId"] for r in other)
 assert sum(len(r["localRegions"]) for i,r in selected)==48
 assert any(r["id"]=="fa9dc4a25193e94ce7b5793e" for i,r in selected)
 base=read(BASE);by={c["id"]:c for c in base["carriers"]}
 overlay=read(base["effectiveGeometryOverlay"]["indexPath"])
 G=module("unchanged_original_source_triangles","art/source/shared-map-fire-bindings/export.py")
 H=module("unchanged_pilot_exact_face",PILOT+"check.py")
 pilot=read(PILOT+"contact-record.json")
 old=read(VOLUME+"source-record.json")
 geometries=[];buffers={}
 for i,p in enumerate(old["parts"]):
  geom=read(p["geometry"]["path"]);buffers[i]=geom
  assert p["geometry"]["id"]==[pins["wallGeometryId"],pins["corniceGeometryId"]][i]
  geometries.append({"id":p["geometry"]["id"],"path":p["geometry"]["path"],"rawSha256":p["geometry"]["rawSha256"],
   "sourceRange":None,"originalTriangles":12,"component":0,"primitives":list(range(12)),
   "acceptedTopologyProof":{"path":VOLUME+"source-record.json","pointer":"/parts/"+str(i)+"/connectedPhysicalComponent"}})
 child=pins["targetChildCarrierId"]
 owners=[child]+sorted({r["parentCarrierId"] for i,r in selected},key=lambda cid:global_parts[refs[cid][0]["partId"]][0])
 assert len(owners)==25 and len(set(owners))==25
 instances=[];node_parts=[];triangles={}
 for number,cid in enumerate(owners):
  c=by[cid];physical=[p for p in c["renderBindings"] if p["physicalContribution"]=="carrier-solid"]
  assert len(physical)==1 and len(refs[cid])==1
  p=physical[0];reference=refs[cid][0];which=1 if cid==child else 0
  assert all(p[k]==reference[k] for k in ["partId","sourcePartId","geometryId","geometryPath","matrix"])
  assert p["geometryId"]==geometries[which]["id"] and p.get("sourceRange") is reference["sourceRange"] is None
  assert p["matrix"][:12]==IDENTITY and p["matrix"][15]==1
  assert not any(r["partId"]==p["partId"] or r["sourcePartId"]==p["sourcePartId"] for r in overlay["replacements"])
  part_index,tuple_row=global_parts[p["partId"]]
  carrier_index=tuple_row[2];runtime_carrier=global_index["carriers"][carrier_index]
  assert runtime_carrier[0]==cid and runtime_carrier[7]==c["role"]
  assert runtime_carrier[2]==c["fuelClass"] and runtime_carrier[3]==c["fuelAmount"]
  assert global_index["tables"]["geometries"][tuple_row[3]]==p["geometryId"]
  assert tuple_row[5]==p["matrix"][12:15] and tuple_row[12] is None
  ts=G.triangles(buffers[which],p["matrix"],None);assert len(ts)==12
  # These translation images are exactly representable; no new Float32 cast.
  local=G.triangles(buffers[which],[*IDENTITY,0,0,0,1],None)
  assert all(F(ts[a][b][k])==F(local[a][b][k])+F(p["matrix"][12+k]) for a in range(12) for b in range(3) for k in range(3))
  triangles[number]=ts
  node_parts.append({"partId":p["partId"],"triangles":ts})
  descriptor_path="assets/art/place-scenes/new-york/sections/"+p["sectionId"]+".json"
  source_rows=read(descriptor_path)["parts"]
  descriptor_ordinal,descriptor=next((i,r) for i,r in enumerate(source_rows) if r["id"]==p["partId"])
  assert descriptor["geometry"]==p["geometryId"] and descriptor["matrix"]==p["matrix"] and not descriptor.get("sourceRanges")
  instances.append({"id":number,"partId":p["partId"],"ownerId":cid,"geometry":which,
   "globalSourcePartIndex":part_index,"globalCarrierIndex":carrier_index,"role":c["role"],
   "component":0,"emittedWorldMatrix":p["matrix"],"matrixFloat64LittleEndianSha256":packed(p["matrix"]),
   "orderedWorldTrianglesFloat64LittleEndianSha256":packed([v for t in ts for q in t for v in q]),
   "originalDescriptor":{"path":descriptor_path,"pointer":"/parts/"+str(descriptor_ordinal),"partId":p["partId"]},
   "nativeRecordId":None,"nativeCell":None})
 instance_number={r["ownerId"]:r["id"] for r in instances}
 relationships=[];regions=[];node_regions=[]
 bands=collections.Counter()
 for ri,row in selected:
  assert row["direction"]=="parent-to-child" and row["proposedKind"]=="fixed-embed"
  assert row["childRole"]==by[child]["role"] and row["parentRole"]==by[row["parentCarrierId"]]["role"]
  assert row["groundAnchor"] is row["wholeCarrierRetirement"] is False
  parent=instance_number[row["parentCarrierId"]];ch=instance_number[child]
  assert len(row["localRegions"])==2
  relationships.append({"id":row["id"],"sourceRelationshipOrdinal":ri,"parent":parent,"child":ch,
   "parentRole":row["parentRole"],"childRole":row["childRole"],"direction":row["direction"],
   "originalAction":row["action"],"originalRegionIds":[r["id"] for r in row["localRegions"]]})
  for region_index,region in enumerate(row["localRegions"]):
   certificate=region["actualGeometryCertificate"];proof=certificate["proof"]
   assert certificate["geometricBearing"] is False and proof["sourceFace"] is None
   assert region["parentWitness"]==region["childWitness"]==proof["worldWitness"]
   band=[region["selector"]["min"][2],region["selector"]["max"][2]]
   assert band in [[25,26],[26,27]];bands[tuple(band)]+=1
   entry={"id":region["id"],"relationship":row["id"],"sourcePointer":"/relationships/"+str(ri)+"/localRegions/"+str(region_index),
    "parent":parent,"child":ch,"selector":region["selector"],
    "originalRegionCanonicalSha256":sha(compact(region).encode()),
    "historicalVolume":{"worldWitness":proof["worldWitness"],"sourceFace":None,"sourceRange":None,"geometricBearing":False}}
   candidate={"id":region["id"],"parent":parent,"child":ch,"selector":region["selector"],
    "endpointBounds":[region["parentBounds"],region["childBounds"]],
    "siblingSelector":row["localRegions"][1-region_index]["selector"],"oldVolumeWitness":proof["worldWitness"]}
   try:
    boxes=[region["selector"],region["parentBounds"],region["childBounds"]]
    low=max(F(b["min"][0]) for b in boxes);high=min(F(b["max"][0]) for b in boxes)
    if high<=low:raise ValueError("No positive original local X interval")
    xexact=(low+high)/2;x=float(xexact)
    if F(x)!=xexact:raise ValueError("Exact local X midpoint is not representable; no jitter used")
    top_planes={F(t[0][1]) for t in triangles[ch] if axis_normal(t)==[0,1,0]}
    z_planes={F(t[0][2]) for t in triangles[parent] if axis_normal(t) in [[0,0,-1],[0,0,1]] and all(F(b["min"][2])<=F(t[0][2])<=F(b["max"][2]) for b in boxes)}
    if len(top_planes)!=1 or len(z_planes)!=1:raise ValueError("Actual original top/selected wall plane is absent or ambiguous")
    point=[x,float(next(iter(top_planes))),float(next(iter(z_planes)))]
    if not all(all(F(b["min"][a])<=F(point[a])<=F(b["max"][a]) for a in range(3)) for b in boxes):
     raise ValueError("Plane intersection point lies outside an original local selector")
    hits=[]
    for number in [parent,ch]:
     found=[i for i,t in enumerate(triangles[number]) if exact_membership(t,point) is not None]
     if len(found)!=1:raise ValueError("Original triangle membership is absent/ambiguous: "+str(found))
     hits.append(found[0])
    try:faces=[H.exact_face(triangles[number][primitive],point) for number,primitive in zip([parent,ch],hits)]
    except AssertionError as error:raise ValueError("Candidate is not strictly inside one original triangle on each part") from error
    candidate.update({"point":point,"parentPrimitive":hits[0],"childPrimitive":hits[1],
     "normals":[f["unitOutwardNormalExact"] for f in faces]})
    entry["contact"]={"point":point,"primitives":hits,"normals":candidate["normals"],
     "components":[0,0],
     "exactBarycentricWeights":[[[r["numerator"],r["denominator"]] for r in f["barycentricWeightsExact"]] for f in faces],
     "exactPlaneResiduals":[0,0]}
   except ValueError as error:
    candidate["precheckFailure"]=str(error);entry["precheckFailure"]=str(error)
   regions.append(entry);node_regions.append(candidate)
 assert bands=={(25,26):24,(26,27):24}
 assert len({r["id"] for r in regions})==48
 completed=subprocess.run(["node",str(HERE/"check-batch.mjs")],cwd=ROOT,
  input=json.dumps({"parts":node_parts,"regions":node_regions,"pilotRegionId":pilot["localRegionId"],"pilotPoint":pilot["candidatePoint"]}),
  text=True,capture_output=True,timeout=30)
 assert completed.returncode==0,completed.stderr
 native=json.loads(completed.stdout);assert len(native["regions"])==48
 for entry,report in zip(regions,native["regions"]):
  assert entry["id"]==report["id"]
  entry["status"]=report["status"]
  if report["status"]=="source-contact-proposed":
   assert report["contact"]==[True,True,True] and report["negatives"]==9
   entry["checks"]={"contact":report["contact"],"negativeChecks":report["negatives"],
    "pilotCopyRejected":report["pilotCopyRejected"],"sharedFacetCounts":report["sharedFacetCounts"],
    "endpointFacetCounts":report["endpointFacetCounts"]}
  else:entry["failure"]={"stage":report["stage"],"reason":report["reason"]}
 reference=next(r for r in regions if r["id"]==pilot["localRegionId"])
 assert reference["contact"]["point"]==pilot["candidatePoint"]
 assert reference["contact"]["primitives"]==[p["selectedOriginalPrimitive"] for p in pilot["parts"]]
 proved=[r for r in regions if r["status"]=="source-contact-proposed"]
 parent_counts=collections.Counter(str(r["contact"]["primitives"][0]) for r in proved)
 child_counts=collections.Counter(str(r["contact"]["primitives"][1]) for r in proved)
 summary={"result":"source-evidence-reproduced","pairs":24,"regions":48,"instances":25,"uniqueGeometryBuffers":2,
  "originalTrianglesChecked":300,"exactComponentsChecked":25,
  "proved":len(proved),"unproved":48-len(proved),"selectorCounts":{"25-26":24,"26-27":24},
  "parentOriginalPrimitiveCounts":dict(sorted(parent_counts.items())),"childOriginalPrimitiveCounts":dict(sorted(child_counts.items())),
  "contactChecks":native["summary"]["contactChecks"],"regionalNegativeChecks":native["summary"]["regionNegativeChecks"],
  "pilotCopyRejections":native["summary"]["pilotCopyRejections"],
  "totalGeometryPointNegativeChecks":native["summary"]["regionNegativeChecks"]+native["summary"]["pilotCopyRejections"],
  "scopeNegativeGroups":2,"excludedPairs":25,"excludedOtherGeometry":24,"excludedRotatedEnd":1,
  "pilotReferenceReproduced":True,"nativeCompilerCalls":0,"runtimeBindingsExported":False,
  "supportGraphWorldRendererOrRetainedHelper":False,
  "immutableContactPayloadPinsVerified":11,"immutableVolumePayloadPinsVerified":9,"physicalSourcePinsVerified":13,"additionalSectionPinsVerified":len(pins["additionalSectionPins"]),
  "globalSourceIndexGitSha256":gi["sha256"],"predicateContext":native["context"],
  "failureRegionIds":[r["id"] for r in regions if r["status"]!="source-contact-proposed"]}
 proposal={"version":1,"status":"UNACCEPTED_REPEAT_SOURCE_CONTACT_EVIDENCE","runtimeConsumable":False,
  "authorityRef":"authority-message.md","family":pins["family"],"childOwnerId":child,
  "sourceRelationshipPath":SOURCE+"relationships.json","sourceGeometryBindingsPath":SOURCE+"geometry-bindings.json",
  "physicalBindingsPath":BASE,"globalIndexSource":gi,
  "coordinateFrame":{"frame":"emitted-world","units":"metres","sourceOffsetAlreadyApplied":True,"additionalOffsetApplied":False},
  "derivation":"Exact midpoint of each original local X interval; actual original cornice top plane intersected with the sole actual original wall face plane admitted by that selector. Actual triangle membership and existing contact are rechecked per region; no pilot primitive or point is copied.",
  "geometries":geometries,"instances":instances,"relationships":relationships,"regions":regions,
  "scopeInventory":{"matchingChildFamilyPairs":49,"selectedIdentityWallPairs":24,"excludedOtherGeometryPairs":24,
   "excludedRotatedEnd":{"relationshipId":end["id"],"parent":end["parentCarrierId"],"reason":"Same wall geometry but nonidentity orientation; excluded without geometry expansion."},
   "selectedRelationshipIdSetSha256":sha(("\n".join(sorted(r["id"] for i,r in selected))+"\n").encode()),
   "selectedRegionIdSetSha256":sha(("\n".join(sorted(r["id"] for r in regions))+"\n").encode())},
  "summary":summary,
  "approximation":{"kind":"proposed fixed original surface contact using the existing binary non-volume contact predicate",
   "direction":"Only the original parent-to-child dependency is proposed; geometric predicate symmetry is not a reverse brace.",
   "bearing":"All historical geometricBearing false values remain false. Contact establishes neither fastening capacity nor grounding.",
   "accounting":"One existing cornice owner across all selectors; no per-selector quantity, profile, new anchor or geometry.",
   "native":"Global source indices are read from the immutable existing tuple metadata. Native record/cell/face lineage remains unbound; no compile or runtime account is installed."},
  "remaining":["Architect review of this repeat-source interpretation; no family acceptance.",
   "Native liveness/lineage of these repeats is untested. The earlier coder ONE session/TWO calls is SPENT and is not replayed.",
   "Any unproved/ambiguous selector is retained explicitly, not replaced by a fabricated contact.",
   "No other geometry/orientation, support graph, world, runtime adapter or production acceptance follows."]}
 return proposal,summary

def main():
 parser=argparse.ArgumentParser();parser.add_argument("--record",action="store_true");args=parser.parse_args()
 proposal,summary=derive()
 if args.record:
  dump_proposal(HERE/"contacts-proposal.json",proposal);dump(HERE/"checks-summary.json",summary)
 expected=set(FILES+["review-package.json"])
 for p in HERE.rglob("*"):
  if p.is_file():assert p.relative_to(HERE).as_posix() in expected
 for link in re.findall(r"\]\(([^)]+)\)",(HERE/"README.md").read_text()):assert (HERE/link).resolve().is_file(),link
 if args.record:
  rows=[]
  for name in FILES:
   b=(HERE/name).read_bytes();rows.append({"path":REL+"/"+name,"bytes":len(b),"sha256":sha(b)})
  dump(HERE/"review-package.json",{"version":1,"status":"REPEAT_SOURCE_PROPOSAL_ONLY",
   "artistParent":"420ee0098e843e6daf6e70a4f5fb50c0ffa3eb37","scope":[REL+"/"],"files":rows,
   "checks":summary,"remaining":proposal["remaining"],
   "scopeReview":"This source candidate against its own parent; no historic artist-parent check on a combined architect tree.",
   "verification":"python -B "+REL+"/check.py","retainedHelpers":False})
 else:
  assert read(REL+"/contacts-proposal.json")==proposal
  assert read(REL+"/checks-summary.json")==summary
  package=read(REL+"/review-package.json")
  assert {r["path"] for r in package["files"]}=={REL+"/"+n for n in FILES}
  for r in package["files"]:
   b=(ROOT/r["path"]).read_bytes();assert len(b)==r["bytes"] and sha(b)==r["sha256"],r["path"]
 print(json.dumps({k:summary[k] for k in ["result","pairs","regions","proved","unproved","contactChecks",
  "regionalNegativeChecks","pilotCopyRejections","childOriginalPrimitiveCounts","nativeCompilerCalls"]},separators=(",",":")))
if __name__=="__main__":main()
