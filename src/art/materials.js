
import {hash} from './resources.js';
export const PALETTE=Object.freeze({fur:0x705038,darkFur:0x493626,muzzle:0xb99168,
  canvas:0x425d51,shirt:0xd4c7a5,leather:0x41382b,brass:0xb3975c,steel:0x737972,
  grass:0x7b8566,paving:0xb5b29d,road:0x555e5d,plaster:0xd9c6a5,roof:0x6e4c3a,
  char:0x272722,gas:0x363c2a});
function canvasTexture(T,pool,base,size=128){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#'+base.toString(16).padStart(6,'0');ctx.fillRect(0,0,size,size);
  for(let i=0;i<300;i++){
    ctx.globalAlpha=.025+hash(i+8)*.07;ctx.fillStyle=i%2?'#f3dfb0':'#1b201a';
    ctx.save();ctx.translate(hash(i+1)*size,hash(i+2)*size);ctx.rotate((hash(i+3)-.5)*.7);
    ctx.fillRect(0,0,3+hash(i+4)*16,1+hash(i+5)*5);ctx.restore();
  }
  ctx.globalAlpha=1;const texture=pool.texture(new T.CanvasTexture(canvas));
  texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;return texture;
}
function crop(T,pool,texture,x,y,w,h){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const image=texture.image,ctx=canvas.getContext('2d');
  const inset=3;ctx.drawImage(image,x*image.width+inset,y*image.height+inset,w*image.width-inset*2,h*image.height-inset*2,0,0,256,256);
  const result=pool.texture(new T.CanvasTexture(canvas));result.colorSpace=T.SRGBColorSpace;
  result.wrapS=result.wrapT=T.RepeatWrapping;result.anisotropy=2;return result;
}
export function createMaterials(T,pool,assets){
  const result={};
  for(const [name,color]of Object.entries(PALETTE)){
    result[name]=pool.material(new T.MeshStandardMaterial({color:0xffffff,map:canvasTexture(T,pool,color),roughness:.96,flatShading:true}));
  }
  const atlas=assets.cargo,original=assets.materials;
  const surface=(image,x,y,w,h,tint=0xffffff)=>pool.material(new T.MeshStandardMaterial({color:tint,map:crop(T,pool,image,x,y,w,h),roughness:.94}));
  result.wood=surface(atlas,0,0,1/3,.5,0xd0b58c);
  result.creamWood=surface(atlas,1/3,0,1/3,.5,0xd6cdb1);
  result.oliveWood=surface(atlas,2/3,0,1/3,.5,0xa6ad8b);
  result.drum=surface(atlas,0,.5,1/3,.5,0xe77a52);
  result.blueDrum=surface(original,0,.5,.5,.5,0x8ca6a7);
  result.concrete=surface(original,.5,.5,.5,.5,0xc9c4ad);
  result.dark=pool.material(new T.MeshStandardMaterial({color:0x202724,roughness:.85}));
  result.eye=pool.material(new T.MeshStandardMaterial({color:0x171a16,roughness:.2}));
  result.ivory=pool.material(new T.MeshStandardMaterial({color:0xf3e7c6,roughness:.8}));
  result.glass=pool.material(new T.MeshStandardMaterial({color:0x638372,roughness:.3,metalness:.2}));
  const label=document.createElement('canvas');label.width=256;label.height=256;
  const ctx=label.getContext('2d');ctx.fillStyle='#d9cd9d';ctx.fillRect(12,12,232,232);
  ctx.strokeStyle='#452e23';ctx.lineWidth=10;ctx.strokeRect(19,19,218,218);
  ctx.save();ctx.translate(128,110);ctx.rotate(Math.PI/4);ctx.lineWidth=7;ctx.strokeRect(-48,-48,96,96);ctx.restore();
  ctx.fillStyle='#722e22';ctx.beginPath();ctx.moveTo(127,66);ctx.bezierCurveTo(151,109,157,116,145,137);ctx.bezierCurveTo(107,161,94,122,127,66);ctx.fill();
  ctx.fillStyle='#452e23';ctx.font='bold 24px monospace';ctx.textAlign='center';ctx.fillText('FUEL',128,207);
  const labelMap=pool.texture(new T.CanvasTexture(label));labelMap.colorSpace=T.SRGBColorSpace;
  result.hazard=pool.material(new T.MeshStandardMaterial({map:labelMap,transparent:true,roughness:1,polygonOffset:true,polygonOffsetFactor:-1}));
  return result;
}
