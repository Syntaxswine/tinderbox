import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createTrial} from '../../workbenches/furnished-house/simulation.js';
import {createNavigation} from '../../workbenches/furnished-house/navigation.js';
import {NATIVE_DISC_SLIDE,nativeDiscProposal,reachableDiscEnvelope} from '../../src/reuse/native-disc-slide.js';
import {sweptCylinderClear} from '../../src/runtime/collision.js';
import {bounds} from '../../workbenches/furnished-house/geometry.js';
import {loadCatalogueModules} from '../../src/runtime/catalogue-modules.js';
import {createSimulation,worldToStick} from '../../src/simulation/index.js';
import {NEIGHBORHOOD_SCENARIO} from '../../src/content/neighborhood.js';
import {DEFAULT_CONFIG} from '../../src/simulation/config.js';
import {scenarioDefinition} from '../../src/simulation/fixtures.js';
import {compileCatalogueModules} from '../../src/content/catalogue-modules.js';
import {createGrayboxData} from '../../workbenches/bell-and-alder-closing/graybox-data.js';
import * as T from '../../src/runtime/three.js';
import {observedSimulationFactory,observeCatalogueMoves} from '../helpers/observe-catalogue-moves.mjs';

const near=(a,b,tolerance=3e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const length=path=>path.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-path[i][0],p[2]-path[i][2]),0);
const floor=(id,x,z,w,d,y=0,extra={})=>({id,kind:'floor',material:'stone',fuelAmount:0,normal:[0,1,0],thickness:.12,...extra,triangles:[[[x,y,z],[x+w,y,z+d],[x+w,y,z]],[[x,y,z],[x,y,z+d],[x+w,y,z+d]]]});
const plane=(id,x,z0,z1)=>({id,kind:'wall',material:'stone',fuelAmount:0,normal:[1,0,0],thickness:.16,triangles:[[[x,0,z0],[x,2.5,z1],[x,0,z1]],[[x,0,z0],[x,2.5,z0],[x,2.5,z1]]]});
const transform=(p,angle)=>[Math.cos(angle)*p[0]-Math.sin(angle)*p[2],p[1],Math.sin(angle)*p[0]+Math.cos(angle)*p[2]];
function triangles(geometry,offset=[0,0,0]){
  try{const p=geometry.attributes.position,index=geometry.index,out=[];for(let i=0;i<(index?.count??p.count);i+=3)out.push([0,1,2].map(k=>{const j=index?index.getX(i+k):i+k;return [p.getX(j)+offset[0],p.getY(j)+offset[1],p.getZ(j)+offset[2]];}));return out;}finally{geometry.dispose();}
}
const box=(min,max)=>triangles(new T.BoxGeometry(...max.map((v,i)=>v-min[i])),max.map((v,i)=>(v+min[i])/2));
function make(surfaces=[floor('ground',-6,-6,12,12)],meshes=[]){
  return createTrial({version:1,runtimeAdapterVersion:1,prefabId:'native-contact-controls',groundY:0,gridOrigin:[0,0,0],levels:[{index:0,floorY:0}],surfaces,items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:meshes.map(m=>({id:m.id,name:'Entry casing '+m.id})),render:{materials:[],geometry:meshes.map(m=>({id:m.id,triangles:m.triangles.map(vertices=>({vertices}))}))}});
}
const navigation=(trial,start,options={})=>createNavigation(trial,{radius:.5,height:1.66,start,slideProfile:NATIVE_DISC_SLIDE,...options});
function assertClear(path,shapes,radius=.5,low=.025,high=1.66){
  for(let i=1;i<path.length;i++)for(const shape of shapes)assert.equal(sweptCylinderClear({x:path[i-1][0],y:path[i-1][2]},{x:path[i][0],y:path[i][2]},radius,low,high,shape),true,shape.id+' segment '+i);
}

