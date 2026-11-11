// Targets 11 and 12: two Hopkins 15 houses side by side with a gap between their walls, on bare ground or
// with lawn between. The match is NOT on the facing wall (review round 1, M6): it is on the far wall of
// house A, or in a room of it.
//   node docs/reviews/evidence/fire-travel-rules-trial/pair.mjs <gap m> <bare|lawn> [strike] [rules json] [fuels json] [seconds]
import {burn, outsideWalls, lawn, plan, round, PITCH} from './measure.mjs';
const [gapArg = '2', ground = 'bare', at = 'wall:x-:0:10', rules = '{}', fuels = '{}', seconds = '200'] = process.argv.slice(2);

export function pair(gap, ground, at, rules = {}, fuels = {}, seconds = 200) {
  const width = plan('hopkins-4-15').width;
  let facing = null, facingLit = null, shareThen = null, initial = null, peakRad = 0;
  const r = burn({at, rules, fuels, seconds, neighbours: [['B', 6 + width + gap, 6]], before: (world, a) => {
    if (ground === 'lawn') lawn(world, 0, 0, Math.round((12 + 2 * width + gap) / PITCH), Math.round(22 / PITCH));
    facing = outsideWalls(world, a, 0).concat(outsideWalls(world, a, 1), outsideWalls(world, a, 2), outsideWalls(world, a, 3)).filter(w => w.side === 'x+');
  }});
  const world = r.world, B = r.neighbours.B;
  facingLit = Math.min(...facing.map(w => w.fuel.litAt ?? Infinity));
  const grassLit = world.events.find(e => e.type === 'lit' && e.cls === 'grass')?.time ?? null;
  return {gap, ground, at, neighbourLit: B, facingWallLit: Number.isFinite(facingLit) ? facingLit : null, afterFacing: B !== null && Number.isFinite(facingLit) ? B - facingLit : null, half: r.half, grassLit};
}
if (process.argv[1].endsWith('pair.mjs')) {
  const p = pair(+gapArg, ground, at, JSON.parse(rules), JSON.parse(fuels), +seconds);
  console.log('gap ' + p.gap + ' m, ' + p.ground + ', strike ' + p.at + ': neighbour lit ' + (p.neighbourLit === null ? 'never in ' + seconds + ' s' : 'at ' + round(p.neighbourLit) + ' s')
    + '; A facing wall first lit ' + round(p.facingWallLit) + ' s' + (p.afterFacing !== null ? ' (' + round(p.afterFacing) + ' s before the neighbour)' : '') + '; A half alight ' + round(p.half) + ' s' + (p.grassLit !== null ? '; first grass lit ' + round(p.grassLit) + ' s' : ''));
}
