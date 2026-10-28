import {mountUI} from '../../src/ui/index.js';
import {fixture} from '../../workbenches/ui/fixtures.js';
const host = document.querySelector('#fixture-root'), results = [];
const equal = (a,b,message='Values differ') => { if(JSON.stringify(a)!==JSON.stringify(b)) throw Error(message + ': ' + JSON.stringify(a) + ' != ' + JSON.stringify(b)); };
const ok = (condition,message) => { if(!condition) throw Error(message); };
function deepFreeze(value) { Object.freeze(value); for(const item of Object.values(value)) if(item && typeof item==='object') deepFreeze(item); return value; }
function make(name='ready') {
  const root=document.createElement('div'); root.style.cssText='position:absolute;inset:0'; host.append(root);
  const commands=[]; const ui=mountUI({root,onCommand:command=>commands.push(command)});
  ui.update(deepFreeze(fixture(name)));
  return {root,commands,ui,find:selector=>root.querySelector(selector),close:()=>{ui.dispose();root.remove();}};
}
const key=(target,type,code,extra={})=>target.dispatchEvent(new KeyboardEvent(type,{code,key:code==='Space'?' ':code,bubbles:true,cancelable:true,...extra}));
const pointer=(target,type,id,x=0,y=0)=>target.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y,bubbles:true,cancelable:true}));
function downStick(subject,id=11) {
  const stick=subject.find('[data-stick]'), rect=stick.getBoundingClientRect();
  pointer(stick,'pointerdown',id,rect.right-8,rect.top+8);
}
async function check(name,run) {
  let subject;
  try { subject=make(); await run(subject); results.push({name,status:'pass'}); }
  catch(error) { results.push({name,status:'fail',message:error.stack||error.message}); }
  finally { subject?.close(); }
}
await check('Five tools and three drugs; selection waits for an authoritative snapshot',s=>{
  equal(s.root.querySelectorAll('[data-tool]').length,5); equal(s.root.querySelectorAll('[data-drug]').length,3);
  s.find('[data-tool="torch"]').click();
  equal(s.commands.at(-1),{type:'select-tool',tool:'torch'});
  equal(s.find('[data-tool="matches"]').getAttribute('aria-pressed'),'true');
  const next=fixture();next.player.tool='torch';s.ui.update(deepFreeze(next));
  equal(s.find('[data-tool="torch"]').getAttribute('aria-pressed'),'true');
});
await check('Health, inventory, full healing, and empty primary come from snapshots',s=>{
  const value=fixture('empty');value.player.hp=100;s.ui.update(deepFreeze(value));
  equal(s.find('.tb-health-meter').getAttribute('aria-valuenow'),'100');
  ok(s.find('[data-primary]').disabled,'Empty selected tool must block primary');
  equal(s.find('[data-loadout-state]').textContent,'EMPTY');
  ok(s.find('[data-drug="healing"]').disabled,'Empty healing must be disabled');
  equal(s.find('[data-tool="matches"] [data-stock]').textContent,'EMPTY');
});
await check('Pour/Stop and remaining times change only on snapshot updates',s=>{
  const next=fixture();next.player.tool='jerry-can';s.ui.update(deepFreeze(next));
  s.find('[data-primary]').click();
  equal(s.commands.slice(-2),[{type:'primary',pressed:true},{type:'primary',pressed:false}]);
  equal(s.find('[data-primary-label]').textContent,'POUR');
  const pouring=fixture('pouring');s.ui.update(deepFreeze(pouring));
  equal(s.find('[data-primary-label]').textContent,'STOP');
  equal(s.find('[data-effect="powder"] [data-time]').textContent,'6.4s');
  const zero=fixture('pouring');zero.player.inventory.gas=0;s.ui.update(deepFreeze(zero));
  ok(!s.find('[data-primary]').disabled,'Stop must remain available when pouring at zero stock');
});
await check('Inversion leaves raw NE joystick positive on both axes, with no aim command',s=>{
  s.ui.update(deepFreeze(fixture('reversed')));
  const stick=s.find('[data-stick]');stick.focus();
  key(stick,'keydown','KeyW');key(stick,'keydown','KeyD');
  const command=s.commands.at(-1);
  ok(command.type==='move' && command.x>0 && command.y>0,'UI reversed raw movement');
  ok(Math.abs(Math.hypot(command.x,command.y)-1)<1e-12,'Diagonal must be normalized');
  ok(!s.commands.some(item=>item.type==='aim'),'Joystick must not affect aim');
  key(stick,'keyup','KeyW');key(stick,'keyup','KeyD');
  equal(s.commands.at(-1),{type:'move',x:0,y:0});
});
await check('Independent pointers preserve movement during primary and drug use',s=>{
  const next=fixture();next.player.tool='jerry-can';s.ui.update(deepFreeze(next));
  downStick(s,11);
  const movement=s.commands.at(-1);ok(movement.x>0&&movement.y>0,'Stick did not start');
  pointer(s.find('[data-primary]'),'pointerdown',22);
  pointer(window,'pointerup',22);
  s.find('[data-drug="powder"]').click();s.find('[data-drug="healing"]').click();s.find('[data-drug="inversion"]').click();
  ok(!s.commands.some(command=>command.type==='cancel-input'||command.type==='move'&&command.x===0&&command.y===0),'Actions cancelled movement');
  equal(s.commands.filter(command=>command.type==='drug').map(command=>command.drug),['powder','healing','inversion']);
  pointer(window,'pointerup',11);
  equal(s.commands.at(-1),{type:'move',x:0,y:0});
});
await check('Space and Enter press edges ignore key-repeat and release held tools',s=>{
  const next=fixture();next.player.tool='torch';s.ui.update(deepFreeze(next));
  const primary=s.find('[data-primary]');primary.focus();
  key(primary,'keydown','Space');key(primary,'keydown','Space',{repeat:true});key(primary,'keydown','Space',{repeat:true});
  equal(s.commands,[{type:'primary',pressed:true}]);
  key(primary,'keyup','Space');equal(s.commands.at(-1),{type:'primary',pressed:false});
  key(primary,'keydown','Enter');key(primary,'keyup','Enter');
  equal(s.commands.slice(-2),[{type:'primary',pressed:true},{type:'primary',pressed:false}]);
});
await check('Tool/drug keyboard shortcuts preserve held movement and do not repeat drugs',s=>{
  const stick=s.find('[data-stick]');stick.focus();key(stick,'keydown','KeyW');
  key(stick,'keydown','Digit2');key(stick,'keydown','KeyQ');key(stick,'keydown','KeyQ',{repeat:true});key(stick,'keydown','KeyR');
  equal(s.commands.filter(command=>command.type==='drug').map(command=>command.drug),['powder','inversion']);
  ok(!s.commands.some(command=>command.type==='move'&&command.y===0),'Shortcut cleared movement');
  equal(s.commands.find(command=>command.type==='select-tool'),{type:'select-tool',tool:'jerry-can'});
  key(stick,'keyup','KeyW');
});
await check('Pointer cancellation and lost capture neutralize movement and trigger',s=>{
  downStick(s);pointer(s.find('[data-primary]'),'pointerdown',22);
  pointer(window,'pointercancel',11);
  ok(s.commands.some(command=>command.type==='primary'&&!command.pressed),'Held trigger was not released');
  equal(s.commands.at(-1),{type:'cancel-input'});
  downStick(s,33);pointer(s.find('[data-stick]'),'lostpointercapture',33);
  equal(s.commands.at(-1),{type:'cancel-input'});
});
await check('Window blur clears keys, trigger and pour without stale input on refocus',s=>{
  const stick=s.find('[data-stick]');stick.focus();key(stick,'keydown','KeyW');key(stick,'keydown','Space');
  window.dispatchEvent(new Event('blur'));
  equal(s.commands.at(-1),{type:'cancel-input'});
  ok(s.commands.some(command=>command.type==='move'&&command.x===0&&command.y===0),'Movement did not neutralize');
  const count=s.commands.length;key(stick,'keyup','KeyW');key(stick,'keyup','Space');equal(s.commands.length,count);
});
await check('Paused/dead snapshots clear held input and gate gameplay controls',s=>{
  downStick(s);s.ui.update(deepFreeze(fixture('paused')));
  ok(s.find('[data-stick]').disabled,'Paused stick still enabled');
  equal(s.find('[data-menu]').hidden,false);equal(s.commands.at(-1),{type:'cancel-input'});
  s.ui.update(deepFreeze(fixture('down')));
  ok(s.find('[data-primary]').disabled,'Dead primary still enabled');
  ok(!s.find('[data-death]').hidden,'Death feedback missing');
});
await check('Menu pause/resume stays authoritative; reset emits the contract command',s=>{
  s.find('[data-pause]').click();
  equal(s.commands.at(-1),{type:'pause',paused:true});
  equal(s.find('[data-menu-title]').textContent,'Pausing…');
  s.ui.update(deepFreeze(fixture('paused')));
  s.find('[data-resume]').click();equal(s.commands.at(-1),{type:'pause',paused:false});
  ok(!s.find('[data-menu]').hidden,'Menu closed before authoritative resume');
  s.ui.update(deepFreeze(fixture()));ok(s.find('[data-menu]').hidden,'Resume snapshot did not close menu');
  s.find('[data-pause]').click();s.find('[data-reset]').click();equal(s.commands.at(-1),{type:'reset'});
});
await check('Options trap focus including checkboxes; Escape returns without gameplay',s=>{
  s.find('[data-pause]').click();s.ui.update(deepFreeze(fixture('paused')));s.find('[data-options]').click();
  const first=s.find('[data-reduce-motion]'),last=s.find('[data-back]');
  equal(document.activeElement===first,true);
  key(first,'keydown','Tab',{shiftKey:true});ok(document.activeElement===last,'Reverse Tab escaped dialog');
  key(last,'keydown','Tab');ok(document.activeElement===first,'Tab escaped dialog');
  const before=s.commands.length;key(first,'keydown','Space');key(first,'keyup','Space');equal(s.commands.length,before);
  key(first,'keydown','Escape');equal(s.find('[data-menu-title]').textContent,'Paused');
});
await check('Native repeated Enter on a drug is suppressed; full-health healing is unavailable',s=>{
  const button=s.find('[data-drug="powder"]');
  const event=new KeyboardEvent('keydown',{code:'Enter',key:'Enter',repeat:true,bubbles:true,cancelable:true});button.dispatchEvent(event);
  ok(event.defaultPrevented,'Native repeat was not suppressed');
  const next=fixture();next.player.hp=100;s.ui.update(deepFreeze(next));
  equal(s.find('[data-drug="healing"] [data-stock]').textContent,'FULL');
  const before=s.commands.length;s.find('[data-drug="healing"]').click();equal(s.commands.length,before);
});
await check('Every UI listener is removed across repeated mount/dispose; stale controls are inert',s=>{
  const originalAdd=EventTarget.prototype.addEventListener,originalRemove=EventTarget.prototype.removeEventListener;
  const active=[];
  EventTarget.prototype.addEventListener=function(type,handler,options){active.push({target:this,type,handler,capture:Boolean(typeof options==='boolean'?options:options?.capture)});return originalAdd.call(this,type,handler,options);};
  EventTarget.prototype.removeEventListener=function(type,handler,options){const capture=Boolean(typeof options==='boolean'?options:options?.capture);const index=active.findIndex(item=>item.target===this&&item.type===type&&item.handler===handler&&item.capture===capture);if(index>=0)active.splice(index,1);return originalRemove.call(this,type,handler,options);};
  let other;
  try {
    for(let i=0;i<5;i++){
      other=make();const old=other.find('[data-drug="powder"]');other.ui.dispose();const count=other.commands.length;
      old.click();window.dispatchEvent(new Event('blur'));other.ui.update(fixture());other.ui.dispose();equal(other.commands.length,count);
      other.root.remove();other=null;
    }
    equal(active.length,0,'Undisposed event listeners');
  } finally {other?.close();EventTarget.prototype.addEventListener=originalAdd;EventTarget.prototype.removeEventListener=originalRemove;}
});
await check('Independent mounts have unique ARIA references and preserve root siblings',s=>{
  const sibling=document.createElement('canvas');s.root.append(sibling);
  const other=make();
  try {
    ok(s.find('[data-stick]').getAttribute('aria-describedby')!==other.find('[data-stick]').getAttribute('aria-describedby'),'Duplicate ARIA ids');
    s.ui.dispose();ok(sibling.isConnected,'Dispose removed caller-owned content');
  } finally {other.close();}
});
await check('Hidden-document cancellation releases held input',s=>{
  const stick=s.find('[data-stick]');stick.focus();key(stick,'keydown','KeyW');key(stick,'keydown','Space');
  const own=Object.getOwnPropertyDescriptor(document,'hidden');
  try {Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));}
  finally {if(own)Object.defineProperty(document,'hidden',own);else delete document.hidden;}
  equal(s.commands.at(-1),{type:'cancel-input'});
  ok(s.commands.some(command=>command.type==='primary'&&!command.pressed),'Hidden page retained primary');
});
await check('Every gameplay touch target is at least 44px and stays inside the scene',s=>{
  const frame=s.root.getBoundingClientRect();
  for(const element of s.root.querySelectorAll('.tb-console button,[data-pause]')){
    const rect=element.getBoundingClientRect();
    ok(rect.width>=44&&rect.height>=44,'Undersized touch target: '+element.getAttribute('aria-label'));
    ok(rect.left>=frame.left-0.5&&rect.right<=frame.right+0.5&&rect.top>=frame.top-0.5&&rect.bottom<=frame.bottom+0.5,'Control outside scene: '+element.getAttribute('aria-label'));
  }
});
await check('Field-canvas focus keeps keyboard control; leaving the scene clears held input',s=>{
  const canvas=document.createElement('canvas');canvas.tabIndex=0;host.append(canvas);
  const input=document.createElement('input');document.body.append(input);
  try {
    canvas.focus();key(canvas,'keydown','KeyW');equal(s.commands.at(-1),{type:'move',x:0,y:1});
    key(canvas,'keydown','Escape');s.ui.update(deepFreeze(fixture('paused')));s.find('[data-resume]').click();s.ui.update(deepFreeze(fixture()));
    ok(document.activeElement===canvas,'Resume did not restore field-canvas focus');
    key(canvas,'keydown','KeyW');equal(s.commands.at(-1),{type:'move',x:0,y:1});
    input.focus();equal(s.commands.at(-1),{type:'cancel-input'});
    const count=s.commands.length;key(input,'keydown','KeyD');equal(s.commands.length,count);
  } finally {canvas.remove();input.remove();}
});

