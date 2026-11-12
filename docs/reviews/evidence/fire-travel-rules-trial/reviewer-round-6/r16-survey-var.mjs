// Round 6. survey.mjs, word for word, on this folder's measure-var.mjs (see r15-make-var.mjs).
//   [MIDDLE=1] node reviewer-round-6/r16-survey-var.mjs <plan> <out dir relative to this folder's results> [rules json] [fuels json]
import fs from 'node:fs';
import path from 'node:path';
import {burn, strikesOf, round} from './measure-var.mjs';
const [planId, outDir, rules = '{}', fuels = '{}'] = process.argv.slice(2);
const rows = [];
for (const at of strikesOf(planId)) {
  const r = burn({planId, at, rules: JSON.parse(rules), fuels: JSON.parse(fuels), seconds: 300});
  rows.push({plan: planId, at, kind: at.startsWith('room') ? 'room' : at.endsWith(':in') ? 'wall-in' : 'wall', floor: r.struck.floor, struck: r.struck.what ?? 'furniture', behindPorch: r.struck.behindPorch ?? false, fuels: r.n, room: round(r.roomAll), roomLit: r.roomLit + '/' + r.roomN, half: round(r.half), climb: r.climb?.map(v => round(v)) ?? null, flameUntil: round(r.flameUntil),
    firstFall: round(r.fall?.time), firstFallCause: r.fall?.cause ?? null, firstFallDrop: r.fall ? r.fall.from[2] - r.fall.to[2] : null, firstFallCarried: r.fall ? r.fall.carried.length : null, upstairsLit: round(r.upstairsLit?.time), groundLit: round(r.groundLit?.time), groundLitWhat: r.groundLit?.cls ?? null, groundRoofLit: round(r.groundRoofLit?.time),
    fallToGround: round(r.fallToGround?.time), neverLit: r.never, embersShare: round(r.world.ledger.fellAsEmbers / r.world.ledger.laid, 4), ledger: r.ledger});
}
const dir = path.join(import.meta.dirname, 'results', outDir);
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, 'survey-' + planId + '.json'), JSON.stringify(rows, null, 1) + '\n');
