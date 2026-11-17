"""Exact rational polygon operations for one pinned roof proof; no mesh output."""
from fractions import Fraction as F
from math import isqrt
from time import monotonic

MAX_CLIPS=200000
MAX_VERTICES=32
MAX_PIECES=2048
clips=0
deadline=None

def det2(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def area2(poly):return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1])) if len(poly)>2 else F(0)
def area(poly):return abs(area2(poly))/2
def normalized(poly):
    out=[]
    for p in poly:
        p=tuple(p)
        if not out or p!=out[-1]:out.append(p)
    if len(out)>1 and out[0]==out[-1]:out.pop()
    changed=True
    while changed and len(out)>2:
        changed=False
        for i in range(len(out)):
            if det2(out[i-1],out[i],out[(i+1)%len(out)])==0:
                out.pop(i);changed=True;break
    if len(out)<3 or area2(out)==0:return []
    if area2(out)<0:out.reverse()
    assert len(out)<=MAX_VERTICES
    assert all(det2(out[i-1],out[i],out[(i+1)%len(out)])>=0 for i in range(len(out)))
    assert all(v.numerator.bit_length()<=8192 and v.denominator.bit_length()<=8192 for p in out for v in p)
    return out

def half(poly,line):
    global clips
    clips+=1;assert clips<=MAX_CLIPS,"Finite exact clipping operation bound"
    if deadline is not None and clips%64==0:assert monotonic()<deadline,"Finite exact geometry deadline"
    if not poly:return []
    A,B,C=line
    values=[A*p[0]+B*p[1]+C for p in poly]
    if min(values)>=0:return list(poly)
    if max(values)<0:return []
    out=[]
    for i,p in enumerate(poly):
        q=poly[(i+1)%len(poly)];a,b=values[i],values[(i+1)%len(poly)]
        if a>=0:out.append(p)
        if (a>=0)!=(b>=0):
            t=a/(a-b);out.append(tuple(p[k]+t*(q[k]-p[k]) for k in (0,1)))
    return normalized(out)

def edge_line(a,b):return (a[1]-b[1],b[0]-a[0],a[0]*b[1]-a[1]*b[0])
def intersection(subject,clip):
    poly=list(subject)
    for a,b in zip(clip,clip[1:]+clip[:1]):
        poly=half(poly,edge_line(a,b))
        if not poly:break
    return poly

def difference(subject,clip):
    """Disjoint convex partition of subject outside clip; exact area conservation."""
    inside=list(subject);outside=[]
    for a,b in zip(clip,clip[1:]+clip[:1]):
        line=edge_line(a,b)
        rejected=half(inside,tuple(-v for v in line))
        kept=half(inside,line)
        assert area(rejected)+area(kept)==area(inside)
        if rejected:outside.append(rejected)
        inside=kept
        if not inside:break
    assert sum(map(area,outside),F(0))+area(inside)==area(subject)
    return outside

def disjoint(polys):
    return all(area(intersection(a,b))==0 for i,a in enumerate(polys) for b in polys[:i])

def union_cells(records):
    """Greedy disjoint partition; sort by exact area only to keep temporary pieces small."""
    cells=[]
    for record in sorted(records,key=lambda r:(-area(r["polygon"]),r["owner"],r["sourceOffset"])):
        pending=[record["polygon"]]
        for old in cells:
            pending=[piece for p in pending for piece in difference(p,old["polygon"])]
            assert len(pending)<=MAX_PIECES
            if not pending:break
        for p in pending:
            assert area(intersection(p,record["polygon"]))==area(p)
            cells.append({**record,"polygon":p})
        assert len(cells)<=MAX_PIECES
    assert disjoint([r["polygon"] for r in cells])
    return cells

def complement(domain,cells):
    pieces=[domain]
    for cell in cells:
        pieces=[p for old in pieces for p in difference(old,cell["polygon"])]
        assert len(pieces)<=MAX_PIECES
    assert disjoint(pieces)
    assert sum(map(area,pieces),F(0))+sum((area(c["polygon"]) for c in cells),F(0))==area(domain)
    return pieces

def plane(triangle):
    n=cross(sub(triangle[1],triangle[0]),sub(triangle[2],triangle[0]));assert n[1]
    a,b=-n[0]/n[1],-n[2]/n[1]
    return a,b,triangle[0][1]-a*triangle[0][0]-b*triangle[0][2]

def sqrt_interval(value,bits=128):
    assert value>=0
    scale=1<<bits;k=isqrt(value.numerator*scale*scale//value.denominator)
    lo=F(k,scale);hi=lo if lo*lo==value else F(k+1,scale)
    assert lo*lo<=value<=hi*hi
    return lo,hi

def source_envelope(triangles):
    """Sufficient exact closed, consistently outward, convex render-envelope audit."""
    edges={};balance={};points=set(p for t in triangles for p in t);convex=True
    for t in triangles:
        n=cross(sub(t[1],t[0]),sub(t[2],t[0]));assert n!=(0,0,0)
        convex &= all(dot(n,sub(p,t[0]))<=0 for p in points)
        for a,b in zip(t,t[1:]+t[:1]):
            key=tuple(sorted((a,b)));edges[key]=edges.get(key,0)+1
            balance[key]=balance.get(key,0)+(1 if a<b else -1)
    return {"closedOriented":all(v==2 and balance[k]==0 for k,v in edges.items()),
            "convexOutward":bool(convex),"uniquePositions":len(points),"triangles":len(triangles)}
