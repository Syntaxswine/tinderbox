import {bindTankPresentation,TANK_DESTRUCTION} from './tank-state.js';
export {TANK_DESTRUCTION} from './tank-state.js';
import {createForms} from '../exposition-new-york/forms.js';
import {compilePartitions, NATIVE, ENGINE_PIN, levelY} from './engine.js';
import {PROP_CATALOGUE, getPropSpec} from './catalogue.js';
import {buildProp} from './props.js';
import {INTERIOR_PLANS} from './plans.js';
export {PROP_CATALOGUE, getPropSpec};
export const APPEARANCE_SLOTS=Object.freeze(['facade','ivory','trim','wood','woodDark','brass','velvet','linen','iron','glass','water','stone','foliage','soil','fruit','paper','ink','red','ochre']);
const COLORS={facade:0xe5cfb2,ivory:0xf0e1c4,trim:0xe8d7ae,wood:0x805b39,woodDark:0x463529,brass:0xb18a48,velvet:0x79483d,linen:0xede2c8,iron:0x494a42,glass:0x769982,water:0x427367,stone:0x927f65,foliage:0x4d6a3d,soil:0x493b2b,fruit:0xcc8c36,paper:0xe5d5af,ink:0x282b25,red:0xa6533b,ochre:0xc5a169};
export const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function getInteriorPlan(venueId){const p=INTERIOR_PLANS[venueId];if(!p)throw Error('Unknown interior venue '+venueId);return p;}
const intersects=(a,b)=>!b||a.min.every((v,i)=>v<=b.max[i]&&a.max[i]>=b.min[i]);
function transformedBounds(size,position,yaw=0){const [w,h,d]=size,c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw)),x=(w*c+d*s)/2,z=(w*s+d*c)/2;return{min:[position[0]-x,position[1],position[2]-z],max:[position[0]+x,position[1]+h,position[2]+z]};}
function propBounds(spec,position,yaw=0){const b=spec.bounds||{min:[-spec.size[0]/2,0,-spec.size[2]/2],max:[spec.size[0]/2,spec.size[1],spec.size[2]/2]},out={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},c=Math.cos(yaw),s=Math.sin(yaw);for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]]){const v=[position[0]+x*c+z*s,position[1]+y,position[2]-x*s+z*c];v.forEach((n,i)=>{out.min[i]=Math.min(out.min[i],n)-1e-7;out.max[i]=Math.max(out.max[i],n)+1e-7;});}return out;}
function validateBounds(b){if(b&&(!['min','max'].every(k=>Array.isArray(b[k])&&b[k].length===3&&b[k].every(Number.isFinite))||b.min.some((v,i)=>v>b.max[i])))throw Error('sectionBounds requires finite ordered min/max metre triples');}
function kit(T,{materials={},textures={}}){
 for(const slot of [...Object.keys(materials),...Object.keys(textures)])if(!APPEARANCE_SLOTS.includes(slot))throw Error('Unknown interior appearance slot '+slot);
 for(const slot of APPEARANCE_SLOTS){if(materials[slot]&&!materials[slot].isMaterial)throw Error('Expected material in '+slot);if(textures[slot]&&!textures[slot].isTexture)throw Error('Expected texture in '+slot);}
 const root=new T.Group(),owned=new Map(),slots={};const cleanup=[];let disposed=false,assembly;
 function material(slot){if(owned.has(slot))return owned.get(slot);const source=materials[slot],glass=slot==='glass',water=slot==='water';
  const m=source?source.clone():new T.MeshStandardMaterial({color:COLORS[slot],roughness:glass?.3:water?.23:slot==='brass'?.6:.9,metalness:slot==='brass'?.25:0,side:slot==='foliage'||glass?T.DoubleSide:T.FrontSide,transparent:glass||water,opacity:glass?.22:water?.42:1,depthWrite:!glass&&!water});
  if(Object.hasOwn(textures,slot))m.map=textures[slot];const prior=source?.onBeforeCompile,key=source?.customProgramCacheKey?.call(source)||'default';
  m.onBeforeCompile=(shader,renderer)=>{prior?.call(m,shader,renderer);if(!shader.vertexShader.includes('attribute vec2 grossUV;'))shader.vertexShader='attribute vec2 grossUV;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv=(mapTransform*vec3(grossUV,1.0)).xy;\n#endif');};
  m.customProgramCacheKey=()=>key+'/landmark-interior-metre-uv-v1';m.name='Interior / '+slot;owned.set(slot,m);return m;
 }
 for(const slot of APPEARANCE_SLOTS)Object.defineProperty(slots,slot,{get:()=>material(slot)});
 const f=createForms(T,slots);f.interiorMaterials=slots;
 function finish(){assembly=f.finalize(root);for(const m of f.meshes)if(m.material.transparent)m.castShadow=false;return assembly;}
 function dispose(){if(disposed)return;disposed=true;cleanup.splice(0).forEach(fn=>fn());root.removeFromParent();for(const i of assembly?.instances||[])i.dispose();if(assembly)assembly.instances.length=0;for(const g of new Set(f.geometries.values()))g.dispose();for(const m of owned.values())m.dispose();root.clear();f.geometries.clear();f.meshes.length=0;f.components.length=0;f.columns.length=0;owned.clear();}
 const diagnostics=()=>({disposed,meshes:f.meshes.length,geometries:f.geometries.size,materials:owned.size,ownedTextures:0,instances:assembly?.instances.length||0,sourceParts:assembly?.sourceParts||0,triangles:f.meshes.reduce((n,m)=>n+(m.visible?(m.geometry.index?.count||m.geometry.attributes.position.count)/3*(m.isInstancedMesh?m.count:1):0),0)});
 return{root,f,finish,dispose,diagnostics,onDispose:fn=>cleanup.push(fn)};
}
function stampProp(root,record,spec){root.traverse(o=>{if(o.isMesh)Object.assign(o.userData,{propId:record.id,assetId:spec.id,role:spec.attachment==='ceiling'?'ceiling-decoration':'furnishing',level:record.level,roomId:record.roomId,attachment:spec.attachment,blocking:o.userData.blocking??spec.blocking,sourceIds:spec.sourceIds,...(spec.destruction?{damageTargetId:record.id,visualState:o.userData.visualState||'common'}:{})});});}
export function createInteriorProp(T,{assetId,materials={},textures={},destroyed=false}={}){
 const spec=getPropSpec(assetId);if(typeof destroyed!=='boolean'||(destroyed&&!spec.destruction))throw Error('Destroyed state requires an aquarium tank');const k=kit(T,{materials,textures});k.root.name='interior-prop/'+assetId;
 try{const p=buildProp(T,k.f,k.root,assetId,assetId);stampProp(p,{id:assetId,level:0,roomId:null},spec);const assembly=k.finish(),bounds=new T.Box3(),presentation=bindTankPresentation(T,{root:k.root,meshes:k.f.meshes,assembly,targets:spec.destruction?[{id:assetId,assetId}]:[],destroyedIds:destroyed?[assetId]:[],onChange:()=>{k.root.updateMatrixWorld(true);bounds.setFromObject(k.root);},onDispose:k.onDispose});bounds.setFromObject(k.root);const metadata=freeze({assetId,version:1,units:'metres',nativeContract:NATIVE,spec,damageTargets:presentation.targets,destructionPolicy:spec.destruction?TANK_DESTRUCTION:null,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},sourceParts:assembly.sourceParts,ownership:'Generated geometry and cloned/default materials owned; host namespace, textures/maps and input materials borrowed.'});k.root.userData={assetId,metadata};return{root:k.root,bounds,metadata,setTankDestroyed:presentation.setTankDestroyed,getTankState:presentation.getTankState,dispose:k.dispose,diagnostics:k.diagnostics};}catch(e){k.dispose();throw e;}
}
export function createVenueInterior(T,{venueId,materials={},textures={},levels,sectionBounds,includeCeilings=true,position=[0,0,0],quarterTurns=0,destroyedTankIds=[]}={}){
 const plan=getInteriorPlan(venueId);validateBounds(sectionBounds);
 if(levels!==undefined&&(!Array.isArray(levels)||levels.some(l=>!plan.occupiedLevels.includes(l))))throw Error('Choose occupied native interior levels');
 if(!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite)||!Number.isInteger(position[0])||!Number.isInteger(position[2])||Math.abs(position[1]/2.12-Math.round(position[1]/2.12))>1e-6||!Number.isInteger(quarterTurns)||quarterTurns<0||quarterTurns>3)throw Error('Place at integer X/Z metres, native Y level and quarterTurns 0..3');
 const selectedLevel=l=>levels===undefined||levels.includes(l),k=kit(T,{materials,textures}),{root,f}=k;root.name='landmark-interior/'+venueId;
 const selectedProps=[],selectedRuns=[],nativePieces=[],openingFrames=[];
 try{
  const runs=plan.walls.filter(r=>selectedLevel(r.floorLevel)),compiled=compilePartitions(runs),runMap=new Map(runs.map(r=>[r.id,r])),groups=new Map();
  function wallGroup(r){if(groups.has(r.id))return groups.get(r.id);const a=r.a,b=r.b,p=[(a[0]+b[0])/2,0,(a[1]+b[1])/2],yaw=-Math.atan2(b[1]-a[1],b[0]-a[0]),g=f.group(root,'partition/'+r.id,p,yaw);groups.set(r.id,g);selectedRuns.push(r.id);return g;}
  function fragment(r,p,bottom,top,seam){
   const len=Math.hypot(r.b[0]-r.a[0],r.b[1]-r.a[1]),ux=(r.b[0]-r.a[0])/len,uz=(r.b[1]-r.a[1])/len,mid=[(r.a[0]+r.b[0])/2,(r.a[1]+r.b[1])/2],x=(p.center[0]-mid[0])*ux+(p.center[2]-mid[1])*uz;
   const left=x-.5,right=x+.5,holes=r.openings.map(h=>({...h,bottom:levelY(r.startLevel)+(h.bottom||0)}));
   const xs=[...new Set([left,right,...holes.flatMap(h=>[h.x-h.width/2,h.x+h.width/2]).filter(v=>v>left+1e-7&&v<right-1e-7)])].sort((a,b)=>a-b);
   const ys=[...new Set([bottom,top,...holes.flatMap(h=>[h.bottom,h.bottom+h.height]).filter(v=>v>bottom+1e-7&&v<top-1e-7)])].sort((a,b)=>a-b);
   for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){const a=xs[i-1],b=xs[i],c=ys[j-1],d=ys[j],cx=(a+b)/2,cy=(c+d)/2;if(holes.some(h=>cx>h.x-h.width/2-1e-7&&cx<h.x+h.width/2+1e-7&&cy>h.bottom-1e-7&&cy<h.bottom+h.height+1e-7))continue;
    const w=Math.abs(b-a-1)<1e-6?1:b-a,h=Math.abs(d-c-2)<1e-6?2:d-c,bounds=transformedBounds([w,h,.34],[mid[0]+cx*ux,c,mid[1]+cx*uz],-Math.atan2(uz,ux));if(!intersects(bounds,sectionBounds))continue;
    const id=r.id+'/'+p.level+'/'+p.id.split(':').at(-1)+'/'+i+'-'+j+(seam?'-seam':''),native=!seam&&w===1&&h===2,group=wallGroup(r),slot=r.finish==='pompeian'?'red':r.finish==='oak'?'wood':r.finish==='ochre'?'ochre':'facade';
    f.box(group,id,w,h,.16,cx,cy,0,slot,{form:native?'native-wall':seam?'level-closure':'aperture-cut',role:'interior-partition',runId:r.id,level:p.level,floorLevel:r.floorLevel,enginePin:ENGINE_PIN,sourcePanel:p.id});
    nativePieces.push({id,runId:r.id,level:p.level,localX:cx,bottom:c,width:w,height:h,native,seam});
    if(!seam&&native)for(const sign of [-1,1]){
     const z=sign*.094;f.box(group,id+'/panel-'+sign,.76,1.54,.024,cx,cy,z,'trim',{role:'partition-finish',runId:r.id,level:p.level,floorLevel:r.floorLevel});
     f.box(group,id+'/panel-inset-'+sign,.69,1.46,.027,cx,cy,sign*.110,slot,{role:'partition-finish',runId:r.id,level:p.level,floorLevel:r.floorLevel});
     if(p.level===r.startLevel)f.box(group,id+'/skirting-'+sign,1,.13,.05,cx,c+.065,sign*.105,'woodDark',{role:'partition-finish',runId:r.id,level:p.level,floorLevel:r.floorLevel});
    }
   }
  }
  for(const p of compiled.panels){const r=runMap.get(p.runId),bottom=levelY(p.level);fragment(r,p,bottom,bottom+2,false);if(p.level+1<r.endLevel)fragment(r,p,bottom+2,levelY(p.level+1),true);}
  for(const r of runs){const len=Math.hypot(r.b[0]-r.a[0],r.b[1]-r.a[1]),ux=(r.b[0]-r.a[0])/len,uz=(r.b[1]-r.a[1])/len,m=[(r.a[0]+r.b[0])/2,(r.a[1]+r.b[1])/2],yaw=-Math.atan2(uz,ux);
   for(const h of r.openings){const base=levelY(r.startLevel)+(h.bottom||0),bounds=transformedBounds([h.width+.4,h.height+.25,.34],[m[0]+h.x*ux,base,m[1]+h.x*uz],yaw);if(!intersects(bounds,sectionBounds))continue;const g=wallGroup(r);
    for(const sign of [-1,1])f.box(g,h.id+'/jamb-'+sign,.14,h.height,.30,h.x+sign*(h.width/2+.07),base+h.height/2,0,'woodDark',{role:'interior-opening-frame',openingId:h.id,runId:r.id,level:r.startLevel,floorLevel:r.floorLevel});
    f.box(g,h.id+'/header',h.width+.35,.16,.32,h.x,base+h.height+.08,0,'woodDark',{role:'interior-opening-frame',openingId:h.id,runId:r.id,level:r.startLevel,floorLevel:r.floorLevel});openingFrames.push(h.id);
   }
  }
  for(const p of plan.props){const spec=getPropSpec(p.assetId);if(!selectedLevel(p.level)||(!includeCeilings&&spec.attachment==='ceiling'))continue;const y=levelY(p.level)+(p.yOffset||0),pos=[p.x,y,p.z],bounds=propBounds(spec,pos,p.yaw||0);if(spec.destruction)for(const i of [0,2]){bounds.min[i]-=TANK_DESTRUCTION.selectionPaddingMetres;bounds.max[i]+=TANK_DESTRUCTION.selectionPaddingMetres;}if(!intersects(bounds,sectionBounds))continue;
   const g=buildProp(T,f,root,p.id,p.assetId,{labelText:p.labelText});g.position.set(...pos);g.rotation.y=p.yaw||0;stampProp(g,p,spec);selectedProps.push(p.id);
  }
  const assembly=k.finish(),bounds=new T.Box3(),presentation=bindTankPresentation(T,{root,meshes:f.meshes,assembly,targets:plan.props.filter(p=>selectedProps.includes(p.id)&&getPropSpec(p.assetId).destruction).map(({id,assetId})=>({id,assetId})),destroyedIds:destroyedTankIds,onChange:()=>{root.updateMatrixWorld(true);bounds.setFromObject(root);},onDispose:k.onDispose});root.position.set(...position);root.rotation.y=quarterTurns*Math.PI/2;root.updateMatrixWorld(true);bounds.setFromObject(root);const metadata=freeze({version:1,venueId,units:'metres',nativeContract:NATIVE,enginePin:ENGINE_PIN,sourcePins:plan.sourcePins,planId:plan.id,sectionBounds:sectionBounds?structuredClone(sectionBounds):null,levels:levels?[...levels]:plan.occupiedLevels,selectedRunIds:selectedRuns,selectedPropIds:selectedProps,openingFrames,nativePieces,damageTargets:presentation.targets,destructionPolicy:presentation.targets.length?TANK_DESTRUCTION:null,construction:{...k.diagnostics(),nativeWalls:nativePieces.filter(p=>p.native).length,cutWalls:nativePieces.filter(p=>!p.native&&!p.seam).length},bounds:bounds.isEmpty()?null:{min:bounds.min.toArray(),max:bounds.max.toArray()},sourcePlan:plan,ownership:'Generated geometry, cloned/default materials and instance buffers owned; input materials/maps/textures and host namespace borrowed.'});root.userData={assetId:plan.id,metadata};return{root,bounds,metadata,setTankDestroyed:presentation.setTankDestroyed,getTankState:presentation.getTankState,dispose:k.dispose,diagnostics:k.diagnostics};
 }catch(e){k.dispose();throw e;}
}
