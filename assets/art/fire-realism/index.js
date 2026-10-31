import {createTongueGeometry} from './geometry.js';
import {vertexShader, fragmentShader} from './shaders.js';
import {prepareSmokeBillows, SMOKE_BILLOW_COUNT} from './smoke-billows.js';
import {prepareGroundSources, prepareSmokeRegions, GROUND_SOURCE_SIDE, GROUND_DOMAIN_HEIGHT} from './ground-field.js';

export const FIRE_REALISM_VERSION = '0.9.0-reference-candidate';
const finite = Number.isFinite;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, finite(x) ? x : a));
const point = p => p && [p.x, p.y, p.h].every(finite);
const xyz = p => p && [p.x, p.y, p.z].every(finite);
const matrix = a => Array.isArray(a) && a.length === 16 && a.every(finite);
function seed(id) {let s = 2166136261; for (const c of String(id)) s = Math.imul(s ^ c.charCodeAt(0), 16777619); return (s >>> 0) / 4294967296;}
const mix = (a, b, t) => a + (b - a) * t;
const cross = (a, b) => a.x * b.y - a.y * b.x;
function insideFan(p, o, rays) {
  const q = {x: p.x - o.x, y: p.y - o.y};
  if (q.x * q.x + q.y * q.y < 1e-12) return true;
  return rays.some((r, i) => {
    if (!i) return false;
    const a = {x: rays[i - 1].x - o.x, y: rays[i - 1].y - o.y}, b = {x: r.x - o.x, y: r.y - o.y};
    return cross(a, b) > 1e-9 && cross(a, q) >= -1e-9 && cross(q, b) >= -1e-9 && cross({x: b.x - a.x, y: b.y - a.y}, {x: q.x - a.x, y: q.y - a.y}) >= -1e-9;
  });
}

