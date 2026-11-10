// A/B: do the three landmark maps (the only maps with stairs and upper floors) have any fire state or tool?
import {readFileSync} from 'node:fs';
import {ROOT, REPO} from './lib.mjs';
const {createExploration} = await import(ROOT + 'runtime/navigation.js');
for (const place of ['new-york', 'administration', 'horticulture']) {
  const navigation = JSON.parse(readFileSync(new URL('assets/art/place-scenes/' + place + '/navigation.json', REPO), 'utf8'));
  const sim = createExploration({definition: navigation});
  const accepted = Object.fromEntries([{type: 'primary', pressed: true}, {type: 'select-tool', tool: 'matches'}, {type: 'drug', drug: 'powder'}, {type: 'move', x: 1, y: 0}]
    .map(command => [command.type, sim.dispatch(command)]));
  let s; for (let i = 0; i < 30; i++) s = sim.advance(1 / 60);
  const heights = [...new Set(navigation.surfaces.map(x => x.level))].sort((a, b) => a - b);
  console.log(place.padEnd(15), '| walkable surfaces', navigation.surfaces.length, 'levels', JSON.stringify(heights), 'stair treads', navigation.surfaces.filter(x => x.stairId).length,
    '| size', navigation.width + 'x' + navigation.height, 'm | commands accepted', JSON.stringify(accepted),
    '| snapshot.cells', s.cells.length, 'structureFire', s.structureFire.length, 'inventory total', Object.values(s.player.inventory).reduce((a, b) => a + b, 0), 'player.elevation', s.player.elevation);
  sim.dispose();
}
