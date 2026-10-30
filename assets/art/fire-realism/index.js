import {createTongueGeometry} from './geometry.js';
import {vertexShader, fragmentShader} from './shaders.js';

export const FIRE_REALISM_VERSION = '0.1.0-reference-candidate';
const finite = Number.isFinite;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, finite(x) ? x : a));
const point = p => p && [p.x, p.y, p.h].every(finite);
function seed(id) { let s = 2166136261; for (const c of String(id)) s = Math.imul(s ^ c.charCodeAt(0), 16777619); return (s >>> 0) / 4294967296; }
const mix = (a, b, t) => a + (b - a) * t;

/** Renderer-injected, metre-scaled, world-clock presentation. Never creates gameplay. */
export function createFireRealism(T, options = {}) {
  const quality = options.quality ?? 'reference';
  if (quality !== 'reference') throw new RangeError('Optimized fire is unavailable until the detailed reference is reviewed and frozen.');
  const maxCells = options.maxCells ?? 65536, maxRays = options.maxRays ?? 256;
  if (!Number.isInteger(maxCells) || maxCells < 1 || maxCells > 65536 || !Number.isInteger(maxRays) || maxRays < 2 || maxRays > 256) throw new RangeError('Invalid bounded fire capacity');
  const settings = Object.freeze({quality, maxCells, maxRays, smokeTailSeconds: 3.2, raySteps: 9, densitySteps: 18});
  const root = new T.Group(); root.name = 'TB-034 detailed fire reference candidate';
  const owned = {geometries: new Set(), materials: new Set(), textures: new Set()};
  const clock = {value: 0}, player = {value: new T.Vector3(1e6, 0, 1e6)}, playerRadius = {value: .3}, orthographic = {value: 1};
  const rayData = new Float32Array(256 * 4), rayTable = new T.DataTexture(rayData, 256, 1, T.RGBAFormat, T.FloatType);
  rayTable.minFilter = rayTable.magFilter = T.NearestFilter; rayTable.generateMipmaps = false; rayTable.needsUpdate = true; owned.textures.add(rayTable);
  const white = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.needsUpdate = true; owned.textures.add(white);
  const shared = {clock, player, playerRadius, orthographic, field: {value: white}, grid: {value: new T.Vector2(1, 1)}, cellSize: {value: .5},
    fieldEnabled: {value: 0}, rayTable: {value: rayTable}, rayCount: {value: 0}, connected: {value: 0}, jetHeading: {value: 0}, shapeOrigin: {value: new T.Vector2()}};
  const layers = [];
  function layer(name, capacity, smoke = false, clipJet = false) {
    const geometry = createTongueGeometry(T, smoke); owned.geometries.add(geometry);
    const arrays = {iOrigin: new Float32Array(capacity * 3), iAxis: new Float32Array(capacity * 3), iShape: new Float32Array(capacity * 4), iMask: new Float32Array(capacity)};
    for (const [key, array] of Object.entries(arrays)) geometry.setAttribute(key, new T.InstancedBufferAttribute(array, key === 'iShape' ? 4 : key === 'iMask' ? 1 : 3).setUsage(T.DynamicDrawUsage));
    const material = new T.ShaderMaterial({uniforms: {...shared, smoke: {value: Number(smoke)}, clipJet: {value: Number(clipJet)}}, vertexShader, fragmentShader,
      transparent: true, depthWrite: false, depthTest: true, side: T.FrontSide, toneMapped: true}); owned.materials.add(material);
    const mesh = new T.Mesh(geometry, material); mesh.name = name; mesh.frustumCulled = false; mesh.renderOrder = smoke ? 6 : 5; root.add(mesh);
    let count = 0;
    const result = {name, geometry, arrays, capacity,
      clear() { count = 0; },
      add(origin, axis, radius, length, strength, seedValue, mask = 0) {
        if (count >= capacity) throw new RangeError(`${name} capacity exceeded; refusing silent population reduction`);
        const i = count++; arrays.iOrigin.set(origin, i * 3); arrays.iAxis.set(axis, i * 3); arrays.iShape.set([radius, length, strength, seedValue], i * 4); arrays.iMask[i] = mask;
      },
      finish() {
        geometry.instanceCount = count;
        for (const key of Object.keys(arrays)) {
          const attribute = geometry.getAttribute(key); attribute.clearUpdateRanges();
          if (count) {attribute.addUpdateRange(0, count * attribute.itemSize); attribute.needsUpdate = true;}
        }
      },
      stats() { return {name, instances: count, trianglesPerInstance: geometry.userData.triangles, triangles: count * geometry.userData.triangles, capacity}; }
    };
    layers.push(result); return result;
  }
  const flames = layer('Connected ground tongues', maxCells * 3);
  const smoke = layer('Buoyant density columns', maxCells, true);
  const jets = layer('Resolved liquid-fuel jet', maxRays * settings.raySteps, false, true);
  const torch = layer('Finite carried torch', 3);
  const lights = Array.from({length: 3}, () => { const l = new T.PointLight(0xff8a36, 0, 4.5, 2); l.name = 'Bounded fire spill'; root.add(l); return l; });
  const history = new Map();
  let closed = false, lastTime = null, lastTick = null, paused = false, primed = false, updates = 0, discardedEvents = 0;
  let state = {burningCells: 0, smokeColumns: 0, discharge: 'inactive', torch: 'unlit', unsupportedBuildingGroups: 0, warnings: []};
  function clear() {
    history.clear(); for (const l of layers) {l.clear(); l.finish();} for (const l of lights) l.intensity = 0;
    lastTime = lastTick = null; paused = primed = false; discardedEvents = 0; clock.value = 0;
    state = {burningCells: 0, smokeColumns: 0, discharge: 'inactive', torch: 'unlit', unsupportedBuildingGroups: 0, warnings: []};
  }
  function bindField(fieldUniforms) {
    const source = fieldUniforms?.field?.value, grid = fieldUniforms?.grid?.value, cellSize = fieldUniforms?.cellSize?.value;
    if (source?.isTexture && finite(grid?.x) && finite(grid?.y) && grid.x > 0 && grid.y > 0 && finite(cellSize) && cellSize > 0) {
      shared.field.value = source; shared.grid.value.set(grid.x, grid.y); shared.cellSize.value = cellSize; shared.fieldEnabled.value = 1;
    } else { shared.field.value = white; shared.fieldEnabled.value = 0; }
  }
  function ground(cells, time) {
    const active = [], seen = new Set();
    for (const [id, h] of history) if (time - h.lastBurn >= settings.smokeTailSeconds) history.delete(id);
    if (!Array.isArray(cells)) cells = [];
    if (cells.length > 65536) throw new RangeError('Authoritative grid exceeds the supported 65536-cell input contract.');
    for (const c of cells) {
      if (c.id === undefined || seen.has(c.id) || !finite(c.x) || !finite(c.y)) {state.warnings.push('Invalid or duplicate authoritative cell omitted'); continue;}
      seen.add(c.id);
      const intensity = clamp(c.intensity), burning = c.phase === 'burning' && intensity > 0;
      let h = history.get(c.id);
      if (burning) {
        if (!h && history.size >= maxCells) throw new RangeError('Emitting source/history capacity exceeded; no active fire is silently dropped.');
        h = {x: c.x, y: c.y, elevation: finite(c.elevation) ? c.elevation : 0, size: clamp(c.size || .5, .05, 2), intensity, lastBurn: time, seed: seed(c.id)};
        history.set(c.id, h); active.push(h);
        const height = .30 + intensity * (c.depositedFuel > 0 ? 1.2 : .94);
        const width = h.size * .74;
        flames.add([h.x, h.elevation + .018, h.y], [0, 1, 0], width, height, .84 * intensity, h.seed, 1);
        for (let i = 0; i < 2; i++) {
          const s = seed(`${c.id}:tongue:${i}`), a = s * Math.PI * 2;
          flames.add([h.x + Math.cos(a) * width * .36, h.elevation + .02, h.y + Math.sin(a) * width * .36], [0, 1, 0], width * .55, height * (.67 + .34 * s), .75 * intensity, s, 1);
        }
      }
    }
    // Nearby observed sources entrain one shared column, rather than stamp a full plume on every cell.
    const clusters = new Map();
    for (const [id, h] of history) {
      const age = time - h.lastBurn;
      if (age >= settings.smokeTailSeconds) {history.delete(id); continue;}
      const strength = h.intensity * (1 - age / settings.smokeTailSeconds);
      const key = `${Math.floor(h.x)}:${Math.floor(h.y)}:${Math.round(h.elevation / 2.12)}`;
      const c = clusters.get(key) || {x: 0, y: 0, elevation: 0, age: 0, weight: 0, count: 0};
      c.x += h.x * strength; c.y += h.y * strength; c.elevation += h.elevation * strength; c.age += age * strength; c.weight += strength; c.count++;
      clusters.set(key, c);
    }
    for (const [key, c] of clusters) {
      if (c.weight <= .0001) continue;
      const s = seed(`smoke:${key}`), a = s * 6.28318, w = c.weight;
      smoke.add([c.x / w, c.elevation / w + .18 + c.age / w * .36, c.y / w],
        [.12 * Math.cos(a), 1, .12 * Math.sin(a)], .39 + Math.min(.25, Math.sqrt(w) * .10),
        1.8 + c.weight / c.count + s * .65, Math.min(.62, w * .28), s);
    }
    active.forEach((h, i) => { if (i < 3) { const k = Math.floor(i * active.length / Math.min(3, active.length)), p = active[k]; lights[i].position.set(p.x, p.elevation + .55, p.y); lights[i].intensity = p.intensity * 1.6; }});
    state.burningCells = active.length; state.smokeColumns = clusters.size;
  }
  function discharge(d, anchors) {
    if (!d?.active) return;
    const muzzle = anchors?.muzzle;
    if (!muzzle || ![muzzle.x, muzzle.y, muzzle.z].every(finite)) {state.discharge = 'missing authoritative rendered muzzle'; return;}
    const rays = d.rays;
    if (!point(d.shapeOrigin) || !point(d.origin) || !finite(d.heading) || !Array.isArray(rays) || rays.length > maxRays || rays.some(r => !point(r) || !finite(r.angle) || !finite(r.distance) || r.distance < 0)) {state.discharge = 'invalid authoritative discharge'; return;}
    if (d.connectRays !== true || rays.length < 2 || rays.some((r, i) => i && r.angle <= rays[i - 1].angle)) {state.discharge = 'disconnected/unordered rays deferred; no invented fan'; return;}
    const o = d.shapeOrigin;
    const cross = (a, b) => a.x * b.y - a.y * b.x;
    const q = {x: muzzle.x - o.x, y: muzzle.z - o.y};
    const inside = Math.hypot(q.x, q.y) < 1e-6 || rays.some((r, i) => {
      if (!i) return false; const a = {x: rays[i - 1].x - o.x, y: rays[i - 1].y - o.y}, b = {x: r.x - o.x, y: r.y - o.y};
      return cross(a, b) > 1e-9 && cross(a, q) >= -1e-9 && cross(q, b) >= -1e-9 && cross({x: b.x - a.x, y: b.y - a.y}, {x: q.x - a.x, y: q.y - a.y}) >= -1e-9;
    });
    if (!inside) {state.discharge = 'muzzle outside resolved fan; authoritative lead support deferred'; return;}
    shared.jetHeading.value = d.heading; shared.shapeOrigin.value.set(o.x, o.y); shared.rayCount.value = rays.length; shared.connected.value = 1;
    rayData.fill(0); rays.forEach((r, i) => rayData.set([r.x, r.y, r.angle - d.heading, r.distance], i * 4)); rayTable.needsUpdate = true;
    // Each thin curved plume remains bounded by the resolved triangle fan in the density shader.
    const stride = Math.max(1, Math.floor(rays.length / 13));
    for (let i = 0; i < rays.length; i += stride) {
      const r = rays[i], dx = r.x - muzzle.x, dy = r.y - muzzle.z, dh = r.h - muzzle.y, length = Math.hypot(dx, dy, dh);
      if (length < .02) continue;
      const dir = [dx / length, dh / length, dy / length];
      for (let j = 0; j < settings.raySteps; j++) {
        const t = j / settings.raySteps, s = seed(`jet:${i}:${j}`), segment = length / settings.raySteps * 1.6;
        jets.add([mix(muzzle.x, r.x, t), mix(muzzle.y, r.h, t), mix(muzzle.z, r.y, t)], dir, .045 + t * .18, Math.min(segment, length * (1 - t)), .55 + t * .24, s);
      }
    }
    state.discharge = 'resolved connected fan';
    if (!state.burningCells) {lights[0].position.set(muzzle.x, muzzle.y, muzzle.z); lights[0].intensity = 1.2;}
  }
  function carried(t, anchors) {
    if (t?.phase !== 'lit' || !(t.remainingSeconds > 0)) {state.torch = t?.phase || 'unlit'; return;}
    const a = anchors?.torchTip;
    if (!a || ![a.x, a.y, a.z].every(finite)) {state.torch = 'lit; missing authoritative rendered anchor'; return;}
    for (let i = 0; i < 3; i++) torch.add([a.x + (i - 1) * .025, a.y, a.z], [0, 1, 0], .075 - i * .011, .30 + i * .045, .9, seed(`torch:${i}`));
    state.torch = 'lit at supplied anchor';
    if (!state.burningCells && state.discharge === 'inactive') {lights[0].position.set(a.x, a.y, a.z); lights[0].intensity = .45;}
  }
  function update(frame) {
    if (closed) return;
    if (frame?.version !== 1 || !finite(frame.worldTime) || !Number.isInteger(frame.tick)) throw new TypeError('Fire requires a detached v1 frame with finite worldTime and integer tick.');
    if (lastTime !== null && (frame.worldTime < lastTime || frame.tick < lastTick)) clear();
    const p = frame.player;
    if (p && finite(p.x) && finite(p.y)) player.value.set(p.x, finite(p.elevation) ? p.elevation : 0, p.y); else player.value.set(1e6, 0, 1e6);
    playerRadius.value = clamp(p?.radius ?? .3, .05, 3); orthographic.value = frame.camera?.kind === 'perspective' || frame.camera?.isPerspectiveCamera ? 0 : 1;
    bindField(frame.fieldUniforms);
    if (frame.paused === true && lastTime !== null) {paused = true; return;}
    paused = frame.paused === true; clock.value = frame.worldTime; lastTime = frame.worldTime; lastTick = frame.tick; updates++;
    for (const l of layers) l.clear(); for (const l of lights) l.intensity = 0;
    shared.connected.value = 0; shared.rayCount.value = 0;
    state = {...state, discharge: 'inactive', torch: 'unlit', warnings: [], unsupportedBuildingGroups: Array.isArray(frame.buildingVisuals) ? frame.buildingVisuals.length : 0};
    ground(frame.cells, frame.worldTime); discharge(frame.discharge, frame.anchors); carried(frame.torch, frame.anchors);
    // This first reference does not present explosions; suppress all rather than replay historical events.
    if (Array.isArray(frame.events)) discardedEvents += primed ? 0 : frame.events.length;
    primed = true; for (const l of layers) l.finish();
  }
  function diagnostics() {
    const stats = layers.map(l => l.stats());
    return {version: FIRE_REALISM_VERSION, quality, referenceAccepted: false, optimizedAvailable: false, settings, presentationOnly: true,
      ...state, warnings: [...state.warnings], worldTime: clock.value, paused, updates, discardedStartupEvents: discardedEvents,
      layers: stats, triangles: stats.reduce((n, s) => n + s.triangles, 0), allocatedBufferBytes: [...owned.geometries].reduce((n, g) => n + (g.index?.array.byteLength || 0) + Object.values(g.attributes).reduce((m, a) => m + a.array.byteLength, 0), 0),
      ownedTextureBytes: [...owned.textures].reduce((n, t) => n + (t.image?.data?.byteLength || 0), 0),
      boundedLights: 3, activeLights: lights.filter(l => l.intensity > 0).length,
      resources: Object.fromEntries(Object.entries(owned).map(([k, s]) => [k, s.size])), borrowedField: shared.fieldEnabled.value === 1,
      costClaim: 'Unmeasured. No GPU or quality acceptance.', disposed: closed};
  }
  function dispose() {
    if (closed) return; closed = true; root.removeFromParent(); root.clear(); history.clear();
    for (const set of Object.values(owned)) {for (const value of set) value.dispose(); set.clear();}
  }
  return {root, update, reset() {if (!closed) clear();}, dispose, diagnostics};
}
