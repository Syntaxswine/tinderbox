"""Pure synthetic/API/source checks only. Never starts a Job or imports bpy."""
import ast
import copy
import hashlib
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace as NS
import unittest
from unittest.mock import patch

from contract import (CAP, SOURCE_FILES, hash_file, parse_json, read_json,
                      validate_ready, validate_spec)
from space import IDENTITY, coordinate_report
from metadata import observe_metadata

HERE = Path(__file__).resolve().parent
SPEC = json.loads((HERE / "input-spec.json").read_bytes())


def grids(selected=None):
    h = (selected or SPEC["selected"][0])["voxelSize"]
    m = [[h[0], 0., 0., 0.], [0., h[1], 0., 0.], [0., 0., h[2], 0.], [0., 0., 0., 1.]]
    return [{"name": name, "dataType": "FLOAT", "channels": 1, "indexToObject": copy.deepcopy(m)}
            for name in ("density", "flame", "temperature")]


def ready():
    epoch, tick = 1793435598.5924153, 1472433927.2199
    controller = {"pid": 100, "creationFileTime": "134379091985924153", "executable": "C:/Python/python.exe"}
    child = {"pid": 200, "creationFileTime": "134379091995924153", "executable": SPEC["tool"]["executable"]}
    return {"kind": "tinderbox-cache-field-guard-ready-v1", "phase": "metadata", "owner": SPEC["owner"],
        "proposalCommit": SPEC["proposalCommit"], "candidateCommit": "a" * 40,
        "sourcePins": {name: "b" * 64 for name in SOURCE_FILES}, "permitSha256": "c" * 64,
        "inputSpecSha256": "d" * 64, "nonce": "e" * 32, "output": str(HERE / "synthetic-output"),
        "runRecordSha256": "f" * 64, "controllerIdentity": controller, "childIdentity": child,
        "deadline": {"startEpoch": epoch, "startTickMs": tick, "deadlineEpoch": epoch + 120,
                     "deadlineTickMs": tick + 120000, "wallSeconds": 120},
        "jobLimitReadback": {"path": str(HERE / "synthetic-output/job-limit-readback.json"), "sha256": "a" * 64,
            "actual": {"processLimitBytes": CAP, "aggregateLimitBytes": CAP, "flags": 0x2300}, "validated": True}}


def bind(r, **extra):
    return validate_ready(r, SPEC, "d" * 64, "e" * 32, r["output"], r["childIdentity"],
                          extra.get("epoch", r["deadline"]["startEpoch"] + 2),
                          extra.get("tick", r["deadline"]["startTickMs"] + 2000), extra.get("stop", False))


class Registry:
    def __init__(self, factory):
        self.factory, self.items, self.removed = factory, [], []
    def __iter__(self): return iter(self.items)
    def new(self, *args):
        obj = self.factory(*args)
        self.items.append(obj)
        return obj
    def remove(self, obj, **kwargs):
        self.items.remove(obj)
        self.removed.append(obj)


class GridList(list):
    def __init__(self, values, fail_unload=False):
        super().__init__([NS(name=g["name"], data_type=g["dataType"], channels=g["channels"],
                            matrix_object=g["indexToObject"], is_loaded=False,
                            load=lambda: (_ for _ in ()).throw(AssertionError("Voxel tree load forbidden"))) for g in values])
        self.error_message, self.loads, self.unloads, self.fail_unload = "fake", 0, 0, fail_unload
    def load(self):
        self.loads += 1
        return True
    def unload(self):
        self.unloads += 1
        if self.fail_unload: raise ValueError("Synthetic unload failure")


def fake_bpy(values=None, fail_unload=False):
    lists = []
    def volume(name):
        gs = GridList(values or grids(), fail_unload)
        lists.append(gs)
        return NS(name=name, grids=gs, filepath=None, is_sequence=True)
    data = NS(filepath="")
    data.volumes = Registry(volume)
    data.objects = Registry(lambda name, value: NS(name=name, data=value, matrix_world=copy.deepcopy(IDENTITY), modifiers=[]))
    data.scenes = Registry(lambda name: NS(collection=NS(objects=NS(link=lambda obj: None))))
    return NS(data=data), lists


