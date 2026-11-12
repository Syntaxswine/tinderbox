// Round 6. The survey's 101 strikes with the house standing on a lawn (the shipped street's houses stand on
// grass patches) instead of bare ground. Same burn(), same measures; `ground` = bare reproduces survey.mjs.
//   node reviewer-round-6/r09-lawn-survey.mjs <plan> <lawn|bare|path> [fuels json]
import fs from 'node:fs';
import path from 'node:path';
import {burn, strikesOf, lawn, plan, round, PITCH} from '../measure.mjs';
const [planId, ground = 'lawn', fuels = '{}'] = process.argv.slice(2);
const p = plan(planId), rows = [];
for (const at of strikesOf(planId)) {
  const r = burn({planId, at, seconds: 200, fuels: JSON.parse(fuels), before: (world, a) => {
    if (ground === 'bare') return;
    const W = Math.round((12 + p.width) / PITCH), D = Math.round((12 + p.depth) / PITCH);
    if (ground === 'lawn') return lawn(world, 0, 0, W, D);
    // 'path': a bare strip 1 m wide round the ground storey and the porch, lawn beyond
    const core = [...a.rooms.values()].flatMap(rec => rec.tiles.filter(t => t.k === 0)).concat(a.porch.filter(t => t.k === 0)), bare = new Set();
    for (const t of core) for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) bare.add((t.i + di) + ':' + (t.j + dj));
    for (let j = 0; j < D; j++) for (let i = 0; i < W; i++) { const t = world.tileAt(i, j, 0) ?? world.addTile(i, j, 0); if (!t.building && !t.fuels.length && !bare.has(i + ':' + j)) world.addFuel(t, 'grass', 1); }
  }});
  const grassLit = r.world.events.find(e => e.type === 'lit' && e.cls === 'grass')?.time ?? null;
  rows.push({plan: planId, at, kind: at.startsWith('room') ? 'room' : at.endsWith(':in') ? 'wall-in' : 'wall', floor: r.struck.floor, room: round(r.roomAll), half: round(r.half), flameUntil: round(r.flameUntil), firstFall: round(r.fall?.time), grassLit: round(grassLit),
    groundLit: round(r.groundLit?.time), fallToGround: round(r.fallToGround?.time), groundRoofLit: round(r.groundRoofLit?.time)});
}
const dir = path.join(import.meta.dirname, 'results', 'ground-' + ground + (fuels === '{}' ? '' : '-rd3'));
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, 'survey-' + planId + '.json'), JSON.stringify(rows, null, 1) + '\n');
console.log(planId + ' ' + ground + ' done');
