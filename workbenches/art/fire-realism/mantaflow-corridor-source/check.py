"""Tiny source/geometry fixtures only. Never calls authoring.install/observe_pair."""
import ast,hashlib,json,math,struct,sys
from copy import deepcopy
from fractions import Fraction as Q
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];sys.path.insert(0,str(HERE))
from clipping import clip_mesh
from source import load_settings,validate_settings,derive_plan,bits,f32,canonical
from authoring import verify_observation,ObservationRefused
from realization import expected_realization,IDENTITY,words
GROUPS=[];REFUSALS=0

def check(name,fn):
    fn();GROUPS.append(name);print('PASS '+name)
def refuse(fn):
    global REFUSALS
    try:fn()
    except (ValueError,TypeError,KeyError,IndexError):REFUSALS+=1;return
    raise AssertionError('Expected fail-closed refusal')
def area(points):
    a,b,c=points;return abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2

def square():
    return clip_mesh([[0,0,0],[2,0,0],[2,2,0],[0,2,0]],[[0,1,2],[0,2,3]],{'weight':[0.,1.,1.,0.],'marker':[0.,6.,10.,4.]},[1,0],.5,1.5)
def square_oracle():
    m=square();assert Q(m['originalAreaExact'])==4;assert Q(m['retainedAreaExact'])==2;assert Q(m['removedAreaExact'])==2
    assert Q(m['retainedSurfaceWeightIntegralExact'])==1
    for v in m['vertices']:
        x,y,z=map(Q,v['exactPosition']);assert Q(v['exactAttributes']['weight'])==x/2;assert Q(v['exactAttributes']['marker'])==3*x+2*y
check('independent rectangle area and affine attribute integral oracle',square_oracle)

def provenance_oracle():
    positions=[[Q(0),Q(0),Q(0)],[Q(2),Q(0),Q(0)],[Q(2),Q(2),Q(0)],[Q(0),Q(2),Q(0)]];original=[[0,1,2],[0,2,3]];m=square();total=Q(0)
    for face in m['faces']:
        tri=original[face['sourceFace']];out=[]
        for idx,row in zip(face['indices'],face['barycentric']):
            b=list(map(Q,row));assert min(b)>=0 and sum(b)==1
            p=[sum(b[k]*positions[tri[k]][j] for k in range(3)) for j in range(3)];assert p==list(map(Q,m['vertices'][idx]['exactPosition']));out.append(p)
            assert p[0]<=Q(1,2) if face['side']=='negative' else p[0]>=Q(3,2)
        total+=area(out)
    assert total==2
    assert sorted(i for r in m['sourceFaces'] for i in r['outputFaces'])==list(range(len(m['faces'])))
check('exact barycentric position and complete original-face provenance',provenance_oracle)

def intact_and_winding():
    p=[[-2,0,0],[-1,0,0],[-2,1,0]]
    a=clip_mesh(p,[[0,1,2]],{'weight':[.25,.5,1.]},[1,0],0,1)
    b=clip_mesh(p,[[2,1,0]],{'weight':[.25,.5,1.]},[1,0],0,1)
    assert [v['position'] for v in a['vertices']]==p;assert len(a['faces'])==len(b['faces'])==1
    for m,sign in [(a,1),(b,-1)]:
        v=[list(map(Q,m['vertices'][i]['exactPosition'])) for i in m['faces'][0]['indices']];x,y,z=v
        assert ((y[0]-x[0])*(z[1]-x[1])-(y[1]-x[1])*(z[0]-x[0]))*sign>0
check('unchanged outside triangle and preserved CW/CCW winding',intact_and_winding)

