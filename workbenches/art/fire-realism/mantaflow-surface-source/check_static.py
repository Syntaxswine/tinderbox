"""Static/pure tests ONLY: no Blender, Windows Job, controller or subprocess launch."""
import ast,copy,hashlib,json,math,unittest,subprocess,sys,os
from pathlib import Path
from policy import validate_settings,source_envelope,expected_inputs,new_deadline,remaining_seconds,validate_permit,terminal_report,OWNER,PROPOSAL,CORE_FILES,check_bake_permit_presence,registration_reserve,unresolved_registration_charge,unique_json_pairs
from surface import triangulate,cross,contains,plan_report,kernel_influence
from state import compare_actual,normal,nested_physics
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
S=json.loads((HERE/'settings.json').read_text())
G={'resolution':[48,48,96],'origin':[-.979166666045785,-.979166666045785,-.14583329297602177],'spacing':[.0416666679084301]*3}

class PolicyTests(unittest.TestCase):
    def test_frozen_settings_and_limits(self):
        validate_settings(S)
        for section,key,value in [('limits','wallSeconds',901),('limits','aggregateCommittedBytes',3*1024**3),('source','surfaceDistanceVoxels',1),('simulation','globalVorticity',0)]:
            bad=copy.deepcopy(S);bad[section][key]=value
            with self.assertRaises(ValueError):validate_settings(bad)
    def test_complete_evaluated_input_recipe(self):
        active={'fuel_amount':1.0,'density':.73,'temperature':2.13}
        self.assertEqual(source_envelope(0,S['simulation']),0);self.assertEqual(source_envelope(2.6,S['simulation']),1);self.assertAlmostEqual(source_envelope(2.8,S['simulation']),.5)
        values=[expected_inputs(f,S,active)for f in range(1,194)]
        self.assertFalse(values[0]['use_inflow'])
        for row in values[90:]:
            self.assertFalse(row['use_inflow']);self.assertEqual([row[k]for k in ['fuel_amount','density','temperature']],[0,0,0])
        self.assertEqual(values[-1]['age'],6.4)
    def test_single_utc_uptime_deadline(self):
        r=new_deadline(1000,50000);self.assertEqual(remaining_seconds(r,1100,150000),800)
        self.assertLess(remaining_seconds(r,900,950001),0) # wall rollback cannot extend it
        with self.assertRaises(ValueError):remaining_seconds(r,1100,49999)
        r['deadlineEpoch']+=1
        with self.assertRaises(ValueError):remaining_seconds(r,1100,150000)
    def permit(self,phase='prepare'):
        return {'version':1,'kind':'tinderbox-surface-source-authorization-v1','phase':phase,'owner':OWNER,'proposalCommit':PROPOSAL,'candidateCommit':'a'*40,'output':'owned-output','sourcePins':{'settings.json':'b'*64},'toolExeSha256':'c'*64,'originalBlendSha256':'d'*64,'authorizationPaths':{'prepare':'primary/prepare.json','bake':'primary/bake.json'},'issuedAtEpoch':100,'notAfterEpoch':200,'nonce':'prepare_nonce'}
    def test_no_implicit_or_stale_permit(self):
        p=self.permit();validate_permit(p,'prepare','owned-output',p['sourcePins'],'a'*40,101)
        for key,value in [('owner','unknown'),('phase','bake'),('candidateCommit','e'*40),('sourcePins',{}),('issuedAtEpoch',102),('notAfterEpoch',100)]:
            bad=copy.deepcopy(p);bad[key]=value
            with self.assertRaises(ValueError):validate_permit(bad,'prepare','owned-output',p['sourcePins'],'a'*40,101)
        p['extra']='approval'
        with self.assertRaises(ValueError):validate_permit(p,'prepare','owned-output',{'settings.json':'b'*64},'a'*40,101)
    def test_bake_binds_prepared_actual_data_and_original_deadline(self):
        r={**new_deadline(0,10000),'state':'awaiting-separate-bake-permit','preparedEpoch':110,'prepareNonce':'prepare_nonce','bakeClaimed':False,'preparedBlendSha256':'scene','prepareReportSha256':'report'}
        p=self.permit('bake');p.update({'issuedAtEpoch':111,'notAfterEpoch':200,'nonce':'bake_nonce','runRecordSha256':'run','preparedBlendSha256':'scene','prepareReportSha256':'report','deadlineEpoch':r['deadlineEpoch'],'deadlineTickMs':r['deadlineTickMs']})
        validate_permit(p,'bake','owned-output',p['sourcePins'],'a'*40,112,r,'run')
        for key,value in [('issuedAtEpoch',109),('nonce','prepare_nonce'),('runRecordSha256','stale'),('preparedBlendSha256','wrong'),('deadlineEpoch',901),('deadlineTickMs',r['deadlineTickMs']+1)]:
            bad=copy.deepcopy(p);bad[key]=value
            with self.assertRaises(ValueError):validate_permit(bad,'bake','owned-output',p['sourcePins'],'a'*40,112,r,'run')
    def test_duplicate_permission_keys_are_not_silently_overridden(self):
        with self.assertRaises(ValueError):json.loads('{"phase":"prepare","phase":"bake"}',object_pairs_hook=unique_json_pairs)
    def test_consumed_bake_failure_keeps_its_real_cause(self):
        with self.assertRaises(ValueError):check_bake_permit_presence(True,'preparing',False)
        check_bake_permit_presence(True,'awaiting-separate-bake-permit',False)
        check_bake_permit_presence(True,'failed',True)
        check_bake_permit_presence(True,'stopped-or-failed',True)
    def test_registration_reserve_covers_inflight_and_unknown_failure(self):
        spec={'sourceFiles':['alpha.py','beta.json'],'restart':{'inputs':['original.blend']},'owners':[OWNER],'purpose':'owned exact attempt'}
        identity={'pid':123,'creationFileTime':134000000000000000,'executable':'python.exe'}
        budget=registration_reserve(spec,identity,[100,200],'owned-lifecycle-root')
        self.assertGreater(budget['reservedBytes'],300+budget['metadataUpperModelBytes'])
        attempt={'status':'inflight','budget':budget};self.assertEqual(unresolved_registration_charge([attempt]),budget['reservedBytes'])
        attempt['status']='failed-unresolved-reserve-retained';self.assertEqual(unresolved_registration_charge([attempt]),budget['reservedBytes'])
        attempt['status']='resolved';self.assertEqual(unresolved_registration_charge([attempt]),budget['sharedMetadataReserveBytes'])
        with self.assertRaises(ValueError):registration_reserve(spec,identity,[100],'root')
        with self.assertRaises(ValueError):registration_reserve(spec,identity,[100,11*1024*1024],'root')
    def samples(self):
        return [{'frame':i+1,'age':i/30,'min':0.,'max':1. if 0<i/30<3.1 else 0.,'positive':20 if 0<i/30<3.1 else 0,'nonzero':20 if 0<i/30<3.1 else 0,'integral':.1 if 0<i/30<3.1 else 0.,'belowGroundPositive':0,'boundaryPositive':0}for i in range(193)]
    def test_terminal_and_final_persistence(self):
        samples=self.samples();r=terminal_report(samples,S);self.assertTrue(r['rawGatesPassed']);self.assertEqual([v['frame']for v in r['requiredSamples']],[91,96,97,98]);self.assertEqual(r['requiredSamples'][1]['positive'],0);self.assertIn('PENDING',r['nativePhase180'])
        for index,change in [(84,{'max':0,'integral':0,'positive':0,'nonzero':0}),(90,{'max':1e-20,'integral':1e-30}),(96,{'max':1e-40,'integral':1e-45,'positive':1,'nonzero':1}),(60,{'belowGroundPositive':1}),(70,{'boundaryPositive':1})]:
            bad=copy.deepcopy(samples);bad[index].update(change);self.assertFalse(terminal_report(bad,S)['rawGatesPassed'])

