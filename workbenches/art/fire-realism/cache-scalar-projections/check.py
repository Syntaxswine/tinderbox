"""Pure/fake source checks only. Never imports bpy, launches a Job or reads VDB data."""
import ast
import copy
import hashlib
import json
import math
import sys
import types
import unittest
from pathlib import Path
import contract
import coordinates as co
import scalar
import preview
from adapter import BlenderAdapter, Owned
from projection import run_protocol
import entry

HERE = Path(__file__).resolve().parent
SPEC = json.loads((HERE / "fixed-spec.json").read_bytes())


class FakeAdapter:
    def __init__(self, failure=None):
        self.events, self.failure, self.count = [], failure, 0

    def prepare(self):
        self.events.append("prepare")
        if self.failure == "api":
            raise ValueError("unsupported required API")
        return {"fake": True}

    def camera_observation(self):
        self.events.append("camera")
        world = [[contract.f32(x) for x in row] for row in SPEC["camera"]["blenderWorldRows"]]
        projection = co.from_columns(SPEC["camera"]["nativeProjectionColumnMajor"])
        if self.failure == "camera":
            projection[0][0] *= .9
        return world, projection

    def load_cache(self, selected):
        self.events.append("load%d" % selected["frame"])
        if self.failure == "grid":
            raise ValueError("literal grid mismatch")
        return {"frame": selected["frame"], "fake": True, "valuesRead": False}

    def render(self, selected, channel):
        self.count += 1
        self.events.append("render%d/%s" % (selected["frame"], channel))
        if self.failure in ("render", "render+cleanup") and self.count == 3:
            raise ValueError("original render failure")
        return {"frame": selected["frame"], "sourceAgeSeconds": selected["ageSeconds"],
                "channel": channel, "fake": True, "notAnImage": True,
                "preview": {"additionalRenders": 0, "fake": True, "notAnImage": True}}

    def close_frame(self):
        self.events.append("close")

    def dispose(self):
        self.events.append("dispose")
        return [{"label": "fake resources only", "removed": self.failure not in ("cleanup", "render+cleanup")}]


def ready_fixture():
    ft = 134379248623703761
    start = (ft - 116444736000000000) / 10000000
    who = {"pid": 42, "creationFileTime": str(ft + 100), "executable": SPEC["tool"]["executable"]}
    output = HERE / "fake-output-do-not-create"
    ready = {"kind": contract.READY_KIND, "phase": contract.PHASE, "owner": contract.OWNER,
             "proposalCommit": contract.PROPOSAL, "candidateCommit": "1" * 40,
             "sourcePins": {name: "f" * 64 for name in contract.SOURCE_FILES},
             "permitSha256": "a" * 64, "inputSpecSha256": contract.SPEC_SHA256,
             "nonce": "b" * 32, "output": str(output), "runRecordSha256": "c" * 64,
             "controllerIdentity": {"pid": 41, "creationFileTime": str(ft),
                                    "executable": SPEC["tool"]["executable"]},
             "childIdentity": who,
             "deadline": {"startEpoch": start, "startTickMs": 1000, "deadlineEpoch": start + 900,
                          "deadlineTickMs": 901000, "wallSeconds": 900},
             "jobLimitReadback": {"path": str(output / "job-limit-readback.json"), "sha256": "d" * 64,
                "validated": True, "actual": {"processLimitBytes": contract.CAP,
                "aggregateLimitBytes": contract.CAP, "flags": 8960}}}
    return ready, who, output, start


