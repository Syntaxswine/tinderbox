// TRIAL KERNEL, second version, for docs/reviews/2026-11-11-fire-travel-rules.md. Not game code, not wired
// into the game. It runs the proposed rules on a sparse 3D grid of tiles so their numbers can be checked
// against the targets. Tiles are 0.5 x 0.5 m in plan and 1.06 m tall.
//
// A tile holds: heat, and a list of fuels. A face between two cells is open (absent from the map), glass,
// timber or masonry. A timber face belongs to a fuel in one of its two tiles and opens when that fuel is spent.
//
// THE FIRE RULE READS ONLY TILES, FUELS AND FACES. `tile.room` and `tile.building` are labels the scene
// puts on a tile so the trial can count by room and by house; the kernel copies them into its event log
// and never branches on them. (The first version branched on `inside`, `room`, `building`, a
// `radiantTarget` flag and the class name 'coal'; review round 1, M3. All five are gone.)
export const PITCH = .5, LAYER = 1.06, DT = 1 / 30;

// lightAt: heat at which the fuel starts to char. delay: seconds of charring (at heat = lightAt) before it
// lights. burnFor: seconds a full tile of it burns. out: heat it gives while burning.
// radiates: the share of its output that reaches across a gap (Rule 6). Grass flame is thin.
export const DEFAULT_FUELS = {
  grass: {lightAt: .85, delay: .18, burnFor: 3, out: .7, radiates: .1},
  oil: {lightAt: .6, delay: 0, burnFor: 14, out: 3},
  clapboard: {lightAt: 1.1, delay: 4.5, burnFor: 20, out: 1},
  partition: {lightAt: 1.1, delay: 5, burnFor: 90, out: 1},
  door: {lightAt: 1.1, delay: 5, burnFor: 50, out: 1},
  roof: {lightAt: 1.1, delay: 8, burnFor: 80, out: 1},
  frame: {lightAt: 1.3, delay: 3, burnFor: 80, out: 1.2},
  furniture: {lightAt: 1.1, delay: 3, burnFor: 30, out: 1.5},
  cloth: {lightAt: .8, delay: .5, burnFor: 10, out: 1},
  lacquer: {lightAt: .5, delay: 0, burnFor: 4, out: 1.6},
  coal: {lightAt: 1.6, delay: 15, burnFor: 300, out: .8},
  embers: {lightAt: .7, delay: 0, burnFor: 8, out: 1, radiates: .1}
};
export const DEFAULT_RULES = {
  step: DT,           // seconds per step. Part of the rules: results move with it (review round 1, S1)
  rate: 4,            // heat per second a neighbour receives per unit of output, level, one tile away
  maxHeat: 3,         // also sets the climb ratio: a tile above a fire sits at this ceiling
  loss: 2,            // share of its heat every tile loses per second. One number, every tile
  up: 3, upDiagonal: 2, downDiagonal: .06, down: .04,   // Rule 4
  falloff: 1.5,         // a neighbour at distance d receives 1 / d^falloff
  pass: {glass: .05, timber: .02, masonry: .005},       // Rule 5
  glassBreaks: 1.6,
  storeyPass: .05,      // Rule 5: what a wall passes up or down its own plane past a floor
  through: 4,         // Rule 5: a surface lit on one side gives the far side (share consumed)^through
  reach: 3, radiantGain: .5, radiantEvery: .5,          // Rule 6
  reachUnderCover: false,   // Rule 6: reach is for fire in the open. false: only tiles with nothing closed above them reach or are reached
  burstRadius: 1.5, burstPulse: 2,                       // Rule 8. A can bursts when its oil would light
  charFades: .5,      // Rule 2: char lost per second below the lighting point
  sight: .5,          // Rule 6: a face that passes at least this much does not block a line
  emberShare: .15,    // Rule 7: the last share of a surface does not burn in place; it falls as embers
  fallPulse: 2.5
};

const AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const ORDERS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];

