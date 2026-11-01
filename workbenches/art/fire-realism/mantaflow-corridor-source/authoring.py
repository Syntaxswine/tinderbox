"""Callable source-only seam for a LATER reviewed registered Author adapter.
No bpy import or CLI. Do not call under this source assignment. The existing
fresh-copy/cache/deadline/permit controller must own any future invocation.
"""
from fractions import Fraction as Q
import math,struct
from source import derive_plan,validate_settings,bits,f32
from realization import expected_realization,require_identity,words

# Same native-metre transform precision guard as frozen weighted author.py.
INHERITED_WORLD_PRECISION_METRES=1e-7
READBACK_FRAMES=(1,2,91,193)
BUILTIN_MESH_ATTRIBUTES={'position','.edge_verts','.corner_vert','.corner_edge'}

class ObservationRefused(ValueError):
    def __init__(self,message,observation):super().__init__(message);self.observation=observation

def matrix_record(matrix):return [[float(v) for v in row] for row in matrix]

def snapshot(source):
    """Copy plain values while data is valid; never clear borrowed evaluated.data."""
    mesh=source.data
    return {'objectName':source.name,'world':matrix_record(source.matrix_world),
            'localPositions':[[float(v) for v in p.co] for p in mesh.vertices],
            'worldPositions':[[float(v) for v in source.matrix_world@p.co] for p in mesh.vertices],
            'faces':[list(p.vertices) for p in mesh.polygons],
            'groups':[{'name':g.name,'index':int(g.index)} for g in source.vertex_groups],
            'vertices':[{'vertex':int(v.index),'memberships':[{'group':int(g.group),'weight':float(g.weight)} for g in v.groups]} for v in mesh.vertices]}

def verify_observation(observed,plan,expected_local,expected_world):
    """Exact expected stored representation; nominal penetration is separate."""
    try:
        if set(observed)!={'objectName','world','localPositions','worldPositions','faces','groups','vertices'}:raise ValueError('Unexpected stored source observation schema')
        require_identity(expected_world);require_identity(observed['world'])
        realized=expected_realization(plan,expected_world)
        if words(expected_local)!=realized['positionBitsLE']:raise ValueError('Caller expectation differs from independent expected float32 realization')
        mesh=plan['mesh'];profile=plan['derivedProfile']
        count=len(mesh['vertices'])
        if observed['objectName']!=profile['objectName'] or observed['world']!=expected_world:raise ValueError('Object/transform changed')
        if observed['faces']!=[f['indices'] for f in mesh['faces']]:raise ValueError('Face/index/winding/provenance mapping changed')
        if len(observed['localPositions'])!=count or len(observed['worldPositions'])!=count:raise ValueError('Stored vertex extent changed')
        if words(observed['localPositions'])!=realized['positionBitsLE'] or words(observed['worldPositions'])!=realized['positionBitsLE']:raise ValueError('Actual local/world coordinate bits differ from independent expected float32 realization')
        if any(len(p)!=3 or any(type(v)is not float or not math.isfinite(v) for v in p) for p in observed['worldPositions']):raise ValueError('Finite typed three-component stored world positions required')
        if max(p[2] for p in observed['worldPositions'])-min(p[2] for p in observed['worldPositions'])>1e-10:raise ValueError('Inherited flat-plane guard failed')
        maximum=max(abs(a-b) for p,v in zip(observed['worldPositions'],mesh['vertices']) for a,b in zip(p,v['position']))
        if maximum>INHERITED_WORLD_PRECISION_METRES:raise ValueError('Inherited native-world transform precision guard failed')
        for face in mesh['faces']:
            a,b,c=[observed['worldPositions'][i] for i in face['indices']]
            if (Q(b[0])-Q(a[0]))*(Q(c[1])-Q(a[1]))-(Q(b[1])-Q(a[1]))*(Q(c[0])-Q(a[0]))<=0:raise ValueError('Stored triangle degenerate/downward; no silent omission')
        expected_groups=[{'name':profile['groupName'],'index':profile['groupIndex']}]
        if observed['groups']!=expected_groups or len(observed['vertices'])!=count or type(observed['groups'][0]['index'])is not int:raise ValueError('Group/deform extent missing/collided')
        for i,row in enumerate(observed['vertices']):
            expected=[{'group':profile['groupIndex'],'weight':f32(profile['vertexWeights'][i]['weight'])}]
            if set(row)!={'vertex','memberships'} or type(row['vertex'])is not int or row['vertex']!=i or row['memberships']!=expected or type(row['memberships'][0]['group'])is not int or type(row['memberships'][0]['weight'])is not float or bits(row['memberships'][0]['weight'])!=plan['expectedFloat32WeightBits'][i]:raise ValueError('Complete derived-index float32 membership mismatch')
        return {'passed':True,'vertices':count,'faces':len(mesh['faces']),'maximumWorldErrorMetres':maximum,
                'expectedFloat32RealizationMatched':True,'strictOpenStripPassed':realized['strictOpenStripPassed'],'expectedRealization':realized,'effectiveInputGridProved':False}
    except (KeyError,TypeError,IndexError,ValueError) as exc:
        raise ObservationRefused(str(exc),observed) from exc

