const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;

function decodeBase64(data) {
  return Uint8Array.from(atob(data), char => char.charCodeAt(0));
}

export function makeHouseWindSampler(data) {
  const {origin, cell} = data.solver.grid;
  const {firstCell, size: [nx, ny, nz]} = data.exportGrid;
  const cells = nx * ny * nz;
  const velocity = decodeBase64(data.velocity.data);
  const solid = decodeBase64(data.solid.data);
  if (data.velocity.encoding !== 'base64-int16le' || data.solid.encoding !== 'base64-bits-lsb'
      || velocity.length !== cells * 6 || solid.length !== Math.ceil(cells / 8)) {
    throw Error('Invalid cottage wind grid.');
  }
  const packed = new DataView(velocity.buffer);
  const values = new Float32Array(cells * 3);
  for (let i = 0; i < values.length; i++) values[i] = packed.getInt16(i * 2, true) * data.velocity.quantum;
  const strideY = 3 * nx, strideZ = strideY * ny;

  return function sampleWind(x, y, z, out = [0, 0, 0]) {
    const gx = (x - origin[0]) / cell - firstCell[0];
    const gy = (y - origin[1]) / cell - firstCell[1];
    const gz = (z - origin[2]) / cell - firstCell[2];
    const ci = Math.floor(gx), cj = Math.floor(gy), ck = Math.floor(gz);
    const maskIndex = ci + nx * (cj + ny * ck);
    if (ci >= 0 && ci < nx && cj >= 0 && cj < ny && ck >= 0 && ck < nz
        && ((solid[maskIndex >> 3] >> (maskIndex & 7)) & 1)) {
      out[0] = out[1] = out[2] = 0;
      return out;
    }
    // Interpolate between cell centres and clamp to the exported air window.
    const lx = clamp(gx - .5, 0, nx - 1);
    const ly = clamp(gy - .5, 0, ny - 1);
    const lz = clamp(gz - .5, 0, nz - 1);
    const i = Math.min(Math.floor(lx), nx - 2);
    const j = Math.min(Math.floor(ly), ny - 2);
    const k = Math.min(Math.floor(lz), nz - 2);
    const tx = lx - i, ty = ly - j, tz = lz - k;
    const first = 3 * (i + nx * (j + ny * k));
    for (let axis = 0; axis < 3; axis++) {
      const n = first + axis, far = n + strideZ;
      const lowZ = lerp(lerp(values[n], values[n + 3], tx),
        lerp(values[n + strideY], values[n + strideY + 3], tx), ty);
      const highZ = lerp(lerp(values[far], values[far + 3], tx),
        lerp(values[far + strideY], values[far + strideY + 3], tx), ty);
      out[axis] = lerp(lowZ, highZ, tz);
    }
    return out;
  };
}
