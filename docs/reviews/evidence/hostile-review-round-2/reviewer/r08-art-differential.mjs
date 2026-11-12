// Fix A, art side. Drive this tree's art consumers and the round-1 tree's (4fc97bb) art consumers with the SAME stream
// of real snapshots from this tree's simulation, headless, and compare what each would hand to the GPU, every frame:
//   fire cards        : the three instance buffers (offset, shape, info) and the instance count, plus diagnostics
//   ground mask       : every float of the data texture; and that a changed texel is always flagged for upload
//   street firelight  : diagnostics (selected lights, positions, intensities)
//   world             : rebuild count and node names
//   nearby trail      : ids in order, against the round-1 inline expression
// One art set is reused across every simulation a script creates (scenario switch, grid resize), as the reader is shared.
// A third arm feeds this tree's consumers a deep-cloned (mutable) copy of each snapshot: the legacy path.
// Usage: node r08-art-differential.mjs [script-name ...]
import {load, OLD, HEAD, r} from './lib.mjs';
const api = await load();
const {SCRIPTS} = await import('./scripts.mjs');

async function artSet(root, shared) {
  const T = await import(root + 'runtime/three.js');
  const {createGroundField} = await import(root + 'art/ground-field.js');
  const {createFire} = await import(root + 'art/fire.js');
  const {createStreetFirelight} = await import(root + 'art/street-firelight.js');
  const {createWorld} = await import(root + 'art/world.js');
  const {groupStructureFire} = await import(root + 'art/structure-fire.js');
  const pub = shared ? await import(root + 'art/cell-publication.js') : null;
  const readCells = pub?.createCellReader(), trail = pub?.createTrailReader(readCells);
  const atlas = new T.Texture(), material = new T.MeshBasicMaterial();
  const field = shared ? createGroundField(T, readCells) : createGroundField(T);
  const fire = shared ? createFire(T, {flame: atlas, smoke: atlas, burst: atlas}, field.uniforms, readCells) : createFire(T, {flame: atlas, smoke: atlas, burst: atlas}, field.uniforms);
  const light = shared ? createStreetFirelight(T, readCells) : createStreetFirelight(T);
  const world = createWorld(T, new Proxy({}, {get: () => material}));
  let lastObstacles, plainObstacles, lastData, lastVersion, lastTexture, missed = 0, uploads = 0;
  const muzzle = new T.Vector3();
  function groundObstacles(obstacles) {
    if (!shared) return (obstacles || []).filter(o => !o.moduleId && !o.buildingId && o.shopId !== 'bell-and-alder');
    const immutable = pub.isImmutableRecordArray(obstacles);
    if (immutable && obstacles === lastObstacles) return plainObstacles;
    plainObstacles = (obstacles || []).filter(o => !o.moduleId && !o.buildingId && o.shopId !== 'bell-and-alder');
    lastObstacles = immutable ? obstacles : undefined;
    if (immutable) Object.freeze(plainObstacles);
    return plainObstacles;
  }
  return {
    update(snapshot, time = snapshot.clocks.world) {
      const {world: map, player} = snapshot;
      world.update({...map, obstacles: groundObstacles(map.obstacles)});
      field.update(snapshot);
      const sites = groupStructureFire(snapshot.structureFire);
      light.update(snapshot, sites, time, []);
      const near = shared ? trail(snapshot.cells, player)
        : snapshot.cells.filter(cell => cell.depositedFuel > 0 && Math.hypot(cell.x - player.x, cell.y - player.y) < 2.5).sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
      muzzle.set(player.x, 1, player.y);
      fire.update(snapshot, time, {muzzle});
      const texture = field.uniforms.field.value, data = texture.image.data;
      if (texture === lastTexture) {
        let changed = false;
        for (let i = 0; i < data.length; i++) if (!Object.is(data[i], lastData[i])) { changed = true; break; }
        if (changed && texture.version === lastVersion) missed++;
        if (texture.version !== lastVersion) uploads++;
      }
      lastTexture = texture; lastVersion = texture.version; lastData = data.slice();
      const cards = fire.root.children.slice(0, 3).map(mesh => {
        const count = mesh.geometry.instanceCount;
        return [count, ...['iOffset', 'iShape', 'iInfo'].map(name => { const a = mesh.geometry.getAttribute(name); return a.array.subarray(0, count * a.itemSize); })];
      });
      const {geometries, materials, textures, ...diag} = fire.diagnostics();
      return {cards, fire: JSON.stringify(diag), data, grid: field.uniforms.grid.value.toArray().join('x') + '@' + field.uniforms.cellSize.value,
        light: JSON.stringify(light.diagnostics()), trail: near.map(c => c.id).join(' '), builds: world.counts().builds, names: world.root.children.map(n => n.name).join('|')};
    },
    stats: () => ({missed, uploads})
  };
}
function same(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
}
function compare(x, y) {
  const out = [];
  x.cards.forEach((layer, i) => { if (layer[0] !== y.cards[i][0] || !layer.slice(1).every((buffer, k) => same(buffer, y.cards[i][k + 1]))) out.push('fire-cards-layer-' + i + ` (${layer[0]} vs ${y.cards[i][0]})`); });
  for (const key of ['fire', 'grid', 'light', 'trail', 'builds', 'names']) if (x[key] !== y[key]) out.push(key);
  if (!same(x.data, y.data)) out.push('ground-mask');
  return out;
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCRIPTS);
let total = 0;
for (const name of names) {
  const head = await artSet(HEAD, true), old = await artSet(OLD, false), legacy = await artSet(HEAD, true);
  const fail = {}, started = Date.now();
  let frames = 0, renders = 0, peakCards = 0, reusedLists = 0, previous;
  const note = (kind, text) => { (fail[kind] ??= {count: 0, first: []}).count++; if (fail[kind].first.length < 3) fail[kind].first.push(text); };
  function feed(s, how) {
    frames++; if (s.cells === previous) reusedLists++; previous = s.cells;
    // TB_CADENCE=1: several render frames per simulation step with a moving render clock, including a repeat of the
    // same instant, a step back inside the 1e-8 tolerance, and (every 97th step) a real rewind of 1 ms.
    const world = s.clocks.world;
    const times = !process.env.TB_CADENCE ? [world] : frames % 97 === 0 ? [world, world + .006, world + .005] : frames % 3 === 0 ? [world, world + .004, world + .004 - 5e-9, world + .009] : [world, world + .008];
    for (const time of times) {
      renders++;
      const a = head.update(s, time), b = old.update(s, time), c = legacy.update(structuredClone(s), time);
      peakCards = Math.max(peakCards, a.cards[0][0] + a.cards[1][0]);
      for (const kind of compare(a, b)) note('this-tree vs round-1: ' + kind.split(' ')[0], `${how} tick ${s.tick} render clock ${time} ${kind}`);
      for (const kind of compare(c, b)) note('legacy-path vs round-1: ' + kind.split(' ')[0], `${how} tick ${s.tick} render clock ${time} ${kind}`);
    }
    return s;
  }
  SCRIPTS[name](api, (sim, dt) => feed(sim.advance(dt), 'advance'), sim => feed(sim.snapshot(), 'snapshot'));
  const kinds = Object.keys(fail); total += kinds.length;
  console.log(`== ${name}: ${frames} snapshots, ${renders} art updates in ${r((Date.now() - started) / 1000, 1)} s; cell list reused by identity in ${reusedLists}; peak flame+smoke cards ${peakCards} ==`);
  console.log('   ground mask uploads: this tree', head.stats().uploads, '| round-1', old.stats().uploads, '| changed texels with no upload flagged (this tree):', head.stats().missed);
  console.log(kinds.length ? '   DIFFERENCES ' + JSON.stringify(fail, null, 1) : '   every compared output identical in every frame');
  if (head.stats().missed) total++;
}
console.log(total ? `\nRESULT: ${total} difference kind(s)` : '\nRESULT: this tree\'s art consumers produce the round-1 output on every frame');
