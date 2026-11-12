// REVIEWER COPY (round 1) of ../kernel.mjs: DT is a parameter, hidden rules can be switched off (variant), and counters are added.
// With dt = 1/30 and variant = {} it must give the same events as the original (checked by r02).
// TRIAL KERNEL for docs/reviews/2026-11-11-fire-travel-rules.md. Not game code, not wired into the game.
// It runs the proposed rules on a sparse 3D grid of tiles so their numbers can be checked against the
// targets. Tiles are 0.5 x 0.5 m in plan and 1.06 m tall. Time advances in fixed steps of 1/30 s.
//
// A tile holds: heat, a list of fuels, a room label, and whether it is inside a building.
// A face between two cells is open (absent from the map), glass, timber or masonry. A timber face
// belongs to a fuel in one of its two tiles and opens when that fuel is spent.
export const PITCH = .5, LAYER = 1.06, DT = 1 / 30;

// lightAt: tile heat at which the fuel starts to char. delay: seconds of charring (at heat = lightAt)
// before it lights. burnFor: seconds a full tile of it burns. out: heat it gives while burning.
export const DEFAULT_FUELS = {
  // radiates: the share of its output that reaches across a gap (Rule 6). Grass flame is thin.
  grass: {lightAt: .85, delay: .15, burnFor: 3, out: .7, radiates: .1},
  oil: {lightAt: .6, delay: 0, burnFor: 14, out: 3},
  clapboard: {lightAt: 1.1, delay: 5, burnFor: 25, out: 1},
  roof: {lightAt: 1.1, delay: 3, burnFor: 60, out: 1},
  frame: {lightAt: 1.3, delay: 3, burnFor: 60, out: 1.2},
  furniture: {lightAt: 1.1, delay: 3, burnFor: 30, out: 1.5},
  cloth: {lightAt: .8, delay: .5, burnFor: 10, out: 1},
  lacquer: {lightAt: .5, delay: 0, burnFor: 4, out: 1.6},
  coal: {lightAt: 1.6, delay: 15, burnFor: 300, out: .8},
  embers: {lightAt: .7, delay: 0, burnFor: 8, out: 1, radiates: .1}
};
export const DEFAULT_RULES = {
  rate: 4,            // heat per second a neighbour receives per unit of output, level, one tile away
  maxHeat: 4,
  lossInside: 2.5,    // heat lost per second per unit of heat, any tile
  lossPerOpenFace: 1, // added for each face of an inside tile that is open to the outside
  lossOutside: 2,   // an outdoor tile, open to the sky
  up: 3, upDiagonal: 2, downDiagonal: .06, down: .04,   // Rule 4, in tile units
  pass: {glass: .05, timber: .02, masonry: .005},            // Rule 5
  glassBreaks: 1.6,
  reach: 3, radiantGain: .5, radiantEvery: .5,             // Rule 6
  burstAt: 1.4, burstRadius: 1.5,                           // Rule 8
  fallPulse: 2.5                                            // Rule 7
};

const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const ORDERS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];

