import {mountUI,mountMainMenu,mountTitleScreen} from '../../src/ui/index.js';
import {fixture,createFakeSnapshotAdapter,PLACE_FIXTURES,CHARACTER_FIXTURES,explorationFixture} from '../../workbenches/ui/fixtures.js';
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

function makeMenu(places=PLACE_FIXTURES,options={}){
  const root=document.createElement('div');root.style.cssText='position:absolute;inset:0';host.append(root);
  const selections=[],ui=mountMainMenu({root,places,onSelect:id=>selections.push(id),...options});
  return{root,ui,selections,find:s=>root.querySelector(s),close:()=>{ui.dispose();root.remove();}};
}
function makeTitle(){
  const root=document.createElement('div');root.style.cssText='position:absolute;inset:0';host.append(root);
  const starts=[],ui=mountTitleScreen({root,onStart:()=>starts.push('start')});
  return{root,ui,starts,find:s=>root.querySelector(s),close:()=>{ui.dispose();root.remove();}};
}
await check('Title screen creates no graphics context and has a contained native Play action',()=>{
  const canvas=HTMLCanvasElement.prototype.getContext;let calls=0,title;
  HTMLCanvasElement.prototype.getContext=function(){calls++;throw Error('Title requested a graphics context');};
  try{
    title=makeTitle();equal(calls,0);equal(title.root.querySelectorAll('canvas').length,0);equal(title.find('h1').textContent,'TINDERBOX');
    title.ui.focusStart();equal(document.activeElement,title.find('[data-title-start]'));
    const r=title.find('[data-title-start]').getBoundingClientRect(),frame=title.root.getBoundingClientRect();
    ok(r.width>=44&&r.height>=44&&r.left>=frame.left&&r.right<=frame.right&&r.top>=frame.top&&r.bottom<=frame.bottom,'Title Play is clipped or too small');
    ok(title.find('.tb-title-screen').scrollWidth<=title.find('.tb-title-screen').clientWidth+1,'Title has horizontal overflow');
  }finally{title?.close();HTMLCanvasElement.prototype.getContext=canvas;}
});
await check('Title Play emits one start intent, suppresses native repeats and is inert after disposal',()=>{
  const title=makeTitle();try{
    const button=title.find('[data-title-start]'),repeat=new KeyboardEvent('keydown',{code:'Enter',repeat:true,bubbles:true,cancelable:true});
    button.dispatchEvent(repeat);ok(repeat.defaultPrevented,'Held Play not suppressed');
    button.click();button.click();equal(title.starts,['start']);title.ui.dispose();button.click();equal(title.starts,['start']);ok(!title.ui.focusStart(),'Disposed title stole focus');
  }finally{title.close();}
});
await check('Title mounts scope their engraving clips, remove listeners and preserve caller siblings',()=>{
  const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener,active=[];let title;
  EventTarget.prototype.addEventListener=function(type,fn,opts){active.push({target:this,type,fn});return add.call(this,type,fn,opts);};
  EventTarget.prototype.removeEventListener=function(type,fn,opts){const i=active.findIndex(x=>x.target===this&&x.type===type&&x.fn===fn);if(i>=0)active.splice(i,1);return remove.call(this,type,fn,opts);};
  try{
    title=makeTitle();const other=makeTitle();try{
      const ids=[...document.querySelectorAll('.tb-title-screen [id]')].map(e=>e.id);equal(ids.length,new Set(ids).size);
    }finally{other.close();}
    const sibling=document.createElement('p');title.root.append(sibling);title.ui.dispose();ok(sibling.isConnected,'Title removed caller content');equal(active.length,0,'Title listener leak');
  }finally{title?.close();EventTarget.prototype.addEventListener=add;EventTarget.prototype.removeEventListener=remove;}
});
await check('Places offers optional repeat-safe title return and locks it while loading',()=>{
  const old=makeMenu();try{ok(old.find('[data-back-to-title]').hidden,'Old caller gained title navigation');}finally{old.close();}
  const requests=[],menu=makeMenu(PLACE_FIXTURES,{onBackToTitle:()=>requests.push('title')});try{
    const button=menu.find('[data-back-to-title]');ok(!button.hidden,'Title return omitted');
    menu.ui.update({loadingId:'new-york'});ok(button.disabled,'Loading can return behind the application');button.click();equal(requests,[]);
    menu.ui.update({loadingId:null});button.click();equal(requests,['title']);menu.ui.dispose();button.click();equal(requests,['title']);
  }finally{menu.close();}
});
function makeExplore(name='entrance',withExit=true){
  const root=document.createElement('div');root.style.cssText='position:absolute;inset:0';host.append(root);
  const commands=[],exits=[],ui=mountUI({root,mode:'explore',placeTitle:'New York State Building',onCommand:c=>commands.push(c),...(withExit?{onExitToMenu:()=>exits.push(commands.slice())}:{})});
  ui.update(explorationFixture(name));return{root,ui,commands,exits,find:s=>root.querySelector(s),close:()=>{ui.dispose();root.remove();}};
}
await check('Main menu renders all catalogue metadata and real preview URLs without a canvas',()=>{
  const canvas=HTMLCanvasElement.prototype.getContext;let calls=0,menu;
  HTMLCanvasElement.prototype.getContext=function(){calls++;throw Error('Menu requested a graphics context');};
  try{
    menu=makeMenu();equal([...menu.root.querySelectorAll('[data-select-place]')].map(b=>b.dataset.selectPlace),PLACE_FIXTURES.map(p=>p.id));
    equal([...menu.root.querySelectorAll('h2')].filter(h=>!h.closest('[hidden]')).map(h=>h.textContent),PLACE_FIXTURES.map(p=>p.title));
    equal(menu.root.querySelectorAll('img').length,3);equal(menu.root.querySelectorAll('canvas').length,0);equal(calls,0);
    for(const place of PLACE_FIXTURES)ok(menu.root.textContent.includes(place.description),'Catalogue description omitted');
  }finally{menu?.close();HTMLCanvasElement.prototype.getContext=canvas;}
});
await check('Main menu requests an ID; loading remains application-owned and blocks duplicate selection',()=>{
  const menu=makeMenu();try{
    const button=menu.find('[data-select-place="new-york"]');button.click();equal(menu.selections,['new-york']);ok(!button.disabled,'Invented a loading state');
    menu.ui.update({loadingId:'new-york',error:null});ok([...menu.root.querySelectorAll('[data-select-place]')].every(b=>b.disabled),'Busy selection enabled');
    const live=menu.find('[data-place-status]'),node=live.firstChild;menu.ui.update({loadingId:'new-york',error:null});ok(live.firstChild===node,'Repeated loading announcement');
    button.click();equal(menu.selections,['new-york']);ok(live.textContent.includes('New York State Building'),'Loading lacks destination');
    menu.ui.update({loadingId:null,error:null});ok(!button.disabled,'Idle menu stuck busy');
  }finally{menu.close();}
});
await check('Main-menu error, retry and back recovery keep the catalogue usable and focus the failed place',()=>{
  const menu=makeMenu();try{
    menu.find('[data-select-place="administration"]').click();menu.ui.update({loadingId:'administration'});menu.ui.update({loadingId:null,error:'Graphics could not be opened on this device.'});
    ok(!menu.find('[data-place-error]').hidden,'Error hidden');equal(document.activeElement,menu.find('.tb-place-error h2'));
    equal(menu.find('[data-place-error-message]').textContent,'Graphics could not be opened on this device.');
    menu.find('[data-place-retry]').click();equal(menu.selections,['administration','administration']);
    menu.ui.update({loadingId:'administration',error:null});menu.ui.update({loadingId:null,error:'Graphics could not be opened on this device.'});
    menu.find('[data-place-back]').click();ok(menu.find('[data-place-error]').hidden,'Back did not return to places');equal(document.activeElement,menu.find('[data-select-place="administration"]'));
    menu.find('[data-select-place="horticulture"]').click();equal(menu.selections.at(-1),'horticulture');
  }finally{menu.close();}
});
await check('Main-menu focus restoration and repeated error updates do not steal current focus',()=>{
  const menu=makeMenu();try{
    menu.ui.update({loadingId:null,error:{placeId:'new-york',message:'Please try again.'}});
    const retry=menu.find('[data-place-retry]');retry.focus();menu.ui.update({loadingId:null,error:{placeId:'new-york',message:'Please try again.'}});equal(document.activeElement,retry);
    menu.ui.update({loadingId:null,error:null});ok(menu.ui.focusPlace('horticulture'),'Focus not restored');equal(document.activeElement,menu.find('[data-select-place="horticulture"]'));
    menu.ui.focusPlace('missing');equal(document.activeElement,menu.find('[data-select-place="catalogue-street"]'));
  }finally{menu.close();}
});
await check('A failed below-fold visit scrolls the recovery heading into view',()=>{
  const menu=makeMenu();try{
    menu.ui.focusPlace('horticulture');menu.ui.update({loadingId:null,error:{placeId:'horticulture',message:'Please try again.'}});
    const frame=menu.root.getBoundingClientRect(),error=menu.find('.tb-place-error h2').getBoundingClientRect();
    ok(error.top>=frame.top-1&&error.bottom<=frame.bottom+1,'Recovery stayed outside the menu viewport');
  }finally{menu.close();}
});
await check('Main menu escapes catalogue/error strings and handles empty or unavailable previews',()=>{
  const menu=makeMenu([{id:'safe',title:'<img src=x>',description:'<b>Grounds and halls</b>',previewUrl:PLACE_FIXTURES[1].previewUrl}]);try{
    equal(menu.find('.tb-place-card h2').textContent,'<img src=x>');equal(menu.root.querySelectorAll('b').length,0);
    menu.find('img').dispatchEvent(new Event('error'));ok(menu.find('img').hidden,'Broken preview still visible');ok(menu.find('[data-select-place]').isConnected,'Missing preview disabled visit');
    menu.ui.update({error:{placeId:'safe',message:'<script>unsafe</script>'}});equal(menu.root.querySelectorAll('script').length,0);
    const empty=makeMenu([]);try{ok(!empty.find('[data-place-empty]').hidden,'No empty-state guidance');}finally{empty.close();}
  }finally{menu.close();}
});
await check('Main menu scopes descriptions/etching clips and removes all listeners and stale callbacks',()=>{
  const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener,active=[];let menu;
  EventTarget.prototype.addEventListener=function(type,fn,opts){active.push({target:this,type,fn});return add.call(this,type,fn,opts);};
  EventTarget.prototype.removeEventListener=function(type,fn,opts){const i=active.findIndex(x=>x.target===this&&x.type===type&&x.fn===fn);if(i>=0)active.splice(i,1);return remove.call(this,type,fn,opts);};
  try{
    menu=makeMenu();const other=makeMenu();try{
      const ids=[...document.querySelectorAll('.tb-ui [id]')].map(e=>e.id);equal(new Set(ids).size,ids.length,'Shared menu IDs');
      for(const b of menu.root.querySelectorAll('[aria-describedby]'))for(const id of b.getAttribute('aria-describedby').split(' '))ok(menu.root.querySelector('[id="'+id+'"]'),'Description outside mount');
    }finally{other.close();}
    const stale=menu.find('[data-select-place="new-york"]'),sibling=document.createElement('canvas');menu.root.append(sibling);
    menu.ui.dispose();stale.click();equal(menu.selections,[]);ok(sibling.isConnected,'Caller sibling removed');ok(!menu.ui.focusPlace('new-york'),'Disposed focus succeeded');menu.ui.update({error:'stale'});equal(active.length,0,'Menu listener leak');
  }finally{menu?.close();EventTarget.prototype.addEventListener=add;EventTarget.prototype.removeEventListener=remove;}
});
await check('Main menu is horizontally contained with native 44px actions and a scrollable phone sheet',()=>{
  const menu=makeMenu();try{
    const frame=menu.root.getBoundingClientRect(),shell=menu.find('.tb-main-menu');
    ok(shell.scrollWidth<=shell.clientWidth+1,'Menu has horizontal overflow');
    for(const b of menu.root.querySelectorAll('[data-select-place]')){const r=b.getBoundingClientRect();ok(r.width>=44&&r.height>=44,'Small visit action');ok(r.left>=frame.left-.5&&r.right<=frame.right+.5,'Visit action crosses viewport');}
    menu.ui.focusPlace('horticulture');const last=menu.find('[data-select-place="horticulture"]').getBoundingClientRect();ok(last.bottom<=menu.root.getBoundingClientRect().bottom+1&&last.top>=menu.root.getBoundingClientRect().top-1,'Restored place not scrolled into view');
  }finally{menu.close();}
});
await check('Animal choice uses catalogue text and application-owned selection without optimistic state',()=>{
  const requests=[],menu=makeMenu(PLACE_FIXTURES,{characters:CHARACTER_FIXTURES,selectedCharacterId:'goat',onSelectCharacter:id=>requests.push(id)});
  try{
    equal([...menu.root.querySelectorAll('[data-select-character]')].map(b=>b.textContent.includes('Selected')), [true,false,false]);
    const horse=menu.find('[data-select-character="horse"]');horse.click();equal(requests,['horse']);
    equal(horse.getAttribute('aria-pressed'),'false','Invented selection before app acknowledgement');
    menu.ui.update({selectedCharacterId:'horse'});equal(horse.getAttribute('aria-pressed'),'true');
    ok(menu.find('[data-character-description]').textContent.includes('horse'),'Selected description missing');
    menu.ui.update({loadingId:'new-york'});ok([...menu.root.querySelectorAll('[data-select-character]')].every(b=>b.disabled),'Loading can change animal');
    menu.find('[data-select-character="bear"]').click();equal(requests,['horse']);ok(menu.find('[data-place-status]').textContent.includes('as Horse'),'Loading animal ambiguous');
    menu.ui.update({loadingId:null});equal(horse.getAttribute('aria-pressed'),'true','Selection lost during app updates');
  }finally{menu.close();}
});
await check('Optional animal selection preserves old menus, scoped descriptions, touch targets and safe text',()=>{
  const old=makeMenu();try{ok(old.find('[data-character-choice]').hidden,'Old caller grew a selector');}finally{old.close();}
  const menu=makeMenu(PLACE_FIXTURES,{characters:[{id:'safe',title:'<b>Goat</b>',description:'<img>safe'}],selectedCharacterId:'safe'});
  try{
    equal(menu.root.querySelectorAll('b').length,0);equal(menu.root.querySelectorAll('img').length,3);
    const button=menu.find('[data-select-character]');ok(button.disabled,'Missing callback advertises selection');
    ok(menu.root.querySelector('[id="'+button.getAttribute('aria-describedby')+'"]'),'Unscoped animal description');
    const r=button.getBoundingClientRect();ok(r.width>=44&&r.height>=44,'Small animal target');
    menu.ui.update({selectedCharacterId:'missing'});equal(button.getAttribute('aria-pressed'),'false','Unknown app selection guessed an animal');
  }finally{menu.close();}
});
await check('Animal requests stop after disposal and repeated activation remains a native button edge',()=>{
  const requests=[],menu=makeMenu(PLACE_FIXTURES,{characters:CHARACTER_FIXTURES,selectedCharacterId:'goat',onSelectCharacter:id=>requests.push(id)});
  try{
    const horse=menu.find('[data-select-character="horse"]');horse.focus();
    const repeat=new KeyboardEvent('keydown',{code:'Enter',repeat:true,bubbles:true,cancelable:true});horse.dispatchEvent(repeat);ok(repeat.defaultPrevented,'Native repeat not suppressed');
    horse.click();equal(requests,['horse']);menu.ui.dispose();horse.click();equal(requests,['horse']);
  }finally{menu.close();}
});
await check('Street snapshots can name a selected animal while retaining the six gameplay controls',()=>{
  const street=make();try{
    const next=fixture('down');next.player.characterId='horse';street.ui.update(next);
    equal(street.find('.tb-health-meter').getAttribute('aria-label'),'Horse health');
    ok(street.find('[data-death]').textContent.startsWith('HORSE DOWN'),'Wrong animal on death notice');
    equal(street.root.querySelectorAll('[data-tool]').length,5);ok(street.find('.tb-map figcaption>span').textContent.includes('Horse'),'Wrong plan legend');
    ok(street.find('[data-map]').getAttribute('aria-label').includes('Horse at'),'Wrong map identity');
  }finally{street.close();}
});
await check('Explore identity, follow control and map use authoritative animal names with a safe fallback',()=>{
  const nav=makeExplore();try{
    equal(nav.find('[data-character-name]').textContent,'Goat');
    const next=explorationFixture('gallery','horse');nav.ui.update(next);
    equal(nav.find('[data-character-name]').textContent,'Horse');equal(nav.find('[data-view="view-follow"]').getAttribute('aria-label'),'Follow the horse');
    ok(nav.find('[data-map]').getAttribute('aria-label').includes('Horse at'),'Map still calls the animal Bear');
    delete next.player.characterId;nav.ui.update(next);ok(nav.find('[data-character-name]').hidden,'Guessed missing identity');
    equal(nav.find('[data-view="view-follow"]').getAttribute('aria-label'),'Follow player');
  }finally{nav.close();}
});
await check('Exploration HUD accepts noncombat snapshots and shows no usable street tools, health or reset',()=>{
  const nav=makeExplore();try{
    equal(nav.root.querySelectorAll('[data-tool],[data-drug]').length,0);ok(nav.find('.tb-health').hidden,'Exploration advertised health');ok(nav.find('[data-reset]').hidden&&nav.find('[data-reset]').disabled,'Exploration advertised scene reset');
    equal(nav.find('.tb-visit-title').textContent,'New York State Building');equal(nav.find('[data-location-label]').textContent,'Entrance hall');
    ok(!nav.find('[data-stick]').disabled,'Missing combat fields disabled movement');ok(nav.find('[data-map]').getAttribute('aria-label').startsWith('Place plan.'),'Wrong plan scope');
  }finally{nav.close();}
});
await check('Human floor/location transitions announce once; coordinates, elevation and native indexes stay quiet',()=>{
  const nav=makeExplore();try{
    const live=nav.find('[data-announcement]'),node=live.firstChild,next=explorationFixture();
    next.player.x+=1;next.player.y+=2;next.player.elevation+=.2;next.player.level=36;nav.ui.update(next);
    ok(live.firstChild===node,'Movement/tread metadata rewrote status');equal(nav.find('.tb-ui').dataset.nativeLevel,'36');ok(!live.textContent.includes('36'),'Invented occupied storey');
    next.player.locationLabel='Upper gallery';next.player.level=3;nav.ui.update(next);ok(live.textContent.includes('Upper gallery'),'Floor transition silent');
    const galleryNode=live.firstChild;for(let i=0;i<8;i++){next.player.elevation+=.1;next.player.x+=.1;nav.ui.update(next);}ok(live.firstChild===galleryNode,'Gallery movement spammed status');
  }finally{nav.close();}
});
await check('Exploration camera requests preserve the raw held joystick and do not choose scene state',()=>{
  const nav=makeExplore();try{
    downStick(nav,11);const n=nav.commands.length;nav.find('[data-view="view-overview"]').click();nav.find('[data-view="view-follow"]').click();
    equal(nav.commands.slice(n),[{type:'view-overview'},{type:'view-follow'}]);ok(!nav.commands.some(c=>c.type==='aim'||c.type==='select-tool'||c.type==='primary'),'Navigation emitted combat/aim');
    pointer(window,'pointerup',11);equal(nav.commands.at(-1),{type:'move',x:0,y:0});
  }finally{nav.close();}
});
await check('Contextual interaction, Space and E send one edge without changing the location or movement',()=>{
  const nav=makeExplore('door');try{
    const stick=nav.find('[data-stick]');stick.focus();key(stick,'keydown','KeyW');key(stick,'keydown','KeyE');key(stick,'keydown','KeyE',{repeat:true});key(stick,'keyup','KeyE');
    key(stick,'keydown','Space');key(stick,'keydown','Space',{repeat:true});key(stick,'keyup','Space');nav.find('[data-interact]').click();
    equal(nav.commands.filter(c=>c.type==='interact').length,3);ok(!nav.commands.some(c=>['primary','select-tool','drug'].includes(c.type)),'Interaction leaked to gameplay');
    equal(nav.find('[data-location-label]').textContent,'Entrance hall');ok(!nav.commands.some(c=>c.type==='move'&&c.x===0&&c.y===0),'Interaction stopped walking');
    const none=explorationFixture();nav.ui.update(none);ok(nav.find('[data-interact]').disabled,'Absent interaction enabled');key(stick,'keydown','KeyE');equal(nav.commands.filter(c=>c.type==='interact').length,3);
  }finally{nav.close();}
});
await check('Exploration ignores combat number keys and preserves repeat-safe contextual button activation',()=>{
  const nav=makeExplore('door');try{
    const action=nav.find('[data-interact]');action.focus();key(action,'keydown','Enter');key(action,'keydown','Enter',{repeat:true});key(action,'keyup','Enter');
    equal(nav.commands,[{type:'interact'}]);for(const code of ['Digit1','Digit2','Digit3','Digit4','Digit5','KeyQ','KeyR'])key(action,'keydown',code);
    equal(nav.commands,[{type:'interact'}]);
  }finally{nav.close();}
});
await check('Return requests cancel movement first; pause-menu return does not reset or resume the visit',()=>{
  const nav=makeExplore();try{
    downStick(nav,11);nav.find('.tb-console [data-exit-to-menu]').click();equal(nav.exits.length,1);equal(nav.exits[0].slice(-2),[{type:'move',x:0,y:0},{type:'cancel-input'}]);
    nav.find('[data-pause]').click();const paused=explorationFixture();paused.paused=true;nav.ui.update(paused);
    nav.find('[data-pause-panel] [data-exit-to-menu]').click();equal(nav.exits.length,2);ok(!nav.commands.some(c=>c.type==='reset'||c.type==='pause'&&c.paused===false),'Return changed scene state');
    const stale=nav.find('.tb-console [data-exit-to-menu]');nav.ui.dispose();stale.click();equal(nav.exits.length,2);
  }finally{nav.close();}
});
await check('Optional return/navigation arguments preserve old callers and exploration targets fit intended viewports',()=>{
  const nav=makeExplore('door',false);try{
    ok(nav.find('.tb-console [data-exit-to-menu]').disabled,'Missing return callback advertised an action');
    const frame=nav.root.getBoundingClientRect();
    for(const b of nav.root.querySelectorAll('.tb-console button')){const r=b.getBoundingClientRect();ok(r.width>=44&&r.height>=44,'Small nav target');ok(r.left>=frame.left-.5&&r.right<=frame.right+.5&&r.top>=frame.top-.5&&r.bottom<=frame.bottom+.5,'Clipped navigation');}
    const stick=nav.find('[data-stick]');stick.focus();key(stick,'keydown','KeyW');window.dispatchEvent(new Event('blur'));equal(nav.commands.at(-1),{type:'cancel-input'});
  }finally{nav.close();}
});


for(const r of results){const li=document.createElement('li');li.dataset.status=r.status;li.textContent=(r.status==='pass'?'PASS ':'FAIL ')+r.name+(r.message?' — '+r.message:'');document.querySelector('#checks').append(li);}
document.querySelector('#summary').textContent=results.filter(r=>r.status==='pass').length+' / '+results.length+' passed';
document.body.dataset.testStatus=results.every(r=>r.status==='pass')?'passed':'failed';document.body.dataset.testResults=JSON.stringify(results);
