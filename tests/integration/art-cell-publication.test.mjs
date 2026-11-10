import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../src/runtime/three.js';
import {createCellReader, createTrailReader} from '../../src/art/cell-publication.js';
import {createGroundField} from '../../src/art/ground-field.js';
import {createFire} from '../../src/art/fire.js';
import {createStreetFirelight} from '../../src/art/street-firelight.js';
import {createWorld} from '../../src/art/world.js';
import {seedOf} from '../../src/art/resources.js';

const world = {width: 1, height: 1, fireCellSize: .5};
const cell = (id, x, y, extra) => ({id, x, y, size: .5, phase: 'cold', material: 'grass',
  heat: 0, intensity: 0, depositedFuel: 0, surfaceFuel: .24, ...extra});
const frozen = items => Object.freeze(items.map(item => Object.freeze(item)));

test('shared cell publication keeps order and reuses cold labels across changes', () => {
  const read = createCellReader(), trail = createTrailReader(read);
  let coldReads = 0;
  const cold = Object.freeze({...cell('cold', .75, .75), get phase() { coldReads++; return 'cold'; }});
  const a = Object.freeze(cell('a', .25, .25, {depositedFuel: .1}));
  const b = Object.freeze(cell('b', .75, .25, {phase: 'burning', depositedFuel: .1}));
  const first = Object.freeze([a, b, cold]);
  const view = read(first);
  const player = {x: .5, y: .25};
  const near = trail(first, player);
  assert.deepEqual(near, [a, b]);
  assert.equal(trail(first, player), near);
  assert.equal(read(first), view);

  const next = Object.freeze([Object.freeze({...a, heat: .05}), b, cold]);
  assert.deepEqual(read(next).changes, [0]);
  assert.equal(coldReads, 1);
  const resized = Object.freeze([next[0], b]);
  assert.deepEqual(read(resized).burning, [b]);
  const reordered = Object.freeze([b, next[0]]);
  assert.equal(read(reordered).sameOrder, false);
  assert.deepEqual(trail(reordered, player), [b, next[0]]);
  assert.deepEqual(trail(reordered, {x: .29, y: .25}), [next[0], b]);

  const legacy = [cell('legacy', .25, .25)];
  assert.deepEqual(trail(legacy, player), []);
  legacy[0].depositedFuel = .1;
  assert.deepEqual(trail(legacy, player), legacy);
  const frozenShell = Object.freeze(legacy);
  legacy[0].depositedFuel = 0;
  assert.equal(read(frozenShell), null);
  assert.deepEqual(trail(frozenShell, player), []);
});

test('ground field only uploads changed float texels and preserves mutable last-wins order', () => {
  const field = createGroundField(T);
  const grid = frozen([cell('a', .25, .25), cell('b', .75, .25),
    cell('c', .25, .75), cell('d', .75, .75)]);
  try {
    const update = (cells, map = world) => field.update({world: map, cells});
    update(grid);
    const texture = field.uniforms.field.value;
    const initialVersion = texture.version;
    update(grid);
    update(Object.freeze([Object.freeze({...grid[0], surfaceFuel: .22}), ...grid.slice(1)]));
    assert.equal(texture.version, initialVersion);

    const heated = Object.freeze({...grid[0], phase: 'heating', depositedFuel: .16, heat: .2});
    const active = Object.freeze([heated, ...grid.slice(1)]);
    update(active);
    assert.equal(texture.version, initialVersion + 1);
    assert.deepEqual(Array.from(texture.image.data.subarray(0, 4)), [Math.fround(.8), Math.fround(.35), 0, 0]);
    update(Object.freeze([...active].reverse()));
    assert.equal(texture.version, initialVersion + 1);
    const reversed = [{...heated}, {...heated, phase: 'spent', depositedFuel: 0}];
    update(reversed);
    assert.deepEqual(Array.from(texture.image.data.subarray(0, 4)), [0, 0, 1, 0]);
    const spentVersion = texture.version;
    update(reversed);
    assert.equal(texture.version, spentVersion);
    reversed[1].x = .75;
    update(reversed);
    assert.deepEqual(Array.from(texture.image.data.subarray(0, 8)),
      [Math.fround(.8), Math.fround(.35), 0, 0, 0, 0, 1, 0]);

    update(active, {...world, width: 1.5});
    const resized = field.uniforms.field.value;
    assert.notEqual(resized, texture);
    assert.equal(resized.image.width, 3);
    assert.deepEqual(Array.from(resized.image.data.subarray(0, 4)), [Math.fround(.8), Math.fround(.35), 0, 0]);
    update([], {...world, width: 1.5});
    assert.ok(resized.image.data.every(value => value === 0));
  } finally {
    field.dispose();
  }
});