export function createWorld({fuels = DEFAULT_FUELS, rules: overrides = {}, dt = 1 / 30, variant = {}} = {}) {
  const DT = dt;
  const rules = {...DEFAULT_RULES, ...overrides, pass: {...DEFAULT_RULES.pass, ...overrides.pass}};
  const tiles = new Map(), faces = new Map(), active = new Set(), events = [];
  const key = (i, j, k) => ((k + 2) * 512 + (j + 64)) * 512 + (i + 64);
  let time = 0, faceVersion = 0, radiantClock = 0;
  const ledger = {laid: 0, burnt: 0, embersMade: 0, burstRemoved: 0}, stats = {ticks: 0, visits: 0, ignitions: 0, linkOps: 0, phase2: 0, relinks: 0, radiateMs: 0, radiateCalls: 0, radiateScans: 0, relinkMs: 0, maxHeat: 0, minHeat: 0, maxRad: 0, litOnFall: 0};

  const tileAt = (i, j, k) => tiles.get(key(i, j, k));
  function addTile(i, j, k, {inside = false, room = null, building = null} = {}) {
    const id = key(i, j, k);
    let tile = tiles.get(id);
    if (!tile) { tile = {id, i, j, k, heat: 0, incoming: 0, rad: 0, fuels: [], inside, room, building, out: 0, version: -1, links: null, loss: 0}; tiles.set(id, tile); }
    return tile;
  }
  // The face on the positive side of cell (i,j,k) along `axis`.
  const faceKey = (i, j, k, axis) => key(i, j, k) * 3 + axis;
  function faceBetween(i, j, k, axis, step) {
    if (axis === 2 && (step < 0 ? k : k + 1) <= 0) return GROUND;
    return step > 0 ? faces.get(faceKey(i, j, k, axis)) : faces.get(faceKey(i - AX[axis][0], j - AX[axis][1], k - AX[axis][2], axis));
  }
  const GROUND = {kind: 'masonry', pass: 0};
  function setFace(i, j, k, axis, step, kind) {
    const face = {kind, pass: rules.pass[kind]};
    faces.set(step > 0 ? faceKey(i, j, k, axis) : faceKey(i - AX[axis][0], j - AX[axis][1], k - AX[axis][2], axis), face);
    faceVersion++;
    return face;
  }
  const passOf = face => face ? face.pass : 1;
  // Heat passed from cell (i,j,k) to the cell one step away in each non-zero direction: the best
  // route through the faces between them.
  function pathPass(i, j, k, d) {
    let best = 0;
    for (const order of ORDERS) {
      let ci = i, cj = j, ck = k, pass = 1;
      for (const axis of order) {
        if (!d[axis]) continue;
        pass *= passOf(faceBetween(ci, cj, ck, axis, d[axis]));
        ci += AX[axis][0] * d[axis]; cj += AX[axis][1] * d[axis]; ck += AX[axis][2] * d[axis];
      }
      if (pass > best) best = pass;
    }
    return best;
  }
  function addFuel(tile, cls, amount, {face = null, supports = false, lit = false, store = null} = {}) {
    const fuel = {cls, amount, start: amount, lit, char: 0, face, supports, store, litAt: lit ? time : null, spentAt: null};
    tile.fuels.push(fuel);
    ledger.laid += amount;
    if (lit) active.add(tile);
    return fuel;
  }
  function relink(tile) { if (!variant.time) return relinkInner(tile); const t0 = performance.now(); relinkInner(tile); stats.relinkMs += performance.now() - t0; }
  function relinkInner(tile) {
    tile.version = faceVersion; stats.relinks++;
    const links = [], {i, j, k} = tile;
    const upPass = passOf(faceBetween(i, j, k, 2, 1));
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy && !dz) continue;
      const target = tileAt(i + dx, j + dy, k + dz);
      if (!target) continue;
      let pass = pathPass(i, j, k, [dx, dy, dz]);
      // A wall is one continuous surface from storey to storey: fire climbs it past the floor that meets it.
      if (!variant.noWallContinuity && pass < 1 && dz && !dx && !dy && !(variant.wallContinuityUpOnly && dz < 0)) for (const fuel of tile.fuels) {
        if (!fuel.face || fuel.amount <= 0 || [dx, dy, dz][fuel.face.axis]) continue;
        if (target.fuels.some(other => other.face && other.amount > 0 && other.face.axis === fuel.face.axis && other.face.step === fuel.face.step)) { pass = 1; break; }
      }
      const level = dx || dy;
      let direction = dz > 0 ? (level ? rules.upDiagonal : rules.up) : dz < 0 ? (level ? rules.downDiagonal : rules.down) : 1;
      // Rule 4: under a closed ceiling the upward share runs sideways.
      if (!variant.noCeilingSpread && !dz && Math.abs(dx) + Math.abs(dy) === 1) direction += rules.up * (1 - upPass) / 4;
      const weight = rules.rate * direction * pass / Math.hypot(dx, dy, dz);
      if (weight > 1e-4) links.push({target, weight});
    }
    tile.links = links;
    if (variant.lossByFacesOnly) {
      // Rule 3 as written: loss through each face open to outside air (a missing tile or an outdoor tile), almost none through a surface.
      let open = 0;
      for (let axis = 0; axis < 3; axis++) for (const step of [-1, 1]) {
        const other = tileAt(i + AX[axis][0] * step, j + AX[axis][1] * step, k + AX[axis][2] * step);
        if (!other || !other.fuels.length && !other.inside || !other.inside) open += passOf(faceBetween(i, j, k, axis, step));
      }
      tile.loss = variant.lossByFacesOnly.base + variant.lossByFacesOnly.perFace * open;
    } else if (!tile.inside) tile.loss = rules.lossOutside;
    else {
      let open = 0;
      for (let axis = 0; axis < 3; axis++) for (const step of [-1, 1]) {
        const other = tileAt(i + AX[axis][0] * step, j + AX[axis][1] * step, k + AX[axis][2] * step);
        if (!other || !other.inside) open += passOf(faceBetween(i, j, k, axis, step));
      }
      tile.loss = rules.lossInside + rules.lossPerOpenFace * open;
    }
  }
  const across = (tile, face) => tileAt(tile.i + AX[face.axis][0] * face.step, tile.j + AX[face.axis][1] * face.step, tile.k + AX[face.axis][2] * face.step);

  function landing(tile) {
    // The first tile below that still has something to stand on.
    for (let k = tile.k; k >= 0; k--) {
      const below = tileAt(tile.i, tile.j, k);
      if (!below) continue;
      if (k === 0 || below.fuels.some(fuel => fuel.supports && fuel.amount > 0)) return below;
    }
    return tileAt(tile.i, tile.j, 0) ?? tile;
  }
  function drop(tile, what, cause) {
    const to = landing(tile);
    if (to === tile && !what.embers) return;
    for (const fuel of what.fuels ?? []) {
      tile.fuels.splice(tile.fuels.indexOf(fuel), 1);
      to.fuels.push(fuel);
      if (!fuel.lit && (variant.coalLightsOnFall || fuel.cls !== 'coal') && !variant.fallKeepsState) { fuel.lit = true; fuel.litAt = time; stats.litOnFall++; }
    }
    if (what.embers) { addFuel(to, 'embers', what.embers, {lit: true}); ledger.embersMade += what.embers; }
    to.heat = Math.min(rules.maxHeat, to.heat + rules.fallPulse);
    active.add(to);
    events.push({type: 'fall', cause, time, from: [tile.i, tile.j, tile.k], to: [to.i, to.j, to.k], building: tile.building, carried: (what.fuels ?? []).map(fuel => fuel.cls)});
  }
  function burst(tile, fuel) {
    // Rule 8: the can fails; its oil spreads over the floor tiles of its room within reach, lit.
    const cells = [], r = Math.ceil(rules.burstRadius / PITCH);
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.hypot(di, dj) * PITCH > rules.burstRadius) continue;
      const other = tileAt(tile.i + di, tile.j + dj, tile.k);
      if (other && (variant.burstAnyRoom || other.room === tile.room)) cells.push(other);
    }
    const share = fuel.amount / cells.length;
    ledger.burstRemoved += fuel.start - fuel.amount; fuel.amount = 0; fuel.spentAt = time; ledger.laid -= fuel.start;
    for (const cell of cells) { addFuel(cell, 'oil', share, {lit: true}); cell.heat = Math.min(rules.maxHeat, cell.heat + 2); active.add(cell); }
    events.push({type: 'burst', time, at: [tile.i, tile.j, tile.k], building: tile.building, tiles: cells.length});
  }
  function spend(tile, fuel) {
    fuel.amount = 0; fuel.lit = false; fuel.spentAt = time;
    if (fuel.face) {
      fuel.face.object.pass = 1; fuel.face.object.kind = 'open'; faceVersion++;
      events.push({type: 'opened', time, at: [tile.i, tile.j, tile.k], axis: fuel.face.axis, step: fuel.face.step, cls: fuel.cls, supports: fuel.supports, building: tile.building});
    }
    if (fuel.supports) drop(tile, {fuels: tile.fuels.filter(other => !other.face && other.amount > 0), embers: variant.noFloorEmbers ? 0 : .3}, 'floor');
    else if (fuel.face && !variant.noFaceEmbers) drop(tile, {embers: .2}, fuel.face.axis === 2 ? 'roof' : 'wall');
  }

  function radiate() {
    const began = performance.now(); stats.radiateCalls++;
    const reach = Math.ceil(rules.reach / PITCH), sources = [];
    for (const tile of active) {
      if (!(tile.radOut > 0)) continue;
      if (!tile.inside) { sources.push(tile); continue; }
      // An inside tile radiates outward if it has burning fuel on a face that looks outside, or an open face there.
      let exposed = false;
      for (let axis = 0; axis < 2 && !exposed; axis++) for (const step of [-1, 1]) {
        const other = tileAt(tile.i + AX[axis][0] * step, tile.j + AX[axis][1] * step, tile.k);
        if (other?.inside) continue;
        const face = faceBetween(tile.i, tile.j, tile.k, axis, step);
        if (passOf(face) >= .5 || tile.fuels.some(fuel => fuel.lit && fuel.face?.object === face)) { exposed = true; break; }
      }
      if (exposed) sources.push(tile);
    }
    const flux = new Map();
    for (const source of sources) {
      for (let dk = -3; dk <= 3; dk++) for (let dj = -reach; dj <= reach; dj++) for (let di = -reach; di <= reach; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj), Math.abs(dk)) <= 1) continue;
        const target = tileAt(source.i + di, source.j + dj, source.k + dk);
        // Inside one building the neighbour rule carries the heat; reach is for gaps between things.
        if (!target || !(variant.radiateToAll ? target.fuels.length : target.radiantTarget) || !variant.radiateWithinBuilding && target.building && target.building === source.building) continue;
        const dx = di * PITCH, dy = dj * PITCH, dz = dk * LAYER, distance = Math.hypot(dx, dy, dz);
        if (distance > rules.reach) continue;
        if (!clear(source, target)) continue;
        flux.set(target, (flux.get(target) ?? 0) + source.radOut / distance ** 2);
      }
    }
    for (const tile of tiles.values()) { stats.radiateScans++; if (tile.rad) tile.rad = 0; }
    for (const [tile, amount] of flux) { tile.rad = rules.radiantGain * amount; if (tile.rad > stats.maxRad) stats.maxRad = tile.rad; active.add(tile); }
    stats.radiateMs += performance.now() - began;
  }
  function clear(a, b) {
    const steps = Math.ceil(Math.max(Math.abs(b.i - a.i), Math.abs(b.j - a.j), Math.abs(b.k - a.k)) * 2);
    let ci = a.i, cj = a.j, ck = a.k, crossings = [];
    for (let s = 1; s <= steps; s++) {
      const ni = Math.round(a.i + (b.i - a.i) * s / steps), nj = Math.round(a.j + (b.j - a.j) * s / steps), nk = Math.round(a.k + (b.k - a.k) * s / steps);
      if (ni === ci && nj === cj && nk === ck) continue;
      crossings.push(pathPass(ci, cj, ck, [ni - ci, nj - cj, nk - ck]));
      ci = ni; cj = nj; ck = nk;
    }
    // A wall that is itself burning, or itself the fuel being warmed, does not shade itself.
    if (a.inside && crossings.length) crossings[0] = 1;
    if (b.inside && crossings.length) crossings[crossings.length - 1] = 1;
    return crossings.every(pass => pass >= .5);
  }

  function step() {
    time += DT; stats.ticks++;
    // 1. What each burning tile gives its neighbours and itself.
    // A wall, floor or door that was lit from one side burns on that side until it is burnt through.
    for (const tile of active) { tile.out = 0; tile.radOut = 0; }
    for (const tile of [...active]) for (const fuel of tile.fuels) if (fuel.lit) {
      const side = fuel.giveTo ?? tile, spec = fuels[fuel.cls];
      if (side !== tile && !active.has(side)) { side.out = 0; side.radOut = 0; active.add(side); }
      side.out += spec.out; side.radOut += spec.out * (spec.radiates ?? 1);
    }
    for (const tile of active) {
      const out = tile.out;
      if (!out) continue;
      stats.visits++;
      if (tile.version !== faceVersion) relink(tile);
      stats.linkOps += tile.links.length;
      for (const {target, weight} of tile.links) { target.incoming += DT * weight * out; active.add(target); }
      tile.incoming += DT * rules.rate * out;
    }
    radiantClock += DT;
    if (radiantClock >= rules.radiantEvery) { radiantClock = 0; radiate(); }
    // 2. Heat, charring, burning.
    for (const tile of (variant.phase2Order ? variant.phase2Order([...active]) : active)) {
      stats.phase2++;
      if (tile.version !== faceVersion) relink(tile);
      tile.heat = Math.min(rules.maxHeat, tile.heat + tile.incoming);
      tile.incoming = 0;
      tile.heat -= tile.heat * Math.min(1, tile.loss * DT);
      if (tile.heat > stats.maxHeat) stats.maxHeat = tile.heat; if (tile.heat < stats.minHeat) stats.minHeat = tile.heat;
      let alive = tile.heat > 1e-3 || tile.rad > 0;
      for (const fuel of [...tile.fuels]) {
        if (fuel.amount <= 0) continue;
        const spec = fuels[fuel.cls];
        if (fuel.lit) {
          const burn = Math.min(fuel.amount, DT / spec.burnFor);
          fuel.amount -= burn; ledger.burnt += burn; alive = true;
          if (fuel.amount <= 1e-9) spend(tile, fuel);
          continue;
        }
        let exposure = Math.max(tile.heat, tile.rad), from = null;
        if (fuel.face) { const other = across(tile, fuel.face); if (other && other.heat > exposure) { exposure = other.heat; from = other; } }
        if (fuel.store === 'oil' && exposure >= rules.burstAt) { burst(tile, fuel); alive = true; continue; }
        if (exposure >= spec.lightAt) {
          fuel.char += DT * exposure / spec.lightAt;
          if (fuel.char >= spec.delay) {
            if (fuel.store === 'oil') { burst(tile, fuel); alive = true; continue; }
            fuel.lit = true; fuel.litAt = time; fuel.giveTo = variant.noOneSided ? null : from; stats.ignitions++; alive = true;
            events.push({type: 'lit', time, at: [tile.i, tile.j, tile.k], cls: fuel.cls, building: tile.building, room: tile.room});
          }
        } else if (fuel.char > 0) fuel.char = Math.max(0, fuel.char - DT * .5);
      }
      // Glass breaks when the tile on either side is hot enough.
      if (tile.heat >= rules.glassBreaks) for (let axis = 0; axis < 2; axis++) for (const stepDir of [-1, 1]) {
        const face = faceBetween(tile.i, tile.j, tile.k, axis, stepDir);
        if (face?.kind === 'glass') { face.kind = 'open'; face.pass = 1; faceVersion++; events.push({type: 'glass', time, at: [tile.i, tile.j, tile.k], building: tile.building}); }
      }
      if (!alive) { active.delete(tile); tile.out = 0; tile.heat = 0; }
    }
  }
  function ignite(tile, cls) {
    const fuel = tile.fuels.find(f => f.amount > 0 && !f.lit && (!cls || f.cls === cls));
    if (!fuel) return null;
    fuel.lit = true; fuel.litAt = time; active.add(tile);
    events.push({type: 'lit', time, at: [tile.i, tile.j, tile.k], cls: fuel.cls, building: tile.building, room: tile.room, cause: 'match'});
    return fuel;
  }
  const remaining = () => { let sum = 0; for (const tile of tiles.values()) for (const fuel of tile.fuels) sum += fuel.amount; return sum; };
  return {tiles, faces, active, events, ledger, stats, rules, fuels, addTile, tileAt, setFace, addFuel, ignite, step, remaining,
    get time() { return time; }, faceBetween, dt: DT};
}
