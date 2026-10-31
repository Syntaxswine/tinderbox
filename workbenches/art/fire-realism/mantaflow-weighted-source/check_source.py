"""Pure/source/fake-RNA checks. Never constructs Author/Controller/Job or bpy."""
import ast,copy,hashlib,json,math,sys,unittest
from pathlib import Path
from types import SimpleNamespace as NS
from unittest.mock import patch
import author
from policy import (CORE_FILES,PROPOSAL,OWNER,V5_CONTROLS,V5_VOLATILE,validate_settings,compare_weighted_v5,expected_inputs,terminal_report,new_deadline,remaining_seconds,validate_permit)
from weights import (FROZEN_WEIGHTS,READBACK_FRAMES,profile_values,validate_frozen_profile,expected_record,verify_record,verify_blank_record,verify_pair,verify_preparation,verify_bake_witness,interpolate,targets,prediction)
from state import vertex_group_record
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];BASE=ROOT/'workbenches/art/fire-realism/mantaflow-half-rate-source'
S=json.loads((HERE/'settings.json').read_text());PROFILE=S['emissionWeights'];IDENTITY=[[1.,0.,0.,0.],[0.,1.,0.,0.],[0.,0.,1.,0.],[0.,0.,0.,1.]]
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def segment(text,name):
    tree=ast.parse(text);node=next(n for n in tree.body if isinstance(n,(ast.FunctionDef,ast.ClassDef))and n.name==name)
    return ast.get_source_segment(text,node)

class Group:
    def __init__(self,owner,name,index):self.owner=owner;self.name=name;self.index=index
    def add(self,indices,weight,mode):
        if mode!='REPLACE':raise ValueError('Expected replace')
        for i in indices:self.owner.data.vertices[i].groups=[NS(group=self.index,weight=float(weight))]
class Groups(list):
    def __init__(self,owner):super().__init__();self.owner=owner;self.collide=False
    def new(self,name):
        group=Group(self.owner,name+('.001'if self.collide else''),len(self));self.append(group);return group
def source():
    obj=NS(name=PROFILE['objectName'],matrix_world=copy.deepcopy(IDENTITY))
    obj.data=NS(name='SurfaceSource1893',vertices=[NS(index=i,co=[*p,.02],groups=[])for i,p in enumerate(S['source']['polygon'])],
                polygons=[NS(vertices=face)for face in PROFILE['triangleIndexMap']]);obj.vertex_groups=Groups(obj);return obj
def flow():
    return NS(density_vertex_group='',use_absolute=True,use_plane_init=True,volume_density=0.,surface_distance=.5,flow_type='BOTH',
              bl_rna=NS(properties={'density_vertex_group':NS(type='STRING',is_readonly=False)}))
