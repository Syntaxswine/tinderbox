// Round 1, probe 13. (a) UP, measured properly: a ceiling lit from below burns on its lower side (kernel `giveTo`), so
// "an upstairs fuel is lit" is not "fire is upstairs". Here: the first upstairs tile (k >= 2) to reach heat 1.1 (clapboard's
// lighting point), and the first upstairs fuel to light that is not a floor lit from below. (b) DOWN with every piece of
// furniture lacquered (lacquer lights at 0.5 with no delay): does the ground floor light before anything falls?
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r13-up-and-lacquer.mjs
import {burn, round, out, HOUSING_PLANS} from './lib.mjs';
const lines = [], pad = (s, n) => String(s ?? 'never').padEnd(n);
const two = Object.keys(HOUSING_PLANS).filter(id => HOUSING_PLANS[id].floors.length > 1);
lines.push('(a) UP: furniture lit in a ground-floor room, furniture-only house, 90 s.');
lines.push(pad('plan', 14) + pad('room', 9) + pad('stair in room', 15) + pad('as written: upstairs hot', 26) + pad('first real upstairs fuel', 34) + pad('| no wall rule: hot', 21) + pad('first real fuel', 30) + '| no wall rule, stair opening floored over: hot / fuel');
const all = [];
for (const planId of two) for (const room of HOUSING_PLANS[planId].floors[0].rooms) {
  const label = 'A/0:' + room.id;
  const run = (variant, floored) => {
    let hot = null;
    const r = burn({planId, contents: {furniture: true}, seconds: 90, world: {variant}, strike: (world, a) => { world.ignite(a.rooms.get(label).centre, 'furniture'); return label; },
      before: floored ? (world, a) => { for (const rec of a.rooms.values()) if (rec.floor === 1) for (const t of rec.tiles) if (t.k === 2 && !t.fuels.some(f => f.supports)) { const object = world.setFace(t.i, t.j, 2, 2, -1, 'timber'); world.addFuel(t, 'frame', 1, {supports: true, face: {axis: 2, step: -1, object}}); } } : undefined,
      each: world => { if (hot === null && world.stats.ticks % 3 === 0) for (const t of world.active) if (t.k >= 2 && t.heat >= 1.1) { hot = world.time; break; } }});
    const real = r.initial.filter(x => x.tile.k >= 2 && x.fuel.litAt !== null && !(x.fuel.face && x.fuel.face.axis === 2 && x.fuel.face.step === -1 && x.fuel.giveTo)).sort((a, b) => a.fuel.litAt - b.fuel.litAt)[0];
    return {hot, real};
  };
  const st = HOUSING_PLANS[planId].floors[1].stairs, c = room.polygon, xs = c.map(p => p[0]), zs = c.map(p => p[1]);
  const hasStair = st && st.x < Math.max(...xs) && st.x + st.width > Math.min(...xs) && st.z < Math.max(...zs) && st.z + st.run > Math.min(...zs);
  const base = run({}), noWall = run({noWallContinuity: true}), sealed = run({noWallContinuity: true}, true);
  all.push({base, noWall, sealed});
  const f = x => round(x.real?.fuel.litAt) + ' s ' + x.real?.cls + (x.real?.fuel.face ? (x.real.fuel.face.axis === 2 ? ' roof' : ' wall') : '');
  lines.push(pad(planId, 14) + pad(room.id, 9) + pad(hasStair ? 'yes' : 'no', 15) + pad(round(base.hot) + ' s', 26) + pad(f(base), 34) + pad('| ' + round(noWall.hot) + ' s', 21) + pad(f(noWall), 30) + '| ' + round(sealed.hot) + ' s / ' + f(sealed));
}
const stat = k => { const v = all.map(x => x[k].real?.fuel.litAt ?? Infinity); return 'first real upstairs fuel ' + round(Math.min(...v)) + ' to ' + round(Math.max(...v)) + ' s'; };
lines.push('TOTAL over ' + all.length + ' ground-floor rooms: as written ' + stat('base') + '; no wall rule ' + stat('noWall') + '; no wall rule and no stair opening ' + stat('sealed'));

lines.push('', '(b) DOWN with every piece of furniture lacquered: upstairs strike; first ground-storey fuel lit against the first fall to the ground storey.');
let before = 0, n = 0;
for (const planId of two) for (const room of HOUSING_PLANS[planId].floors[1].rooms) {
  const label = 'A/1:' + room.id;
  const r = burn({planId, contents: {furniture: true, lacquer: 'all'}, seconds: 80, strike: (world, a) => { world.ignite(a.rooms.get(label).centre, 'furniture'); return label; }});
  const ev = r.world.events, fall = ev.find(e => e.type === 'fall' && e.from[2] >= 2 && e.to[2] < 2), ground = ev.find(e => e.type === 'lit' && e.at[2] < 2);
  n++; if (ground && (!fall || ground.time < fall.time)) before++;
  lines.push('    ' + pad(planId, 14) + pad(room.id, 9) + 'first fall to ground ' + pad(round(fall?.time) + ' s', 10) + 'ground lit ' + round(ground?.time) + ' s ' + ground?.cls + (ground && (!fall || ground.time < fall.time) ? '   <-- BEFORE any fall' : ''));
}
lines.push('    ground storey lit before anything fell: ' + before + ' of ' + n);
out('r13-up-and-lacquer.txt', lines);
