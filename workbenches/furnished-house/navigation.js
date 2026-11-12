import {sweptCylinderClear} from '../../src/runtime/collision.js';
import {bounds,overlaps,pointOnTriangle,unit,cross,sub,EPS} from './geometry.js';

// A small adapter over the production narrow phase, not a second character or
// rescaled map. Physical retirement/opening state is borrowed from the trial.
export function createNavigation(trial,{radius=.5,height=1.66,maxStep=.22,start=[5.5,0,-3.8]}={}) {
  const {scene}=trial,{data,index}=scene,meshInfo=new Map((data.sourceMeshes||[]).map(m=>[m.id,m]));
  const extras=[],physicalMeshes=new Set(data.surfaces.flatMap(s=>s.sourceMeshBindings||[]));
  for(const g of data.render?.geometry||[]) {
    const info=meshInfo.get(g.id);if(!info||!/stair|tread|newel|rail|casing|jamb|header|porch|entry step/i.test(info.name))continue;
    if(/roof|door leaf/i.test(info.name)||physicalMeshes.has(g.id))continue;
    const triangles=g.triangles.map(t=>t.vertices.map(v=>v.slice(0,3)));
    extras.push({id:g.id,name:info.name,triangles,bounds:bounds(triangles.flat()),closed:true});
  }
  let position=[...start],travelled=0,heading=0,moving=false,lastBlock=null;
  function support(p,previousY) {
    const from=previousY+maxStep+.001,hits=index.crossings([p[0],from,p[2]],[p[0],previousY-maxStep-.001,p[2]],{includeEndpoints:true});
    const options=hits.filter(h=>h.surface.supports&&h.surface.intact&&index.pass(h.surface)<.99).map(h=>({id:h.surface.id,y:from-(2*maxStep+.002)*h.t}));
    for(const shape of extras)if(/stair|tread|step|porch/i.test(shape.name)&&p[0]>=shape.bounds.min[0]-EPS&&p[0]<=shape.bounds.max[0]+EPS&&p[2]>=shape.bounds.min[2]-EPS&&p[2]<=shape.bounds.max[2]+EPS)for(const t of shape.triangles) {
      const n=unit(cross(sub(t[1],t[0]),sub(t[2],t[0])));if(n[1]<.5)continue;
      const y=t[0][1]-(n[0]*(p[0]-t[0][0])+n[2]*(p[2]-t[0][2]))/n[1];
      if(y<=from&&y>=previousY-maxStep-.001&&pointOnTriangle([p[0],y,p[2]],t))options.push({id:shape.id,y});
    }
    return options.sort((a,b)=>b.y-a.y||a.id.localeCompare(b.id))[0]||null;
  }
  function clear(from,to) {
    const near=index.candidates({min:[to[0]-radius,Math.min(from[1],to[1])-.2,to[2]-radius],max:[to[0]+radius,Math.max(from[1],to[1])+.5,to[2]+radius]}),onStairs=near.some(s=>s.intact&&['stair-tread','entry-step'].includes(s.supportType));
    const low=Math.min(from[1],to[1])+(onStairs?.45:.025),high=Math.max(from[1],to[1])+height-EPS,box={min:[Math.min(from[0],to[0])-radius,low,Math.min(from[2],to[2])-radius],max:[Math.max(from[0],to[0])+radius,high,Math.max(from[2],to[2])+radius]};
    const shapes=index.candidates(box).filter(s=>s.intact&&index.pass(s)<.99).map(s=>({id:s.id,triangles:s.solidTriangles||s.triangles,closed:!!s.solidTriangles}));
    shapes.push(...extras.filter(s=>overlaps(box,s.bounds)));
    for(const shape of shapes)if(!sweptCylinderClear({x:from[0],y:from[2]},{x:to[0],y:to[2]},radius,low,high,shape)){lastBlock={id:shape.id,reason:'Native geometry clearance',position:[...to]};return false;}
    for(const part of scene.parts.values())if(part.intact&&part.solid&&part.bounds) {
      const item=scene.items.get(part.itemId);if(!item?.intact||item.falling)continue;
      const b=part.bounds,offset=item.position.map((v,i)=>v-item.initialPosition[i]),lo=b.min.map((v,i)=>v+offset[i]),hi=b.max.map((v,i)=>v+offset[i]);
      if(hi[1]<=low||lo[1]>=high)continue;
      const x=Math.max(lo[0],Math.min(hi[0],to[0])),z=Math.max(lo[2],Math.min(hi[2],to[2]));
      if(Math.hypot(x-to[0],z-to[2])<radius-EPS){lastBlock={id:part.id,reason:'Furniture',position:[...to]};return false;}
    }
    return true;
  }
  function move(dx,dz,seconds=1/30) {
    moving=false;lastBlock=null;const distance=Math.hypot(dx,dz);if(distance<EPS||seconds===0)return snapshot();const scale=distance>1?1/distance:1,speed=9,steps=Math.max(1,Math.ceil(speed*seconds/.025));
    for(let i=0;i<steps;i++) {
      const target=[position[0]+dx*scale*speed*seconds/steps,position[1],position[2]+dz*scale*speed*seconds/steps],s=support(target,position[1]);
      if(!s){lastBlock={reason:'No reachable support',position:target};break;}target[1]=s.y;
      if(!clear(position,target))break;
      travelled+=Math.hypot(target[0]-position[0],target[2]-position[2]);heading=Math.atan2(dz,dx);position=target;moving=true;
    }
    return snapshot();
  }
  function snapshot(){return {position:[...position],x:position[0],y:position[2],elevation:position[1],height,radius,heading,travelled,moving,tool:'matches',lastBlock,level:position[1]>2?1:0};}
  return {move,snapshot,clear,support,setPosition(p){if(!Array.isArray(p)||!p.every(Number.isFinite))throw Error('Invalid observer');position=[...p];return snapshot();},extras};
}
