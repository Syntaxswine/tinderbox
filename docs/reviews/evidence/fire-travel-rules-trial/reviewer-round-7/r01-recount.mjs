// Round 7. Recount every survey figure the record quotes, from a directory of survey files.
//   node r01-recount.mjs <dir relative to the evidence folder> [more dirs]
import fs from 'node:fs';
import path from 'node:path';
const PLANS = ['hopkins-4-15', 'hopkins-4-12', 'hopkins-4-09', 'hopkins-4-13', 'ashland-worker', 'monroe-row'];
const median = list => { const s = [...list].sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const r2 = v => v === null || v === undefined ? null : +v.toFixed(2);
for (const d of process.argv.slice(2)) {
  const dir = path.join(import.meta.dirname, '..', d);
  const rows = PLANS.flatMap(p => { const f = path.join(dir, 'survey-' + p + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []; });
  const walls = rows.filter(r => r.kind === 'wall'), wallsIn = rows.filter(r => r.kind === 'wall-in'), rooms = rows.filter(r => r.kind === 'room'), up = rows.filter(r => r.floor > 0), ground = rooms.filter(r => !r.floor);
  const num = (l, f) => l.map(f).filter(v => v !== null && v !== undefined);
  const rg = l => l.length ? Math.min(...l) + ' to ' + Math.max(...l) : 'none';
  const t4 = r => r.room !== null && r.room >= 10 && r.room <= 20, t5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
  const c = (l, t) => l.filter(t).length + '/' + l.length;
  console.log('== ' + d + ': ' + rows.length + ' strikes');
  console.log(' t4 outside ' + c(walls, t4) + ' ' + rg(num(walls, r => r.room)) + ' med ' + r2(median(num(walls, r => r.room))) + ' | inside ' + c(wallsIn, t4) + ' ' + rg(num(wallsIn, r => r.room)) + ' med ' + r2(median(num(wallsIn, r => r.room))) + ' | rooms ' + c(rooms, t4) + ' ' + rg(num(rooms, r => r.room)) + ' med ' + r2(median(num(rooms, r => r.room)))
    + ' | room never fully alight: ' + rows.filter(r => r.room === null).length);
  console.log(' t5 ' + c(rows, t5) + ' (out ' + c(walls, t5) + ', in ' + c(wallsIn, t5) + ', ground rooms ' + c(ground, t5) + ', upstairs ' + c(up, t5) + ') ' + rg(num(rows, r => r.half)) + ' med ' + r2(median(num(rows, r => r.half))) + ' under40 ' + rows.filter(r => r.half !== null && r.half < 40).length + ' over70 ' + rows.filter(r => r.half > 70).length + ' never ' + rows.filter(r => r.half === null).length);
  for (const p of PLANS) { const l = rows.filter(r => r.plan === p); console.log('    ' + p + ' ' + c(l, t5) + ' med ' + r2(median(num(l, r => r.half)))); }
  console.log(' t6 ' + c(rows, r => r.flameUntil >= 90) + ' ' + rg(num(rows, r => r.flameUntil)) + ' | at 60 s or more ' + c(rows, r => r.flameUntil >= 60));
  console.log(' t7 ' + c(rows, r => r.firstFall !== null && r.firstFall >= 60 && r.firstFall <= 150) + ' ' + rg(num(rows, r => r.firstFall)));
  const before = r => r.groundLit !== null && (r.fallToGround === null || r.groundLit < r.fallToGround), within = r => r.groundLit !== null && r.fallToGround !== null && r.groundLit >= r.fallToGround && r.groundLit - r.fallToGround <= 5;
  const roofFirst = r => r.groundRoofLit !== null && (r.fallToGround === null || r.groundRoofLit < r.fallToGround);
  console.log(' t8 before ' + c(up, before) + ' roofFirst ' + c(up, roofFirst) + ' within5 ' + c(up, within) + ' within5&!roofFirst ' + c(up, r => within(r) && !roofFirst(r)) + ' lag ' + rg(num(up.filter(r => r.groundLit !== null && r.fallToGround !== null), r => r2(r.groundLit - r.fallToGround))));
  const climbs = walls.flatMap(r => r.climb ?? []), band = l => l.filter(v => v >= 2.5 && v <= 3.5).length + '/' + l.length;
  if (walls.some(r => 'behindPorch' in r)) console.log(' t3 all ' + band(climbs) + ' ' + rg(climbs) + ' med ' + r2(median(climbs)) + ' | porch ' + band(walls.filter(r => r.behindPorch).flatMap(r => r.climb ?? [])) + ' | other ' + band(walls.filter(r => !r.behindPorch).flatMap(r => r.climb ?? [])) + ' ' + rg(walls.filter(r => !r.behindPorch).flatMap(r => r.climb ?? [])));
  else console.log(' t3 all ' + band(climbs) + ' ' + rg(climbs) + ' med ' + r2(median(climbs)));
  if (rows[0] && 'ledger' in rows[0]) console.log(' ledger worst ' + Math.max(...rows.map(r => Math.abs(r.ledger))).toExponential(0) + (rows[0].firstFallDrop !== undefined ? ' | first fall is embers one half-storey: ' + rows.filter(r => r.firstFallDrop === 1 && r.firstFallCarried === 0).length : ''));
  if (rows[0] && 'grassLit' in rows[0]) {
    const g = (l, name) => console.log('    grass first lit, ' + name + ': ' + rg(num(l, r => r.grassLit)) + ' med ' + r2(median(num(l, r => r.grassLit))) + ' never ' + l.filter(r => r.grassLit === null).length + '/' + l.length);
    g(walls, 'match outside'); g(wallsIn, 'match inside'); g(ground, 'ground rooms'); g(up, 'upstairs rooms');
    const sp = (l, name) => { const ok = l.filter(r => r.groundWallsLit > 0); console.log('    ' + name + ': ground outside walls first-to-last lit ' + rg(ok.map(r => r2(r.groundWallLast - r.groundWallFirst))) + ' s med ' + r2(median(ok.map(r => r.groundWallLast - r.groundWallFirst))) + '; all layers ' + rg(ok.map(r => r2(r.allWallLast - r.allWallFirst))) + ' med ' + r2(median(ok.map(r => r.allWallLast - r.allWallFirst))) + '; strikes with every ground wall lit ' + l.filter(r => r.groundWallsLit === r.groundWalls).length + '/' + l.length + '; none lit ' + l.filter(r => !r.groundWallsLit).length); };
    sp(walls, 'match outside'); sp(wallsIn, 'match inside'); sp(ground, 'ground rooms'); sp(up, 'upstairs rooms');
  }
}
