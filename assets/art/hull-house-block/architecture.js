import {createWindowBayModel} from '../../../vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/window-kit/three.js';

export const SLOT_COLOURS = Object.freeze({
 wood0:0x94765a,wood1:0x738073,wood2:0xad9776,wood3:0x876352,wood4:0x7b7965,
 brick:0x87503e,trim:0xc9b58d,sash:0x6b8070,glass:0x506d62,glassLit:0x997244,
 iron:0x353832,floor:0x69513a,roof:0x544c40,yard:0x66533d,road:0x4e4c3e,sidewalk:0x8b7e63,
 clothRed:0x9d4534,clothCream:0xddc99c,clothBlue:0x3b5661,sign:0xd6c19a,ink:0x3a483f});
export function createPalette(T,borrowed={},textures={}){
 const owned=[],slots={};
 try{
  for(const [slot,color]of Object.entries(SLOT_COLOURS)){
   const input=borrowed[slot],texture=textures[slot];if(input&&!input.isMaterial)throw Error('Invalid borrowed material '+slot);if(texture&&!texture.isTexture)throw Error('Invalid borrowed texture '+slot);
   const m=input?input.clone():new T.MeshStandardMaterial({color,roughness:slot.startsWith('glass')?.24:slot==='iron'?.65:.92,metalness:slot==='iron'?.22:slot.startsWith('glass')?.08:0});
   m.name='Hull block / '+slot;m.vertexColors=true;m.side=T.DoubleSide;
   if(Object.hasOwn(textures,slot))m.map=texture;
   if(slot==='glassLit'){m.emissive?.setHex(0xb98542);m.emissiveIntensity=.36;}
   if(slot==='glass'){m.emissive?.setHex(0x29443a);m.emissiveIntensity=.04;}
   const prior=input?.onBeforeCompile||m.onBeforeCompile,key=(input||m).customProgramCacheKey.call(input||m),kind=slot.startsWith('wood')?'wood':slot==='brick'?'brick':slot==='roof'?'roof':slot==='road'||slot==='sidewalk'?'paving':'plain';
   m.onBeforeCompile=(s,r)=>{prior?.call(m,s,r);s.vertexShader='varying vec3 hullPosition;\nvarying vec2 hullUV;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nhullPosition=position;hullUV=uv;');
    s.fragmentShader='varying vec3 hullPosition;\nvarying vec2 hullUV;\n'+s.fragmentShader;
    let shade='float pore=fract(sin(dot(floor(hullPosition*130.0),vec3(127.1,311.7,74.7)))*43758.54);diffuseColor.rgb*=.95+.05*pore;';
    if(kind==='wood')shade+='float lap=step(.92,fract(hullPosition.y/.14));float grain=sin(hullPosition.y*310.0+sin(hullPosition.x*8.0+hullPosition.z*7.0)*3.0);diffuseColor.rgb*=(1.0-.24*lap)*(.96+.04*grain);';
    if(kind==='brick')shade+='float row=floor(hullUV.y/.075);vec2 brickUV=vec2(fract(hullUV.x/.23+mod(row,2.0)*.5),fract(hullUV.y/.075));float joint=max(step(.94,brickUV.x),step(.86,brickUV.y));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.36,joint*.55);';
    if(kind==='roof')shade+='vec2 sh=vec2(fract(hullUV.x/.25+mod(floor(hullUV.y/.36),2.0)*.17),fract(hullUV.y/.36));diffuseColor.rgb*=1.0-.25*max(step(.98,sh.x),step(.93,sh.y));';
    if(kind==='paving')shade+='vec2 st=vec2(fract(hullUV.x/.30+mod(floor(hullUV.y/.19),2.0)*.5),fract(hullUV.y/.19));diffuseColor.rgb*=1.0-.27*max(step(.94,st.x),step(.9,st.y));';
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+shade);
   };
   m.customProgramCacheKey=()=>key+'/hull-material-v1/'+kind;slots[slot]=m;owned.push(m);
  }
  return {slots,owned,dispose(){for(const m of owned)m.dispose();}};
 }catch(e){for(const m of owned)m.dispose();throw e;}
}
export function nativeWindowTemplates(T,palette){
 const model=createWindowBayModel(T,'window-bay-period',{wall:'wood',materials:{wall:palette.wood0,trim:palette.trim,sash:palette.sash,glass:palette.glass,brass:palette.iron}}),grouped=new Map(),result=new Map();
 try{
  model.root.traverse(o=>{if(o.isMesh){const slot={wall:'wall',trim:'trim',sash:'sash',glass:'glass',brass:'iron'}[o.userData.material];if(!grouped.has(slot))grouped.set(slot,[]);grouped.get(slot).push(o.geometry);}});
  for(const [slot,gs]of grouped){
   const g=new T.BufferGeometry();
   for(const [key,size]of [['position',3],['normal',3],['uv',2]]){
    const arr=new Float32Array(gs.reduce((n,v)=>n+v.attributes[key].array.length,0));let offset=0;for(const a of gs){arr.set(a.attributes[key].array,offset);offset+=a.attributes[key].array.length;}g.setAttribute(key,new T.BufferAttribute(arr,size));
   }
   g.computeBoundingBox();g.computeBoundingSphere();result.set(slot,g);
  }
  return {geometries:result,profile:model.sculpture,dispose(){for(const g of result.values())g.dispose();result.clear();}};
 }finally{model.dispose();}
}
export function instanceSlabs(T,parent,cells,y,material,geometry,name,diagnostics){
 const mesh=new T.InstancedMesh(geometry,material,cells.length),m=new T.Matrix4();
 for(let i=0;i<cells.length;i++){const [x,z]=cells[i];mesh.setMatrixAt(i,m.makeTranslation(x+.5,y-.06,z+.5));}
 mesh.instanceMatrix.needsUpdate=true;mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.nativeSlab={width:1,height:.12,depth:1,top:y,cells:cells.length};mesh.computeBoundingBox();mesh.computeBoundingSphere();parent.add(mesh);diagnostics.push(mesh);return mesh;
}
export function measuredBounds(T,root){
 root.updateMatrixWorld(true);const result=new T.Box3(),v=new T.Vector3(),matrix=new T.Matrix4();
 root.traverseVisible(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;
  if(o.isInstancedMesh){for(let j=0;j<o.count;j++){o.getMatrixAt(j,matrix);matrix.premultiply(o.matrixWorld);for(let i=0;i<p.count;i++)result.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(matrix));}}
  else for(let i=0;i<p.count;i++)result.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));
 });
 return result.isEmpty()?null:{min:result.min.toArray(),max:result.max.toArray()};
}