test('native slide preserves a fresh 72% tangent in both directions and rotated walls',()=>{
  for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI])for(const sign of [-1,1]){
    const wall=plane('rotated-wall',2,-4,4);wall.triangles=wall.triangles.map(t=>t.map(p=>transform(p,angle)));wall.normal=transform([1,0,0],angle);
    const trial=make([floor('ground',-6,-6,12,12),wall]);
    try{
      const start=transform([1.3,0,0],angle),direction=transform([1,0,sign],angle),nav=navigation(trial,start),result=nav.move(direction[0],direction[2],.1),local=transform(result.position,-angle),desired=.9/Math.sqrt(2);
      near(local[0],1.42);near(Math.abs(local[2]),.12+.72*(desired-.12),8e-6);near(result.travelled,length(result.acceptedPath));assert.ok(result.travelled<=.9);assert.ok(result.acceptedPath.length>2);
      assertClear(result.acceptedPath,trial.scene.index.candidates(bounds(wall.triangles.flat())).filter(s=>s.sourceSurfaceId===wall.id).map(s=>({id:s.id,triangles:s.solidTriangles})));
      const before=[...result.position],next=nav.move(direction[0],direction[2],.1),advance=transform(next.position.map((v,i)=>v-before[i]),-angle);near(Math.abs(advance[2]),.72*desired,8e-6);
    }finally{trial.dispose();}
  }
});

test('native default remains stop-only; head-on and a closed corner invent no shoulder',()=>{
  const a=plane('east',2,-4,4),b=plane('north',2,-4,4);b.triangles=b.triangles.map(t=>t.map(([x,y,z])=>[z,y,x]));b.normal=[0,0,1];const trial=make([floor('ground',-6,-6,12,12),a,b]);
  try{
    const stop=createNavigation(trial,{start:[1.3,0,0]}).move(1,1,.1);assert.ok(stop.y<.15);
    const nav=navigation(trial,[1.3,0,0]),head=nav.move(1,0,.2);near(head.x,1.42);near(head.y,0);
    const corner=navigation(trial,[1.3,0,1.3]);let p=corner.move(1,1,.2);near(p.x,1.42);near(p.y,1.42);const at=[...p.position];for(let i=0;i<10;i++)p=corner.move(1,1,.1);near(p.x,at[0]);near(p.y,at[2]);assert.ok(p.lastBlock.id.startsWith('east')||p.lastBlock.id.startsWith('north'));
  }finally{trial.dispose();}
});

test('rounded native mesh glances around its real facets and a secondary outside-strip contact is queried',()=>{
  const drum={id:'round-drum',triangles:triangles(new T.CylinderGeometry(.4,.4,.8,18),[0,.4,0]),closed:true};
  const clear=(from,to)=>sweptCylinderClear({x:from[0],y:from[2]},{x:to[0],y:to[2]},.5,.025,1.66,drum);
  let a=-1,b=0;for(let i=0;i<45;i++){const x=(a+b)/2;if(clear([-1,0,.65],[x,0,.65]))a=x;else b=x;}
  const start=[a-.008,0,.65],secondary={id:'secondary',triangles:box([-1,0,1.154],[1,1,1.164]),closed:true},envelope=reachableDiscEnvelope(start,.5,.025,.22,1.66);
  assert.ok(secondary.triangles.every(t=>t.every(p=>p[2]>start[2]+.5)),'Second obstacle lies beyond the original strip');assert.ok(envelope.max[2]>1.164);
  const trial=make(undefined,[drum,secondary]),queries=[],query=trial.scene.index.candidates;trial.scene.index.candidates=box=>{queries.push(structuredClone(box));return query(box);};
  try{
    const proposal=nativeDiscProposal({from:start,delta:[.025,0,0],radius:.5,low:.025,high:1.66,shapes:[drum,secondary]});assert.ok(proposal.contacts.some(c=>c.id==='secondary'),'Actual tangent reaches the secondary obstacle');
    const result=navigation(trial,start).move(1,0,.025/9);assert.ok(result.y>start[2]);assert.ok(queries.some(q=>q.max[2]>=envelope.max[2]-1e-9));assertClear(result.acceptedPath,[drum,secondary]);assert.ok(result.travelled<=.025);
    const head=navigation(trial,[-1,0,0]).move(1,0,.1);near(head.y,0);assertClear(head.acceptedPath,[drum,secondary]);
  }finally{trial.dispose();}
});

test('continuous contact cannot tunnel through a thin native wall or push out from inside a closed solid',()=>{
  const thin={id:'thin',triangles:box([0,0,-2],[.001,2.5,2]),closed:true},solid={id:'solid',triangles:box([2,0,-1],[4,2.5,1]),closed:true},trial=make(undefined,[thin,solid]);
  try{
    const crossing=navigation(trial,[-2,0,0]).move(1,0,1);assert.ok(crossing.x<=-.5+2e-6);near(crossing.y,0);assertClear(crossing.acceptedPath,[thin,solid]);
    const inside=navigation(trial,[3,0,0],{radius:.1}).move(1,0,.1);assert.deepEqual(inside.position,[3,0,0]);assert.equal(inside.travelled,0);assert.equal(inside.lastBlock.id,'solid');
  }finally{trial.dispose();}
});