def install(bpy,source,flow,settings,guard):
    """Future hook AFTER old fresh25-vertex mesh creation, BEFORE group install.

    Caller must already own a permitted fresh scene/cache under the unchanged
    exercised controller. This function is not a process/authorization gate.
    It does not save a scene, animate, evaluate, bake, render or free a cache.
    """
    guard();s=validate_settings(settings);base=s['emissionWeights'];old=source.data
    if source.name!=base['objectName'] or len(old.vertices)!=25 or [list(p.vertices) for p in old.polygons]!=base['triangleIndexMap']:raise ValueError('Exact original freshly constructed emitter required')
    if list(source.vertex_groups) or any(list(v.groups) for v in old.vertices):raise ValueError('Original blank deform state required; never delete existing groups')
    flags={'density_vertex_group':'','volume_density':0.0,'use_absolute':True,'use_plane_init':True,'surface_distance':.5,'flow_type':'BOTH'}
    if any(getattr(flow,k)!=v or type(getattr(flow,k))is not type(v) for k,v in flags.items()):raise ValueError('Original flow flags changed')
    if len(old.materials) or len(old.uv_layers) or len(old.color_attributes) or old.shape_keys is not None or any(p.material_index!=0 or p.use_smooth for p in old.polygons):raise ValueError('Unexpected source material/UV/color/shape/smoothing attributes; refuse rather than discard')
    names={a.name for a in old.attributes}
    if not names.issubset(BUILTIN_MESH_ATTRIBUTES):raise ValueError('Unreviewed source mesh attributes; no silent discard')
    original_world=matrix_record(source.matrix_world);require_identity(original_world)
    wanted=[[x,y,s['source']['planeZ']] for x,y in s['source']['polygon']]
    observed=[[float(v) for v in source.matrix_world@p.co] for p in old.vertices]
    if max(abs(a-b) for p,q in zip(observed,wanted) for a,b in zip(p,q))>INHERITED_WORLD_PRECISION_METRES:raise ValueError('Original source world positions differ')
    # Identity makes original local/world coordinates identical; prove the old25
    # source representation before using its primitives, with no inverse fallback.
    original_expected=[[f32(v) for v in p] for p in wanted]
    if words(observed)!=words(original_expected):raise ValueError('Actual original source position bits differ from fixed expected float32 baseline')
    plan=derive_plan(s,original_positions=observed)
    realized=expected_realization(plan,original_world)
    expected_local=realized['positionsFloat32']
    # Expectation above is complete before the first tool-only Vector call.
    from mathutils import Vector
    local=[Vector(p) for p in expected_local]
    guard();mesh=bpy.data.meshes.new('CorridorSource1893')
    if mesh.name!='CorridorSource1893':raise ValueError('Fresh corridor mesh name collision; preserve failure')
    mesh.from_pydata(local,[],[f['indices'] for f in plan['mesh']['faces']]);mesh.update();source.data=mesh
    group=source.vertex_groups.new(name=base['groupName'])
    if group.name!=base['groupName'] or group.index!=0:raise ValueError('New group collision/index mismatch')
    for row in plan['derivedProfile']['vertexWeights']:guard();group.add([row['vertex']],row['weight'],'REPLACE')
    prop=flow.bl_rna.properties.get('density_vertex_group')
    if prop is None or prop.is_readonly or prop.type!='STRING':raise ValueError('Writable group selector RNA unavailable')
    flow.density_vertex_group=base['groupName']
    if flow.density_vertex_group!=base['groupName']:raise ValueError('Actual group selector mismatch')
    guard();record=snapshot(source);gate=verify_observation(record,plan,expected_local,original_world)
    return {'kind':'corridor-source-install-observation-v1','plan':plan,'originalWorld':original_world,'expectedLocalFloat32':expected_local,
            'observation':record,'expectedRealization':realized,'geometryAndGroupGate':gate,'originalMeshPreservedNotFreed':old.name,'effectiveInputGridProved':False}

