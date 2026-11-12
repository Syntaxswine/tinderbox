// Round 1, probe 6: how fire goes down, how it goes up, and whether a shut room holds it.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r06-up-down-and-rooms.mjs
import {burn, round, out, HOUSING_PLANS} from './lib.mjs';
const lines = [], pad = (s, n) => String(s ?? 'never').padEnd(n);
const two = Object.keys(HOUSING_PLANS).filter(id => HOUSING_PLANS[id].floors.length > 1);
const FURN = {furniture: true};

// (a) DOWN. Upstairs strike. When is the first ground-storey fuel lit, with and without the embers that a spent wall, door or roof face drops?
lines.push('(a) DOWN: furniture lit in an upstairs room, furnished house, 120 s.');
lines.push('    "embers" = the kernel as written. "no face embers" = a spent wall/door/roof face drops nothing (floors still fall with their load).');
lines.push('    "no wall rule" = also without "a wall is one surface from storey to storey". ground = first fuel on the ground storey (k < 2) to light by heat.');
lines.push(pad('plan', 14) + pad('room', 10) + pad('first fall to ground (cause, at)', 36) + pad('ground lit', 12) + pad('lag s', 8) + pad('| no face embers: ground lit', 30) + pad('first floor falls', 19) + pad('| +no wall rule: ground lit', 28) + 'max ground heat before any fall');
let downByHeat = 0, total = 0, lagOver5 = 0;
for (const planId of two) {
  const rooms = HOUSING_PLANS[planId].floors[1].rooms.map(r => r.id);
  for (const id of rooms) {
    const label = 'A/1:' + id;
    const run = variant => {
      let maxGround = 0, fallen = false;
      const r = burn({planId, contents: FURN, seconds: 120, world: {variant}, strike: (world, a) => { world.ignite(a.rooms.get(label).centre, 'furniture'); return label; },
        each: (world) => { if (fallen) return; if (world.events.some(e => e.type === 'fall' && e.to[2] < 2)) { fallen = true; return; } if (world.stats.ticks % 5 === 0) for (const t of world.active) if (t.k < 2 && t.heat > maxGround) maxGround = t.heat; }});
      const ev = r.world.events;
      return {fall: ev.find(e => e.type === 'fall' && e.from[2] >= 2 && e.to[2] < 2), floorFall: ev.find(e => e.type === 'fall' && e.cause === 'floor' && e.from[2] >= 2), ground: ev.find(e => e.type === 'lit' && e.at[2] < 2), maxGround};
    };
    const base = run({}), noEmbers = run({noFaceEmbers: true}), noWall = run({noFaceEmbers: true, noWallContinuity: true});
    total++;
    const heatFirst = noEmbers.ground && (!noEmbers.floorFall || noEmbers.ground.time < noEmbers.floorFall.time);
    if (heatFirst) downByHeat++;
    const lag = base.ground && base.fall ? base.ground.time - base.fall.time : null; if (lag > 5) lagOver5++;
    lines.push(pad(planId, 14) + pad(id, 10) + pad(round(base.fall?.time) + ' s ' + base.fall?.cause + ' ' + base.fall?.to, 36) + pad(round(base.ground?.time) + ' ' + base.ground?.cls, 12) + pad(round(lag), 8)
      + pad('| ' + round(noEmbers.ground?.time) + ' s ' + noEmbers.ground?.cls + ' at ' + noEmbers.ground?.at, 30) + pad(round(noEmbers.floorFall?.time) + ' s', 19) + pad('| ' + round(noWall.ground?.time) + ' s ' + noWall.ground?.cls, 28) + round(base.maxGround, 2));
  }
}
lines.push('TOTAL: with NO embers from faces, the ground storey still lights by heat BEFORE any floor falls in ' + downByHeat + ' of ' + total + ' upstairs strikes; as written, ground lights more than 5 s after the first fall in ' + lagOver5 + ' of ' + total);