class Checks(unittest.TestCase):
    def test_01_fixed_spec(self):
        self.assertIs(validate_spec(copy.deepcopy(SPEC)).get("renderEnabled"), False)
        self.assertEqual(json.loads((HERE / "input-spec.schema.json").read_bytes())["properties"]["selected"]["const"], SPEC["selected"])
    def test_02_frame_and_clock(self):
        for field, value in (("frame", 30), ("ageSeconds", 2.0), ("resolution", [16, 16, 32])):
            s = copy.deepcopy(SPEC); s["selected"][0][field] = value
            with self.assertRaises(ValueError): validate_spec(s)
    def test_03_limits_and_render_block(self):
        for key, value in (("wallSeconds", 900), ("processCommittedBytes", CAP * 2), ("freshOutputBytes", CAP)):
            s = copy.deepcopy(SPEC); s["limits"][key] = value
            with self.assertRaises(ValueError): validate_spec(s)
        s = copy.deepcopy(SPEC); s["renderEnabled"] = True
        with self.assertRaises(ValueError): validate_spec(s)
    def test_04_selected_path_and_origin(self):
        s = copy.deepcopy(SPEC); s["selected"][0]["cache"]["path"] = str(HERE / "other.vdb")
        with self.assertRaises(ValueError): validate_spec(s)
        s = copy.deepcopy(SPEC); s["selected"][0]["scalarCentreOriginBlender"][0] += .01
        with self.assertRaises(ValueError): validate_spec(s)
    def test_05_coordinate_witnesses(self):
        r = coordinate_report(grids(), SPEC["selected"][0], [5.5, 0, 8.5])
        self.assertFalse(r["placementApplied"])
        self.assertFalse(r["indexValueCorrespondenceProvenByMetadata"])
        self.assertFalse(r["meshHalfVoxelAdapter"])
        self.assertEqual(len(r["witnesses"]), 6)
        a, b, c, z = r["witnesses"][:4]
        self.assertGreater(b["native"][0], a["native"][0])
        self.assertLess(c["native"][2], a["native"][2])
        self.assertGreater(z["native"][1], a["native"][1])
    def test_06_grid_type_and_matrix_refusals(self):
        for mutation in (lambda g: g[0].update(dataType="INT"), lambda g: g[0]["indexToObject"][0].__setitem__(1, .1),
                         lambda g: g[0]["indexToObject"][0].__setitem__(0, .1),
                         lambda g: g[0]["indexToObject"][0].__setitem__(0, float("nan"))):
            g = grids(); mutation(g)
            with self.assertRaises(ValueError): coordinate_report(g, SPEC["selected"][0], [5.5, 0, 8.5])
    def test_07_grid_presence_and_consistency(self):
        for g in (grids()[1:], [grids()[0], grids()[0]], grids() + [grids()[0]]):
            with self.assertRaises(ValueError): coordinate_report(g, SPEC["selected"][0], [5.5, 0, 8.5])
        g = grids(); g[1]["indexToObject"][0][3] = 1
        with self.assertRaises(ValueError): coordinate_report(g, SPEC["selected"][0], [5.5, 0, 8.5])
    def test_08_guard_positive(self):
        self.assertEqual(bind(ready()), 118)
    def test_09_exact_filetime(self):
        r = ready(); r["childIdentity"]["creationFileTime"] = int(r["childIdentity"]["creationFileTime"])
        with self.assertRaises(ValueError): bind(r)
    def test_10_guard_caps_and_breakaway(self):
        for key, value in (("processLimitBytes", CAP * 2), ("aggregateLimitBytes", CAP * 2), ("flags", 0x2B00)):
            r = ready(); r["jobLimitReadback"]["actual"][key] = value
            with self.assertRaises(ValueError): bind(r)
    def test_11_guard_nonce_sources_phase(self):
        for mutate in (lambda r: r.update(nonce="0" * 32), lambda r: r["sourcePins"].pop("metadata.py"),
                       lambda r: r.update(phase="render")):
            r = ready(); mutate(r)
            with self.assertRaises(ValueError): bind(r)
    def test_12_deadline_stop(self):
        r = ready()
        for kw in ({"epoch": r["deadline"]["deadlineEpoch"]}, {"tick": r["deadline"]["deadlineTickMs"]}, {"stop": True}):
            with self.assertRaises(ValueError): bind(r, **kw)
        r["deadline"]["deadlineEpoch"] += 1
        with self.assertRaises(ValueError): bind(r)
    def test_13_bounded_hash_and_tamper(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "small"; p.write_bytes(b"abc")
            rec = {"path": str(p), "bytes": 3, "sha256": hashlib.sha256(b"abc").hexdigest()}
            self.assertEqual(hash_file(rec, 3)["bytes"], 3)
            with self.assertRaises(ValueError): hash_file(rec, 2)
            p.write_bytes(b"abd")
            with self.assertRaises(ValueError): hash_file(rec, 3)
    def test_14_json_bounds_duplicates(self):
        for raw in (b'{"a":1,"a":2}', b'{"a":NaN}'):
            with self.assertRaises(ValueError): parse_json(raw)
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "json"; p.write_bytes(b'{"a":1}')
            with patch.object(Path, "read_bytes", side_effect=AssertionError("Must reject before allocation")):
                with self.assertRaises(ValueError): read_json(p, 2)
    def test_15_fake_metadata_only_and_heat_gate(self):
        bpy, lists = fake_bpy(); published = []
        r = observe_metadata(bpy, SPEC, lambda: None, lambda x: published.append(copy.deepcopy(x)))
        self.assertEqual(r["status"], "metadata-collected-review-required")
        self.assertFalse(r["renderReady"])
        self.assertTrue(all(f["heatIdentity"]["status"] == "unassigned-requires-source-review" for f in r["frames"]))
        self.assertTrue(all(gs.loads == gs.unloads == 1 for gs in lists))
        self.assertFalse(bpy.data.objects.items or bpy.data.volumes.items or bpy.data.scenes.items)
    def test_16_partial_metadata_preserved(self):
        bpy, _ = fake_bpy(grids()[1:]); published = []
        with self.assertRaises(ValueError):
            observe_metadata(bpy, SPEC, lambda: None, lambda x: published.append(copy.deepcopy(x)))
        self.assertEqual(published[-1]["frames"][0]["grids"][0]["name"], "flame")
        self.assertFalse(bpy.data.objects.items or bpy.data.volumes.items or bpy.data.scenes.items)
    def test_17_cleanup_failure_does_not_skip_other_resources(self):
        bpy, _ = fake_bpy(fail_unload=True); published = []
        with self.assertRaises(ValueError):
            observe_metadata(bpy, SPEC, lambda: None, lambda x: published.append(copy.deepcopy(x)))
        self.assertFalse(bpy.data.objects.items or bpy.data.volumes.items or bpy.data.scenes.items)
        self.assertEqual(published[-1]["cleanup"][0]["failures"][0]["stage"], "unload metadata")
    def test_18_fresh_scene_and_static_exclusions(self):
        bpy, _ = fake_bpy(); bpy.data.filepath = "original.blend"
        with self.assertRaises(ValueError): observe_metadata(bpy, SPEC, lambda: None, lambda x: None)
        for name in ("contract.py", "space.py", "metadata.py", "check.py"):
            raw = (HERE / name).read_bytes(); self.assertNotIn(b"\r", raw)
            compile(raw, name, "exec")
        source = (HERE / "metadata.py").read_text()
        for bad in ("bpy.ops", "frame_set(", "evaluated_get(", "subprocess", "save_as_mainfile", "render.render", "temperature_grid", "density_grid"):
            self.assertNotIn(bad, source)
        tree = ast.parse(source)
        self.assertFalse(any(isinstance(n, (ast.Import, ast.ImportFrom)) and
                             (getattr(n, "module", None) == "bpy" or any(a.name == "bpy" for a in n.names)) for n in tree.body))


if __name__ == "__main__":
    unittest.main(verbosity=2)
