// r20: deck sections for sizes the catalogue does not contain. The topology builder is called directly with
// hand-made porch footprints on the Hopkins 12 plan: shorter than 1 m, non-integer length, deeper than wide,
// and just over an integer. For each: section count and size, area sum against the footprint, total front span
// against the perimeter, whether the sections form one linked chain, and whether any section is thinner than 0.2 m.
// Run: node r20-deck-odd-sizes.mjs
import {HEAD, r} from './lib.mjs';
const {HOUSING_PLANS} = await import(HEAD + 'content/housing-plans.js');
const {compileBuildings, localHousingFootprints} = await import(HEAD + 'content/buildings.js');
const {createHousingTopology} = await import(HEAD + 'simulation/housing-topology.js');
const {DEFAULT_CONFIG} = await import(HEAD + 'simulation/config.js');
const plan = HOUSING_PLANS['hopkins-4-12'], [building] = compileBuildings([{id: 'a', prefabId: 'hopkins-4-12', x: 24, y: 24, quarterTurns: 0}]).buildings;
const base = localHousingFootprints('hopkins-4-12');
let problems = 0;
for (const [width, depth] of [[.6, .6], [.99, 2], [1.01, 2], [2.5, 1], [7.3, 2], [8.0001, 2], [1, 3], [2, 2.4], [3, 3], [.4, 5.2]]) {
  const porch = {role: 'porch', x: width / 2, y: -depth / 2, width, depth, height: .48};
  const {porch: map} = createHousingTopology(building, plan, [base[0], porch, base[2]], DEFAULT_CONFIG);
  const pieces = map.get('porch'), area = pieces.reduce((s, p) => s + p.area, 0), span = pieces.flatMap(p => p.fronts).reduce((s, f) => s + f.span, 0);
  const seen = new Set([pieces[0]]), queue = [pieces[0]];
  for (const p of queue) for (const {target} of p.links) if (pieces.includes(target) && !seen.has(target)) { seen.add(target); queue.push(target); }
  const sizes = pieces.map((p, i) => i ? Math.hypot(p.x - pieces[i - 1].x, p.z - pieces[i - 1].z) : null).filter(v => v !== null);
  const along = width >= depth ? 'x' : 'z', pitch = sizes.length ? sizes[0] : Math.max(width, depth);
  const bad = Math.abs(area - width * depth) > 1e-9 || Math.abs(span - 2 * (width + depth)) > 1e-9 || seen.size !== pieces.length || pitch < .2;
  if (bad) problems++;
  console.log(`${bad ? 'PROBLEM' : 'ok     '} deck ${width} x ${depth} m: ${pieces.length} sections along ${along}, pitch ${r(pitch, 3)} m, area ${r(area, 4)}/${r(width * depth, 4)} m2, fronts ${r(span, 4)}/${r(2 * (width + depth), 4)} m, linked chain ${seen.size}/${pieces.length}`);
}
console.log(`${problems} problems`);
