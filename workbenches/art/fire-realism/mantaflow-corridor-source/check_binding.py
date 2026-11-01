"""Tiny source/model fixtures; no bpy, mathutils, winjob or controller import.
Uses synthetic state and a16x16x1 geometric fixture, not actual scene/field data.
"""
import ast,hashlib,json,math,stat,struct,sys
from copy import deepcopy
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];sys.path.insert(0,str(HERE))
import policy
from source import load_settings,f32,digest
from realization import IDENTITY,words
from authoring import (verify_observation,attribute_snapshot,verify_flat_attributes,verify_flat_provenance,verify_install_attributes,verify_attribute_pair,AttributeRefused,install)
from prediction import closest_triangle,union_sample,predict,early_response
from state import flatten
GROUPS=[];REFUSALS=0

def check(name,fn):fn();GROUPS.append(name);print('PASS '+name)
def refuse(fn):
    global REFUSALS
    try:fn()
    except (ValueError,TypeError,KeyError,IndexError):REFUSALS+=1;return
    raise AssertionError('Expected bounded fail-closed refusal')
def change(value,path,wanted):
    result=deepcopy(value);o=result
    for key in path[:-1]:o=o[key]
    o[path[-1]]=wanted;return result

def kernel_oracles():
    tri=[[0.,0.,0.],[2.,0.,0.],[0.,2.,0.]]
    a=closest_triangle([.5,.5,1.],tri);assert a['point']==[.5,.5,0.]and a['barycentric']==[.5,.25,.25]and a['distanceSquared']==1.
    b=closest_triangle([2.,2.,0.],tri);assert b['point']==[1.,1.,0.]and b['barycentric']==[0.,.5,.5]and b['distanceSquared']==2.
    # Near face wins even if a farther disconnected face has larger weights.
    positions=tri+[[x,y,z+.5]for x,y,z in tri];faces=[[0,1,2],[3,4,5]]
    row=union_sample([.5,.5,0.],positions,faces,[.25]*3+[1.]*3,['negative','positive'],1.)
    assert row['nearestFaces']==[0]and row['minimumE']==row['maximumE']==.25
    dup=union_sample([.5,.5,0.],tri,[[0,1,2],[0,1,2]],[.25]*3,['negative','negative'],1.)
    assert dup['tie']and dup['maximumE']==.25 # Never .5 sum or1-weight selection.
    row=union_sample([.5,.5,.25],positions,faces,[.25]*3+[1.]*3,['negative','positive'],1.)
    assert row['tie']and row['minimumE']==math.sqrt(.75)*.25 and row['maximumE']==math.sqrt(.75)
    assert row['tieRuleObserved']is False
    edge=union_sample([.5,.5,1.],tri,[[0,1,2]],[1.]*3,['negative'],1.);assert edge['maximumE']==0.
check('independent closest-point/barycentric/nearest-union/no-sum/tie oracles',kernel_oracles)

def kernel_refusals():
    tri=[[0.,0.,0.],[1.,0.,0.],[0.,1.,0.]]
    refuse(lambda:closest_triangle([math.nan,0,0],tri))
    refuse(lambda:closest_triangle([0,0,0],[[0,0,0],[1,1,0],[2,2,0]]))
    refuse(lambda:closest_triangle([0,0,0],[[0,0,0],[1,0,0],[0,1,1]]))
    for weights,faces,radius in [([1,1,-.1],[[0,1,2]],1.),([1,1,1],[[0,0,2]],1.),([1,1,1],[[0,1,3]],1.),([1,1,1],[[0,1,2]],0.)]:
        refuse(lambda weights=weights,faces=faces,radius=radius:union_sample([0,0,0],tri,faces,weights,['negative'],radius))
check('kernel numeric/mapping refusals',kernel_refusals)

def flat_record(vertex_count,faces,name):
    edges={tuple(sorted((a,b)))for face in faces for a,b in zip(face,face[1:]+face[:1])};n=len(faces)
    counts={'vertices':vertex_count,'edges':len(edges),'corners':3*n,'faces':n}
    # Illustrative local metadata, not additional actual RNA enum targets.
    return {'kind':'corridor-mesh-attribute-observation-v1','meshName':name,'counts':counts,'attributeCount':8,
            'attributes':[{'name':'position','domain':'POINT','dataType':'FLOAT_VECTOR','dataCount':vertex_count},
             {'name':'.edge_verts','domain':'EDGE','dataType':'INT32_2D','dataCount':len(edges)},
             {'name':'.corner_vert','domain':'CORNER','dataType':'INT','dataCount':3*n},
             {'name':'.corner_edge','domain':'CORNER','dataType':'INT','dataCount':3*n},
             {'name':'.select_vert','domain':'POINT','dataType':'BOOLEAN','dataCount':vertex_count,'values':[bool(i%2)for i in range(vertex_count)]},
             {'name':'.select_edge','domain':'EDGE','dataType':'BOOLEAN','dataCount':len(edges),'values':[i%3==0 for i in range(len(edges))]},
             {'name':'.select_poly','domain':'FACE','dataType':'BOOLEAN','dataCount':n,'values':[False]*n},
             {'name':'sharp_face','domain':'FACE','dataType':'BOOLEAN','dataCount':n,'values':[True]*n}],
            'polygons':[{'index':i,'useSmooth':False,'materialIndex':0}for i in range(n)],
            'authoredRestrictions':{'materialCount':0,'uvLayerCount':0,'colorAttributeCount':0,'shapeKeysPresent':False},'captureComplete':True,'captureErrors':[]}
def attribute_evidence(stage,observation):
    return {'kind':'corridor-attribute-evidence-v1','stage':stage,'passed':True,'observation':observation,
            'proof':verify_flat_attributes(observation,observation['counts']['vertices'],observation['counts']['faces'],mesh_name=observation['meshName'],require_editor_selection=True)}

s=load_settings();plan,realized=policy.expected_model(s);profile=plan['derivedProfile'];mesh,groups,dimensions=policy.expected_mesh_and_groups(s)
observation={'objectName':profile['objectName'],'world':deepcopy(IDENTITY),'localPositions':deepcopy(realized['positionsFloat32']),'worldPositions':deepcopy(realized['positionsFloat32']),
 'faces':[r['indices']for r in plan['mesh']['faces']],'groups':[{'name':profile['groupName'],'index':0}],
 'vertices':[{'vertex':i,'memberships':[{'group':0,'weight':f32(r['weight'])}]}for i,r in enumerate(profile['vertexWeights'])]}