test('separate native jamb/header triangles preserve the real doorway inside one retained mesh',()=>{
  const mesh={id:'doorway-with-real-hole',triangles:[...box([-2,0,-.08],[-.8,2.5,.08]),...box([.8,0,-.08],[2,2.5,.08]),...box([-.8,2.1,-.08],[.8,2.5,.08])],closed:true},trial=make(undefined,[mesh]);
  try{const p=navigation(trial,[0,0,-1]).move(0,1,2/9);near(p.y,1);near(p.x,0);assertClear(p.acceptedPath,[mesh]);}finally{trial.dispose();}
});

test('live furniture envelopes and actual world edges remain authoritative',()=>{
  const trial=make();trial.scene.items.set('chair',{id:'chair',intact:true,falling:false,position:[0,0,0],initialPosition:[0,0,0]});trial.scene.parts.set('chair-back',{id:'chair-back',itemId:'chair',intact:true,solid:true,bounds:{min:[0,0,-1],max:[.001,1,1]}});
  try{
    const p=navigation(trial,[-.6,0,0]).move(1,0,.2);assert.ok(p.x<=-.5+2e-6);assert.equal(p.lastBlock.id,'chair-back');assert.equal(p.lastBlock.reason,'Furniture');
    trial.scene.items.get('chair').position[0]=3;const moved=navigation(trial,[-.6,0,0]).move(1,0,.2);near(moved.x,1.2);
    trial.scene.items.get('chair').position[0]=0;trial.scene.items.get('chair').falling=true;near(navigation(trial,[-.6,0,0]).move(1,0,.2).x,1.2);
    const edge=navigation(trial,[.51,0,.51],{worldBounds:{width:4,depth:4}}).move(-1,-1,.1);assert.ok(edge.x>=.5&&edge.y>=.5);near(edge.x,.5);near(edge.y,.5);
  }finally{trial.dispose();}
});

test('native segment validation independently rejects a furniture-corner graze between clear endpoints',()=>{
  const a=[-.3623851542902937,0,-.3447074847606301],b=[-.3447074847606301,0,-.3623851542902937],mid=a.map((v,i)=>(v+b[i])/2),trial=make();
  trial.scene.items.set('cabinet',{id:'cabinet',intact:true,falling:false,position:[0,0,0],initialPosition:[0,0,0]});trial.scene.parts.set('corner-part',{id:'corner-part',itemId:'cabinet',intact:true,solid:true,bounds:{min:[0,.2,0],max:[1,.6,1]}});
  try{
    assert.ok(Math.hypot(a[0],a[2])>.5&&Math.hypot(b[0],b[2])>.5);near(Math.hypot(mid[0],mid[2]),.49999,1e-10);
    const legacy=createNavigation(trial,{radius:.5,height:1.66,start:a});assert.equal(legacy.clear(a,b),true,'Preserve the original endpoint-only control mode');
    const nav=navigation(trial,a);assert.equal(nav.clear(a,b),false);assert.equal(nav.snapshot().lastBlock.id,'corner-part');assert.equal(nav.snapshot().lastBlock.reason,'Furniture');
    // A raised proposal band can omit this envelope. Final native validation
    // with the actual lower band must still reject the unmodified segment.
    const proposal=nativeDiscProposal({from:a,delta:b.map((v,i)=>v-a[i]),radius:.5,low:.63,high:1.84,shapes:[],furniture:[{id:'corner-part',bounds:{min:[0,.2,0],max:[1,.6,1]}}]});assert.equal(proposal.contacts.length,0);assert.equal(proposal.segments.length,1);assert.equal(nav.clear(a,proposal.segments[0].to),false);
  }finally{trial.dispose();}
});

test('support edge partitions prevent narrow gaps and unsupported tangent escapes',()=>{
  for(const surfaces of [[floor('left',-2,-2,4,4,2.12),floor('right',-2,2.004,4,2,2.12)],[floor('edge',-2,-2,4,4,2.12),plane('glance',1.08,-2,4)]]){
    const trial=make(surfaces);try{
      const start=surfaces.length===2&&surfaces[1].kind==='wall'?[.499,2.12,1.99]:[0,2.12,1.99],nav=navigation(trial,start),p=nav.move(surfaces[1].kind==='wall'?1:0,1,.025/9);
      assert.ok(p.y<=2.000002);near(p.elevation,2.12);assert.equal(p.lastBlock.reason,'No reachable support');assert.ok(p.travelled<.025);assert.ok(p.acceptedPath.every(point=>point[2]<=2.000002));
    }finally{trial.dispose();}
  }
});

