"""Per-placement proof on actual native buffers; no compiler, world or graph."""
from pathlib import Path
from fractions import Fraction as F
import argparse,collections,copy,importlib.util,json,math,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
def mod(name,p):
 s=importlib.util.spec_from_file_location(name,p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
E=mod('native_batch_export',HERE/'export.py');P=E.P
K=mod('accepted_exact_body_validator',ROOT/'art/source/shared-map-fire-bindings/roof-saddle-proposal-v1/check.py')
D=mod('accepted_verification_contexts',ROOT/'art/source/shared-map-fire-bindings/parapet-clear-blocking-v1/dependency-context.py')
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--record',action='store_true');args=parser.parse_args()
 a=E.read(E.MANIFEST);actual=E.read(E.DIRECTORY+'/actual-buffer-results.json');audits=E.read(a['conversionAudit']['path']);quantities=E.read(a['quantityCertificates']['path'])
 audit_by={r['sourceProposalId']:r for r in audits['pieces']};qty_by={r['id']:r for r in quantities['pieces']};native_by={r['id']:r for r in actual['pieces']}
 _,_,_,by,rows,roof=P.inputs();counts=collections.Counter();results=[];negative=[]
 def check(ok,label):assert ok,label;counts[label.split(':')[0]]+=1
 for path,data in E.build().items():check((ROOT/path).read_bytes()==data,'determinism: '+path)
 expected=set(rows)-{a['firstPilotPreserved']['excludedSourceProposalId']}
 check(len(a['members'])==19 and {m['sourceProposalId'] for m in a['members']}==expected and len({m['id'] for m in a['members']})==19,'scope: exact nineteen remaining stable identities')
 check(all(m['id']!=a['firstPilotPreserved']['excludedCanonicalId'] for m in a['members']) and E.sha(a['firstPilotPreserved']['path'])==a['firstPilotPreserved']['sha256'],'preserved: accepted first pilot excluded and unchanged')
 check(actual['manifestSha256']==E.sha(E.MANIFEST) and actual['producerSha256']==E.sha(E.DIRECTORY+'/check-buffers.mjs') and actual['nativeFixedPortContacts']==57 and actual['physicalShapesChecked']==26 and actual['distinctGeometryBuffersCreated']==12,'actual: exact typed-buffer evidence and bounded scope')
 for m in a['members']:
  row=rows[m['sourceProposalId']];n=native_by[m['id']];profile=actual['profiles'][m['profileId']];mapping=E.read(a['profiles'][m['profileId']]['physicalRenderMapping']['path']);vs=n['actualWorldVertices'];index=profile['actualPhysicalIndex'];audit=audit_by[m['sourceProposalId']];qty=qty_by[m['id']]
  ts=m['ports'][1]['fixedOriginalSourceTriangles'][0]['sourceTriangleIds'];plane=P.height_plane(actual['originalParentWorldTriangles'][P.ROOF][ts[0]])
  check(all(P.height_plane(actual['originalParentWorldTriangles'][P.ROOF][i])==plane for i in ts),'source-plane: own original roof facets, no inherited pilot plane')
  check(m['matrix']==row['matrix'] and m['bounds']==row['bounds'] and m['nativeBay']=={'axis':row['axis'],'intervalMetres':row['bayIntervalMetres'],'pitchMetres':1},'placement: original pose, bounds and metre bay')
  check(vs==[P.G.point(profile['actualPhysicalLocalPositions'][i:i+3],m['matrix']) for i in range(0,30,3)],'actual: native Matrix4 world coordinates')
  facts=K.validate(vs,index,row['bounds'],plane);check(facts['vertices']==10 and facts['triangles']==16 and facts['euler']==2 and len(facts['components'])==1,'closure: exact shared-index connected native body')
  for aa,b,c in zip(index[::3],index[1::3],index[2::3]):
   tri=[P.xyz(vs[i]) for i in [aa,b,c]];normal=P.cross(P.sub(tri[1],tri[0]),P.sub(tri[2],tri[0]))
   check(P.dot(normal,normal)>0 and all(P.dot(normal,P.sub(P.xyz(v),tri[0]))<=0 for v in vs),'orientation: nondegenerate outward convex actual triangles')
  check(all(F(v[1])<=P.height(plane,F(v[0]),F(v[2])) for t in actual['originalParentWorldTriangles'][P.ROOF] for v in t),'separation: exact supporting plane bounds unchanged original roof')
  initial=n['initialFloat32WorldVertices'];initial_margin=min(F(v[1])-P.height(plane,F(v[0]),F(v[2])) for v in initial)
  check(P.rational(initial_margin)==audit['initialMinimumRoofMarginExact'],'raw-conversion: actual failed/passed initial typed vectors retained')
  if initial_margin<0:
   try:K.validate(initial,index,row['bounds'],plane)
   except AssertionError as e:negative.append({'id':m['id'],'name':'initial native roof penetration','result':'EXPECTED_REJECTION_PRESERVED','reason':str(e),'initialWorldVertices':initial,'sourceAuditPath':a['conversionAudit']['path']})
   else:raise AssertionError('Initial intersecting conversion accepted '+m['id'])
   check(len(audit['conservativeNewCutSteps'])==1 and audit['conservativeNewCutSteps'][0]['component']==1 and audit['conservativeNewCutSteps'][0]['vertices']==[0,5],'rounding: only one outward new-cut Y step for this actual bay')
  check(n['physicalRenderWorldIdentity'] and n['minimumOutwardNormalDot']>.999999 and mapping['renderToPhysicalVertex']==index,'mapping: one physical body with correct seam vertices and outward native normals')
  uv=profile['actualRenderUV'];max_uv=0.
  for t in range(16):
   for j in range(3):
    i=t*3+j;k=t*3+(j+1)%3;error=abs(math.dist(uv[i*2:i*2+2],uv[k*2:k*2+2])-math.dist(vs[index[i]],vs[index[k]]));max_uv=max(max_uv,error)
    check(error<=4*audit['maximumMetricUVCoordinateRoundingErrorMetres']+1e-14,'uv: own converted metric density within Float32 attribute rounding')
  check([p['fixedParentCarrierId'] for p in m['ports']]==[row['lowerSourceCarrierId'],P.ROOF,row['upperSourceCarrierId']],'ports: own fixed cornice, roof and upper, no nearest-parent remap')
  sem=m['selectedSupportSemantics'];check(sem['operator']=='ALL_FIXED_PORTS' and sem['requiredLowerPortIds']==[m['ports'][0]['id'],m['ports'][1]['id']] and sem['independentOriginalParentSupportRequired'] and not any(sem[k] for k in ['supportFromFittingUpperOrDescendantsAllowed','anyParentFallbackAllowed','reverseBrace','newAnchor','remapAllowed']),'semantics: both independent fixed lower ports, no cycle-created support or fallback')
  check(sem['upperDependency']['localAxis']==row['axis'] and sem['upperDependency']['localIntervalMetres']==row['bayIntervalMetres'] and sem['roofRole']=='roof-covering' and not m['anchors'] and not m['groundAnchor'] and m['finish'] is None,'semantics: unchanged role and local upper scope, no stock coating/anchor')
  # Actual horizontal source contact areas after conversion, not bounds-only intersections.
  body_ts=[[vs[i] for i in index[j:j+3]] for j in range(0,48,3)]
  areas={}
  for label,parent,child_y,parent_y in [('cornice',row['lowerSourceCarrierId'],row['bounds']['min'][1],by[row['lowerSourceCarrierId']]['physicalBounds']['max'][1]),('upper',row['upperSourceCarrierId'],row['bounds']['max'][1],by[row['upperSourceCarrierId']]['physicalBounds']['min'][1])]:
   own=[[[p[0],p[2]] for p in t] for t in body_ts if all(p[1]==child_y for p in t) and abs(P.G.cross(P.G.sub(t[1],t[0]),P.G.sub(t[2],t[0]))[1])>0]
   other=[[[p[0],p[2]] for p in t] for t in actual['originalParentWorldTriangles'][parent] if all(p[1]==parent_y for p in t) and abs(P.G.cross(P.G.sub(t[1],t[0]),P.G.sub(t[2],t[0]))[1])>0]
   area=sum(P.G.overlap_area(x,y) for x in own for y in other);check(area>0 and abs(child_y-parent_y)<1e-5,'bearing: actual own cornice/upper source-face area');areas[label]=area
  check(abs(areas['upper']-row['actualUpperNativeBearing']['actualFaceAreaMetresSquared'])<1e-12,'upper: original complete upper footprint retained')
  face=[P.xyz(vs[i]) for i in m['ports'][1]['physicalVertexIds']];source=[[p[0],P.height(plane,p[0],p[2]),p[2]] for p in face];gaps=[p[1]-q[1] for p,q in zip(face,source)]
  check(P.area_xz(source)>0 and min(gaps)>=0 and max(gaps)<F(1e-5),'roof-seat: positive actual local patch and explicit unchanged native precision')
  norm=P.cross(P.sub(face[1],face[0]),P.sub(face[2],face[0]));x=sum(p[0] for p in face)/4;z=sum(p[2] for p in face)/4;lower=(P.dot(norm,face[0])-norm[0]*x-norm[2]*z)/norm[1];upper=F(row['bounds']['max'][1])
  check(upper-lower>F(.148),'material-path: positive native body')
  for k in range(1,10):
   point=[x,lower+F(k,10)*(upper-lower),z]
   check(all(P.dot(P.cross(P.sub(P.xyz(vs[b]),P.xyz(vs[aa])),P.sub(P.xyz(vs[c]),P.xyz(vs[aa]))),P.sub(point,P.xyz(vs[aa])))<0 for aa,b,c in zip(index[::3],index[1::3],index[2::3])),'material-path: strictly inside same connected convex body')
  volume=P.solid_volume(vs,index);target=volume/F(.12);selected=m['quantityReference'];check(qty['actualNativeWorldVolumeExact']==P.rational(volume) and qty['certifiedLowerExact']==P.rational(target) and qty['selectedBinary64']==selected,'quantity: own actual native closed volume over exact-binary64 .12')
  check(F(selected)<=target<F(math.nextafter(selected,math.inf)) and qty['selectedHex']==selected.hex(),'quantity: own greatest finite binary64 below certified lower')
  check(len(n['contacts'])==3 and all(j['nativeTriangleContact'] and j['portId'] in {p['id'] for p in m['ports']} for j in n['contacts']),'native: three fixed local contacts for this actual pose')
  results.append({'id':m['id'],'sourceProposalId':m['sourceProposalId'],'profileId':m['profileId'],'units':'metres','pivotWorldMetres':m['matrix'][12:15],'occupiedStockCells':[[x,y,z] for x in range(math.floor(m['bounds']['min'][0]),math.ceil(m['bounds']['max'][0])) for y in range(math.floor(m['bounds']['min'][1]/2.12),math.ceil(m['bounds']['max'][1]/2.12)) for z in range(math.floor(m['bounds']['min'][2]),math.ceil(m['bounds']['max'][2]))],'cellIndexOrder':'X, Y/level, Z; zero-based; stock size 1 x 2.12 x 1 m','closure':facts,'corniceArea':areas['cornice'],'upperArea':areas['upper'],'roofProjectedArea':float(P.area_xz(source)),'roofGapRangeMetres':[float(min(gaps)),float(max(gaps))],'minimumNativeThicknessMetres':float(F(row['bounds']['max'][1])-max(F(vs[i][1]) for i in [0,1,5,6])),'materialPathMetres':float(upper-lower),'maximumUVEdgeErrorMetres':max_uv,'quantityReference':selected,'nativePortContacts':3})
 protected=['assets/art','art/source/shared-map-fire-bindings','docs/art/shared-map-fire-bindings'];before=set(subprocess.check_output(['git','ls-tree','-r','--name-only',E.PARENT,'--',*protected],cwd=ROOT,text=True).splitlines());changed=set(subprocess.check_output(['git','diff','--name-only',E.PARENT,'--',*protected],cwd=ROOT,text=True).splitlines())
 check(not(before&changed),'preserved: first pilot, old literals, double previews and all earlier assets/proofs unchanged')
 context=D.verify_working_sources(ROOT)
 report={'version':1,'result':'PASS_NINETEEN_NATIVE_FITTINGS','manifestSha256':E.sha(E.MANIFEST),'producerSha256':E.sha(E.DIRECTORY+'/check.py'),'bufferProducerSha256':actual['producerSha256'],'checks':dict(counts),'pieces':results,'preservedFailedInitialConversions':negative,'pieceCount':19,'nativeContacts':57,'physicalShapesChecked':26,'distinctGeometryBuffersCreated':actual['distinctGeometryBuffersCreated'],'preservedOldTrackedPaths':len(before),'runtimeBothFixedPortsAndMappingConsumerGate':'OPEN','runtimeStockAssigned':0,'worldLedgerComputed':False,'compilerActivationWorldGraphBuildOrRendererStarted':False}
 if args.record:(HERE/'check-results.json').write_bytes(E.encode(report))
 else:assert (HERE/'check-results.json').read_bytes()==E.encode(report),'Batch proof differs'
 print(json.dumps({'result':report['result'],'pieces':19,'checks':sum(counts.values()),'preservedInitialFailures':len(negative),'nativeContacts':57,'preservedOldTrackedPaths':len(before),'currentVerificationContext':context['id']}))
if __name__=='__main__':main()
