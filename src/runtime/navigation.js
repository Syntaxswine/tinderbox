import {configuration} from '../simulation/config.js';
import {movementVector,normalized,sweptDiscClear,distance} from '../simulation/geometry.js';
import {CHARACTER_PROFILES} from '../content/characters.js';
import {inactiveDischarge} from '../simulation/discharge.js';
import {transformCollisionShape,sweptCylinderClear} from './collision.js';
const EPS=1e-6;
const PLAN_EPS=.0001; // Native Float32 surfaces meet within 0.1 mm.
const polygonBounds=new WeakMap();
export const EXPLORE_BODY=CHARACTER_PROFILES.goat;
export function inside(point,polygon){
  const b=polygonBounds.get(polygon);if(b&&(point.x<b.minX-PLAN_EPS||point.x>b.maxX+PLAN_EPS||point.y<b.minY-PLAN_EPS||point.y>b.maxY+PLAN_EPS))return false;
  let result=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    const cross=(point.x-a[0])*(b[1]-a[1])-(point.y-a[1])*(b[0]-a[0]);
    if(Math.abs(cross)<=PLAN_EPS*Math.hypot(b[0]-a[0],b[1]-a[1])&&point.x>=Math.min(a[0],b[0])-PLAN_EPS&&point.x<=Math.max(a[0],b[0])+PLAN_EPS&&point.y>=Math.min(a[1],b[1])-PLAN_EPS&&point.y<=Math.max(a[1],b[1])+PLAN_EPS)return true;
    if((a[1]>point.y)!==(b[1]>point.y)&&point.x<(b[0]-a[0])*(point.y-a[1])/(b[1]-a[1])+a[0])result=!result;
  }return result;
}
const contains=(point,surface)=>surface.polygons.some(p=>inside(point,p))&&!surface.holes?.some(p=>inside(point,p));
function touchesSurface(point,radius,surface){
  if(contains(point,surface))return true;
  for(const polygon of [...surface.polygons,...surface.holes||[]])for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;
    const t=length?Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.y-a[1])*dy)/length)):0;
    const x=a[0]+dx*t,y=a[1]+dy*t;
    if(Math.hypot(point.x-x,point.y-y)<radius-EPS){
      // Boundaries internal to overlapping empty holes are not a ceiling.
      // Test the remaining solid on either side of this actual boundary.
      for(let j=0;j<8;j++){const sample={x:x+PLAN_EPS*3*Math.cos(j*Math.PI/4),y:y+PLAN_EPS*3*Math.sin(j*Math.PI/4)};
        if(Math.hypot(sample.x-point.x,sample.y-point.y)<radius&&contains(sample,surface))return true;
      }
    }
  }return false;
}
const footprint=(point,radius)=>[point,...Array.from({length:12},(_,i)=>({x:point.x+radius*Math.cos(i*Math.PI/6),y:point.y+radius*Math.sin(i*Math.PI/6)}))];
function bounds(surface){const points=surface.polygons.flat();return {min:[Math.min(...points.map(p=>p[0])),surface.height-.12,Math.min(...points.map(p=>p[1]))],max:[Math.max(...points.map(p=>p[0])),surface.height,Math.max(...points.map(p=>p[1]))]};}
export function spatialIndex(items,getBounds=item=>item.bounds){
  const bins=new Map(),size=8;
  for(const item of items){const b=getBounds(item);for(let x=Math.floor(b.min[0]/size);x<=Math.floor(b.max[0]/size);x++)for(let z=Math.floor(b.min[2]/size);z<=Math.floor(b.max[2]/size);z++){
    const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(item);
  }}
  return (point,radius=1)=>{const result=new Set();for(let x=Math.floor((point.x-radius)/size);x<=Math.floor((point.x+radius)/size);x++)for(let z=Math.floor((point.y-radius)/size);z<=Math.floor((point.y+radius)/size);z++)for(const item of bins.get(x+','+z)||[])result.add(item);return [...result];};
}
export function createExploration({definition,config,isSectionReady=()=>true,streamMetrics=()=>({}),collisionLimits={}}){
  if(!definition?.surfaces?.length||!definition.spawn)throw Error('A visit needs verified support surfaces and spawn');
  const data=structuredClone(definition),body={...EXPLORE_BODY,...data.body},settings=configuration(config),surfaces=spatialIndex(data.surfaces,bounds),ceilings=spatialIndex(data.ceilings||[],bounds),blockers=spatialIndex(data.blockers,item=>item.openBounds?{min:item.bounds.min.map((n,i)=>Math.min(n,item.openBounds.min[i])),max:item.bounds.max.map((n,i)=>Math.max(n,item.openBounds.max[i]))}:item.bounds);
  // These private cloned polygons never mutate. Reject distant outlines before
  // winding their many native arc vertices, without caching caller-owned data.
  for(const s of [...data.surfaces,...data.ceilings||[]])for(const p of [...s.polygons,...s.holes||[]])polygonBounds.set(p,{minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minY:Math.min(...p.map(v=>v[1])),maxY:Math.max(...p.map(v=>v[1]))});
  const collisionPolicy={shapes:192,triangles:65536,...collisionLimits},collisionCache=new Map();let cachedTriangles=0,peakCachedShapes=0,peakCachedTriangles=0;
  if(![collisionPolicy.shapes,collisionPolicy.triangles].every(n=>Number.isSafeInteger(n)&&n>0))throw Error('Invalid collision cache policy');
  const precise=new Map(),portalLeaves=new Map();for(const item of data.blockers){
    if(item.portalId){if(!portalLeaves.has(item.portalId))portalLeaves.set(item.portalId,[]);portalLeaves.get(item.portalId).push(item);}
    if(item.shapeId){const shape=data.collisionShapes?.[item.shapeId];if(!shape||!item.matrix)throw Error('Missing source collision shape: '+item.id);precise.set(item.id,{source:shape,closedMatrix:item.matrix,openMatrix:item.openMatrix});}
  }
  function sourceShape(item,open){
    const key=item.id+(open?'/open':'/closed'),cached=collisionCache.get(key);if(cached){collisionCache.delete(key);collisionCache.set(key,cached);return cached;}
    const record=precise.get(item.id),matrix=open?record.openMatrix:record.closedMatrix;if(!matrix)return null;
    const shape=transformCollisionShape(record.source,matrix),count=shape.triangles.length;
    if(count<=collisionPolicy.triangles){while(collisionCache.size&&(collisionCache.size>=collisionPolicy.shapes||cachedTriangles+count>collisionPolicy.triangles)){const first=collisionCache.keys().next().value;cachedTriangles-=collisionCache.get(first).triangles.length;collisionCache.delete(first);}collisionCache.set(key,shape);cachedTriangles+=count;peakCachedShapes=Math.max(peakCachedShapes,collisionCache.size);peakCachedTriangles=Math.max(peakCachedTriangles,cachedTriangles);}return shape;
  }
  const collisionMetrics=()=>({detailedColliders:precise.size,cachedShapes:collisionCache.size,cachedTriangles,peakCachedShapes,peakCachedTriangles,maxCachedShapes:collisionPolicy.shapes,maxCachedTriangles:collisionPolicy.triangles});
  if(![body.radius,body.height,body.maxStep].every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid measured body envelope');
  let closed=false,tick=0,accumulator=0,activeTime=0,paused=false,input={x:0,y:0},commands=[],events=[],sequence=0,player,portalStates,waiting=false,view='follow',acceptedPath=[],lastSteps=0,droppedRealSeconds=0;
  const portals=data.portals||[],world={width:data.width,height:data.height,tileSize:1,fireCellSize:.5,modules:[],buildings:[],tiles:[],camera:data.camera};
  function emit(type,extra={}){events.push({id:++sequence,tick,type,x:player.x,y:player.y,...extra});if(events.length>64)events.shift();}
  function reset(){portalStates=Object.fromEntries(portals.map(p=>[p.id,!!p.initiallyOpen]));input={x:0,y:0};paused=false;
    player={id:'hero',characterId:data.characterId||'goat',species:data.characterId||'goat',height:body.height,...data.spawn,radius:body.radius,hp:100,maxHp:100,tool:'matches',travelled:0,heading:0,moving:false,usingTool:false,pouring:false,
      inventory:{matches:0,gas:0,molotovs:0,torchFuel:0,flamethrowerFuel:0,powder:0,healing:0,inversion:0},torch:{phase:'spent',remainingSeconds:0,durationSeconds:0}};
    const support=findSupport(player,player.elevation);if(!support||!canStand(player,player.elevation,player))throw Error('Unsafe exploration spawn: '+data.placeId);setSupport(support);
  }
  function findSupport(point,fromHeight){
    const nearby=surfaces(point),centreTreads=nearby.filter(s=>s.stairId&&contains(point,s)),at=nearby.filter(s=>Math.abs(s.height-fromHeight)<=body.maxStep+EPS&&contains(point,s));
    at.sort((a,b)=>b.height-a.height);
    for(const candidate of at){const span=nearby.some(s=>s.stairId)?Math.max(body.maxStep,.45):body.maxStep;
      // Cumulative solid entry steps have overlapping top polygons. A lower
      // buried face is not walkable through the side of a taller solid tread.
      if(centreTreads.some(tread=>tread.height>candidate.height+EPS&&(tread.bottom??tread.height-.12)<candidate.height+body.height-EPS))continue;
      if(footprint(point,body.radius).every(sample=>nearby.some(s=>Math.abs(s.height-candidate.height)<=span+EPS&&contains(sample,s))))return candidate;}
    return null;
  }
  function obstacles(point,foot,margin=.1,highest=foot,onStairs=false){const padding=body.radius+margin;return blockers(point,padding).map(b=>portalStates[b.portalId]?b.openBounds?{...b,bounds:b.openBounds}:null:b).filter(b=>b&&point.x>=b.bounds.min[0]-padding&&point.x<=b.bounds.max[0]+padding&&point.y>=b.bounds.min[2]-padding&&point.y<=b.bounds.max[2]+padding&&b.bounds.max[1]>foot+(b.stair||onStairs ? .45 : .025)&&b.bounds.min[1]<highest+body.height-EPS);}
  function canStand(point,height,previous,report=()=>{}){
    const onStairs=surfaces(point).some(s=>s.stairId&&Math.abs(s.height-height)<EPS&&contains(point,s));
    const ceiling=ceilings(point).find(s=>{
      const underside=s.height-.12;if(underside<=height+.025||underside>=height+body.height-EPS)return false;
      // At a stair opening, the wide body envelope must not trap the legs on
      // the previous slab edge. The centre still needs a genuinely empty hole;
      // intact slab under the centre and all torso/head contacts remain solid.
      if(onStairs&&underside-height<=.45&&!contains(point,s))return false;
      return touchesSurface(point,body.radius,s);
    });if(ceiling){report({reason:'headroom',id:ceiling.id,height});return false;}
    // A descending stair bends the legs beside the prior landing fascia as
    // well as beside the tread itself. Centre support and the .22 m rise/drop
    // limit still apply; the torso/head retain full source-mesh collision.
    const lower=Math.min(height,previous.elevation??height),upper=Math.max(height,previous.elevation??height),nearby=obstacles(point,lower,distance(previous,point)+.05,upper,onStairs),plain=nearby.filter(b=>!b.shapeId).map(b=>({x:(b.bounds.min[0]+b.bounds.max[0])/2,y:(b.bounds.min[2]+b.bounds.max[2])/2,width:b.bounds.max[0]-b.bounds.min[0],depth:b.bounds.max[2]-b.bounds.min[2],solid:true}));
    if(!sweptDiscClear(previous,point,body.radius,world,plain)){report({reason:'solid-bounds',ids:nearby.filter(b=>!b.shapeId).map(b=>b.id),height});return false;}
    for(const blocker of nearby)if(blocker.shapeId){const shape=sourceShape(blocker,!!portalStates[blocker.portalId]);if(shape&&!sweptCylinderClear(previous,point,body.radius,lower+(blocker.stair||onStairs ? .45 : .025),upper+body.height-EPS,shape)){report({reason:'source-triangles',id:blocker.id,height});return false;}}
    return true;
  }
  function setSupport(surface){player.elevation=surface.height;player.level=surface.level;player.locationLabel=surface.label;player.surfaceId=surface.id;player.interior=!!surface.interior;}
  function nearestPortal(){return portals.filter(p=>p.stateful!==false&&Math.abs(p.position[1]-player.elevation)<1&&Math.hypot(p.position[0]-player.x,p.position[2]-player.y)<=p.reach).sort((a,b)=>Math.hypot(a.position[0]-player.x,a.position[2]-player.y)-Math.hypot(b.position[0]-player.x,b.position[2]-player.y))[0];}
  function transitionBlocked(portal,open){
    return (portalLeaves.get(portal.id)||[]).some(leaf=>{
      const b=open?leaf.openBounds:leaf.bounds;if(!b||b.max[1]<=player.elevation+.025||b.min[1]>=player.elevation+body.height-EPS)return false;
      if(leaf.shapeId){const shape=sourceShape(leaf,open);return !!shape&&!sweptCylinderClear(player,player,body.radius,player.elevation+.025,player.elevation+body.height-EPS,shape);}
      return !sweptDiscClear(player,player,body.radius,world,[{x:(b.min[0]+b.max[0])/2,y:(b.min[2]+b.max[2])/2,width:b.max[0]-b.min[0],depth:b.max[2]-b.min[2],solid:true}]);
    });
  }
  reset();
  function dispatch(command){
    if(closed||!command||!['move','aim','pause','cancel-input','reset','interact'].includes(command.type))return false;
    if(['move','aim'].includes(command.type)&&![command.x,command.y].every(Number.isFinite))return false;
    if(command.type==='pause'&&typeof command.paused!=='boolean')return false;
    commands.push({...command});return true;
  }
  function step(){
    tick++;player.moving=false;waiting=false;acceptedPath=[{x:player.x,y:player.y,elevation:player.elevation}];
    for(const command of commands){
      if(command.type==='reset'){reset();emit('reset');continue;}
      if(command.type==='cancel-input'){input={x:0,y:0};continue;}
      if(command.type==='pause'){paused=command.paused;if(paused)input={x:0,y:0};continue;}
      if(paused)continue;
      if(command.type==='move')input=normalized(command.x,command.y);
      if(command.type==='interact'){
        const portal=nearestPortal();if(portal&&!transitionBlocked(portal,!portalStates[portal.id])){portalStates[portal.id]=!portalStates[portal.id];emit('portal-state',{portalId:portal.id,open:portalStates[portal.id]});}
      }
    }commands=[];if(paused)return;activeTime+=settings.step;
    const direction=movementVector(input,false,settings.input),dx=direction.x*settings.player.speed*settings.step,dy=direction.y*settings.player.speed*settings.step;
    const count=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.035));
    for(let i=0;i<count;i++){
      const previous={x:player.x,y:player.y,elevation:player.elevation};
      for(const [sx,sy]of [[dx/count,dy/count],[dx/count,0],[0,dy/count]]){
        if(Math.abs(sx)+Math.abs(sy)<EPS)continue;
        const next={x:player.x+sx,y:player.y+sy},support=findSupport(next,player.elevation);if(!support||!canStand(next,support.height,previous))continue;
        if(!isSectionReady({...next,elevation:support.height})){waiting=true;continue;}
        const walked=distance(previous,next);player.x=next.x;player.y=next.y;player.travelled+=walked;player.moving||=walked>EPS;player.heading=Math.atan2(sy,sx);setSupport(support);acceptedPath.push({x:player.x,y:player.y,elevation:player.elevation});break;
      }
    }
  }
  function snapshot(){
    if(closed)throw Error('Exploration disposed');const portal=nearestPortal();
    return {version:1,mode:'explore',tick,paused,clocks:{active:activeTime,player:activeTime,world:activeTime,playerScale:1,worldScale:1},
      player:{...player,locationLabel:view==='overview'?'Overview plan · '+player.locationLabel:player.locationLabel,inventory:{...player.inventory},torch:{...player.torch},interaction:portal?{label:(portalStates[portal.id]?'Close ':'Open ')+portal.label,enabled:!paused&&!transitionBlocked(portal,!portalStates[portal.id])}:null},
      world:{...world,modules:[],buildings:[],tiles:[],camera:structuredClone(world.camera),obstacles:(data.mapObstacles||[]).filter(wall=>wall.fromLevel<=player.level&&wall.toLevel>player.level).map(wall=>({...wall}))},actors:[],cells:[],projectiles:[],events:structuredClone(events),aim:{x:player.x,y:player.y},
      pickups:[],effects:{powder:{active:false,remaining:0},inversion:{active:false,remaining:0}},discharge:inactiveDischarge(tick),
      navigation:{placeId:data.placeId,view,waitingForSection:waiting,portalStates:{...portalStates},collision:collisionMetrics(),...streamMetrics()},
      diagnostics:{alpha:accumulator/settings.step,scenario:data.placeId,generation:0,lastSteps,droppedRealSeconds,burningCells:0,acceptedPath:acceptedPath.map(point=>({...point}))}};
  }
  return {dispatch,snapshot,setView(value){view=value;},advance(delta){if(closed)throw Error('Exploration disposed');if(!Number.isFinite(delta)||delta<0)throw Error('Invalid exploration delta');const accepted=Math.min(delta,settings.maxCatchUp);droppedRealSeconds+=delta-accepted;accumulator+=accepted;lastSteps=0;while(accumulator+EPS>=settings.step&&lastSteps<Math.ceil(settings.maxCatchUp/settings.step)){accumulator=Math.max(0,accumulator-settings.step);step();lastSteps++;}return snapshot();},
    dispose(){closed=true;commands=[];events=[];collisionCache.clear();cachedTriangles=0;},collisionMetrics,canStand:(point,height)=>canStand(point,height,{...point,elevation:height}),
    probeStep(from,to,report=()=>{}){
      if(closed||![from.x,from.y,from.elevation,to.x,to.y].every(Number.isFinite))return null;
      // Read-only planning uses the same support/step rules as movement.
      // Treating a quarter-metre QA edge as one rising cylinder overstates
      // collisions at the bear's shins even though the real steps are clear.
      // A finer 1 cm sample also rejects thin unsupported margins between
      // different input phases; movement itself keeps its 3.5 cm upper bound.
      const n=Math.max(1,Math.ceil(distance(from,to)/.01));let previous={...from};
      for(let i=1;i<=n;i++){const point={x:from.x+(to.x-from.x)*i/n,y:from.y+(to.y-from.y)*i/n},surface=findSupport(point,previous.elevation);
        if(!surface){report({reason:'support',point,fromHeight:previous.elevation});return null;}if(!canStand(point,surface.height,previous,report))return null;
        previous={...point,elevation:surface.height,surfaceId:surface.id};
      }return previous;
    },
    routeHints:()=>({offset:[...(data.sourceOffset||[0,0,0])],stairs:(data.accessPlan?.stairs||[]).map(s=>s.path.map(p=>[...p])),floors:data.surfaces.filter(s=>!s.stairId).map(s=>({height:s.height,polygons:s.polygons.map(p=>p.map(v=>[...v]))}))}),
    definition:()=>structuredClone(data)};
}
