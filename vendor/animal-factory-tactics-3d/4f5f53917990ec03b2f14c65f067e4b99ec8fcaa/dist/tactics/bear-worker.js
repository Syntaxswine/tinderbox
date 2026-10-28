import * as T from './vendor/three.module.js';
import {createLightHorse} from './horse-light-model.js';
export const BEAR_PAINT='../assets/characters/lowpoly-proof/bear-worker-model-paint-v1.png';
export const BEAR_RED_HAT_PAINT='../assets/characters/lowpoly-proof/bear-red-hat-model-paint-v1.png';
export const BEAR_PAINT_FRAME={width:1.18,height:2.36,centerY:.84,distance:4,near:.1,far:10};
export const BEAR_PROFILE={id:'bear',label:'Bear worker',file:'bear-10k-data.json',create:createBearWorker,paint:BEAR_PAINT,outfitPaints:{normal:BEAR_PAINT,'red-hats':BEAR_RED_HAT_PAINT},frame:BEAR_PAINT_FRAME,redHatFit:{center:[-.015,1.625,0],scale:[.91,.67,.85]},eye:[.079,1.515,.107],kneelDrop:.3706,headPitch:-.895088,headYaw:21.581895,headPitchSlope:1.430087,proneAim:{stock:[.025,.03,.065],torsoFollow:.9,tuckHem:true,pastern:true}};
export function createBearWorker(data,texture=null){
 const worker=createLightHorse(data,texture),colors=[0xddd0ac,0x626c38,0x6b3f25,0x5a3825,0x6b3f25,0x5a3825,0x74452a,0x5a3825],materials=worker.parts.map((p,i)=>new T.MeshStandardMaterial({color:colors[i],roughness:.92}));
 // The wider torso must not acquire sleeve weights merely by crossing the
 // horse's absolute Z threshold. Recover its source garment coordinate while
 // retaining the layer fitter's head weights at the neckline.
 const shirt=worker.parts[0].geometry.attributes,bones=Object.fromEntries(worker.bones.map((b,i)=>[b.name,i])),smooth=T.MathUtils.smoothstep;
 for(let i=0;i<shirt.position.count;i++){
  let head=0;for(let k=0;k<4;k++)if(shirt.skinIndex.getComponent(i,k)===bones.head)head+=shirt.skinWeight.getComponent(i,k);if(head>0)continue;
  const y=shirt.position.getY(i),z=shirt.position.getZ(i),side=z<0?-1:1;let sourceZ=Math.abs(z);
  for(let j=0;j<8;j++)sourceZ=Math.abs(z)-.055*smooth(sourceZ,.07,.29);
  const sleeve=Math.max(smooth(sourceZ,.16,.255),smooth(sourceZ,.20,.25)*(1-smooth(y,1.03,1.11))),elbow=1-smooth(y,.98,1.06);
  shirt.skinIndex.setXYZW(i,bones.spine,bones['upperArm'+side],bones['forearm'+side],0);shirt.skinWeight.setXYZW(i,1-sleeve,sleeve*(1-elbow),sleeve*elbow,0);
 }
 shirt.skinIndex.needsUpdate=shirt.skinWeight.needsUpdate=true;
 const equip=worker.equipWeapon,fits={hmg:[.29,.95,.055],rpg:[.19,1.20,.11]};let fitted=null,originalCarry,installedCarry;
 function restoreCarry(){if(fitted&&fitted.carry===installedCarry)fitted.carry=originalCarry;fitted=null;}
 // Lift the low machine-gun grip and center the RPG for the wider shoulders.
 // Keep both native hand anchors and restore the borrowed prop on release.
 worker.equipWeapon=asset=>{restoreCarry();if(asset&&fits[asset.id]){fitted=asset;originalCarry=asset.carry;installedCarry={...asset.carry,position:[...fits[asset.id]]};asset.carry=installedCarry;}equip(asset);};
 worker.setGrey=value=>worker.parts.forEach((p,i)=>p.material=value?worker.grey:materials[i]);worker.setGrey(false);
 const dispose=worker.dispose;worker.dispose=()=>{restoreCarry();materials.forEach(m=>m.dispose());worker.skeleton.dispose();dispose();};return worker;
}