flags={'density_vertex_group':profile['groupName'],'volume_density':0.0,'use_absolute':True,'use_plane_init':True,'surface_distance':.5,'flow_type':'BOTH'}
volatile={'domain_resolution':[0,0,0],'cell_size':[0.,0.,0.],'has_cache_baked_data':False,'cache_frame_pause_data':1}
weighted={'sourceObject':{'data':{'rnaType':'Mesh','name':'SurfaceSource1893'},'dimensions':[1.,1.,0.],'location':[0.,0.,0.]},
 'sourceSettings':deepcopy(flags),'sourceWorld':deepcopy(IDENTITY),'sourceMesh':{'name':'SurfaceSource1893','vertices':25,'polygons':23,'sha256':'a'*64},
 'sourceVertexGroups':{'objectName':profile['objectName'],'vertexCount':25,'groups':[{'index':0,'name':profile['groupName']}],'vertices':[]},
 'domainSettings':{'cache_directory':'old','burning_rate':.375,'vorticity':.25,'flame_vorticity':.5,'delete_in_obstacle':True},
 'domainNestedPhysics':{'effector_weights':{'gravity':1.,'all':1.}},'groundMesh':{'sha256':'b'*64},'volatileCache':deepcopy(volatile)}
baseline=deepcopy(weighted);baseline['domainSettings']['burning_rate']=.75;baseline['domainSettings']['vorticity']=.1;baseline['sourceSettings']['density_vertex_group']=''
after=deepcopy(weighted);after['sourceObject']['data']={'rnaType':'Mesh','name':mesh['name']};after['sourceObject']['dimensions']=dimensions;after['sourceMesh']=mesh;after['sourceVertexGroups']=groups;after['domainSettings']['cache_directory']='fresh'
before=deepcopy(baseline);before['domainSettings']['cache_directory']='fresh'
active={'fuel_amount':1.,'density':1.,'temperature':2.}
curve=[]
for frame in range(1,194):
    v=policy.expected_inputs(frame,s,active);curve.append({'frame':frame,'age':v['age'],**{k:v[k]if k=='use_inflow'else f32(v[k])for k in ['use_inflow','fuel_amount','density','temperature']}})
# Small fixture grid only; no production grid, raw array, cache or scene is read.
grid={'resolution':[16,16,1],'origin':[-.3125,-.3125,.02083333395421505],'spacing':[.0416666679084301]*3}
control={'baselineActualState':baseline,'preparedActualState':weighted,'activeOriginalBOTH':active,'evaluatedCurve':curve,'geometricKernelPrediction':{'grid':grid}}
gate=verify_observation(observation,plan,realized['positionsFloat32'],IDENTITY)
installed={'plan':plan,'expectedRealization':realized,'observation':observation,'expectedLocalFloat32':realized['positionsFloat32'],'originalWorld':IDENTITY,'geometryAndGroupGate':gate,'effectiveInputGridProved':False}
old_attributes=flat_record(25,s['emissionWeights']['triangleIndexMap'],'SurfaceSource1893')
new_attributes=flat_record(len(plan['mesh']['vertices']),[r['indices']for r in plan['mesh']['faces']],'CorridorSource1893')
installed.update({'attributePreflight':attribute_evidence('original',deepcopy(old_attributes)),
 'attributeAllocation':{'kind':'corridor-attribute-candidate-allocation-v1','allocatedMeshName':'CorridorSource1893','sourceMeshBeforeSwap':'SurfaceSource1893','sourceStillOriginal':True,'sourceSwapped':False},
 'attributeCandidate':attribute_evidence('candidate',deepcopy(new_attributes)),'attributeInstalled':attribute_evidence('installed',deepcopy(new_attributes)),
 'attributeProvenance':{'kind':'corridor-attribute-evidence-v1','stage':'candidate-provenance','passed':True,'observation':{'original':deepcopy(old_attributes),'candidate':deepcopy(new_attributes)},'proof':verify_flat_provenance(old_attributes,new_attributes,plan)}})
installed['attributeGate']=verify_install_attributes(installed,plan)
rows={str(f):{'frame':f,'original':deepcopy(observation),'evaluated':deepcopy(observation),'flowFlags':deepcopy(flags),'domainFlagsBefore':[False,False],'domainFlagsDuring':[False,False],'domainFlagsAfter':[False,False],
 'gates':{'original':deepcopy(gate),'evaluated':deepcopy(gate)},'effectiveInputGridProved':False}for f in [1,2,91,193]}
for row in rows.values():
    row['attributeReadbacks']={'original':deepcopy(new_attributes),'evaluated':deepcopy(new_attributes)};row['attributeOrigin']=deepcopy(old_attributes);row['attributeAnchor']=deepcopy(new_attributes)
    row['attributeGates']=verify_attribute_pair(row['attributeReadbacks'],plan,row['attributeOrigin'],new_attributes)
opened=policy.compare_original(control,before,'fresh');prepared=policy.compare_prepared(control,after,'fresh',s)
report={'editorSelectionAmendmentCommit':policy.EDITOR_SELECTION_AMENDMENT,'flatFaceAmendmentCommit':policy.FLAT_FACE_AMENDMENT,'cacheRedirectBeforeEvaluation':{'newObserved':'fresh'},'baselineActualState':before,'preparedActualState':after,
 'actualStateComparison':{'passed':True,'openedOriginal':opened,'preparedAgainstWeighted':prepared},'weightedControlComparison':prepared,'activeOriginalBOTH':active,'evaluatedCurve':curve,
 'corridorInstall':installed,'sourceReadbacks':rows,'kernelPrediction':predict(observation,plan,grid,s,active),'actualInputGridProof':False,
 'actualClippedEmitter':{'mesh':mesh,'planSha256':digest(plan),'observation':observation}}

def whole_gate():
    p=policy.verify_preparation(report,s,control);assert p['passed']and p['curveRows']==193 and p['frames']==[1,2,91,193]
    assert p['strictOpenStripPassed']is False and p['nominalCrossings']==8 and p['actualInputGridProof']is False
    assert all(report['kernelPrediction']['predictedPositiveCounts'].values())and set(report['kernelPrediction']['perBankExclusivePositiveCounts'])=={'negative','positive'}
check('complete synthetic full-state/193-curve/four-pair preparation gate',whole_gate)

def full_state_refusals():
    for target,path,value in [('before',['domainSettings','vorticity'],.2),('after',['domainSettings','burning_rate'],.75),('after',['domainSettings','flame_vorticity'],.6),('after',['domainNestedPhysics','effector_weights','gravity'],.5),('after',['groundMesh','sha256'],'c'*64),('after',['sourceMesh','sha256'],'d'*64),('after',['sourceObject','location'],[.01,0.,0.])]:
        test=change(before if target=='before'else after,path,value)
        result=policy.compare_original(control,test,'fresh')if target=='before'else policy.compare_prepared(control,test,'fresh',s)
        assert not result['passed']
    for field in ['extra','missing']:
        bad=deepcopy(after)
        if field=='extra':bad['volatileCache']['unexpected']=1
        else:del bad['volatileCache']['cell_size']
        refuse(lambda bad=bad:policy.compare_prepared(control,bad,'fresh',s))
    changed=deepcopy(after);changed['volatileCache']['has_cache_baked_data']=True
    assert policy.compare_reloaded(after,changed)['passed'] # Exactly four named volatile observations only.
    changed['domainSettings']['vorticity']=.7;assert not policy.compare_reloaded(after,changed)['passed']
