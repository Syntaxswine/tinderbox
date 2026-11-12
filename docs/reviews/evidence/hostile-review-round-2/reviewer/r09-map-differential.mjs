// Fix A, ground plan. (1) This tree's mounted map against the round-1 tree's (4fc97bb), on the same real snapshots:
// terrain paths, building outline path, fire path, fire count and the spoken label, every frame. One map is reused across
// every simulation of a script. (2) A hand-made case for the stated contract "the ground plan also accepts legacy mutable
// snapshots": a frozen LIST whose records are still mutable, edited in place between updates.
// Usage: node r09-map-differential.mjs [script-name ...]
import {load, OLD, HEAD, r} from './lib.mjs';
const api = await load();
const {SCRIPTS} = await import('./scripts.mjs');

function svgElement() {
  const attributes = new Map(), children = [];
  return {attributes, children, dataset: {}, setAttribute: (k, v) => attributes.set(k, v), removeAttribute: k => attributes.delete(k),
    append: (...nodes) => children.push(...nodes), prepend: node => children.unshift(node), replaceChildren: () => { children.length = 0; }};
}
async function mounted(root) {
  const {mountMap} = await import(root + 'ui/map.js');
  const host = svgElement(); host.ownerDocument = {createElementNS: svgElement};
  const {update} = mountMap(host, {});
  const [svg] = host.children, [terrain, buildings, fire] = svg.children;
  return {update, read: () => ({terrain: terrain.children.map(p => p.attributes.get('fill') + ':' + p.attributes.get('d')).join('~'),
    buildings: buildings.attributes.get('d'), fire: fire.attributes.get('d'), count: host.dataset.fireCount, label: host.attributes.get('aria-label'),
    box: svg.attributes.get('viewBox')})};
}
const names = process.argv.slice(2).filter(a => a !== 'hole');
let total = 0;
for (const name of names.length ? names : process.argv.includes('hole') ? [] : Object.keys(SCRIPTS)) {
  const head = await mounted(HEAD), old = await mounted(OLD), legacy = await mounted(HEAD), fail = {};
  let frames = 0, peak = 0; const started = Date.now();
  const note = (kind, text) => { (fail[kind] ??= {count: 0, first: []}).count++; if (fail[kind].first.length < 3) fail[kind].first.push(text); };
  function feed(s, how) {
    frames++; head.update(s); old.update(s); legacy.update(structuredClone(s));
    const a = head.read(), b = old.read(), c = legacy.read(); peak = Math.max(peak, +b.count);
    for (const key of Object.keys(b)) {
      if (a[key] !== b[key]) note('this-tree vs round-1: ' + key, `${how} tick ${s.tick}: ${String(a[key]).slice(0, 60)} | ${String(b[key]).slice(0, 60)}`);
      if (c[key] !== b[key]) note('legacy-path vs round-1: ' + key, `${how} tick ${s.tick}`);
    }
    return s;
  }
  SCRIPTS[name](api, (sim, dt) => feed(sim.advance(dt), 'advance'), sim => feed(sim.snapshot(), 'snapshot'));
  const kinds = Object.keys(fail); total += kinds.length;
  console.log(`== ${name}: ${frames} frames in ${r((Date.now() - started) / 1000, 1)} s; peak fire boxes ${peak} ==`);
  console.log(kinds.length ? '   DIFFERENCES ' + JSON.stringify(fail, null, 1) : '   map output identical in every frame');
}

console.log('\n== frozen list of mutable records, edited in place (not produced by the simulation; a contract edge) ==');
for (const [label, root] of [['this tree', HEAD], ['round-1 tree (control)', OLD]]) {
  const map = await mounted(root);
  const cells = Object.freeze([{id: 'a', x: .25, y: .25, phase: 'cold'}, {id: 'b', x: .75, y: .25, phase: 'cold'}]);
  const snapshot = {version: 1, world: {width: 4, height: 4, fireCellSize: .5, tiles: [], obstacles: []}, player: {x: 1, y: 1}, cells};
  map.update(snapshot); const before = map.read().count;
  cells[0].phase = 'burning'; map.update(snapshot); const lit = map.read().count;
  cells[0].phase = 'spent'; cells[1].phase = 'burning'; map.update({...snapshot}); const moved = map.read();
  console.log(`   ${label}: fire count ${before} -> after cell a ignites ${lit} (expected 1) -> after a goes out and b ignites ${moved.count}, path ${moved.fire || '(empty)'} (expected 1, M0.5 0h0.5v0.5h-0.5Z)`);
}
console.log(total ? `\nRESULT: ${total} difference kind(s) on real snapshots` : '\nRESULT: on real snapshots the map output is identical to round 1 in every frame');
