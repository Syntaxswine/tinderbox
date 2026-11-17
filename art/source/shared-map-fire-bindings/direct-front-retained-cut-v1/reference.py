"""Exact retained-surface reference predicates. No cap mesh is constructed."""
from fractions import Fraction as F
import collections,itertools
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def cross2(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
def area2(p):return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(p,p[1:]+p[:1]))
def nonzero(t):return cross(sub(t[1],t[0]),sub(t[2],t[0]))!=(0,0,0)
def on_segment(p,a,b):
 u=sub(b,a);v=sub(p,a)
 collinear=cross(u,v)==(0,0,0) if len(p)==3 else u[0]*v[1]-u[1]*v[0]==0
 return collinear and 0<=dot(v,u)<=dot(u,u)
def in_shared_hull(p,shared):
 if not shared:return False
 if len(shared)==1:return p==shared[0]
 if len(shared)==2:return on_segment(p,*shared)
 return False
def dedup(poly):
 out=[]
 for p in poly:
  if not out or p!=out[-1]:out.append(p)
 if len(out)>1 and out[-1]==out[0]:out.pop()
 return out
def convex_intersection(subject,clip):
 poly=list(subject);sgn=1 if area2(clip)>0 else -1
 for a,b in zip(clip,clip[1:]+clip[:1]):
  old=poly;poly=[]
  if not old:break
  for p,q in zip(old,old[1:]+old[:1]):
   dp,dq=sgn*cross2(a,b,p),sgn*cross2(a,b,q)
   if dp>=0:poly.append(p)
   if (dp>=0)!=(dq>=0):
    u=dp/(dp-dq);poly.append(tuple(p[k]+u*(q[k]-p[k]) for k in range(2)))
  poly=dedup(poly)
 return poly
def plane_slice(triangle,n,c):
 distances=[dot(n,p)-c for p in triangle];out=[p for p,d in zip(triangle,distances) if d==0]
 for i in range(3):
  j=(i+1)%3;a,b=triangle[i],triangle[j];da,db=distances[i],distances[j]
  if da*db<0:
   u=da/(da-db);out.append(tuple(a[k]+u*(b[k]-a[k]) for k in range(3)))
 return sorted(set(out))
def triangle_pair_intersection_allowed(a,b):
 if any(min(max(p[k] for p in a),max(p[k] for p in b))<max(min(p[k] for p in a),min(p[k] for p in b)) for k in range(3)):return True,'disjoint-axis-bounds'
 na=cross(sub(a[1],a[0]),sub(a[2],a[0]));nb=cross(sub(b[1],b[0]),sub(b[2],b[0]))
 ca,cb=dot(na,a[0]),dot(nb,b[0]);da=[dot(nb,p)-cb for p in a];db=[dot(na,p)-ca for p in b]
 if all(d>0 for d in da) or all(d<0 for d in da) or all(d>0 for d in db) or all(d<0 for d in db):return True,'strict-plane-separation'
 shared=sorted(set(a)&set(b));direction=cross(na,nb)
 if direction==(0,0,0):
  if any(db):return True,'parallel-separated-planes'
  drop=max(range(3),key=lambda k:abs(na[k]));other=[k for k in range(3) if k!=drop]
  aa=[tuple(p[k] for k in other) for p in a];bb=[tuple(p[k] for k in other) for p in b]
  intersection=convex_intersection(aa,bb)
  if len(intersection)>2 and area2(intersection)!=0:return False,'coplanar-positive-area-overlap'
  ss=[tuple(p[k] for k in other) for p in shared]
  return all(in_shared_hull(p,ss) for p in intersection),'coplanar-contact-only-on-shared-source-simplex'
 sa,sb=plane_slice(a,nb,cb),plane_slice(b,na,ca)
 if not sa or not sb:return True,'no-common-plane-slice'
 axis=max(range(3),key=lambda k:abs(direction[k]))
 lo=max(min(p[axis] for p in sa),min(p[axis] for p in sb));hi=min(max(p[axis] for p in sa),max(p[axis] for p in sb))
 if hi<lo:return True,'disjoint-plane-slice-intervals'
 endpoints=[next(p for p in sa+sb if p[axis]==value) for value in {lo,hi}]
 return all(in_shared_hull(p,shared) for p in endpoints),'noncoplanar-contact-only-on-shared-source-simplex'
def point_polygon(p,poly):
 for a,b in zip(poly,poly[1:]+poly[:1]):
  if on_segment(p,a,b):return 0
 inside=False
 for a,b in zip(poly,poly[1:]+poly[:1]):
  if (a[1]>p[1])!=(b[1]>p[1]):
   at=a[0]+(p[1]-a[1])*(b[0]-a[0])/(b[1]-a[1])
   if at>p[0]:inside=not inside
 return 1 if inside else -1
def point_triangle(p,t):
 s=1 if area2(t)>0 else -1;ds=[s*cross2(a,b,p) for a,b in zip(t,t[1:]+t[:1])]
 return 1 if min(ds)>0 else 0 if min(ds)>=0 else -1
