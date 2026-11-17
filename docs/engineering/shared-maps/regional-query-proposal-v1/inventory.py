"""Static pinned-text inventory only; imports no runtime/compiler/physics modules."""
from pathlib import Path
import ast,hashlib,json,re,subprocess,time
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
PIN="3b1310192f3fca2ff03fd9d73b0d0d54eb5dccfb"
SPECS={
  "workbenches/furnished-house/geometry.js": {
    "G1": "function crossings(",
    "G2": "function trace(",
    "G3": "function supportAt(",
    "G4": "function change(",
    "G5": "function addBatch(",
    "G6": "function watchPath("
  },
  "workbenches/furnished-house/simulation.js": {
    "T1": "function localLinks(",
    "T2": "function buildRays(",
    "T3": "function applyCommand(",
    "T4": "function moveFalls(",
    "T5": "function resolveLanding(",
    "T6": "function replaceSupportReferences(",
    "T7": "function supportedPoint("
  },
  "workbenches/bell-and-alder-closing/visibility.js": {
    "V1": "function blocked("
  },
  "src/simulation/scene-thermal.js": {
    "H1": "function tracePart(",
    "H2": "function trace(",
    "H3": "function surfacePoints("
  },
  "src/runtime/collision.js": {
    "C1": "function sweptCylinderClear(",
    "C2": "function cylinderContactPolygons(",
    "C3": "function insideSolid("
  },
  "src/reuse/native-disc-slide.js": {
    "D1": "function nativeDiscProposal("
  },
  "src/runtime/place-navigation.js": {
    "P1": "function findSupport(",
    "P2": "function canStand(",
    "P3": "function sourceShape("
  },
  "src/simulation/map-navigation.js": {
    "M1": "function createMapNavigation("
  },
  "workbenches/furnished-house/navigation.js": {
    "N1": "function support(",
    "N2": "function clear(",
    "N3": "function contactStep("
  },
  "src/simulation/actor-support.js": {
    "A1": "function advanceActorSupport("
  },
  "src/simulation/source-follow.js": {
    "F1": "function parents(",
    "F2": "function partition(",
    "F3": "function resolve("
  },
  "src/simulation/source-support-calculations.js": {
    "S1": "function coldPieces(",
    "S2": "function selectRegion(",
    "S3": "function connectContact("
  },
  "workbenches/furnished-house/support.js": {
    "B1": "function touching("
  },
  "src/runtime/source-query-registry.js": {
    "Q1": "function shape(",
    "Q2": "function prepareClaim(",
    "Q3": "function install("
  },
  "src/runtime/native-query-registry.js": {
    "R1": "function floorShape(",
    "R2": "function install("
  },
  "src/content/map-source-geometry.js": {
    "O1": "function sourceBlueprint(",
    "O2": "shapeForPart(id,open)"
  },
  "src/simulation/source-activation.js": {
    "X1": "function ensure("
  },
  "docs/engineering/shared-maps/regional-query-proposal-brief.md": {
    "AUTH": "Return one short, implementable interface proposal"
  },
  "docs/engineering/shared-maps/bounded-source-compiler-pilot.md": {
    "GATE": "Mixed closed-solid query replacement"
  },
  "docs/engineering/shared-maps/bounded-source-regions-v1.md": {
    "FIXTURE": "Owner `new-york::carrier/roof/clerestory`"
  }
}
TESTS=[
  "tests/furnished-house/geometry.test.mjs",
  "tests/integration/native-map-queries.test.mjs",
  "tests/integration/source-collision.test.mjs",
  "tests/integration/actor-support.test.mjs",
  "tests/integration/source-activation.test.mjs",
  "tests/integration/native-source-registration.test.mjs",
  "tests/integration/source-continuity.test.mjs",
  "tests/furnished-house/review.test.mjs",
  "tests/sandbox/native-placement.test.mjs",
  "tests/integration/map-source-geometry.test.mjs"
]
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
    deadline=time.monotonic()+45
    def raw(path):
        assert time.monotonic()<deadline
        return subprocess.check_output(["git","show",PIN+":"+path],cwd=ROOT,timeout=15)
    rows=[];anchors=set()
    for path,spec in SPECS.items():
        b=raw(path);text=b.decode("utf-8");lines=text.splitlines();seams={}
        for id,needle in spec.items():
            hits=[i+1 for i,line in enumerate(lines) if needle in line]
            assert len(hits)==1,(id,path,needle,hits)
            seams[id]={"line":hits[0],"needle":needle};anchors.add(id)
        rows.append({"path":path,"rawSha256":sha(b),"lfSha256":sha(b.replace(b"\r\n",b"\n")),"bytes":len(b),"seams":seams})
    controls=[]
    for path in TESTS:
        b=raw(path);lines=b.decode("utf-8").splitlines()
        titles=[{"line":i+1,"source":line.strip().split("=>")[0][:250]} for i,line in enumerate(lines) if "test(" in line]
        assert titles,path
        controls.append({"path":path,"rawSha256":sha(b),"lfSha256":sha(b.replace(b"\r\n",b"\n")),"testsReadNotExecuted":titles})
    fixture_path="docs/engineering/shared-maps/support-large-proof-v2/reference-blocks.json"
    b=raw(fixture_path);assert sha(b)=="bfab707ff646e9dfedfaae3b80d510ac750e4f561335d895c24c4e4cc4d49418"
    # Metadata only: no triangles, matrices, geometry attributes or datasets exported.
    saved=json.loads(b);owners={}
    assert all(block["identity"]["grid"]=={"origin":[0,0,0],"pitch":[.5,1.06,.5]} for block in saved["blocks"])
    for block in saved["blocks"]:
        for owner in block["identity"]["ownerStates"]:
            if owner["id"] in owners:continue
            native=owner["native"]
            owners[owner["id"]]={"originalParts":[{"id":p["id"],"closed":p["closed"]} for p in owner["parts"]],
                "nativeFragments":len(native),"nativeClosedFlags":dict(__import__("collections").Counter(str(n["closedShape"]) for n in native)),
                "firstOriginalNativeId":native[0]["id"],"lastOriginalNativeId":native[-1]["id"]}
    assert sorted(o["nativeFragments"] for o in owners.values())==[4,4132]
    proposal=(HERE/"PROPOSAL.md").read_text(encoding="utf-8")
    main_text=re.sub(r"<!-- consumer-table-start -->.*?<!-- consumer-table-end -->","",proposal,flags=re.S)
    words=len(re.findall(r"\S+",main_text));assert words<=900,words
    referenced=set(re.findall(r"\b(?:G|T|V|H|C|D|P|M|N|A|F|S|B|Q|R|O|X)\d\b",proposal))
    assert referenced<=anchors,referenced-anchors
    assert not list(HERE.rglob("__pycache__"))
    ast.parse((HERE/"inventory.py").read_text(encoding="utf-8"))
    result={"sourceCommit":PIN,"kind":"static source inventory, not a geometry dataset",
      "sourceFiles":rows,"existingControls":controls,"savedFixture":{"path":fixture_path,"rawSha256":sha(b),"bytes":len(b),
       "grid":{"origin":[0,0,0],"pitch":[.5,1.06,.5]},"owners":owners},
      "checks":{"passed":True,"mainProposalWords":words,"limit":900,"allSeamReferencesFound":True,
         "testExecution":False,"nativeCompilerWorldPhysicsRun":False,"geometryOrDatasetExport":False},
      "proposalSha256":sha((HERE/"PROPOSAL.md").read_bytes()),"inventoryScriptSha256":sha(Path(__file__).read_bytes())}
    (HERE/"inventory.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8",newline="\n")
    print(json.dumps({"staticChecksPassed":True,"sourceFiles":len(rows),"testFilesReadOnly":len(controls),"seams":len(anchors),"mainProposalWords":words,"nativeRuns":0}))
if __name__=="__main__":main()
