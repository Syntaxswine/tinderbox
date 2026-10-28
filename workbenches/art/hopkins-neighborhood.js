import * as THREE from '../../vendor/farmyard-commando/30a3b8cae5f36bb0c1df3685b7fba16f701c2083/sites/tactical-animal/dist/aft/tactics/vendor/three.module.js';
import {loadHopkinsNeighborhood as loadGrossHousing,createHopkinsNeighborhoodHouse as createGrossHouse,HOPKINS_NEIGHBORHOOD_URL as GROSS_HOUSING_URL} from '../../src/art/hopkins-neighborhood.js';
import {planEdges} from '../../src/art/gross-housing.js';
const $=id=>document.getElementById(id),stage=$('stage'),params=new URLSearchParams(location.search);
if(params.has('capture'))document.body.classList.add('capture');
const scene=new THREE.Scene();scene.background=new THREE.Color('#bcc2ab');
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}
catch(error){const {openStaticHousingReview}=await import('./housing-static-review.js');await openStaticHousingReview({catalogueUrl:GROSS_HOUSING_URL,error,defaultHouse:'hopkins-4-21',previewBaseUrl:new URL('../../docs/art/hopkins-housing-v2/previews/',import.meta.url).href,reviewBaseUrl:new URL('../../docs/art/hopkins-housing-v2/',import.meta.url).href});}
if(renderer){
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;stage.append(renderer.domElement);
const camera=new THREE.OrthographicCamera(-10,10,10,-10,.1,200),hemi=new THREE.HemisphereLight('#fff2d4','#77886b',2.1);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff0d1',3.2);sun.position.set(-12,23,-10);sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-18,right:18,top:20,bottom:-18,near:.1,far:80});sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0004;sun.shadow.normalBias=.02;scene.add(sun);scene.add(sun.target);
const groundGeometry=new THREE.BoxGeometry(200,.1,200),groundMaterial=new THREE.MeshStandardMaterial({color:'#b1b89d',roughness:1}),ground=new THREE.Mesh(groundGeometry,groundMaterial);ground.position.set(4,-.17,6);ground.receiveShadow=true;scene.add(ground);
let library,model,view=params.get('view')==='cutaway'?'cutaway':'exterior',level=Number(params.get('level')||0),angle=Number(params.get('angle')||0),furniture=true,closed=false;
function frame(){
 if(!model||closed)return;const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);const house=model.house;
 model.root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model.root);
 if(view==='cutaway'){const f=level<0?house.basementFloor:house.floors[level],points=f.rooms.flatMap(r=>r.polygon),xs=points.map(p=>p[0]),zs=points.map(p=>p[1]),y=house.plinth+level*2.12;bounds.min.set(Math.min(...xs)-.3,y-.12,Math.min(...zs)-.3);bounds.max.set(Math.max(...xs)+.3,y+1.45,Math.max(...zs)+.3);}
 const target=bounds.getCenter(new THREE.Vector3()),dir=new THREE.Vector3(-Math.cos(angle)*19+Math.sin(angle)*22,view==='cutaway'?37:16,-Math.sin(angle)*19-Math.cos(angle)*22);
 camera.position.copy(target).add(dir);camera.lookAt(target);camera.updateMatrixWorld();let extentX=0,extentY=0;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const p=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);extentX=Math.max(extentX,Math.abs(p.x));extentY=Math.max(extentY,Math.abs(p.y));}
 const span=Math.max(extentY*2,extentX*2*h/w)*1.12;camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.zoom=1;camera.updateProjectionMatrix();
 sun.target.position.copy(target);sun.target.updateMatrixWorld();ground.position.y=(view==='cutaway'?house.plinth+level*2.12:0)-.18;draw();
}
function draw(){if(!closed&&model)renderer.render(scene,camera);}
function plan(){
 const h=model.house,f=level<0?h.basementFloor:h.floors[level];if(!f)return;
 const rooms=f.rooms,all=rooms.flatMap(r=>r.polygon),xs=all.map(p=>p[0]),zs=all.map(p=>p[1]),minX=Math.min(...xs)-.65,minZ=Math.min(...zs)-.75,w=Math.max(...xs)-minX+.65,d=Math.max(...zs)-minZ+.8;
 const palette={bedroom:'#c5cbae',parlor:'#d6bd94',sitting:'#d6bd94',dining:'#c5b493',kitchen:'#b8c6bd',bath:'#bdd0cd',hall:'#e3d9be',pantry:'#ded1b3',service:'#c8c4b3',library:'#c9ba9b'};
 let svg=`<svg viewBox="${minX} ${minZ} ${w} ${d}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${f.label} room layout"><defs><pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M 1 0 L 0 0 0 1" fill="none" stroke="#a09a85" stroke-width=".013"/></pattern><pattern id="stair" width=".25" height=".25" patternUnits="userSpaceOnUse"><path d="M0 0H.25" stroke="#6d644e" stroke-width=".035"/></pattern></defs>`;
 for(const r of rooms){
  const points=r.polygon.map(p=>p.join(',')).join(' '),b={x:r.polygon.reduce((s,p)=>s+p[0],0)/r.polygon.length,z:r.polygon.reduce((s,p)=>s+p[1],0)/r.polygon.length};
  svg+=`<polygon points="${points}" fill="${palette[r.type]||'#e0d4b8'}" stroke="#544d3f" stroke-width=".07"/><polygon points="${points}" fill="url(#grid)"/>`;
  const words=r.label.split(' '),small=Math.max(...r.polygon.map(p=>p[1]))-Math.min(...r.polygon.map(p=>p[1]))<2;
  if(small)svg+=`<text x="${b.x}" y="${b.z+.08}" text-anchor="middle" font-family="system-ui" font-size=".23" fill="#554c3a">${r.label}</text>`;
  else{const lines=words.length>2?[words.slice(0,-1).join(' '),words.at(-1)]:words;lines.forEach((text,i)=>svg+=`<text x="${b.x}" y="${b.z+(i-(lines.length-1)/2)*.34}" text-anchor="middle" font-family="system-ui" font-size=".28" fill="#514a3b">${text}</text>`);}
 }
 for(const e of planEdges(f).filter(e=>e.opening)){svg+=`<line x1="${e.a[0]}" y1="${e.a[1]}" x2="${e.b[0]}" y2="${e.b[1]}" stroke="#f8f2df" stroke-width=".16"/><circle cx="${(e.a[0]+e.b[0])/2}" cy="${(e.a[1]+e.b[1])/2}" r=".07" fill="#6a7757"/>`;}
 if(f.stairs)svg+=`<rect x="${f.stairs.x}" y="${f.stairs.z}" width="1" height="3" fill="url(#stair)" stroke="#6d644e" stroke-width=".05"/>`;
 svg+=`<text x="${minX+.1}" y="${minZ+.35}" font-family="system-ui" font-size=".22" fill="#756d58">FRONT / STREET</text></svg>`;
 $('plan').innerHTML=svg;$('plan-title').textContent=f.label+' · adapted plan';
}
function setView(next={}){
 if(next.view!==undefined)view=next.view;if(next.level!==undefined)level=next.level;if(next.angle!==undefined)angle=next.angle;if(next.furniture!==undefined)furniture=next.furniture;
 if(!model)return;model.setView({view,level,showFurniture:furniture});$('exterior').setAttribute('aria-pressed',String(view==='exterior'));$('cutaway').setAttribute('aria-pressed',String(view==='cutaway'));$('level').value=level;$('furniture').checked=furniture;$('view-caption').textContent=view==='cutaway'?model.levels.find(l=>l.index===level)?.label.toUpperCase()+' / CUTAWAY':'EXTERIOR / '+(model.house.source.printedPage?'SOURCE P. '+model.house.source.printedPage:'');
 plan();frame();const d=model.diagnostics();$('stats').textContent=d.wallUnits+' wall spans · '+d.diagonalUnits+' angled spans · '+d.windows+' sash openings';
}
function select(id){
 model?.dispose();model=createGrossHouse(THREE,library,id);scene.add(model.root);const h=model.house;
 if(!model.levels.some(l=>l.index===level))level=0;
 $('house-title').textContent=h.label;$('source-label').textContent='HOPKINS BOOK 4 · 1891 / DESIGN '+h.designNumber;
 $('level').replaceChildren(...model.levels.map(l=>{const o=document.createElement('option');o.value=l.index;o.textContent=l.label;return o;}));
 $('prefab').href=new URL('prefabs/'+id+'.json',GROSS_HOUSING_URL).href;$('source-link').href=h.source.url;
 $('plate').src=new URL(h.source.plate,GROSS_HOUSING_URL).href;$('plate-link').href=$('plate').src;$('notes').textContent=h.notes.join(' ')+(h.basement?' '+h.basement:'');
 for(const button of $('houses').children)button.setAttribute('aria-current',String(button.dataset.house===id));setView();return model.diagnostics();
}
$('exterior').onclick=()=>setView({view:'exterior'});$('cutaway').onclick=()=>setView({view:'cutaway'});$('level').onchange=()=>setView({view:'cutaway',level:Number($('level').value)});$('rotate').onclick=()=>setView({angle:angle+Math.PI/2});$('furniture').onchange=()=>setView({furniture:$('furniture').checked});
let drag;renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,angle};renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointermove',e=>{if(drag){angle=drag.angle+(e.clientX-drag.x)*.008;frame();}});renderer.domElement.addEventListener('pointerup',()=>{drag=null;});renderer.domElement.addEventListener('pointercancel',()=>{drag=null;});
const resize=new ResizeObserver(frame);resize.observe(stage);
function dispose(){if(closed)return;model?.dispose();library?.dispose();resize.disconnect();groundGeometry.dispose();groundMaterial.dispose();sun.shadow.dispose();renderer.renderLists.dispose();renderer.dispose();closed=true;}
window.addEventListener('pagehide',dispose,{once:true});
const ready=loadGrossHousing(THREE,{renderer}).then(result=>{library=result;for(const h of library.catalogue.houses){const button=document.createElement('button');button.dataset.house=h.id;button.innerHTML='<strong>'+h.label.split(' / ').at(-1)+'</strong><small>'+h.label.split(' / ')[0]+' · Book 4'+'</small>';button.onclick=()=>select(h.id);$('houses').append(button);}select(params.get('house')||'hopkins-4-21');$('loading').remove();return true;}).catch(error=>{$('loading').textContent=error.message;throw error;});
window.hopkinsLab={ready,select,setView,draw,dispose,get model(){return model;},get library(){return library;},renderer,scene,camera,THREE,diagnostics:()=>({model:model?.diagnostics(),gpu:{...renderer.info.memory},programs:renderer.info.programs?.length||0,closed})};
$('review').onclick=async()=>{
 const output=$('review-output'),button=$('review');button.disabled=true;output.textContent='Preparing collection review…';
 let downloadURL;const images=[],samples=[],errors=[],start=new Date().toISOString(),initial={id:model.house.id,view,level,angle};
 try{
  await ready;angle=0;const capture=(id,kind,index)=>{draw();images.push({id,view:kind,level:index,file:id+'-'+kind+(kind==='cutaway'?'-'+index:'')+'.png',dataURL:renderer.domElement.toDataURL('image/png')});samples.push({id,view:kind,level:index,...model.diagnostics(),gpu:{...renderer.info.memory}});};
  for(const h of library.catalogue.houses){
   output.textContent='Reviewing '+h.label;select(h.id);setView({view:'exterior',level:0,furniture:true});capture(h.id,'exterior',0);
   for(const l of model.levels){setView({view:'cutaway',level:l.index});capture(h.id,'cutaway',l.index);}
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  select('hopkins-4-21');setView({view:'exterior',level:0});const baseline={...renderer.info.memory};
  for(const h of library.catalogue.houses)select(h.id);select('hopkins-4-21');setView({view:'exterior',level:0});const repeated={...renderer.info.memory};
  if(JSON.stringify(baseline)!==JSON.stringify(repeated))errors.push('Repeated collection traversal grew GPU allocations');
  const gl=renderer.getContext(),programs=renderer.info.programs.map(p=>({linked:gl.getProgramParameter(p.program,gl.LINK_STATUS),log:gl.getProgramInfoLog(p.program)||'',shaders:(gl.getAttachedShaders(p.program)||[]).map(shader=>gl.getShaderInfoLog(shader)||'')}));
  if(programs.some(p=>!p.linked||p.log.trim()||p.shaders.some(s=>s.trim())))errors.push('Shader program diagnostics were not clean');
  // Separate renderer probes the complete artist asset lifecycle without closing this review.
  const probeRenderer=new THREE.WebGLRenderer({antialias:false});probeRenderer.localClippingEnabled=true;probeRenderer.setSize(64,64,false);
  const probeLibrary=await loadGrossHousing(THREE,{renderer:probeRenderer}),probeScene=new THREE.Scene(),probe=createGrossHouse(THREE,probeLibrary,'hopkins-4-21');probeScene.add(probe.root,new THREE.HemisphereLight(0xffffff,0x888888,2));probeRenderer.render(probeScene,camera);const allocated={...probeRenderer.info.memory};probe.dispose();probeLibrary.dispose();probeScene.clear();probeRenderer.render(probeScene,camera);const disposed={...probeRenderer.info.memory};probeRenderer.dispose();
  if(disposed.geometries||disposed.textures)errors.push('Complete artist asset disposal retained GPU objects');
  const extension=gl.getExtension('WEBGL_debug_renderer_info'),hardware={renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),version:gl.getParameter(gl.VERSION)};
  const review={passed:!errors.length,startedAt:start,completedAt:new Date().toISOString(),viewport:{width:innerWidth,height:innerHeight},horizontalOverflow:document.documentElement.scrollWidth>innerWidth,errors,exteriors:library.catalogue.houses.length,interiorLevels:library.catalogue.houses.reduce((n,h)=>n+h.floors.length,0),captures:images.length,baseline,repeated,probe:{allocated,disposed},programs:programs.length,allShaderLogsEmpty:!programs.some(p=>!p.linked||p.log.trim()||p.shaders.some(s=>s.trim())),hardware,samples,images};
  downloadURL=URL.createObjectURL(new Blob([JSON.stringify(review)],{type:'application/json'}));$('review-download').href=downloadURL;$('review-download').hidden=false;output.textContent=JSON.stringify({...review,samples:samples.map(s=>({id:s.id,view:s.view,level:s.level,wallUnits:s.wallUnits,diagonalUnits:s.diagonalUnits})),images:images.map(({dataURL,...rest})=>rest)},null,2);
 }catch(error){output.textContent=JSON.stringify({passed:false,error:error.stack,errors});}
 finally{select(initial.id);setView(initial);button.disabled=false;}
};
}
