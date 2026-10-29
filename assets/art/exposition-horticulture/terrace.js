import {createWaterfrontTile,APPEARANCE_SLOTS} from '../horticulture-waterfront/index.js';
import {BODY,inside} from './plan.js';
export {APPEARANCE_SLOTS as TERRACE_APPEARANCE_SLOTS};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const placements=[];
for(let x=-153;x<153;x++){
 if(x===-1){placements.push({type:'quay-stairs',position:[x,0,-18],quarterTurns:0});x++;continue;}
 const type=x===-153||x===152?'quay-outer-corner':x===-2?'quay-end-right':x===1?'quay-end-left':x%4===0?'quay-pier':'quay-rail';
 placements.push({type,position:[x===152?153:x,0,-18],quarterTurns:x===152?3:0});
}
for(let z=-17;z<0;z++){
 placements.push({type:z===-1?'quay-end-left':z%4===0?'quay-pier':'quay-rail',position:[-153,0,z+1],quarterTurns:1});
 placements.push({type:z===-1?'quay-end-right':z%4===0?'quay-pier':'quay-rail',position:[153,0,z],quarterTurns:3});
 for(let x=-152;x<152;x++)placements.push({type:'promenade-slab',position:[x,0,z],quarterTurns:0});
}
for(let x=-153;x<153;x++)for(let z=0;z<24;z++)if(!inside(x+.5,z+.5,BODY))placements.push({type:'promenade-slab',position:[x,0,z],quarterTurns:0});
export const TERRACE_LAYOUT=freeze(placements);
// Exact buffer equality keys allow the same unmodified shoreline recipe geometry
// to be shared across tile types. Prototype factories retain resource ownership.
function geometryKey(g){return JSON.stringify([Object.entries(g.attributes).map(([n,a])=>[n,a.itemSize,Array.from(a.array)]),g.index?Array.from(g.index.array):null]);}
export function createHorticultureTerrace(T,{materials={},textures={},quarterTurns=0,position=[0,0,0]}={}){
 if(!Number.isInteger(quarterTurns)||quarterTurns<0||quarterTurns>3)throw Error('quarterTurns must be 0..3');
 if(!Array.isArray(position)||position.length!==3||position.some(v=>!Number.isFinite(v))||!Number.isInteger(position[0])||!Number.isInteger(position[2])||Math.abs(position[1]/2.12-Math.round(position[1]/2.12))>1e-8)throw Error('Native tile placement requires integer X/Z and standard floor Y');
 for(const s of [...Object.keys(materials),...Object.keys(textures)])if(!APPEARANCE_SLOTS.includes(s))throw Error('Unknown appearance slot '+s);
 const root=new T.Group();root.name='exposition-horticulture/assembled-terrace';const prototypes=new Map(),batches=[],groups=new Map(),keys=new Map(),matrix=new T.Matrix4(),dummy=new T.Object3D();let closed=false,sourceParts=0,nativeSlabs=0;
 try{
  for(const type of new Set(TERRACE_LAYOUT.map(p=>p.type)))prototypes.set(type,createWaterfrontTile(T,{type,materials,textures}));
  for(const [tileIndex,p]of TERRACE_LAYOUT.entries()){
   const proto=prototypes.get(p.type);dummy.position.fromArray(p.position);dummy.rotation.set(0,p.quarterTurns*Math.PI/2,0);dummy.updateMatrix();
   proto.root.updateMatrixWorld(true);nativeSlabs+=proto.metadata.floorTiles.length;
   proto.root.traverse(o=>{if(!o.isMesh)return;let key=keys.get(o.geometry);if(!key){key=geometryKey(o.geometry);keys.set(o.geometry,key);}key=o.userData.appearanceSlot+'|'+key;
    if(!groups.has(key))groups.set(key,{geometry:o.geometry,source:o,slot:o.userData.appearanceSlot,parts:[],transforms:[]});const batch=groups.get(key);
    for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
     const local=o.matrixWorld.clone();if(o.isInstancedMesh){o.getMatrixAt(i,matrix);local.multiply(matrix);}
     const data=o.isInstancedMesh?o.userData.parts[i]:o.userData;
     batch.transforms.push(dummy.matrix.clone().multiply(local));batch.parts.push({...data,componentId:'terrace/'+tileIndex+'/'+data.componentId,tileIndex,tileType:p.type});sourceParts++;
    }
   });
  }
  for(const [i,b]of [...groups.values()].entries()){
   const mesh=new T.InstancedMesh(b.geometry,b.source.material,b.parts.length);mesh.name='terrace-batch-'+i;mesh.userData={appearanceSlot:b.slot,form:'waterfront-assembly',parts:b.parts};
   b.transforms.forEach((m,j)=>mesh.setMatrixAt(j,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);batches.push({mesh,source:b.source});
  }
 }catch(error){for(const b of batches)b.mesh.dispose();for(const p of prototypes.values())p.dispose();throw error;}
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),metadata=freeze({assetId:'exposition-horticulture-terrace',version:1,units:'metres',layout:TERRACE_LAYOUT,footprint:[[-153,-18],[153,-18],[153,0],[-153,0]],approachAprons:[[[-153,0],[-117,0],[-117,12],[-153,12]],[[-117,0],[-33,0],[-33,24],[-117,24]],[[33,0],[117,0],[117,24],[33,24]],[[117,0],[153,0],[153,12],[117,12]]],nativeSlabs,deckLevel:1,deckY:2.12,sourceFactory:'createWaterfrontTile',sourceModule:'../horticulture-waterfront/index.js',sourceCommit:'c6ddd51d7dd47a2ec148159e6a6d64a8d00bd2a9',appearanceSlots:APPEARANCE_SLOTS,anchor:'Same ground and central-front anchor as the building. Main deck rear edge meets Z=0, with native approach aprons filling the source-plan front setbacks; water faces -Z.',adaptations:['306 x18 m waterfront strip plus4896 square metres of approach aprons, regularly spaced piers and one central two-metre stair are game placement choices, not a measured historic site plan.','Only original native shoreline recipe parts are used; no stretch and no duplicated private recipe.','Water, bulk land fill, historical crowds/boats and collision/traversal are omitted.'],localBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
 function setAppearance({materials:newMaterials={},textures:newTextures={}}={}){
  if(closed)throw Error('Terrace is disposed');
  for(const s of [...Object.keys(newMaterials),...Object.keys(newTextures)])if(!APPEARANCE_SLOTS.includes(s))throw Error('Unknown appearance slot '+s);
  // Validate all borrowed inputs before touching any prototype, so invalid calls
  // cannot partially reskin a multi-prototype assembly.
  for(const [s,m]of Object.entries(newMaterials))if(m&&!m.isMaterial)throw Error('Expected Three material in '+s);
  for(const [s,t]of Object.entries(newTextures))if(t&&!t.isTexture)throw Error('Expected Three texture in '+s);
  for(const p of prototypes.values())p.setAppearance({materials:newMaterials,textures:newTextures});
  for(const b of batches)b.mesh.material=b.source.material;
 }
 root.position.fromArray(position);root.rotation.y=quarterTurns*Math.PI/2;root.updateMatrixWorld(true);
 function diagnostics(){return {disposed:closed,prototypes:closed?0:prototypes.size,drawMeshes:closed?0:batches.length,sourceParts,nativeSlabs,tiles:TERRACE_LAYOUT.length,triangles:closed?0:batches.reduce((n,{mesh:m})=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3*m.count,0),borrowedTextures:true};}
 function dispose(){if(closed)return;closed=true;root.removeFromParent();for(const b of batches)b.mesh.dispose();for(const p of prototypes.values())p.dispose();root.clear();}
 return {root,bounds,metadata,diagnostics,setAppearance,dispose};
}
