// Round 7. Would a stone plinth keep a lawn fire off the clapboard under these rules? The game's plinths are
// 0.48 m on four of the six plans (src/content/housing-plans.js), under half a tile's height. Here the plinth
// is given the WHOLE ground layer (1.06 m) of every outside wall, masonry, which is more than the game draws.
// Furnished house on the author's lawn. The match lights the grass in the tile outside each survey wall
// (Rule 10: a match lights the lightest fuel in its tile). Control: no plinth, same match.
//   node r08-plinth.mjs
import {burn, strikesOf, outsideWalls, round, median, PLANS} from '../measure.mjs';
for (const plinth of [false, true]) {
  const halves = [], firsts = [], lines = [];
  for (const planId of PLANS) for (const at of strikesOf(planId).filter(s => s.startsWith('wall') && !s.endsWith(':in'))) {
    let grassTile = null, k1 = 0;
    const r = burn({planId, at: 'room:0:' + [...strikeRoom(planId)][0], seconds: 150, ground: 'lawn', contents: {furniture: true, lacquer: 'some', oil: true, coal: true}, before: (world, a) => {
      const parts = at.split(':'), tile = world.tileAt(a.origin[0] + +parts[2], a.origin[1] + +parts[3], 0), wall = outsideWalls(world, a).find(w => w.tile === tile && w.side === parts[1]);
      grassTile = wall.outside;
      if (plinth) for (const w of outsideWalls(world, a)) if (w.fuel.cls === 'clapboard') {
        w.tile.fuels.splice(w.tile.fuels.indexOf(w.fuel), 1); world.ledger.laid -= w.fuel.amount; w.fuel.face.object.kind = 'masonry'; w.fuel.face.object.pass = world.rules.pass.masonry;
      }
      k1 = outsideWalls(world, a, 1).length;
      // burn() will strike a room's furniture after this hook; swap that for a match in the grass
      const ignite = world.ignite;
      world.ignite = (t, cls, opts) => { world.ignite = ignite; const g = grassTile.fuels.find(f => f.cls === 'grass'); return g ? ignite(grassTile, 'grass') : null; };
    }});
    const first = r.world.events.find(e => e.type === 'lit' && e.building === 'A');
    const hadGrass = r.world.events.some(e => e.cause === 'match' && e.cls === 'grass');
    if (!hadGrass) { lines.push(planId + ' ' + at + ': no grass in that tile (porch)'); continue; }
    halves.push(r.half); firsts.push(first?.time ?? null);
    lines.push(planId + ' ' + at + ': house first lit ' + (first ? round(first.time) + ' s (' + first.cls + ' k' + first.at[2] + ')' : 'never') + ', half ' + (r.half === null ? 'never' : round(r.half) + ' s'));
  }
  const h = halves.filter(v => v !== null);
  console.log((plinth ? 'PLINTH, whole ground layer masonry' : 'no plinth (control)') + ': ' + halves.length + ' matches in the grass outside a wall; house catches in ' + firsts.filter(v => v !== null).length + '; half alight in ' + h.length + ', ' + round(Math.min(...h)) + ' to ' + round(Math.max(...h)) + ' s, median ' + round(median(h))
    + '; in 40 to 70 s: ' + h.filter(v => v >= 40 && v <= 70).length + '; under 40 s: ' + h.filter(v => v < 40).length);
  console.log('   ' + lines.join('\n   '));
}
function strikeRoom(planId) { return strikesOf(planId).filter(s => s.startsWith('room:0:')).map(s => s.split(':')[2]); }