def polygon_simple(poly):
 for i,a in enumerate(poly):
  b=poly[(i+1)%len(poly)]
  for j,c in enumerate(poly[:i]):
   if j==i-1 or (i==len(poly)-1 and j==0):continue
   d=poly[(j+1)%len(poly)]
   if any(min(max(a[k],b[k]),max(c[k],d[k]))<max(min(a[k],b[k]),min(c[k],d[k])) for k in range(2)):continue
   if cross2(a,b,c)*cross2(a,b,d)<=0 and cross2(c,d,a)*cross2(c,d,b)<=0:return False
 return area2(poly)!=0
def polygon_interior_point(poly):
 orientation=1 if area2(poly)>0 else -1
 for i,p in enumerate(poly):
  a,b=poly[i-1],poly[(i+1)%len(poly)]
  if orientation*cross2(a,p,b)>0:
   q=tuple((a[k]+p[k]+b[k])/3 for k in range(2))
   if point_polygon(q,poly)==1:return q
 raise ValueError('No certified existing-corner interior probe')
def segment_enters_polygon(a,b,poly):
 if a==b:return point_polygon(a,poly)==1
 u=sub(b,a);axis=max(range(2),key=lambda k:abs(u[k]));parameters={F(0),F(1)}
 for c,d in zip(poly,poly[1:]+poly[:1]):
  v=sub(d,c);den=u[0]*v[1]-u[1]*v[0];w=sub(c,a)
  if den:
   t=(w[0]*v[1]-w[1]*v[0])/den;s=(w[0]*u[1]-w[1]*u[0])/den
   if 0<=t<=1 and 0<=s<=1:parameters.add(t)
  elif u[0]*w[1]-u[1]*w[0]==0:
   for p in (c,d):
    t=(p[axis]-a[axis])/u[axis]
    if 0<=t<=1:parameters.add(t)
 ordered=sorted(parameters);tests=ordered+[(x+y)/2 for x,y in zip(ordered,ordered[1:])]
 return any(point_polygon(tuple(a[k]+t*u[k] for k in range(2)),poly)==1 for t in tests)
def triangle_cap_allowed(t,loop,axis):
 c=loop[0][axis];n=tuple(F(1) if k==axis else F(0) for k in range(3))
 distances=[p[axis]-c for p in t]
 if all(d>0 for d in distances) or all(d<0 for d in distances):return True,'strict-cap-plane-separation'
 other=[(axis+1)%3,(axis+2)%3];poly=[tuple(p[k] for k in other) for p in loop]
 if not any(distances):
  tri=[tuple(p[k] for k in other) for p in t]
  if any(segment_enters_polygon(a,b,poly) for a,b in zip(tri,tri[1:]+tri[:1])):return False,'coplanar-source-edge-enters-cap-interior'
  centroid=tuple(sum(p[k] for p in tri)/3 for k in range(2))
  if point_polygon(centroid,poly)==1:return False,'coplanar-source-centroid-inside-cap'
  if point_triangle(polygon_interior_point(poly),tri)==1:return False,'cap-interior-probe-inside-coplanar-source-face'
  return True,'coplanar-boundary-only-or-disjoint'
 cut=plane_slice(t,n,c)
 if not cut:return True,'no-cap-plane-contact'
 if len(cut)==1:return point_polygon(tuple(cut[0][k] for k in other),poly)!=1,'point-contact-not-in-cap-interior'
 a,b=cut[0],cut[-1]
 return not segment_enters_polygon(tuple(a[k] for k in other),tuple(b[k] for k in other),poly),'plane-slice-avoids-cap-interior'
def oriented_caps(triangles,loops):
 edge_balance=collections.Counter()
 for t in triangles:
  for a,b in zip(t,t[1:]+t[:1]):edge_balance[tuple(sorted((a,b)))]+=1 if a<b else -1
 caps=[]
 for loop in loops:
  directions=[edge_balance[tuple(sorted((a,b)))]*(1 if a<b else -1) for a,b in zip(loop,loop[1:]+loop[:1])]
  assert len(set(directions))==1 and abs(directions[0])==1
  cap=list(reversed(loop)) if directions[0]==1 else list(loop)
  axes=[k for k in range(3) if len({p[k] for p in cap})==1];assert len(axes)==1;axis=axes[0]
  vector=tuple(sum(cross(a,b)[k] for a,b in zip(cap,cap[1:]+cap[:1]))/2 for k in range(3))
  assert vector[axis]!=0 and all(vector[k]==0 for k in range(3) if k!=axis)
  other=[(axis+1)%3,(axis+2)%3];simple=polygon_simple([tuple(p[k] for k in other) for p in cap]);assert simple
  caps.append({'simplePlanarLoopProved':simple,'loop':cap,'axis':axis,'areaVector':vector,'area':abs(vector[axis]),'sourceOriginVolumeContribution':dot(cap[0],vector)/3})
 return caps
