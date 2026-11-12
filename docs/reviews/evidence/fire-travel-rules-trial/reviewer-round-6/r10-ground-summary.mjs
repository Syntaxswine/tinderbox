// Round 6. Targets 4 to 8 from r09-lawn-survey.mjs output.
//   node reviewer-round-6/r10-ground-summary.mjs <ground-lawn|ground-bare|ground-path|...>
import fs from 'node:fs';
import path from 'node:path';
import {PLANS, median} from '../measure.mjs';
const dir = path.join(import.meta.dirname, 'results', process.argv[2]);
const rows = PLANS.flatMap(p => JSON.parse(fs.readFileSync(path.join(dir, 'survey-' + p + '.json'), 'utf8')));
const walls = rows.filter(r => r.kind === 'wall'), ins = rows.filter(r => r.kind === 'wall-in'), rooms = rows.filter(r => r.kind === 'room'), up = rows.filter(r => r.floor > 0);
const t4 = r => r.room !== null && r.room >= 10 && r.room <= 20, t5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
const num = (l, f) => l.map(f).filter(v => v !== null), rng = l => l.length ? Math.min(...l) + ' to ' + Math.max(...l) + ', median ' + median(l) : 'none';
console.log(process.argv[2] + ': ' + rows.length + ' strikes');
console.log('  T4 outside ' + walls.filter(t4).length + '/' + walls.length + ' (' + rng(num(walls, r => r.room)) + '); inside ' + ins.filter(t4).length + '/' + ins.length + ' (' + rng(num(ins, r => r.room)) + ')');
console.log('  T5 ' + rows.filter(t5).length + '/' + rows.length + ' (' + rng(num(rows, r => r.half)) + '); under 40 s: ' + rows.filter(r => r.half !== null && r.half < 40).length + '; outside ' + walls.filter(t5).length + '/24, inside ' + ins.filter(t5).length + '/24, ground rooms ' + rooms.filter(r => !r.floor).filter(t5).length + '/' + rooms.filter(r => !r.floor).length + ', upstairs ' + up.filter(t5).length + '/' + up.length);
for (const p of PLANS) { const l = rows.filter(r => r.plan === p); console.log('     ' + p.padEnd(15) + l.filter(t5).length + '/' + l.length + ', median ' + median(num(l, r => r.half))); }
console.log('  T6 ' + rows.filter(r => r.flameUntil >= 90).length + ' (' + rng(rows.map(r => r.flameUntil)) + ')');
console.log('  T7 ' + rows.filter(r => r.firstFall >= 60 && r.firstFall <= 150).length + ' (' + rng(num(rows, r => r.firstFall)) + ')');
const before = r => r.groundLit !== null && (r.fallToGround === null || r.groundLit < r.fallToGround), within = r => r.groundLit !== null && r.fallToGround !== null && r.groundLit >= r.fallToGround && r.groundLit - r.fallToGround <= 5;
console.log('  T8 upstairs strikes: ground storey lit before anything fell ' + up.filter(before).length + '/' + up.length + '; within 5 s of the fall ' + up.filter(within).length);
if (rows[0].grassLit !== undefined) console.log('  grass first lit: ' + rng(num(rows, r => r.grassLit)) + '; never ' + rows.filter(r => r.grassLit === null).length + '; by kind: outside ' + rng(num(walls, r => r.grassLit)) + ' | inside ' + rng(num(ins, r => r.grassLit)) + ' | rooms ' + rng(num(rooms, r => r.grassLit)));
