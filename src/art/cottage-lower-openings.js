import {housePlanEdges} from './gross-housing.js';
import {WIDTH,DEPTH,tileIndex} from '../simulation/cottage-topology.js';

export function createCottageLowerOpenings(T,model){
  const basement=model.root.getObjectByName('Level -1');
  const glazing=new T.Group();
  glazing.name='Lower-storey breakaway glazing';
  model.root.add(glazing);
  const windows=[];
  for(const edge of housePlanEdges(model.house,model.house.basementFloor)){
    if(edge.rooms.length!==1||edge.opening!=='window')continue;
    const wall=basement.getObjectByName('wall:'+edge.id);
    const glass=wall.getObjectByName('Native sash glass'),sill=wall.getObjectByName('Native window sill');
    const x=(edge.a[0]+edge.b[0])/2,z=(edge.a[1]+edge.b[1])/2;
    const nx=x===0?-1:x===WIDTH?1:0,nz=z===0?-1:z===DEPTH?1:0;
    const tile=tileIndex(x-nx*.25,z-nz*.25);
    // Let the existing tile batch keep the sill, lintel and sash frame. The
    // glass can break on live floor heat while the support itself stays solid.
    glazing.attach(glass);
    windows.push({glass,tile,x:x+nx*.145,y:wall.position.y+sill.position.y+sill.userData.nativeDimensions[1]/2+.28,
      z:z+nz*.145,nx,nz,kind:'sash'});
  }
  const view=new T.Vector3(),projected=new T.Vector3();
  function update(state,time,camera){
    const sites=new Map(state.cells.filter(cell=>cell.layer==='lower').map(cell=>[cell.tile,cell]));
    const openings=new Map();
    let changed=false;
    if(camera)camera.getWorldDirection(view);
    function offer(tile,anchor,cell){
      if(!(cell?.flame>0)||!state.tiles[tile].lower)return;
      const facing=-view.x*anchor.nx-view.z*anchor.nz;
      if(camera)projected.set(state.x+anchor.x,anchor.y,state.z+anchor.z).project(camera);
      const visibleFromCamera=Boolean(camera&&facing>.10&&Math.abs(projected.x)<=1&&Math.abs(projected.y)<=1);
      const score=(visibleFromCamera?2:0)+(anchor.kind==='sash'?1:0)+facing*.2;
      if((openings.get(tile)?.score??-Infinity)>=score)return;
      openings.set(tile,{tile,x:anchor.x,y:anchor.y,z:anchor.z,nx:anchor.nx,ny:0,nz:anchor.nz,
        kind:anchor.kind,visibleFromCamera,score,flame:Math.sqrt(cell.flame)});
    }
    for(const window of windows){
      const cell=sites.get(window.tile);
      const open=cell&&time-cell.ignitionTime>=.20;
      const visible=!state.gone&&state.tiles[window.tile].lower&&!open;
      if(visible!==window.glass.visible){window.glass.visible=visible;changed=true;}
      if(open)offer(window.tile,window,cell);
    }
    for(const {index,x,z,lower} of state.tiles){
      const cell=sites.get(index);
      if(!lower||!(cell?.flame>0))continue;
      for(const [nx,nz] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const adjacentX=x+nx,adjacentZ=z+nz;
        if(adjacentX<0||adjacentX>=WIDTH||adjacentZ<0||adjacentZ>=DEPTH||state.tiles[adjacentZ*WIDTH+adjacentX].lower)continue;
        offer(index,{x:x+.5+nx*.46,y:.43,z:z+.5+nz*.46,nx,nz,kind:'exposed edge'},cell);
      }
    }
    return {openings,changed};
  }
  return {update};
}
