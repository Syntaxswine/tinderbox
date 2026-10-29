import test from 'node:test';
import assert from 'node:assert/strict';
import {startApplication} from '../../src/main.js';
function fixture(){
  class Element extends EventTarget{constructor(){super();this.children=[];this.dataset={};this.hidden=false;this.span={textContent:''};}append(child){this.children.push(child);child.parent=this;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}querySelector(selector){return this.nodes?.[selector]||this.span;}}
  const win=new EventTarget(),doc={defaultView:win,createElement:()=>new Element()},root=new Element();root.ownerDocument=doc;
  root.nodes=Object.fromEntries(['#viewport','#hud','#title-screen','#main-menu','#load-state','.field-help'].map(key=>[key,new Element()]));
  const counts={titleCreated:0,titleDisposed:0,optionsOpened:0},titles=[];let focus=null,menuOptions;
  // Faithful public title contract: Play deliberately latches each mounted
  // instance, and focusStart does not rearm Play or Options (real UI d099011).
  const ui={mountTitleScreen({onStart}){counts.titleCreated++;let started=false,disposed=false;const title={play(){if(started||disposed)return;started=true;onStart();},options(){if(!started&&!disposed)counts.optionsOpened++;},focusStart(){focus='play';},dispose(){assert.equal(disposed,false);disposed=true;counts.titleDisposed++;}};titles.push(title);return title;},
    mountMainMenu(options){menuOptions=options;return{update(state){if(state.error)focus='error-heading';},focusPlace(id){focus=id;},dispose(){}};},mountUI(){}};
  return{root,ui,counts,titles,get focus(){return focus;},get menu(){return menuOptions;}};
}
test('actual composition recreates latched title controls so Play and Options work after every return',async()=>{
  const f=fixture();let created=0,released=0;const app=startApplication({root:f.root,ui:f.ui,createVisit:async()=>{created++;return{dispose(){released++;}};}});
  try{
    f.titles[0].options();f.titles[0].play();assert.equal(app.state().phase,'menu');assert.equal(f.counts.titleDisposed,1);assert.equal(created,0);
    await f.menu.onSelect('catalogue-street');app.returnToMenu();f.menu.onBackToTitle();assert.equal(app.state().phase,'title');assert.equal(f.focus,'play');assert.equal(f.counts.titleCreated,2);
    f.titles[1].options();f.titles[1].play();assert.equal(app.state().phase,'menu');assert.equal(f.counts.optionsOpened,2);assert.equal(released,1);
    f.menu.onBackToTitle();f.titles[2].play();assert.equal(app.state().phase,'menu');assert.equal(f.counts.titleCreated,3);
  }finally{app.dispose();}assert.equal(f.counts.titleDisposed,3);
});
test('actual composition keeps recovery-heading focus after failed loading and active context errors',async()=>{
  const f=fixture();let fail=true,visitOptions;const app=startApplication({root:f.root,ui:f.ui,createVisit:async(_,options)=>{visitOptions=options;if(fail)throw Error('HTTP 404');return{dispose(){}};}});
  try{
    f.titles[0].play();await f.menu.onSelect('new-york');assert.equal(app.state().phase,'menu');assert.equal(f.focus,'error-heading');
    fail=false;await f.menu.onSelect('new-york');visitOptions.onError(Error('Graphics context lost'));assert.equal(f.focus,'error-heading');
    await f.menu.onSelect('new-york');app.returnToMenu();assert.equal(f.focus,'new-york');
  }finally{app.dispose();}
});
