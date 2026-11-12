// Input scripts that change the world in every way the game allows, through the public entry point only.
// Each script is run(api, tick): it builds simulations with api.createSimulation and steps them ONLY by calling
// tick(sim, dt?) (one advance + whatever check the calling probe wants) and peek(sim) (a snapshot without advancing).
// The same script therefore drives the audit (r01) and the cross-tree differential (r02).
const cfg = extra => ({input: {cameraRelative: false}, ...extra});
const noHurt = {fire: {damagePerSecond: 0}};

function driver(api, sim, tick, peek) {
  const STEP = api.STEP;
  const d = {
    sim, last: null,
    step(dt = STEP) { return d.last = tick(sim, dt); },
    wait(seconds) { for (let i = 0; i < Math.round(seconds / STEP); i++) d.step(); return d.last; },
    tool(tool) { sim.dispatch({type: 'select-tool', tool}); },
    click(x, y) {
      if (x !== undefined) sim.dispatch({type: 'aim', x, y});
      sim.dispatch({type: 'primary', pressed: true}); d.step(); sim.dispatch({type: 'primary', pressed: false}); return d.step();
    },
    hold(x, y, seconds) {
      sim.dispatch({type: 'aim', x, y}); sim.dispatch({type: 'primary', pressed: true}); d.wait(seconds);
      sim.dispatch({type: 'primary', pressed: false}); return d.step();
    },
    walk(x, y, seconds) { sim.dispatch({type: 'move', x, y}); d.wait(seconds); sim.dispatch({type: 'move', x: 0, y: 0}); return d.step(); },
    goto(x, y, limit = 240) {
      let stuck = 0;
      for (let i = 0; i < limit; i++) {
        const p = (d.last ?? peek(sim)).player, dx = x - p.x, dy = y - p.y, far = Math.hypot(dx, dy);
        if (far < .16 || stuck > 20) break;
        sim.dispatch({type: 'move', x: dx / far * Math.min(1, far / .15), y: dy / far * Math.min(1, far / .15)});
        const before = p; d.step();
        stuck = Math.hypot(d.last.player.x - before.x, d.last.player.y - before.y) < 1e-4 ? stuck + 1 : 0;
      }
      sim.dispatch({type: 'move', x: 0, y: 0}); return d.step();
    },
    throwAt(dx, dy) { // lantern/molotov: enter aim, set the stick, release it, throw
      d.tool('molotov');
      sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
      sim.dispatch({type: 'move', x: dx, y: dy}); sim.dispatch({type: 'move', x: 0, y: 0});
      d.step(); sim.dispatch({type: 'primary', pressed: true}); d.step(); sim.dispatch({type: 'primary', pressed: false}); return d.step();
    }
  };
  return d;
}

