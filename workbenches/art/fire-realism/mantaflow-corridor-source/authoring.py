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


class AttributeRefused(ObservationRefused):
    """Plain attribute evidence survives a strict refusal; no geometry schema change."""

ATTRIBUTE_CAPTURE_LIMIT=32
EDITOR_SELECTION_RULES={'.select_vert':('POINT','vertices',40),'.select_edge':('EDGE','edges',102),'.select_poly':('FACE','faces',34)}

def _plain_attribute_value(value):
    if value is None or type(value)in(bool,int):return value
    if type(value)is str:return value if len(value)<=128 else {'unsupportedType':'long-string','length':len(value)}
    if type(value)is float and math.isfinite(value):return value
    return {'unsupportedType':type(value).__name__}

def attribute_snapshot(mesh):
    """Bounded plain metadata/flat flags; no ensure/remove/new/shading operation."""
    r={'kind':'corridor-mesh-attribute-observation-v1','meshName':None,'counts':{},'attributeCount':None,'attributes':[],
       'polygons':[],'authoredRestrictions':{},'captureComplete':True,'captureErrors':[]}
    def error(stage,exc):
        r['captureComplete']=False;r['captureErrors'].append({'stage':stage,'type':type(exc).__name__,'message':str(exc)[:512]})
    try:
        r['meshName']=_plain_attribute_value(mesh.name)
        r['counts']={'vertices':len(mesh.vertices),'edges':len(mesh.edges),'corners':len(mesh.loops),'faces':len(mesh.polygons)}
        r['authoredRestrictions']={'materialCount':len(mesh.materials),'uvLayerCount':len(mesh.uv_layers),'colorAttributeCount':len(mesh.color_attributes),'shapeKeysPresent':mesh.shape_keys is not None}
        r['attributeCount']=len(mesh.attributes)
        if r['attributeCount']>ATTRIBUTE_CAPTURE_LIMIT:error('attributes',ValueError('Attribute inventory exceeds32; prefix only, refuse'))
        for i,a in enumerate(mesh.attributes):
            if i>=ATTRIBUTE_CAPTURE_LIMIT:break
            row={'name':None,'domain':None,'dataType':None,'dataCount':None};r['attributes'].append(row)
            for field,property_name in [('name','name'),('domain','domain'),('dataType','data_type')]:
                try:row[field]=_plain_attribute_value(getattr(a,property_name))
                except Exception as exc:error('attribute:'+str(i)+':'+field,exc)
            data=None
            try:
                data=a.data;row['dataCount']=len(data)
            except Exception as exc:error('attribute:'+str(i)+':dataCount',exc)
            name=row['name'];value_limit=34 if name=='sharp_face'else(EDITOR_SELECTION_RULES[name][2]if type(name)is str and name in EDITOR_SELECTION_RULES else None)
            if value_limit is not None and data is not None:
                row['values']=[]
                try:
                    if row['dataCount']is not None and row['dataCount']>value_limit:error(str(name),ValueError('Boolean extent exceeds'+str(value_limit)+'; prefix only, refuse'))
                    for j,value in enumerate(data):
                        if j>=value_limit:error(str(name),ValueError('Boolean iterator exceeds bound; prefix only, refuse'));break
                        row['values'].append(_plain_attribute_value(value.value))
                except Exception as exc:error('attribute:'+str(i)+':values',exc)
        if len(mesh.polygons)>34:error('polygons',ValueError('Polygon inventory exceeds34; prefix only, refuse'))
        for i,face in enumerate(mesh.polygons):
            if i>=34:break
            r['polygons'].append({'index':_plain_attribute_value(face.index),'useSmooth':_plain_attribute_value(face.use_smooth),'materialIndex':_plain_attribute_value(face.material_index)})
    except Exception as exc:error('mesh-capture',exc)
    return r