def observe_pair(bpy,scene,domain,source,flow,installed,guard):
    """Future four-frame/reloaded-scene gate; borrowed data captured before restore."""
    guard()
    if scene.frame_current not in READBACK_FRAMES:raise ValueError('Only explicit reviewed readback frames supported')
    dm=domain.modifiers['MantaflowContactGas'];before=[dm.show_viewport,dm.show_render];record=None;primary=None;restore_errors=[]
    try:
        dm.show_viewport=False;dm.show_render=False;guard();bpy.context.view_layer.update()
        evaluated=source.evaluated_get(bpy.context.evaluated_depsgraph_get())
        if getattr(evaluated,'is_evaluated',None)is not True:raise ValueError('Actual evaluated source unavailable; no original fallback')
        record={'frame':int(scene.frame_current),'original':snapshot(source),'evaluated':snapshot(evaluated),'domainFlagsBefore':before,
                'domainFlagsDuring':[dm.show_viewport,dm.show_render],
                'flowFlags':{k:getattr(flow,k) for k in ['density_vertex_group','volume_density','use_absolute','use_plane_init','surface_distance','flow_type']}}
        guard()
    except BaseException as exc:primary=exc
    finally:
        for name,value in zip(['show_viewport','show_render'],before):
            try:setattr(dm,name,value)
            except BaseException as exc:restore_errors.append(exc)
    if restore_errors:raise BaseExceptionGroup('Corridor observation/isolation restoration failed',([primary] if primary is not None else [])+restore_errors)
    if primary is not None:raise primary
    record['domainFlagsAfter']=[dm.show_viewport,dm.show_render]
    if record['domainFlagsDuring']!=[False,False] or record['domainFlagsAfter']!=before:raise ObservationRefused('Isolation restoration mismatch',record)
    p=installed['plan'];profile=p['derivedProfile'];flags={'density_vertex_group':profile['groupName'],'volume_density':0.0,'use_absolute':True,'use_plane_init':True,'surface_distance':.5,'flow_type':'BOTH'}
    if record['flowFlags']!=flags or any(type(record['flowFlags'][k])is not type(v) for k,v in flags.items()):raise ObservationRefused('Flow selector/flags changed',record)
    record['gates']={k:verify_observation(record[k],p,installed['expectedLocalFloat32'],installed['originalWorld']) for k in ['original','evaluated']}
    if record['original']!=record['evaluated']:raise ObservationRefused('Evaluated source differs from original',record)
    record['effectiveInputGridProved']=False
    return record
