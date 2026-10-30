import {createExploration} from '../../src/runtime/navigation.js';
import {CHARACTER_PROFILES} from '../../src/content/characters.js';
import {mountUI} from '../../src/ui/index.js';
import {explorationFixture,fixture} from '../../workbenches/ui/fixtures.js';
const ok=(v,m)=>{if(!v)throw Error(m);};
const near=(a,b,m)=>ok(Math.abs(a-b)<1e-8,m+': '+a+' != '+b);
const vector=(a,b,m='Wrong vector')=>{near(a.x,b.x,m+' X');near(a.y,b.y,m+' Y');};
const key=(target,type,code)=>target.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
const pointer=(target,type,id,x,y,extra={})=>target.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'mouse',button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y,bubbles:true,cancelable:true,...extra}));
export async function runMovementChecks(host){
 await document.fonts.ready;
 const results=[];
 const check=async(name,run)=>{const root=document.createElement('div');root.style.cssText='position:absolute;inset:0';host.append(root);const commands=[];let snap=explorationFixture();const ui=mountUI({root,mode:'explore',placeTitle:'Administration Building',onCommand:c=>commands.push(c)});ui.update(snap);const stick=root.querySelector('[data-stick]');const r=stick.getBoundingClientRect();
 const state={root,ui,stick,r,commands,last:()=>commands.filter(c=>c.type==='move').at(-1),snapshot:()=>snap,update:s=>{snap=s;ui.update(s);},down:(v={x:.35,y:.2},id=21,type='mouse')=>pointer(stick,'pointerdown',id,r.left+r.width/2+v.x*r.width*.36,r.top+r.height/2-v.y*r.height*.36,{pointerType:type})};
 try{await run(state);results.push({name,status:'pass'});}catch(e){results.push({name,status:'fail',message:e.message});}finally{ui.dispose();root.remove();}};
 await check('Held mouse survives 120 changing stair/landing/location snapshots with a stable well',s=>{
  s.down();const first={...s.last()};for(let i=0;i<120;i++){const next=explorationFixture();next.player.locationLabel=['Stairs','Pavilion landing','Administration Building south pavilion stairs beside the lower rotunda entrance'][i%3];next.player.elevation=i*.176666;next.player.level=i%19;next.player.interaction={label:next.player.locationLabel,enabled:!!(i%2)};s.update(next);const r=s.stick.getBoundingClientRect();for(const k of ['x','y','width','height'])near(r[k],s.r[k],'Well moved with label: '+k);pointer(window,'pointermove',21,s.r.left+s.r.width/2+first.x*s.r.width*.36,s.r.top+s.r.height/2-first.y*s.r.height*.36);vector(s.last(),first);}
  ok(!s.commands.some(c=>c.type==='cancel-input'),'Snapshot cancelled input');
 });
 await check('A layout/viewport change cannot redirect the same held pointer position',s=>{
  const v={x:.35,y:.2};s.down(v);const x=s.r.left+s.r.width/2+v.x*s.r.width*.36,y=s.r.top+s.r.height/2-v.y*s.r.height*.36;
  const actual=s.stick.getBoundingClientRect.bind(s.stick);s.stick.getBoundingClientRect=()=>new DOMRect(s.r.left+35,s.r.top+25,s.r.width*.8,s.r.height*.8);
  try{pointer(window,'pointermove',21,x,y);vector(s.last(),v,'Held gesture origin changed');pointer(window,'pointerup',21,x,y);vector(s.last(),{x:0,y:0});const r=s.stick.getBoundingClientRect();pointer(s.stick,'pointerdown',22,r.left+r.width/2+.3*r.width*.36,r.top+r.height/2);vector(s.last(),{x:.3,y:0},'Fresh gesture kept old origin');}finally{s.stick.getBoundingClientRect=actual;}
 });
 await check('Mouse hover after a missed release stops the captured movement and permits keyboard takeover',s=>{
  s.down();pointer(window,'pointermove',21,s.r.left+10,s.r.top+10,{buttons:0});vector(s.last(),{x:0,y:0},'Hover kept dragging');key(s.stick,'keydown','KeyW');vector(s.last(),{x:0,y:1},'Stale pointer blocked keyboard');key(s.stick,'keyup','KeyW');vector(s.last(),{x:0,y:0});
 });
 await check('A fresh same-mouse press recovers a missed release without stealing a live touch pointer',s=>{
  s.down({x:.35,y:.2},21);s.down({x:-.4,y:0},21);vector(s.last(),{x:-.4,y:0},'Fresh mouse press ignored after lost release');pointer(window,'pointerup',21,0,0);s.down({x:.25,y:.1},31,'touch');s.down({x:-.8,y:0},32,'mouse');vector(s.last(),{x:.25,y:.1},'A second pointer stole live touch');s.down({x:-.8,y:0},31,'mouse');vector(s.last(),{x:.25,y:.1},'Different pointer type stole live touch');pointer(window,'pointerup',31,0,0,{pointerType:'touch'});s.down({x:.4,y:0},33,'mouse');vector(s.last(),{x:.4,y:0});
 });
 await check('Mouse/touch/pen preserve partial analog input and the existing 12 percent radial dead zone',s=>{
  for(const [i,type]of ['mouse','touch','pen'].entries()){s.down({x:.13,y:0},30+i,type);vector(s.last(),{x:.13,y:0});pointer(window,'pointerup',30+i,0,0,{pointerType:type});s.down({x:.1,y:0},40+i,type);vector(s.last(),{x:0,y:0});pointer(window,'pointerup',40+i,0,0,{pointerType:type});}
 });
 await check('Full diagonal mouse input matches keyboard; keyboard resumes only while its key remains held',s=>{
  s.down({x:1,y:1});vector(s.last(),{x:Math.SQRT1_2,y:Math.SQRT1_2});key(s.stick,'keydown','KeyW');vector(s.last(),{x:Math.SQRT1_2,y:Math.SQRT1_2});pointer(window,'pointerup',21,0,0);vector(s.last(),{x:0,y:1});key(s.stick,'keydown','KeyD');vector(s.last(),{x:Math.SQRT1_2,y:Math.SQRT1_2});key(s.stick,'keyup','KeyW');key(s.stick,'keyup','KeyD');vector(s.last(),{x:0,y:0});
 });
 await check('Unavailable capture keeps window fallback movement and outside release working',s=>{
  s.stick.setPointerCapture=()=>{throw Error('Capture unavailable in fixture');};s.down();pointer(window,'pointermove',21,s.r.left+s.r.width/2,s.r.top+5);vector(s.last(),{x:0,y:1});pointer(window,'pointerup',21,-20,-20);vector(s.last(),{x:0,y:0});s.down({x:.4,y:0},22);vector(s.last(),{x:.4,y:0});
 });
 await check('Pointer cancellation, capture loss and fresh drags agree on movement ownership',s=>{
  s.down();pointer(window,'pointercancel',99,0,0);vector(s.last(),{x:.35,y:.2});pointer(window,'pointercancel',21,0,0);vector(s.last(),{x:0,y:0});s.down({x:.4,y:0},22);pointer(s.stick,'lostpointercapture',22,0,0);vector(s.last(),{x:0,y:0});s.down({x:.25,y:0},23);vector(s.last(),{x:.25,y:0});
 });
 await check('Pause, blur and outside focus stop the gesture; stale moves cannot restart it',s=>{
  s.down();key(s.stick,'keydown','KeyP');vector(s.last(),{x:0,y:0});const paused=explorationFixture();paused.paused=true;s.update(paused);s.root.querySelector('[data-resume]').click();s.update(explorationFixture());const n=s.commands.length;pointer(window,'pointermove',21,0,0);ok(s.commands.length===n,'Stale move restarted after pause');s.down({x:.3,y:0},22);vector(s.last(),{x:.3,y:0});window.dispatchEvent(new Event('blur'));vector(s.last(),{x:0,y:0});s.down({x:.3,y:0},23);const outside=document.createElement('button');document.body.append(outside);outside.focus();outside.remove();vector(s.last(),{x:0,y:0});s.down({x:.3,y:0},24);vector(s.last(),{x:.3,y:0});
 });
 await check('Gameplay shares the same gesture geometry and disposal leaves no stale input',s=>{
  s.ui.dispose();s.commands.length=0;const ui=mountUI({root:s.root,onCommand:c=>s.commands.push(c)});ui.update(fixture());const stick=s.root.querySelector('[data-stick]'),r=stick.getBoundingClientRect();pointer(stick,'pointerdown',61,r.left+r.width/2+.25*r.width*.36,r.top+r.height/2);vector(s.last(),{x:.25,y:0});ui.dispose();vector(s.last(),{x:0,y:0});const n=s.commands.length;pointer(window,'pointermove',61,0,0);pointer(window,'pointerup',61,0,0);ok(s.commands.length===n,'Disposed gesture emitted input');
 });
 await check('Actual Administration approach: UI mouse/touch and keyboard agree; partial analog reaches the landing for every animal',async s=>{
  s.ui.dispose();
  const definition=await fetch(new URL('../../assets/art/place-scenes/administration/navigation.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Navigation '+r.status);return r.json();});
  async function walk(characterId,magnitude,kind){
   const commands=[],sim=createExploration({definition:{...definition,characterId,body:CHARACTER_PROFILES[characterId]}}),ui=mountUI({root:s.root,mode:'explore',placeTitle:'Administration Building',onCommand:c=>{commands.push(c);sim.dispatch(c);}});
   try{ui.update(sim.snapshot());const stick=s.root.querySelector('[data-stick]'),r=stick.getBoundingClientRect(),v={x:-Math.SQRT1_2*magnitude,y:-Math.SQRT1_2*magnitude};
    if(kind==='keyboard'){stick.focus();key(stick,'keydown','KeyA');key(stick,'keydown','KeyS');}else pointer(stick,'pointerdown',81,r.left+r.width/2+v.x*r.width*.36,r.top+r.height/2-v.y*r.height*.36,{pointerType:kind});
    vector(commands.filter(c=>c.type==='move').at(-1),v,'UI changed source stair vector');let snap;const labels=new Set();for(let i=0;i<Math.ceil(5/magnitude*60);i++){snap=sim.advance(1/60);labels.add(snap.player.locationLabel);if(i%Math.max(1,Math.round(1/magnitude))===0)ui.update(snap);}
    ok(snap.player.elevation>2.1,'Analog stuck below actual approach landing: '+characterId+' '+magnitude);ok(labels.has('Approach stairs'),'Did not use source treads');ok(!commands.some(c=>c.type==='cancel-input'||c.type==='move'&&c.x===0&&c.y===0),'Source snapshots cancelled held input');
    const result={x:snap.player.x,y:snap.player.y,elevation:snap.player.elevation};
    if(kind==='keyboard'){key(stick,'keyup','KeyA');key(stick,'keyup','KeyS');}else pointer(window,'pointerup',81,0,0,{pointerType:kind});
    vector(commands.filter(c=>c.type==='move').at(-1),{x:0,y:0},'Release failed');return result;
   }finally{ui.dispose();sim.dispose();await new Promise(resolve=>requestAnimationFrame(resolve));}
  }
  for(const characterId of ['goat','horse','bear']){const keyboard=await walk(characterId,1,'keyboard'),mouse=await walk(characterId,1,'mouse');vector(mouse,keyboard,'Full stick/keyboard path mismatch');near(mouse.elevation,keyboard.elevation,'Full stick/keyboard height mismatch');await walk(characterId,.35,'mouse');await walk(characterId,.13,'touch');}
 });
 return results;
}
