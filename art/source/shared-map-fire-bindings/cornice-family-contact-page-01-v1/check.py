"""One bounded source page; the rest of the full family stays UNATTEMPTED."""
import argparse,collections,hashlib,importlib.util,json,os,re,shutil,subprocess,sys,tempfile,time
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];REL=HERE.relative_to(ROOT).as_posix()
SOURCE="art/source/shared-map-fire-bindings/coverage-family-proposal-v1/"
BASE="assets/art/shared-map-fire-bindings/new-york-complete-v1.json"
REPEAT="art/source/shared-map-fire-bindings/cornice-front-contact-repeat-v1/"
def read(p):return json.loads((ROOT/p).read_bytes())
def sha(b):return hashlib.sha256(b).hexdigest()
def compact(x):return json.dumps(x,separators=(",",":"),sort_keys=True,ensure_ascii=True)
def dump(p,x):Path(p).write_bytes((json.dumps(x,indent=2,ensure_ascii=True)+"\n").encode('ascii'))
def mod(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
L=mod("one_page_lifecycle",HERE/"lifecycle.py")
EXPECTED=[".gitattributes","README.md","authority-family-draft.md","checkpoint-refinement.md",
 "input-pins.json","source-producer-context.json","source-dictionary.json","inventory.json",
 "check.py","page-worker.py","check-contact-page.mjs","lifecycle.py","calculation-started.json",
 "calculation-events.jsonl","calculation-worker-stdout.txt","calculation-receipt.json",
 "calculation-summary.json","source-page.json","verification-receipt.json","review-package.json",
 "calculation/node-process-receipt.json","calculation/node-stdout.json","calculation/summary.json",
 "calculation/worker-process-receipt.json","syntax-receipt.json",
 "syntax-events.jsonl","attempt-01-syntax-receipt-identity.txt",
 "preserved-win32-receipt-wrapper.py.txt","attempt-02-package-reference-check.txt",
 "attempt-03-raw-stdout-whitespace.txt",
 "calculation/source-page.json"]
def verify_pin(p,pathkey="path"):
 b=(ROOT/p[pathkey]).read_bytes();assert len(b)==p["bytes"] and sha(b)==p["sha256"],p[pathkey]
def prepare():
 pins=read(REL+"/input-pins.json")
 for key in ["authorityDraft","checkpoint","producerContext"]:verify_pin(pins[key])
 for key in ["reference48","contactPilot","volumeProof"]:
  verify_pin(pins[key]["package"])
  for p in pins[key]["payloadPins"]:verify_pin(p)
 for p in pins["physicalSourcePins"]+pins["additionalPagePins"]:verify_pin(p)
 gi=pins["globalIndexGitPin"]
 b=subprocess.run(["git","show",gi["commit"]+":"+gi["path"]],cwd=ROOT,capture_output=True,check=True).stdout
 assert len(b)==gi["bytes"] and sha(b)==gi["sha256"]
 global_index=json.loads(b);assert global_index["encoding"]=="tuples-v1"
 global_parts={p[0]:(i,p) for i,p in enumerate(global_index["parts"])}
 assert len(global_parts)==len(global_index["parts"])
 allrows=read(SOURCE+"relationships.json")["relationships"]
 family=[(i,r) for i,r in enumerate(allrows) if r["family"]==pins["family"]]
 assert len(family)==1694 and sum(len(r["localRegions"]) for i,r in family)==4436
 children=sorted({r["childCarrierId"] for i,r in family});assert len(children)==96
 selected=[(i,r) for i,r in family if r["childCarrierId"]==pins["selectedChild"]]
 assert len(selected)==49 and sum(len(r["localRegions"]) for i,r in selected)==96
 inventory={"version":1,"family":pins["family"],"sourceRelationshipsPath":SOURCE+"relationships.json",
  "totalPairs":1694,"totalRegions":4436,"totalChildren":96,
  "selectedChild":pins["selectedChild"],"selectedPairs":49,"selectedRegions":96,
  "unattemptedChildren":95,"unattemptedPairs":1645,"unattemptedRegions":4340,
  "certificateKinds":dict(collections.Counter(g["actualGeometryCertificate"]["proposedKind"] for i,r in family for g in r["localRegions"])),
  "children":[]}
 for child in children:
  rr=[(i,r) for i,r in family if r["childCarrierId"]==child]
  inventory["children"].append({"childOwnerId":child,"status":"SELECTED_FIRST_PAGE" if child==pins["selectedChild"] else "UNATTEMPTED",
   "pairs":len(rr),"regions":sum(len(r["localRegions"]) for i,r in rr),"sourceRelationshipOrdinals":[i for i,r in rr],
   "regionIdSetSha256":sha(("\n".join(sorted(g["id"] for i,r in rr for g in r["localRegions"]))+"\n").encode())})
 base=read(BASE);by={c["id"]:c for c in base["carriers"]}
 refs=read(SOURCE+"geometry-bindings.json")["carriers"]
 old=read(REPEAT+"contacts-proposal.json")
 controls={r["id"]:r for r in old["regions"]}
 assert len(controls)==48
 pilot=read("art/source/shared-map-fire-bindings/cornice-wall-contact-proposal-v1/contact-record.json")
 owner_ids={r[k] for i,r in selected for k in ["parentCarrierId","childCarrierId"]}
 owners=[pins["selectedChild"]]+sorted(owner_ids-{pins["selectedChild"]},key=lambda cid:global_parts[refs[cid][0]["partId"]][0])
 assert len(owners)==50
 geometries=[];geometry_number={};parts=[]
 for owner in owners:
  c=by[owner];physical=[p for p in c["renderBindings"] if p["physicalContribution"]=="carrier-solid"]
  assert len(physical)==len(refs[owner])==1
  p=physical[0];ref=refs[owner][0]
  assert all(p[k]==ref[k] for k in ["partId","sourcePartId","geometryId","geometryPath","matrix"])
  assert p.get("sourceRange") is ref["sourceRange"] is None
  part_index,tuple_row=global_parts[p["partId"]];carrier_index=tuple_row[2]
  carrier=global_index["carriers"][carrier_index]
  assert carrier[0]==owner and carrier[7]==c["role"] and carrier[2]==c["fuelClass"] and carrier[3]==c["fuelAmount"]
  assert global_index["tables"]["geometries"][tuple_row[3]]==p["geometryId"]
  matrix=tuple_row[5] if len(tuple_row[5])==16 else [1,0,0,0,0,1,0,0,0,0,1,0,*tuple_row[5],1]
  assert matrix==p["matrix"] and tuple_row[12] is None and p["triangleCount"]==12
  if p["geometryPath"] not in geometry_number:
   geometry_number[p["geometryPath"]]=len(geometries)
   geometries.append({"id":p["geometryId"],"path":p["geometryPath"],"sha256":ref["sha256"],"sourceRange":None,"triangles":12})
  descriptor_path="assets/art/place-scenes/new-york/sections/"+p["sectionId"]+".json"
  rows=read(descriptor_path)["parts"];ordinal,row=next((i,r) for i,r in enumerate(rows) if r["id"]==p["partId"])
  assert row["geometry"]==p["geometryId"] and row["matrix"]==p["matrix"]
  parts.append({"id":len(parts),"partId":p["partId"],"ownerId":owner,"geometry":geometry_number[p["geometryPath"]],
   "matrix":p["matrix"],"globalSourcePartIndex":part_index,"globalCarrierIndex":carrier_index,"role":c["role"],
   "sourceRange":None,"originalDescriptor":{"path":descriptor_path,"pointer":"/parts/"+str(ordinal)},
   "nativeRecordId":None,"nativeCell":None})
 assert len(geometries)==3
 nums={p["ownerId"]:p["id"] for p in parts};relationships=[];regions=[]
 old_instances={p["ownerId"]:p for p in old["instances"]}
 for ordinal,row in selected:
  assert row["direction"]=="parent-to-child" and row["proposedKind"]=="fixed-embed"
  parent=nums[row["parentCarrierId"]];child=nums[row["childCarrierId"]]
  assert row["parentRole"]==parts[parent]["role"] and row["childRole"]==parts[child]["role"]
  relationships.append({"id":row["id"],"sourceRelationshipOrdinal":ordinal,"parent":parent,"child":child,
   "parentRole":row["parentRole"],"childRole":row["childRole"],"direction":row["direction"],
   "sourceRegionIds":[g["id"] for g in row["localRegions"]]})
  for k,g in enumerate(row["localRegions"]):
   assert g["actualGeometryCertificate"]["geometricBearing"] is False
   proof=g["actualGeometryCertificate"]["proof"];assert g["parentWitness"]==g["childWitness"]==proof["worldWitness"]
   control=None
   if g["id"] in controls:
    previous=controls[g["id"]]
    assert previous["selector"]==g["selector"] and previous["historicalVolume"]["worldWitness"]==proof["worldWitness"]
    for number in [parent,child]:
     p=parts[number];op=old_instances[p["ownerId"]]
     assert p["globalSourcePartIndex"]==op["globalSourcePartIndex"] and p["matrix"]==op["emittedWorldMatrix"]
    control=previous["contact"]
   regions.append({"relationshipId":row["id"],"sourcePointer":"/relationships/"+str(ordinal)+"/localRegions/"+str(k),
    "original":g,"originalRegionCanonicalSha256":sha(compact(g).encode()),"parent":parent,"child":child,
    "siblingSelector":row["localRegions"][1-k]["selector"] if len(row["localRegions"])==2 else None,"reference":control})
 assert sum(r["reference"] is not None for r in regions)==48
 dictionary={"version":1,"selectedChild":pins["selectedChild"],"parts":parts,"geometries":geometries,
  "relationships":relationships,"regions":regions,"pilotRegionId":pilot["localRegionId"],"pilotPoint":pilot["candidatePoint"],
  "limits":pins["workerLimits"],"globalIndexSource":gi,
  "scope":"Only 49 pairs/96 regions for this child. All other family children are inventory-only UNATTEMPTED."}
 return dictionary,inventory

def receipts(out,stderr,receipt,folder):
 dump(folder/"worker-process-receipt.json",receipt)
 (folder/"worker-stdout.txt").write_bytes(out)
 if stderr:(folder/"worker-stderr.txt").write_bytes(stderr)
def calculate():
 start=time.perf_counter();cpu=time.process_time()
 assert not (HERE/"calculation-started.json").exists(),"This source page was already started; preserve it, do not retry"
 dictionary,inventory=prepare()
 dump(HERE/"source-dictionary.json",dictionary);dump(HERE/"inventory.json",inventory)
 marker={"ownerTask":L.OWNER,"purpose":"one first source page only","regions":96,"pairs":49,
  "sourceDictionarySha256":sha((HERE/"source-dictionary.json").read_bytes()),
  "workerSha256":sha((HERE/"page-worker.py").read_bytes()),"nodeCheckerSha256":sha((HERE/"check-contact-page.mjs").read_bytes()),
  "lifecycleSha256":sha((HERE/"lifecycle.py").read_bytes()),"deadlineSeconds":60,"noAutomaticRetry":True}
 with (HERE/"calculation-started.json").open("x",encoding="ascii",newline="\n") as f:f.write(json.dumps(marker,indent=2)+"\n")
 folder=HERE/"calculation";folder.mkdir()
 command=[sys.executable,"-B",str(HERE/"page-worker.py"),"--mode","calculate","--dictionary",str(HERE/"source-dictionary.json"),
  "--output",str(folder),"--journal",str(HERE/"calculation-events.jsonl")]
 out,err,receipt=L.run_owned(command,ROOT,"one first cornice source page calculation",96,60,journal_path=HERE/"calculation-events.jsonl")
 receipts(out,err,receipt,folder)
 if receipt["exitCode"]!=0 or receipt["timedOut"]:
  dump(HERE/"calculation-receipt.json",{"status":"FAILED_PAGE_STOPPED_NO_RETRY","worker":receipt})
  raise RuntimeError("First source page failed/stopped; partial results preserved. No automatic retry.")
 page=read(REL+"/calculation/source-page.json");summary=read(REL+"/calculation/summary.json")
 assert len(page["regions"])==96 and summary["referenceRegions"]==48
 # Keep the calculation's actual page as the single source page; the successful
 # producer copy is moved only after its complete output has been checked.
 (folder/"source-page.json").replace(HERE/"source-page.json")
 dump(HERE/"calculation-summary.json",summary)
 (folder/"worker-stdout.txt").replace(HERE/"calculation-worker-stdout.txt")
 record={"status":"SOURCE_PAGE_COMPLETE","worker":receipt,"node":read(REL+"/calculation/node-process-receipt.json"),
  "coordinatorCpuMs":(time.process_time()-cpu)*1000,"coordinatorElapsedMs":(time.perf_counter()-start)*1000,
  "allChildrenExited":True,"ports":[],"rendererBenchmark":False}
 dump(HERE/"calculation-receipt.json",record)
 print(json.dumps({"result":"calculated","pairs":49,"regions":96,"proved":summary["proved"],"unproved":summary["unproved"],
  "contactChecks":summary["contactChecks"],"negativeChecks":summary["negativeChecks"],
  "pilotCopyRejected":summary["pilotCopyRejected"],"otherChildren":"95 UNATTEMPTED","nativeCompilations":0},separators=(",",":")))

def verify(save=False):
 start=time.perf_counter();cpu=time.process_time()
 dictionary,inventory=prepare()
 assert dictionary==read(REL+"/source-dictionary.json") and inventory==read(REL+"/inventory.json")
 page=read(REL+"/source-page.json");assert len(page["regions"])==96
 scratch=Path(tempfile.mkdtemp(prefix="tinderbox-cornice-page-check-"))
 good=False
 try:
  command=[sys.executable,"-B",str(HERE/"page-worker.py"),"--mode","verify","--dictionary",str(HERE/"source-dictionary.json"),
   "--output",str(scratch),"--saved-page",str(HERE/"source-page.json"),"--journal",str(scratch/"process-events.jsonl")]
  out,err,receipt=L.run_owned(command,ROOT,"one first cornice source page verification",96,60,journal_path=scratch/"process-events.jsonl")
  receipts(out,err,receipt,scratch)
  assert receipt["exitCode"]==0 and not receipt["timedOut"],"Verification page failed; scratch receipt retained"
  summary=json.loads((scratch/"summary.json").read_bytes())
  original=read(REL+"/calculation-summary.json")
  for k,v in original.items():
   if k not in ["pythonWorkerCpuMs","pythonWorkerElapsedMs"]:assert summary[k]==v,k
  record={"status":"FIRST_PAGE_VERIFIED","worker":receipt,"node":json.loads((scratch/"node-process-receipt.json").read_bytes()),
   "coordinatorCpuMs":(time.process_time()-cpu)*1000,"coordinatorElapsedMs":(time.perf_counter()-start)*1000,
   "checks":{"pairs":49,"regions":96,"referenceRegions":48,"otherChildrenUnattempted":95,
    "allHistoricalCertificatesAndSourcePinsPreserved":True,"sourceProducerParity":True,"nativeCompilations":0},
   "allChildrenExited":True,"ports":[],"rendererBenchmark":False}
  if save:
   assert not (HERE/"verification-receipt.json").exists(),"Do not overwrite an earlier verification receipt"
   dump(HERE/"verification-receipt.json",record)
  if (HERE/"review-package.json").exists():
   package=read(REL+"/review-package.json")
   for p in package["files"]:verify_pin(p)
  good=True
  print(json.dumps({"result":"verified","pairs":49,"regions":96,"proved":summary["proved"],"unproved":summary["unproved"],
   "referenceRegions":48,"unattemptedChildren":95,"nativeCompilations":0,
   "elapsedMs":record["coordinatorElapsedMs"],"allChildrenExited":True},separators=(",",":")))
 finally:
  if good:
   # This exact scratch directory is created by this invocation, contains only
   # disposable successful check output, and has no live child or user files.
   assert scratch.is_absolute() and scratch.name.startswith("tinderbox-cornice-page-check-")
   assert scratch.resolve(strict=True)==scratch and scratch.parent==Path(tempfile.gettempdir()).resolve()
   shutil.rmtree(scratch)
  else:print("Preserved failed verification scratch: "+str(scratch),file=sys.stderr)

def package():
 assert (HERE/"verification-receipt.json").is_file()
 allowed=set(EXPECTED)
 for p in HERE.rglob("*"):
  if p.is_file():assert p.relative_to(HERE).as_posix() in allowed,p
 for link in re.findall(r"\]\(([^)]+)\)",(HERE/"README.md").read_text()):assert (HERE/link).resolve().is_file(),link
 rows=[]
 for p in sorted(HERE.rglob("*")):
  if p.is_file() and p.name!="review-package.json":
   b=p.read_bytes();rows.append({"path":p.relative_to(ROOT).as_posix(),"bytes":len(b),"sha256":sha(b)})
 dump(HERE/"review-package.json",{"version":1,"status":"CHECKED_FIRST_SOURCE_PAGE_ONLY",
  "artistParent":"0e9ffa764610f7ab047e3d4cdebd05342273463f","scope":[REL+"/"],"files":rows,
  "inventory":{"pairs":1694,"regions":4436,"children":96},"checkedPage":{"pairs":49,"regions":96,"children":1},
  "unattempted":{"children":95,"pairs":1645,"regions":4340},"nativeCompilations":0,"retainedHelpers":False,
  "remaining":"Source candidate only; root review and native/runtime lineage remain separate. No further family page is authorized by this checkpoint.",
  "verification":"python -B "+REL+"/check.py"})

def main():
 ap=argparse.ArgumentParser();ap.add_argument("--calculate",action="store_true");ap.add_argument("--save-verification",action="store_true")
 ap.add_argument("--package",action="store_true");args=ap.parse_args()
 if args.calculate:calculate()
 elif args.package:package()
 else:verify(args.save_verification)
if __name__=="__main__":main()
