function surface(sculpt, vertices, paint, shade, patterned = false) {
  const T = sculpt.T;
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices.flat(), 3));
  const uv = vertices.length === 4 ? [0, 0, 1, 0, 1, 1, 0, 1] : [0, 0, 1, 0, 0, 1];
  if (!patterned) for (let i = 1; i < uv.length; i += 2) uv[i] = .91;
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(vertices.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2]);
  geometry.computeVertexNormals();
  sculpt.add(geometry, paint, undefined, {shade});
}

// A right triangle in section. The back and top are straight and the dentils live on the sloped skin.
// The left-to-right path faces the room on its right in X/Z plan. Adjacent runs share miter stations.
export function corniceRun(sculpt, points, {top, rise, depth, paint = 'dentil-green', caps = true}) {
  const normals = points.slice(1).map(([x, z], i) => {
    const [sx, sz] = points[i], length = Math.hypot(x - sx, z - sz);
    return [-(z - sz) / length, (x - sx) / length];
  });
  const stations = points.map(([x, z], i) => {
    const a = normals[Math.max(0, i - 1)], b = normals[Math.min(normals.length - 1, i)];
    const miter = depth / (1 + a[0] * b[0] + a[1] * b[1]);
    return {
      foot: [x, top - rise, z],
      back: [x, top, z],
      tip: [x + (a[0] + b[0]) * miter, top, z + (a[1] + b[1]) * miter]
    };
  });
  for (let i = 0; i + 1 < stations.length; i++) {
    const a = stations[i], b = stations[i + 1];
    surface(sculpt, [a.foot, b.foot, b.tip, a.tip], paint, 1, true);
    surface(sculpt, [a.tip, b.tip, b.back, a.back], paint, .76);
    surface(sculpt, [a.back, b.back, b.foot, a.foot], paint, .57);
  }
  if (caps) {
    const a = stations[0], b = stations.at(-1);
    surface(sculpt, [a.foot, a.tip, a.back], paint, .61);
    surface(sculpt, [b.foot, b.back, b.tip], paint, .61);
  }
}
