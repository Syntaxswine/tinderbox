import {sweptCylinderClear,supportSegmentStations,segmentRectangleDistance} from '../../src/runtime/collision.js';
import {NATIVE_DISC_SLIDE,nativeDiscProposal,reachableDiscEnvelope} from '../../src/reuse/native-disc-slide.js';
import {bounds,overlaps,pointOnTriangle,unit,cross,sub,EPS} from './geometry.js';

// A small adapter over the production narrow phase, not a second character or
// rescaled map. Physical retirement/opening state is borrowed from the trial.
export function createNavigation(trial,{radius=.5,height=1.66,maxStep=.22,start,slide=false,slideProfile=null,worldBounds=null}={}) {
  if(slideProfile!==null&&slideProfile!==NATIVE_DISC_SLIDE)throw Error('Unknown native sliding profile');
  const {scene}=trial,{data,index}=scene,meshInfo=new Map((data.sourceMeshes||[]).map(m=>[m.id,m]));
  start??=[data.navigation?.prototypeRoute?.[0]?.[0]??5.5,scene.groundY??0,-3.8];
  const extras=[],physicalMeshes=new Set([...data.surfaces.flatMap(s=>s.sourceMeshBindings||[]),...(data.furnitureParts||[]).map(p=>p.sourceMeshBinding).filter(Boolean)]);
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
  function bodyBand(from,to) {
    const near=index.candidates({min:[to[0]-radius,Math.min(from[1],to[1])-.2,to[2]-radius],max:[to[0]+radius,Math.max(from[1],to[1])+.5,to[2]+radius]}),onStairs=near.some(s=>s.intact&&['stair-tread','entry-step'].includes(s.supportType));
    // The borrowed .45m gait clearance follows the stepped foot position on
    // ascent. Using the old lower foot plane catches the third riser before
    // the accepted first step; the native head/radius envelope stays intact.
    const low=(onStairs?Math.max(from[1],to[1]):Math.min(from[1],to[1]))+(onStairs?.45:.025),high=Math.max(from[1],to[1])+height-EPS;
    return {low,high};
  }
  const nativeShape=s=>({id:s.id,triangles:s.solidTriangles||s.triangles,closed:s.closedShape!==false&&!!s.solidTriangles});
  function* furniture(){
    for(const part of scene.parts.values())if(part.intact&&part.solid&&part.bounds){
      const item=scene.items.get(part.itemId);if(!item?.intact||item.falling)continue;
      const b=part.bounds,offset=item.position.map((v,i)=>v-item.initialPosition[i]);yield {id:part.id,bounds:{min:b.min.map((v,i)=>v+offset[i]),max:b.max.map((v,i)=>v+offset[i])}};
    }
  }
  function clear(from,to) {
    const {low,high}=bodyBand(from,to),box={min:[Math.min(from[0],to[0])-radius,low,Math.min(from[2],to[2])-radius],max:[Math.max(from[0],to[0])+radius,high,Math.max(from[2],to[2])+radius]};
    const shapes=index.candidates(box).filter(s=>s.intact&&index.pass(s)<.99).map(s=>({id:s.id,triangles:s.solidTriangles||s.triangles,closed:s.closedShape!==false&&!!s.solidTriangles}));
    shapes.push(...extras.filter(s=>overlaps(box,s.bounds)));
    for(const shape of shapes)if(!sweptCylinderClear({x:from[0],y:from[2]},{x:to[0],y:to[2]},radius,low,high,shape)){lastBlock={id:shape.id,reason:'Native geometry clearance',position:[...to]};return false;}
    for(const part of furniture()){
      const lo=part.bounds.min,hi=part.bounds.max;
      if(hi[1]<=low||lo[1]>=high)continue;
      if(slideProfile&&segmentRectangleDistance([from[0],from[2]],[to[0],to[2]],[lo[0],lo[2]],[hi[0],hi[2]])<radius-EPS){lastBlock={id:part.id,reason:'Furniture',position:[...to]};return false;}
      const x=Math.max(lo[0],Math.min(hi[0],to[0])),z=Math.max(lo[2],Math.min(hi[2],to[2]));
      if(Math.hypot(x-to[0],z-to[2])<radius-EPS){lastBlock={id:part.id,reason:'Furniture',position:[...to]};return false;}
    }
    return true;
  }
  const insideWorld=p=>!worldBounds||p[0]>=radius&&p[2]>=radius&&p[0]<=worldBounds.width-radius&&p[2]<=worldBounds.depth-radius;
  function nativeLanding(from,p){
    if(!insideWorld(p)){lastBlock={reason:'World bounds',position:[...p]};return null;}
    const landing=support(p,from[1]);if(!landing){lastBlock={reason:'No reachable support',position:[...p]};return null;}
    const target=[p[0],landing.y,p[2]];return clear(from,target)?target:null;
  }
  function validateSegment(from,to,supportTriangles){
    const stations=supportSegmentStations(from,to,supportTriangles),points=[];let previous=[...from];
    const accept=p=>{
      const target=nativeLanding(previous,p);
      if(target){if(Math.hypot(target[0]-previous[0],target[2]-previous[2])>EPS||Math.abs(target[1]-previous[1])>EPS)points.push(target);previous=target;return true;}
      const rejected=lastBlock;let low=0,high=1,best=null;
      // The interval is bounded by actual support edges, so refining a failed
      // sweep cannot jump over an unsupported interval to a later floor.
      for(let i=0;i<20;i++){const t=(low+high)/2,q=previous.map((v,k)=>v+(p[k]-v)*t),candidate=nativeLanding(previous,q);if(candidate){low=t;best=candidate;}else high=t;}
      if(best&&(Math.hypot(best[0]-previous[0],best[2]-previous[2])>EPS||Math.abs(best[1]-previous[1])>EPS))points.push(best);
      lastBlock=rejected;return false;
    };
    for(let i=1;i<stations.length;i++)for(const t of [(stations[i-1]+stations[i])/2,stations[i]]){
      const p=from.map((v,k)=>v+(to[k]-v)*t);if(!accept(p))return {points,complete:false};
    }
    return {points,complete:true};
  }
  function contactStep(target){
    const from=[...position],reach=Math.hypot(target[0]-from[0],target[2]-from[2]),envelope=reachableDiscEnvelope(from,radius,reach,maxStep,height),candidates=index.candidates(envelope).filter(s=>s.intact&&index.pass(s)<.99),extra=extras.filter(s=>overlaps(envelope,s.bounds));
    const landing=support(target,from[1]);if(landing)target[1]=landing.y;
    const band=bodyBand(from,target);
    // A newly raised head is a native vertical/headroom decision, not a
    // horizontal shoulder inferred from an overhead polygon's footprint.
    band.high=Math.min(band.high,from[1]+height-EPS);
    const proposal=nativeDiscProposal({from,delta:target.map((v,i)=>v-from[i]),radius,...band,shapes:[...candidates.map(nativeShape),...extra],furniture:[...furniture()].filter(s=>overlaps(envelope,s.bounds)),worldBounds});
    if(proposal.limitation){lastBlock={...proposal.limitation,position:[...from]};return {points:[],complete:false};}
    const supportTriangles=candidates.filter(s=>s.supports).flatMap(s=>s.triangles);
    for(const shape of extra)if(/stair|tread|step|porch/i.test(shape.name))for(const triangle of shape.triangles){const n=unit(cross(sub(triangle[1],triangle[0]),sub(triangle[2],triangle[0])));if(n[1]>=.5)supportTriangles.push(triangle);}
    const accepted=[];let complete=true;
    for(const segment of proposal.segments){const result=validateSegment(accepted.at(-1)||from,segment.to,supportTriangles);accepted.push(...result.points);if(!result.complete){complete=false;break;}}
    if(complete&&proposal.contacts.length){const first=proposal.contacts[0];lastBlock={...first,position:[...target]};}
    return {points:accepted,complete};
  }
  function move(dx,dz,seconds=1/30) {
    moving=false;lastBlock=null;const acceptedPath=[[...position]],finish=()=>slideProfile?{...snapshot(),acceptedPath}:snapshot(),distance=Math.hypot(dx,dz);if(distance<EPS||seconds===0)return finish();const scale=distance>1?1/distance:1,speed=9,steps=Math.max(1,Math.ceil(speed*seconds/.025));
    for(let i=0;i<steps;i++) {
      let target=[position[0]+dx*scale*speed*seconds/steps,position[1],position[2]+dz*scale*speed*seconds/steps];
      if(slideProfile){
        const result=contactStep(target),points=result.points;if(!points.length)break;
        for(const point of points){travelled+=Math.hypot(point[0]-position[0],point[2]-position[2]);position=point;acceptedPath.push([...point]);moving=true;heading=Math.atan2(dz,dx);}
        if(!result.complete)break;
        continue;
      }
      const s=support(target,position[1]);
      if(s)target[1]=s.y;
      if(!s||!clear(position,target)){
        if(!s)lastBlock={reason:'No reachable support',position:target};
        if(!slide)break;
        // Borrow the host moveDisc axis-slide order. Each alternative still
        // needs real reachable support and the same swept native body check.
        let accepted=null;for(const candidate of [[target[0],position[1],position[2]],[position[0],position[1],target[2]]]){
          if(Math.hypot(candidate[0]-position[0],candidate[2]-position[2])<EPS)continue;const landing=support(candidate,position[1]);if(!landing)continue;candidate[1]=landing.y;if(clear(position,candidate)){
            // Prefer the safe axis that reaches the actual requested tread;
            // retain host X/Z order when both alternatives have equal support.
            if(!accepted||s&&Math.abs(candidate[1]-s.y)<Math.abs(accepted[1]-s.y)-EPS)accepted=candidate;
            if(!s||Math.abs(accepted[1]-s.y)<EPS)break;
          }
        }
        if(!accepted)break;target=accepted;lastBlock=null;
      }
      travelled+=Math.hypot(target[0]-position[0],target[2]-position[2]);heading=Math.atan2(dz,dx);position=target;moving=true;
    }
    return finish();
  }
  function snapshot(){return {position:[...position],x:position[0],y:position[2],elevation:position[1],height,radius,heading,travelled,moving,tool:'matches',lastBlock,level:position[1]>2?1:0};}
  return {move,snapshot,clear,support,setPosition(p){if(!Array.isArray(p)||!p.every(Number.isFinite))throw Error('Invalid observer');position=[...p];return snapshot();},extras};
}
