import {clamp, distance, inObstacle, lineClear, rasterSegments} from './geometry.js';
const EPS = 1e-10;
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
      const density = material === 'grass' ? 0.32 : material === 'wood' ? 1.2 : 0;
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
  emit(point, radius, heat, cause, {wallsProtect = true} = {}) {
    for (const cell of this.candidates(point, radius)) if (!wallsProtect || lineClear(point, cell, this.obstacles)) {
      cell.heat = Math.min(this.config.fire.maxHeat, cell.heat + heat); cell.cause = cause;
    }
  }
  cone(origin, heading, range, halfAngle, heat, cause) {
    const ux = Math.cos(heading), uy = Math.sin(heading), cosine = Math.cos(halfAngle);
    for (const cell of this.candidates(origin, range)) {
      const dx = cell.x - origin.x, dy = cell.y - origin.y, d = Math.hypot(dx, dy);
      if (d < 0.15 || d > range || (dx * ux + dy * uy) / d < cosine || !lineClear(origin, cell, this.obstacles)) continue;
      cell.heat = Math.min(this.config.fire.maxHeat, cell.heat + heat); cell.cause = cause;
    }
  }
  step(delta, worldTime, event) {
    const {fire, fuel} = this.config; this.delta.fill(0);
    // Only sources burning before this pass can transfer heat. Each edge also
    // waits for its world-time travel deadline: no connected-component flood fill.
    for (let i = 0; i < this.cells.length; i++) {
      const source = this.cells[i]; if (source.phase !== 'burning') continue;
      for (const neighbour of this.neighbours[i]) {
        const target = this.cells[neighbour.index];
        if (target.surfaceFuel + target.depositedFuel <= EPS || target.phase === 'burning' ||
            worldTime + EPS < source.ignitedAt + neighbour.distance / fire.frontSpeed || !lineClear(source, target, this.obstacles)) continue;
        this.delta[neighbour.index] += fire.heatRate / neighbour.distance * Math.max(0.5, source.intensity) * delta;
        if (!target.cause) target.cause = source.id;
      }
    }
    const areaScale = (this.size / 0.5) ** 2;
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i], burning = cell.phase === 'burning';
      cell.heat = clamp(cell.heat + this.delta[i] - fire.cooling * delta, 0, fire.maxHeat);
      if (burning) {
        const gas = Math.min(cell.depositedFuel, fuel.gasBurnRate * areaScale * delta);
        const surface = Math.min(cell.surfaceFuel, fuel.surfaceBurnRate * areaScale * delta);
        cell.depositedFuel = Math.max(0, cell.depositedFuel - gas); cell.surfaceFuel = Math.max(0, cell.surfaceFuel - surface);
        this.stats.burnedDepositedFuel += gas; this.stats.burnedSurfaceFuel += surface;
        if (cell.surfaceFuel + cell.depositedFuel <= EPS) {
          cell.surfaceFuel = cell.depositedFuel = 0; cell.phase = 'spent'; cell.intensity = 0;
          event('burnout', cell, {cellId: cell.id}); continue;
        }
        cell.heat = Math.max(cell.heat, 1.5); cell.intensity = clamp(0.5 + (worldTime - cell.ignitedAt) * 3, 0.5, 1);
      } else {
        const total = cell.surfaceFuel + cell.depositedFuel;
        const threshold = cell.depositedFuel > EPS ? fire.ignition.gas : fire.ignition[cell.material] ?? Infinity;
        if (total > EPS && cell.heat >= threshold) {
          cell.phase = 'burning'; cell.ignitedAt = worldTime; cell.intensity = 0.5;
          event('ignition', cell, {cellId: cell.id, cause: cell.cause});
        } else if (cell.phase !== 'spent') cell.phase = cell.heat > 0.03 ? 'heating' : 'cold';
      }
    }
  }
  exposure(point) {
    const cell = this.at(point); if (!cell) return 0;
    return Math.max(cell.phase === 'burning' ? cell.intensity : 0, clamp((cell.heat - 0.4) / 1.6, 0, 1));
  }
  snapshot() { return this.cells.map(({ignitedAt, cause, ...cell}) => ({...cell})); }
}
