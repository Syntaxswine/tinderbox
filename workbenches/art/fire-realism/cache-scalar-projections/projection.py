"""Pure fixed six-output protocol; actual Blender work lives behind the validated gate."""
from contract import require
from coordinates import camera_report
from scalar import CHANNELS


def run_protocol(adapter, spec, checkpoint, publish, report):
    """The injected fake path tests ordering, not native rendering or field content."""
    failure = None
    report.update({"status": "in-progress", "projections": [], "frames": [],
                   "nativeQualityAcceptance": False, "gpuCostCredit": False,
                   "warnings": ["Cached H units uncalibrated; cache sparsification may remove values.",
                                "Scalar projections omit native masks/floor/transfer/actor/HUD.",
                                "Mathematical sampler witnesses do not sample real grid values."]})
    try:
        checkpoint()  # MUST precede even scene/API creation.
        report["preparation"] = adapter.prepare()
        checkpoint()
        world, projection = adapter.camera_observation()
        report["camera"] = camera_report(world, projection, spec)
        publish(report)
        for selected in spec["selected"]:
            checkpoint()
            report["frames"].append(adapter.load_cache(selected))
            publish(report)
            for channel in CHANNELS:
                checkpoint()
                result = adapter.render(selected, channel)
                require(result["frame"] == selected["frame"] and
                        result["sourceAgeSeconds"] == selected["ageSeconds"] and
                        result["channel"] == channel, "Projection output identity differs")
                report["projections"].append(result)
                checkpoint()
                publish(report)
            adapter.close_frame()
        require(len(report["projections"]) == 6, "Exactly six projections required")
        report["status"] = "six-offline-scalar-projections-diagnostic-only"
        return report
    except BaseException as error:
        failure = error
        report["status"] = "failed-preserve-partial-no-retry"
        report["failure"] = {"type": type(error).__name__, "message": str(error)}
        raise
    finally:
        try:
            cleanup = adapter.dispose()
            report["cleanup"] = cleanup
            bad = [row for row in cleanup if not row["removed"]]
            if bad:
                report["status"] = "failed-cleanup"
                if failure is None:
                    raise RuntimeError("Owned scalar diagnostic resources did not all retire")
        except BaseException as error:
            report["cleanupFailure"] = {"type": type(error).__name__, "message": str(error)}
            if failure is None:
                raise
        finally:
            try:
                publish(report)
            except BaseException as error:
                report["publicationFailure"] = {"type": type(error).__name__, "message": str(error)}
                if failure is None:
                    raise
