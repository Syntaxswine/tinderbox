import assert from 'node:assert/strict';
import {CHARACTER_PROFILES} from '../../src/content/characters.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
import {worldToStick} from '../../src/simulation/index.js';
import {movementVector} from '../../src/simulation/geometry.js';
import {createCatalogueThermal} from '../../src/simulation/catalogue-thermal.js';
import {createNavigation} from '../../workbenches/furnished-house/navigation.js';
import {sweptCylinderClear} from '../../src/runtime/collision.js';

export const FRONT_DOOR='hopkins-fifteen::opening/l0/5-0-6-0';
const EPS=1e-6,STEP=DEFAULT_CONFIG.step,distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const dot=(a,b)=>a[0]*b[0]+a[2]*b[2];
const norm=v=>{const n=Math.hypot(v[0],v[2]);assert.ok(n>EPS,'A measured horizontal direction is required');return [v[0]/n,0,v[2]/n];};
const mid=b=>b.min.map((v,i)=>(v+b.max[i])/2);
const point=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite);

// Test-only interpretation of the exported route/flight data. It creates no
// player controller, renderer, game API or alternative support geometry.
export function traversalPlan(compiled){
  const house=compiled.instances.find(i=>i.id==='hopkins-fifteen');assert.ok(house,'Pinned H15 instance required');
  const authored=house.data.navigation?.prototypeRoute;assert.ok(Array.isArray(authored)&&authored.length>3&&authored.every(point),'Exported native route required');const route=authored.map(p=>[...p]),interpolatedStances=[];
  const front=compiled.data.catalogueModules.doors.find(d=>d.id===FRONT_DOOR);assert.ok(front,'Stable paired front-door registration required');
  assert.deepEqual(front.openingIds,[FRONT_DOOR,FRONT_DOOR+'/right']);
  assert.equal(compiled.data.catalogueModules.doors.filter(d=>d.id===FRONT_DOOR).length,1);
  assert.ok(!compiled.data.catalogueModules.doors.some(d=>d.id===FRONT_DOOR+'/right'));
  const surfaces=new Map(compiled.data.surfaces.map(s=>[s.id,s])),opening=house.data.openings.find(o=>o.id===FRONT_DOOR),source=surfaces.get(opening?.surfaceId);
  assert.ok(source&&point(opening.pivot),'Actual front leaf and its physical plane required');
  let inward=norm(source.normal);if(dot(route[0].map((v,i)=>v-front.position[i]),inward)>0)inward=inward.map(v=>-v);
  const lateral=[inward[2],0,-inward[0]],floorY=opening.pivot[1];
  const signed=p=>dot(p.map((v,i)=>v-front.position[i]),inward);
  const stance=(inside,radius)=>route.map((p,index)=>({p,index,d:signed(p)})).filter(r=>Math.abs(r.p[1]-floorY)<EPS&&(inside?r.d>radius+.15:r.d< -radius-.15)&&distance(r.p,front.position)<1.6).sort((a,b)=>Math.abs(a.d)-Math.abs(b.d))[0];
  const largestRadius=Math.max(...Object.values(CHARACTER_PROFILES).map(body=>body.radius));
  // A route can cross a reachable inside stance without naming it as a vertex.
  // Insert only a collinear point on that exported, level segment and walk to
  // it normally; never relocate the fixture player or alter source geometry.
  for(const inside of [false,true])if(!stance(inside,largestRadius)){
    const wanted=(inside?1:-1)*(largestRadius+.25);let inserted=false;
    for(let i=0;i<route.length-1;i++){
      const a=route[i],b=route[i+1],da=signed(a),db=signed(b);if(Math.abs(a[1]-floorY)>EPS||Math.abs(b[1]-floorY)>EPS||Math.abs(db-da)<EPS)continue;
      const t=(wanted-da)/(db-da);if(t<=0||t>=1)continue;const p=a.map((v,k)=>v+(b[k]-v)*t);if(distance(p,front.position)>=1.6)continue;
      route.splice(i+1,0,p);interpolatedStances.push({inside,point:p,sourceSegment:[a,b]});inserted=true;break;
    }
    assert.ok(inserted,'No exported level route segment supplies the required front stance');
  }
  const outside=stance(false,largestRadius),inside=stance(true,largestRadius);assert.ok(outside&&inside,'Measured safe front stances for the largest native body are required');
  const flights=compiled.data.stairFlights.filter(f=>f.instanceId===house.id).map(f=>{
    const levels=[];
    for(const id of f.treadSourceIds){const s=surfaces.get(id);assert.ok(s?.supportType==='stair-tread',id);const y=Math.max(...s.triangles.flat().map(p=>p[1]));let row=levels.find(r=>Math.abs(r.y-y)<EPS);if(!row){row={y,ids:[],bounds:{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]}};levels.push(row);}row.ids.push(id);for(const t of s.triangles)for(const p of t)for(let i=0;i<3;i++){row.bounds.min[i]=Math.min(row.bounds.min[i],p[i]);row.bounds.max[i]=Math.max(row.bounds.max[i],p[i]);}}
    levels.sort((a,b)=>a.y-b.y);assert.ok(levels.length,'Each declared flight needs real tread heights');let previous=f.lower.elevation;
    for(const row of levels){assert.ok(row.y-previous>EPS&&row.y-previous<=Math.min(...Object.values(CHARACTER_PROFILES).map(b=>b.maxStep))+EPS,'Native rise exceeds body limit: '+f.id);previous=row.y;}
    assert.ok(Math.abs(previous-f.upper.elevation)<EPS,'Flight must reach its declared upper support');
    const a=mid(levels[0].bounds),b=mid(levels.at(-1).bounds),axis=norm([b[0]-a[0],0,b[2]-a[2]]),side=[axis[2],0,-axis[0]],middle=levels[Math.floor((levels.length-1)/2)];
    const checkpoint=route.map((p,index)=>({p,index})).filter(r=>Math.abs(r.p[1]-middle.y)<EPS).sort((x,y)=>distance(x.p,mid(middle.bounds))-distance(y.p,mid(middle.bounds)))[0];
    assert.ok(checkpoint?.index>0,'Exported route needs a supported mid-flight stop/reverse checkpoint: '+f.id);
    return {...f,levels,side,checkpoint:checkpoint.index};
  });
  assert.ok(flights.length,'Explicit H15 flight array required');assert.equal(flights.reduce((n,f)=>n+f.levels.length,0),12,'Preserve all twelve actual rises across every delivered flight');
  assert.ok(Math.abs(Math.max(...flights.map(f=>f.upper.elevation))-Math.min(...flights.map(f=>f.lower.elevation))-2.12)<EPS,'Preserve native floor pitch');
  const sideAt=index=>{
    const p=route[index],options=flights.flatMap(f=>f.levels.filter(l=>Math.abs(l.y-p[1])<EPS).map(l=>({f,d:distance(p,mid(l.bounds))}))).sort((a,b)=>a.d-b.d);
    return options[0]?.f.side||lateral;
  };
  return {house,route,interpolatedStances,front,floorY,inward,lateral,outside:outside.index,inside:inside.index,flights,point(index,offset=0){const side=sideAt(index);return route[index].map((v,i)=>v+side[i]*offset);}};
}

