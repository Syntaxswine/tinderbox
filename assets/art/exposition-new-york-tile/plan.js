// Grid adaptation of the preserved TB-022 landmark, not an as-built survey.
// All structural wall runs have even integral metre lengths and integer endpoints.
// Each run is compiled into native 1 x 2 x .16 m cells at n * 2.12 m.
import {NATIVE_CONTRACT as S} from '../exposition-new-york/native-contract.js';
export const levelY=n=>Math.round(n*S.floorSpacing*1e6)/1e6;
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export const BODY_OUTLINE=freeze([[-24,0],[24,0],[24,28],[14,28],[14,32],[8,32],[8,34],[-8,34],[-8,32],[-14,32],[-14,28],[-24,28]]);
const rectangle=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
const lowerXs=[-21,-15,-10,-5,5,10,15,21];
const upperXs=lowerXs.filter(x=>Math.abs(x)>5);
const friezeXs=[-21,-15,-10,-5,0,5,10,15,21];
const window=(id,x,bottom,height=2.9,extra={})=>({id,kind:'window',x,bottom,width:2,height,...extra});
const storeyWindows=(id,xs)=>xs.flatMap((x,i)=>[
  window(id+'/lower-'+i,x,levelY(1)+.75,2.9,{awning:true}),
  window(id+'/upper-'+i,x,levelY(4)+.75,2.9,{awning:true,pediment:true})]);
const entry=id=>({id:id+'/entry',kind:'door',x:0,bottom:levelY(1),width:2,height:4.12,nativeLeaves:2});
const runs=[];
function outlineRuns(id,polygon,startLevel,endLevel,openings){
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const name=id+'/'+i;
    runs.push({id:name,a:[...a],b:[...b],length,heading:-Math.atan2(b[1]-a[1],b[0]-a[0]),startLevel,endLevel,openings:openings(i,length,name)});
  }
}
outlineRuns('main',BODY_OUTLINE,0,8,(i,len,id)=>{
  if(i===0)return [...lowerXs.map((x,j)=>window(id+'/lower-'+j,x,levelY(1)+.75,2.9,{awning:true})),...upperXs.map((x,j)=>window(id+'/upper-'+j,x,levelY(4)+.75,2.9,{pediment:true,awning:true})),...friezeXs.map((x,j)=>window(id+'/frieze-'+j,x,levelY(7)+.4,1.05)),entry(id)];
  if(i===1||i===11)return [...storeyWindows(id,[-10,-6,6,10]),...[-10,-6,0,6,10].map((x,j)=>window(id+'/frieze-'+j,x,levelY(7)+.4,1.05)),entry(id)];
  const n=Math.floor(len/4),xs=Array.from({length:n},(_,j)=>4*j-2*(n-1));
  return len>=6?storeyWindows(id,xs):[];
});
outlineRuns('clerestory',rectangle(-14,8,14,24),8,10,(i,len,id)=>i===0?[-10,-5,0,5,10].map((x,j)=>window(id+'/window-'+j,x,levelY(9)+.25,1.35)):[]);
for(const s of [-1,1])outlineRuns('tower-'+(s<0?'west':'east'),rectangle(s*10-3,13,s*10+3,19),10,15,(i,len,id)=>[{id:id+'/arch-opening',kind:'arcade',x:0,bottom:levelY(12),width:2,height:levelY(15)-.35-levelY(12)}]);
// Full planar slabs are tiled, rather than stretched boxes. Curved porch slabs
// are declared custom shapes but use the same .12 m slab and level elevations.
const floors=[...[[1,'main-floor'],[4,'upper-floor'],[7,'attic-floor'],[8,'main-roof-deck']].map(([level,id])=>({id,level,zone:'main',polygon:BODY_OUTLINE,form:'tiles'})),
  {id:'clerestory-roof-deck',level:10,zone:'clerestory',polygon:rectangle(-14,8,14,24),form:'tiles'},
  {id:'upper-terrace',level:11,zone:'terrace',polygon:rectangle(-7,13,7,19),form:'tiles'},
  {id:'front-landing',level:1,zone:'exterior',polygon:rectangle(-13,-4,13,0),form:'tiles'}];
for(const s of [-1,1]){
  const side=s<0?'west':'east';
  floors.push({id:'tower-'+side+'-balcony',level:11,zone:'tower-'+side,polygon:rectangle(s*10-3,12,s*10+3,19),form:'tiles'},
    {id:'tower-'+side+'-roof',level:15,zone:'tower-'+side,polygon:rectangle(s*10-3,13,s*10+3,19),form:'tiles'});
  const polygon=[[0,-8],...Array.from({length:41},(_,i)=>{const a=-Math.PI/2+i*Math.PI/40;return[1+8*Math.cos(a),8*Math.sin(a)];}),[0,8]].map(([x,z])=>[s*(24+x),14+s*z]);
  for(const level of [1,4])floors.push({id:'porch-'+side+'-'+level,level,zone:'porch-'+side,polygon,form:'curved-slab',exception:'Source-derived semicircular portico; custom perimeter, standard level and slab thickness.'});
}
export function insidePolygon(x,z,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function floorCells(floor){
  if(floor.form!=='tiles')return[];
  const xs=floor.polygon.map(p=>p[0]),zs=floor.polygon.map(p=>p[1]),cells=[];
  for(let x=Math.min(...xs);x<Math.max(...xs);x++)for(let z=Math.min(...zs);z<Math.max(...zs);z++)if(insidePolygon(x+.5,z+.5,floor.polygon))cells.push([x,z]);
  return cells;
}
const levels=Array.from({length:16},(_,index)=>({index,elevation:levelY(index),floors:floors.filter(f=>f.level===index).map(f=>f.id),
  main:index===0?'closed undercroft':({1:'main floor',4:'upper floor',7:'attic floor',8:'roof / clerestory base'}[index]||(index<8?'void: no slab':'above main roof')),
  clerestory:index===8?'base on main roof':index===9?'void: no slab':index===10?'roof deck':null,
  towers:index===10?'base on clerestory roof':index===11?'balcony floor':index>=12&&index<=14?'void: no slab':index===15?'roof deck':null}));
export const TILE_PLAN=freeze({version:1,units:'metres',grid:{tile:1,wallHeight:2,wallThickness:.16,slab:.12,floorPitch:2.12,origin:[0,0,0]},
  bodyOutline:BODY_OUTLINE,runs,floors,levels,
  tallRooms:[{zone:'main',fromLevel:1,toLevel:4,emptyLevels:[2,3],floorToFloor:6.36},{zone:'main',fromLevel:4,toLevel:7,emptyLevels:[5,6],floorToFloor:6.36},
    {zone:'clerestory',fromLevel:8,toLevel:10,emptyLevels:[9],floorToFloor:4.24},{zone:'towers',fromLevel:11,toLevel:15,emptyLevels:[12,13,14],floorToFloor:8.48}],
  exceptions:['Window/door cuts and lintels stay inside native wall-cell envelopes; native door leaves remain 1 x 1.65 x .12 m.',
    'Curved portico decks and columns are custom parts attached to standard levels, not curved structural wall runs.',
    'Roof slopes, arches, cornices, balustrades and visual stair treads are custom decorative geometry; roof/deck slabs remain on standard levels.'],
  integration:'Geometry and explicit tile/level recipe only; not a simulator save or gameplay collider. Runtime placement, interiors, collision and traversal remain coder-owned.'});
