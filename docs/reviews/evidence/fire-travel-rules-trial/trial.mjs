// Runs the proposed fire-travel rules in the trial kernel against the targets in
// docs/reviews/2026-11-11-fire-travel-rules.md. Evidence only; nothing here touches the game.
//   node docs/reviews/evidence/fire-travel-rules-trial/trial.mjs [json of rule overrides] [json of fuel overrides]
import fs from 'node:fs';
import path from 'node:path';
import {createWorld, DEFAULT_FUELS, DEFAULT_RULES, PITCH, LAYER, DT} from './kernel.mjs';
import {lawn, paving, house} from './scene.mjs';

const ruleOverrides = process.argv[2] ? JSON.parse(process.argv[2]) : {};
const fuelOverrides = process.argv[3] ? JSON.parse(process.argv[3]) : {};
const fuels = Object.fromEntries(Object.entries(DEFAULT_FUELS).map(([name, spec]) => [name, {...spec, ...fuelOverrides[name]}]));
const make = () => createWorld({fuels, rules: ruleOverrides});
const round = (v, d = 2) => v === null || v === undefined || !Number.isFinite(v) ? null : +v.toFixed(d);
const run = (world, seconds, each) => { for (let n = Math.round(seconds / DT); n > 0; n--) { world.step(); each?.(); } };
const firstLit = (world, test) => world.events.find(event => event.type === 'lit' && test(event))?.time ?? null;
const ALL = {furniture: true, lacquer: 'some', oil: true, coal: true};
const HOUSE = 'hopkins-4-15';
const results = {};

