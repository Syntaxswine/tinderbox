// r21: how the published "burned fraction" of a house moves, as a check on site areas (deck sections and floor
// patches each carry an area; the house's burned fraction is area-weighted). Hopkins 12 alone on paving, one match
// on the west end of the deck; burnedFraction at fixed times, and the area the fire graph claims per kind of site.
// Run: node r21-burned-fraction.mjs   (used by r15 under mutants D09 and P05)
import {HEAD, TAPS, underPatches, load, houseWorld, r} from './lib.mjs';
underPatches(import.meta.url, TAPS);
const api = await load(HEAD), plan = api.HOUSING_PLANS['hopkins-4-12'], p = plan.porch;
const placement = {id: 'house', prefabId: 'hopkins-4-12', x: 16, y: 16.5, quarterTurns: 0};
globalThis.__lots = [];
const sim = api.createSimulation({scenario: houseWorld(api, [placement], {player: {x: 16 + p.x - .75, y: 16.5 + p.z + 1, tool: 'matches'}, size: 40}), config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}});
const lot = globalThis.__lots.at(-1), kinds = {};
for (const s of lot.sites) { const k = s.id.split(':')[0]; kinds[k] = (kinds[k] ?? 0) + s.area; }
console.log('area claimed by kind of site, m2: ' + Object.entries(kinds).map(([k, v]) => k + ' ' + r(v, 2)).join(', ') + '; total ' + r(Object.values(kinds).reduce((a, b) => a + b, 0), 2));
sim.dispatch({type: 'aim', x: 16 + p.x + .05, y: 16.5 + p.z + 1}); sim.dispatch({type: 'primary', pressed: true}); sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: false});
const marks = [1, 2, 4, 6, 8, 12, 20]; let line = [];
for (let i = 1; i <= 1200; i++) { const s = sim.advance(api.STEP); if (marks.includes(i / 60)) line.push(i / 60 + ' s: ' + r(s.world.buildings[0].burnedFraction, 4)); }
console.log('burnedFraction ' + line.join(', '));
sim.dispose();
