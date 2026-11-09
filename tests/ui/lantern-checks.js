import {mountUI} from '../../src/ui/index.js';
import {fixture} from '../../workbenches/ui/fixtures.js';

const ok=(value,message)=>{if(!value)throw Error(message);};
const equal=(a,b,message='Values differ')=>ok(JSON.stringify(a)===JSON.stringify(b),message+': '+JSON.stringify(a)+' != '+JSON.stringify(b));
const emptyAim={target:null,impact:null,path:[],adjusting:false,canThrow:false};
const lockedAim={target:{x:6,y:7},impact:{x:5,y:8,h:1.2},path:[{x:2,y:3,h:.7},{x:3,y:4,h:2},{x:5,y:8,h:1.2}],adjusting:false,canThrow:true};
const useLantern=[{type:'select-tool',tool:'molotov'},{type:'primary',pressed:true},{type:'primary',pressed:false}];
const key=(el,type,code,repeat=false)=>el.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true,repeat}));
function pointer(el,type,id,x=0,y=0,kind='touch',buttons=type==='pointerup'?0:1){
  el.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:kind,button:0,buttons,clientX:x,clientY:y,bubbles:true,cancelable:true}));
}
const pointerClick=(el,id)=>el.dispatchEvent(new PointerEvent('click',{pointerId:id,detail:1,bubbles:true,cancelable:true}));
const box=el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};

