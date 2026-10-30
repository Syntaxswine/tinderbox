// TB-034 original curved lattice. One unit cylinder supports both flame/smoke
// profiles, allowing all transparent instances to share a sorted draw stream.
export function createTongueGeometry(T) {
  const radial = 28, rings = 36, positions = [], normals = [], uvs = [], indices = [];
  for (let j = 0; j <= rings; j++) {
    const y = j / rings;
    for (let k = 0; k <= radial; k++) {
      const a = k / radial * Math.PI * 2;
      positions.push(Math.cos(a), y, Math.sin(a));
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
