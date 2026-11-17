import test from 'node:test';
import assert from 'node:assert/strict';
import {capabilitiesOf,snapshotCapabilitiesOf,viewOf,navigationOf,TOOLS} from '../../src/ui/model.js';
import {fixture} from '../../workbenches/ui/fixtures.js';

const gameplay=Object.freeze({version:1,mode:'gameplay',tools:true,health:true,interact:true,overview:true});
const freeze=value=>{Object.freeze(value);for(const child of Object.values(value))if(child&&typeof child==='object'&&!Object.isFrozen(child))freeze(child);return value;};
function snapshot(characterId='goat') {
  const value=fixture();value.capabilities=gameplay;value.player.characterId=characterId;value.player.lanternAim=null;
  value.navigation={placeId:'new-york',view:'follow',locationLabel:'Upper gallery',waitingForSection:false};
  value.player.level=2;value.player.elevation=4.24;
  return value;
}

test('host capabilities override legacy mode and require explicit versioned booleans',()=>{
  const before=JSON.stringify(gameplay),copy=capabilitiesOf(gameplay,'explore');
  assert.deepEqual(copy,gameplay);assert.notEqual(copy,gameplay);assert.ok(Object.isFrozen(copy));
  assert.equal(JSON.stringify(gameplay),before);
  for(const patch of [{version:2},{mode:'new-york'},{tools:1},{health:undefined},{interact:'yes'},{overview:null}])
    assert.throws(()=>capabilitiesOf({...gameplay,...patch}),TypeError);
  for(const value of [null,false,{}])assert.throws(()=>capabilitiesOf(value),TypeError);
});

test('legacy gameplay and exploration mounts retain their existing capabilities',()=>{
  assert.deepEqual(capabilitiesOf(undefined),{...gameplay,overview:false});
  assert.deepEqual(capabilitiesOf(undefined,'explore'),{version:1,mode:'explore',tools:false,health:false,interact:true,overview:true});
  assert.throws(()=>capabilitiesOf(undefined,'menu'),TypeError);
});

test('all five tools use the same truthful state for goat, horse and AFT bear on the pilot host',()=>{
  for(const [id,name] of [['goat','Goat'],['horse','Horse'],['bear','Bear']])for(const tool of TOOLS) {
    const value=snapshot(id);value.player.tool=tool.id;freeze(value);
    const before=JSON.stringify(value),view=viewOf(value);
    assert.equal(view.characterName,name);assert.equal(view.navigation.characterName,name);
    assert.equal(view.navigation.locationLabel,'Upper gallery');assert.equal(view.navigation.level,2);
    assert.equal(view.cameraView,'follow');assert.equal(view.primaryDisabled,false);
    assert.equal(view.stock,value.player.inventory[tool.stock]);
    assert.equal(JSON.stringify(value),before,'UI changed state or clocks');
  }
});

test('tool capability cannot be inferred from map, stock, aim or selected tool',()=>{
  const value=snapshot();value.capabilities={...gameplay,tools:false};value.player.tool='molotov';
  value.player.lanternAim={target:{x:2,y:3},impact:{x:2,y:3,h:4.24},path:[],adjusting:false,canThrow:true};
  const view=viewOf(value);
  assert.equal(view.primaryDisabled,true);assert.equal(view.primaryMode,'WAIT');assert.equal(view.lanternAim,null);
  value.player.tool='jerry-can';value.player.pouring=true;assert.equal(viewOf(value).primaryDisabled,true);
  value.capabilities=gameplay;assert.equal(viewOf(value).primaryLabel,'Stop');assert.equal(viewOf(value).primaryDisabled,false);
});

test('health permission gates death locking while paused state always locks',()=>{
  const value=snapshot();value.player.hp=0;assert.equal(viewOf(value).locked,true);
  value.capabilities={...gameplay,health:false};assert.equal(viewOf(value).dead,false);assert.equal(viewOf(value).locked,false);
  value.paused=true;assert.equal(viewOf(value).locked,true);
});

test('navigation uses host labels without inventing floors or depending on destination IDs',()=>{
  const value=snapshot();value.navigation.placeId='unlisted-map';
  assert.equal(navigationOf(value).locationLabel,'Upper gallery');
  value.player.locationLabel='  West stair  ';assert.equal(navigationOf(value).locationLabel,'West stair');
  value.player.locationLabel=' ';value.navigation.locationLabel=' ';assert.equal(navigationOf(value).locationLabel,'Location pending');
  value.navigation.view='pending';assert.equal(viewOf(value).cameraView,null);
});

