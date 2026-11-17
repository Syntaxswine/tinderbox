"""Bounded radial-roundoff proposal evidence; no mesh, stock or runtime mutation."""
from pathlib import Path
from fractions import Fraction as F
from decimal import Decimal,localcontext
import argparse,collections,hashlib,importlib.util,json,math,os,struct,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
PRE=HERE.parent/'remaining-geometry-readiness-v1'
BASE='9dfee80fcba650447d07488f67e76b1461c1d4d1'
FROZEN='2b350309d9116812a1d3988af090614bdaefbc25'
CORE='vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.core.js'
FORMS='assets/art/exposition-new-york/forms.js'
spec=importlib.util.spec_from_file_location('preserved_exact_radial_review',PRE/'exact.py')
X=importlib.util.module_from_spec(spec);spec.loader.exec_module(X)
def load(path):return json.loads(path.read_text(encoding='utf-8'))
def encode(v):return (json.dumps(v,sort_keys=True,indent=2)+'\n').encode()
def sha(v):return hashlib.sha256(v).hexdigest()
def rat(v):return {'numerator':str(v.numerator),'denominator':str(v.denominator),'approximate':float(v)}
def git(path,commit):return subprocess.check_output(['git','show',commit+':'+path],cwd=ROOT)
def f32(v):return struct.unpack('<f',struct.pack('<f',float(v)))[0]
def l1(v):return sum(abs(x) for x in v)
def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def decimal_sqrt(v):
 with localcontext() as c:
  c.prec=50
  return (Decimal(v.numerator)/Decimal(v.denominator)).sqrt()
def atan_interval(q,n):
 value=sum(((-1)**k*F(1,(2*k+1)*q**(2*k+1)) for k in range(n)),F(0))
 next_term=(-1)**n*F(1,(2*n+1)*q**(2*n+1))
 return min(value,value+next_term),max(value,value+next_term)
def phase_bounds():
 # Machin identity: tan(4 atan(1/5)-atan(1/239)) = 1 in the first quadrant.
 assert (F(120,119)-F(1,239))/(1+F(120,119)*F(1,239))==1
 a,b=atan_interval(5,48);c,d=atan_interval(239,16)
 pi=(16*a-4*d,16*b-4*c);tau=F(math.tau)
 e=(tau-2*pi[1],tau-2*pi[0]);assert -F(1,10**15)<e[0]<e[1]<0
 radius=max(abs(v) for v in e)
 # |sin(t)-t+t^3/6| <= |t|^5/120 for the very small residual phase.
 sine=(e[0]-e[1]**3/6-radius**5/120,e[1]-e[0]**3/6+radius**5/120)
 return {'machinTerms':[48,16],'tauBinary64':rat(tau),'phaseResidualInterval':[rat(v) for v in e],'sineResidualInterval':[rat(v) for v in sine]},sine
def rounding_cell(v):
 assert v<0
 bits=struct.unpack('<I',struct.pack('<f',v))[0]
 lower=F(struct.unpack('<f',struct.pack('<I',bits+1))[0])
 upper=F(struct.unpack('<f',struct.pack('<I',bits-1))[0])
 return (lower+F(v))/2,(upper+F(v))/2
def raw_geometry(row):
 path=row['geometryPath'];raw=(ROOT/path).read_bytes()
 assert sha(raw)==row['geometrySha256'] and raw==git(path,FROZEN)
 g=json.loads(raw);assert g['attributes']['position']['type']=='Float32Array'
 return g
