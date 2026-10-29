import test from 'node:test';
import assert from 'node:assert/strict';
import {createApplication} from '../../src/runtime/application.js';
import {PLACES} from '../../src/content/places.js';
import {CHARACTERS} from '../../src/content/characters.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
test('catalogue is immutable lightweight menu data with all four stable relative-host destinations',()=>{
  assert.deepEqual(PLACES.map(p=>p.id),['catalogue-street','new-york','administration','horticulture']);
  assert.ok(Object.isFrozen(PLACES)&&PLACES.every(Object.isFrozen));
  for(const p of PLACES.slice(1))assert.ok(p.previewUrl.endsWith('/assets/art/place-previews/'+p.id+'.jpg'));
});
test('menu starts without a renderer/visit and duplicate clicks create exactly one active visit',async()=>{
  let calls=0,disposed=0;const load=deferred(),states=[];
  const app=createApplication({places:PLACES,createVisit:()=>{calls++;return load.promise;},onState:s=>states.push(s)});
  assert.equal(calls,0);assert.equal(app.state().phase,'menu');
  const a=app.select('new-york'),b=app.select('new-york');assert.equal(a,b);assert.equal(calls,1);
  load.resolve({dispose(){disposed++;}});assert.equal(await a,true);assert.equal(app.state().phase,'visit');
  await app.select('new-york');assert.equal(calls,1);app.returnToMenu();assert.equal(disposed,1);app.dispose();assert.equal(disposed,1);
});
test('return while loading aborts promptly, retires late completion and restores selected-card focus',async()=>{
  const load=deferred(),focus=[];let signal,disposed=0;
  const app=createApplication({places:PLACES,createVisit:(_,options)=>{signal=options.signal;return load.promise;},onFocus:id=>focus.push(id)});
  const pending=app.select('administration');app.returnToMenu();assert.equal(signal.aborted,true);assert.equal(app.state().phase,'menu');
  load.resolve({dispose(){disposed++;}});assert.equal(await pending,false);assert.equal(disposed,1);assert.deepEqual(focus,['administration']);app.dispose();
});
test('rapid exit/re-entry, stale failures and out-of-order selection never replace the current visit',async()=>{
  const loads=[deferred(),deferred(),deferred()];let i=0;const disposed=[];
  const app=createApplication({places:PLACES,createVisit:()=>loads[i++].promise});
  const first=app.select('new-york'),second=app.select('horticulture');
  loads[1].resolve({dispose(){disposed.push('horticulture');}});await second;
  loads[0].reject(Error('stale network failure'));await first;assert.equal(app.state().placeId,'horticulture');assert.equal(app.state().error,null);
  app.returnToMenu();const third=app.select('catalogue-street');loads[2].resolve({dispose(){disposed.push('street');}});await third;
  app.dispose();assert.deepEqual(disposed,['horticulture','street']);assert.equal(app.state().phase,'disposed');
});
test('graphics/network failures remain recoverable, active context errors return to menu and all visits dispose once',async()=>{
  let fail=true,options,disposed=0;const focus=[];
  const app=createApplication({places:PLACES,onFocus:id=>focus.push(id),createVisit:async(_,o)=>{options=o;if(fail)throw Error('WebGL 2 unavailable');return{dispose(){disposed++;}};}});
  assert.equal(await app.select('administration'),false);assert.match(app.state().error,/WebGL/);assert.equal(app.state().phase,'menu');
  fail=false;assert.equal(await app.select('administration'),true);options.onError(Error('Graphics context lost'));
  assert.equal(app.state().phase,'menu');assert.equal(disposed,1);assert.match(app.state().error,/context lost/);
  assert.equal(await app.select('missing'),false);app.dispose();assert.equal(disposed,1);assert.deepEqual(focus,[]);
});
test('disposing during an unresolved load releases its late result without another state/focus transition',async()=>{
  const load=deferred();let disposed=0,focus=0;const app=createApplication({places:PLACES,createVisit:()=>load.promise,onFocus:()=>focus++});
  const pending=app.select('new-york');app.dispose();load.resolve({dispose(){disposed++;}});await pending;assert.equal(disposed,1);assert.equal(focus,0);assert.equal(app.state().phase,'disposed');
});
test('title -> selector -> independent map -> selector -> title preserves the chosen animal and creates no graphics in menus',async()=>{
  let created=0,disposed=0,titleFocus=0;const selected=[];
  const app=createApplication({places:PLACES,characters:CHARACTERS,startAtTitle:true,onFocusTitle:()=>titleFocus++,createVisit:async(place,options)=>{created++;selected.push([place.id,options.characterId]);return{dispose(){disposed++;}};}});
  assert.equal(app.state().phase,'title');assert.equal(created,0);assert.equal(await app.select('new-york'),false);assert.equal(app.selectCharacter('horse'),false);
  assert.equal(app.openMenu(),true);assert.equal(app.state().selectedCharacterId,'goat');assert.equal(app.selectCharacter('horse'),true);assert.equal(created,0);
  await app.select('new-york');assert.equal(app.selectCharacter('bear'),false);app.returnToMenu();assert.equal(app.state().selectedCharacterId,'horse');
  app.selectCharacter('bear');await app.select('catalogue-street');app.returnToMenu();app.returnToTitle();assert.equal(app.state().phase,'title');assert.equal(titleFocus,1);assert.equal(disposed,2);
  assert.deepEqual(selected,[['new-york','horse'],['catalogue-street','bear']]);app.dispose();
});