check('nested physics/ground/mesh/cache-shape/full reload delta refusals',full_state_refusals)

def curve_and_descriptor_refusals():
    for index in [0,1,90,96,192]:
        bad=deepcopy(report);bad['evaluatedCurve'][index]['density']+=.01;refuse(lambda bad=bad:policy.verify_preparation(bad,s,control))
    bad=deepcopy(control);bad['evaluatedCurve'][90]['use_inflow']=False;refuse(lambda:policy.verify_preparation(report,s,bad))
    bad=deepcopy(report);bad['actualClippedEmitter']['planSha256']='0'*64;refuse(lambda:policy.verify_preparation(bad,s,control))
    bad=deepcopy(report);bad['actualInputGridProof']=True;refuse(lambda:policy.verify_preparation(bad,s,control))
check('193-row control/expected clock and clipped-descriptor/input-E refusals',curve_and_descriptor_refusals)

def pair_refusals():
    for path,value in [(['frame'],2),(['flowFlags','use_absolute'],False),(['flowFlags','surface_distance'],1.),(['domainFlagsAfter'],[True,True]),(['evaluated','vertices',0,'memberships',0,'weight'],.9),(['original','world',0,3],.001),(['gates','evaluated','passed'],False)]:
        bad=change(rows['1'],path,value);refuse(lambda bad=bad:policy.verify_pair(bad,s,after,1,new_attributes))
    bad=deepcopy(report);del bad['sourceReadbacks']['91'];refuse(lambda:policy.verify_preparation(bad,s,control))
check('four-frame actual/evaluated bits/group/flags/restore refusals',pair_refusals)

def reload_pair():
    row=deepcopy(rows['1']);row['domainFlagsBefore']=row['domainFlagsAfter']=[True,True]
    record={'kind':'corridor-source-prebake-observation-v1','observation':row}
    proof=policy.verify_bake_witness(record,s,after,new_attributes)
    assert proof['passed']and proof['freshFrame1Only']and proof['rechecked193RowsAfterReload']is False
    refuse(lambda:policy.verify_bake_witness(change(record,['observation','frame'],91),s,after,new_attributes))
    refuse(lambda:policy.verify_bake_witness(change(record,['kind'],'weighted-source-prebake-observation-v1'),s,after,new_attributes))
check('fresh saved-scene frame1 gate without invented193 re-evaluation',reload_pair)

def early_output():
    src={'cells':[{'id':'cell:10,16'},{'id':'cell:11,16'},{'id':'cell:10,17'},{'id':'cell:11,17'}],'contactBandHeight':.3}
    r=early_response([.5,-.25,0.,1.],[2,2,1],[-.25,-.25,.02],[.5,.5,.05],src,2,'flame')
    assert r['actualSolverOutput']and r['actualInputGridProof']is False
    assert sum(c['positive']for c in r['perCellLowerBand'].values())==2
    assert sum(c['negative']for c in r['perCellLowerBand'].values())==1
    assert sum(c['proxySum']for c in r['perCellLowerBand'].values())==1.25
    refuse(lambda:early_response([0.],[1,1,1],[0.,0.,.02],[.1]*3,src,4,'flame'))
    refuse(lambda:early_response([math.inf],[1,1,1],[0.,0.,.02],[.1]*3,src,1,'density'))
check('in-memory early D/F responses preserve negatives for unchanged raw validation',early_output)

def permits_reserves():
    paths=policy.registration_sources(HERE,ROOT,ROOT/'synthetic-tool.json',ROOT/'synthetic-claim.json')
    assert len(paths)==23 and len(set(paths))==23 and all('/../'not in p.replace('\\','/')for p in paths)
    assert str(ROOT/policy.BASELINE_SETTINGS_REL)in paths and str(HERE/'README-binding.md')in paths
    spec={'sourceFiles':paths,'restart':{'cwd':str(ROOT),'inputs':[]},'owners':[policy.OWNER],'purpose':'tiny synthetic reserve fixture'}
    identity={'pid':123,'creationFileTime':123456789,'executable':'synthetic-python.exe'}
    a=policy.registration_reserve(spec,identity,[10]*23,ROOT/'synthetic-registry')
    b=policy.registration_reserve(spec,identity,[10]*22+[1010],ROOT/'synthetic-registry')
    assert b['reservedBytes']-a['reservedBytes']==1000 and a['sourceCopyBytes']==230
    assert policy.unresolved_registration_charge([{'status':'inflight','budget':a}])==a['reservedBytes']
    assert policy.unresolved_registration_charge([{'status':'resolved','budget':a}])==4096
    refuse(lambda:policy.registration_reserve(spec,identity,[10]*22,ROOT))
    run=policy.new_deadline(100.,200.)
    assert policy.remaining_seconds(run,200.,100200.)==800.
    refuse(lambda:policy.remaining_seconds({**run,'deadlineEpoch':1100.},200.,100200.))
    refuse(lambda:policy.check_bake_permit_presence(True,'preparing',False))
    p={'version':1,'kind':'tinderbox-corridor-source-authorization-v1','phase':'prepare','owner':policy.OWNER,'proposalCommit':policy.PROPOSAL,'candidateCommit':'a'*40,'output':'fresh','sourcePins':{'a':'b'},'toolExeSha256':'c'*64,'originalBlendSha256':'d'*64,'authorizationPaths':{},'issuedAtEpoch':100.,'notAfterEpoch':200.,'nonce':'tiny-fixture-123'}
    policy.validate_permit(p,'prepare','fresh',{'a':'b'},'a'*40,150.)
    for key,value in [('proposalCommit',policy.SCIENTIFIC_PROPOSAL),('kind','tinderbox-weighted-source-authorization-v1'),('candidateCommit','b'*40),('output','old')]:refuse(lambda key=key,value=value:policy.validate_permit({**p,key:value},'prepare','fresh',{'a':'b'},'a'*40,150.))
check('exact23-source dynamic reserve, unresolved charging, unchanged deadline and bound permits',permits_reserves)