def prepared_fixture():
    obj=source();fs=flow();before=vertex_group_record(obj);author.install_static_weights(obj,fs,S)
    record=vertex_group_record(obj);mesh=author.mesh_record(obj)
    baseline={'domainSettings':{'burning_rate':.75,'vorticity':.25,'flame_vorticity':.5,'cache_directory':'old'},
              'sourceSettings':{k:getattr(fs,k)for k in ['density_vertex_group','use_absolute','use_plane_init','volume_density','surface_distance','flow_type']},
              'sourceMesh':mesh,'sourceWorld':copy.deepcopy(IDENTITY),'volatileCache':{k:None for k in V5_VOLATILE}}
    baseline['sourceSettings']['density_vertex_group']=''
    actual=copy.deepcopy(baseline);actual['domainSettings'].update(burning_rate=.375,cache_directory='fresh');actual['sourceVertexGroups']=record;actual['sourceSettings']['density_vertex_group']=PROFILE['groupName']
    original=copy.deepcopy(baseline);original['sourceVertexGroups']=before
    rows={}
    for frame in READBACK_FRAMES:
        rows[str(frame)]={'frame':frame,'evaluatedId':True,'original':copy.deepcopy(record),'evaluated':copy.deepcopy(record),'originalMesh':copy.deepcopy(mesh),'evaluatedMesh':copy.deepcopy(mesh),
                         'originalWorld':copy.deepcopy(IDENTITY),'evaluatedWorld':copy.deepcopy(IDENTITY),'flowFlags':copy.deepcopy(actual['sourceSettings']),
                         'domainFlagsBefore':[False,False],'domainFlagsDuring':[False,False],'domainFlagsAfter':[False,False]}
    report={'baselineActualState':original,'preparedActualState':actual,'weightReadbacks':rows}
    active={'fuel_amount':1.,'density':1.,'temperature':2.};curve=[]
    for frame in range(1,194):
        row=expected_inputs(frame,S,active);curve.append({'frame':frame,**row})
    geo=[[*p,.02]for p in S['source']['polygon']]
    control={'observedValid':True,'actualStateComparison':{'passed':True},'preparedBlendSha256':V5_CONTROLS['preparedScene']['sha256'],
             'preparedActualState':baseline,'activeOriginalBOTH':active,'evaluatedCurve':curve,'sourceGeometryRequested':geo}
    return report,control,curve,geo,active

