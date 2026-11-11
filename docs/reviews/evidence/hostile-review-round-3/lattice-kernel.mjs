// REFERENCE KERNEL FOR THE REVIEW'S PROPOSAL. Not game code and not wired into the game.
//
// It is src/simulation/field.js's ground rule (travel deadline + stored heat + finite fuel),
// lifted from a flat grid of cells onto a sparse 3D lattice of tiles:
//   - a tile is (i, j, k): plan pitch `pitch` metres, layer height `layer` metres;
//   - every tile has six faces; a face carries a conductance 0..1 (1 open, 0 masonry,
//     in between = a timber wall or deck that passes heat and opens when its tile burns out);
//   - one rule for all 26 neighbours. The only thing that tells up from sideways from down
//     is a multiplier on the vertical part of the direction (`up`, `down`);
//   - optional radiant reach between exposed tiles that are not neighbours;
//   - only burning and warm tiles are visited each tick, and each tick lists the tiles that changed.
const OPP = [1, 0, 3, 2, 5, 4];                       // -x +x -y +y -z +z
const AXES = [[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
const faceOf = (axis, step) => axis * 2 + (step > 0 ? 1 : 0);
const ORDERS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
const NEIGHBOURS = [];
for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy || dz) NEIGHBOURS.push([dx, dy, dz]);

export function createLattice({pitch = .5, layer = 1.06, fuels, up = 1, down = 1, cooling = .3, maxHeat = 4, burnHeat = 1.5,
  bareReceive = 0, reach = 0, radiantGain = 0} = {}) {
  const tiles = new Map(), burning = new Set(), warm = new Set(), exposed = new Map();
  const key = (i, j, k) => ((k + 8) * 2048 + (j + 8)) * 2048 + (i + 8);
  const stats = {ticks: 0, visits: 0, ignitions: 0, burnouts: 0};
  let changed = [];

  function add(i, j, k, {fuel = null, seconds = 0, solid = false, radiates = false, tag = null} = {}) {
    const id = key(i, j, k);
    let tile = tiles.get(id);
    if (!tile) {
      tile = {id, i, j, k, x: (i + .5) * pitch, y: (j + .5) * pitch, z: (k + .5) * layer, fuel: null, seconds: 0, heat: 0, incoming: 0,
        phase: 'cold', ignitedAt: null, cause: null, face: [1, 1, 1, 1, 1, 1], timber: 0, links: null, far: null, farStamp: -1, solid: false, radiates: false, tag: null};
      tiles.set(id, tile);
    }
    if (fuel) { tile.fuel = fuel; tile.seconds += seconds; if (tile.phase === 'spent') tile.phase = 'cold'; }
    tile.solid ||= solid; if (tag) tile.tag = tag;
    if (radiates && !tile.radiates) {
      tile.radiates = true;
      const bucket = bucketKey(tile.x, tile.y);
      if (!exposed.has(bucket)) exposed.set(bucket, []);
      exposed.get(bucket).push(tile);
    }
    return tile;
  }
  const at = (i, j, k) => tiles.get(key(i, j, k));
  const bucketKey = (x, y) => Math.floor(x / Math.max(reach, 1)) * 4096 + Math.floor(y / Math.max(reach, 1));

  // A face belongs to both tiles that share it. `timber` faces open when either owner burns out.
  function setFace(tile, face, conductance, timber = false) {
    tile.face[face] = conductance;
    if (timber) tile.timber |= 1 << face; else tile.timber &= ~(1 << face);
    const [dx, dy, dz] = AXES[face], other = at(tile.i + dx, tile.j + dy, tile.k + dz);
    if (other) { other.face[OPP[face]] = conductance; if (timber) other.timber |= 1 << OPP[face]; else other.timber &= ~(1 << OPP[face]); }
    invalidate(tile);
  }
  function invalidate(tile) {
    for (const [dx, dy, dz] of NEIGHBOURS) { const n = at(tile.i + dx, tile.j + dy, tile.k + dz); if (n) n.links = null; }
    tile.links = null;
  }
  // Conductance of a one-tile move. A diagonal move takes the best of its staircase paths,
  // so fire can round the end of a wall but cannot slip through the corner of two walls.
  function conductance(tile, dx, dy, dz) {
    const delta = [dx, dy, dz];
    let best = 0;
    for (const order of ORDERS) {
      let g = 1, i = tile.i, j = tile.j, k = tile.k;
      for (const axis of order) {
        const step = delta[axis];
        if (!step) continue;
        const from = at(i, j, k), face = faceOf(axis, step);
        if (axis === 0) i += step; else if (axis === 1) j += step; else k += step;
        const to = at(i, j, k);
        g *= Math.min(from ? from.face[face] : 1, to ? to.face[OPP[face]] : 1);
        if (g <= 0) break;
      }
      if (g > best) best = g;
      if (best >= 1) break;
    }
    return best;
  }
  function linksOf(tile) {
    if (tile.links) return tile.links;
    const links = [];
    for (const [dx, dy, dz] of NEIGHBOURS) {
      const target = at(tile.i + dx, tile.j + dy, tile.k + dz);
      if (!target) continue;
      const g = conductance(tile, dx, dy, dz);
      if (g <= 0) continue;
      const distance = Math.hypot(dx * pitch, dy * pitch, dz * layer), uz = dz * layer / distance;
      const gain = g * (1 + (up - 1) * Math.max(0, uz) + (down - 1) * Math.max(0, -uz));
      // `lag` stretches the travel deadline by the same factor that scales the heat.
      links.push({target, distance, gain, lag: 1 / Math.max(gain, 1e-6)});
    }
    return tile.links = links;
  }
  // Radiant reach: exposed tiles within `reach` metres with nothing solid on the straight line between them.
  // Sightlines open as tiles burn away, so the list is rebuilt once per world second.
  function farOf(tile, time) {
    const stamp = Math.floor(time);
    if (tile.far && tile.farStamp === stamp) return tile.far;
    tile.farStamp = stamp;
    const far = [];
    if (reach > 0 && radiantGain > 0 && tile.radiates) {
      const size = Math.max(reach, 1), bx = Math.floor(tile.x / size), by = Math.floor(tile.y / size);
      for (let u = bx - 1; u <= bx + 1; u++) for (let v = by - 1; v <= by + 1; v++) for (const target of exposed.get(u * 4096 + v) ?? []) {
        const distance = Math.hypot(target.x - tile.x, target.y - tile.y, target.z - tile.z);
        if (target === tile || distance > reach || distance < 1.6 * pitch || !clear(tile, target, distance)) continue;
        // Inverse square, floored at 1 m. The step divides every link by its distance, so multiply it back here.
        far.push({target, distance, gain: radiantGain * distance / Math.max(1, distance * distance), lag: 0});
      }
    }
    return tile.far = far;
  }
  function clear(a, b, distance) {
    const steps = Math.ceil(distance / (pitch / 2));
    for (let n = 1; n < steps; n++) {
      const t = n / steps, tile = at(Math.floor((a.x + (b.x - a.x) * t) / pitch), Math.floor((a.y + (b.y - a.y) * t) / pitch), Math.floor((a.z + (b.z - a.z) * t) / layer));
      if (tile && tile !== a && tile !== b && tile.solid && tile.phase !== 'spent') return false;
    }
    return true;
  }

  function heat(tile, amount, cause) {
    if (!tile || !(amount > 0)) return;
    tile.heat = Math.min(maxHeat, tile.heat + amount); tile.cause = cause; warm.add(tile);
  }
  function emit(point, radius, amount, cause) {
    const r = Math.ceil(radius / pitch), ci = Math.floor(point.x / pitch), cj = Math.floor(point.y / pitch);
    for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) for (let k = 0; k <= Math.ceil(radius / layer); k++) {
      const tile = at(i, j, k);
      if (tile && Math.hypot(tile.x - point.x, tile.y - point.y, tile.z - layer / 2) <= radius) heat(tile, amount, cause);
    }
  }

  function step(dt, time, onEvent = () => {}) {
    stats.ticks++; changed = [];
    // 1. Sources that were burning before this pass heat their neighbours, once the travel deadline has passed.
    for (const source of burning) {
      const spec = fuels[source.fuel];
      for (const list of [linksOf(source), farOf(source, time)]) for (const {target, distance, gain, lag} of list) {
        stats.visits++;
        if (target.phase === 'burning' || target.phase === 'spent' && !target.fuel) continue;
        const fuelled = target.fuel && target.seconds > 0, receive = fuelled ? fuels[target.fuel].receive : bareReceive;
        if (receive <= 0) continue;
        const speed = fuelled ? Math.min(spec.speed, fuels[target.fuel].speed) : spec.speed;
        if (time + 1e-10 < source.ignitedAt + lag * distance / speed) continue;
        target.incoming += spec.out * receive * gain / distance * dt;
        if (!target.cause) target.cause = source.id;
        warm.add(target);
      }
    }
    // 2. Warm tiles store or lose heat, and ignite at their fuel's threshold.
    for (const tile of warm) {
      tile.heat = Math.max(0, Math.min(maxHeat, tile.heat + tile.incoming - cooling * dt)); tile.incoming = 0;
      changed.push(tile);
      if (tile.fuel && tile.seconds > 0 && tile.heat >= fuels[tile.fuel].ignition) {
        tile.phase = 'burning'; tile.ignitedAt = time; burning.add(tile); warm.delete(tile); stats.ignitions++;
        onEvent('ignition', tile);
      } else if (tile.heat <= 0) { warm.delete(tile); tile.cause = null; }
    }
    // 3. Burning tiles spend fuel. A spent tile opens its timber faces.
    for (const tile of burning) {
      if (tile.ignitedAt === time) continue;
      tile.seconds -= dt; changed.push(tile);
      if (tile.seconds > 0) { tile.heat = Math.max(tile.heat, burnHeat); continue; }
      tile.seconds = 0; tile.phase = 'spent'; tile.fuel = null; burning.delete(tile); warm.add(tile); stats.burnouts++;
      if (tile.timber) {
        for (let face = 0; face < 6; face++) if (tile.timber & 1 << face) {
          tile.face[face] = 1;
          const [dx, dy, dz] = AXES[face], other = at(tile.i + dx, tile.j + dy, tile.k + dz);
          if (other) { other.face[OPP[face]] = 1; other.timber &= ~(1 << OPP[face]); }
        }
        tile.timber = 0; invalidate(tile);
      }
      onEvent('burnout', tile);
    }
    return changed;
  }
  return {tiles, burning, warm, stats, add, at, setFace, heat, emit, step, pitch, layer,
    exposure: tile => tile ? Math.max(tile.phase === 'burning' ? 1 : 0, Math.min(1, Math.max(0, (tile.heat - .4) / 1.6))) : 0};
}
