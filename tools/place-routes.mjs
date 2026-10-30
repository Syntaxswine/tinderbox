import {worldToStick} from '../src/simulation/geometry.js';
import {DEFAULT_CONFIG} from '../src/simulation/config.js';
import {inside} from '../src/runtime/navigation.js';
class Heap{
  values=[];
  push(value){const a=this.values;a.push(value);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].priority<=value.priority)break;a[i]=a[p];i=p;}a[i]=value;}
  pop(){const a=this.values,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1].priority<a[child].priority)child++;if(a[child].priority>=last.priority)break;a[i]=a[child];i=child;}a[i]=last;}return first;}
  get length(){return this.values.length;}
}
// Authored stair paths guide search toward physical level connections. They
// never authorize a step: every grid edge still uses the actual support and
// source-mesh collision query, and playback uses ordinary movement commands.
function stairHeuristic(model,target){
  const hints=model.routeHints?.(),nodes=[],rows=new Map();if(!hints?.stairs?.length)return null;
  const floors=new Map();for(const floor of hints.floors||[]){const key=Math.round(floor.height*10000);if(!floors.has(key))floors.set(key,[]);for(const polygon of floor.polygons)floors.get(key).push({polygon,component:null});}
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  function overlaps(a,b){
    if(a.some(p=>inside({x:p[0],y:p[1]},b))||b.some(p=>inside({x:p[0],y:p[1]},a)))return true;
    for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const A=a[i],B=a[(i+1)%a.length],C=b[j],D=b[(j+1)%b.length];if(cross(A,B,C)*cross(A,B,D)<0&&cross(C,D,A)*cross(C,D,B)<0)return true;}return false;
  }
  for(const [height,row]of floors){const parent=row.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));for(let i=0;i<row.length;i++)for(let j=0;j<i;j++)if(overlaps(row[i].polygon,row[j].polygon))parent[find(i)]=find(j);row.forEach((p,i)=>p.component=height+'/'+find(i));}
  function component(point){const row=floors.get(Math.round(point.elevation*10000));if(!row)return null;
    const contained=row.find(p=>inside(point,p.polygon));if(contained)return contained.component;
    // Access landings/bridges join the nearest source floor at this height.
    let best=Infinity,found=null;for(const p of row)for(let i=0;i<p.polygon.length;i++){const a=p.polygon[i],b=p.polygon[(i+1)%p.polygon.length],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.y-a[1])*dy)/len)):0,d=Math.hypot(point.x-a[0]-t*dx,point.y-a[1]-t*dy);if(d<best){best=d;found=p.component;}}return found;
  }
  for(const path of hints.stairs){let prior=null;for(const p of path){
    const node={x:p[0]+hints.offset[0],y:p[2]+hints.offset[2],elevation:p[1],links:[],cost:Infinity},key=Math.round(p[1]*10000);
    node.component=component(node);if(!rows.has(key))rows.set(key,[]);rows.get(key).push(node);nodes.push(node);
    if(prior){const cost=Math.hypot(node.x-prior.x,node.y-prior.y)+Math.abs(node.elevation-prior.elevation)*1.2;node.links.push([prior,cost]);prior.links.push([node,cost]);}prior=node;
  }}
  const targetComponent=component(target),heap=new Heap();for(const node of nodes)if(Math.abs(node.elevation-target.elevation)<.015&&node.component===targetComponent){node.cost=Math.hypot(node.x-target.x,node.y-target.y);heap.push({node,priority:node.cost});}
  while(heap.length){const item=heap.pop(),node=item.node;if(item.priority>node.cost+1e-7)continue;
    for(const [next,cost]of [...node.links,...rows.get(Math.round(node.elevation*10000)).filter(n=>n!==node&&node.component&&n.component===node.component).map(n=>[n,Math.hypot(node.x-n.x,node.y-n.y)])]){
      const total=node.cost+cost;if(total>=next.cost-1e-7)continue;next.cost=total;heap.push({node:next,priority:total});
    }
  }
  const levels=[...rows.entries()];return point=>{
    const here=component(point);if(Math.abs(point.elevation-target.elevation)<.015&&here===targetComponent)return Math.hypot(point.x-target.x,point.y-target.y);
    let best=Infinity;for(const [height,row]of levels)if(Math.abs(height/10000-point.elevation)<.221)for(const node of row){const distance=Math.hypot(point.x-node.x,point.y-node.y);if(here?node.component!==here:distance>4.5)continue;best=Math.min(best,distance+Math.abs(point.elevation-node.elevation)*1.2+node.cost);}
    return Number.isFinite(best)?best:Math.hypot(point.x-target.x,point.y-target.y)+Math.abs(point.elevation-target.elevation);
  };
}
// Read-only planning against complete support data. It cannot relocate a player.
// Verification follows every resulting segment through the public move command.
export function planRoute(model,from,target,{spacing=.25,maxNodes=180000}={}){
  const heap=new Heap(),scores=new Map(),start={...from,ix:0,iz:0,cost:0,parent:null};
  const key=node=>node.ix+','+node.iz+','+Math.round(node.elevation*10000),estimate=stairHeuristic(model,target)||((point)=>Math.hypot(point.x-target.x,point.y-target.y)+Math.abs(point.elevation-target.elevation));
  start.priority=estimate(start);heap.push(start);scores.set(key(start),0);let searched=0;
  function finish(current,shortcut=false){
    const route=[];for(let node=current;node;node=node.parent)route.push({x:node.x,y:node.y,elevation:node.elevation});route.reverse();
    if(shortcut){const n=Math.ceil(Math.hypot(current.x-target.x,current.y-target.y)/spacing);let previous=current;
      for(let i=1;i<=n;i++){const point=model.probeStep(previous,{x:current.x+(target.x-current.x)*i/n,y:current.y+(target.y-current.y)*i/n});if(!point)return null;route.push(point);previous=point;}
    }return {route,searched};
  }
  while(heap.length&&searched++<maxNodes){
    const current=heap.pop();if(current.cost>scores.get(key(current))+1e-7)continue;
    if(Math.hypot(current.x-target.x,current.y-target.y)<spacing*.9&&Math.abs(current.elevation-target.elevation)<.015)return finish(current);
    if(searched===1||searched%64===0){const end=model.probeStep(current,target);if(end&&Math.abs(end.elevation-target.elevation)<.015){const result=finish(current,true);if(result)return result;}}
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const ix=current.ix+dx,iz=current.iz+dy,point=model.probeStep(current,{x:from.x+ix*spacing,y:from.y+iz*spacing});if(!point)continue;
      const cost=current.cost+Math.hypot(dx,dy)*spacing+Math.abs(point.elevation-current.elevation)*1.2,node={...point,ix,iz,cost,parent:current},id=key(node);
      if(cost>=(scores.get(id)??Infinity)-1e-7)continue;scores.set(id,cost);node.priority=cost+estimate(node);heap.push(node);
    }
  }
  throw Error('No physical route to '+JSON.stringify(target)+' after '+searched+' support states');
}
export async function walkRoute(sim,route,{input=DEFAULT_CONFIG.input,speed=DEFAULT_CONFIG.player.speed,afterStep=()=>{}}={}){
  let ticks=0,steps=0,maxRise=0;
  for(const target of route.slice(1)){
    let arrived=false;
    for(let i=0;i<60;i++){
      const snapshot=sim.snapshot(),player=snapshot.player,dx=target.x-player.x,dy=target.y-player.y,distance=Math.hypot(dx,dy);
      if(distance<.005&&Math.abs(player.elevation-target.elevation)<.015){arrived=true;break;}
      if(player.interaction?.enabled&&player.interaction.label.startsWith('Open '))sim.dispatch({type:'interact'});
      const magnitude=Math.min(1,distance/(speed/60)),vector=worldToStick({x:distance?dx/distance*magnitude:0,y:distance?dy/distance*magnitude:0},input);
      sim.dispatch({type:'move',...vector});const next=sim.advance(1/60);ticks++;steps+=next.diagnostics.acceptedPath.length-1;
      maxRise=Math.max(maxRise,Math.abs(next.player.elevation-player.elevation));if(maxRise>.221)throw Error('Route used a vertical teleport');await afterStep(next);
    }
    if(!arrived){const s=sim.snapshot(),why=[];sim.probeStep(s.player,target,r=>why.push(r));throw Error('Movement stalled at '+JSON.stringify(s.player)+' toward '+JSON.stringify(target)+'; waiting='+s.navigation.waitingForSection+'; probe='+JSON.stringify(why));}
  }
  sim.dispatch({type:'move',x:0,y:0});const snapshot=sim.advance(1/60);await afterStep(snapshot);return {ticks,acceptedSegments:steps,maxRise,player:snapshot.player};
}
