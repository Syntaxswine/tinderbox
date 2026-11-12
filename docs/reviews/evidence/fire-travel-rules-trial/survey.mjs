// Targets 4 to 8 on one plan, every survey strike (each outside wall from outside, the furniture in every
// room), furnished, 300 s each. One process per plan; trial.mjs reads what this writes.
//   node docs/reviews/evidence/fire-travel-rules-trial/survey.mjs <plan id> [rules json] [fuels json] [out dir] [bare|lawn]
// The house stands on bare ground unless the fifth argument is "lawn". A sixth argument "plinth" builds the
// plan's stone plinth (a proposal, see docs/reviews/2026-11-11-another-layer.md).
import fs from 'node:fs';
import path from 'node:path';
import {burn, strikesOf, round} from './measure.mjs';
const [planId, rules = '{}', fuels = '{}', outDir = 'results', ground = 'bare', plinth = ''] = process.argv.slice(2);
const rows = [];
for (const at of strikesOf(planId)) {
  const r = burn({planId, at, rules: JSON.parse(rules), fuels: JSON.parse(fuels), seconds: 300, ground, plinth: plinth === 'plinth'});
  rows.push({plan: planId, at, kind: at.startsWith('room') ? 'room' : at.endsWith(':in') ? 'wall-in' : 'wall', floor: r.struck.floor, struck: r.struck.what ?? 'furniture', behindPorch: r.struck.behindPorch ?? false, fuels: r.n, room: round(r.roomAll), roomLit: r.roomLit + '/' + r.roomN, half: round(r.half), climb: r.climb?.map(v => round(v)) ?? null, flameUntil: round(r.flameUntil),
    firstFall: round(r.fall?.time), firstFallCause: r.fall?.cause ?? null, firstFallDrop: r.fall ? r.fall.from[2] - r.fall.to[2] : null, firstFallCarried: r.fall ? r.fall.carried.length : null, upstairsLit: round(r.upstairsLit?.time), groundLit: round(r.groundLit?.time), groundLitWhat: r.groundLit?.cls ?? null, groundRoofLit: round(r.groundRoofLit?.time),
    fallToGround: round(r.fallToGround?.time), neverLit: r.never, embersShare: round(r.world.ledger.fellAsEmbers / r.world.ledger.laid, 4), ledger: r.ledger});
  console.error(JSON.stringify(rows.at(-1)));
}
const dir = path.join(import.meta.dirname, outDir);
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, 'survey-' + planId + '.json'), JSON.stringify(rows, null, 1) + '\n');
