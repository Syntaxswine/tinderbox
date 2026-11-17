"""Exact source-array analysis helpers. No geometry creation or export."""
from fractions import Fraction as F
import collections,itertools,math
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def cross2(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
def sign(x):return (x>0)-(x<0)
def area2(poly):return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(poly,poly[1:]+poly[:1]))
def clip_area(subject,clip):
 orientation=sign(area2(clip));assert orientation
 assert all(orientation*cross2(clip[i-1],clip[i],clip[(i+1)%len(clip)])>=0 for i in range(len(clip)))
 poly=list(subject)
 for a,b in zip(clip,clip[1:]+clip[:1]):
  old=poly;poly=[]
  if not old:break
  for p,q in zip(old,old[1:]+old[:1]):
   dp,dq=orientation*cross2(a,b,p),orientation*cross2(a,b,q)
   if dp>=0:poly.append(p)
   if (dp>=0)!=(dq>=0):
    t=dp/(dp-dq);poly.append(tuple(p[k]+t*(q[k]-p[k]) for k in (0,1)))
 return abs(area2(poly))/2 if len(poly)>=3 else F(0)
def box_mask_intersection(lo,hi,cut):
 dy=max(F(0),min(hi[1],F(cut['maxY']))-max(lo[1],F(cut['minY'])))
 poly=[(lo[0],lo[2]),(hi[0],lo[2]),(hi[0],hi[2]),(lo[0],hi[2])]
 return dy*clip_area(poly,[tuple(map(F,p)) for p in cut['polygon']])
def components(triangles):
 nonzero=[i for i,t in enumerate(triangles) if cross(sub(t[1],t[0]),sub(t[2],t[0]))!=(0,0,0)]
 by=collections.defaultdict(set)
 for i in nonzero:
  for p in triangles[i]:by[p].add(i)
 unseen=set(nonzero);out=[]
 while unseen:
  start=min(unseen);unseen.remove(start);q=[start]
  for i in q:
   for p in triangles[i]:
    for j in by[p]&unseen:unseen.remove(j);q.append(j)
  out.append(sorted(q))
 return out,len(triangles)-len(nonzero)
def atomic_edges(triangles,pool=None,dimension=3):
 points=set(pool or [p for t in triangles for p in t]);edges=collections.Counter();balance=collections.Counter()
 for tri in triangles:
  if dimension==3:
   if cross(sub(tri[1],tri[0]),sub(tri[2],tri[0]))==(0,0,0):continue
   orientation=1
  else:
   orientation=sign(cross2(*tri))
   if not orientation:continue
  for a,b in zip(tri,tri[1:]+tri[:1]):
   if a==b:continue
   e=tuple(sorted((a,b)));edges[e]+=1;balance[e]+=orientation*(1 if a<b else -1)
 atom=collections.Counter();ab=collections.Counter();splits=0
 for (a,b),n in edges.items():
  u=sub(b,a);length=dot(u,u)
  def collinear(p):
   return cross(u,sub(p,a))==(0,0,0) if dimension==3 else u[0]*(p[1]-a[1])-u[1]*(p[0]-a[0])==0
  on=[p for p in points if collinear(p) and 0<=dot(u,sub(p,a))<=length]
  on.sort(key=lambda p:dot(u,sub(p,a)));splits+=len(on)-2
  for v,w in zip(on,on[1:]):
   e=tuple(sorted((v,w)));atom[e]+=n;ab[e]+=balance[a,b]*(1 if v<w else -1)
 return edges,balance,atom,ab,splits
def boundary_audit(triangles):
 edges,bal,atomic,ab,splits=atomic_edges(triangles)
 bad=[e for e in atomic if atomic[e]!=2 or ab[e]]
 graph=collections.defaultdict(list)
 for a,b in bad:graph[a].append(b);graph[b].append(a)
 loops=[];valid=all(len(ns)==2 for ns in graph.values()) and all(atomic[e]==1 for e in bad)
 if valid:
  unseen=set(graph)
  while unseen:
   start=min(unseen);loop=[start];unseen.remove(start);previous=None
   while True:
    choices=sorted(p for p in graph[loop[-1]] if p!=previous);nxt=choices[0];previous=loop[-1]
    if nxt==start:break
    if nxt not in unseen:valid=False;break
    unseen.remove(nxt);loop.append(nxt)
   if not valid:break
   loops.append(loop)
 return {'rawBadEdges':sum(edges[e]!=2 or bal[e]!=0 for e in edges),'atomicBadEdges':len(bad),'exactExistingVertexEdgeSplits':splits,'degreeTwoBoundaryLoops':valid,'boundaryLoopCount':len(loops) if valid else None},loops,bad
def projected_region(triangles,pool,nonoverlap):
 proof=nonoverlap(triangles);area=sum(abs(cross2(*t)) for t in triangles)/2
 if not all(cross2(*t)!=0 for t in triangles):return {'proved':False,'reason':'zero projected triangle','area':area,'nonoverlap':proof},None
 _,_,atom,ab,splits=atomic_edges(triangles,pool,2)
 boundary={e:n for e,n in ab.items() if n}
 valid=proof['proved'] and all(abs(n)==1 for n in boundary.values())
 return {'proved':valid,'area':area,'nonoverlap':proof,'boundarySegments':len(boundary),'exactExistingProjectedEdgeSplits':splits},boundary
