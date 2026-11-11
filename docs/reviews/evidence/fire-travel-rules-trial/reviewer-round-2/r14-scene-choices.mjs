// Round 2. Is the scene builder doing the fire rule's work? The same ten-strike panel the author tuned on, with one
// scene choice changed at a time. Rule 1 says "Only tiles that hold something, or are next to fire, exist": the kernel never
// makes a tile, so which air tiles exist is the scene's choice.
//   node docs/reviews/evidence/fire-travel-rules-trial/reviewer-round-2/r14-scene-choices.mjs <variant>
//   variants: base, air1, air2, ring2, eave, doorFirst, doorLast, corner, mirror
import {burn, strikesOf, plan, round} from './measure-var.mjs';
const variant = process.argv[2] ?? 'base';
const PANEL = [['hopkins-4-15', 'wall:x+:19:4'], ['hopkins-4-15', 'wall:y-:10:0'], ['hopkins-4-15', 'room:0:dining'], ['hopkins-4-15', 'room:1:bed-a'], ['hopkins-4-12', 'wall:x+:15:7'], ['hopkins-4-12', 'room:0:kitchen'],
  ['ashland-worker', 'room:0:kitchen'], ['hopkins-4-09', 'room:1:bed-a'], ['monroe-row', 'room:0:parlor'], ['hopkins-4-13', 'wall:y+:8:15']];
const opts = {base: {}, air1: {airAbove: 1}, air2: {airAbove: 2}, ring2: {ring: 2}, eave: {eave: 'roof'}, doorFirst: {door: 'first'}, doorLast: {door: 'last'}, corner: {contentsAt: 'corner'}, mirror: {}}[variant];
// A plan mirrored left to right: the same house, seen in a mirror.
const mirrored = id => {
  const p = plan(id), W = p.width;
  return {...p, floors: p.floors.map(f => ({...f, rooms: f.rooms.map(r => ({...r, polygon: r.polygon.map(([x, z]) => [W - x, z])})), windows: f.windows?.map(([x0, z0, x1, z1]) => [W - x0, z0, W - x1, z1]),
    stairs: f.stairs ? {...f.stairs, x: W - f.stairs.x - f.stairs.width} : f.stairs}))};
};
for (const [planId, at0] of PANEL) {
  let id = planId, at = at0;
  if (variant === 'mirror') {
    id = mirrored(planId);
    if (at.startsWith('wall')) {   // the mirrored wall tile: side x+ <-> x-, i -> (tiles across) - 1 - i
      const [, s, ci, cj] = at.split(':'), n = Math.round(plan(planId).width / .5);
      at = 'wall:' + (s[0] === 'x' ? 'x' + (s[1] === '+' ? '-' : '+') : s) + ':' + (n - 1 - +ci) + ':' + cj;
    }
  }
  const r = burn({planId: id, at, seconds: 150, sceneOpts: opts});
  const roofs = r.initial.filter(x => x.cls === 'roof'), roofFirst = Math.min(...roofs.map(x => x.fuel.litAt ?? Infinity)), fromAbove = roofs.filter(x => x.fuel.near && !x.fuel.near.building).length;
  console.log([variant.padEnd(9), planId.padEnd(15), at0.padEnd(15), 'room ' + round(r.roomAll) + ' (' + r.roomLit + '/' + r.roomN + ')', 'half ' + round(r.half), 'first fall ' + round(r.fall?.time), 'upstairs lit ' + round(r.upstairsLit?.time), 'ground lit ' + round(r.groundLit?.time),
    'first roof lit ' + round(roofFirst), 'roofs lit from the air side ' + fromAbove + '/' + roofs.length, 'flame until ' + round(r.flameUntil, 1)].join(' | '));
}