export function physicalDriver({compiled,definition,plan,characterId,mode='analog',magnitude=1,record=()=>{},guard=()=>{}}){
  const body=CHARACTER_PROFILES[characterId];assert.ok(body,'Known native body required');
  const state={player:{...definition.player,id:'physical-'+characterId,characterId,...body,hp:100,elevation:0,travelled:0},actors:[],tick:0,generation:0,clocks:{world:0}},events=[];
  const provider=createCatalogueThermal({compiled,state,definition,config:DEFAULT_CONFIG,event:(type,p,extra)=>events.push({type,position:[p.x,p.elevation,p.y],...extra})});
  let requestedTime=0,held={x:0,y:0},lastBlock=null;
  const position=()=>[state.player.x,state.player.elevation||0,state.player.y];
  const snapshot=()=>({tick:state.tick,requestedTime,position:position(),body:{...body},held:{...held},supportId:state.player.surfaceId,owner:state.player.moduleOwner,lastBlock,doors:provider.shop.snapshot().doors,events:events.slice(-8)});
  function step(vector,label){
    guard();held={...vector};const direction=movementVector(vector,false,DEFAULT_CONFIG.input),from=position(),path=provider.move(state.player,direction.x*DEFAULT_CONFIG.player.speed*STEP,direction.y*DEFAULT_CONFIG.player.speed*STEP,body.radius,body.height),last=path.at(-1);assert.ok(last);
    const walked=path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-path[i].x,p.y-path[i].y),0),budget=DEFAULT_CONFIG.player.speed*STEP*Math.hypot(direction.x,direction.y);assert.ok(walked<=budget+EPS,'Accepted distance exceeds actual input budget');
    Object.assign(state.player,last,{travelled:state.player.travelled+walked});state.tick++;requestedTime+=STEP;
    lastBlock=walked+EPS<budget?provider.diagnostics().navigation[state.player.id]||null:null;
    const row={label,...snapshot(),from,acceptedPath:path};record(row);return row;
  }
  function input(dx,dz,scale=magnitude){
    const d=Math.hypot(dx,dz),stick=worldToStick({x:dx/(d||1)*scale,y:dz/(d||1)*scale},DEFAULT_CONFIG.input);
    if(mode!=='keyboard')return stick;
    const angle=Math.round(Math.atan2(stick.y,stick.x)/(Math.PI/4))*Math.PI/4,x=Math.cos(angle),y=Math.sin(angle);
    const keys={x:Math.abs(x)>.4?Math.sign(x):0,y:Math.abs(y)>.4?Math.sign(y):0},n=Math.max(1,Math.hypot(keys.x,keys.y));return {x:keys.x/n,y:keys.y/n};
  }
  const stop=label=>step({x:0,y:0},label);
  function action(id,requested){
    stop('before-'+requested);const target=provider.shop.interaction();assert.equal(target?.id,id,'Public contextual target mismatch');assert.equal(target.action,requested);assert.equal(target.enabled,true,target.reason);
    provider.shop.interact({type:'interact',portalId:id,action:requested});provider.trial.step(1);const row=provider.shop.snapshot().doors.find(d=>d.id===id);assert.equal(row.open,requested==='open');record({label:'context-'+requested,...snapshot()});return row;
  }
  function walk(target,label,{autoOpen=true,tolerance=mode==='keyboard'?.105:.02,expectBlock=false}={}){
    const requestedTarget=[...target],planning=createNavigation(provider.trial,{...body,start:position(),slide:true}),support=planning.support(target,target[1]);target=[...target];
    if(support)target[1]=support.y;
    record({label:'target-plan',walkLabel:label,requestedTarget,target,targetSupportId:support?.id,...snapshot()});
    let samples=[];
    for(let i=0;i<Math.ceil(90/STEP);i++){
      guard();const from=position(),d=distance(from,target);
      if(d<=tolerance&&Math.abs(from[1]-target[1])<=EPS){stop(label+'-arrived');return {arrived:true,...snapshot()};}
      const context=provider.shop.interaction();if(autoOpen&&context?.kind==='door'&&context.action==='open'&&context.enabled)action(context.id,'open');
      const scale=mode==='keyboard'?1:Math.min(magnitude,d/(DEFAULT_CONFIG.player.speed*STEP));step(input(target[0]-from[0],target[2]-from[2],scale),label);
      const p=position();samples.push({time:requestedTime,p});while(samples.length>1&&requestedTime-samples[1].time>1.05)samples.shift();
      if(samples.length>1&&requestedTime-samples[0].time>1&&samples.every(s=>distance(s.p,samples[0].p)<.005)){
        const failure={arrived:false,target,label,criterion:'>1 requested movement second with <5mm excursion',...snapshot()};record({label:'captured-stall',...failure});
        if(expectBlock){stop(label+'-expected-block');return failure;}throw Object.assign(Error('Native physical route stalled: '+label),{finding:failure});
      }
    }
    throw Object.assign(Error('Bounded90second movement route exhausted: '+label),{finding:{label,requestedTarget,target,samples:samples.slice(-8),...snapshot()}});
  }
  return {body,state,provider,position,snapshot,step,input,stop,action,walk,guard,dispose(){provider.dispose();}};
}

