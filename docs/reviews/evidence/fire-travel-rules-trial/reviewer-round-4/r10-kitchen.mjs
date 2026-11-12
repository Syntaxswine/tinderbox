// Round 4. "The kitchen is slow by where it is" (target 9; cause "not looked into"). Hopkins 15, no stores.
import {burn, plan, round} from '../measure.mjs';
const NO_STORES = {furniture: true, lacquer: 'some'}, p = plan('hopkins-4-15');
for (const [f, floor] of p.floors.entries()) {
  console.log('floor ' + f + ' connections ' + JSON.stringify(floor.connections) + ' open ' + JSON.stringify(floor.openConnections ?? []) + ' stairs ' + JSON.stringify(floor.stairs));
  for (const r of floor.rooms) { const xs = r.polygon.map(q => q[0]), zs = r.polygon.map(q => q[1]); console.log('  ' + r.id.padEnd(10) + r.type.padEnd(10) + ' x ' + Math.min(...xs) + '..' + Math.max(...xs) + ' z ' + Math.min(...zs) + '..' + Math.max(...zs)); }
}
for (const at of ['room:0:kitchen', 'room:0:dining', 'room:0:living', 'room:0:parlor', 'room:0:hall', 'room:0:pantry']) {
  const r = burn({at, seconds: 150, contents: NO_STORES});
  const ev = r.world.events.filter(e => e.building === 'A' && e.type === 'lit');
  const firstIn = {}; for (const e of ev) if (!(e.room in firstIn)) firstIn[e.room] = e.time;
  const own = 'A/0:' + at.split(':')[2];
  const centre = r.a.rooms.get(own).centre, cells = r.a.rooms.get(own).cells.length;
  // what in the struck room has a roof (nothing above) and how many outside wall faces
  const tiles = r.a.rooms.get(own).tiles, roofs = tiles.reduce((n, t) => n + t.fuels.filter(x => x.cls === 'roof').length, 0), clap = tiles.reduce((n, t) => n + t.fuels.filter(x => x.cls === 'clapboard').length, 0), parts = tiles.reduce((n, t) => n + t.fuels.filter(x => x.cls === 'partition' || x.cls === 'door').length, 0);
  const lit = t => ev.filter(e => e.time <= t).length;
  console.log(at.padEnd(16) + ' cells ' + String(cells).padEnd(4) + ' roof faces in room ' + String(roofs).padEnd(3) + ' clapboard ' + String(clap).padEnd(3) + ' partition/door owned ' + String(parts).padEnd(3) + ' | room alight ' + round(r.roomAll) + ' s, half ' + round(r.half) + ' s, first lit upstairs ' + round(r.upstairsLit?.time) + ' s; fuels lit by 10/20/30/40 s: ' + [10, 20, 30, 40].map(lit).join('/') + ' of ' + r.n
    + '; rooms reached in order: ' + Object.entries(firstIn).filter(([room]) => room !== own).sort((x, y) => x[1] - y[1]).slice(0, 6).map(([room, t]) => room.slice(2) + ' ' + round(t, 1)).join(', '));
}
