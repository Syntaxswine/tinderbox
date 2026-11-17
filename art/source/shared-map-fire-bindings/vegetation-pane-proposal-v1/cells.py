"""Exact original-triangle/native-cell masks, not replacement geometry."""
from fractions import Fraction as F
import collections,itertools,math
def configure(source):
 global S;S=source
def build_mask(triangles,start):
 points=[p for t in triangles for p in t];box=S.bbox(points);extent=[box['max'][k]-box['min'][k] for k in range(3)]
 axis=min(range(3),key=lambda k:extent[k]);thin=axis if extent[axis]<=F(.12) else None
 axes=[k for k in range(3) if k!=thin];pitch={k:F(1.06) if k==1 else F(.5) for k in axes};origin={k:box['min'][k] for k in axes}
 maximum={k:max(0,math.ceil((box['max'][k]-origin[k])/pitch[k])-1) for k in axes}
 cells={};private={};tri_cells=collections.defaultdict(list);totals=collections.defaultdict(F);zeros=[];candidates=0
 def coordinate_ranges(poly):
  ranges=[]
  for k in axes:
   lo=min(p[k] for p in poly);hi=max(p[k] for p in poly)
   a=math.floor((lo-origin[k])/pitch[k]);b=math.ceil((hi-origin[k])/pitch[k])-1 if hi>lo else a
   a=max(0,min(a,maximum[k]));b=max(0,min(b,maximum[k]));ranges.append(range(a,b+1))
  return ranges
 for i,t in enumerate(triangles):
  offset=start+3*i;normal=S.cross(S.sub(t[1],t[0]),S.sub(t[2],t[0]));norm2=S.dot(normal,normal)
  if not norm2:zeros.append(offset)
  choices=itertools.product(*coordinate_ranges(t))
  if not norm2:choices=itertools.islice(choices,1)
  for coord in choices:
   candidates+=1;assert candidates<=1000000,'bounded source mask candidate limit exceeded'
   bounds={k:(origin[k]+coord[j]*pitch[k],origin[k]+(coord[j]+1)*pitch[k]) for j,k in enumerate(axes)}
   poly=list(t)
   for k in axes:poly=S.clip(poly,k,*bounds[k])
   if not poly:continue
   vector=S.area_vector(poly) if len(poly)>2 else (F(0),)*3
   ratio=2*S.dot(vector,normal)/norm2 if norm2 else None
   if norm2 and not ratio:continue
   assert ratio is None or 0<ratio<=1
   if norm2:assert S.cross(vector,normal)==(0,0,0);totals[offset]+=ratio
   key=','.join(map(str,coord))
   if key not in cells:
    cells[key]={'cellKey':key,'sourceLocalCellIndices':list(coord),'activeSourceAxes':axes,'originalSourceLocalBounds':{str(k):list(bounds[k]) for k in axes},'originalTrianglePortions':[]}
    private[key]=bounds
   cells[key]['originalTrianglePortions'].append({'originalTriangleOffset':offset,'exactOrientedAreaFraction':ratio,'exactZeroAreaSourceTriangle':not bool(norm2)})
   tri_cells[offset].append(key)
 expected=set(range(start,start+3*len(triangles),3));assert set(tri_cells)==expected
 assert all(totals[offset]==1 for offset in expected-set(zeros))
 assert all(len(tri_cells[offset])==1 for offset in zeros)
 out={'coordinateFrame':'unchanged original geometry-local frame and pinned matrix','originByAxis':{str(k):origin[k] for k in axes},'pitchByAxis':{str(k):pitch[k] for k in axes},'ignoredThinAxis':thin,'ignoredThicknessCoRetired':thin is not None,'sourceOriginalTriangleCount':len(triangles),'allOriginalTriangleOffsetsExhaustive':True,'positiveAreaPortionsPartitionEachOriginalTriangleExactlyOnce':True,'zeroAreaSourceTriangleOffsets':zeros,'halfOpenBoundaryRule':'Internal cell planes choose the increasing cell for wholly coplanar source faces; final outer faces stay with the last cell. Zero-area source triangles have one deterministic cell. Shared edges carry no area.','candidateIntersectionsExamined':candidates,'localCellCount':len(cells),'cells':[cells[k] for k in sorted(cells)],'replacementGeometryOrIndexBuffers':False}
 return out,private,tri_cells
def contacts(sources,row,frames,triangles,start,mask,private,tri_cells):
 inverse=S.inverse(row['matrix']);tree=S.BVH(triangles);out=collections.defaultdict(dict);bounds={p['cellKey']:p for p in mask['cells']};tests=0
 for frame in frames:
  parent,ps=sources.triangles(frame)
  for j,world in enumerate(parent):
   local=tuple(inverse(p) for p in world)
   for i in tree.query(S.bbox(local)):
    tests+=1;hit=S.intersection(triangles[i],local)
    if not hit:continue
    for key in tri_cells[start+3*i]:
     if frame['sourceId'] in out[key]:continue
     clipped=hit
     for axis,interval in private[key].items():clipped=S.clip(clipped,axis,*interval)
     if clipped:
      out[key][frame['sourceId']]={'originalFrameSourceId':frame['sourceId'],'originalFrameRenderId':frame['renderId'],'originalFrameTriangleOffset':ps+3*j,'originalGlassTriangleOffset':start+3*i,'actualWorldIntersectionWitness':S.apply(row['matrix'],clipped[0]),'fixedLocalParentMask':{'glassSourceId':row['sourceId'],'cellKey':key,'coordinateFrame':'pinned original glass geometry-local frame and original matrix'},'sourceGeometryContactProved':True,'mechanicalFasteningOrLoadCapacityProved':False,'groundAnchor':False}
 return out,tests
def authored_vent_components(triangles,start):
 components,zero=S.G.components(triangles);assert zero==0
 assert len(components)==6 and all(len(c)==6 for c in components)
 allids=[start+3*i for c in components for i in c];assert sorted(allids)==list(range(start,start+3*len(triangles),3))
 return [{'componentKey':str(j),'originalTriangleOffsets':[start+3*i for i in c],'sourceQuadCells':3,'meaning':'One disconnected authored vent opening with three consecutive-row source cells; a proposed pane/damage owner, not a historical pane assertion.'} for j,c in enumerate(components)]
