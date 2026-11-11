import {mountUI} from '../../src/ui/index.js';
import {fixture} from '../../workbenches/ui/fixtures.js';
import {createTrainUIFixture} from '../../workbenches/ui/train-fixture.js';
const ok=(value,message)=>{if(!value)throw Error(message);};
const equal=(a,b,message='Values differ')=>ok(JSON.stringify(a)===JSON.stringify(b),message);
const key=(target,type,value)=>target.dispatchEvent(new KeyboardEvent(type,{key:value,code:value==='b'?'KeyB':value,bubbles:true,cancelable:true}));
const pointer=(target,type,y,id=11)=>target.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,buttons:type==='pointerup'?0:1,clientY:y,bubbles:true,cancelable:true}));
export async function runTrainChecks(host){
  const results=[];
  async function check(name,run){
    const root=document.createElement('div');root.style.cssText='position:fixed;inset:0';host.append(root);
    const source=createTrainUIFixture(),commands=[],snapshot=fixture();snapshot.player.lanternAim=null;
    let serial=0;
    const ui=mountUI({root,onCommand:command=>commands.push(command),train:{session:source.session,actorId:'player',newId:kind=>'test/'+kind+'/'+(++serial)}});
    ui.update(snapshot);
    const control=ui.trainControl,lever=root.querySelector('.tb-train-lever'),brake=root.querySelector('.tb-train-brake');
    try{await run({ui,control,root,lever,brake,source,commands,snapshot});results.push({name,status:'pass'});}
    catch(error){results.push({name,status:'fail',message:error.stack||error.message});}
    finally{ui.dispose();source.dispose();root.remove();}
  }
  await check('Train control replaces the stick with the same square and returns walking on exit',s=>{
    const stick=s.root.querySelector('[data-stick]'),r=s.control.element.getBoundingClientRect();
    ok(stick.hidden&&stick.disabled,'Walking input survived driving');
    ok(r.width===r.height&&r.width>=96,'Train control lost the joystick square');
    ok(s.lever.getBoundingClientRect().width>=44&&s.brake.getBoundingClientRect().width>=44,'Train touch targets are too narrow');
    s.source.setMode('on-foot');
    ok(!stick.hidden&&s.control.element.hidden&&!stick.disabled,'Walking did not return');
    const walking=stick.getBoundingClientRect();equal([r.width,r.height],[walking.width,walking.height],'Square resized during mode change');
  });
  await check('Lever remains in the selected notch after release, with hysteresis at its boundary',s=>{
    const r=s.lever.getBoundingClientRect(),at=index=>r.top+16+(r.height-32)*index/3;
    pointer(s.lever,'pointerdown',at(1));pointer(window,'pointerup',at(1));
    equal(s.source.state.train.controls.power,.5);equal(s.control.state.gear,1);
    const before=s.source.commands.length;
    pointer(s.lever,'pointerdown',at(1.5));pointer(window,'pointermove',at(1.61));
    equal(s.source.commands.length,before,'Jitter left the notch');
    pointer(window,'pointermove',at(1.64));equal(s.control.state.gear,2);
    pointer(window,'pointerup',at(1.64));
    equal(s.source.state.train.controls.direction,'neutral');
  });
  await check('Pulling the chain brakes while another finger holds the lever and releases into neutral',s=>{
    const r=s.lever.getBoundingClientRect();
    pointer(s.lever,'pointerdown',r.top+16);
    equal(s.source.state.train.controls.power,1);
    pointer(s.brake,'pointerdown',r.top+40,22);
    equal(s.source.state.train.controls.brake,1);equal(s.control.state.gear,2);
    pointer(window,'pointerup',r.top+60,22);
    equal(s.source.state.train.controls,{direction:'neutral',power:0,brake:1,leaseId:null});
    pointer(window,'pointermove',r.top+16);
    equal(s.control.state.gear,2,'Old finger restarted power');
    pointer(window,'pointerup',r.top+16);
  });
  await check('Keyboard gears and brake use the same connector and refused shifts leave neutral',s=>{
    key(s.lever,'keydown','End');equal(s.source.state.train.controls.power,1);
    key(s.lever,'keydown','b');equal(s.source.state.train.controls.brake,1);
    key(s.lever,'keyup','b');equal(s.control.state.leaseId,null);
    s.source.setRefused(true);key(s.lever,'keydown','Home');
    equal(s.control.state.gear,2);equal(s.control.state.leaseId,null);
    ok(s.root.querySelector('.tb-train-message').textContent.includes('Stop the train'),'Missing refusal');
  });
  await check('Pause, cancellation and blur retire the exact original input lease',s=>{
    key(s.lever,'keydown','End');const lease=s.control.state.leaseId;
    s.control.setBlocked(true);
    ok(s.source.commands.some(c=>c.type==='release'&&c.leaseId===lease),'Pause missed original lease');
    s.control.setBlocked(false);
    const r=s.lever.getBoundingClientRect();pointer(s.lever,'pointerdown',r.top+16);
    pointer(window,'pointercancel',r.top+16);equal(s.control.state.leaseId,null);
    key(s.lever,'keydown','End');window.dispatchEvent(new Event('blur'));
    equal(s.source.state.train.controls.brake,1);equal(s.control.state.leaseId,null);
  });
  await check('Train disposal removes the subscription and stops stale controls',s=>{
    key(s.lever,'keydown','End');s.ui.dispose();const count=s.source.commands.length;
    key(s.lever,'keydown','Home');pointer(s.brake,'pointerdown',40);
    equal(s.source.commands.length,count);equal(s.source.listenerCount,0);
  });
  return results;
}