export const SCRIPTS = {
  // Catalogue Street: lawn fire against three houses from tick 0, then every tool, drugs, pickups, the shop door,
  // the lantern, pause, a long burn through section collapse and rubble heat, then reset and a second fire.
  'catalogue-everything'(api, tick, peek, {long = +process.env.TB_LONG || 175} = {}) {
    const scenario = {...api.NEIGHBORHOOD_SCENARIO,
      fuelLines: [{from: {x: 10.26, y: 34.75}, to: {x: 10.74, y: 34.75}, litresPerMetre: .32},
        {from: {x: 26.3, y: 36.25}, to: {x: 26.3, y: 38.2}, litresPerMetre: .16}],
      ignitions: [{x: 10.5, y: 34.75, radius: .01, heat: 3}, {x: 26.3, y: 36.4, radius: .01, heat: 3}]};
    const sim = api.createSimulation({scenario, config: cfg(noHurt)}), d = driver(api, sim, tick, peek);
    peek(sim); peek(sim);
    d.tool('jerry-can'); d.click(); d.goto(20, 14.2); d.goto(13.4, 14.2); d.click();          // pour toward the west drum
    d.tool('matches'); d.click(d.last.player.x + .6, d.last.player.y); d.wait(1.5);
    d.step(0); d.step(.05); d.step(.25); d.step(1);                                              // irregular frame lengths
    d.tool('flamethrower'); const horse = d.last.actors.find(a => a.id === 'neighbor-horse');
    d.goto(horse.x + 2.5, horse.y + .9); d.hold(horse.x, horse.y, 1.6);                           // actor ignition
    d.hold(d.last.player.x, d.last.player.y - 3, .8);                                             // sweep the lawn / porch
    d.throwAt(0, -.8); d.wait(1.2);                                                               // molotov pool on the north lawn
    d.tool('torch'); d.click(d.last.player.x - .8, d.last.player.y - .6); d.click(d.last.player.x - .8, d.last.player.y - .6); d.wait(.5);
    d.goto(40, 18.35); sim.dispatch({type: 'interact', portalId: 'bell-and-alder:entry', action: 'open'}); d.wait(.3);     // shop doors
    sim.dispatch({type: 'interact', portalId: 'bell-and-alder:entry', action: 'close'}); d.wait(.3);
    sim.dispatch({type: 'interact', portalId: 'bell-and-alder:entry', action: 'open'}); d.wait(.2);
    d.goto(40, 15); d.goto(41.3, 12.5);
    sim.dispatch({type: 'interact', objectId: 'bell-and-alder:hand-lantern', action: 'take'}); d.wait(.2);
    d.throwAt(-.5, .3); d.wait(1);                                                                // lantern inside the shop
    d.goto(40, 15); d.goto(40, 18.4);
    sim.dispatch({type: 'interact', portalId: 'bell-and-alder:entry', action: 'close'}); d.wait(.3);
    sim.dispatch({type: 'pause', paused: true}); d.wait(.4); d.step(0); peek(sim);
    d.tool('matches'); sim.dispatch({type: 'primary', pressed: true}); d.wait(.2); sim.dispatch({type: 'primary', pressed: false});
    sim.dispatch({type: 'pause', paused: false}); d.wait(.3);
    sim.dispatch({type: 'drug', drug: 'powder'}); d.wait(1); sim.dispatch({type: 'drug', drug: 'healing'}); d.wait(.5);
    for (const [x, y] of [[21, 23], [17, 21], [27, 21]]) d.goto(x, y);                            // walk-over pickups; inversion last
    sim.dispatch({type: 'drug', drug: 'inversion'}); d.wait(.5);
    d.wait(long);                                                                                 // collapse + rubble heat
    sim.dispatch({type: 'reset'}); d.wait(.5);
    d.tool('matches'); d.goto(20, 16.4); d.click(20, 15.6); d.wait(4);
    d.tool('jerry-can'); d.click(); d.goto(24, 16.6); d.click(); d.wait(2);
    sim.dispose();
  },
  // Default damage: the player stands in the fire and dies; reset afterwards.
  'catalogue-death-and-reset'(api, tick, peek) {
    const scenario = {...api.NEIGHBORHOOD_SCENARIO, player: {...api.NEIGHBORHOOD_SCENARIO.player, hp: 14}};
    const sim = api.createSimulation({scenario, config: cfg()}), d = driver(api, sim, tick, peek);
    d.tool('jerry-can'); d.click(); d.goto(20, 13); d.goto(16, 13); d.click();
    d.tool('matches'); d.click(d.last.player.x + .5, d.last.player.y); d.goto(18, 13); d.wait(8);
    sim.dispatch({type: 'reset'}); d.wait(1); d.tool('matches'); d.click(20.6, 17.4); d.wait(1);
    sim.dispose();
  },
  // The Ashland pair: lit by one match, burned through every layer retirement (in-place collider height edits),
  // with a lawn fire, a barrel and a second reset.
  'ashland-pair-collapse'(api, tick, peek, {long = +process.env.TB_LONG || 185} = {}) {
    const sim = api.createSimulation({scenario: api.COTTAGE_PAIR_SCENARIO, cottageWind: api.calmCottageWind, config: cfg(noHurt)});
    const d = driver(api, sim, tick, peek);
    d.click(51, 13.5); d.wait(2);
    d.tool('flamethrower'); d.hold(51.9, 12.6, .8);
    d.throwAt(.6, .5); d.wait(1);
    d.goto(30, 18); d.tool('matches'); d.click(30, 16.5); d.goto(26.6, 16.6); d.click(26, 15.6); // toward the east drum
    d.wait(long);
    sim.dispatch({type: 'reset'}); d.wait(.4); d.click(51, 13.5); d.wait(3);
    sim.dispose();
  },
  // The small fixtures: timber burnout, drums, a chain of drums, the exposition modules, and a non-catalogue house.
  'small-fixtures'(api, tick, peek) {
    let sim = api.createSimulation({scenario: 'street', config: cfg(noHurt)}), d = driver(api, sim, tick, peek);
    d.goto(7, 9.9); d.click(8, 9.3); d.tool('flamethrower'); d.goto(10, 8.9); d.hold(12, 8, 1.2); d.hold(8, 9, 1.5);
    d.goto(12, 10.8); d.hold(12, 12, 2); d.throwAt(0, .7); d.wait(60); sim.dispatch({type: 'reset'}); d.wait(1); sim.dispose();
    sim = api.createSimulation({scenario: 'chain', config: cfg(noHurt)}); d = driver(api, sim, tick, peek);
    d.hold(5, 4, 2.5); d.wait(3); sim.dispose();
    sim = api.createSimulation({scenario: 'chase', config: cfg()}); d = driver(api, sim, tick, peek);
    d.click(); d.walk(1, 0, 1); d.walk(0, -1, .3); d.wait(6); sim.dispose();
    sim = api.createSimulation({scenario: 'exposition', config: cfg(noHurt)}); d = driver(api, sim, tick, peek);
    d.tool('matches'); d.goto(10, 6.2); d.click(10.9, 5.2); d.goto(6, 6); d.click(6, 5.2); d.tool('flamethrower'); d.hold(6, 4, 2);
    d.goto(2, 8); d.tool('matches'); d.click(1.5, 8); d.wait(70); sim.dispose();
    const house = api.NEIGHBORHOOD_SCENARIO.buildings.find(b => b.id === 'hopkins-nine');
    sim = api.createSimulation({scenario: {id: 'loose-house', width: 16, height: 44, buildings: [house], obstacles: [], actors: [],
      patches: [{x: 10, y: 28, width: 6, depth: 14, material: 'grass'}], player: {x: 10.82, y: 34.63, tool: 'matches', heading: Math.PI}}, config: cfg(noHurt)});
    d = driver(api, sim, tick, peek);
    d.click(9.9, 34.63); d.click(11.6, 34.63); d.wait(75); sim.dispose();
  },
  // Coarse and fine fire grids (the publication indexes cells by position).
  'odd-grids'(api, tick, peek) {
    for (const fireCellSize of [.25, 1, .125]) {
      const sim = api.createSimulation({scenario: {id: 'grid', width: 8, height: 6, fireCellSize, player: {x: 2, y: 3, tool: 'jerry-can'},
        patches: [{x: 4, y: 0, width: 4, depth: 6, material: 'grass'}],
        obstacles: [{id: 'drum', x: 5.5, y: 3, width: .656, depth: .656, height: .8, material: 'steel', kind: 'barrel'},
          {id: 'crate', x: 3, y: 4.5, width: 1, depth: 1, height: .9, material: 'wood', kind: 'crate'}], actors: []}, config: cfg(noHurt)});
      const d = driver(api, sim, tick, peek);
      d.click(); d.walk(1, 0, .25); d.click(); d.tool('matches'); d.click(d.last.player.x - .5, d.last.player.y); d.wait(4);
      d.throwAt(.5, .4); d.wait(12); sim.dispose();
    }
  },
  // A thrown lantern that breaks on clapboard: the pool is laid without the ground heat pulse (tools.js surfaceHit path).
  'lantern-on-siding'(api, tick, peek) {
    const house = api.NEIGHBORHOOD_SCENARIO.buildings.find(b => b.id === 'hopkins-nine');
    const sim = api.createSimulation({scenario: {id: 'neighborhood', width: 16, height: 44, buildings: [house], obstacles: [], actors: [],
      player: {x: 13.2, y: 34.63, tool: 'molotov', heading: Math.PI}}, config: cfg(noHurt)});
    const d = driver(api, sim, tick, peek);
    d.throwAt(-(.12 + .88 * 4.7 / 6), 0); d.wait(6); sim.dispose();
  }
};
