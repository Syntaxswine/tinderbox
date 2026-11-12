// Recomputes every survey figure of the results table from a directory of survey-<plan>.json files.
//   node reviewer-round-5/r01-recompute.mjs <dir relative to the evidence folder>
import fs from 'node:fs';
import path from 'node:path';
const PLANS = ['hopkins-4-15', 'hopkins-4-12', 'hopkins-4-09', 'hopkins-4-13', 'ashland-worker', 'monroe-row'];
const dir = path.join(import.meta.dirname, '..', process.argv[2] ?? 'results');
const rows = PLANS.flatMap(p => JSON.parse(fs.readFileSync(path.join(dir, 'survey-' + p + '.json'), 'utf8')));
const med = l => { const s = [...l].sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const rng = l => l.length ? Math.min(...l) + ' to ' + Math.max(...l) + ', median ' + (+med(l).toFixed(2)) : 'none';
const num = (l, f) => l.map(f).filter(v => v !== null && v !== undefined);
const walls = rows.filter(r => r.kind === 'wall'), wallsIn = rows.filter(r => r.kind === 'wall-in'), rooms = rows.filter(r => r.kind === 'room'), up = rows.filter(r => r.floor > 0);
const t4 = r => r.room !== null && r.room >= 10 && r.room <= 20, t5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
const c = (l, t) => l.filter(t).length + ' of ' + l.length;
console.log('dir ' + process.argv[2] + ': ' + rows.length + ' strikes; walls ' + walls.length + ', inside ' + wallsIn.length + ', rooms ' + rooms.length + ', upstairs ' + up.length);
const band = l => l.filter(v => v >= 2.5 && v <= 3.5).length + ' of ' + l.length + ' (' + rng(l) + ')';
console.log('t3: all ' + band(walls.flatMap(r => r.climb ?? [])) + '; behind porch ' + band(walls.filter(r => r.behindPorch).flatMap(r => r.climb ?? [])) + '; others ' + band(walls.filter(r => !r.behindPorch).flatMap(r => r.climb ?? []))
  + '; walls behind porch: ' + walls.filter(r => r.behindPorch).map(r => r.plan + ' ' + r.at + ' [' + r.struck + '] climb ' + JSON.stringify(r.climb)).join('; '));
console.log('t4: outside ' + c(walls, t4) + ', ' + rng(num(walls, r => r.room)) + '; inside ' + c(wallsIn, t4) + ', ' + rng(num(wallsIn, r => r.room)) + '; rooms ' + c(rooms, t4) + ', ' + rng(num(rooms, r => r.room)) + '; room never fully alight: ' + rows.filter(r => r.room === null).length);
console.log('t5: ' + c(rows, t5) + ' (' + c(walls, t5) + ' outside, ' + c(wallsIn, t5) + ' inside, ' + c(rooms.filter(r => !r.floor), t5) + ' ground rooms, ' + c(up, t5) + ' upstairs); ' + rng(num(rows, r => r.half)) + '; under 40: ' + rows.filter(r => r.half !== null && r.half < 40).length + ', over 70: ' + rows.filter(r => r.half > 70).length + ', never: ' + rows.filter(r => r.half === null).length);
for (const p of PLANS) { const l = rows.filter(r => r.plan === p); console.log('    ' + p + ': ' + c(l, t5) + ', median ' + (+med(num(l, r => r.half)).toFixed(2))); }
console.log('t6: ' + c(rows, r => r.flameUntil >= 90) + '; ' + rng(num(rows, r => r.flameUntil)));
console.log('t7: ' + c(rows, r => r.firstFall !== null && r.firstFall >= 60 && r.firstFall <= 150) + '; ' + rng(num(rows, r => r.firstFall)) + '; first fall is embers dropping one half-storey carrying nothing: ' + rows.filter(r => r.firstFallDrop === 1 && r.firstFallCarried === 0).length + '; first fall carries anything: ' + rows.filter(r => r.firstFallCarried > 0).length);
const before = r => r.groundLit !== null && (r.fallToGround === null || r.groundLit < r.fallToGround), within = r => r.groundLit !== null && r.fallToGround !== null && r.groundLit >= r.fallToGround && r.groundLit - r.fallToGround <= 5;
const roofFirst = r => r.groundRoofLit !== null && (r.fallToGround === null || r.groundRoofLit < r.fallToGround);
console.log('t8: before a fall ' + c(up, before) + '; low roof first ' + c(up, roofFirst) + '; within 5 s ' + c(up, within) + '; within and no roof first ' + c(up, r => within(r) && !roofFirst(r)) + '; lag ' + rng(up.filter(r => r.groundLit !== null && r.fallToGround !== null).map(r => +(r.groundLit - r.fallToGround).toFixed(2))));
console.log('t14: ledger worst ' + Math.max(...rows.map(r => Math.abs(r.ledger))).toExponential(1) + '; never lit max ' + Math.max(...rows.map(r => r.neverLit)) + '; embers share ' + Math.min(...rows.map(r => r.embersShare)) + ' to ' + Math.max(...rows.map(r => r.embersShare)));
console.log('struck: ' + [...new Set(rows.filter(r => r.kind !== 'room').map(r => r.struck))].join(', ') + '; door strikes: ' + walls.filter(r => r.struck === 'door').map(r => r.plan + ' ' + r.at + ' half ' + r.half).join('; '));
