// Exterior heat-transfer model. Metres, kelvin, kilograms, watts and world seconds.
// Equations, evidence and approximation boundaries: docs/engineering/fire-model.md.
const SIGMA = 5.670374419e-8, WATER_CP = 4180, LATENT = 2257000, BOIL = 373.15, EPS = 1e-9;
export const FIRE_MATERIALS = Object.freeze({
  wood: Object.freeze({density: 500, cp: 1700, conductivity: 0.12, emissivity: 0.9,
    ignitionK: 638.15, autoIgnitionK: 773.15, extinctionK: 523.15, heatOfCombustion: 13000000,
    heatOfGasification: 2000000, massFlux: 0.012, maxMassFlux: 0.025}),
  masonry: Object.freeze({density: 1800, cp: 840, conductivity: 0.72, emissivity: 0.9, heatOfCombustion: 0}),
  steel: Object.freeze({density: 7850, cp: 500, conductivity: 45, emissivity: 0.7, heatOfCombustion: 0})
});
const point = (p, offset = 0.015) => ({x: p.x + p.nx * offset, y: p.y + p.ny * offset, h: p.h + p.nh * offset});
const magnitude = p => Math.hypot(p.x, p.y, p.h);
export function flameHeight(powerW, areaM2) {
  // Heskestad: Q in kW, equivalent circular diameter in metres. Plume reach proxy.
  return Math.max(0, 0.235 * (powerW / 1000) ** 0.4 - 1.02 * Math.sqrt(4 * areaM2 / Math.PI));
}
export function wallFlameHeight(powerW, widthM) {
  // Wall line-fire correlation: Q' in kW/m. Tu / Quintiere coefficient 0.0666;
  // see IAFSS 5, pp. 297–308. Do not apply a pool-fire diameter to each wall tile.
  return 0.0666 * (powerW / 1000 / widthM) ** (2 / 3);
}
function reach(source, power) {
  return source.nh === 0 ? wallFlameHeight(power, source.faceAxis === 0 ? source.spanA : source.spanB) : flameHeight(power, source.area);
}
export function segmentIntersectsBox(a, b, box) {
  let lo = 0, hi = 1;
  for (const [key, size] of [['x', 'width'], ['y', 'depth'], ['h', 'height']]) {
    const d = b[key] - a[key], min = box[key] - box[size] / 2, max = box[key] + box[size] / 2;
    if (Math.abs(d) < EPS) { if (a[key] < min || a[key] > max) return false; }
    else { const u = (min - a[key]) / d, v = (max - a[key]) / d;
      lo = Math.max(lo, Math.min(u, v)); hi = Math.min(hi, Math.max(u, v)); if (lo >= hi - EPS) return false; }
  }
  return hi > EPS && lo < 1 - EPS;
}
function inside(p, b) { return Math.abs(p.x - b.x) < b.width / 2 - EPS && Math.abs(p.y - b.y) < b.depth / 2 - EPS && Math.abs(p.h - b.h) < b.height / 2 - EPS; }
function layers(depth, material, moisture, ambient) {
  const widths = [], total = depth; let rest = total;
  for (const limit of [0.001, 0.003, 0.012]) { const dx = Math.min(limit, rest / 2); widths.push(dx); rest -= dx; }
  widths.push(rest);
  return widths.map(dx => ({dx, dryMass: dx * material.density, water: dx * material.density * moisture, temperature: ambient}));
}
function capacity(layer, m) { return layer.dryMass * m.cp + layer.water * WATER_CP; }
// Enthalpy update: sensible heating first, latent evaporation at 100 C, then dry heating.
function heatLayer(layer, energy, m, ambient) {
  if (energy <= 0) { const used = Math.max(energy, (ambient - layer.temperature) * capacity(layer, m)); layer.temperature += used / capacity(layer, m); return {used, evaporated: 0}; }
  const supplied = energy; let evaporated = 0;
  if (layer.water > EPS) {
    const warm = Math.min(energy, Math.max(0, BOIL - layer.temperature) * capacity(layer, m));
    layer.temperature += warm / capacity(layer, m); energy -= warm;
    if (energy > 0) { evaporated = Math.min(layer.water, energy / LATENT); layer.water -= evaporated; energy -= evaporated * LATENT; }
  }
  if (energy > 0) layer.temperature += energy / capacity(layer, m);
  return {used: supplied, evaporated};
}
export function validateStructureDefinition(def) {
  if (def.structureFire === undefined) return;
  const s = def.structureFire;
  if (!s || typeof s !== 'object' || Array.isArray(s)) throw Error('Invalid structureFire definition');
  if (s.moisture !== undefined && (!Number.isFinite(s.moisture) || s.moisture < 0 || s.moisture > 0.5)) throw Error('Invalid structure moisture');
  if (s.wind && (![s.wind.x, s.wind.y].every(Number.isFinite) || Math.hypot(s.wind.x, s.wind.y) > 12)) throw Error('Invalid structure wind');
  if (s.exposures !== undefined && (!Array.isArray(s.exposures) || s.exposures.length > 32)) throw Error('Invalid burner exposures');
  for (const e of s.exposures || []) if (![e.x, e.y, e.h, e.radius, e.flux, e.duration].every(Number.isFinite) ||
    e.radius <= 0 || e.radius > 8 || e.flux <= 0 || e.flux > 200000 || e.duration <= 0 || e.duration > 600 ||
    typeof e.pilot !== 'boolean' || e.buildingId !== undefined && (typeof e.buildingId !== 'string' || !def.modules.some(m => (m.buildingId ?? m.id) === e.buildingId))) throw Error('Invalid burner exposure (SI units required)');
  for (const m of def.modules) if (m.fireMoisture !== undefined && (!Number.isFinite(m.fireMoisture) || m.fireMoisture < 0 || m.fireMoisture > 0.5)) throw Error('Invalid module fireMoisture');
}
export class StructureFire {
  constructor(def, config, obstacles) {
    this.config = config.structure; this.def = def; this.obstacles = obstacles; this.accumulator = 0; this.time = 0;
    this.managed = new Set(); this.parts = []; this.patches = []; this.links = new Map(); this.groundEnergy = new Map(); this.groundLinks = new Map(); this.plumeLinks = new Map();
    this.stats = {initialFuelKg: 0, burnedFuelKg: 0, releasedJ: 0, externalJ: 0, groundAbsorbedJ: 0,
      radiationJ: 0, convectionJ: 0, feedbackJ: 0, coolingJ: 0, evaporationJ: 0, gasificationJ: 0, escapedJ: 0, linkCount: 0};
    if (!def.structureFire) return;
    // Roof envelopes are visual bounds, not the actual sloped roof mesh. Do not use
    // those bounds as solid fuel or as an invented radiation barrier.
    for (const module of def.modules) if (!module.form.startsWith('roof-')) for (const p of module.parts)
      this.parts.push({...p, buildingId: module.buildingId ?? module.id, moisture: module.fireMoisture ?? def.structureFire.moisture ?? 0, gone: false});
    const moduleIds = new Set(this.parts.map(p => p.id));
    for (const o of obstacles) if (!moduleIds.has(o.id) && o.kind !== 'barrel' && FIRE_MATERIALS[o.material])
      this.parts.push({...o, h: (o.baseHeight ?? 0) + o.height / 2, buildingId: o.buildingId ?? o.id, moisture: def.structureFire.moisture ?? 0, gone: false});
    this.managed = new Set(this.parts.map(p => p.id));
    for (const part of this.parts) this.tessellate(part);
    for (const part of this.parts) {
      const patches = this.patches.filter(p => p.partId === part.id), area = patches.reduce((n, p) => n + p.area, 0);
      part.patchIds = patches.map(p => p.index);
      const m = FIRE_MATERIALS[part.material], volume = part.width * part.depth * part.height;
      for (const p of patches) {
        p.layers = layers(volume / area, m, part.moisture, this.config.ambientK);
        p.initialFuelKg = m.heatOfCombustion ? volume * m.density * p.area / area : 0;
        p.fuelKg = p.initialFuelKg; this.stats.initialFuelKg += p.fuelKg;
      }
    }
    this.wallNeighbours = this.patches.map(() => []);
    const faces = new Map();
    for (const p of this.patches) if (p.nh === 0) {
      p.wallKey = [p.buildingId, p.faceAxis, p.nx, p.ny, p.faceAxis === 0 ? p.x : p.y].join(':');
      p.horizontal = p.faceAxis === 0 ? p.y : p.x; p.wallWidth = p.faceAxis === 0 ? p.spanA : p.spanB;
      p.wallHeight = p.faceAxis === 0 ? p.spanB : p.spanA;
      if (!faces.has(p.wallKey)) faces.set(p.wallKey, []); faces.get(p.wallKey).push(p);
    }
    for (const face of faces.values()) for (let i = 0; i < face.length; i++) for (let j = i + 1; j < face.length; j++) {
      const a = face[i], b = face[j], x = Math.abs(a.horizontal - b.horizontal), z = Math.abs(a.h - b.h);
      const w = (a.wallWidth + b.wallWidth) / 2, h = (a.wallHeight + b.wallHeight) / 2;
      if (x <= w + EPS && z <= h + EPS && (x < w - EPS || z < h - EPS)) {
        this.wallNeighbours[a.index].push(b.index); this.wallNeighbours[b.index].push(a.index);
      }
    }
    this.pending = new Float64Array(this.patches.length); this.pilots = new Uint8Array(this.patches.length);
    this.incoming = new Float64Array(this.patches.length);
    // Static geometry and wind: cache sparse transfer links, recheck each link's
    // occluder identities when geometry burns out. No per-frame scene raycasts.
    for (const source of this.patches) if (source.initialFuelKg > 0) this.links.set(source.index, this.makeLinks(source));
  }
  tessellate(part) {
    const axes = ['x', 'y', 'h'], dimensions = ['width', 'depth', 'height'];
    for (let normal = 0; normal < 3; normal++) for (const sign of [-1, 1]) {
      const a = (normal + 1) % 3, b = (normal + 2) % 3;
      const na = Math.ceil(part[dimensions[a]] / this.config.patchSize), nb = Math.ceil(part[dimensions[b]] / this.config.patchSize);
      const da = part[dimensions[a]] / na, db = part[dimensions[b]] / nb;
      for (let ia = 0; ia < na; ia++) for (let ib = 0; ib < nb; ib++) {
        const p = {id: part.id + ':face-' + normal + '-' + sign + ':' + ia + ',' + ib,
          index: this.patches.length, partId: part.id, moduleId: part.moduleId, buildingId: part.buildingId,
          material: part.material, x: part.x, y: part.y, h: part.h, nx: 0, ny: 0, nh: 0,
          area: da * db, spanA: da, spanB: db, faceAxis: normal, phase: 'cold', powerW: 0,
          burnedKg: 0, ignitedAt: null, cause: null, gone: false, netHeatingWm2: 0, externalFluxWm2: 0};
        p[axes[normal]] += sign * part[dimensions[normal]] / 2;
        p[axes[a]] += -part[dimensions[a]] / 2 + (ia + 0.5) * da;
        p[axes[b]] += -part[dimensions[b]] / 2 + (ib + 0.5) * db;
        p[['nx', 'ny', 'nh'][normal]] = sign;
        if (this.parts.some(other => other !== part && inside(point(p, 0.001), other))) continue;
        if (this.patches.length >= this.config.maxPatches) throw Error('Structure surface patch budget exceeded');
        this.patches.push(p);
      }
    }
  }
  blockers(a, b) { return this.parts.filter(p => segmentIntersectsBox(a, b, p)); }
  clear(link) { return link.blockers.every(p => p.gone); }
  makeLinks(source) {
    const links = [], start = point(source, 0.07), wind = this.def.structureFire.wind ?? {x: 0, y: 0};
    for (const target of this.patches) {
      if (source.index === target.index && source.partId === target.partId) continue;
      const end = point(target), d = {x: end.x - start.x, y: end.y - start.y, h: end.h - start.h}, r = magnitude(d);
      if (r > this.config.radiationRange || r < EPS) continue;
      const receive = Math.max(0, -(d.x * target.nx + d.y * target.ny + d.h * target.nh) / r);
      const emit = Math.max(0, (d.x * source.nx + d.y * source.ny + d.h * source.nh) / r);
      // Diffuse flame-sheet view-factor approximation, plus a small isotropic
      // gas-flame component that heats adjacent and downward surfaces.
      const radiation = target.area * receive * (0.8 * emit / (Math.PI * r * r + source.area) + 0.2 / (4 * Math.PI * r * r + source.area));
      const dh = target.h - source.h, radius = Math.sqrt(source.area) / 2 + 0.15 * Math.max(0, dh);
      const radial2 = (target.x - source.x - wind.x * Math.max(0, dh) / 5) ** 2 + (target.y - source.y - wind.y * Math.max(0, dh) / 5) ** 2;
      const convection = dh > 0 ? target.area * Math.exp(-2 * radial2 / radius ** 2) : 0;
      if (radiation < 1e-8 && convection < 1e-8) continue;
      const blockers = this.blockers(start, end);
      // Permanently occluded links never become useful unless that material burns.
      if (blockers.some(p => !FIRE_MATERIALS[p.material].heatOfCombustion)) continue;
      links.push({target: target.index, radiation, convection, dh, blockers});
      if (++this.stats.linkCount > this.config.maxLinks) throw Error('Structure transfer link budget exceeded');
    }
    return links;
  }
  addEnergy(point3, radius, joules, cause, pilot = true, cone) {
    if (!this.patches.length || joules <= 0) return;
    const targets = this.patches.filter(p => {
      if (p.gone) return false;
      const d = {x: p.x - point3.x, y: p.y - point3.y, h: p.h - point3.h}, r = magnitude(d);
      if (r > radius || cone && (r < EPS || (d.x * Math.cos(cone.heading) + d.y * Math.sin(cone.heading)) / r < Math.cos(cone.halfAngle))) return false;
      return this.blockers(point3, point(p)).every(part => part.gone);
    });
    const area = targets.reduce((sum, p) => sum + p.area, 0); if (!area) return;
    for (const p of targets) { this.pending[p.index] += joules * p.area / area; this.pilots[p.index] ||= Number(pilot); p.cause = cause; }
    this.stats.externalJ += joules;
  }
  collectGround(releases, delta) {
    if (!this.patches.length) return;
    for (const source of releases) {
      const energy = source.powerW * delta;
      const old = this.groundEnergy.get(source.id);
      if (old) old.energy += energy;
      else this.groundEnergy.set(source.id, {...source, energy});
    }
  }
  transfer(source, links, power, delta, self = false) {
    const {radiativeFraction, selfFeedback, flameHtc, flameK} = this.config;
    const radBudget = power * radiativeFraction, convBudget = power * (1 - radiativeFraction - (self ? selfFeedback : 0));
    const height = reach(source, power);
    let radSum = 0, convSum = 0;
    for (const l of links) if (!this.patches[l.target].gone && this.clear(l)) {
      radSum += l.radiation;
      const target = this.patches[l.target];
      const plumeK = this.config.ambientK + (flameK - this.config.ambientK) * Math.min(1, (height / Math.max(EPS, l.dh)) ** (5 / 3));
      l.convPower = self && source.nh === 0 ? 0 : l.convection * flameHtc * Math.max(0, plumeK - target.layers[0].temperature);
      l.flameContact = l.dh <= height;
      convSum += l.convPower;
    } else l.convPower = 0;
    const radScale = radBudget / Math.max(1, radSum), convScale = Math.min(1, convBudget / Math.max(EPS, convSum));
    let received = 0;
    for (const l of links) if (!this.patches[l.target].gone && this.clear(l)) {
      const p = this.patches[l.target], radiation = radScale * l.radiation * FIRE_MATERIALS[p.material].emissivity * delta;
      const convection = l.convPower * convScale * delta;
      this.incoming[p.index] += radiation + convection; received += radiation + convection;
      this.stats.radiationJ += radiation; this.stats.convectionJ += convection;
      if (l.flameContact && convection / delta / p.area > 1000) this.pilots[p.index] = 1;
      if (radiation + convection > 0) p.cause ??= source.id;
    }
    if (self) { const feedback = power * selfFeedback * delta;
      this.incoming[source.index] += feedback; this.stats.feedbackJ += feedback;
      this.stats.escapedJ += power * delta - received - feedback;
    } else this.stats.groundAbsorbedJ += received;
  }
  wallPlumes(dt) {
    const groups = [], wind = this.def.structureFire.wind ?? {x: 0, y: 0};
    const active = new Set(this.patches.filter(p => p.nh === 0 && p.powerW > 0 && !p.gone).map(p => p.index));
    for (const seed of [...active]) {
      if (!active.delete(seed)) continue;
      const first = this.patches[seed], queue = [seed];
      const g = {key: first.wallKey + ':' + seed, sample: first, members: [], left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity, power: 0};
      for (let i = 0; i < queue.length; i++) {
        const p = this.patches[queue[i]]; g.members.push(p);
        g.left = Math.min(g.left, p.horizontal - p.wallWidth / 2); g.right = Math.max(g.right, p.horizontal + p.wallWidth / 2);
        g.bottom = Math.min(g.bottom, p.h - p.wallHeight / 2); g.top = Math.max(g.top, p.h + p.wallHeight / 2); g.power += p.powerW;
        for (const n of this.wallNeighbours[p.index]) if (active.delete(n)) queue.push(n);
      }
      groups.push(g);
    }
    for (const g of groups) {
      const p = g.sample, width = g.right - g.left;
      // Empirical sheet-flame height is based on the entire burning width and HRR,
      // bounded below by 1.1 times the pyrolysis height (IAFSS Eq. 2).
      const height = Math.max(wallFlameHeight(g.power, width), 1.1 * (g.top - g.bottom));
      for (const member of g.members) member.plumeTopM = g.bottom + height;
      const potentials = []; let sum = 0;
      for (const target of this.patches) {
        if (target.gone || target.phase === 'burning') continue;
        const z = target.h - g.bottom; if (z <= 0 || z > height * 3) continue;
        const horizontal = p.faceAxis === 0 ? target.y : target.x;
        const alongWind = p.faceAxis === 0 ? wind.y : wind.x;
        const normalWind = p.faceAxis === 0 ? wind.x : wind.y;
        const across = horizontal - alongWind * z / 5;
        const nearest = Math.max(g.left, Math.min(g.right, across));
        const normalDistance = (p.faceAxis === 0 ? target.x - p.x : target.y - p.y) - normalWind * z / 5;
        const radius = 0.25 + 0.15 * z;
        const kernel = Math.exp(-2 * (normalDistance ** 2 + (across - nearest) ** 2) / radius ** 2);
        if (kernel < 1e-5) continue;
        const start = {x: p.faceAxis === 0 ? p.x + p.nx * 0.07 : nearest,
          y: p.faceAxis === 0 ? nearest : p.y + p.ny * 0.07, h: g.bottom + 0.001};
        const key = g.key + ':' + target.index + ':' + nearest.toFixed(5) + ':' + g.bottom.toFixed(5);
        let blockers = this.plumeLinks.get(key);
        if (!blockers) { blockers = this.blockers(start, point(target)); this.plumeLinks.set(key, blockers);
          if (++this.stats.linkCount > this.config.maxLinks) throw Error('Structure plume link budget exceeded'); }
        if (blockers.some(part => !part.gone)) continue;
        const plumeK = this.config.ambientK + (this.config.flameK - this.config.ambientK) * Math.min(1, (height / z) ** (5 / 3));
        const power = target.area * kernel * this.config.flameHtc * Math.max(0, plumeK - target.layers[0].temperature);
        if (power <= 0) continue;
        potentials.push({target, power, pilot: z <= height}); sum += power;
      }
      const budget = g.power * (1 - this.config.radiativeFraction - this.config.selfFeedback), scale = Math.min(1, budget / Math.max(EPS, sum));
      for (const {target, power, pilot} of potentials) {
        const energy = power * scale * dt; this.incoming[target.index] += energy;
        this.stats.convectionJ += energy; this.stats.escapedJ -= energy;
        if (pilot && power * scale / target.area > 1000) this.pilots[target.index] = 1;
        target.cause ??= p.id;
      }
    }
  }
  step(delta, worldTime, event = () => {}) {
    if (!this.patches.length) return;
    this.accumulator += delta;
    while (this.accumulator + EPS >= this.config.step) {
      this.accumulator = Math.max(0, this.accumulator - this.config.step);
      this.solve(this.config.step, worldTime - this.accumulator, event);
    }
  }
  solve(dt, time, event) {
    this.time = time; this.incoming.fill(0);
    for (const e of this.def.structureFire.exposures || []) {
      const active = Math.max(0, Math.min(time, e.duration) - Math.max(0, time - dt));
      if (!active) continue;
      for (const p of this.patches) if (!p.gone && (!e.buildingId || p.buildingId === e.buildingId) && Math.hypot(p.x - e.x, p.y - e.y, p.h - e.h) <= e.radius &&
          this.blockers(e, point(p)).every(part => part.gone)) {
        const energy = e.flux * p.area * active; this.incoming[p.index] += energy;
        this.stats.externalJ += energy; this.pilots[p.index] ||= Number(e.pilot); p.cause = 'fixture-burner';
      }
    }
    // All source powers are resolved before any recipient is heated this pass.
    for (const p of this.patches) {
      p.powerW = 0; p.plumeTopM = p.h;
      if (p.phase !== 'burning' || p.gone) continue;
      const m = FIRE_MATERIALS[p.material];
      // External heating drives additional pyrolysis (q / heat of gasification).
      // A measured-order mass-flux ceiling bounds the reduced material response;
      // char progressively reduces it. This is not a constant spread speed.
      const massFlux = Math.min(m.maxMassFlux, m.massFlux + p.externalFluxWm2 / m.heatOfGasification) / Math.sqrt(1 + p.burnedKg / p.area / 3);
      const used = Math.min(p.fuelKg, massFlux * p.area * dt);
      p.fuelKg = Math.max(0, p.fuelKg - used); p.burnedKg += used;
      p.powerW = used * m.heatOfCombustion / dt;
      this.stats.burnedFuelKg += used; this.stats.releasedJ += p.powerW * dt;
      const gasification = used * m.heatOfGasification;
      this.incoming[p.index] -= gasification; this.stats.gasificationJ += gasification;
    }
    for (const p of this.patches) if (p.powerW > 0) this.transfer(p, this.links.get(p.index), p.powerW, dt, true);
    this.wallPlumes(dt);
    for (const source of this.groundEnergy.values()) {
      let links = this.groundLinks.get(source.id);
      if (!links) { links = this.makeLinks({...source, index: -1, nx: 0, ny: 0, nh: 1}); this.groundLinks.set(source.id, links); }
      this.transfer(source, links, source.energy / dt, dt);
    }
    this.groundEnergy.clear();
    for (const p of this.patches) {
      if (p.gone) continue;
      const m = FIRE_MATERIALS[p.material], received = this.incoming[p.index] + this.pending[p.index];
      p.netHeatingWm2 = Math.max(0, received / dt / p.area);
      p.externalFluxWm2 = Math.max(0, received / dt / p.area + (p.powerW > 0 ?
        p.powerW / p.area * (m.heatOfGasification / m.heatOfCombustion - this.config.selfFeedback) : 0));
      this.thermal(p, received / p.area, dt);
      const temperature = p.layers[0].temperature;
      if (p.initialFuelKg && p.fuelKg <= EPS) { if (p.phase !== 'spent') event('surface-burnout', p, {surfaceId: p.id, partId: p.partId, h: p.h}); p.phase = 'spent'; p.powerW = 0; }
      else if (p.phase === 'burning' && temperature < m.extinctionK) { p.phase = 'heating'; p.powerW = 0; event('surface-extinction', p, {surfaceId: p.id, partId: p.partId, h: p.h}); }
      else if (p.initialFuelKg && p.phase !== 'burning' && p.layers[0].water <= EPS && temperature >= (this.pilots[p.index] ? m.ignitionK : m.autoIgnitionK)) {
        p.phase = 'burning'; p.ignitedAt = time;
        event('surface-ignition', p, {surfaceId: p.id, partId: p.partId, buildingId: p.buildingId, h: p.h, cause: p.cause});
      } else if (p.phase !== 'burning' && p.phase !== 'spent') p.phase = temperature > this.config.ambientK + 1 ? 'heating' : 'cold';
    }
    this.coupleCores(dt);
    this.pending.fill(0); this.pilots.fill(0);
    for (const part of this.parts) if (!part.gone && FIRE_MATERIALS[part.material].heatOfCombustion &&
        part.patchIds.length && part.patchIds.every(i => this.patches[i].fuelKg <= EPS)) {
      part.gone = true;
      for (const i of part.patchIds) this.patches[i].gone = true;
      const obstacle = this.obstacles.find(o => o.id === part.id); if (obstacle) obstacle.destroyed = true;
      event('obstacle-burnout', part, {objectId: part.id, h: part.h});
    }
  }
  coupleCores(dt) {
    // A conservative thermal junction connects the backs of each part's columns.
    // This permits slow through-wall/sideways conduction without duplicating mass.
    for (const part of this.parts) {
      let weighted = 0, sum = 0;
      for (const i of part.patchIds) { const p = this.patches[i], g = FIRE_MATERIALS[p.material].conductivity * p.area / p.layers.reduce((n, l) => n + l.dx, 0);
        weighted += p.layers.at(-1).temperature * g; sum += g; }
      if (!sum) continue;
      for (const i of part.patchIds) { const p = this.patches[i], m = FIRE_MATERIALS[p.material], core = p.layers.at(-1);
        const energy = m.conductivity / p.layers.reduce((n, l) => n + l.dx, 0) * (weighted / sum - core.temperature) * dt;
        const result = heatLayer(core, energy, m, this.config.ambientK);
        this.stats.evaporationJ += result.evaporated * (LATENT + WATER_CP * (BOIL - this.config.ambientK)) * p.area;
      }
    }
  }
  thermal(p, energyPerArea, dt) {
    const m = FIRE_MATERIALS[p.material], ambient = this.config.ambientK;
    // Explicit finite volumes with a material-dependent stable substep, including
    // high-conductivity steel. Moisture is part of every node's enthalpy.
    let stable = dt;
    for (let i = 0; i < p.layers.length - 1; i++) {
      const a = p.layers[i], b = p.layers[i + 1], g = m.conductivity / ((a.dx + b.dx) / 2);
      stable = Math.min(stable, 0.4 / (g * (1 / capacity(a, m) + 1 / capacity(b, m))));
    }
    const count = Math.ceil(dt / stable), sub = dt / count;
    for (let n = 0; n < count; n++) {
      const changes = p.layers.map(() => 0), surface = p.layers[0];
      const loss = (this.config.airLoss * (surface.temperature - ambient) + m.emissivity * SIGMA * (surface.temperature ** 4 - ambient ** 4)) * sub;
      changes[0] += energyPerArea / count - loss; this.stats.coolingJ += loss * p.area;
      for (let i = 0; i < p.layers.length - 1; i++) {
        const a = p.layers[i], b = p.layers[i + 1], heat = m.conductivity * (a.temperature - b.temperature) / ((a.dx + b.dx) / 2) * sub;
        changes[i] -= heat; changes[i + 1] += heat;
      }
      for (let i = 0; i < p.layers.length; i++) {
        const result = heatLayer(p.layers[i], changes[i], m, ambient);
        this.stats.evaporationJ += result.evaporated * (LATENT + WATER_CP * (BOIL - ambient)) * p.area;
      }
    }
  }
  exposure(target) {
    // Contact damage uses the same authoritative burning surfaces, never render cards.
    return this.patches.some(p => p.phase === 'burning' && !p.gone && p.h <= (target.height ?? 2) &&
      Math.hypot(p.x - target.x, p.y - target.y) <= (target.radius ?? 0.2) + 0.25 &&
      this.blockers({x: target.x, y: target.y, h: p.h}, point(p)).every(part => part.gone)) ? 1 : 0;
  }
  isGone(id) { return this.parts.some(p => p.id === id && p.gone); }
  snapshot() {
    return {version: 1, time: this.time, wind: {...(this.def.structureFire?.wind ?? {x: 0, y: 0})},
      surfaces: this.patches.filter(p => !p.gone).map(p => ({id: p.id, partId: p.partId, moduleId: p.moduleId, buildingId: p.buildingId,
        x: p.x, y: p.y, h: p.h, nx: p.nx, ny: p.ny, nh: p.nh, area: p.area, spanA: p.spanA, spanB: p.spanB, faceAxis: p.faceAxis,
        material: p.material, phase: p.phase, temperatureK: p.layers[0].temperature, waterKg: p.layers.reduce((n, l) => n + l.water * p.area, 0),
        fuelKg: p.fuelKg, powerW: p.powerW, netHeatingWm2: p.netHeatingWm2, ignitedAt: p.ignitedAt, plumeTopM: p.plumeTopM ?? p.h, flameHeight: p.nh === 0 ? Math.min(reach(p, p.powerW), Math.max(0, (p.plumeTopM ?? p.h) - p.h)) : reach(p, p.powerW)})),
      diagnostics: {...this.stats, storedHeatJ: this.patches.reduce((n, p) => n + p.area * p.layers.reduce((sum, l) => sum + capacity(l, FIRE_MATERIALS[p.material]) * (l.temperature - this.config.ambientK), 0), 0),
        remainingFuelKg: this.patches.reduce((n, p) => n + p.fuelKg, 0),
        burningSurfaces: this.patches.filter(p => p.phase === 'burning' && !p.gone).length,
        highestBurningM: Math.max(0, ...this.patches.filter(p => p.phase === 'burning' && !p.gone).map(p => p.h)),
        powerW: this.patches.reduce((n, p) => n + p.powerW, 0)}};
  }
}
