// Round 1, probe 2. (a) CONTROL: the reviewer copies (kernel-var, scene-var) reproduce the original kernel's
// event log exactly on the trial's main scene. (b) What trial.mjs's measures 4, 5, 8, 11 actually count,
// against a stricter reading of the same target.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-1/r02-control-and-definitions.mjs
import {createWorld, DT} from '../kernel.mjs';
import * as orig from '../scene.mjs';
import {burn, ALL, round, out, createVar, house} from './lib.mjs';

const lines = [];
// (a) the original, exactly as trial.mjs builds target 4's scene, 120 s.
const w0 = createWorld();
const a0 = orig.house(w0, 'A', 'hopkins-4-15', 6, 6, ALL); orig.house(w0, 'B', 'hopkins-4-15', 18, 6); orig.house(w0, 'C', 'hopkins-4-15', 6, 24);
w0.ignite(w0.tileAt(a0.origin[0] + 19, a0.origin[1] + 4, 0), 'clapboard');
for (let n = 0; n < 120 * 30; n++) w0.step();
const sig = w => w.events.map(e => [e.type, e.time.toFixed(4), (e.at ?? e.from).join(','), e.cls ?? e.cause ?? ''].join(' ')).join('\n');
const r = burn({seconds: 120, neighbours: [['B', 18, 6], ['C', 6, 24]], strike: (world, a) => { const t = world.tileAt(a.origin[0] + 19, a.origin[1] + 4, 0); world.ignite(t, 'clapboard'); return t.room; }});
lines.push('(a) CONTROL original kernel+scene vs reviewer copies, trial scene, 120 s: events ' + w0.events.length + ' vs ' + r.world.events.length + ', identical log: ' + (sig(w0) === sig(r.world)));

// (b) definitions.
const sitting = a0.rooms.get('A/0:living');
const litEvents = w0.events.filter(e => e.type === 'lit' && e.room === 'A/0:living');
const fuelsNow = sitting.tiles.reduce((n, t) => n + t.fuels.length, 0);
lines.push('', '(b) target 4, "room fully alight" in trial.mjs = (count of lit EVENTS labelled with the room) >= fuelCount, time = the last such event.');
lines.push('  fuelCount (taken before contents are added) = ' + sitting.fuelCount + '; lit events in room = ' + litEvents.length + '; last at ' + round(litEvents.at(-1).time) + ' s');
lines.push('  stricter: every fuel object that started in the room has litAt set: ' + r.roomLit + ' of ' + r.roomN + '; time of the last = ' + round(r.roomAll) + ' s');
const byCls = {}; for (const x of r.initial.filter(x => x.room === r.room)) { const k = x.cls + (x.fuel.face ? (x.fuel.face.axis === 2 ? ':floor/roof' : ':wall') : ''); byCls[k] = byCls[k] ?? {n: 0, last: 0}; byCls[k].n++; byCls[k].last = Math.max(byCls[k].last, x.fuel.litAt ?? Infinity); }
lines.push('  by class: ' + Object.entries(byCls).map(([k, v]) => k + ' x' + v.n + ' last ' + round(v.last)).join('; '));
// How much of the room is burning at once at the "fully alight" time, and what share of the room's tiles have heat >= 1.1
lines.push('', '  target 5, "half the house alight" in trial.mjs = the time of the (N/2)th lit EVENT in building A, where N = structural fuels only (contents excluded from N, included in events).');
lines.push('  trial N = ' + [...a0.rooms.values()].reduce((n, x) => n + x.fuelCount, 0) + ', all fuels at start = ' + r.n + '; cumulative-ignited half (all fuels) at ' + round(r.half) + ' s; half BURNING AT ONCE first at ' + round(r.halfBurningAt) + ' s; peak share burning at once ' + round(100 * r.peakBurningShare, 1) + ' %');

// target 11: how much of A is burning when B's first fuel starts to char and when it lights.
{
  const world = createVar();
  const a = house(world, 'A', 'hopkins-4-15', 6, 6, ALL); house(world, 'B', 'hopkins-4-15', 18, 6);
  world.ignite(world.tileAt(a.origin[0] + 19, a.origin[1] + 4, 0), 'clapboard');
  let charStart = null, lit = null;
  const litA = () => { let n = 0, tiles = 0, total = 0; for (const rec of a.rooms.values()) for (const t of rec.tiles) { let any = false; for (const f of t.fuels) { total++; if (f.lit) { n++; any = true; } } if (any) tiles++; } return {n, tiles, total}; };
  const bTiles = [...world.tiles.values()].filter(t => t.building === 'B');
  for (let n = 0; n < 30 * 30 && lit === null; n++) {
    world.step();
    if (charStart === null && bTiles.some(t => t.fuels.some(f => f.char > 0))) charStart = {time: world.time, ...litA(), maxRad: Math.max(...bTiles.map(t => t.rad))};
    if (bTiles.some(t => t.fuels.some(f => f.lit))) lit = {time: world.time, ...litA(), maxRad: Math.max(...bTiles.map(t => t.rad))};
  }
  lines.push('', '  target 11 says "a FULLY BURNING house lights the house 2 m beside it". In the trial the match is struck on the wall that faces B.');
  lines.push('  B starts to char at ' + round(charStart.time) + ' s with ' + charStart.n + ' of ' + charStart.total + ' fuels (' + charStart.tiles + ' tiles) burning in A; max radiant on B ' + round(charStart.maxRad));
  lines.push('  B lights at ' + round(lit.time) + ' s with ' + lit.n + ' of ' + lit.total + ' fuels (' + lit.tiles + ' tiles) burning in A = ' + round(100 * lit.n / lit.total, 1) + ' % of the house; max radiant on B ' + round(lit.maxRad) + ' (heat cap is 4)');
}
// target 8 measure: events that are not counted as "ground floor lit".
{
  const s = burn({contents: {furniture: true}, seconds: 60, strike: (world, a) => { world.ignite(a.rooms.get('A/1:bed-a').centre, 'furniture'); return 'A/1:bed-a'; }});
  const ev = s.world.events;
  const firstFallDown = ev.find(e => e.type === 'fall' && e.from[2] >= 2 && e.to[2] < 2);
  const firstGroundEvent = ev.find(e => e.type === 'lit' && e.at[2] < 2);
  // earliest moment any ground-floor tile has heat >= 0.5 or a burning fuel (embers have no lit event).
  lines.push('', '  target 8: first fall to ground floor ' + round(firstFallDown?.time) + ' s (cause ' + firstFallDown?.cause + ', from ' + firstFallDown?.from + ' to ' + firstFallDown?.to + ', carried ' + JSON.stringify(firstFallDown?.carried) + '); first ground lit EVENT ' + round(firstGroundEvent?.time) + ' s (' + firstGroundEvent?.cls + ' at ' + firstGroundEvent?.at + ')');
  lines.push('  the falling thing is ' + (firstFallDown?.cause === 'wall' ? 'embers from a spent WALL/DOOR face, not a floor: 0.2 of a tile of embers made at the moment the face is spent' : firstFallDown?.cause));
}
out('r02-control-and-definitions.txt', lines);
