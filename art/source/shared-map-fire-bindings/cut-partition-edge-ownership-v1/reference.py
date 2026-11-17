"""Exact analytical polygon-complex proof over unchanged source triangles."""
from fractions import Fraction as F
import collections,itertools
class ProofError(ValueError):pass
def require(test,message):
 if not test:raise ProofError(message)
def configure(base):
 global R,sub,dot,cross
 R=base;sub=R.sub;dot=R.dot;cross=R.cross
def edge(a,b):return tuple(sorted((a,b)))
def area_vector(loop):return tuple(sum(cross(a,b)[k] for a,b in zip(loop,loop[1:]+loop[:1]))/2 for k in range(3))
def flux(loop):
 n=area_vector(loop);return dot(loop[0],n)/3
def source_pool(triangles):return set(p for t in triangles for p in t)
def atom_loop(loop,pool):
 out=[];partitions=[]
 for a,b in zip(loop,loop[1:]+loop[:1]):
  require(a in pool and b in pool,'edge endpoint is not an actual existing source point')
  require(a!=b,'zero analytical edge')
  u=sub(b,a);length=dot(u,u)
  points=sorted((p for p in pool if R.on_segment(p,a,b)),key=lambda p:dot(sub(p,a),u))
  parameters=[dot(sub(p,a),u)/length for p in points]
  require(points[0]==a and points[-1]==b and parameters[0]==0 and parameters[-1]==1,'edge partition does not cover original endpoints')
  require(all(s<t for s,t in zip(parameters,parameters[1:])),'edge partition has duplicate or reversed coverage')
  require(all(cross(sub(p,a),u)==(0,0,0) and a in pool and p in pool for p in points),'analytical edge split is not exact at existing source point')
  out.extend(points[:-1])
  partitions.append({'originalEdge':(a,b),'orderedExistingPoints':points,'parameters':parameters,'coverageExactlyOnce':True})
 require(len(set(out))==len(out),'analytical face repeats a source point')
 return out,partitions
def source_faces(triangles):
 pool=source_pool(triangles);faces=[];proofs=[]
 for i,t in enumerate(triangles):
  require(R.nonzero(t),'zero source triangle needs a separate measure-only treatment')
  loop,partitions=atom_loop(list(t),pool)
  original_vector=tuple(v/2 for v in cross(sub(t[1],t[0]),sub(t[2],t[0])))
  original_flux=dot(t[0],cross(t[1],t[2]))/6
  require(area_vector(loop)==original_vector,'edge atomisation changes original oriented area')
  require(flux(loop)==original_flux,'edge atomisation changes original source volume integral')
  faces.append({'kind':'source','sourceTriangleIndexOffset':3*i,'loop':loop})
  proofs.append({'sourceTriangleIndexOffset':3*i,'edgePartitions':partitions,'originalAreaVector':original_vector,'analyticalAreaVector':area_vector(loop),'originalVolumeIntegral':original_flux,'analyticalVolumeIntegral':flux(loop),'sourceTriangleCoverageUnchanged':True,'physicalTriangleChanged':False})
 return faces,proofs
def incidence(faces):
 uses=collections.defaultdict(list)
 for i,face in enumerate(faces):
  loop=face['loop']
  for a,b in zip(loop,loop[1:]+loop[:1]):uses[edge(a,b)].append((i,1 if a<b else -1,a,b))
 return uses
def source_boundary(faces):
 uses=incidence(faces);boundary=[]
 for key,owners in uses.items():
  require(len(owners)==1 or (len(owners)==2 and sum(o[1] for o in owners)==0),'source analytical edge is multiply owned or inconsistently oriented')
  if len(owners)==1:
   i,_,a,b=owners[0];boundary.append({'sourceFace':i,'sourceDirectedEdge':(a,b),'referenceDirectedEdge':(b,a)})
 return boundary
