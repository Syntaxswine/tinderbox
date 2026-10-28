import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {TOOLS, DRUGS, normalizeStick, pointerStick, viewOf, remainingText} from '../../src/ui/model.js';
import {fixture} from '../../workbenches/ui/fixtures.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
test('five tool IDs and effect definitions preserve the scene contract', () => {
  assert.deepEqual(TOOLS.map(tool => tool.id), ['matches','jerry-can','molotov','torch','flamethrower']);
  assert.equal(TOOLS[1].label, 'Oil barrel');
  assert.equal(TOOLS[2].label, 'Oil lantern');
  assert.equal(TOOLS[2].stock, 'molotovs');
  assert.equal(TOOLS[2].action, 'Throw');
  assert.deepEqual(DRUGS.map(drug => drug.id), ['powder','healing','inversion']);
});
test('raw movement is finite and normalized with positive Y up', () => {
  const raw = normalizeStick(1, 1);
  assert.ok(Math.abs(raw.x - Math.SQRT1_2) < 1e-12); assert.ok(Math.abs(raw.y - Math.SQRT1_2) < 1e-12);
  const fromPointer = pointerStick(100, 0, {left:0,top:0,width:100,height:100});
  assert.ok(fromPointer.x > 0 && fromPointer.y > 0); assert.ok(Math.abs(Math.hypot(fromPointer.x,fromPointer.y) - 1) < 1e-12);
  assert.deepEqual(pointerStick(50,50,{left:0,top:0,width:100,height:100}), {x:0,y:0});
  assert.deepEqual(normalizeStick(NaN,1),{x:0,y:0});
});
test('view reads pouring, counts and effect times without mutating or advancing snapshots', () => {
  const snap = fixture('pouring'), before = JSON.stringify(snap);
  const view = viewOf(snap);
  assert.equal(view.primaryLabel,'Stop'); assert.equal(view.stock,24.8);
  assert.equal(view.effects.powder.remaining,'6.4s');
  for (let i=0;i<100;i++) viewOf(snap);
  assert.equal(JSON.stringify(snap), before);
  assert.equal(remainingText(0.01),'0.1s'); assert.equal(remainingText(-2),'0.0s');
});
test('empty selected tool blocks use; authoritative pouring always offers Stop', () => {
  const snap = fixture('empty');
  assert.equal(viewOf(snap).primaryDisabled,true);
  snap.player.tool='jerry-can'; snap.player.pouring=true;
  assert.equal(viewOf(snap).primaryDisabled,false);
  assert.equal(viewOf(snap).primaryLabel,'Stop');
  snap.paused=true; assert.equal(viewOf(snap).primaryDisabled,true);
});
test('all imported UI files retain recorded bytes; CSS dependency closure resolves locally', () => {
  const manifestPath = 'vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/provenance/ui.json';
  const manifest=JSON.parse(readFileSync(path.join(root,manifestPath),'utf8'));
  assert.equal(manifest.files.length,6);
  for(const file of manifest.files) {
    const bytes=readFileSync(path.join(root,file.installedPath));
    assert.equal(bytes.length,file.bytes,file.installedPath);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.installedPath);
    assert.equal(file.installedSha256,file.sha256);
    if(file.installedPath.endsWith('.css')) for(const match of bytes.toString().matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) assert.ok(existsSync(path.resolve(root,path.dirname(file.installedPath),match[1])));
  }
  const css=readFileSync(path.join(root,'src/ui/styles.css'),'utf8');
  for(const match of css.matchAll(/@import url\('([^']+)'\)/g)) assert.ok(existsSync(path.resolve(root,'src/ui',match[1])));
});