def verify_flat_attributes(observed,vertex_count,face_count,*,evaluated=False,mesh_name=None,require_editor_selection=False):
    """Only generated all-flat sharp_face is additional pre-install authority."""
    from source import digest
    expected_keys={'kind','meshName','counts','attributeCount','attributes','polygons','authoredRestrictions','captureComplete','captureErrors'}
    if type(observed)is not dict or set(observed)!=expected_keys or observed['kind']!='corridor-mesh-attribute-observation-v1'or observed['captureComplete']is not True or type(observed['captureErrors'])is not list or observed['captureErrors']:raise ValueError('Complete bounded attribute inventory required')
    if type(observed['meshName'])is not str or not observed['meshName']or(mesh_name is not None and observed['meshName']!=mesh_name):raise ValueError('Observed attribute mesh name differs')
    counts=observed['counts']
    if type(counts)is not dict or set(counts)!={'vertices','edges','corners','faces'}or any(type(v)is not int or v<0 for v in counts.values()):raise ValueError('Typed complete mesh extents required')
    if counts['vertices']!=vertex_count or counts['faces']!=face_count or counts['corners']!=3*face_count or not 0<counts['edges']<=3*face_count or not 0<vertex_count<=40 or not 0<face_count<=34:raise ValueError('Source topology extents do not support flat-face proof')
    rows=observed['attributes'];n=observed['attributeCount']
    if type(rows)is not list or type(n)is not int or not 1<=n<=ATTRIBUTE_CAPTURE_LIMIT or len(rows)!=n:raise ValueError('Attribute inventory extent mismatch')
    seen=set();sharp=None;extra=[];selection={name:{'present':False}for name in EDITOR_SELECTION_RULES}
    for row in rows:
        if type(row)is not dict or any(type(row.get(k))is not str or not 0<len(row[k])<=128 for k in ['name','domain','dataType']):raise ValueError('Typed attribute names/schema required')
        name=row['name']
        if name in seen:raise ValueError('Duplicate attribute name:'+name)
        seen.add(name)
        if type(row.get('dataCount'))is not int or row['dataCount']<0:raise ValueError('Typed attribute extent required')
        if name=='sharp_face':
            if set(row)!={'name','domain','dataType','dataCount','values'}or row['domain']!='FACE'or row['dataType']!='BOOLEAN'or row['dataCount']!=face_count or type(row['values'])is not list or len(row['values'])!=face_count or any(type(v)is not bool or v is not True for v in row['values']):raise ValueError('sharp_face must be FACE/BOOLEAN, complete actual bool True per face')
            sharp=row
        elif name in EDITOR_SELECTION_RULES:
            domain,extent,limit=EDITOR_SELECTION_RULES[name]
            if set(row)!={'name','domain','dataType','dataCount','values'}or row['domain']!=domain or row['dataType']!='BOOLEAN'or row['dataCount']!=counts[extent]or row['dataCount']>limit or type(row['values'])is not list or len(row['values'])!=row['dataCount']or any(type(v)is not bool for v in row['values']):raise ValueError('Complete typed generated editor-selection layer required:'+name)
            selection[name]={'present':True,'domain':row['domain'],'dataType':row['dataType'],'dataCount':row['dataCount'],'values':list(row['values'])}
        elif name in BUILTIN_MESH_ATTRIBUTES:
            if set(row)!={'name','domain','dataType','dataCount'}:raise ValueError('Malformed structural attribute inventory:'+name)
            # Existing name/seven-field geometry authority only. Actual schema
            # and counts are recorded, not assigned unverified RNA enum rules.
        elif evaluated:
            if set(row)!={'name','domain','dataType','dataCount'}:raise ValueError('Malformed evaluated-only attribute metadata')
            extra.append(row)
        else:raise ValueError('Unreviewed pre-install/original attribute:'+name)
    if sharp is None:raise ValueError('Generated sharp_face observation missing')
    if require_editor_selection and any(not r['present']for r in selection.values()):raise ValueError('Required original/candidate editor-selection layer missing')
    polys=observed['polygons']
    if type(polys)is not list or len(polys)!=face_count:raise ValueError('Complete polygon flat flags required')
    for i,face in enumerate(polys):
        if type(face)is not dict or set(face)!={'index','useSmooth','materialIndex'}or type(face['index'])is not int or face['index']!=i or type(face['useSmooth'])is not bool or face['useSmooth']is not False or type(face['materialIndex'])is not int or face['materialIndex']!=0:raise ValueError('Every source polygon must be actually flat/material0')
    if observed['authoredRestrictions']!={'materialCount':0,'uvLayerCount':0,'colorAttributeCount':0,'shapeKeysPresent':False}or any(type(observed['authoredRestrictions'].get(k))is not int for k in ['materialCount','uvLayerCount','colorAttributeCount'])or type(observed['authoredRestrictions'].get('shapeKeysPresent'))is not bool:raise ValueError('Authored material/UV/color/shape data may not be discarded')
    return {'kind':'corridor-flat-face-proof-v1','passed':True,'vertices':vertex_count,'faces':face_count,'sharpFaceTrueCount':face_count,'allPolygonsFlat':True,
            'observationSha256':digest(observed),'structuralAttributes':[r for r in rows if r['name']in BUILTIN_MESH_ATTRIBUTES],'structuralSchemasInterpreted':False,'evaluatedOnlyAttributes':extra,'evaluatedExtrasAuthorizeDiscard':False,'editorSelection':selection}

