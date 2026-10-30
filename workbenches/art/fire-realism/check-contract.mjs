import assert from 'node:assert/strict';
import * as T from '../../../src/runtime/three.js';
import {createFireRealism} from '../../../assets/art/fire-realism/index.js';
const base = (time, cells = [], extra = {}) => ({version: 1, tick: Math.round(time * 60), worldTime: time, playerTime: time * 3, paused: false, anchors: {muzzle: {x: 2, y: .8, z: 2}, torchTip: {x: 1, y: 1, z: 1}}, player: {x: -5, y: -5, elevation: 0, radius: .3}, cells, events: [], ...extra});
const cell = (id, phase = 'burning') => ({id, phase, x: 2.25, y: 2.25, size: .5, intensity: .9, depositedFuel: 1});
assert.throws(() => createFireRealism(T, {quality: 'optimized'}), /unavailable/);
// The actual street grid contains thousands of unlit cells: capacity limits emitters, not input length.
const fullGrid = Array.from({length: 65536}, (_, i) => ({id: `full-${i}`, phase: i === 65535 ? 'burning' : 'spent', x: (i % 256) * .5 + .25, y: Math.floor(i / 256) * .5 + .25, intensity: .8, size: .5}));
const sparse = createFireRealism(T, {maxCells: 16}); sparse.update(base(1, fullGrid)); assert.equal(sparse.diagnostics().burningCells, 1); sparse.dispose();
const effect = createFireRealism(T, {maxCells: 16});
const bytes = () => effect.root.children.filter(o => o.isMesh).map(m => [...m.geometry.getAttribute('iShape').array]);
const geometries = [], materials = [], textures = [];
for (const child of effect.root.children) if (child.isMesh) {geometries.push(child.geometry); materials.push(child.material);}
const field = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); let borrowedDisposals = 0; field.addEventListener('dispose', () => borrowedDisposals++);
const fieldUniforms = {field: {value: field}, grid: {value: new T.Vector2(1, 1)}, cellSize: {value: .5}};
for (const m of materials) for (const u of Object.values(m.uniforms)) if (u.value?.isTexture && !textures.includes(u.value)) textures.push(u.value);
const disposal = new Map([...geometries, ...materials, ...textures].map(r => [r, 0])); for (const r of disposal.keys()) r.addEventListener('dispose', () => disposal.set(r, disposal.get(r) + 1));
const frozen = Object.freeze({...cell('a')}); const source = Object.freeze([frozen]);
effect.update(base(1, source, {fieldUniforms})); assert.equal(effect.diagnostics().burningCells, 1); assert.equal(effect.diagnostics().triangles, 8064); assert.equal(effect.diagnostics().borrowedField, true);
const first = bytes(), resources = effect.diagnostics().resources;
effect.update(base(1, source)); assert.deepEqual(bytes(), first, 'same clock and ids reproduce instance data');
effect.update(base(2, [], {paused: true})); assert.equal(effect.diagnostics().worldTime, 1); assert.equal(effect.diagnostics().burningCells, 1, 'pause freezes presentation');
effect.update(base(2, [cell('a', 'spent')])); assert.equal(effect.diagnostics().burningCells, 0); assert.equal(effect.diagnostics().smokeColumns, 1);
effect.update(base(5.3, [])); assert.equal(effect.diagnostics().smokeColumns, 0); assert.equal(effect.diagnostics().triangles, 0, 'spent fuel and absent cells leave no perpetual smoke');
effect.update(base(.5, [cell('a')])); assert.equal(effect.diagnostics().worldTime, .5, 'rewind resets history');
assert.deepEqual(bytes(), first); // Geometry/seed data is clock-independent; shader motion uses worldTime.
const origin = {x: 2, y: 2, h: .8}, rays = [-.2, 0, .2].map(angle => ({x: 4, y: 2 + Math.tan(angle) * 2, h: .8, angle, distance: 2 / Math.cos(angle)}));
effect.update(base(1, [], {discharge: {active: true, tool: 'flamethrower', origin, shapeOrigin: origin, heading: 0, connectRays: true, rays}}));
assert.equal(effect.diagnostics().discharge, 'resolved connected fan');
const jet = effect.root.children.find(o => o.name === 'Resolved liquid-fuel jet'); assert.equal(jet.geometry.instanceCount, 27);
for (let i = 0; i < jet.geometry.instanceCount; i++) {const p = jet.geometry.attributes.iOrigin.array.slice(i * 3, i * 3 + 3); assert.ok(p[0] >= 2 && p[0] <= 4, 'jet follows authoritative endpoints');}
effect.update(base(2, [], {discharge: {active: true, origin, shapeOrigin: origin, heading: 0, connectRays: false, rays}})); assert.equal(jet.geometry.instanceCount, 0, 'never invent a fan across disconnected rays');
effect.update(base(3, [], {anchors: {}, torch: {phase: 'lit', remainingSeconds: 1}})); assert.match(effect.diagnostics().torch, /missing/);
effect.update(base(4, [], {torch: {phase: 'lit', remainingSeconds: 1, anchor: {x: 1, y: 1, z: 1}}})); assert.equal(effect.root.children.find(o => o.name === 'Finite carried torch').geometry.instanceCount, 3);
effect.update(base(5, [], {torch: {phase: 'lit', remainingSeconds: 0, anchor: {x: 1, y: 1, z: 1}}})); assert.equal(effect.root.children.find(o => o.name === 'Finite carried torch').geometry.instanceCount, 0);
for (let i = 0; i < 30; i++) {effect.reset(); effect.update(base(1, [cell('a')], {fieldUniforms})); assert.deepEqual(effect.diagnostics().resources, resources);}
effect.reset(); assert.equal(effect.diagnostics().triangles, 0); effect.dispose(); effect.dispose();
for (const n of disposal.values()) assert.equal(n, 1, 'owned resources dispose exactly once'); assert.equal(borrowedDisposals, 0, 'borrowed field remains owned by caller'); assert.equal(effect.root.children.length, 0);
assert.throws(() => createFireRealism(T, {maxCells: 0}), /capacity/);
console.log('PASS: actual Three geometry, bounded resources, deterministic reset/rewind, pause/world clock, spent smoke expiry, authoritative jet endpoints, finite anchored torch, no invented fan, borrowed texture ownership. No WebGL or GPU timing claim.');
