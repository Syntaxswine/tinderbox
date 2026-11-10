import {mountUI} from '../../src/ui/index.js';
import {fixture} from '../../workbenches/ui/fixtures.js';

const entry={id:'bell-and-alder:entry',kind:'door',action:'open',label:'Open',enabled:true,reason:'',anchor:[40,1.65,17]};
const take={id:'bell-and-alder:hand-lantern',kind:'lantern',action:'take',label:'Take lantern',enabled:true,reason:'',anchor:[41.65,1.2,11.6]};
const openCommand={type:'interact',portalId:entry.id,action:'open'};
const closeCommand={type:'interact',portalId:entry.id,action:'close'};
const takeCommand={type:'interact',objectId:take.id,action:'take'};
const toolPress=[{type:'select-tool',tool:'matches'},{type:'primary',pressed:true},{type:'primary',pressed:false}];
const ok=(condition,message)=>{if(!condition)throw Error(message);};
const equal=(a,b,message='Values differ')=>ok(JSON.stringify(a)===JSON.stringify(b),message+': '+JSON.stringify(a));
const key=(el,type,code,repeat=false)=>el.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true,repeat}));
const pointer=(el,type,pointerId=11,extra={})=>el.dispatchEvent(new PointerEvent(type,{
  pointerId,pointerType:'touch',isPrimary:true,detail:type==='click'?1:0,button:0,bubbles:true,cancelable:true,...extra
}));
const secondaryTouch=button=>{
  const box=button.getBoundingClientRect();
  return {isPrimary:false,clientX:box.left+box.width/2,clientY:box.top+box.height/2};
};

