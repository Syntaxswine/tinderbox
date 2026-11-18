"""Exactly one original child: 49 pairs / 96 selectors. No general solver."""
import argparse,hashlib,importlib.util,json,shutil,sys,time
from fractions import Fraction as F
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
PILOT="art/source/shared-map-fire-bindings/cornice-wall-contact-proposal-v1/"
REPEAT="art/source/shared-map-fire-bindings/cornice-front-contact-repeat-v1/"
def module(name,path):
 s=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def read(path):return json.loads(Path(path).read_bytes())
def sha(b):return hashlib.sha256(b).hexdigest()
def compact(x):return json.dumps(x,separators=(",",":"),sort_keys=True,ensure_ascii=True)
def dump(path,x):Path(path).write_bytes((json.dumps(x,indent=2,ensure_ascii=True)+"\n").encode('ascii'))
def write_page(path,x):
 rows=[]
 for k,v in x.items():
  body="[\n"+",\n".join("    "+compact(r) for r in v)+"\n  ]" if k in ["parts","geometries","relationships","regions"] else compact(v)
  rows.append("  "+json.dumps(k)+": "+body)
 Path(path).write_bytes(("{\n"+",\n".join(rows)+"\n}\n").encode('ascii'))

def main():
 started=time.perf_counter();cpu=time.process_time()
 ap=argparse.ArgumentParser();ap.add_argument("--mode",choices=["calculate","verify"],required=True)
 ap.add_argument("--dictionary",required=True);ap.add_argument("--output",required=True);ap.add_argument("--saved-page")
 ap.add_argument("--journal",required=True);args=ap.parse_args()
 out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
 data=read(args.dictionary);assert len(data["regions"])==96 and len(data["parts"])==50
 G=module("unchanged_source_triangles","art/source/shared-map-fire-bindings/export.py")
 H=module("unchanged_exact_face",PILOT+"check.py")
 R=module("unchanged_face_membership",REPEAT+"check.py")
 L=module("page_owned_lifecycle",str((HERE/"lifecycle.py").relative_to(ROOT)))
 buffers={};triangles={};node_parts=[]
 for p in data["parts"]:
  definition=data["geometries"][p["geometry"]]
  if definition["sha256"] not in buffers:
   b=(ROOT/definition["path"]).read_bytes();assert sha(b)==definition["sha256"]
   buffers[definition["sha256"]]=json.loads(b)
  ts=G.triangles(buffers[definition["sha256"]],p["matrix"],None);assert len(ts)==12
  triangles[p["id"]]=ts
  node_parts.append({"partId":p["partId"],"geometry":p["geometry"],"matrix":p["matrix"],"triangles":ts})
 saved=read(args.saved_page) if args.mode=="verify" else None
 saved_by_id={r["id"]:r for r in saved["regions"]} if saved else {}
 records=[];node_regions=[]
 partial=out/"partial-source-results.jsonl"
 for source in data["regions"]:
  if time.perf_counter()-started>24:raise TimeoutError("Python page source deadline guard; partial output preserved, no retry")
  old=source["original"];proof=old["actualGeometryCertificate"]["proof"]
  entry={"id":old["id"],"relationshipId":source["relationshipId"],"sourcePointer":source["sourcePointer"],
   "parent":source["parent"],"child":source["child"],"selector":old["selector"],
   "originalRegionCanonicalSha256":source["originalRegionCanonicalSha256"],
   "historical":{"kind":old["actualGeometryCertificate"]["proposedKind"],
    "worldWitness":proof.get("worldWitness"),"sourceFace":proof.get("sourceFace"),
    "sourceRange":None,"geometricBearing":old["actualGeometryCertificate"]["geometricBearing"]}}
  candidate={"id":old["id"],"parent":source["parent"],"child":source["child"],"selector":old["selector"],
   "endpointBounds":[old["parentBounds"],old["childBounds"]],"oldWitness":proof["worldWitness"],
   "siblingSelector":source["siblingSelector"],"reference":source["reference"]}
  contact=None;attempts=[]
  if args.mode=="verify":
   previous=saved_by_id[old["id"]]
   assert previous["historical"]==entry["historical"] and previous["selector"]==entry["selector"]
   contact=previous.get("contact");attempts=previous.get("candidateTests",[])
   for attempt in attempts:
    if "primitiveCandidates" in attempt:
     hits=[[i for i,t in enumerate(triangles[n]) if R.exact_membership(t,attempt["point"]) is not None] for n in [source["parent"],source["child"]]]
     assert hits==attempt["primitiveCandidates"]
   if contact:
    faces=[H.exact_face(triangles[number][primitive],contact["point"]) for number,primitive in zip([source["parent"],source["child"]],contact["primitives"])]
    assert contact["normals"]==[f["unitOutwardNormalExact"] for f in faces]
    assert contact["exactBarycentricWeights"]==[[[r["numerator"],r["denominator"]] for r in f["barycentricWeightsExact"]] for f in faces]
   else:entry["reason"]=previous["reason"]
  else:
   parent_ts=triangles[source["parent"]];child_ts=triangles[source["child"]]
   boxes=[old["selector"],old["parentBounds"],old["childBounds"]]
   planes={}
   for t in parent_ts:
    n=R.axis_normal(t)
    if n is not None and n[1]==0:
     axis=next(i for i,v in enumerate(n) if v)
     planes.setdefault(axis,set()).add(F(t[0][axis]))
   spans=[(max(values)-min(values),axis) for axis,values in planes.items() if len(values)>=2]
   top={F(t[0][1]) for t in child_ts if R.axis_normal(t)==[0,1,0]}
   if not spans or len(top)!=1:entry["reason"]="UNPROVED: actual primary vertical wall plane/top plane is not uniquely available"
   else:
    _,axis=min(spans);free=next(a for a in [0,2] if a!=axis)
    admitted=[z for z in sorted(planes[axis]) if all(F(b["min"][axis])<=z<=F(b["max"][axis]) for b in boxes)]
    lo=max(F(b["min"][free]) for b in boxes);hi=min(F(b["max"][free]) for b in boxes)
    if len(admitted)!=1 or hi<=lo:entry["reason"]="UNPROVED: primary original plane or free interval is absent/ambiguous"
    else:
     free_values=[("selector-midpoint",(lo+hi)/2)]
     historical=F(proof["worldWitness"][free])
     if lo<=historical<=hi and historical!=free_values[0][1]:free_values.append(("original-witness-free-coordinate",historical))
     for strategy,value in free_values:
      point=[0.,float(next(iter(top))),0.];point[axis]=float(admitted[0]);point[free]=float(value)
      test={"strategy":strategy,"point":point,"primaryVerticalAxis":axis}
      if F(point[free])!=value or not all(all(F(b["min"][a])<=F(point[a])<=F(b["max"][a]) for a in range(3)) for b in boxes):
       test["result"]="rejected-original-selector-or-representation";attempts.append(test);continue
      hits=[[i for i,t in enumerate(ts) if R.exact_membership(t,point) is not None] for ts in [parent_ts,child_ts]]
      test["primitiveCandidates"]=hits
      if any(len(x)!=1 for x in hits):
       test["result"]="rejected-missing-or-ambiguous-original-face";attempts.append(test);continue
      selected=[hits[0][0],hits[1][0]]
      try:faces=[H.exact_face(ts[i],point) for ts,i in zip([parent_ts,child_ts],selected)]
      except AssertionError:
       test["result"]="rejected-nonstrict-original-triangle-point";attempts.append(test);continue
      test["result"]="exact-original-face-point";attempts.append(test)
      contact={"point":point,"primitives":selected,"components":[0,0],
       "normals":[f["unitOutwardNormalExact"] for f in faces],
       "exactBarycentricWeights":[[[r["numerator"],r["denominator"]] for r in f["barycentricWeightsExact"]] for f in faces],
       "exactPlaneResiduals":[0,0]}
      break
     if contact is None:entry["reason"]="UNPROVED: the bounded two-coordinate original-face method did not prove a unique contact"
  if contact:
   assert all(all(F(b["min"][a])<=F(contact["point"][a])<=F(b["max"][a]) for a in range(3)) for b in [old["selector"],old["parentBounds"],old["childBounds"]])
   if source["reference"]:
    reference=source["reference"]
    assert contact["point"]==reference["point"] and contact["primitives"]==reference["primitives"]
    assert contact["normals"]==reference["normals"] and contact["exactBarycentricWeights"]==reference["exactBarycentricWeights"]
   entry["contact"]=contact
  entry["candidateTests"]=attempts;candidate["contact"]=contact;candidate["reason"]=entry.get("reason")
  records.append(entry);node_regions.append(candidate)
  with partial.open("a",encoding="ascii",newline="\n") as f:f.write(compact(entry)+"\n");f.flush()
 elapsed=time.perf_counter()-started;assert elapsed<25
 native_input={"root":str(ROOT),"parts":node_parts,"geometries":data["geometries"],"regions":node_regions,
  "pilotRegionId":data["pilotRegionId"],"pilotPoint":data["pilotPoint"]}
 node_out,node_err,receipt=L.run_owned([shutil.which("node"),str(HERE/"check-contact-page.mjs")],ROOT,
  "source contact first-page "+args.mode+" predicate check",96,timeout=min(25,55-elapsed),
  input_bytes=json.dumps(native_input).encode(),journal_path=args.journal)
 dump(out/"node-process-receipt.json",receipt)
 if node_err:(out/"node-stderr.txt").write_bytes(node_err)
 (out/"node-stdout.json").write_bytes(node_out)
 assert receipt["exitCode"]==0 and not receipt["timedOut"],"Native-predicate source child failed; preserve partial page, no retry"
 native=json.loads(node_out)
 for entry,result in zip(records,native["regions"]):
  assert entry["id"]==result["id"];entry["status"]=result["status"]
  if result["status"]=="SOURCE_CONTACT_PROPOSED":
   entry["checks"]={k:result[k] for k in ["contact","negativeChecks","pilotCopyRejected","referenceUnchanged","sharedFacetCounts","endpointFacetCounts"]}
  else:entry["reason"]=result.get("reason","unproved");entry["stage"]=result.get("stage","exact-face-derivation")
 page={"version":1,"status":"FIRST_CHILD_SOURCE_PROPOSAL_ONLY","runtimeConsumable":False,
  "childOwnerId":data["selectedChild"],"inventoryRef":"inventory.json",
  "geometries":data["geometries"],"parts":data["parts"],"relationships":data["relationships"],
  "regions":records,"scope":{"pairs":49,"regions":96,"referencePairs":24,"referenceRegions":48,
    "additionalPairs":25,"additionalRegions":48,"allOtherChildren":"UNATTEMPTED"},
  "method":"Intersect the actual cornice top plane and the actual thin-axis original wall face. Try the exact selector midpoint, then the unchanged historical free coordinate; verify actual original triangles. No general solver, jitter or historical-witness rewrite.",
  "sourceConstraints":{"rolesDirectionUvMatricesQuantitiesAndIdsUnchanged":True,
   "historicalCertificatesPreserved":True,"nativeRecordCellFaceLineage":"UNBOUND",
   "nativeCompilations":0,"supportGraphWorldRendererRuntimeFactoryBuild":False}}
 proved=[r for r in records if r["status"]=="SOURCE_CONTACT_PROPOSED"]
 summary={**native["summary"],"pairs":49,"attemptedChildren":1,"unattemptedChildren":95,
  "unattemptedPairs":1645,"unattemptedRegions":4340,
  "referenceUnchanged":sum(bool(r.get("checks",{}).get("referenceUnchanged")) for r in records)==48,
  "newRegions":48,"candidateNegativeTests":sum(t["result"]!="exact-original-face-point" for r in records for t in r["candidateTests"]),
  "sourceParentPrimitiveCounts":dict(sorted(__import__("collections").Counter(str(r["contact"]["primitives"][0]) for r in proved).items())),
  "sourceChildPrimitiveCounts":dict(sorted(__import__("collections").Counter(str(r["contact"]["primitives"][1]) for r in proved).items())),
  "unprovedRegionIds":[r["id"] for r in records if r["status"]!="SOURCE_CONTACT_PROPOSED"],
  "pythonWorkerCpuMs":(time.process_time()-cpu)*1000,"pythonWorkerElapsedMs":(time.perf_counter()-started)*1000}
 if args.mode=="verify":
  assert page==saved
  summary["savedPageReproduced"]=True
 else:
  write_page(out/"source-page.json",page)
 dump(out/"summary.json",summary)
 # The final page contains every partial candidate/negative; only our successful
 # disposable partial stream is removed. Failure paths keep it intact.
 if partial.exists():partial.unlink()
 print(json.dumps({"result":"checked","mode":args.mode,"proved":len(proved),"unproved":96-len(proved),
  "contactChecks":summary["contactChecks"],"negativeChecks":summary["negativeChecks"],
  "referenceRegions":summary["referenceRegions"],"nativeCompilerCalls":0},separators=(",",":")),flush=True)
if __name__=="__main__":main()
