const obstacle = (id, x, y, width, depth, height, material, kind = 'building') =>
  ({id, x, y, width, depth, height, material, kind});
export const SCENARIOS = Object.freeze({
  street: {
    id: 'street', width: 20, height: 16, player: {x: 4, y: 9, tool: 'matches'},
    patches: [{x: 0, y: 0, width: 20, depth: 4, material: 'grass'},
      {x: 0, y: 12, width: 20, depth: 4, material: 'grass'}],
    obstacles: [obstacle('house-west', 4, 1.5, 5, 3, 3, 'masonry'),
      obstacle('house-east', 14, 1.5, 7, 3, 3.5, 'masonry'),
      obstacle('yard-fence', 12, 12, 6, 0.3, 1.2, 'wood', 'fence'),
      obstacle('crate', 8, 9, 1, 1, 0.9, 'wood', 'crate'),
      obstacle('drum-a', 12, 8, 0.656, 0.656, 0.8, 'steel', 'barrel'),
      obstacle('drum-b', 14, 8, 0.656, 0.656, 0.8, 'steel', 'barrel')],
    actors: [{id: 'walker', x: 16, y: 5, speed: 1, hp: 100, route: [{x: 16, y: 5}, {x: 18, y: 10}]}]
  },
  chase: {
    id: 'chase', width: 20, height: 16, player: {x: 4.25, y: 8.25, tool: 'jerry-can'},
    fuelLines: [{from: {x: 1.25, y: 8.25}, to: {x: 4.25, y: 8.25}, litresPerMetre: 0.08}],
    ignitions: [{x: 1.25, y: 8.25, radius: 0.1, heat: 2}], obstacles: [],
    actors: [{id: 'walker', x: 3, y: 5, speed: 1, hp: 100, route: [{x: 3, y: 5}, {x: 18, y: 5}]}]
  },
  chain: {
    id: 'chain', width: 12, height: 8, player: {x: 2, y: 4, tool: 'flamethrower'},
    obstacles: [obstacle('drum-a', 5, 4, 0.656, 0.656, 0.8, 'steel', 'barrel'),
      obstacle('drum-b', 7, 4, 0.656, 0.656, 0.8, 'steel', 'barrel'),
      obstacle('drum-safe', 10.5, 4, 0.656, 0.656, 0.8, 'steel', 'barrel')], actors: []
  },
  tiny: {id: 'tiny', width: 4, height: 3, player: {x: 1, y: 1.25}, obstacles: [], actors: []}
});
export function scenarioDefinition(scenario = 'street') {
  const source = typeof scenario === 'string' ? SCENARIOS[scenario] : scenario;
  if (!source) throw Error('Unknown scenario: ' + scenario);
  const result = structuredClone(source);
  result.id ??= 'custom'; result.tileSize ??= 1; result.fireCellSize ??= 0.5;
  if (![result.width, result.height].every(Number.isFinite) || !(result.width > 0 && result.height > 0 && result.width <= 64 && result.height <= 64)) throw Error('Scenario bounds must be positive and <=64 m');
  if (!(result.fireCellSize >= 0.125 && result.fireCellSize <= 1) ||
      Math.abs(result.width / result.fireCellSize - Math.round(result.width / result.fireCellSize)) > 1e-8 ||
      Math.abs(result.height / result.fireCellSize - Math.round(result.height / result.fireCellSize)) > 1e-8) throw Error('Fire grid must divide scenario bounds');
  if (!Number.isFinite(result.tileSize) || result.tileSize <= 0 || result.tileSize > 4 ||
      result.width / result.fireCellSize * result.height / result.fireCellSize > 65536) throw Error('Invalid tile size or excessive fire grid');
  result.player ??= {x: 2, y: 2}; result.obstacles ??= []; result.actors ??= [];
  if (![result.player.x, result.player.y].every(Number.isFinite)) throw Error('Invalid player position');
  for (const object of result.obstacles) if (![object.width, object.depth, object.height].every(v => Number.isFinite(v) && v > 0)) throw Error('Invalid obstacle dimensions');
  for (const actor of result.actors) {
    if (actor.speed !== undefined && (!Number.isFinite(actor.speed) || actor.speed < 0)) throw Error('Invalid actor speed');
    if (actor.route?.some(p => ![p.x, p.y].every(Number.isFinite))) throw Error('Invalid actor route');
  }
  const ids = new Set(['bear']);
  for (const object of [...result.obstacles, ...result.actors]) {
    if (!object.id || ids.has(object.id)) throw Error('Scenario IDs must be unique'); ids.add(object.id);
    if (![object.x, object.y].every(Number.isFinite)) throw Error('Invalid scene position');
  }
  return result;
}