class GeometryTests(unittest.TestCase):
    def test_useful_asymmetric_connected_surface(self):
        p=plan_report(S,G);poly=S['source']['polygon'];faces=triangulate(poly)
        self.assertEqual(len(faces),len(poly)-2);self.assertTrue(p['upwardNormals']);self.assertTrue(all(p['perCellCoverage'].values()));self.assertEqual(len(p['perCellCoverage']),4);self.assertEqual(p['predictedBelowGround'],0);self.assertLess(p['kernelMinZ'],0)
        polygon_area=sum(a[0]*b[1]-b[0]*a[1]for a,b in zip(poly,poly[1:]+poly[:1]))/2
        self.assertAlmostEqual(sum(cross(poly[a],poly[b],poly[c])/2 for a,b,c in faces),polygon_area)
        for a,b,c in faces:self.assertTrue(contains([(poly[a][i]+poly[b][i]+poly[c][i])/3 for i in [0,1]],poly))
        widths=[v['widthMetres']for v in p['lobes']];self.assertGreater(widths[0],widths[1]);self.assertGreater(widths[1],widths[2]);self.assertTrue(all(v['remainingAfterGeometricDilation']>0 for v in p['notches']));self.assertIn('prediction',p['scope'])
    def test_half_voxel_math_is_not_clearance_proof(self):
        poly=S['source']['polygon'];r=G['spacing'][0]/2;up=[0,-.22,G['origin'][2]+4*G['spacing'][2]];down=[0,-.22,G['origin'][2]+3*G['spacing'][2]]
        self.assertGreater(kernel_influence(up,poly,.02,r),.97);self.assertEqual(kernel_influence(down,poly,.02,r),0);self.assertGreater(kernel_influence(down,poly,.02,r*2),0)
        bad=copy.deepcopy(S);bad['source']['surfaceDistanceVoxels']=1
        with self.assertRaises(ValueError):plan_report(bad,G)
    def test_invalid_geometry_refuses_fallback(self):
        with self.assertRaises(ValueError):triangulate([[0,0],[1,1],[0,1],[1,0]])
        bad=copy.deepcopy(S);bad['source']['polygon'][0][0]=-.49
        with self.assertRaises(ValueError):plan_report(bad,G)

