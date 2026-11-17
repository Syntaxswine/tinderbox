import test from 'node:test';
import assert from 'node:assert/strict';
import {mountUI} from '../../src/ui/index.js';
import {createSimulation} from '../../src/simulation/index.js';
import {createInputDOM} from './mock-dom.mjs';

const freeze=value=>{Object.freeze(value);for(const child of Object.values(value))if(child&&typeof child==='object'&&!Object.isFrozen(child))freeze(child);return value;};
function fixture(){
  const dom=createInputDOM(),commands=[];let closed=false;
  const simulation=createSimulation({scenario:{id:'ui-tool-order',width:12,height:10,player:{x:4,y:5,tool:'matches'},obstacles:[],actors:[]}});
  const ui=mountUI({root:dom.root,onCommand:command=>{commands.push(command);simulation.dispatch(command);}});
  const initial=freeze(structuredClone(simulation.snapshot()));ui.update(initial);
  dom.root.querySelector('[data-stick]').focus();
  return {...dom,commands,ui,simulation,initial,close(){if(closed)return;closed=true;ui.dispose();simulation.dispose();dom.root.remove();}};
}
function digit(f,code){f.key('keydown',code);f.key('keyup',code);}

test('rapid Digit4 then Space lights the torch before any selection snapshot arrives',()=>{
  const f=fixture();
  try{
    const before=JSON.stringify(f.initial),matches=f.initial.player.inventory.matches;
    digit(f,'Digit4');f.key('keydown','Space');f.key('keyup','Space');
    assert.equal(f.root.querySelector('[data-tool-name]').textContent,'Matches','UI fabricated an acknowledged selection');
    assert.equal(JSON.stringify(f.initial),before,'Input changed the published snapshot');
    const result=f.simulation.advance(1/60);
    assert.equal(result.player.tool,'torch');assert.equal(result.player.torch.phase,'lit');
    assert.equal(result.player.inventory.matches,matches);
    assert.ok(result.events.some(event=>event.type==='torch-lit'));
    assert.ok(!f.commands.some(command=>command.type==='select-tool'&&command.tool==='matches'));
  }finally{f.close();}
});

test('rapid Digit5 then held Space sprays the intended tool and releases once after acknowledgement',()=>{
  const f=fixture();
  try{
    digit(f,'Digit5');f.key('keydown','Space');f.key('keydown','Space',{repeat:true});
    const active=f.simulation.advance(1/60);
    assert.equal(active.player.tool,'flamethrower');assert.equal(active.player.usingTool,true);assert.equal(active.discharge.active,true);
    f.ui.update(freeze(structuredClone(active)));
    assert.equal(f.commands.filter(command=>command.type==='primary'&&command.pressed).length,1);
    assert.equal(f.commands.filter(command=>command.type==='primary'&&!command.pressed).length,0);
    f.key('keyup','Space');
    const released=f.simulation.advance(1/60);
    assert.equal(released.player.usingTool,false);
    assert.equal(f.commands.filter(command=>command.type==='primary'&&!command.pressed).length,1);
  }finally{f.close();}
});

test('a held action released before the first snapshot cannot remain stuck',()=>{
  const f=fixture();
  try{
    digit(f,'Digit5');f.key('keydown','Space');f.key('keyup','Space');
    const result=f.simulation.advance(1/60);
    assert.equal(result.player.tool,'flamethrower');assert.equal(result.player.usingTool,false);
    assert.equal(f.commands.filter(command=>command.type==='primary'&&!command.pressed).length,1);
    assert.equal(result.player.inventory.matches,f.initial.player.inventory.matches);
  }finally{f.close();}
});

test('the latest numeric intent wins without an intervening publication',()=>{
  const f=fixture();
  try{
    digit(f,'Digit4');digit(f,'Digit5');f.key('keydown','Space');f.key('keyup','Space');
    const result=f.simulation.advance(1/60);
    assert.equal(result.player.tool,'flamethrower');assert.equal(result.player.torch.phase,'unlit');
    assert.equal(result.player.inventory.matches,f.initial.player.inventory.matches);
  }finally{f.close();}
});