class PureMath(unittest.TestCase):
    def test_asymmetric_strides_and_signed_axes(self):
        self.assertEqual(co.index_linear([5, 11, 23]), 53525)
        self.assertEqual(co.index_linear([46, 3, 1]), 2494)
        self.assertEqual(co.index_linear([47, 47, 95]), 221183)
        base = co.native(co.centre([5, 11, 23]))
        for index, delta in [([6, 11, 23], [contract.H, 0, 0]),
                             ([5, 12, 23], [0, 0, -contract.H]),
                             ([5, 11, 24], [0, contract.H, 0])]:
            actual = co.native(co.centre(index))
            for a, b in zip([x - y for x, y in zip(actual, base)], delta):
                self.assertAlmostEqual(a, b, places=14)

    def test_index_refuses_outside_and_noninteger(self):
        for index in ([48, 0, 0], [0, 48, 0], [0, 0, 96], [-1, 0, 0], [True, 0, 0], [1.5, 0, 0]):
            with self.assertRaises(ValueError):
                co.index_linear(index)

    def test_sampler_halfcentre_and_dense_bbox_cancellation(self):
        report = co.sampler_report(SPEC["space"]["observedIndexToObject"],
                                   SPEC["space"]["volumeObjectWorld"], SPEC)
        self.assertFalse(report["actualGridValuesSampled"])
        self.assertFalse(report["bitIdentityClaimed"])
        for row in report["witnesses"]:
            for value, index in zip(row["cyclesSampleCoordinate"], row["index"]):
                self.assertAlmostEqual(value, index + .5, places=12)
            for index, b, d in zip(row["index"], [3, 5, 7], [41, 37, 83]):
                u = (index + .5 - b) / d
                self.assertAlmostEqual(u * d - .5, index - b, places=12)

    def test_naive_centre_translation_and_transpose_refuse(self):
        world = copy.deepcopy(SPEC["space"]["volumeObjectWorld"])
        for a in range(3):
            world[a][3] += contract.H / 2
        with self.assertRaises(ValueError):
            co.sampler_report(SPEC["space"]["observedIndexToObject"], world, SPEC)
        bad = copy.deepcopy(SPEC["space"]["observedIndexToObject"])
        bad[0][1] = contract.H
        with self.assertRaises(ValueError):
            co.sampler_report(bad, SPEC["space"]["volumeObjectWorld"], SPEC)

    def test_float32_camera_projects_same_as_native(self):
        world = [[contract.f32(x) for x in row] for row in SPEC["camera"]["blenderWorldRows"]]
        projection = [[contract.f32(x) for x in row]
                      for row in co.from_columns(SPEC["camera"]["nativeProjectionColumnMajor"])]
        report = co.camera_report(world, projection, SPEC)
        self.assertLess(report["maxNdcResidual"], .000002)
        self.assertGreaterEqual(len(report["witnesses"]), 10)
        changed = copy.deepcopy(world)
        changed[0][3] += .01
        with self.assertRaises(ValueError):
            co.camera_report(changed, projection, SPEC)

    def test_signed_heat_and_nonfinite_refusal(self):
        for value, expected in [(-2., [0., 0., 2.]), (0., [0., 0., 0.]), (.5, [.5, 0., 0.])]:
            self.assertEqual(scalar.scalar_rgb("signedHeat", value), expected)
        self.assertEqual(scalar.scalar_rgb("density", .25), [.25] * 3)
        for value in (math.inf, -math.inf, math.nan, True, "1"):
            with self.assertRaises(ValueError):
                scalar.scalar_rgb("signedHeat", value)


