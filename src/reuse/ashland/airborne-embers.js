const LIMIT = 84;
const STRIDE = 8;
const MAX_STREAK = .135;
const EXPOSURE_SECONDS = .043;
const MAX_WAKE = .52;
const WAKE_SECONDS = .166;

const vertexShader = `
attribute vec3 emberCenter;
attribute vec3 emberTrail;
attribute vec2 emberState;
varying vec2 vMetres;
varying vec4 vShape;

void main() {
  vec3 center = (viewMatrix * vec4(emberCenter, 1.0)).xyz;
  vec3 drift = mat3(viewMatrix) * emberTrail;
  float projected = length(drift.xy);
  float angle = emberState.y * 6.2831853;
  vec2 forward = projected > 0.0001 ? drift.xy / projected : vec2(cos(angle), sin(angle));
  vec2 side = vec2(-forward.y, forward.x);

  float radius = mix(.023, .036, emberState.y) * mix(.86, 1.0, emberState.x);
  float padding = 1.85 * radius;
  float wake = smoothstep(.19, .87, emberState.x);
  float back = min(position.x, 0.0);
  float x = position.x * padding + back * projected;
  float y = position.y * (padding + .049 * wake);
  vec2 plane = x * forward + y * side;
  // The centre vertices preserve the head's actual depth. The back strip
  // follows the world velocity so the roof can hide a trailing tip.
  float z = back * drift.z * step(.004, projected);
  gl_Position = projectionMatrix * vec4(center + vec3(plane, z), 1.0);
  vMetres = vec2(x, y);
  vShape = vec4(radius, projected, emberState);
}
`;

const fragmentShader = `
varying vec2 vMetres;
varying vec4 vShape;

void main() {
  float radius = vShape.x;
  float warm = smoothstep(.01, .83, vShape.z);
  float wake = smoothstep(.19, .87, vShape.z);
  vec2 q = vMetres / radius;
  float tilt = (vShape.w - .5) * 1.44;
  float c = cos(tilt);
  float s = sin(tilt);
  vec2 face = mat2(c, s, -s, c) * q;
  float edge = .84 * abs(face.x) + abs(face.y + .11 * face.x);
  float body = (1.0 - smoothstep(.68, 1.03, edge)) * (.37 + .60 * warm);
  float core = (1.0 - smoothstep(.15, .57, edge)) * warm;
  float halo = (1.0 - smoothstep(.42, 1.72, length(q))) * .21 * warm;

  float behind = -vMetres.x / max(vShape.y, .001);
  float p = clamp(behind, 0.0, 1.0);
  float phase = vShape.w * 6.2831853;
  float ripple = sin(12.2 * p + phase);
  float offset = .021 * wake * sin(8.3 * p + phase) * sin(3.14159265 * p);
  float width = radius * mix(.54, .20, p) + .060 * wake * (1.0 - .69 * p) * (.83 + .17 * ripple);
  float across = abs(vMetres.y - offset) / width;
  float tailMask = smoothstep(.025, .25, behind) * (1.0 - smoothstep(.44, 1.0, behind)) * step(.004, vShape.y);
  float glow = (1.0 - smoothstep(.05, 1.0, across)) * (.19 * warm + .47 * wake) * tailMask;
  float streak = (1.0 - smoothstep(.06, .41, across)) * .19 * wake * tailMask;
  float soft = min(.90, halo + glow + streak) * (1.0 - body);
  float alpha = body + soft;
  if (alpha < .008) discard;

  vec3 hot = mix(vec3(.055, .017, .008), vec3(2.05, .47, .041), warm);
  vec3 chip = mix(hot, vec3(3.75, 1.82, .42), core);
  vec3 haze = mix(vec3(.40, .035, .005), vec3(2.30, .54, .058), warm);
  haze += vec3(.31, .20, .041) * streak;
  gl_FragColor = vec4((body * chip + soft * haze) / alpha, alpha);
  #include <colorspace_fragment>
  #include <premultiplied_alpha_fragment>
}
`;

export function emberWakeSeconds(speed, heat) {
  const safeSpeed = Math.max(speed, .0001);
  const streak = Math.min(EXPOSURE_SECONDS, MAX_STREAK / safeSpeed) * (.42 + .58 * heat);
  const t = Math.min(1, Math.max(0, (heat - .19) / .68));
  const glow = t * t * (3 - 2 * t);
  return streak + (Math.min(WAKE_SECONDS, MAX_WAKE / safeSpeed) - streak) * glow;
}

export function emberPhase(id) {
  const key = String(id);
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

// The instances are in world coordinates and share the caller's camera.
export function createAirborneEmbers(T, {maxEmbers = LIMIT} = {}) {
  if (!Number.isInteger(maxEmbers) || maxEmbers < 1 || maxEmbers > LIMIT) {
    throw new RangeError('maxEmbers must be an integer from 1 to 84');
  }

  const root = new T.Group();
  root.name = 'Airborne firebrands';
  const geometry = new T.InstancedBufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute([
    -1, -1, 0, 0, -1, 0, 1, -1, 0,
    -1, 1, 0, 0, 1, 0, 1, 1, 0,
  ], 3));
  geometry.setIndex([0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4]);
  const data = new T.InstancedInterleavedBuffer(new Float32Array(maxEmbers * STRIDE), STRIDE)
    .setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('emberCenter', new T.InterleavedBufferAttribute(data, 3, 0));
  geometry.setAttribute('emberTrail', new T.InterleavedBufferAttribute(data, 3, 3));
  geometry.setAttribute('emberState', new T.InterleavedBufferAttribute(data, 2, 6));
  geometry.instanceCount = 0;

  const material = new T.ShaderMaterial({
    vertexShader, fragmentShader,
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
  let disposed = false;

  function update(embers) {
    if (disposed) return;
    const count = Math.min(embers.length, maxEmbers);
    for (let i = 0; i < count; i += 1) {
      const {id, x, y, z, vx, vy, vz, heat} = embers[i];
      const warm = T.MathUtils.clamp(heat, 0, 1);
      const speed = Math.hypot(vx, vy, vz);
      const exposure = emberWakeSeconds(speed, warm);
      const index = i * STRIDE;
      data.array[index] = x;
      data.array[index + 1] = y;
      data.array[index + 2] = z;
      data.array[index + 3] = vx * exposure;
      data.array[index + 4] = vy * exposure;
      data.array[index + 5] = vz * exposure;
      data.array[index + 6] = warm;
      data.array[index + 7] = emberPhase(id);
    }

    data.clearUpdateRanges();
    if (count > 0) {
      data.addUpdateRange(0, count * STRIDE);
      data.needsUpdate = true;
    }
    geometry.instanceCount = count;
    mesh.visible = count > 0;
  }

  function stats() {
    const embers = geometry.instanceCount;
    return {embers, draws: embers > 0 ? 1 : 0, maxEmbers};
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    geometry.instanceCount = 0;
    mesh.visible = false;
    mesh.removeFromParent();
    root.removeFromParent();
    geometry.dispose();
    material.dispose();
  }

  return {root, update, stats, dispose};
}
