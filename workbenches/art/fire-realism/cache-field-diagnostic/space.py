"""Coordinate-only reconstruction; no data fitting, sampling or mesh adapters."""
import math
from contract import require, finite

IDENTITY = [[1., 0., 0., 0.], [0., 1., 0., 0.], [0., 0., 1., 0.], [0., 0., 0., 1.]]


def matrix(value):
    require(len(value) == 4 and all(len(row) == 4 for row in value), "4x4 grid matrix required")
    require(all(finite(x) for row in value for x in row), "Nonfinite grid matrix")
    return [[float(x) for x in row] for row in value]


def point(m, p):
    return [sum(m[row][axis] * p[axis] for axis in range(3)) + m[row][3] for row in range(3)]


def multiply(a, b):
    return [[sum(a[row][k] * b[k][col] for k in range(4)) for col in range(4)] for row in range(4)]


def native(blender, translation):
    return [blender[0] + translation[0], blender[2] + translation[1], -blender[1] + translation[2]]


def coordinate_report(grids, selected, translation):
    names = [g["name"] for g in grids]
    require(len(names) == len(set(names)), "Duplicate named grids")
    for name in ("density", "flame"):
        require(name in names, "Required literal grid missing: " + name)
    matrices = []
    for grid in grids:
        if grid["name"] not in ("density", "flame"):
            continue
        require(grid["dataType"] == "FLOAT" and grid["channels"] == 1, "Unsupported scalar grid type")
        m = matrix(grid["indexToObject"])
        require(m[3] == [0., 0., 0., 1.], "Unsupported projective grid transform")
        for row in range(3):
            require(m[row][row] == selected["voxelSize"][row], "Observed grid scale differs from authoritative voxel size")
            require(all(m[row][col] == 0 for col in range(3) if col != row), "Unsupported rotated/sheared grid")
        matrices.append(m)
    require(matrices[0] == matrices[1], "Density/flame grids disagree on index space")
    observed = matrices[0]
    origin, h = selected["scalarCentreOriginBlender"], selected["voxelSize"]
    authoritative = [[h[0], 0., 0., origin[0]], [0., h[1], 0., origin[1]],
                     [0., 0., h[2], origin[2]], [0., 0., 0., 1.]]
    inverse = [[1 / h[0], 0., 0., -observed[0][3] / h[0]],
               [0., 1 / h[1], 0., -observed[1][3] / h[1]],
               [0., 0., 1 / h[2], -observed[2][3] / h[2]], [0., 0., 0., 1.]]
    placement = multiply(authoritative, inverse)
    chain = multiply(placement, observed)
    witnesses = []
    for index in ([0, 0, 0], [47, 0, 0], [0, 47, 0], [0, 0, 95], [5, 11, 23], [46, 3, 1]):
        expected = [origin[a] + h[a] * index[a] for a in range(3)]
        actual = point(chain, index)
        residual = max(abs(expected[a] - actual[a]) for a in range(3))
        require(residual < 1.e-12, "Coordinate algebra witness failed")
        witnesses.append({"index": index, "blender": actual, "native": native(actual, translation),
                          "residualMetres": residual})
    return {"status": "coordinate-chain-valid-requires-index-lineage-review",
            "observedGridIndexToObject": observed, "untouchedVolumeObjectWorld": IDENTITY,
            "authoritativeIndexToBlenderCentres": authoritative,
            "proposedVolumeObjectWorld": placement, "proposedChain": chain, "witnesses": witnesses,
            "placementApplied": False, "fittedOffset": False, "meshHalfVoxelAdapter": False,
            "indexValueCorrespondenceProvenByMetadata": False,
            "meaning": "Algebraic placement derived from authoritative centres; metadata alone does not prove VDB logical-index/value identity with exported dense arrays. Review before any render."}
