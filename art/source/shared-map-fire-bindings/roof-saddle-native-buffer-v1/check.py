"""Exact proof on actual accepted native-buffer/world data; no activation or graph."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,copy,importlib.util,json,math,struct,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def mod(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
E=mod('native_saddle_export',HERE/'export.py')
K=mod('accepted_saddle_validator',ROOT/E.SOURCE/'check.py')
D=mod('native_saddle_context',HERE.parent/'parapet-clear-blocking-v1/dependency-context.py')
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--record',action='store_true');args=p.parse_args()
 a=E.read(E.MANIFEST);actual=E.read(E.DIRECTORY+'/actual-buffer-results.json');quantity=E.read(E.DIRECTORY+'/quantity-certificate.json');mapping=E.read(a['physicalRenderMapping']['path']);conversion=E.read(E.DIRECTORY+'/conversion-evidence.json')
 source=E.read(E.SOURCE+'/source-proposal.json');body=E.read(a['geometry']['path']);render=E.read(a['renderGeometry']['path'])
 _,_,_,by,_,roof=E.P.inputs();plane=E.P.height_plane(roof[2]);envelope=source['originalEnvelope']['bounds'];vs=actual['actualPhysicalWorldVertices'];index=actual['actualPhysicalIndex'];counts=collections.Counter()
 def check(ok,label):assert ok,label;counts[label.split(':')[0]]+=1
 for path,raw in E.build().items():check((ROOT/path).read_bytes()==raw,'determinism: '+path)
 check(actual['result']=='PASS_ACTUAL_NATIVE_BUFFERS_AND_THREE_CONTACTS' and actual['producerSha256']==E.sha(E.DIRECTORY+'/check-buffers.mjs') and actual['manifestSha256']==E.sha(E.MANIFEST),'actual-buffer: fresh actual typed-buffer check')
 check(actual['physicalShapeCount']==4 and actual['geometryBuffersCreated']==5 and actual['nativeTriangleContacts']==3,'scope: four physical shapes; render is an alternate representation of same one-piece body')
 check(actual['actualPhysicalLocalPositions']==body['attributes']['position']['array'] and index==body['index']['array'],'actual-buffer: actual physical typed array values and index')
 check(vs==[E.P.G.point(body['attributes']['position']['array'][i:i+3],a['members'][0]['matrix']) for i in range(0,30,3)],'transform: actual BufferGeometry and Matrix4 world results equal captured geometry')
 check(a['members'][0]['matrix']==source['members'][0]['matrix'] and E.P.G.bounds([[p] for p in vs])==envelope,'placement: exact matrix, pivot and envelope after actual buffer conversion')
 facts=K.validate(vs,index,envelope,plane)
 check(facts['vertices']==10 and facts['triangles']==16 and facts['euler']==2 and len(facts['components'])==1,'closure: true shared-index one-component closed body')
 for tri in zip(index[::3],index[1::3],index[2::3]):
  t=[E.P.xyz(vs[i]) for i in tri];n=E.P.cross(E.P.sub(t[1],t[0]),E.P.sub(t[2],t[0]))
  check(E.P.dot(n,n)>0,'nondegenerate: actual converted physical triangle')
  check(all(E.P.dot(n,E.P.sub(E.P.xyz(v),t[0]))<=0 for v in vs),'orientation: convex outward actual closed buffer')
 margins=[F(v[1])-E.P.height(plane,F(v[0]),F(v[2])) for v in vs]
 check(min(margins)>=0 and all(F(v[1])<=E.P.height(plane,F(v[0]),F(v[2])) for t in actual['originalParentWorldTriangles'][E.P.ROOF] for v in t),'separation: complete native body and actual old roof on opposite sides of exact original plane')
 check(conversion['initialDirectFloat32Conversion']=='PASS' and not conversion['additionalConservativeCutAdjustmentNeeded'] and conversion['initialConversionFailures']==[],'conversion: original direct Float32 conversion required no additional cut adjustment')
 for i in range(48):
  parent=mapping['renderToPhysicalVertex'][i]
  check(actual['actualRenderWorldVertices'][i]==vs[parent] and actual['actualRenderLocalPositions'][i*3:i*3+3]==actual['actualPhysicalLocalPositions'][parent*3:parent*3+3],'mapping: render positions exactly match original physical vertex identity')
 check(mapping['renderToPhysicalVertex']==index and mapping['renderTriangleToPhysicalTriangle']==list(range(16)),'mapping: render/physical triangles and source faces retained')
 check(actual['minimumOutwardNormalDot']>.999999,'normal: converted native render normals remain outward')
 max_uv_error=0.;uv=actual['actualRenderUV'];rvs=actual['actualRenderWorldVertices']
 for t in range(16):
  for j in range(3):
   x=t*3+j;y=t*3+(j+1)%3;difference=abs(math.dist(uv[x*2:x*2+2],uv[y*2:y*2+2])-math.dist(rvs[x],rvs[y]));max_uv_error=max(max_uv_error,difference)
   check(difference<=4*conversion['maximumMetricUVCoordinateRoundingErrorMetres']+1e-14,'uv: metric density bounded by actual Float32 UV rounding, not contact tolerance')
 # Actual lower/upper faces are measured after conversion. Roof contact is a projected actual source patch.
 cornice='carrier/edge-6/cornice-7';upper='carrier/main-parapet-6/base'
 C=K.C;identity=a['members'][0]['id'];local=copy.copy(by);local[identity]={'id':identity,'physicalBounds':envelope,'renderBindings':[{'partId':identity,'sourcePartId':identity,'geometryId':a['geometry']['sha256'],'geometryPath':a['geometry']['path'],'matrix':a['members'][0]['matrix'],'sourceRange':None,'physicalContribution':'carrier-solid'}]}
 geo=C.Geometry(local);bottom=geo.face(identity,cornice,require_bearing=True);top=geo.face(upper,identity,require_bearing=True)
 check(bottom and bottom['actualFaceAreaMetresSquared']>0,'cornice: retained actual native-buffer flat foot')
 check(top and abs(top['actualFaceAreaMetresSquared']-source['originalEnvelope']['unchangedUpperNativeBearing']['actualFaceAreaMetresSquared'])<1e-12 and top['witnessSeparationMetres']==source['originalEnvelope']['unchangedUpperNativeBearing']['witnessSeparationMetres'],'upper: unchanged full footprint and captured precision gap')
 roof_ids=next(p['physicalVertexIds'] for p in a['ports'] if p['meaning']=='fixed-original-roof-seat');poly=[E.P.xyz(vs[i]) for i in roof_ids]
 # Port vertex order is the actual source face order, retained by the mapping.
 source_poly=[[p[0],E.P.height(plane,p[0],p[2]),p[2]] for p in poly];area_xz=E.P.area_xz(source_poly);gaps=[p[1]-q[1] for p,q in zip(poly,source_poly)]
 check(area_xz>0 and min(gaps)>=0 and max(gaps)<F(1e-5),'roof-seat: actual converted underside and actual roof patch within unchanged native precision')
 n=E.P.cross(E.P.sub(poly[1],poly[0]),E.P.sub(poly[2],poly[0]));x=sum(p[0] for p in poly)/4;z=sum(p[2] for p in poly)/4;low=(E.P.dot(n,poly[0])-n[0]*x-n[2]*z)/n[1];high=F(envelope['max'][1])
 check(high-low>F(.148),'material-path: positive thickness from actual native roof seat to top')
 start=[x,low,z];end=[x,high,z]
 for k in range(1,10):
  point=[start[j]+F(k,10)*(end[j]-start[j]) for j in range(3)]
  check(all(E.P.dot(E.P.cross(E.P.sub(E.P.xyz(vs[b]),E.P.xyz(vs[a0])),E.P.sub(E.P.xyz(vs[c]),E.P.xyz(vs[a0]))),E.P.sub(point,E.P.xyz(vs[a0])))<0 for a0,b,c in zip(index[::3],index[1::3],index[2::3])),'material-path: strict internal segment in the connected convex native buffer')
 v=E.P.solid_volume(vs,index);target=v/F(.12);selected=a['members'][0]['quantityReference'];following=math.nextafter(selected,math.inf)
 check(quantity['worldVolumeExact']==E.P.rational(v) and quantity['certifiedLowerResultExact']==E.P.rational(target),'quantity: exact actual native-buffer closed volume and exact-binary64 divisor')
 check(F(selected)<=target<F(following) and quantity['selectedHex']==selected.hex() and quantity['selectedBitsLE']==struct.pack('<d',selected).hex(),'quantity: greatest finite binary64 not above certified lower result')
 check(selected!=.04012 and quantity['registeredRuntimeStock']==0,'quantity: six-decimal source proposal not selected; no runtime stock')
 def valid_semantics(s):
  req=s['fittingRequirement'];assert req['operator']=='ALL_FIXED_PORTS' and req['fixedPortIds']==[a['ports'][0]['id'],a['ports'][1]['id']],'both fixed original ports are mandatory'
  assert req['bothOriginalParentsMustBeIndependentlySupported'] and req['supportCannotComeFromFittingUpperOrDescendants'],'no cycle-created or dependent-parent support'
  assert not any(s[k] for k in ['reverseBrace','newAnchor','cycleCreatedSupportAllowed','anyParentSubstitutionAllowed']),'no reverse/anchor/remap/OR substitution'
 valid_semantics(a['selectedSupportSemantics'])
 negative=[]
 def reject(name,fn):
  try:fn()
  except AssertionError as e:negative.append({'name':name,'result':'EXPECTED_REJECTION','reason':str(e)})
  else:raise AssertionError('Invalid buffer/semantics accepted: '+name)
 pos=copy.deepcopy(actual['actualPhysicalLocalPositions'])
 for i in [0,5]:
  b=struct.unpack('<I',struct.pack('<f',pos[i*3+1]))[0];pos[i*3+1]=struct.unpack('<f',struct.pack('<I',b+1))[0]
 bad=[E.P.G.point(pos[i:i+3],a['members'][0]['matrix']) for i in range(0,30,3)]
 reject('one Float32 step toward roof rejected with no tolerance relaxation',lambda:K.validate(bad,index,envelope,plane));negative[-1]['rejectedPhysicalLocalPositions']=pos
 reject('six-decimal quantity would exceed certified lower result',lambda:check(F(.04012)<=target,'quantity: .04012 exceeds actual lower result'))
 bad_semantics=copy.deepcopy(a['selectedSupportSemantics']);bad_semantics['fittingRequirement']['operator']='ANY_PARENT';reject('any-parent fallback rejected',lambda:valid_semantics(bad_semantics))
 bad_map=copy.deepcopy(mapping['renderToPhysicalVertex']);bad_map[0]=(bad_map[0]+1)%10
 reject('physical/render mapping change rejected',lambda:check(bad_map==index,'mapping: physical vertex identity changed'))
 protected=['assets/art','art/source/shared-map-fire-bindings','docs/art/shared-map-fire-bindings'];before=set(subprocess.check_output(['git','ls-tree','-r','--name-only',E.PARENT,'--',*protected],cwd=ROOT,text=True).splitlines());changed=set(subprocess.check_output(['git','diff','--name-only',E.PARENT,'--',*protected],cwd=ROOT,text=True).splitlines())
 check(not(before&changed),'preserved: old double profile/previews, front48, clear96 and all earlier sources/proofs unchanged')
 context=D.verify_working_sources(ROOT)
 result={'version':1,'result':'PASS_ONE_ACTUAL_NATIVE_BUFFER_PILOT','manifestSha256':E.sha(E.MANIFEST),'producerSha256':E.sha(E.DIRECTORY+'/check.py'),'actualBufferProducerSha256':actual['producerSha256'],'checks':dict(counts),
  'physicalTopology':facts,'nativePhysicalShapeCount':4,'createdGeometryBufferCount':5,'nativeTriangleContacts':3,'retainedCorniceContact':bottom,'unchangedUpperContact':top,'roofSeatMaximumVerticalGapMetres':float(max(gaps)),
  'minimumBodyThicknessMetres':float(F(envelope['max'][1])-F(vs[0][1])),'materialPathEndpoints':[[float(q) for q in start],[float(q) for q in end]],'maximumUVEdgeErrorMetres':max_uv_error,
  'actualVolumeMetresCubed':float(v),'selectedQuantityReference':selected,'negativeControls':negative,'preservedOldTrackedPaths':len(before),'runtimePortMappingAndBothPortConsumerGate':'OPEN',
  'compilerActivationWorldGraphBuildRendererRunByChecker':False,'registeredRuntimeStock':0}
 if args.record:(HERE/'check-results.json').write_bytes(E.encode(result))
 else:assert (HERE/'check-results.json').read_bytes()==E.encode(result),'Native-buffer proof changed'
 print(json.dumps({k:result[k] for k in ['result','physicalTopology','nativeTriangleContacts','actualVolumeMetresCubed','selectedQuantityReference','preservedOldTrackedPaths','runtimePortMappingAndBothPortConsumerGate']}))
 print(json.dumps({'checks':sum(counts.values()),'rejectingControls':len(negative),'maximumUVEdgeErrorMetres':max_uv_error,'currentVerificationContext':context['id']}))
if __name__=='__main__':main()