// (b) UP through a ceiling. Ground-floor strike in a room; when is the first upstairs fuel (k >= 2) lit, and what is it?
lines.push('', '(b) UP: furniture lit in a ground-floor room; first upstairs fuel (k >= 2) to light. "no wall rule" removes the wall-continuity correction; then the only ways up are the stair opening and a floor burning through.');
lines.push(pad('plan', 14) + pad('room', 10) + pad('as written: first upstairs', 34) + pad('first upstairs FLOOR or contents', 34) + pad('| no wall rule: first upstairs', 36) + 'first upper floor spent');
for (const planId of two) for (const id of HOUSING_PLANS[planId].floors[0].rooms.map(r => r.id)) {
  const label = 'A/0:' + id;
  const run = variant => {
    const r = burn({planId, contents: FURN, seconds: 100, world: {variant}, strike: (world, a) => { world.ignite(a.rooms.get(label).centre, 'furniture'); return label; }});
    const first = r.world.events.find(e => e.type === 'lit' && e.at[2] >= 2);
    const inner = r.initial.filter(x => x.tile.k >= 2 && (x.cls === 'frame' || x.cls === 'furniture' || x.cls === 'cloth') && x.fuel.litAt !== null).sort((a, b) => a.fuel.litAt - b.fuel.litAt)[0];
    const spent = r.world.events.find(e => e.type === 'opened' && e.supports && e.at[2] >= 2);
    return {first, inner, spent};
  };
  const base = run({}), noWall = run({noWallContinuity: true});
  lines.push(pad(planId, 14) + pad(id, 10) + pad(round(base.first?.time) + ' s ' + base.first?.cls + ' k=' + base.first?.at[2], 34) + pad(round(base.inner?.fuel.litAt) + ' s ' + base.inner?.cls, 34) + pad('| ' + round(noWall.first?.time) + ' s ' + noWall.first?.cls + ' k=' + noWall.first?.at[2], 36) + round(noWall.spent?.time) + ' s');
}

// (c) A shut room. Strike furniture in each room of Hopkins 15; when does anything in another room light?
lines.push('', '(c) SHUT ROOM, Hopkins 15: furniture lit at the room centre. t4 = all of the room lit. "next" = first fuel in a tile of ANOTHER room to light (any), and first FLOOR timber of another room on the same storey.');
lines.push(pad('room', 14) + pad('room fuels', 12) + pad('t4 s', 8) + pad('next room, any', 30) + pad('next room, floor', 18) + pad('door spent', 12) + pad('| doors open: t4', 18) + pad('next any', 10) + 'next floor');
for (const [f, floor] of HOUSING_PLANS['hopkins-4-15'].floors.entries()) for (const {id} of floor.rooms) {
  const label = 'A/' + f + ':' + id;
  const run = options => {
    const r = burn({contents: FURN, seconds: 90, options, strike: (world, a) => { world.ignite(a.rooms.get(label).centre, 'furniture'); return label; }});
    const others = r.initial.filter(x => x.room !== label && x.fuel.litAt !== null).sort((a, b) => a.fuel.litAt - b.fuel.litAt);
    const sameStorey = others.filter(x => x.cls === 'frame' && Math.floor(x.tile.k / 2) === f);
    const door = r.initial.filter(x => x.fuel.start === .5 && x.fuel.spentAt !== null).sort((a, b) => a.fuel.spentAt - b.fuel.spentAt)[0];
    return {r, any: others[0], floor: sameStorey[0], door};
  };
  const shut = run({}), open = run({doorsOpen: true});
  lines.push(pad(f + ':' + id, 14) + pad(shut.r.roomN, 12) + pad(round(shut.r.roomAll), 8) + pad(round(shut.any?.fuel.litAt) + ' s ' + shut.any?.cls + ' k=' + shut.any?.tile.k, 30) + pad(round(shut.floor?.fuel.litAt) + ' s', 18) + pad(round(shut.door?.fuel.spentAt) + ' s', 12)
    + pad('| ' + round(open.r.roomAll) + ' s', 18) + pad(round(open.any?.fuel.litAt) + ' s', 10) + round(open.floor?.fuel.litAt) + ' s');
}
out('r06-up-down-and-rooms.txt', lines);
