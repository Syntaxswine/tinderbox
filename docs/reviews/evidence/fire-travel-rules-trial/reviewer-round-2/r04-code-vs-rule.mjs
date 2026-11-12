// Round 2. Rule text against code, by switch.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r04-code-vs-rule.mjs <burst|listen|sky|order|step>
import crypto from 'node:crypto';
import {burn, round, plan} from './measure-var.mjs';
const part = process.argv[2];
const sig = r => crypto.createHash('sha256').update(JSON.stringify(r.world.events)).digest('hex').slice(0, 12);
const line = (label, r) => console.log(label.padEnd(44), 'events', String(r.world.events.length).padStart(5), sig(r), '| room', round(r.roomAll), '| half', round(r.half), '| first fall', round(r.fall?.time), '| flame until', r.flameUntil, '| B lit', JSON.stringify(r.neighbours));
const PANEL = [['hopkins-4-15', 'wall:x+:19:4'], ['hopkins-4-15', 'wall:y-:10:0'], ['hopkins-4-15', 'room:0:dining'], ['hopkins-4-15', 'room:1:bed-a'], ['hopkins-4-12', 'wall:x+:15:7'], ['hopkins-4-12', 'room:0:kitchen'],
  ['ashland-worker', 'room:0:kitchen'], ['hopkins-4-09', 'room:1:bed-a'], ['monroe-row', 'room:0:parlor'], ['hopkins-4-13', 'wall:y+:8:15']];

if (part === 'burst') {
  // Rule 8 and the number table: "Oil bursts at 1.4". If that number is live, moving it must move something.
  for (const burstAt of [1.4, .7, 2.0, 2.9, 99]) {
    const r = burn({at: 'room:0:kitchen', seconds: 150, rules: {burstAt}});
    line('kitchen strike, burstAt ' + burstAt, r);
    console.log('    bursts at', r.world.events.filter(e => e.type === 'burst').map(e => round(e.time) + ' s (' + e.tiles + ' tiles)').join(', '));
  }
  for (const burstAt of [1.4, 99]) line('dining strike, burstAt ' + burstAt, burn({at: 'room:0:dining', seconds: 150, rules: {burstAt}}));
  // What heat is the can's tile at when it bursts?
  let heatAtBurst = null;
  burn({at: 'room:0:dining', seconds: 60, each: world => { const e = world.events.find(e => e.type === 'burst'); if (e && heatAtBurst === null) heatAtBurst = world.time; }});
  const oilLightAt = .6;
  console.log('oil lightAt', oilLightAt, 'delay 0: the can bursts on the first step its exposure is at or above lightAt (kernel.mjs:301-304), so burstAt (kernel.mjs:300) is never the first test to pass.');
}
if (part === 'listen') {
  const width = plan('hopkins-4-15').width;
  for (const [label, args] of [['ashland wall:x+:11:7, 100 s', {planId: 'ashland-worker', at: 'wall:x+:11:7', seconds: 100}], ['pair 2 m bare, far-wall strike, 60 s', {at: 'wall:x-:0:10', seconds: 60, neighbours: [['B', 6 + width + 2, 6]]}]]) {
    line(label + ' (control)', burn(args));
    line(label + ' xNoListen', burn({...args, rules: {xNoListen: true}}));
  }
}
if (part === 'sky') {
  // "When a roof has burnt away, what burns under it reaches out." Freeze open-to-sky at its value before the fire.
  for (const [planId, at] of PANEL) {
    const a = burn({planId, at, seconds: 300}), b = burn({planId, at, seconds: 300, rules: {xFrozenSky: true}});
    line(planId + ' ' + at + ' (control)', a); line(planId + ' ' + at + ' xFrozenSky', b);
    console.log('    sight lines', a.world.stats.sightLines, 'against', b.world.stats.sightLines, '| tiles warmed by reach (tile-updates)', a.world.stats.fluxTiles, 'against', b.world.stats.fluxTiles, '| radiate ms', round(a.world.stats.radiateMs), round(b.world.stats.radiateMs));
  }
  // House tiles open to the sky over a burn.
  const counts = [];
  burn({at: 'room:0:dining', seconds: 200, each: (world, n) => { if (n % 300 === 0) { const memo = new Map(); let open = 0, all = 0, src = 0; for (const t of world.tiles.values()) if (t.building === 'A') { all++; if (world.openToSky(t, memo)) { open++; if (t.radOut > 0) src++; } } counts.push(round(world.time, 0) + ' s: ' + open + ' of ' + all + ' open, ' + src + ' of them giving reach'); } }});
  console.log('Hopkins 15 dining strike, house tiles open to the sky:\n    ' + counts.join('\n    '));
}
if (part === 'order') {
  for (const [planId, at] of PANEL.slice(0, 6)) {
    const base = burn({planId, at, seconds: 150});
    for (const xOrder of ['reverse', 'shuffle']) {
      const r = burn({planId, at, seconds: 150, rules: {xOrder}});
      let moved = 0, worst = 0;
      for (let n = 0; n < base.initial.length; n++) { const p = base.initial[n].fuel.litAt, q = r.initial[n].fuel.litAt; if (p !== q) { moved++; worst = Math.max(worst, Math.abs((p ?? 1e9) - (q ?? 1e9))); } }
      console.log(planId, at, xOrder, '| light times moved', moved, 'of', base.initial.length, 'worst', round(worst, 3), 's | room', round(base.roomAll), '->', round(r.roomAll), '| half', round(base.half), '->', round(r.half), '| first fall', round(base.fall?.time), '->', round(r.fall?.time), '| events', sig(base) === sig(r) ? 'IDENTICAL' : 'different');
    }
  }
}
if (part === 'step') {
  for (const [planId, at] of PANEL) {
    const out = [];
    for (const step of [1 / 60, 1 / 30, 1 / 15]) {
      const r = burn({planId, at, seconds: 150, rules: {step}});
      const lag = r.groundLit && r.fallToGround ? r.groundLit.time - r.fallToGround.time : null;
      out.push('room ' + round(r.roomAll) + ' half ' + round(r.half) + ' fall ' + round(r.fall?.time) + (r.struck.floor ? ' lag8 ' + round(lag) : ''));
    }
    console.log((planId + ' ' + at).padEnd(30), '1/60: ' + out[0].padEnd(42), '1/30: ' + out[1].padEnd(42), '1/15: ' + out[2]);
  }
}