def attribute_oracle_refusals():
    assert verify_flat_attributes(old_attributes,25,23)['passed']and verify_flat_attributes(new_attributes,40,34)['sharpFaceTrueCount']==34
    assert len(verify_flat_provenance(old_attributes,new_attributes,plan)['faceProvenance'])==34
    structural=deepcopy(old_attributes);structural['attributes'][0].update({'domain':'REPORTED_DOMAIN','dataType':'REPORTED_TYPE','dataCount':999})
    observed_only=verify_flat_attributes(structural,25,23);assert observed_only['structuralSchemasInterpreted']is False and observed_only['structuralAttributes'][0]['dataCount']==999
    mutations=[(['attributes',7,'domain'],'POINT'),(['attributes',7,'dataType'],'INT'),(['attributes',7,'dataCount'],22),(['attributes',7,'values',0],1),(['attributes',7,'values',0],False),(['polygons',0,'useSmooth'],True),(['polygons',0,'materialIndex'],1),(['authoredRestrictions','uvLayerCount'],1),(['captureComplete'],False),(['captureErrors'],{}),(['attributes'],None)]
    for path,value in mutations:
        bad=change(old_attributes,path,value);refuse(lambda bad=bad:verify_flat_attributes(bad,25,23))
    bad=deepcopy(old_attributes);bad['attributes'].pop();bad['attributeCount']-=1;refuse(lambda:verify_flat_attributes(bad,25,23))
    bad=deepcopy(old_attributes);bad['attributes'].append(deepcopy(bad['attributes'][0]));bad['attributeCount']+=1;refuse(lambda:verify_flat_attributes(bad,25,23))
    bad=deepcopy(old_attributes);bad['attributes'].append({'name':'unexpected','domain':'POINT','dataType':'FLOAT','dataCount':25});bad['attributeCount']+=1;refuse(lambda:verify_flat_attributes(bad,25,23))
    extra=deepcopy(new_attributes);extra['attributes'].append({'name':'evaluated_only','domain':'POINT','dataType':'FLOAT','dataCount':40});extra['attributeCount']+=1
    refuse(lambda:verify_flat_attributes(extra,40,34))
    extra['meshName']='ReportedEvaluatedMeshName' # Not a new ID-name assumption beyond the seven geometric fields.
    proof=verify_flat_attributes(extra,40,34,evaluated=True);assert proof['evaluatedOnlyAttributes'][0]['name']=='evaluated_only'and proof['evaluatedExtrasAuthorizeDiscard']is False
    bad=deepcopy(plan);bad['mesh']['faces'][0]['sourceFace']=23;refuse(lambda:verify_flat_provenance(old_attributes,new_attributes,bad))
check('strict typed FACE/BOOLEAN/all-True, flat polygon, schema/count/unknown/duplicate and provenance refusals',attribute_oracle_refusals)

def attribute_gate_corruption():
    for path,value in [(['corridorInstall','attributePreflight','proof','faces'],24),(['corridorInstall','attributeCandidate','observation','attributes',7,'values',0],False),(['corridorInstall','attributeProvenance','proof','faceProvenance',0,'sourceFace'],22),(['corridorInstall','attributeAllocation','sourceSwapped'],True),(['sourceReadbacks','91','attributeGates','passed'],False),(['sourceReadbacks','1','attributeOrigin','attributes',7,'values',0],1)]:
        bad=change(report,path,value);refuse(lambda bad=bad:policy.verify_preparation(bad,s,control))
    row=deepcopy(rows['1']);row['attributeReadbacks']['original']['attributes'][7]['values'][0]=False
    refuse(lambda:policy.verify_bake_witness({'kind':'corridor-source-prebake-observation-v1','observation':row},s,after,new_attributes))
check('installed/selected/saved-reload attribute and provenance proof corruption refuses',attribute_gate_corruption)

# Minimal local fakes; never import/execute actual bpy or mathutils. Normalizers
# and deleters deliberately throw. They cannot make a bad input look valid.
def fake_attribute_run(old_mutation=None,new_mutation=None,fail_stage=None):
    from types import SimpleNamespace,ModuleType
    events=[];persisted=[];counters={'allocation':0,'swap':0,'vector':0,'normalizer':0}
    class Attributes(list):
        def new(self,*a,**kw):counters['normalizer']+=1;raise AssertionError('Normalizer forbidden')
        def remove(self,*a,**kw):counters['normalizer']+=1;raise AssertionError('Attribute delete forbidden')
    class Mesh:
        def __init__(self,name):
            self.name=name;self.materials=[];self.uv_layers=[];self.color_attributes=[];self.shape_keys=None;self.vertices=[];self.polygons=[];self.edges=[];self.loops=[];self.attributes=Attributes()
        def shade_flat(self):counters['normalizer']+=1;raise AssertionError('Old/new shading override forbidden')
        def build(self,positions,faces):
            self.vertices=[SimpleNamespace(index=i,co=list(p),groups=[])for i,p in enumerate(positions)]
            self.polygons=[SimpleNamespace(index=i,vertices=list(f),use_smooth=False,material_index=0)for i,f in enumerate(faces)]
            record=flat_record(len(positions),faces,self.name);self.edges=[None]*record['counts']['edges'];self.loops=[None]*record['counts']['corners']
            self.attributes=Attributes([SimpleNamespace(name=r['name'],domain=r['domain'],data_type=r['dataType'],data=[SimpleNamespace(value=v)for v in r['values']]if 'values'in r else[None]*r['dataCount'])for r in record['attributes']])
        def from_pydata(self,positions,edges,faces):
            events.append('construct');assert edges==[];self.build(positions,faces)
            if new_mutation:new_mutation(self)
        def update(self):pass
    class Matrix:
        def __iter__(self):return iter(IDENTITY)
        def __matmul__(self,p):return list(p)
    class Groups(list):
        def new(self,name):
            g=SimpleNamespace(name=name,index=0)
            def add(indices,value,mode):
                assert mode=='REPLACE'
                for i in indices:source.data.vertices[i].groups.append(SimpleNamespace(group=0,weight=f32(value)))
            g.add=add;self.append(g);return g
    class Source:
        def __init__(self,mesh):self._mesh=mesh;self.name=s['emissionWeights']['objectName'];self.matrix_world=Matrix();self.vertex_groups=Groups()
        @property
        def data(self):return self._mesh
        @data.setter
        def data(self,value):events.append('swap');counters['swap']+=1;self._mesh=value
    original=Mesh('SurfaceSource1893');original.build(plan['originalPositions'],s['emissionWeights']['triangleIndexMap']);source=Source(original)
    if old_mutation:old_mutation(original)
    flow=SimpleNamespace(density_vertex_group='',volume_density=0.0,use_absolute=True,use_plane_init=True,surface_distance=.5,flow_type='BOTH',bl_rna=SimpleNamespace(properties={'density_vertex_group':SimpleNamespace(is_readonly=False,type='STRING')}))
    def allocate(name):events.append('allocate');counters['allocation']+=1;return Mesh(name)
    fake_bpy=SimpleNamespace(data=SimpleNamespace(meshes=SimpleNamespace(new=allocate)))
    fake_math=ModuleType('mathutils');fake_math.__fake_fixture_only__=True
    def vector(p):counters['vector']+=1;return list(p)
    fake_math.Vector=vector
    def persist(stage,evidence):
        events.append('persist:'+stage)
        if stage==fail_stage:raise OSError('Synthetic persistence refusal')
        persisted.append((stage,deepcopy(evidence)))
    assert 'mathutils'not in sys.modules
    sys.modules['mathutils']=fake_math;result=error=None
    try:
        try:result=install(fake_bpy,source,flow,s,lambda:None,persist)
        except (AttributeRefused,OSError,BaseExceptionGroup)as exc:error=exc
    finally:del sys.modules['mathutils']
    assert counters['normalizer']==0
    return SimpleNamespace(result=result,error=error,events=events,persisted=persisted,counters=counters,original=original,source=source)

