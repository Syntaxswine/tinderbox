// Round 7. Trace how one grass tile lights in an upstairs fire. Steps the author's kernel by hand (same calls as burn()).
//   node r11-trace-grass.mjs <plan> <strike> <i> <j>
import {make, house, lawn, strike, round, ALL, PITCH} from '../measure.mjs';
const [planId, at, gi, gj] = process.argv.slice(2);
const world = make(), a = house(world, 'A', planId, 6, 6, ALL);
lawn(world, 0, 0, Math.round((6 + a.plan.width + 6) / PITCH), Math.round((6 + a.plan.depth + 6) / PITCH));
strike(world, a, at);
const g = world.tileAt(+gi, +gj, 0), grass = g.fuels.find(f => f.cls === 'grass');
let last = '';
for (let n = 0; n < 30 * 120 && grass.litAt === null; n++) {
  world.step();
  if (g.heat > .3 && n % 15 === 0 || grass.char > 0) {
    // who is sending: every tile within one step that has output
    const senders = [];
    for (let dz = 0; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const t = world.tileAt(g.i + dx, g.j + dy, dz); if (!t || !(t.out > 0)) continue;
      const link = t === g ? {weight: world.rules.rate} : t.links?.find(l => l.target === g);
      if (link) senders.push('(' + dx + ',' + dy + ',' + dz + ') out ' + round(t.out) + ' x ' + round(link.weight, 3) + ' [' + t.fuels.filter(f => f.lit).map(f => f.cls + (f.face ? ' face' : '')).join('+') + (t.building ? '' : ' unlabelled') + ']');
    }
    const line = 'heat ' + round(g.heat, 3) + ' char ' + round(grass.char, 3) + ' <- ' + senders.join('; ');
    if (line !== last) console.log(round(world.time) + ' s: ' + line);
    last = line;
  }
}
console.log('grass lit at ' + round(grass.litAt) + '; fuels now in the tile: ' + g.fuels.map(f => f.cls + ' ' + round(f.amount)).join(', '));
console.log('falls into the tile or the 8 round it, ground layer, before then: ' + world.events.filter(e => e.type === 'fall' && Math.abs(e.to[0] - g.i) <= 1 && Math.abs(e.to[1] - g.j) <= 1 && e.to[2] === 0).map(e => round(e.time) + ' ' + e.cause + ' from k' + e.from[2] + ' at ' + e.to + ' embers ' + round(e.embers, 3) + ' carried ' + e.carried.length).join(' | '));