def boundary_cases():
    p=[[.5,0,0],[.5,1,0],[0,0,0]];m=clip_mesh(p,[[0,1,2]],{'weight':[1.,1.,1.]},[1,0],.5,1.5);assert Q(m['retainedAreaExact'])==Q(1,4)
    p=[[.5,0,0],[1,1,0],[1,0,0],[-1,0,0],[-.5,0,0],[-1,1,0]]
    m=clip_mesh(p,[[0,1,2],[3,4,5]],{'weight':[1.]*6},[1,0],.5,1.5)
    assert any(r['reason']=='boundary-only point/edge' for r in m['zeroAreaBoundaryPieces'])
    assert Q(m['sourceFaces'][0]['retainedAreaExact'])==0
    m=clip_mesh([[0,0,0],[1,0,0],[2,1e-20,0]],[[0,1,2]],{'weight':[1.]*3},[1,0],3,4)
    assert Q(m['retainedAreaExact'])>0
check('closed boundary/tangent handling and no near-zero epsilon filter',boundary_cases)

def input_refusals():
    p=[[0,0,0],[1,0,0],[0,1,0]];f=[[0,1,2]];a={'weight':[1.]*3}
    for pos,faces,attrs,n,lo,hi in [(p,[[0,0,2]],a,[1,0],-.1,.1),(p,f+f,a,[1,0],-.1,.1),([[0,0,0],[1,0,0],[2,0,0]],f,a,[1,0],-.1,.1),
       ([[0,0,0],[1,0,0],[0,1,.1]],f,a,[1,0],-.1,.1),([[0,0,0],[math.nan,0,0],[0,1,0]],f,a,[1,0],-.1,.1),
       (p,f,{'weight':[1.,1.]},[1,0],-.1,.1),(p,f,{'weight':[1.,-1.,1.]},[1,0],-.1,.1),(p,f,a,[0,0],-.1,.1),(p,f,a,[1,0],1,1),
       (p,f,a,[1,0],math.inf,2),(p,f,a,[True,0],-.1,.1),(p,f,a,[1,0],-1,2)]:
        refuse(lambda pos=pos,faces=faces,attrs=attrs,n=n,lo=lo,hi=hi:clip_mesh(pos,faces,attrs,n,lo,hi))
check('degenerate/duplicate/nonfinite/type/extent/empty-source refusals',input_refusals)

SETTINGS=load_settings();PLAN=derive_plan(SETTINGS)
def fixed_settings():
    for key,value in [('globalVorticity',.5),('inflowOffAge',3.3),('substeps',3)]:
        s=deepcopy(SETTINGS);s['simulation'][key]=value;refuse(lambda s=s:validate_settings(s))
    for change in ['weight','polygon','curve','width','extra']:
        s=deepcopy(SETTINGS)
        if change=='weight':s['emissionWeights']['vertexWeights'][0]['weight']=.5
        elif change=='polygon':s['source']['polygon'][0][0]+=.01
        elif change=='curve':s['simulation']['withdrawalStart']=2.9
        elif change=='width':s['corridor']['upperVoxels']=5
        else:s['corridor']['epsilon']=1e-6
        refuse(lambda s=s:validate_settings(s))
check('full normalized baseline recipe and fixed one-corridor refusals',fixed_settings)

def fixed_mesh():
    m=PLAN['mesh'];assert len(m['vertices'])==40 and len(m['faces'])==34 and len(m['sourceFaces'])==23
    assert Q(m['originalAreaExact'])==Q(m['retainedAreaExact'])+Q(m['removedAreaExact']) and Q(m['removedAreaExact'])>0
    p=[[Q(v) for v in row]+[Q(SETTINGS['source']['planeZ'])] for row in SETTINGS['source']['polygon']]
    weights=[Q(r['weight']) for r in SETTINGS['emissionWeights']['vertexWeights']]
    for face in m['faces']:
        original=SETTINGS['emissionWeights']['triangleIndexMap'][face['sourceFace']]
        for index,row in zip(face['indices'],face['barycentric']):
            b=list(map(Q,row));v=m['vertices'][index]
            assert list(map(Q,v['exactPosition']))==[sum(b[k]*p[original[k]][j] for k in range(3)) for j in range(3)]
            assert Q(v['exactAttributes']['weight'])==sum(b[k]*weights[original[k]] for k in range(3))
    assert PLAN['actualScenePrepared']is False and PLAN['effectiveInputGridProved']is False
check('fixed40-vertex/34-triangle source-only plan and all original affine weights',fixed_mesh)

