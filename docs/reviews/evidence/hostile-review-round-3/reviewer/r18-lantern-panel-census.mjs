// r18: one lantern at every ground-storey wood wall panel of the two set-back plans, every quarter turn.
// Stance: on the panel's outward normal, 3 m from the wall face if that is legal ground, else the nearest legal
// distance from 2 to 5.5 m in 0.25 m steps. Landing marker 0.45 m past the wall face (the records' own offset).
// For each throw: was THAT panel heated or lit by the lantern, was any structure lit, and how much of the
// lantern's 0.3 L was laid as a pool (diagnostics.fuel.molotovFuel).
// Panels are split into flush (wall face within 0.02 m of the coarse collision box edge) and set back.
// Control: tip2 (26931d9). Run: TB_TREES=<dir with tip2/> node r18-lantern-panel-census.mjs
import {HEAD, TIP2, load, houseWorld, r} from './lib.mjs';
for (const [label, root] of [['HEAD', HEAD], ...(process.env.TB_TREES ? [['tip2', TIP2]] : [])]) {
  const api = await load(root);
  const {exteriorPlanEdges} = await import(root + 'content/housing-envelope.js');
  const total = {flush: {n: 0, panel: 0, any: 0, pool: 0, nothing: 0}, setback: {n: 0, panel: 0, any: 0, pool: 0, nothing: 0}}, missed = [];
  for (const prefabId of ['hopkins-4-09', 'hopkins-4-13']) for (const quarterTurns of process.env.R18_TURNS ? [...process.env.R18_TURNS].map(Number) : [0, 1, 2, 3]) {   // R18_TURNS=0 keeps quarter turn 0 only (used by r15)
    const plan = api.HOUSING_PLANS[prefabId];
    const centre = api.buildingPoint({x: 0, y: 0, quarterTurns}, {x: plan.width / 2, y: plan.depth / 2});
    const placement = {id: 'house', prefabId, x: 20 - centre.x, y: 20 - centre.y, quarterTurns};
    const toWorld = (x, z) => api.buildingPoint(placement, {x, y: z});
    for (const e of exteriorPlanEdges(plan.floors[0])) {
      const face = [e.x + e.nx * .08, e.z + e.nz * .08];
      const outside = Math.max(-face[0] - .09, face[0] - plan.width - .09, -face[1] - .09, face[1] - plan.depth - .09);   // > -0.02: on the coarse box edge
      const kind = outside > -.03 ? 'flush' : 'setback';
      let done = false;
      for (const distance of [3, 2.75, 3.25, 2.5, 3.5, 2.25, 3.75, 2, 4, 4.25, 4.5, 4.75, 5, 5.25, 5.5]) {
        const stand = toWorld(face[0] + e.nx * distance, face[1] + e.nz * distance), n = api.buildingPoint({x: 0, y: 0, quarterTurns}, {x: e.nx, y: e.nz});
        let sim;
        try { sim = api.createSimulation({scenario: houseWorld(api, [placement], {player: {...stand, tool: 'molotov'}, size: 40}), config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}, events: {capacity: 1024}}}); }
        catch { continue; }
        const range = distance + .45, m = .12 + .88 * range / 6;
        if (range > 6) { sim.dispose(); continue; }
        sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
        sim.dispatch({type: 'move', x: -n.x * m, y: -n.y * m}); sim.dispatch({type: 'move', x: 0, y: 0});
        sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: true}); sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: false});
        let impact, panelHit = false, any = false, ground = false, last;
        const ids = [`house/wall:0:${e.id}:0`, `house/wall:0:${e.id}:1`];
        for (let i = 0; i < 150; i++) {
          last = sim.advance(api.STEP);
          for (const ev of last.events) if (ev.tick === last.tick) {
            if (ev.type === 'molotov-impact') impact = ev;
            if (ev.type === 'structure-ignition') { any = true; if (ids.includes(ev.siteId) && ev.cause === 'molotov') panelHit = true; }
            if (ev.type === 'ignition') ground = true;
          }
          if (impact && last.tick - impact.tick > 45) break;
        }
        const t = total[kind]; t.n++; if (panelHit) t.panel++; if (any) t.any++; t.pool += last.diagnostics.fuel.molotovFuel; if (!any && !ground) t.nothing++;
        if (!panelHit && missed.length < 10) missed.push(`${prefabId} q${quarterTurns} ${kind} wall:0:${e.id} from ${distance} m: impact h=${r(impact?.h)} pool ${last.diagnostics.fuel.molotovFuel} L, any structure lit ${any}`);
        sim.dispose(); done = true; break;
      }
      if (!done) missed.push(`${prefabId} q${quarterTurns} ${kind} wall:0:${e.id}: no legal stance on its normal`);
    }
  }
  for (const [kind, t] of Object.entries(total)) console.log(`${label} ${kind}: ${t.n} panels thrown at; that panel lit by the lantern ${t.panel}; any structure lit ${t.any}; nothing lit at all ${t.nothing}; pool laid ${r(t.pool, 2)} L of ${r(t.n * .3, 2)} L thrown`);
  for (const line of missed) console.log('    ' + line);
}
