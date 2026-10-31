"""Fixed same-EXR JPG display copy. No bpy import or render operation."""
from contextlib import contextmanager
from contract import require

FORMAT_KEYS = ("file_format", "color_mode", "color_depth", "color_management", "quality", "exr_codec")


def fixed_view(scene):
    result = {"viewTransform": scene.view_settings.view_transform, "look": scene.view_settings.look,
              "exposure": scene.view_settings.exposure, "gamma": scene.view_settings.gamma,
              "displayDevice": scene.display_settings.display_device}
    require(result == {"viewTransform": "Standard", "look": "None", "exposure": 0.,
                       "gamma": 1., "displayDevice": "sRGB"}, "Fixed preview view/display differs")
    return result


@contextmanager
def jpg_settings(scene, set_property):
    """Temporary file-format settings only; restore all before another scalar render."""
    settings = scene.render.image_settings
    original = {name: getattr(settings, name) for name in FORMAT_KEYS}
    require(original["file_format"] == "OPEN_EXR" and original["color_depth"] == "32" and
            original["color_mode"] == "RGBA" and original["exr_codec"] == "ZIP" and
            original["color_management"] == "FOLLOW_SCENE", "Authoritative EXR settings differ")
    original_linear_space = settings.linear_colorspace_settings.name
    view = fixed_view(scene)
    problem = None
    try:
        for name, value in (("file_format", "JPEG"), ("color_mode", "RGB"), ("color_depth", "8"),
                            ("color_management", "FOLLOW_SCENE"), ("quality", 95)):
            set_property(settings, name, value)
        profile = {name: getattr(settings, name) for name in FORMAT_KEYS}
        require(profile["file_format"] == "JPEG" and profile["color_mode"] == "RGB" and
                profile["color_depth"] == "8" and profile["quality"] == 95 and
                profile["color_management"] == "FOLLOW_SCENE", "Fixed JPG readback differs")
        yield {"format": profile, "view": view, "additionalRenders": 0, "normalization": False,
               "clippingProne": True, "scalarAuthority": "Unmodified full32 linear EXR",
               "limits": "Standard/sRGB JPEG can clip negatives/highlights and is lossy; not a scalar measurement."}
    except BaseException as error:
        problem = error
        raise
    finally:
        failures = []
        for name, value in original.items():
            try:
                set_property(settings, name, value)
            except BaseException as error:
                failures.append(name + ": " + type(error).__name__ + ": " + str(error))
        if settings.linear_colorspace_settings.name != original_linear_space:
            failures.append("linear output color-space changed during file-format roundtrip")
        if failures:
            message = "JPG-to-EXR file-setting restoration failed: " + "; ".join(failures)
            if problem is not None:
                problem.add_note(message)  # Keep the original save failure, without a retry.
            else:
                raise RuntimeError(message)


def save_fixed_jpg(image, scene, destination, set_property, checkpoint):
    """One save_render call on the SAME already loaded linear EXR; never calls render.render."""
    require(callable(image.save_render), "Image.save_render API unavailable")
    with jpg_settings(scene, set_property) as profile:
        checkpoint()
        image.save_render(filepath=str(destination), scene=scene, quality=95)
        checkpoint()
    profile["restoredExrFormat"] = {name: getattr(scene.render.image_settings, name) for name in FORMAT_KEYS}
    return profile
