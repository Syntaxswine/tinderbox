const WIDTH = 6;
const DEPTH = 7;
const TILES = WIDTH * DEPTH;
const LAYERS = ['roof', 'upper', 'lower'];
const EPSILON = 1e-7;
const SOURCE_X = 10;
const SOURCE_Z = 11;
const DROP_CAPACITY = 2;
const DROP_SHAPES = {board: [.72, .09, .26], crate: [.38, .34, .36]};

const ashVertex = `
attribute float ashAmount;
varying vec2 vUv;
varying vec2 vGround;
varying float vAsh;
void main() {
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vUv = uv;
  vGround = world.xz;
  vAsh = ashAmount;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const ashFragment = `
varying vec2 vUv;
varying vec2 vGround;
varying float vAsh;
float grainAt(vec2 tile) {
  return fract(sin(dot(tile, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
  vec2 edge = abs(vUv * 2.0 - 1.0);
  float clump = grainAt(floor(vGround * 13.0));
  float grain = grainAt(floor(vGround * 56.0));
  float rim = max(edge.x, edge.y) + .12 * (clump - .5);
  float mask = 1.0 - smoothstep(.80, .99, rim);
  float alpha = vAsh * mask * (.41 + .47 * clump);
  if (alpha < .008) discard;
  vec3 coal = vec3(.024, .020, .016);
  vec3 dust = vec3(.19, .175, .155);
  gl_FragColor = vec4(mix(coal, dust, smoothstep(.27, .89, .62 * grain + .38 * clump)), alpha);
  #include <colorspace_fragment>
}
`;

function hidesInterior(node) {
  const {x, z} = node.position;
  if (node.name === 'Floor slab rim') return Math.abs(x) < .001 || Math.abs(z - DEPTH) < .001;
  if (!node.name.startsWith('wall:')) return false;
  const rooms = node.userData.rooms?.length;
  return rooms === 1 ? Math.abs(x) < .001 || Math.abs(z - DEPTH) < .001 : rooms === 2 && x < 3;
}

// Clip in the authored plan coordinates but interpolate the original
// part-local positions, normals, and both UV channels at the new vertices.
function clipPolygon(poly, axis, line, sign) {
  if (poly.length === 0) return poly;
  const next = [];
  let a = poly.at(-1);
  let da = (a[axis] - line) * sign;
  for (const b of poly) {
    const db = (b[axis] - line) * sign;
    if ((da < 0) !== (db < 0)) {
      const t = da / (da - db);
      const crossing = a.map((value, i) => value + (b[i] - value) * t);
      crossing[axis] = line;
      next.push(crossing);
    }
    if (db >= 0) next.push(b);
    a = b;
    da = db;
  }
  return next;
}

function putTriangle(triangle, bins, clamp) {
  const [a, b, c] = triangle;
  const firstX = clamp(Math.floor(Math.min(a[SOURCE_X], b[SOURCE_X], c[SOURCE_X]) + EPSILON), 0, WIDTH - 1);
  const lastX = clamp(Math.floor(Math.max(a[SOURCE_X], b[SOURCE_X], c[SOURCE_X]) - EPSILON), firstX, WIDTH - 1);
  const firstZ = clamp(Math.floor(Math.min(a[SOURCE_Z], b[SOURCE_Z], c[SOURCE_Z]) + EPSILON), 0, DEPTH - 1);
  const lastZ = clamp(Math.floor(Math.max(a[SOURCE_Z], b[SOURCE_Z], c[SOURCE_Z]) - EPSILON), firstZ, DEPTH - 1);
  if (firstX === lastX && firstZ === lastZ) {
    bins[firstZ * WIDTH + firstX].push(a, b, c);
    return;
  }

  // The boundary tiles also own eaves, the entry stair, and wall thickness
  // outside the nominal plan. Clip only at interior metre lines.
  for (let z = firstZ; z <= lastZ; z += 1) {
    let slice = triangle;
    if (z > firstZ) slice = clipPolygon(slice, SOURCE_Z, z, 1);
    if (z < lastZ) slice = clipPolygon(slice, SOURCE_Z, z + 1, -1);
    for (let x = firstX; x <= lastX; x += 1) {
      let poly = slice;
      if (x > firstX) poly = clipPolygon(poly, SOURCE_X, x, 1);
      if (x < lastX) poly = clipPolygon(poly, SOURCE_X, x + 1, -1);
      const bin = bins[z * WIDTH + x];
      for (let i = 1; i + 1 < poly.length; i += 1) {
        const [p, q, r] = [poly[0], poly[i], poly[i + 1]];
        const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2];
        const vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
        if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) > 1e-10) bin.push(p, q, r);
      }
    }
  }
}

function createBatch(T, part, layer, entry) {
  const {bins, material, hidden, castShadow, receiveShadow} = entry;
  const length = bins.reduce((sum, bin) => sum + bin.length, 0);
  const position = new Float32Array(length * 3);
  const normal = new Float32Array(length * 3);
  const uv = new Float32Array(length * 2);
  const grossUV = new Float32Array(length * 2);
  const ranges = [];
  let i = 0;
  for (const bin of bins) {
    ranges.push({start: i, count: bin.length});
    for (const v of bin) {
      position[i * 3] = v[0]; position[i * 3 + 1] = v[1]; position[i * 3 + 2] = v[2];
      normal[i * 3] = v[3]; normal[i * 3 + 1] = v[4]; normal[i * 3 + 2] = v[5];
      uv[i * 2] = v[6]; uv[i * 2 + 1] = v[7];
      grossUV[i * 2] = v[8]; grossUV[i * 2 + 1] = v[9];
      i += 1;
    }
  }
  const index = length > 65535 ? new Uint32Array(length) : new Uint16Array(length);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new T.BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
  geometry.setAttribute('grossUV', new T.BufferAttribute(grossUV, 2));
  geometry.setIndex(new T.BufferAttribute(index, 1).setUsage(T.DynamicDrawUsage));
  geometry.computeBoundingSphere();
  const mesh = new T.Mesh(geometry, material);
  mesh.name = part.name + ' tiles / ' + material.name;
  mesh.userData.burnoutLayer = layer;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return {part, layer, mesh, ranges, hidden};
}

function batchNative(T, houseRoot, movingParts, revealInteriorDoors) {
  const parts = new Map();
  for (const [name, layer] of [['Removable roofs', 'roof'], ['Level 0', 'upper'],
    ['Exterior ornament', 'upper'], ['Level -1', 'lower']]) {
    const part = houseRoot.children.find(child => child.name === name);
    if (!part) throw Error('Tile burnout needs the native ' + name + ' group');
    parts.set(part, layer);
  }
  for (const part of movingParts) parts.set(part, 'upper');

  houseRoot.updateMatrixWorld(true);
  const inverseHouse = houseRoot.matrixWorld.clone().invert();
  const inversePart = new T.Matrix4(), local = new T.Matrix4(), source = new T.Matrix4();
  const normalMatrix = new T.Matrix3(), p = new T.Vector3(), n = new T.Vector3(), q = new T.Vector3();
  const originals = new Set();
  const batches = [];

  for (const [part, layer] of parts) {
    inversePart.copy(part.matrixWorld).invert();
    source.multiplyMatrices(inverseHouse, part.matrixWorld);
    const entries = new Map();
    function collect(mesh, hide) {
      if (!mesh.visible || (mesh !== part && parts.has(mesh))) return;
      const hideDoor = revealInteriorDoors && layer === 'upper' && mesh.isGroup
        && mesh.parent?.name.startsWith('wall:') && mesh.parent.userData.rooms?.length === 2
        && mesh.children.some(child => child.name === 'Native closed-door leaf');
      const hidden = hide || hidesInterior(mesh) || hideDoor;
      for (const child of mesh.children) collect(child, hidden);
      if (!mesh.isMesh) return;

      const {geometry} = mesh;
      const {position, normal, uv, grossUV} = geometry.attributes;
      if (!position || !normal || !uv || !grossUV || mesh.matrixWorld.determinant() <= 0) {
        throw Error('Unsupported native Ashland geometry at ' + mesh.name);
      }
      local.multiplyMatrices(inversePart, mesh.matrixWorld);
      normalMatrix.getNormalMatrix(local);
      const vertices = Array.from({length: position.count}, (_, i) => {
        p.fromBufferAttribute(position, i).applyMatrix4(local);
        n.fromBufferAttribute(normal, i).applyNormalMatrix(normalMatrix);
        q.copy(p).applyMatrix4(source);
        return [p.x, p.y, p.z, n.x, n.y, n.z, uv.getX(i), uv.getY(i),
          grossUV.getX(i), grossUV.getY(i), q.x, q.z];
      });

      const available = geometry.index?.count ?? position.count;
      const ranges = Array.isArray(mesh.material) ? geometry.groups : [{start: 0, count: available, materialIndex: 0}];
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const range of ranges) {
        const material = materials[range.materialIndex];
        if (!material) continue;
        const {castShadow, receiveShadow} = mesh;
        const key = [material.id, castShadow, receiveShadow, hidden].join('/');
        if (!entries.has(key)) entries.set(key, {material, hidden, castShadow, receiveShadow,
          bins: Array.from({length: TILES}, () => [])});
        const bins = entries.get(key).bins;
        const first = Math.max(range.start, geometry.drawRange.start);
        const end = Math.min(available, range.start + range.count, geometry.drawRange.start + geometry.drawRange.count);
        for (let i = first; i + 2 < end; i += 3) {
          const triangle = geometry.index ? [
            vertices[geometry.index.getX(i)], vertices[geometry.index.getX(i + 1)], vertices[geometry.index.getX(i + 2)],
          ] : [vertices[i], vertices[i + 1], vertices[i + 2]];
          putTriangle(triangle, bins, T.MathUtils.clamp);
        }
      }
      originals.add(mesh);
    }
    collect(part, layer === 'roof' || / (left|back) hinge$/.test(part.name));
    for (const entry of entries.values()) batches.push(createBatch(T, part, layer, entry));
  }
  for (const {part, mesh} of batches) part.add(mesh);
  for (const mesh of originals) mesh.visible = false;
  return {originals, batches};
}

function createAsh(T) {
  const geometry = new T.PlaneGeometry(1.14, 1.14).rotateX(-Math.PI / 2);
  const amount = new T.InstancedBufferAttribute(new Float32Array(TILES), 1).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('ashAmount', amount);
  const material = new T.ShaderMaterial({vertexShader: ashVertex, fragmentShader: ashFragment,
    transparent: true, depthTest: true, depthWrite: false, toneMapped: false});
  const mesh = new T.InstancedMesh(geometry, material, TILES);
  mesh.name = 'Ashland floor ash tiles';
  return {mesh, amount};
}

function emptyInstances(T, mesh) {
  mesh.count = 0;
  mesh.visible = false;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
}

export function createHouseTileArt(T, houseRoot, {movingParts = [], woodTexture, revealInteriorDoors = false} = {}) {
  const {originals, batches} = batchNative(T, houseRoot, movingParts, revealInteriorDoors);
  const root = new T.Group();
  root.name = 'Ashland falling wood and ash';
  const ash = createAsh(T);
  const wood = new T.MeshStandardMaterial({map: woodTexture ?? null, color: 0xd6a16b, roughness: .94});
  const drops = {};
  for (const [kind, dimensions] of Object.entries(DROP_SHAPES)) {
    const mesh = new T.InstancedMesh(new T.BoxGeometry(...dimensions), wood, DROP_CAPACITY);
    mesh.name = 'Ashland falling ' + kind;
    mesh.castShadow = mesh.receiveShadow = true;
    drops[kind] = mesh;
  }
  for (const mesh of [ash.mesh, ...Object.values(drops)]) {
    emptyInstances(T, mesh);
    root.add(mesh);
  }

  const masks = Object.fromEntries(LAYERS.map(layer => [layer, new Uint8Array(TILES).fill(1)]));
  const changed = new Set();
  const matrix = new T.Matrix4(), euler = new T.Euler();
  let cutaway = false;
  let disposed = false;

  function refresh(batch) {
    const {mesh, layer, ranges} = batch;
    const geometry = mesh.geometry;
    const index = geometry.index;
    let count = 0;
    for (const [tile, range] of ranges.entries()) {
      if (!masks[layer][tile]) continue;
      for (let i = 0; i < range.count; i += 1) {
        index.array[count] = range.start + i;
        count += 1;
      }
    }
    geometry.setDrawRange(0, count);
    index.clearUpdateRanges();
    if (count > 0) {
      index.addUpdateRange(0, count);
      index.needsUpdate = true;
    }
    mesh.visible = count > 0 && !(cutaway && batch.hidden);
  }
  for (const batch of batches) refresh(batch);

  function update(frame) {
    if (disposed) return;
    changed.clear();
    ash.mesh.count = 0;
    for (const tile of frame.tiles) {
      for (const layer of LAYERS) {
        const visible = tile[layer] ? 1 : 0;
        if (masks[layer][tile.index] === visible) continue;
        masks[layer][tile.index] = visible;
        changed.add(layer);
      }
      const strength = T.MathUtils.clamp(Number(tile.ash), 0, 1);
      if (strength > 0) {
        const i = ash.mesh.count;
        matrix.makeTranslation(tile.x + .5, .010, tile.z + .5);
        ash.mesh.setMatrixAt(i, matrix);
        ash.amount.setX(i, strength);
        ash.mesh.count += 1;
      }
    }
    for (const batch of batches) if (changed.has(batch.layer)) refresh(batch);

    for (const mesh of Object.values(drops)) mesh.count = 0;
    for (const item of frame.drops) {
      const mesh = drops[item.kind];
      if (!mesh || mesh.count >= DROP_CAPACITY) throw RangeError('Unsupported falling wood budget');
      matrix.makeRotationFromEuler(euler.set(item.rx, item.ry, item.rz));
      matrix.setPosition(item.x, item.y, item.z);
      mesh.setMatrixAt(mesh.count, matrix);
      mesh.count += 1;
    }
    for (const mesh of [ash.mesh, ...Object.values(drops)]) {
      mesh.visible = mesh.count > 0;
      if (mesh.visible) mesh.instanceMatrix.needsUpdate = true;
    }
    if (ash.mesh.visible) ash.amount.needsUpdate = true;
  }

  function setCutaway(enabled) {
    if (disposed || cutaway === Boolean(enabled)) return;
    cutaway = Boolean(enabled);
    for (const batch of batches) if (batch.hidden) {
      batch.mesh.visible = !cutaway && batch.mesh.geometry.drawRange.count > 0;
    }
  }

  function diagnostics() {
    let visibleBatches = 0, shadowBatches = 0, visibleTriangles = 0;
    if (houseRoot.visible) for (const {mesh} of batches) {
      if (!mesh.visible) continue;
      visibleBatches += 1;
      if (mesh.castShadow) shadowBatches += 1;
      visibleTriangles += mesh.geometry.drawRange.count / 3;
    }
    return {cutaway, sourceMeshes: originals.size, batches: batches.length, visibleBatches,
      shadowBatches, visibleTriangles, boards: drops.board.count, crates: drops.crate.count, ashTiles: ash.mesh.count};
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const {mesh} of batches) {
      mesh.removeFromParent();
      mesh.geometry.dispose();
    }
    for (const mesh of originals) mesh.visible = true;
    batches.length = 0;
    originals.clear();
    for (const mesh of [ash.mesh, ...Object.values(drops)]) {
      mesh.count = 0;
      mesh.visible = false;
      mesh.removeFromParent();
      mesh.dispose();
      mesh.geometry.dispose();
    }
    ash.mesh.material.dispose();
    wood.dispose();
    root.removeFromParent();
  }

  return {root, update, setCutaway, dispose, diagnostics};
}
