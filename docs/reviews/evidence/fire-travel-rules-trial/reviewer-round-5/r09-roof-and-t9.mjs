// (a) How long a roof really takes to catch in a house burn: for every roof surface, the time from the first step its
//     exposure (the hotter of its two tiles) is at or above its lighting point to the step it lights. Roof delay 8 s and 3 s.
// (b) Target 9 as written: "A kitchen fire against a BEDROOM fire, same house". The trial compares kitchen with dining room.
//   node reviewer-round-5/r09-roof-and-t9.mjs
import {make, burn, house, strike, round, median, PLANS, ALL} from '../measure.mjs';
const NO_STORES = {furniture: true, lacquer: 'some'};
for (const delay of [8, 3]) {
  const waits = [], classes = {};
  for (const [planId, at] of [['hopkins-4-15', 'room:0:kitchen'], ['hopkins-4-12', 'wall:x+:15:7'], ['ashland-worker', 'room:0:kitchen'], ['monroe-row', 'room:0:parlor']]) {
    const world = make({}, {roof: {delay}}), a = house(world, 'A', planId, 6, 6, ALL);
    strike(world, a, at);
    const surfaces = [...world.tiles.values()].flatMap(tile => tile.fuels.filter(f => f.face).map(f => ({f, tile, other: world.across(tile, f.face), first: null})));
    for (let n = 0; n < 30 * 150; n++) {
      world.step();
      for (const s of surfaces) if (s.first === null && !s.f.lit && s.f.litAt === null && Math.max(s.tile.heat, s.other?.heat ?? 0) >= world.fuels[s.f.cls].lightAt) s.first = world.time;
    }
    for (const s of surfaces) if (s.first !== null && s.f.litAt !== null) { (classes[s.f.cls] ??= []).push(s.f.litAt - s.first); }
  }
  console.log('roof delay ' + delay + ' s, four burns: time from first exposure at or above the lighting point to lighting, by surface class');
  for (const [cls, list] of Object.entries(classes)) console.log('   ' + cls.padEnd(10) + String(list.length).padStart(5) + ' surfaces: median ' + round(median(list)) + ' s, 10th to 90th centile ' + round([...list].sort((p, q) => p - q)[Math.floor(.1 * list.length)]) + ' to ' + round([...list].sort((p, q) => p - q)[Math.floor(.9 * list.length)]) + ' s   (table delay ' + world_delay(cls, delay) + ' s)');
}
function world_delay(cls, roofDelay) { return cls === 'roof' ? roofDelay : {clapboard: 4.5, partition: 5, door: 4.5, frame: 3}[cls]; }
console.log('target 9 as written: kitchen fire against bedroom fire, same house, 500 s each');
for (const planId of PLANS) {
  const w = make(), a = house(w, 'A', planId, 6, 6, ALL), beds = [...a.rooms.values()].filter(r => r.type === 'bedroom'), kitchen = [...a.rooms.values()].find(r => r.type === 'kitchen');
  if (!kitchen || !beds.length) { console.log('   ' + planId + ': no kitchen or no bedroom'); continue; }
  const k = burn({planId, at: 'room:' + kitchen.floor + ':' + kitchen.id, seconds: 500}), k0 = burn({planId, at: 'room:' + kitchen.floor + ':' + kitchen.id, seconds: 500, contents: NO_STORES});
  const line = ['   ' + planId.padEnd(15) + 'kitchen: half ' + round(k.half) + ' s (no stores ' + round(k0.half) + '), last flame ' + round(k.flameUntil) + ' s, coal out ' + round(k.burningUntil) + ' s'];
  for (const b of beds) { const r = burn({planId, at: 'room:' + b.floor + ':' + b.id, seconds: 500}), r0 = burn({planId, at: 'room:' + b.floor + ':' + b.id, seconds: 500, contents: NO_STORES}); line.push('bedroom ' + b.id + ' (floor ' + b.floor + '): half ' + round(r.half) + ' s (no stores ' + round(r0.half) + '), last flame ' + round(r.flameUntil) + ' s, coal out ' + round(r.burningUntil) + ' s'); }
  console.log(line.join('\n      '));
}
