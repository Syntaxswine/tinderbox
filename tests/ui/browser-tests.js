import {mountUI} from '../../src/ui/index.js';
import {fixture,createFakeSnapshotAdapter} from '../../workbenches/ui/fixtures.js';
import {createSimulation} from '../../src/simulation/index.js';
const host=document.querySelector('#fixture-root'),results=[];
const equal=(a,b,message='Values differ')=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(message+': '+JSON.stringify(a)+' != '+JSON.stringify(b));};
const ok=(value,message)=>{if(!value)throw Error(message);};
function deepFreeze(value){Object.freeze(value);for(const item of Object.values(value))if(item&&typeof item==='object'&&!Object.isFrozen(item))deepFreeze(item);return value;}
function make(name='ready',zoom=true){
  const root=document.createElement('div');root.style.cssText='position:absolute;inset:0';host.append(root);
  const commands=[],zooms=[],ui=mountUI({root,onCommand:c=>commands.push(c),...(zoom?{onZoom:f=>zooms.push(f)}:{})});
  ui.update(deepFreeze(fixture(name)));return{root,commands,zooms,ui,find:s=>root.querySelector(s),close:()=>{ui.dispose();root.remove();}};
}
const key=(target,type,code,extra={})=>target.dispatchEvent(new KeyboardEvent(type,{code,key:code==='Space'?' ':code,bubbles:true,cancelable:true,...extra}));
const pointer=(target,type,id,x=0,y=0)=>target.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y,bubbles:true,cancelable:true}));
const tool=(s,id)=>s.find('[data-tool="'+id+'"]');
function downStick(s,id=11){const stick=s.find('[data-stick]'),r=stick.getBoundingClientRect();pointer(stick,'pointerdown',id,r.right-8,r.top+8);}
async function check(name,run){let s;try{s=make();await run(s);results.push({name,status:'pass'});}catch(e){results.push({name,status:'fail',message:e.stack||e.message});}finally{s?.close();}}
function real(){
  const root=document.createElement('div');root.style.cssText='position:absolute;inset:0';host.append(root);
  const simulation=createSimulation({scenario:{id:'ui-direct-actions',width:20,height:16,player:{x:4,y:9,hp:60},obstacles:[],actors:[]}}),commands=[];
  const ui=mountUI({root,onCommand:c=>{commands.push(c);simulation.dispatch(c);}});
  const step=(n=1)=>{let value;for(let i=0;i<n;i++)value=simulation.advance(1/60);ui.update(value);return value;};
  ui.update(simulation.snapshot());return{root,ui,simulation,commands,step,find:s=>root.querySelector(s),close:()=>{ui.dispose();simulation.dispose();root.remove();}};
}
await check('Exact vertical banks: matches, torch, flamethrower / oil barrel, throw lantern, menu',s=>{
  const left=[...s.root.querySelectorAll('.left-controls button')],right=[...s.root.querySelectorAll('.right-controls button')];
  equal(left.map(b=>b.dataset.tool),['matches','torch','flamethrower']);equal(right.map(b=>b.dataset.tool||'menu'),['jerry-can','molotov','menu']);
  equal(left.map(b=>b.querySelector('.switch-label').textContent),['MATCHESSTRIKE','TORCHLIGHT','FLAMETHROWER']);equal(right.map(b=>b.querySelector('.switch-label').textContent),['OILBARREL','THROWLANTERN','MENU']);
  for(const bank of [left,right])for(let i=1;i<bank.length;i++)ok(bank[i].getBoundingClientRect().top>=bank[i-1].getBoundingClientRect().bottom,'Bank order is not vertical');
  equal(s.root.querySelectorAll('[data-tool]').length,5);equal(s.root.querySelectorAll('[data-drug],[data-picker],[data-tools]').length,0);
});
await check('Each direct click selects its own tool then sends exactly one press and release',s=>{
  for(const id of ['matches','torch','flamethrower','jerry-can','molotov']){const n=s.commands.length;tool(s,id).click();equal(s.commands.slice(n),[{type:'select-tool',tool:id},{type:'primary',pressed:true},{type:'primary',pressed:false}]);}
});
await check('Selection and stock remain authoritative until snapshots arrive',s=>{
  tool(s,'torch').click();equal(s.find('[data-tool-name]').textContent,'Matches');equal(tool(s,'matches').getAttribute('aria-pressed'),'true');
  const next=fixture();next.player.tool='torch';next.player.inventory.torchFuel=7;s.ui.update(deepFreeze(next));equal(s.find('[data-tool-name]').textContent,'Torch');equal(tool(s,'torch').getAttribute('aria-pressed'),'true');equal(tool(s,'torch').querySelector('[data-stock]').textContent,'41.7s');
});
await check('An empty selected tool does not block a different tool that has stock',s=>{
  const next=fixture();next.player.inventory.matches=0;s.ui.update(deepFreeze(next));ok(tool(s,'matches').disabled,'Empty matches enabled');ok(!tool(s,'torch').disabled,'Valid torch disabled');
  const n=s.commands.length;tool(s,'matches').click();equal(s.commands.length,n);tool(s,'torch').click();equal(s.commands.at(-2),{type:'primary',pressed:true});
});
await check('Oil barrel exposes authoritative Stop even at zero gas and keeps its image node',s=>{
  tool(s,'jerry-can').click();equal(tool(s,'jerry-can').querySelector('[data-stock]').textContent,'24.8 gas');
  const next=fixture('pouring');next.player.inventory.gas=0;s.ui.update(deepFreeze(next));equal(tool(s,'jerry-can').querySelector('[data-stock]').textContent,'STOP');ok(!tool(s,'jerry-can').disabled,'Cannot stop empty pouring');
  const image=tool(s,'jerry-can').querySelector('image');const low=structuredClone(next);low.player.inventory.gas=.1;s.ui.update(low);ok(tool(s,'jerry-can').querySelector('image')===image,'Stock update rebuilt image');
});
await check('Torch and flamethrower send one edge until the matching pointer releases',s=>{
  for(const id of ['torch','flamethrower']){const n=s.commands.length;pointer(tool(s,id),'pointerdown',22);equal(s.commands.slice(n),[{type:'select-tool',tool:id},{type:'primary',pressed:true}]);pointer(window,'pointerup',99);ok(tool(s,id).classList.contains('is-pressed'),'Unrelated release stopped action');pointer(window,'pointerup',22);equal(s.commands.at(-1),{type:'primary',pressed:false});}
});
await check('Independent joystick and action pointers preserve held movement',s=>{
  downStick(s,11);pointer(tool(s,'jerry-can'),'pointerdown',22);pointer(window,'pointerup',22);
  ok(!s.commands.some(c=>c.type==='cancel-input'||c.type==='move'&&c.x===0&&c.y===0),'Action cancelled movement');pointer(window,'pointerup',11);equal(s.commands.at(-1),{type:'move',x:0,y:0});
});
await check('Inversion feedback never pre-inverts the raw NE stick or changes aim',s=>{
  s.ui.update(deepFreeze(fixture('reversed')));const stick=s.find('[data-stick]');stick.focus();key(stick,'keydown','KeyW');key(stick,'keydown','KeyD');const c=s.commands.at(-1);
  ok(c.type==='move'&&c.x>0&&c.y>0,'Raw inversion applied in UI');ok(Math.abs(Math.hypot(c.x,c.y)-1)<1e-12,'Not normalized');ok(!s.commands.some(c=>c.type==='aim'),'Stick altered aim');
});
await check('Q E R and increased drug stock emit no manual consumption command',s=>{
  const stick=s.find('[data-stick]');stick.focus();for(const code of ['KeyQ','KeyE','KeyR']){key(stick,'keydown',code);key(stick,'keyup',code);}
  const next=fixture();next.player.inventory.powder+=1;next.player.inventory.healing+=1;s.ui.update(deepFreeze(next));equal(s.commands,[]);equal(s.root.querySelectorAll('[data-drug]').length,0);
});
await check('Engine-supplied medicine and timed effects update feedback without reapplying effects',s=>{
  downStick(s);const n=s.commands.length,next=fixture('pouring');next.player.hp=95;next.effects.inversion={active:true,remaining:7.2};s.ui.update(deepFreeze(next));
  equal(s.commands.length,n);equal(s.find('[data-health-text]').textContent,'95 / 100');equal(s.find('[data-effect="powder"] [data-time]').textContent,'6.4s');equal(s.find('[data-effect="inversion"] [data-time]').textContent,'7.2s');
  s.ui.update(next);equal(s.commands.length,n);ok(!s.find('[data-effect="powder"]').hidden,'Powder feedback missing');
});
await check('Space and Enter on a tool suppress repeat and release their own action',s=>{
  const button=tool(s,'torch');button.focus();key(button,'keydown','Enter');key(button,'keydown','Enter',{repeat:true});key(button,'keydown','Enter',{repeat:true});
  equal(s.commands.filter(c=>c.type==='primary'&&c.pressed).length,1);key(button,'keyup','Enter');equal(s.commands.at(-1),{type:'primary',pressed:false});
  key(button,'keydown','Space');key(button,'keyup','Space');equal(s.commands.filter(c=>c.type==='primary'&&c.pressed).length,2);
});
await check('Number keys select without firing; Space uses the selected tool without stopping movement',s=>{
  const stick=s.find('[data-stick]');stick.focus();key(stick,'keydown','KeyW');key(stick,'keydown','Digit2');equal(s.commands.at(-1),{type:'select-tool',tool:'jerry-can'});ok(!s.commands.some(c=>c.type==='primary'),'Selection fired');
  const next=fixture();next.player.tool='jerry-can';s.ui.update(deepFreeze(next));key(stick,'keydown','Space');key(stick,'keyup','Space');ok(!s.commands.some(c=>c.type==='cancel-input'||c.type==='move'&&c.y===0),'Keyboard action stopped movement');
});
await check('Pending selection survives an old snapshot until the requested tool is acknowledged',s=>{
  const old=fixture();old.player.inventory.matches=0;s.ui.update(old);pointer(tool(s,'torch'),'pointerdown',22);s.ui.update(old);ok(tool(s,'torch').classList.contains('is-pressed'),'Old empty tool cancelled pending torch');
  const next=fixture();next.player.tool='torch';s.ui.update(next);ok(tool(s,'torch').classList.contains('is-pressed'),'Acknowledgment cancelled hold');pointer(window,'pointerup',22);equal(s.commands.at(-1),{type:'primary',pressed:false});
});
await check('Switching by number releases an old held action and leaves the joystick active',s=>{
  downStick(s);pointer(tool(s,'torch'),'pointerdown',22);key(tool(s,'torch'),'keydown','Digit5');
  equal(s.commands.slice(-2),[{type:'primary',pressed:false},{type:'select-tool',tool:'flamethrower'}]);ok(!s.commands.some(c=>c.type==='move'&&c.x===0&&c.y===0),'Selection stopped movement');const n=s.commands.length;pointer(window,'pointerup',22);equal(s.commands.length,n);
});
await check('Pointer cancellation and lost capture clear movement and held tools',s=>{
  downStick(s);pointer(tool(s,'flamethrower'),'pointerdown',22);pointer(window,'pointercancel',22);equal(s.commands.at(-1),{type:'cancel-input'});ok(s.commands.some(c=>c.type==='primary'&&!c.pressed),'Trigger not released');
  downStick(s,33);pointer(s.find('[data-stick]'),'lostpointercapture',33);equal(s.commands.at(-1),{type:'cancel-input'});
});
await check('Blur and hidden document neutralize input with no stale release',s=>{
  const stick=s.find('[data-stick]');stick.focus();key(stick,'keydown','KeyW');pointer(tool(s,'torch'),'pointerdown',22);window.dispatchEvent(new Event('blur'));equal(s.commands.at(-1),{type:'cancel-input'});
  const n=s.commands.length;pointer(window,'pointerup',22);key(stick,'keyup','KeyW');equal(s.commands.length,n);
  downStick(s);const own=Object.getOwnPropertyDescriptor(document,'hidden');try{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));}finally{if(own)Object.defineProperty(document,'hidden',own);else delete document.hidden;}equal(s.commands.at(-1),{type:'cancel-input'});
});
await check('Paused, dead and depleted snapshots gate tool actions and release holds',s=>{
  pointer(tool(s,'torch'),'pointerdown',22);s.ui.update(deepFreeze(fixture('paused')));ok([...s.root.querySelectorAll('[data-tool]')].every(b=>b.disabled),'Paused action enabled');ok(!s.find('[data-menu]').hidden,'Pause menu missing');
  s.ui.update(deepFreeze(fixture('down')));ok(s.find('[data-stick]').disabled,'Dead stick enabled');ok(!s.find('[data-death]').hidden,'Death feedback missing');
});
await check('Menu pauses and resumes authoritatively; reset emits the contract command',s=>{
  s.find('[data-pause]').click();equal(s.commands.at(-1),{type:'pause',paused:true});equal(s.find('[data-menu-title]').textContent,'Pausing…');s.ui.update(fixture('paused'));s.find('[data-resume]').click();ok(!s.find('[data-menu]').hidden,'Optimistic resume');s.ui.update(fixture());ok(s.find('[data-menu]').hidden,'Resume stuck');
  s.find('[data-pause]').click();s.find('[data-reset]').click();equal(s.commands.at(-1),{type:'reset'});
});
await check('Options trap focus and Escape returns without triggering tools',s=>{
  s.find('[data-pause]').click();s.ui.update(fixture('paused'));s.find('[data-options]').click();const first=s.find('[data-reduce-motion]'),last=s.find('[data-back]');
  ok(document.activeElement===first,'Wrong focus');key(first,'keydown','Tab',{shiftKey:true});ok(document.activeElement===last,'Reverse trap failed');key(last,'keydown','Tab');ok(document.activeElement===first,'Forward trap failed');
  const n=s.commands.length;key(first,'keydown','Space');key(first,'keyup','Space');equal(s.commands.length,n);key(first,'keydown','Escape');equal(s.find('[data-menu-title]').textContent,'Paused');
});
await check('Repeated mount/dispose removes every UI listener and stale controls are inert',s=>{
  const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener,active=[];let other;
  EventTarget.prototype.addEventListener=function(type,fn,opts){active.push({target:this,type,fn,capture:Boolean(typeof opts==='boolean'?opts:opts?.capture)});return add.call(this,type,fn,opts);};
  EventTarget.prototype.removeEventListener=function(type,fn,opts){const cap=Boolean(typeof opts==='boolean'?opts:opts?.capture),i=active.findIndex(v=>v.target===this&&v.type===type&&v.fn===fn&&v.capture===cap);if(i>=0)active.splice(i,1);return remove.call(this,type,fn,opts);};
  try{for(let i=0;i<5;i++){other=make();const old=tool(other,'matches');other.ui.dispose();const n=other.commands.length;old.click();key(old,'keydown','Space');equal(other.commands.length,n);other.root.remove();other=null;}equal(active.length,0,'Listener leak');}finally{other?.close();EventTarget.prototype.addEventListener=add;EventTarget.prototype.removeEventListener=remove;}
});
await check('Independent mounts scope ARIA and clipping and preserve caller siblings',s=>{
  const sibling=document.createElement('canvas');s.root.append(sibling);const other=make();try{
    ok(s.find('[data-stick]').getAttribute('aria-describedby')!==other.find('[data-stick]').getAttribute('aria-describedby'),'Shared help ID');const clips=[...document.querySelectorAll('.tb-ui clipPath[id]')].map(e=>e.id);equal(new Set(clips).size,clips.length);
    for(const image of s.root.querySelectorAll('image[clip-path]'))ok(s.root.contains(document.getElementById(image.getAttribute('clip-path').slice(5,-1))),'Clip outside own mount');s.ui.dispose();ok(sibling.isConnected,'Caller sibling removed');
  }finally{other.close();}
});
await check('All controls are at least 44px, contained, correctly flanking the joystick and map',s=>{
  const frame=s.root.getBoundingClientRect(),stick=s.find('[data-stick]').getBoundingClientRect();
  for(const b of s.root.querySelectorAll('.tb-console button,[data-zoom]')){const r=b.getBoundingClientRect();ok(r.width>=44&&r.height>=44,'Undersized '+b.getAttribute('aria-label'));ok(r.left>=frame.left-.5&&r.right<=frame.right+.5&&r.top>=frame.top-.5&&r.bottom<=frame.bottom+.5,'Clipped '+b.getAttribute('aria-label'));}
  for(const b of s.root.querySelectorAll('.left-controls button'))ok(b.getBoundingClientRect().right<=stick.left,'Left bank crosses stick');
  for(const b of s.root.querySelectorAll('.right-controls button'))ok(b.getBoundingClientRect().left>=stick.right,'Right bank crosses stick');
  const map=s.find('.tb-map').getBoundingClientRect();ok(map.left>frame.width/2&&map.bottom<s.find('.tb-console').getBoundingClientRect().top,'Map placement');ok(s.find('[data-zoom]').getBoundingClientRect().left<70,'Zoom placement');
});
await check('Field-canvas focus survives menu resume; leaving the game cancels input',s=>{
  const canvas=document.createElement('canvas');canvas.tabIndex=0;host.append(canvas);const input=document.createElement('input');document.body.append(input);try{
    canvas.focus();key(canvas,'keydown','KeyW');key(canvas,'keydown','Escape');s.ui.update(fixture('paused'));s.find('[data-resume]').click();s.ui.update(fixture());ok(document.activeElement===canvas,'Canvas focus lost');key(canvas,'keydown','KeyW');input.focus();equal(s.commands.at(-1),{type:'cancel-input'});
  }finally{canvas.remove();input.remove();}
});
await check('Map heading/fire updates independently and loading state exposes no active controls',s=>{
  const next=fixture();next.player.x=3;next.player.y=12;next.player.heading=Math.PI/2;next.cells=[{x:2.25,y:4.25,phase:'burning'}];s.ui.update(next);const map=s.find('[data-map]');equal([map.dataset.playerX,map.dataset.playerY,map.dataset.heading,map.dataset.fireCount],['3','12','90','1']);equal(map.querySelector('svg').getAttribute('preserveAspectRatio'),'xMidYMid meet');equal(s.commands,[]);
  const root=document.createElement('div');host.append(root);const commands=[],ui=mountUI({root,onCommand:c=>commands.push(c)});try{equal(root.querySelector('[data-map]').dataset.ready,'false');for(const b of root.querySelectorAll('.tb-console button')){ok(b.disabled,'Control active before snapshot');b.click();}equal(commands,[]);}finally{ui.dispose();root.remove();}
});
await check('Zoom callbacks stay separate, reciprocal, optional and inert after disposal',s=>{
  s.find('[data-zoom="in"]').click();s.find('[data-zoom="out"]').click();equal(s.zooms,[1.15,1/1.15]);equal(s.commands,[]);const stale=s.find('[data-zoom="in"]');s.ui.dispose();stale.click();equal(s.zooms.length,2);const other=make('ready',false);try{ok(other.find('[data-zoom]').disabled,'Disconnected zoom enabled');}finally{other.close();}
});
await check('Synchronous snapshot callbacks can acknowledge selection and pour without reentrant loss',()=>{
  const root=document.createElement('div');host.append(root);let ui;const adapter=createFakeSnapshotAdapter({onSnapshot:s=>ui?.update(s)});ui=mountUI({root,onCommand:c=>adapter.dispatch(c)});try{
    ui.update(adapter.snapshot());root.querySelector('[data-tool="jerry-can"]').click();ok(adapter.snapshot().player.pouring,'Synchronous pour lost');root.querySelector('[data-tool="jerry-can"]').click();ok(!adapter.snapshot().player.pouring,'Synchronous stop lost');
  }finally{ui.dispose();root.remove();}
});
await check('Real simulation: matches and lantern clicks consume exactly one item each',()=>{
  const s=real();try{tool(s,'matches').click();let n=s.step();equal(n.player.inventory.matches,11);tool(s,'molotov').click();n=s.step();equal(n.player.inventory.molotovs,3);equal(n.player.tool,'molotov');}finally{s.close();}
});
await check('Real simulation: barrel toggle pours while moving and stops without cancelling movement',()=>{
  const s=real();try{tool(s,'jerry-can').click();let n=s.step();ok(n.player.pouring,'Pour did not start');downStick(s);const gas=n.player.inventory.gas;n=s.step(10);ok(n.player.moving&&n.player.inventory.gas<gas,'No moving trail');tool(s,'jerry-can').click();n=s.step();ok(!n.player.pouring&&n.player.moving,'Stop cancelled movement');}finally{s.close();}
});
await check('Legacy simulation waits for authoritative torch fields; flamethrower still holds and releases',()=>{
  const s=real();try{
    ok(!s.simulation.snapshot().player.torch,'Update this legacy compatibility check when coder fields land');
    ok(tool(s,'torch').disabled,'Missing torch schema enabled use');const n=s.commands.length;tool(s,'torch').click();equal(s.commands.length,n);
    const before=s.simulation.snapshot().player.inventory.flamethrowerFuel;pointer(tool(s,'flamethrower'),'pointerdown',22);let next=s.step(8);
    ok(next.player.usingTool&&next.player.inventory.flamethrowerFuel<before,'Flamethrower hold failed');pointer(window,'pointerup',22);next=s.step();ok(!next.player.usingTool,'Stale flamer hold');
  }finally{s.close();}
});
await check('Real simulation: authoritative effect updates preserve pour and never emit UI drug commands',()=>{
  const s=real();try{tool(s,'jerry-can').click();s.step();downStick(s);s.simulation.dispatch({type:'drug',drug:'powder'});s.simulation.dispatch({type:'drug',drug:'inversion'});s.simulation.dispatch({type:'drug',drug:'healing'});const n=s.step();ok(n.player.pouring&&n.effects.powder.active&&n.effects.inversion.active,'Effect update lost pour');equal(n.player.hp,95);ok(!s.commands.some(c=>c.type==='drug'),'UI consumed automatically a second time');ok(!s.find('[data-effect="powder"]').hidden,'No effect feedback');}finally{s.close();}
});
await check('Torch phases show authoritative seconds and spent or missing schema disables use',s=>{
  for(const [name,label,state] of [['torch-unlit','LIGHT','UNLIT'],['torch-lit','IGNITE','LIT'],['torch-spent','SPENT','SPENT'],['torch-unknown','WAIT','WAIT']]){
    s.ui.update(deepFreeze(fixture(name)));equal(s.find('[data-tool="torch"] [data-action-label]').textContent,label);equal(s.find('[data-loadout-state]').textContent,state);
    equal(s.find('[data-tool="torch"]').disabled,['torch-spent','torch-unknown'].includes(name));equal(s.find('[data-tool="torch"]').disabled,['torch-spent','torch-unknown'].includes(name));
    ok(!s.find('[data-selected-stock]').textContent.includes('fuel'),'Competing fuel unit');
  }
});
await check('Lighting during a held press does not emit an extra Ignite edge or timer update',s=>{
  s.ui.update(fixture('torch-unlit'));pointer(s.find('[data-tool="torch"]'),'pointerdown',22);equal(s.find('[data-tool="torch"]').dataset.lit,'false');
  const lit=fixture('torch-lit');lit.tick=1;s.ui.update(deepFreeze(lit));
  for(let i=0;i<10;i++)s.ui.update(lit);
  equal(s.commands.filter(c=>c.type==='primary'&&c.pressed).length,1);
  equal(s.find('[data-tool="torch"] [data-action-label]').textContent,'IGNITE');equal(s.find('[data-selected-stock]').textContent,'LIT · 26.2s left');
  pointer(window,'pointerup',22);equal(s.commands.at(-1),{type:'primary',pressed:false});
});
await check('Torch countdown, pause and powder come only from supplied snapshots without live spam',s=>{
  s.ui.update(fixture('torch-lit'));const live=s.find('[data-announcement]'),node=live.firstChild;
  const next=fixture('torch-lit');next.player.torch.remainingSeconds=25.9;next.tick=1;s.ui.update(next);
  equal(s.find('[data-selected-stock]').textContent,'LIT · 25.9s left');ok(live.firstChild===node,'Countdown rewrote live region');
  next.effects.powder={active:true,remaining:6.4};next.clocks.worldScale=.35;s.ui.update(next);
  equal(s.find('[data-selected-stock]').textContent,'LIT · 25.9s left');
  next.paused=true;s.ui.update(next);equal(s.find('[data-selected-stock]').textContent,'LIT · 25.9s left');
  ok(s.find('[data-tool="torch"]').disabled,'Paused torch active');
});
await check('Switching away and back preserves aged torch state without relighting',s=>{
  const next=fixture('torch-lit');s.ui.update(next);next.player.tool='matches';next.player.torch.remainingSeconds=20;s.ui.update(next);
  equal(s.find('[data-tool="torch"] [data-stock]').textContent,'20.0s');next.player.tool='torch';s.ui.update(next);
  equal(s.find('[data-tool="torch"] [data-action-label]').textContent,'IGNITE');equal(s.find('[data-selected-stock]').textContent,'LIT · 20.0s left');equal(s.commands,[]);
});
await check('Spent transition releases held input and repeats cannot relight it',s=>{
  s.ui.update(fixture('torch-lit'));const p=s.find('[data-tool="torch"]');p.focus();key(p,'keydown','Space');
  s.ui.update(fixture('torch-spent'));equal(s.commands.at(-1),{type:'primary',pressed:false});const n=s.commands.length;
  key(p,'keydown','Space',{repeat:true});key(p,'keyup','Space');p.click();equal(s.commands.length,n);equal(p.dataset.lit,'false');
});
await check('Action events update visible/accessibility feedback once, without replaying countdown history',s=>{
  const noFuel=fixture('matches-no-fuel');s.ui.update(noFuel);equal(s.find('[data-tool-feedback]').textContent,'No burnable fuel on this tile.');
  const live=s.find('[data-announcement]'),node=live.firstChild;s.ui.update(noFuel);ok(live.firstChild===node,'Event replay announced twice');
  const blocked=fixture();blocked.tick=2;blocked.events=[...noFuel.events,{id:2,type:'tool-rejected',tool:'matches',reason:'blocked'}];s.ui.update(blocked);
  equal(s.find('[data-tool-feedback]').textContent,'Target blocked. Aim at reachable ground.');ok(live.textContent.includes('Target blocked'),'Feedback not accessible');
  const refs=s.find('[data-tool="matches"]').getAttribute('aria-describedby').split(' ');for(const id of refs)ok(s.root.querySelector('[id="'+id+'"]'),'Description escaped mount');
  blocked.events.push({id:3,type:'reset'});s.ui.update(blocked);ok(s.find('[data-tool-feedback]').hidden,'Reset left feedback');
});
await check('Initial old events are not announced and tool feedback stays with its tool',s=>{
  const otherRoot=document.createElement('div');host.append(otherRoot);const ui=mountUI({root:otherRoot,onCommand:()=>{}});
  try{ui.update(fixture('matches-no-fuel'));ok(otherRoot.querySelector('[data-tool-feedback]').hidden,'Old history replayed');}finally{ui.dispose();otherRoot.remove();}
  s.ui.update(fixture('torch-blocked'));ok(!s.find('[data-tool-feedback]').hidden,'Torch feedback missing');const next=fixture('torch-blocked');next.player.tool='matches';s.ui.update(next);ok(s.find('[data-tool-feedback]').hidden,'Torch feedback shown as match result');
});
await check('Torch discrete keypress and cancellation preserve the existing raw joystick contract',s=>{
  s.ui.update(fixture('torch-lit'));downStick(s,11);const p=s.find('[data-tool="torch"]');p.focus();key(p,'keydown','Enter');key(p,'keydown','Enter',{repeat:true});
  equal(s.commands.filter(c=>c.type==='primary'&&c.pressed).length,1);key(p,'keyup','Enter');
  ok(!s.commands.some(c=>c.type==='move'&&c.x===0&&c.y===0),'Ignite stopped movement');window.dispatchEvent(new Event('blur'));equal(s.commands.at(-1),{type:'cancel-input'});
});

for(const r of results){const li=document.createElement('li');li.dataset.status=r.status;li.textContent=(r.status==='pass'?'PASS ':'FAIL ')+r.name+(r.message?' — '+r.message:'');document.querySelector('#checks').append(li);}
document.querySelector('#summary').textContent=results.filter(r=>r.status==='pass').length+' / '+results.length+' passed';
document.body.dataset.testStatus=results.every(r=>r.status==='pass')?'passed':'failed';document.body.dataset.testResults=JSON.stringify(results);