test('frozen and mutable fire cards match through reorder, world-time tails, rewind and cap', () => {
  const field = createGroundField(T), atlas = new T.Texture();
  const make = () => createFire(T, {flame: atlas, smoke: atlas, burst: atlas}, field.uniforms);
  const immutable = make(), legacy = make();
  const a = cell('tail-' + Array.from({length: 40}, (_, i) => i).find(i => seedOf('tail-' + i) > .38),
    .25, .25, {phase: 'burning', intensity: .83});
  const b = cell('other', .75, .25, {phase: 'burning', intensity: .31, depositedFuel: .08});
  const ordered = frozen([a, b]);
  const spent = Object.freeze({...a, phase: 'spent', intensity: 0});
  const next = Object.freeze([spent, ordered[1]]);
  const reorder = Object.freeze([...next].reverse());
  const actor = {id: 'actor', x: .1, y: .2, heading: .3, hp: 10, burn: {}};
  const pack = effect => effect.root.children.slice(0, 3).map(mesh => {
    const count = mesh.geometry.instanceCount;
    return ['iOffset', 'iShape', 'iInfo'].map(name => {
      const attribute = mesh.geometry.getAttribute(name);
      return attribute.array.slice(0, count * attribute.itemSize);
    });
  });
  function compare(cells, clock, tick) {
    const snapshot = {world, player: {x: .5, y: .5}, actors: [actor], tick};
    immutable.update({...snapshot, cells}, clock);
    legacy.update({...snapshot, cells: cells.map(item => ({...item}))}, clock);
    assert.deepEqual(pack(immutable), pack(legacy));
    assert.deepEqual(immutable.diagnostics(), legacy.diagnostics());
  }
  try {
    compare(ordered, 0, 0);
    compare(next, 1, 1);
    const firstTail = immutable.diagnostics().smokeCards;
    compare(reorder, 1.5, 2);
    compare(reorder, 4.2 + 2e-9, 3);
    assert.equal(immutable.diagnostics().smokeCards, firstTail - 1);
    compare(reorder, 4.2 - 2e-9, 4);
    assert.equal(immutable.diagnostics().smokeCards, firstTail);
    compare(reorder, .1, 0);
    assert.equal(immutable.diagnostics().smokeCards, firstTail - 1);
    compare(Object.freeze([reorder[0]]), .2, 1);
    const crowded = frozen(Array.from({length: 4100}, (_, i) => cell('flame-' + i, i / 10, .25,
      {phase: 'burning', intensity: 1})));
    compare(crowded, .3, 2);
    assert.equal(immutable.diagnostics().flameCards, 8192);
    assert.equal(immutable.diagnostics().actorFlameCards, 2);
    assert.equal(immutable.diagnostics().capped, true);
  } finally {
    immutable.dispose();
    legacy.dispose();
    field.dispose();
    atlas.dispose();
  }
});

test('terrain firelight retains ranking, movement and mutable fuel fade', () => {
  const fast = createStreetFirelight(T), legacy = createStreetFirelight(T);
  const cells = frozen([cell('near', .25, .25, {phase: 'burning', intensity: .9}),
    cell('far', 7.25, .25, {phase: 'burning', intensity: .8})]);
  const mutable = cells.map(item => ({...item}));
  const house = new Map([['cottage', [{part: 'roof', exposed: true, flame: .71, area: 1,
    x: 4, y: 3, z: 2, nx: 0, ny: 1, nz: 0}]]]);
  const rub = [{buildingId: 'house', x: 3, y: 0, z: 4, area: .4, glow: .6}];
  const compare = (fastCells, player, time) => {
    const snapshot = {world, player};
    fast.update({...snapshot, cells: fastCells}, house, time, rub);
    legacy.update({...snapshot, cells: mutable}, house, time, rub);
    assert.deepEqual(fast.diagnostics(), legacy.diagnostics());
  };
  try {
    compare(cells, {x: 0, y: 0}, 1);
    compare(cells, {x: 7, y: 0}, 2);
    mutable[0].surfaceFuel = 0;
    compare(frozen(mutable), {x: 0, y: 0}, 2);
    assert.equal(fast.diagnostics().terrainSites, 1);
  } finally {
    fast.dispose();
    legacy.dispose();
  }
});

test('world reuses immutable terrain and preserves mutable collider and tile size changes', () => {
  const material = new T.MeshBasicMaterial();
  const map = createWorld(T, new Proxy({}, {get: () => material}));
  let serialized = 0;
  const tile = Object.freeze({x: .5, y: .5, material: 'grass', toJSON() {
    serialized++;
    return {x: this.x, y: this.y, material: this.material};
  }});
  const obstacles = frozen([{id: 'crate', x: .5, y: .5, width: .5, depth: .5, height: .5}]);
  const scene = {width: 2, height: 2, tileSize: 1, tiles: Object.freeze([tile]), obstacles};
  try {
    map.update(scene);
    const geometry = map.root.children[0].geometry;
    map.update({...scene});
    assert.equal(serialized, 1);
    assert.equal(map.root.children[0].geometry, geometry);
    map.update({...scene, tiles: Object.freeze([tile]), obstacles: Object.freeze([...obstacles])});
    assert.equal(map.counts().builds, 1);
    const mutable = {...scene, tiles: [{x: .5, y: .5, material: 'grass'}],
      obstacles: obstacles.map(item => ({...item}))};
    map.update(mutable);
    assert.equal(map.counts().builds, 1);
    mutable.obstacles[0].destroyed = true;
    map.update(mutable);
    assert.equal(map.root.getObjectByName('obstacle:crate'), undefined);
    assert.equal(map.counts().builds, 2);
    mutable.tileSize = .75;
    map.update(mutable);
    const instance = map.root.children.find(node => node.isInstancedMesh);
    const matrix = new T.Matrix4();
    instance.getMatrixAt(0, matrix);
    assert.equal(new T.Vector3().setFromMatrixScale(matrix).x, .75);
  } finally {
    map.dispose();
    material.dispose();
  }
});