class FixedAndGuard(unittest.TestCase):
    def test_exact_recipe_and_schema(self):
        self.assertEqual(hashlib.sha256((HERE / "fixed-spec.json").read_bytes()).hexdigest(), contract.SPEC_SHA256)
        self.assertIs(contract.validate_spec(SPEC), SPEC)
        schema = json.loads((HERE / "fixed-spec.schema.json").read_bytes())
        self.assertEqual(schema["const"], SPEC)
        for key, value in (("samples", 16), ("volumePrecision", "HALF"), ("stepMetres", 0.),
                           ("previews", False), ("filmTransparent", True)):
            mutated = copy.deepcopy(SPEC)
            mutated["renderer"][key] = value
            with self.assertRaises(ValueError):
                contract.validate_spec(mutated)
        mutated = copy.deepcopy(SPEC)
        mutated["gain"] = 2
        with self.assertRaises(ValueError):
            contract.validate_spec(mutated)

    def test_duplicate_and_nonfinite_json(self):
        for text in (b'{"a":1,"a":2}', b'{"a":NaN}', b'{"a":Infinity}'):
            with self.assertRaises(ValueError):
                contract.parse_json(text)

    def test_valid_new_guard_and_schema(self):
        ready, who, output, start = ready_fixture()
        self.assertEqual(contract.validate_ready(ready, SPEC, contract.SPEC_SHA256, "b" * 32,
                                                output, who, start + 1, 2000), 899)
        schema = json.loads((HERE / "guard-ready.schema.json").read_bytes())
        self.assertEqual(schema["properties"]["kind"]["const"], contract.READY_KIND)
        self.assertEqual(set(schema["properties"]["sourcePins"]["required"]), set(contract.SOURCE_FILES))

    def test_metadata_guard_or_rounded_identity_refuses(self):
        ready, who, output, start = ready_fixture()
        for change in ("old", "rounded", "nonce", "source", "memory", "breakaway"):
            bad = copy.deepcopy(ready)
            if change == "old":
                bad["kind"], bad["phase"] = "tinderbox-cache-field-guard-ready-v1", "metadata"
            elif change == "rounded":
                bad["childIdentity"]["creationFileTime"] = int(bad["childIdentity"]["creationFileTime"])
            elif change == "nonce":
                bad["nonce"] = "c" * 32
            elif change == "source":
                del bad["sourcePins"]["adapter.py"]
            elif change == "memory":
                bad["jobLimitReadback"]["actual"]["aggregateLimitBytes"] += 1
            else:
                bad["jobLimitReadback"]["actual"]["flags"] |= 0x800
            with self.assertRaises(ValueError):
                contract.validate_ready(bad, SPEC, contract.SPEC_SHA256, "b" * 32, output, who, start + 1, 2000)

    def test_original_deadline_and_stop_refuse(self):
        ready, who, output, start = ready_fixture()
        for now, tick, stop in ((start + 901, 2000, False), (start + 1, 902000, False), (start + 1, 2000, True)):
            with self.assertRaises(ValueError):
                contract.validate_ready(ready, SPEC, contract.SPEC_SHA256, "b" * 32, output, who, now, tick, stop)
        ready["deadline"]["deadlineEpoch"] += 1
        with self.assertRaises(ValueError):
            contract.validate_ready(ready, SPEC, contract.SPEC_SHA256, "b" * 32, output, who, start + 1, 2000)


class Protocol(unittest.TestCase):
    def call(self, adapter, checkpoint=lambda: None, publish=lambda x: None):
        report = {}
        result = run_protocol(adapter, SPEC, checkpoint, publish, report)
        return result

    def test_six_fixed_order_no_native_claim(self):
        adapter = FakeAdapter()
        report = self.call(adapter)
        self.assertEqual([(r["frame"], r["channel"]) for r in report["projections"]],
                         [(f, c) for f in (31, 61) for c in scalar.CHANNELS])
        self.assertEqual(adapter.count, 6)
        self.assertEqual(adapter.events.count("close"), 2)
        self.assertEqual(adapter.events.count("dispose"), 1)
        self.assertFalse(report["nativeQualityAcceptance"])
        self.assertFalse(report["gpuCostCredit"])

    def test_gate_failure_precedes_all_scene_or_render_work(self):
        adapter = FakeAdapter()
        def refuse():
            raise ValueError("guard absent")
        with self.assertRaisesRegex(ValueError, "guard absent"):
            self.call(adapter, refuse)
        self.assertEqual(adapter.events, ["dispose"])
        self.assertEqual(adapter.count, 0)

    def test_api_camera_and_grid_fail_before_render(self):
        for failure in ("api", "camera", "grid"):
            adapter = FakeAdapter(failure)
            with self.assertRaises(ValueError):
                self.call(adapter)
            self.assertEqual(adapter.count, 0)
            self.assertEqual(adapter.events.count("dispose"), 1)
            if failure == "camera":
                self.assertFalse(any(x.startswith("load") for x in adapter.events))

    def test_partial_failure_preserved_and_never_retried(self):
        for failure in ("render", "render+cleanup"):
            adapter, report = FakeAdapter(failure), {}
            with self.assertRaisesRegex(ValueError, "original render failure"):
                run_protocol(adapter, SPEC, lambda: None, lambda x: None, report)
            self.assertEqual(adapter.count, 3)
            self.assertEqual(len(report["projections"]), 2)
            self.assertEqual(report["failure"]["message"], "original render failure")
            self.assertEqual(adapter.events.count("dispose"), 1)

    def test_cleanup_failure_blocks_success(self):
        with self.assertRaisesRegex(RuntimeError, "retire"):
            self.call(FakeAdapter("cleanup"))

    def test_progress_failure_cleans_before_propagating(self):
        adapter = FakeAdapter()
        def refuse(report):
            raise OSError("own output write failed")
        with self.assertRaisesRegex(OSError, "own output"):
            self.call(adapter, publish=refuse)
        self.assertEqual(adapter.count, 0)
        self.assertEqual(adapter.events.count("dispose"), 1)


