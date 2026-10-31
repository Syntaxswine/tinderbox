"""Non-Blender checks for the finite authoring recipe and actual-grid audit."""
import array,ast,json,math,struct,types,unittest
from pathlib import Path
from grid import sample_age,source_gain,little_endian_bytes,scalar_stats,positive_support,centre,native_point
class FiniteRecipeTests(unittest.TestCase):
    def setUp(self):
        self.settings=json.loads((Path(__file__).parent/'settings.json').read_text(encoding='utf-8'));self.sim=self.settings['simulation']
    def test_clock_193_inclusive_samples_no_hidden_warmup(self):
        ages=[sample_age(f,self.sim)for f in range(1,194)];self.assertEqual(len(ages),193);self.assertEqual(ages[0],0);self.assertEqual(ages[-1],6.4);self.assertEqual(ages[96],3.2);self.assertEqual(source_gain(0,self.sim),0);self.assertEqual(source_gain(3,self.sim),1);self.assertAlmostEqual(source_gain(3.1,self.sim),.5);self.assertEqual(source_gain(3.2,self.sim),0);self.assertEqual(source_gain(6.4,self.sim),0)
    def test_native_padding_and_caps(self):
        h=4/96;self.assertAlmostEqual(self.sim['domainCentre'][2]-2,-4*h);self.assertEqual(self.settings['source']['groundCollision']['topZ'],0);self.assertEqual(self.settings['limits'],{'wallSeconds':5400,'processMemoryBytes':6*1024**3,'outputBytes':2*1024**3,'threads':4,'automaticRepairs':0,'automaticRebakes':0})
    def test_asymmetric_index_axes_and_exact_storage(self):
        p=centre(41,[3,4,5],[-1.1,2.7,.31],[.1,.2,.3]);self.assertAlmostEqual(p[0],-.9);self.assertAlmostEqual(p[1],2.9);self.assertAlmostEqual(p[2],1.21);self.assertEqual(native_point([.71,-.23,1.49]),[6.21,1.49,8.73]);self.assertEqual(little_endian_bytes([0.,-0.]),struct.pack('<II',0,0x80000000))
    def test_all_positive_including_faint_boundary_and_no_crop(self):
        values=array.array('f',[0]*60);values[59]=1e-40;data=positive_support(values,[3,4,5],[-1.1,2.7,.31],[.1,.2,.3],2);self.assertEqual(data['positiveVoxels'],1);self.assertTrue(data['hasBoundaryReaction']);self.assertEqual(data['threshold'],0);self.assertEqual(data['boundaryVoxels']['xMax'],1);self.assertAlmostEqual(data['oneVoxelHaloBoundsBlender']['max'][2],1.81);self.assertIsNone(positive_support([0]*60,[3,4,5],[0,0,0],[1,1,1],1)['positiveCentreBoundsBlender'])
    def test_exact_float32_readback_logs_before_pass_or_failure(self):
        source=ast.parse((Path(__file__).parent/'author.py').read_text(encoding='utf-8'));function=next(node for node in source.body if isinstance(node,ast.FunctionDef)and node.name=='surface_distance_readback');records=[];scope={'struct':struct,'save':lambda name,value:records.append((name,value))};exec(compile(ast.Module(body=[function],type_ignores=[]),'<actual surface readback function>','exec'),scope)
        class RNA:
            bl_rna=types.SimpleNamespace(properties={'surface_distance':types.SimpleNamespace(type='FLOAT')})
            def __setattr__(self,name,value):object.__setattr__(self,name,struct.unpack('<f',struct.pack('<f',value))[0])
        scope['surface_distance_readback'](RNA(),.001);self.assertTrue(records[-1][1]['proved']);self.assertEqual(records[-1][1]['observed'],.0010000000474974513);self.assertEqual(records[-1][1]['requested'],.001)
        class Wrong(RNA):
            def __setattr__(self,name,value):object.__setattr__(self,name,.002)
        with self.assertRaises(RuntimeError):scope['surface_distance_readback'](Wrong(),.001)
        self.assertEqual(records[-1][1]['observed'],.002);self.assertFalse(records[-1][1]['proved'])
    def test_nonfinite_and_invalid_grid_fail(self):
        with self.assertRaises(ValueError):scalar_stats([0,math.nan])
        with self.assertRaises(ValueError):positive_support([1],[2,2,2],[0,0,0],[1,1,1],1)
if __name__=='__main__':unittest.main()
