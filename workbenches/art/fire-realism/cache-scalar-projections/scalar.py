"""Fixed scalar math and literal node graph; no bpy import, pixels or cache reads."""
from contract import finite, require

CHANNELS = ("density", "flame", "signedHeat")
LITERAL_GRID = {"density": "density", "flame": "flame", "signedHeat": "temperature"}


def scalar_rgb(channel, value):
    require(channel in CHANNELS and finite(value), "Known channel and finite scalar required")
    return [max(value, 0.), 0., max(-value, 0.)] if channel == "signedHeat" else [value] * 3


def socket(node, group, name):
    result = getattr(node, group).get(name)
    require(result is not None, "Required socket missing: " + node.name + "." + name)
    return result


def plain_default(value):
    if type(value) in (int, float, bool, str):
        require(type(value) not in (int, float) or finite(value), "Nonfinite socket default")
        return value
    result = list(value)
    require(all(finite(x) for x in result), "Nonfinite socket vector")
    return result


def build_graph(material, channel, set_property):
    """Only a newly owned material may be passed; the adapter registers it before this call."""
    require(channel in CHANNELS, "Only fixed D/F/signedH projections")
    set_property(material, "use_nodes", True)
    tree = material.node_tree
    require(tree is not None, "Material node API unavailable")
    tree.nodes.clear()
    made, expected_links = [], []

    def node(kind, name):
        item = tree.nodes.new(kind)
        item.name = name
        set_property(item, "mute", False)
        require(item.bl_idname == kind, "Unexpected node implementation")
        made.append(item)
        return item

    def link(a, output, b, input_name):
        tree.links.new(socket(a, "outputs", output), socket(b, "inputs", input_name))
        expected_links.append((a.name, output, b.name, input_name))

    attribute = node("ShaderNodeAttribute", "LiteralScalar")
    set_property(attribute, "attribute_type", "GEOMETRY")
    set_property(attribute, "attribute_name", LITERAL_GRID[channel])
    emission = node("ShaderNodeEmission", "UnitEmission")
    socket(emission, "inputs", "Color").default_value = (1., 1., 1., 1.)
    socket(emission, "inputs", "Strength").default_value = 1.
    output = node("ShaderNodeOutputMaterial", "VolumeOnlyOutput")
    set_property(output, "is_active_output", True)
    if channel == "signedHeat":
        positive = node("ShaderNodeMath", "PositiveH")
        negative = node("ShaderNodeMath", "NegativeH")
        negate = node("ShaderNodeMath", "NegateH")
        for item in (positive, negative, negate):
            set_property(item, "use_clamp", False)
        set_property(positive, "operation", "MAXIMUM")
        set_property(negative, "operation", "MAXIMUM")
        set_property(negate, "operation", "MULTIPLY")
        for item in (positive, negative):
            item.inputs[1].default_value = 0.
        negate.inputs[1].default_value = -1.
        combine = node("ShaderNodeCombineColor", "SignedH_RGB")
        set_property(combine, "mode", "RGB")
        socket(combine, "inputs", "Green").default_value = 0.
        # Math inputs have duplicate names; link their exact positional sockets.
        tree.links.new(socket(attribute, "outputs", "Fac"), positive.inputs[0])
        tree.links.new(socket(attribute, "outputs", "Fac"), negate.inputs[0])
        tree.links.new(socket(negate, "outputs", "Value"), negative.inputs[0])
        expected_links.extend([(attribute.name, "Fac", positive.name, positive.inputs[0].name),
                               (attribute.name, "Fac", negate.name, negate.inputs[0].name),
                               (negate.name, "Value", negative.name, negative.inputs[0].name)])
        link(positive, "Value", combine, "Red")
        link(negative, "Value", combine, "Blue")
        link(combine, "Color", emission, "Color")
    else:
        link(attribute, "Fac", emission, "Strength")
    link(emission, "Emission", output, "Volume")
    require(tuple(socket(emission, "inputs", "Color").default_value) == (1., 1., 1., 1.) and
            socket(emission, "inputs", "Strength").default_value == 1., "Unit emission defaults changed")
    if channel == "signedHeat":
        require(all(item.inputs[1].default_value == 0. and not item.inputs[1].is_linked
                    for item in (positive, negative)) and negate.inputs[1].default_value == -1. and
                not negate.inputs[1].is_linked and socket(combine, "inputs", "Green").default_value == 0.,
                "Signed raw-H constants changed")
    actual_links = [(item.from_node.name, item.from_socket.name, item.to_node.name, item.to_socket.name)
                    for item in tree.links]
    require(sorted(actual_links) == sorted(expected_links) and len(list(tree.nodes)) == len(made),
            "Node/link graph differs from the fixed scalar mapping")
    require(not socket(output, "inputs", "Surface").is_linked and
            not socket(output, "inputs", "Displacement").is_linked, "Only volume emission may be connected")
    nodes = []
    for item in made:
        row = {"name": item.name, "type": item.bl_idname, "mute": item.mute, "inputs": [],
               "outputs": [{"name": v.name, "identifier": v.identifier, "linked": bool(v.is_linked)}
                           for v in item.outputs]}
        for value in item.inputs:
            entry = {"name": value.name, "identifier": value.identifier, "linked": bool(value.is_linked)}
            if hasattr(value, "default_value"):
                entry["default"] = plain_default(value.default_value)
            row["inputs"].append(entry)
        for key in ("attribute_type", "attribute_name", "operation", "use_clamp", "mode"):
            if hasattr(item, key):
                row[key] = getattr(item, key)
        nodes.append(row)
    return {"channel": channel, "literalGrid": LITERAL_GRID[channel], "nodes": nodes,
            "links": actual_links,
            "linkSocketIdentifiers": [(v.from_node.name, v.from_socket.identifier,
                                       v.to_node.name, v.to_socket.identifier) for v in tree.links],
            "strength": 1, "absorption": 0, "scattering": 0,
            "blackbody": False, "normalization": False,
            "units": "Unit emission per native metre; source diagnostic, not radiometry/Kelvin"}
