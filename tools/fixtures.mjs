import fs from 'node:fs';
import {createSimulation, SCENARIOS} from '../src/simulation/index.js';
const simulation = createSimulation({scenario: {...SCENARIOS.tiny,
  fuelLines: [{from: {x: 0.25, y: 2.25}, to: {x: 2.75, y: 2.25}, litresPerMetre: 0.08}],
  ignitions: [{x: 0.25, y: 2.25, radius: 0.05, heat: 2}]}});
simulation.dispatch({type: 'select-tool', tool: 'jerry-can'}); simulation.dispatch({type: 'primary', pressed: true});
simulation.dispatch({type: 'primary', pressed: false}); simulation.dispatch({type: 'move', x: 1, y: 0});
const snapshot = simulation.advance(0.1);
fs.writeFileSync('workbenches/simulation/example-snapshot.json', JSON.stringify(snapshot, null, 2) + '\n');
fs.writeFileSync('workbenches/simulation/fixtures.json', JSON.stringify(SCENARIOS, null, 2) + '\n');
simulation.dispose(); console.log('Wrote complete v1 sample and scenario definitions.');