await check('Torch phases and rack show authoritative seconds, spent disables only use',s=>{
  for(const [name,label,state] of [['torch-unlit','LIGHT','UNLIT'],['torch-lit','IGNITE','LIT'],['torch-spent','SPENT','SPENT'],['torch-unknown','LIGHT','WAIT']]){
    s.ui.update(deepFreeze(fixture(name)));equal(s.find('[data-primary-label]').textContent,label);equal(s.find('[data-primary-mode]').textContent,state);
    equal(s.find('[data-primary]').disabled,['torch-spent','torch-unknown'].includes(name));ok(!s.find('[data-tool="torch"]').disabled,'Cannot inspect spent torch');
    ok(!s.find('[data-selected-stock]').textContent.includes('fuel'),'Competing fuel unit');
  }
});
await check('Lighting during a held press does not emit an extra Ignite edge or timer update',s=>{
  s.ui.update(fixture('torch-unlit'));pointer(s.find('[data-primary]'),'pointerdown',22);equal(s.find('[data-primary]').dataset.lit,'false');
  const lit=fixture('torch-lit');lit.tick=1;s.ui.update(deepFreeze(lit));
  for(let i=0;i<10;i++)s.ui.update(lit);
  equal(s.commands.filter(c=>c.type==='primary'&&c.pressed).length,1);
  equal(s.find('[data-primary-label]').textContent,'IGNITE');equal(s.find('[data-selected-stock]').textContent,'LIT · 26.2s left');
  pointer(window,'pointerup',22);equal(s.commands.at(-1),{type:'primary',pressed:false});
});
await check('Torch countdown, pause and powder come only from supplied snapshots without live spam',s=>{
  s.ui.update(fixture('torch-lit'));const live=s.find('[data-announcement]'),node=live.firstChild;
  const next=fixture('torch-lit');next.player.torch.remainingSeconds=25.9;next.tick=1;s.ui.update(next);
  equal(s.find('[data-selected-stock]').textContent,'LIT · 25.9s left');ok(live.firstChild===node,'Countdown rewrote live region');
  next.effects.powder={active:true,remaining:6.4};next.clocks.worldScale=.35;s.ui.update(next);
  equal(s.find('[data-selected-stock]').textContent,'LIT · 25.9s left');
  next.paused=true;s.ui.update(next);equal(s.find('[data-selected-stock]').textContent,'LIT · 25.9s left');
  ok(s.find('[data-primary]').disabled,'Paused torch active');
});
await check('Switching away and back preserves aged torch state without relighting',s=>{
  const next=fixture('torch-lit');s.ui.update(next);next.player.tool='matches';next.player.torch.remainingSeconds=20;s.ui.update(next);
  equal(s.find('[data-tool="torch"] [data-stock]').textContent,'LIT 20.0s');next.player.tool='torch';s.ui.update(next);
  equal(s.find('[data-primary-label]').textContent,'IGNITE');equal(s.find('[data-selected-stock]').textContent,'LIT · 20.0s left');equal(s.commands,[]);
});
await check('Spent transition releases held input and repeats cannot relight it',s=>{
  s.ui.update(fixture('torch-lit'));const p=s.find('[data-primary]');p.focus();key(p,'keydown','Space');
  s.ui.update(fixture('torch-spent'));equal(s.commands.at(-1),{type:'primary',pressed:false});const n=s.commands.length;
  key(p,'keydown','Space',{repeat:true});key(p,'keyup','Space');p.click();equal(s.commands.length,n);equal(p.dataset.lit,'false');
});
await check('Action events update visible/accessibility feedback once, without replaying countdown history',s=>{
  const noFuel=fixture('matches-no-fuel');s.ui.update(noFuel);equal(s.find('[data-tool-feedback]').textContent,'No burnable fuel on this tile.');
  const live=s.find('[data-announcement]'),node=live.firstChild;s.ui.update(noFuel);ok(live.firstChild===node,'Event replay announced twice');
  const blocked=fixture();blocked.tick=2;blocked.events=[...noFuel.events,{id:2,type:'tool-rejected',tool:'matches',reason:'blocked'}];s.ui.update(blocked);
  equal(s.find('[data-tool-feedback]').textContent,'Target blocked. Aim at reachable ground.');ok(live.textContent.includes('Target blocked'),'Feedback not accessible');
  const refs=s.find('[data-primary]').getAttribute('aria-describedby').split(' ');for(const id of refs)ok(s.root.querySelector('[id="'+id+'"]'),'Description escaped mount');
  blocked.events.push({id:3,type:'reset'});s.ui.update(blocked);ok(s.find('[data-tool-feedback]').hidden,'Reset left feedback');
});
await check('Initial old events are not announced and tool feedback stays with its tool',s=>{
  const otherRoot=document.createElement('div');host.append(otherRoot);const ui=mountUI({root:otherRoot,onCommand:()=>{}});
  try{ui.update(fixture('matches-no-fuel'));ok(otherRoot.querySelector('[data-tool-feedback]').hidden,'Old history replayed');}finally{ui.dispose();otherRoot.remove();}
  s.ui.update(fixture('torch-blocked'));ok(!s.find('[data-tool-feedback]').hidden,'Torch feedback missing');const next=fixture('torch-blocked');next.player.tool='matches';s.ui.update(next);ok(s.find('[data-tool-feedback]').hidden,'Torch feedback shown as match result');
});
await check('Torch discrete keypress and cancellation preserve the existing raw joystick contract',s=>{
  s.ui.update(fixture('torch-lit'));downStick(s,11);const p=s.find('[data-primary]');p.focus();key(p,'keydown','Enter');key(p,'keydown','Enter',{repeat:true});
  equal(s.commands.filter(c=>c.type==='primary'&&c.pressed).length,1);key(p,'keyup','Enter');
  ok(!s.commands.some(c=>c.type==='move'&&c.x===0&&c.y===0),'Ignite stopped movement');window.dispatchEvent(new Event('blur'));equal(s.commands.at(-1),{type:'cancel-input'});
});

for(const result of results){const item=document.createElement('li');item.dataset.status=result.status;item.textContent=(result.status==='pass'?'PASS ':'FAIL ')+result.name+(result.message?' — '+result.message:'');document.querySelector('#checks').append(item);}
const passed=results.filter(result=>result.status==='pass').length;
document.querySelector('#summary').textContent=passed+' / '+results.length+' passed';
document.body.dataset.testStatus=passed===results.length?'passed':'failed';
document.body.dataset.testResults=JSON.stringify(results);