def stored_original_fixture():
    positions=[[f32(x),f32(y),f32(SETTINGS['source']['planeZ'])] for x,y in SETTINGS['source']['polygon']]
    p=derive_plan(SETTINGS,original_positions=positions);assert p['originalPositions']==positions and p['originalPositionBasis']=='observed-original-world-primitives'
    bad=deepcopy(positions);bad[0][0]+=.01;refuse(lambda:derive_plan(SETTINGS,original_positions=bad))
    assert p['actualScenePrepared']is False
check('synthetic float32 original primitive preservation, not an actual scene read',stored_original_fixture)

def observation_fixture(boundary=False):
    positions=[[-.5,-.5,.02],[.1 if boundary else -.25,-.5,.02],[-.5,-.25,.02]]
    m=clip_mesh(positions,[[0,1,2]],{'weight':[.25,.5,1.]},[1,0],.1 if boundary else -.125,.25)
    w=[v['attributes']['weight'] for v in m['vertices']];profile={'objectName':'CanonicalFourCellBed','groupName':'TinderboxSurfaceFeed1893','groupIndex':0,'vertexWeights':[{'vertex':i,'weight':v} for i,v in enumerate(w)]}
    plan={'mesh':m,'derivedProfile':profile,'expectedFloat32WeightBits':[bits(v) for v in w]};local=[[f32(v) for v in p['position']] for p in m['vertices']];world=[[float(i==j) for j in range(4)] for i in range(4)]
    observed={'objectName':profile['objectName'],'world':world,'localPositions':deepcopy(local),'worldPositions':deepcopy(local),'faces':[f['indices'] for f in m['faces']],
              'groups':[{'name':profile['groupName'],'index':0}],'vertices':[{'vertex':i,'memberships':[{'group':0,'weight':f32(v)}]} for i,v in enumerate(w)]}
    return observed,plan,local,world

def observed_gate():
    o,p,l,w=observation_fixture();assert verify_observation(o,p,l,w)['passed']is True
    for mutation in ['extra','world','face','missing','group','bool','nan']:
        a=deepcopy(o)
        if mutation=='extra':a['ignored']=True
        elif mutation=='world':a['world'][0][0]=2.
        elif mutation=='face':a['faces'][0].reverse()
        elif mutation=='missing':a['vertices'][0]['memberships']=[]
        elif mutation=='group':a['groups'][0]['name']+='.001'
        elif mutation=='bool':a['vertices'][0]['memberships'][0]['group']=False
        else:a['worldPositions'][0][0]=math.nan
        refuse(lambda a=a:verify_observation(a,p,l,w))
check('plain readback topology/group/float32/transform/type refusal witness',observed_gate)

def storage_boundary():
    o,p,l,w=observation_fixture(boundary=True);gate=verify_observation(o,p,l,w)
    assert gate['passed']is True and gate['expectedFloat32RealizationMatched']is True
    assert gate['strictOpenStripPassed']is False
    realized=gate['expectedRealization'];assert realized['nominalRationalCertified']is True and realized['nominalCrossingCount']>0
    expected=Q(f32(.1))-Q(.1);assert expected>0
    assert Q(realized['maximumNominalPenetrationExact'])==expected
    assert realized['roundingToleranceUsed']is False
check('inward boundary rounding reported truthfully and exact realization separately matched',storage_boundary)

