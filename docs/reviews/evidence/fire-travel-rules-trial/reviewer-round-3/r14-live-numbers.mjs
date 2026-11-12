// Is every number in the two tables live? One scene with everything in it: furnished Hopkins 15, kitchen
// strike, an unfurnished neighbour 2 m away on bare ground, 200 s. Each number x1.2 (and x0.8): does the event log change?
//   node r14-live-numbers.mjs <part 0..7>    (8 parts, run in parallel)   |   node r14-live-numbers.mjs base
import {burn, round, hashEvents, plan} from './lib.mjs';
import {DEFAULT_RULES, DEFAULT_FUELS} from '../kernel.mjs';
const width = plan('hopkins-4-15').width;
const go = (rules, fuels) => { const r = burn({at: 'room:0:kitchen', seconds: 200, rules, fuels, neighbours: [['B', 6 + width + 2, 6]]}); return {hash: hashEvents(r.world.events), half: round(r.half), room: round(r.roomAll), B: round(r.neighbours.B), fall: round(r.fall?.time), flame: r.flameUntil}; };
const variants = [];
for (const [k, v] of Object.entries(DEFAULT_RULES)) {
  if (k === 'step' || k === 'reachUnderCover') continue;
  if (k === 'pass') { for (const [pk, pv] of Object.entries(v)) for (const m of [1.2, .8]) variants.push(['pass.' + pk + ' x' + m, {pass: {[pk]: pv * m}}, {}]); continue; }
  for (const m of [1.2, .8]) variants.push([k + ' x' + m, {[k]: v * m}, {}]);
}
for (const [cls, spec] of Object.entries(DEFAULT_FUELS)) for (const [k, v] of Object.entries(spec)) {
  if (cls === 'grass') continue;
  if (v === 0) { variants.push([cls + '.' + k + ' 0 -> 0.5', {}, {[cls]: {[k]: .5}}]); continue; }
  for (const m of [1.2, .8]) variants.push([cls + '.' + k + ' x' + m, {}, {[cls]: {[k]: v * m}}]);
}
const part = process.argv[2];
const base = go({}, {});
if (part === 'base') { console.log('base', JSON.stringify(base), 'variants', variants.length); process.exit(0); }
variants.forEach(([name, rules, fuels], n) => {
  if (n % 8 !== +part) return;
  const r = go(rules, fuels);
  console.log((r.hash === base.hash ? 'DEAD  ' : 'live  ') + name.padEnd(26) + ' half ' + base.half + ' -> ' + r.half + ', room ' + base.room + ' -> ' + r.room + ', neighbour ' + base.B + ' -> ' + r.B + ', first fall ' + base.fall + ' -> ' + r.fall + ', flame ' + base.flame + ' -> ' + r.flame);
});
