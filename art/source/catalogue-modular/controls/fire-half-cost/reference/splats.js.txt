const LIMIT = 128;
const SIGMA_CUTOFF = 2.6;
const TAU = Math.PI * 2;
const STRIDE = 14;
const SMOKE_COUNT = 5;
const MIN_ALPHA = 0.002;

// Patch-local root positions, maximum height in metres, and fold headings.
const BASES = [
  [-0.102, 0.01, 0.24],
  [0.115, -0.035, -0.61],
];
const MAIN = [
  [-0.149, 0.037, 0.535, 0.22],
  [0.154, 0.064, 0.455, -0.59],
  [-0.007, -0.123, 0.377, 0.97],
];
const LOW = [
  [-0.314, 0.104, 0.145, 0.89],
  [0.292, -0.104, 0.16, -0.45],
  [0.028, 0.246, 0.14, 0.31],
];
// Relative rise, sigma across the fold, relative vertical sigma, sigma
// through the fold, peak opacity, and sRGB color.
const MAIN_PROFILE = [
  [0.18, 0.092, 0.105, 0.055, 0.81, 0xffe78e],
  [0.47, 0.078, 0.111, 0.045, 0.74, 0xffd185],
  [0.775, 0.041, 0.061, 0.025, 0.58, 0xffad71],
];
// Bound each complete moving low fold to a 0.20 m diameter at 2.6 sigma.
const LOW_MOTION = 0.35;
const LOW_PROFILE = [
  [0.24, 0.020, 0.106, 0.014, 0.59, 0xffdf88],
  [0.63, 0.016, 0.095, 0.010, 0.48, 0xffae60],
];
const SPLATS_PER_PATCH = BASES.length + MAIN.length * MAIN_PROFILE.length
  + LOW.length * LOW_PROFILE.length + SMOKE_COUNT;
const BAND_SLOTS = BASES.length + LOW.length * LOW_PROFILE.length;

const vertexShader = `
attribute vec3 splatCenter;
attribute vec3 splatSigma;
attribute vec4 splatDirection;
attribute vec4 splatTint;
varying vec2 vGaussian;
varying vec4 vTint;

vec3 projectAxis(vec3 axis, vec3 centerNdc) {
  vec4 delta = projectionMatrix * vec4(mat3(viewMatrix) * axis, 0.0);
  return delta.xyz - centerNdc * delta.w;
}

void main() {
  vec3 up = normalize(vec3(splatDirection.x, 1.0, splatDirection.y));
  vec3 heading = vec3(splatDirection.z, 0.0, splatDirection.w);
  vec3 normal = normalize(cross(up, heading));
  vec3 across = cross(normal, up);
  vec4 clipCenter = projectionMatrix * viewMatrix * vec4(splatCenter, 1.0);
  vec3 centerNdc = clipCenter.xyz / clipCenter.w;

  // Project the three oriented sigma vectors through the projection Jacobian.
  // The outer products sum to the screen covariance, factored here as L * L^T.
  vec3 a = projectAxis(across * splatSigma.x, centerNdc);
  vec3 b = projectAxis(up * splatSigma.y, centerNdc);
  vec3 c = projectAxis(normal * splatSigma.z, centerNdc);
  vec3 x = vec3(a.x, b.x, c.x);
  vec3 y = vec3(a.y, b.y, c.y);
  float xx = sqrt(max(dot(x, x), 1e-12));
  float xy = dot(x, y) / xx;
  float yy = sqrt(max(dot(y, y) - xy * xy, 1e-12));
  gl_Position = clipCenter;
  gl_Position.xy += vec2(xx * position.x, xy * position.x + yy * position.y);
  #ifdef SPLAT_SLOPED_DEPTH
    // Follow the projected tangent across the wall face when testing depth.
    vec3 spanX = x / xx;
    vec3 spanY = (y - spanX * xy) / yy;
    vec3 slope = vec3(a.z, b.z, c.z);
    gl_Position.z += dot(slope, spanX * position.x + spanY * position.y);
  #endif
  vGaussian = position.xy;
  vTint = splatTint;
}
`;