def fake_preflight_refusals():
    def unknown(mesh):mesh.attributes.append(type(mesh.attributes[0])(name='not_allowed',domain='POINT',data_type='FLOAT',data=[None]*25))
    a=fake_attribute_run(old_mutation=unknown);assert isinstance(a.error,AttributeRefused)and a.counters['allocation']==a.counters['swap']==a.counters['vector']==0 and a.source.data is a.original
    assert a.persisted[0][0]=='original'and a.persisted[0][1]['passed']is False and a.persisted[0][1]['observation']['attributes'][-1]['name']=='not_allowed'
    def wrong_domain(mesh):mesh.attributes[-1].domain='POINT'
    def wrong_typed_value(mesh):mesh.attributes[-1].data[0].value=1
    def missing(mesh):del mesh.attributes[-1]
    def smooth(mesh):mesh.polygons[0].use_smooth=True
    def duplicate(mesh):mesh.attributes.append(mesh.attributes[0])
    for mutate in [wrong_domain,wrong_typed_value,missing,smooth,duplicate]:
        r=fake_attribute_run(old_mutation=mutate)
        assert isinstance(r.error,AttributeRefused)and r.counters['allocation']==r.counters['vector']==r.counters['swap']==0
        assert r.persisted[0][1]['passed']is False and r.persisted[0][1]['observation']['captureComplete']is True
    b=fake_attribute_run(fail_stage='original');assert isinstance(b.error,OSError)and b.counters['allocation']==b.counters['vector']==b.counters['swap']==0
    c=fake_attribute_run(old_mutation=unknown,fail_stage='original');assert isinstance(c.error,BaseExceptionGroup)and len(c.error.exceptions)==2 and c.counters['allocation']==0
check('fake invalid old attributes/persistence refusal preserve evidence and cannot allocate/swap',fake_preflight_refusals)

def fake_candidate_refusals():
    def false_value(mesh):mesh.attributes[-1].data[0].value=False
    a=fake_attribute_run(new_mutation=false_value);assert isinstance(a.error,AttributeRefused)and a.counters['allocation']==1 and a.counters['swap']==0 and a.source.data is a.original
    assert [r[0]for r in a.persisted]==['original','candidate-allocation','candidate']and a.persisted[-1][1]['passed']is False
    assert a.events.index('persist:original')<a.events.index('allocate')<a.events.index('persist:candidate-allocation')<a.events.index('construct')<a.events.index('persist:candidate')
    b=fake_attribute_run(fail_stage='candidate');assert isinstance(b.error,OSError)and b.counters['swap']==0
    c=fake_attribute_run(fail_stage='candidate-allocation');assert isinstance(c.error,OSError)and c.counters['swap']==0 and 'construct'not in c.events
check('fake invalid regenerated values/persistence cannot reach source swap; allocation recorded separately',fake_candidate_refusals)

def fake_successful_semantics():
    a=fake_attribute_run();assert a.error is None and a.result['attributeGate']['passed']and a.counters['swap']==1
    assert [r[0]for r in a.persisted]==['original','candidate-allocation','candidate','candidate-provenance','installed']
    assert a.events.index('persist:candidate-provenance')<a.events.index('swap')<a.events.index('persist:installed')
    assert len(a.result['observation'])==7 and a.result['observation']==observation
    assert a.result['attributePreflight']['observation']==old_attributes
    assert a.result['attributeCandidate']['observation']==a.result['attributeInstalled']['observation']==new_attributes
check('fake complete install preserves seven geometric fields and independently regenerated all-flat semantics',fake_successful_semantics)

def partial_attribute_getter_facts():
    from types import SimpleNamespace
    def replacement(mode):
        reads={'name':0,'domain':0,'data_type':0,'data':0,'count':0}
        class Values:
            def __len__(self):
                reads['count']+=1
                if mode=='count':raise RuntimeError('synthetic unreadable count')
                return 23
            def __iter__(self):return iter([SimpleNamespace(value=True)for _ in range(23)])
        values=Values()
        class Attribute:
            @property
            def name(self):
                reads['name']+=1
                if mode=='name':raise RuntimeError('synthetic unreadable name')
                assert reads['name']==1;return 'sharp_face'
            @property
            def domain(self):reads['domain']+=1;assert reads['domain']==1;return 'FACE'
            @property
            def data_type(self):
                reads['data_type']+=1
                if mode=='type':raise RuntimeError('synthetic unreadable type')
                assert reads['data_type']==1;return 'BOOLEAN'
            @property
            def data(self):reads['data']+=1;assert reads['data']==1;return values
        return Attribute(),reads
    for mode in ['type','count','name']:
        attribute,reads=replacement(mode)
        result=fake_attribute_run(old_mutation=lambda mesh:setattr(mesh,'attributes',type(mesh.attributes)([*mesh.attributes[:-1],attribute])))
        assert isinstance(result.error,AttributeRefused)and result.counters['allocation']==result.counters['swap']==result.counters['vector']==0
        evidence=result.persisted[0][1];partial=evidence['observation']['attributes'][-1]
        assert evidence['passed']is False and evidence['observation']['captureComplete']is False
        assert partial['domain']=='FACE'and partial['name']==(None if mode=='name'else'sharp_face')
        assert partial['dataType']==(None if mode=='type'else'BOOLEAN')and partial['dataCount']==(None if mode=='count'else 23)
        assert evidence['observation']['captureErrors'][0]['message']=='synthetic unreadable '+mode
        assert reads=={'name':1,'domain':1,'data_type':1,'data':1,'count':1}
    attribute,reads=replacement(None)
    success=fake_attribute_run(old_mutation=lambda mesh:setattr(mesh,'attributes',type(mesh.attributes)([*mesh.attributes[:-1],attribute])))
    assert success.error is None and success.result['attributePreflight']['passed']and reads=={'name':1,'domain':1,'data_type':1,'data':1,'count':1}
    attribute,reads=replacement('type')
    failed_save=fake_attribute_run(old_mutation=lambda mesh:setattr(mesh,'attributes',type(mesh.attributes)([*mesh.attributes[:-1],attribute])),fail_stage='original')
    assert isinstance(failed_save.error,BaseExceptionGroup)and isinstance(failed_save.error.exceptions[0],AttributeRefused)
    assert failed_save.error.exceptions[0].observation['observation']['attributes'][-1]['name']=='sharp_face'and failed_save.counters['allocation']==0
check('independent readable attribute fields survive type/count/name faults, persist refusal and never allocate',partial_attribute_getter_facts)

