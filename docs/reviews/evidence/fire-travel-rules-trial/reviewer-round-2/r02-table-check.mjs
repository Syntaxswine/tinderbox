// Round 2. Recomputes every survey figure in the record's results table from the saved surveys
// (../results/, byte-identical to the reviewer's re-run in results/survey/).
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r02-table-check.mjs
import fs from 'node:fs';
import path from 'node:path';
const PLANS = ['hopkins-4-15', 'hopkins-4-12', 'hopkins-4-09', 'hopkins-4-13', 'ashland-worker', 'monroe-row'];
const rows = PLANS.flatMap(p => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../results/survey-' + p + '.json'), 'utf8')));
const med = list => { const s = list.filter(v => v !== null).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(.5 * s.length))] : null; };
const trueMed = list => { const s = list.filter(v => v !== null).sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const rng = list => { const s = list.filter(v => v !== null); return Math.min(...s) + ' to ' + Math.max(...s); };
const kinds = {wall: rows.filter(r => r.kind === 'wall'), 'wall-in': rows.filter(r => r.kind === 'wall-in'), room: rows.filter(r => r.kind === 'room')};
console.log('strikes', rows.length, Object.entries(kinds).map(([k, v]) => k + ' ' + v.length).join(', '));
for (const [k, list] of Object.entries(kinds)) console.log('T4', k, 'in 10..20:', list.filter(r => r.room >= 10 && r.room <= 20).length, 'of', list.length, '| under 10:', list.filter(r => r.room < 10).length, '| over 20:', list.filter(r => r.room > 20).length, '| range', rng(list.map(r => r.room)), '| median(author)', med(list.map(r => r.room)), 'median(true)', trueMed(list.map(r => r.room)));
const t5 = r => r.half >= 40 && r.half <= 70;
console.log('T5 all', rows.filter(t5).length, 'of', rows.length, '| under 40:', rows.filter(r => r.half < 40).length, '| over 70:', rows.filter(r => r.half > 70).length, '| range', rng(rows.map(r => r.half)), 'median', med(rows.map(r => r.half)), trueMed(rows.map(r => r.half)));
for (const p of PLANS) { const list = rows.filter(r => r.plan === p); console.log('   ', p.padEnd(15), list.filter(t5).length, 'of', list.length, 'median', med(list.map(r => r.half)), 'true median', trueMed(list.map(r => r.half)), 'range', rng(list.map(r => r.half)), 'fuel objects', list[0].fuels); }
console.log('T6 flameUntil', rng(rows.map(r => r.flameUntil)), '| under 90:', rows.filter(r => r.flameUntil < 90).length, '| at 300 (cut off by the run length):', rows.filter(r => r.flameUntil >= 299.5).length);
console.log('T7 firstFall', rng(rows.map(r => r.firstFall)), 'causes', JSON.stringify(rows.reduce((c, r) => (c[r.firstFallCause] = (c[r.firstFallCause] ?? 0) + 1, c), {})));
const up = rows.filter(r => r.floor > 0);
console.log('T8 upstairs strikes', up.length);
for (const r of up) console.log('   ', r.plan.padEnd(15), r.at.padEnd(16), 'fallToGround', r.fallToGround, 'groundLit', r.groundLit, r.groundLitWhat, 'lag', (r.groundLit - r.fallToGround).toFixed(2), 'firstFall(roof/floor)', r.firstFall, 'half', r.half);
const ground = rows.filter(r => r.floor === 0);
console.log('S2 ground-floor strikes: upstairs first lit', rng(ground.map(r => r.upstairsLit)), 'median', med(ground.map(r => r.upstairsLit)), trueMed(ground.map(r => r.upstairsLit)), 'n', ground.length, 'null', ground.filter(r => r.upstairsLit === null).length);
for (const k of ['wall', 'wall-in', 'room']) { const g = ground.filter(r => r.kind === k); console.log('    ', k, rng(g.map(r => r.upstairsLit)), 'median', trueMed(g.map(r => r.upstairsLit))); }
console.log('neverLit max', Math.max(...rows.map(r => r.neverLit)), 'ledger worst', Math.max(...rows.map(r => Math.abs(r.ledger))), 'embers share', rng(rows.map(r => r.embersShare)));
// Wall strikes: where the fire is when the room is "alight": half before room?
const w = kinds.wall; console.log('wall-outside strikes where half the HOUSE is reached before the struck ROOM is alight:', w.filter(r => r.half < r.room).length, 'of', w.length);
