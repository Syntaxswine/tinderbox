// Original TB-034 surface lattice. Coordinates: axial y in [0,1], radial x/z.
export function createTongueGeometry(T, smoke = false) {
  const radial = 28, rings = 36, positions = [], normals = [], uvs = [], indices = [];
  for (let j = 0; j <= rings; j++) {
    const y = j / rings;
    const r = smoke ? .035 + Math.pow(Math.sin(Math.PI * y), .66) * .96
      : Math.max(.006, (.72 + .24 * Math.sin(y * 4.3)) * Math.pow(1 - y, .64));
    for (let k = 0; k <= radial; k++) {
      const a = k / radial * Math.PI * 2;
      positions.push(Math.cos(a) * r, y, Math.sin(a) * r);
      normals.push(Math.cos(a), .25, Math.sin(a)); uvs.push(k / radial, y);
      if (j && k) {
        const b = j * (radial + 1) + k, a0 = b - radial - 2;
        indices.push(a0, b, a0 + 1, a0, b - 1, b);
      }
    }
  }
  const g = new T.InstancedBufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(indices);
  g.instanceCount = 0; g.userData = {radial, rings, triangles: indices.length / 3};
  return g;
}
