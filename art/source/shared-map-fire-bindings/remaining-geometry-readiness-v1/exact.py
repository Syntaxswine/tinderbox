"""Exact source-coordinate predicates. No welding tolerance, snapping or mesh writes."""
from fractions import Fraction as F
import collections,hashlib,json,math,struct
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def sign(n):return (n>0)-(n<0)
def rational(value):
 value=F(value);return {'numerator':str(value.numerator),'denominator':str(value.denominator),'approximate':float(value)}
def determinant(v):
 a,b,c,d,e,f,g,h,i=map(F,v);return a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g)
def cross2(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
def overlap2(a,b):
 if any(min(max(p[k] for p in a),max(p[k] for p in b))<=max(min(p[k] for p in a),min(p[k] for p in b)) for k in (0,1)):return False
 shared=set(a)&set(b)
 if len(shared)==2:
  x,y=sorted(shared);u=next(p for p in a if p not in shared);v=next(p for p in b if p not in shared)
  if cross2(x,y,u)*cross2(x,y,v)<=0:return False
 poly=[tuple(map(F,p)) for p in a];orientation=sign(cross2(*b))
 for x,y in zip(b,b[1:]+b[:1]):
  old=poly;poly=[]
  for p,q in zip(old,old[1:]+old[:1]):
   dp,dq=orientation*cross2(x,y,p),orientation*cross2(x,y,q)
   if dp>=0:poly.append(p)
   if (dp>=0)!=(dq>=0):
    t=dp/(dp-dq);poly.append(tuple(p[k]+t*(q[k]-p[k]) for k in (0,1)))
  if not poly:return False
 return len(poly)>2 and sum(p[0]*q[1]-q[0]*p[1] for p,q in zip(poly,poly[1:]+poly[:1]))!=0
def nonoverlap2(triangles):
 for i,a in enumerate(triangles):
  for j in range(i):
   if overlap2(a,triangles[j]):return {'proved':False,'overlapPair':[j,i]}
 return {'proved':True,'trianglePairs':len(triangles)*(len(triangles)-1)//2}
def boundary2(triangles):
 edges=collections.Counter()
 for t in triangles:
  for a,b in zip(t,t[1:]+t[:1]):edges[tuple(sorted([a,b]))]+=1
 return sorted(e for e,n in edges.items() if n==1)
def effective(geometry,source_range=None):
 pos=geometry['attributes']['position']['array'];idx=geometry.get('index');idx=idx['array'] if isinstance(idx,dict) else list(range(len(pos)//3))
 start=source_range['start'] if source_range else 0;count=source_range['count'] if source_range else len(idx)
 assert start>=0 and count>0 and start%3==count%3==0 and start+count<=len(idx)
 selected=idx[start:start+count];assert all(isinstance(i,int) and 0<=i<len(pos)//3 for i in selected)
 original_points=[tuple(pos[3*i:3*i+3]) for i in selected];coordinates=[F(x) for p in original_points for x in p]
 scale=max(v.denominator for v in coordinates);assert scale&(scale-1)==0
 points=sorted(set(tuple(int(F(v)*scale) for v in p) for p in original_points));by={p:i for i,p in enumerate(points)}
 triangles=[tuple(by[tuple(int(F(v)*scale) for v in p)] for p in original_points[i:i+3]) for i in range(0,len(selected),3)]
 source_vertex_refs={}
 for source_index,point in zip(selected,original_points):
  key=by[tuple(int(F(v)*scale) for v in point)];source_vertex_refs[key]=min(source_index,source_vertex_refs.get(key,source_index))
 faces=[];degenerate=0;edge_faces=collections.defaultdict(list);incident=collections.defaultdict(set);volume6=0;origin=points[0]
 for original_index,t in enumerate(triangles):
  vs=[points[i] for i in t];n=cross(sub(vs[1],vs[0]),sub(vs[2],vs[0]))
  if n==(0,0,0):degenerate+=1;continue
  j=len(faces);faces.append({'vertices':t,'normal':n,'triangleOffset':original_index,'points':vs})
  volume6+=dot(sub(vs[0],origin),cross(sub(vs[1],origin),sub(vs[2],origin)))
  for vertex in t:incident[vertex].add(j)
  for a,b in zip(t,t[1:]+t[:1]):edge_faces[tuple(sorted([a,b]))].append((j,1 if a<b else -1))
 bad_edges=[(e,len(fs),sum(s for _,s in fs)) for e,fs in edge_faces.items() if len(fs)!=2 or sum(s for _,s in fs)!=0]
 links={i:set() for i in range(len(faces))}
 for e,fs in edge_faces.items():
  if len(fs)==2:links[fs[0][0]].add(fs[1][0]);links[fs[1][0]].add(fs[0][0])
 components=[];seen=set()
 for i in links:
  if i in seen:continue
  queue=[i];seen.add(i)
  for j in queue:
   for k in links[j]:
    if k not in seen:seen.add(k);queue.append(k)
  components.append(queue)
 bad_vertices=[]
 if not bad_edges:
  for v,around in incident.items():
   queue=[next(iter(around))];vis=set(queue)
   for j in queue:
    for k in links[j]&around:
     if k not in vis:vis.add(k);queue.append(k)
   if vis!=around:bad_vertices.append(v)
 closed=not bad_edges and not bad_vertices
 orientation=sign(volume6);convex=False
 if closed and len(components)==1 and orientation:
  convex=True
  for face in faces:
   n=tuple(orientation*x for x in face['normal']);a=face['points'][0]
   if any(dot(n,sub(v,a))>0 for v in points):convex=False;break
 out={'scale':scale,'points':points,'faces':faces,'orientation':orientation,'edges':edge_faces,'components':components,'bounds':{'min':[min(v[k] for v in points)/scale for k in range(3)],'max':[max(v[k] for v in points)/scale for k in range(3)]},'prisms':{},
 'facts':{'sourceIndexStart':start,'sourceIndexCount':count,'sourceTriangles':count//3,'nondegenerateTriangles':len(faces),'exactZeroAreaTriangles':degenerate,'uniqueSourcePositions':len(points),'exactManifoldEdges':not bad_edges,'exactVertexLinks':not bad_vertices,'closedOrientedManifold':closed,'surfaceComponents':len(components),'strictConvexBoundaryProof':convex,'signedVolumeIntegral':rational(F(volume6,6*scale**3)),'boundaryOrNonmanifoldEdges':len(bad_edges),'badVertexLinks':len(bad_vertices),'boundaryEvidence':[{'sourceGeometryVertexIndices':[source_vertex_refs[e[0]],source_vertex_refs[e[1]]],'effectiveTriangleOffsets':[faces[j]['triangleOffset'] for j,_ in edge_faces[e]],'edgeUseCount':count,'directedBalance':balance} for e,count,balance in bad_edges[:4]],'boundaryCoordinateMeaning':'Indices refer to the unchanged original geometry position/index arrays and effective draw range; no mesh or coordinate array is exported.','coordinateScale':str(scale)}}
 for axis in range(3):
  lo=min(p[axis] for p in points);hi=max(p[axis] for p in points);other=[k for k in range(3) if k!=axis]
  if lo==hi or any(p[axis] not in (lo,hi) for p in points):continue
  ends={}
  for side,value in [('min',lo),('max',hi)]:
   cap=[face for face in faces if all(p[axis]==value for p in face['points'])]
   ts=[tuple(tuple(p[k] for k in other) for p in face['points']) for face in cap]
   if not ts:break
   proof=nonoverlap2(ts)
   ends[side]={'triangles':ts,'proof':proof,'boundary':boundary2(ts),'area2':sum(abs(cross2(*t)) for t in ts)}
  if len(ends)!=2:continue
  congruent=ends['min']['boundary']==ends['max']['boundary'];area=F(ends['max']['area2'],2*scale**2);depth=F(hi-lo,scale);integral=abs(F(volume6,6*scale**3))
  valid=closed and len(components)==1 and congruent and ends['min']['proof']['proved'] and ends['max']['proof']['proved'] and area*depth==integral and all(face['normal'][axis]==0 or all(p[axis]==face['points'][0][axis] for p in face['points']) for face in faces)
  out['prisms'][axis]={'proved':valid,'axis':axis,'congruentCapBoundaries':congruent,'capNonoverlap':all(e['proof']['proved'] for e in ends.values()),'primaryArea':rational(area),'depth':rational(depth),'volumeIntegralMatchesExtrusion':area*depth==integral}
 out['facts']['sourcePrismProofs']=list(out['prisms'].values())
 out['facts']['closedSolidProof']=closed and len(components)==1 and (convex or any(p['proved'] for p in out['prisms'].values()))
 out['facts']['closedSolidMethod']='exact-convex-supporting-halfspaces' if convex else 'exact-congruent-nonoverlapping-prismatic-caps' if out['facts']['closedSolidProof'] else 'not-proved'
 return out
def matrix_linear(matrix):return tuple(matrix[i] for i in [0,4,8,1,5,9,2,6,10])
def linear_metrics(shape,matrix,recipe):
 linear=matrix_linear(matrix);det=determinant(linear);assert det!=0
 a,b,c,d,e,f,g,h,i=map(F,linear);coef=(c*h-b*i,a*i-c*g,b*g-a*h);scale=shape['scale'];orient=(shape['orientation'] or 1) if shape['facts']['closedOrientedManifold'] else 1
 top=[];projected=F(0);ys=set()
 for face in (shape['faces'] if recipe in {'top-area','weather-area'} else []):
  ny=sum(coef[k]*face['normal'][k] for k in range(3))*orient*sign(det)
  if ny>0:
   projected+=ny/(2*scale**2)
   for p in face['points']:ys.add((d*p[0]+e*p[1]+f*p[2])/scale)
   top.append(tuple(((a*p[0]+b*p[1]+c*p[2])/scale,(g*p[0]+h*p[1]+i*p[2])/scale) for p in face['points']))
 result={'linearDeterminant':rational(det),'boundsAreNotSolids':True,'geometryClosedSolidProved':shape['facts']['closedSolidProof'],'measurementsApplied':False}
 if recipe=='closed-volume':
  v=shape['facts']['signedVolumeIntegral'];world=abs(F(int(v['numerator']),int(v['denominator']))*det)
  result.update({'readiness':'proved-closed-solid-volume' if shape['facts']['closedSolidProof'] else 'withheld-closed-solid-not-proved','geometricIntegralNotAssignedStock':rational(world),'volumeIsPhysicalProof':shape['facts']['closedSolidProof']})
 elif recipe=='leaf-area':
  prism=shape['prisms'].get(2);ready=bool(prism and prism['proved']);factor2=(b*f-c*e)**2+(c*d-a*f)**2+(a*e-b*d)**2
  if ready:
   ar=F(int(prism['primaryArea']['numerator']),int(prism['primaryArea']['denominator']));sq=ar*ar*factor2
   result.update({'primaryFaceAreaSquared':rational(sq),'primaryFaceAreaApproximate':math.sqrt(float(sq)),'actualSourceDepth':prism['depth'],'sourceFrontAxis':2,'proof':'Component source prism area; body/extension union and pose grouping are reviewed separately.'})
  result['readiness']='proved-leaf-component-area' if ready else 'withheld-leaf-component-area'
 elif recipe=='wall-area':
  prism=shape['prisms'].get(2);half=F(struct.unpack('f',struct.pack('f',.08))[0]);depth_encoding=min(p[2] for p in shape['points'])==-half*scale and max(p[2] for p in shape['points'])==half*scale;ready=bool(prism and prism['proved'] and depth_encoding);result['nativeFrontDepthEncodingProved']=depth_encoding;factor2=(b*f-c*e)**2+(c*d-a*f)**2+(a*e-b*d)**2
  if ready:
   ar=F(int(prism['primaryArea']['numerator']),int(prism['primaryArea']['denominator']));sq=ar*ar*factor2
   result.update({'primaryFaceAreaSquared':rational(sq),'primaryFaceAreaApproximate':math.sqrt(float(sq)),'actualSourceDepth':prism['depth'],'sourceFrontAxis':2,'proof':'Two congruent nonoverlapping source XY caps, exact closed prism integral; actual affine area factor retained.'})
  result['readiness']='proved-primary-wall-area' if ready else 'withheld-primary-face-correspondence-not-proved'
 elif recipe=='top-area':
  highest=max((d*p[0]+e*p[1]+f*p[2])/scale for p in shape['points']);on_top=len(ys)==1 and next(iter(ys))==highest
  proof=nonoverlap2(top) if on_top else {'proved':False,'reason':'Actual upward faces are not one exact horizontal plane.'}
  result.update({'readiness':'proved-upward-projected-area' if projected>0 and on_top and proof['proved'] else 'withheld-top-projection-not-proved','upwardProjectedArea':rational(projected),'exactUpwardHeightPlanes':len(ys),'projectionNonoverlap':proof})
 elif recipe=='weather-area':
  result.update({'readiness':'withheld-weather-exposure-and-duplicate-coverage-review','upwardProjectedArea':rational(projected),'intrinsicAreaIsNotExposedArea':True})
 elif recipe=='withheld':result['readiness']='withheld-living-material-stock-and-response'
 else:result['readiness']='nonfuel-geometry-only-no-structural-or-damage-acceptance'
 return result