def verify_flat_provenance(original,candidate,plan):
    from source import digest
    original_proof=verify_flat_attributes(original,25,len(plan['preservedOriginalTriangles']),mesh_name='SurfaceSource1893',require_editor_selection=True)
    candidate_proof=verify_flat_attributes(candidate,len(plan['mesh']['vertices']),len(plan['mesh']['faces']),mesh_name='CorridorSource1893',require_editor_selection=True)
    mapping=[]
    for i,face in enumerate(plan['mesh']['faces']):
        source_face=face['sourceFace']
        if type(source_face)is not int or not 0<=source_face<len(plan['preservedOriginalTriangles']):raise ValueError('Flat-face source provenance index invalid')
        mapping.append({'candidateFace':i,'sourceFace':source_face,'expectedSharpFace':True,'expectedUseSmooth':False,'expectedMaterialIndex':0})
    return {'passed':True,'originalObservationSha256':digest(original),'candidateObservationSha256':digest(candidate),'faceProvenance':mapping,'expectation':'Original verified all-flat semantics; never inferred from candidate values','editorSelectionTransition':{'disposition':'regenerated-by-unchanged-constructor','original':original_proof['editorSelection'],'candidate':candidate_proof['editorSelection'],'oldToNewValueLineageClaimed':False}}

def _persist_attribute_evidence(stage,observations,validator,persist):
    """Existing Author atomic-save callback; a failed save always stops progress."""
    try:proof=validator()
    except (ValueError,KeyError,TypeError,IndexError)as exc:
        evidence={'kind':'corridor-attribute-evidence-v1','stage':stage,'passed':False,'observation':observations,'error':{'type':type(exc).__name__,'message':str(exc)}}
        refusal=AttributeRefused(str(exc),evidence)
        try:persist(stage,evidence)
        except BaseException as storage:raise BaseExceptionGroup('Attribute refusal and persistence failure',[refusal,storage])from exc
        raise refusal from exc
    evidence={'kind':'corridor-attribute-evidence-v1','stage':stage,'passed':True,'observation':observations,'proof':proof}
    persist(stage,evidence);return evidence

def inspect_flat_attributes(mesh,vertex_count,face_count,stage,persist,mesh_name):
    observed=attribute_snapshot(mesh)
    return _persist_attribute_evidence(stage,observed,lambda:verify_flat_attributes(observed,vertex_count,face_count,mesh_name=mesh_name,require_editor_selection=True),persist)

