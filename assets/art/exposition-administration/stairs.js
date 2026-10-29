// New reusable art form; landings use Nautilus levels. Traversal is consumer-owned.
import {PROFILE as S,levelY} from './engine.js';
export function createSpiralStairs(forms,parent,{id,x,z,heading,fromLevel=1,toLevel=7}){
 if(![fromLevel,toLevel].every(Number.isInteger)||toLevel<=fromLevel||(toLevel-fromLevel)%2)throw Error('Spiral stairs connect pairs of native levels.');
 const {group,prism,cylinder,box}=forms,root=group(parent,'spiral-'+id,[x,0,z],0,{role:'custom-stair',source:'Hunt circular-stair motif; native-level interpretation'}),stepAngle=Math.PI/12,rise=S.floorSpacing/12,steps=(toLevel-fromLevel)*12;
 const points=[[1.3,0],[3.4,0],[3.4*Math.cos(stepAngle),3.4*Math.sin(stepAngle)],[1.3*Math.cos(stepAngle),1.3*Math.sin(stepAngle)]];
 for(let i=0;i<steps;i++){
  const angle=heading+(i+1)*stepAngle,base=levelY(fromLevel)+(i+1)*rise,g=group(root,'spiral-'+id+'/step-'+i,[0,0,0],-heading-i*stepAngle);
  const mesh=prism(g,'spiral-'+id+'/tread-'+i,points,S.slab,0,base-S.slab/2,0,'trim');Object.assign(mesh.userData,{role:'stair-tread',fromLevel,toLevel,step:i,top:base});
  const px=3.25*Math.cos(angle),pz=3.25*Math.sin(angle);cylinder(root,'spiral-'+id+'/post-'+i,.035,.035,.95,px,base+.475,pz,'door',6);
  const before=heading+i*stepAngle,a=[3.25*Math.cos(before),3.25*Math.sin(before)],b=[px,pz],len=Math.hypot(b[0]-a[0],b[1]-a[1]),handrail=box(root,'spiral-'+id+'/handrail-'+i,len,.09,.1,(a[0]+b[0])/2,base+.95,(a[1]+b[1])/2,'door');handrail.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);
 }
 cylinder(root,'spiral-'+id+'/centre-column',.22,.28,levelY(toLevel)-levelY(fromLevel),0,(levelY(fromLevel)+levelY(toLevel))/2,0,'trim',12);
 return {id,centre:[x,z],fromLevel,toLevel,fromY:levelY(fromLevel),toY:levelY(toLevel),landingLevels:Array.from({length:(toLevel-fromLevel)/2+1},(_,i)=>fromLevel+i*2),steps,rise,outerRadius:3.4,innerRadius:1.3,interpretation:'Three full turns connect the four pavilion floor plates. Treads and handrails are custom art; no navigation/collision promise.'};
}