class FakeSockets(list):
    def get(self, name):
        return next((x for x in self if x.name == name), None)


class FakeSocket:
    def __init__(self, node, name, identifier=None, value=None):
        self.node, self.name, self.identifier, self.is_linked = node, name, identifier or name, False
        if value is not None:
            self.default_value = value


class FakeNode:
    def __init__(self, kind):
        self.bl_idname, self.name, self.mute = kind, kind, False
        self.inputs, self.outputs = FakeSockets(), FakeSockets()
        layouts = {
            "ShaderNodeAttribute": ([], ["Fac"]),
            "ShaderNodeEmission": ([("Color", [0., 0., 0., 1.]), ("Strength", 1.)], ["Emission"]),
            "ShaderNodeOutputMaterial": ([("Surface", None), ("Volume", None), ("Displacement", None)], []),
            "ShaderNodeMath": ([("Value", 0.), ("Value", 0.)], ["Value"]),
            "ShaderNodeCombineColor": ([("Red", 0.), ("Green", 0.), ("Blue", 0.)], ["Color"]),
        }
        inputs, outputs = layouts[kind]
        for i, (name, value) in enumerate(inputs):
            self.inputs.append(FakeSocket(self, name, name + ("_001" if i == 1 and name == "Value" else ""), value))
        self.outputs.extend(FakeSocket(self, name) for name in outputs)


class FakeLinks(list):
    def new(self, a, b):
        a.is_linked = b.is_linked = True
        self.append(types.SimpleNamespace(from_node=a.node, from_socket=a, to_node=b.node, to_socket=b))


class FakeNodes(list):
    def __init__(self, links):
        super().__init__()
        self.links = links

    def new(self, kind):
        item = FakeNode(kind)
        self.append(item)
        return item

    def clear(self):
        super().clear()
        self.links.clear()


class FakeMaterial:
    def __init__(self):
        links = FakeLinks()
        self.node_tree = types.SimpleNamespace(nodes=FakeNodes(links), links=links)
        self.use_nodes = False


class FakeRNA:
    def __init__(self, clamp=False):
        self.bl_rna = types.SimpleNamespace(identifier="FakeRNA", properties={
            "step": types.SimpleNamespace(type="FLOAT", is_readonly=False),
            "mode": types.SimpleNamespace(type="ENUM", is_readonly=False),
            "locked": types.SimpleNamespace(type="FLOAT", is_readonly=True)})
        self.clamp = clamp

    def __setattr__(self, key, value):
        if key == "step":
            value = contract.f32(min(value, .01) if self.clamp else value)
        object.__setattr__(self, key, value)


