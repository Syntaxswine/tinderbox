import {COTTAGE_OFFSET} from '../content/cottage-pair.js';
import {WIDTH,DEPTH} from '../simulation/cottage-topology.js';

// The approved night replay uses a different exposure and highlight curve.
// Translate its outdoor budget to the game's existing linear light units.
const REPLAY_PEAK=1_000_000, SOURCE_SCALE=.00034;
export const COTTAGE_OUTDOOR_BUDGET=REPLAY_PEAK*SOURCE_SCALE;
const RANGE=22, ANGLE=1.4, PENUMBRA=.88, HEIGHT=4, CLEARANCE=.26;
const SOLID_ANGLE=2*Math.PI*(1-(Math.cos(ANGLE)+Math.cos(ANGLE*(1-PENUMBRA)))/2);
const length=Math.hypot(COTTAGE_OFFSET.x,COTTAGE_OFFSET.z);
const lotX=COTTAGE_OFFSET.x/length,lotZ=COTTAGE_OFFSET.z/length;
const luminance=color=>.2126*color.r+.7152*color.g+.0722*color.b;
const clamp=value=>Math.max(0,Math.min(1,value));

function exposedHeat(cells, z){
  const faces={front:0,back:0,left:0,right:0};
  for(const cell of cells){
    if(!(cell.flame>0))continue;
    const heat=Math.min(1,cell.flame);
    if(cell.part==='walls'&&Object.hasOwn(faces,cell.face))faces[cell.face]+=heat;
    if(cell.part==='roof'){
      const rear=clamp((cell.z-z)/DEPTH);
      faces[cell.face==='roof-left'?'left':'right']+=.65*heat;
      faces.front+=.35*heat*(1-rear);
      faces.back+=.35*heat*rear;
    }
  }
  return faces;
}

export function createCottageFirelight(T,buildings,localLights){
  const root=new T.Group();
  root.name='Cottage outdoor firelight';
  const cottages=buildings.map((building,index)=>{
    const lobes=index===0?[
      [WIDTH+CLEARANCE,DEPTH+CLEARANCE,lotX,lotZ,['right','back']],
      [-CLEARANCE,DEPTH/2,-1,0,['left']],
      [WIDTH/2,-CLEARANCE,0,-1,['front']]
    ]:[
      [-CLEARANCE,-CLEARANCE,-lotX,-lotZ,['left','front']],
      [WIDTH+CLEARANCE,DEPTH/2,1,0,['right']],
      [WIDTH/2,DEPTH+CLEARANCE,0,1,['back']]
    ];
    return lobes.map(([x,z,nx,nz,faces])=>{
      const light=new T.SpotLight(0xffab67,0,RANGE,ANGLE,PENUMBRA,2);
      light.color.multiplyScalar(1/luminance(light.color));
      light.name=building.id+' outdoor '+faces.join('/');
      light.position.set(building.x+x,HEIGHT,building.y+z);
      light.target.position.copy(light.position);
      light.target.position.x+=nx;
      light.target.position.y-=.32;
      light.target.position.z+=nz;
      root.add(light,light.target);
      return {light,faces};
    });
  });
  let readings=[];

  function update(cellsByCottage){
    readings=cottages.map((lobes,i)=>{
      const faces=exposedHeat(cellsByCottage[i],buildings[i].y);
      const heat=faces.front+faces.back+faces.left+faces.right;
      const fraction=clamp((heat-5)/25)**4;
      const spill=COTTAGE_OUTDOOR_BUDGET*fraction;
      let local=0;
      for(const light of localLights[i]){
        if(!light.userData.outdoorFire)continue;
        // Crossfade the existing close practicals into the shared outdoor pool.
        light.intensity*=1-fraction;
        local+=light.power*luminance(light.color);
      }
      for(const {light,faces:directions} of lobes){
        const share=heat>0?directions.reduce((sum,face)=>sum+faces[face],0)/heat:0;
        light.intensity=spill*share/SOLID_ANGLE;
      }
      return {id:buildings[i].id,heat,spill,local};
    });
  }

  function dispose(){
    for(const lobes of cottages)for(const {light} of lobes)light.dispose();
    root.removeFromParent();
    root.clear();
  }

  return {root,update,dispose,diagnostics:()=>({
    sourceScale:SOURCE_SCALE,budget:COTTAGE_OUTDOOR_BUDGET,range:RANGE,lobesPerCottage:3,
    cottages:readings.map(reading=>({...reading}))
  })};
}
