import {createSimulation} from '../../src/simulation/index.js';
import {roomBoxes} from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/hybrid-geometry.js';
import {runBuildingReview} from './building-review.js';
const profiles=['manufactures','agriculture','fine-arts'];
const slots={facade:'inherited-plaster',trim:'inherited-cream',door:'inherited-wood',roof:'inherited-roof'};
function snapshotFor(width,stories,quarter=0){
  const simulation=createSimulation({scenario:{width:40,height:40,player:{x:12,y:30},actors:[],obstacles:[],modules:[
    {id:'native-probe',form:'doorway',x:20,y:20,width,depth:.16,stories,heading:quarter*Math.PI/2,
      opening:{width:1,height:1.65,state:'open'},physicalMaterial:'wood',skinSlots:slots,sourceRefs:['farmyard:hybrid-wall-opening','game:native-repeat-review']}
  ]}});
  try{return simulation.snapshot();}finally{simulation.dispose();}
}
function fingerprint(bytes){let hash=2166136261;for(const value of bytes)hash=Math.imul(hash^value,16777619);return hash>>>0;}
function difference(a,b){
  let max=0,sum=0,equal=0;
  for(let i=0;i<a.length;i++){const delta=Math.abs(a[i]-b[i]);max=Math.max(max,delta);sum+=delta;if(!delta)equal++;}
  return{max,mean:sum/a.length,equalFraction:equal/a.length};
}
function pixels(lab,snapshot){
  const T=lab.THREE,renderer=lab.renderer,pane=lab.panes[1],module=snapshot.world.modules[0];
  lab.draw(snapshot);
  const target=new T.WebGLRenderTarget(900,240),camera=new T.OrthographicCamera(-15,15,2, -2,.1,100);
  camera.position.set(module.x,2,module.y+20);camera.lookAt(module.x,2,module.y);camera.updateMatrixWorld();
  const saved=[],kit=pane.scene.getObjectByName('Exposition construction kit'),oldTarget=renderer.getRenderTarget(),shadows=renderer.shadowMap.enabled;
  try{
    pane.scene.traverse(o=>{if(!o.isMesh)return;let parent=o,isKit=false;while(parent){if(parent===kit){isKit=true;break;}parent=parent.parent;}saved.push([o,o.visible,o.castShadow,o.receiveShadow]);o.visible=Boolean(isKit);o.castShadow=false;o.receiveShadow=false;});
    renderer.shadowMap.enabled=false;renderer.setScissorTest(false);renderer.setRenderTarget(target);renderer.setViewport(0,0,900,240);renderer.render(pane.scene,camera);
    const rect=(x,y,w,h)=>{const bytes=new Uint8Array(w*h*4);renderer.readRenderTargetPixels(target,x,y,w,h,bytes);return bytes;};
    // 30px/m horizontally, 60px/m vertically. The two wing patches are 5m apart.
    return{portal:rect(408,6,84,228),wingA:rect(510,18,15,72),wingB:rect(660,18,15,72),shifted:rect(525,18,15,72)};
  }finally{
    for(const [o,visible,cast,receive]of saved){o.visible=visible;o.castShadow=cast;o.receiveShadow=receive;}
    renderer.shadowMap.enabled=shadows;renderer.setRenderTarget(oldTarget);target.dispose();
  }
}
export async function runWideReview(lab){
  const named=await runBuildingReview(lab),errors=[...named.errors],check=(ok,message)=>{if(!ok)errors.push(message);};
  const templates=roomBoxes({doorClosed:true}),get=name=>templates.find(b=>b.name===name);
  const source={'aft:wall-1m':get('Left pier'),'aft:door-lintel-1m':get('Door lintel'),'aft:door-leaf-1m':get('Closed door')};
  const samples=[],pixelChecks=[];let checkedMeshes=0,checkedUVVertices=0;
  for(const style of profiles){
    lab.reset({study:'wide',building:style,stories:2,width:13,facade:'inherited-plaster',door:'open'});
    for(const width of [3,7,13,23])for(const stories of [1,2,5])for(const quarter of [0,1]){
      const snapshot=snapshotFor(width,stories,quarter),before=JSON.stringify(snapshot);lab.draw(snapshot);
      check(JSON.stringify(snapshot)===before,'Native facade changed authoritative snapshot');
      const pair=lab.panes.map(p=>lab.geometrySignature(p.scene));
      check(JSON.stringify(pair[0])===JSON.stringify(pair[1]),'Paint changed geometry, original UVs or transforms '+style+'/'+width+'/'+stories+'/'+quarter);
      const module=snapshot.world.modules[0],scene=lab.panes[1].scene;
      check(Math.abs(module.height-(2+(stories-1)*2.12))<1e-8,'Facade ignored native floor spacing');
      check(module.opening.width===1&&module.opening.height===1.65&&module.depth===.16,'Native wall/door scale changed');
      for(const part of module.parts){
        const mesh=scene.getObjectByName('module-part:'+part.id);if(!mesh){check(false,'Native part missing '+part.id);continue;}
        checkedMeshes++;check(mesh.scale.toArray().every(n=>n===1),'Native mesh was scaled '+part.id);
        const box=new lab.THREE.Box3().setFromObject(mesh),size=new lab.THREE.Vector3();box.getSize(size);
        check(Math.abs(size.x-part.width)<1e-5&&Math.abs(size.y-part.height)<1e-5&&Math.abs(size.z-part.depth)<1e-5,'Native geometry differs from compiled template');
        const original=source[part.sourceAssetId];
        if(original){
          const horizontal=[part.width,part.depth].sort((a,b)=>a-b),expected=[original.size[0],original.size[2]].sort((a,b)=>a-b);
          check(Math.abs(part.height-original.size[1])<1e-8&&horizontal.every((n,i)=>Math.abs(n-expected[i])<1e-8),'Native source box dimensions changed '+part.sourceAssetId);
          if(part.sourceAssetId==='aft:wall-1m'){
            const level=Math.round((part.h-1)/2.12),coords=mesh.geometry.attributes.tbFacadeCoord;
            let low=Infinity,high=-Infinity;for(let i=0;i<coords.count;i++){low=Math.min(low,coords.getY(i));high=Math.max(high,coords.getY(i));}
            check(Math.abs(low-level)<1e-5&&Math.abs(high-level-1)<1e-5,'Native wall did not receive exactly one complete painted story '+part.id);
          }
        }else check(part.sourceAssetId==='tinderbox:facade-slab-band-1m'&&Math.abs(part.height-.12)<1e-8,'Unexpected native source or slab band');
        // Source wall facade surfaces keep physical world-space UVs / original 2m concrete period.
        if(part.skinSlot==='facade'){
          const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,uv=mesh.geometry.attributes.uv;
          for(let i=0;i<p.count;i++){
            const broad=part.width<part.depth?Math.abs(n.getX(i))>.5:Math.abs(n.getZ(i))>.5;if(!broad)continue;
            const u=(Math.abs(n.getX(i))>.5?p.getZ(i)+mesh.position.z:p.getX(i)+mesh.position.x)/2,v=(p.getY(i)+mesh.position.y)/2;
            checkedUVVertices++;check(Math.abs(uv.getX(i)-u)<1e-5&&Math.abs(uv.getY(i)-v)<1e-5,'Inherited wall UV density changed');
          }
        }
      }
      samples.push({style,width,stories,quarter,height:module.height,parts:module.parts.length,signature:pair[1]});
    }
    let reference;
    for(const width of [3,7,13,23]){
      const rendered=pixels(lab,snapshotFor(width,2)),portalHash=fingerprint(rendered.portal);
      if(!reference)reference=rendered.portal;
      const portalDelta=difference(reference,rendered.portal);
      check(portalDelta.max<=3&&portalDelta.mean<.25,'Entrance stretched or changed as width increased '+style+'/'+width);
      let repeat,contrast;
      if(width===23){
        repeat=difference(rendered.wingA,rendered.wingB);contrast=difference(rendered.wingA,rendered.shifted);
        check(repeat.max<=3&&repeat.mean<.25,'Wide wall failed its rendered 5m repeat '+style);
        check(contrast.mean>2,'Repeat proof sampled a flat uninformative patch '+style);
      }
      pixelChecks.push({style,width,portalHash,portalDelta,...(repeat?{repeatDelta:repeat,shiftedPatchDelta:contrast}:{})});
    }
  }
  lab.reset({study:'wide',building:'manufactures',width:23,stories:2,door:'closed'});lab.draw();
  const leaf=lab.panes[1].scene.getObjectByName('module-part:wide-entry:closed-door'),leafBox=new lab.THREE.Box3().setFromObject(leaf),leafSize=new lab.THREE.Vector3();leafBox.getSize(leafSize);
  check(Math.abs(leafSize.x-1)<1e-5&&Math.abs(leafSize.y-1.65)<1e-5&&Math.abs(leafSize.z-.12)<1e-5,'Closed native door leaf was resized');
  const disposed=await lab.renewArt();check(!disposed.geometries&&!disposed.textures,'Native repeat review left GPU resources after disposal');
  return{passed:!errors.length,errors,named,sourceContract:{wall:get('Left pier').size,lintel:get('Door lintel').size,door:get('Closed door').size,floorSpacing:2.12,storyHeights:[2,4.12,6.24,8.36,10.48]},samples,checkedMeshes,checkedUVVertices,pixelChecks,closedLeaf:leafSize.toArray(),disposed,limits:['Facade fragments with adapted colour and ornament','Slab bands are compatible new trim; source wall/door templates remain unchanged','Provisional bear and source civilians are not resized and do not fit the native door envelope']};
}
