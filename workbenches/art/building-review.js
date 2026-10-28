import {createSimulation} from '../../src/simulation/index.js';
import {BUILDING_FACADES} from '../../src/art/building-facades.js';
export async function runBuildingReview(lab){
  const base=await lab.validate(),errors=[...base.errors],check=(ok,msg)=>{if(!ok)errors.push(msg);},samples=[],profiles=Object.keys(BUILDING_FACADES).filter(id=>id!=='generic');
  const slots={facade:'inherited-plaster',trim:'inherited-cream',door:'inherited-wood',roof:'inherited-roof'};
  const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
  for(const style of profiles){
    lab.reset({study:'facade',building:style,stories:BUILDING_FACADES[style].defaultStories,facade:'inherited-plaster',door:'open'});
    for(const stories of [1,2,3,4,5])for(const quarter of [0,1,2,3]){
      const m={id:'probe',form:'doorway',x:10,y:8,width:5,depth:.16,stories,heading:quarter*Math.PI/2,physicalMaterial:'wood',opening:{width:1,height:1.65,state:'open'},skinSlots:slots,sourceRefs:['game:named-facade-review']};
      const sim=createSimulation({scenario:{width:20,height:16,player:{x:7,y:12},actors:[],obstacles:[],modules:[m]}});let s;try{s=freeze(sim.snapshot());}finally{sim.dispose();}
      const before=JSON.stringify(s);lab.draw(s);check(before===JSON.stringify(s),'Named facade mutated snapshot');
      const signatures=lab.panes.map(p=>lab.geometrySignature(p.scene));check(JSON.stringify(signatures[0])===JSON.stringify(signatures[1]),'Named facade changed geometry '+style+'/'+stories+'/'+quarter);
      const mesh=lab.panes[1].scene.getObjectByName('module-part:probe:lintel'),coords=mesh.geometry.attributes.tbPortalCoord;
      check(Math.abs(coords.getZ(0)-1.65/2)<1e-6&&Math.abs(coords.getW(0)-stories)<1e-6,'Portal normalization disagrees with story/opening contract');
      check(lab.panes[1].art.diagnostics().exterior.facadeBindings.probe===style,'Facade style not bound to module');
      const point=new lab.THREE.Vector3(10,1.1,8);let filled=false;
      lab.panes[1].scene.getObjectByName('Exposition construction kit').traverse(o=>{if(o.isMesh&&new lab.THREE.Box3().setFromObject(o).containsPoint(point))filled=true;});
      check(!filled,'Named portal filled the ground opening');samples.push({style,stories,quarter,height:s.world.modules[0].height,signature:signatures[1]});
    }
  }
  // Upload both palettes' named textures before measuring steady-state swaps.
  lab.reset({study:'facade',building:'new-york-state',stories:2});
  for(const pane of lab.panes){pane.art.setSkinSet('exposition-v1');for(const style of profiles){pane.art.setFacadeStyle(style);lab.draw();}}
  lab.swap(false);lab.reset({study:'facade',building:'new-york-state',stories:2});
  const baseline={...lab.renderer.info.memory},builds=lab.panes.map(p=>p.art.diagnostics().exterior.builds),cycles=[],geometry=lab.panes.map(p=>lab.geometrySignature(p.scene)),state=JSON.stringify(lab.snapshot);
  for(let cycle=0;cycle<3;cycle++)for(const style of [...profiles,'generic']){
    lab.panes[1].art.setFacadeStyle(style);lab.draw();
    check(lab.panes.every((p,i)=>p.art.diagnostics().exterior.builds===builds[i]),'Named style swap rebuilt geometry');
    check(JSON.stringify(lab.panes.map(p=>lab.geometrySignature(p.scene)))===JSON.stringify(geometry),'Named style swap changed geometry/pose');
    check(JSON.stringify(lab.snapshot)===state,'Named style swap changed state');cycles.push({...lab.renderer.info.memory});
  }
  check(cycles.every(m=>m.geometries===baseline.geometries&&m.textures===baseline.textures),'Named facade swaps grew GPU resources');
  const frame={id:'burn',form:'doorway',x:5,y:5,width:3,depth:.16,stories:5,heading:0,physicalMaterial:'wood',opening:{width:1,height:1.65,state:'open'},skinSlots:slots,sourceRefs:['game:named-burn-check']};
  const burn=createSimulation({scenario:{width:10,height:10,player:{x:5,y:7},actors:[],obstacles:[],modules:[frame],ignitions:[{x:4,y:5,radius:.45,heat:4}]},config:{fuel:{surfaceBurnRate:1000},fire:{damagePerSecond:0}}});let burnt;try{burn.advance(1/60);burnt=freeze(burn.advance(1/60));}finally{burn.dispose();}
  for(const style of profiles){lab.panes[1].art.setFacadeStyle(style);lab.draw(burnt);const d=lab.panes[1].art.diagnostics().exterior;check(!d.renderedPartIds.includes('burn:pier-left')&&!d.renderedPartIds.includes('burn:lintel')&&d.renderedPartIds.includes('burn:pier-right'),'Named facade resurrected destroyed parts');}
  const bindings={};for(const study of ['buildings','avenue']){lab.reset({study,door:'open',facade:'inherited-plaster'});Object.assign(bindings,lab.panes[1].art.diagnostics().exterior.facadeBindings);}
  for(const style of profiles)check(bindings[style+'-entry']===style,'Mixed street lost named facade '+style);
  const disposed=await lab.renewArt();check(!disposed.geometries&&!disposed.textures,'Named facade full disposal retained resources');
  return{passed:!errors.length,errors,disposed,baseChecks:base,profileGeometrySamples:samples,cycles,baseline,mixedBindings:bindings,profiles:profiles.map(id=>BUILDING_FACADES[id]),limits:['Facade fragments; no complete named-building reconstruction','Two-story portal profiles use a plain central frame on a one-story template','Taller facades compose native 2m wall units at 2.12m floor spacing']};
}
