"""Pure/source/fake-RNA checks only. No Job, controller, bpy or process launch."""
import ast,copy,hashlib,json,sys,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from policy import (CORE_FILES,PROPOSAL,OWNER,V5_CONTROLS,V5_VOLATILE,validate_settings,
                    compare_v5_prepared,expected_inputs,terminal_report,new_deadline,
                    remaining_seconds,validate_permit)
from state import compare_actual
import author,supervisor
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
BASE=ROOT/'workbenches/art/fire-realism/mantaflow-surface-source'
S=json.loads((HERE/'settings.json').read_text())

class HalfRateSourceChecks(unittest.TestCase):
    def test_exact_fixed_setting_and_full_remaining_recipe(self):
        validate_settings(S)
        for mutate in [lambda s:s['counterfactual'].update(baseline=.750001),lambda s:s['counterfactual'].update(target=.5),
                       lambda s:s['counterfactual'].update(target='0.375'),lambda s:s['counterfactual'].update(property='flame_ignition'),
                       lambda s:s['simulation'].update(withdrawalStart=2.6),lambda s:s['simulation'].update(globalVorticity=.5),
                       lambda s:s['source']['polygon'][0].__setitem__(0,-.37),lambda s:s['terminal'].update(minFlameMax=.01),
                       lambda s:s.update(extra=True),lambda s:s['controlV5']['prepareReport'].update(bytes=1)]:
            bad=copy.deepcopy(S);mutate(bad)
            with self.assertRaises(ValueError):validate_settings(bad)

    def fake_rate(self,value=.75,kind='FLOAT',readonly=False):
        return SimpleNamespace(burning_rate=value,bl_rna=SimpleNamespace(properties={
            'burning_rate':SimpleNamespace(type=kind,is_readonly=readonly)}))

    def test_typed_actual_baseline_and_target_readback(self):
        obj=self.fake_rate();report=author.set_half_rate(obj,S)
        self.assertEqual(obj.burning_rate,.375)
        self.assertEqual(report,{'property':'burning_rate','requested':.375,'expectedStored':.375,
                                 'observed':.375,'rnaType':'FLOAT','baselineObserved':.75})

    def test_wrong_baseline_type_or_readonly_fails_before_write(self):
        for value,kind,readonly in [(.75,'INT',False),(.75,'FLOAT',True),(.750001,'FLOAT',False),(True,'FLOAT',False)]:
            obj=self.fake_rate(value,kind,readonly)
            with self.assertRaises(RuntimeError):author.set_half_rate(obj,S)
            self.assertEqual(obj.burning_rate,value)
        obj=self.fake_rate();obj.bl_rna.properties={}
        with self.assertRaises(RuntimeError):author.set_half_rate(obj,S)
        self.assertEqual(obj.burning_rate,.75)

    def test_clamped_or_wrong_target_readback_has_no_fallback(self):
        class RefusesTarget:
            burning_rate=.75
            bl_rna=SimpleNamespace(properties={'burning_rate':SimpleNamespace(type='FLOAT',is_readonly=False)})
            def __setattr__(self,name,value):object.__setattr__(self,name,.37)
        with self.assertRaises(RuntimeError):author.set_half_rate(RefusesTarget(),S)

    def control(self):
        record=S['controlV5']['prepareReport'];path=ROOT/record['path'];raw=path.read_bytes()
        self.assertEqual((len(raw),hashlib.sha256(raw).hexdigest()),(record['bytes'],record['sha256']))
        return json.loads(raw)

    def comparison(self,control):
        actual=copy.deepcopy(control['preparedActualState'])
        actual['domainSettings'].update(burning_rate=.375,cache_directory='fresh-reviewed-cache')
        return actual,copy.deepcopy(control['evaluatedCurve']),copy.deepcopy(control['sourceGeometryRequested']),copy.deepcopy(control['activeOriginalBOTH'])

    def test_actual_v5_full_state_and193_rows_accept_only_rate_cache(self):
        control=self.control();actual,curve,geo,active=self.comparison(control)
        report=compare_v5_prepared(control,actual,curve,geo,active,'fresh-reviewed-cache')
        self.assertTrue(report['passed'],report);self.assertEqual(report['curveRows'],193)
        self.assertEqual(set(report['permittedActualDelta']),{'domainSettings.cache_directory','domainSettings.burning_rate'})
        self.assertEqual(set(report['volatileCacheFields']),set(V5_VOLATILE))

    def test_actual_v5_unrelated_physics_geometry_curve_refused(self):
        control=self.control()
        for mutation in ['vorticity','nestedGravity','mesh','curve','geometry','target','unknownVolatile','active']:
            actual,curve,geo,active=self.comparison(control)
            if mutation=='vorticity':actual['domainSettings']['vorticity']=.26
            elif mutation=='nestedGravity':actual['domainNestedPhysics']['effector_weights']['gravity']=.3
            elif mutation=='mesh':actual['sourceMesh']['sha256']='0'*64
            elif mutation=='curve':curve[90]['fuel_amount']=.49
            elif mutation=='geometry':geo[0][0]+=.01
            elif mutation=='target':actual['domainSettings']['burning_rate']=.75
            elif mutation=='unknownVolatile':actual['volatileCache']['newExcludedField']=True
            else:active['temperature']=2.1
            self.assertFalse(compare_v5_prepared(control,actual,curve,geo,active,'fresh-reviewed-cache')['passed'],mutation)

    def test_wrong_v5_baseline_or_observed_validity_refused(self):
        control=self.control();actual,curve,geo,active=self.comparison(control)
        for key in ['baseline','validity','sceneHash']:
            bad=copy.deepcopy(control)
            if key=='baseline':bad['preparedActualState']['domainSettings']['burning_rate']=.375
            elif key=='validity':bad['observedValid']=False
            else:bad['preparedBlendSha256']='0'*64
            self.assertFalse(compare_v5_prepared(bad,actual,curve,geo,active,'fresh-reviewed-cache')['passed'])

    def test_curve_and_terminal_functions_are_raw_unchanged(self):
        def functions(path):
            text=path.read_text();tree=ast.parse(text)
            return {n.name:ast.get_source_segment(text,n)for n in tree.body if isinstance(n,ast.FunctionDef)}
        old,new=functions(BASE/'policy.py'),functions(HERE/'policy.py')
        for name in ['source_envelope','expected_inputs','terminal_report','new_deadline','remaining_seconds',
                     'check_bake_permit_presence','registration_reserve','unresolved_registration_charge']:
            self.assertEqual(new[name],old[name],name)
        rows=[expected_inputs(f,S,{'fuel_amount':1.,'density':1.,'temperature':2.})for f in range(1,194)]
        self.assertEqual((rows[84]['fuel_amount'],rows[90]['fuel_amount'],rows[96]['fuel_amount']),(1.,.5,0.))
        samples=[{'frame':i+1,'age':i/30,'min':0.,'max':1. if 0<i/30<3.1 else 0.,
                  'positive':1 if 0<i/30<3.1 else 0,'nonzero':1 if 0<i/30<3.1 else 0,
                  'integral':.1 if 0<i/30<3.1 else 0.,'belowGroundPositive':0,'boundaryPositive':0}for i in range(193)]
        self.assertTrue(terminal_report(samples,S)['rawGatesPassed'])
        for index,key in [(96,'nonzero'),(50,'belowGroundPositive'),(51,'boundaryPositive')]:
            bad=copy.deepcopy(samples);bad[index][key]=1
            self.assertFalse(terminal_report(bad,S)['rawGatesPassed'])

    def test_four_helpers_raw_equal_exact_v5(self):
        provenance=json.loads((HERE/'helper-provenance.json').read_text())['halfRateCounterfactual']
        pins={r['name']:r for r in provenance['baselineNine']}
        for name in ['grid.py','state.py','surface.py','winjob.py']:
            raw=(HERE/name).read_bytes()
            self.assertEqual(raw,(BASE/name).read_bytes())
            self.assertEqual(hashlib.sha256(raw).hexdigest(),pins[name]['sha256'])

    def test_old_permit_and_extended_lifetime_refused(self):
        p={'version':1,'kind':'tinderbox-half-rate-source-authorization-v1','phase':'prepare','owner':OWNER,
           'proposalCommit':PROPOSAL,'candidateCommit':'a'*40,'output':'owned-output','sourcePins':{'settings.json':'b'*64},
           'toolExeSha256':'c'*64,'originalBlendSha256':'d'*64,'authorizationPaths':{'prepare':'new/prepare.json','bake':'new/bake.json'},
           'issuedAtEpoch':100,'notAfterEpoch':200,'nonce':'prepare_nonce'}
        validate_permit(p,'prepare','owned-output',p['sourcePins'],'a'*40,101)
        for key,value in [('kind','tinderbox-surface-source-authorization-v1'),('proposalCommit','ebe48c917dca76625f20c8e8ec1a50b0622247c9'),('phase','bake')]:
            bad=copy.deepcopy(p);bad[key]=value
            with self.assertRaises(ValueError):validate_permit(bad,'prepare','owned-output',p['sourcePins'],'a'*40,101)
        d=new_deadline(1000,50000);self.assertEqual(remaining_seconds(d,1100,150000),800)
        d['deadlineEpoch']+=1
        with self.assertRaises(ValueError):remaining_seconds(d,1100,150000)

    def test_existing_guard_control_preservation_uses_allthree_records(self):
        # Fake object bypasses constructor deliberately: no OwnedJob, child or real inputs.
        with tempfile.TemporaryDirectory(prefix='half-rate-inputs-')as folder:
            root=Path(folder);cache=root/'cache';cache.mkdir();probe=cache/'probe.bin';probe.write_bytes(b'fixture')
            files={}
            for name in ['blend','gridSummary','cacheInventory']:
                path=root/name;path.write_bytes(b'fixture');files[name]=path
            files['cacheInventory'].write_text(json.dumps({'cache/probe.bin':{'bytes':7,'sha256':hashlib.sha256(b'fixture').hexdigest()}}))
            original={name:str(path.relative_to(root))for name,path in files.items()}
            original.update({name+'Sha256':hashlib.sha256(path.read_bytes()).hexdigest()for name,path in files.items()})
            controls={}
            for name in V5_CONTROLS:
                path=root/(name+'.fixture');path.write_bytes(('fixture-'+name).encode());raw=path.read_bytes()
                controls[name]={'path':path.name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
            fake=object.__new__(supervisor.Controller);fake.s={'original':original,'controlV5':controls};fake.guard=lambda:None
            with patch.object(supervisor,'ROOT',root):
                result=fake.original_inputs();self.assertEqual(set(result['controlV5']),set(V5_CONTROLS))
                for name,record in controls.items():
                    path=root/record['path'];saved=path.read_bytes();path.write_bytes(b'corrupt')
                    with self.assertRaises(RuntimeError):fake.original_inputs()
                    path.write_bytes(saved)

    def test_syntax_prepare_cache_first_and_no_new_execution(self):
        for name in CORE_FILES:
            if name.endswith('.py'):ast.parse((HERE/name).read_bytes())
        text=(HERE/'author.py').read_text();tree=ast.parse(text)
        prepare=next(n for n in ast.walk(tree)if isinstance(n,ast.FunctionDef)and n.name=='prepare')
        body=ast.get_source_segment(text,prepare)
        self.assertLess(body.index("set_observed(ds,'cache_directory'"),body.index('set_half_rate('))
        self.assertLess(body.index("set_observed(ds,'cache_directory'"),body.index('scene.frame_set(2)'))
        self.assertNotIn('bake_data',body);self.assertNotIn('render.render',text)
        self.assertNotIn('bpy',sys.modules)
        guard=(HERE/'supervisor.py').read_text()
        self.assertIn('half-rate-source-authorizations',guard)
        self.assertIn("'controlV5':controls",guard)
        self.assertIn("self.owned_claim=create_owned_claim(",guard)
        self.assertNotIn('TerminateJobObject',guard)

if __name__=='__main__':unittest.main(verbosity=2)
