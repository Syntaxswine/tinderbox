import {CIVILIAN_PROFILES} from './exterior-kit.js';

const civilian = (id, species, x, y, route) => ({id, ...CIVILIAN_PROFILES[species], x, y, route,
  hp: 100, speed: .8, team: 'civilian', headgear: 'none', equipment: 'none'});

// Fictional facing blocks. Monroe repeats at its native 7m frontage to form
// the published row-house arrangement; adjacency is compiled from placement.
export const NEIGHBORHOOD_SCENARIO = {
  id: 'neighborhood', width: 51, height: 47, player: {x: 20, y: 18, tool: 'jerry-can'},
  camera: {followPlayer: true, span: 12, phoneSpan: 10},
  // Bounded prototype placements on the open street; use one existing dose.
  pickups:[
    {id:'street-powder-west',kind:'powder',x:17,y:21},
    {id:'street-healing-centre',kind:'healing',x:21,y:23},
    {id:'street-inversion-east',kind:'inversion',x:27,y:21}
  ],
  patches: [
    {x: 0, y: 0, width: 51, depth: 16, material: 'grass'},
    {x: 0, y: 19, width: 51, depth: 5, material: 'road'},
    {x: 0, y: 25, width: 51, depth: 22, material: 'grass'}
  ],
  buildings: [
    {id: 'hopkins-twelve', prefabId: 'hopkins-4-12', x: 11, y: 10, quarterTurns: 2},
    {id: 'hopkins-fifteen', prefabId: 'hopkins-4-15', x: 24, y: 13, quarterTurns: 2},
    {id: 'ashland-cottage', prefabId: 'ashland-worker', x: 33, y: 10, quarterTurns: 2},
    {id: 'hopkins-nine', prefabId: 'hopkins-4-09', x: 3, y: 30, quarterTurns: 0},
    {id: 'hopkins-thirteen', prefabId: 'hopkins-4-13', x: 15, y: 30, quarterTurns: 0},
    {id: 'monroe-row-house', prefabId: 'monroe-row', x: 27, y: 31, quarterTurns: 0},
    {id: 'monroe-row-middle', prefabId: 'monroe-row', x: 34, y: 31, quarterTurns: 0},
    {id: 'monroe-row-east', prefabId: 'monroe-row', x: 41, y: 31, quarterTurns: 0}
  ],
  obstacles: [
    {id: 'street-drum-west', x: 12.5, y: 15, width: .656, depth: .656, height: .8, material: 'steel', kind: 'barrel'},
    {id: 'street-drum-east', x: 25.5, y: 15, width: .656, depth: .656, height: .8, material: 'steel', kind: 'barrel'}
  ],
  actors: [
    civilian('neighbor-horse', 'horse', 7, 17, [{x: 7, y: 17}, {x: 17, y: 17}]),
    civilian('neighbor-goat', 'goat', 29, 24.5, [{x: 29, y: 24.5}, {x: 19, y: 24.5}])
  ]
};
