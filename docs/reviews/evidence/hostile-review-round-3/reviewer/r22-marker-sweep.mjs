// r22: where must the lantern's landing marker be for the throw to do anything? Regular Catalogue Street,
// the bear 1.21 m east of Hopkins 9's box, throwing west. The marker is moved in 5 cm steps from 0.5 m short of
// the wall face to 1.2 m past it, for (1) the flush east wall (world x = 10.08, at y = 36) and (2) the set-back
// east wall behind the open plinth (wall face x = 9.08, at y = 32.5).
// Outcome per throw: W = that wall lit by the lantern, S = some other structure site or ground lit, D = dud
// (nothing lit, no pool, lantern spent). Control: tip2 (26931d9). Run: TB_TREES=<dir with tip2/> node r22-marker-sweep.mjs
import {HEAD, TIP2, load, r} from './lib.mjs';
const WALLS = [['flush east wall, y = 36', 36, 10.08], ['set-back east wall behind the plinth, y = 32.5', 32.5, 9.08]];
for (const [label, root] of [['HEAD', HEAD], ...(process.env.TB_TREES ? [['tip2', TIP2]] : [])]) {
  const api = await load(root);
  for (const [name, y, face] of WALLS) {
    let row = '', duds = [], first = null;
    for (let past = -.5; past <= 1.2 + 1e-9; past += .05) {
      const stand = {x: 11.3, y}, range = stand.x - (face - past);
      const sim = api.createSimulation({scenario: {...api.NEIGHBORHOOD_SCENARIO, actors: [], player: {...api.NEIGHBORHOOD_SCENARIO.player, ...stand, tool: 'molotov'}}, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, events: {capacity: 1024}}});
      const m = .12 + .88 * range / 6;
      sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
      sim.dispatch({type: 'move', x: -m, y: 0}); sim.dispatch({type: 'move', x: 0, y: 0});
      sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: true}); sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: false});
      let wall = false, other = false, last;
      for (let i = 0; i < 240; i++) { last = sim.advance(api.STEP); for (const e of last.events) if (e.tick === last.tick) {
        if (e.type === 'structure-ignition' && e.cause === 'molotov' && e.siteId.startsWith('hopkins-nine/wall:0:')) wall = true;
        else if (e.type === 'structure-ignition' || e.type === 'ignition') other = true; } }
      const code = wall ? 'W' : other || last.diagnostics.fuel.molotovFuel > 0 ? 'S' : 'D';
      row += code; if (code === 'D') duds.push(r(past, 2)); if (code === 'W' && first === null) first = r(past, 2);
      sim.dispose();
    }
    console.log(`${label} ${name}\n    marker from -0.50 m (short) to +1.20 m (past the face), 5 cm steps: ${row}\n    dud markers: ${duds.length ? duds[0] + ' .. ' + duds.at(-1) + ' m (' + duds.length + ' of ' + row.length + ')' : 'none'}; first marker that lights the wall directly: ${first} m past the face`);
  }
}
