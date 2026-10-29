import {createForms} from '../exposition-new-york/forms.js';
import {WALL_KIT,wallPanels,wallRunErrors} from '../../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js';
export const ENGINE_PIN='90054d07134116a5d9661f8318a76fe68f922aad';
export const WATERFRONT_PROFILE=Object.freeze({tile:WALL_KIT.panel,wallHeight:WALL_KIT.height,wallThickness:WALL_KIT.thickness,slab:Math.round((WALL_KIT.floorSpacing-WALL_KIT.height)*1e6)/1e6,floorSpacing:WALL_KIT.floorSpacing});
export const APPEARANCE_SLOTS=Object.freeze(['facade','coping','paving','rail','ornament']);
export const WATERFRONT_TILES=Object.freeze(['promenade-slab','quay-straight','quay-rail','quay-pier','quay-outer-corner','quay-inner-corner','quay-end-left','quay-end-right','quay-stairs']);
const COLOURS={facade:0xcbbfa5,coping:0xe6dbc2,paving:0xc6b89b,rail:0x383b32,ornament:0xe6dbc2},P=WATERFRONT_PROFILE,Y=P.floorSpacing;
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const edge=(id,a,b,water)=>({id,a,b,water});
function recipe(type){
 const cells=[[0,0]],edges=[],posts=[],ports=[];
 const front=edge('front',[0,.08],[1,.08],[0,-1]);
 if(type==='quay-inner-corner'){
  cells.push([1,0],[0,1]);edges.push(edge('notch-south',[2,.92],[1,.92],[0,1]),edge('notch-west',[.92,1],[.92,2],[1,0]));posts.push([.92,.92]);
  ports.push({id:'east',position:[2,Y,1],outward:[1,0,0],water:[0,0,1]},{id:'north',position:[1,Y,2],outward:[0,0,1],water:[1,0,0]});
 }else if(type==='quay-stairs'){
  cells.push([1,0]);edges.push(edge('landing-face',[0,.08],[2,.08],[0,-1]));
  ports.push({id:'land',position:[1,Y,1],outward:[0,0,1]},{id:'water',position:[1,0,-4],outward:[0,0,-1]});
 }else if(type!=='promenade-slab'){
  edges.push(front);
  if(['quay-outer-corner','quay-end-left'].includes(type))edges.push(edge('left',[.08,1],[.08,0],[-1,0]));
  if(type==='quay-end-right')edges.push(edge('right',[.92,0],[.92,1],[1,0]));
  if(type==='quay-pier')posts.push([.5,.08]);
  if(['quay-outer-corner','quay-end-left'].includes(type))posts.push([.08,.08]);
  if(type==='quay-end-right')posts.push([.92,.08]);
  if(type==='quay-outer-corner')ports.push({id:'north',position:[0,Y,1],outward:[0,0,1],water:[-1,0,0]});
  else if(type!=='quay-end-left')ports.push({id:'west',position:[0,Y,0],outward:[-1,0,0],water:[0,0,-1]});
  if(type!=='quay-end-right')ports.push({id:'east',position:[1,Y,0],outward:[1,0,0],water:[0,0,-1]});
 }else for(const [id,position,outward]of [['west',[0,Y,.5],[-1,0,0]],['east',[1,Y,.5],[1,0,0]],['south',[.5,Y,0],[0,0,-1]],['north',[.5,Y,1],[0,0,1]]])ports.push({id,position,outward});
 return {cells,edges,posts,ports};
}
export function createWaterfrontTile(T,{type='quay-rail',materials={},textures={},quarterTurns=0,position=[0,0,0]}={}){
 if(!WATERFRONT_TILES.includes(type))throw Error('Unknown waterfront tile '+type);
 if(!Number.isInteger(quarterTurns)||quarterTurns<0||quarterTurns>3)throw Error('quarterTurns must be 0..3');
 if(!Array.isArray(position)||position.length!==3||position.some(n=>!Number.isFinite(n))||!Number.isInteger(position[0])||!Number.isInteger(position[2])||Math.abs(position[1]/Y-Math.round(position[1]/Y))>1e-8)throw Error('Native tile placement requires integer X/Z metres and a standard floor Y');
 for(const slot of [...Object.keys(materials),...Object.keys(textures)])if(!APPEARANCE_SLOTS.includes(slot))throw Error('Unknown appearance slot '+slot);
 const root=new T.Group();root.name='horticulture-waterfront/'+type;let disposed=false;const ownedMaterials=new Set(),slots={},bindings={materials:{...materials},textures:{...textures}};
 function makeMaterial(slot){
  const input=bindings.materials[slot];if(input&&!input.isMaterial)throw Error('Expected Three material in '+slot);
  const texture=bindings.textures[slot];if(texture&&!texture.isTexture)throw Error('Expected Three texture in '+slot);
  const m=input?input.clone():new T.MeshStandardMaterial({color:COLOURS[slot],roughness:slot==='rail'?.69:.94,metalness:slot==='rail'?.2:0}),prior=input?.onBeforeCompile,key=input?.customProgramCacheKey?.call(input)||'default';
  if(Object.hasOwn(bindings.textures,slot))m.map=texture;m.name='Horticulture waterfront / '+slot;
  m.onBeforeCompile=(shader,renderer)=>{prior?.call(m,shader,renderer);if(!shader.vertexShader.includes('attribute vec2 grossUV;'))shader.vertexShader='attribute vec2 grossUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (mapTransform * vec3(grossUV, 1.0)).xy;\n#endif');};
  m.customProgramCacheKey=()=>key+'/waterfront-metre-uv-v1';ownedMaterials.add(m);return m;
 }
 try{for(const slot of APPEARANCE_SLOTS)slots[slot]=makeMaterial(slot);}catch(error){for(const m of ownedMaterials)m.dispose();throw error;}
 const f=createForms(T,slots),{box,prism,group,hip}=f,r=recipe(type),nativePanels=[],floorTiles=[],treads=[];
 const nativeMap={width:24,levels:3,wallRuns:{version:1,segments:r.edges.map(e=>({id:type+'.'+e.id,a:e.a.map(v=>v+8),b:e.b.map(v=>v+8),z:0,stories:1,material:'concrete'}))}};
 const errors=wallRunErrors(nativeMap);if(errors.length)throw Error(errors.join(' '));
 for(const [i,run]of nativeMap.wallRuns.segments.entries()){
  const e=r.edges[i],panels=wallPanels(run),len=Math.hypot(e.b[0]-e.a[0],e.b[1]-e.a[1]),g=group(root,e.id,[(e.a[0]+e.b[0])/2,0,(e.a[1]+e.b[1])/2],-Math.atan2(e.b[1]-e.a[1],e.b[0]-e.a[0]));
  for(const p of panels){const center=[p.center[0]-8,p.center[1],p.center[2]-8],m=box(root,p.id,p.size[0],p.size[1],p.size[2],...center,'facade',{form:'native-wall',role:'retaining-backbone',engineSource:'wallPanels',enginePin:ENGINE_PIN,panelId:p.id});m.rotation.y=p.yaw;nativePanels.push({...p,center});}
  // Thin authored facing blocks establish coursing without resizing the native core.
  for(let row=0;row<4;row++){
   const cuts=[-len/2,len/2];for(let x=-len/2+(row%2?.5:1);x<len/2-1e-8;x+=1)cuts.push(x);cuts.sort((a,b)=>a-b);
   for(let j=1;j<cuts.length;j++)box(g,e.id+'/course-'+row+'-'+j,cuts[j]-cuts[j-1]-.009,.489,.018,(cuts[j]+cuts[j-1])/2,row*.5+.25,-.087,'facade',{role:'custom-facing'});
  }
  box(g,e.id+'/toe',len,.13,.23,0,.065,0,'coping');
  // Three dark horizontal rails match the readable source close-up.
  const rail=type==='quay-rail'||type==='quay-pier'||type==='quay-outer-corner'||type==='quay-inner-corner'||(type==='quay-end-left'&&i===0)||(type==='quay-end-right'&&i===0);
  if(rail)for(const [j,h]of [.28,.62,1.055].entries())box(g,e.id+'/rail-'+j,len,.05,.05,0,Y+h,0,'rail',{role:'rail-bar'});
 }
 for(const [i,[x,z]]of r.cells.entries()){
  box(root,'floor-'+i,1,P.slab,1,x+.5,Y-P.slab/2,z+.5,'paving',{form:'native-slab',role:'floor',level:1,cell:[x,z]});floorTiles.push({id:'floor-'+i,cell:[x,z],level:1,top:Y});
 }
 // A raised coping protects the wall top; its .12 m ledge is explicit custom trim.
 if(type!=='promenade-slab'&&type!=='quay-stairs'){
  let poly=type==='quay-inner-corner'?[[.78,.78],[2,.78],[2,1.08],[1.08,1.08],[1.08,2],[.78,2]]:
   type==='quay-outer-corner'||type==='quay-end-left'?[[-.08,-.08],[1,-.08],[1,.23],[.23,.23],[.23,1],[-.08,1]]:
   type==='quay-end-right'?[[0,-.08],[1.08,-.08],[1.08,1],[.77,1],[.77,.23],[0,.23]]:[[0,-.08],[1,-.08],[1,.23],[0,.23]];
  const m=prism(root,'coping',poly,.12,0,Y+.06,0,'coping');m.userData.role='coping';
 }
 for(const [i,[x,z]]of r.posts.entries()){
  box(root,'post-'+i+'/foot',.42,.12,.42,x,Y+.18,z,'ornament');
  box(root,'post-'+i+'/shaft',.31,.76,.31,x,Y+.62,z,'ornament');
  box(root,'post-'+i+'/collar',.42,.10,.42,x,Y+1.05,z,'ornament');
  hip(root,'post-'+i+'/faceted-cap',.42,.42,.14,x,Y+1.10,z,'ornament');
  if(type==='quay-pier')for(let row=0;row<4;row++)box(root,'pier-face-'+row,.36,.42,.095,x,.25+row*.5,-.1375,'coping',{role:'rusticated-pier-facing'});
 }
 if(type==='quay-stairs'){
  const rise=Y/12,run=4/12;
  for(let i=0;i<12;i++){const top=(i+1)*rise,z=-4+(i+.5)*run,m=box(root,'stair/tread-'+i,2,top,run,1,top/2,z,'coping',{role:'stair-tread',step:i,top});treads.push({id:m.name,step:i,top,zStart:-4+i*run,zEnd:-4+(i+1)*run});}
  // Custom sloping handrails; landings remain clear across the full 2 m width.
  for(const x of [.10,1.90]){
   for(let i=0;i<=12;i++){const y=i*rise,z=-4+i*run;box(root,'stair/upright-'+x+'-'+i,.045,.92,.045,x,y+.46,z,'rail',{role:'stair-rail'});}
   for(const [j,h]of [.28,.9].entries()){
    const a=new T.Vector3(x,h,-4),b=new T.Vector3(x,Y+h,0),dir=b.clone().sub(a),m=box(root,'stair/sloping-rail-'+x+'-'+j,.055,dir.length(),.055,...a.clone().add(b).multiplyScalar(.5).toArray(),'rail',{role:'stair-rail'});m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());
   }
  }
 }
 const batched=f.finalize(root);root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);
 const metadata=freeze({assetId:'horticulture-waterfront',type,units:'metres',nativeProfile:P,anchor:'Tile front-left corner at native ground Y=0; default water is -Z and land +Z. Quarter-turns pivot about this grid vertex.',floorTiles,nativePanels,nativeMap,ports:r.ports,gridCells:r.cells,
  guardTop:type==='quay-straight'||type==='promenade-slab'||type==='quay-stairs'?null:Y+1.08,postTop:r.posts.length?Y+1.24:null,treads,
  source:'HWF-ARNOLD-43: C. D. Arnold / H. D. Higinbotham, 1893, plate43; source-derived appearance, not measured historic dimensions.',
  adaptations:['1 m cells and untouched Nautilus wallPanels output; deck at native level1 /2.12 m.','Rustication, coping and capped posts are explicit custom trim; dark horizontal railing is interpreted from the source close-up.','Corner, terminal and stair variants are reusable game adaptations; no exact historical stair or corner placement is claimed.','One full native retaining panel extends below the suggested preview water line; no water level or physics is imposed on consumers.'],
  physicalMaterial:{structure:'unassigned',finish:'unassigned',note:'The native map concrete token only validates geometry authoring. It does not choose simulation fuel, collision or historical construction.'},
  footprint:type==='quay-stairs'?[[[0,-4],[2,-4],[2,1],[0,1]]]:r.cells.map(([x,z])=>[[x,z],[x+1,z],[x+1,z+1],[x,z+1]]),passageIntent:type==='quay-stairs'?'Two-metre stair/landing opening; geometry only, traversal and collision unassigned.':'Promenade floor tiles; water edge remains closed by the retaining core and optional rail.',overhangBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},appearanceSlots:APPEARANCE_SLOTS,
  integration:'Reusable self-contained art candidate for the Horticultural Building shoreline and future Nautilus provider intake. Not registered in the fixed engine catalogue and no simulation, water, collision or traversal wiring is included.'});
 function setAppearance({materials:newMaterials={},textures:newTextures={}}={}){
  if(disposed)throw Error('Waterfront tile is disposed');
  for(const slot of [...Object.keys(newMaterials),...Object.keys(newTextures)])if(!APPEARANCE_SLOTS.includes(slot))throw Error('Unknown appearance slot '+slot);
  const old={materials:{...bindings.materials},textures:{...bindings.textures}},fresh={};Object.assign(bindings.materials,newMaterials);Object.assign(bindings.textures,newTextures);
  try{for(const slot of APPEARANCE_SLOTS)fresh[slot]=makeMaterial(slot);}catch(error){for(const m of Object.values(fresh)){m.dispose();ownedMaterials.delete(m);}bindings.materials=old.materials;bindings.textures=old.textures;throw error;}
  for(const m of f.meshes)m.material=fresh[m.userData.appearanceSlot];for(const slot of APPEARANCE_SLOTS){const prior=slots[slot];slots[slot]=fresh[slot];prior.dispose();ownedMaterials.delete(prior);}
 }
 root.position.fromArray(position);root.rotation.y=quarterTurns*Math.PI/2;root.updateMatrixWorld(true);
 function diagnostics(){return {disposed,type,meshes:disposed?0:f.meshes.length,triangles:disposed?0:f.meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3*(m.isInstancedMesh?m.count:1),0),nativeWalls:nativePanels.length,nativeSlabs:floorTiles.length,instanceBatches:disposed?0:batched.instances.length,sourceParts:batched.sourceParts,geometries:disposed?0:f.geometries.size,materials:ownedMaterials.size,borrowedTextures:new Set(Object.values(slots).map(m=>m.map).filter(Boolean)).size};}
 function dispose(){if(disposed)return;disposed=true;for(const i of batched.instances)i.dispose?.();for(const g of new Set(f.geometries.values()))g.dispose();for(const m of ownedMaterials)m.dispose();ownedMaterials.clear();root.clear();}
 return {root,bounds,metadata,diagnostics,setAppearance,dispose};
}