def vertices(g):return [tuple(map(F,g['attributes']['position']['array'][i:i+3])) for i in range(0,len(g['attributes']['position']['array']),3)]
def index_list(g):return g['index']['array']
def symbolic_topology(g,pairs):
 pts=vertices(g);labels=list(pts)
 for start,end,_ in pairs:labels[end]=labels[start]
 edges=collections.defaultdict(list);faces=[];around=collections.defaultdict(set);dropped=0
 for offset in range(0,len(index_list(g)),3):
  ids=index_list(g)[offset:offset+3];v=[pts[i] for i in ids]
  normal=X.cross(sub(v[1],v[0]),sub(v[2],v[0]))
  if normal==(0,0,0):dropped+=1;continue
  t=[labels[i] for i in ids];assert len(set(t))==3,'Nonzero triangle collapses under labels'
  j=len(faces);faces.append(t)
  for p in t:around[p].add(j)
  for a,b in zip(t,t[1:]+t[:1]):edges[tuple(sorted((a,b)))].append((j,1 if a<b else -1))
 bad=[e for e,fs in edges.items() if len(fs)!=2 or sum(s for _,s in fs)!=0]
 links={i:set() for i in range(len(faces))}
 for fs in edges.values():
  if len(fs)==2:
   a,b=fs[0][0],fs[1][0];links[a].add(b);links[b].add(a)
 seen=set();components=0
 for i in links:
  if i in seen:continue
  components+=1;queue=[i];seen.add(i)
  for j in queue:
   for k in links[j]-seen:seen.add(k);queue.append(k)
 bad_links=0
 for p,incident in around.items():
  queue=[next(iter(incident))];seen_links=set(queue)
  for j in queue:
   for k in (links[j]&incident)-seen_links:seen_links.add(k);queue.append(k)
  if seen_links!=incident:bad_links+=1
 return {'labelOnlyNoCoordinateReplacement':True,'nondegenerateFaces':len(faces),'exactZeroAreaTrianglesExcluded':dropped,'boundaryOrNonmanifoldEdges':len(bad),'badVertexLinks':bad_links,'surfaceComponents':components,'eulerCharacteristic':len(around)-len(edges)+len(faces),'closedOrientedSymbolicManifold':not bad and not bad_links and components==1}
def pair_review(g,pairs,sine,strict=True):
 pts=vertices(g);out=[]
 for start,end,radius in pairs:
  a,b=pts[start],pts[end];r=F(radius)
  assert a[0]==0 and a[1:]==b[1:] and a[2]==F(f32(radius))
  if radius==0:
   assert a==b
   continue
  cell=rounding_cell(float(b[0]));pred=(r*sine[0],r*sine[1])
  match=cell[0]<pred[0]<=pred[1]<cell[1]
  if strict:assert match,(start,end,radius,float(b[0]),tuple(map(float,pred)))
  out.append({'firstSourceVertexIndex':start,'terminalSourceVertexIndex':end,'constructorRadiusBinary64':radius,'storedTerminalX':rat(b[0]),'exactEndpointL1Gap':rat(l1(sub(a,b))),'predictedSineProductInterval':[rat(v) for v in pred],'observedFloat32RoundingCell':[rat(v) for v in cell],'analyticProductInsideObservedFloat32Cell':match})
 return out
def measures(g,pairs):
 pts=vertices(g);delta={end:l1(sub(pts[start],pts[end])) for start,end,_ in pairs}
 volume=F(0);area=Decimal(0);ev=F(0);ea=F(0);affected=0;reference_shift=F(0)
 dx={end:pts[start][0]-pts[end][0] for start,end,_ in pairs}
 assert all(pts[start][1:]==pts[end][1:] for start,end,_ in pairs)
 for offset in range(0,len(index_list(g)),3):
  ids=index_list(g)[offset:offset+3];a,b,c=[pts[i] for i in ids]
  volume+=X.dot(a,X.cross(b,c))/6
  xa,xb,xc=[dx.get(i,F(0)) for i in ids]
  reference_shift+=(xa*(b[1]*c[2]-b[2]*c[1])+xb*(a[2]*c[1]-a[1]*c[2])+xc*(a[1]*b[2]-a[2]*b[1]))/6
  u,v=sub(b,a),sub(c,a);normal=X.cross(u,v)
  area+=decimal_sqrt(sum(x*x for x in normal))/2
  da,db,dc=[delta.get(i,F(0)) for i in ids]
  if da or db or dc:affected+=1
  alpha,beta=da+db,da+dc
  ea+=(alpha*l1(v)+beta*l1(u)+alpha*beta)/2
  aa,bb,cc=l1(a),l1(b),l1(c)
  ev+=(da*bb*cc+db*aa*cc+dc*aa*bb+da*db*cc+da*dc*bb+db*dc*aa+da*db*dc)/6
 assert volume>ev>0 and area>0 and abs(reference_shift)<=ev
 return {'fixedSourceIntegralOrigin':[0,0,0],'uncorrectedSignedVolumeIntegral':rat(volume),'exactPeriodicReferenceVolumeShiftFromMultilinearity':rat(reference_shift),'exactPeriodicReferenceVolume':rat(volume+reference_shift),'referenceShiftWithinProvedBound':True,'sourceTriangleAreaApproximate':float(area),'sourceAreaDisplayPrecisionDigits':28,'periodicEndpointAreaChangeUpperBound':rat(ea),'periodicEndpointVolumeChangeUpperBound':rat(ev),'proposedGeometricVolumeInterval':[rat(volume-ev),rat(volume+ev)],'proposedConservativeGeometricVolume':rat(volume-ev),'proposedQuantityIntervalAtAcceptedPoint12ReferenceDepth':[rat((volume-ev)/F(.12)),rat((volume+ev)/F(.12))],'exactAcceptedPoint12Binary64':rat(F(.12)),'trianglesWithMovedEndpointInErrorFormula':affected,'maxSourceEndpointL1Gap':rat(max(delta.values())),'boundMeaning':'Difference between original source integrals and a mathematical periodic endpoint reference retaining every other stored Float32 coordinate. No circular/smooth-cylinder substitution; no reference mesh is constructed or exported.','quantitiesAssigned':False}
