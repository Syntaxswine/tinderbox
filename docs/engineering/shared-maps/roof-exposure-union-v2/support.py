"""Pinned, read-only prior proof inputs and redirected successor outputs."""
from pathlib import Path
from fractions import Fraction as F
import importlib.util,sys,json,hashlib,subprocess,time
HERE=Path(__file__).resolve().parent
OLD=HERE.parent/"roof-exposure-completeness-v1"
FIRST=HERE.parent/"roof-exposure-prototype-v1"
ROOT=HERE.parents[3]
BASE="1308af2e7eeec2891686d1621aa415fa0739be71"
AUTHORITY="8dd07c0ca014bc889e808cd27420902a0c28025a"
sys.path.insert(0,str(OLD))
import common as C
from exact_union import ExactUnion
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def read(path):return json.loads(path.read_text(encoding="utf-8"))
def decode(v):
    if isinstance(v,dict) and "n" in v and "d" in v:return C.unq(v)
    if isinstance(v,dict):return {k:decode(x) for k,x in v.items()}
    if isinstance(v,list):return [decode(x) for x in v]
    return v
def save(name,v):
    p=HERE/name;p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(C.packed(v),indent=2,ensure_ascii=True)+"\n",encoding="utf-8",newline="\n")
def execution_hashes():
    return {name:C.sha((HERE/name).read_bytes()) for name in ("exact_union.py","support.py","preflight.py","attempt.py")}
def pins():
    manifest=read(OLD/"artifact-manifest.json")
    for r in manifest["files"]:assert C.sha((OLD/r["path"]).read_bytes())==r["sha256"],r["path"]
    g=C.raw(BASE,"docs/engineering/shared-maps/roof-exposure-completeness-v1/artifact-manifest.json")
    assert g==(OLD/"artifact-manifest.json").read_bytes()
    decision=C.raw(AUTHORITY,"docs/engineering/shared-maps/roof-exposure-decision.md")
    assert b"same 569" in decision and b"one rear attempt" in decision
    return {"baseCommit":BASE,"authority":AUTHORITY,"authorityPath":"docs/engineering/shared-maps/roof-exposure-decision.md",
            "authoritySha256":C.sha(decision),"previousArtifactPinsVerified":len(manifest["files"]),
            "selectionSha256":C.sha((OLD/"rear/selection.json").read_bytes()),
            "oldCapSha256":C.sha((OLD/"rear/cap.json").read_bytes()),
            "oldFailureSourceSha256":C.sha((OLD/"history/expose-at-rear-cap.py.txt").read_bytes()),
            "sourceCodeHashes":execution_hashes()}
def run(slug):
    E=module("successor_source_exposure",OLD/"expose.py")
    captured={}
    def capture(name,value):captured[name]=value
    E.save=capture;E.AUTHORITY=AUTHORITY
    engine=ExactUnion(E.G);engine.install()
    try:E.main(slug)
    finally:
        save(slug+"/optimizer.json",engine.snapshot())
        save(slug+"/union-inputs.json",{"unions":engine.inputs})
        for name,value in captured.items():save(name,value)
    return E,engine,captured
def equivalent(G,original_intersection,left,right):
    # Positive convex polygons form regular closed sets. Zero symmetric-difference
    # area in both directions therefore proves equality, including boundaries.
    for a in left:
        assert sum((G.area(original_intersection(a,b)) for b in right),F(0))==G.area(a)
    for b in right:
        assert sum((G.area(original_intersection(b,a)) for a in left),F(0))==G.area(b)
def old_partitions(slug):
    if slug=="end-0":
        rows=decode(read(FIRST/"exposure-cells.json"))["roofPartitions"]
        return {r["roofOffset"]:([p["polygon"] for p in r["coveredCells"]],r["exposedConvexCells"]) for r in rows}
    rows=decode(read(OLD/"end-1/partitions.json"))["partitions"]
    return {r["roofOffset"]:([p["polygon"] for p in r["coverCells"]],r["exposedCells"]) for r in rows}