def rectangle_coverage(triangles,axis,nonoverlap):
 other=[i for i in range(3) if i!=axis]
 ts=[tuple(tuple(p[k] for k in other) for p in t) for t in triangles]
 proof=nonoverlap(ts);area=sum(abs(cross2(*t)) for t in ts)/2;points=[p for t in ts for p in t]
 lo=tuple(min(p[k] for p in points) for k in (0,1));hi=tuple(max(p[k] for p in points) for k in (0,1))
 corners=set(itertools.product(*[(lo[k],hi[k]) for k in (0,1)]))
 return {'proved':proof['proved'] and area==(hi[0]-lo[0])*(hi[1]-lo[1]) and corners<=set(points),'area':area,'lo':lo,'hi':hi,'nonoverlap':proof}
def plane_groups(triangles):
 groups=collections.defaultdict(list)
 for i,t in enumerate(triangles):
  n=cross(sub(t[1],t[0]),sub(t[2],t[0]))
  axes=[k for k,v in enumerate(n) if v]
  if not axes:continue
  if len(axes)!=1:return None
  axis=axes[0];groups[axis,sign(n[axis]),t[0][axis]].append(i)
 return groups
def rectangular_reference(triangles,cut,f32,nonoverlap):
 audit,loops,bad=boundary_audit(triangles)
 groups=plane_groups(triangles)
 if groups is None:return {'proved':False,'reason':'non-axis-aligned or nonplanar retained face; no rectangular substitution','boundary':audit}
 if len(groups) not in (5,6):return {'proved':False,'reason':'retained face set is not five/six rectangular reference faces','facePlaneGroups':len(groups),'boundary':audit}
 by={};faces=[]
 for (axis,sgn,c),which in sorted(groups.items()):
  key=axis,sgn
  if key in by:return {'proved':False,'reason':'multiple stepped planes for one side; nonrectangular remainder','boundary':audit}
  cov=rectangle_coverage([triangles[i] for i in which],axis,nonoverlap)
  if not cov['proved']:return {'proved':False,'reason':'actual retained face does not fully cover a nonoverlapping rectangle','axis':axis,'sign':sgn,'boundary':audit}
  by[key]=c;faces.append({'axis':axis,'sign':sgn,'plane':c,'triangles':which,'coverage':cov})
 missing=[(k,s) for k in range(3) for s in (-1,1) if (k,s) not in by]
 if len(missing)>1:return {'proved':False,'reason':'more than one unproved cut boundary plane','boundary':audit}
 cut_plane=None
 if missing:
  if not audit['degreeTwoBoundaryLoops'] or len(loops)!=1:return {'proved':False,'reason':'missing rectangular face has unproved exact boundary loops','boundary':audit}
  axis,sgn=missing[0];loop=loops[0]
  if len({p[axis] for p in loop})!=1:return {'proved':False,'reason':'missing boundary is not on its source reference plane','boundary':audit}
  cut_plane=loop[0][axis];candidates=[F(cut['minY']),F(cut['maxY'])] if axis==1 else []
  if axis!=1:
   uv_axis=0 if axis==0 else 1
   for a,b in zip(cut['polygon'],cut['polygon'][1:]+cut['polygon'][:1]):
    if a[uv_axis]==b[uv_axis]:candidates.append(F(a[uv_axis]))
  if not any(F(f32(float(c)))==cut_plane for c in candidates):return {'proved':False,'reason':'finite boundary plane has no exact producer Float32 correspondence to a recorded axis cut plane','boundary':audit}
  by[axis,sgn]=cut_plane
 lo=tuple(by[k,-1] for k in range(3));hi=tuple(by[k,1] for k in range(3))
 if any(hi[k]<=lo[k] for k in range(3)):return {'proved':False,'reason':'reference halfspaces have no positive interior','boundary':audit}
 for face in faces:
  other=[k for k in range(3) if k!=face['axis']]
  if face['coverage']['lo']!=tuple(lo[k] for k in other) or face['coverage']['hi']!=tuple(hi[k] for k in other):
   return {'proved':False,'reason':'proved faces do not occupy one common rectangular solid domain','boundary':audit}
 if missing:
  axis,_=missing[0];other=[k for k in range(3) if k!=axis];projected=[tuple(p[k] for k in other) for p in loops[0]]
  if abs(area2(projected))/2!=(hi[other[0]]-lo[other[0]])*(hi[other[1]]-lo[other[1]]):return {'proved':False,'reason':'actual missing-face boundary does not cover the source reference side','boundary':audit}
 intrusion=box_mask_intersection(lo,hi,cut)
 if intrusion>0:return {'proved':False,'reason':'reference intersects recorded cut interior after captured coordinates; no implicit quantization allowance','exactCutIntersectionVolume':intrusion,'boundary':audit,'faces':faces}
 return {'proved':True,'boundary':audit,'faces':faces,'lo':lo,'hi':hi,'volume':math.prod(hi[k]-lo[k] for k in range(3)),'recordedCutIntersectionVolume':intrusion,'missingSourceSide':missing[0] if missing else None,'matchedCutBoundaryPlane':cut_plane}