test('native slide preserves the original stair gait, max step and raised-head clearance',()=>{
  const stairs=[floor('lower',-2,-2,4,2),...Array.from({length:4},(_,i)=>floor('tread-'+i,-2,i*.375,4,.375,(i+1)*.18,{supportType:'stair-tread'})),floor('upper',-2,1.5,4,2,.72)],trial=make(stairs);
  try{const nav=navigation(trial,[0,0,-.2]),up=nav.move(0,1,2/9);near(up.elevation,.72);assert.ok(up.acceptedPath.some(p=>Math.abs(p[1]-.18)<1e-6));const down=nav.move(0,-1,2/9);near(down.elevation,0);}finally{trial.dispose();}
  const high=make([floor('lower',-2,-2,4,2),floor('too-high',-2,0,4,2,.23)]);
  try{const p=navigation(high,[0,0,-.2]).move(0,1,.2);assert.ok(p.y<=.000002);near(p.elevation,0);}finally{high.dispose();}
  const ceiling={id:'low-ceiling',triangles:box([-2,1.7,-2],[2,1.8,2]),closed:true},headroom=make(stairs,[ceiling]);
  try{const p=navigation(headroom,[0,0,-.2]).move(0,1,.2);assert.ok(p.y<=.000002);near(p.x,0);near(p.elevation,0);assert.equal(p.lastBlock.id,'low-ceiling');}finally{headroom.dispose();}
});

test('bound stair transition publishes the actual support heights for accepted-path pouring',()=>{
  const shop=createGrayboxData();shop.levels.forEach((l,i)=>l.id??='level-'+i);
  const rise=2.12/12,treads=Array.from({length:12},(_,i)=>floor('tread-'+i,-2,i*.375,4,.375,(i+1)*rise,{supportType:'stair-tread'}));
  const house={version:1,prefabId:'height-pouring-control',levels:[{id:'level-0',index:0,floorY:0},{id:'level-1',index:1,floorY:2.12}],surfaces:[floor('lower',-2,-2,4,2),...treads,floor('upper',-2,4.5,4,2,2.12)],items:[],furnitureParts:[],stores:[],openings:[],sourceMeshes:[],render:{materials:[],geometry:[]}};
  const manifest={version:1,prefabId:'catalogue-modular-v1',instances:[{id:'bell-and-alder',kind:'closing',source:'shop',translation:[36,0,9],quarterTurns:0,stairFlights:[]},{id:'hopkins-fifteen',kind:'furnished',source:'house',translation:[24,0,13],quarterTurns:2,stairFlights:[{id:'height-flight',treadSourceIds:treads.map(s=>s.id),lower:{elevation:0,surfaceIds:['lower']},upper:{elevation:2.12,surfaceIds:['upper']}}]}]};
  const compiled=compileCatalogueModules(manifest,{shop,house},scenarioDefinition('neighborhood')),scenario=structuredClone(NEIGHBORHOOD_SCENARIO);scenario.player={x:24,y:13.05,tool:'jerry-can'};scenario.actors=[];scenario.pickups=[];
  const sim=createSimulation({scenario,characterId:'goat',catalogueModules:compiled});
  try{
    sim.dispatch({type:'primary',pressed:true});sim.dispatch({type:'primary',pressed:false});sim.dispatch({type:'move',...worldToStick({x:0,y:-1},DEFAULT_CONFIG.input)});const s=sim.advance(DEFAULT_CONFIG.step),path=s.diagnostics.acceptedPath;
    near(s.player.elevation,rise);assert.ok(path.some(p=>Math.abs(p.elevation)<1e-6));assert.ok(path.some(p=>Math.abs(p.elevation-rise)<1e-6));assert.ok(path.slice(1).every(p=>Number.isFinite(p.elevation)&&p.surfaceId&&p.ownerInstanceId==='hopkins-fifteen'));
    near(s.player.travelled,9*DEFAULT_CONFIG.step);near(4-s.player.inventory.gas,s.player.travelled*.08,1e-8);near(4-s.player.inventory.gas,s.diagnostics.thermal.metrics.fuel.added+s.diagnostics.thermal.pendingDepositedFuel,1e-8);
  }finally{sim.dispose();}
});

