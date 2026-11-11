// r07: minimal reproduction of the dud lantern, on regular Catalogue Street, public input only (< 20 s).
// A "dud" is a thrown lantern that is spent and leaves nothing: no fuel pool, no heated site, no ignition in 5 s.
// Each throw is made on this tree and on tip2 (26931d9, the control). The preview impact is printed too: the game
// shows the player that landing point before the throw.
// Run: TB_TREES=<dir with tip2/> node r07-lantern-dud-repro.mjs
import {HEAD, TIP2, load, r} from './lib.mjs';
const THROWS = [
  ['A  onto the stone plinth in Hopkins 9\'s east notch (lands 0.3 m inside the box edge)', {x: 11.3, y: 32.5}, [-1, 0], 1.6],
  ['B  landing marker put at the foot of the set-back east wall of Hopkins 9', {x: 11.3, y: 32.5}, [-1, 0], 2.3],
  ['C  same stance, marker 0.7 m past the wall (control: the wall itself is hit)', {x: 11.3, y: 32.5}, [-1, 0], 3.0],
  ['D  at the east porch post of Hopkins 13 from the lawn', {x: 19.88, y: 26.5}, [0, 1], 3.5],
  ['E  onto Hopkins 13\'s west notch plinth', {x: 14.2, y: 36}, [1, 0], 1.3],
  ['F  Hopkins 9 south-east notch, marker at the wall foot', {x: 11.3, y: 39}, [-1, 0], 2.3]
];
for (const [label, root] of [['HEAD', HEAD], ['tip2', TIP2]]) {
  const api = await load(root);
  console.log(`== ${label}`);
  for (const [name, at, dir, range] of THROWS) {
    const scenario = {...api.NEIGHBORHOOD_SCENARIO, actors: [], player: {...api.NEIGHBORHOOD_SCENARIO.player, ...at, tool: 'molotov'}};
    const sim = api.createSimulation({scenario, config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, events: {capacity: 2048}}});
    const m = .12 + .88 * range / 6;
    sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
    sim.dispatch({type: 'move', x: dir[0] * m, y: dir[1] * m}); sim.dispatch({type: 'move', x: 0, y: 0});
    const preview = sim.advance(api.STEP).player.lanternAim.impact;
    sim.dispatch({type: 'primary', pressed: true}); sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: false});
    let impact, structure = new Set(), ground = 0, heated = 0, last;
    for (let i = 0; i < 60 * 6.5; i++) {
      last = sim.advance(api.STEP);
      for (const e of last.events) if (e.tick === last.tick) {
        if (e.type === 'molotov-impact') impact = e;
        else if (e.type === 'structure-ignition') structure.add(e.siteId);
        else if (e.type === 'ignition') ground++;
      }
      heated = Math.max(heated, last.structureFire.length);
    }
    const dud = !structure.size && !ground && !heated && last.diagnostics.fuel.molotovFuel === 0;
    console.log(`${dud ? 'DUD ' : 'fire'} ${name}\n      stance (${at.x},${at.y}) range ${range} m; preview (${r(preview.x, 2)},${r(preview.y, 2)}) h=${r(preview.h, 2)}; impact (${r(impact.x, 2)},${r(impact.y, 2)}) h=${r(impact.h, 2)}; ` +
      `pool laid ${last.diagnostics.fuel.molotovFuel} L; structure sites lit ${structure.size}; ground cells lit ${ground}; lanterns left ${last.player.inventory.molotovs}`);
    sim.dispose();
  }
}