export function walkRoundTrip(driver,plan,{offset=0,goatExitRegression=false}={}){
  const checkpoints=new Set(plan.flights.map(f=>f.checkpoint)),visits=[];
  for(let i=0;i<plan.route.length;i++){
    driver.walk(plan.point(i,offset),'in-'+i);visits.push({direction:'in',index:i,...driver.snapshot()});
    if(i===plan.inside){driver.action(plan.front.id,'close');driver.action(plan.front.id,'open');}
    if(checkpoints.has(i)){
      const before=driver.position();for(let n=0;n<15;n++)driver.stop('stopped-on-tread-'+i);assert.ok(distance(before,driver.position())<EPS);
      driver.walk(plan.point(i-1,offset),'reverse-tread-'+i);driver.walk(plan.point(i,offset),'resume-tread-'+i);
    }
  }
  let shifted=false;
  for(let i=plan.route.length-1;i>=0;i--){
    const target=plan.point(i,offset);if(shifted)target[0]+=.02;driver.walk(target,'out-'+i,{autoOpen:i>plan.outside});visits.push({direction:'out',index:i,...driver.snapshot()});
    if(goatExitRegression&&i===plan.inside){
      const before=driver.position(),vector=worldToStick({x:.02/(DEFAULT_CONFIG.player.speed*STEP),y:0},DEFAULT_CONFIG.input);driver.step(vector,'walked20mm-worldX-exit-offset');driver.stop('offset-release');assert.ok(Math.abs(driver.position()[0]-before[0]-.02)<EPS);shifted=true;
    }
    if(i===plan.outside)driver.action(plan.front.id,'close');
  }
  return {visits,final:driver.snapshot()};
}

const shapes=(driver,id)=>[...driver.provider.trial.scene.index.surfaces.values()].filter(b=>b.openingId===id&&b.actualDoorPose&&b.intact).map(b=>({triangles:(b.solidTriangles||b.triangles).map(t=>t.map(p=>[...p])),closed:!!b.solidTriangles}));
const hits=(list,p,body)=>list.some(shape=>!sweptCylinderClear({x:p[0],y:p[2]},{x:p[0],y:p[2]},body.radius,p[1]+.025,p[1]+body.height,shape));

