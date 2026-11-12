// Round 6. Recompute the results table's survey figures from a folder of survey-<plan>.json.
//   node reviewer-round-6/r06-recompute.mjs <dir relative to the evidence folder>
import fs from 'node:fs';
import path from 'node:path';
import {PLANS, median} from '../measure.mjs';
const dir = path.join(import.meta.dirname, '..', process.argv[2] ?? 'results');
const rows = PLANS.flatMap(p => JSON.parse(fs.readFileSync(path.join(dir, 'survey-' + p + '.json'), 'utf8')));
const walls = rows.filter(r => r.kind === 'wall'), ins = rows.filter(r => r.kind === 'wall-in'), rooms = rows.filter(r => r.kind === 'room'), up = rows.filter(r => r.floor > 0);
const t4 = r => r.room !== null && r.room >= 10 && r.room <= 20, t5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
const rng = l => Math.min(...l) + ' to ' + Math.max(...l), num = (l, f) => l.map(f).filter(v => v !== null);
console.log('strikes ' + rows.length + ' (walls ' + walls.length + ', inside ' + ins.length + ', rooms ' + rooms.length + ', upstairs ' + up.length + ')');
console.log('T4 outside ' + walls.filter(t4).length + '/' + walls.length + ' ' + rng(num(walls, r => r.room)) + ' median ' + median(num(walls, r => r.room)) + '; inside ' + ins.filter(t4).length + ' ' + rng(num(ins, r => r.room)) + ' median ' + median(num(ins, r => r.room)) + '; rooms ' + rng(num(rooms, r => r.room)) + ' median ' + median(num(rooms, r => r.room)) + '; room never fully alight: ' + rows.filter(r => r.room === null).length);
console.log('T5 ' + rows.filter(t5).length + '/' + rows.length + ' ' + rng(num(rows, r => r.half)) + ' median ' + median(num(rows, r => r.half)) + '; under 40: ' + rows.filter(r => r.half < 40).length + ', over 70: ' + rows.filter(r => r.half > 70).length + '; outside ' + walls.filter(t5).length + ', inside ' + ins.filter(t5).length + ', ground rooms ' + rooms.filter(r => !r.floor).filter(t5).length + '/' + rooms.filter(r => !r.floor).length + ', upstairs ' + up.filter(t5).length);
for (const p of PLANS) { const l = rows.filter(r => r.plan === p); console.log('   ' + p + ' ' + l.filter(t5).length + '/' + l.length + ' median ' + median(num(l, r => r.half))); }
console.log('T6 ' + rows.filter(r => r.flameUntil >= 90).length + ' ' + rng(rows.map(r => r.flameUntil)));
console.log('T7 ' + rows.filter(r => r.firstFall >= 60 && r.firstFall <= 150).length + ' ' + rng(num(rows, r => r.firstFall)) + '; first fall carried something: ' + rows.filter(r => r.firstFallCarried > 0).length + '; causes ' + JSON.stringify(rows.reduce((o, r) => (o[r.firstFallCause + ' drop ' + r.firstFallDrop] = (o[r.firstFallCause + ' drop ' + r.firstFallDrop] ?? 0) + 1, o), {})));
const before = r => r.groundLit !== null && (r.fallToGround === null || r.groundLit < r.fallToGround), within = r => r.groundLit !== null && r.fallToGround !== null && r.groundLit >= r.fallToGround && r.groundLit - r.fallToGround <= 5;
const roofFirst = r => r.groundRoofLit !== null && (r.fallToGround === null || r.groundRoofLit < r.fallToGround);
console.log('T8 before a fall ' + up.filter(before).length + '/' + up.length + '; low roof first ' + up.filter(roofFirst).length + '; within 5 s ' + up.filter(within).length + '; within and no roof first ' + up.filter(r => within(r) && !roofFirst(r)).length + '; ground never lit ' + up.filter(r => r.groundLit === null).length + '; lags ' + up.filter(r => r.groundLit !== null && r.fallToGround !== null).map(r => +(r.groundLit - r.fallToGround).toFixed(1)).join(' '));
const climbs = l => l.flatMap(r => r.climb ?? []), band = l => l.filter(v => v >= 2.5 && v <= 3.5).length + '/' + l.length + (l.length ? ' (' + rng(l) + ')' : '');
console.log('T3 all ' + band(climbs(walls)) + '; porch ' + band(climbs(walls.filter(r => r.behindPorch))) + '; other ' + band(climbs(walls.filter(r => !r.behindPorch))) + '; walls with no measurable direction ' + walls.filter(r => !r.climb?.length).length);
console.log('ledger worst ' + Math.max(...rows.map(r => Math.abs(r.ledger))).toExponential(1) + '; never lit max ' + Math.max(...rows.map(r => r.neverLit)) + '; embers share ' + rng(rows.map(r => r.embersShare)));
console.log('bedrooms/kitchen on hopkins-4-15: ' + rows.filter(r => r.plan === 'hopkins-4-15' && r.kind === 'room').map(r => r.at + ' ' + r.half).join(', '));
