// Round 2, finding N1, checked independently of the reviewer's probe.
// The shipped Catalogue Street, one real match on the lawn at the west end of the Hopkins 12 porch
// (the porch spans x 3..11 m). How long until lawn beyond the EAST end of the porch is alight, and
// what lit it? The control is the same press on the tree just before the contact fix.
//   node docs/reviews/evidence/hostile-review-round-2/porch-jump.mjs [path to another source tree]
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(import.meta.dirname, '../../../..');
const load = file => import(pathToFileURL(path.join(root, file)).href);
const {createSimulation, DEFAULT_CONFIG} = await load('src/simulation/index.js');
const {NEIGHBORHOOD_SCENARIO} = await load('src/content/neighborhood.js');
const STEP = DEFAULT_CONFIG.step, round = (v, d = 2) => v === null || v === undefined ? null : +(+v).toFixed(d);

const sim = createSimulation({seed: 1893, scenario: {...NEIGHBORHOOD_SCENARIO, actors: [],
  player: {...NEIGHBORHOOD_SCENARIO.player, x: 2.2, y: 11.25, tool: 'matches'}}});
sim.advance(STEP); sim.dispatch({type: 'pause', paused: false});
sim.dispatch({type: 'aim', x: 2.75, y: 11.25}); sim.dispatch({type: 'primary', pressed: true});
let snapshot = sim.advance(STEP); sim.dispatch({type: 'primary', pressed: false});
const strike = snapshot.events.find(event => event.type === 'tool-use');
const t0 = snapshot.clocks.world, seen = new Set(), ground = [], structure = [];
for (let i = 0; i < 12 / STEP; i++) {
  for (const event of snapshot.events) {
    if (seen.has(event.id)) continue; seen.add(event.id);
    const at = snapshot.clocks.world - t0;
    if (event.type === 'ignition') ground.push({...event, at, tick: event.tick});
    if (event.type === 'structure-ignition' && event.buildingId === 'hopkins-twelve') structure.push({...event, at});
  }
  snapshot = sim.advance(STEP);
}
// The deck is `deck:porch` on trees where it is one site and `deck:porch:<n>` where it is one per metre.
const deck = structure.find(event => /\/deck:porch(:\d+)?$/.test(event.siteId));
const deckSections = structure.filter(event => /\/deck:porch:\d+$/.test(event.siteId));
const byHouse = ground.filter(event => event.cause === 'structure-siding');
const firstWave = byHouse.length ? byHouse.filter(event => event.tick === byHouse[0].tick) : [];
const span = events => events.length ? round(Math.max(...events.map(e => e.x)) - Math.min(...events.map(e => e.x)) + 0.5, 1) : 0;
// Lawn in the porch's own rows, beyond its east end: 8.5 m or more from the match.
const far = ground.find(event => event.x > 11 && event.y > 10 && event.y < 12.5);

console.log('tree: ' + (process.argv[2] ? path.basename(root) + ' (given as an argument)' : 'this checkout'));
console.log('match: ' + strike.result + ' at (' + strike.x + ', ' + strike.y + ')');
console.log('porch deck ignites: ' + (deck ? round(deck.at) + ' s after the match, cause ' + deck.cause + ', parent ' + deck.parentSiteId : 'not within 12 s'));
if (deckSections.length) console.log('deck sections, in order of ignition: '
  + deckSections.map(event => event.siteId.split(':').at(-1) + ' at ' + round(event.at) + ' s').join(', '));
console.log('ground cells lit by the house in its first tick of lighting ground: ' + firstWave.length + ', spanning ' + span(firstWave) + ' m east-west'
  + (firstWave.length ? ', at ' + round(firstWave[0].at) + ' s' : ''));
console.log('ground cells lit by the house within 1 s of that tick: ' + (byHouse.length ? byHouse.filter(e => e.at <= byHouse[0].at + 1).length : 0));
console.log('first lawn cell beyond the east end of the porch: ' + (far
  ? round(far.at) + ' s after the match at x = ' + far.x + ' (' + round(far.x - 2.75, 1) + ' m from the match), cause ' + far.cause
    + ' => ' + round((far.x - 2.75) / far.at, 1) + ' m per s' : 'not within 12 s'));
sim.dispose();
