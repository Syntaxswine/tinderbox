// Round 1, probe 8: (a) conservation and sanity over 600 s; (b) what each behaviour in kernel.mjs that the twelve rules
// do not state (or state differently) is worth: switch it off and re-measure.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r08-conservation-and-hidden-rules.mjs
import {burn, ALL, round, out} from './lib.mjs';
const lines = [], pad = (s, n) => String(s ?? 'never').padEnd(n);
const strikeTrial = (world, a) => { const t = world.tileAt(a.origin[0] + 19, a.origin[1] + 4, 0); world.ignite(t, 'clapboard'); return t.room; };

// (a)
{
  const marks = {};
  const r = burn({seconds: 600, strike: strikeTrial, each: world => {
    const t = Math.round(world.time * 30);
    if (t === 300 * 30 || t === 600 * 30 || t === 150 * 30) {
      const left = {}; let n = 0;
      for (const tile of world.tiles.values()) for (const f of tile.fuels) if (f.amount > 0) { const k = f.cls + (f.lit ? ' burning' : ' unlit'); left[k] = round((left[k] ?? 0) + f.amount, 2); n++; }
      marks[t / 30] = {active: world.active.size, warm: [...world.active].filter(x => x.heat > .05).length, left, laid: world.ledger.laid, burnt: world.ledger.burnt};
    }
  }});
  const w = r.world, byCls = {}; for (const x of r.initial) byCls[x.cls] = round((byCls[x.cls] ?? 0) + x.fuel.start, 2);
  lines.push('(a) Hopkins 15, furnished, the trial strike, one house, 600 s.');
  lines.push('    fuel laid before the match: ' + round(r.laid0, 2) + ' tile-fulls in ' + r.n + ' fuels: ' + JSON.stringify(byCls));
  lines.push('    embers created during the run: ' + round(w.ledger.embersMade, 2) + ' tile-fulls in ' + w.events.filter(e => e.type === 'fall').length + ' "fall" events = ' + round(100 * w.ledger.embersMade / r.laid0, 1) + ' % of the fuel laid. ledger.laid went from ' + round(r.laid0, 2) + ' to ' + round(w.ledger.laid, 2) + '.');
  lines.push('    so "laid - burnt - left" = ' + r.ledger.toExponential(1) + ' closes only because created embers are added to "laid" (kernel.mjs addFuel). Against the fuel actually laid: burnt ' + round(w.ledger.burnt, 2) + ' + left ' + round(w.remaining(), 2) + ' - laid ' + round(r.laid0, 2) + ' = ' + round(w.ledger.burnt + w.remaining() - r.laid0, 2) + ' tile-fulls from nothing.');
  const self = w.events.filter(e => e.type === 'fall' && e.from.join() === e.to.join());
  lines.push('    "fall" events whose landing tile is the tile itself: ' + self.length + ' of ' + w.events.filter(e => e.type === 'fall').length + ' (each still adds embers and a heat pulse of ' + w.rules.fallPulse + '); of these on the ground storey from a spent floor: ' + self.filter(e => e.cause === 'floor').length);
  lines.push('    unlit fuels switched to burning by a fall (no heat test): ' + w.stats.litOnFall);
  lines.push('    heat: max ' + round(w.stats.maxHeat, 3) + ' (cap ' + w.rules.maxHeat + '), min ' + w.stats.minHeat + '; radiant channel max ' + round(w.stats.maxRad, 2) + ' (not capped, not heat: a fuel chars on max(heat, radiant))');
  for (const t of [150, 300, 600]) lines.push('    at ' + t + ' s: active tiles ' + marks[t].active + ' (heat > 0.05: ' + marks[t].warm + '), fuel left ' + JSON.stringify(marks[t].left));
  lines.push('    fuels never lit and not spent at 600 s: ' + r.never + ' ' + JSON.stringify(r.neverBy));
}

// (b)
const cases = [
  ['as written (CONTROL)', {}, {}],
  ['no "inside" loss split: every tile loses 2 /s (lossInside 2, no per-face term)', {}, {lossInside: 2, lossPerOpenFace: 0}],
  ['enclosure as Rule 3 says: inside 0.5 /s + 1 per open face, outdoors 2 /s', {}, {lossInside: .5}],
  ['inside tiles lose LESS than outdoors by half: lossInside 1', {}, {lossInside: 1}],
  ['no ceiling-to-sideways share (Rule 4 para 2)', {noCeilingSpread: true}, {}],
  ['no "a wall is one surface storey to storey"', {noWallContinuity: true}, {}],
  ['wall continuity upward only', {wallContinuityUpOnly: true}, {}],
  ['no one-sided burning of surfaces', {noOneSided: true}, {}],
  ['reach also works inside one building (drop the `building` test)', {radiateWithinBuilding: true}, {}],
  ['reach warms any tile with fuel (drop the `radiantTarget` flag)', {radiateToAll: true}, {}],
  ['both of the last two', {radiateWithinBuilding: true, radiateToAll: true}, {}],
  ['oil burst spreads to any tile in radius (drop the `room` test)', {burstAnyRoom: true}, {}],
  ['a fall does not light unlit fuel (it keeps its state)', {fallKeepsState: true}, {}],
  ['no embers from spent faces', {noFaceEmbers: true}, {}],
  ['no embers at all', {noFaceEmbers: true, noFloorEmbers: true}, {}],
  ['Rule 4 as first written: down 0.25, diagonal down 0.4', {}, {down: .25, downDiagonal: .4}],
  ['Rule 5 as first written: timber 0.1, glass 0.15, masonry 0.02', {}, {pass: {timber: .1, glass: .15, masonry: .02}}]
];
lines.push('', '(b) Hopkins 15 furnished + empty neighbour B at 2 m, the trial strike, 160 s. Each line switches ONE thing.');
lines.push(pad('variant', 82) + pad('4 room s', 10) + pad('5 half s', 10) + pad('6 flame s', 11) + pad('7 fall s', 10) + pad('11 B lit s', 12) + 'never lit');
for (const [name, variant, rules] of cases) {
  const r = burn({seconds: 160, neighbours: [['B', 18, 6]], world: {variant, rules}, strike: strikeTrial});
  lines.push(pad(name, 82) + pad(round(r.roomAll), 10) + pad(round(r.half), 10) + pad(round(r.flameUntil) + (r.flameUntil >= 159 ? '+' : ''), 11) + pad(round(r.fall?.time), 10) + pad(round(r.neighbours.B), 12) + r.never);
}
out('r08-conservation-and-hidden-rules.txt', lines);
