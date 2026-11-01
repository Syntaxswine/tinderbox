"""Tiny source/model fixtures; no bpy, mathutils, winjob or controller import.
Uses synthetic state and a16x16x1 geometric fixture, not actual scene/field data.
"""
import ast,hashlib,json,math,struct,sys
from copy import deepcopy
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];sys.path.insert(0,str(HERE))
import policy
from source import load_settings,f32,digest
from realization import IDENTITY,words
from authoring import verify_observation
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
rows={str(f):{'frame':f,'original':deepcopy(observation),'evaluated':deepcopy(observation),'flowFlags':deepcopy(flags),'domainFlagsBefore':[False,False],'domainFlagsDuring':[False,False],'domainFlagsAfter':[False,False],
 'gates':{'original':deepcopy(gate),'evaluated':deepcopy(gate)},'effectiveInputGridProved':False}for f in [1,2,91,193]}
opened=policy.compare_original(control,before,'fresh');prepared=policy.compare_prepared(control,after,'fresh',s)
report={'cacheRedirectBeforeEvaluation':{'newObserved':'fresh'},'baselineActualState':before,'preparedActualState':after,
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
        bad=change(rows['1'],path,value);refuse(lambda bad=bad:policy.verify_pair(bad,s,after,1))
    bad=deepcopy(report);del bad['sourceReadbacks']['91'];refuse(lambda:policy.verify_preparation(bad,s,control))
check('four-frame actual/evaluated bits/group/flags/restore refusals',pair_refusals)

def reload_pair():
    row=deepcopy(rows['1']);row['domainFlagsBefore']=row['domainFlagsAfter']=[True,True]
    record={'kind':'corridor-source-prebake-observation-v1','observation':row}
    proof=policy.verify_bake_witness(record,s,after)
    assert proof['passed']and proof['freshFrame1Only']and proof['rechecked193RowsAfterReload']is False
    refuse(lambda:policy.verify_bake_witness(change(record,['observation','frame'],91),s,after))
    refuse(lambda:policy.verify_bake_witness(change(record,['kind'],'weighted-source-prebake-observation-v1'),s,after))
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

def segment(text,qualname):
    tree=ast.parse(text);node=tree
    for part in qualname.split('.'):
        node=next(n for n in node.body if isinstance(n,(ast.FunctionDef,ast.ClassDef))and n.name==part)
    return ast.get_source_segment(text,node)

def static_mechanisms():
    old=HERE.with_name('mantaflow-weighted-source');frozen=json.loads((HERE/'helper-provenance.json').read_text())
    for row in frozen['rawIdenticalPrimitives']:
        raw=(HERE/row['name']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256']and raw==(old/row['name']).read_bytes()
    for row in [*frozen['immutableWeightedSourceFiles'],*frozen['frozenCorridorFiles']]:
        raw=(ROOT/row['path']).read_bytes();assert len(raw)==row['bytes']and hashlib.sha256(raw).hexdigest()==row['sha256']
        assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==row['gitBlob']
    for name in ['source_envelope','expected_inputs','new_deadline','remaining_seconds','terminal_report','check_bake_permit_presence','registration_reserve','unresolved_registration_charge','unique_json_pairs']:
        assert segment((HERE/'policy.py').read_text(),name)==segment((old/'policy.py').read_text(),name)
    for name in ['sha','save','once','create_owned_claim','owned_claim_bytes','join_and_record_limits','remaining_sampling_wait_ms','sample_and_record','utc','safe_tree_bytes','read_atomic_json','Controller.persist','Controller.guard','Controller.hide_startup','Controller.launch','Controller.wait','Controller.terminate_child','Controller.git_bytes','Controller.run_blender','Controller.finish','main']:
        assert segment((HERE/'supervisor.py').read_text(),name)==segment((old/'supervisor.py').read_text(),name),name
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