def verify_install_attributes(installed,plan):
    from source import canonical
    original=installed['attributePreflight'];candidate=installed['attributeCandidate'];current=installed['attributeInstalled'];allocation=installed['attributeAllocation']
    for evidence,stage,vertices,faces,name in [(original,'original',25,len(plan['preservedOriginalTriangles']),'SurfaceSource1893'),(candidate,'candidate',len(plan['mesh']['vertices']),len(plan['mesh']['faces']),'CorridorSource1893'),(current,'installed',len(plan['mesh']['vertices']),len(plan['mesh']['faces']),'CorridorSource1893')]:
        proof=verify_flat_attributes(evidence['observation'],vertices,faces,mesh_name=name,require_editor_selection=True)
        if evidence.get('kind')!='corridor-attribute-evidence-v1'or evidence.get('stage')!=stage or evidence.get('passed')is not True or canonical(evidence.get('proof'))!=canonical(proof):raise ValueError('Installed flat attribute evidence/proof corrupt')
    if canonical(allocation)!=canonical({'kind':'corridor-attribute-candidate-allocation-v1','allocatedMeshName':'CorridorSource1893','sourceMeshBeforeSwap':'SurfaceSource1893','sourceStillOriginal':True,'sourceSwapped':False}):raise ValueError('Separate pre-swap allocation witness required')
    provenance=verify_flat_provenance(original['observation'],candidate['observation'],plan)
    reported=installed['attributeProvenance']
    if reported.get('kind')!='corridor-attribute-evidence-v1'or reported.get('stage')!='candidate-provenance'or reported.get('passed')is not True or canonical(reported.get('observation'))!=canonical({'original':original['observation'],'candidate':candidate['observation']})or canonical(reported.get('proof'))!=canonical(provenance):raise ValueError('Flat attribute provenance evidence corrupt')
    if canonical(candidate['observation'])!=canonical(current['observation']):raise ValueError('Installed source attribute semantics changed after allocation')
    return {'passed':True,'original':original['proof'],'candidate':candidate['proof'],'installed':current['proof'],'faceProvenance':provenance['faceProvenance'],'editorSelectionTransition':provenance['editorSelectionTransition']}

def verify_attribute_pair(readbacks,plan,origin,expected_anchor):
    if set(readbacks)!={'original','evaluated'}:raise ValueError('Separate original/evaluated attribute observations required')
    from source import canonical,digest
    original=verify_flat_attributes(readbacks['original'],len(plan['mesh']['vertices']),len(plan['mesh']['faces']),mesh_name='CorridorSource1893',require_editor_selection=True)
    anchor=verify_flat_attributes(expected_anchor,len(plan['mesh']['vertices']),len(plan['mesh']['faces']),mesh_name='CorridorSource1893',require_editor_selection=True)
    if canonical(original['editorSelection'])!=canonical(anchor['editorSelection']):raise ValueError('Current original editor selection differs from installed actual anchor')
    evaluated=verify_flat_attributes(readbacks['evaluated'],len(plan['mesh']['vertices']),len(plan['mesh']['faces']),evaluated=True)
    provenance=verify_flat_provenance(origin,readbacks['original'],plan)
    return {'passed':True,'original':original,'evaluated':evaluated,'historicalInstallOriginSha256':provenance['originalObservationSha256'],'faceProvenance':provenance['faceProvenance'],'originIsFreshlyReobserved':False,'installedActualAnchorSha256':digest(expected_anchor),'originalSelectionMatchesInstalled':True,'evaluatedSelection':'present/absent observed only; never created or claimed unchanged'}

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