def face_geometry(loop):
 n=area_vector(loop);require(n!=(0,0,0),'zero-area analytical face')
 require(all(dot(n,sub(p,loop[0]))==0 for p in loop),'analytical face is not exactly planar')
 drop=max(range(3),key=lambda k:abs(n[k]));other=[k for k in range(3) if k!=drop]
 poly=[tuple(p[k] for k in other) for p in loop]
 require(R.polygon_simple(poly),'analytical face is not a simple polygon')
 sign=1 if R.area2(poly)>0 else -1
 require(all(sign*R.cross2(poly[i-1],p,poly[(i+1)%len(poly)])>=0 for i,p in enumerate(poly)),'nonconvex patch requires a separately proved intersection routine')
 return n,drop
def topology(faces):
 uses=incidence(faces)
 require(all(len(o)==2 and o[0][1]+o[1][1]==0 for o in uses.values()),'closed-reference edge ownership/orientation fails')
 points=set(p for face in faces for p in face['loop'])
 for p in points:
  links=collections.defaultdict(list)
  for face in faces:
   loop=face['loop']
   if p not in loop:continue
   i=loop.index(p);a,b=loop[i-1],loop[(i+1)%len(loop)]
   require(a!=b,'degenerate reference vertex link')
   links[a].append(b);links[b].append(a)
  require(links and all(len(ns)==2 for ns in links.values()),'reference vertex link is not a cycle')
  seen={next(iter(links))};queue=list(seen)
  for a in queue:
   for b in links[a]:
    if b not in seen:seen.add(b);queue.append(b)
  require(seen==set(links),'reference vertex link has disconnected cycles')
 graph=collections.defaultdict(set)
 for owners in uses.values():
  i,j=owners[0][0],owners[1][0];graph[i].add(j);graph[j].add(i)
 seen={0};queue=[0]
 for i in queue:
  for j in graph[i]-seen:seen.add(j);queue.append(j)
 require(len(seen)==len(faces),'closed reference has disconnected face components')
 chi=len(points)-len(uses)+len(faces)
 require(chi==2,'closed-reference Euler characteristic is not two')
 return {'vertices':len(points),'atomicEdges':len(uses),'sourceAndImplicitFaces':len(faces),'eachEdgeTwoOppositeUses':True,'allVertexLinksConnectedCycles':True,'referenceFaceComponents':1,'eulerCharacteristic':chi}
def plane_slice(loop,n,c):
 distances=[dot(n,p)-c for p in loop]
 out=[p for p,d in zip(loop,distances) if d==0]
 for a,b,da,db in zip(loop,loop[1:]+loop[:1],distances,distances[1:]+distances[:1]):
  if da*db<0:
   t=da/(da-db);out.append(tuple(a[k]+t*(b[k]-a[k]) for k in range(3)))
 return sorted(set(out))
def owned_contact(points,a,b,project=None):
 if not points:return True
 project=project or (lambda p:p)
 nodes={project(p) for p in set(a)&set(b)}
 ea={edge(project(x),project(y)) for x,y in zip(a,a[1:]+a[:1])}
 eb={edge(project(x),project(y)) for x,y in zip(b,b[1:]+b[:1])};common=ea&eb
 def allowed(p):return p in nodes or any(R.on_segment(p,x,y) for x,y in common)
 if not all(allowed(p) for p in points):return False
 if len(set(points))==1:return True
 axis=max(range(len(points[0])),key=lambda k:max(p[k] for p in points)-min(p[k] for p in points))
 lo,hi=min(points,key=lambda p:p[axis]),max(points,key=lambda p:p[axis])
 if lo==hi:return allowed(lo)
 u=sub(hi,lo);params={F(0),F(1)}
 for x,y in common:
  for p in (x,y):
   if R.on_segment(p,lo,hi):params.add((p[axis]-lo[axis])/u[axis])
 ordered=sorted(params)
 return all(allowed(tuple(lo[k]+((s+t)/2)*u[k] for k in range(len(lo)))) for s,t in zip(ordered,ordered[1:]))