test('shared gameplay retains exact authoritative door and carried-lantern interactions',()=>{
  for(const interaction of [
    {id:'upper-door',kind:'door',action:'open',label:'Open gallery door',enabled:false,reason:'Stand clear.',anchor:[4,4.24,6]},
    {id:'room-lantern',kind:'lantern',action:'take',label:'Take lantern',enabled:true,reason:'',anchor:[8,5.1,9]}
  ]) {
    const value=snapshot();value.player.interaction=interaction;freeze(value);
    const view=viewOf(value);assert.deepEqual(view.interaction,interaction);assert.notEqual(view.interaction.anchor,interaction.anchor);
  }
});

test('capabilities do not override resources, torch time, pause or locked lantern aim',()=>{
  const value=snapshot();value.player.inventory.matches=0;assert.equal(viewOf(value).primaryDisabled,true);
  value.player.tool='torch';value.player.torch={phase:'spent',remainingSeconds:0,durationSeconds:30};
  assert.equal(viewOf(value).primaryDisabled,true);
  value.player.tool='molotov';value.player.lanternAim={target:{x:5,y:6},impact:null,path:[],adjusting:true,canThrow:false};
  assert.equal(viewOf(value).primaryDisabled,true);
  value.player.lanternAim=null;value.paused=true;assert.equal(viewOf(value).primaryDisabled,true);
});

test('snapshot capability records preserve a visit, reject contradictions and never mask null',()=>{
  const value=snapshot();assert.deepEqual(snapshotCapabilitiesOf(value,gameplay),gameplay);
  delete value.capabilities;assert.deepEqual(snapshotCapabilitiesOf(value,gameplay),gameplay);
  value.capabilities=null;assert.throws(()=>snapshotCapabilitiesOf(value,gameplay),TypeError);
  assert.throws(()=>viewOf(value),TypeError);
  value.capabilities={...gameplay,mode:'explore'};assert.throws(()=>snapshotCapabilitiesOf(value,gameplay),TypeError);
  value.capabilities=gameplay;value.mode='explore';assert.throws(()=>snapshotCapabilitiesOf(value,gameplay),TypeError);
  value.mode='gameplay';value.capabilities={...gameplay,tools:false,interact:false,overview:false};
  const capabilities=snapshotCapabilitiesOf(value,gameplay);
  assert.equal(capabilities.tools,false);assert.equal(capabilities.interact,false);assert.equal(capabilities.overview,false);
});

for(const field of ['tools','health','interact','overview']) {
  test('snapshot cannot enable factory-disabled '+field,()=>{
    const mount=Object.freeze({...gameplay,[field]:false}),value=snapshot();
    const before=JSON.stringify({mount,value});freeze(value);
    assert.throws(()=>snapshotCapabilitiesOf(value,mount),{name:'TypeError',message:new RegExp(field)});
    assert.equal(JSON.stringify({mount,value}),before,'Capability rejection changed authoritative state');
  });
}

test('snapshot restrictions can restore only permissions granted by the factory',()=>{
  for(const field of ['tools','health','interact','overview']) {
    const mount=gameplay,value=snapshot(),before=JSON.stringify(mount);
    assert.equal(snapshotCapabilitiesOf(value,mount)[field],true);
    value.capabilities=Object.freeze({...gameplay,[field]:false});
    assert.equal(snapshotCapabilitiesOf(value,mount)[field],false);
    value.capabilities=gameplay;
    assert.equal(snapshotCapabilitiesOf(value,mount)[field],true);
    assert.equal(JSON.stringify(mount),before);
  }
});

test('legacy fallback capabilities remain the ceiling when snapshot capabilities are absent',()=>{
  for(const mode of ['gameplay','explore']) {
    const mount=capabilitiesOf(undefined,mode),value={version:1,mode,player:{}};
    assert.deepEqual(snapshotCapabilitiesOf(value,mount),mount);
    value.capabilities=Object.freeze({...mount,interact:false});
    assert.equal(snapshotCapabilitiesOf(value,mount).interact,false);
    delete value.capabilities;
    assert.deepEqual(snapshotCapabilitiesOf(value,mount),mount);
    value.capabilities=Object.freeze({...mount,[mode==='gameplay'?'overview':'tools']:true});
    assert.throws(()=>snapshotCapabilitiesOf(value,mount),TypeError);
  }
});
