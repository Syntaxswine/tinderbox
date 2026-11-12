// Round 4. Why five climb ratios are below 2.5 (target 3, "not looked into"): the up and along times of the
// three survey walls behind a porch, with the porch and (scene-var switch) without.
import {burn, round, LAYER, SWITCH} from './measure-var.mjs';
for (const [planId, at] of [['hopkins-4-15', 'wall:y-:10:0'], ['hopkins-4-12', 'wall:y-:8:0'], ['hopkins-4-13', 'wall:y-:8:0'], ['hopkins-4-15', 'wall:x+:19:10']]) for (const noPorch of [false, true]) {
  SWITCH.noPorch = noPorch;
  const r = burn({planId, at, seconds: 60}), world = r.world, {tile, fuel} = r.struck.wall;
  const same = t => t?.fuels.find(f => (f.cls === 'clapboard' || f.cls === 'door') && f.face && f.face.axis === fuel.face.axis && f.face.step === fuel.face.step);
  const column = []; for (let k = 0; same(world.tileAt(tile.i, tile.j, k)); k++) column.push(round(same(world.tileAt(tile.i, tile.j, k)).litAt));
  const along = [6, -6].map(d => round(same(world.tileAt(tile.i + d, tile.j, 0) ?? null)?.litAt ?? same(world.tileAt(tile.i, tile.j + d, 0))?.litAt));
  const top = column.length - 1;
  console.log(planId.padEnd(14) + at.padEnd(15) + (noPorch ? 'no porch ' : 'porch    ') + 'wall lit at, layer 0 up: ' + column.join(', ') + ' s -> up ' + round(top * LAYER / column[top]) + ' m/s; 3 m along lit at ' + along.join(' and ') + ' s -> along ' + along.map(v => round(3 / v)).join(' and ') + ' m/s; ratio ' + JSON.stringify(r.climb?.map(v => round(v))));
}
SWITCH.noPorch = false;
