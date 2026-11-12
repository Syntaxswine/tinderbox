// Round 6. The target 3 misses away from any porch (round 5, S4: "cause not found"). Each is struck again
// as the survey does it, then with the oil taken out of the house, then with glass that cannot break, then
// with the house empty. If a variant brings the ratio back into 2.5 to 3.5, that is the cause.
//   node reviewer-round-6/r12-t3-cause.mjs
import {burn, round} from '../measure.mjs';
const CASES = [['hopkins-4-09', 'wall:x-:0:12'], ['hopkins-4-09', 'wall:x-:0:13'], ['hopkins-4-09', 'wall:x-:0:16'], ['hopkins-4-09', 'wall:x-:0:17'], ['hopkins-4-13', 'wall:y+:1:7'],
  ['monroe-row', 'wall:x-:0:17'], ['monroe-row', 'wall:x-:0:20'], ['monroe-row', 'wall:x-:0:21'], ['monroe-row', 'wall:x-:0:23'], ['hopkins-4-09', 'wall:x-:0:9'], ['monroe-row', 'wall:x-:0:8']];
const VARIANTS = [['as surveyed', {}, undefined], ['no oil', {}, {furniture: true, lacquer: 'some', coal: true}], ['glass cannot break', {glassBreaks: 99}, undefined], ['empty house', {}, {}], ['empty, glass cannot break', {glassBreaks: 99}, {}]];
for (const [planId, at] of CASES) {
  const out = [];
  for (const [name, rules, contents] of VARIANTS) {
    const r = burn({planId, at, seconds: 60, rules, ...(contents ? {contents} : {})});
    const burst = r.world.events.find(e => e.type === 'burst'), glass = r.world.events.find(e => e.type === 'glass');
    out.push(name + ' ' + JSON.stringify(r.climb?.map(v => round(v))) + (name === 'as surveyed' ? ' (glass ' + round(glass?.time) + ' s, can bursts ' + round(burst?.time) + ' s)' : ''));
  }
  console.log(planId.padEnd(14) + at.padEnd(15) + out.join(' | '));
}