def editor_layer(observation,name):return next(row for row in observation['attributes']if row['name']==name)
def without_editor(observation,names):
    r=deepcopy(observation);r['attributes']=[a for a in r['attributes']if a['name']not in names];r['attributeCount']=len(r['attributes']);return r

def editor_values_and_regeneration():
    result=fake_attribute_run();assert result.error is None
    actual=result.result['attributePreflight']['observation'];edge=editor_layer(actual,'.select_edge')
    assert edge['dataCount']==47 and len(edge['values'])==47 and True in edge['values']and False in edge['values']
    for bit in [True,False]:
        record=deepcopy(old_attributes)
        for name in ['.select_vert','.select_edge','.select_poly']:
            row=editor_layer(record,name);row['values']=[bit]*row['dataCount']
        assert verify_flat_attributes(record,25,23,require_editor_selection=True)['editorSelection']['.select_poly']['values']==[bit]*23
    candidate=deepcopy(new_attributes);editor_layer(candidate,'.select_vert')['values']=[True]*40
    proof=verify_flat_provenance(old_attributes,candidate,plan)['editorSelectionTransition']
    assert proof['disposition']=='regenerated-by-unchanged-constructor'and proof['oldToNewValueLineageClaimed']is False
    assert proof['original']['.select_vert']['dataCount']==25 and proof['candidate']['.select_vert']['dataCount']==40
check('complete mixed/True/False selection arrays including47edges, explicit regeneration without lineage',editor_values_and_regeneration)

def editor_schema_refusals():
    for name in ['.select_vert','.select_edge','.select_poly']:
        index=next(i for i,r in enumerate(old_attributes['attributes'])if r['name']==name)
        for suffix,value in [(['domain'],'WRONG'),(['dataType'],'FLOAT'),(['dataCount'],1),(['values'],[]),(['values',0],1)]:
            bad=change(old_attributes,['attributes',index,*suffix],value);refuse(lambda bad=bad:verify_flat_attributes(bad,25,23,require_editor_selection=True))
        for original in [old_attributes,new_attributes]:
            bad=without_editor(original,[name]);refuse(lambda bad=bad:verify_flat_attributes(bad,bad['counts']['vertices'],bad['counts']['faces'],require_editor_selection=True))
    bad=deepcopy(old_attributes);bad['attributes'].append(deepcopy(editor_layer(bad,'.select_edge')));bad['attributeCount']+=1;refuse(lambda:verify_flat_attributes(bad,25,23,require_editor_selection=True))
    bad=deepcopy(old_attributes);bad['attributes'].append({'name':'.select_custom','domain':'POINT','dataType':'BOOLEAN','dataCount':25});bad['attributeCount']+=1;refuse(lambda:verify_flat_attributes(bad,25,23,require_editor_selection=True))
check('only three exact selection schemas; malformed values/counts/missing/duplicates/unknowns refuse',editor_schema_refusals)

def editor_source_failures():
    from types import SimpleNamespace
    for name,limit in [('.select_vert',40),('.select_edge',102),('.select_poly',34)]:
        def overflow(mesh,name=name,limit=limit):next(a for a in mesh.attributes if a.name==name).data=[SimpleNamespace(value=True)for _ in range(limit+1)]
        result=fake_attribute_run(old_mutation=overflow)
        assert isinstance(result.error,AttributeRefused)and result.counters['allocation']==0 and result.counters['swap']==0
        partial=result.persisted[0][1]['observation'];assert partial['captureComplete']is False and len(editor_layer(partial,name)['values'])==limit
    def missing(mesh):mesh.attributes[:]=[a for a in mesh.attributes if a.name!='.select_edge']
    old=fake_attribute_run(old_mutation=missing);new=fake_attribute_run(new_mutation=missing)
    assert isinstance(old.error,AttributeRefused)and old.counters['allocation']==0
    assert isinstance(new.error,AttributeRefused)and new.counters['swap']==0
    class BrokenValue:
        @property
        def value(self):raise RuntimeError('synthetic unreadable selection value')
    def broken(mesh):next(a for a in mesh.attributes if a.name=='.select_edge').data[17]=BrokenValue()
    result=fake_attribute_run(old_mutation=broken);assert isinstance(result.error,AttributeRefused)and result.counters['allocation']==0
    partial=result.persisted[0][1]['observation'];assert partial['captureComplete']is False and editor_layer(partial,'.select_edge')['dataCount']==47 and len(editor_layer(partial,'.select_edge')['values'])==17
    failure=fake_attribute_run(old_mutation=missing,fail_stage='original');assert isinstance(failure.error,BaseExceptionGroup)and failure.counters['allocation']==0
check('bounded overflow/partial values and missing-source/persistence failures cannot allocate or swap',editor_source_failures)

def editor_anchor_and_evaluated():
    bad=deepcopy(installed);layer=editor_layer(bad['attributeInstalled']['observation'],'.select_edge');layer['values'][0]=not layer['values'][0]
    bad['attributeInstalled']['proof']=verify_flat_attributes(bad['attributeInstalled']['observation'],40,34,require_editor_selection=True)
    refuse(lambda:verify_install_attributes(bad,plan))
    row=deepcopy(rows['1']);layer=editor_layer(row['attributeReadbacks']['original'],'.select_vert');layer['values'][0]=not layer['values'][0]
    row['attributeAnchor']=deepcopy(row['attributeReadbacks']['original'])
    row['attributeGates']=verify_attribute_pair(row['attributeReadbacks'],plan,row['attributeOrigin'],row['attributeAnchor']) # Internally consistent forgery must still fail external anchor.
    refuse(lambda:policy.verify_bake_witness({'kind':'corridor-source-prebake-observation-v1','observation':row},s,after,new_attributes))
    bad=deepcopy(report);bad['sourceReadbacks']['91']=row;bad['sourceReadbacks']['91']['frame']=91;refuse(lambda:policy.verify_preparation(bad,s,control))
    missing=without_editor(new_attributes,['.select_vert','.select_edge','.select_poly']);before_copy=deepcopy(missing)
    proof=verify_attribute_pair({'original':new_attributes,'evaluated':missing},plan,old_attributes,new_attributes)
    assert all(r=={'present':False}for r in proof['evaluated']['editorSelection'].values())and missing==before_copy
    assert proof['originalSelectionMatchesInstalled']is True
    bad=deepcopy(new_attributes);editor_layer(bad,'.select_edge')['dataType']='FLOAT'
    refuse(lambda:verify_attribute_pair({'original':new_attributes,'evaluated':bad},plan,old_attributes,new_attributes))
check('external installed anchor defeats self-chosen reload data; evaluated presence/absence stays honest',editor_anchor_and_evaluated)

def segment(text,qualname):
    tree=ast.parse(text);node=tree
    for part in qualname.split('.'):
        node=next(n for n in node.body if isinstance(n,(ast.FunctionDef,ast.ClassDef))and n.name==part)
    return ast.get_source_segment(text,node)