const fragmentShader = `
varying vec2 vGaussian;
varying vec4 vTint;

void main() {
  float radiusSquared = dot(vGaussian, vGaussian);
  float density = exp(-0.5 * radiusSquared)
    * (1.0 - smoothstep(5.1, 6.76, radiusSquared));
  float alpha = vTint.a * density;
  if (alpha <= 0.002) discard;
  gl_FragColor = vec4(vTint.rgb, alpha);
  #include <colorspace_fragment>
  #include <premultiplied_alpha_fragment>
}
`;

function seedUnit(seed) {
  let mixed = Math.imul((seed | 0) ^ 0x45d9f3b, 0x45d9f3b);
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x45d9f3b);
  return ((mixed ^ (mixed >>> 16)) >>> 0) / 4294967296;
}

function windAt(sampleWind, x, y, z, out) {
  out.fill(0);
  const sample = sampleWind?.(x, y, z, out) ?? out;
  for (let axis = 0; axis < 3; axis += 1) {
    out[axis] = Number.isFinite(sample[axis]) ? sample[axis] : 0;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

// World-space placements use +Y up. The root is an untransformed scene container.
export function createSplatPatch(T, {maxPatches = LIMIT, flameGain = [1, 1, 1], extraCapacity = 0} = {}) {
  if (!Number.isInteger(extraCapacity) || extraCapacity < 0) {
    throw new RangeError('extraCapacity must be a nonnegative integer');
  }
  const minPatches = extraCapacity > 0 ? 0 : 1;
  if (!Number.isInteger(maxPatches) || maxPatches < minPatches || maxPatches > LIMIT) {
    throw new RangeError('maxPatches must be an integer from ' + minPatches + ' to 128');
  }
  if (!Array.isArray(flameGain) || flameGain.length !== 3
      || Array.from(flameGain).some(value => !Number.isFinite(value) || value <= 0 || value > 4)) {
    throw new RangeError('flameGain needs three positive linear RGB gains, each at most 4');
  }

  const capacity = maxPatches * SPLATS_PER_PATCH + extraCapacity;
  const root = new T.Group();
  root.name = 'Gaussian ground fire';
  const geometry = new T.InstancedBufferGeometry();
  const r = SIGMA_CUTOFF;
  geometry.setAttribute('position', new T.Float32BufferAttribute([
    -r, -r, 0, r, -r, 0, r, r, 0, -r, r, 0,
  ], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const buffer = new T.InstancedInterleavedBuffer(new Float32Array(capacity * STRIDE), STRIDE);
  buffer.setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('splatCenter', new T.InterleavedBufferAttribute(buffer, 3, 0));
  geometry.setAttribute('splatSigma', new T.InterleavedBufferAttribute(buffer, 3, 3));
  geometry.setAttribute('splatDirection', new T.InterleavedBufferAttribute(buffer, 4, 6));
  geometry.setAttribute('splatTint', new T.InterleavedBufferAttribute(buffer, 4, 10));
  geometry.instanceCount = 0;

  const material = new T.ShaderMaterial({
    vertexShader,
    fragmentShader,
    defines: extraCapacity > 0 ? {SPLAT_SLOPED_DEPTH: 1} : {},
    transparent: true,
    premultipliedAlpha: true,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new T.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  root.add(mesh);

  const staging = new Float32Array(capacity * STRIDE);
  const depths = new Float32Array(capacity);
  const drawOrder = [];
  const compareDepth = (a, b) => depths[a] - depths[b];
  const frustum = new T.Frustum();
  const projectionView = new T.Matrix4();
  const extent = new T.Sphere();
  const wind = new Float64Array(3);
  const plumeWind = new Float64Array(3);
  const tint = new T.Color().setRGB(...flameGain);
  const contact = new T.Color(0xffec9b).multiply(tint);
  const soot = new T.Color(0x4c423b);
  const wrapAmber = new T.Color(0xff952c).multiplyScalar(2.35);
  const wrapCore = new T.Color(0xffc65a).multiplyScalar(2.55);
  const decode = (profile) => profile.map(([rise, width, length, thickness, alpha, color]) =>
    [rise, width, length, thickness, alpha, new T.Color(color).multiply(tint)]);
  const mainProfile = decode(MAIN_PROFILE);
  const lowProfile = decode(LOW_PROFILE);
  let count = 0;
  let patchCount = 0;
  let flameSplats = 0;
  let smokeSplats = 0;
  let disposed = false;

  function emit(camera, x, y, z, sx, sy, sz, leanX, leanZ, heading, color, alpha) {
    if (alpha <= MIN_ALPHA) return;
    const v = camera.matrixWorldInverse.elements;
    const depth = v[2] * x + v[6] * y + v[10] * z + v[14];
    if (depth > -camera.near || depth < -camera.far) return;
    extent.center.set(x, y, z);
    extent.radius = SIGMA_CUTOFF * Math.max(sx, sy, sz);
    if (!frustum.intersectsSphere(extent)) return;

    const start = count * STRIDE;
    staging[start] = x;
    staging[start + 1] = y;
    staging[start + 2] = z;
    staging[start + 3] = sx;
    staging[start + 4] = sy;
    staging[start + 5] = sz;
    staging[start + 6] = leanX;
    staging[start + 7] = leanZ;
    staging[start + 8] = Math.cos(heading);
    staging[start + 9] = Math.sin(heading);
    staging[start + 10] = color.r;
    staging[start + 11] = color.g;
    staging[start + 12] = color.b;
    staging[start + 13] = alpha;
    depths[count] = depth;
    drawOrder[count] = count;
    count += 1;
  }

  function fold(camera, x, y, z, height, heading, wave, ignition, profile, scale, travelScale = 1) {
    const driftX = clamp(wind[0], -0.72, 0.72);
    const driftZ = clamp(wind[2], -0.72, 0.72);
    const lift = 0.94 + 0.06 * Math.sin(wave) + clamp(wind[1] * 0.05, -0.06, 0);
    for (const [rise, width, length, thickness, alpha, color] of profile) {
      const ripple = Math.sin(wave - rise * 5.8);
      const swell = Math.cos(wave * 1.71 - rise * 7.6);
      const travel = rise * height * 0.77 * travelScale;
      const curl = rise * height * (0.085 * ripple + 0.055 * swell) * travelScale;
      emit(camera,
        x + driftX * travel + Math.cos(heading) * curl,
        y + height * (rise * lift + 0.021 * ripple),
        z + driftZ * travel + Math.sin(heading) * curl,
        width * (0.91 + 0.11 * swell) * scale, length * height, thickness * scale,
        driftX * 0.49 + 0.21 * ripple, driftZ * 0.49 + 0.19 * swell,
        heading + 0.23 * ripple, color, alpha * ignition * (0.82 + 0.18 * swell));
    }
  }

  function update({time, patches = [], camera, sampleWind, bands = [], extraSplats = []}) {
    if (disposed) return;
    if (extraSplats.length > extraCapacity) throw RangeError('Extra splats exceed their reserved capacity');
    const elapsed = Math.max(0, time);
    const ignition = 1 - Math.exp(-elapsed * 12);
    camera.updateWorldMatrix(true, false);
    projectionView.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projectionView, camera.coordinateSystem, camera.reversedDepth);
    count = patchCount = flameSplats = smokeSplats = 0;
    let bandSlots = 0;

    for (let i = 0; i < Math.min(patches.length, maxPatches); i += 1) {
      const {x, y, z, seed, scale = 1, flameStrength = 1, smokeStrength = 1,
        flameRise = 1, smokeSize = 1, smokeRise = 1, shroudDetail = false} = patches[i];
      const phase = seedUnit(seed);
      const turn = TAU * phase;
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      const before = count;
      windAt(sampleWind, x, y + 0.21 * scale, z, wind);
      const flame = ignition * flameStrength;

      if (shroudDetail) bandSlots += BAND_SLOTS;
      else for (const [offsetX, offsetZ, heading] of BASES) {
        const glow = 0.85 + 0.13 * Math.sin(elapsed * 9.3 + turn + heading * 6);
        emit(camera, x + (offsetX * cos - offsetZ * sin) * scale, y + 0.037 * scale,
          z + (offsetX * sin + offsetZ * cos) * scale, 0.121 * scale, 0.029 * scale, 0.081 * scale,
          0, 0, heading + turn, contact, glow * flame);
      }
      for (const [offsetX, offsetZ, height, heading] of MAIN) {
        const wave = elapsed * (8.3 + heading * 1.74) + turn + heading * 7.1;
        fold(camera, x + (offsetX * cos - offsetZ * sin) * scale, y, z + (offsetX * sin + offsetZ * cos) * scale,
          height * scale * flameRise, heading + turn, wave, flame, mainProfile, scale);
      }
      if (!shroudDetail) for (const [offsetX, offsetZ, height, heading] of LOW) {
        const wave = elapsed * (13.1 + heading * 2.1) + turn + heading * 6.5;
        fold(camera, x + (offsetX * cos - offsetZ * sin) * scale, y, z + (offsetX * sin + offsetZ * cos) * scale,
          height * scale, heading + turn, wave, flame, lowProfile, scale, LOW_MOTION);
      }
      const flameEnd = count;

      windAt(sampleWind, x, y + 0.57 * scale, z, plumeWind);
      const smokeScale = scale * smokeSize;
      for (let puff = 0; puff < SMOKE_COUNT; puff += 1) {
        const cycle = elapsed / 1.45 + phase + puff / SMOKE_COUNT;
        const age = cycle - Math.floor(cycle);
        const seconds = age * 1.45;
        if (seconds > elapsed - 0.13) continue;
        const fade = Math.min(1, age * 7) * Math.pow(1 - age, 1.6);
        const curl = (elapsed - seconds) * 2.9 + turn + puff * 2.4;
        const driftX = clamp(plumeWind[0], -1.1, 1.1);
        const driftZ = clamp(plumeWind[2], -1.1, 1.1);
        const rise = 0.39 + clamp(plumeWind[1] * 0.32, -0.15, 0.35);
        emit(camera,
          x + driftX * seconds + Math.cos(curl + age * 3.4) * (0.043 + 0.068 * age) * scale,
          y + 0.254 * scale + seconds * rise * smokeRise,
          z + driftZ * seconds + Math.sin(curl + age * 2.3) * (0.043 + 0.068 * age) * scale,
          (0.065 + age * 0.139) * smokeScale, (0.078 + age * 0.135) * smokeScale, (0.058 + age * 0.116) * smokeScale,
          driftX * 0.43, driftZ * 0.43, curl, soot, 0.23 * fade * smokeStrength);
      }
      flameSplats += flameEnd - before;
      smokeSplats += count - flameEnd;
      if (count > before) patchCount += 1;
    }

    if (bands.length > bandSlots) throw RangeError('Shroud bands exceed their reserved splat slots');
    const beforeBands = count;
    for (const band of bands) {
      emit(camera, band.worldX, band.worldY, band.worldZ, band.width, band.height, band.thickness,
        band.leanX, band.leanZ, band.heading, band.hot ? wrapCore : wrapAmber, band.alpha);
    }
    flameSplats += count - beforeBands;

    for (const splat of extraSplats) {
      const {x, y, z, sx, sy, sz, leanX, leanZ, heading, color, alpha, smoke} = splat;
      const before = count;
      emit(camera, x, y, z, sx, sy, sz, leanX, leanZ, heading, color, alpha);
      if (smoke) smokeSplats += count - before;
      else flameSplats += count - before;
    }

    drawOrder.length = count;
    drawOrder.sort(compareDepth);
    let target = 0;
    for (const index of drawOrder) {
      const source = index * STRIDE;
      for (let component = 0; component < STRIDE; component += 1) {
        buffer.array[target] = staging[source + component];
        target += 1;
      }
    }
    buffer.clearUpdateRanges();
    if (target > 0) {
      buffer.addUpdateRange(0, target);
      buffer.needsUpdate = true;
    }
    geometry.instanceCount = count;
    mesh.visible = count > 0;
  }

  // Counts are submitted, non-faded splats after frustum checks. The renderer
  // resolves occlusion by the scene's opaque depth buffer.
  function stats() {
    return {patches: patchCount, flameSplats, smokeSplats};
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    count = patchCount = flameSplats = smokeSplats = 0;
    geometry.instanceCount = 0;
    root.removeFromParent();
    mesh.removeFromParent();
    geometry.dispose();
    material.dispose();
  }

  return {root, update, stats, dispose};
}
