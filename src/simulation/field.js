import {clamp, distance, inObstacle, inHeatCone, lineClear, rasterSegments, impactPoint} from './geometry.js';
import {ignites, storedHeat} from './combustion.js';
const EPS = 1e-10;
export const activeFuel = cell => cell.depositedFuel > EPS ? 'gas' : cell.material;
export function materialAt(def, p) {
  let material = 'paving';
  for (const patch of def.patches || []) if (p.x >= patch.x && p.x < patch.x + patch.width && p.y >= patch.y && p.y < patch.y + patch.depth) material = patch.material;
  for (const o of def.obstacles) if (inObstacle(p, o)) material = o.material;
  return material;
}
export class HeatField {
  constructor(def, config, obstacles) {
    this.def = def; this.config = config; this.obstacles = obstacles;
    this.size = def.fireCellSize; this.cols = Math.round(def.width / this.size); this.rows = Math.round(def.height / this.size);
    this.stats = {pouredFuel: 0, fixtureFuel: 0, molotovFuel: 0, burnedDepositedFuel: 0, burnedSurfaceFuel: 0};
    this.cells = Array.from({length: this.cols * this.rows}, (_, i) => {
      const x = (i % this.cols + 0.5) * this.size, y = (Math.floor(i / this.cols) + 0.5) * this.size;
      let material = materialAt(def, {x, y});
      let timberArea = 0;
      for (const o of obstacles) if (o.material === 'wood') {
        timberArea += Math.max(0, Math.min(x + this.size / 2, o.x + o.width / 2) - Math.max(x - this.size / 2, o.x - o.width / 2)) *
          Math.max(0, Math.min(y + this.size / 2, o.y + o.depth / 2) - Math.max(y - this.size / 2, o.y - o.depth / 2));
      }
      if (timberArea > 0) material = 'wood';
      const density = config.fuel.surfaceDensity[material] ?? 0;
      return {id: 'cell:' + i % this.cols + ',' + Math.floor(i / this.cols), x, y, size: this.size, material,
        surfaceFuel: density * (material === 'wood' ? (timberArea > 0 ? Math.min(timberArea, this.size ** 2) : this.size ** 2) : this.size ** 2), depositedFuel: 0, heat: 0, phase: 'cold', intensity: 0, ignitedAt: null, cause: null};
    });
    this.delta = new Float64Array(this.cells.length);
    this.neighbours = this.cells.map((cell, i) => {
      const list = [], col = i % this.cols, row = Math.floor(i / this.cols);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || col + dx < 0 || col + dx >= this.cols || row + dy < 0 || row + dy >= this.rows) continue;
        list.push({index: (row + dy) * this.cols + col + dx, distance: this.size * Math.hypot(dx, dy)});
      }
      return list;
    });
    for (const line of def.fuelLines || []) this.addLine(line.from, line.to, line.litresPerMetre, Infinity, 'fixtureFuel');
    for (const source of def.ignitions || []) this.emit(source, source.radius ?? 0.1, source.heat ?? 2, 'fixture');
  }
  at(p) { if (p.x < 0 || p.y < 0 || p.x >= this.def.width || p.y >= this.def.height) return undefined; return this.cells[Math.floor(p.y / this.size) * this.cols + Math.floor(p.x / this.size)]; }
  candidates(point, radius) {
    const result = [];
    for (let row = Math.max(0, Math.floor((point.y - radius) / this.size)); row <= Math.min(this.rows - 1, Math.floor((point.y + radius) / this.size)); row++) {
      for (let col = Math.max(0, Math.floor((point.x - radius) / this.size)); col <= Math.min(this.cols - 1, Math.floor((point.x + radius) / this.size)); col++) {
        const cell = this.cells[row * this.cols + col];
        const d = Math.hypot(Math.max(0, Math.abs(cell.x - point.x) - this.size / 2), Math.max(0, Math.abs(cell.y - point.y) - this.size / 2));
        if (d <= radius + EPS) result.push(cell);
      }
    }
    return result;
  }
  addLine(a, b, rate, stock, ledger = 'pouredFuel') {
    if (rate <= 0 || stock <= EPS) return 0;
    let used = 0;
    for (const span of rasterSegments(a, b, this.size)) {
      const amount = Math.min(stock - used, span.length * rate);
      if (amount <= EPS) break;
      const cell = this.cells[span.row * this.cols + span.col];
      if (!cell) throw Error('Accepted fuel path left the world');
      cell.depositedFuel += amount; used += amount;
      if (cell.phase === 'spent') cell.phase = cell.heat > 0.03 ? 'heating' : 'cold';
    }
    this.stats[ledger] += used; return used;
  }
  addPool(point, radius, amount) {
    const targets = this.candidates(point, radius).filter(cell => cell.material !== 'masonry' && lineClear(point, cell, this.obstacles));
    if (!targets.length) return 0;
    for (const cell of targets) { cell.depositedFuel += amount / targets.length; if (cell.phase === 'spent') cell.phase = 'cold'; }
    this.stats.molotovFuel += amount; return amount;
  }
  heatCell(cell, amount, cause, onHeat) {
    const before = cell.heat;
    cell.heat = Math.min(this.config.fire.maxHeat, before + amount); cell.cause = cause;
    onHeat?.(cell, before);
  }
  emit(point, radius, heat, cause, {wallsProtect = true, onHeat} = {}) {
    for (const cell of this.candidates(point, radius)) if (!wallsProtect || lineClear(point, cell, this.obstacles)) {
      this.heatCell(cell, heat, cause, onHeat);
    }
  }
  tileAt(point) {
    const x = Math.floor(Math.min(this.def.width - EPS, Math.max(0, point.x)));
    const y = Math.floor(Math.min(this.def.height - EPS, Math.max(0, point.y)));
    return {x, y, width: Math.min(1, this.def.width - x), depth: Math.min(1, this.def.height - y)};
  }
  tileCells(tile) {
    // Fully contained cells prevent direct heat leaking across an authoring tile.
    return this.cells.filter(cell => cell.x - this.size / 2 >= tile.x - EPS && cell.y - this.size / 2 >= tile.y - EPS &&
      cell.x + this.size / 2 <= tile.x + tile.width + EPS && cell.y + this.size / 2 <= tile.y + tile.depth + EPS);
  }
  seed(origin, targets, heat, cause, onHeat) {
    const visible = targets.filter(cell => {
      if (!lineClear(origin, cell, this.obstacles)) return false;
      const hit = impactPoint(origin, cell, this.obstacles);
      return Math.abs(hit.x - cell.x) <= cell.size / 2 + .003 && Math.abs(hit.y - cell.y) <= cell.size / 2 + .003;
    });
    const cells = visible.filter(cell => cell.surfaceFuel + cell.depositedFuel > EPS);
    for (const cell of cells) this.heatCell(cell, heat, cause, onHeat);
    return {result: cells.length ? 'heated' : visible.length ? 'no-fuel' : 'blocked', cells};
  }
  cone(origin, heading, range, halfAngle, heat, cause, onHeat) {
    const ux = Math.cos(heading), uy = Math.sin(heading), cosine = Math.cos(halfAngle);
    for (const cell of this.candidates(origin, range)) {
      if (!inHeatCone(origin, cell, ux, uy, range, cosine) || !lineClear(origin, cell, this.obstacles)) continue;
      this.heatCell(cell, heat, cause, onHeat);
    }
  }
  heatOutput(material) {
    const {fire} = this.config;
    return fire.heatRate * (fire.propagation[material] ?? fire.propagation.wood).heatScale;
  }
  step(delta, worldTime, event, rubble) {
    const {fire, fuel} = this.config; this.delta.fill(0);
    // Only sources burning before this pass can transfer heat. Each edge also
    // waits for its world-time travel deadline: no connected-component flood fill.
    for (let i = 0; i < this.cells.length; i++) {
      const source = this.cells[i]; if (source.phase !== 'burning') continue;
      const material = activeFuel(source), sourcePolicy = fire.propagation[material] ?? fire.propagation.wood;
      const output = this.heatOutput(material);
      for (const neighbour of this.neighbours[i]) {
        const target = this.cells[neighbour.index];
        const targetPolicy = fire.propagation[activeFuel(target)] ?? fire.propagation.wood;
        const speed = fire.frontSpeed * Math.min(sourcePolicy.speedScale, targetPolicy.speedScale);
        if (target.surfaceFuel + target.depositedFuel <= EPS || target.phase === 'burning' ||
            worldTime + EPS < source.ignitedAt + neighbour.distance / speed || !lineClear(source, target, this.obstacles)) continue;
        this.delta[neighbour.index] += output * targetPolicy.receiveScale / neighbour.distance * delta;
        if (!target.cause) target.cause = source.id;
      }
    }
    const areaScale = (this.size / 0.5) ** 2;
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i], burning = cell.phase === 'burning';
      const preTransfer = cell.heat, incoming = this.delta[i], rubbleHeat = rubble?.heat[i] ?? 0;
      cell.heat = storedHeat(preTransfer, incoming + rubbleHeat, fire.cooling, delta, fire.maxHeat);
      if (burning) {
        const gas = Math.min(cell.depositedFuel, fuel.gasBurnRate * areaScale * delta);
        const surface = Math.min(cell.surfaceFuel, fuel.surfaceBurnRate * areaScale * delta);
        cell.depositedFuel = Math.max(0, cell.depositedFuel - gas); cell.surfaceFuel = Math.max(0, cell.surfaceFuel - surface);
        this.stats.burnedDepositedFuel += gas; this.stats.burnedSurfaceFuel += surface;
        if (cell.surfaceFuel + cell.depositedFuel <= EPS) {
          cell.surfaceFuel = cell.depositedFuel = 0; cell.phase = 'spent'; cell.intensity = 0;
          event('burnout', cell, {cellId: cell.id}); continue;
        }
        cell.heat = Math.max(cell.heat, fire.burnHeat); cell.intensity = clamp(fire.minIntensity + (worldTime - cell.ignitedAt) * fire.intensityRise, fire.minIntensity, 1);
      } else {
        const total = cell.surfaceFuel + cell.depositedFuel;
        const threshold = cell.depositedFuel > EPS ? fire.ignition.gas : fire.ignition[cell.material] ?? Infinity;
        if (ignites(cell.heat, threshold, total - EPS)) {
          cell.phase = 'burning'; cell.ignitedAt = worldTime; cell.intensity = fire.minIntensity;
          const required = threshold + fire.cooling * delta;
          const fromRubble = rubbleHeat > 0 && preTransfer + incoming < required;
          if (fromRubble) cell.cause = 'rubble';
          event('ignition', cell, {cellId: cell.id, cause: cell.cause, heat: cell.heat,
            ...(fromRubble ? {sourceId: rubble.donors[i], worldTime} : {})}, cell,
            {required, incoming: incoming + rubbleHeat, independent: preTransfer >= required});
        } else if (cell.phase !== 'spent') {
          cell.phase = cell.heat > 0.03 ? 'heating' : 'cold';
          if (cell.heat <= EPS) cell.cause = null;
        }
      }
    }
  }
  heatIndex(point, radius = this.size) {
    const max = this.config.fire.maxHeat;
    if (!max || ![point?.x, point?.y, radius].every(Number.isFinite) || radius < 0) return 0;
    // Average nearby cells within up to three metres. Heat remains the
    // existing per-cell gameplay value, including on noncombustible paving.
    const reach = Math.min(3, radius);
    const cells = this.candidates(point, reach).filter(cell => distance(cell, point) <= reach + EPS);
    const heat = cells.length ? cells.reduce((sum, cell) => sum + cell.heat, 0) / cells.length : this.at(point)?.heat ?? 0;
    return clamp(heat / max, 0, 1);
  }
  exposure(point) {
    const cell = this.at(point); if (!cell) return 0;
    return Math.max(cell.phase === 'burning' ? cell.intensity : 0, clamp((cell.heat - this.config.fire.damageHeatStart) / this.config.fire.damageHeatSpan, 0, 1));
  }
  snapshot() { return this.cells.map(({ignitedAt, cause, ...cell}) => ({...cell})); }
}