// Controlled fixture occupants are separate from the ordinary-input traversal
// proof. Samples must be supported and clear in the current actual leaf pose.
export function pairedOccupancyControls(driver,plan){
  for(let i=0;i<=plan.outside;i++)driver.walk(plan.point(i),'occupancy-approach-'+i,{autoOpen:false});
  const closed=plan.front.openingIds.map(id=>shapes(driver,id));assert.ok(closed.every(rows=>rows.length));
  const blocked=driver.walk(plan.point(plan.inside),'closed-door-control',{autoOpen:false,expectBlock:true});assert.equal(blocked.arrived,false);assert.ok(blocked.lastBlock,'Closed real geometry must reject movement');
  assert.ok(plan.front.openingIds.includes(driver.provider.trial.scene.index.surfaces.get(blocked.lastBlock.id)?.openingId),'The negative must contact the actual closed pair, not an unrelated wall');
  driver.walk(plan.point(plan.outside),'backoff-from-closed',{autoOpen:false});driver.action(plan.front.id,'open');const open=plan.front.openingIds.map(id=>shapes(driver,id));driver.action(plan.front.id,'close');
  const results=[];
  for(const requested of ['open','close']){
    if(requested==='close')driver.action(plan.front.id,'open');
    const destination=requested==='open'?open:closed,current=requested==='open'?closed:open;
    for(let leaf=0;leaf<plan.front.openingIds.length;leaf++){
      const vertices=destination[leaf].flatMap(s=>s.triangles.flat()),xs=vertices.map(p=>p[0]),zs=vertices.map(p=>p[2]),nav=createNavigation(driver.provider.trial,{...driver.body,start:driver.position(),slide:true});let sample=null;
      search:for(const pitch of [.15,.075])for(let x=Math.min(...xs)-driver.body.radius;x<=Math.max(...xs)+driver.body.radius;x+=pitch)for(let z=Math.min(...zs)-driver.body.radius;z<=Math.max(...zs)+driver.body.radius;z+=pitch){
        driver.guard();
        const p=[x,plan.floorY,z],support=nav.support(p,p[1]);if(!support||Math.abs(support.y-p[1])>EPS||!hits(destination[leaf],p,driver.body)||hits(destination[1-leaf],p,driver.body)||current.some(rows=>hits(rows,p,driver.body))||!nav.clear(p,p))continue;sample=p;break search;
      }
      assert.ok(sample,'No valid source-supported exclusive '+requested+' occupancy sample for '+plan.front.openingIds[leaf]);
      driver.state.actors=[{id:'controlled-occupant',x:sample[0],y:sample[2],elevation:sample[1],...driver.body,hp:100}];
      const target=driver.provider.shop.interaction();assert.equal(target.id,plan.front.id);assert.equal(target.action,requested);assert.equal(target.enabled,false);assert.match(target.reason,/clear/i);
      driver.provider.shop.interact({type:'interact',portalId:plan.front.id,action:requested});driver.provider.trial.step(1);const row=driver.provider.shop.snapshot().doors.find(d=>d.id===plan.front.id);assert.equal(row.open,requested==='close','Occupied group must preserve its original state');
      results.push({requested,leafId:plan.front.openingIds[leaf],sample,blocked:true});driver.state.actors=[];
    }
    driver.action(plan.front.id,requested);driver.action(plan.front.id,requested==='open'?'close':'open');
    if(requested==='close')driver.action(plan.front.id,'close');
  }
  return {closedTravel:blocked,occupancy:results};
}

export function unsupportedControl(driver,plan){
  const last=plan.route.length-1;for(let i=0;i<last;i++)driver.walk(plan.point(i),'unsupported-approach-'+i);
  const target=plan.point(last),index=driver.provider.trial.scene.index,retired=[];
  for(const hit of index.crossings([target[0],target[1]+.221,target[2]],[target[0],target[1]-.221,target[2]],{includeEndpoints:true}))if(hit.surface.supports&&hit.surface.intact){index.change(hit.surface.id,{intact:false});retired.push(hit.surface.id);}
  assert.ok(retired.length,'Actual upper route support is required for the controlled retirement');
  const result=driver.walk(target,'actual-upper-support-retirement',{autoOpen:false,expectBlock:true});assert.equal(result.arrived,false);assert.equal(result.lastBlock?.reason,'No reachable support');assert.ok(Math.abs(driver.position()[1]-target[1])<=EPS,'Unsupported control must not silently drop to another floor');
  return {scope:'Isolated negative fixture: actual support boundaries retired through the existing index; no canonical source change',retired,result};
}