test('bound detailed provider slides beside the actual street barrel and charges every accepted poured segment',async()=>{
  const compiled=await loadCatalogueModules({fetcher:async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(url,'utf8'))})}),drum=compiled.data.surfaces.find(s=>s.hostObstacleId==='street-drum-west'),createObservedSimulation=await observedSimulationFactory();assert.ok(drum);assert.equal(drum.physicalShape,'source-closed-mesh');
  for(const z of [14.4,15,15.6]){
    const x=z===15?11.6:11.9,scenario=structuredClone(NEIGHBORHOOD_SCENARIO);scenario.player={x,y:z,tool:'jerry-can'};scenario.actors=[];scenario.pickups=[];
    const sim=createObservedSimulation({scenario,characterId:'goat',catalogueModules:compiled});
    try{
      const before=sim.snapshot();assert.equal(sweptCylinderClear({x,y:z},{x,y:z},before.player.radius,.025,before.player.height,{...drum,closed:true}),true);
      sim.dispatch({type:'primary',pressed:true});sim.dispatch({type:'primary',pressed:false});sim.dispatch({type:'move',...worldToStick({x:1,y:0},DEFAULT_CONFIG.input)});const s=sim.advance(DEFAULT_CONFIG.step),path=s.diagnostics.acceptedPath.map(p=>[p.x,p.elevation,p.y]),walked=length(path);
      assert.equal(s.diagnostics.thermal.backend,'catalogue-trial');assert.ok(s.world.obstacles.some(o=>o.id==='street-drum-west'),'Legacy prop still exists; native provider must bypass its old axis filter');assertClear(path,[{...drum,closed:true}],s.player.radius,.025,s.player.height);
      if(z===15){
        near(s.player.y,z);let safe=x,blocked=x+9*DEFAULT_CONFIG.step;
        for(let i=0;i<45;i++){const candidate=(safe+blocked)/2;if(sweptCylinderClear({x,y:z},{x:candidate,y:z},s.player.radius,.025,s.player.height,{...drum,closed:true}))safe=candidate;else blocked=candidate;}
        near(s.player.x,safe,4e-6);assert.ok(s.player.x>x+.05,'Head-on reaches the native contact instead of an earlier legacy stop');
      }else assert.ok((s.player.y-z)*Math.sign(z-15)>.01,'Off-centre pure +X request gains a real curved tangent');
      near(s.player.travelled,walked,1e-8);assert.ok(walked<=9*DEFAULT_CONFIG.step+1e-8);near(4-s.player.inventory.gas,walked*.08,1e-8);near(4-s.player.inventory.gas,s.diagnostics.thermal.metrics.fuel.added+s.diagnostics.thermal.pendingDepositedFuel,1e-8);near(s.clocks.player,DEFAULT_CONFIG.step,1e-8);near(s.clocks.world,DEFAULT_CONFIG.step,1e-8);
      assert.ok(path.every(p=>p.every(Number.isFinite)));assert.ok(path.some((p,i)=>i>1&&Math.abs((p[0]-path[i-1][0])*(path[i-1][2]-path[i-2][2])-(p[2]-path[i-1][2])*(path[i-1][0]-path[i-2][0]))>1e-9)||z===15,'Published path retains the noncollinear corner');
      if(z===14.4){
        const moves=[],after=observeCatalogueMoves(path=>moves.push(path),()=>sim.advance(3*DEFAULT_CONFIG.step)),paths=moves.map(path=>path.map(p=>[p.x,p.elevation,p.y])),sum=paths.reduce((n,path)=>n+length(path),0);
        assert.equal(moves.length,3,'Observe every actual player provider move during catch-up');for(const path of paths)assertClear(path,[{...drum,closed:true}],s.player.radius,.025,s.player.height);
        near(after.player.travelled-s.player.travelled,sum,1e-8);near(s.player.inventory.gas-after.player.inventory.gas,sum*.08,1e-8);
        near(4-after.player.inventory.gas,after.diagnostics.thermal.metrics.fuel.added+after.diagnostics.thermal.pendingDepositedFuel,1e-8);near(after.clocks.player-s.clocks.player,3*DEFAULT_CONFIG.step,1e-8);near(after.clocks.world-s.clocks.world,3*DEFAULT_CONFIG.step,1e-8);
        assert.deepEqual(after.diagnostics.acceptedPath,moves.at(-1),'Public snapshot keeps its existing last-step contract');
      }
    }finally{sim.dispose();}
  }
});