export async function runLanternChecks(host){
  await document.fonts.ready;
  const results=[];
  async function check(name,run){
    const root=document.createElement('div');root.style.cssText='position:absolute;inset:0';host.append(root);
    const commands=[],calls=[];let projection=()=>({x:root.clientWidth*.57,y:root.clientHeight*.38,visible:true});
    const ui=mountUI({root,onCommand:c=>commands.push(c),onProjectInteraction:a=>{calls.push(a);return projection(a);}});
    const find=q=>root.querySelector(q),button=find('[data-tool="molotov"]'),stick=find('[data-stick]'),cancel=find('[data-cancel-aim]'),
      guide=find('[data-lantern-guide]'),svg=find('.tb-lantern-preview'),marker=find('.tb-lantern-landing');
    function set({aim=null,tool='molotov',tick=1,stock=3,paused=false,hp=60,missing=false}={}){
      const snap=fixture();Object.assign(snap,{tick,paused});
      Object.assign(snap.player,{tool,hp,lanternAim:aim});snap.player.inventory.molotovs=stock;
      if(missing)delete snap.player.lanternAim;
      ui.update(snap);return snap;
    }
    function drag(id=51,x=.4,y=.3,kind='touch'){
      const r=stick.getBoundingClientRect();
      pointer(stick,'pointerdown',id,r.left+r.width*(.5+x*.36),r.top+r.height*(.5-y*.36),kind);
    }
    set();
    try{await run({root,commands,calls,ui,find,button,stick,cancel,guide,svg,marker,set,drag,project:fn=>{projection=fn;}});results.push({name,status:'pass'});}
    catch(error){results.push({name,status:'fail',message:error.message});}
    finally{ui.dispose();root.remove();}
  }
  await check('Lantern waits safely without the new snapshot contract',s=>{
    s.set({missing:true});ok(s.button.disabled,'Legacy runtime could throw under Aim');ok(s.button.title.includes('unavailable'),'No explanation');
    s.button.click();key(s.stick,'keydown','Space');equal(s.commands,[]);
  });
  await check('One tap requests arm and waits for a new frame before accepting another press',s=>{
    const before=s.set({tool:'matches'}),engraving=s.button.querySelector('image');
    pointer(s.button,'pointerdown',21);equal(s.commands,[],'Press before native click');
    pointer(s.button,'pointerup',21);pointerClick(s.button,21);equal(s.commands,useLantern);
    ok(s.button.disabled,'Command still pending');s.set({tool:'matches'});s.button.click();equal(s.commands,useLantern);
    s.set({aim:emptyAim,tick:2});equal(s.button.querySelector('[data-action-label]').textContent,'THROW');
    ok(s.button.disabled,'Throw enabled without target');ok(!s.guide.hidden,'Aim guide hidden');
    equal(s.find('.tb-stick-caption').firstChild.textContent.trim(),'AIM');ok(s.guide.textContent.includes('Release to lock'),'Release hint absent');
    equal(before.player.inventory.molotovs,3);ok(s.button.querySelector('image')===engraving,'Replaced lantern engraving');
    ok(s.svg.hasAttribute('hidden'),'Invented landing point');equal(s.calls,[]);
  });
  await check('Arming retires a held move gesture before it can become aim',s=>{
    s.drag(51,.4,.3,'mouse');const start=s.commands.length;s.button.click();
    equal(s.commands.slice(start),[{type:'move',x:0,y:0},...useLantern]);
    s.set({aim:emptyAim,tick:2});const n=s.commands.length;
    pointer(window,'pointermove',51,10,10,'mouse');pointer(window,'pointerup',51,10,10,'mouse');
    equal(s.commands.length,n,'Stale move crossed into aim');
    s.drag(51,.4,.3,'mouse');ok(s.commands.length===n+1&&s.commands.at(-1).x>0,'Fresh gesture lost');
  });
  await check('Aim uses the raw normalized stick and ordinary release preserves the shown target',s=>{
    s.set({aim:emptyAim});s.drag();const move=s.commands.at(-1);
    equal(move.type,'move');ok(Math.abs(move.x-.4)<.0001&&Math.abs(move.y-.3)<.0001,'Transformed screen input');
    const target={...lockedAim,adjusting:true,canThrow:false},snapshot=s.set({aim:target,tick:2});
    ok(s.button.disabled,'Allowed throw while adjusting');
    pointer(window,'pointerup',51);equal(s.commands.at(-1),{type:'move',x:0,y:0});
    ok(!s.commands.some(c=>c.type==='cancel-input'||c.type==='aim'),'Release cancelled or recalculated aim');
    equal(snapshot.player.lanternAim.target,lockedAim.target);
    s.set({aim:lockedAim,tick:3});ok(!s.button.disabled&&!s.svg.hasAttribute('hidden'),'Ready target lost');
    const n=s.commands.length;s.button.click();equal(s.commands.slice(n),useLantern);
    s.set({tick:4,stock:2});ok(s.svg.hasAttribute('hidden')&&s.guide.hidden,'Marker after throw');equal(s.button.querySelector('[data-action-label]').textContent,'AIM');
  });
  await check('Projection uses the supplied impact and path, including height, on every update',s=>{
    s.project(a=>({x:50+a[0],y:70-a[1],visible:true}));s.calls.length=0;
    s.set({aim:lockedAim});equal(s.calls,[[5,1.2,8],[2,.7,3],[3,2,4],[5,1.2,8]]);
    equal(s.marker.getAttribute('transform'),'translate(55 68.8)');
    s.project(a=>({x:62+a[0],y:90-a[1],visible:true}));s.set({aim:lockedAim});
    equal(s.marker.getAttribute('transform'),'translate(67 88.8)');equal(s.svg.dataset.locked,'true');
    ok(getComputedStyle(s.svg).pointerEvents==='none','Marker intercepts scene input');
  });
  await check('Offscreen and failed projections hide evidence without changing canThrow',s=>{
    s.project(()=>({x:NaN,y:0,visible:true}));s.set({aim:lockedAim});
    ok(s.svg.hasAttribute('hidden')&&!s.button.disabled,'Projection altered authoritative throw eligibility');
    s.project(()=>{throw Error('Projection unavailable');});s.set({aim:lockedAim});ok(s.svg.hasAttribute('hidden'),'Projection failure left a marker');
    s.project(()=>({x:-300,y:20,visible:true}));s.set({aim:lockedAim});ok(s.svg.hasAttribute('hidden'),'Offscreen marker clamped into view');
  });
  await check('Aim and throw work through keyboard shortcuts without repeat or native click duplication',s=>{
    s.button.focus();key(s.button,'keydown','Enter');key(s.button,'keydown','Enter',true);key(s.button,'keyup','Enter');equal(s.commands,useLantern);
    s.set({aim:emptyAim,tick:2});ok(document.activeElement===s.stick,'Arming did not restore a usable keyboard target');
    key(s.stick,'keydown','ArrowRight');equal(s.commands.at(-1),{type:'move',x:1,y:0});
    key(s.stick,'keyup','ArrowRight');equal(s.commands.at(-1),{type:'move',x:0,y:0});
    s.set({aim:lockedAim,tick:3});const n=s.commands.length;
    key(s.stick,'keydown','Space');key(s.stick,'keydown','Space',true);key(s.stick,'keyup','Space');equal(s.commands.slice(n),useLantern);
  });
  await check('Escape cancels aim without pausing, discards old input and ignores held-key repeat',s=>{
    s.set({aim:lockedAim});s.stick.focus();key(s.stick,'keydown','KeyW');const n=s.commands.length;
    key(s.stick,'keydown','Escape');key(s.stick,'keydown','Escape',true);
    equal(s.commands.slice(n),[{type:'move',x:0,y:0},{type:'cancel-input'}]);ok(s.find('[data-menu]').hidden,'Escape opened pause');
    s.set({tick:2});key(s.stick,'keydown','KeyW',true);key(s.stick,'keyup','KeyW');equal(s.commands.length,n+2,'Held aim became walking');
    key(s.stick,'keydown','KeyW');equal(s.commands.at(-1),{type:'move',x:0,y:1});
  });
  await check('Cancel aim neutralizes one pending tap and returns focus to the stick',s=>{
    s.set({aim:lockedAim});pointer(s.button,'pointerdown',21);s.cancel.focus();s.cancel.click();s.cancel.click();
    equal(s.commands,[{type:'cancel-input'}]);s.set({tick:2});pointerClick(s.button,21);
    equal(s.commands,[{type:'cancel-input'}],'Stale tap re-armed');ok(document.activeElement===s.stick,'Cancel lost focus');
  });
  await check('Selecting a different tool clears active aim input without consuming lantern stock',s=>{
    s.set({aim:lockedAim});s.drag();const n=s.commands.length;
    key(s.stick,'keydown','Digit5');equal(s.commands.slice(n),[{type:'move',x:0,y:0},{type:'select-tool',tool:'flamethrower'}]);
    const next=s.set({tool:'flamethrower',tick:2});pointer(window,'pointermove',51,10,10);pointer(window,'pointerup',51);
    equal(s.commands.length,n+2,'Aim drag survived selection');equal(next.player.inventory.molotovs,3);
    ok(s.guide.hidden&&s.svg.hasAttribute('hidden'),'Aim presentation survived selection');
    ok(s.find('[data-tool="flamethrower"]').title.includes('where you face'),'Facing hint absent');
  });
  await check('Direct tool press after aim keeps its own trigger and retires the aim stick',s=>{
    s.set({aim:lockedAim});s.drag();const n=s.commands.length,flamer=s.find('[data-tool="flamethrower"]');
    pointer(flamer,'pointerdown',61);equal(s.commands.slice(n),[{type:'move',x:0,y:0},{type:'select-tool',tool:'flamethrower'},{type:'primary',pressed:true}]);
    s.set({tool:'flamethrower',tick:2});pointer(window,'pointerup',51);
    ok(flamer.classList.contains('is-pressed'),'Old stick release stopped flamer');
    pointer(window,'pointerup',61);equal(s.commands.at(-1),{type:'primary',pressed:false});
  });
  await check('Pointer cancellation, blur, pause and death clear aim input with no late release',s=>{
    const interrupt=[
      ()=>pointer(window,'pointercancel',51),
      ()=>window.dispatchEvent(new Event('blur')),
      ()=>s.find('[data-pause]').click(),
      ()=>s.set({aim:lockedAim,tick:2,hp:0}),
    ];
    for(const [i,stop] of interrupt.entries()){
      s.set({aim:lockedAim,tick:3+i});s.drag();const n=s.commands.length;stop();
      const tail=s.commands.slice(n);
      ok(tail.some(c=>c.type==='move'&&c.x===0&&c.y===0)&&tail.some(c=>c.type==='cancel-input'),'Interrupt did not neutralize');
      const count=s.commands.length;pointer(window,'pointerup',51);pointer(window,'pointermove',51,10,10);equal(s.commands.length,count,'Late aim input');
      if(i===2){ok(s.guide.hidden&&s.svg.hasAttribute('hidden'),'Pause kept aim visible');s.set({tick:8,paused:true});s.find('[data-resume]').click();s.set({tick:9});}
      if(i===3)ok(s.guide.hidden&&s.svg.hasAttribute('hidden'),'Death kept aim visible');
    }
  });
  await check('The night guide and accessible Cancel fit without shifting or adding to the six main controls',s=>{
    const before=box(s.stick);s.set({aim:lockedAim});equal(box(s.stick),before,'Aim changed stick origin');
    equal(s.root.querySelectorAll('.left-controls button,.right-controls button').length,6);
    const panel=s.guide.getBoundingClientRect(),cancel=s.cancel.getBoundingClientRect(),deck=s.find('.tb-console').getBoundingClientRect(),frame=s.root.getBoundingClientRect();
    ok(panel.left>=frame.left&&panel.right<=frame.right&&panel.top>=frame.top&&panel.bottom<deck.top,'Aim guide clipped');
    ok(cancel.width>=44&&cancel.height>=44,'Cancel below 44 CSS pixels');
    ok(getComputedStyle(s.find('.tb-stick-caption')).display!=='none','AIM caption hidden');
  });
  return results;
}
