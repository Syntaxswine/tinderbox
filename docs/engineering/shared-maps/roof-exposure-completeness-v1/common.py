"""Read-only Git objects and exact scalar interval helpers; no scene objects."""
from pathlib import Path
from fractions import Fraction as F
import subprocess,json,hashlib,math,time,os

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
SOURCE="2b350309d9116812a1d3988af090614bdaefbc25"
ARTIST="e347fe4a3eec5d57c83447144982d3a7c70713cd"
AUTHORITY="68dc15337cb29c79d7fb9e84f8be3d09bdd688fe"
PREFIX="assets/art/place-scenes/horticulture/"
PACKAGE="art/source/shared-map-fire-bindings/remaining-measurement-batch-v1/"
CAPS={"placements":1200,"expandedGeometries":128,"triangles":20000}
def sha(b):return hashlib.sha256(b).hexdigest()
def raw(commit,path):return subprocess.check_output(["git","show",commit+":"+path],cwd=ROOT)
def load(commit,path):return json.loads(raw(commit,path))
def q(v):return {"n":str(v.numerator),"d":str(v.denominator),"approx":float(v)}
def unq(v):return F(int(v["n"]),int(v["d"])) if isinstance(v,dict) and "n" in v else F(v)
def packed(v):
    if isinstance(v,F):return q(v)
    if isinstance(v,dict):return {k:packed(x) for k,x in v.items()}
    if isinstance(v,(list,tuple)):return [packed(x) for x in v]
    return v
def save(name,value):
    p=HERE/name;p.parent.mkdir(exist_ok=True,parents=True)
    p.write_text(json.dumps(packed(value),indent=2,ensure_ascii=True)+"\n",encoding="utf-8",newline="\n")
def read(name):return json.loads((HERE/name).read_text(encoding="utf-8"))
def tree(prefix):
    lines=subprocess.check_output(["git","ls-tree","-r","--name-only",SOURCE,prefix],cwd=ROOT,text=True).splitlines()
    return lines
def batch(paths,deadline):
    """One short-lived foreground Git reader; one raw object/decoded JSON at a time."""
    process=subprocess.Popen(["git","cat-file","--batch"],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE,
       stderr=subprocess.DEVNULL,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
    try:
        for path in paths:
            assert time.monotonic()<deadline,"Finite source-audit deadline"
            process.stdin.write((SOURCE+":"+path+"\n").encode());process.stdin.flush()
            header=process.stdout.readline().split();assert len(header)==3 and header[1]==b"blob",(path,header)
            size=int(header[2]);data=process.stdout.read(size);assert len(data)==size and process.stdout.read(1)==b"\n"
            yield path,data
    finally:
        process.stdin.close()
        try:process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            # This exact Popen handle owns only the disposable Git object reader.
            process.kill();process.wait()
        process.stdout.close()
    assert process.returncode==0

_number_cache={}
def number(v):
    assert isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
    assert not isinstance(v,int) or float(v)==v,"Captured integer must equal its binary64 value"
    if v not in _number_cache:_number_cache[v]=F(v)
    return _number_cache[v]

class Encloser:
    def __init__(self,palette):
        self.palette=palette;self.spans={}
    def box(self,part):
        m=part["matrix"];assert len(m)==16 and [m[i] for i in (3,7,11,15)]==[0,0,0,1]
        assert all(isinstance(v,(int,float)) and math.isfinite(v) for v in m)
        # Cache local scalar spans only: no placed/world boxes or spatial index.
        key=(part["geometry"],tuple(m[:12]))
        if key not in self.spans:
            data=self.palette[part["geometry"]];lo=[number(v) for v in data["min"]];hi=[number(v) for v in data["max"]]
            lower=[];upper=[]
            for i in range(3):
                a=b=F(0)
                for j in range(3):
                    coefficient=number(m[i+4*j]);u,v=coefficient*lo[j],coefficient*hi[j]
                    a+=min(u,v);b+=max(u,v)
                lower.append(a);upper.append(b)
            self.spans[key]=(lower,upper)
        lo,hi=self.spans[key]
        return {"min":[lo[i]+number(m[12+i]) for i in range(3)],
                "max":[hi[i]+number(m[12+i]) for i in range(3)]}
def relation(box,roof):
    # Strict positive projected area and a strictly higher point are necessary.
    tests=[("not-higher",roof["min"][1]-box["max"][1]),
           ("left",roof["min"][0]-box["max"][0]),("right",box["min"][0]-roof["max"][0]),
           ("front",roof["min"][2]-box["max"][2]),("rear",box["min"][2]-roof["max"][2])]
    for label,separation in tests:
        if separation>=0:return label,separation
    return "candidate",None