def face_pair(a,b):
 na,dropa=face_geometry(a);nb,_=face_geometry(b)
 if any(min(max(p[k] for p in a),max(p[k] for p in b))<max(min(p[k] for p in a),min(p[k] for p in b)) for k in range(3)):return True,'strict-coordinate-separation'
 ca,cb=dot(na,a[0]),dot(nb,b[0]);da=[dot(nb,p)-cb for p in a];db=[dot(na,p)-ca for p in b]
 if all(d>0 for d in da) or all(d<0 for d in da) or all(d>0 for d in db) or all(d<0 for d in db):return True,'strict-plane-separation'
 direction=cross(na,nb)
 if direction==(0,0,0):
  if any(db):return True,'parallel-separated-planes'
  other=[k for k in range(3) if k!=dropa]
  project=lambda p:tuple(p[k] for k in other)
  intersection=R.convex_intersection([project(p) for p in a],[project(p) for p in b])
  if len(intersection)>2 and R.area2(intersection)!=0:return False,'coplanar-positive-area-overlap'
  return owned_contact(intersection,a,b,project),'coplanar-contact-only-on-owned-existing-subcomplex'
 sa,sb=plane_slice(a,nb,cb),plane_slice(b,na,ca)
 if not sa or not sb:return True,'no-common-plane-slice'
 axis=max(range(3),key=lambda k:abs(direction[k]))
 lo=max(min(p[axis] for p in sa),min(p[axis] for p in sb));hi=min(max(p[axis] for p in sa),max(p[axis] for p in sb))
 if hi<lo:return True,'disjoint-plane-slice-intervals'
 witnesses=[next(p for p in sa+sb if p[axis]==v) for v in {lo,hi}]
 return owned_contact(witnesses,a,b),'noncoplanar-contact-only-on-owned-existing-subcomplex'
def prove(triangles,source,patches):
 pool=source_pool(triangles)
 require([f['sourceTriangleIndexOffset'] for f in source]==list(range(0,3*len(triangles),3)),'source triangle membership is not exhaustive and unique')
 for face,t in zip(source,triangles):
  expected,_=atom_loop(list(t),pool)
  require(face['kind']=='source' and face['loop']==expected,'analytical source boundary differs from its original triangle and exact existing-node partition')
 allfaces=[]
 for face in source+patches:
  require(all(p in pool for p in face['loop']),'reference uses a point absent from the actual original source')
  loop,_=atom_loop(face['loop'],pool)
  allfaces.append({**face,'loop':loop})
 for face in allfaces:face_geometry(face['loop'])
 topo=topology(allfaces)
 counts=collections.Counter();bad=[]
 for i,a in enumerate(allfaces):
  for j,b in enumerate(allfaces[:i]):
   ok,why=face_pair(a['loop'],b['loop']);kind='/'.join(sorted((a['kind'],b['kind'])))
   counts[kind+':'+why]+=1
   if not ok:bad.append({'faceIndices':[j,i],'classification':why})
 require(not bad,'actual source/reference faces overlap or meet outside owned existing subcomplex')
 total=tuple(sum(area_vector(f['loop'])[k] for f in allfaces) for k in range(3))
 require(total==(0,0,0),'closed oriented-area vector is nonzero')
 original=sum(dot(t[0],cross(t[1],t[2])) for t in triangles)/6
 sourceflux=sum(flux(f['loop']) for f in allfaces if f['kind']=='source')
 require(sourceflux==original,'source integral changed by analytical atomisation')
 volume=sum(flux(f['loop']) for f in allfaces)
 require(volume>0,'closed reference volume is not positive')
 shift=(F(1),F(2),F(3))
 shifted=sum(dot(sub(f['loop'][0],shift),area_vector(f['loop']))/3 for f in allfaces)
 require(shifted==volume,'reference volume depends on origin')
 return {'proofComplete':True,'topology':topo,'facePairClassifications':dict(counts),'badFacePairs':bad,'closedOrientedAreaVector':total,'originalOpenIntegral':original,'analyticalSourceIntegral':sourceflux,'closedReferenceVolumeExact':volume,'originShift':[1,2,3],'originShiftVolumeExact':shifted,'originShiftInvariant':True,'closedSourceSolids':False,'physicalCapOrMeshCreated':False},allfaces