def topology(triangles,loops):
 edge_faces=collections.defaultdict(list);vertices=collections.defaultdict(set)
 for i,t in enumerate(triangles):
  for p in t:vertices[p].add(i)
  for a,b in zip(t,t[1:]+t[:1]):edge_faces[tuple(sorted((a,b)))].append((i,1 if a<b else -1))
 assert all(len(fs)==1 or (len(fs)==2 and sum(s for _,s in fs)==0) for fs in edge_faces.values())
 boundary={p for e,fs in edge_faces.items() if len(fs)==1 for p in e}
 boundary_occurrence=collections.Counter(p for loop in loops for p in loop);assert set(boundary_occurrence)==boundary and all(n==1 for n in boundary_occurrence.values())
 links=collections.defaultdict(set)
 for fs in edge_faces.values():
  if len(fs)==2:
   a,b=fs[0][0],fs[1][0];links[a].add(b);links[b].add(a)
 for p,incident in vertices.items():
  start=next(iter(incident));seen={start};queue=[start]
  for i in queue:
   for j in (links[i]&incident)-seen:seen.add(j);queue.append(j)
  assert seen==incident
  degrees=[len(links[i]&incident) for i in incident]
  if p in boundary:
   assert (len(incident)==1 and degrees==[0]) or (degrees.count(1)==2 and all(d in (1,2) for d in degrees))
  else:assert all(d==2 for d in degrees)
 unseen=set(range(len(triangles)));components=0
 while unseen:
  components+=1;start=next(iter(unseen));unseen.remove(start);queue=[start]
  for i in queue:
   for j in links[i]&unseen:unseen.remove(j);queue.append(j)
 chi=len(vertices)-len(edge_faces)+len(triangles)+len(loops)
 return {'sourceSurfaceComponents':components,'sourceVertexLinksAreInteriorCyclesOrBoundaryPaths':True,'eachBoundaryVertexOwnedByOneExistingLoop':True,'allInternalEdgesTwoOppositeUses':True,'closedReferenceEulerCharacteristic':chi,'closureFacesImplicitDisksOnly':len(loops)}
def prove_reference(triangles,loops):
 nonzero_tri=[t for t in triangles if nonzero(t)];caps=oriented_caps(nonzero_tri,loops);topo=topology(nonzero_tri,loops)
 pair_counts=collections.Counter();bad_pairs=[]
 for i,a in enumerate(nonzero_tri):
  for j,b in enumerate(nonzero_tri[:i]):
   ok,why=triangle_pair_intersection_allowed(a,b);pair_counts[why]+=1
   if not ok:bad_pairs.append([j,i,why])
 cap_counts=collections.Counter();bad_cap=[]
 for i,cap in enumerate(caps):
  for j,t in enumerate(nonzero_tri):
   ok,why=triangle_cap_allowed(t,cap['loop'],cap['axis']);cap_counts[why]+=1
   if not ok:bad_cap.append([i,j,why])
 cap_pair_disjoint=[]
 for i,a in enumerate(caps):
  for j,b in enumerate(caps[:i]):
   separated=any(max(p[k] for p in a['loop'])<min(p[k] for p in b['loop']) or max(p[k] for p in b['loop'])<min(p[k] for p in a['loop']) for k in range(3))
   cap_pair_disjoint.append({'capIndices':[j,i],'strictCoordinateHalfspaceSeparation':separated})
 mesh_area=tuple(sum(cross(sub(t[1],t[0]),sub(t[2],t[0]))[k] for t in nonzero_tri)/2 for k in range(3))
 total_area=tuple(mesh_area[k]+sum(c['areaVector'][k] for c in caps) for k in range(3));assert total_area==(0,0,0)
 opened=sum(dot(t[0],cross(t[1],t[2])) for t in nonzero_tri)/6
 volume=opened+sum(c['sourceOriginVolumeContribution'] for c in caps)
 shifted=(F(1),F(2),F(3))
 shifted_mesh=sum(dot(sub(t[0],shifted),cross(sub(t[1],shifted),sub(t[2],shifted))) for t in nonzero_tri)/6
 shifted_caps=sum(dot(sub(c['loop'][0],shifted),c['areaVector'])/3 for c in caps)
 assert shifted_mesh+shifted_caps==volume
 complete=topo['sourceSurfaceComponents']==1 and topo['closedReferenceEulerCharacteristic']==2 and not bad_pairs and not bad_cap and all(p['strictCoordinateHalfspaceSeparation'] for p in cap_pair_disjoint) and volume>0
 return {'proofComplete':complete,'topology':topo,'nonzeroOriginalTriangles':len(nonzero_tri),'zeroAreaOriginalTrianglesExcludedOnlyFromMeasures':len(triangles)-len(nonzero_tri),'trianglePairClassificationCounts':dict(pair_counts),'badSourceTrianglePairs':bad_pairs,'sourceTriangleImplicitCapClassificationCounts':dict(cap_counts),'badSourceTriangleCapIntersections':bad_cap,'implicitCapPairSeparation':cap_pair_disjoint,'closedReferenceOrientedAreaVectorSum':total_area,'openSourceIntegralAtZeroOrigin':opened,'closedReferenceVolumeExact':volume if complete else None,'diagnosticClosedIntegralNotAcceptedVolume':volume,'referenceIntegralOriginShift':[1,2,3],'referenceIntegralOriginShiftInvariant':True,'implicitCaps':caps,'physicalCapGeometryGenerated':False}
