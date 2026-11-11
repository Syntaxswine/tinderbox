import {housingSectionGrid} from '../content/housing-sections.js';
import {compileFloorSupport} from '../content/housing-floors.js';
import {HOUSING_PLANS} from '../content/housing-plans.js';
import {surfaceSite, surfaceTravel} from './surface-fire.js';

// Native Ashland coordinates and opening links from the cottage replay.
// The live graph uses one roof support column per footprint tile.
export const WIDTH=6, DEPTH=7, UPPER=2.12, EAVE=4.20, RIDGE=5.64, RIM=.08, OVERHANG=.25;
export const PITCH=(RIDGE-EAVE)/(WIDTH/2+OVERHANG);
export const roofHeight=x=>RIDGE-PITCH*Math.abs(x-WIDTH/2);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const tileIndex=(x,z)=>clamp(Math.floor(z),0,DEPTH-1)*WIDTH+clamp(Math.floor(x),0,WIDTH-1);
export const roofNormal=x=>({nx:Math.sign(x-WIDTH/2)*PITCH/Math.hypot(1,PITCH),ny:1/Math.hypot(1,PITCH),nz:0});
export const makeTiles=()=>Array.from({length:WIDTH*DEPTH},(_,index)=>({index,x:index%WIDTH,z:Math.floor(index/WIDTH),roof:true,upper:true,lower:true,ash:0}));
const upperDoors=new Set(['3/4','5/11','15/16','20/26','33/34','39/40']);
const room=(x,z)=>x<4?(z<4?'parlor':'kitchen'):z===0?'hall':z<4?'bed-a':z<6?'bed-b':'pantry';
const wallId=(side,col,band)=>side+':'+col+','+band;
const fuel=Object.fromEntries(Object.entries({walls:16,roof:11,upper:11,lower:10}).map(([layer,seconds])=>
  [layer,{material:'wood',seconds,threshold:1,cooling:.075,limit:2.5}]));
function edgeSeconds(a,b,wa,wb){
  if(a.layer==='upper'&&b.layer==='upper')return 1.1+(room(a.tile%WIDTH,Math.floor(a.tile/WIDTH))!==room(b.tile%WIDTH,Math.floor(b.tile/WIDTH))?.22:0);
  if(a.layer==='lower'&&b.layer==='lower')return 1.16+((a.tile<18)!==(b.tile<18)?.30:0);
  const eave=(a.layer==='walls')!==(b.layer==='walls'),corner=a.layer==='walls'&&b.layer==='walls'&&a.face!==b.face;
  const ridge=a.layer==='roof'&&b.layer==='roof'&&a.face!==b.face;
  return surfaceTravel(a,b,wa,wb,{eave,corner,length:ridge?Math.hypot(b.x-a.x,2*(RIDGE-a.y)):undefined});
}

export function createCottageTopology(origin,sampleWind){
  const sites=[],byId=new Map(),winds=new Map(),walls=[];
  const grid=housingSectionGrid(origin.prefabId,1),plan=HOUSING_PLANS[origin.prefabId];
  const floors={upper:compileFloorSupport(plan,0,grid),lower:compileFloorSupport(plan,-1,grid)};
  const add=(id,face,layer,tile,x,y,z,nx,ny,nz,floor)=>{
    const geometry={id,face,layer,tile,x,y,z,nx,ny,nz,area:layer==='roof'?1/ny:floor?.area??1};
    if(floor)geometry.floorRadius=floor.floorRadius;
    const s=surfaceSite(geometry,fuel[layer]);
    sites.push(s);byId.set(id,s);
    winds.set(s,layer==='roof'||layer==='walls'?sampleWind(origin.x+x+.56*nx,y+.56*ny,origin.y+z+.56*nz,[0,0,0]):[0,0,0]);
    if(layer==='walls')walls.push(s);
    return s;
  };
  function link(a,b){
    a=byId.get(a);b=byId.get(b);
    if(!a||!b)throw Error('Missing native cottage fire link');
    a.links.push({target:b,seconds:edgeSeconds(a,b,winds.get(a),winds.get(b))});
    b.links.push({target:a,seconds:edgeSeconds(b,a,winds.get(b),winds.get(a))});
  }
  const faces=[
    ['front',WIDTH,[0,2,4],a=>[a,-RIM,0,-1]],['back',WIDTH,[2],a=>[a,DEPTH+RIM,0,1]],
    ['left',DEPTH,[0,3,6],a=>[-RIM,a,-1,0]],['right',DEPTH,[0,3,6],a=>[WIDTH+RIM,a,1,0]]
  ];
  for(const [face,count,windows,point] of faces)for(let band=0;band<2;band++)for(let col=0;col<count;col++){
    const [x,z,nx,nz]=point(col+.5),h=face==='front'&&col===5&&band===1?1.86:windows.includes(col)?(band===0?.24:1.82):band+.5;
    const id=wallId(face,col,band);
    add(id,face,'walls',tileIndex(x,z),x,UPPER+h,z,nx,0,nz).band=band;
    if(col)link(id,wallId(face,col-1,band));
    if(band)link(id,wallId(face,col,band-1));
  }
  for(const [a,ac,b,bc] of [['front',0,'left',0],['front',5,'right',0],['back',0,'left',6],['back',5,'right',6]])
    for(let band=0;band<2;band++)link(wallId(a,ac,band),wallId(b,bc,band));
  for(const {index,x,z} of makeTiles()){
    const cx=x+.5,cz=z+.5,side=x<3?'left':'right',n=roofNormal(cx);
    add('roof:'+index,'roof-'+side,'roof',index,cx,roofHeight(cx),cz,n.nx,n.ny,n.nz);
    if(x>0)link('roof:'+index,'roof:'+(index-1));
    if(z>0)link('roof:'+index,'roof:'+(index-WIDTH));
    if(x===0||x===WIDTH-1)link('roof:'+index,wallId(side,z,1));
    for(const layer of ['upper','lower']){
      const id=layer+':'+index;
      const patches=floors[layer].bySection.get(index);
      // The checked Ashland bake uses a continuous slab in each one-metre tile.
      if(patches?.length!==1||Math.abs(patches[0].area-1)>1e-8)throw Error('Ashland floor support differs from its native tile');
      const floor=patches[0];
      add(id,layer,layer,index,floor.x,floor.y,floor.z,0,1,0,floor);
      for(const [px,pz] of [[x-1,z],[x,z-1]]){
        if(px<0||pz<0)continue;
        const previous=pz*WIDTH+px;
        if(layer==='upper'&&room(x,z)!==room(px,pz)&&!upperDoors.has(previous+'/'+index))continue;
        if(layer==='lower'&&z===3&&pz===2&&x!==3)continue;
        link(id,layer+':'+previous);
      }
    }
  }
  return {sites,byId,walls};
}