def install(bpy,source,flow,settings,guard,persist):
    """Future hook AFTER old fresh25-vertex mesh creation, BEFORE group install.

    Caller must already own a permitted fresh scene/cache under the unchanged
    exercised controller. This function is not a process/authorization gate.
    It does not save a scene, animate, evaluate, bake, render or free a cache.
    """
    guard();s=validate_settings(settings);base=s['emissionWeights'];old=source.data
    original_attributes=inspect_flat_attributes(old,25,len(base['triangleIndexMap']),'original',persist,'SurfaceSource1893')
    if source.name!=base['objectName'] or len(old.vertices)!=25 or [list(p.vertices) for p in old.polygons]!=base['triangleIndexMap']:raise ValueError('Exact original freshly constructed emitter required')
    if list(source.vertex_groups) or any(list(v.groups) for v in old.vertices):raise ValueError('Original blank deform state required; never delete existing groups')
    flags={'density_vertex_group':'','volume_density':0.0,'use_absolute':True,'use_plane_init':True,'surface_distance':.5,'flow_type':'BOTH'}
    if any(getattr(flow,k)!=v or type(getattr(flow,k))is not type(v) for k,v in flags.items()):raise ValueError('Original flow flags changed')
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
    allocation={'kind':'corridor-attribute-candidate-allocation-v1','allocatedMeshName':mesh.name,'sourceMeshBeforeSwap':old.name,'sourceStillOriginal':source.data==old,'sourceSwapped':False}
    persist('candidate-allocation',allocation)
    if mesh.name!='CorridorSource1893':raise ValueError('Fresh corridor mesh name collision; preserve failure')
    if allocation['sourceStillOriginal']is not True:raise ValueError('Source identity changed before candidate construction; no swap')
    try:mesh.from_pydata(local,[],[f['indices'] for f in plan['mesh']['faces']]);mesh.update()
    except BaseException as exc:
        evidence={'kind':'corridor-candidate-build-refusal-v1','observation':attribute_snapshot(mesh),'error':{'type':type(exc).__name__,'message':str(exc)}}
        try:persist('candidate-build-refusal',evidence)
        except BaseException as storage:raise BaseExceptionGroup('Candidate build and evidence persistence failure',[exc,storage])
        raise
    candidate_attributes=inspect_flat_attributes(mesh,len(plan['mesh']['vertices']),len(plan['mesh']['faces']),'candidate',persist,'CorridorSource1893')
    provenance_attributes=_persist_attribute_evidence('candidate-provenance',{'original':original_attributes['observation'],'candidate':candidate_attributes['observation']},
        lambda:verify_flat_provenance(original_attributes['observation'],candidate_attributes['observation'],plan),persist)
    source.data=mesh
    group=source.vertex_groups.new(name=base['groupName'])
    if group.name!=base['groupName'] or group.index!=0:raise ValueError('New group collision/index mismatch')
    for row in plan['derivedProfile']['vertexWeights']:guard();group.add([row['vertex']],row['weight'],'REPLACE')
    prop=flow.bl_rna.properties.get('density_vertex_group')
    if prop is None or prop.is_readonly or prop.type!='STRING':raise ValueError('Writable group selector RNA unavailable')
    flow.density_vertex_group=base['groupName']
    if flow.density_vertex_group!=base['groupName']:raise ValueError('Actual group selector mismatch')
    installed_attributes=inspect_flat_attributes(source.data,len(plan['mesh']['vertices']),len(plan['mesh']['faces']),'installed',persist,'CorridorSource1893')
    guard();record=snapshot(source);gate=verify_observation(record,plan,expected_local,original_world)
    result={'kind':'corridor-source-install-observation-v1','plan':plan,'originalWorld':original_world,'expectedLocalFloat32':expected_local,
            'observation':record,'expectedRealization':realized,'geometryAndGroupGate':gate,'attributePreflight':original_attributes,'attributeAllocation':allocation,'attributeCandidate':candidate_attributes,'attributeProvenance':provenance_attributes,'attributeInstalled':installed_attributes,'originalMeshPreservedNotFreed':old.name,'effectiveInputGridProved':False}
    result['attributeGate']=verify_install_attributes(result,plan);return result

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
        record['attributeReadbacks']={'original':attribute_snapshot(source.data),'evaluated':attribute_snapshot(evaluated.data)}
        record['attributeAnchor']=installed['attributeInstalled']['observation']
        record['attributeOrigin']=installed['attributePreflight']['observation'] # Historical install witness, not a new old-mesh evaluation.
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
    try:record['attributeGates']=verify_attribute_pair(record['attributeReadbacks'],p,record['attributeOrigin'],installed['attributeInstalled']['observation'])
    except (ValueError,KeyError,TypeError,IndexError)as exc:raise AttributeRefused(str(exc),record)from exc
    record['effectiveInputGridProved']=False
    return record