def cylinder_pairs(n,rTop,rBottom,capped=True):
 pairs=[(0,n,rTop),(n+1,2*n+1,rBottom)]
 if capped:
  top=2*(n+1)+n;bottom=top+n+1+n
  pairs += [(top,top+n,rTop),(bottom,bottom+n,rBottom)]
 return pairs
def profile_certificate(g,kind,n,profile):
 pts=vertices(g)
 if kind=='cylinder':
  rings=[[pts[i] for i in range(n)],[pts[n+1+i] for i in range(n)]]
  assert rings[0][0][1]>rings[1][0][1]
 else:
  m=len(profile);assert len(pts)==(n+1)*m
  assert profile[0][0]==profile[-1][0]==0
  assert all(profile[i+1][1]>=profile[i][1] for i in range(m-1))
  assert all(profile[i+1][1]>profile[i][1] for i in range(1,m-2))
  assert all(p[0]>0 for p in profile[1:-1])
  rings=[[pts[i*m+j] for i in range(n)] for j in range(1,m-1)]
  for i in range(n):
   assert pts[i*m][0]==pts[i*m][2]==pts[i*m+m-1][0]==pts[i*m+m-1][2]==0
  for j,(_,y) in enumerate(profile):
   assert all(pts[i*m+j][1]==F(f32(y)) for i in range(n+1))
 for ring in rings:
  assert len(set(p[1] for p in ring))==1
  # Strict convex ordered ring, relative to the axis; original first N samples.
  for i in range(n):
   a,b,c=ring[i],ring[(i+1)%n],ring[(i+2)%n]
   assert a[0]*b[2]-a[2]*b[0]<0
   assert (b[0]-a[0])*(c[2]-b[2])-(b[2]-a[2])*(c[0]-b[0])<0
 return {'storedRingsStrictlyConvexAndAxisStarShaped':True,'ringsChecked':len(rings),'fullTurnProducerProvenanceRequired':True,'heightProfileMonotone':True,'axisEndpointsOrSourceCapsRequired':True,'existingSectorIndexScheduleChecked':True,'solidInterpretation':'Source producer defines a full-turn capped cylinder or axis-ended monotone lathe. Positive ordered radial rings and original sector schedule describe a non-self-crossing periodic reference; endpoint labels identify the periodic parameter only, without changing the physical source mesh.'}
def schedule(g,kind,n,m=0,capped=True):
 idx=[]
 if kind=='lathe':
  for i in range(n):
   for j in range(m-1):
    a=j+i*m;b=a+m;c=b+1;d=a+1;idx.extend((a,b,d,c,d,b))
 else:
  for i in range(n):
   a=i;b=n+1+i;c=b+1;d=a+1;idx.extend((a,b,d,b,c,d))
  if capped:
   start=2*(n+1)
   for top in (True,False):
    rim=start+n
    for i in range(n):idx.extend((rim+i,rim+i+1,start+i) if top else (rim+i+1,rim+i,start+i))
    start=rim+n+1
 assert idx==index_list(g),'Original producer index schedule differs'
