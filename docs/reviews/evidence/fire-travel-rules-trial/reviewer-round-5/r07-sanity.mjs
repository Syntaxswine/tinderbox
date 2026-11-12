// Determinism, visiting order, conservation and sanity on the current kernel.
//   node reviewer-round-5/r07-sanity.mjs control     measure-var + ../kernel.mjs and kernel-var.mjs with no switch against the author's measure.mjs
//   KERNEL=./kernel-var.mjs node reviewer-round-5/r07-sanity.mjs order     visiting order scrambled (seeds 1 to 3) against the kernel's own order
//   node reviewer-round-5/r07-sanity.mjs sanity      420 s burns: ledger, amounts, hottest tile, active set, never lit
const mode = process.argv[2] ?? 'sanity';
const M = await import('./measure-var.mjs');
const {burn, round, lawn} = M;
const CASES = [['hopkins-4-15', 'wall:x+:19:4'], ['hopkins-4-15', 'room:1:bed-a'], ['hopkins-4-12', 'room:0:kitchen'], ['ashland-worker', 'room:0:kitchen'], ['monroe-row', 'room:0:parlor'], ['hopkins-4-13', 'wall:y+:8:15'], ['hopkins-4-09', 'room:1:bed-a'], ['hopkins-4-15', 'wall:y-:10:0']];
const sig = r => r.world.events.map(e => e.type + '@' + e.time.toFixed(4) + ':' + (e.at ?? e.from).join(',') + ':' + (e.cls ?? e.cause ?? '')).sort();
const measures = r => [round(r.roomAll), round(r.half), round(r.flameUntil), round(r.fall?.time), round(r.groundLit?.time), round(r.fallToGround?.time)].join(' | ');
if (mode === 'control') {
  const A = await import('../measure.mjs');
  for (const [planId, at] of CASES.slice(0, 4)) {
    const a = A.burn({planId, at, seconds: 150}), b = burn({planId, at, seconds: 150});
    const sa = sig(a), sb = sig(b);
    console.log(planId + ' ' + at + ': ' + sa.length + ' events; copy ' + (process.env.KERNEL ?? '../kernel.mjs') + ' identical: ' + (sa.length === sb.length && sa.every((s, n) => s === sb[n])));
  }
}
if (mode === 'order') {
  let movedTotal = 0, worst = 0, measuresMoved = 0;
  for (const [planId, at] of CASES) {
    const base = burn({planId, at, seconds: 300}), again = burn({planId, at, seconds: 300}), s0 = sig(base), s1 = sig(again);
    const same = s0.length === s1.length && s0.every((s, n) => s === s1[n]);
    const line = [planId + ' ' + at + ': ' + s0.length + ' events; two runs identical: ' + same];
    for (const seed of [1, 2, 3]) {
      const r = burn({planId, at, seconds: 300, rules: {shuffle: seed}});
      // compare lighting times fuel by fuel (same build order, so the same index is the same fuel)
      const fuelsOf = x => [...x.world.tiles.values()].flatMap(tile => tile.fuels.filter(f => f.cls !== 'embers' && f.cls !== 'oil').map(f => [tile.id + ':' + f.cls + ':' + (f.face ? f.face.axis + '' + f.face.step : ''), f.litAt]));
      const b = new Map(fuelsOf(base)); let moved = 0, big = 0;
      for (const [key, litAt] of fuelsOf(r)) { const other = b.get(key); if (other === undefined) continue; if ((litAt === null) !== (other === null)) { moved++; big = Infinity; } else if (litAt !== null && Math.abs(litAt - other) > 1e-9) { moved++; big = Math.max(big, Math.abs(litAt - other)); } }
      movedTotal += moved; worst = Math.max(worst, big); const mm = measures(r) !== measures(base); if (mm) measuresMoved++;
      line.push('seed ' + seed + ': ' + moved + ' lighting times moved, worst ' + (Number.isFinite(big) ? big.toFixed(3) + ' s' : 'lit/never') + (mm ? '; MEASURES MOVED: ' + measures(base) + '  ->  ' + measures(r) : ''));
    }
    console.log(line.join('\n    '));
  }
  console.log('total: ' + movedTotal + ' lighting times moved over ' + CASES.length * 3 + ' scrambled burns, worst ' + worst.toFixed(3) + ' s; burns with a moved measure: ' + measuresMoved);
}
if (mode === 'sanity') {
  for (const [planId, at] of CASES) {
    let hottest = 0, negative = 0;
    const r = burn({planId, at, seconds: 420}), world = r.world;
    for (const tile of world.tiles.values()) { for (const f of tile.fuels) if (f.amount < -1e-12) negative++; }
    const unburnt = [...world.tiles.values()].flatMap(tile => tile.fuels).filter(f => f.amount > 1e-9);
    const neverWorld = [...world.tiles.values()].flatMap(tile => tile.fuels).filter(f => f.litAt === null && f.amount > 0 && f.store !== 'oil');
    console.log(planId.padEnd(15) + at.padEnd(15) + ' ledger ' + r.ledger.toExponential(1) + '; negative amounts ' + negative + '; active at 420 s ' + world.active.size + '; fuel left unburnt ' + unburnt.length + ' (' + [...new Set(unburnt.map(f => f.cls))].join(',') + '); never lit in the whole world ' + neverWorld.length + '; peak active ' + r.peakActive);
  }
  // one on a lawn, with a second house, hottest tile tracked every step
  const A = await import('./measure-var.mjs');
  const world = A.make(), a = A.house(world, 'A', 'hopkins-4-15', 6, 6, A.ALL); A.house(world, 'B', 'hopkins-4-12', 6 + a.plan.width + 3, 6, A.ALL); lawn(world, 0, 0, 70, 50);
  world.ignite(world.tileAt(1, 20, 0)); let hottest = 0, peak = 0;
  for (let n = 0; n < 30 * 500; n++) { world.step(); if (n % 7 === 0) for (const tile of world.active) if (tile.heat > hottest) hottest = tile.heat; if (world.active.size > peak) peak = world.active.size; }
  const left = [...world.tiles.values()].flatMap(tile => tile.fuels).filter(f => f.amount > 1e-9);
  console.log('two houses on a lawn, lawn lit, 500 s: ledger ' + (world.ledger.laid - world.ledger.burnt - world.remaining()).toExponential(1) + '; hottest tile ' + hottest.toFixed(4) + '; peak active ' + peak + '; active at the end ' + world.active.size + '; fuel left ' + left.length + ' (' + [...new Set(left.map(f => f.cls))].join(',') + ')');
}
