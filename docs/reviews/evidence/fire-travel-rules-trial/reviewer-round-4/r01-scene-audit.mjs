// Round 4. Scene audit: windows and entry against the game's exteriorPlanEdges, the porch, what each
// survey strike actually hits.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {make, house, outsideWalls, strikesOf, PLANS, ALL, PITCH, plan} from '../measure.mjs';
const root = path.resolve(import.meta.dirname, '../../../../..');
const {exteriorPlanEdges} = await import(pathToFileURL(path.join(root, 'src/content/housing-envelope.js')).href);

for (const planId of PLANS) {
  const p = plan(planId), world = make(), a = house(world, 'A', planId, 6, 6, ALL);
  console.log('== ' + planId + '  width ' + p.width + ' depth ' + p.depth + ' porch ' + JSON.stringify(p.porch) + ' partyWalls ' + !!p.partyWalls + ' declaresWindows ' + p.floors.map(f => Array.isArray(f.windows)));
  for (const [f, floor] of p.floors.entries()) {
    const edges = exteriorPlanEdges(floor), win = edges.filter(e => e.opening === 'window'), diag = e => e.a[0] !== e.b[0] && e.a[1] !== e.b[1];
    const side = win.filter(e => !diag(e) && e.a[0] === e.b[0]), sideAtEdge = side.filter(e => e.a[0] === 0 || e.a[0] === p.width);
    // glass faces in the scene on this floor's upper layer, and door/clapboard on outside walls
    let glass = 0, doors = 0, clap = 0;
    for (const [id, face] of world.faces) if (face.kind === 'glass') { const cell = Math.floor(id / 3), k = Math.floor(cell / (512 * 512)) - 2; if (k === 2 * f + 1) glass++; }
    for (const k of [2 * f, 2 * f + 1]) for (const w of outsideWalls(world, a, k)) { if (w.fuel.cls === 'door') doors++; else clap++; }
    console.log('  floor ' + f + ': game edges ' + edges.length + ' (diagonal ' + edges.filter(diag).length + '), windows ' + win.length + ' (diagonal ' + win.filter(diag).length + ', on x-constant walls ' + side.length + ' of which at x=0 or x=width ' + sideAtEdge.length + '), entry ' + edges.filter(e => e.opening === 'entry').length
      + ' | scene: glass faces ' + glass + ' (= ' + glass / 2 + ' window edges), outside door faces ' + doors + ', clapboard faces ' + clap + ', reported glass ' + a.glass[f]);
  }
  // porch
  const porchFuel = a.porch.reduce((s, t) => s + t.fuels.reduce((q, fu) => q + fu.amount, 0), 0);
  let houseFuel = 0; for (const r of a.rooms.values()) for (const t of r.tiles) for (const fu of t.fuels) houseFuel += fu.amount;
  console.log('  porch tiles ' + a.porch.length + ' (deck+roof), fuel ' + porchFuel + ' tile-fulls; house labelled fuel ' + houseFuel.toFixed(1) + '; ledger.laid ' + world.ledger.laid.toFixed(1) + ' (so porch in ledger: ' + (Math.abs(world.ledger.laid - houseFuel - porchFuel) < 1e-9) + ')');
  // strikes
  for (const at of strikesOf(planId).filter(s => s.startsWith('wall') && !s.endsWith(':in'))) {
    const [, side, ci, cj] = at.split(':'), tile = world.tileAt(a.origin[0] + +ci, a.origin[1] + +cj, 0), w = outsideWalls(world, a).find(w => w.tile === tile && w.side === side);
    const above = world.faceBetween(tile.i, tile.j, 1, w.fuel.face.axis, w.fuel.face.step);
    console.log('  strike ' + at.padEnd(16) + ' hits ' + w.fuel.cls.padEnd(9) + ' room ' + w.room.padEnd(12) + ' outside tile holds [' + w.outside.fuels.map(fu => fu.cls).join(',') + '] face above: ' + (above?.kind ?? 'open'));
  }
}
