// r16: lantern preview against real flight when the step length changes in mid-air. The powder drug slows the
// world to 0.35x for 8 s, so a lantern released just before it wears off flies its first frames in short steps and
// the rest in long ones; the arc is a chain of straight chords, so a different chain could clip or clear a thin
// blocker (0.045 m balusters, 0.075 m rails, 0.17 m posts on Hopkins 13's porch; 0.16 m walls).
// Hopkins 13 alone on paving. Stances along the porch front and the west notch, throw lengths 2.5-6 m,
// release 0 / 0.1 / 0.2 / 0.3 / 0.5 / 1 s before the powder ends, and one without powder.
// The preview is read from the last snapshot before the release frame. Control: tip2 (26931d9).
// Run: TB_TREES=<dir with tip2/> node r16-preview-under-powder.mjs
import {HEAD, TIP2, load, houseWorld, r} from './lib.mjs';
for (const [label, root] of [['HEAD', HEAD], ...(process.env.TB_TREES ? [['tip2', TIP2]] : [])]) {
  const api = await load(root), plan = api.HOUSING_PLANS['hopkins-4-13'];
  const placement = {id: 'house', prefabId: 'hopkins-4-13', x: 16, y: 16, quarterTurns: 0};
  let throws = 0, off = 0, worst = 0; const examples = [];
  const stances = [];
  for (let x = 1.6; x <= 5.4; x += .19) stances.push([[x, -4.2], [0, 1]]);            // across the porch rail
  for (let z = 4.3; z <= 7.7; z += .31) stances.push([[-3.2, z], [1, 0]]);            // into the west notch
  for (const [local, dir] of stances) for (const range of [2.5, 3.4, 4.3, 5.2, 6]) for (const lead of [null, 0, .1, .2, .3, .5, 1]) {
    const player = {x: placement.x + local[0], y: placement.y + local[1], tool: 'molotov'};
    const sim = api.createSimulation({scenario: houseWorld(api, [placement], {player, size: 40}), config: {input: {cameraRelative: false}, fire: {damagePerSecond: 0}}});
    const m = .12 + .88 * range / 6;
    let snapshot;
    if (lead !== null) sim.dispatch({type: 'drug', drug: 'powder'});
    sim.dispatch({type: 'primary', pressed: true}); sim.dispatch({type: 'primary', pressed: false});
    sim.dispatch({type: 'move', x: dir[0] * m, y: dir[1] * m}); sim.dispatch({type: 'move', x: 0, y: 0});
    const wait = lead === null ? 3 : Math.round((8 - lead) * 60) - 2;
    for (let i = 0; i < wait; i++) snapshot = sim.advance(api.STEP);
    const preview = snapshot.player.lanternAim?.impact;
    sim.dispatch({type: 'primary', pressed: true}); sim.advance(api.STEP); sim.dispatch({type: 'primary', pressed: false});
    let impact = null;
    for (let i = 0; i < 400 && !impact; i++) { const s = sim.advance(api.STEP); impact = s.events.find(e => e.type === 'molotov-impact'); }
    sim.dispose();
    if (!impact || !preview) { examples.push(`no ${impact ? 'preview' : 'impact'}: stance ${local} range ${range} lead ${lead}`); off++; continue; }
    throws++;
    const d = Math.hypot(preview.x - impact.x, preview.y - impact.y, preview.h - impact.h);
    worst = Math.max(worst, d);
    if (d > 1e-6) { off++; if (examples.length < 8) examples.push(`stance local(${r(local[0], 2)},${r(local[1], 2)}) range ${range} released ${lead} s before powder ends: preview (${r(preview.x)},${r(preview.y)}) h=${r(preview.h)} vs impact (${r(impact.x)},${r(impact.y)}) h=${r(impact.h)} -> ${r(d, 3)} m apart`); }
  }
  console.log(`${label}: ${throws} throws, preview differs from flight in ${off}; worst distance ${r(worst, 4)} m`);
  for (const line of examples) console.log('    ' + line);
}
