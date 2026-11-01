"""Fixed source recipe/plan. Reads only committed authoring settings, never scenes/fields."""
from copy import deepcopy
from pathlib import Path
from fractions import Fraction as Q
import hashlib,json,struct,math
from clipping import clip_mesh

HERE=Path(__file__).resolve().parent
BASELINE=HERE.with_name('mantaflow-weighted-source')/'settings.json'
BASELINE_SHA='c60d9a76c306d04a21fc97733a00d69c45e4e8dd280de6d5c141af518bdd6a40'
PROPOSAL='f915375c4f8df71dbb1a9e1f932406e7e10a32b6'
CORRIDOR={'id':'resolved-diagonal-open-strip-v1','hMetres':.0416666679084301,'normalXY':[.768221279597376,.640184399664480],
          'lowerVoxels':-2,'upperVoxels':4,'attributeRule':'original-face-barycentric','predicateRule':'exact-binary-rational',
          'unknownActualGates':['evaluated-mesh','four-cell-kernel-feed','full-field-support-and-rays','terminal-before-or-at3.2','native-morphology']}

def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'),allow_nan=False)
def digest(v):return hashlib.sha256(canonical(v).encode()).hexdigest()
def f32(v):return struct.unpack('<f',struct.pack('<f',v))[0]
def bits(v):return struct.pack('<f',v).hex()
def unique(pairs):
    result={}
    for key,value in pairs:
        if key in result:raise ValueError('Duplicate settings key')
        result[key]=value
    return result

def baseline():
    raw=BASELINE.read_bytes()
    if len(raw)!=9676 or hashlib.sha256(raw).hexdigest()!=BASELINE_SHA:raise ValueError('Immutable weighted baseline settings mismatch')
    return json.loads(raw,object_pairs_hook=unique)

def load_settings(path=HERE/'settings.json'):
    return validate_settings(json.loads(Path(path).read_text(encoding='utf-8'),object_pairs_hook=unique))

def validate_settings(settings):
    old=baseline();s=deepcopy(settings)
    if set(s)!=set(old)|{'corridor'}:raise ValueError('Exact baseline plus corridor settings required')
    if s['id']!='tinderbox-mantaflow-corridor-source' or s['status']!='SOURCE_ONLY_NOT_PREPARED' or s['proposalCommit']!=PROPOSAL:raise ValueError('Unexpected corridor identity/authority')
    if canonical(s.pop('corridor'))!=canonical(CORRIDOR):raise ValueError('Only the fixed accepted6h/+h corridor is supported')
    for key in ['id','status','proposalCommit']:s[key]=old[key]
    if canonical(s)!=canonical(old):raise ValueError('Non-geometric weighted recipe changed')
    return deepcopy(settings)

def derive_plan(settings,original_positions=None):
    s=validate_settings(settings);src=s['source'];profile=s['emissionWeights'];c=s['corridor']
    weights=profile['vertexWeights']
    if [r['vertex'] for r in weights]!=list(range(25)):raise ValueError('Frozen original25 mapping required')
    positions=[[x,y,src['planeZ']] for x,y in src['polygon']]
    if original_positions is not None:
        if len(original_positions)!=25 or any(len(p)!=3 or any(type(v)is not float or not math.isfinite(v) for v in p) for p in original_positions):raise ValueError('Complete finite actual original positions required')
        if max(abs(a-b) for p,q in zip(original_positions,positions) for a,b in zip(p,q))>1e-7:raise ValueError('Observed original differs from inherited native-world precision gate')
        positions=deepcopy(original_positions)
    mesh=clip_mesh(positions,profile['triangleIndexMap'],{'weight':[r['weight'] for r in weights]},
                   c['normalXY'],c['lowerVoxels']*c['hMetres'],c['upperVoxels']*c['hMetres'])
    if Q(mesh['removedAreaExact'])<=0 or Q(mesh['retainedAreaExact'])<=0:raise ValueError('Actual nonempty geometric corridor/remnant required')
    for face in mesh['faces']:
        original=profile['triangleIndexMap'][face['sourceFace']]
        if len(set(original))!=3:raise ValueError('Invalid source-face provenance')
    derived={**deepcopy(profile),'id':'corridor-barycentric-deform-v1','vertexCount':len(mesh['vertices']),
             'vertexWeights':[{'vertex':i,'weight':v['attributes']['weight']} for i,v in enumerate(mesh['vertices'])],
             'triangleIndexMap':[f['indices'] for f in mesh['faces']],
             'deliberateZeroIndices':[i for i,v in enumerate(mesh['vertices']) if v['attributes']['weight']==0],
             'rationale':'Pointwise inherited from original face; no dose compensation or field/visual proof.'}
    return {'kind':'fixed-corridor-authoring-plan-v1','proposalCommit':PROPOSAL,'baselineSettingsSha256':BASELINE_SHA,'settingsCanonicalSha256':digest(s),
            'originalPositionBasis':'intended-settings' if original_positions is None else 'observed-original-world-primitives','originalPositions':positions,
            'mesh':mesh,'derivedProfile':derived,'expectedFloat32WeightBits':[bits(r['weight']) for r in derived['vertexWeights']],
            'preservedOriginalPolygon':deepcopy(src['polygon']),'preservedOriginalTriangles':deepcopy(profile['triangleIndexMap']),
            'unprovedActualGates':deepcopy(c['unknownActualGates']),'actualScenePrepared':False,'effectiveInputGridProved':False,
            'coupledInput':'Removed feed reduces/couples fuel,density,react/heat gates and fuel-driven local vorticity; not dose matched.',
            'storageLimit':'Rational intended intersections are authoritative here. Future float32 local/world/evaluated storage must be observed and strictly checked; no automatic offset/epsilon repair.'}
