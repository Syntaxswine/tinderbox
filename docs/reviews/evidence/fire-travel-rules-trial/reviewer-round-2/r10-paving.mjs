// Round 2. Target 10: a lawn fire does not cross 0.5 m of paving. Other angles, and the tuned numbers moved 10 %.
// A strip of bare ground of a given width at a given angle is cut through an 81 x 81 tile lawn by leaving
// grass off every tile whose centre lies inside the strip. A fire is lit on one side.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r10-paving.mjs <angles|numbers>
import {make, round, PITCH} from './measure-var.mjs';
const part = process.argv[2];
function strip({angle, width = .5, offset = 0, rules = {}, fuels = {}, noTiles = false}) {
  const world = make(rules, fuels), N = 81, c = 40, a = angle * Math.PI / 180, nx = Math.cos(a), ny = Math.sin(a);
  // signed distance (m) of a tile centre from the strip's centre line, which passes `offset` metres from the lawn's middle tile
  const dist = (i, j) => ((i - c) * nx + (j - c) * ny) * PITCH - offset;
  let paved = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const d = dist(i, j), inStrip = Math.abs(d) < width / 2 - 1e-9 || Math.abs(Math.abs(d) - width / 2) <= 1e-9 && d < 0;
    if (inStrip) { paved++; if (!noTiles) world.addTile(i, j, 0); continue; }
    world.addFuel(world.addTile(i, j, 0), 'grass', 1);
  }
  // light a tile well on the near side
  const start = [Math.round(c - 24 * nx), Math.round(c - 24 * ny)];
  world.ignite(world.tileAt(start[0], start[1], 0));
  for (let n = Math.round(50 / world.dt); n > 0; n--) world.step();
  const far = world.events.filter(e => e.type === 'lit' && dist(e.at[0], e.at[1]) > 0);
  let peak = 0;
  return {crossed: far.length ? far[0].time : null, paved};
}
if (part === 'angles') {
  for (const width of [.5, .75, 1]) {
    const out = [];
    for (const angle of [0, 5, 10, 15, 20, 26.565, 30, 35, 40, 45, 50, 60, 63.435, 70, 80, 90]) {
      const res = [0, .125, .25].map(offset => strip({angle, width, offset}));
      const crossed = res.filter(r => r.crossed !== null);
      out.push(round(angle, 1) + '°: ' + (crossed.length ? 'CROSSES in ' + crossed.length + ' of 3 placements (first at ' + round(crossed[0].crossed) + ' s)' : 'holds'));
    }
    console.log('strip ' + width + ' m wide, three placements each:\n   ' + out.join('\n   '));
  }
}
if (part === 'numbers') {
  for (const [name, rules, fuels] of [['as tuned', {}, {}], ['grass out 0.735 (+5 %)', {}, {grass: {out: .735}}], ['grass out 0.77 (+10 %)', {}, {grass: {out: .77}}], ['rate 4.4 (+10 %)', {rate: 4.4}, {}], ['loss 1.8 (-10 %)', {loss: 1.8}, {}], ['falloff 1.35 (-10 %)', {falloff: 1.35}, {}], ['grass lights at 0.765 (-10 %)', {}, {grass: {lightAt: .765}}],
    ['step 1/60', {step: 1 / 60}, {}], ['step 1/120', {step: 1 / 120}, {}], ['radiantGain 0.6', {radiantGain: .6}, {}], ['radiantGain 1', {radiantGain: 1}, {}], ['grass radiates 0.2', {}, {grass: {radiates: .2}}], ['grass radiates 0.3', {}, {grass: {radiates: .3}}]]) {
    const out = [];
    for (const [label, o] of [['0.5 m square to the grid', {angle: 0, width: .5}], ['0.5 m at 45°', {angle: 45, width: .5, offset: 0}], ['0.5 m at 26.6°', {angle: 26.565, width: .5}], ['0.5 m at 45°, other placement', {angle: 45, width: .5, offset: .125}], ['0.75 m at 45°', {angle: 45, width: .75}]]) {
      const r = strip({...o, rules, fuels});
      out.push(label + ': ' + (r.crossed === null ? 'holds' : 'CROSSES ' + round(r.crossed) + ' s'));
    }
    console.log(name.padEnd(30), out.join(' | '));
  }
}