class OwnedAndGraph(unittest.TestCase):
    def test_cleanup_once_tracks_previously_released_and_failed(self):
        owned, events = Owned(), []
        one = owned.add("one", lambda: events.append("one"))
        def fail():
            events.append("bad")
            raise OSError("owned cleanup failed")
        bad = owned.add("bad", fail)
        owned.add("last", lambda: events.append("last"))
        owned.release(one)
        with self.assertRaisesRegex(OSError, "owned cleanup"):
            owned.release(bad)
        result = owned.dispose()
        self.assertEqual(events, ["one", "bad", "last"])
        self.assertEqual([(x["label"], x["removed"]) for x in result],
                         [("one", True), ("bad", False), ("last", True)])
        owned.dispose()
        self.assertEqual(events.count("bad"), 1)

    def test_required_typed_api_and_float32_readback(self):
        adapter = BlenderAdapter(None, SPEC, {}, HERE, lambda: None)
        obj = FakeRNA()
        self.assertEqual(adapter.set(obj, "step", contract.H / 2), contract.H / 2)
        self.assertEqual(adapter.set(obj, "mode", "FULL"), "FULL")
        for name in ("missing", "locked"):
            with self.assertRaises(ValueError):
                adapter.set(obj, name, 1.)
        with self.assertRaises(ValueError):
            adapter.set(FakeRNA(clamp=True), "step", contract.H / 2)

    def test_literal_density_and_flame_unit_graphs(self):
        for channel in ("density", "flame"):
            material = FakeMaterial()
            audit = scalar.build_graph(material, channel, setattr)
            self.assertEqual(len(audit["nodes"]), 3)
            self.assertEqual(len(audit["links"]), 2)
            attribute = next(x for x in material.node_tree.nodes if x.bl_idname == "ShaderNodeAttribute")
            self.assertEqual((attribute.attribute_type, attribute.attribute_name), ("GEOMETRY", channel))
            emission = next(x for x in material.node_tree.nodes if x.bl_idname == "ShaderNodeEmission")
            self.assertEqual(tuple(emission.inputs.get("Color").default_value), (1., 1., 1., 1.))
            self.assertTrue(emission.inputs.get("Strength").is_linked)
            output = next(x for x in material.node_tree.nodes if x.bl_idname == "ShaderNodeOutputMaterial")
            self.assertTrue(output.inputs.get("Volume").is_linked)
            self.assertFalse(output.inputs.get("Surface").is_linked)

    def test_signed_heat_has_exact_split_no_kelvin_or_blackbody(self):
        material = FakeMaterial()
        audit = scalar.build_graph(material, "signedHeat", setattr)
        self.assertEqual(len(audit["nodes"]), 7)
        self.assertEqual(len(audit["links"]), 7)
        nodes = {x.name: x for x in material.node_tree.nodes}
        self.assertEqual(nodes["LiteralScalar"].attribute_name, "temperature")
        for name in ("PositiveH", "NegativeH"):
            self.assertEqual(nodes[name].operation, "MAXIMUM")
            self.assertFalse(nodes[name].use_clamp)
            self.assertTrue(nodes[name].inputs[0].is_linked)
            self.assertFalse(nodes[name].inputs[1].is_linked)
            self.assertEqual(nodes[name].inputs[1].default_value, 0.)
        self.assertEqual(nodes["NegateH"].inputs[1].default_value, -1.)
        self.assertEqual(nodes["SignedH_RGB"].inputs.get("Green").default_value, 0.)
        self.assertEqual(nodes["UnitEmission"].inputs.get("Strength").default_value, 1.)
        self.assertFalse(nodes["UnitEmission"].inputs.get("Strength").is_linked)
        self.assertFalse(audit["blackbody"])
        self.assertFalse(audit["normalization"])

    def test_unknown_scalar_refuses_before_mutation(self):
        material = FakeMaterial()
        with self.assertRaises(ValueError):
            scalar.build_graph(material, "kelvin", setattr)
        self.assertFalse(material.use_nodes)
        self.assertEqual(len(material.node_tree.nodes), 0)


class SourceIsolation(unittest.TestCase):
    def test_module_import_does_not_import_bpy_or_mathutils(self):
        self.assertNotIn("bpy", sys.modules)
        self.assertNotIn("mathutils", sys.modules)
        for p in HERE.glob("*.py"):
            ast.parse(p.read_text(), filename=str(p))
        source = (HERE / "entry.py").read_text()
        self.assertLess(source.index("checkpoint()\n    require("), source.index("bpy = load_bpy_after_gate()"))
        for prohibited in ("open_mainfile", "bake_data(", "bake_all(", "free_data(", "subprocess",
                           "grid.load(", "density_grid", "temperature_grid", "heat_grid", "flame_grid"):
            for p in (HERE / "adapter.py", HERE / "projection.py", HERE / "entry.py"):
                self.assertNotIn(prohibited, p.read_text(), str(p))

    def test_source_pins_when_present(self):
        pin_path = HERE / "source-pins.json"
        self.assertTrue(pin_path.is_file(), "Generate the final scoped source pins before delivery/check")
        pins = json.loads(pin_path.read_bytes())
        self.assertEqual(set(pins["core"]), set(contract.SOURCE_FILES))
        for name, record in pins["core"].items():
            raw = (HERE / name).read_bytes()
            self.assertEqual(len(raw), record["bytes"], name)
            self.assertEqual(hashlib.sha256(raw).hexdigest(), record["sha256"], name)
            self.assertNotIn(b"\r", raw, "New scoped source is canonicalLF")
        self.assertEqual(pins["status"], "source-only-unexecuted")