class WeightedChecks(unittest.TestCase):
    def test_frozen_profile_and_other_recipe_settings(self):
        validate_settings(S);self.assertEqual(tuple(profile_values(PROFILE)),FROZEN_WEIGHTS)
        for key,value in [('groupName','wrong'),('groupIndex',1),('vertexCount',24)]:
            bad=copy.deepcopy(S);bad['emissionWeights'][key]=value
            with self.assertRaises((ValueError,KeyError)):validate_settings(bad)
        for change in [lambda s:s['simulation'].update(globalVorticity=.5),lambda s:s['simulation'].update(withdrawalStart=2.6),
                       lambda s:s['counterfactual'].update(target=.75),lambda s:s['limits'].update(wallSeconds=901),
                       lambda s:s['source'].update(volumeDensity=.1),lambda s:s['source']['polygon'][0].__setitem__(0,-.39)]:
            bad=copy.deepcopy(S);change(bad)
            with self.assertRaises(ValueError):validate_settings(bad)
    def test_finite_range_complete_unique_indices_and_float32_targets(self):
        for mutate in [lambda p:p['vertexWeights'][0].update(weight=float('nan')),lambda p:p['vertexWeights'][0].update(weight=1.1),
                       lambda p:p['vertexWeights'][0].update(weight=-.1),lambda p:p['vertexWeights'][0].update(weight=1),
                       lambda p:p['vertexWeights'][1].update(vertex=0),lambda p:p['vertexWeights'].pop()]:
            bad=copy.deepcopy(PROFILE);mutate(bad)
            with self.assertRaises((ValueError,KeyError)):profile_values(bad)
        record=expected_record(PROFILE);proof=verify_record(record,PROFILE);self.assertEqual(proof['positiveMemberships'],25)
        bad=copy.deepcopy(record);bad['vertices'][4]['memberships'][0]['weight']+=1e-12
        with self.assertRaises(ValueError):verify_record(bad,PROFILE)
    def test_deliberate_zero_not_missing_entire_group_or_deform(self):
        profile=copy.deepcopy(PROFILE);profile['vertexWeights'][0]['weight']=0.;profile['deliberateZeroIndices']=[0]
        record=expected_record(profile);record['vertices'][0]['memberships']=[]
        self.assertEqual(verify_record(record,profile)['documentedAbsentZeroMemberships'],[0])
        for mutate in [lambda r:r.update(groups=[]),lambda r:[v.update(memberships=[])for v in r['vertices']]]:
            bad=copy.deepcopy(record);mutate(bad)
            with self.assertRaises(ValueError):verify_record(bad,profile)
    def test_install_after_mesh_and_reject_collision_selector_or_missing_RNA(self):
        blank=vertex_group_record(source());verify_blank_record(blank,PROFILE)
        for mutation in [lambda r:r['vertices'][1].update(vertex=True),lambda r:r['vertices'][1].update(vertex=0),lambda r:r['vertices'][0].update(memberships=[{'group':0,'weight':1.}])]:
            bad=copy.deepcopy(blank);mutation(bad)
            with self.assertRaises(ValueError):verify_blank_record(bad,PROFILE)
        obj=source();fs=flow();proof=author.install_static_weights(obj,fs,S)
        self.assertEqual(vertex_group_record(obj),expected_record(PROFILE));self.assertFalse(proof['fieldEffectProved'])
        for case in ['existing','collision','selector','rna','mesh']:
            obj=source();fs=flow()
            if case=='existing':obj.vertex_groups.new('Existing')
            if case=='collision':obj.vertex_groups.collide=True
            if case=='selector':fs.density_vertex_group='foreign'
            if case=='rna':fs.bl_rna.properties={}
            if case=='mesh':obj.data.vertices.pop()
            with self.assertRaises((ValueError,RuntimeError)):author.install_static_weights(obj,fs,S)
    def test_original_and_evaluated_readbacks_missing_wrong_indices_or_bits(self):
        report,*_=prepared_fixture();e=report['weightReadbacks']['2'];verify_pair(e,S)
        for mutate in [lambda e:e['evaluated'].update(groups=[]),lambda e:e['evaluated']['groups'][0].update(name=PROFILE['groupName']+'.001'),
                       lambda e:e['evaluated']['vertices'][2].update(vertex=1),lambda e:e['evaluated']['vertices'][0].update(memberships=[]),
                       lambda e:e['evaluatedMesh'].update(sha256='0'*64),lambda e:e.update(evaluatedId=False),
                       lambda e:e.update(domainFlagsAfter=[True,True]),lambda e:e['flowFlags'].update(volume_density=1.)]:
            bad=copy.deepcopy(e);mutate(bad)
            with self.assertRaises(ValueError):verify_pair(bad,S)
    def test_borrowed_evaluation_and_finally_restoration_without_fallback(self):
        obj=source();fs=flow();author.install_static_weights(obj,fs,S);evaluated=copy.deepcopy(obj);evaluated.is_evaluated=True
        obj.evaluated_get=lambda graph:evaluated
        dm=NS(show_viewport=True,show_render=True);domain=NS(modifiers={'MantaflowContactGas':dm});scene=NS(frame_current=2)
        bpy=NS(context=NS(view_layer=NS(update=lambda:None),evaluated_depsgraph_get=lambda:object()))
        fake=NS(bpy=bpy,s=S,guard=lambda:None,out=Path('unused'),args=NS(phase='prepare'))
        row=author.Author.observe_weights(fake,scene,domain,obj,fs);self.assertTrue(row['evaluatedId']);self.assertEqual([dm.show_viewport,dm.show_render],[True,True])
        evaluated.data.vertices[1].groups=[]
        with patch.object(author,'save')as preserve:
            with self.assertRaises(ValueError):author.Author.observe_weights(fake,scene,domain,obj,fs)
            self.assertTrue(preserve.called);self.assertEqual([dm.show_viewport,dm.show_render],[True,True])
        evaluated.is_evaluated=False
        with self.assertRaises(RuntimeError):author.Author.observe_weights(fake,scene,domain,obj,fs)
        self.assertEqual([dm.show_viewport,dm.show_render],[True,True])
    def test_required_preparation_and_reloaded_bake_witness(self):
        report,*_=prepared_fixture();gate=verify_preparation(report,S);self.assertTrue(gate['passed'])
        for mutation in ['missing','weight','flags','mesh']:
            bad=copy.deepcopy(report)
            if mutation=='missing':bad['weightReadbacks'].pop('91')
            if mutation=='weight':bad['preparedActualState']['sourceVertexGroups']['vertices'][1]['memberships'][0]['weight']=.5
            if mutation=='flags':bad['preparedActualState']['sourceSettings']['use_absolute']=False
            if mutation=='mesh':bad['weightReadbacks']['2']['evaluatedMesh']['sha256']='0'*64
            with self.assertRaises((ValueError,KeyError)):verify_preparation(bad,S)
        record={'kind':'weighted-source-prebake-observation-v1','observation':report['weightReadbacks']['1']}
        self.assertTrue(verify_bake_witness(record,S,report['preparedActualState'])['passed'])
        record['observation']['evaluated']['vertices'][0]['memberships']=[]
        with self.assertRaises(ValueError):verify_bake_witness(record,S,report['preparedActualState'])
    def test_complete_v5_state_curve_topology_gate_with_only_verified_collection_extension(self):
        report,control,curve,geo,active=prepared_fixture()
        result=compare_weighted_v5(control,report['preparedActualState'],curve,geo,active,'fresh',S,report['weightReadbacks'],report['baselineActualState'])
        self.assertTrue(result['passed'],result);self.assertFalse(result['aggregateInputEquivalent'])
        for case in ['vorticity','curve','geometry','absolute']:
            actual=copy.deepcopy(report['preparedActualState']);c=copy.deepcopy(curve);g=copy.deepcopy(geo)
            if case=='vorticity':actual['domainSettings']['vorticity']=.26
            if case=='curve':c[90]['fuel_amount']=.4
            if case=='geometry':g[0][0]+=.01
            if case=='absolute':actual['sourceSettings']['use_absolute']=False
            try:out=compare_weighted_v5(control,actual,c,g,active,'fresh',S,report['weightReadbacks'],report['baselineActualState'])
            except ValueError:continue
            self.assertFalse(out['passed'])
    def test_barycentric_endpoints_and_shared_E_semantics(self):
        self.assertEqual(interpolate([1.,.5,.125],[1.,0.,0.]),1.)
        self.assertAlmostEqual(interpolate([1.,.5,.125],[.2,.3,.5]),.4125)
        active={'fuel_amount':1.,'density':1.,'temperature':2.}
        old=targets(.8,active);weak=targets(.8*.25,active)
        self.assertAlmostEqual(weak['fuelTarget'],old['fuelTarget']*.25);self.assertAlmostEqual(weak['densityTarget'],.2)
        self.assertEqual(weak['requestedHeatScalar'],old['requestedHeatScalar']);self.assertNotEqual(weak['requestedHeatScalar'],old['requestedHeatScalar']*.25)
        self.assertAlmostEqual(weak['reactionSurfaceFalloff'],.36);self.assertNotAlmostEqual(weak['reactionSurfaceFalloff'],old['reactionSurfaceFalloff']*.25)
        self.assertFalse(targets(0.,active)['heatGate']);self.assertIsNone(targets(0.,active)['requestedHeatScalar'])
    def test_one_profile_geometric_unequal_lobes_resolved_regions_and_four_cells(self):
        h=1/24;grid={'resolution':[48,48,96],'spacing':[h]*3,'origin':[-1+h/2,-1+h/2,-1/6+h/2]}
        result=prediction(S,grid,{'fuel_amount':1.,'density':1.,'temperature':2.})
        self.assertTrue(all(v>0 for v in result['predictedPositiveCounts'].values()));self.assertEqual(result['predictedOutsideA'],0);self.assertEqual(result['predictedBelowGround'],0)
        lobes=result['lobeVoronoiPartitions'];self.assertGreater(lobes['primary']['gaugeWeight'],lobes['secondary']['gaugeWeight']);self.assertGreater(lobes['secondary']['gaugeWeight'],lobes['small']['gaugeWeight'])
        self.assertGreater(result['resolvedFeatureAreas']['high']['equivalentAreaDiameterVoxels'],3);self.assertGreater(result['resolvedFeatureAreas']['weak']['equivalentAreaDiameterVoxels'],3)
        self.assertLess(result['sampledTargets']['weightedE'],result['sampledTargets']['baselineE']);self.assertEqual(result['weightedHeatGateCount'],result['baselinePositiveCount'])
        self.assertTrue(all(v['sampledTargets']['weightedE']>0 for v in result['perCell'].values()))
    def test_deadline_terminal_namespace_no_waivers(self):
        run=new_deadline(1000.,100.);self.assertEqual(remaining_seconds(run,1001.,1100.),899.)
        bad=copy.deepcopy(run);bad['deadlineEpoch']+=1
        with self.assertRaises(ValueError):remaining_seconds(bad,1001.,1100.)
        samples=[{'frame':i+1,'age':i/30,'max':1. if 0<i<96 else 0.,'integral':1. if 0<i<96 else 0.,'positive':1 if 0<i<96 else 0,'nonzero':1 if 0<i<96 else 0,'min':0.}for i in range(193)]
        self.assertTrue(terminal_report(samples,S)['rawGatesPassed']);samples[96].update(max=.3,integral=.001,positive=1,nonzero=1)
        self.assertFalse(terminal_report(samples,S)['rawGatesPassed'])
        pins={name:'0'*64 for name in CORE_FILES};p={'version':1,'kind':'tinderbox-half-rate-source-authorization-v1','phase':'prepare','owner':OWNER,'proposalCommit':PROPOSAL,'candidateCommit':'1'*40,'output':'fresh','sourcePins':pins,'toolExeSha256':'2'*64,'originalBlendSha256':'3'*64,'authorizationPaths':{},'issuedAtEpoch':1.,'notAfterEpoch':10.,'nonce':'sourceonly123'}
        with self.assertRaises(ValueError):validate_permit(p,'prepare','fresh',pins,'1'*40,2.)
    def test_exact_cfe_helpers_envelope_terminal_and_controller_inverse(self):
        for name in ['grid.py','surface.py','winjob.py']:self.assertEqual((HERE/name).read_bytes(),(BASE/name).read_bytes())
        old=(BASE/'policy.py').read_text();new=(HERE/'policy.py').read_text()
        for name in ['source_envelope','expected_inputs','new_deadline','remaining_seconds','terminal_report','check_bake_permit_presence','registration_reserve','unresolved_registration_charge','unique_json_pairs','compare_v5_prepared']:self.assertEqual(segment(old,name),segment(new,name))
        old=(BASE/'supervisor.py').read_text();new=(HERE/'supervisor.py').read_text()
        new=new.replace('from weights import verify_preparation,verify_bake_witness\n','').replace('mantaflow-weighted-source','mantaflow-half-rate-source').replace('weighted-source-authorizations','half-rate-source-authorizations').replace('One finite weighted source authoring: ','One finite half-rate source authoring: ')
        new=new.replace("        if verify_preparation(report,self.s)!=report.get('weightSourceGate'):raise RuntimeError('Required original/evaluated weight witness invalid')\n",'')
        new=new.replace("        weighted=json.loads((self.out/'bake-weight-recheck.json').read_text());prepared=json.loads((self.out/'prepare.json').read_text())\n        if weighted.get('passed')is not True or verify_bake_witness(weighted,self.s,prepared['preparedActualState'])!=weighted.get('gate'):raise RuntimeError('Required saved/reloaded weight witness invalid')\n",'')
        self.assertEqual(new,old)
        text=(HERE/'author.py').read_text();self.assertLess(text.index('source.data=mesh'),text.index('weight_assignment=install_static_weights'))
        self.assertLess(text.index("loaded['gate']=verify_bake_witness"),text.index('bpy.ops.fluid.bake_data'))
        self.assertNotIn('to_mesh(',text);self.assertNotIn('to_mesh_clear(',text)
        self.assertEqual(len(CORE_FILES),10)
if __name__=='__main__':unittest.main(verbosity=2)
