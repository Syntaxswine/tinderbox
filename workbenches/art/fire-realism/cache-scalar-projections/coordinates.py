"""Pure signed-axis, sample-centre and orthographic witnesses; never fit transforms."""
from contract import H, DOMAIN_MIN, finite, require


def matrix(value):
    require(len(value) == 4 and all(len(row) == 4 for row in value) and
            all(finite(x) for row in value for x in row), "Finite4x4 matrix required")
    return [[float(x) for x in row] for row in value]


def from_columns(value):
    require(len(value) == 16 and all(finite(x) for x in value), "16 finite column-major entries")
    return [[value[c * 4 + r] for c in range(4)] for r in range(4)]


def point4(m, p):
    require(len(p) == 4 and all(finite(x) for x in p), "Finite homogeneous point")
    return [sum(m[r][c] * p[c] for c in range(4)) for r in range(4)]


def point(m, p):
    out = point4(m, [*p, 1.])
    require(out[3] != 0, "Projective infinity")
    return [x / out[3] for x in out[:3]]


def multiply(a, b):
    return [[sum(a[r][k] * b[k][c] for k in range(4)) for c in range(4)] for r in range(4)]


def inverse(m):
    a = [row[:] + [float(r == c) for c in range(4)] for r, row in enumerate(matrix(m))]
    for c in range(4):
        pivot = max(range(c, 4), key=lambda r: abs(a[r][c]))
        require(abs(a[pivot][c]) > 1.e-15, "Singular diagnostic matrix")
        a[c], a[pivot] = a[pivot], a[c]
        divisor = a[c][c]
        a[c] = [x / divisor for x in a[c]]
        for r in range(4):
            if r != c:
                scale = a[r][c]
                a[r] = [x - scale * y for x, y in zip(a[r], a[c])]
    return [row[4:] for row in a]


def index_linear(index):
    require(len(index) == 3 and all(type(x) is int for x in index) and
            all(0 <= x < n for x, n in zip(index, (48, 48, 96))), "Actual integer grid index")
    return index[0] + 48 * index[1] + 2304 * index[2]


def centre(index):
    index_linear(index)
    return [DOMAIN_MIN[a] + H * (index[a] + .5) for a in range(3)]


def native(b):
    return [b[0] + 5.5, b[2], 8.5 - b[1]]


def witnesses():
    result = [[0, 0, 0], [47, 47, 95], [5, 11, 23], [46, 3, 1]]
    for base in ([5, 11, 23], [24, 24, 4]):
        for delta in ([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]):
            item = [x + y for x, y in zip(base, delta)]
            if item not in result:
                result.append(item)
    return result


def sampler_report(observed, world, spec):
    observed, world = matrix(observed), matrix(world)
    require(observed == spec["space"]["observedIndexToObject"], "Observed VDB matrix changed")
    require(world == spec["space"]["volumeObjectWorld"], "Object placement changed")
    require(world == [[1., 0., 0., DOMAIN_MIN[0]], [0., 1., 0., DOMAIN_MIN[1]],
                      [0., 0., 1., DOMAIN_MIN[2]], [0., 0., 0., 1.]],
            "Only the adopted source-derived domain-min translation is permitted")
    object_from_world, index_from_object = inverse(world), inverse(observed)
    report = []
    for index in witnesses():
        b = centre(index)
        q = point(index_from_object, point(object_from_world, b))
        target = [x + .5 for x in index]
        residual = max(abs(x - y) for x, y in zip(q, target))
        require(residual <= 1.e-12, "Source-derived sample-centre algebra failed")
        report.append({"index": index, "linearOffset": index_linear(index), "blenderCentre": b,
                       "nativeCentre": native(b), "cyclesSampleCoordinate": q,
                       "expectedSampleCoordinate": target, "residualIndexUnits": residual})
    return {"world": world, "observed": observed, "witnesses": report,
            "logicalLineage": "Manta and Dense LayoutXYZ i+48j+2304k; selected source proof",
            "sampler": "CPU LINEAR evaluates stored grid i at q=i+.5; active bbox cancels in dense path",
            "actualGridValuesSampled": False, "bitIdentityClaimed": False, "fitted": False,
            "volumeToMeshAdapter": False}


def camera_report(actual_world, actual_projection, spec):
    world, projection = matrix(actual_world), matrix(actual_projection)
    camera = spec["camera"]
    expected_world = matrix(camera["blenderWorldRows"])
    expected_projection = from_columns(camera["nativeProjectionColumnMajor"])
    tolerance = camera["ndcTolerance"]
    world_residual = max(abs(world[r][c] - expected_world[r][c]) for r in range(4) for c in range(4))
    projection_residual = max(abs(projection[r][c] - expected_projection[r][c])
                              for r in range(4) for c in range(4))
    require(world_residual <= tolerance and projection_residual <= tolerance,
            "Actual camera matrices disagree with frozen source")
    view = inverse(world)
    native_view = from_columns(camera["nativeViewColumnMajor"])
    report = []
    for index in witnesses():
        b, n = centre(index), native(centre(index))
        actual = point(projection, point(view, b))
        expected = point(expected_projection, point(native_view, n))
        residual = max(abs(x - y) for x, y in zip(actual, expected))
        require(residual <= tolerance, "Actual camera landmark projection mismatch; no fit/fallback")
        report.append({"index": index, "nativeNdc": expected, "actualBlenderNdc": actual,
                       "maxNdcResidual": residual,
                       "diagnosticContinuousPixels": [(actual[0] + 1) * 160, (1 - actual[1]) * 100]})
    return {"world": world, "projection": projection, "matrixResidual": world_residual,
            "projectionMatrixResidual": projection_residual, "toleranceNdc": tolerance,
            "witnesses": report, "maxNdcResidual": max(x["maxNdcResidual"] for x in report),
            "scope": "Observed camera projection plus algebra; not voxel-value or native fire proof"}