export function createWorld({fuels = DEFAULT_FUELS, rules: overrides = {}} = {}) {
  const rules = {...DEFAULT_RULES, ...overrides, pass: {...DEFAULT_RULES.pass, ...overrides.pass}};
  const dt = rules.step, radiantTicks = Math.max(1, Math.round(rules.radiantEvery / dt));
  const tiles = new Map(), faces = new Map(), active = new Set(), events = [];
  const key = (i, j, k) => ((k + 2) * 512 + (j + 64)) * 512 + (i + 64);
  let time = 0, listenersStale = true, warmed = [], topLayer = 0;
  const ledger = {laid: 0, burnt: 0, fellAsEmbers: 0}, stats = {ticks: 0, visits: 0, ignitions: 0, relinks: 0, sightLines: 0};

  const tileAt = (i, j, k) => tiles.get(key(i, j, k));
  const around = (i, j, k, each) => { for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = tileAt(i + dx, j + dy, k + dz); if (t) each(t); } };
  const stale = tile => { tile.links = null; };
  function addTile(i, j, k, {room = null, building = null} = {}) {
    const id = key(i, j, k);
    let tile = tiles.get(id);
    if (!tile) {
      tile = {id, i, j, k, heat: 0, incoming: 0, rad: 0, fuels: [], room, building, out: 0, radOut: 0, links: null, listens: false};
      tiles.set(id, tile);
      if (k > topLayer) topLayer = k;
      around(i, j, k, stale);
    }
    return tile;
  }
  // The face on the positive side of cell (i,j,k) along `axis`.
  const faceKey = (i, j, k, axis) => key(i, j, k) * 3 + axis;
  const GROUND = {kind: 'masonry', pass: 0};
  function faceBetween(i, j, k, axis, step) {
    if (axis === 2 && (step < 0 ? k : k + 1) <= 0) return GROUND;
    return step > 0 ? faces.get(faceKey(i, j, k, axis)) : faces.get(faceKey(i - AX[axis][0], j - AX[axis][1], k - AX[axis][2], axis));
  }
  // A face changed: only the tiles that can link across it need their links rebuilt.
  function faceChanged(i, j, k, axis, step) {
    around(i, j, k, stale);
    around(i + AX[axis][0] * step, j + AX[axis][1] * step, k + AX[axis][2] * step, stale);
  }
  function setFace(i, j, k, axis, step, kind) {
    const face = {kind, pass: rules.pass[kind]};
    faces.set(step > 0 ? faceKey(i, j, k, axis) : faceKey(i - AX[axis][0], j - AX[axis][1], k - AX[axis][2], axis), face);
    faceChanged(i, j, k, axis, step);
    return face;
  }
  const passOf = face => face ? face.pass : 1;
  // Heat passed from cell (i,j,k) to the cell one step away in each non-zero direction: the best
  // route through the faces between them.
  function pathPass(i, j, k, d) {
    const moves = (d[0] ? 1 : 0) + (d[1] ? 1 : 0) + (d[2] ? 1 : 0);
    if (moves === 1) { const axis = d[0] ? 0 : d[1] ? 1 : 2; return passOf(faceBetween(i, j, k, axis, d[axis])); }
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
  const across = (tile, face) => tileAt(tile.i + AX[face.axis][0] * face.step, tile.j + AX[face.axis][1] * face.step, tile.k + AX[face.axis][2] * face.step);
  function addFuel(tile, cls, amount, {face = null, supports = false, lit = false, store = null} = {}) {
    const fuel = {cls, amount, start: amount, lit, char: 0, face, supports, store, near: null, litAt: lit ? time : null, spentAt: null};
    tile.fuels.push(fuel);
    ledger.laid += amount;
    if (face) listenersStale = true;
    if (lit) active.add(tile);
    return fuel;
  }
  function relink(tile) {
    stats.relinks++;
    const links = [], {i, j, k} = tile;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy && !dz) continue;
      const target = tileAt(i + dx, j + dy, k + dz);
      if (!target) continue;
      let pass = pathPass(i, j, k, [dx, dy, dz]);
      // Rule 5: a wall is one surface from storey to storey (the stud spaces of a balloon frame are open
      // from sill to roof). Two wall surfaces in the same plane, one above the other, pass heat between
      // their tiles as if no floor lay between.
      if (pass < 1 && dz && !dx && !dy) for (const fuel of tile.fuels) {
        if (!fuel.face || fuel.amount <= 0 || fuel.face.axis === 2) continue;
        if (target.fuels.some(other => other.face && other.amount > 0 && other.face.axis === fuel.face.axis && other.face.step === fuel.face.step)) { pass = Math.max(pass, rules.storeyPass); break; }
      }
      const level = dx || dy;
      const direction = dz > 0 ? (level ? rules.upDiagonal : rules.up) : dz < 0 ? (level ? rules.downDiagonal : rules.down) : 1;
      const weight = rules.rate * direction * pass / Math.hypot(dx, dy, dz) ** rules.falloff;
      if (weight > 1e-4) links.push({target, weight});
    }
    tile.links = links;
  }

  function landing(tile) {
    // The first tile below that still has something to stand on.
    for (let k = tile.k; k >= 0; k--) {
      const below = tileAt(tile.i, tile.j, k);
      if (!below) continue;
      if (k === 0 || below.fuels.some(fuel => fuel.supports && fuel.amount > 0)) return below;
    }
    return tileAt(tile.i, tile.j, 0) ?? tile;
  }
  // Rule 7. `rest` is the unburnt remainder of a spent surface: it falls as embers. `loose` is what the
  // tile was holding, if its support went. Nothing is created: embers are the surface's own last share.
  function letGo(tile, rest, loose, cause) {
    const to = landing(tile);
    if (to !== tile) for (const fuel of loose) {
      tile.fuels.splice(tile.fuels.indexOf(fuel), 1);
      to.fuels.push(fuel);
    }
    if (rest > 0) {
      to.fuels.push({cls: 'embers', amount: rest, start: rest, lit: true, char: 0, face: null, supports: false, store: null, near: null, litAt: time, spentAt: null});
      ledger.fellAsEmbers += rest;
    }
    active.add(to);
    if (to === tile) return;
    to.heat = Math.min(rules.maxHeat, to.heat + rules.fallPulse);
    events.push({type: 'fall', cause, time, from: [tile.i, tile.j, tile.k], to: [to.i, to.j, to.k], building: tile.building, carried: loose.map(fuel => fuel.cls), embers: rest});
  }
  function burst(tile, fuel) {
    // Rule 8: the can fails; its oil spreads, lit, over the tiles of its own layer within reach that it
    // can run to without crossing a closed face.
    const cells = [], r = Math.ceil(rules.burstRadius / PITCH);
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.hypot(di, dj) * PITCH > rules.burstRadius) continue;
      const other = tileAt(tile.i + di, tile.j + dj, tile.k);
      if (other && (other === tile || clear(tile, other))) cells.push(other);
    }
    const share = fuel.amount / cells.length;
    fuel.amount = 0; fuel.spentAt = time; ledger.laid -= fuel.start;
    for (const cell of cells) { addFuel(cell, 'oil', share, {lit: true}); cell.heat = Math.min(rules.maxHeat, cell.heat + rules.burstPulse); active.add(cell); }
    events.push({type: 'burst', time, at: [tile.i, tile.j, tile.k], building: tile.building, tiles: cells.length});
  }
  function spend(tile, fuel) {
    const rest = fuel.amount;
    fuel.amount = 0; fuel.lit = false; fuel.spentAt = time;
    if (fuel.face) {
      fuel.face.object.pass = 1; fuel.face.object.kind = 'open';
      faceChanged(tile.i, tile.j, tile.k, fuel.face.axis, fuel.face.step);
      events.push({type: 'opened', time, at: [tile.i, tile.j, tile.k], axis: fuel.face.axis, step: fuel.face.step, cls: fuel.cls, supports: fuel.supports, building: tile.building});
    }
    if (fuel.supports) letGo(tile, rest, tile.fuels.filter(other => !other.face && !other.supports && other.amount > 0), 'floor');
    else if (fuel.face) letGo(tile, rest, [], fuel.face.axis === 2 ? 'roof' : 'wall');
  }

  // Rule 6. A line of sight is clear when every face it crosses is open (or passes at least half).
  function clear(a, b) {
    stats.sightLines++;
    const steps = Math.max(Math.abs(b.i - a.i), Math.abs(b.j - a.j), Math.abs(b.k - a.k)) * 3;
    let ci = a.i, cj = a.j, ck = a.k;
    for (let s = 1; s <= steps; s++) {
      const ni = Math.round(a.i + (b.i - a.i) * s / steps), nj = Math.round(a.j + (b.j - a.j) * s / steps), nk = Math.round(a.k + (b.k - a.k) * s / steps);
      if (ni === ci && nj === cj && nk === ck) continue;
      if (pathPass(ci, cj, ck, [ni - ci, nj - cj, nk - ck]) < rules.sight) return false;
      ci = ni; cj = nj; ck = nk;
    }
    return true;
  }
  // Bookkeeping only: a tile "listens" if some unlit fuel could read the warmth that reaches it (its own,
  // or a surface in the next tile that faces it). Warmth on a tile nothing reads lights nothing, so
  // skipping those tiles changes no measure; review round 2 (S6) found it does change which tiles are
  // awake, and so the order of some events in the log.
  function markListeners() {
    listenersStale = false;
    for (const tile of tiles.values()) for (const fuel of tile.fuels) if (fuel.face) { const other = across(tile, fuel.face); if (other) other.listens = true; }
  }
  // Nothing closed stands between this tile and the sky: no glass, timber or masonry face above it in its column.
  function openToSky(tile, memo) {
    let open = memo.get(tile);
    if (open === undefined) {
      open = true;
      for (let k = tile.k; k <= topLayer && open; k++) if (passOf(faceBetween(tile.i, tile.j, k, 2, 1)) < rules.sight) open = false;
      memo.set(tile, open);
    }
    return open;
  }
  function radiate() {
    if (listenersStale) markListeners();
    const sky = new Map();
    const r = Math.ceil(rules.reach / PITCH), top = Math.floor(rules.reach / LAYER), flux = new Map();
    for (const source of active) {
      if (!(source.radOut > 0) || !rules.reachUnderCover && !openToSky(source, sky)) continue;
      // Reach is level or upward, never down (Rule 4).
      for (let dk = 0; dk <= top; dk++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj), dk) <= 1) continue;
        const distance = Math.hypot(di * PITCH, dj * PITCH, dk * LAYER);
        if (distance > rules.reach) continue;
        const target = tileAt(source.i + di, source.j + dj, source.k + dk);
        if (!target || !(target.listens || target.fuels.some(fuel => !fuel.lit && fuel.amount > 0))) continue;
        if (!rules.reachUnderCover && !openToSky(target, sky)) continue;
        if (!clear(source, target)) continue;
        flux.set(target, (flux.get(target) ?? 0) + source.radOut / distance ** 2);
      }
    }
    for (const tile of warmed) tile.rad = 0;
    warmed = [];
    for (const [tile, amount] of flux) {
      tile.rad = rules.radiantGain * amount; warmed.push(tile); active.add(tile);
      // wake the tiles whose surfaces face this one
      if (tile.listens) for (let axis = 0; axis < 3; axis++) for (const step of [-1, 1]) { const other = tileAt(tile.i + AX[axis][0] * step, tile.j + AX[axis][1] * step, tile.k + AX[axis][2] * step); if (other) active.add(other); }
    }
  }

  function give(tile, spec, share) {
    if (!active.has(tile)) { tile.out = 0; tile.radOut = 0; active.add(tile); }
    tile.out += spec.out * share; tile.radOut += spec.out * (spec.radiates ?? 1) * share;
  }
  function step() {
    time += dt; stats.ticks++;
    // 1. What each burning fuel gives. A surface lit on one side gives that side its heat; the far side's
    // share grows as the surface is consumed (Rule 5), and through a floor to the tile below it is
    // multiplied by Rule 4's "down".
    for (const tile of active) { tile.out = 0; tile.radOut = 0; }
    for (const tile of [...active]) for (const fuel of tile.fuels) if (fuel.lit) {
      const spec = fuels[fuel.cls];
      if (!fuel.face) { give(tile, spec, 1); continue; }
      const other = across(tile, fuel.face), near = fuel.near ?? tile, far = near === tile ? other : tile;
      const burnable = fuel.start * (1 - rules.emberShare), consumed = Math.min(1, (fuel.start - fuel.amount) / burnable);
      let share = consumed ** rules.through;
      give(near, spec, 1 - share);
      if (far) { if (fuel.face.axis === 2 && far.k < near.k) share *= rules.down; give(far, spec, share); }
    }
    for (const tile of active) {
      const out = tile.out;
      if (!out) continue;
      stats.visits++;
      if (!tile.links) relink(tile);
      for (const {target, weight} of tile.links) { target.incoming += dt * weight * out; active.add(target); }
      tile.incoming += dt * rules.rate * out;
    }
    if (stats.ticks % radiantTicks === 0) radiate();
    // 2. Heat first, for every warm tile; then charring and burning. No fuel reads a neighbour's heat from
    // a different step than its own (review round 1, S7).
    for (const tile of active) {
      tile.heat = Math.min(rules.maxHeat, tile.heat + tile.incoming);
      tile.incoming = 0;
      tile.heat -= tile.heat * Math.min(1, rules.loss * dt);
    }
    for (const tile of [...active]) {
      let alive = tile.heat > 1e-3 || tile.rad > 0 || tile.out > 0;
      for (const fuel of [...tile.fuels]) {
        if (fuel.amount <= 0) continue;
        const spec = fuels[fuel.cls];
        if (fuel.lit) {
          const keep = fuel.face || fuel.supports ? fuel.start * rules.emberShare : 0;
          const burn = Math.max(0, Math.min(fuel.amount - keep, dt / spec.burnFor));
          fuel.amount -= burn; ledger.burnt += burn; alive = true;
          if (fuel.amount - keep <= 1e-9) spend(tile, fuel);
          continue;
        }
        let exposure = Math.max(tile.heat, tile.rad), from = null;
        if (fuel.face) { const other = across(tile, fuel.face); if (other) { const there = Math.max(other.heat, other.rad); if (there > exposure) { exposure = there; from = other; } } }
        if (exposure > 1e-3) alive = true;
        if (exposure >= spec.lightAt) {
          fuel.char += dt * exposure / spec.lightAt;
          if (fuel.char >= spec.delay) {
            if (fuel.store === 'oil') { burst(tile, fuel); continue; }
            fuel.lit = true; fuel.litAt = time; fuel.near = from; stats.ignitions++;
            events.push({type: 'lit', time, at: [tile.i, tile.j, tile.k], cls: fuel.cls, building: tile.building, room: tile.room});
          }
        } else if (fuel.char > 0) fuel.char = Math.max(0, fuel.char - dt * rules.charFades);
      }
      // Glass breaks when the tile on either side is hot enough.
      if (tile.heat >= rules.glassBreaks) for (let axis = 0; axis < 2; axis++) for (const stepDir of [-1, 1]) {
        const face = faceBetween(tile.i, tile.j, tile.k, axis, stepDir);
        if (face?.kind === 'glass') { face.kind = 'open'; face.pass = 1; faceChanged(tile.i, tile.j, tile.k, axis, stepDir); events.push({type: 'glass', time, at: [tile.i, tile.j, tile.k], building: tile.building}); }
      }
      if (!alive) { active.delete(tile); tile.out = 0; tile.radOut = 0; tile.heat = 0; }
    }
  }
  // A match. `from` is the tile the match is held in, for a surface: the side it then burns on.
  function ignite(tile, cls, {from = null, fuel = null} = {}) {
    fuel ??= tile.fuels.find(f => f.amount > 0 && !f.lit && (!cls || f.cls === cls));
    if (!fuel) return null;
    fuel.lit = true; fuel.litAt = time; fuel.near = from; active.add(tile);
    events.push({type: 'lit', time, at: [tile.i, tile.j, tile.k], cls: fuel.cls, building: tile.building, room: tile.room, cause: 'match'});
    return fuel;
  }
  const remaining = () => { let sum = 0; for (const tile of tiles.values()) for (const fuel of tile.fuels) sum += fuel.amount; return sum; };
  return {tiles, faces, active, events, ledger, stats, rules, fuels, dt, addTile, tileAt, setFace, addFuel, ignite, step, remaining, across, clear,
    get time() { return time; }, faceBetween};
}