test('a repeated same-tick snapshot does not discard queued selection intent',()=>{
  const f=fixture();
  try{
    digit(f,'Digit4');for(let frame=0;frame<3;frame++)f.ui.update(f.initial);
    f.key('keydown','Space');f.key('keyup','Space');
    const result=f.simulation.advance(1/60);assert.equal(result.player.torch.phase,'lit');
  }finally{f.close();}
});

test('a newer authoritative tool overrides a pending numeric intent',()=>{
  const f=fixture();
  try{
    digit(f,'Digit4');
    const published=structuredClone(f.initial);published.tick++;published.player.tool='flamethrower';f.ui.update(freeze(published));
    f.key('keydown','Space');f.key('keyup','Space');
    const result=f.simulation.advance(1/60);
    assert.equal(result.player.tool,'flamethrower');assert.equal(result.player.torch.phase,'unlit');
  }finally{f.close();}
});

test('a generation change clears the prior visit selection intent even at the same tick',()=>{
  const f=fixture();
  try{
    digit(f,'Digit4');
    const published=structuredClone(f.initial);published.diagnostics.generation++;f.ui.update(freeze(published));
    f.key('keydown','Space');f.key('keyup','Space');
    assert.equal(f.commands.filter(command=>command.type==='select-tool').at(-1).tool,'matches');
  }finally{f.close();}
});

test('pending intent cannot bypass authoritative empty-stock or capability gates',()=>{
  for(const restricted of ['stock','capability']){
    const f=fixture();
    try{
      if(restricted==='stock'){
        const published=structuredClone(f.initial);
        published.player.inventory.torchFuel=0;published.player.torch={phase:'spent',remainingSeconds:0,durationSeconds:30};
        f.ui.update(freeze(published));digit(f,'Digit4');
      }else{
        digit(f,'Digit4');
        const published=structuredClone(f.initial);
        published.capabilities={version:1,mode:'gameplay',tools:false,health:true,interact:true,overview:false};f.ui.update(freeze(published));
      }
      f.key('keydown','Space');f.key('keyup','Space');
      assert.equal(f.commands.filter(command=>command.type==='primary'&&command.pressed).length,0,restricted);
      assert.equal(f.root.querySelector('[data-tool="torch"]').disabled,true);
      assert.equal(f.root.querySelector('[data-tool-name]').textContent,'Matches');
    }finally{f.close();}
  }
});

test('a direct tool-button action replaces an earlier numeric intent before acknowledgement',()=>{
  const f=fixture();
  try{
    digit(f,'Digit4');f.root.querySelector('[data-tool="flamethrower"]').click();
    f.key('keydown','Space');f.key('keyup','Space');
    const result=f.simulation.advance(1/60);
    assert.equal(result.player.tool,'flamethrower');assert.equal(result.player.torch.phase,'unlit');
    assert.deepEqual(f.commands.filter(command=>command.type==='select-tool').map(command=>command.tool),['torch','flamethrower','flamethrower']);
  }finally{f.close();}
});

test('rapid lantern selection then Enter retains the existing aim pulse without spending a match',()=>{
  const f=fixture();
  try{
    digit(f,'Digit3');f.key('keydown','Enter');f.key('keyup','Enter');
    const result=f.simulation.advance(1/60);
    assert.equal(result.player.tool,'molotov');assert.notEqual(result.player.lanternAim,null);
    assert.equal(result.player.inventory.matches,f.initial.player.inventory.matches);
    assert.equal(result.player.inventory.molotovs,f.initial.player.inventory.molotovs);
  }finally{f.close();}
});