class SameExrPreview(unittest.TestCase):
    def scene(self):
        settings = types.SimpleNamespace(file_format="OPEN_EXR", color_mode="RGBA", color_depth="32",
                    color_management="FOLLOW_SCENE", quality=90, exr_codec="ZIP",
                    linear_colorspace_settings=types.SimpleNamespace(name="Linear Rec.709"))
        return types.SimpleNamespace(render=types.SimpleNamespace(image_settings=settings),
                    view_settings=types.SimpleNamespace(view_transform="Standard", look="None", exposure=0., gamma=1.),
                    display_settings=types.SimpleNamespace(display_device="sRGB"))

    def image(self, fail=False):
        calls = []
        def save_render(**kwargs):
            calls.append(kwargs)
            if fail:
                raise OSError("original display-copy save failure")
        return types.SimpleNamespace(save_render=save_render, calls=calls, filepath="authoritative.exr")

    def test_preflight_then_one_same_image_save_no_files_or_renders(self):
        scene, image = self.scene(), self.image()
        original = {k: getattr(scene.render.image_settings, k) for k in preview.FORMAT_KEYS}
        with preview.jpg_settings(scene, setattr) as profile:
            self.assertEqual(profile["format"]["file_format"], "JPEG")
            self.assertEqual(profile["format"]["quality"], 95)
        self.assertEqual(image.calls, [])
        profile = preview.save_fixed_jpg(image, scene, "NOT-WRITTEN-BY-FAKE.jpg", setattr, lambda: None)
        self.assertEqual(len(image.calls), 1)
        self.assertIs(image.calls[0]["scene"], scene)
        self.assertEqual(image.calls[0]["quality"], 95)
        self.assertEqual(profile["restoredExrFormat"], original)
        self.assertEqual({k: getattr(scene.render.image_settings, k) for k in preview.FORMAT_KEYS}, original)
        self.assertEqual(image.filepath, "authoritative.exr")
        self.assertEqual(profile["additionalRenders"], 0)
        self.assertTrue(profile["clippingProne"])

    def test_wrong_view_fails_before_save_or_format_change(self):
        scene, image = self.scene(), self.image()
        scene.view_settings.exposure = .5
        with self.assertRaisesRegex(ValueError, "view/display"):
            preview.save_fixed_jpg(image, scene, "NOT-WRITTEN.jpg", setattr, lambda: None)
        self.assertEqual(image.calls, [])
        self.assertEqual(scene.render.image_settings.file_format, "OPEN_EXR")

    def test_save_failure_preserves_primary_and_restores_exr(self):
        scene, image = self.scene(), self.image(fail=True)
        with self.assertRaisesRegex(OSError, "original display-copy"):
            preview.save_fixed_jpg(image, scene, "NOT-WRITTEN.jpg", setattr, lambda: None)
        self.assertEqual(len(image.calls), 1)
        self.assertEqual(scene.render.image_settings.file_format, "OPEN_EXR")
        self.assertEqual(scene.render.image_settings.color_depth, "32")
        self.assertEqual(scene.render.image_settings.quality, 90)

    def test_restore_error_is_not_hidden_or_a_retry(self):
        scene, image = self.scene(), self.image(fail=True)
        def setter(obj, key, value):
            if key == "file_format" and value == "OPEN_EXR":
                raise ValueError("synthetic restore failure")
            setattr(obj, key, value)
        with self.assertRaisesRegex(OSError, "original display-copy") as caught:
            preview.save_fixed_jpg(image, scene, "NOT-WRITTEN.jpg", setter, lambda: None)
        self.assertEqual(len(image.calls), 1)
        self.assertTrue(any("restoration failed" in note for note in caught.exception.__notes__))

if __name__ == "__main__":
    unittest.main(verbosity=2)