def radial_band_certificate(g,kind,n,profile):
 # Existing first-N ring samples and producer diagonal references only.
 # No replacement position/index array or reference mesh is constructed.
 pts=vertices(g);bands=[];flat_caps=0
 if kind=='cylinder':
  rows=[([n+1+i for i in range(n)],[i for i in range(n)],'low-current-to-high-next')]
 else:
  m=len(profile);rows=[]
  for j in range(m-1):
   if profile[j][1]==profile[j+1][1]:
    flat_caps+=1;continue
   rows.append(([i*m+j for i in range(n)],[i*m+j+1 for i in range(n)],'low-next-to-high-current'))
 for low,high,diagonal in rows:
  assert len(set(pts[i][1] for i in low))==len(set(pts[i][1] for i in high))==1
  assert pts[low[0]][1]<pts[high[0]][1]
  coefficients=[]
  def cross2(a,b):return a[0]*b[2]-a[2]*b[0]
  for i in range(n):
   j=(i+1)%n
   q=(pts[low[i]],pts[high[i]]);r=(pts[low[j]],pts[high[j]])
   d=(q[0],r[1]) if diagonal=='low-current-to-high-next' else (r[0],q[1])
   # Every q(t)->d(t)->r(t) cross-section edge has clockwise polar
   # order throughout 0<t<1. These are quadratic Bernstein coefficients.
   for a,b in ((q,d),(d,r)):
    cs=(cross2(a[0],b[0]),(cross2(a[0],b[1])+cross2(a[1],b[0]))/2,cross2(a[1],b[1]))
    assert max(cs)<=0 and min(cs)<0
    coefficients.extend(cs)
   # A common positive sector direction keeps this interpolated section
   # away from the axis and within less than a half-turn.
   direction=tuple(q[0][k]+r[0][k] for k in (0,2))
   assert all(v[0]*direction[0]+v[2]*direction[1]>0 for v in (q[0],q[1],r[0],r[1]))
  bands.append({'lowY':rat(pts[low[0]][1]),'highY':rat(pts[high[0]][1]),'sectors':n,'quadraticPolarOrderTests':2*n,'bernsteinCoefficientsAllNonpositive':True,'eachPolynomialHasStrictlyNegativeCoefficient':True,'minimumCoefficient':rat(min(coefficients)),'maximumCoefficient':rat(max(coefficients))})
 return {'strictHeightBands':bands,'flatAxisEndedCapBands':flat_caps,'exactQuadraticPolarOrderTests':sum(b['quadraticPolarOrderTests'] for b in bands),'argument':'For every open height band, source triangles intersect a horizontal plane in q_i(t), diagonal d_i(t), q_(i+1)(t), each affine in t. Exact nonpositive Bernstein coefficients, with a strict negative coefficient for each cross product, give clockwise polar order for 0<t<1; common positive sector directions exclude the axis. Endpoint rings wind once. Thus sections are simple star-shaped polygons with winding one, bands occupy disjoint Y intervals, and the existing convex axis cap fans close the reference. This is an analytic source-reference proof, not a posed sweep, point edit or exported mesh.'}

