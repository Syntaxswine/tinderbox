"""Compact nineteen-fitting native batch; preserve the accepted first pilot."""
from pathlib import Path
from fractions import Fraction as F
import argparse,copy,hashlib,importlib.util,json,math,struct,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
PARENT='c1ed407aedfc5ffec8b473dc7b88c697e140c054'
AUTHORITY='e1945001d1af9012235a8d64e8032666f5efb210'
DIRECTORY=HERE.relative_to(ROOT).as_posix()
ASSET='assets/art/shared-map-support-additions/new-york-roof-saddle-native-batch-v1';MANIFEST=ASSET+'/index.json'
def mod(name,p):
 s=importlib.util.spec_from_file_location(name,ROOT/p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
N=mod('accepted_native_pilot','art/source/shared-map-fire-bindings/roof-saddle-native-buffer-v1/export.py');P=N.P
def digest(raw):return hashlib.sha256(raw).hexdigest()
def sha(p):return digest((ROOT/p).read_bytes())
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def encode(a):return (json.dumps(a,indent=2,sort_keys=True)+'\n').encode()
def ref(path,raw,**extra):return {'path':path,'sha256':digest(raw),**extra}
def step32(x,direction):
 bits=struct.unpack('<I',struct.pack('<f',x))[0]
 if x==0:bits=1 if direction>0 else 0x80000001
 else:bits+=1 if (x>0)==(direction>0) else -1
 return struct.unpack('<f',struct.pack('<I',bits))[0]
def shape(row,roof,source_triangles):
 plane=P.height_plane(roof[source_triangles[0]]);assert all(P.height_plane(roof[i])==plane for i in source_triangles)
 axis=0 if plane[0] else 2;across=2 if axis==0 else 0;slope=plane[0] if axis==0 else plane[1];assert slope and (plane[1] if axis==0 else plane[0])==0
 near=-.5 if slope<0 else .5;far=-near;matrix=row['matrix'];low=F(row['bounds']['min'][1]);near_world=F(row['bounds']['min' if slope<0 else 'max'][axis])
 near_y=P.height(plane,F(row['bounds']['min'][0]) if axis==2 else near_world,near_world if axis==2 else F(row['bounds']['min'][2]))
 crease=(low-plane[2])/slope
 local_near_y=(near_y-F(matrix[13]))/F(matrix[5]);local_crease=(crease-F(matrix[12+axis]))/F(matrix[axis*5])
 def points(y,z):
  out=[]
  for x in [-.5,.5]:
   for yy,along in [(y,near),(-.5,z),(-.5,far),(.5,far),(.5,near)]:
    v=[0.,yy,0.];v[axis]=along;v[across]=x;out.append(v)
  return out
 initial=points(N.f32(float(local_near_y)),N.f32(float(local_crease)));pos=copy.deepcopy(initial);rounds=[]
 def margins(vs):return [F(v[1])-P.height(plane,F(v[0]),F(v[2])) for v in vs]
 def world(vs):return [P.G.point(v,matrix) for v in vs]
 initial_margins=margins(world(initial))
 for vertices,component,direction in [([0,5],1,1),([1,6],axis,1 if slope<0 else -1)]:
  for step in range(17):
   current=margins(world(pos))
   if all(current[i]>=0 for i in vertices):break
   assert step<16,'Unrepresentable cut after bounded Float32 rounding: '+row['proposalId']
   old=pos[vertices[0]][component];new=step32(old,direction);assert -.5<=new<=.5,'Cut outside original envelope: '+row['proposalId']
   for i in vertices:pos[i][component]=new
   rounds.append({'vertices':vertices,'component':component,'direction':direction,'beforeFloat32':old,'afterFloat32':new})
  else:raise AssertionError('Unrepresentable '+row['proposalId'])
 actual=world(pos);remaining=margins(actual);assert min(remaining)>=0,'Fixed boundary penetrates roof: '+row['proposalId']
 faces=P.outward_faces(actual,[list(range(5)),list(range(5,10))]+[[i,(i+1)%5,(i+1)%5+5,i+5] for i in range(5)])
 index=[k for f in faces for j in range(1,len(f)-1) for k in [f[0],f[j],f[j+1]]]
 physical={'attributes':{'position':{'array':[q for v in pos for q in v],'itemSize':3,'type':'Float32Array','normalized':False}},'index':{'array':index,'type':'Uint16Array'}}
 mapped=[];rp=[];rn=[];uv=[];ideal=[];face_records=[];counter=0
 for face_id,ids in enumerate(faces):
  a,b,c=[actual[i] for i in ids[:3]];u=N.normalize(P.G.sub(b,a));normal=N.normalize(P.G.cross(P.G.sub(b,a),P.G.sub(c,a)));v=P.G.cross(normal,u)
  la,lb,lc=[pos[i] for i in ids[:3]];ln=N.normalize(P.G.cross(P.G.sub(lb,la),P.G.sub(lc,la)));triangles=[]
  for j in range(1,len(ids)-1):
   triangles.append(counter);counter+=1
   for k in [ids[0],ids[j],ids[j+1]]:
    mapped.append(k);rp.extend(pos[k]);rn.extend(N.f32(q) for q in ln);d=P.G.sub(actual[k],a);pair=[P.dot(d,u),P.dot(d,v)];ideal.extend(pair);uv.extend(N.f32(q) for q in pair)
  face_records.append({'sourceFaceId':face_id,'physicalVertices':ids,'physicalTriangleIds':triangles,'renderTriangleIds':triangles})
 attr=lambda values,size:{'array':values,'itemSize':size,'type':'Float32Array','normalized':False}
 render={'attributes':{'position':attr(rp,3),'normal':attr(rn,3),'uv':attr(uv,2),'grossUV':attr(copy.deepcopy(uv),2)},'index':{'array':list(range(48)),'type':'Uint16Array'}}
 mapping={'version':1,'physicalVertexCount':10,'renderVertexCount':48,'physicalTriangleCount':16,'renderTriangleCount':16,'renderToPhysicalVertex':mapped,'physicalToRenderVertices':[[j for j,p in enumerate(mapped) if p==i] for i in range(10)],'renderTriangleToPhysicalTriangle':list(range(16)),'sourceFaceTriangles':face_records,'rule':'Render seams duplicate attributes only. Every rendered Float32 position has the same bits as its mapped physical vertex; one physical body/owner/account.'}
 return physical,render,mapping,actual,plane,{'sourceProposalId':row['proposalId'],'slopeAxis':axis,'actualSourceRoofTriangles':source_triangles,'referenceNearRoofYExact':P.rational(near_y),'referenceCreaseExact':P.rational(crease),'initialFloat32LocalPositions':[q for v in initial for q in v],'initialMinimumRoofMarginExact':P.rational(min(initial_margins)),'initialConversion':'PASS' if min(initial_margins)>=0 else 'FAILED_ROOF_SEPARATION_PRESERVED','conservativeNewCutSteps':rounds,'acceptedMinimumRoofMarginExact':P.rational(min(remaining)),'maximumMetricUVCoordinateRoundingErrorMetres':max(abs(a-b) for a,b in zip(uv,ideal))}
def build():
 table,base,front,by,rows,roof=P.inputs();classification=read(N.SOURCE+'/classification.json');classified={r['sourceProposalId']:r for r in classification['records']}
 pilot=read(N.MANIFEST);excluded=pilot['members'][0]['sourceProposalId'].replace('proposal-only/roof-saddle/','proposal-only/blocking/')
 selected=[r for k,r in sorted(rows.items()) if k!=excluded];assert len(selected)==19
 out={};profiles={};members=[];quantities=[];conversions=[];originals={}
 pilot_phys=read(pilot['geometry']['path']);pilot_render=read(pilot['renderGeometry']['path']);pilot_map=read(pilot['physicalRenderMapping']['path'])
 def register(physical,render,mapping):
  profile_id=digest(encode([physical,render,mapping]))
  if profile_id in profiles:return profile_id
  if physical==pilot_phys and render==pilot_render and mapping==pilot_map:
   profiles[profile_id]={'physicalGeometry':pilot['geometry'],'renderGeometry':pilot['renderGeometry'],'physicalRenderMapping':pilot['physicalRenderMapping'],'binaryBuffers':pilot['binaryBuffers'],'reusedAcceptedPilotBuffers':True}
   return profile_id
  refs={}
  for label,g in [('physical',physical),('render',render),('mapping',mapping)]:
   raw=encode(g);path=ASSET+'/geometry/'+digest(raw)+'.json';out[path]=raw;refs[label]=ref(path,raw,**({'vertexCount':10 if label=='physical' else 48,'triangleCount':16} if label!='mapping' else {}))
  binary={}
  for label,g in [('physical',physical),('render',render)]:
   for name,a in g['attributes'].items():
    raw=struct.pack('<'+'f'*len(a['array']),*a['array']);path=ASSET+'/buffers/'+digest(raw)+'.f32le.bin';out[path]=raw;binary[label+'/'+name]=ref(path,raw,itemSize=a['itemSize'],count=len(a['array'])//a['itemSize'])
   raw=struct.pack('<'+'H'*len(g['index']['array']),*g['index']['array']);path=ASSET+'/buffers/'+digest(raw)+'.u16le.bin';out[path]=raw;binary[label+'/index']=ref(path,raw,count=len(g['index']['array']))
  profiles[profile_id]={'physicalGeometry':refs['physical'],'renderGeometry':refs['render'],'physicalRenderMapping':refs['mapping'],'binaryBuffers':binary,'reusedAcceptedPilotBuffers':False}
  return profile_id
 for row in selected:
  physical,render,mapping,world,plane,audit=shape(row,roof,classified[row['proposalId']]['actualRoofSourceTriangles']);profile=register(physical,render,mapping)
  identity=row['proposalId'].replace('proposal-only/blocking/','carrier/roof-saddle-native/',1);cornice=row['lowerSourceCarrierId'];upper=row['upperSourceCarrierId'];roof_id=P.ROOF;parent_ids=[cornice,roof_id,upper]
  for cid in parent_ids:
   if cid not in originals:originals[cid]=[P.original_geometry_ref(b) for b in by[cid]['renderBindings'] if b['physicalContribution']=='carrier-solid']
  ports=[]
  for name,vertices,parent in [('cornice',[1,2,6,7],cornice),('roof-seat',[0,1,5,6],roof_id),('top',[3,4,8,9],upper)]:
   face=next(f for f in mapping['sourceFaceTriangles'] if set(f['physicalVertices'])==set(vertices));refs=[]
   for r in originals[parent]:
    if parent==roof_id:ids=classified[row['proposalId']]['actualRoofSourceTriangles']
    else:
     ts=P.G.triangles(read(r['geometryPath']),r['matrix'],r.get('sourceRange'));y=by[parent]['physicalBounds']['min' if parent==upper else 'max'][1];ids=[i for i,t in enumerate(ts) if all(abs(p[1]-y)<1e-12 for p in t) and abs(P.G.cross(P.G.sub(t[1],t[0]),P.G.sub(t[2],t[0]))[1])>0]
    refs.append({'geometryPath':r['geometryPath'],'sourceTriangleIds':ids})
   ports.append({'id':identity+'/port-'+name,'kind':name,'physicalTriangleIds':face['physicalTriangleIds'],'physicalVertexIds':face['physicalVertices'],'fixedParentCarrierId':parent,'fixedOriginalSourceTriangles':refs,'remapAllowed':False,'nativeFragmentBinding':'Deferred; no compiler/activation.'})
  volume=P.solid_volume(world,physical['index']['array']);lower=volume/F(.12);quantity=N.floor64(lower)
  quantities.append({'id':identity,'actualNativeWorldVolumeExact':P.rational(volume),'volumeApproximate':float(volume),'divisorExact':P.rational(F(.12)),'certifiedLowerExact':P.rational(lower),'selectedBinary64':quantity,'selectedHex':quantity.hex(),'selectedBitsLE':struct.pack('<d',quantity).hex(),'selectedExact':P.rational(F(quantity)),'nextExact':P.rational(F(math.nextafter(quantity,math.inf))),'nextBinary64':math.nextafter(quantity,math.inf)})
  member={'id':identity,'sourceProposalId':row['proposalId'],'profileId':profile,'matrix':row['matrix'],'bounds':P.G.bounds(P.G.triangles(physical,row['matrix'])),'originalEnvelopeBounds':row['bounds'],'nativeBay':{'axis':row['axis'],'intervalMetres':row['bayIntervalMetres'],'pitchMetres':1},'appearanceMaterialId':front['appearanceSource']['materialId'],'role':'timber-fitting','physicalMaterial':'timber','fuelClass':'frame','quantityReference':quantity,'canonicalOwnerCount':1,'anchors':[],'groundAnchor':False,'finish':None,'ports':ports,
   'selectedSupportSemantics':{'operator':'ALL_FIXED_PORTS','requiredLowerPortIds':[ports[0]['id'],ports[1]['id']],'independentOriginalParentSupportRequired':True,'supportFromFittingUpperOrDescendantsAllowed':False,'anyParentFallbackAllowed':False,'upperDependency':{'child':upper,'parent':identity,'fixedTopPortId':ports[2]['id'],'localAxis':row['axis'],'localIntervalMetres':row['bayIntervalMetres'],'direction':'parent-to-child'},'roofRole':'roof-covering','reverseBrace':False,'newAnchor':False,'remapAllowed':False},
   'contacts':[{'child':identity,'parent':cornice,'portId':ports[0]['id']},{'child':identity,'parent':roof_id,'portId':ports[1]['id']},{'child':upper,'parent':identity,'portId':ports[2]['id']}]}
  assert member['bounds']==row['bounds'],'Unrepresentable original envelope: '+row['proposalId']
  members.append(member);conversions.append(audit)
 quantities_path=DIRECTORY+'/quantity-certificates.json';out[quantities_path]=encode({'version':1,'rule':'Per new piece: actual converted closed world volume / exact-binary64 .12, greatest finite binary64 not above certified lower. No sum or world ledger.','firstPilotQuantityUnchanged':True,'runtimeStockAssigned':0,'pieces':quantities})
 conversion_path=DIRECTORY+'/conversion-audit.json';out[conversion_path]=encode({'version':1,'method':'Each own frozen roof facet plane and native envelope; initial conversion retained, then bounded outward Float32 steps on new cut vertices only.','oldGeometryOrNativeToleranceChanged':False,'pieces':conversions})
 relations_path='art/source/shared-map-fire-bindings/coverage-family-proposal-v1/relationships.json';relations=read(relations_path)['relationships'];named=set(originals)
 interfaces={'version':1,'runtimeGate':'Physical/render mapping plus BOTH independently supported fixed lower ports remain a consumer gate. Flat OR joins are not substituted.',
  'priorPilotInterfaceGate':{'path':N.DIRECTORY+'/interface-gates.json','sha256':sha(N.DIRECTORY+'/interface-gates.json')},
  'originalParentCounts':{cid:len(by[cid]['supportCarrierIds']) for cid in sorted(named)},
  'directOldEdgesWithinEachNamedTriplet':[{'id':m['id'],'edges':[{'child':c,'parent':p} for c in [m['ports'][0]['fixedParentCarrierId'],P.ROOF,m['ports'][2]['fixedParentCarrierId']] for p in by[c]['supportCarrierIds'] if p in {m['ports'][0]['fixedParentCarrierId'],P.ROOF,m['ports'][2]['fixedParentCarrierId']}]} for m in members],
  'frozenRelationshipsPath':relations_path,'frozenRelationshipsSha256':sha(relations_path),'incidentFamilyRelationships':[{'id':r['id'],'child':r['childCarrierId'],'parent':r['parentCarrierId'],'direction':r['direction'],'regions':len(r['localRegions'])} for r in relations if r['childCarrierId'] in named or r['parentCarrierId'] in named],
  'oldEdgesChanged':False,'transitiveGraphOrCycleSearchRun':False,'rolePromotion':False,'newAnchors':0}
 out[DIRECTORY+'/interface-gates.json']=encode(interfaces)
 manifest={'version':1,'status':'NINETEEN_NATIVE_SOURCE_ASSETS_RUNTIME_GATE_OPEN','placeId':'new-york','authorityCommit':AUTHORITY,
  'sourceTable':{'path':P.TABLE,'sha256':P.TABLE_SHA},'baseBindings':{'path':P.BASE,'sha256':P.BASE_SHA},
  'firstPilotPreserved':{'commit':PARENT,'path':N.MANIFEST,'sha256':sha(N.MANIFEST),'excludedCanonicalId':pilot['members'][0]['id'],'excludedSourceProposalId':excluded},
  'appearanceSource':front['appearanceSource'],'profiles':profiles,'members':members,'namedOriginalParents':originals,'quantityCertificates':ref(quantities_path,out[quantities_path]),'conversionAudit':ref(conversion_path,out[conversion_path]),
  'interfaceGates':ref(DIRECTORY+'/interface-gates.json',out[DIRECTORY+'/interface-gates.json']),'nativeContactToleranceMetres':1e-5,'runtimeStockAssigned':0,'runtimeInstalled':False,'worldLedgerComputed':False}
 out[MANIFEST]=encode(manifest)
 authority='docs/engineering/shared-maps/saddle-native-buffer-batch.md';out[DIRECTORY+'/authority-e1945001.md']=subprocess.check_output(['git','show',AUTHORITY+':'+authority],cwd=ROOT)
 return out
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--check',action='store_true');args=p.parse_args()
 try:out=build()
 except AssertionError as error:
  # No partially exported asset batch; preserve a concrete case before stopping.
  if not args.check:(HERE/'unrepresentable-case.json').write_bytes(encode({'status':'STOP_CONCRETE_CASE','error':str(error),'oldGeometryChanged':False,'assetBatchWritten':False}))
  raise
 for path,raw in out.items():
  dest=ROOT/path
  if args.check:assert dest.read_bytes()==raw,'Batch reproduction differs: '+path
  else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
 a=json.loads(out[MANIFEST]);print(json.dumps({'result':'PASS_NINETEEN_EXPORT','outputs':len(out),'pieces':len(a['members']),'profiles':len(a['profiles']),'reusedPilotProfiles':sum(p['reusedAcceptedPilotBuffers'] for p in a['profiles'].values()),'assetSha256':digest(out[MANIFEST])}))