def sampler_fixture(metadata,walked):
    # Compile only the function definition; never import supervisor/WinJob.
    from types import SimpleNamespace as N
    node=next(n for n in ast.parse((HERE/'supervisor.py').read_text()).body if isinstance(n,ast.FunctionDef)and n.name=='safe_tree_bytes')
    calls=[];counts={}
    class MemoryPath:
        def __init__(self,name):self.name=str(name)
        def __str__(self):return self.name
        def __truediv__(self,name):return MemoryPath(self.name+'/'+name)
        def lstat(self):
            calls.append(self.name);index=counts.get(self.name,0);counts[self.name]=index+1
            value=metadata[self.name]
            if type(value)is list:
                if index>=len(value):raise AssertionError('Unexpected second metadata lookup:'+self.name)
                value=value[index]
            elif index:raise AssertionError('Unexpected second metadata lookup:'+self.name)
            if isinstance(value,BaseException):raise value
            return N(st_mode=value[0],st_size=value[1],st_file_attributes=value[2])
        def stat(self):raise AssertionError('Following lookup forbidden')
        def is_symlink(self):raise AssertionError('Extra type lookup forbidden')
    class MemoryOS:
        @staticmethod
        def walk(folder,*,followlinks,onerror):
            assert str(folder)=='owned-root'and followlinks is False and callable(onerror)
            for row in walked:
                if isinstance(row,BaseException):onerror(row);raise AssertionError('Traversal error swallowed')
                yield row
    env={'Path':MemoryPath,'os':MemoryOS,'stat':stat}
    exec(compile(ast.Module(body=[node],type_ignores=[]),'scratch-sampler-memory-fixture','exec'),env)
    return lambda:env['safe_tree_bytes']('owned-root'),calls

def sampler_error(fn,expected_type,exact=None):
    global REFUSALS
    try:fn()
    except expected_type as error:
        if exact is not None:assert error is exact # Preserve original errno/WinError.
        REFUSALS+=1;return
    raise AssertionError('Expected strict scratch-sampler refusal')

DIR=(stat.S_IFDIR|0o700,0,0);REG=(stat.S_IFREG|0o600,32,0)
def scratch_stable_single_observation():
    f,calls=sampler_fixture({'owned-root':DIR,'owned-root/sub':DIR,'owned-root/progress.json':REG,'owned-root/progress.json.writing':(stat.S_IFREG|0o600,64,0),'owned-root/sub/data':(stat.S_IFREG|0o600,7,0)},[('owned-root',['sub'],['progress.json','progress.json.writing']),('owned-root/sub',[],['data'])])
    result=f();assert type(result)is int and result==103
    assert calls==['owned-root','owned-root/sub','owned-root/progress.json','owned-root/progress.json.writing','owned-root/sub/data']
    # A second file lstat/stat/type lookup would fail; no clamp at the cap.
    f,calls=sampler_fixture({'owned-root':DIR,'owned-root/large':(stat.S_IFREG|0o600,2*1024**3,0)},[('owned-root',[],['large'])]);assert f()==2*1024**3
check('scratch stable/present staging counts use one nonfollowing metadata observation',scratch_stable_single_observation)

def scratch_vanished_file():
    for name,windows in [('progress.json.writing',True),('ordinary-data',False)]:
        gone=FileNotFoundError(2,'synthetic enumerated file vanished',name)
        if windows:gone.winerror=2
        f,calls=sampler_fixture({'owned-root':[DIR,DIR],'owned-root/'+name:gone,'owned-root/stable':REG},[('owned-root',[],[name,'stable'])])
        assert f()==32 and calls==['owned-root','owned-root/'+name,'owned-root','owned-root/stable']
check('scratch file ENOENT/WinError2 alone permits zero after fresh plain parent validation',scratch_vanished_file)

def scratch_root_directory_and_walk_refusals():
    for error in [FileNotFoundError(2,'missing root'),PermissionError(13,'unreadable root')]:
        f,_=sampler_fixture({'owned-root':error},[]);sampler_error(f,type(error),error)
    for mode,attrs in [(stat.S_IFREG,0),(stat.S_IFLNK,0),(stat.S_IFDIR,0x400),(stat.S_IFIFO,0)]:
        f,_=sampler_fixture({'owned-root':(mode,0,attrs)},[]);sampler_error(f,RuntimeError)
    for entry in [FileNotFoundError(2,'missing directory'),PermissionError(13,'unreadable directory'),(stat.S_IFLNK,0,0),(stat.S_IFDIR,0,0x400),(stat.S_IFIFO,0,0)]:
        f,_=sampler_fixture({'owned-root':DIR,'owned-root/sub':entry},[('owned-root',['sub'],[])])
        sampler_error(f,type(entry)if isinstance(entry,BaseException)else RuntimeError,entry if isinstance(entry,BaseException)else None)
    error=PermissionError(13,'synthetic traversal failure');f,_=sampler_fixture({'owned-root':DIR},[error]);sampler_error(f,PermissionError,error)
    error=FileNotFoundError(2,'synthetic walked directory disappeared');error.winerror=3
    f,_=sampler_fixture({'owned-root':DIR},[error]);sampler_error(f,FileNotFoundError,error)
check('scratch missing/reparse/special roots and directories or traversal errors stay fatal',scratch_root_directory_and_walk_refusals)

def scratch_file_and_revalidated_parent_refusals():
    wrong_path=FileNotFoundError(2,'path not found');wrong_path.winerror=3
    wrong_win=FileNotFoundError(2,'other Windows error');wrong_win.winerror=5
    errors=[wrong_path,wrong_win,FileNotFoundError(3,'not ENOENT'),FileNotFoundError('unknown errno'),PermissionError(13,'file denied'),OSError(5,'file I/O')]
    for error in errors:
        f,calls=sampler_fixture({'owned-root':DIR,'owned-root/data':error},[('owned-root',[],['data'])]);sampler_error(f,type(error),error);assert calls==['owned-root','owned-root/data']
    for mode,attrs in [(stat.S_IFLNK,0),(stat.S_IFREG,0x400),(stat.S_IFIFO,0),(stat.S_IFDIR,0)]:
        f,_=sampler_fixture({'owned-root':DIR,'owned-root/data':(mode,32,attrs)},[('owned-root',[],['data'])]);sampler_error(f,RuntimeError)
    for parent in [FileNotFoundError(2,'parent missing'),PermissionError(13,'parent unreadable'),(stat.S_IFDIR,0,0x400),(stat.S_IFREG,0,0)]:
        gone=FileNotFoundError(2,'enumerated file vanished');gone.winerror=2
        f,calls=sampler_fixture({'owned-root':[DIR,parent],'owned-root/data':gone},[('owned-root',[],['data'])]);sampler_error(f,type(parent)if isinstance(parent,BaseException)else RuntimeError,parent if isinstance(parent,BaseException)else None);assert calls==['owned-root','owned-root/data','owned-root']