test('blur releases a pending held tool through the existing cancel path',()=>{
  const f=fixture();
  try{
    digit(f,'Digit5');f.key('keydown','Space');f.win.dispatchEvent(new Event('blur'));
    const result=f.simulation.advance(1/60);
    assert.equal(result.player.tool,'flamethrower');assert.equal(result.player.usingTool,false);
    assert.equal(f.commands.filter(command=>command.type==='primary'&&!command.pressed).length,1);
    assert.equal(f.commands.filter(command=>command.type==='cancel-input').length,1);
  }finally{f.close();}
});

test('rapid torch then matches selection uses the latest requested match without lighting the torch',()=>{
  const f=fixture();
  try{
    digit(f,'Digit4');digit(f,'Digit1');f.key('keydown','Space');f.key('keyup','Space');
    const result=f.simulation.advance(1/60);
    assert.equal(result.player.tool,'matches');assert.equal(result.player.torch.phase,'unlit');
    assert.equal(result.player.inventory.matches,f.initial.player.inventory.matches-1);
    assert.equal(f.commands.filter(command=>command.type==='primary'&&command.pressed).length,1);
    assert.ok(!result.events.some(event=>event.type==='torch-lit'));
  }finally{f.close();}
});

test('old snapshots cannot prematurely release a pre-ack held flamethrower',()=>{
  const f=fixture();
  try{
    const current=structuredClone(f.initial);current.tick=10;f.ui.update(freeze(current));
    digit(f,'Digit5');f.key('keydown','Space');
    const older=structuredClone(current);older.tick=9;older.player.tool='flamethrower';f.ui.update(freeze(older));
    for(let frame=0;frame<3;frame++)f.ui.update(current);
    assert.equal(f.commands.filter(command=>command.type==='primary'&&!command.pressed).length,0);
    f.key('keyup','Space');
    assert.equal(f.commands.filter(command=>command.type==='primary'&&!command.pressed).length,1);
    const result=f.simulation.advance(1/60);
    assert.equal(result.player.tool,'flamethrower');assert.equal(result.player.usingTool,false);
  }finally{f.close();}
});

test('an older tick showing the requested tool is not an acknowledgement',()=>{
  const f=fixture();
  try{
    const current=structuredClone(f.initial);current.tick=10;f.ui.update(freeze(current));
    digit(f,'Digit4');
    const older=structuredClone(current);older.tick=9;older.player.tool='torch';f.ui.update(freeze(older));f.ui.update(current);
    f.key('keydown','Space');f.key('keyup','Space');
    const result=f.simulation.advance(1/60);assert.equal(result.player.torch.phase,'lit');
  }finally{f.close();}
});

test('explicit input cancellation clears pending tool intent for the next gesture',()=>{
  const f=fixture();
  try{
    digit(f,'Digit4');f.win.dispatchEvent(new Event('blur'));
    f.key('keydown','Space');f.key('keyup','Space');
    const result=f.simulation.advance(1/60);
    assert.equal(result.player.tool,'matches');assert.equal(result.player.torch.phase,'unlit');
  }finally{f.close();}
});

test('capability disable clears pending intent before a same-tick restoration',()=>{
  const f=fixture();
  try{
    digit(f,'Digit4');
    const disabled=structuredClone(f.initial);
    disabled.capabilities={version:1,mode:'gameplay',tools:false,health:true,interact:true,overview:false};
    f.ui.update(freeze(disabled));f.ui.update(f.initial);
    f.key('keydown','Space');f.key('keyup','Space');
    const result=f.simulation.advance(1/60);
    assert.equal(result.player.tool,'matches');assert.equal(result.player.torch.phase,'unlit');
  }finally{f.close();}
});

test('disposal silences a pending selection and its retained keyboard surface',()=>{
  const f=fixture();
  try{
    digit(f,'Digit5');f.key('keydown','Space');f.close();
    const before=f.commands.length;
    f.key('keydown','Space');f.key('keyup','Space');digit(f,'Digit4');
    assert.equal(f.commands.length,before);
    assert.equal(f.commands.filter(command=>command.type==='primary'&&!command.pressed).length,1);
  }finally{f.close();}
});
