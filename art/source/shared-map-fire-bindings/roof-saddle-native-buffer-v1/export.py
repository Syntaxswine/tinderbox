"""One native-buffer saddle pilot; no compiler, world or support graph is constructed."""
from pathlib import Path
from fractions import Fraction as F
import argparse,copy,hashlib,importlib.util,json,math,struct,subprocess,sys
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
PARENT='9df30ffc4b8e06ca3a36df2a624cb04f52480297'
AUTHORITY='44c7aa333a6c74d5723120a404fc1dec33cce162'
SOURCE='art/source/shared-map-fire-bindings/roof-saddle-proposal-v1'
ASSET='assets/art/shared-map-support-additions/new-york-roof-saddle-native-v1'
DIRECTORY=HERE.relative_to(ROOT).as_posix();MANIFEST=ASSET+'/index.json'
def mod(name,p):
 s=importlib.util.spec_from_file_location(name,ROOT/p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
P=mod('accepted_double_saddle',SOURCE+'/propose.py')
def digest(b):return hashlib.sha256(b).hexdigest()
def sha(p):return digest((ROOT/p).read_bytes())
def read(p):return json.loads((ROOT/p).read_text(encoding='utf-8'))
def encode(a):return (json.dumps(a,indent=2,sort_keys=True)+'\n').encode()
def f32(x):return struct.unpack('<f',struct.pack('<f',x))[0]
def normalize(v):
 n=math.sqrt(P.dot(v,v));assert n>0
 return [x/n for x in v]
def floor64(q):
 x=float(q)
 if F(x)>q:x=math.nextafter(x,-math.inf)
 assert math.isfinite(x) and F(x)<=q<F(math.nextafter(x,math.inf))
 return x
def ref(path,raw,**extra):return {'path':path,'sha256':digest(raw),**extra}
def build():
 source=read(SOURCE+'/source-proposal.json');old=read(SOURCE+'/geometry/proposed-saddle.json');assert sha(SOURCE+'/geometry/proposed-saddle.json')=='68fcb9a576b246bd517b59bc47cf27860cbb19db88133d081011a680677ebe8c'
 _,_,_,by,_,roof=P.inputs();plane=P.height_plane(roof[2]);matrix=source['members'][0]['matrix'];before=old['attributes']['position']['array'];pos=[f32(x) for x in before];index=old['index']['array']
 world=[P.G.point(pos[i:i+3],matrix) for i in range(0,len(pos),3)]
 margins=[F(p[1])-P.height(plane,F(p[0]),F(p[2])) for p in world]
 # Direct conversion is accepted only if the complete actual buffer is clear.
 assert min(margins)>=0,'Initial Float32 conversion penetrates the unchanged source roof; preserve failure before adjusting only new cut vertices.'
 physical={'attributes':{'position':{'array':pos,'itemSize':3,'type':'Float32Array','normalized':False}},'index':{'array':index,'type':'Uint16Array'}}
 mapping=[];render_pos=[];render_norm=[];render_uv=[];face_triangles=[];ideal_uv=[];triangle=0
 for face in old['faces']:
  ids=face['vertices'];a,b,c=[world[i] for i in ids[:3]];u=normalize(P.G.sub(b,a));nw=normalize(P.G.cross(P.G.sub(b,a),P.G.sub(c,a)));v=P.G.cross(nw,u)
  local=[pos[i*3:i*3+3] for i in ids[:3]];normal=normalize(P.G.cross(P.G.sub(local[1],local[0]),P.G.sub(local[2],local[0])))
  this=[]
  for j in range(1,len(ids)-1):
   tri=[ids[0],ids[j],ids[j+1]];this.append(triangle);triangle+=1
   for k in tri:
    mapping.append(k);render_pos.extend(pos[k*3:k*3+3]);render_norm.extend(f32(x) for x in normal)
    d=P.G.sub(world[k],a);uv=[P.dot(d,u),P.dot(d,v)];ideal_uv.extend(uv);render_uv.extend(f32(x) for x in uv)
  face_triangles.append({'sourceFaceId':face['face'],'physicalVertices':ids,'physicalTriangleIds':this,'renderTriangleIds':this})
 assert mapping==index
 attr=lambda arr,size:{'array':arr,'itemSize':size,'type':'Float32Array','normalized':False}
 render={'attributes':{'position':attr(render_pos,3),'normal':attr(render_norm,3),'uv':attr(render_uv,2),'grossUV':attr(copy.deepcopy(render_uv),2)},'index':{'array':list(range(48)),'type':'Uint16Array'}}
 out={};physical_path=ASSET+'/geometry/physical.json';render_path=ASSET+'/geometry/render.json';mapping_path=ASSET+'/geometry/vertex-mapping.json'
 out[physical_path]=encode(physical);out[render_path]=encode(render)
 vertex_map={'version':1,'physicalVertexCount':10,'renderVertexCount':48,'physicalTriangleCount':16,'renderTriangleCount':16,'renderToPhysicalVertex':mapping,
  'physicalToRenderVertices':[[j for j,p in enumerate(mapping) if p==i] for i in range(10)],'renderTriangleToPhysicalTriangle':list(range(16)),'sourceFaceTriangles':face_triangles,
  'rule':'Render seams duplicate attributes only. Every rendered Float32 position has the same bits as its mapped physical vertex; one physical body/owner/account.'}
 out[mapping_path]=encode(vertex_map)
 binary={}
 for label,g in [('physical',physical),('render',render)]:
  for name,a in g['attributes'].items():
   # grossUV intentionally aliases the same UV bytes, not a second surface/account.
   path=ASSET+'/buffers/'+label+'-'+('uv' if name=='grossUV' else name)+'.f32le.bin';raw=struct.pack('<'+'f'*len(a['array']),*a['array']);out[path]=raw;binary[label+'/'+name]=ref(path,raw,itemSize=a['itemSize'],count=len(a['array'])//a['itemSize'])
  path=ASSET+'/buffers/'+label+'-index.u16le.bin';raw=struct.pack('<'+'H'*len(g['index']['array']),*g['index']['array']);out[path]=raw;binary[label+'/index']=ref(path,raw,count=len(g['index']['array']))
 volume=P.solid_volume(world,index);target=volume/F(.12);selected=floor64(target);next_value=math.nextafter(selected,math.inf)
 quantity={'version':1,'recipe':'Actual accepted Float32 physical buffer after original binary64 world transform: closed volume / exact-binary64 .12.',
  'worldVolumeExact':P.rational(volume),'worldVolumeApproximate':float(volume),'divisorBinary64Hex':(.12).hex(),'divisorExact':P.rational(F(.12)),
  'certifiedLowerResultExact':P.rational(target),'certificate':'Exact rational signed-tetrahedron volume of the closed actual emitted world coordinates; division by exact-binary64 .12. Exact result is itself a certified lower bound.',
  'selectedGreatestFiniteBinary64':selected,'selectedHex':selected.hex(),'selectedBitsLE':struct.pack('<d',selected).hex(),'selectedExact':P.rational(F(selected)),
  'nextBinary64':next_value,'nextExact':P.rational(F(next_value)),'selectionProof':{'selectedNotAboveLower':F(selected)<=target,'nextStrictlyAboveLower':F(next_value)>target},
  'sixDecimal04012Selected':False,'earlierFront48Clear96LiteralsChanged':False,'combinedWorldLedgerComputed':False,'registeredRuntimeStock':0}
 out[DIRECTORY+'/quantity-certificate.json']=encode(quantity)
 identity='carrier/roof-saddle-native/main-parapet-6/bay-01';roof_id=P.ROOF;cornice='carrier/edge-6/cornice-7';upper='carrier/main-parapet-6/base'
 ports=[]
 for name,face_vertices,parent,meaning in [('cornice',[1,2,6,7],cornice,'fixed-original-cornice-foot'),('roof-seat',[0,1,5,6],roof_id,'fixed-original-roof-seat'),('top',[3,4,8,9],upper,'fixed-upper-parapet-footprint')]:
  face=next(f for f in face_triangles if set(f['physicalVertices'])==set(face_vertices));refs=source['namedOriginalParents'][parent]
  # Source triangle selectors are frozen original source triangles, not fragment IDs.
  parents=[]
  for r in refs:
   triangles=P.G.triangles(read(r['geometryPath']),r['matrix'],r.get('sourceRange'))
   if parent==roof_id:ids=[2,3]
   else:
    plane_y=by[parent]['physicalBounds']['min' if parent==upper else 'max'][1];ids=[i for i,t in enumerate(triangles) if all(abs(p[1]-plane_y)<1e-12 for p in t) and abs(P.G.cross(P.G.sub(t[1],t[0]),P.G.sub(t[2],t[0]))[1])>0]
   parents.append({**r,'sourceTriangleIds':ids})
  ports.append({'id':identity+'/port-'+name,'meaning':meaning,'physicalOwnerId':identity,'physicalTriangleIds':face['physicalTriangleIds'],'physicalVertexIds':face['physicalVertices'],'fixedParentCarrierId':parent,'fixedOriginalParentGeometry':parents,
   'survivingParentRemapAllowed':False,'pose':'Original source matrix only; unchanged parent pose.','nativeFragmentBinding':'Deferred; compiler/activation not run.','groundAnchor':False})
 support={'version':1,'selectedAuthorityCommit':AUTHORITY,'fittingRequirement':{'operator':'ALL_FIXED_PORTS','fixedPortIds':[ports[0]['id'],ports[1]['id']],
  'bothOriginalParentsMustBeIndependentlySupported':True,'supportCannotComeFromFittingUpperOrDescendants':True,'portRetirement':'Loss of either fixed original port invalidates this fitting requirement; never substitute another surviving parent.'},
  'upperDependency':{'childCarrierId':upper,'parentCarrierId':identity,'fixedPortId':ports[2]['id'],'direction':'parent-to-child','localOneMetreIntervalX':[49,50]},
  'roofRolePreserved':'roof-covering','reverseBrace':False,'newAnchor':False,'cycleCreatedSupportAllowed':False,'anyParentSubstitutionAllowed':False,'semanticsKind':'Architect-selected conservative assembly ownership under binary support; not stress capacity.'}
 out[mapping_path]=encode(vertex_map);out[DIRECTORY+'/fixed-port-semantics.json']=encode(support)
 # Read-only report of direct named old edges and original family incidents; never build a graph.
 named={cornice,roof_id,upper};relations_path='art/source/shared-map-fire-bindings/coverage-family-proposal-v1/relationships.json';relations=read(relations_path)['relationships']
 incident=[{'id':r['id'],'child':r['childCarrierId'],'parent':r['parentCarrierId'],'direction':r['direction'],'regions':len(r['localRegions'])} for r in relations if r['childCarrierId'] in named or r['parentCarrierId'] in named]
 old_edges=[{'child':c,'parent':p} for c in sorted(named) for p in by[c]['supportCarrierIds'] if p in named]
 interface_paths=['src/simulation/source-support.js','src/content/map-source-support-data.js'];interface_pins=[]
 for path in interface_paths:
  raw=subprocess.check_output(['git','show',AUTHORITY+':'+path],cwd=ROOT);interface_pins.append({'path':path,'commit':AUTHORITY,'sha256':digest(raw)})
 gates={'version':1,'directOldEdgesAmongThreeNamedParents':old_edges,'oldParentCounts':{c:len(by[c]['supportCarrierIds']) for c in sorted(named)},'frozenFamilyIncidentRelations':incident,'frozenRelationshipsPath':relations_path,'frozenRelationshipsSha256':sha(relations_path),
  'interfaceSources':interface_pins,'status':'GEOMETRY_BUFFERS_VALID; DATA_MAPPING_AND_ALL_FIXED_PORT_CONSUMER_GATE_OPEN',
  'exactGates':['Legacy addition records expose one geometry and a flat joins list; this pilot explicitly carries physical/render buffers plus mapping. No current consumer import is claimed.',
   'The inspected binary support relation/reachability interface admits independent incoming paths; a flat pair list cannot encode this selected both-port requirement. Do not install two OR edges as a substitute.',
   'Bind both fixed original source ports and the upper local port to actual native fragments later. No native fragment/retirement mapping or old-edge normalization is installed.',
   'No direct old edge among these three parents is present in the frozen base. Transitive/current runtime conflicts remain an intake gate; no graph or cycle search is run. Old edges are not removed or changed.'],
  'oldEdgesChanged':False,'rolePromotion':False,'newAnchors':0,'compilerOrGraphRun':False}
 out[DIRECTORY+'/interface-gates.json']=encode(gates)
 manifest={'version':1,'status':'ONE_NATIVE_BUFFER_PILOT_NOT_INSTALLED','placeId':'new-york','authorityCommit':AUTHORITY,'sourceDoubleProposal':{'commit':PARENT,'path':SOURCE+'/source-proposal.json','sha256':sha(SOURCE+'/source-proposal.json')},
  'baseBindings':source['baseBindings'],'appearanceSource':source['appearanceSource'],
  'geometry':ref(physical_path,out[physical_path],triangleCount=16,vertexCount=10),'renderGeometry':ref(render_path,out[render_path],triangleCount=16,vertexCount=48),
  'physicalRenderMapping':ref(mapping_path,out[mapping_path]),'binaryBuffers':binary,
  'members':[{'id':identity,'sourceProposalId':source['members'][0]['id'],'matrix':matrix,'bounds':P.G.bounds(P.G.triangles(physical,matrix)),'appearanceMaterialId':source['appearanceSource']['materialId'],
   'physicalMaterial':'timber','role':'timber-fitting','fuelClass':'frame','quantityReference':selected,'canonicalOwnerCount':1,'groundAnchor':False,'anchors':[],'finish':None}],
  'ports':ports,'selectedSupportSemantics':support,'namedOriginalParents':source['namedOriginalParents'],
  'proposedContacts':[{'child':identity,'parent':cornice,'portId':ports[0]['id']},{'child':identity,'parent':roof_id,'portId':ports[1]['id']},{'child':upper,'parent':identity,'portId':ports[2]['id']}],
  'quantityCertificate':{'path':DIRECTORY+'/quantity-certificate.json','sha256':digest(out[DIRECTORY+'/quantity-certificate.json'])},
  'interfaceGates':{'path':DIRECTORY+'/interface-gates.json','sha256':digest(out[DIRECTORY+'/interface-gates.json'])},
  'nativeCompilerOrWorldInstalled':False,'registeredRuntimeStock':0,'otherNineteenExported':0,
  'modularInterface':{'originalMatrixPivotAndEnvelopePreserved':True,'gridSizeXYZMetres':[1,2.12,1],'occupiedCells':[[49,8,59],[49,8,60]],'onlyThisOriginalPoseProposed':True,'metricUVsAfterBufferConversion':True}}
 out[MANIFEST]=encode(manifest)
 delta=[{'physicalVertex':i,'component':k,'sourceDouble':before[i*3+k],'nativeFloat32':pos[i*3+k],'delta':pos[i*3+k]-before[i*3+k]} for i in range(10) for k in range(3) if pos[i*3+k]!=before[i*3+k]]
 conversion={'version':1,'initialDirectFloat32Conversion':'PASS','initialConversionFailures':[],'additionalConservativeCutAdjustmentNeeded':False,'oldGeometryOrToleranceChanged':False,
  'float32ComponentChanges':delta,'physicalVertexIdentityPreserved':True,'renderCornersDuplicatedOnlyForAttributeSeams':True,'minimumRoofPlaneMarginMetres':float(min(margins)),'maximumRoofSeatCornerGapMetres':float(max(margins[i] for i in [0,1,5,6])),
  'maximumMetricUVCoordinateRoundingErrorMetres':max(abs(a-b) for a,b in zip(render_uv,ideal_uv)),'metricUVBeforeFloat32':ideal_uv,
  'physicalBufferPositionSha256':binary['physical/position']['sha256'],'physicalBufferIndexSha256':binary['physical/index']['sha256'],
  'quantityCertificateSha256':manifest['quantityCertificate']['sha256'],'sourceMatrix':matrix}
 out[DIRECTORY+'/conversion-evidence.json']=encode(conversion)
 authority_path='docs/engineering/shared-maps/saddle-native-buffer-pilot.md';out[DIRECTORY+'/authority-44c7aa33.md']=subprocess.check_output(['git','show',AUTHORITY+':'+authority_path],cwd=ROOT)
 return out
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--check',action='store_true');args=p.parse_args();out=build()
 for path,raw in out.items():
  dest=ROOT/path
  if args.check:assert dest.read_bytes()==raw,'Non-reproducing buffer pilot: '+path
  else:dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
 print(json.dumps({'result':'PASS_ONE_NATIVE_BUFFER_PILOT','outputs':len(out),'assetSha256':digest(out[MANIFEST]),'physicalVertices':10,'renderVertices':48,'triangles':16,'runtimeInstalled':False}))
