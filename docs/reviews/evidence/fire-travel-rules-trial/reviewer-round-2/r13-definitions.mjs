// Round 2. Measurement definitions in measure.mjs.
// (a) "Room fully alight" counts only fuels whose home tile carries the room's label. A partition or door belongs to the tile
//     on its lower-numbered side and a ceiling to the tile above, so a room's own west and south partitions, its doors on
//     those sides and its ceiling are not counted. Here: the same time with every surface that bounds the room counted.
// (b) "Half the house alight" is half the fuel objects EVER lit. Here: when half are burning at once, if ever.
// (c) The wall strike is the middle of the longest run only. Here: every ground-layer wall tile of the plan, held outside.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r13-definitions.mjs <ab|c> <plan>
import {burn, strikesOf, outsideWalls, make, house, round, ALL} from './measure-var.mjs';
const [part, planId = 'hopkins-4-15'] = process.argv.slice(2);
const t4 = v => v !== null && v >= 10 && v <= 20;
if (part === 'ab') {
  for (const at of strikesOf(planId)) {
    let all = null, world0 = null, peakShare = 0, halfBurning = null;
    const r = burn({planId, at, seconds: 200, before: (world, a) => {
      world0 = world; all = [];
      for (const record of a.rooms.values()) for (const tile of record.tiles) for (const fuel of tile.fuels) all.push({fuel, tile, room: record.label, far: fuel.face ? world.across(tile, fuel.face)?.room ?? null : null});
    }, each: (world, n) => {
      if (n % 5) return;
      let burning = 0; for (const x of all) if (x.fuel.lit) burning++;
      const share = burning / all.length; if (share > peakShare) peakShare = share;
      if (halfBurning === null && share >= .5) halfBurning = world.time;
    }});
    const room = r.struck.room;
    const own = all.filter(x => x.room === room && x.fuel.store !== 'oil' && x.cls !== 'coal' && x.fuel.cls !== 'coal');
    const bounding = all.filter(x => x.room !== room && x.far === room);
    const worst = list => list.every(x => x.fuel.litAt !== null) ? Math.max(...list.map(x => x.fuel.litAt)) : null;
    const strict = worst(own.concat(bounding));
    const cls = {}; for (const x of bounding) cls[x.fuel.cls] = (cls[x.fuel.cls] ?? 0) + 1;
    console.log(JSON.stringify({plan: planId, at, kind: at.startsWith('room') ? 'room' : at.endsWith(':in') ? 'wall-in' : 'wall', room: round(r.roomAll), counted: own.length, leftOut: bounding.length, leftOutWhat: cls, roomWithItsWholeBoundary: round(strict), half: round(r.half), halfBurningAtOnce: round(halfBurning), peakShareBurningAtOnce: round(peakShare, 3)}));
  }
}
if (part === 'c') {
  const world = make(), a = house(world, 'A', planId, 6, 6, ALL), walls = outsideWalls(world, a);
  const author = new Set(strikesOf(planId));
  const rows = [];
  for (const w of walls) {
    const at = 'wall:' + w.side + ':' + (w.tile.i - a.origin[0]) + ':' + (w.tile.j - a.origin[1]);
    const r = burn({planId, at, seconds: 110});
    rows.push({at, author: author.has(at), room: r.roomAll, half: r.half, roomLabel: r.struck.room});
  }
  const stat = (list, f) => { const s = list.map(f).filter(v => v !== null).sort((p, q) => p - q); return round(s[0]) + ' to ' + round(s.at(-1)) + ', median ' + round(s[Math.floor(s.length / 2)]) + (s.length < list.length ? ' (' + (list.length - s.length) + ' not reached in 110 s)' : ''); };
  const mine = rows, theirs = rows.filter(r => r.author);
  console.log(planId, '| every ground-layer wall tile, match held outside:', mine.length, 'strikes | room alight', stat(mine, r => r.room), '; in 10 to 20 s:', mine.filter(r => t4(r.room)).length, 'of', mine.length, '| half the house', stat(mine, r => r.half), '; in 40 to 70 s:', mine.filter(r => r.half >= 40 && r.half <= 70).length, 'of', mine.length);
  console.log(planId, '| the author\'s', theirs.length, 'of them: room alight', stat(theirs, r => r.room), '; in range:', theirs.filter(r => t4(r.room)).length, '| half', stat(theirs, r => r.half), '; in range:', theirs.filter(r => r.half >= 40 && r.half <= 70).length);
  console.log(JSON.stringify(rows.map(r => [r.at, round(r.room, 1), round(r.half, 1)])));
}