check('scratch WinError3/unknown/file errors and failed parent revalidation refuse unchanged',scratch_file_and_revalidated_parent_refusals)

def static_mechanisms():
    old=HERE.with_name('mantaflow-weighted-source');frozen=json.loads((HERE/'helper-provenance.json').read_text())
    for row in frozen['rawIdenticalPrimitives']:
        raw=(HERE/row['name']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256']and raw==(old/row['name']).read_bytes()
    for row in [*frozen['immutableWeightedSourceFiles'],*frozen['frozenCorridorFiles']]:
        raw=(ROOT/row['path']).read_bytes();exception=frozen['flatFaceAttributeAmendment']['authoringException']
        if row['path']==exception['path']:
            assert row['sha256']==exception['originalSha256']and row['gitBlob']==exception['originalGitBlob']
            assert len(raw)==exception['currentBytes']and hashlib.sha256(raw).hexdigest()==exception['currentSha256']
            assert exception['authority']=='25af559873dd15bb0a0fbc0c93f77c61f38a10f3'
        else:
            assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256']
            assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==row['gitBlob']
    for name,expected in frozen['flatFaceAttributeAmendment']['geometricFunctionHashes'].items():
        assert hashlib.sha256(segment((HERE/'authoring.py').read_text(),name).encode()).hexdigest()==expected
    assert (HERE/'authoring.py').read_text().count('source.data=mesh')==1
    assert 'attributes.remove'not in (HERE/'authoring.py').read_text()and 'attributes.new'not in (HERE/'authoring.py').read_text()
    for name in ['source_envelope','expected_inputs','new_deadline','remaining_seconds','terminal_report','check_bake_permit_presence','registration_reserve','unresolved_registration_charge','unique_json_pairs']:
        assert segment((HERE/'policy.py').read_text(),name)==segment((old/'policy.py').read_text(),name)
    for name in ['sha','save','once','create_owned_claim','owned_claim_bytes','join_and_record_limits','remaining_sampling_wait_ms','sample_and_record','utc','read_atomic_json','Controller.persist','Controller.guard','Controller.hide_startup','Controller.launch','Controller.wait','Controller.terminate_child','Controller.git_bytes','Controller.run_blender','Controller.finish','main']:
        assert segment((HERE/'supervisor.py').read_text(),name)==segment((old/'supervisor.py').read_text(),name),name
    supervisor=(HERE/'supervisor.py').read_text();sampler=frozen['scratchSamplingAmendment']
    assert hashlib.sha256(segment(supervisor,'safe_tree_bytes').encode()).hexdigest()==sampler['newSamplerSha256']
    assert supervisor.count(sampler['newImportLine'])==1
    restored=supervisor.replace(sampler['newImportLine'],sampler['oldImportLine'],1).replace(segment(supervisor,'safe_tree_bytes'),sampler['oldSamplerSource'],1)
    assert len(restored.encode())==sampler['parentSupervisorBytes']and hashlib.sha256(restored.encode()).hexdigest()==sampler['parentSupervisorSha256']
    inverse=frozen['editorSelectionAmendment']['supervisorArgumentInverse']
    assert restored.count(inverse['newCall'])==1
    assert hashlib.sha256(restored.replace(inverse['newCall'],inverse['oldCall']).encode()).hexdigest()==inverse['parentSha256']
    new=(HERE/'author.py').read_text();baseline=(old/'author.py').read_text()
    for name in ['sha','save','f32','set_observed','set_half_rate','Author.guard','Author.ready','Author.objects','Author.grid_input','main']:assert segment(new,name)==segment(baseline,name),name
    assert new.count('bpy.ops.fluid.bake_data()')==1 and new.count('early_response(values,')==1
    assert new.index('installed=install(')>new.index('source.data=mesh')and new.index('installed=install(')<new.index('for frame in range(1,194):')
    assert new.index('verify_bake_witness(loaded,')<new.index('bpy.ops.fluid.bake_data()')
    assert 'canonicalSource'not in new and 'actualClippedEmitter'in new and 'earlySolverResponses'in new
    assert 'inputE'not in new.replace('input-E','') # No new solver input-grid API.
check('raw-five primitives and unchanged lifecycle/terminal/clock function bodies',static_mechanisms)

def inventory_and_imports():
    pins=json.loads((HERE/'review-pins.json').read_text());assert list(pins['sourcePins'])==list(policy.CORE_FILES)and len(pins['sourcePins'])==16
    for n,h in pins['sourcePins'].items():assert hashlib.sha256((HERE/n).read_bytes()).hexdigest()==h
    allowed={Path(n).stem for n in policy.CORE_FILES if n.endswith('.py')}
    for name in ['author.py','policy.py','supervisor.py','prediction.py','grid.py','state.py','surface.py','weights.py','winjob.py']:
        t=ast.parse((HERE/name).read_text())
        for node in ast.walk(t):
            if isinstance(node,ast.ImportFrom)and node.module:
                assert node.level==0
                if node.module in allowed:assert (HERE/(node.module+'.py')).is_file()
        assert b'\r'not in (HERE/name).read_bytes()
    assert not {'bpy','mathutils','winjob','supervisor','author'}&set(sys.modules)
check('CORE16 pins/source closure and no tool/controller/OS imports during checks',inventory_and_imports)
def historical_current_math():
    # Execute the unchanged current check. Only its exact preserved final
    # pre-binding absence assertion is an expected refusal, NEVER a pass.
    frozen=json.loads((HERE/'helper-provenance.json').read_text())
    row=next(r for r in frozen['frozenCorridorFiles']if r['path'].endswith('/check.py'))
    raw=(HERE/'check.py').read_bytes();assert hashlib.sha256(raw).hexdigest()==row['sha256']
    namespace={'__file__':str(HERE/'check.py'),'__name__':'corridor_historical_pure_check'}
    try:exec(compile(raw,str(HERE/'check.py'),'exec'),namespace)
    except AssertionError as error:
        tail=error.__traceback__
        while tail.tb_next is not None:tail=tail.tb_next
        assert tail.tb_frame.f_code.co_name=='pins_and_scope'and tail.tb_lineno==193
        assert len(namespace['GROUPS'])==12 and namespace['REFUSALS']==34
    else:raise AssertionError('Historical pre-binding namespace check unexpectedly passed')
    print('HISTORICAL NAMESPACE REFUSAL retained (not a pass);12 substantive current groups /34 refusals completed')
check('all12 unchanged current geometry/weight/realization groups; historical namespace refusal is separate',historical_current_math)
print(json.dumps({'passedGroups':len(GROUPS),'refusals':REFUSALS,'historicalCurrentGroupsCompleted':12,'historicalCurrentRefusals':34,'historicalNamespaceCheckPassed':False,'scope':'tiny pure/synthetic source checks only','actualInputGridProof':False,'actualPreparation':False,'actualFieldsRead':False,'actualHelperStarted':False}))