export async function runShopInteractionChecks(host){
  await document.fonts.ready;
  const results=[];
  async function check(name,run){
    const root=document.createElement('div');root.style.cssText='position:fixed;inset:0';host.append(root);
    let point=()=>({x:root.clientWidth*.56,y:root.clientHeight*.43,visible:true}),receive;
    const calls=[],commands=[],ui=mountUI({root,onZoom:()=>{},onCommand:command=>{commands.push(command);receive?.(command);},
      onProjectInteraction:anchor=>{calls.push(anchor);return point(anchor);}});
    const find=q=>root.querySelector(q),button=find('[data-interact]'),stick=find('[data-stick]');
    function set({interaction=entry,paused=false,hp=70,aim=null,tool='matches',tick=1}={}){
      const snapshot=fixture();Object.assign(snapshot,{tick,paused});
      Object.assign(snapshot.player,{interaction,tool,lanternAim:aim,hp});ui.update(snapshot);return snapshot;
    }
    set();
    try{await run({root,button,stick,commands,calls,find,set,project:fn=>{point=fn;},receive:fn=>{receive=fn;}});results.push({name,status:'pass'});}
    catch(error){results.push({name,status:'fail',message:error.message});}
    finally{ui.dispose();root.remove();}
  }

  await check('Shop Open, Close and Take use one timber action and exact portal/object commands',s=>{
    equal(s.root.querySelectorAll('[data-interact]').length,1);
    ok(!s.find('.tb-console [data-interact]'),'Added a permanent control');
    equal(s.button.textContent,entry.label);
    equal(s.button.getAttribute('aria-label'),entry.label);
    equal(s.button.getAttribute('aria-keyshortcuts'),'E');
    s.stick.focus();key(s.stick,'keydown','KeyE');key(s.stick,'keydown','KeyE',true);
    s.set({interaction:{...entry,action:'close',label:'Close'}});
    pointer(s.button,'pointerdown');pointer(s.button,'pointerup');pointer(s.button,'click');
    const state=s.set({interaction:take});s.button.focus();key(s.button,'keydown','Enter');s.button.click();
    equal(s.commands,[openCommand,closeCommand,takeCommand]);
    equal(s.calls.at(-1),take.anchor);
    equal(state.player.interaction,take,'UI changed the interaction optimistically');
  });
  await check('Space respects focus: a prompt activates itself and a stick press uses the tool',s=>{
    s.button.focus();
    ok(key(s.button,'keydown','Space'),'First focused Space prevented native activation');
    ok(!key(s.button,'keydown','Space',true),'Native repeat was not cancelled');
    key(s.button,'keyup','Space');s.button.click();
    s.stick.focus();key(s.stick,'keydown','Space');key(s.stick,'keyup','Space');
    equal(s.commands,[openCommand,...toolPress]);
  });
  await check('Unavailable, disabled and offscreen shop context cannot be invoked',s=>{
    s.set({interaction:{...entry,enabled:false,reason:'Move clear of the shop door.'}});
    ok(!s.button.hidden&&s.button.disabled,'Unsafe action not visible disabled');
    ok(s.button.textContent.includes('Move clear of the shop door.'),'Missing authoritative reason');
    s.button.click();s.stick.focus();key(s.stick,'keydown','KeyE');
    s.project(()=>({x:-40,y:10,visible:false}));s.set({interaction:take});
    ok(s.button.hidden&&s.button.disabled,'Offscreen action survived');
    key(s.stick,'keydown','KeyE');
    s.set({interaction:{...take,kind:'door'}});
    ok(s.button.hidden,'Invalid kind/action pair offered');
    equal(s.commands,[]);
  });
  await check('A held shop press cannot retarget, even after the same action disappears and returns',s=>{
    pointer(s.button,'pointerdown');s.set({interaction:take});pointer(s.button,'click');
    equal(s.commands,[]);
    s.set();pointer(s.button,'pointerdown');s.set({interaction:null});s.set();pointer(s.button,'click');
    equal(s.commands,[]);
    pointer(s.button,'pointerdown');s.set({interaction:{...entry,enabled:false}});s.set();pointer(s.button,'click');
    equal(s.commands,[]);
    pointer(s.button,'pointerdown');pointer(s.button,'click',12);pointer(s.button,'click');
    equal(s.commands,[openCommand]);
  });
  await check('A second finger can tap each shop action once while the stick is held',s=>{
    const stickBox=s.stick.getBoundingClientRect();
    pointer(s.stick,'pointerdown',7,{clientX:stickBox.right-8,clientY:stickBox.top+8});
    ok(s.commands[0]?.type==='move'&&s.commands[0].x>0,'First finger did not start movement');
    for(const [interaction,command] of [[entry,openCommand],[{...entry,action:'close',label:'Close'},closeCommand],[take,takeCommand]]){
      s.set({interaction});
      const touch=secondaryTouch(s.button),n=s.commands.length;
      pointer(s.button,'pointerdown',11,touch);
      pointer(s.button,'pointerup',12,touch);
      equal(s.commands.length,n,'Unrelated release activated the action');
      pointer(s.button,'pointerup',11,touch);
      equal(s.commands.slice(n),[command],'Second finger did not activate on release');
      pointer(s.button,'click',11,touch);
      equal(s.commands.slice(n),[command],'Compatibility click repeated the action');
    }
    ok(s.stick.dataset.moving==='true','Second finger released the stick');
    pointer(window,'pointerup',7);
    equal(s.commands.at(-1),{type:'move',x:0,y:0});
  });
  await check('An outside release, cancelled touch or changed target cannot activate the prompt',s=>{
    const touch=secondaryTouch(s.button);
    pointer(s.button,'pointerdown',11,touch);
    pointer(s.button,'pointerup',11,{...touch,clientY:0});
    pointer(s.button,'click',11,touch);
    pointer(s.button,'pointerdown',11,touch);
    pointer(window,'pointercancel',11,touch);
    pointer(s.button,'pointerup',11,touch);
    pointer(s.button,'pointerdown',11,touch);
    s.set({interaction:take});
    pointer(s.button,'pointerup',11,secondaryTouch(s.button));
    equal(s.commands,[]);
    pointer(s.button,'pointerdown',11,secondaryTouch(s.button));
    pointer(s.button,'pointerup',11,secondaryTouch(s.button));
    equal(s.commands,[takeCommand],'A fresh tap did not recover after cancellation');
  });
  await check('Pickup disappearance restores stick focus and does not spend a throwable',s=>{
    const state=s.set({interaction:take}),stock=state.player.inventory.molotovs;
    s.receive(command=>{if(command.objectId===take.id)s.set({interaction:null,tick:2});});
    s.button.focus();s.button.click();
    equal(s.commands,[takeCommand]);ok(s.button.hidden&&s.button.disabled,'Taken prompt stayed active');
    ok(document.activeElement===s.stick,'Focus lost after pickup');
    equal(state.player.inventory.molotovs,stock,'Portable light consumed a weapon');
    key(s.stick,'keydown','KeyW');equal(s.commands.at(-1),{type:'move',x:0,y:1});
  });
  await check('Pause hides the shop action, discards its old press and restores a valid prompt',s=>{
    s.button.focus();pointer(s.button,'pointerdown');s.find('[data-pause]').click();
    ok(s.button.hidden,'Pause kept prompt visible');
    s.set({paused:true,tick:2});key(s.find('[data-resume]'),'keydown','KeyE');
    s.find('[data-resume]').click();s.set({tick:3});
    ok(!s.button.hidden&&document.activeElement===s.button,'Resume did not restore usable focus');
    pointer(s.button,'click');equal(s.commands.filter(c=>c.type==='interact'),[]);
    s.button.click();equal(s.commands.at(-1),openCommand);
  });
  await check('Pending, active and cancelling throwable aim suppress the shop prompt',s=>{
    s.set({interaction:take});const lantern=s.find('[data-tool="molotov"]');
    pointer(s.button,'pointerdown');lantern.click();
    ok(s.button.hidden&&s.button.disabled,'Pending arm allowed the shop action');
    s.set({interaction:take});ok(s.button.hidden,'Old tick restored the shop action');
    const aim={target:null,impact:null,path:[],adjusting:false,canThrow:false};
    s.set({interaction:take,tool:'molotov',aim,tick:2});
    s.stick.focus();key(s.stick,'keydown','KeyE');
    ok(s.button.hidden,'Active aim allowed the prompt');
    key(s.stick,'keydown','Escape');ok(s.button.hidden,'Pending cancel restored the prompt early');
    s.set({interaction:take,tool:'molotov',tick:3});
    pointer(s.button,'click');equal(s.commands.filter(c=>c.type==='interact'),[]);
    s.stick.focus();key(s.stick,'keydown','KeyE');
    equal(s.commands.filter(c=>c.type==='interact'),[takeCommand]);
    ok(!s.commands.some(c=>c.type==='pause'),'Aim cancellation opened pause');
  });
  await check('Death and lost projection hide the plate without stealing unrelated focus',s=>{
    s.find('[data-tool="torch"]').focus();
    s.project(()=>({visible:false,x:0,y:0}));s.set({interaction:take});
    ok(s.button.hidden&&document.activeElement===s.find('[data-tool="torch"]'),'Unfocused prompt stole focus');
    s.project(()=>({visible:true,x:150,y:200}));s.set({interaction:take,hp:0,tick:2});
    ok(s.button.hidden&&s.button.disabled,'Dead player kept the action');
  });
  await check('Shop prompt fits around the deck, plan, vitals and zoom controls at viewport edges',s=>{
    for(const [x,y] of [[0,0],[s.root.clientWidth-1,s.root.clientHeight-1],[12,s.root.clientHeight*.5]]){
      s.project(()=>({x,y,visible:true}));s.set({interaction:take});
      const r=s.button.getBoundingClientRect(),deck=s.find('.tb-console').getBoundingClientRect();
      ok(!s.button.hidden&&r.width>=44&&r.height>=44,'No usable fit');
      ok(r.left>=0&&r.top>=0&&r.right<=s.root.clientWidth&&r.bottom<=deck.top,'Prompt clipped or covered deck');
      for(const selector of ['.tb-vitals','.tb-map','.tb-zoom']){
        const p=s.find(selector).getBoundingClientRect();
        ok(r.right<=p.left||r.left>=p.right||r.bottom<=p.top||r.top>=p.bottom,'Prompt overlaps '+selector);
      }
    }
    equal(s.root.querySelectorAll('.left-controls button,.right-controls button').length,6);
  });
  return results;
}
