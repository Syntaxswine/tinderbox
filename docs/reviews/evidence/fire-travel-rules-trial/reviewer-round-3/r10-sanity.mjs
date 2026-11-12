// Conservation, bounds, determinism, visiting order, drain.
//   node r10-sanity.mjs determinism     two identical runs: identical event logs (4 scenes)
//   node r10-sanity.mjs bounds          heat within [0, 3] every step; no negative amounts; my own fuel sum before the match = burnt + left; oil burst and ledger.laid; active set drains
//   node r10-sanity.mjs order           visiting order scrambled before every step (the active Set is rebuilt in a seeded random order): lighting times moved
import {burn, make, house, strike, ALL, round, hashEvents, lawn} from './lib.mjs';
const mode = process.argv[2] ?? 'determinism';
const CASES = [['hopkins-4-15', 'room:0:kitchen'], ['hopkins-4-12', 'wall:x+:15:7'], ['monroe-row', 'room:1:bed-a'], ['ashland-worker', 'wall:y-:5:0:in']];
if (mode === 'determinism') for (const [planId, at] of CASES) {
  const a = burn({planId, at, seconds: 200, neighbours: [['B', 6 + 12, 6]], before: w => lawn(w, 0, 0, 60, 50)}), b = burn({planId, at, seconds: 200, neighbours: [['B', 6 + 12, 6]], before: w => lawn(w, 0, 0, 60, 50)});
  console.log(planId, at, 'events', a.world.events.length, b.world.events.length, hashEvents(a.world.events), hashEvents(b.world.events), hashEvents(a.world.events) === hashEvents(b.world.events) ? 'IDENTICAL' : 'DIFFERENT');
}
if (mode === 'bounds') for (const [planId, at] of CASES) {
  const world = make(), a = house(world, 'A', planId, 6, 6, ALL);
  let laid = 0; for (const t of world.tiles.values()) for (const f of t.fuels) laid += f.amount;
  const everLit = new Set(), allFuels = []; for (const t of world.tiles.values()) for (const f of t.fuels) allFuels.push(f);
  strike(world, a, at);
  let maxHeat = 0, minHeat = 0, minAmount = 0, maxRad = 0, peakActive = 0, bursts = 0;
  for (let s = 0; s < 420 * 30; s++) {
    world.step();
    if (s % 15 === 0) for (const t of world.tiles.values()) { if (t.heat > maxHeat) maxHeat = t.heat; if (t.heat < minHeat) minHeat = t.heat; if (t.rad > maxRad) maxRad = t.rad; for (const f of t.fuels) if (f.amount < minAmount) minAmount = f.amount; }
    if (world.active.size > peakActive) peakActive = world.active.size;
  }
  bursts = world.events.filter(e => e.type === 'burst').length;
  const left = world.remaining(), never = allFuels.filter(f => f.litAt === null && f.amount > 0 && f.store !== 'oil').length, burning = [...world.tiles.values()].flatMap(t => t.fuels).filter(f => f.lit).length;
  // hanging: loose fuel (no face, not a support) in a tile above ground with no live support under it
  let hanging = 0; for (const t of world.tiles.values()) if (t.k > 0) for (const f of t.fuels) if (!f.face && !f.supports && f.amount > 0 && !t.fuels.some(o => o.supports && o.amount > 0)) hanging++;
  // standing: wall or roof surfaces still unspent in a tile whose floor has gone, sampled at the end (should be 0 at 420 s) - see r10 stand
  console.log(planId.padEnd(15), at.padEnd(16), 'my sum before match ' + round(laid, 3) + ', ledger.laid at end ' + round(world.ledger.laid, 3) + ', burnt ' + round(world.ledger.burnt, 3) + ', left ' + round(left, 3) + ', my sum - burnt - left = ' + (laid - world.ledger.burnt - left).toExponential(1)
    + ' | heat ' + round(minHeat, 3) + ' to ' + round(maxHeat, 3) + ', reach warmth max ' + round(maxRad, 2) + ', min amount ' + minAmount + ' | bursts ' + bursts + ' | never lit ' + never + ', still burning at 420 s ' + burning + ', loose fuel hanging ' + hanging + ', active at 420 s ' + world.active.size + ' (peak ' + peakActive + ')');
}
if (mode === 'stand') for (const [planId, at] of CASES.slice(0, 3)) {
  // Rule 7: "a part of a house comes down when what held it has burnt". Count upper-storey wall and roof surfaces still unspent
  // in tiles whose own floor (or, for the upper half-storey, the floor one tile down) is already spent.
  const world = make(), a = house(world, 'A', planId, 6, 6, ALL); strike(world, a, at);
  const log = [];
  for (let s = 1; s <= 200 * 30; s++) {
    world.step();
    if (s % 300 === 0) {
      let unsupported = 0, burningUnsupported = 0, unlitUnsupported = 0;
      for (const rec of a.rooms.values()) if (rec.floor > 0) for (const t of rec.tiles) {
        const base = world.tileAt(t.i, t.j, 2 * rec.floor), floorLive = base.fuels.some(f => f.supports && f.amount > 0), hadFloor = base.fuels.some(f => f.supports);
        if (!hadFloor || floorLive) continue;
        for (const f of t.fuels) if (f.face && !f.supports && f.amount > 0) { unsupported++; if (f.lit) burningUnsupported++; else unlitUnsupported++; }
      }
      log.push((s / 30) + ' s: ' + unsupported + ' (' + unlitUnsupported + ' not yet lit)');
    }
  }
  console.log(planId, at, 'wall, partition and roof surfaces still in place over a spent floor: ' + log.join(', '));
}
if (mode === 'order') {
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  const runOnce = (planId, at, scramble) => {
    const world = make(), a = house(world, 'A', planId, 6, 6, ALL), initial = [];
    for (const rec of a.rooms.values()) for (const t of rec.tiles) for (const f of t.fuels) initial.push(f);
    strike(world, a, at);
    for (let s = 0; s < 150 * 30; s++) {
      if (scramble) { const list = [...world.active]; for (let n = list.length - 1; n > 0; n--) { const m = Math.floor(rnd() * (n + 1)); [list[n], list[m]] = [list[m], list[n]]; } world.active.clear(); for (const t of list) world.active.add(t); }
      world.step();
    }
    const times = initial.map(f => f.litAt), sorted = times.filter(v => v !== null).sort((x, y) => x - y);
    return {world, times, half: sorted[Math.ceil(initial.length / 2) - 1], firstFall: world.events.find(e => e.type === 'fall')?.time};
  };
  for (const [planId, at] of CASES) {
    const control = burn({planId, at, seconds: 150}), base = runOnce(planId, at, false), mixed = runOnce(planId, at, true);
    let moved = 0, worst = 0; for (let n = 0; n < base.times.length; n++) { const d = Math.abs((base.times[n] ?? -1) - (mixed.times[n] ?? -1)); if (d > 1e-9) moved++; if (d > worst) worst = d; }
    console.log(planId.padEnd(15), at.padEnd(16), 'control: my unscrambled run has the same event log as burn(): ' + (hashEvents(control.world.events) === hashEvents(base.world.events)) + ' | scrambled order: ' + moved + ' of ' + base.times.length + ' lighting times moved, worst ' + round(worst, 3) + ' s; half ' + round(base.half) + ' against ' + round(mixed.half) + '; first fall ' + round(base.firstFall) + ' against ' + round(mixed.firstFall) + '; same log: ' + (hashEvents(base.world.events) === hashEvents(mixed.world.events)));
  }
}