def recorded_original():
    intended=expected_realization(PLAN,IDENTITY);assert intended['nominalCrossingCount']==10 and intended['strictOpenStripPassed']is False
    positions=[[f32(x),f32(y),f32(SETTINGS['source']['planeZ'])] for x,y in SETTINGS['source']['polygon']]
    payload={'vertices':positions,'polygons':SETTINGS['emissionWeights']['triangleIndexMap']}
    assert hashlib.sha256(json.dumps(payload,separators=(',',':')).encode()).hexdigest()=='20ff4e997b3ab044871268963d3c145834d378ce00a1b5535d5f69ac647c91d5'
    plan=derive_plan(SETTINGS,original_positions=positions);realized=expected_realization(plan,IDENTITY)
    assert realized['nominalCrossingCount']==8 and realized['maximumNominalPenetrationMetres']==6.6544191192046895e-9
    assert realized['positionBitsLE']==words(realized['positionsFloat32'])
    # Independent old barycentric-local arithmetic equals the new nominal-world
    # realization under this recorded identity; neither path changes a weight.
    for face in plan['mesh']['faces']:
        original=SETTINGS['emissionWeights']['triangleIndexMap'][face['sourceFace']]
        for index,row in zip(face['indices'],face['barycentric']):
            b=list(map(Q,row));local=[sum(b[k]*Q(positions[original[k]][j]) for k in range(3)) for j in range(3)]
            assert [bits(float(v)) for v in local]==realized['positionBitsLE'][index]
            weight=sum(b[k]*Q(SETTINGS['emissionWeights']['vertexWeights'][original[k]]['weight']) for k in range(3))
            assert bits(float(weight))==plan['expectedFloat32WeightBits'][index]
    assert len(realized['signedCoordinateErrors'])==40 and len(realized['perSide'])==40
check('fixed intended and metadata-hash-bound original float32 models',recorded_original)

def wrong_bits_or_expectation():
    o,p,l,w=observation_fixture()
    def next_word(v):
        code=struct.unpack('<I',struct.pack('<f',v))[0]
        return struct.unpack('<f',struct.pack('<I',code+1))[0]
    a=deepcopy(o);a['localPositions'][0][0]=next_word(a['localPositions'][0][0]);assert abs(a['localPositions'][0][0]-o['localPositions'][0][0])<1e-7
    refuse(lambda:verify_observation(a,p,l,w))
    a=deepcopy(o);a['worldPositions'][0][0]=next_word(a['worldPositions'][0][0]);refuse(lambda:verify_observation(a,p,l,w))
    a=deepcopy(o);fake=deepcopy(l);fake[0][0]=next_word(fake[0][0]);a['localPositions']=deepcopy(fake);a['worldPositions']=deepcopy(fake)
    try:verify_observation(a,p,fake,w)
    except ObservationRefused as exc:
        assert 'Caller expectation' in str(exc);assert exc.observation is a
    else:raise AssertionError('Caller cannot approve a falsified expected representation')
    refuse(lambda:verify_observation(a,p,fake,w))
    nonidentity=deepcopy(w);nonidentity[0][3]=1e-12;a=deepcopy(o);a['world']=nonidentity
    refuse(lambda:verify_observation(a,p,l,nonidentity));refuse(lambda:expected_realization(p,nonidentity))
    typed=deepcopy(w);typed[0][0]=True;refuse(lambda:expected_realization(p,typed))
check('one-ULP stored errors, falsified caller expectations and nonidentity refuse',wrong_bits_or_expectation)

def pins_and_scope():
    prov=json.loads((HERE/'provenance.json').read_text(encoding='utf-8'))
    for row in prov['immutableSourceFiles']:
        b=(ROOT/row['path']).read_bytes();assert len(b)==row['bytes'] and hashlib.sha256(b).hexdigest()==row['sha256']
        assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==row['gitBlob']
    assert len(prov['immutableSourceFiles'])==17
    assert json.loads((HERE/'source-plan.json').read_text(encoding='utf-8'))==PLAN
    for name in ['clipping.py','source.py','authoring.py','realization.py','check.py']:
        tree=ast.parse((HERE/name).read_text(encoding='utf-8'),filename=name)
        assert not any(isinstance(n,ast.Import)and any(a.name=='bpy' for a in n.names) for n in ast.walk(tree))
        compile(tree,name,'exec')
    assert not (HERE/'supervisor.py').exists() and not (HERE/'winjob.py').exists()
    assert prov['reuse']['actualExecutionEntry']is None
check('17 raw/Git source pins, deterministic plan, five ASTs and no new runner',pins_and_scope)
print(json.dumps({'kind':'corridor-pure-source-check-v1','groups':len(GROUPS),'refusals':REFUSALS,'passed':GROUPS,'actualBlenderOrFieldsOrFeedOrNativeProof':False},sort_keys=True))
