// Round 2. Target 9: why does the kitchen fire take the house more slowly than the dining-room fire?
// The record says this "was not looked into". Isolate it: same strikes with and without the oil, and the
// spread of "half the house" over all ground-floor room strikes with no contents but the lit furniture.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r09-kitchen.mjs
import {burn, strikesOf, round, PLANS, ALL} from './measure-var.mjs';
const sets = {all: ALL, 'no oil': {...ALL, oil: false}, 'no coal': {...ALL, coal: false}, 'no oil, no coal': {...ALL, oil: false, coal: false}, 'furniture only, no lacquer': {furniture: true}, 'all furniture lacquered': {...ALL, lacquer: 'all'}};
const wreck = r => { let heat = 0, lit = {}; for (const t of r.world.tiles.values()) { heat += t.heat; for (const f of t.fuels) if (f.lit) lit[f.cls] = (lit[f.cls] ?? 0) + 1; } return 'heat summed over all tiles ' + round(heat, 2) + ', burning ' + JSON.stringify(lit); };
console.log('Hopkins 15');
for (const [name, contents] of Object.entries(sets)) {
  const k = burn({at: 'room:0:kitchen', contents, seconds: 300}), d = burn({at: 'room:0:dining', contents, seconds: 300});
  console.log(name.padEnd(28), 'kitchen: room', round(k.roomAll), 'half', round(k.half), '| dining: room', round(d.roomAll), 'half', round(d.half), '| kitchen later by', round(k.half - d.half), 's | at 300 s: kitchen', wreck(k), '; dining', wreck(d));
}
// How much does "half" move between ground rooms of the same house with nothing in them but the lit furniture? If the
// kitchen-dining difference sits inside that spread, it is where the room is, not what is in it.
for (const planId of PLANS) {
  const out = [];
  for (const at of strikesOf(planId).filter(s => s.startsWith('room:0'))) {
    const plain = burn({planId, at, contents: {furniture: true}, seconds: 150}), full = burn({planId, at, seconds: 150});
    out.push(at.split(':')[2] + ' ' + round(plain.half, 1) + ' / ' + round(full.half, 1) + ' (room ' + round(plain.roomAll, 1) + ' / ' + round(full.roomAll, 1) + ')');
  }
  console.log(planId.padEnd(15), 'half the house, furniture only / all contents:', out.join('; '));
}
// Timeline of the two Hopkins 15 fires: fuels ever lit at 10 s marks.
for (const at of ['room:0:kitchen', 'room:0:dining']) for (const contents of [ALL, {...ALL, oil: false}]) {
  const r = burn({at, contents, seconds: 80});
  const marks = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(t => r.initial.filter(x => x.fuel.litAt !== null && x.fuel.litAt <= t).length);
  const up = r.initial.filter(x => x.room.includes('/1:') && x.fuel.litAt !== null).map(x => x.fuel.litAt).sort((p, q) => p - q)[0];
  console.log(at.padEnd(15), contents.oil ? 'with oil' : 'no oil  ', 'fuels lit by 5..50 s:', marks.join(' '), 'of', r.n, '| first upstairs fuel lit', round(up), '| glass broken by 30 s:', r.world.events.filter(e => e.type === 'glass' && e.time <= 30).length, '| doors spent by 30 s:', r.world.events.filter(e => e.type === 'opened' && e.cls === 'door' && e.time <= 30).length);
}
