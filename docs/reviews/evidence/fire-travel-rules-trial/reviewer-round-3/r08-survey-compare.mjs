// Targets 4 to 8 counted the trial's way, for any survey directory under reviewer-round-3/results/.
//   node r08-survey-compare.mjs survey survey-noreach ...
import path from 'node:path';
import {readSurvey, here, round} from './lib.mjs';
const med = list => { const s = list.filter(v => v !== null).sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
const rng = list => { const s = list.filter(v => v !== null); return s.length ? round(Math.min(...s)) + ' to ' + round(Math.max(...s)) : 'none'; };
for (const name of process.argv.slice(2)) {
  const rows = readSurvey(path.join(here, 'results', name)), walls = rows.filter(r => r.kind === 'wall'), wallsIn = rows.filter(r => r.kind === 'wall-in'), rooms = rows.filter(r => r.kind === 'room'), up = rows.filter(r => r.floor > 0);
  const t4 = r => r.room !== null && r.room >= 10 && r.room <= 20, t5 = r => r.half !== null && r.half >= 40 && r.half <= 70;
  const before = r => r.groundLit !== null && (r.fallToGround === null || r.groundLit < r.fallToGround), within = r => r.groundLit !== null && r.fallToGround !== null && r.groundLit >= r.fallToGround && r.groundLit - r.fallToGround <= 5;
  const roofFirst = r => r.groundRoofLit !== null && (r.fallToGround === null || r.groundRoofLit < r.fallToGround);
  console.log(name.padEnd(18) + ' T4 out ' + walls.filter(t4).length + '/24 (med ' + round(med(walls.map(r => r.room))) + ') in ' + wallsIn.filter(t4).length + '/24 (med ' + round(med(wallsIn.map(r => r.room))) + ') | T5 ' + rows.filter(t5).length + '/' + rows.length + ' [out ' + walls.filter(t5).length + ', in ' + wallsIn.filter(t5).length + ', ground ' + rooms.filter(r => !r.floor).filter(t5).length + ', up ' + up.filter(t5).length + '] ' + rng(rows.map(r => r.half)) + ' med ' + round(med(rows.map(r => r.half)))
    + ' under 40: ' + rows.filter(r => r.half !== null && r.half < 40).length + ' over 70: ' + rows.filter(r => r.half === null || r.half > 70).length
    + ' | T6 ' + rows.filter(r => r.flameUntil >= 90).length + ' ' + rng(rows.map(r => r.flameUntil)) + ' | T7 ' + rows.filter(r => r.firstFall >= 60 && r.firstFall <= 150).length + ' ' + rng(rows.map(r => r.firstFall))
    + ' | T8 before ' + up.filter(before).length + ' roofFirst ' + up.filter(roofFirst).length + ' within5 ' + up.filter(within).length + ' of ' + up.length + ' | never lit max ' + Math.max(...rows.map(r => r.neverLit)) + ' ledger ' + Math.max(...rows.map(r => Math.abs(r.ledger))).toExponential(0));
}
