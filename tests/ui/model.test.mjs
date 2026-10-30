import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {TOOLS, DRUGS, normalizeStick, pointerStick, viewOf, remainingText, toolFeedbackOf, navigationOf, doorInteractionOf} from '../../src/ui/model.js';
import {fixture} from '../../workbenches/ui/fixtures.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
test('five tool IDs and effect definitions preserve the scene contract', () => {
  assert.deepEqual(TOOLS.map(tool => tool.id), ['matches','jerry-can','molotov','torch','flamethrower']);
  assert.equal(TOOLS[1].label,'Oil barrel');assert.equal(TOOLS[2].label,'Oil lantern');
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


test('torch phases project Light/Ignite/Spent and seconds without exposing fuel units',()=>{
  for(const [name,label,status] of [['torch-unlit','Light','UNLIT'],['torch-lit','Ignite','LIT'],['torch-spent','Spent','SPENT']]){
    const snap=fixture(name),before=JSON.stringify(snap),v=viewOf(snap);
    assert.equal(v.primaryLabel,label);assert.equal(v.primaryMode,status);assert.match(v.resourceText,/s left$/);assert.ok(!v.resourceText.includes('fuel'));
    assert.equal(v.primaryDisabled,name==='torch-spent');assert.equal(JSON.stringify(snap),before);
  }
});
test('missing or malformed authoritative torch state waits safely instead of inferring from fuel',()=>{
  for(const state of [undefined,{phase:'lit',remainingSeconds:NaN,durationSeconds:30},{phase:'lit',remainingSeconds:-1,durationSeconds:30},{phase:'lit',remainingSeconds:40,durationSeconds:30},{phase:'burning',remainingSeconds:10,durationSeconds:30}]){
    const snap=fixture('torch-lit');snap.player.torch=state;const v=viewOf(snap);assert.equal(v.torch.known,false);assert.equal(v.primaryDisabled,true);assert.equal(v.primaryMode,'WAIT');assert.equal(v.resourceText,'Awaiting torch state');
  }
});
test('pause, powder and selection do not create a second UI burn clock',()=>{
  const snap=fixture('torch-lit');const expected=viewOf(snap).torch;
  snap.paused=true;assert.deepEqual(viewOf(snap).torch,expected);
  snap.paused=false;snap.effects.powder={active:true,remaining:8};snap.clocks.worldScale=.35;assert.deepEqual(viewOf(snap).torch,expected);
  snap.player.tool='matches';assert.deepEqual(viewOf(snap).torch,expected);
  snap.player.tool='torch';snap.player.torch.remainingSeconds=19.8;assert.equal(viewOf(snap).resourceText,'LIT · 19.8s left');
});
test('action feedback distinguishes no-fuel, blocked, range and empty without assuming success',()=>{
  assert.equal(toolFeedbackOf({type:'tool-use',tool:'matches',result:'no-fuel'}),'No burnable fuel on this tile.');
  assert.equal(toolFeedbackOf({type:'tool-rejected',tool:'torch',reason:'blocked'}),'Target blocked. Aim at reachable ground.');
  assert.equal(toolFeedbackOf({type:'tool-rejected',tool:'matches',reason:'empty'}),'No matches left.');
  assert.equal(toolFeedbackOf({type:'tool-rejected',tool:'matches',reason:'range'}),'Target out of reach. Move closer.');
  assert.equal(toolFeedbackOf({type:'tool-use',tool:'matches'}),'Match used.');
  assert.equal(toolFeedbackOf({type:'tool-use',tool:'flamethrower'}),null);
  assert.equal(toolFeedbackOf({type:'torch-spent'}),'Torch spent. No fuel remains.');
});


test('navigation presents human location and retains native level without inventing storeys',()=>{
  const snap={version:1,paused:false,player:{level:36,elevation:76.32,locationLabel:'Upper gallery',interaction:{id:'entry',kind:'door',action:'open',label:'Open door',enabled:true,reason:'',anchor:[1,4.27,2]}}},before=JSON.stringify(snap);
  const view=navigationOf(snap);assert.equal(view.locationLabel,'Upper gallery');assert.equal(view.level,36);
  assert.deepEqual(view.interaction,{id:'entry',kind:'door',action:'open',label:'Open door',enabled:true,reason:'',anchor:[1,4.27,2]});assert.equal(JSON.stringify(snap),before);
  snap.player.elevation=77;assert.deepEqual(navigationOf(snap),view);
});
test('navigation accepts a v1 noncombat player and safely disables absent interaction',()=>{
  assert.deepEqual(navigationOf({version:1,player:{}}),{characterName:null,locationLabel:'Location pending',level:null,interaction:null});
  assert.equal(navigationOf({version:1,player:{interaction:{label:'Open door',enabled:'yes'}}}).interaction,null);
  assert.throws(()=>navigationOf({version:2,player:{}}),TypeError);
});
test('the three place thumbnails retain their pinned artist JPEG bytes and immutable sources',()=>{
  const manifest=JSON.parse(readFileSync(path.join(root,'assets/art/place-previews/provenance.json'),'utf8'));
  assert.deepEqual(manifest.files.map(f=>[f.id,f.sourceCommit]),[['new-york','b689f5501ab06f54822f2aa724ac77de106e3b71'],['administration','43337a33ddfe4dff6849654c827c56e1f24e1acc'],['horticulture','c4287338ff93907900a94a86b6c7e3bed0ae7c2f']]);
  for(const file of manifest.files){assert.ok(file.installedPath.startsWith('assets/art/place-previews/'));const bytes=readFileSync(path.join(root,file.installedPath));assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);assert.equal(bytes.readUInt16BE(0),0xffd8);}
});

test('navigation names only the authoritative available character or species',()=>{
  for(const [field,value,name] of [['characterId','goat','Goat'],['characterId','horse','Horse'],['species','Bear','Bear']]){
    assert.equal(navigationOf({version:1,player:{[field]:value}}).characterName,name);
  }
  assert.equal(navigationOf({version:1,player:{characterId:'horse',species:'bear'}}).characterName,'Horse');
  assert.equal(navigationOf({version:1,player:{characterId:'unknown'}}).characterName,null);
});

test('door targets copy exact authoritative IDs/actions/anchors and reject partial records',()=>{
  const input={id:'north',kind:'door',action:'close',label:'Close north door',enabled:false,reason:'Stand clear of the door.',anchor:[2,6.39,3]};const before=JSON.stringify(input),door=doorInteractionOf(input);
  assert.deepEqual(door,input);assert.notEqual(door.anchor,input.anchor);door.anchor[0]=9;assert.equal(JSON.stringify(input),before);
  for(const patch of [{id:''},{kind:'passage'},{action:'toggle'},{label:' '},{enabled:1},{anchor:[1,2]},{anchor:[1,NaN,2]}])assert.equal(doorInteractionOf({...input,...patch}),null);
  assert.equal(doorInteractionOf(null),null);assert.equal(doorInteractionOf({label:'Open door',enabled:true}),null);
});
