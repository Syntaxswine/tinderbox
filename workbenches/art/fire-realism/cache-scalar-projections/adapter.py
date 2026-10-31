"""Future guarded Blender adapter. Import performs no bpy, VDB or render work."""
import array
import hashlib
import math
from pathlib import Path
from contract import finite, f32, require, same_path
from coordinates import matrix, sampler_report
from scalar import build_graph


class Owned:
    def __init__(self):
        self.items = []
        self.history = []

    def add(self, label, action):
        token = {"id": len(self.items), "label": label, "action": action, "attempted": False}
        self.items.append(token)
        return token

    def release(self, token):
        if token["attempted"]:
            return
        token["attempted"] = True
        try:
            token["action"]()
            self.history.append({"id": token["id"], "label": token["label"], "removed": True})
        except BaseException as error:
            self.history.append({"id": token["id"], "label": token["label"], "removed": False,
                                 "error": type(error).__name__ + ": " + str(error)})
            raise

    def dispose(self):
        result = []
        for token in reversed(self.items):
            if not token["attempted"]:
                try:
                    self.release(token)
                except BaseException:
                    pass  # release already records the exact failure; never retry it.
        return list(self.history)


class BlenderAdapter:
    def __init__(self, bpy, spec, expected_metadata, output, checkpoint):
        self.bpy, self.spec, self.expected_metadata = bpy, spec, expected_metadata
        self.output = Path(output)
        self.checkpoint = checkpoint
        self.owned, self.settings = Owned(), []
        self.scene = self.volume = self.volume_object = None
        self.frame_tokens = []
        self.prior_render_result = None

    def set(self, obj, name, requested):
        prop = obj.bl_rna.properties.get(name)
        require(prop is not None and not prop.is_readonly, "Required writable RNA unavailable: " + name)
        kind = prop.type
        if kind == "ENUM":
            require(type(requested) is str, "RNA enum identifier required: " + name)
            # Dynamic enum lists can require context. The setter and exact readback are authoritative.
        elif kind == "FLOAT":
            require(finite(requested), "Finite RNA float required: " + name)
        elif kind == "INT":
            require(type(requested) is int, "RNA integer required: " + name)
        elif kind == "BOOLEAN":
            require(type(requested) is bool, "RNA Boolean required: " + name)
        elif kind == "STRING":
            require(type(requested) is str, "RNA string required: " + name)
        else:
            raise ValueError("Unsupported required RNA type: " + name + "/" + kind)
        setattr(obj, name, requested)
        actual = getattr(obj, name)
        expected = f32(requested) if kind == "FLOAT" else requested
        require((same_path(actual, expected) if name == "filepath" else actual == expected),
                "RNA readback differs: " + name)
        self.settings.append({"rna": obj.bl_rna.identifier, "property": name, "type": kind,
                              "requested": requested, "actual": actual})
        return actual

    def own_data(self, collection, value, label):
        return self.owned.add(label, lambda: collection.remove(value, do_unlink=True))

    def prepare(self):
        self.checkpoint()
        bpy = self.bpy
        require(not bpy.data.filepath, "Fresh factory document required; no saved project load")
        require(not any(m.type == "FLUID" for obj in bpy.data.objects for m in obj.modifiers),
                "A fluid modifier exists; diagnostic refuses all evaluation")
        require(callable(bpy.data.images.load) and callable(bpy.ops.render.render),
                "Required render/own-EXR API unavailable")
        for key in ("size", "is_float", "channels", "pixels", "alpha_mode", "colorspace_settings"):
            require(bpy.types.Image.bl_rna.properties.get(key) is not None,
                    "Required own-image API property unavailable: " + key)
        self.prior_render_result = bpy.data.images.get("Render Result")
        self.scene = bpy.data.scenes.new("V5 fixed scalar projections")
        self.own_data(bpy.data.scenes, self.scene, "own scene")
        r, c = self.scene.render, self.scene.cycles
        for obj, values in ((r, {"engine": "CYCLES", "threads_mode": "FIXED", "threads": 4,
                "resolution_x": 320, "resolution_y": 200, "resolution_percentage": 100,
                "pixel_aspect_x": 1., "pixel_aspect_y": 1., "film_transparent": False,
                "use_motion_blur": False, "use_compositing": False, "use_sequencer": False,
                "use_multiview": False, "use_file_extension": True, "dither_intensity": 0.}),
                (c, {"device": "CPU", "shading_system": False, "samples": 8,
                "use_adaptive_sampling": False, "use_denoising": False,
                "volume_step_rate": 1., "volume_max_steps": 512}),
                (r.image_settings, {"file_format": "OPEN_EXR", "color_depth": "32",
                "color_mode": "RGBA", "exr_codec": "ZIP", "color_management": "FOLLOW_SCENE"}),
                (self.scene.unit_settings, {"system": "NONE", "scale_length": 1.}),
                (self.scene.view_settings, {"view_transform": "Standard", "look": "None",
                "exposure": 0., "gamma": 1.})):
            for name, value in values.items():
                self.set(obj, name, value)
        require(r.image_settings.has_linear_colorspace is True,
                "Actual output format does not require linear float color")
        self.output_color_space = r.image_settings.linear_colorspace_settings.name
        world = bpy.data.worlds.new("Scalar diagnostic opaque black")
        self.own_data(bpy.data.worlds, world, "own black world")
        self.scene.world = world
        self.set(world, "use_nodes", True)
        world.node_tree.nodes.clear()
        background = world.node_tree.nodes.new("ShaderNodeBackground")
        output = world.node_tree.nodes.new("ShaderNodeOutputWorld")
        background.inputs["Color"].default_value = (0., 0., 0., 1.)
        background.inputs["Strength"].default_value = 0.
        world.node_tree.links.new(background.outputs["Background"], output.inputs["Surface"])
        require(tuple(background.inputs["Color"].default_value) == (0., 0., 0., 1.) and
                background.inputs["Strength"].default_value == 0., "Black world readback differs")
        self.preflight_graphs = []
        for channel in ("density", "flame", "signedHeat"):
            self.checkpoint()
            material = bpy.data.materials.new("API-only preflight " + channel)
            token = self.own_data(bpy.data.materials, material, "own preflight material " + channel)
            self.set(material.cycles, "volume_interpolation", "LINEAR")
            self.set(material.cycles, "volume_step_rate", 1.)
            self.preflight_graphs.append(build_graph(material, channel, self.set))
            self.owned.release(token)
        camera = bpy.data.cameras.new("Pinned native-oblique scalar camera")
        self.own_data(bpy.data.cameras, camera, "own camera data")
        self.camera_object = bpy.data.objects.new(camera.name, camera)
        self.own_data(bpy.data.objects, self.camera_object, "own camera object")
        self.scene.collection.objects.link(self.camera_object)
        self.scene.camera = self.camera_object
        for name, value in {"type": "ORTHO", "sensor_fit": "HORIZONTAL", "ortho_scale": 12.8,
                            "shift_x": 0., "shift_y": 0., "clip_start": .1, "clip_end": 300.}.items():
            self.set(camera, name, value)
        from mathutils import Matrix
        self.matrix_type = Matrix
        self.camera_object.matrix_world = Matrix(self.spec["camera"]["blenderWorldRows"])
        return {"settings": self.settings, "freshScene": self.scene.name,
                "sourceProjectOpened": False, "fluidEvaluated": False,
                "background": "opaque black, zero world emission; alpha1",
                "preview": "No preview or secondary render is produced",
                "worldNodes": ["ShaderNodeBackground(Color0,Strength0)", "ShaderNodeOutputWorld.Surface"],
                "worldLinkCount": len(world.node_tree.links), "preflightGraphs": self.preflight_graphs,
                "hasLinearOutputColorSpace": bool(r.image_settings.has_linear_colorspace),
                "fileColorManagement": r.image_settings.color_management,
                "outputColorSpaceReadback": self.output_color_space}

    def camera_observation(self):
        with self.bpy.context.temp_override(scene=self.scene, view_layer=self.scene.view_layers[0]):
            graph = self.bpy.context.evaluated_depsgraph_get()
            projection = self.camera_object.calc_matrix_camera(graph, x=320, y=200, scale_x=1., scale_y=1.)
        return matrix([list(row) for row in self.camera_object.matrix_world]), matrix([list(row) for row in projection])

    def load_cache(self, selected):
        require(self.volume is None, "One ordinary Volume at a time")
        bpy = self.bpy
        self.volume = volume = bpy.data.volumes.new("Literal V5 frame %d" % selected["frame"])
        self.frame_tokens = [self.own_data(bpy.data.volumes, volume, "own volume data")]
        self.volume_object = obj = bpy.data.objects.new(volume.name, volume)
        self.frame_tokens.append(self.own_data(bpy.data.objects, obj, "own volume object"))
        self.scene.collection.objects.link(obj)
        self.set(volume, "filepath", selected["cache"]["path"])
        self.set(volume, "is_sequence", False)
        for name, value in {"precision": "FULL", "space": "WORLD",
                            "step_size": self.spec["renderer"]["stepMetres"], "clipping": 0.}.items():
            self.set(volume.render, name, value)
        obj.matrix_world = self.matrix_type(self.spec["space"]["volumeObjectWorld"])
        self.frame_tokens.append(self.owned.add("unload own volume grids", lambda: volume.grids.unload()))
        self.checkpoint()
        require(volume.grids.load(), "VDB metadata load failed: " + volume.grids.error_message)
        grids = [{"name": g.name, "dataType": g.data_type, "channels": g.channels,
                  "indexToObject": matrix([list(row) for row in g.matrix_object]),
                  "treeLoadedBeforeRendering": bool(g.is_loaded)} for g in volume.grids]
        require(len(grids) <= 64 and len({g["name"] for g in grids}) == len(grids), "Grid count/name mismatch")
        expected = next(x for x in self.expected_metadata["frames"] if x["frame"] == selected["frame"])
        fields = ("name", "dataType", "channels", "indexToObject")
        actual_core = sorted([{k: x[k] for k in fields} for x in grids], key=lambda x: x["name"])
        expected_core = sorted([{k: x[k] for k in fields} for x in expected["grids"]], key=lambda x: x["name"])
        require(actual_core == expected_core, "Current named grids differ from actual pinned metadata")
        scalar = [x for x in grids if x["name"] in ("density", "flame", "temperature")]
        require(len(scalar) == 3 and all(x["dataType"] == "FLOAT" and x["channels"] == 1 for x in scalar),
                "Literal D/F/H scalar grids required")
        placement = sampler_report(scalar[0]["indexToObject"],
                                   [list(row) for row in obj.matrix_world], self.spec)
        return {"frame": selected["frame"], "sourceAgeSeconds": selected["ageSeconds"], "grids": grids,
                "sampler": placement, "activeBounds": {"available": False,
                "reason": "VolumeGrid RNA exposes no exact active-index-bbox API; no guessed bounds/parser"},
                "valuesReadByPython": False, "cacheRawBitsClaimedEqual": False}

    def render(self, selected, channel):
        bpy = self.bpy
        path = self.output / ("scalar-frame%03d-%s.exr" % (selected["frame"], channel))
        require(not path.exists(), "Refuse output overwrite")
        material = bpy.data.materials.new("Fixed %s frame%d" % (channel, selected["frame"]))
        token = self.own_data(bpy.data.materials, material, "own scalar material")
        for name, value in {"volume_interpolation": "LINEAR", "volume_step_rate": 1.}.items():
            self.set(material.cycles, name, value)
        graph = build_graph(material, channel, self.set)
        self.volume.materials.clear()
        self.volume.materials.append(material)
        self.set(self.scene.render, "filepath", str(path))
        self.checkpoint()
        result = bpy.ops.render.render(scene=self.scene.name, write_still=True, use_viewport=False)
        self.checkpoint()
        require(result == {"FINISHED"} and path.is_file(), "Sole projection did not finish")
        stat = path.stat()
        require(0 < stat.st_size <= self.spec["limits"]["outputFileBytesMaximum"], "Projection file size ceiling")
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for block in iter(lambda: stream.read(131072), b""):
                digest.update(block)
        image = bpy.data.images.load(str(path), check_existing=False)
        image_token = self.own_data(bpy.data.images, image, "own EXR inspection image")
        require(image.is_float and list(image.size) == [320, 200] and image.channels == 4,
                "Own EXR inspection API/shape differs")
        pixels = array.array("f", [0.]) * (320 * 200 * 4)
        require(len(image.pixels) == len(pixels) and callable(image.pixels.foreach_get),
                "Own EXR pixel API unavailable")
        image.pixels.foreach_get(pixels)
        require(all(math.isfinite(x) for x in pixels), "Nonfinite own EXR pixels; preserve output and stop")
        minimum, maximum, nonzero = math.inf, -math.inf, False
        for i in range(0, len(pixels), 4):
            require(pixels[i + 3] == 1., "Declared opaque-black output alpha differs")
            for c in range(3):
                value = pixels[i + c]
                minimum, maximum = min(minimum, value), max(maximum, value)
                nonzero = nonzero or value != 0
        observation = {"emptyRgb": not nonzero, "minimumRgb": minimum,
                       "maximumRgb": maximum, "colorSpaceReadback": image.colorspace_settings.name,
                       "alphaMode": image.alpha_mode, "float32InspectionBytes": len(pixels) * 4,
                       "inspectionScope": "Blender-loaded own EXR buffer; not independent file-bit/radiometric proof"}
        del pixels
        self.owned.release(image_token)
        self.volume.materials.clear()
        self.owned.release(token)
        return {"frame": selected["frame"], "sourceAgeSeconds": selected["ageSeconds"], "channel": channel,
                "path": str(path), "bytes": stat.st_size, "sha256": digest.hexdigest(),
                "nodes": graph, "inspection": observation, "rerun": False,
                "emptyPolicy": "Preserve/report; never substitute, normalize or rerender"}

    def close_frame(self):
        for token in reversed(self.frame_tokens):
            self.owned.release(token)
        self.frame_tokens = []
        self.volume = self.volume_object = None

    def dispose(self):
        # Render Result is engine-created; remove only if this document did not already own one.
        try:
            result = self.bpy.data.images.get("Render Result") if self.scene is not None else None
            if result is not None and result != self.prior_render_result:
                self.own_data(self.bpy.data.images, result, "own new Render Result")
        except BaseException as error:
            self.owned.history.append({"label": "discover own new Render Result", "removed": False,
                                       "error": type(error).__name__ + ": " + str(error)})
        return self.owned.dispose()