def build():
 old=load(PRE/'review-package.json')
 for row in old['files']:assert sha((ROOT/row['path']).read_bytes())==row['sha256']
 assert (PRE/'review-package.json').read_bytes()==git((PRE/'review-package.json').relative_to(ROOT).as_posix(),BASE)
 geometry_pins=load(PRE/'geometry-pins.json')['files']
 for pin in geometry_pins:assert sha((ROOT/pin['path']).read_bytes())==pin['sha256']
 inputs=[]
 source_paths=[FORMS,'assets/art/exposition-administration/index.js','assets/art/exposition-horticulture/index.js','assets/art/exploration-access/index.js','assets/art/exploration-access/plans.js','src/runtime/three.js',CORE]
 for path in source_paths:
  raw=(ROOT/path).read_bytes();frozen=git(path,FROZEN)
  assert raw.replace(b'\r\n',b'\n')==frozen.replace(b'\r\n',b'\n')
  inputs.append({'path':path,'contextCommit':FROZEN,'gitObjectSha256':sha(frozen),'workingSha256':sha(raw),'onlyWorkingLineEndingDifference':raw!=frozen,'gitBlobSha1':hashlib.sha1(b'blob '+str(len(frozen)).encode()+b'\0'+frozen).hexdigest()})
 exceptions=load(PRE/'quantity-exceptions.json')['records']
 uncut=[r for r in exceptions if r['quantityRecipe']=='closed-volume' and not r['sourceId'].startswith('replacement/')]
 cuts=[r for r in exceptions if r['quantityRecipe']=='closed-volume' and r['sourceId'].startswith('replacement/')]
 assert len(uncut)==530 and len(cuts)==65
 groups=collections.defaultdict(list)
 for row in uncut:groups[row['geometryPath']].append(row)
 assert len(groups)==7
 profile=[[0,0],[.12,0],[.12,.08],[.075,.12],[.105,.26],[.095,.37],[.055,.5],[.065,.66],[.12,.72],[.12,.8],[0,.8]]
 definitions={
 '165a9dab':('cylinder',32,16,'ionic-front/column-0/shaft',.5,.61,'levelY(17)-levelY(11)-.64','Administration index.js: Ionic colonnade'),
 '7f3008f8':('cylinder',32,12,'ionic-front/column-0/base',.76,.86,'.3','Administration index.js: Ionic colonnade'),
 '330d7160':('cylinder',4,12,'admin-front-west/centre-column',.22,.28,'stair.toY-stair.fromY','Access index.js: spiral centre column'),
 'b62cb7b5':('cylinder',2,12,'admin-upper-west/centre-column',.22,.28,'stair.toY-stair.fromY','Access index.js: spiral centre column'),
 'a0784d61':('cylinder',8,16,'cafe/129/22/top',.7,.7,'.08','Horticulture index.js: cafe table top'),
 'eb49ad7c':('cylinder',8,8,'cafe/129/22/leg',.07,.25,'.76','Horticulture index.js: cafe leg'),
 '8bab8c76':('lathe',444,10,'end-gallery-guard--1-0/baluster-0',None,None,'balusterProfile','Horticulture index.js rails + shared forms.js balusterProfile')}
 phase,sine=phase_bounds();buckets=[];ledger=[];representatives=[];geometry_raw={}
 for path,rows in sorted(groups.items()):
  definition=definitions[Path(path).stem[:8]];kind,count,n,sid,rt,rb,height,callsite=definition
  assert len(rows)==count
  g=raw_geometry(rows[0]);geometry_raw[path]=g;assert len(index_list(g))==rows[0]['sourceRange']['count'] and rows[0]['sourceRange']['start']==0
  assert all(r['sourceRange']==rows[0]['sourceRange'] for r in rows)
  schedule(g,kind,n,len(profile) if kind=='lathe' else 0)
  detailed=sid in ('ionic-front/column-0/shaft','end-gallery-guard--1-0/baluster-0')
  bucket_id=Path(path).stem[:8]
  bucket={'bucketId':bucket_id,'placeId':rows[0]['placeId'],'familyId':rows[0]['familyId'],'sourceConstructor':'CylinderGeometry' if kind=='cylinder' else 'LatheGeometry','constructorSegments':n,'constructorCallSite':callsite,'constructorHeightExpression':height,'sourceInstances':count,'geometryPath':path,'geometrySha256':rows[0]['geometrySha256'],'fullSourceRange':rows[0]['sourceRange'],'producerIndexScheduleMatches':True,'radialProducerProvenance':True,'detailedTwoCaseReview':detailed,'classification':'periodic-roundoff-demonstrated-on-representative' if detailed else 'radial-producer-provenance-only-closure-and-error-bound-still-withheld','allQuantitiesWithheld':True,'sourceIds':[r['sourceId'] for r in rows]}
  if kind=='cylinder':bucket['constructorRadii']=[rt,rb]
  else:bucket['constructorProfile']=profile
  buckets.append(bucket)
  for row in rows:ledger.append({**{k:row[k] for k in ('placeId','sourceId','renderId','sectionId','familyId','geometryPath','geometrySha256','baseCaseId','geometryGroupId','sourceRange','matrix')},'bucketId':bucket_id,'status':bucket['classification'],'quantityAssigned':False})
  if not detailed:continue
  row=next(r for r in rows if r['sourceId']==sid)
  assert X.matrix_linear(row['matrix'])==(1,0,0,0,1,0,0,0,1)
  pairs=cylinder_pairs(n,rt,rb) if kind=='cylinder' else [(j,n*len(profile)+j,p[0]) for j,p in enumerate(profile)]
  pair_facts=pair_review(g,pairs,sine);original=X.effective(g)['facts'];topology=symbolic_topology(g,pairs)
  assert not original['closedSolidProof'] and topology['closedOrientedSymbolicManifold'] and topology['eulerCharacteristic']==2
  cert=profile_certificate(g,kind,n,profile)
  cert['heightBandNoSelfIntersectionProof']=radial_band_certificate(g,kind,n,profile)
  representatives.append({'representativeSource':row,'bucketId':bucket_id,'scopeMeaning':'One representative original effective geometry. Other exact-hash repeats are a conditional future cohort, not accepted quantities or transformed-instance proofs.','producerIndexScheduleMatches':True,'originalStrictFacts':original,'periodicEndpointPairEvidence':pair_facts,'proposedMeasurementLabelTopology':topology,'radialProducerCertificate':cert,'measurementsAndErrorBounds':measures(g,pairs),'physicalSourceGeometryUnchanged':True,'repairedReferenceMeshCreated':False})
 assert len(representatives)==2
 polar_tests=sum(r['radialProducerCertificate']['heightBandNoSelfIntersectionProof']['exactQuadraticPolarOrderTests'] for r in representatives);assert polar_tests==192
 glass=next(r for r in load(PRE/'glazing-ownership-review.json')['records'] if r['sourceId']=='great-dome/lantern-glazing')
 g=raw_geometry(glass);schedule(g,'cylinder',48,capped=False)
 pairs=cylinder_pairs(48,4,4,capped=False);pair_facts=pair_review(g,pairs,sine);negative_topology=symbolic_topology(g,pairs)
 assert not negative_topology['closedOrientedSymbolicManifold'] and negative_topology['boundaryOrNonmanifoldEdges']==96
 negative={'source':{k:glass[k] for k in ('placeId','sourceId','sectionId','geometryPath','geometrySha256')},'constructor':'new T.CylinderGeometry(4,4,lanternTop-lanternBottom,48,1,true)','trueMeansOpenEnded':True,'sourceIndexCount':len(index_list(g)),'sourceHeightPlanes':sorted(set(float(p[1]) for p in vertices(g))),'authoredOpenEndDiameterMetres':8,'periodicEndpointPairEvidence':pair_facts,'topologyAfterPeriodicParameterLabelsOnly':negative_topology,'result':'REJECT_CLOSED_SOLID_QUANTITY','reason':'Both actual open end rings remain: 48 boundary edges each, 96 total. Full-turn seam agreement does not invent caps or close a real opening.','sourceOrNegativeGeometryEdited':False,'quantityAssigned':False}
 for row in buckets+[negative['source']]:
  path=row['geometryPath'];raw=(ROOT/path).read_bytes()
  inputs.append({'path':path,'contextCommit':FROZEN,'gitObjectSha256':sha(git(path,FROZEN)),'workingSha256':sha(raw),'onlyWorkingLineEndingDifference':False,'gitBlobSha1':hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()})
 proposed={
 'status':'UNACCEPTED_SOURCE_LOCAL_NUMERICAL_MEASUREMENT_PROPOSAL','runtimeConsumable':False,'applied':False,
 'policy':'Use only source-proven full-period endpoint pairs on the two pinned original radial templates; require the original draw/index schedule, explicit closed producer caps or axis ends, Float32 analytic rounding-cell evidence, exact oriented symbolic topology and radial solid certificate. No generic proximity tolerance.',
 'numericalRule':'Every allowed terminal x must be the uniquely certified Float32 rounding cell of radius*sin(binary64 2*Math.PI), enclosed by exact Machin/Taylor arithmetic. Y and Z must already equal the first sample exactly. Only original periodic endpoint labels may coincide for measurement reasoning. All other source positions stay literal; no nearest-neighbour search, tolerance weld, global epsilon or New York allowance.',
 'quantityRule':'Propose local source-origin volume interval [V-Ev,V+Ev]. If separately accepted for later accounting, choose V-Ev as a conservative geometric volume, then apply the accepted closed-volume/reference-depth recipe. Keep the uncertainty interval and finite stock separate. No quantity is assigned here.',
 'areaRule':'Report the original triangle-area sum with absolute seam-only error bound Ea. This does not make intrinsic area exposed weather area or establish a primary wall face.',
 'volumeErrorFormula':'For each original triangle (a,b,c) at fixed local origin and endpoint movement bounds da,db,dc, use (da*|b|1*|c|1+db*|a|1*|c|1+dc*|a|1*|b|1+da*db*|c|1+da*dc*|b|1+db*dc*|a|1+da*db*dc)/6; sum exactly.',
 'areaErrorFormula':'For u=b-a,v=c-a, alpha=da+db,beta=da+dc, use (alpha*|v|1+beta*|u|1+alpha*beta)/2; sum exactly. L1 bounds the Euclidean vector/cross-product norms.',
 'transforms':'The two selected source instances have identity linear transforms. Other transforms require explicit propagation: volume error scales by abs(det(L)); for area use the same per-triangle bound on actual L*u,L*v with transformed endpoint displacement bounds. Translation never changes the fixed local-origin measurement.',
 'errorScope':'Seam-only deviation from a mathematical periodic endpoint reference preserving every other Float32 coordinate and every original triangle. Faceting, all other authoring/Float32 errors and physical loading are not erased or replaced with pi*r^2*h.',
 'phaseProof':phase,
 'libmLimit':'ECMAScript Math.sin is not assumed correctly rounded on every platform. The actual pinned Float32 outputs are checked against exact analytic rounding cells. This fingerprint is evidence for these stored bytes only; no future producer/platform inherits it automatically.',
 'detailedOriginalGeometryTemplates':2,'representativeOriginalSourceIds':[r['representativeSource']['sourceId'] for r in representatives],
 'conditionalExactHashRepeatCohort':476,'provenanceOnlyOtherInstances':54,'all530StillWithheldUntilAcceptance':True,
 'excluded':'65 derived closed-solid cuts, 126 wall primary-face exceptions, 3 roof weather/exposure exceptions, all plant material/stock and all support/attachment/damage ownership remain separate. No borrowed tolerance, cap construction, mesh repair, welding, export, bindings, stock, runtime, factories or renderer.',
 'laterImplementationRequiresAcceptance':True}
 checks={'result':'PASS','scope':'Bounded source-only proposal, not acceptance or installed proof/stock','uncutExceptionIds':530,'geometryProvenanceBuckets':7,'cylinderInstances':86,'latheInstances':444,'detailedOriginalRadialCases':2,'strictOriginalCasesStillUnproved':2,'exactHeightBandPolarOrderTests':polar_tests,'periodicSymbolicReferenceCasesPass':2,'actualOpenEndedSourceNegative':'REJECT_CLOSED_SOLID_QUANTITY','openNegativeBoundaryEdgesAfterSeamLabels':96,'unchangedPriorPayloadFiles':len(old['files']),'unchangedPriorGeometryFiles':len(geometry_pins),'originalMeshesChanged':0,'repairOrWeldOrGeometryExports':0,'bindingsOrStocksAssigned':0,'runtimeChanges':0,'factoryExecutions':0,'renderersOrHelpers':0}
 return {'input-pins.json':{'version':1,'frozenContext':FROZEN,'priorReadinessCandidate':BASE,'files':inputs},'provenance-buckets.json':{'version':1,'scope':'530 uncut closed-solid quantity exceptions only; source constructor and exact schedule provenance are not universal closure acceptance.','buckets':buckets},'scope-ledger.json':{'version':1,'records':sorted(ledger,key=lambda r:(r['placeId'],r['sourceId']))},'representative-reviews.json':{'version':1,'cases':representatives},'open-gap-negative.json':{'version':1,**negative},'policy-proposal.json':{'version':1,**proposed},'check-results.json':{'version':1,**checks}}
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--save-review',action='store_true');args=parser.parse_args()
 if not args.save_review:
  def readonly(event,args):
   if event=='open' and (any(c in (args[1] or '') for c in 'wax+') or (args[2] or 0)&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND)):raise PermissionError('Read-only radial review refuses writes')
   if event in {'os.remove','os.rename','os.mkdir','os.rmdir','os.truncate','os.utime','os.chmod'}:raise PermissionError('Read-only radial review refuses mutation')
  sys.addaudithook(readonly)
 outputs=build()
 for name,value in outputs.items():
  raw=encode(value)
  if args.save_review:(HERE/name).write_bytes(raw)
  else:assert (HERE/name).read_bytes()==raw,'Saved radial review differs: '+name
 if not args.save_review and (HERE/'review-package.json').exists():
  for row in load(HERE/'review-package.json')['files']:
   raw=(ROOT/row['path']).read_bytes();assert len(raw)==row['bytes'] and sha(raw)==row['sha256']
 print(json.dumps(outputs['check-results.json'],sort_keys=True))