/** Renderer-injected, metre-scaled, authoritative-world-clock presentation. */
export function createFireRealism(T, options = {}) {
  const quality = options.quality ?? 'reference';
  if (quality !== 'reference') throw new RangeError('Optimized fire is unavailable until the detailed reference is reviewed and frozen.');
  const maxCells = options.maxCells ?? 4096, maxRays = options.maxRays ?? 256, maxBuildings = options.maxBuildings ?? 64;
  if (!Number.isInteger(maxCells) || maxCells < 1 || maxCells > 4096 || !Number.isInteger(maxRays) || maxRays < 2 || maxRays > 256 || !Number.isInteger(maxBuildings) || maxBuildings < 1 || maxBuildings > 64) throw new RangeError('Invalid bounded fire capacity');
  const settings = Object.freeze({quality, maxCells, maxRays, maxBuildings, smokeTailSeconds: 3.2, jetSmokeTailSeconds: 3.2, maxJetSmoke: 384, raySteps: 1, densitySteps: 32, groundDomainDensitySteps: 32, groundAndTorchDensitySteps: 32, jetDensitySteps: 18, smokeDensitySteps: 32, jetSmokeDensitySteps: 18, smokeBillowsPerInstance: SMOKE_BILLOW_COUNT, groundSourceTextureSide: GROUND_SOURCE_SIDE, maxFacadeCandidates: 32, maxFacadePairs: 8});
  const root = new T.Group(); root.name = 'TB-034 detailed fire reference candidate';
  const owned = {geometries: new Set(), materials: new Set(), textures: new Set()};
  const rayData = new Float32Array(256 * 4), rayTable = new T.DataTexture(rayData, 256, 1, T.RGBAFormat, T.FloatType);
  rayTable.minFilter = rayTable.magFilter = T.NearestFilter; rayTable.generateMipmaps = false; rayTable.needsUpdate = true; owned.textures.add(rayTable);
  const white = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.needsUpdate = true; owned.textures.add(white);
  const groundData = new Float32Array(GROUND_SOURCE_SIDE ** 2 * 4), groundSources = new T.DataTexture(groundData, GROUND_SOURCE_SIDE, GROUND_SOURCE_SIDE, T.RGBAFormat, T.FloatType);
  groundSources.minFilter = groundSources.magFilter = T.NearestFilter; groundSources.generateMipmaps = false; groundSources.needsUpdate = true; owned.textures.add(groundSources);
  const shared = {
    clock: {value: 0}, player: {value: new T.Vector3(1e6, 0, 1e6)}, playerRadius: {value: .3}, orthographic: {value: 1},
    field: {value: white}, grid: {value: new T.Vector2(1, 1)}, cellSize: {value: .5}, fieldEnabled: {value: 0},
    groundSources: {value: groundSources}, groundOrigin: {value: new T.Vector2()}, groundExtent: {value: new T.Vector2()}, groundCellSize: {value: .5}, groundFieldEnabled: {value: 0},
    rayTable: {value: rayTable}, rayCount: {value: 0}, connected: {value: 0}, jetHeading: {value: 0}, shapeOrigin: {value: new T.Vector2()},
    sourceOrigin: {value: new T.Vector2()}, sourceDirection: {value: new T.Vector2(1, 0)}, forwardStart: {value: 0},
    fuelJet: {value: 0}, jetAxisOrigin: {value: new T.Vector3()}, jetExtent: {value: 1}, jetTipHeight: {value: 0},
    opaqueDepth: {value: white}, opaqueDepthSize: {value: new T.Vector2(1, 1)}, opaqueDepthEnabled: {value: 0}, opaqueViewProjection: {value: new T.Matrix4()}
  };
  const capacity = maxCells * 4 + (maxRays + 1) * settings.raySteps + settings.maxJetSmoke + maxBuildings * settings.maxFacadePairs * 2 + 3;
  const geometry = createTongueGeometry(T); owned.geometries.add(geometry);
  const arrays = {iOrigin: new Float32Array(capacity * 3), iAxis: new Float32Array(capacity * 3), iShape: new Float32Array(capacity * 4), iPolicy: new Float32Array(capacity * 3)};
  for (let i = 0; i < SMOKE_BILLOW_COUNT; i++) arrays[`iBillow${i}`] = new Float32Array(capacity * 4);
  arrays.iBillowAges = new Float32Array(capacity * 4);
  for (const [key, a] of Object.entries(arrays)) geometry.setAttribute(key, new T.InstancedBufferAttribute(a, key === 'iShape' || key.startsWith('iBillow') ? 4 : 3).setUsage(T.DynamicDrawUsage));
  const material = new T.ShaderMaterial({uniforms: shared, vertexShader, fragmentShader, transparent: true, depthWrite: false, depthTest: true, side: T.DoubleSide, toneMapped: false, premultipliedAlpha: true, forceSinglePass: true});
  owned.materials.add(material);
  const mesh = new T.Mesh(geometry, material); mesh.name = 'Depth-sorted flame and smoke stream'; mesh.frustumCulled = false; root.add(mesh);
  const lights = Array.from({length: 3}, () => {const l = new T.PointLight(0xff8a36, 0, 4.5, 2); l.name = 'Bounded fire spill'; root.add(l); return l;});
  const history = new Map(), jetSmokeHistory = new Map();
  const records = [], counts = new Map(), byId = new Map();
  let closed = false, lastTime = null, lastTick = null, paused = false, updates = 0, lastJetBucket = null, generation = null;
  let state, order = [], sortMode = 'semantic-id; missing camera', discardedStartupEvents = 0;
  const blankState = () => ({burningCells: 0, coherentCells: 0, isolatedCells: 0, groundField: null, smokeColumns: 0, smokeSourceCount: 0, smokeSourceWeight: 0, smokeRegions: [], jetSmokeColumns: 0, buildingGroups: 0, unsupportedBuildingGroups: 0, nativeFacadeGroups: 0, nativeFacadeSites: 0, invalidFacadeSites: 0, unavailableFacadeGroups: 0, selectedFacadeSites: [], discharge: 'inactive', torch: 'unlit', warnings: [], transientPresentation: 'External explicit legacy-transient component; not duplicated by this factory'});
  function clear() {
    history.clear(); jetSmokeHistory.clear(); records.length = 0; byId.clear(); counts.clear(); order = []; geometry.instanceCount = 0;
    for (const l of lights) l.intensity = 0;
    lastTime = lastTick = lastJetBucket = generation = null; paused = false; discardedStartupEvents = 0; shared.clock.value = 0; shared.groundFieldEnabled.value = 0; state = blankState();
  }
  clear();
  function add(name, id, origin, axis, radius, length, strength, seedValue, smoke = 0, clip = 0, mask = 0) {
    if (!(radius > 0 && length > 0 && strength > 0)) return;
    if (records.length >= capacity) throw new RangeError('Fire instance capacity exceeded; refusing silent reduction');
    const axisLength = Math.hypot(...axis);
    const record = {name, id, origin, axis: axis.map(n => n / axisLength), shape: [radius, length, strength, seedValue], policy: [smoke, clip, mask]}; records.push(record);
    counts.set(name, (counts.get(name) || 0) + 1);
    return record;
  }
  // One instance stream means Three cannot force all smoke over all flame. Sort
  // every viewed frame, including paused camera changes. This is centroid-sorted
  // alpha compositing, not an exact interpenetrating-volume/OIT claim.
  function finish(camera) {
    const view = matrix(camera?.matrixWorldInverse) ? camera.matrixWorldInverse : null;
    const depth = r => {
      const [x, y, z] = r.origin, length = r.sortLength ?? r.shape[1] * .5, p = [x + r.axis[0] * length, y + r.axis[1] * length, z + r.axis[2] * length];
      return view ? view[2] * p[0] + view[6] * p[1] + view[10] * p[2] + view[14] : 0;
    };
    for (const r of records) r.depth = depth(r);
    records.sort((a, b) => a.depth - b.depth || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    sortMode = view ? 'back-to-front source-centroid, semantic-id ties' : 'semantic-id; missing camera';
    order = records.map(r => r.id);
    for (let i = 0; i < records.length; i++) {
      const r = records[i]; arrays.iOrigin.set(r.origin, i * 3); arrays.iAxis.set(r.axis, i * 3); arrays.iShape.set(r.shape, i * 4); arrays.iPolicy.set(r.policy, i * 3);
      if (r.policy[0] === 1 || r.policy[0] === 3) {
        const billows = prepareSmokeBillows(r.shape[3], shared.clock.value, r.policy[0]);
        for (let j = 0; j < SMOKE_BILLOW_COUNT; j++) {const b = billows[j]; arrays[`iBillow${j}`].set([b.x, b.y, b.z, b.radius], i * 4); arrays.iBillowAges[i * 4 + j] = b.age;}
      } else {
        for (let j = 0; j < SMOKE_BILLOW_COUNT; j++) arrays[`iBillow${j}`].fill(0, i * 4, i * 4 + 4);
        arrays.iBillowAges.fill(0, i * 4, i * 4 + 4);
      }
    }
    geometry.instanceCount = records.length;
    for (const key of Object.keys(arrays)) {
      const a = geometry.getAttribute(key); a.clearUpdateRanges();
      if (records.length) {a.addUpdateRange(0, records.length * a.itemSize); a.needsUpdate = true;}
    }
  }
  function bindField(field) {
    const source = field?.field?.value, grid = field?.grid?.value, cellSize = field?.cellSize?.value;
    if (source?.isTexture && finite(grid?.x) && finite(grid?.y) && grid.x > 0 && grid.y > 0 && finite(cellSize) && cellSize > 0) {
      shared.field.value = source; shared.grid.value.set(grid.x, grid.y); shared.cellSize.value = cellSize; shared.fieldEnabled.value = 1;
    } else {shared.field.value = white; shared.fieldEnabled.value = 0;}
  }
  function bindDepth(depth, camera, viewport) {
    let valid = depth?.valid === true && depth.texture?.isTexture && depth.convention === 'webgl-depth-0-1' && Number.isInteger(depth.width) && depth.width > 0 && Number.isInteger(depth.height) && depth.height > 0 && matrix(depth.viewProjectionMatrix) && matrix(depth.projectionMatrixInverse) && matrix(depth.cameraWorldMatrix);
    valid = valid && finite(viewport?.width) && finite(viewport?.height) && finite(viewport?.pixelRatio) && depth.width === Math.floor(viewport.width * viewport.pixelRatio) && depth.height === Math.floor(viewport.height * viewport.pixelRatio);
    if (valid && matrix(camera?.projectionMatrix) && matrix(camera?.matrixWorldInverse)) {
      const expected = new T.Matrix4().fromArray(camera.projectionMatrix).multiply(new T.Matrix4().fromArray(camera.matrixWorldInverse)).elements;
      valid = expected.every((n, i) => Math.abs(n - depth.viewProjectionMatrix[i]) <= 1e-5 * Math.max(1, Math.abs(n)));
      if (valid && matrix(camera.matrixWorld)) valid = camera.matrixWorld.every((n, i) => Math.abs(n - depth.cameraWorldMatrix[i]) <= 1e-5 * Math.max(1, Math.abs(n)));
    } else valid = false;
    shared.opaqueDepthEnabled.value = Number(valid); shared.opaqueDepth.value = valid ? depth.texture : white;
    if (valid) {shared.opaqueDepthSize.value.set(depth.width, depth.height); shared.opaqueViewProjection.value.fromArray(depth.viewProjectionMatrix);}
    state.opaqueOcclusion = valid ? 'Per-density-sample projected opaque depth; borrowed current-frame prepass' : 'unavailable; ordinary shell depth test only';
  }
  function ground(cells, time) {
    if (!Array.isArray(cells)) cells = [];
    if (cells.length > 65536) throw new RangeError('Authoritative grid exceeds the 65536-cell input contract');
    const active = [];
    for (const [id, h] of history) if (time - h.lastBurn >= settings.smokeTailSeconds) history.delete(id);
    const validCells = cells.filter(c => c?.id !== undefined && finite(c.x) && finite(c.y)).sort((a, b) => String(a.id).localeCompare(String(b.id)));
    for (const c of validCells) {
      if (byId.has(c.id)) {state.warnings.push('Duplicate authoritative cell omitted'); continue;}
      byId.set(c.id, c);
      const intensity = clamp(c.intensity);
      if (c.phase !== 'burning' || intensity <= 0) continue;
      if (!history.has(c.id) && history.size >= maxCells) throw new RangeError('Emitting source/history capacity exceeded; no active fire is silently dropped');
      const h = {id: c.id, x: c.x, y: c.y, elevation: finite(c.elevation) ? c.elevation : 0, size: clamp(c.size || .5, .05, 2), intensity, material: c.material, surfaceFuel: c.surfaceFuel, gas: c.depositedFuel > 0, lastBurn: time, seed: seed(c.id)};
      history.set(c.id, h); active.push(h);
    }
    const field = prepareGroundSources(active, groundData), coherent = new Set(field.coherentIds);
    shared.groundFieldEnabled.value = Number(field.enabled); shared.groundOrigin.value.fromArray(field.origin); shared.groundExtent.value.fromArray(field.extent); shared.groundCellSize.value = field.cellSize; groundSources.needsUpdate = true;
    state.groundField = {enabled: field.enabled, reason: field.reason, extent: [...field.extent], encodedCells: field.enabled ? active.length : 0};
    if (!field.enabled && active.length) state.warnings.push(field.reason);
    for (const h of active) {
      if (coherent.has(h.id)) {
        const record = add('Coherent ground domains', `cell:${h.id}:domain`, [h.x, h.elevation + .018, h.y], [0, 1, 0], h.size * .76, GROUND_DOMAIN_HEIGHT, 1, h.seed, 0, 0, 2);
        // Sorting follows the emitting source, not the conservative empty cap.
        record.sortLength = (.30 + h.intensity * (h.gas ? 1.2 : .94)) * .42;
        continue;
      }
      const height = .30 + h.intensity * (h.gas ? 1.2 : .94), width = h.size * .74;
      add('Connected ground tongues', `cell:${h.id}:main`, [h.x, h.elevation + .018, h.y], [0, 1, 0], width, height, .84 * h.intensity, h.seed, 0, 0, 1);
      for (let i = 0; i < 2; i++) {
        const s = seed(`${h.id}:tongue:${i}`), a = s * Math.PI * 2;
        add('Connected ground tongues', `cell:${h.id}:tongue:${i}`, [h.x + Math.cos(a) * width * .36, h.elevation + .02, h.y + Math.sin(a) * width * .36], [0, 1, 0], width * .55, height * (.67 + .34 * s), .75 * h.intensity, s, 0, 0, 1);
      }
    }
    const regions = prepareSmokeRegions(history, time, settings.smokeTailSeconds);
    for (const c of regions) {
      const single = c.count === 1, key = single ? `${Math.floor(c.x)}:${Math.floor(c.y)}:${Math.round(c.elevation / 2.12)}` : `region:${c.id}`;
      const s = seed(`smoke:${key}`), a = s * Math.PI * 2, mean = c.weight / c.count;
      const radius = single ? .32 + Math.min(.23, Math.sqrt(c.weight) * .10) : .40 + Math.sqrt(c.area) * .30 + c.spread * .43 + c.wood * .12 + c.gas * .10;
      const height = single ? 1.4 + .55 * mean + s * .15 : 1.25 + .45 * mean + .34 * Math.sqrt(c.area) + c.wood * .45 + c.gas * .18 + s * .24;
      const strength = single ? Math.min(.62, c.weight * .28) : Math.min(.78, (.24 + Math.sqrt(c.area) * .20) * mean * (1 + .35 * c.wood + .20 * c.gas));
      add('Buoyant ground smoke', `ground-smoke:${key}`, [c.x, c.elevation + .18 + c.age * .36, c.y], [(single ? .12 : .22) * Math.cos(a), 1, (single ? .12 : .22) * Math.sin(a)], radius, height, strength, s, 1, c.gas, c.wood);
      state.smokeRegions.push({id: key, sourceCount: c.count, weight: c.weight, woodFraction: c.wood, gasFraction: c.gas, radius, height});
    }
    for (let i = 0; i < Math.min(3, active.length); i++) {const p = active[Math.floor(i * active.length / Math.min(3, active.length))]; lights[i].position.set(p.x, p.elevation + .55, p.y); lights[i].intensity = p.intensity * 1.6;}
    state.burningCells = active.length; state.coherentCells = coherent.size; state.isolatedCells = active.length - coherent.size; state.smokeColumns = regions.length;
    state.smokeSourceCount = regions.reduce((n, c) => n + c.count, 0); state.smokeSourceWeight = regions.reduce((n, c) => n + c.weight, 0);
  }
  function segment(name, id, from, to, strength, clip, steps = 1) {
    const dx = to.x - from.x, dy = to.y - from.y, dh = to.h - from.h, length = Math.hypot(dx, dy, dh);
    if (length < 1e-6) return;
    const dir = [dx / length, dh / length, dy / length];
    for (let j = 0; j < steps; j++) {
      const t = j / steps, s = seed(`${id}:${j}`), width = clip >= 2 ? .16 : .23;
      add(name, `${id}:${j}`, [mix(from.x, to.x, t), mix(from.h, to.h, t), mix(from.y, to.y, t)], dir, width, Math.min(length / steps * (clip >= 2 ? 1 : 1.6), length * (1 - t)), strength, s, 0, clip);
    }
  }
  function discharge(d, anchors, time) {
    if (!d?.active || !['torch', 'flamethrower'].includes(d.tool)) return;
    const muzzle = anchors?.muzzle;
    if (!xyz(muzzle)) {state.discharge = 'missing authoritative rendered muzzle'; return;}
    const rays = d.rays;
    if (!point(d.shapeOrigin) || !point(d.origin) || !finite(d.heading) || !Array.isArray(rays) || rays.length > maxRays || rays.some(r => !point(r) || !finite(r.angle) || !finite(r.distance) || r.distance < 0)) {state.discharge = 'invalid authoritative discharge'; return;}
    const connected = d.connectRays === true && rays.length > 1;
    if (connected && rays.some((r, i) => i && r.angle < rays[i - 1].angle)) {state.discharge = 'invalid unordered authoritative fan'; return;}
    const o = d.shapeOrigin, source = d.origin, inside = connected && insideFan({x: muzzle.x, y: muzzle.z}, o, rays);
    const start = inside && d.tool === 'flamethrower' ? Math.max(0, (muzzle.x - source.x) * Math.cos(d.heading) + (muzzle.z - source.y) * Math.sin(d.heading)) : 0;
    shared.jetHeading.value = d.heading; shared.shapeOrigin.value.set(o.x, o.y); shared.sourceOrigin.value.set(source.x, source.y); shared.sourceDirection.value.set(Math.cos(d.heading), Math.sin(d.heading)); shared.forwardStart.value = start;
    shared.rayCount.value = rays.length; shared.connected.value = Number(connected);
    rayData.fill(0); rays.forEach((r, i) => rayData.set([r.x, r.y, r.angle - d.heading, r.distance], i * 4)); rayTable.needsUpdate = true;
    const from = inside ? {x: muzzle.x, y: muzzle.z, h: muzzle.y} : o;
    const fieldOrigin = connected ? from : o;
    shared.fuelJet.value = Number(d.tool === 'flamethrower'); shared.jetAxisOrigin.value.set(fieldOrigin.x, fieldOrigin.h, fieldOrigin.y);
    shared.jetExtent.value = Math.max(.001, ...rays.map(r => (r.x - fieldOrigin.x) * Math.cos(d.heading) + (r.y - fieldOrigin.y) * Math.sin(d.heading)));
    shared.jetTipHeight.value = rays.length ? rays[0].h : fieldOrigin.h;
    for (let i = 0; i < rays.length; i++) segment('Resolved liquid-fuel jet', `ray:${i}`, connected ? from : o, rays[i], d.tool === 'torch' ? .36 : .68, connected ? 1 : 2);
    if (d.lead && point(d.lead.from) && point(d.lead.to)) segment('Authoritative discharge lead', 'lead', d.lead.from, d.lead.to, .58, 3);
    state.discharge = connected ? inside ? 'resolved connected fan' : 'resolved connected fan; outside-muzzle source support' : 'resolved independent clipped-ray ribbons; no filled fan';
    state.muzzleInsideShape = !!inside; state.independentRayRibbons = connected ? 0 : rays.length; state.visualForwardStart = start;
    if (d.tool === 'flamethrower' && rays.length) {
      const bucket = Math.floor(time * 5 + 1e-7);
      if (bucket !== lastJetBucket) {
        lastJetBucket = bucket;
        const samples = Math.min(6, rays.length);
        for (let i = 0; i < samples; i++) {
          const k = Math.floor(i * (rays.length - 1) / Math.max(1, samples - 1)), r = rays[k];
          if (r.distance < .002) continue;
          const t = .63 + seed(`jet-smoke:${i}`) * .30, id = `${bucket}:${k}`;
          if (jetSmokeHistory.size >= settings.maxJetSmoke) throw new RangeError('Jet smoke history capacity exceeded');
          jetSmokeHistory.set(id, {id, x: mix(o.x, r.x, t), y: mix(o.y, r.y, t), h: mix(o.h, r.h, t), birth: time, seed: seed(id), strength: .37});
        }
        // The historic boat photograph also shows a small localized soot puff
        // near the observed source, distinct from the portable terminal rolls.
        const first = rays[Math.floor(rays.length / 2)];
        if (first.distance > .002) jetSmokeHistory.set(`${bucket}:near`, {id: `${bucket}:near`, x: mix(o.x, first.x, .13), y: mix(o.y, first.y, .13), h: o.h, birth: time, seed: seed(`${bucket}:near`), strength: .12});
      }
    }
    if (!state.burningCells) {lights[0].position.set(muzzle.x, muzzle.y, muzzle.z); lights[0].intensity = 1.2;}
  }
  function jetSmoke(time) {
    for (const [id, h] of jetSmokeHistory) {
      const age = time - h.birth;
      if (age >= settings.jetSmokeTailSeconds) {jetSmokeHistory.delete(id); continue;}
      const life = 1 - age / settings.jetSmokeTailSeconds;
      add('Liquid-fuel jet soot', `jet-smoke:${id}`, [h.x, h.h + .04 + age * .56, h.y], [Math.cos(h.seed * 6.28) * .10, 1, Math.sin(h.seed * 6.28) * .10], .18 + age * .14, .48 + age * .32, h.strength * life, h.seed, 2);
    }
    state.jetSmokeColumns = jetSmokeHistory.size; state.smokeColumns += jetSmokeHistory.size;
  }
  function buildings(groups) {
    if (!Array.isArray(groups)) return;
    if (groups.length > maxBuildings) throw new RangeError('Building presentation capacity exceeded');
    for (const b of [...groups].sort((a, c) => String(a?.id).localeCompare(String(c?.id)))) {
      const min = b?.sourceBounds?.min, max = b?.sourceBounds?.max;
      const valid = b?.id !== undefined && b.destroyed === false && Array.isArray(min) && Array.isArray(max) && min.length === 3 && max.length === 3 && min.every(finite) && max.every(finite) && min.every((n, i) => n < max[i]) && Array.isArray(b.footprintCellIds) && Array.isArray(b.burningCellIds);
      if (!valid) {state.unsupportedBuildingGroups++; continue;}
      const footprint = new Set(b.footprintCellIds), sources = [...new Set(b.burningCellIds)].sort((a, c) => String(a).localeCompare(String(c))).map(id => footprint.has(id) ? byId.get(id) : null).filter(c => c?.phase === 'burning' && c.intensity > 0);
      if (!sources.length || !(b.intensity > 0)) continue;
      state.buildingGroups++;
      if (!Array.isArray(b.fireSites) || !b.fireSites.length) {state.unavailableFacadeGroups++; state.warnings.push(`Native facade attachment unavailable for ${b.id}; no aggregate-AABB substitute`); continue;}
      if (b.fireSites.length > settings.maxFacadeCandidates) throw new RangeError('Native facade candidate capacity exceeded');
      const live = new Map(sources.map(c => [c.id, c])), seenSites = new Set(), sites = [];
      const identity = id => typeof id === 'string' && id.length > 0 || Number.isSafeInteger(id) && id >= 0;
      for (const site of b.fireSites) {
        const p = site?.position, n = site?.normal, span = site?.span, ids = site?.sourceCellIds;
        const valid = identity(site?.id) && !seenSites.has(site.id) && site.kind === 'facade' && identity(site.sourcePartId) && Number.isInteger(site.sourceFaceIndex) && site.sourceFaceIndex >= 0 && Array.isArray(p) && p.length === 3 && p.every(finite) && Array.isArray(n) && n.length === 3 && n.every(finite) && Math.abs(Math.hypot(...n) - 1) < .001 && finite(site.baseElevation) && finite(span?.width) && finite(span?.height) && span.width > 0 && span.height > 0 && p[1] >= site.baseElevation - 1e-5 && p[1] < site.baseElevation + span.height && Array.isArray(ids) && ids.length > 0 && ids.every(id => live.has(id));
        if (!valid) {state.invalidFacadeSites++; state.warnings.push(`Invalid native facade site omitted for ${b.id}`); continue;}
        seenSites.add(site.id); sites.push(site);
      }
      if (!sites.length) {state.unavailableFacadeGroups++; continue;}
      const selected = selectFacadeSites(sites, settings.maxFacadePairs);
      state.nativeFacadeGroups++;
      for (const site of selected) {
        const s = seed(`building:${b.id}:${site.id}`), p = site.position, n = site.normal;
        const intensity = Math.min(clamp(b.intensity), Math.max(...site.sourceCellIds.map(id => clamp(live.get(id).intensity))));
        const radius = Math.min(site.span.width * .38, .20 + s * .10), offset = radius * .55;
        const contact = [p[0] + n[0] * offset, p[1] + n[1] * offset + .018, p[2] + n[2] * offset];
        const height = Math.min(site.baseElevation + site.span.height - p[1], .7 + intensity * 1.3);
        // Actual exterior wall evidence replaces slab/porch/stair AABB rims.
        // A small overlap keeps the reaction attached; opaque depth still stops
        // hidden density. This presents an already-burning coarse group only.
        add('Legitimate ground-floor facade tongues', `building:${b.id}:${site.id}:flame`, contact, [n[0] * .10, 1, n[2] * .10], radius, height, intensity * .65, s);
        // Only these linked CURRENT burning wood sources contribute. Do not
        // average real facade anchors into an opaque house to fake a big plume.
        const woodArea = [...new Set(site.sourceCellIds)].reduce((sum, id) => {const c = live.get(id); return sum + (c.material === 'wood' && c.surfaceFuel > 0 ? clamp(c.size || .5, .05, 2) ** 2 * clamp(c.intensity) : 0);}, 0);
        const burden = Math.min(1.8, Math.sqrt(woodArea));
        add('Legitimate building smoke', `building:${b.id}:${site.id}:smoke`, [contact[0], contact[1] + .4, contact[2]], [n[0] * .08, 1, n[2] * .08], .42 + s * .15 + .27 * burden, 2.1 + intensity * 1.3 + .40 * burden, intensity * (.42 + .22 * burden), seed(`${b.id}:${site.id}:smoke`), 3);
        state.smokeColumns++;
        state.nativeFacadeSites++; state.selectedFacadeSites.push({buildingId: b.id, id: site.id, sourcePartId: site.sourcePartId, sourceFaceIndex: site.sourceFaceIndex, woodArea, smokeBurden: burden});
      }
    }
  }
  function selectFacadeSites(sites, maximum) {
    const ordered = [...sites].sort((a, b) => String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0);
    if (ordered.length <= maximum) return ordered;
    const mean = [0, 0, 0]; for (const s of ordered) for (let j = 0; j < 3; j++) mean[j] += s.position[j] / ordered.length;
    const distance = (a, b) => a.reduce((n, x, i) => n + (x - b[i]) ** 2, 0);
    const scale = Math.max(.01, ...ordered.map(s => distance(s.position, mean)));
    const selected = [], remaining = [...ordered];
    while (selected.length < maximum && remaining.length) {
      let best = 0, bestScore = -Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const s = remaining[i];
        const gap = selected.length ? Math.min(...selected.map(t => distance(s.position, t.position))) / scale : distance(s.position, mean) / scale;
        const normalCoverage = selected.length ? 1 - Math.max(...selected.map(t => s.normal.reduce((n, x, j) => n + x * t.normal[j], 0))) : 0;
        const score = gap + normalCoverage * 1.5;
        if (score > bestScore + 1e-12) {bestScore = score; best = i;}
      }
      selected.push(remaining.splice(best, 1)[0]);
    }
    return selected;
  }
  function carried(t, anchors, player) {
    if (player?.tool !== 'torch') {state.torch = 'unequipped'; return;}
    if (t?.phase !== 'lit' || !(t.remainingSeconds > 0)) {state.torch = t?.phase || 'unlit'; return;}
    const a = anchors?.torchTip;
    if (!xyz(a)) {state.torch = 'lit; missing authoritative rendered anchor'; return;}
    for (let i = 0; i < 3; i++) add('Finite carried torch', `torch:${i}`, [a.x + (i - 1) * .025, a.y, a.z], [0, 1, 0], .075 - i * .011, .30 + i * .045, .9, seed(`torch:${i}`));
    state.torch = 'lit at supplied anchor';
    if (!state.burningCells && state.discharge === 'inactive') {lights[0].position.set(a.x, a.y, a.z); lights[0].intensity = .45;}
  }
  function update(frame) {
    if (closed) return;
    if (frame?.version !== 1 || !finite(frame.worldTime) || !Number.isInteger(frame.tick)) throw new TypeError('Fire requires a detached v1 frame with finite worldTime and integer tick');
    const receiptGeneration = frame.eventReceipts?.generation;
    if (lastTime !== null && (frame.worldTime < lastTime || frame.tick < lastTick || frame.eventReceipts?.reset === true || receiptGeneration !== undefined && generation !== null && receiptGeneration !== generation)) clear();
    const p = frame.player;
    if (p && finite(p.x) && finite(p.y)) shared.player.value.set(p.x, finite(p.elevation) ? p.elevation : 0, p.y); else shared.player.value.set(1e6, 0, 1e6);
    shared.playerRadius.value = clamp(p?.radius ?? .3, .05, 3); shared.orthographic.value = frame.camera?.kind === 'perspective' ? 0 : 1;
    bindField(frame.fieldUniforms); bindDepth(frame.opaqueDepth, frame.camera, frame.viewport);
    if (frame.paused === true && lastTime !== null) {paused = true; finish(frame.camera); return;}
    paused = frame.paused === true; shared.clock.value = frame.worldTime; lastTime = frame.worldTime; lastTick = frame.tick; generation = receiptGeneration ?? generation; updates++;
    const occlusion = state.opaqueOcclusion; state = blankState(); state.opaqueOcclusion = occlusion;
    records.length = 0; byId.clear(); counts.clear(); for (const l of lights) l.intensity = 0;
    shared.connected.value = 0; shared.rayCount.value = 0; shared.fuelJet.value = 0;
    for (const [id, h] of jetSmokeHistory) if (frame.worldTime - h.birth >= settings.jetSmokeTailSeconds) jetSmokeHistory.delete(id);
    ground(frame.cells, frame.worldTime); discharge(frame.discharge, frame.anchors, frame.worldTime); jetSmoke(frame.worldTime); buildings(frame.buildingVisuals); carried(frame.torch, frame.anchors, p);
    if (frame.eventReceipts?.reset === true) discardedStartupEvents += Array.isArray(frame.events) ? frame.events.length : 0;
    finish(frame.camera);
  }
  function diagnostics() {
    const stats = [...counts].map(([name, instances]) => ({name, instances, trianglesPerInstance: geometry.userData.triangles, triangles: instances * geometry.userData.triangles}));
    return {version: FIRE_REALISM_VERSION, quality, referenceAccepted: false, optimizedAvailable: false, settings, presentationOnly: true, ...state, warnings: [...state.warnings], groundField: state.groundField && {...state.groundField, extent: [...state.groundField.extent]}, smokeRegions: state.smokeRegions.map(s => ({...s})), selectedFacadeSites: state.selectedFacadeSites.map(s => ({...s})), worldTime: shared.clock.value, paused, updates, discardedStartupEvents,
      layers: stats, triangles: records.length * geometry.userData.triangles, sortedInstances: records.length, sortMode, sortedSemanticIds: [...order], transparency: 'Centroid-sorted alpha; intersecting transparent volumes remain approximate and need actual camera/motion review',
      allocatedBufferBytes: (geometry.index?.array.byteLength || 0) + Object.values(geometry.attributes).reduce((n, a) => n + a.array.byteLength, 0), ownedTextureBytes: [...owned.textures].reduce((n, t) => n + (t.image?.data?.byteLength || 0), 0),
      boundedLights: 3, activeLights: lights.filter(l => l.intensity > 0).length, resources: Object.fromEntries(Object.entries(owned).map(([k, s]) => [k, s.size])), borrowedField: shared.fieldEnabled.value === 1, borrowedOpaqueDepth: shared.opaqueDepthEnabled.value === 1,
      groundPresentation: 'Shared world-space reaction field in exact non-overlapping active-cell ray intervals; all sources retained, isolated envelopes preserved; transverse seams require rendered review',
      smokePresentation: 'Irregular source-derived catchments with four advected billows; all active/tail sources accounted; source kind1 material-weighted ground,2 unchanged jet soot,3 legitimate building soot',
      costClaim: 'Unmeasured. No GPU or quality acceptance.', disposed: closed};
  }
  function dispose() {
    if (closed) return; closed = true; root.removeFromParent(); root.clear(); history.clear(); jetSmokeHistory.clear(); records.length = 0; counts.clear(); geometry.instanceCount = 0;
    for (const set of Object.values(owned)) {for (const value of set) value.dispose(); set.clear();}
  }
  return {root, update, reset() {if (!closed) clear();}, dispose, diagnostics};
}