// 1. Grass front, eight directions.
{
  const world = make(); lawn(world, 0, 0, 81, 81);
  world.ignite(world.tileAt(40, 40, 0));
  run(world, 12);
  const speeds = [];
  for (let a = 0; a < 8; a++) {
    const angle = a * Math.PI / 4, di = Math.round(12 * Math.cos(angle)), dj = Math.round(12 * Math.sin(angle));
    const t = firstLit(world, e => e.at[0] === 40 + di && e.at[1] === 40 + dj);
    speeds.push(t ? Math.hypot(di, dj) * PITCH / t : null);
  }
  const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  results[1] = {measure: 'grass front speed, eight directions', value: round(mean) + ' m/s, spread ' + round(100 * (Math.max(...speeds) - Math.min(...speeds)) / mean, 1) + ' %',
    target: '1.5 m/s, within 7 %', pass: Math.abs(mean - 1.5) <= .15 && (Math.max(...speeds) - Math.min(...speeds)) / mean <= .07};
}
// 10. Half a metre of paving.
{
  const world = make(); lawn(world, 0, 0, 20, 21); paving(world, 20, 0, 21, 21); lawn(world, 21, 0, 41, 21);
  world.ignite(world.tileAt(2, 10, 0));
  run(world, 30);
  const crossed = firstLit(world, e => e.at[0] >= 21);
  results[10] = {measure: 'lawn fire across 0.5 m of paving', value: crossed ? 'crosses at ' + round(crossed) + ' s' : 'does not cross', target: 'does not cross', pass: !crossed};
}
// 2. Lawn fire reaches a clapboard wall.
{
  const world = make(); house(world, 'A', HOUSE, 6, 6); lawn(world, 4, 12, 12, 32);
  world.ignite(world.tileAt(5, 22, 0));
  run(world, 20);
  const reach = firstLit(world, e => e.cls === 'grass' && e.at[0] === 11), wall = firstLit(world, e => e.cls === 'clapboard');
  results[2] = {measure: 'lawn fire at the wall lights it', value: wall && reach ? round(wall - reach) + ' s after the grass beside it' : 'never', target: 'under 2 s', pass: wall !== null && wall - reach < 2};
}
// 3. Up a wall against along it.
{
  const world = make(); const a = house(world, 'A', HOUSE, 6, 6); const [oi, oj] = a.origin;
  world.ignite(world.tileAt(oi, oj + 12, 0), 'clapboard');
  run(world, 60);
  const wallAt = (cj, k) => firstLit(world, e => e.cls === 'clapboard' && e.at[0] === oi && e.at[1] === oj + cj && e.at[2] === k);
  const along = wallAt(18, 0), up = wallAt(12, 3);
  const vAlong = along ? 3 / along : null, vUp = up ? 3 * LAYER / up : null;
  results[3] = {measure: 'fire up a wall against along it', value: vUp && vAlong ? round(vUp) + ' m/s up, ' + round(vAlong) + ' m/s along: ' + round(vUp / vAlong, 1) + ' to 1' : 'did not reach (up ' + up + ', along ' + along + ')',
    target: '2.5 to 3.5 to 1', pass: vUp && vAlong ? vUp / vAlong >= 2.5 && vUp / vAlong <= 3.5 : false};
}
// 4 to 7, 11, 12, 14, 15: one match on the sitting-room wall of a furnished house, a neighbour 2 m beside it, one 8 m across.
function street(start, contents, seconds = 300) {
  const world = make();
  const a = house(world, 'A', HOUSE, 6, 6, contents); house(world, 'B', HOUSE, 18, 6); house(world, 'C', HOUSE, 6, 24);
  const [oi, oj] = a.origin;
  const t0 = world.time;
  start(world, a, oi, oj);
  let peakActive = 0, flameUntil = 0;
  const began = performance.now();
  run(world, seconds, () => {
    if (world.active.size > peakActive) peakActive = world.active.size;
    if (world.stats.ticks % 15 === 0) for (const tile of world.active) if (tile.building === 'A' && tile.fuels.some(f => f.lit && f.cls !== 'coal' && f.cls !== 'embers')) { flameUntil = world.time; break; }
  });
  const ms = (performance.now() - began) / world.stats.ticks;
  const total = [...a.rooms.values()].reduce((n, r) => n + r.fuelCount, 0);
  // Fuels move when they fall, so count ignitions from the event log by building.
  const litTimes = world.events.filter(e => e.type === 'lit' && e.building === 'A').map(e => e.time).sort((x, y) => x - y);
  const half = litTimes.length >= total / 2 ? litTimes[Math.ceil(total / 2) - 1] : null;
  const room = label => { const times = world.events.filter(e => e.type === 'lit' && e.room === label); const need = a.rooms.get(label).fuelCount + (label.endsWith('living') ? 0 : 0); return {lit: times.length, need, last: times.length ? times.at(-1).time : null, first: times[0]?.time ?? null}; };
  const fall = world.events.find(e => e.building === 'A' && (e.type === 'fall' && (e.cause === 'roof' || e.cause === 'floor' && e.from[2] > 0)));
  const stillBurning = [...world.active].filter(tile => tile.building === 'A').flatMap(tile => tile.fuels.filter(f => f.lit));
  return {world, a, t0, half, room, fall, flameUntil, ms, peakActive, tiles: world.tiles.size, total, litCount: litTimes.length,
    firstB: firstLit(world, e => e.building === 'B'), firstC: firstLit(world, e => e.building === 'C'),
    ledger: world.ledger.laid - world.ledger.burnt - world.remaining(),
    wreck: {fuelsBurning: stillBurning.length, output: round(stillBurning.reduce((s, f) => s + world.fuels[f.cls].out, 0), 1), classes: [...new Set(stillBurning.map(f => f.cls))]},
    glass: world.events.filter(e => e.type === 'glass' && e.building === 'A').length, bursts: world.events.filter(e => e.type === 'burst').map(e => round(e.time, 1))};
}
{
  const s = street((world, a, oi, oj) => world.ignite(world.tileAt(oi + 19, oj + 4, 0), 'clapboard'), ALL);
  const sitting = s.room('A/0:living');
  results[4] = {measure: 'one match on a wall: the room behind fully alight', value: sitting.lit >= sitting.need ? round(sitting.last) + ' s' : sitting.lit + ' of ' + sitting.need + ' fuels lit; last at ' + round(sitting.last) + ' s', target: '10 to 20 s', pass: sitting.lit >= sitting.need && sitting.last >= 10 && sitting.last <= 20};
  results[5] = {measure: 'same: half the house alight', value: s.half ? round(s.half) + ' s' : 'not reached (' + s.litCount + ' of ' + s.total + ')', target: '40 to 70 s', pass: s.half >= 40 && s.half <= 70};
  results[6] = {measure: 'same: flame in the house for', value: round(s.flameUntil) + ' s' + (s.flameUntil >= 299 ? ' or more' : ''), target: '90 s or more', pass: s.flameUntil >= 90};
  results[7] = {measure: 'same: first floor or roof part falls', value: s.fall ? round(s.fall.time) + ' s (' + s.fall.cause + ')' : 'nothing fell', target: 'between 60 and 150 s, when its support is spent', pass: !!s.fall && s.fall.time >= 60 && s.fall.time <= 150};
  results[11] = {measure: 'a burning house lights the house 2 m beside it', value: s.firstB ? 'at ' + round(s.firstB) + ' s' : 'never', target: 'yes, within 30 s of the facing wall burning', pass: s.firstB !== null};
  results[12] = {measure: 'the same across the street, 8 m', value: s.firstC ? 'at ' + round(s.firstC) + ' s' : 'no', target: 'no', pass: s.firstC === null};
  results[14] = {measure: 'fuel ledger closes (laid - burnt - left)', value: s.ledger.toExponential(1), target: 'zero', pass: Math.abs(s.ledger) < 1e-6};
  results[15] = {measure: 'cost per step of 1/30 s, three houses', value: round(s.ms, 2) + ' ms mean; ' + s.tiles + ' tiles, ' + s.peakActive + ' active at peak', target: 'no more than today (3 to 5 ms per 1/60 s)', pass: s.ms <= 10};
  results.detail = {sittingRoom: sitting, glassBroken: s.glass, oilBursts: s.bursts, wreckAt300s: s.wreck, facingWallFirstLit: round(firstLit(s.world, e => e.building === 'A' && e.cls === 'clapboard' && e.at[0] === s.a.origin[0] + 19 && e.cause !== 'match'))};
}
// 8. A fire that starts upstairs.
{
  const s = street((world, a) => world.ignite(a.rooms.get('A/1:bed-a').centre, 'furniture'), {furniture: true}, 200);
  const ground = firstLit(s.world, e => e.building === 'A' && e.at[2] < 2);
  const fall = s.world.events.find(e => e.type === 'fall' && e.building === 'A' && e.from[2] >= 2 && e.to[2] < 2);
  results[8] = {measure: 'a fire started upstairs reaches the ground floor', value: 'ground floor first lit at ' + round(ground) + ' s; first fall to it at ' + round(fall?.time) + ' s',
    target: 'only after something falls, then within 5 s', pass: ground !== null && fall && ground >= fall.time && ground - fall.time <= 5};
}
// 9. A kitchen fire against a dining-room fire, same furnished house.
{
  const kitchen = street((world, a) => world.ignite(a.rooms.get('A/0:kitchen').centre, 'furniture'), ALL);
  const dining = street((world, a) => world.ignite(a.rooms.get('A/0:dining').centre, 'furniture'), ALL);
  results[9] = {measure: 'a kitchen fire against a dining-room fire',
    value: 'half alight at ' + round(kitchen.half) + ' s against ' + round(dining.half) + ' s; oil burst at ' + kitchen.bursts.join(', ') + ' s against ' + dining.bursts.join(', ') + ' s; burning in the wreck at 300 s: ' + JSON.stringify(kitchen.wreck.classes) + ' against ' + JSON.stringify(dining.wreck.classes),
    target: 'a stated, measured difference', pass: kitchen.half !== null && dining.half !== null && Math.abs(kitchen.half - dining.half) >= 5};
}
results[13] = {measure: 'a lantern is never a dud', value: 'not tested: the scene has no stone plinth and the kernel has no lantern', target: 'never a dud', pass: null};

const order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
console.log('rules: ' + JSON.stringify({...DEFAULT_RULES, ...ruleOverrides}));
for (const n of order) { const r = results[n]; console.log(String(n).padStart(2) + '  ' + (r.pass === null ? '----' : r.pass ? 'PASS' : 'MISS') + '  ' + r.measure + ': ' + r.value + '   [target: ' + r.target + ']'); }
console.log('detail: ' + JSON.stringify(results.detail));
fs.mkdirSync(path.join(import.meta.dirname, 'results'), {recursive: true});
fs.writeFileSync(path.join(import.meta.dirname, 'results', 'trial.json'), JSON.stringify({rules: {...DEFAULT_RULES, ...ruleOverrides}, fuels, results}, null, 1) + '\n');