class StateAndBoundaryTests(unittest.TestCase):
    def test_preserves_unknown_actual_buoyancy_and_delete_flag(self):
        a={'domainSettings':{'vorticity':.0,'alpha':.37,'beta':.81,'delete_in_obstacle':False},'volatileCache':{'has_cache_baked_data':False}}
        b=copy.deepcopy(a);b['domainSettings']['vorticity']=.25;b['volatileCache']['has_cache_baked_data']=True
        self.assertTrue(compare_actual(a,b,{'domainSettings.vorticity':.25})['passed'])
        for key,value in [('alpha',1),('delete_in_obstacle',True)]:
            bad=copy.deepcopy(b);bad['domainSettings'][key]=value;self.assertFalse(compare_actual(a,bad,{'domainSettings.vorticity':.25})['passed'])
    def test_nested_effector_gravity_is_compared_not_just_pointer_name(self):
        from types import SimpleNamespace
        props=[SimpleNamespace(identifier=k,is_readonly=False,type='FLOAT')for k in ['gravity','all']]
        weights=SimpleNamespace(gravity=.37,all=1.0,bl_rna=SimpleNamespace(properties=props))
        domain=SimpleNamespace(effector_weights=weights);before={'domainNestedPhysics':nested_physics(domain)}
        weights.gravity=.9;after={'domainNestedPhysics':nested_physics(domain)}
        diff=compare_actual(before,after,{});self.assertFalse(diff['passed']);self.assertTrue(any('effector_weights.gravity'in x for x in diff['errors']))
    def test_unordered_flags_are_cross_hashseed_stable_but_vectors_are_ordered(self):
        self.assertEqual(normal(set(['beta','alpha','gamma'])),normal(frozenset(['gamma','beta','alpha'])))
        self.assertEqual(normal([3,1,2]),[3,1,2]);self.assertEqual(normal([[2,1],[4,3]]),[[2,1],[4,3]])
        code="import json;from state import normal;flags=set('alpha beta gamma delta epsilon zeta eta theta iota'.split());print(json.dumps({'rawOrder':list(flags),'normalized':normal(flags),'vector':normal([3,1,2]),'matrix':normal([[2,1],[4,3]])}))"
        rows=[]
        for seed in ['1','7','119']:
            env={**os.environ,'PYTHONHASHSEED':seed};raw=subprocess.check_output([sys.executable,'-c',code],cwd=HERE,env=env,timeout=5,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0));rows.append(json.loads(raw))
        self.assertGreater(len({tuple(r['rawOrder'])for r in rows}),1,'Hashseed control failed to vary unordered iteration')
        self.assertTrue(all(r['normalized']==rows[0]['normalized']for r in rows));self.assertTrue(all(r['vector']==[3,1,2]and r['matrix']==[[2,1],[4,3]]for r in rows))
    def test_no_bake_operator_in_prepare(self):
        tree=ast.parse((HERE/'author.py').read_text());calls=[]
        for node in ast.walk(tree):
            if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)):
                direct=[n for n in ast.walk(node)if isinstance(n,ast.Call)and isinstance(n.func,ast.Attribute)and n.func.attr=='bake_data']
                if direct:calls.append(node.name)
        self.assertEqual(calls,['bake_export'])
        source=(HERE/'author.py').read_text();prepare=source[source.index('    def prepare(self):'):source.index('    def bake_export(self):')]
        self.assertLess(prepare.index("set_observed(ds,'cache_directory'"),prepare.index('scene.frame_set(2)'))
        self.assertIn('dm.show_viewport=False;dm.show_render=False',prepare);self.assertIn('finally:',prepare);self.assertIn('dm.show_viewport,dm.show_render=original_visibility',prepare)
        self.assertNotIn('bpy.ops.fluid.free',source)
        self.assertLess(source.index('sys.path.insert(0'),source.index('from grid import')) # Blender --python does not supply normal script sys.path semantics
    def test_source_syntax_and_pure_helper_pin(self):
        for name in CORE_FILES:
            file=HERE/name
            if file.suffix=='.py':compile(file.read_text(),str(file),'exec')
        self.assertEqual(hashlib.sha256((HERE/'grid.py').read_bytes()).hexdigest(),'11c9255be51432d8973a4fb8760ed2c3151eafeed25bbce5307c796569309247')
        guard=(HERE/'supervisor.py').read_text();self.assertIn('awaiting-separate-bake-permit',guard);self.assertIn('--bake-permit',guard);self.assertIn('controllerExitPending',guard)
        self.assertNotIn('TerminateJobObject',guard);self.assertNotIn('taskkill',guard.lower())

if __name__=='__main__':unittest.main(verbosity=2)
