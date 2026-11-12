// Recompute every survey figure in the record's results table, from the saved surveys and from my re-run.
//   node r05-table.mjs
import path from 'node:path';
import {readSurvey, here, round} from './lib.mjs';
for (const [name, dir] of [['saved', path.join(here, '../results')], ['my run', path.join(here, 'results/survey')]]) {
  const rows = readSurvey(dir), walls = rows.filter(r => r.kind === 'wall'), wallsIn = rows.filter(r => r.kind === 'wall-in'), rooms = rows.filter(r => r.kind === 'room'), up = rows.filter(r => r.floor > 0);
  const med = list => { const s = list.filter(v => v !== null).sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const rng = list => { const s = list.filter(v => v !== null); return round(Math.min(...s)) + ' to ' + round(Math.max(...s)) + ' (n ' + s.length + ', null ' + (list.length - s.length) + ')'; };
  const t4 = r => r.room !== null && r.room >= 10 && r.room <= 20, t5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
  console.log('== ' + name + ': ' + rows.length + ' strikes (' + walls.length + ' wall, ' + wallsIn.length + ' wall-in, ' + rooms.length + ' room; ' + rooms.filter(r => !r.floor).length + ' ground rooms, ' + up.length + ' upstairs)');
  console.log(' 4 outside: ' + walls.filter(t4).length + '/24 in range, ' + rng(walls.map(r => r.room)) + ', true median ' + round(med(walls.map(r => r.room))) + ' | inside: ' + wallsIn.filter(t4).length + '/24, ' + rng(wallsIn.map(r => r.room)) + ', true median ' + round(med(wallsIn.map(r => r.room)))
    + ' | rooms: ' + rooms.filter(t4).length + '/' + rooms.length + ', ' + rng(rooms.map(r => r.room)) + ', median ' + round(med(rooms.map(r => r.room))));
  console.log(' 5 all: ' + rows.filter(t5).length + '/101, ' + rng(rows.map(r => r.half)) + ', median ' + round(med(rows.map(r => r.half))) + ' | outside ' + walls.filter(t5).length + '/24, inside ' + wallsIn.filter(t5).length + '/24, ground rooms ' + rooms.filter(r => !r.floor).filter(t5).length + '/' + rooms.filter(r => !r.floor).length + ', upstairs ' + up.filter(t5).length + '/' + up.length
    + ' | below 40: ' + rows.filter(r => r.half < 40).length + ', above 70: ' + rows.filter(r => r.half > 70).length);
  for (const p of [...new Set(rows.map(r => r.plan))]) { const pr = rows.filter(r => r.plan === p); console.log('     ' + p.padEnd(15) + ' half in range ' + pr.filter(t5).length + '/' + pr.length + ', ' + rng(pr.map(r => r.half)) + '; room (wall out) ' + pr.filter(r => r.kind === 'wall').map(r => r.room).join(', ')); }
  console.log(' 6 flame: ' + rows.filter(r => r.flameUntil >= 90).length + '/101, ' + rng(rows.map(r => r.flameUntil)));
  console.log(' 7 first fall: ' + rows.filter(r => r.firstFall >= 60 && r.firstFall <= 150).length + '/101, ' + rng(rows.map(r => r.firstFall)) + '; by cause ' + JSON.stringify(rows.reduce((o, r) => (o[r.firstFallCause + ' drop ' + r.firstFallDrop + ' carried ' + r.firstFallCarried] = (o[r.firstFallCause + ' drop ' + r.firstFallDrop + ' carried ' + r.firstFallCarried] ?? 0) + 1, o), {})));
  console.log('   first fall carrying anything at all: ' + rows.filter(r => r.firstFallCarried > 0).length + '/101');
  const before = r => r.groundLit !== null && (r.fallToGround === null || r.groundLit < r.fallToGround), within = r => r.groundLit !== null && r.fallToGround !== null && r.groundLit >= r.fallToGround && r.groundLit - r.fallToGround <= 5;
  const roofFirst = r => r.groundRoofLit !== null && (r.fallToGround === null || r.groundRoofLit < r.fallToGround);
  console.log(' 8 upstairs: before ' + up.filter(before).length + '/21, low roof first ' + up.filter(roofFirst).length + '/21, within 5 s ' + up.filter(within).length + '/21, both conditions (within and no roof first) ' + up.filter(r => within(r) && !roofFirst(r)).length + '/21; lags ' + rng(up.map(r => r.groundLit !== null && r.fallToGround !== null ? r.groundLit - r.fallToGround : null))
    + '; fallToGround ' + rng(up.map(r => r.fallToGround)) + '; plans with a low roof among the 21: ' + JSON.stringify(up.reduce((o, r) => (o[r.plan] = (o[r.plan] ?? '') + (roofFirst(r) ? 'R' : r.groundRoofLit === null ? '-' : 'n'), o), {})));
  console.log(' upstairs first lit from a ground strike: ' + rng(rows.filter(r => r.floor === 0).map(r => r.upstairsLit)) + ', median ' + round(med(rows.filter(r => r.floor === 0).map(r => r.upstairsLit))));
  console.log(' ledger worst ' + Math.max(...rows.map(r => Math.abs(r.ledger))).toExponential(1) + ', never lit max ' + Math.max(...rows.map(r => r.neverLit)) + ', embers share ' + rng(rows.map(r => 100 * r.embersShare)));
}
